/**
 * Timing Calculation Module
 * Handles timing calculations for operations, setups, and piece-level processing
 */

class TimingCalculator {
    constructor() {
        // Default timing constants
        this.defaultSetupWindow = { start: 6, end: 22 };
        this.defaultProductionWindow = { start: 0, end: 24, type: '24x7' };
    }

    /**
     * Calculate preliminary timing for an operation
     * @param {Object} operation - Operation data
     * @param {Object} orderData - Order data
     * @param {number} batchQty - Batch quantity
     * @param {string} person - Person/operator name
     * @param {Date} earliestStartTime - Earliest possible start time
     * @returns {Object} Preliminary timing result
     */
    calculatePreliminaryTiming(operation, orderData, batchQty, person, earliestStartTime) {
        // Use the provided earliest start time (which includes sequential dependencies)
        let setupStartTime = new Date(earliestStartTime);

        // Apply setup window constraints
        setupStartTime = this.enforceSetupWindow(setupStartTime, orderData);

        // Calculate setup end
        const setupDuration = operation.SetupTime_Min || 0;
        let setupEndTime = new Date(setupStartTime.getTime() + setupDuration * 60000);

        // Validate setup fits within window
        setupEndTime = this.validateSetupWithinWindow(setupStartTime, setupEndTime, orderData);

        // CRITICAL FIX: Calculate timing without machine-specific constraints
        // This gives us the theoretical minimum time needed, regardless of machine availability
        const cycleTime = operation.CycleTime_Min || 0;
        const runStart = new Date(setupEndTime);
        
        // Calculate theoretical run end (continuous processing, no machine pauses)
        const totalProcessingTime = batchQty * cycleTime; // minutes
        const runEnd = new Date(runStart.getTime() + totalProcessingTime * 60000);

        return {
            setupStart: setupStartTime,
            setupEnd: setupEndTime,
            runStart: runStart,
            runEnd: runEnd
        };
    }

    /**
     * Calculate operation timing with piece-level flow
     * @param {Object} operation - Operation data
     * @param {Object} orderData - Order data
     * @param {number} batchQty - Batch quantity
     * @param {string} machine - Machine name
     * @param {string} person - Person/operator name
     * @param {Date} earliestStartTime - Earliest possible start time
     * @param {Array} previousOpPieceCompletionTimes - Previous operation piece completion times
     * @param {Date} previousOpRunEnd - Previous operation run end time
     * @returns {Object} Operation timing result
     */
    calculateOperationTiming(operation, orderData, batchQty, machine, person, earliestStartTime, previousOpPieceCompletionTimes = null, previousOpRunEnd = null, machineAvailabilityCallback = null) {
        Logger.log(`[PIECE-LEVEL] Starting piece-level calculation for ${operation.OperationName}, batch qty: ${batchQty}`);
        
        // VALIDATE INPUTS
        if (!operation) {
            throw new Error(`Operation is undefined`);
        }
        if (!earliestStartTime) {
            throw new Error(`EarliestStartTime is undefined`);
        }
        if (isNaN(earliestStartTime.getTime())) {
            throw new Error(`EarliestStartTime is invalid: ${earliestStartTime}`);
        }
        
        // CORRECT PIECE-LEVEL FLOW: Setup starts when FIRST piece from previous operation is ready
        let setupStartTime = earliestStartTime;
        
        // If this is not the first operation, use first piece ready time for parallel setup
        if (previousOpPieceCompletionTimes && previousOpPieceCompletionTimes.length > 0) {
            // First piece ready time enables parallel processing
            const firstPieceReadyTime = previousOpPieceCompletionTimes[0];
            
            // VALIDATE firstPieceReadyTime
            if (!firstPieceReadyTime || isNaN(firstPieceReadyTime.getTime())) {
                Logger.log(`[ERROR] Invalid firstPieceReadyTime: ${firstPieceReadyTime}`);
                throw new Error(`Invalid firstPieceReadyTime: ${firstPieceReadyTime}`);
            }
            
            // Setup can start when first piece is ready (parallel processing)
            setupStartTime = new Date(Math.max(setupStartTime.getTime(), firstPieceReadyTime.getTime()));
            Logger.log(`[PIECE-FLOW] Setup starts when first piece ready: ${setupStartTime.toISOString()}`);
        }
        
        // CRITICAL FIX: Machine conflicts are now handled in the scheduling engine
        // The timing calculator should preserve piece-level flow timing
        // Machine availability is checked during machine selection, not here
        if (machineAvailabilityCallback) {
            const machineAvailableTime = machineAvailabilityCallback(machine, setupStartTime);
            Logger.log(`[MACHINE-AVAILABILITY] Machine ${machine} availability check: requested ${setupStartTime.toISOString()}, available ${machineAvailableTime.toISOString()}`);
            // NOTE: We don't override setupStartTime here anymore - conflicts are resolved during machine selection
        }
        
        // Apply setup window constraints
        setupStartTime = this.enforceSetupWindow(setupStartTime, orderData);

        // Calculate setup end
        const setupDuration = operation.SetupTime_Min || 0;
        let setupEndTime = new Date(setupStartTime.getTime() + setupDuration * 60000);

        // Validate setup fits within window
        setupEndTime = this.validateSetupWithinWindow(setupStartTime, setupEndTime, orderData);

        // MACHINE AVAILABILITY CHECK: Run can only start when machine is available
        const cycleTime = operation.CycleTime_Min || 0;
        let runStart = new Date(setupEndTime);
        
        // Calculate piece-level completion times starting from setup end
        // This implements the correct piece-level flow: run starts immediately after setup
        const pieceCompletionTimes = this.calculatePieceLevelTiming(runStart, cycleTime, batchQty, previousOpPieceCompletionTimes);
        
        // Calculate batch run end (last piece completion)
        const runEnd = pieceCompletionTimes[pieceCompletionTimes.length - 1];
        
        Logger.log(`[TIMING-CALC] Op${operation.OperationSeq} setupEnd: ${setupEndTime.toISOString()}, runStart: ${runStart.toISOString()}, runEnd: ${runEnd.toISOString()}`);

        return {
            setupStart: setupStartTime,
            setupEnd: setupEndTime,
            runStart: runStart,
            runEnd: runEnd,
            pieceCompletionTimes: pieceCompletionTimes
        };
    }

    /**
     * Calculate piece-level completion times
     * @param {Date} runStart - Run start time
     * @param {number} cycleTime - Cycle time per piece in minutes
     * @param {number} batchQty - Batch quantity
     * @param {Array} previousOpPieces - Previous operation piece completion times (for piece-level handoff)
     * @returns {Array} Array of piece completion times
     */
    calculatePieceLevelTiming(runStart, cycleTime, batchQty, previousOpPieces = null) {
        const pieceCompletionTimes = [];
        
        for (let pieceIndex = 0; pieceIndex < batchQty; pieceIndex++) {
            let pieceStartTime;
            
            if (pieceIndex === 0) {
                // First piece starts when run starts
                pieceStartTime = new Date(runStart);
            } else if (previousOpPieces && previousOpPieces[pieceIndex]) {
                // CORRECTED: Each piece waits for its corresponding piece from previous operation
                pieceStartTime = new Date(Math.max(
                    pieceCompletionTimes[pieceIndex - 1].getTime(), // Machine available
                    previousOpPieces[pieceIndex].getTime()          // Piece ready from prev op
                ));
                Logger.log(`[PIECE-HANDOFF] Piece ${pieceIndex + 1}: Machine ready ${new Date(pieceCompletionTimes[pieceIndex - 1]).toISOString()}, Previous piece ready ${previousOpPieces[pieceIndex].toISOString()}, Starting ${pieceStartTime.toISOString()}`);
            } else {
                // Sequential processing within same operation
                pieceStartTime = new Date(pieceCompletionTimes[pieceIndex - 1]);
            }
            
            const pieceEndTime = new Date(pieceStartTime.getTime() + cycleTime * 60000);
            pieceCompletionTimes.push(pieceEndTime);
        }
        
        return pieceCompletionTimes;
    }

    /**
     * Enforce setup window constraints
     * @param {Date} setupStartTime - Setup start time
     * @param {Object} orderData - Order data
     * @returns {Date} Adjusted setup start time
     */
    enforceSetupWindow(setupStartTime, orderData) {
        const setupWindow = this.getSetupWindow(orderData);
        const currentHour = setupStartTime.getHours();
        
        if (currentHour < setupWindow.start) {
            // Move to start of setup window
            const adjustedTime = new Date(setupStartTime);
            adjustedTime.setHours(setupWindow.start, 0, 0, 0);
            Logger.log(`[SETUP-WINDOW] Adjusted setup start from ${setupStartTime.toISOString()} to ${adjustedTime.toISOString()}`);
            return adjustedTime;
        }
        
        if (currentHour >= setupWindow.end) {
            // Move to next day's setup window
            const adjustedTime = new Date(setupStartTime);
            adjustedTime.setDate(adjustedTime.getDate() + 1);
            adjustedTime.setHours(setupWindow.start, 0, 0, 0);
            Logger.log(`[SETUP-WINDOW] Adjusted setup start from ${setupStartTime.toISOString()} to next day: ${adjustedTime.toISOString()}`);
            return adjustedTime;
        }
        
        return setupStartTime;
    }

    /**
     * Validate setup fits within window
     * @param {Date} setupStartTime - Setup start time
     * @param {Date} setupEndTime - Setup end time
     * @param {Object} orderData - Order data
     * @returns {Date} Adjusted setup end time
     */
    validateSetupWithinWindow(setupStartTime, setupEndTime, orderData) {
        const setupWindow = this.getSetupWindow(orderData);
        const setupEndHour = setupEndTime.getHours();
        
        if (setupEndHour > setupWindow.end) {
            // Setup extends beyond window - move to next day
            const adjustedTime = new Date(setupEndTime);
            adjustedTime.setDate(adjustedTime.getDate() + 1);
            adjustedTime.setHours(setupWindow.start, 0, 0, 0);
            
            // Add remaining setup time
            const remainingSetupTime = setupEndTime.getTime() - setupStartTime.getTime();
            adjustedTime.setTime(adjustedTime.getTime() + remainingSetupTime);
            
            Logger.log(`[SETUP-WINDOW] Setup extends beyond window, moved to next day: ${adjustedTime.toISOString()}`);
            return adjustedTime;
        }
        
        return setupEndTime;
    }

    /**
     * Get setup window from order data or use default
     * @param {Object} orderData - Order data
     * @returns {Object} Setup window configuration
     */
    getSetupWindow(orderData) {
        // Check if order has specific setup window
        if (orderData.setupWindow) {
            return this.parseSetupWindow(orderData.setupWindow);
        }
        
        // Check global settings
        if (this.globalSettings?.setupWindow) {
            return this.parseSetupWindow(this.globalSettings.setupWindow);
        }
        
        // Use default
        return this.defaultSetupWindow;
    }

    /**
     * Parse setup window string
     * @param {string} windowString - Setup window string (e.g., "06:00-22:00")
     * @returns {Object} Parsed setup window
     */
    parseSetupWindow(windowString) {
        if (!windowString) return this.defaultSetupWindow;
        
        const [startStr, endStr] = windowString.split('-');
        const startHour = parseInt(startStr.split(':')[0]);
        const endHour = parseInt(endStr.split(':')[0]);
        
        return { start: startHour, end: endHour };
    }

    /**
     * Calculate duration between two times
     * @param {Date} startTime - Start time
     * @param {Date} endTime - End time
     * @returns {Object} Duration information
     */
    calculateDuration(startTime, endTime) {
        const durationMs = endTime.getTime() - startTime.getTime();
        const durationMinutes = Math.round(durationMs / (1000 * 60));
        const durationHours = Math.round(durationMs / (1000 * 60 * 60));
        
        return {
            milliseconds: durationMs,
            minutes: durationMinutes,
            hours: durationHours,
            formatted: this.formatDuration(durationMs)
        };
    }

    /**
     * Format duration for display
     * @param {number} durationMs - Duration in milliseconds
     * @returns {string} Formatted duration string
     */
    formatDuration(durationMs) {
        const hours = Math.floor(durationMs / (1000 * 60 * 60));
        const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours >= 24) {
            const days = Math.floor(hours / 24);
            const remainingHours = hours % 24;
            return `${days}D${remainingHours}H`;
        } else if (hours > 0) {
            return `${hours}H${minutes}M`;
        } else {
            return `${minutes}M`;
        }
    }

    /**
     * Format duration breakdown with detailed information
     * @param {Date} setupStart - Setup start time
     * @param {Date} runEnd - Run end time
     * @param {number} workMinutes - Work minutes
     * @param {number} holidayMinutes - Holiday minutes
     * @returns {string} Formatted duration breakdown
     */
    formatDurationBreakdown(setupStart, runEnd, workMinutes = 0, holidayMinutes = 0) {
        const totalMs = runEnd.getTime() - setupStart.getTime();
        const totalMinutes = Math.round(totalMs / (1000 * 60));
        
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        
        let breakdown = `${hours}H${minutes}M`;
        
        if (workMinutes > 0) {
            breakdown += ` (Work: ${workMinutes}M)`;
        }
        
        if (holidayMinutes > 0) {
            breakdown += ` (Holiday: ${holidayMinutes}M)`;
        }
        
        return breakdown;
    }
    
    /**
     * Format date and time for display
     * @param {Date} date - Date to format
     * @returns {string} Formatted date and time
     */
    formatDateTime(date) {
        if (!date || !(date instanceof Date)) {
            return 'Invalid Date';
        }
        
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    }
    
    /**
     * Validate all machine schedules
     * @param {Object} machineSchedules - Machine schedules object
     * @returns {Object} Validation result
     */
    validateAllMachineSchedules(machineSchedules) {
        const validation = {
            isValid: true,
            errors: [],
            warnings: [],
            machineResults: {}
        };
        
        for (const [machine, intervals] of Object.entries(machineSchedules)) {
            const machineValidation = this.validateMachineSchedule(machine, intervals);
            validation.machineResults[machine] = machineValidation;
            
            if (!machineValidation.isValid) {
                validation.isValid = false;
                validation.errors.push(`Machine ${machine}: ${machineValidation.errors.join(', ')}`);
            }
            
            if (machineValidation.warnings.length > 0) {
                validation.warnings.push(`Machine ${machine}: ${machineValidation.warnings.join(', ')}`);
            }
        }
        
        return validation;
    }
    
    /**
     * Validate machine schedule for conflicts
     * @param {string} machine - Machine name
     * @param {Array} intervals - Machine intervals
     * @returns {Object} Validation result
     */
    validateMachineSchedule(machine, intervals) {
        const validation = {
            isValid: true,
            errors: [],
            warnings: [],
            conflicts: []
        };
        
        // Check for conflicts
        for (let i = 0; i < intervals.length; i++) {
            for (let j = i + 1; j < intervals.length; j++) {
                const interval1 = intervals[i];
                const interval2 = intervals[j];
                
                if (interval1.start < interval2.end && interval2.start < interval1.end) {
                    validation.isValid = false;
                    validation.errors.push(`Conflict between intervals ${i} and ${j}`);
                    validation.conflicts.push({
                        interval1: interval1,
                        interval2: interval2,
                        overlap: {
                            start: new Date(Math.max(interval1.start.getTime(), interval2.start.getTime())),
                            end: new Date(Math.min(interval1.end.getTime(), interval2.end.getTime()))
                        }
                    });
                }
            }
        }
        
        // Check for gaps
        if (intervals.length > 1) {
            const sortedIntervals = intervals.sort((a, b) => a.start.getTime() - b.start.getTime());
            for (let i = 0; i < sortedIntervals.length - 1; i++) {
                const currentEnd = sortedIntervals[i].end;
                const nextStart = sortedIntervals[i + 1].start;
                
                if (currentEnd < nextStart) {
                    const gapMinutes = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60);
                    if (gapMinutes > 60) { // Gap larger than 1 hour
                        validation.warnings.push(`Large gap of ${gapMinutes.toFixed(0)} minutes between intervals`);
                    }
                }
            }
        }
        
        return validation;
    }
    
    /**
     * Check if operator is on shift
     * @param {string} operator - Operator name
     * @param {Date} setupStart - Setup start time
     * @param {Date} setupEnd - Setup end time
     * @returns {boolean} True if operator is on shift
     */
    isOperatorOnShift(operator, setupStart, setupEnd) {
        const operatorShifts = {
            'A': { start: 6, end: 14, shift: 'morning' },
            'B': { start: 6, end: 14, shift: 'morning' },
            'C': { start: 14, end: 22, shift: 'afternoon' },
            'D': { start: 14, end: 22, shift: 'afternoon' }
        };
        
        const operatorShift = operatorShifts[operator];
        if (!operatorShift) return false;
        
        const setupStartHour = setupStart.getHours();
        const setupEndHour = setupEnd.getHours();
        
        return setupStartHour >= operatorShift.start && setupEndHour <= operatorShift.end;
    }
    
    /**
     * Get operators on shift
     * @param {Date} setupStart - Setup start time
     * @param {Date} setupEnd - Setup end time
     * @returns {Array} Operators on shift
     */
    getOperatorsOnShift(setupStart, setupEnd) {
        const allOperators = ['A', 'B', 'C', 'D'];
        const operatorsOnShift = [];
        
        for (const operator of allOperators) {
            if (this.isOperatorOnShift(operator, setupStart, setupEnd)) {
                operatorsOnShift.push(operator);
            }
        }
        
        return operatorsOnShift;
    }
    
    /**
     * Get next shift start time
     * @param {Date} currentTime - Current time
     * @returns {Date} Next shift start time
     */
    getNextShiftStart(currentTime) {
        const currentHour = currentTime.getHours();
        
        if (currentHour < 6) {
            const nextStart = new Date(currentTime);
            nextStart.setHours(6, 0, 0, 0);
            return nextStart;
        } else if (currentHour < 14) {
            const nextStart = new Date(currentTime);
            nextStart.setHours(14, 0, 0, 0);
            return nextStart;
        } else if (currentHour < 22) {
            const nextStart = new Date(currentTime);
            nextStart.setHours(22, 0, 0, 0);
            return nextStart;
        } else {
            const nextStart = new Date(currentTime);
            nextStart.setDate(nextStart.getDate() + 1);
            nextStart.setHours(6, 0, 0, 0);
            return nextStart;
        }
    }
    
    /**
     * Check if operator has conflict
     * @param {string} operator - Operator name
     * @param {Date} setupStart - Setup start time
     * @param {Date} setupEnd - Setup end time
     * @param {Object} operatorSchedule - Operator schedule
     * @returns {boolean} True if operator has conflict
     */
    hasOperatorConflict(operator, setupStart, setupEnd, operatorSchedule) {
        const intervals = operatorSchedule?.[operator] || [];
        
        return intervals.some(interval => {
            return setupStart < interval.end && interval.start < setupEnd;
        });
    }
    
    /**
     * Get operator setup minutes in shift
     * @param {string} operator - Operator name
     * @param {Date} referenceTime - Reference time
     * @param {Object} operatorSchedule - Operator schedule
     * @returns {number} Setup minutes in shift
     */
    getOperatorSetupMinutesInShift(operator, referenceTime, operatorSchedule) {
        const intervals = operatorSchedule?.[operator] || [];
        const operatorShifts = {
            'A': { start: 6, end: 14, shift: 'morning' },
            'B': { start: 6, end: 14, shift: 'morning' },
            'C': { start: 14, end: 22, shift: 'afternoon' },
            'D': { start: 14, end: 22, shift: 'afternoon' }
        };
        
        const operatorShift = operatorShifts[operator];
        if (!operatorShift) return 0;
        
        let shiftMinutes = 0;
        const shiftStart = new Date(referenceTime);
        shiftStart.setHours(operatorShift.start, 0, 0, 0);
        const shiftEnd = new Date(referenceTime);
        shiftEnd.setHours(operatorShift.end, 0, 0, 0);
        
        for (const interval of intervals) {
            if (interval.start >= shiftStart && interval.end <= shiftEnd) {
                shiftMinutes += (interval.end.getTime() - interval.start.getTime()) / (1000 * 60);
            }
        }
        
        return Math.round(shiftMinutes);
    }
    
    /**
     * Get earliest operator free time
     * @param {string} operator - Operator name
     * @param {Date} setupStart - Setup start time
     * @param {Object} operatorSchedule - Operator schedule
     * @returns {Date} Earliest free time
     */
    getEarliestOperatorFreeTime(operator, setupStart, operatorSchedule) {
        const intervals = operatorSchedule?.[operator] || [];
        
        if (intervals.length === 0) {
            return setupStart;
        }
        
        const relevantIntervals = intervals.filter(interval => interval.end > setupStart);
        
        if (relevantIntervals.length === 0) {
            return setupStart;
        }
        
        const latestEnd = relevantIntervals.reduce((latest, interval) => {
            return interval.end > latest ? interval.end : latest;
        }, setupStart);
        
        return latestEnd;
    }
    
    /**
     * Reserve operator for time window
     * @param {string} operator - Operator name
     * @param {Date} startTime - Start time
     * @param {Date} endTime - End time
     * @param {Object} operatorSchedule - Operator schedule
     * @returns {boolean} True if reservation successful
     */
    reserveOperator(operator, startTime, endTime, operatorSchedule) {
        if (this.hasOperatorConflict(operator, startTime, endTime, operatorSchedule)) {
            return false;
        }
        
        if (!operatorSchedule[operator]) {
            operatorSchedule[operator] = [];
        }
        
        operatorSchedule[operator].push({
            start: new Date(startTime),
            end: new Date(endTime)
        });
        
        return true;
    }
    
    /**
     * Validate operator schedule
     * @param {string} operator - Operator name
     * @param {Array} intervals - Operator intervals
     * @returns {Object} Validation result
     */
    validateOperatorSchedule(operator, intervals) {
        const validation = {
            isValid: true,
            errors: [],
            warnings: [],
            conflicts: []
        };
        
        // Check for conflicts
        for (let i = 0; i < intervals.length; i++) {
            for (let j = i + 1; j < intervals.length; j++) {
                const interval1 = intervals[i];
                const interval2 = intervals[j];
                
                if (interval1.start < interval2.end && interval2.start < interval1.end) {
                    validation.isValid = false;
                    validation.errors.push(`Conflict between intervals ${i} and ${j}`);
                    validation.conflicts.push({
                        interval1: interval1,
                        interval2: interval2,
                        overlap: {
                            start: new Date(Math.max(interval1.start.getTime(), interval2.start.getTime())),
                            end: new Date(Math.min(interval1.end.getTime(), interval2.end.getTime()))
                        }
                    });
                }
            }
        }
        
        return validation;
    }
    
    /**
     * Validate all operator schedules
     * @param {Object} operatorSchedules - Operator schedules object
     * @returns {Object} Validation result
     */
    validateAllOperatorSchedules(operatorSchedules) {
        const validation = {
            isValid: true,
            errors: [],
            warnings: [],
            operatorResults: {}
        };
        
        for (const [operator, intervals] of Object.entries(operatorSchedules)) {
            const operatorValidation = this.validateOperatorSchedule(operator, intervals);
            validation.operatorResults[operator] = operatorValidation;
            
            if (!operatorValidation.isValid) {
                validation.isValid = false;
                validation.errors.push(`Operator ${operator}: ${operatorValidation.errors.join(', ')}`);
            }
            
            if (operatorValidation.warnings.length > 0) {
                validation.warnings.push(`Operator ${operator}: ${operatorValidation.warnings.join(', ')}`);
            }
        }
        
        return validation;
    }
}

// Export to window for global access
if (typeof window !== 'undefined') {
    window.TimingCalculator = TimingCalculator;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TimingCalculator };
}
