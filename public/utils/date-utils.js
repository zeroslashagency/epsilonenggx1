/**
 * Date and Time Utilities
 * Simple helper functions for date/time operations
 */

class DateUtils {
    /**
     * Format date for display
     * @param {Date} date - Date object
     * @param {string} format - Format type ('display', 'input', 'time')
     */
    static formatDate(date, format = 'display') {
        if (!date) return '';
        
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hour = String(d.getHours()).padStart(2, '0');
        const minute = String(d.getMinutes()).padStart(2, '0');
        
        switch (format) {
            case 'input':
                return `${year}-${month}-${day}T${hour}:${minute}`;
            case 'time':
                return `${hour}:${minute}`;
            case 'display':
            default:
                return `${year}-${month}-${day} ${hour}:${minute}`;
        }
    }
    
    /**
     * Parse date string to Date object
     * @param {string} dateString - Date string
     */
    static parseDate(dateString) {
        if (!dateString) return null;
        try {
            return new Date(dateString);
        } catch (error) {
            console.warn('Failed to parse date:', dateString);
            return null;
        }
    }
    
    /**
     * Add minutes to a date
     * @param {Date} date - Base date
     * @param {number} minutes - Minutes to add
     */
    static addMinutes(date, minutes) {
        const result = new Date(date);
        result.setMinutes(result.getMinutes() + minutes);
        return result;
    }
    
    /**
     * Calculate duration between two dates
     * @param {Date} start - Start date
     * @param {Date} end - End date
     */
    static calculateDuration(start, end) {
        if (!start || !end) return '0M';
        
        const diffMs = end.getTime() - start.getTime();
        const minutes = Math.round(diffMs / 60000);
        
        if (minutes < 60) return `${minutes}M`;
        if (minutes < 1440) return `${Math.floor(minutes / 60)}H ${minutes % 60}M`;
        
        const days = Math.floor(minutes / 1440);
        const remainingMinutes = minutes % 1440;
        const hours = Math.floor(remainingMinutes / 60);
        const remainingMins = remainingMinutes % 60;
        
        return `${days}D ${hours}H ${remainingMins}M`;
    }
}

// Make DateUtils available globally for browser
window.DateUtils = DateUtils;
