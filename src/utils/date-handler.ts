import { format, parseISO } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

/**
 * Normalizes a date to UTC from a specific timezone
 */
export function normalizeToUtc(date: Date | string, timezone: string): Date {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return zonedTimeToUtc(d, timezone);
}

/**
 * Formats a date for Notion (ISO 8601)
 */
export function formatForNotion(date: Date): string {
  return date.toISOString();
}

/**
 * Extracts a date from an email subject or snippet.
 * This is a basic implementation to catch common formats like "Interview on Oct 24" or "Meeting tomorrow".
 */
export function extractDateFromText(text: string): Date | null {
  // Simple regex for "MMM DD" or "Month DD"
  const dateRegex = /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}\b/i;
  const match = text.match(dateRegex);
  
  if (match) {
    // Note: In a real system, you'd want to parse this relative to the email's received year.
    // For MVP, returning a placeholder Date or parsed string to indicate detection.
    const parsed = new Date(`${match[0]} ${new Date().getFullYear()}`);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  
  return null;
}
