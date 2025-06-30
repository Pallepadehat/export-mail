import { join } from "path";
import { homedir } from "os";
import type { AppConfig } from "../types/index.js";

export class ConfigManager {
  private configPath: string;
  private defaultConfig: AppConfig;

  constructor() {
    this.configPath = join(homedir(), ".export-mail", "config.json");

    // Default configuration for Microsoft Graph API
    this.defaultConfig = {
      clientId: "14d82eec-204b-4c2f-b7e8-296a70dab67e", // Microsoft Graph PowerShell App ID (public)
      tenantId: "common", // Supports all Microsoft accounts
      redirectUri: "http://localhost:3000",
      scopes: [
        "https://graph.microsoft.com/Mail.Read",
        "https://graph.microsoft.com/Mail.ReadWrite",
        "https://graph.microsoft.com/User.Read",
        "https://graph.microsoft.com/MailboxSettings.Read",
      ],
      cachePath: join(homedir(), ".export-mail", "auth-cache.json"),
    };
  }

  /**
   * Get the current configuration
   * Returns default config if no custom config exists
   */
  async getConfig(): Promise<AppConfig> {
    try {
      const configFile = Bun.file(this.configPath);

      if (await configFile.exists()) {
        const configData = await configFile.json();

        // Merge with defaults to ensure all required fields exist
        return {
          ...this.defaultConfig,
          ...configData,
        };
      }

      return this.defaultConfig;
    } catch (error) {
      console.warn("Failed to load config, using defaults:", error);
      return this.defaultConfig;
    }
  }

  /**
   * Save custom configuration
   */
  async saveConfig(config: Partial<AppConfig>): Promise<void> {
    try {
      // Ensure config directory exists
      const configDir = join(homedir(), ".export-mail");
      await Bun.write(configDir, ""); // Create directory if it doesn't exist

      const currentConfig = await this.getConfig();
      const newConfig = {
        ...currentConfig,
        ...config,
      };

      await Bun.write(this.configPath, JSON.stringify(newConfig, null, 2));
    } catch (error) {
      throw new Error(`Failed to save configuration: ${error}`);
    }
  }

  /**
   * Reset configuration to defaults
   */
  async resetConfig(): Promise<void> {
    try {
      const configFile = Bun.file(this.configPath);

      if (await configFile.exists()) {
        // Remove the custom config file to fall back to defaults
        await Bun.$`rm -f ${this.configPath}`.quiet();
      }
    } catch (error) {
      throw new Error(`Failed to reset configuration: ${error}`);
    }
  }

  /**
   * Get the authentication cache directory
   */
  getAuthCacheDir(): string {
    return join(homedir(), ".export-mail");
  }

  /**
   * Validate configuration
   */
  validateConfig(config: AppConfig): boolean {
    const requiredFields = ["clientId", "tenantId", "redirectUri", "scopes"];

    for (const field of requiredFields) {
      if (!config[field as keyof AppConfig]) {
        return false;
      }
    }

    if (!Array.isArray(config.scopes) || config.scopes.length === 0) {
      return false;
    }

    return true;
  }

  /**
   * Get configuration for specific environments (dev, prod)
   */
  async getEnvironmentConfig(
    env: "development" | "production" = "production"
  ): Promise<AppConfig> {
    const baseConfig = await this.getConfig();

    if (env === "development") {
      return {
        ...baseConfig,
        redirectUri: "http://localhost:3000/auth/callback",
      };
    }

    return baseConfig;
  }
}
