export interface EmailMetadata {
  subject: string;
  senderEmail: string;
  senderName: string;
  receivedDate: Date;
  messageId: string;
  threadId: string;
  snippet: string;
  attachmentCount: number;
  attachmentTypes: string[];
  gmailLink: string;
  accountEmail: string;
}

export interface SyncAccount {
  email: string;
  name: string;
  historyId?: string;
  lastMessageId?: string;
}
