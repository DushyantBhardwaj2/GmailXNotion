import { Router, Request, Response } from 'express';
import { gmailAuthService } from '../../services/gmail/auth';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { db, schema } from '../../db';
import { eq } from 'drizzle-orm';

const router = Router();

// ==================================
// Google OAuth Routes
// ==================================

// 1. Initiate Google OAuth
router.get('/google', (req: Request, res: Response) => {
  const state = crypto.randomUUID(); // For CSRF
  const url = gmailAuthService.generateAuthUrl(state);
  res.redirect(url);
});

// 2. Google OAuth Callback
router.get('/google/callback', async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string;
    if (!code) {
      return res.status(400).send('No code provided');
    }

    const tokens = await gmailAuthService.getTokensFromCode(code);
    const email = await gmailAuthService.getEmailFromTokens(tokens);

    // Check if user already exists
    let user = await db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });

    let userId = user?.id;

    if (!userId) {
      userId = crypto.randomUUID();
    }

    // Save tokens and ensure user exists
    await gmailAuthService.saveTokensForUser(userId, email, tokens);

    // Start Gmail Watch (Phase 6.2)
    const { GmailWatchService } = await import('../../services/gmail/watch');
    GmailWatchService.startWatch(userId).catch(err => {
      console.error('Failed to initiate Gmail watch:', err);
    });

    // Generate Session JWT
    const token = jwt.sign({ userId, email }, env.JWT_SECRET, { expiresIn: '7d' });

    res.cookie('auth_token', token, { httpOnly: true, secure: env.NODE_ENV === 'production' });
    res.json({ success: true, message: 'Google OAuth successful', userId });

  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(500).json({ success: false, error: 'Authentication failed' });
  }
});

// ==================================
// Notion OAuth Routes
// ==================================

router.get('/notion', (req: Request, res: Response) => {
  const state = (req.query.userId as string) || req.cookies?.auth_token; 
  if (!state) {
    return res.status(401).send('Must be logged in to connect Notion');
  }

  const notionAuthUrl = `https://api.notion.com/v1/oauth/authorize?client_id=${env.NOTION_CLIENT_ID}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(env.NOTION_REDIRECT_URI)}&state=${state}`;
  res.redirect(notionAuthUrl);
});

router.get('/notion/callback', async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string;
    const state = req.query.state as string;

    if (!code || !state) {
      return res.status(400).send('Missing code or state');
    }

    let userId = state;
    try {
      const decoded = jwt.verify(state, env.JWT_SECRET) as any;
      userId = decoded.userId;
    } catch(e) {
      // maybe state is just userId directly for testing
    }

    const response = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${env.NOTION_CLIENT_ID}:${env.NOTION_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: env.NOTION_REDIRECT_URI,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Notion token error:', errorText);
      return res.status(400).send('Failed to exchange Notion token');
    }

    const data: any = await response.json();

    const { access_token, workspace_id, workspace_name, workspace_icon, bot_id } = data;
    const { encrypt } = await import('../../utils/crypto');

    const encryptedToken = encrypt(access_token);
    const workspacePrimaryId = crypto.randomUUID();

    await db.insert(schema.notionWorkspaces).values({
      id: workspacePrimaryId,
      userId,
      accessToken: encryptedToken,
      workspaceId: workspace_id,
      workspaceName: workspace_name,
      workspaceIcon: workspace_icon,
      botId: bot_id,
    }).onConflictDoUpdate({
      target: schema.notionWorkspaces.id,
      set: {
        accessToken: encryptedToken,
        workspaceName: workspace_name,
        workspaceIcon: workspace_icon,
      }
    });

    const { provisionWorkspace } = await import('../../services/notion/provisioning');

    provisionWorkspace(userId, workspacePrimaryId).catch(err => {
      console.error('Provisioning engine failed in background:', err);
    });

    res.json({ success: true, message: 'Notion connected successfully! Provisioning starting...' });

  } catch (error) {
    console.error('Notion OAuth Error:', error);
    res.status(500).json({ success: false, error: 'Notion Auth failed' });
  }
});

export default router;