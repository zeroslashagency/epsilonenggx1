/**
 * Application Constants
 * Simple constants for the machine scheduler
 */

const CONSTANTS = {
    // Scheduling Settings
    SETUP_WINDOW: '06:00-22:00',
    SHIFTS: {
        MORNING: { time: '06:00-14:00', operators: ['A', 'B'] },
        AFTERNOON: { time: '14:00-22:00', operators: ['C', 'D'] },
        NIGHT: { time: '22:00-06:00', operators: ['Night team'], optional: true }
    },
    
    // Machines
    MACHINES: ['VMC 1', 'VMC 2', 'VMC 3', 'VMC 4', 'VMC 5', 'VMC 6', 'VMC 7', 'VMC 8', 'VMC 9', 'VMC 10'],
    
    // User Roles
    ROLES: {
        ADMIN: 'Admin',
        SUBADMIN: 'Subadmin', 
        OPERATOR: 'Operator'
    },
    
    // Priority Levels
    PRIORITY: {
        HIGH: 'High',
        NORMAL: 'Normal',
        LOW: 'Low'
    }
};

module.exports = CONSTANTS;
