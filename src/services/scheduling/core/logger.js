/**
 * Browser-Compatible Logger
 * Simple logging utility for the scheduling engine
 */

const Logger = {
    log: function(message) {
        console.log(message);
    },
    
    warn: function(message) {
        console.warn(message);
    },
    
    error: function(message) {
        console.error(message);
    },
    
    info: function(message) {
        console.info(message);
    }
};

// Export to window for global access
if (typeof window !== 'undefined') {
    window.Logger = Logger;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Logger };
}
