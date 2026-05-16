import { EmailMetadata } from '../../types';
import { FeedConfiguration, FeedRule } from '../../types/feed';
import { withRetry, rateLimit } from '../../utils/retry';
import logger from '../../utils/logger';

export class FeedEngine {
  private activeFeeds: FeedConfiguration[] = [];
  private lastFetch: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Evaluates an email against all active feeds for a specific workspace.
   */
  async evaluate(email: EmailMetadata, notion: any, feedsDbId: string): Promise<string[]> {
    await this.ensureFeedsLoaded(notion, feedsDbId);
    const matches: string[] = [];

    for (const feed of this.activeFeeds) {
      if (this.matchesRule(email, feed.rules)) {
        matches.push(feed.name);
      }
    }

    return matches;
  }

  private matchesRule(email: EmailMetadata, rules: FeedRule): boolean {
    const senderDomain = email.senderEmail.split('@')[1]?.toLowerCase() || '';
    const searchString = `${email.subject} ${email.snippet}`.toLowerCase();

    // 1. Exclusions (Fail Fast)
    if (rules.exclude) {
      if (rules.exclude.domains?.some(d => senderDomain === d.toLowerCase())) return false;
      if (rules.exclude.keywords?.some(k => searchString.includes(k.toLowerCase()))) return false;
    }

    // 2. Required Conditions
    if (rules.required) {
      if (rules.required.accounts && rules.required.accounts.length > 0) {
        if (!rules.required.accounts.includes(email.accountEmail)) return false;
      }
    }

    // 3. Optional Conditions (Must match at least one if defined)
    if (rules.optional) {
      const hasOptionalRules = (rules.optional.domains?.length || 0) > 0 || (rules.optional.keywords?.length || 0) > 0;
      
      if (hasOptionalRules) {
        let matchedOptional = false;
        
        if (rules.optional.domains?.some(d => senderDomain === d.toLowerCase())) {
          matchedOptional = true;
        }
        
        if (!matchedOptional && rules.optional.keywords?.some(k => searchString.includes(k.toLowerCase()))) {
          matchedOptional = true;
        }

        if (!matchedOptional) return false;
      }
    }

    return true;
  }

  private async ensureFeedsLoaded(notion: any, feedsDbId: string) {
    if (Date.now() - this.lastFetch < this.CACHE_TTL && this.activeFeeds.length > 0) {
      return;
    }

    try {
      const response = await withRetry(() =>
        rateLimit(() =>
          notion.databases.query({
            database_id: feedsDbId,
          })
        )
      ) as any;

      this.activeFeeds = response.results.map((page: any) => {
        const props = page.properties;
        const name = props['Feed Name']?.title[0]?.plain_text || 'Unnamed Feed';
        
        // Parse Rules JSON if it exists, otherwise fall back to simple Multi-selects
        let rules: FeedRule = {};
        const rulesJsonStr = props['Rules JSON (Optional)']?.rich_text[0]?.plain_text;
        
        if (rulesJsonStr) {
          try {
            rules = JSON.parse(rulesJsonStr);
          } catch (e) {
            logger.error(`Failed to parse Rules JSON for feed: ${name}`);
          }
        } else {
          // Legacy mapping from Multi-selects
          rules = {
            optional: {
              domains: props['Domains']?.multi_select.map((s: any) => s.name) || [],
              keywords: props['Keywords']?.multi_select.map((s: any) => s.name) || [],
            }
          };
        }

        return {
          id: page.id,
          name,
          rules,
        };
      });

      this.lastFetch = Date.now();
      logger.info(`Loaded ${this.activeFeeds.length} active feeds into engine cache.`);
    } catch (error: any) {
      logger.error('Failed to load feeds from Notion', { error: error.message });
      if (this.activeFeeds.length === 0) {
        throw new Error('Critical: Cannot evaluate emails without feed configurations.');
      }
    }
  }
}

export const feedEngine = new FeedEngine();
