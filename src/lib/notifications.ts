// src/utils/notifications.ts

/**
 * Utility functions for showing toast notifications
 * This provides fallback mechanisms to ensure notifications display
 */

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

/**
 * Show a toast notification with multiple fallback methods
 * @param message The message to display
 * @param type The type of notification (success, error, warning, info)
 */
export const showNotification = (message: string, type: NotificationType = 'info'): void => {
  // Try multiple methods to ensure the notification appears

  // Method 1: Direct global function if available
  if (typeof window !== 'undefined' && window.showToast) {
    try {
      window.showToast(message, type);
      return;
    } catch (err) {
      console.error('Failed to show toast via window.showToast:', err);
    }
  }

  // Method 2: Try inserting a script that calls the function
  // This helps in cases where the function exists but is not directly accessible
  try {
    const safeMessage = message.replace(/"/g, '\\"').replace(/'/g, "\\'");
    const script = document.createElement('script');
    script.innerHTML = `
      setTimeout(() => {
        if (window.showToast) {
          window.showToast("${safeMessage}", "${type}");
        }
      }, 100);
    `;
    document.body.appendChild(script);
    setTimeout(() => {
      document.body.removeChild(script);
    }, 500);
    return;
  } catch (err) {
    console.error('Failed to show toast via script injection:', err);
  }

  // Method 3: Fallback to a basic alert for critical errors
  if (type === 'error') {
    try {
      // Only use alert for critical errors as a last resort
      alert(message);
      return;
    } catch (err) {
      console.error('Failed to show alert:', err);
    }
  }

  // Last resort: log to console
  console.log(`[${type.toUpperCase()}]: ${message}`);
};

// Add type definitions to the window object
declare global {
  interface Window {
    showToast?: (message: string, type?: string) => string;
    hideToast?: (id: string) => void;
  }
}