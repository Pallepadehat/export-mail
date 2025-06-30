// Configuration types
export interface AppConfig {
  clientId: string;
  tenantId: string;
  redirectUri: string;
  scopes: string[];
  cachePath: string;
}

// Authentication types
export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresOn: Date;
  account: any;
}

export interface UserInfo {
  id: string;
  displayName: string;
  mail: string;
  userPrincipalName: string;
}

// Email types
export interface EmailMessage {
  id: string;
  subject: string;
  from: EmailAddress;
  toRecipients: EmailAddress[];
  ccRecipients: EmailAddress[];
  bccRecipients: EmailAddress[];
  replyTo: EmailAddress[];
  receivedDateTime: string;
  sentDateTime: string;
  body: EmailBody;
  attachments?: EmailAttachment[];
  internetMessageId: string;
  conversationId: string;
  importance: "low" | "normal" | "high";
  isRead: boolean;
  isDraft: boolean;
  webLink: string;
  inferenceClassification: string;
  hasAttachments: boolean;
  parentFolderId: string;
  flag: any;
  bodyPreview: string;
}

export interface EmailAddress {
  name: string;
  address: string;
}

export interface EmailBody {
  contentType: "text" | "html";
  content: string;
}

export interface EmailAttachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
  isInline: boolean;
  contentBytes?: string;
  contentId?: string;
}

// Folder types
export interface MailFolder {
  id: string;
  displayName: string;
  parentFolderId?: string;
  childFolderCount: number;
  unreadItemCount: number;
  totalItemCount: number;
  sizeInBytes: number;
}

// Download options
export interface DownloadOptions {
  folder: string;
  limit: number;
  fromDate?: Date;
  toDate?: Date;
  outputPath: string;
  includeAttachments?: boolean;
  batchSize?: number;
}

// Export options
export interface ExportOptions {
  inputPath: string;
  outputPath: string;
  compress: boolean;
  includeAttachments?: boolean;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

// Progress tracking
export interface ProgressInfo {
  current: number;
  total: number;
  percentage: number;
  message: string;
}

// MBOX format types
export interface MboxMessage {
  from: string;
  date: string;
  subject: string;
  messageId: string;
  headers: Record<string, string>;
  body: string;
  attachments?: MboxAttachment[];
}

export interface MboxAttachment {
  filename: string;
  contentType: string;
  content: string; // base64 encoded
  size: number;
}
