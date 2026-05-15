import { google } from 'googleapis';
import { env } from '@config/env';
import { encrypt, decrypt } from '@utils/crypto';
import logger from '@utils/logger';
import { db, schema } from '../../db';
import { eq } from 'drizzle-orm';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.metadata',
  'https://www.googleapis.com/auth/userinfo.email',
];

export interface StoredToken {
  access_token: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

class GmailAuthService {
  private getOAuth2Client() {
    return new google.auth.OAuth2(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      env.GOOGLE_REDIRECT_URI
    );
  }

  generateAuthUrl(state?: string) {
    const client = this.getOAuth2Client();
    return client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
      state,
    });
  }

  async getTokensFromCode(code: string) {
    const client = this.getOAuth2Client();
    const { tokens } = await client.getToken(code);
    return tokens;
  }

  async getEmailFromTokens(tokens: any): Promise<string> {
    const client = this.getOAuth2Client();
    client.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: client });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    return profile.data.emailAddress || '';
  }

  async saveTokensForUser(userId: string, email: string, tokens: any) {
    const access_token_enc = encrypt(tokens.access_token);
    let refresh_token_enc = null;
    if (tokens.refresh_token) {
      refresh_token_enc = encrypt(tokens.refresh_token);
    }

    await db.insert(schema.users).values({
      id: userId,
      email: email,
      googleAccessToken: access_token_enc,
      googleRefreshToken: refresh_token_enc,
    }).onConflictDoUpdate({
      target: schema.users.email,
      set: {
        googleAccessToken: access_token_enc,
        googleRefreshToken: refresh_token_enc || undefined,
      }
    });

    logger.info(`Saved Google tokens for user ${userId} (${email})`);
  }

  async getClientForUser(userId: string) {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });

    if (!user || !user.googleAccessToken) {
      throw new Error(`No Google tokens found for user: ${userId}`);
    }

    const tokens: any = {
      access_token: decrypt(user.googleAccessToken),
      token_type: 'Bearer'
    };
    if (user.googleRefreshToken) {
      tokens.refresh_token = decrypt(user.googleRefreshToken);
    }

    const client = this.getOAuth2Client();
    client.setCredentials(tokens);

    client.on('tokens', async (newTokens) => {
      const access_token_enc = encrypt(newTokens.access_token as string);
      let refresh_token_enc = null;
      if (newTokens.refresh_token) {
        refresh_token_enc = encrypt(newTokens.refresh_token);
      }

      const updateData: any = { googleAccessToken: access_token_enc };
      if (refresh_token_enc) {
        updateData.googleRefreshToken = refresh_token_enc;
      }

      await db.update(schema.users)
        .set(updateData)
        .where(eq(schema.users.id, userId));

      logger.info(`Refreshed Google tokens for user: ${userId}`);
    });

    return client;
  }
}

export const gmailAuthService = new GmailAuthService();