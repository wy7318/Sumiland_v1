import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { DateTime } from 'luxon';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

/**
 * Format a date string using the local timezone
 * Note: For organization-specific timezone, use the TimeZoneContext instead
 */
export function formatDate(dateString: string, timezone: string = 'UTC'): string {
  if (!dateString) return '';
  
  try {
    return DateTime.fromISO(dateString, { zone: 'UTC' })
      .setZone(timezone)
      .toFormat('LLL dd, yyyy');
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

/**
 * Format a date and time string using the local timezone
 * Note: For organization-specific timezone, use the TimeZoneContext instead
 */
export function formatDateTime(dateString: string, timezone: string = 'UTC'): string {
  if (!dateString) return '';
  
  try {
    return DateTime.fromISO(dateString, { zone: 'UTC' })
      .setZone(timezone)
      .toFormat('LLL dd, yyyy, t');
  } catch (error) {
    console.error('Error formatting date time:', error);
    return '';
  }
}

/**
 * Format a time string using the local timezone
 * Note: For organization-specific timezone, use the TimeZoneContext instead
 */
export function formatTime(dateString: string, timezone: string = 'UTC'): string {
  if (!dateString) return '';
  
  try {
    return DateTime.fromISO(dateString, { zone: 'UTC' })
      .setZone(timezone)
      .toFormat('t');
  } catch (error) {
    console.error('Error formatting time:', error);
    return '';
  }
}