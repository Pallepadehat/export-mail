# 📧 Export Mail CLI

A professional command-line tool to download emails from Microsoft Outlook and export them to MBOX format for easy import into Gmail, iCloud, or other email clients.

## ✨ Features

- **🔐 Secure Authentication** - Uses Microsoft Graph API with device code flow
- **📥 Bulk Email Download** - Download thousands of emails efficiently with batch processing
- **📤 MBOX Export** - Professional MBOX format generation compatible with Gmail/iCloud
- **📁 Folder Support** - Download from specific folders (inbox, sent, drafts, or custom folders)
- **📅 Date Filtering** - Filter emails by date range
- **🗜️ Compression** - Optional gzip compression for smaller files
- **📊 Progress Tracking** - Beautiful progress indicators and detailed logging
- **⚡ Built with Bun** - Lightning-fast performance using modern JavaScript runtime

## 🚀 Installation

### Prerequisites

- [Bun](https://bun.sh) runtime installed
- Microsoft Outlook/Office 365 account

### Install Dependencies

```bash
bun install
```

### Build the CLI

```bash
bun run build
```

## 🔧 Usage

### 1. Authentication

First, authenticate with your Microsoft account:

```bash
bun run dev auth
```

This will open a device code authentication flow:

1. Open the provided URL in your browser
2. Enter the displayed code
3. Sign in with your Microsoft account
4. Grant the necessary permissions

### 2. Check Status

Verify your authentication and configuration:

```bash
bun run dev status
```

### 3. Download Emails

Download emails from your Outlook account:

```bash
# Download from inbox (default)
bun run dev download

# Download from specific folder
bun run dev download --folder "Sent Items"

# Download with date range
bun run dev download --from 2024-01-01 --to 2024-12-31

# Download limited number of emails
bun run dev download --limit 500

# Custom output directory
bun run dev download --output ./my-emails
```

### 4. Export to MBOX

Convert downloaded emails to MBOX format:

```bash
# Basic export
bun run dev export

# Custom input/output paths
bun run dev export --input ./my-emails --output ./backup.mbox

# Compressed export
bun run dev export --output ./backup.mbox --compress
```

### 5. Full Pipeline

Download and export in one command:

```bash
# Download and export in one go
bun run dev full

# With options
bun run dev full --folder inbox --limit 1000 --from 2024-01-01 --compress
```

## 📋 Command Reference

### Authentication Commands

- `auth` - Authenticate with Microsoft Graph API
- `auth --reset` - Reset existing authentication
- `status` - Show authentication and configuration status

### Download Commands

- `download` - Download emails from Outlook
  - `-f, --folder <folder>` - Specific folder (default: inbox)
  - `-l, --limit <number>` - Max emails to download (default: 1000)
  - `--from <date>` - Start date (YYYY-MM-DD)
  - `--to <date>` - End date (YYYY-MM-DD)
  - `-o, --output <path>` - Output directory (default: ./emails)

### Export Commands

- `export` - Export downloaded emails to MBOX
  - `-i, --input <path>` - Input directory (default: ./emails)
  - `-o, --output <file>` - Output MBOX file (default: ./emails.mbox)
  - `--compress` - Compress with gzip

### Pipeline Commands

- `full` - Complete download and export pipeline
  - Combines download and export options
  - Automatically cleans up temporary files

## 📁 Supported Folders

### Standard Folders

- `inbox` - Inbox
- `sent` - Sent Items
- `drafts` - Drafts
- `deleted` - Deleted Items
- `junk` - Junk Email

### Custom Folders

You can specify any custom folder name:

```bash
bun run dev download --folder "My Custom Folder"
```

## 🎯 MBOX Compatibility

The generated MBOX files are compatible with:

- **Gmail** - Import via Google Takeout or third-party tools
- **iCloud Mail** - Import via Mail.app on macOS
- **Thunderbird** - Direct import
- **Apple Mail** - Direct import
- **Other email clients** - Standard RFC 4155 MBOX format

## 🔒 Security & Privacy

- **No passwords stored** - Uses secure OAuth 2.0 device code flow
- **Local storage only** - All data stays on your machine
- **Minimal permissions** - Only requests necessary email read permissions
- **Open source** - Full transparency of all operations

## ⚙️ Configuration

The CLI uses sensible defaults but can be customized:

### Configuration File

Located at `~/.export-mail/config.json`

### Default Scopes

- `Mail.Read` - Read email messages
- `Mail.ReadWrite` - Read and modify email (for marking as read)
- `User.Read` - Read user profile
- `MailboxSettings.Read` - Read mailbox settings

### Cache Location

Authentication tokens are cached at `~/.export-mail/`

## 🐛 Troubleshooting

### Authentication Issues

```bash
# Reset authentication
bun run dev auth --reset

# Check status
bun run dev status
```

### Permission Errors

Make sure your Microsoft account has the necessary permissions and your organization allows third-party app access.

### Large Mailbox Downloads

For very large mailboxes:

1. Use date ranges to break up downloads
2. Increase the limit gradually
3. Monitor disk space

### MBOX Import Issues

- Ensure the MBOX file is not corrupted
- Try importing a smaller subset first
- Some email clients require specific MBOX variants

## 🏗️ Development

### Project Structure

```
export-mail/
├── src/
│   ├── auth/          # Authentication management
│   ├── config/        # Configuration handling
│   ├── email/         # Email downloading
│   ├── export/        # MBOX export
│   ├── types/         # TypeScript definitions
│   └── utils/         # Utilities and logging
├── index.ts           # CLI entry point
└── package.json       # Dependencies and scripts
```

### Tech Stack

- **Runtime**: Bun
- **Language**: TypeScript
- **Authentication**: Microsoft Graph API with MSAL
- **CLI Framework**: Commander.js
- **Progress Indicators**: Ora
- **Styling**: Chalk

### Building

```bash
# Development mode
bun run dev

# Build for production
bun run build

# Start built version
bun run start
```

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🙏 Acknowledgments

- Microsoft Graph API for email access
- Bun team for the amazing runtime
- Open source community for the excellent libraries

---

Made with ❤️ for seamless email migrations
