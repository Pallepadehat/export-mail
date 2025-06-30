import axios from "axios";
import { join } from "path";
import { format } from "date-fns";
import { AuthManager } from "../auth/AuthManager.js";
import { logger } from "../utils/logger.js";
import type {
  EmailMessage,
  DownloadOptions,
  MailFolder,
  ProgressInfo,
} from "../types/index.js";
import ora from "ora";

export class EmailDownloader {
  private authManager: AuthManager;
  private baseUrl = "https://graph.microsoft.com/v1.0";

  constructor(authManager: AuthManager) {
    this.authManager = authManager;
  }

  /**
   * Download emails based on the provided options
   */
  async downloadEmails(options: DownloadOptions): Promise<void> {
    const spinner = ora("Initializing email download...").start();

    try {
      logger.header("Email Download");

      // Get access token
      const accessToken = await this.authManager.getAccessToken();
      if (!accessToken) {
        throw new Error("No valid access token available");
      }

      // Create output directory
      await this.ensureOutputDirectory(options.outputPath);

      // Get folder ID
      spinner.text = "Finding target folder...";
      const folderId = await this.getFolderId(accessToken, options.folder);

      // Get email count for progress tracking
      spinner.text = "Counting emails...";
      const totalEmails = await this.getEmailCount(
        accessToken,
        folderId,
        options
      );

      if (totalEmails === 0) {
        spinner.succeed("No emails found matching the criteria");
        logger.footer();
        return;
      }

      logger.info(`Found ${totalEmails} emails to download`);

      // Download emails in batches
      spinner.text = "Downloading emails...";
      await this.downloadEmailsBatch(
        accessToken,
        folderId,
        options,
        totalEmails
      );

      spinner.succeed(`Successfully downloaded ${totalEmails} emails`);
      logger.footer();
    } catch (error) {
      spinner.fail("Email download failed");
      throw error;
    }
  }

  /**
   * Get the folder ID for the specified folder name
   */
  private async getFolderId(
    accessToken: string,
    folderName: string
  ): Promise<string> {
    try {
      // Handle special folder names
      const specialFolders: Record<string, string> = {
        inbox: "inbox",
        sent: "sentitems",
        drafts: "drafts",
        deleted: "deleteditems",
        junk: "junkemail",
      };

      const normalizedFolderName = folderName.toLowerCase();

      if (specialFolders[normalizedFolderName]) {
        return specialFolders[normalizedFolderName];
      }

      // Search for custom folder
      const response = await axios.get(`${this.baseUrl}/me/mailFolders`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        params: {
          $filter: `displayName eq '${folderName}'`,
          $select: "id,displayName",
        },
      });

      const folders = (response.data?.value || []) as MailFolder[];
      if (folders.length === 0) {
        throw new Error(`Folder '${folderName}' not found`);
      }

      return folders[0].id;
    } catch (error) {
      logger.error(`Failed to find folder '${folderName}':`, error);
      throw error;
    }
  }

  /**
   * Get the total count of emails matching the criteria
   */
  private async getEmailCount(
    accessToken: string,
    folderId: string,
    options: DownloadOptions
  ): Promise<number> {
    try {
      const url = `${this.baseUrl}/me/mailFolders/${folderId}/messages/$count`;
      const filter = this.buildFilter(options);

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        params: filter ? { $filter: filter } : {},
      });

      const count = typeof response.data === "number" ? response.data : 0;
      return Math.min(count, options.limit);
    } catch (error) {
      logger.error("Failed to get email count:", error);
      throw error;
    }
  }

  /**
   * Download emails in batches with progress tracking
   */
  private async downloadEmailsBatch(
    accessToken: string,
    folderId: string,
    options: DownloadOptions,
    totalEmails: number
  ): Promise<void> {
    const batchSize = options.batchSize || 50;
    let downloadedCount = 0;
    let skipToken: string | null = null;

    while (downloadedCount < totalEmails && downloadedCount < options.limit) {
      const remainingEmails = Math.min(
        batchSize,
        options.limit - downloadedCount,
        totalEmails - downloadedCount
      );

      logger.step(
        downloadedCount + 1,
        totalEmails,
        `Downloading batch of ${remainingEmails} emails...`
      );

      const emails = await this.fetchEmailBatch(
        accessToken,
        folderId,
        options,
        remainingEmails,
        skipToken
      );

      if (emails.length === 0) {
        break;
      }

      // Save emails to disk
      await this.saveEmailsBatch(emails, options.outputPath);

      downloadedCount += emails.length;

      // Get next page token if available
      skipToken =
        emails.length === remainingEmails
          ? this.getNextPageToken(downloadedCount, batchSize)
          : null;

      // Progress update
      const progress: ProgressInfo = {
        current: downloadedCount,
        total: totalEmails,
        percentage: Math.round((downloadedCount / totalEmails) * 100),
        message: `Downloaded ${downloadedCount}/${totalEmails} emails`,
      };

      logger.info(progress.message);
    }
  }

  /**
   * Fetch a batch of emails from the API
   */
  private async fetchEmailBatch(
    accessToken: string,
    folderId: string,
    options: DownloadOptions,
    batchSize: number,
    skipToken: string | null
  ): Promise<EmailMessage[]> {
    try {
      const url = `${this.baseUrl}/me/mailFolders/${folderId}/messages`;
      const filter = this.buildFilter(options);

      const params: any = {
        $select:
          "id,subject,from,toRecipients,ccRecipients,bccRecipients,replyTo,receivedDateTime,sentDateTime,body,hasAttachments,internetMessageId,conversationId,importance,isRead,isDraft,webLink,inferenceClassification,parentFolderId,flag,bodyPreview",
        $orderby: "receivedDateTime desc",
        $top: batchSize,
      };

      if (filter) {
        params["$filter"] = filter;
      }

      if (skipToken) {
        params["$skip"] = skipToken;
      }

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        params,
      });

      const emails = response.data.value as EmailMessage[];

      // Download attachments if requested
      if (options.includeAttachments) {
        for (const email of emails) {
          if (email.hasAttachments) {
            email.attachments = await this.fetchEmailAttachments(
              accessToken,
              email.id
            );
          }
        }
      }

      return emails;
    } catch (error) {
      logger.error("Failed to fetch email batch:", error);
      throw error;
    }
  }

  /**
   * Fetch attachments for an email
   */
  private async fetchEmailAttachments(
    accessToken: string,
    emailId: string
  ): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/me/messages/${emailId}/attachments`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          params: {
            $select: "id,name,contentType,size,isInline,contentBytes,contentId",
          },
        }
      );

      return response.data.value;
    } catch (error) {
      logger.debug(`Failed to fetch attachments for email ${emailId}:`, error);
      return [];
    }
  }

  /**
   * Save a batch of emails to disk
   */
  private async saveEmailsBatch(
    emails: EmailMessage[],
    outputPath: string
  ): Promise<void> {
    for (const email of emails) {
      try {
        const fileName = this.generateEmailFileName(email);
        const filePath = join(outputPath, fileName);

        const emailData = {
          ...email,
          downloadedAt: new Date().toISOString(),
        };

        await Bun.write(filePath, JSON.stringify(emailData, null, 2));
      } catch (error) {
        logger.warn(`Failed to save email ${email.id}:`, error);
      }
    }
  }

  /**
   * Generate a safe filename for an email
   */
  private generateEmailFileName(email: EmailMessage): string {
    const date = format(
      new Date(email.receivedDateTime),
      "yyyy-MM-dd_HH-mm-ss"
    );
    const subject = email.subject
      .replace(/[^a-zA-Z0-9\-_\s]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 50);

    return `${date}_${subject}_${email.id}.json`;
  }

  /**
   * Build filter string for API queries
   */
  private buildFilter(options: DownloadOptions): string | null {
    const filters: string[] = [];

    if (options.fromDate) {
      const fromDateStr = options.fromDate.toISOString();
      filters.push(`receivedDateTime ge ${fromDateStr}`);
    }

    if (options.toDate) {
      const toDateStr = options.toDate.toISOString();
      filters.push(`receivedDateTime le ${toDateStr}`);
    }

    return filters.length > 0 ? filters.join(" and ") : null;
  }

  /**
   * Get next page token for pagination
   */
  private getNextPageToken(currentCount: number, batchSize: number): string {
    return currentCount.toString();
  }

  /**
   * Ensure output directory exists
   */
  private async ensureOutputDirectory(outputPath: string): Promise<void> {
    try {
      await Bun.write(join(outputPath, ".keep"), "");
    } catch (error) {
      throw new Error(`Failed to create output directory: ${error}`);
    }
  }
}
