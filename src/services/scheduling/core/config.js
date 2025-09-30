/**
 * Scheduling Configuration Constants
 * Centralized configuration for the scheduling engine
 */

const CONFIG = {
    MAX_CONCURRENT_SETUPS: 2,
    MAX_SETUP_SLOT_ATTEMPTS: 300,
    ALLOW_BATCH_CONTINUITY: true,
    DEFAULT_SETUP_START_HOUR: 6,
    DEFAULT_SETUP_END_HOUR: 22,
    MAX_MACHINES: 10,
    SHIFT_LENGTH_HOURS: 8,
    PERSONS_PER_SHIFT: 2,
    MAX_PROCESSING_TIME_MS: 240000,
    BATCH_SIZE_LIMIT: 5000,
    MAX_RESCHEDULE_ATTEMPTS: 10
};

// Export to window for global access
if (typeof window !== 'undefined') {
    window.SCHEDULING_CONFIG = CONFIG;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG };
}
