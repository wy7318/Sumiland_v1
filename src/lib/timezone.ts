// lib/timezone.ts

export interface DayHours {
    isOpen: boolean;
    open: string;  // HH:MM format
    close: string; // HH:MM format
  }
  
  export interface BusinessHours {
    monday?: DayHours;
    tuesday?: DayHours;
    wednesday?: DayHours;
    thursday?: DayHours;
    friday?: DayHours;
    saturday?: DayHours;
    sunday?: DayHours;
    [key: string]: DayHours | undefined;
  }
  
  export interface RestaurantStatus {
    isOpen: boolean;
    message?: string;
    nextOpenTime?: string;
    todayHours?: DayHours | null;
  }
  
  export class TimezoneUtils {
    /**
     * Get current time in restaurant's timezone
     */
    static getRestaurantTime(timezone: string): Date {
      try {
        const now = new Date();
        
        // Use Intl.DateTimeFormat for proper timezone conversion
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
        
        const parts = formatter.formatToParts(now);
        const restaurantTime = new Date(
          parseInt(parts.find(part => part.type === 'year')?.value || '0'),
          parseInt(parts.find(part => part.type === 'month')?.value || '1') - 1, // Month is 0-indexed
          parseInt(parts.find(part => part.type === 'day')?.value || '1'),
          parseInt(parts.find(part => part.type === 'hour')?.value || '0'),
          parseInt(parts.find(part => part.type === 'minute')?.value || '0'),
          parseInt(parts.find(part => part.type === 'second')?.value || '0')
        );
        
        return restaurantTime;
      } catch (error) {
        console.error('Error getting restaurant time:', error);
        return new Date(); // Fallback to local time
      }
    }
  
    /**
     * Get day name from date
     */
    static getDayName(date: Date): string {
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      return dayNames[date.getDay()];
    }
  
    /**
     * Format time for display
     */
    static formatTime(time: string): string {
      try {
        // Convert 24-hour time to 12-hour format
        const [hours, minutes] = time.split(':');
        const hour24 = parseInt(hours);
        const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
        const ampm = hour24 >= 12 ? 'PM' : 'AM';
        return `${hour12}:${minutes} ${ampm}`;
      } catch (error) {
        return time; // Return original if formatting fails
      }
    }
  
    /**
     * Check if restaurant is currently open
     */
    static isRestaurantOpen(operatingHours: BusinessHours, timezone: string): RestaurantStatus {
      if (!operatingHours || !timezone) {
        return {
          isOpen: true,
          message: 'Operating hours not configured'
        };
      }
  
      try {
        const restaurantTime = this.getRestaurantTime(timezone);
        const currentDay = this.getDayName(restaurantTime);
        const todayHours = operatingHours[currentDay];
  
        if (!todayHours || !todayHours.isOpen) {
          // Find next open day
          const nextOpenTime = this.findNextOpenTime(operatingHours, timezone);
          return {
            isOpen: false,
            message: 'Closed today',
            todayHours,
            nextOpenTime
          };
        }
  
        // Check if current time is within operating hours
        const currentTimeStr = restaurantTime.toTimeString().substring(0, 5); // HH:MM format
        const openTime = todayHours.open;
        const closeTime = todayHours.close;
  
        let isWithinHours: boolean;
        let message: string;
  
        // Handle cases where restaurant closes after midnight
        if (closeTime < openTime) {
          // Restaurant closes next day (e.g., open 22:00, close 02:00)
          isWithinHours = currentTimeStr >= openTime || currentTimeStr <= closeTime;
          message = isWithinHours 
            ? `Open until ${this.formatTime(closeTime)} tomorrow` 
            : `Opens at ${this.formatTime(openTime)}`;
        } else {
          // Normal hours (e.g., open 09:00, close 22:00)
          isWithinHours = currentTimeStr >= openTime && currentTimeStr <= closeTime;
          
          if (!isWithinHours) {
            if (currentTimeStr < openTime) {
              message = `Opens at ${this.formatTime(openTime)}`;
            } else {
              message = `Closed - was open until ${this.formatTime(closeTime)}`;
            }
          } else {
            message = `Open until ${this.formatTime(closeTime)}`;
          }
        }
  
        return {
          isOpen: isWithinHours,
          message,
          todayHours
        };
      } catch (error) {
        console.error('Error checking restaurant hours:', error);
        return {
          isOpen: true,
          message: 'Unable to determine hours',
          todayHours: null
        };
      }
    }
  
    /**
     * Find the next time the restaurant opens
     */
    private static findNextOpenTime(operatingHours: BusinessHours, timezone: string): string | undefined {
      try {
        const restaurantTime = this.getRestaurantTime(timezone);
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        
        // Check the next 7 days
        for (let i = 1; i <= 7; i++) {
          const nextDate = new Date(restaurantTime);
          nextDate.setDate(nextDate.getDate() + i);
          const nextDay = dayNames[nextDate.getDay()];
          const nextDayHours = operatingHours[nextDay];
          
          if (nextDayHours && nextDayHours.isOpen) {
            const dayName = nextDay.charAt(0).toUpperCase() + nextDay.slice(1);
            return `${dayName} at ${this.formatTime(nextDayHours.open)}`;
          }
        }
        
        return undefined;
      } catch (error) {
        console.error('Error finding next open time:', error);
        return undefined;
      }
    }
  
    /**
     * Get all business hours formatted for display
     */
    static getAllBusinessHours(operatingHours: BusinessHours): Record<string, string> {
      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      
      const result: Record<string, string> = {};
      
      dayNames.forEach((dayName, index) => {
        const dayKey = dayKeys[index];
        const dayHours = operatingHours[dayKey];
        
        if (!dayHours || !dayHours.isOpen) {
          result[dayName] = 'Closed';
        } else {
          result[dayName] = `${this.formatTime(dayHours.open)} - ${this.formatTime(dayHours.close)}`;
        }
      });
      
      return result;
    }
  
    /**
     * Validate business hours format
     */
    static validateBusinessHours(operatingHours: any): operatingHours is BusinessHours {
      if (!operatingHours || typeof operatingHours !== 'object') {
        return false;
      }
  
      const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      
      for (const day of dayKeys) {
        const dayHours = operatingHours[day];
        if (dayHours) {
          if (typeof dayHours !== 'object' || 
              typeof dayHours.isOpen !== 'boolean' ||
              (dayHours.isOpen && (!dayHours.open || !dayHours.close))) {
            return false;
          }
        }
      }
      
      return true;
    }
  
    /**
     * Get current status text for display
     */
    static getStatusText(operatingHours: BusinessHours, timezone: string): string {
      const status = this.isRestaurantOpen(operatingHours, timezone);
      return status.isOpen ? 'Open Now' : 'Closed';
    }
  
    /**
     * Get today's hours formatted for display
     */
    static getTodayHours(operatingHours: BusinessHours, timezone: string): string {
      try {
        const restaurantTime = this.getRestaurantTime(timezone);
        const currentDay = this.getDayName(restaurantTime);
        const todayHours = operatingHours[currentDay];
  
        if (!todayHours || !todayHours.isOpen) {
          return 'Closed today';
        }
  
        return `${this.formatTime(todayHours.open)} - ${this.formatTime(todayHours.close)}`;
      } catch (error) {
        console.error('Error getting today hours:', error);
        return 'Hours unavailable';
      }
    }
  }