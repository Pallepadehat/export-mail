import { PublicClientApplication } from "@azure/msal-node";
import { join } from "path";
import { ConfigManager } from "../config/ConfigManager.js";
import { logger } from "../utils/logger.js";
import type { AuthToken, UserInfo } from "../types/index.js";
import inquirer from "inquirer";

export class AuthManager {
  private msalInstance: PublicClientApplication | null = null;
  private configManager: ConfigManager;
  private tokenCachePath: string;

  constructor() {
    this.configManager = new ConfigManager();
    this.tokenCachePath = join(
      this.configManager.getAuthCacheDir(),
      "token-cache.json"
    );
  }

  /**
   * Initialize the MSAL instance
   */
  private async initializeMsal(): Promise<void> {
    if (this.msalInstance) {
      return;
    }

    const config = await this.configManager.getConfig();

    // Ensure the auth cache directory exists
    const cacheDir = this.configManager.getAuthCacheDir();
    await Bun.write(join(cacheDir, ".keep"), "");

    this.msalInstance = new PublicClientApplication({
      auth: {
        clientId: config.clientId,
        authority: `https://login.microsoftonline.com/${config.tenantId}`,
      },
    });
  }

  /**
   * Authenticate the user
   */
  async authenticate(): Promise<boolean> {
    try {
      await this.initializeMsal();
      const config = await this.configManager.getConfig();

      logger.header("Microsoft Graph Authentication");

      // Check if we have a cached token first
      const cachedToken = await this.getCachedToken();
      if (cachedToken && this.isTokenValid(cachedToken)) {
        logger.success("Using cached authentication token");
        return true;
      }

      logger.info(
        "No valid cached token found. Starting interactive authentication..."
      );

      // Start device code flow for CLI authentication
      const deviceCodeRequest = {
        scopes: config.scopes,
        deviceCodeCallback: (response: any) => {
          console.log("\n" + response.message);
          logger.info(
            `Open your browser and navigate to: ${response.verificationUri}`
          );
          logger.info(`Enter the code: ${response.userCode}`);
          console.log("\nWaiting for authentication...\n");
        },
      };

      const authResult = await this.msalInstance!.acquireTokenByDeviceCode(
        deviceCodeRequest
      );

      if (authResult) {
        // Cache the token
        await this.cacheToken({
          accessToken: authResult.accessToken,
          refreshToken: "", // Not available in device code flow
          expiresOn: authResult.expiresOn!,
          account: authResult.account,
        });

        logger.success("Authentication successful!");
        logger.footer();
        return true;
      }

      return false;
    } catch (error) {
      logger.error("Authentication failed:", error);
      logger.footer();
      return false;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const cachedToken = await this.getCachedToken();
      return cachedToken !== null && this.isTokenValid(cachedToken);
    } catch (error) {
      logger.debug("Error checking authentication status:", error);
      return false;
    }
  }

  /**
   * Get a valid access token
   */
  async getAccessToken(): Promise<string | null> {
    try {
      await this.initializeMsal();

      const cachedToken = await this.getCachedToken();
      if (cachedToken && this.isTokenValid(cachedToken)) {
        return cachedToken.accessToken;
      }

      // Try to refresh the token if we have a refresh token
      if (cachedToken?.refreshToken) {
        const config = await this.configManager.getConfig();

        try {
          const refreshResult = await this.msalInstance!.acquireTokenSilent({
            scopes: config.scopes,
            account: cachedToken.account,
          });

          if (refreshResult) {
            await this.cacheToken({
              accessToken: refreshResult.accessToken,
              refreshToken: cachedToken.refreshToken,
              expiresOn: refreshResult.expiresOn!,
              account: refreshResult.account,
            });

            return refreshResult.accessToken;
          }
        } catch (refreshError) {
          logger.debug("Token refresh failed:", refreshError);
        }
      }

      logger.warn("No valid token available. Please re-authenticate.");
      return null;
    } catch (error) {
      logger.error("Error getting access token:", error);
      return null;
    }
  }

  /**
   * Get user information
   */
  async getUserInfo(): Promise<UserInfo | null> {
    try {
      const cachedToken = await this.getCachedToken();
      if (cachedToken?.account) {
        return {
          id: cachedToken.account.homeAccountId,
          displayName: cachedToken.account.name || "",
          mail: cachedToken.account.username || "",
          userPrincipalName: cachedToken.account.username || "",
        };
      }
      return null;
    } catch (error) {
      logger.error("Error getting user info:", error);
      return null;
    }
  }

  /**
   * Clear authentication cache
   */
  async clearAuth(): Promise<void> {
    try {
      const tokenFile = Bun.file(this.tokenCachePath);
      if (await tokenFile.exists()) {
        await Bun.$`rm -f ${this.tokenCachePath}`.quiet();
      }

      // Note: MSAL Node handles cache cleanup automatically

      logger.info("Authentication cache cleared");
    } catch (error) {
      logger.error("Error clearing authentication:", error);
    }
  }

  /**
   * Cache authentication token
   */
  private async cacheToken(token: AuthToken): Promise<void> {
    try {
      await Bun.write(this.tokenCachePath, JSON.stringify(token, null, 2));
    } catch (error) {
      logger.warn("Failed to cache token:", error);
    }
  }

  /**
   * Get cached authentication token
   */
  private async getCachedToken(): Promise<AuthToken | null> {
    try {
      const tokenFile = Bun.file(this.tokenCachePath);

      if (await tokenFile.exists()) {
        const tokenData = await tokenFile.json();

        // Convert expiresOn back to Date object
        if (tokenData.expiresOn) {
          tokenData.expiresOn = new Date(tokenData.expiresOn);
        }

        return tokenData;
      }

      return null;
    } catch (error) {
      logger.debug("Error reading cached token:", error);
      return null;
    }
  }

  /**
   * Check if token is still valid
   */
  private isTokenValid(token: AuthToken): boolean {
    if (!token.accessToken || !token.expiresOn) {
      return false;
    }

    // Check if token expires within the next 5 minutes
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    return token.expiresOn > fiveMinutesFromNow;
  }
}
