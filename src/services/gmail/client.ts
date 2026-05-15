import { google, gmail_v1 } from 'googleapis';
import { gmailAuthService } from './auth';
import { EmailMetadata } from '../../types';
import logger from '@utils/logger';

export class GmailClient {
  private gmail: gmail_v1.Gmail;

  constructor(public email: string, auth: any) {
    this.gmail = google.gmail({ version: 'v1', auth });
  }

  static async create(userId: string) {
    const auth = await gmailAuthService.getClientForUser(userId);
    const tempGmail = google.gmail({ version: 'v1', auth });
    const profile = await tempGmail.users.getProfile({ userId: 'me' });
    return new GmailClient(profile.data.emailAddress!, auth);
  }

  async getProfile() {
    const res = await this.gmail.users.getProfile({ userId: 'me' });
    return res.data;
  }

  async listHistory(startHistoryId: string) {
    const res = await this.gmail.users.history.list({
      userId: 'me',
      startHistoryId,
    });
    return res.data;
  }

  async listMessages(query?: string, pageToken?: string) {
    const res = await this.gmail.users.messages.list({
      userId: 'me',
      q: query,
      pageToken,
    });
    return res.data;
  }

  async getMessage(id: string) {
    const res = await this.gmail.users.messages.get({
      userId: 'me',
      id,
      format: 'full',
    });
    return res.data;
  }

  async watch(topicName: string) {
    const res = await this.gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName,
        labelIds: ['INBOX'], // Optional: only watch INBOX
      },
    });
    return res.data;
  }

  async stop() {
    await this.gmail.users.stop({ userId: 'me' });
  }

  async getMetadata(message: gmail_v1.Schema$Message): Promise<EmailMetadata> {
    const headers = message.payload?.headers || [];
    const getHeader = (name: string) => headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

    const subject = getHeader('Subject');
    const from = getHeader('From');
    const date = getHeader('Date');
    const messageId = getHeader('Message-ID') || message.id || '';
    
    // Parse Sender
    const fromMatch = from.match(/^(.*)<(.*)>$/);
    const senderName = fromMatch ? fromMatch[1].trim() : from;
    const senderEmail = fromMatch ? fromMatch[2].trim() : from;

    // Attachments
    const attachmentParts = this.findAttachmentParts(message.payload);
    const attachmentTypes = [...new Set(attachmentParts.map(p => p.filename?.split('.').pop() || 'unknown'))];

    return {
      subject,
      senderEmail,
      senderName,
      receivedDate: new Date(date),
      messageId,
      threadId: message.threadId || '',
      snippet: message.snippet || '',
      attachmentCount: attachmentParts.length,
      attachmentTypes,
      gmailLink: `https://mail.google.com/mail/u/0/#inbox/${message.id}`,
      accountEmail: this.email,
    };
  }

  private findAttachmentParts(part: gmail_v1.Schema$MessagePart | undefined): gmail_v1.Schema$MessagePart[] {
    if (!part) return [];
    let parts: gmail_v1.Schema$MessagePart[] = [];
    if (part.filename && part.filename.length > 0) {
      parts.push(part);
    }
    if (part.parts) {
      for (const p of part.parts) {
        parts = parts.concat(this.findAttachmentParts(p));
      }
    }
    return parts;
  }
}
