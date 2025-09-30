/**
 * Modular Scheduling Engine
 * Uses extracted modules for scheduling operations
 */

class ModularSchedulingEngine {
    constructor() {
        this.batchProcessor = new BatchProcessor();
        this.machineSelector = new MachineSelector();
        this.operatorManager = new OperatorManager();
        this.timingCalculator = new TimingCalculator();
        
        // Initialize schedules
        this.machineSchedule = {};
        this.operatorSchedule = {};
        this.globalSettings = {};
        
        // Initialize machine schedules
        const allMachines = ["VMC 1", "VMC 2", "VMC 3", "VMC 4", "VMC 5", "VMC 6", "VMC 7", "VMC 8", "VMC 9"];
        allMachines.forEach(machine => {
            this.machineSchedule[machine] = [];
        });
        
        // Initialize operator schedules
        const allPersons = ["A", "B", "C", "D"];
        allPersons.forEach(operator => {
            this.operatorSchedule[operator] = [];
        });
    }

    /**
     * Set global settings for the scheduler
     * @param {Object} settings - Global settings object
     */
    setGlobalSettings(settings) {
        this.globalSettings = settings || {};
        
        // Pass settings to modules
        this.machineSelector.globalSettings = this.globalSettings;
        this.operatorManager.globalSettings = this.globalSettings;
        this.timingCalculator.globalSettings = this.globalSettings;
        
        Logger.log(`[MODULAR-SCHEDULER] Global settings updated`);
    }

    /**
     * Schedule an order using modular components
     * @param {Object} orderData - Order data
     * @param {Array} alerts - Alerts array
     * @returns {Array} Scheduling results
     */
    scheduleOrder(orderData, alerts = []) {
        try {
            Logger.log(`[MODULAR-SCHEDULER] Scheduling order: ${orderData.partNumber}`);
            
            // Validate order data
            if (!orderData.partNumber || orderData.partNumber === 'Unknown') {
                throw new Error('Invalid part number: ' + orderData.partNumber);
            }
            
            if (!orderData.quantity || orderData.quantity <= 0) {
                throw new Error('Invalid quantity: ' + orderData.quantity);
            }
            
            // Step 1: Calculate batch splitting
            // Get minimum batch size from operations or use default
            const operations = this.getOperationsForPart(orderData.partNumber, orderData.operationSeq);
            const minBatchSize = operations.length > 0 ? 
                Math.max(...operations.map(op => op.Minimum_BatchSize || 1)) : 100;
            
            const batches = this.batchProcessor.calculateBatchSplitting(
                orderData.quantity,
                minBatchSize,
                orderData.priority,
                orderData.dueDate,
                orderData.startDate,
                orderData.batchMode || 'auto-split',
                orderData.customBatchSize,
                operations // Pass operations for dependency consideration
            );
            
            Logger.log(`[MODULAR-SCHEDULER] Created ${batches.length} batches`);
            
            // Step 2: Process each batch
            const allResults = [];
            
            // Track machines used in each batch to prevent conflicts
            const batchMachineUsage = {};
            
            // BATCH-PERSON CONSISTENCY: Assign one person per batch sequence
            const batchPersonAssignment = this.assignPersonsToBatches(batches);
            
            batches.forEach((batch, batchIndex) => {
                try {
                    // Initialize machine tracking for this batch
                    batchMachineUsage[batch.batchId] = [];
                    
                    // Assign the designated person for this batch
                    batch.assignedPerson = batchPersonAssignment[batch.batchId];
                    Logger.log(`[BATCH-PERSON] Batch ${batch.batchId} assigned to Person ${batch.assignedPerson}`);
                    
                    const batchResults = this.scheduleBatch(batch, orderData, batchIndex, batchMachineUsage);
                    allResults.push(...batchResults);
                } catch (error) {
                    Logger.error(`[MODULAR-SCHEDULER] Error scheduling batch ${batch.batchId}: ${error.message}`);
                    alerts.push(`❌ Error scheduling batch ${batch.batchId}: ${error.message}`);
                }
            });
            
            Logger.log(`[MODULAR-SCHEDULER] Order ${orderData.partNumber} scheduled: ${allResults.length} operations`);
            return allResults;
            
        } catch (error) {
            Logger.error(`[MODULAR-SCHEDULER] Error scheduling order ${orderData.partNumber}: ${error.message}`);
            alerts.push(`❌ Error scheduling order ${orderData.partNumber}: ${error.message}`);
            return [];
        }
    }

    /**
     * Assign persons to batches for consistent batch-person assignment
     * @param {Array} batches - Array of batches
     * @returns {Object} Batch ID to person assignment mapping
     */
    assignPersonsToBatches(batches) {
        const assignment = {};
        const availablePersons = ['A', 'B', 'C', 'D'];
        
        Logger.log(`[BATCH-PERSON] Assigning persons to ${batches.length} batches`);
        
        batches.forEach((batch, index) => {
            // Round-robin assignment for balanced workload
            const personIndex = index % availablePersons.length;
            const assignedPerson = availablePersons[personIndex];
            
            assignment[batch.batchId] = assignedPerson;
            Logger.log(`[BATCH-PERSON] ${batch.batchId} → Person ${assignedPerson}`);
        });
        
        return assignment;
    }

    /**
     * Schedule a single batch
     * @param {Object} batch - Batch data
     * @param {Object} orderData - Order data
     * @param {number} batchIndex - Batch index
     * @param {Object} batchMachineUsage - Machine usage tracking object
     * @returns {Array} Batch scheduling results
     */
    scheduleBatch(batch, orderData, batchIndex, batchMachineUsage) {
        Logger.log(`[MODULAR-SCHEDULER] Scheduling batch ${batch.batchId} (${batch.quantity} pieces)`);
        
        // Get operations for this part number
        const operations = this.getOperationsForPart(orderData.partNumber, orderData.operationSeq);
        
        if (!operations || operations.length === 0) {
            Logger.error(`[MODULAR-SCHEDULER] No operations found for part ${orderData.partNumber}`);
            Logger.error(`[MODULAR-SCHEDULER] Available parts: ${[...new Set((window.OP_MASTER || []).map(op => op.PartNumber))].join(', ')}`);
            return [];
        }
        
        Logger.log(`[MODULAR-SCHEDULER] Found ${operations.length} operations for ${orderData.partNumber}: ${operations.map(op => `Op ${op.OperationSeq}`).join(', ')}`);
        
        const allResults = [];
        let previousOpRunEnd = null;
        let previousOpPieceCompletionTimes = null;
        
        // Process each operation in sequence
        operations.forEach((operation, opIndex) => {
            try {
                // Validate operation data
                if (!operation.OperationSeq || !operation.OperationName) {
                    Logger.error(`[MODULAR-SCHEDULER] Invalid operation data: ${JSON.stringify(operation)}`);
                    return;
                }
                
                if (!operation.SetupTime_Min || operation.SetupTime_Min <= 0) {
                    Logger.warn(`[MODULAR-SCHEDULER] Invalid setup time for operation ${operation.OperationSeq}, using default`);
                    operation.SetupTime_Min = 60; // Default 1 hour
                }
                
                if (!operation.CycleTime_Min || operation.CycleTime_Min <= 0) {
                    Logger.warn(`[MODULAR-SCHEDULER] Invalid cycle time for operation ${operation.OperationSeq}, using default`);
                    operation.CycleTime_Min = 10; // Default 10 minutes
                }
                
                // Step 1: Calculate proper setup start time using piece-level logic
                let setupStart;
                if (opIndex === 0) {
                    // First operation starts immediately
                    setupStart = new Date();
                } else if (previousOpPieceCompletionTimes && previousOpPieceCompletionTimes.length > 0) {
                    // CORRECT PIECE-LEVEL FLOW: Next operation setup starts when FIRST piece from previous operation is ready
                    // This enables parallel processing - setup can happen while previous operation is still running
                    const firstPieceReadyTime = previousOpPieceCompletionTimes[0];
                    setupStart = new Date(firstPieceReadyTime);
                    Logger.log(`[PIECE-FLOW] Op${operation.OperationSeq} setup starts when first piece ready: ${setupStart.toISOString()}`);
                    Logger.log(`[PIECE-FLOW] Previous operation had ${previousOpPieceCompletionTimes.length} pieces completed`);
                } else {
                    // Fallback to previous operation end time
                    setupStart = previousOpRunEnd || new Date();
                    Logger.warn(`[PIECE-FLOW] No piece completion times available, using fallback: ${setupStart.toISOString()}`);
                    Logger.warn(`[PIECE-FLOW] previousOpPieceCompletionTimes: ${previousOpPieceCompletionTimes}`);
                    Logger.warn(`[PIECE-FLOW] previousOpRunEnd: ${previousOpRunEnd}`);
                }
                
                // Get machines used by other batches for smart assignment
                const otherBatchMachines = this.getMachinesUsedByOtherBatches(batch.batchId);
                
                // Get machines used in previous operations of current batch (from tracking)
                const previousOperationMachines = batchMachineUsage[batch.batchId] || [];
                
                const machineResult = this.machineSelector.selectOptimalMachine(
                    operation,
                    orderData,
                    setupStart,
                    null, // runEnd
                    {
                        operationSeq: operation.OperationSeq,
                        batchId: batch.batchId,
                        previousOperationMachines: previousOperationMachines,
                        otherBatchMachines: otherBatchMachines
                    }
                );
                
                // Extract machine info from result
                let selectedMachine = machineResult.machine || machineResult; // Handle both old and new formats
                let actualSetupStart = machineResult.actualSetupStart || setupStart;
                const actualSetupEnd = machineResult.actualSetupEnd;
                
                // CRITICAL FIX: Check for machine conflicts BEFORE proceeding
                const conflictCheck = this.checkMachineConflict(selectedMachine, actualSetupStart, operation, batch.quantity);
                if (conflictCheck.hasConflict) {
                    Logger.log(`[MACHINE-CONFLICT] Conflict detected with ${selectedMachine} at ${actualSetupStart.toISOString()}`);
                    Logger.log(`[MACHINE-CONFLICT] Machine busy until: ${conflictCheck.busyUntil.toISOString()}`);
                    
                    // Find alternative machine or wait for availability
                    const alternativeResult = this.resolveMachineConflict(
                        operation, 
                        orderData, 
                        actualSetupStart, 
                        conflictCheck.busyUntil,
                        previousOperationMachines,
                        otherBatchMachines
                    );
                    
                    if (alternativeResult) {
                        selectedMachine = alternativeResult.machine;
                        actualSetupStart = alternativeResult.actualSetupStart;
                        Logger.log(`[MACHINE-CONFLICT] Resolved: Using ${selectedMachine} at ${actualSetupStart.toISOString()}`);
                    } else {
                        Logger.error(`[MACHINE-CONFLICT] No alternative machine found, delaying operation`);
                        actualSetupStart = new Date(conflictCheck.busyUntil.getTime() + 60000); // Wait 1 minute after machine is free
                    }
                }
                
                // Track this machine as used in current batch to prevent conflicts
                if (!batchMachineUsage[batch.batchId].includes(selectedMachine)) {
                    batchMachineUsage[batch.batchId].push(selectedMachine);
                    Logger.log(`[MACHINE-TRACKING] Added ${selectedMachine} to batch ${batch.batchId} tracking`);
                }
                
                Logger.log(`[MACHINE-RESULT] Final: ${selectedMachine}, actualSetupStart: ${actualSetupStart.toISOString()}`);
                
                // Step 2: Select optimal operator (prefer batch-assigned person)
                const setupDuration = operation.SetupTime_Min || 60;
                let selectedOperator = this.selectOptimalOperator(
                    actualSetupStart,
                    setupDuration,
                    batch.assignedPerson // Pass the assigned person for this batch
                );
                
                // Step 2.5: CRITICAL FIX - Check operator availability WITHOUT overriding piece-level flow
                const setupEnd = new Date(actualSetupStart.getTime() + setupDuration * 60000);
                
                // Check if selected operator is available for the full setup duration
                if (!this.operatorManager.isOperatorAvailable(selectedOperator, actualSetupStart, setupEnd)) {
                    Logger.log(`[OPERATOR-CONFLICT] ${selectedOperator} not available at ${actualSetupStart.toISOString()}, finding next available time`);
                    
                    // Find next available time for this operator
                    const nextAvailableTime = this.findNextAvailableOperatorTime(selectedOperator, actualSetupStart, setupDuration);
                    if (nextAvailableTime) {
                        // CRITICAL: Only adjust timing if it doesn't break piece-level flow
                        // Piece-level flow takes precedence over operator availability
                        if (opIndex === 0 || !previousOpPieceCompletionTimes || nextAvailableTime <= actualSetupStart) {
                            actualSetupStart = nextAvailableTime;
                            Logger.log(`[OPERATOR-CONFLICT] Adjusted setup start to: ${actualSetupStart.toISOString()}`);
                        } else {
                            Logger.warn(`[PIECE-FLOW-PROTECTION] Operator conflict ignored to preserve piece-level flow`);
                            Logger.warn(`[PIECE-FLOW-PROTECTION] Piece-level timing: ${actualSetupStart.toISOString()}, Operator available: ${nextAvailableTime.toISOString()}`);
                        }
                    } else {
                        Logger.error(`[OPERATOR-CONFLICT] No available time found for ${selectedOperator}, delaying operation`);
                        // CRITICAL: Maintain batch-person consistency by waiting for preferred person
                        // Don't switch to different operator - this breaks batch consistency
                        const delayHours = 24; // Delay by 24 hours to find next available slot
                        actualSetupStart = new Date(actualSetupStart.getTime() + delayHours * 60 * 60 * 1000);
                        Logger.log(`[BATCH-CONSISTENCY] Delaying operation by ${delayHours}h to maintain batch-person consistency: ${actualSetupStart.toISOString()}`);
                    }
                }
                
                // Step 3: Calculate timing FIRST, then reserve resources with accurate timing
                const timing = this.timingCalculator.calculateOperationTiming(
                    operation,
                    orderData,
                    batch.quantity,
                    selectedMachine,
                    selectedOperator,
                    actualSetupStart,
                    previousOpPieceCompletionTimes,
                    previousOpRunEnd,
                    // Machine availability callback
                    (machine, requestedStartTime) => {
                        return this.machineSelector.getEarliestFreeTime(machine, requestedStartTime);
                    }
                );
                
                // Step 4: Reserve resources with ACCURATE timing from calculation
                this.reserveMachine(selectedMachine, timing.setupStart, timing.runEnd);
                this.reserveOperator(selectedOperator, timing.setupStart, timing.setupEnd);
                
                // MACHINE AVAILABILITY ENFORCEMENT: RunStart is when machine is available
                // This implements the correct piece-level flow: operations wait for machine availability
                if (timing.runStart.getTime() !== timing.setupEnd.getTime()) {
                    Logger.log(`[MACHINE-AVAILABILITY] Op${operation.OperationSeq} runStart delayed for machine availability:`);
                    Logger.log(`[MACHINE-AVAILABILITY] SetupEnd: ${timing.setupEnd.toISOString()}, RunStart: ${timing.runStart.toISOString()}`);
                    Logger.log(`[MACHINE-AVAILABILITY] Machine ${selectedMachine} was busy, run waits until available`);
                }
                
                // PIECE-LEVEL FLOW: Use ACTUAL completion times, not artificial extensions
                // Operations complete when ALL PIECES are processed (Setup + Quantity × Cycle Time)
                Logger.log(`[PIECE-LEVEL] Op${operation.OperationSeq} ACTUAL completion: ${timing.runEnd.toISOString()}`);
                Logger.log(`[PIECE-LEVEL] Setup: ${timing.setupEnd.toISOString()}, Run: ${timing.runStart.toISOString()} → ${timing.runEnd.toISOString()}`);
                
                // CRITICAL: Do NOT artificially extend operation times
                // Each operation completes when its pieces are actually finished
                // This enables proper machine reuse and piece-level flow
                
                // Validate piece-level timing
                if (!timing.pieceCompletionTimes || timing.pieceCompletionTimes.length !== batch.quantity) {
                    Logger.error(`[PIECE-LEVEL-ERROR] Invalid piece completion times for ${operation.OperationName}`);
                    Logger.error(`Expected: ${batch.quantity}, Got: ${timing.pieceCompletionTimes ? timing.pieceCompletionTimes.length : 0}`);
                }
                
                // Step 5: Resources already reserved in Step 3
                
                // Step 6: Create result
                const result = {
                    PartNumber: orderData.partNumber,
                    Order_Quantity: orderData.quantity,
                    Priority: orderData.priority,
                    Batch_ID: batch.batchId,
                    Batch_Qty: batch.quantity,
                    OperationSeq: operation.OperationSeq,
                    OperationName: operation.OperationName,
                    Machine: selectedMachine,
                    Person: selectedOperator,
                    SetupStart: this.formatDateTime(timing.setupStart),
                    SetupEnd: this.formatDateTime(timing.setupEnd),
                    RunStart: this.formatDateTime(timing.runStart),
                    RunEnd: this.formatDateTime(timing.runEnd),
                    Timing: this.timingCalculator.formatDuration(
                        timing.runEnd.getTime() - timing.setupStart.getTime()
                    ),
                    DueDate: orderData.dueDate ? this.formatDateTime(new Date(orderData.dueDate)) : 'Not set',
                    Status: 'Scheduled'
                };
                
                allResults.push(result);
                
                // Update for next operation
                previousOpRunEnd = timing.runEnd;
                previousOpPieceCompletionTimes = timing.pieceCompletionTimes;
                
                Logger.log(`[PIECE-FLOW-UPDATE] Op${operation.OperationSeq} completed:`);
                Logger.log(`[PIECE-FLOW-UPDATE] Run end: ${timing.runEnd.toISOString()}`);
                Logger.log(`[PIECE-FLOW-UPDATE] Piece completion times: ${timing.pieceCompletionTimes ? timing.pieceCompletionTimes.length : 0} pieces`);
                if (timing.pieceCompletionTimes && timing.pieceCompletionTimes.length > 0) {
                    Logger.log(`[PIECE-FLOW-UPDATE] First piece ready: ${timing.pieceCompletionTimes[0].toISOString()}`);
                    Logger.log(`[PIECE-FLOW-UPDATE] Last piece ready: ${timing.pieceCompletionTimes[timing.pieceCompletionTimes.length - 1].toISOString()}`);
                }
                
                Logger.log(`[MODULAR-SCHEDULER] Batch ${batch.batchId} scheduled: ${selectedMachine} → ${selectedOperator}`);
                
            } catch (error) {
                Logger.error(`[MODULAR-SCHEDULER] Error scheduling operation ${operation.OperationSeq}: ${error.message}`);
                Logger.error(`[MODULAR-SCHEDULER] Stack trace: ${error.stack}`);
                
                // CRITICAL: Don't update previousOpPieceCompletionTimes if operation failed
                // This prevents cascading failures in piece-level flow
                Logger.warn(`[PIECE-FLOW-ERROR] Operation ${operation.OperationSeq} failed, keeping previous piece completion times: ${previousOpPieceCompletionTimes ? previousOpPieceCompletionTimes.length : 0} pieces`);
            }
        });
        
        return allResults;
    }
    
    /**
     * Get operations for a part number
     * @param {string} partNumber - Part number
     * @param {string} operationSeq - Operation sequence filter
     * @returns {Array} Array of operations
     */
    getOperationsForPart(partNumber, operationSeq) {
        // Use global OP_MASTER data if available
        const dataSource = window.OP_MASTER || [];
        
        let operations = dataSource.filter(op => {
            const partNum = op.PartNumber || op.partnumber;
            return partNum === partNumber;
        });
        
        // Normalize field names for compatibility
        operations = operations.map(op => ({
            ...op,
            Operator: op.Operator || op.Operater || '', // Handle misspelled field
            OperationName: op.OperationName || 'Unknown Operation', // Handle empty names
            Minimum_BatchSize: op.Minimum_BatchSize || 1 // Handle empty batch sizes
        }));
        
        // Filter by operation sequence if specified
        if (operationSeq && operationSeq !== 'All' && operationSeq !== '') {
            if (operationSeq.includes(',')) {
                // Multiple sequences (e.g., "1,2,3")
                const selectedSequences = operationSeq.split(',').map(seq => parseInt(seq.trim())).filter(seq => !isNaN(seq));
                operations = operations.filter(op => selectedSequences.includes(op.OperationSeq));
            } else {
                // Single sequence
                const singleSeq = parseInt(operationSeq);
                if (!isNaN(singleSeq)) {
                    operations = operations.filter(op => op.OperationSeq === singleSeq);
                }
            }
        }
        
        // Sort by operation sequence
        operations.sort((a, b) => a.OperationSeq - b.OperationSeq);
        
        return operations;
    }
    
    /**
     * Select optimal operator for a time slot
     * @param {Date} setupStart - Setup start time
     * @param {number} setupDuration - Setup duration in minutes
     * @param {string} preferredPerson - Preferred person for batch consistency
     * @returns {string} Selected operator
     */
    selectOptimalOperator(setupStart, setupDuration, preferredPerson = null) {
        const setupEnd = new Date(setupStart.getTime() + setupDuration * 60000);
        
        // Get operators available for this time slot
        const availableOperators = this.getAvailableOperators(setupStart, setupEnd);
        
        if (availableOperators.length === 0) {
            Logger.warn(`[OPERATOR-SELECTION] No operators available, using fallback`);
            return 'A'; // Fallback
        }
        
        // BATCH-PERSON CONSISTENCY: Prefer the assigned person for this batch
        if (preferredPerson && availableOperators.includes(preferredPerson)) {
            Logger.log(`[OPERATOR-SELECTION] Using preferred person ${preferredPerson} for batch consistency`);
            return preferredPerson;
        }
        
        // If preferred person not available, select operator with least workload
        let bestOperator = availableOperators[0];
        let minWorkload = this.operatorManager.getTotalOperatorSetupMinutes(bestOperator);
        
        for (const operator of availableOperators) {
            const workload = this.operatorManager.getTotalOperatorSetupMinutes(operator);
            if (workload < minWorkload) {
                minWorkload = workload;
                bestOperator = operator;
            }
        }
        
        Logger.log(`[OPERATOR-SELECTED] ${bestOperator} (workload: ${minWorkload}min)`);
        return bestOperator;
    }
    
    /**
     * Get available operators for a time slot
     * @param {Date} startTime - Start time
     * @param {Date} endTime - End time
     * @returns {Array} Array of available operator names
     */
    getAvailableOperators(startTime, endTime) {
        const allOperators = ['A', 'B', 'C', 'D'];
        const availableOperators = [];
        
        for (const operator of allOperators) {
            // Check if operator manager has the function
            if (this.operatorManager && typeof this.operatorManager.hasOperatorConflict === 'function') {
                if (!this.operatorManager.hasOperatorConflict(operator, startTime, endTime)) {
                    availableOperators.push(operator);
                }
            } else {
                // Fallback: check local operator schedule
                if (!this.hasOperatorConflict(operator, startTime, endTime)) {
                    availableOperators.push(operator);
                }
            }
        }
        
        Logger.log(`[OPERATOR-AVAILABILITY] Available operators for ${startTime.toISOString()} → ${endTime.toISOString()}: ${availableOperators.join(', ')}`);
        return availableOperators;
    }
    
    /**
     * Get machines used by other batches to prevent conflicts
     * @param {string} currentBatchId - Current batch ID
     * @returns {Array} Array of machine names used by other batches
     */
    getMachinesUsedByOtherBatches(currentBatchId) {
        const otherBatchMachines = [];
        
        // Get machines already reserved by other batches from the machine selector
        if (this.machineSelector && this.machineSelector.machineSchedule) {
            for (const [machine, intervals] of Object.entries(this.machineSelector.machineSchedule)) {
                if (intervals && intervals.length > 0 && !otherBatchMachines.includes(machine)) {
                    otherBatchMachines.push(machine);
                }
            }
        }
        
        Logger.log(`[SMART-BATCH] Machines already reserved by other batches: ${otherBatchMachines.join(', ')}`);
        return otherBatchMachines;
    }

    /**
     * Get machines used in previous operations of the current batch
     * @param {Object} batch - Current batch
     * @param {number} operationIndex - Current operation index
     * @returns {Array} Array of machine names used in previous operations
     */
    getMachinesUsedInPreviousOperations(batch, operationIndex) {
        const previousMachines = [];
        
        // Check if batch has operations and we're not on the first operation
        if (batch && batch.operations && operationIndex > 0) {
            for (let i = 0; i < operationIndex; i++) {
                const op = batch.operations[i];
                if (op && op.machine && !previousMachines.includes(op.machine)) {
                    previousMachines.push(op.machine);
                }
            }
        }
        
        Logger.log(`[PREVIOUS-MACHINES] Operation ${operationIndex + 1}: Previous machines used: ${previousMachines.join(', ')}`);
        return previousMachines;
    }
    
    /**
     * Check if operator has conflict (fallback method)
     * @param {string} operator - Operator name
     * @param {Date} startTime - Start time
     * @param {Date} endTime - End time
     * @returns {boolean} True if operator has conflict
     */
    hasOperatorConflict(operator, startTime, endTime) {
        if (!this.operatorSchedule) {
            this.operatorSchedule = {};
        }
        
        const intervals = this.operatorSchedule[operator] || [];
        
        return intervals.some(interval => {
            return startTime < interval.end && interval.start < endTime;
        });
    }

    /**
     * Format date time for display
     * @param {Date} date - Date to format
     * @returns {string} Formatted date string
     */
    formatDateTime(date) {
        if (!date || !(date instanceof Date)) {
            return 'N/A';
        }
        
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    }

    /**
     * Reserve machine for a time interval
     * @param {string} machine - Machine name
     * @param {Date} startTime - Start time
     * @param {Date} endTime - End time
     */
    reserveMachine(machine, startTime, endTime) {
        // Delegate to machine selector
        this.machineSelector.reserveMachine(machine, startTime, endTime);
        
        // Also update local schedule for compatibility
        if (!this.machineSchedule[machine]) {
            this.machineSchedule[machine] = [];
        }
        
        this.machineSchedule[machine].push({
            start: new Date(startTime),
            end: new Date(endTime)
        });
        
        Logger.log(`[MODULAR-SCHEDULER] Reserved ${machine}: ${startTime.toISOString()} → ${endTime.toISOString()}`);
    }

    /**
     * Reserve operator for a time interval
     * @param {string} operator - Operator name
     * @param {Date} startTime - Start time
     * @param {Date} endTime - End time
     */
    reserveOperator(operator, startTime, endTime) {
        // Check if operator manager has the function
        if (this.operatorManager && typeof this.operatorManager.reserveOperator === 'function') {
            const success = this.operatorManager.reserveOperator(operator, startTime, endTime);
            if (success) {
                // Also update local schedule for compatibility
                if (!this.operatorSchedule) {
                    this.operatorSchedule = {};
                }
        if (!this.operatorSchedule[operator]) {
            this.operatorSchedule[operator] = [];
        }
        
        this.operatorSchedule[operator].push({
            start: new Date(startTime),
            end: new Date(endTime)
        });
        
        Logger.log(`[MODULAR-SCHEDULER] Reserved ${operator}: ${startTime.toISOString()} → ${endTime.toISOString()}`);
            }
            return success;
        } else {
            // Fallback: direct reservation
            if (!this.operatorSchedule) {
                this.operatorSchedule = {};
            }
            
            if (!this.operatorSchedule[operator]) {
                this.operatorSchedule[operator] = [];
            }
            
            // Check for conflicts
            const intervals = this.operatorSchedule[operator];
            const hasConflict = intervals.some(interval => {
                return startTime < interval.end && interval.start < endTime;
            });
            
            if (hasConflict) {
                Logger.log(`[OPERATOR-RESERVE] ${operator}: Cannot reserve - conflict detected`);
                return false;
            }
            
            this.operatorSchedule[operator].push({
                start: new Date(startTime),
                end: new Date(endTime)
            });
            
            Logger.log(`[MODULAR-SCHEDULER] Reserved ${operator}: ${startTime.toISOString()} → ${endTime.toISOString()}`);
            return true;
        }
    }
    
    /**
     * Find next available time for an operator
     * @param {string} operator - Operator name
     * @param {Date} requestedStartTime - Requested start time
     * @param {number} durationMinutes - Duration in minutes
     * @returns {Date|null} Next available time or null
     */
    findNextAvailableOperatorTime(operator, requestedStartTime, durationMinutes) {
        // Check availability in 1-hour increments for the next 24 hours
        const checkDuration = 60 * 60 * 1000; // 1 hour in milliseconds
        const maxChecks = 24; // Check up to 24 hours ahead
        
        for (let i = 0; i < maxChecks; i++) {
            const checkTime = new Date(requestedStartTime.getTime() + (i * checkDuration));
            const checkEnd = new Date(checkTime.getTime() + durationMinutes * 60000);
            
            if (this.operatorManager.isOperatorAvailable(operator, checkTime, checkEnd)) {
                Logger.log(`[OPERATOR-AVAILABILITY] ${operator} available at ${checkTime.toISOString()}`);
                return checkTime;
            }
        }
        
        return null;
    }

    /**
     * Check for machine conflicts before scheduling
     * @param {string} machine - Machine to check
     * @param {Date} setupStart - Requested setup start time
     * @param {Object} operation - Operation data
     * @param {number} batchQty - Batch quantity
     * @returns {Object} Conflict check result
     */
    checkMachineConflict(machine, setupStart, operation, batchQty) {
        // Calculate estimated run end time
        const setupDuration = operation.SetupTime_Min || 0;
        const cycleTime = operation.CycleTime_Min || 0;
        const runDuration = batchQty * cycleTime * 60000; // milliseconds
        const estimatedRunEnd = new Date(setupStart.getTime() + setupDuration * 60000 + runDuration);
        
        // Check if machine is available for this time period
        const earliestFreeTime = this.machineSelector.getEarliestFreeTime(machine, setupStart);
        
        if (earliestFreeTime > setupStart) {
            return {
                hasConflict: true,
                busyUntil: earliestFreeTime,
                requestedStart: setupStart,
                estimatedEnd: estimatedRunEnd
            };
        }
        
        // Check for overlapping intervals
        const intervals = this.machineSelector.machineSchedule?.[machine] || [];
        for (const interval of intervals) {
            if (setupStart < interval.end && interval.start < estimatedRunEnd) {
                return {
                    hasConflict: true,
                    busyUntil: new Date(interval.end),
                    requestedStart: setupStart,
                    estimatedEnd: estimatedRunEnd,
                    conflictingInterval: interval
                };
            }
        }
        
        return {
            hasConflict: false,
            busyUntil: setupStart,
            requestedStart: setupStart,
            estimatedEnd: estimatedRunEnd
        };
    }

    /**
     * Resolve machine conflict by finding alternative machine or timing
     * @param {Object} operation - Operation data
     * @param {Object} orderData - Order data
     * @param {Date} requestedStart - Requested start time
     * @param {Date} busyUntil - When machine becomes available
     * @param {Array} previousOperationMachines - Machines used in previous operations
     * @param {Array} otherBatchMachines - Machines used by other batches
     * @returns {Object|null} Alternative machine result or null
     */
    resolveMachineConflict(operation, orderData, requestedStart, busyUntil, previousOperationMachines, otherBatchMachines) {
        Logger.log(`[MACHINE-CONFLICT-RESOLUTION] Resolving conflict for ${operation.OperationName}`);
        
        // Get all eligible machines
        let eligibleMachines = operation.EligibleMachines || this.machineSelector.allMachines;
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
        
        // Try to find an alternative machine that's available at the requested time
        for (const machine of availableMachines) {
            const conflictCheck = this.checkMachineConflict(machine, requestedStart, operation, orderData.quantity);
            if (!conflictCheck.hasConflict) {
                Logger.log(`[MACHINE-CONFLICT-RESOLUTION] Found alternative machine: ${machine}`);
                return {
                    machine: machine,
                    actualSetupStart: requestedStart,
                    reason: 'alternative_machine_available'
                };
            }
        }
        
        // If no alternative machine is available, try waiting until the original machine is free
        const setupDuration = operation.SetupTime_Min || 0;
        const cycleTime = operation.CycleTime_Min || 0;
        const runDuration = orderData.quantity * cycleTime * 60000;
        const totalDuration = setupDuration * 60000 + runDuration;
        
        // Check if the machine becomes available soon enough
        const waitTime = busyUntil.getTime() - requestedStart.getTime();
        const maxWaitTime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        
        if (waitTime <= maxWaitTime) {
            Logger.log(`[MACHINE-CONFLICT-RESOLUTION] Waiting for machine to become available at: ${busyUntil.toISOString()}`);
            return {
                machine: operation.machine || 'VMC 1', // Fallback machine
                actualSetupStart: busyUntil,
                reason: 'wait_for_machine_availability'
            };
        }
        
        Logger.log(`[MACHINE-CONFLICT-RESOLUTION] No resolution found - conflict too severe`);
        return null;
    }

    /**
     * Save schedule results to Supabase
     * @param {Object} scheduleResults - Schedule results to save
     */
    async saveScheduleResultsToSupabase(scheduleResults) {
        try {
            if (!window.supabase) {
                console.warn('Supabase not available, skipping schedule results save');
                return;
            }

            // Get current user
            const { data: { user }, error: userError } = await window.supabase.auth.getUser();
            if (userError || !user) {
                console.warn('No authenticated user, skipping schedule results save');
                return;
            }

            // Prepare schedule results data
            const scheduleData = {
                user_id: user.id,
                schedule_data: JSON.stringify(scheduleResults),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // Save to Supabase
            const { data, error } = await window.supabase
                .from('schedule_outputs')
                .upsert(scheduleData);

            if (error) {
                console.error('Failed to save schedule results to Supabase:', error);
            } else {
                console.log('✅ Schedule results saved to Supabase successfully');
            }
        } catch (error) {
            console.error('Error saving schedule results to Supabase:', error);
        }
    }

    /**
     * Get machine schedule
     * @param {string} machine - Machine name
     * @returns {Array} Machine schedule
     */
    getMachineSchedule(machine) {
        return this.machineSchedule[machine] || [];
    }

    /**
     * Get operator schedule
     * @param {string} operator - Operator name
     * @returns {Array} Operator schedule
     */
    getOperatorSchedule(operator) {
        return this.operatorSchedule[operator] || [];
    }

    /**
     * Clear schedule results from both local storage and Supabase
     */
    async clearScheduleResults() {
        try {
            // Clear local storage
            window.scheduleResults = { rows: [], alerts: [], summary: {} };
            
            // Clear from Supabase
            if (window.supabase) {
                const { data: { user }, error: userError } = await window.supabase.auth.getUser();
                if (!userError && user) {
                    const { error } = await window.supabase
                        .from('schedule_outputs')
                        .delete()
                        .eq('user_id', user.id);
                    
                    if (error) {
                        console.error('Error clearing schedule results from Supabase:', error);
                    } else {
                        console.log('✅ Schedule results cleared from Supabase');
                    }
                }
            }
            
            // Update display
            if (typeof window.displayResults === 'function') {
                window.displayResults();
            }
            
            console.log('✅ Schedule results cleared successfully');
        } catch (error) {
            console.error('Error clearing schedule results:', error);
        }
    }
}

/**
 * Main scheduling function using modular components
 * @param {Array} ordersData - Array of order data
 * @param {Object} globalSettings - Global settings object
 * @returns {Object} Scheduling result with rows and alerts
 */
function runSchedulingModular(ordersData, globalSettings = {}) {
    try {
        Logger.log("=== Starting Modular Scheduling Engine ===");
        
        const engine = new ModularSchedulingEngine();
        engine.setGlobalSettings(globalSettings);
        
        const allResults = [];
        const alerts = [];
        
        // CRITICAL: Sort by Earliest Due Date (EDD) first, then Priority
        const sortedOrders = [...ordersData].sort((a, b) => {
            const dueDateA = new Date(a.dueDate);
            const dueDateB = new Date(b.dueDate);
            
            // Primary: Earliest Due Date (EDD)
            if (dueDateA.getTime() !== dueDateB.getTime()) {
                return dueDateA.getTime() - dueDateB.getTime();
            }
            
            // Secondary: Priority
            const priorityWeight = { Urgent: 4, High: 3, Normal: 2, Low: 1 };
            if (priorityWeight[a.priority] !== priorityWeight[b.priority]) {
                return priorityWeight[b.priority] - priorityWeight[a.priority];
            }
            
            return 0;
        });
        
        Logger.log(`[EDD-PRIORITY] Orders sorted by due date: ${sortedOrders.map(o => `${o.partNumber} (due: ${o.dueDate})`).join(', ')}`);
        
        // Process each order
        sortedOrders.forEach((order, orderIndex) => {
            try {
                Logger.log(`Processing order ${orderIndex + 1}: ${order.partNumber}`);
                
                const orderResult = engine.scheduleOrder(order, alerts);
                
                if (orderResult && orderResult.length > 0) {
                    allResults.push(...orderResult);
                    Logger.log(`✅ Order ${order.partNumber} scheduled successfully: ${orderResult.length} operations`);
                } else {
                    Logger.log(`⚠️ Order ${order.partNumber} could not be scheduled`);
                    alerts.push(`⚠️ Order ${order.partNumber} could not be scheduled - check machine availability`);
                }
            } catch (error) {
                Logger.error(`❌ Error processing order ${order.partNumber}: ${error.message}`);
                alerts.push(`❌ Error processing order ${order.partNumber}: ${error.message}`);
            }
        });
        
        Logger.log(`[FINAL-VALIDATION] Generated ${allResults.length} schedule rows`);
        
        return {
            rows: allResults,
            alerts: alerts,
            summary: {
                totalOrders: ordersData.length,
                totalOperations: allResults.length,
                successRate: (allResults.length / ordersData.length) * 100
            }
        };
        
    } catch (error) {
        Logger.error(`❌ Critical error in modular scheduling engine: ${error.message}`);
        return {
            rows: [],
            alerts: [`❌ Critical scheduling error: ${error.message}`],
            error: error.message
        };
    }
}

// Export to window for global access
if (typeof window !== 'undefined') {
    window.ModularSchedulingEngine = ModularSchedulingEngine;
    window.runSchedulingModular = runSchedulingModular;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ModularSchedulingEngine, runSchedulingModular };
}

// COMPATIBILITY LAYER - Map old function name to new modular function
if (typeof window !== 'undefined') {
    // Create compatibility function that calls the modular version
    window.runScheduling = function(ordersData, globalSettings = {}) {
        console.log('🔄 Using modular scheduling engine via compatibility layer');
        return runSchedulingModular(ordersData, globalSettings);
    };
    
    // Also expose the original FixedUnifiedSchedulingEngine for compatibility
    window.FixedUnifiedSchedulingEngine = ModularSchedulingEngine;
    
    console.log('✅ Modular scheduling engine compatibility layer loaded');
    console.log('✅ window.runScheduling function available');
    console.log('✅ window.FixedUnifiedSchedulingEngine class available');
}

// ADDITIONAL COMPATIBILITY - Map runSchedule to runScheduling
if (typeof window !== 'undefined') {
    // Create runSchedule function that calls runScheduling
    window.runSchedule = async function() {
        console.log('🔄 runSchedule() called - redirecting to modular system');
        
        // Get saved orders from the global scope
        if (typeof savedOrders !== 'undefined' && savedOrders.length > 0) {
            console.log(`📋 Processing ${savedOrders.length} orders with modular system`);
            
            // Convert saved orders to the format expected by runScheduling
            const ordersData = savedOrders.map(order => ({
                partNumber: order.partNumber,
                quantity: order.quantity,
                priority: order.priority,
                dueDate: order.dueDate,
                batchMode: order.batchMode || 'auto-split',
                customBatchSize: order.customBatchSize,
                operations: order.filteredOperations || [],
                breakdownMachine: order.breakdownMachine,
                breakdownDateTime: order.breakdownDateTime,
                startDateTime: order.startDateTime,
                holidayRange: order.holidayRange,
                setupWindow: order.setupWindow
            }));
            
            // Get global settings
            const globalSettings = window.advancedSettings || {};
            
            // Call the modular scheduling function
            const result = window.runScheduling(ordersData, globalSettings);
            
            // Update global scheduleResults
            window.scheduleResults = result;
            if (typeof scheduleResults !== 'undefined') {
                scheduleResults = result;
            }
            
            console.log('🔍 Updated global scheduleResults:', window.scheduleResults);
            
            // Save schedule results to Supabase
            try {
                // Create a temporary modular engine instance for Supabase save
                const tempEngine = new ModularSchedulingEngine();
                await tempEngine.saveScheduleResultsToSupabase(result);
            } catch (error) {
                console.error('Error saving schedule results to Supabase:', error);
                // Continue execution even if Supabase save fails
            }
            
            // Display results
            if (typeof displayResults === 'function') {
                displayResults();
            }
            
            console.log('✅ Schedule completed with modular system');
            return result;
        } else {
            console.warn('⚠️ No saved orders found');
            alert('Please add at least one order before running the schedule');
            return null;
        }
    };
    
    console.log('✅ window.runSchedule function available');
}

// ESSENTIAL UI FUNCTIONS FOR COMPATIBILITY
if (typeof window !== 'undefined') {
    
    // Display results function
    window.displayResults = function() {
        console.log('🔄 displayResults() called');
        
        const resultsCard = document.getElementById('resultsCard');
        const alertsContainer = document.getElementById('scheduleAlerts');
        const tbody = document.getElementById('resultsTableBody');

        if (!resultsCard || !tbody) {
            console.error('❌ Results display elements not found');
            return;
        }

        // Get scheduleResults from global scope
        const scheduleResults = window.scheduleResults || { rows: [], alerts: [] };
        console.log('🔍 scheduleResults from global scope:', scheduleResults);

        // Display alerts if any
        if (scheduleResults && scheduleResults.alerts && scheduleResults.alerts.length > 0) {
            if (alertsContainer) {
                alertsContainer.innerHTML = scheduleResults.alerts.map(alert => 
                    `<div class="alert alert-error">${alert}</div>`
                ).join('');
            }
        } else if (alertsContainer) {
            alertsContainer.innerHTML = '';
        }

        // Display results table
        if (scheduleResults && scheduleResults.rows && scheduleResults.rows.length > 0) {
            tbody.innerHTML = scheduleResults.rows.map(row => {
                // Determine status based on due date comparison
                let status = '✅';
                let statusClass = 'status-success';
                
                if (row.DueDate && row.DueDate !== 'No Due Date' && row.DueDate !== '2026-01-01 ⚠️') {
                    const dueDate = new Date(row.DueDate);
                    const runEnd = new Date(row.RunEnd);
                    
                    if (runEnd > dueDate) {
                        status = '❌';
                        statusClass = 'status-danger';
                    } else if (runEnd.getTime() - dueDate.getTime() < 24 * 60 * 60 * 1000) {
                        status = '⚠️';
                        statusClass = 'status-warning';
                    }
                } else if (row.DueDate === '2026-01-01 ⚠️') {
                    status = '⚠️';
                    statusClass = 'status-warning';
                }
                
                // Determine priority class
                const priorityClass = `priority-${row.Priority ? row.Priority.toLowerCase() : 'normal'}`;
                
                return `
                    <tr class="${priorityClass}">
                    <td>${row.PartNumber}</td>
                    <td>${row.Order_Quantity}</td>
                        <td>${row.Priority || 'Normal'}</td>
                    <td>${row.Batch_ID}</td>
                    <td>${row.Batch_Qty}</td>
                    <td>${row.OperationSeq}</td>
                    <td>${row.OperationName}</td>
                    <td>${row.Machine}</td>
                    <td>${row.Person}</td>
                    <td class="nowrap">${row.SetupStart}</td>
                    <td class="nowrap">${row.SetupEnd}</td>
                    <td class="nowrap">${row.RunStart}</td>
                    <td class="nowrap">${row.RunEnd}</td>
                    <td class="nowrap">${row.Timing}</td>
                    <td class="nowrap">${row.DueDate}</td>
                        <td class="${statusClass}">${status}</td>
                </tr>
                `;
            }).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="16" style="text-align: center; color: #888;">No results to display</td></tr>';
        }

        resultsCard.style.display = 'block';
        resultsCard.scrollIntoView({ behavior: 'smooth' });
        
        console.log('✅ Results displayed successfully');
    };
    
    // Show alert function
    window.showAlert = function(message, type) {
        console.log(`📢 Alert (${type}): ${message}`);
        
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.textContent = message;
        
        const container = document.querySelector('.container');
        if (container) {
            container.insertBefore(alertDiv, container.querySelector('.card'));
            
            setTimeout(() => {
                alertDiv.remove();
            }, 5000);
        }
    };
    
    console.log('✅ Essential UI functions added to modular system');
}
// Updated Sat Sep 13 03:01:36 IST 2025 - force refresh

// DEBUG LOGGING FOR TROUBLESHOOTING
if (typeof window !== 'undefined') {
    window.debugModularSystem = function() {
        console.log('🔍 DEBUG: Modular System Status');
        console.log('• MachineSelector available:', typeof MachineSelector !== 'undefined');
        console.log('• BatchProcessor available:', typeof BatchProcessor !== 'undefined');
        console.log('• OperatorManager available:', typeof OperatorManager !== 'undefined');
        console.log('• TimingCalculator available:', typeof TimingCalculator !== 'undefined');
        console.log('• ModularSchedulingEngine available:', typeof ModularSchedulingEngine !== 'undefined');
        console.log('• runScheduling available:', typeof window.runScheduling !== 'undefined');
        console.log('• runSchedule available:', typeof window.runSchedule !== 'undefined');
        
        // Test machine selector
        try {
            const testSelector = new MachineSelector();
            console.log('✅ MachineSelector instantiation test: PASSED');
        } catch (error) {
            console.error('❌ MachineSelector instantiation test: FAILED', error);
        }
    };
    
    console.log('✅ Debug function available: window.debugModularSystem()');
    
    // Additional debug function for data flow
    window.debugDataFlow = function() {
        console.log('🔍 DEBUG: Data Flow Status');
        console.log('• window.savedOrders:', window.savedOrders);
        console.log('• window.scheduleResults:', window.scheduleResults);
        console.log('• savedOrders length:', window.savedOrders ? window.savedOrders.length : 'undefined');
        console.log('• scheduleResults rows:', window.scheduleResults ? window.scheduleResults.rows?.length : 'undefined');
        console.log('• displayResults function:', typeof displayResults);
        console.log('• updateOrdersTable function:', typeof updateOrdersTable);
    };
    
    console.log('✅ Debug data flow function available: window.debugDataFlow()');
    
    // Add clear function for schedule results
    window.clearScheduleResults = async function() {
        try {
            // Clear local storage
            window.scheduleResults = { rows: [], alerts: [], summary: {} };
            
            // Clear from Supabase
            if (window.supabase) {
                const { data: { user }, error: userError } = await window.supabase.auth.getUser();
                if (!userError && user) {
                    const { error } = await window.supabase
                        .from('schedule_outputs')
                        .delete()
                        .eq('user_id', user.id);
                    
                    if (error) {
                        console.error('Error clearing schedule results from Supabase:', error);
                    } else {
                        console.log('✅ Schedule results cleared from Supabase');
                    }
                }
            }
            
            // Update display
            if (typeof window.displayResults === 'function') {
                window.displayResults();
            }
            
            console.log('✅ Schedule results cleared successfully');
        } catch (error) {
            console.error('Error clearing schedule results:', error);
        }
    };
    
    console.log('✅ Clear schedule results function available: window.clearScheduleResults()');
}
