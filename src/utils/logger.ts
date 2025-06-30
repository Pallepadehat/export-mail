import chalk from "chalk";

export type LogLevel = "debug" | "info" | "warn" | "error" | "success";

class Logger {
  private logLevel: LogLevel = "info";

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      success: 1,
    };

    return levels[level] >= levels[this.logLevel];
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    ...args: any[]
  ): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}]`;

    let coloredLevel: string;
    switch (level) {
      case "debug":
        coloredLevel = chalk.gray("DEBUG");
        break;
      case "info":
        coloredLevel = chalk.blue("INFO");
        break;
      case "warn":
        coloredLevel = chalk.yellow("WARN");
        break;
      case "error":
        coloredLevel = chalk.red("ERROR");
        break;
      case "success":
        coloredLevel = chalk.green("SUCCESS");
        break;
    }

    const fullMessage =
      args.length > 0
        ? `${message} ${args
            .map((arg) =>
              typeof arg === "object"
                ? JSON.stringify(arg, null, 2)
                : String(arg)
            )
            .join(" ")}`
        : message;

    return `${chalk.gray(prefix)} ${coloredLevel} ${fullMessage}`;
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog("debug")) {
      console.log(this.formatMessage("debug", message, ...args));
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog("info")) {
      console.log(this.formatMessage("info", message, ...args));
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog("warn")) {
      console.warn(this.formatMessage("warn", message, ...args));
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog("error")) {
      console.error(this.formatMessage("error", message, ...args));
    }
  }

  success(message: string, ...args: any[]): void {
    if (this.shouldLog("success")) {
      console.log(this.formatMessage("success", message, ...args));
    }
  }

  // Special methods for CLI usage
  step(step: number, total: number, message: string): void {
    const progress = `${step}/${total}`;
    const progressBar = "█"
      .repeat(Math.floor((step / total) * 20))
      .padEnd(20, "░");
    console.log(chalk.blue(`[${progress}] ${progressBar} ${message}`));
  }

  separator(): void {
    console.log(chalk.gray("─".repeat(60)));
  }

  header(title: string): void {
    console.log();
    console.log(
      chalk.blue.bold(
        `┌─ ${title} ─${"─".repeat(Math.max(0, 50 - title.length))}┐`
      )
    );
  }

  footer(): void {
    console.log(chalk.blue.bold(`└${"─".repeat(52)}┘`));
    console.log();
  }
}

export const logger = new Logger();
