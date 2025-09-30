/**
 * Validation Utilities
 * Simple validation functions for the scheduler
 */

class ValidationUtils {
    /**
     * Validate email format
     * @param {string} email - Email to validate
     */
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    /**
     * Validate order data
     * @param {Object} order - Order object to validate
     */
    static validateOrder(order) {
        const errors = [];
        
        if (!order.partNumber || order.partNumber.trim() === '') {
            errors.push('Part number is required');
        }
        
        if (!order.orderQuantity || order.orderQuantity <= 0) {
            errors.push('Order quantity must be greater than 0');
        }
        
        if (!order.priority || !['High', 'Normal', 'Low'].includes(order.priority)) {
            errors.push('Priority must be High, Normal, or Low');
        }
        
        if (!order.dueDate) {
            errors.push('Due date is required');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    /**
     * Validate machine assignment
     * @param {string} machine - Machine name
     * @param {Array} eligibleMachines - List of eligible machines
     */
    static validateMachineAssignment(machine, eligibleMachines) {
        if (!machine) return false;
        if (!eligibleMachines || !Array.isArray(eligibleMachines)) return false;
        
        return eligibleMachines.includes(machine);
    }
    
    /**
     * Sanitize input string
     * @param {string} input - Input string to sanitize
     */
    static sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        return input.trim().replace(/[<>]/g, '');
    }
}

// Make ValidationUtils available globally for browser
window.ValidationUtils = ValidationUtils;
