#!/usr/bin/env bun

import { Command } from "commander";
import chalk from "chalk";
import { AuthManager } from "./src/auth/AuthManager.js";
import { EmailDownloader } from "./src/email/EmailDownloader.js";
import { MboxExporter } from "./src/export/MboxExporter.js";
import { ConfigManager } from "./src/config/ConfigManager.js";
import { logger } from "./src/utils/logger.js";
import type { DownloadOptions, ExportOptions } from "./src/types/index.js";

const program = new Command();

// CLI Header
console.log(chalk.blue.bold("\n📧 Export Mail CLI"));
console.log(chalk.gray("Professional Outlook to MBOX email exporter\n"));

program
  .name("export-mail")
  .description("Download and export Outlook emails to MBOX format")
  .version("1.0.0");

// Auth command
program
  .command("auth")
  .description("Authenticate with Microsoft Graph API")
  .option("-r, --reset", "Reset existing authentication")
  .action(async (options) => {
    try {
      const authManager = new AuthManager();

      if (options.reset) {
        await authManager.clearAuth();
        logger.info("Authentication cleared");
      }

      const isAuthenticated = await authManager.authenticate();

      if (isAuthenticated) {
        logger.success(
          "✅ Successfully authenticated with Microsoft Graph API"
        );
      } else {
        logger.error("❌ Authentication failed");
        process.exit(1);
      }
    } catch (error) {
      logger.error("Authentication error:", error);
      process.exit(1);
    }
  });

// Download command
program
  .command("download")
  .description("Download emails from Outlook")
  .option(
    "-f, --folder <folder>",
    "Specific folder to download (default: inbox)",
    "inbox"
  )
  .option(
    "-l, --limit <number>",
    "Maximum number of emails to download",
    "1000"
  )
  .option("--from <date>", "Download emails from this date (YYYY-MM-DD)")
  .option("--to <date>", "Download emails until this date (YYYY-MM-DD)")
  .option(
    "-o, --output <path>",
    "Output directory for downloaded emails",
    "./emails"
  )
  .action(async (options) => {
    try {
      const authManager = new AuthManager();
      const isAuthenticated = await authManager.isAuthenticated();

      if (!isAuthenticated) {
        logger.error("❌ Not authenticated. Please run: export-mail auth");
        process.exit(1);
      }

      const downloadOptions: DownloadOptions = {
        folder: options.folder,
        limit: parseInt(options.limit),
        fromDate: options.from ? new Date(options.from) : undefined,
        toDate: options.to ? new Date(options.to) : undefined,
        outputPath: options.output,
      };

      const downloader = new EmailDownloader(authManager);
      await downloader.downloadEmails(downloadOptions);

      logger.success("✅ Email download completed");
    } catch (error) {
      logger.error("Download error:", error);
      process.exit(1);
    }
  });

// Export command
program
  .command("export")
  .description("Export downloaded emails to MBOX format")
  .option(
    "-i, --input <path>",
    "Input directory with downloaded emails",
    "./emails"
  )
  .option("-o, --output <file>", "Output MBOX file path", "./emails.mbox")
  .option("--compress", "Compress the MBOX file with gzip")
  .action(async (options) => {
    try {
      const exportOptions: ExportOptions = {
        inputPath: options.input,
        outputPath: options.output,
        compress: options.compress || false,
      };

      const exporter = new MboxExporter();
      await exporter.exportToMbox(exportOptions);

      logger.success("✅ MBOX export completed");
    } catch (error) {
      logger.error("Export error:", error);
      process.exit(1);
    }
  });

// Full pipeline command
program
  .command("full")
  .description("Download emails and export to MBOX in one go")
  .option(
    "-f, --folder <folder>",
    "Specific folder to download (default: inbox)",
    "inbox"
  )
  .option(
    "-l, --limit <number>",
    "Maximum number of emails to download",
    "1000"
  )
  .option("--from <date>", "Download emails from this date (YYYY-MM-DD)")
  .option("--to <date>", "Download emails until this date (YYYY-MM-DD)")
  .option("-o, --output <file>", "Output MBOX file path", "./emails.mbox")
  .option("--compress", "Compress the MBOX file with gzip")
  .action(async (options) => {
    try {
      const authManager = new AuthManager();
      const isAuthenticated = await authManager.isAuthenticated();

      if (!isAuthenticated) {
        logger.error("❌ Not authenticated. Please run: export-mail auth");
        process.exit(1);
      }

      // Download emails
      const downloadOptions: DownloadOptions = {
        folder: options.folder,
        limit: parseInt(options.limit),
        fromDate: options.from ? new Date(options.from) : undefined,
        toDate: options.to ? new Date(options.to) : undefined,
        outputPath: "./temp-emails",
      };

      const downloader = new EmailDownloader(authManager);
      await downloader.downloadEmails(downloadOptions);

      // Export to MBOX
      const exportOptions: ExportOptions = {
        inputPath: "./temp-emails",
        outputPath: options.output,
        compress: options.compress || false,
      };

      const exporter = new MboxExporter();
      await exporter.exportToMbox(exportOptions);

      // Cleanup temp directory
      await Bun.$`rm -rf ./temp-emails`.quiet();

      logger.success("✅ Full pipeline completed successfully");
    } catch (error) {
      logger.error("Pipeline error:", error);
      process.exit(1);
    }
  });

// Status command
program
  .command("status")
  .description("Show authentication and configuration status")
  .action(async () => {
    try {
      const authManager = new AuthManager();
      const configManager = new ConfigManager();

      console.log(chalk.blue.bold("\n📊 Status Report\n"));

      const isAuthenticated = await authManager.isAuthenticated();
      console.log(
        `Authentication: ${
          isAuthenticated
            ? chalk.green("✅ Authenticated")
            : chalk.red("❌ Not authenticated")
        }`
      );

      const config = await configManager.getConfig();
      console.log(
        `Configuration: ${
          config
            ? chalk.green("✅ Configured")
            : chalk.yellow("⚠️  Using defaults")
        }`
      );

      if (isAuthenticated) {
        const userInfo = await authManager.getUserInfo();
        console.log(`User: ${chalk.cyan(userInfo?.displayName || "Unknown")}`);
        console.log(
          `Email: ${chalk.cyan(
            userInfo?.mail || userInfo?.userPrincipalName || "Unknown"
          )}`
        );
      }

      console.log();
    } catch (error) {
      logger.error("Status check error:", error);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
