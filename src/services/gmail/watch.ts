import { GmailClient } from './client';
import { db, schema } from '../../db';
import { env } from '@config/env';
import logger from '@utils/logger';

export class GmailWatchService {
  /**
   * Start watching a user's Gmail inbox for push notifications.
   * Watch subscriptions expire every 7 days, so this must be called periodically.
   */
  static async startWatch(userId: string) {
    if (!env.GOOGLE_PUBSUB_TOPIC) {
      logger.warn('GOOGLE_PUBSUB_TOPIC not configured. Skipping watch initiation.');
      return;
    }

    try {
      const client = await GmailClient.create(userId);
      const res = await client.watch(env.GOOGLE_PUBSUB_TOPIC);
      logger.info(`Started Gmail watch for user ${userId} (${client.email}). Expires: ${new Date(Number(res.expiration)).toISOString()}`);
      return res;
    } catch (error: any) {
      logger.error(`Failed to start Gmail watch for user ${userId}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Renew watches for all users in the system.
   */
  static async renewAllWatches() {
    const users = await db.query.users.findMany();
    logger.info(`Renewing Gmail watches for ${users.length} users...`);
    
    for (const user of users) {
      try {
        await this.startWatch(user.id);
      } catch (e: any) {
        logger.error(`Failed to renew watch for ${user.email}: ${e.message}`);
      }
    }
  }
}
