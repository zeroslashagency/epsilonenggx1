/**
 * Operator Management Module
 * Handles operator assignment, shift management, and operator-related operations
 */

class OperatorManager {
    constructor(allPersons = ["A", "B", "C", "D"]) {
        this.allPersons = allPersons;
        
        // OPERATOR SHIFT DEFINITIONS (Asia/Kolkata IST)
        this.operatorShifts = {
            'A': { start: 6, end: 14, shift: 'morning' },
            'B': { start: 6, end: 14, shift: 'morning' },
            'C': { start: 14, end: 22, shift: 'afternoon' },
            'D': { start: 14, end: 22, shift: 'afternoon' }
        };
        
        // INDIVIDUAL PERSON AVAILABILITY WINDOWS (within their shifts)
        this.personAvailability = {
            'A': [
                { start: 6, end: 10, description: 'Morning availability' },
                { start: 11, end: 14, description: 'Afternoon availability' }
                // Person A not available 10:00-11:00
            ],
            'B': [
                { start: 6, end: 12, description: 'Morning availability' },
                { start: 13, end: 14, description: 'Afternoon availability' }
                // Person B not available 12:00-13:00
            ],
            'C': [
                { start: 14, end: 16, description: 'Early afternoon availability' },
                { start: 17, end: 22, description: 'Late afternoon availability' }
                // Person C not available 16:00-17:00
            ],
            'D': [
                { start: 14, end: 18, description: 'Afternoon availability' },
                { start: 19, end: 22, description: 'Evening availability' }
                // Person D not available 18:00-19:00
            ]
        };
        
        // SETUP WINDOW: 06:00-22:00 IST (People-Dependent)
        this.setupWindow = { start: 6, end: 22 };
        
        // Initialize operator schedule tracking
        this.operatorSchedule = {};
        for (const person of this.allPersons) {
            this.operatorSchedule[person] = [];
        }
    }
    
    /**
     * Initialize operator schedule with empty arrays
     */
    initializeOperatorSchedule() {
        this.operatorSchedule = {};
        for (const person of this.allPersons) {
            this.operatorSchedule[person] = [];
        }
        Logger.log('[OPERATOR-MANAGER] Initialized operator schedule');
    }
    
    /**
     * Book operator time slot
     * @param {string} operator - Operator name
     * @param {Date} startTime - Start time
     * @param {Date} endTime - End time
     */
    bookOperatorTime(operator, startTime, endTime) {
        if (!this.operatorSchedule[operator]) {
            this.operatorSchedule[operator] = [];
        }
        
        this.operatorSchedule[operator].push({
            start: new Date(startTime),
            end: new Date(endTime)
        });
        
        // Sort intervals by start time
        this.operatorSchedule[operator].sort((a, b) => a.start.getTime() - b.start.getTime());
        
        Logger.log(`[OPERATOR-BOOKING] Booked ${operator}: ${startTime.toISOString()} → ${endTime.toISOString()}`);
    }
    
    /**
     * Reserve operator time slot (alias for bookOperatorTime)
     * @param {string} operator - Operator name
     * @param {Date} startTime - Start time
     * @param {Date} endTime - End time
     * @returns {boolean} Success status
     */
    reserveOperator(operator, startTime, endTime) {
        // Check if operator is available
        if (!this.isOperatorAvailable(operator, startTime, endTime)) {
            Logger.log(`[OPERATOR-RESERVE] ${operator}: Cannot reserve - not available`);
            return false;
        }
        
        // Book the time
        this.bookOperatorTime(operator, startTime, endTime);
        return true;
    }

    /**
     * Calculate operator priority for assignment
     * @param {string} operator - Operator name (A, B, C, D)
     * @param {number} totalSetupMinutes - Total setup minutes for operator
     * @param {number} currentShiftMinutes - Current shift setup minutes
     * @param {string} shift - Shift name (morning, afternoon)
     * @returns {number} Priority score (lower = higher priority)
     */
    calculateOperatorPriority(operator, totalSetupMinutes, currentShiftMinutes, shift) {
        // Priority factors (lower number = higher priority):
        // 1. Total workload (least loaded gets priority 1)
        // 2. Current shift workload (least loaded in current shift gets priority 2)
        // 3. Shift balancing (prefer afternoon shift for better distribution)
        // 4. Operator rotation (A, B, C, D rotation)
        
        let priority = 0;
        
        // Factor 1: Total workload (0-1000 range)
        priority += totalSetupMinutes;
        
        // Factor 2: Current shift workload (0-500 range)
        priority += currentShiftMinutes * 0.5;
        
        // Factor 3: Shift balancing (prefer afternoon shift)
        if (shift === 'afternoon') {
            priority -= 50; // Boost afternoon shift operators
        }
        
        // Factor 4: Operator rotation (A=0, B=1, C=2, D=3)
        const operatorRotation = ['A', 'B', 'C', 'D'].indexOf(operator);
        priority += operatorRotation * 10;
        
        return Math.round(priority);
    }

    /**
     * Get total setup minutes for an operator across all time
     * @param {string} operator - Operator name
     * @returns {number} Total setup minutes
     */
    getTotalOperatorSetupMinutes(operator) {
        const intervals = this.operatorSchedule?.[operator] || [];
        let totalMinutes = 0;
        
        for (const interval of intervals) {
            totalMinutes += (interval.end.getTime() - interval.start.getTime()) / (1000 * 60);
        }
        
        return Math.round(totalMinutes);
    }

    /**
     * Check if operator has conflict with proposed time window
     * @param {string} operator - Operator name
     * @param {Date} startTime - Start time
     * @param {Date} endTime - End time
     * @returns {boolean} True if operator has conflict
     */
    hasOperatorConflict(operator, startTime, endTime) {
        const intervals = this.operatorSchedule?.[operator] || [];
        
        for (const interval of intervals) {
            // Check for overlap: intervals overlap if start1 < end2 && start2 < end1
            if (startTime < interval.end && interval.start < endTime) {
                Logger.log(`[OPERATOR-CONFLICT] ${operator}: candidate ${startTime.toISOString()}→${endTime.toISOString()} overlaps with existing ${interval.start.toISOString()}→${interval.end.toISOString()}`);
                return true;
            }
        }
        return false;
    }

    /**
     * Handle setup spillover across shifts
     * @param {string} operator - Operator name
     * @param {Date} setupStart - Setup start time
     * @param {Date} setupEnd - Setup end time
     * @param {number} setupDuration - Setup duration in minutes
     * @returns {Object} Spillover handling result
     */
    handleSetupSpillover(operator, setupStart, setupEnd, setupDuration) {
        const operatorShift = this.operatorShifts[operator];
        if (!operatorShift) {
            Logger.log(`[WARNING] Unknown operator: ${operator}`);
            return { success: false, reason: 'Unknown operator' };
        }

        const setupStartHour = setupStart.getHours();
        const setupEndHour = setupEnd.getHours();
        
        // Check if setup is entirely within operator's shift
        if (setupStartHour >= operatorShift.start && setupEndHour <= operatorShift.end) {
            Logger.log(`[SETUP-SPILLOVER] ${operator}: Setup entirely within shift (${operatorShift.start}:00-${operatorShift.end}:00)`);
            return { success: true, withinShift: true };
        }
        
        // Check if setup spills over to next shift
        if (setupEndHour > operatorShift.end) {
            Logger.log(`[SETUP-SPILLOVER] ${operator}: Setup spills over to next shift`);
            
            // Find next available operator in next shift
            const nextShiftOperators = this.getOperatorsForShift(this.getNextShift(operatorShift.shift));
            
            for (const nextOperator of nextShiftOperators) {
                if (!this.hasOperatorConflict(nextOperator, setupEnd, setupEnd)) {
                    Logger.log(`[SETUP-SPILLOVER] ${operator}: Handing over to ${nextOperator} at shift boundary`);
                    return { 
                        success: true, 
                        withinShift: false, 
                        handoverOperator: nextOperator,
                        handoverTime: setupEnd
                    };
                }
            }
            
            Logger.log(`[SETUP-SPILLOVER] ${operator}: No available operator in next shift, delaying setup`);
            return { 
                success: false, 
                reason: 'No available operator in next shift',
                suggestedDelay: this.getNextShiftStart(operatorShift.shift)
            };
        }
        
        return { success: true, withinShift: true };
    }

    /**
     * Get operators for a specific shift
     * @param {string} shift - Shift name (morning, afternoon)
     * @returns {Array} Array of operator names
     */
    getOperatorsForShift(shift) {
        return this.allPersons.filter(operator => {
            const operatorShift = this.operatorShifts[operator];
            return operatorShift && operatorShift.shift === shift;
        });
    }

    /**
     * Get next shift name
     * @param {string} currentShift - Current shift name
     * @returns {string} Next shift name
     */
    getNextShift(currentShift) {
        return currentShift === 'morning' ? 'afternoon' : 'morning';
    }

    /**
     * Get next shift start time
     * @param {string} shift - Shift name
     * @returns {Date} Next shift start time
     */
    getNextShiftStart(shift) {
        const nextShift = this.getNextShift(shift);
        const nextShiftOperators = this.getOperatorsForShift(nextShift);
        
        if (nextShiftOperators.length > 0) {
            const nextOperatorShift = this.operatorShifts[nextShiftOperators[0]];
            const nextStart = new Date();
            nextStart.setHours(nextOperatorShift.start, 0, 0, 0);
            
            // If next shift is tomorrow
            if (nextOperatorShift.start < new Date().getHours()) {
                nextStart.setDate(nextStart.getDate() + 1);
            }
            
            return nextStart;
        }
        
        return new Date(); // Fallback
    }

    /**
     * Get operator utilization statistics
     * @param {string} operator - Operator name
     * @returns {Object} Utilization statistics
     */
    getOperatorUtilization(operator) {
        const intervals = this.operatorSchedule?.[operator] || [];
        const operatorShift = this.operatorShifts[operator];
        
        let totalSetupTime = 0;
        let shiftSetupTime = 0;
        
        intervals.forEach(interval => {
            const setupTime = interval.end.getTime() - interval.start.getTime();
            totalSetupTime += setupTime;
            
            // Check if interval is within operator's shift
            const intervalStartHour = interval.start.getHours();
            if (intervalStartHour >= operatorShift.start && intervalStartHour < operatorShift.end) {
                shiftSetupTime += setupTime;
            }
        });
        
        const shiftDurationMs = (operatorShift.end - operatorShift.start) * 60 * 60 * 1000;
        
        return {
            totalBookings: intervals.length,
            totalSetupTimeMs: totalSetupTime,
            totalSetupTimeHours: totalSetupTime / (1000 * 60 * 60),
            shiftSetupTimeMs: shiftSetupTime,
            shiftSetupTimeHours: shiftSetupTime / (1000 * 60 * 60),
            shiftUtilizationPercentage: (shiftSetupTime / shiftDurationMs) * 100
        };
    }

    /**
     * Select optimal person/operator for a time slot
     * @param {Object} orderData - Order data
     * @param {Date} setupStart - Setup start time
     * @param {Date} setupEnd - Setup end time
     * @returns {Object} Operator selection result
     */
    selectOptimalPerson(orderData, setupStart, setupEnd) {
        const setupDuration = (setupEnd.getTime() - setupStart.getTime()) / (1000 * 60);
        
        // Get operators available for this time slot
        const availableOperators = this.getAvailableOperators(setupStart, setupEnd);
        
        if (availableOperators.length === 0) {
            // Try to find alternative time slot
            const alternativeSlot = this.findNextValidSetupSlot(setupStart, setupDuration);
            if (alternativeSlot) {
                return {
                    delayedStart: true,
                    actualSetupStart: alternativeSlot.start,
                    actualSetupEnd: alternativeSlot.end,
                    operator: alternativeSlot.operator,
                    delayMinutes: (alternativeSlot.start.getTime() - setupStart.getTime()) / (1000 * 60)
                };
            }
            
            return {
                delayedStart: false,
                operator: 'A', // Fallback
                error: 'No operators available'
            };
        }
        
        // Select operator with least workload
        let bestOperator = availableOperators[0];
        let minWorkload = this.getTotalOperatorSetupMinutes(bestOperator);
        
        for (const operator of availableOperators) {
            const workload = this.getTotalOperatorSetupMinutes(operator);
            if (workload < minWorkload) {
                minWorkload = workload;
                bestOperator = operator;
            }
        }
        
        return {
            delayedStart: false,
            operator: bestOperator,
            actualSetupStart: setupStart,
            actualSetupEnd: setupEnd
        };
    }
    
    /**
     * Find next valid setup slot
     * @param {Date} requestedStart - Requested start time
     * @param {number} setupDurationMin - Setup duration in minutes
     * @returns {Object} Next valid slot or null
     */
    findNextValidSetupSlot(requestedStart, setupDurationMin) {
        const setupWindowStart = 6; // 06:00
        const setupWindowEnd = 22;  // 22:00
        
        let candidateStart = new Date(requestedStart);
        
        // Ensure we're within setup window
        if (candidateStart.getHours() < setupWindowStart) {
            candidateStart.setHours(setupWindowStart, 0, 0, 0);
        } else if (candidateStart.getHours() >= setupWindowEnd) {
            candidateStart.setDate(candidateStart.getDate() + 1);
            candidateStart.setHours(setupWindowStart, 0, 0, 0);
        }
        
        const candidateEnd = new Date(candidateStart.getTime() + setupDurationMin * 60000);
        
        // Check if this slot works
        const availableOperators = this.getAvailableOperators(candidateStart, candidateEnd);
        if (availableOperators.length > 0) {
            return {
                start: candidateStart,
                end: candidateEnd,
                operator: availableOperators[0]
            };
        }
        
        // Try next day
        candidateStart.setDate(candidateStart.getDate() + 1);
        candidateStart.setHours(setupWindowStart, 0, 0, 0);
        candidateEnd.setTime(candidateStart.getTime() + setupDurationMin * 60000);
        
        const nextDayOperators = this.getAvailableOperators(candidateStart, candidateEnd);
        if (nextDayOperators.length > 0) {
            return {
                start: candidateStart,
                end: candidateEnd,
                operator: nextDayOperators[0]
            };
        }
        
        return null;
    }
    
    /**
     * Select operator for specific time slot
     * @param {Date} setupStart - Setup start time
     * @param {Date} setupEnd - Setup end time
     * @returns {string} Selected operator
     */
    selectOperatorForTimeSlot(setupStart, setupEnd) {
        const availableOperators = this.getAvailableOperators(setupStart, setupEnd);
        
        if (availableOperators.length === 0) {
            return 'A'; // Fallback
        }
        
        // Select operator with least workload
        let bestOperator = availableOperators[0];
        let minWorkload = this.getTotalOperatorSetupMinutes(bestOperator);
        
        for (const operator of availableOperators) {
            const workload = this.getTotalOperatorSetupMinutes(operator);
            if (workload < minWorkload) {
                minWorkload = workload;
                bestOperator = operator;
            }
        }
        
        return bestOperator;
    }
    
    /**
     * Select available operator from shift
     * @param {Array} shiftOperators - Operators in the shift
     * @param {Date} setupStart - Setup start time
     * @param {Date} setupEnd - Setup end time
     * @returns {string} Selected operator
     */
    selectAvailableOperatorFromShift(shiftOperators, setupStart, setupEnd) {
        for (const operator of shiftOperators) {
            if (!this.hasOperatorConflict(operator, setupStart, setupEnd)) {
                return operator;
            }
        }
        return null;
    }
    
    /**
     * Get next valid shift start
     * @param {Date} currentTime - Current time
     * @returns {Date} Next valid shift start
     */
    getNextValidShiftStart(currentTime) {
        const currentHour = currentTime.getHours();
        
        if (currentHour < 6) {
            // Before morning shift
            const nextStart = new Date(currentTime);
            nextStart.setHours(6, 0, 0, 0);
            return nextStart;
        } else if (currentHour < 14) {
            // During morning shift
            const nextStart = new Date(currentTime);
            nextStart.setHours(14, 0, 0, 0);
            return nextStart;
        } else if (currentHour < 22) {
            // During afternoon shift
            const nextStart = new Date(currentTime);
            nextStart.setHours(22, 0, 0, 0);
            return nextStart;
        } else {
            // After afternoon shift, next morning
            const nextStart = new Date(currentTime);
            nextStart.setDate(nextStart.getDate() + 1);
            nextStart.setHours(6, 0, 0, 0);
            return nextStart;
        }
    }
    
    /**
     * Check if operator is in correct shift
     * @param {string} operator - Operator name
     * @param {Date} setupTime - Setup time
     * @param {Date} setupEndTime - Setup end time (optional)
     * @returns {boolean} True if operator is in correct shift
     */
    isOperatorInCorrectShift(operator, setupTime, setupEndTime = null) {
        const operatorShift = this.operatorShifts[operator];
        if (!operatorShift) return false;
        
        const setupHour = setupTime.getHours();
        const setupEndHour = setupEndTime ? setupEndTime.getHours() : setupHour;
        
        // Check if setup is within operator's shift
        return setupHour >= operatorShift.start && setupEndHour <= operatorShift.end;
    }
    
    /**
     * Check if operator is available
     * @param {string} operator - Operator name
     * @param {Date} startTime - Start time
     * @param {Date} endTime - End time
     * @returns {boolean} True if operator is available
     */
    isOperatorAvailable(operator, startTime, endTime) {
        // First check for scheduling conflicts
        if (this.hasOperatorConflict(operator, startTime, endTime)) {
            return false;
        }
        
        // Then check individual person availability windows
        return this.isPersonAvailableInWindows(operator, startTime, endTime);
    }
    
    /**
     * Check if person is available within their individual availability windows
     * @param {string} person - Person name (A, B, C, D)
     * @param {Date} startTime - Start time
     * @param {Date} endTime - End time
     * @returns {boolean} True if person is available in their windows
     */
    isPersonAvailableInWindows(person, startTime, endTime) {
        // FIRST: Check shift boundaries - CRITICAL ENFORCEMENT
        const shift = this.operatorShifts[person];
        if (!shift) {
            Logger.log(`[PERSON-AVAILABILITY] No shift data for person: ${person}`);
            return false;
        }
        
        const startHour = startTime.getHours();
        const endHour = endTime.getHours();
        
        // ENFORCE SHIFT BOUNDARIES: Person must be within their shift hours
        if (startHour < shift.start || endHour > shift.end) {
            Logger.log(`[PERSON-AVAILABILITY] ${person}: OUTSIDE SHIFT BOUNDARIES - Request ${startHour}:00-${endHour}:00, Shift ${shift.start}:00-${shift.end}:00`);
            return false;
        }
        
        // SECOND: Check individual availability windows within shift
        const availability = this.personAvailability[person];
        if (!availability) {
            Logger.log(`[PERSON-AVAILABILITY] No availability data for person: ${person}`);
            return false;
        }
        
        // CRITICAL FIX: Check if the FULL DURATION fits within availability windows
        for (const window of availability) {
            // Check if the entire requested duration fits within this window
            if (startHour >= window.start && endHour <= window.end) {
                Logger.log(`[PERSON-AVAILABILITY] ${person}: FULL DURATION available in window ${window.start}:00-${window.end}:00 for request ${startHour}:00-${endHour}:00`);
                return true;
            }
        }
        
        Logger.log(`[PERSON-AVAILABILITY] ${person}: NOT AVAILABLE for full duration ${startHour}:00-${endHour}:00`);
        return false;
    }
    
    /**
     * Get person's availability windows for a specific day
     * @param {string} person - Person name
     * @param {Date} date - Date to check
     * @returns {Array} Array of availability windows for that day
     */
    getPersonAvailabilityWindows(person, date) {
        const availability = this.personAvailability[person];
        if (!availability) return [];
        
        const windows = [];
        const baseDate = new Date(date);
        
        for (const window of availability) {
            const startTime = new Date(baseDate);
            startTime.setHours(window.start, 0, 0, 0);
            
            const endTime = new Date(baseDate);
            endTime.setHours(window.end, 0, 0, 0);
            
            windows.push({
                start: startTime,
                end: endTime,
                description: window.description,
                startHour: window.start,
                endHour: window.end
            });
        }
        
        return windows;
    }
    
    /**
     * Find next available time slot for a person
     * @param {string} person - Person name
     * @param {Date} fromTime - Start searching from this time
     * @param {number} durationMinutes - Required duration in minutes
     * @returns {Object} Next available slot or null
     */
    findNextPersonAvailableSlot(person, fromTime, durationMinutes) {
        const availability = this.personAvailability[person];
        if (!availability) return null;
        
        let searchDate = new Date(fromTime);
        const maxSearchDays = 7; // Search up to 7 days ahead
        
        for (let day = 0; day < maxSearchDays; day++) {
            const currentDate = new Date(searchDate);
            currentDate.setDate(currentDate.getDate() + day);
            
            for (const window of availability) {
                const windowStart = new Date(currentDate);
                windowStart.setHours(window.start, 0, 0, 0);
                
                const windowEnd = new Date(currentDate);
                windowEnd.setHours(window.end, 0, 0, 0);
                
                // Find the best start time within this window
                let candidateStart = new Date(Math.max(windowStart.getTime(), fromTime.getTime()));
                const candidateEnd = new Date(candidateStart.getTime() + durationMinutes * 60000);
                
                // Check if the entire duration fits within the window
                if (candidateEnd <= windowEnd) {
                    // Check if person is actually available at this time (no conflicts)
                    if (!this.hasOperatorConflict(person, candidateStart, candidateEnd)) {
                        return {
                            person: person,
                            start: candidateStart,
                            end: candidateEnd,
                            window: window.description
                        };
                    }
                }
            }
        }
        
        return null;
    }
    
    /**
     * Get available operators for a specific time slot
     * @param {Date} setupStart - Setup start time
     * @param {Date} setupEnd - Setup end time
     * @returns {Array} Array of available operator names
     */
    getAvailableOperators(setupStart, setupEnd) {
        const availableOperators = [];
        
        for (const person of this.allPersons) {
            if (this.isOperatorAvailable(person, setupStart, setupEnd)) {
                availableOperators.push(person);
                Logger.log(`[AVAILABLE-OPERATORS] ${person} is available for ${setupStart.toISOString()} → ${setupEnd.toISOString()}`);
            } else {
                Logger.log(`[AVAILABLE-OPERATORS] ${person} is NOT available for ${setupStart.toISOString()} → ${setupEnd.toISOString()}`);
            }
        }
        
        Logger.log(`[AVAILABLE-OPERATORS] Total available: ${availableOperators.join(', ')}`);
        return availableOperators;
    }
    
    /**
     * Get operators for next shift
     * @param {string} currentOperator - Current operator
     * @returns {Array} Next shift operators
     */
    getOperatorsForNextShift(currentOperator) {
        const currentShift = this.operatorShifts[currentOperator];
        if (!currentShift) return [];
        
        const nextShift = currentShift.shift === 'morning' ? 'afternoon' : 'morning';
        return this.getOperatorsForShift(nextShift);
    }
    
    /**
     * Get operator setup minutes in shift
     * @param {string} operator - Operator name
     * @param {Date} referenceTime - Reference time
     * @returns {number} Setup minutes in shift
     */
    getOperatorSetupMinutesInShift(operator, referenceTime) {
        const intervals = this.operatorSchedule?.[operator] || [];
        const operatorShift = this.operatorShifts[operator];
        
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
     * @returns {Date} Earliest free time
     */
    getEarliestOperatorFreeTime(operator, setupStart) {
        const intervals = this.operatorSchedule?.[operator] || [];
        
        if (intervals.length === 0) {
            return setupStart;
        }
        
        // Find intervals that end after setupStart
        const relevantIntervals = intervals.filter(interval => interval.end > setupStart);
        
        if (relevantIntervals.length === 0) {
            return setupStart;
        }
        
        // Find the latest end time
        const latestEnd = relevantIntervals.reduce((latest, interval) => {
            return interval.end > latest ? interval.end : latest;
        }, setupStart);
        
        return latestEnd;
    }
}

// Export to window for global access
if (typeof window !== 'undefined') {
    window.OperatorManager = OperatorManager;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { OperatorManager };
}
