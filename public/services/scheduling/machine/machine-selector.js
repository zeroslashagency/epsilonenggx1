/**
 * Machine Selection Module
 * Handles machine selection logic and machine-related operations
 */

class MachineSelector {
    constructor(allMachines = ["VMC 1", "VMC 2", "VMC 3", "VMC 4", "VMC 5", "VMC 6", "VMC 7"]) {
        this.allMachines = allMachines;
    }

    /**
     * Select optimal machine for an operation with smart distribution
     * @param {Object} operation - Operation data
     * @param {Object} orderData - Order data
     * @param {Date} setupStart - Setup start time
     * @param {Date} runEnd - Run end time (optional)
     * @param {Object} context - Context information for optimization
     * @returns {string} Selected machine name
     */
    selectOptimalMachine(operation, orderData, setupStart, runEnd = null, context = {}) {
        let eligibleMachines = operation.EligibleMachines || this.allMachines;
        
        // Convert string to array if needed (EligibleMachines is stored as comma-separated string)
        if (typeof eligibleMachines === 'string') {
            eligibleMachines = eligibleMachines.split(',').map(m => m.trim());
        }
        
        // Filter out breakdown machines
        const breakdownMachines = orderData.breakdownMachine ? 
            [orderData.breakdownMachine] : 
            (this.globalSettings?.breakdownMachines || []);
        
        const availableMachines = eligibleMachines.filter(machine => 
            !breakdownMachines.includes(machine)
        );
        
        if (availableMachines.length === 0) {
            Logger.log(`[WARNING] All eligible machines are in breakdown, using fallback`);
            return eligibleMachines[0]; // Fallback
        }

        Logger.log(`[MACHINE-SELECTION] Looking for machine for setup: ${setupStart.toISOString()}`);
        Logger.log(`[MACHINE-SELECTION] Available machines: ${availableMachines.join(', ')}`);

        // SMART DISTRIBUTION OPTIMIZATION: Avoid sequential bottlenecks
        if (context.operationSeq && context.operationSeq > 1) {
            const optimizedMachine = this.selectMachineForParallelProcessing(
                availableMachines, 
                setupStart, 
                context.operationSeq,
                context.previousOperationMachines || [],
                context
            );
            
            if (optimizedMachine) {
                Logger.log(`[SMART-DISTRIBUTION] Using optimized machine ${optimizedMachine} for parallel processing`);
                const setupDuration = operation.SetupTime_Min || 0;
                const actualSetupEnd = new Date(setupStart.getTime() + setupDuration * 60000);
                
                return {
                    machine: optimizedMachine,
                    actualSetupStart: setupStart,
                    actualSetupEnd: actualSetupEnd
                };
            }
        }
        
        // ULTRA-AGGRESSIVE MACHINE UTILIZATION: Maximize continuous usage and balance load
        const candidates = [];
        
        for (const machine of availableMachines) {
            const intervals = this.machineSchedule?.[machine] || [];
            Logger.log(`[MACHINE-CHECK] ${machine} has ${intervals.length} existing bookings`);
            
            // Calculate when this machine can actually start
            const machineEarliestFree = this.getEarliestFreeTime(machine);
            const actualSetupStart = new Date(Math.max(setupStart.getTime(), machineEarliestFree.getTime()));
            
            // Calculate the actual setup end based on machine availability
            const setupDuration = operation.SetupTime_Min || 0;
            const actualSetupEnd = new Date(actualSetupStart.getTime() + setupDuration * 60000);
            
            // NOTE: actualRunEnd will be calculated by the timing calculator using piece-level logic
            // We don't calculate it here to avoid overriding piece-level timing
            
            // Check if machine is free for setup (we'll check run conflicts later)
            const setupInterval = { start: actualSetupStart, end: actualSetupEnd };
            const hasSetupConflict = intervals.some(existingInterval => {
                return existingInterval.start < setupInterval.end && setupInterval.start < existingInterval.end;
            });
            
            if (hasSetupConflict) {
                Logger.log(`[MACHINE-CONFLICT] ${machine} has setup conflict with existing bookings, skipping`);
                continue; // Skip this machine - it has setup conflicts
            }
            
            // Calculate delay from requested start time
            const delayMinutes = (actualSetupStart.getTime() - setupStart.getTime()) / (1000 * 60);
            
            // ULTRA-AGGRESSIVE: Calculate comprehensive utilization metrics
            const isUnusedMachine = intervals.length === 0;
            const utilizationScore = intervals.length; // Lower is better
            
            // Calculate total workload hours for load balancing
            let totalWorkloadHours = 0;
            for (const interval of intervals) {
                const workloadHours = (interval.end.getTime() - interval.start.getTime()) / (1000 * 60 * 60);
                totalWorkloadHours += workloadHours;
            }
            
            candidates.push({
                machine,
                actualSetupStart,
                actualSetupEnd,
                meetsDueDate: true, // Will be determined later by timing calculator
                delay: actualSetupStart.getTime() - setupStart.getTime(),
                delayMinutes: delayMinutes,
                priority: 1,
                canStartImmediately: delayMinutes <= 5, // Can start within 5 minutes
                isUnusedMachine: isUnusedMachine,
                utilizationScore: utilizationScore,
                loadBalanceScore: totalWorkloadHours,
                efficiencyScore: delayMinutes, // Lower delay = higher efficiency
                totalWorkloadHours: totalWorkloadHours
            });
            
            Logger.log(`[CANDIDATE-FOUND] ${machine}: setup ${actualSetupStart.toISOString()}, setup end ${actualSetupEnd.toISOString()}, delay: ${delayMinutes.toFixed(1)}min, unused: ${isUnusedMachine}, workload: ${totalWorkloadHours.toFixed(1)}H`);
        }

        // ULTRA-EFFICIENT MACHINE UTILIZATION: USE ANY AVAILABLE MACHINE IMMEDIATELY
        if (candidates.length > 0) {
            // PRIORITY 1: Use machine that can start IMMEDIATELY (no delay)
            const immediateStartCandidates = candidates.filter(c => c.delayMinutes <= 5);
            if (immediateStartCandidates.length > 0) {
                // Among immediate start candidates, use the one with least workload
                const best = immediateStartCandidates.reduce((best, current) => {
                    return current.totalWorkloadHours < best.totalWorkloadHours ? current : best;
                });
                
                Logger.log(`[MACHINE-SELECTED] ${best.machine} (IMMEDIATE START - ${best.actualSetupStart.toISOString()}, delay: ${best.delayMinutes.toFixed(1)}min, workload: ${best.totalWorkloadHours.toFixed(1)}H)`);
                return {
                    machine: best.machine,
                    actualSetupStart: best.actualSetupStart,
                    actualSetupEnd: best.actualSetupEnd
                };
            }
            
            // PRIORITY 2: If no immediate start, use machine with EARLIEST start time
            const best = candidates.reduce((best, current) => {
                return current.actualSetupStart < best.actualSetupStart ? current : best;
            });
            
            Logger.log(`[MACHINE-SELECTED] ${best.machine} (EARLIEST START - ${best.actualSetupStart.toISOString()}, delay: ${best.delayMinutes.toFixed(1)}min, workload: ${best.totalWorkloadHours.toFixed(1)}H)`);
            return {
                machine: best.machine,
                actualSetupStart: best.actualSetupStart,
                actualSetupEnd: best.actualSetupEnd
            };
        }

        // ULTRA-AGGRESSIVE FALLBACK: If no candidates found, find earliest available machine
        Logger.log(`[WARNING] No candidates found, using ULTRA-AGGRESSIVE fallback`);
        
        // Find the machine that becomes available earliest
        let earliestMachine = null;
        let earliestTime = new Date('2099-12-31'); // Far future date
        
        for (const machine of availableMachines) {
            const intervals = this.machineSchedule?.[machine] || [];
            const machineEarliestFree = this.getMachineEarliestFreeTime(machine, setupStart);
            
            if (machineEarliestFree < earliestTime) {
                earliestTime = machineEarliestFree;
                earliestMachine = machine;
            }
        }
        
        if (earliestMachine) {
            Logger.log(`[MACHINE-SELECTED] ${earliestMachine} (ULTRA-AGGRESSIVE fallback - earliest available at ${earliestTime.toISOString()})`);
            return {
                machine: earliestMachine,
                actualSetupStart: earliestTime,
                actualSetupEnd: new Date(earliestTime.getTime() + (operation.SetupTime_Min || 0) * 60000)
            };
        }
        
        // Last resort: use first available machine
        const fallbackMachine = availableMachines[0];
        const fallbackStart = new Date();
        Logger.log(`[MACHINE-SELECTED] ${fallbackMachine} (ULTRA-AGGRESSIVE fallback - last resort)`);
        return {
            machine: fallbackMachine,
            actualSetupStart: fallbackStart,
            actualSetupEnd: new Date(fallbackStart.getTime() + (operation.SetupTime_Min || 0) * 60000)
        };
    }

    /**
     * Check if this is the first batch (B01)
     * @param {string} batchId - Batch ID
     * @returns {boolean} True if this is the first batch
     */
    isFirstBatch(batchId) {
        return batchId === 'B01' || batchId === 'B1' || batchId === 'Batch01';
    }

    /**
     * Select strategic machine for first batch to enable parallel processing
     * @param {Array} availableMachines - Available machines
     * @param {number} operationSeq - Operation sequence
     * @param {Array} previousOperationMachines - Machines used in previous operations
     * @returns {string|null} Selected strategic machine
     */
    selectStrategicMachineForFirstBatch(availableMachines, operationSeq, previousOperationMachines) {
        Logger.log(`[STRATEGIC-FIRST-BATCH] Selecting strategic machine for Op${operationSeq}`);
        
        // Strategy: Use alternative machines instead of "obvious" ones (VMC1, VMC2, VMC3, VMC4)
        const obviousMachines = ['VMC 1', 'VMC 2', 'VMC 3', 'VMC 4', 'VMC1', 'VMC2', 'VMC3', 'VMC4'];
        
        // Prefer alternative machines (VMC5, VMC6, VMC7, etc.)
        const alternativeMachines = availableMachines.filter(machine => 
            !obviousMachines.includes(machine) && !previousOperationMachines.includes(machine)
        );
        
        if (alternativeMachines.length > 0) {
            // Use strategic selection: prefer machines that leave popular ones free for second batch
            const strategicMachine = this.selectBestStrategicMachine(alternativeMachines, operationSeq);
            Logger.log(`[STRATEGIC-FIRST-BATCH] Selected alternative machine: ${strategicMachine}`);
            return strategicMachine;
        }
        
        // If no alternatives, avoid obvious machines if possible
        const nonObviousMachines = availableMachines.filter(machine => 
            !obviousMachines.includes(machine) && !previousOperationMachines.includes(machine)
        );
        
        if (nonObviousMachines.length > 0) {
            const strategicMachine = this.selectBestStrategicMachine(nonObviousMachines, operationSeq);
            Logger.log(`[STRATEGIC-FIRST-BATCH] Selected non-obvious machine: ${strategicMachine}`);
            return strategicMachine;
        }
        
        // Fallback: use any available machine (but still avoid previous operations)
        const unusedMachines = availableMachines.filter(machine => 
            !previousOperationMachines.includes(machine)
        );
        
        if (unusedMachines.length > 0) {
            const strategicMachine = this.selectBestStrategicMachine(unusedMachines, operationSeq);
            Logger.log(`[STRATEGIC-FIRST-BATCH] Selected fallback machine: ${strategicMachine}`);
            return strategicMachine;
        }
        
        // Last resort: use first available
        if (availableMachines.length > 0) {
            Logger.log(`[STRATEGIC-FIRST-BATCH] Using last resort: ${availableMachines[0]}`);
            return availableMachines[0];
        }
        
        return null;
    }

    /**
     * Select the best strategic machine from a list
     * @param {Array} machines - List of machines to choose from
     * @param {number} operationSeq - Operation sequence
     * @returns {string} Selected machine
     */
    selectBestStrategicMachine(machines, operationSeq) {
        if (machines.length === 1) {
            return machines[0];
        }
        
        // Strategic selection based on operation sequence
        // Op1: Prefer VMC2, VMC5, VMC7 (leave VMC1, VMC3, VMC4 free)
        // Op2: Prefer VMC3, VMC6, VMC7 (leave VMC1, VMC2, VMC4 free)
        // Op3: Prefer VMC5, VMC6, VMC7 (leave VMC1, VMC2, VMC3, VMC4 free)
        // Op4: Prefer VMC7, VMC6, VMC5 (leave VMC1, VMC2, VMC3, VMC4 free)
        
        const strategicPreferences = {
            1: ['VMC 2', 'VMC2', 'VMC 5', 'VMC5', 'VMC 7', 'VMC7'],
            2: ['VMC 3', 'VMC3', 'VMC 6', 'VMC6', 'VMC 7', 'VMC7'],
            3: ['VMC 5', 'VMC5', 'VMC 6', 'VMC6', 'VMC 7', 'VMC7'],
            4: ['VMC 7', 'VMC7', 'VMC 6', 'VMC6', 'VMC 5', 'VMC5']
        };
        
        const preferences = strategicPreferences[operationSeq] || [];
        
        // Find first preference that's available
        for (const preference of preferences) {
            if (machines.includes(preference)) {
                Logger.log(`[STRATEGIC-SELECTION] Op${operationSeq}: Selected preferred machine ${preference}`);
                return preference;
            }
        }
        
        // If no preferences match, use random selection for variety
        const randomIndex = Math.floor(Math.random() * machines.length);
        const selectedMachine = machines[randomIndex];
        Logger.log(`[STRATEGIC-SELECTION] Op${operationSeq}: Selected random machine ${selectedMachine}`);
        return selectedMachine;
    }

    /**
     * Select the earliest available machine from a list
     * @param {Array} machines - List of machines to choose from
     * @param {Date} setupStart - When setup needs to start
     * @returns {string|null} Selected machine or null
     */
    selectEarliestAvailableMachine(machines, setupStart) {
        if (!machines || machines.length === 0) return null;
        
        let bestMachine = null;
        let earliestTime = new Date('2099-12-31');
        
        for (const machine of machines) {
            const machineEarliestFree = this.getEarliestFreeTime(machine);
            
            if (machineEarliestFree < earliestTime) {
                earliestTime = machineEarliestFree;
                bestMachine = machine;
            }
        }
        
        return bestMachine;
    }

    /**
     * Get earliest free time for a machine
     * @param {string} machine - Machine name
     * @returns {Date} Earliest free time
     */
    getEarliestFreeTime(machine) {
        const intervals = this.machineSchedule?.[machine] || [];
        if (intervals.length === 0) {
            return new Date(); // Machine is free now
        }
        
        // Find the latest end time
        const latestEnd = intervals.reduce((latest, interval) => {
            return interval.end > latest ? interval.end : latest;
        }, new Date(0));
        
        return latestEnd;
    }

    /**
     * Get machine earliest free time considering a specific start time
     * @param {string} machine - Machine name
     * @param {Date} startTime - Start time to consider
     * @returns {Date} Earliest free time
     */
    getMachineEarliestFreeTime(machine, startTime) {
        const intervals = this.machineSchedule?.[machine] || [];
        if (intervals.length === 0) {
            return startTime; // Machine is free at start time
        }
        
        // Find the latest end time after start time
        const relevantIntervals = intervals.filter(interval => interval.end > startTime);
        if (relevantIntervals.length === 0) {
            return startTime; // Machine is free at start time
        }
        
        const latestEnd = relevantIntervals.reduce((latest, interval) => {
            return interval.end > latest ? interval.end : latest;
        }, startTime);
        
        return latestEnd;
    }

    /**
     * Check if machine is available for a time interval
     * @param {string} machine - Machine name
     * @param {Date} startTime - Start time
     * @param {Date} endTime - End time
     * @returns {boolean} True if machine is available
     */
    isMachineAvailable(machine, startTime, endTime) {
        const intervals = this.machineSchedule?.[machine] || [];
        
        return !intervals.some(interval => {
            return interval.start < endTime && startTime < interval.end;
        });
    }

    /**
     * Get machine utilization statistics
     * @param {string} machine - Machine name
     * @returns {Object} Utilization statistics
     */
    getMachineUtilization(machine) {
        const intervals = this.machineSchedule?.[machine] || [];
        
        let totalWorkTime = 0;
        let totalIdleTime = 0;
        
        intervals.forEach(interval => {
            const workTime = interval.end.getTime() - interval.start.getTime();
            totalWorkTime += workTime;
        });
        
        return {
            totalBookings: intervals.length,
            totalWorkTimeMs: totalWorkTime,
            totalWorkTimeHours: totalWorkTime / (1000 * 60 * 60),
            utilizationPercentage: intervals.length > 0 ? (totalWorkTime / (24 * 60 * 60 * 1000)) * 100 : 0
        };
    }
    
    /**
     * Reserve machine for a time interval
     * @param {string} machine - Machine name
     * @param {Date} startTime - Start time
     * @param {Date} endTime - End time
     * @returns {boolean} True if reservation successful
     */
    reserveMachine(machine, startTime, endTime) {
        if (!this.machineSchedule) {
            this.machineSchedule = {};
        }
        
        if (!this.machineSchedule[machine]) {
            this.machineSchedule[machine] = [];
        }
        
        // Check for conflicts
        if (!this.isMachineAvailable(machine, startTime, endTime)) {
            Logger.log(`[MACHINE-RESERVE] ${machine}: Cannot reserve - conflict detected`);
            return false;
        }
        
        this.machineSchedule[machine].push({
            start: new Date(startTime),
            end: new Date(endTime)
        });
        
        Logger.log(`[MACHINE-RESERVE] ${machine}: Reserved ${startTime.toISOString()} → ${endTime.toISOString()}`);
        return true;
    }
    
    /**
     * Get machine schedule
     * @param {string} machine - Machine name
     * @returns {Array} Machine schedule intervals
     */
    getMachineSchedule(machine) {
        return this.machineSchedule?.[machine] || [];
    }
    
    /**
     * Clear machine schedule
     * @param {string} machine - Machine name (optional, clears all if not specified)
     */
    clearMachineSchedule(machine = null) {
        if (machine) {
            if (this.machineSchedule && this.machineSchedule[machine]) {
                this.machineSchedule[machine] = [];
                Logger.log(`[MACHINE-CLEAR] Cleared schedule for ${machine}`);
            }
        } else {
            this.machineSchedule = {};
            this.allMachines.forEach(m => {
                this.machineSchedule[m] = [];
            });
            Logger.log(`[MACHINE-CLEAR] Cleared all machine schedules`);
        }
    }
    
    /**
     * Simulate machine candidate for conflict checking
     * @param {Object} operation - Operation data
     * @param {Object} orderData - Order data
     * @param {number} batchQty - Batch quantity
     * @param {string} candidateMachine - Machine to simulate
     * @param {Date} setupStart - Setup start time
     * @param {Date} setupEnd - Setup end time
     * @returns {Object} Simulation result
     */
    simulateMachineCandidate(operation, orderData, batchQty, candidateMachine, setupStart, setupEnd) {
        const intervals = this.machineSchedule?.[candidateMachine] || [];
        
        // Check for conflicts
        const hasConflict = intervals.some(interval => {
            return interval.start < setupEnd && setupStart < interval.end;
        });
        
        if (hasConflict) {
            return {
                available: false,
                conflict: true,
                earliestAvailable: this.getEarliestFreeTime(candidateMachine)
            };
        }
        
        // Calculate run timing
        const cycleTime = operation.CycleTime_Min || 0;
        const runStart = new Date(setupEnd);
        const runEnd = new Date(runStart.getTime() + (batchQty * cycleTime * 60000));
        
        return {
            available: true,
            conflict: false,
            setupStart: setupStart,
            setupEnd: setupEnd,
            runStart: runStart,
            runEnd: runEnd,
            totalDuration: runEnd.getTime() - setupStart.getTime()
        };
    }
    
    /**
     * Apply production window constraints
     * @param {string} machine - Machine name
     * @param {Date} runStart - Run start time
     * @param {Date} runEnd - Run end time
     * @param {number} runDuration - Run duration in minutes
     * @returns {Object} Production constraints result
     */
    applyProductionWindowConstraints(machine, runStart, runEnd, runDuration) {
        // Default production window: 24x7
        const productionWindow = { start: 0, end: 24, type: '24x7' };
        
        // Check if run fits within production window
        const runStartHour = runStart.getHours();
        const runEndHour = runEnd.getHours();
        
        if (productionWindow.type === '24x7') {
            return {
                paused: false,
                adjustedStart: runStart,
                adjustedEnd: runEnd,
                totalPauseTime: 0
            };
        }
        
        // Handle non-24x7 production windows
        if (runStartHour >= productionWindow.start && runEndHour <= productionWindow.end) {
            return {
                paused: false,
                adjustedStart: runStart,
                adjustedEnd: runEnd,
                totalPauseTime: 0
            };
        }
        
        // Calculate pause time and adjust schedule
        let totalPauseTime = 0;
        let adjustedStart = new Date(runStart);
        let adjustedEnd = new Date(runEnd);
        
        // If start is before production window, delay to window start
        if (runStartHour < productionWindow.start) {
            const delayHours = productionWindow.start - runStartHour;
            totalPauseTime += delayHours * 60; // Convert to minutes
            adjustedStart.setHours(productionWindow.start, 0, 0, 0);
        }
        
        // If end is after production window, extend to next day
        if (runEndHour > productionWindow.end) {
            const extensionHours = runEndHour - productionWindow.end;
            totalPauseTime += extensionHours * 60; // Convert to minutes
            adjustedEnd.setDate(adjustedEnd.getDate() + 1);
            adjustedEnd.setHours(productionWindow.start, 0, 0, 0);
        }
        
        return {
            paused: totalPauseTime > 0,
            adjustedStart: adjustedStart,
            adjustedEnd: adjustedEnd,
            totalPauseTime: totalPauseTime
        };
    }

    /**
     * Smart Batch Machine Assignment - Avoiding Machine Conflicts
     * Analyzes ALL batch machine needs before assigning to prevent conflicts
     * @param {Array} availableMachines - Available machines
     * @param {Date} setupStart - Setup start time
     * @param {number} operationSeq - Current operation sequence
     * @param {Array} previousOperationMachines - Machines used in previous operations
     * @param {Object} context - Additional context including batch info and other batches
     * @returns {string|null} Selected machine or null if no optimization possible
     */
    selectMachineForParallelProcessing(availableMachines, setupStart, operationSeq, previousOperationMachines, context = {}) {
        Logger.log(`[SMART-DISTRIBUTION] Operation ${operationSeq}: Previous machines used: ${previousOperationMachines.join(', ')}`);
        
        // STRATEGIC FIRST BATCH ASSIGNMENT ALGORITHM
        const { batchId, otherBatchMachines } = context;
        
        // Check if this is the first batch - use strategic assignment
        if (this.isFirstBatch(batchId)) {
            const strategicMachine = this.selectStrategicMachineForFirstBatch(availableMachines, operationSeq, previousOperationMachines);
            if (strategicMachine) {
                Logger.log(`[STRATEGIC-FIRST-BATCH] Selected strategic machine ${strategicMachine} for first batch Op${operationSeq}`);
                return strategicMachine;
            }
        }
        
        // Strategy 1: Analyze ALL batch machine needs to prevent conflicts
        if (otherBatchMachines && otherBatchMachines.length > 0) {
            Logger.log(`[SMART-BATCH] Analyzing machine conflicts with other batches: ${otherBatchMachines.join(', ')}`);
            
            // Find machines that won't conflict with other batches
            const conflictFreeMachines = availableMachines.filter(machine => 
                !otherBatchMachines.includes(machine)
            );
            
            if (conflictFreeMachines.length > 0) {
                // Among conflict-free machines, prefer unused ones
                const unusedConflictFree = conflictFreeMachines.filter(machine => 
                    !previousOperationMachines.includes(machine)
                );
                
                if (unusedConflictFree.length > 0) {
                    const selectedMachine = this.selectEarliestAvailableMachine(unusedConflictFree, setupStart);
                    Logger.log(`[SMART-BATCH] Selected conflict-free unused machine: ${selectedMachine}`);
                    return selectedMachine;
                } else {
                    const selectedMachine = this.selectEarliestAvailableMachine(conflictFreeMachines, setupStart);
                    Logger.log(`[SMART-BATCH] Selected conflict-free machine (reuse): ${selectedMachine}`);
                    return selectedMachine;
                }
            }
        }
        
        // Strategy 2: Avoid machines used in previous operations to enable parallel processing
        const unusedMachines = availableMachines.filter(machine => 
            !previousOperationMachines.includes(machine)
        );
        
        if (unusedMachines.length > 0) {
            // Among unused machines, find the one that can start earliest
            let bestMachine = null;
            let earliestTime = new Date('2099-12-31');
            
            for (const machine of unusedMachines) {
                const intervals = this.machineSchedule?.[machine] || [];
                const machineEarliestFree = this.getEarliestFreeTime(machine);
                
                if (machineEarliestFree < earliestTime) {
                    earliestTime = machineEarliestFree;
                    bestMachine = machine;
                }
            }
            
            if (bestMachine) {
                Logger.log(`[SMART-DISTRIBUTION] Selected unused machine ${bestMachine} for parallel processing`);
                return bestMachine;
            }
        }
        
        // Strategy 2: If all machines were used, find the one that becomes available earliest
        let earliestAvailableMachine = null;
        let earliestAvailableTime = new Date('2099-12-31');
        
        for (const machine of availableMachines) {
            const intervals = this.machineSchedule?.[machine] || [];
            const machineEarliestFree = this.getEarliestFreeTime(machine);
            
            if (machineEarliestFree < earliestAvailableTime) {
                earliestAvailableTime = machineEarliestFree;
                earliestAvailableMachine = machine;
            }
        }
        
        // Only use this strategy if the machine can start soon (within 2 hours)
        const delayHours = (earliestAvailableTime.getTime() - setupStart.getTime()) / (1000 * 60 * 60);
        if (delayHours <= 2) {
            Logger.log(`[SMART-DISTRIBUTION] Selected earliest available machine ${earliestAvailableMachine} (delay: ${delayHours.toFixed(1)}h)`);
            return earliestAvailableMachine;
        }
        
        // Strategy 3: Use load balancing - select least used machine
        let leastUsedMachine = null;
        let minUtilization = Infinity;
        
        for (const machine of availableMachines) {
            const intervals = this.machineSchedule?.[machine] || [];
            const utilization = intervals.length; // Number of bookings
            
            if (utilization < minUtilization) {
                minUtilization = utilization;
                leastUsedMachine = machine;
            }
        }
        
        if (leastUsedMachine) {
            Logger.log(`[SMART-DISTRIBUTION] Selected least used machine ${leastUsedMachine} (utilization: ${minUtilization})`);
            return leastUsedMachine;
        }
        
        Logger.log(`[SMART-DISTRIBUTION] No optimization possible, falling back to normal selection`);
        return null;
    }

    /**
     * Get earliest free time for a machine after a requested start time
     * @param {string} machine - Machine name
     * @param {Date} requestedStartTime - Requested start time (optional)
     * @returns {Date} Earliest free time
     */
    getEarliestFreeTime(machine, requestedStartTime = null) {
        const intervals = this.machineSchedule?.[machine] || [];
        
        if (intervals.length === 0) {
            return requestedStartTime || new Date(); // Machine is free at requested time or now
        }
        
        // Sort intervals by start time
        const sortedIntervals = intervals.sort((a, b) => a.start.getTime() - b.start.getTime());
        
        // Find the earliest available slot after requested start time
        let earliestFreeTime = requestedStartTime || new Date();
        
        for (const interval of sortedIntervals) {
            // CRITICAL FIX: Handle overlapping intervals correctly
            // If requested time is before this interval starts, machine is free
            if (earliestFreeTime < interval.start) {
                return earliestFreeTime;
            }
            
            // If requested time is within or overlaps this interval, machine is busy until interval ends
            if (earliestFreeTime < interval.end) {
                earliestFreeTime = new Date(interval.end);
                Logger.log(`[MACHINE-CONFLICT] ${machine} busy until ${earliestFreeTime.toISOString()}`);
            }
        }
        
        // Return the earliest free time (after all intervals)
        Logger.log(`[MACHINE-AVAILABILITY] ${machine} earliest free time: ${earliestFreeTime.toISOString()}`);
        return earliestFreeTime;
    }
}

// Export to window for global access
if (typeof window !== 'undefined') {
    window.MachineSelector = MachineSelector;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MachineSelector };
}
// Updated Sat Sep 13 03:01:36 IST 2025 - efficiencyScore fix
