/**
 * Batch Processing Module
 * Handles batch splitting logic and batch-related calculations
 */

class BatchProcessor {
    /**
     * Calculate batch splitting based on total quantity and minimum batch size
     * @param {number} totalQuantity - Total quantity to split
     * @param {number} minBatchSize - Minimum batch size
     * @param {string} priority - Priority level (normal, high, urgent)
     * @param {Date} dueDate - Due date for the order
     * @param {Date} startDate - Start date for the order
     * @param {string} batchMode - Batch mode (single-batch, custom-batch-size, auto-split)
     * @param {number} customBatchSize - Custom batch size for custom mode
     * @param {Array} operations - Operations array for dependency consideration
     * @returns {Array} Array of batch objects with batchId and quantity
     */
    calculateBatchSplitting(totalQuantity, minBatchSize, priority = 'normal', dueDate = null, startDate = null, batchMode = 'auto-split', customBatchSize = null, operations = []) {
        Logger.log(`[BATCH-CALC] Calculating batch splitting: ${totalQuantity} pieces, batch mode: ${batchMode}, custom size: ${customBatchSize}`);
        
        // CRITICAL FIX: Consider operation dependencies for optimal batch sizing
        let effectiveMinBatchSize = minBatchSize;
        if (operations && operations.length > 0) {
            // Consider the bottleneck operation (slowest cycle time) for batch sizing
            const bottleneckOp = operations.reduce((slowest, op) => 
                (op.CycleTime_Min || 0) > (slowest.CycleTime_Min || 0) ? op : slowest
            );
            
            // Adjust minimum batch size based on bottleneck operation
            if (bottleneckOp.CycleTime_Min > 10) {
                effectiveMinBatchSize = Math.max(minBatchSize, 50); // Larger batches for slow operations
                Logger.log(`[BATCH-CALC] Bottleneck operation ${bottleneckOp.OperationSeq} (${bottleneckOp.CycleTime_Min}min), using larger batch size: ${effectiveMinBatchSize}`);
            }
        }
        
        let batches = [];
        
        // Handle different batch modes
        switch (batchMode) {
            case 'single-batch':
                // Single Batch: No splitting (qty stays as-is)
                batches.push({
                    batchId: 'B01',
                    quantity: totalQuantity,
                    batchIndex: 0
                });
                Logger.log(`[BATCH-CALC] Single batch mode: ${totalQuantity} pieces`);
                break;
                
            case 'custom-batch-size':
                // Custom: Use user-defined batch size
                const userBatchSize = parseInt(customBatchSize) || 300;
                let remainingQuantity = totalQuantity;
                let batchIndex = 0;
                
                while (remainingQuantity > 0) {
                    batchIndex++;
                    const batchId = `B${String(batchIndex).padStart(2, '0')}`;
                    const batchQuantity = Math.min(userBatchSize, remainingQuantity);
                    
                    batches.push({
                        batchId: batchId,
                        quantity: batchQuantity,
                        batchIndex: batchIndex - 1
                    });
                    
                    remainingQuantity -= batchQuantity;
                    Logger.log(`[BATCH-CALC] Custom batch ${batchId}: ${batchQuantity} pieces (remaining: ${remainingQuantity})`);
                }
                break;
                
            case 'auto-split':
            default:
                // Auto Split: Use quantity-based balanced splitting rules
                const isHighPriority = priority === 'High' || priority === 'Urgent';
                
                if (totalQuantity <= 250) {
                    // Rule 1: Quantity ≤ 250 → Single Batch
                    batches.push({
                        batchId: 'B01',
                        quantity: totalQuantity,
                        batchIndex: 0
                    });
                    Logger.log(`[BATCH-CALC] Auto-split Rule 1 (≤250): Single batch ${totalQuantity} pieces`);
                    
                } else if (totalQuantity <= 500) {
                    // Rule 2: Quantity 251-500 → Split into two nearly equal halves
                    const half1 = Math.ceil(totalQuantity / 2);
                    const half2 = totalQuantity - half1;
                    
                    batches.push({
                        batchId: 'B01',
                        quantity: half1,
                        batchIndex: 0
                    });
                    batches.push({
                        batchId: 'B02',
                        quantity: half2,
                        batchIndex: 1
                    });
                    Logger.log(`[BATCH-CALC] Auto-split Rule 2 (251-500): ${half1} + ${half2} pieces`);
                    
                } else if (totalQuantity <= 1000) {
                    // Rule 3: Quantity 501-1000 → Split into 2 or 3 balanced batches
                    let numBatches;
                    if (isHighPriority) {
                        // High priority: prefer 3 batches for more parallelism
                        numBatches = 3;
                    } else {
                        // Normal/Low priority: prefer 2 batches unless better divisibility with 3
                        const remainder2 = totalQuantity % 2;
                        const remainder3 = totalQuantity % 3;
                        numBatches = (remainder3 < remainder2) ? 3 : 2;
                    }
                    
                    const baseSize = Math.floor(totalQuantity / numBatches);
                    const remainder = totalQuantity % numBatches;
                    
                    for (let i = 0; i < numBatches; i++) {
                        const batchQuantity = baseSize + (i < remainder ? 1 : 0);
                        batches.push({
                            batchId: `B${String(i + 1).padStart(2, '0')}`,
                            quantity: batchQuantity,
                            batchIndex: i
                        });
                    }
                    Logger.log(`[BATCH-CALC] Auto-split Rule 3 (501-1000): ${numBatches} batches, priority: ${priority}`);
                    
                } else {
                    // Rule 4: Quantity > 1000 → Split into balanced chunks (≈500 each)
                    let numBatches;
                    if (isHighPriority) {
                        // High priority: more smaller batches for parallelism
                        numBatches = Math.ceil(totalQuantity / 334); // ≈334 per batch
                    } else {
                        // Normal/Low priority: fewer larger batches (≈500 each)
                        numBatches = Math.ceil(totalQuantity / 500);
                    }
                    
                    const baseSize = Math.floor(totalQuantity / numBatches);
                    const remainder = totalQuantity % numBatches;
                    
                    for (let i = 0; i < numBatches; i++) {
                        const batchQuantity = baseSize + (i < remainder ? 1 : 0);
                        batches.push({
                            batchId: `B${String(i + 1).padStart(2, '0')}`,
                            quantity: batchQuantity,
                            batchIndex: i
                        });
                    }
                    Logger.log(`[BATCH-CALC] Auto-split Rule 4 (>1000): ${numBatches} batches, priority: ${priority}`);
                }
                break;
        }
        
        Logger.log(`[BATCH-CALC] Final result: ${batches.length} batches created using ${batchMode} mode`);
        batches.forEach((batch, index) => {
            Logger.log(`[BATCH-CALC] Batch ${index + 1}: ${batch.batchId} (${batch.quantity} pieces)`);
        });
        
        return batches;
    }

    /**
     * Calculate optimal batch size based on order characteristics
     * @param {Object} orderData - Order data object
     * @returns {number} Optimal batch size
     */
    calculateOptimalBatchSize(orderData) {
        const quantity = orderData.quantity || 0;
        const priority = orderData.priority || 'normal';
        const dueDate = orderData.dueDate ? new Date(orderData.dueDate) : null;
        
        // Calculate days until due date
        let daysUntilDue = 7; // Default
        if (dueDate) {
            const today = new Date();
            daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        }
        
        // Adjust batch size based on urgency
        let baseBatchSize = 500;
        if (priority === 'Urgent' || daysUntilDue <= 2) {
            baseBatchSize = 250; // Smaller batches for urgent orders
        } else if (priority === 'High' || daysUntilDue <= 4) {
            baseBatchSize = 350; // Medium batches for high priority
        }
        
        return Math.min(baseBatchSize, quantity);
    }

    /**
     * Validate batch configuration
     * @param {Array} batches - Array of batch objects
     * @param {number} totalQuantity - Expected total quantity
     * @returns {Object} Validation result
     */
    validateBatches(batches, totalQuantity) {
        const validation = {
            isValid: true,
            errors: [],
            warnings: []
        };
        
        // Check if batches exist
        if (!batches || batches.length === 0) {
            validation.isValid = false;
            validation.errors.push('No batches created');
            return validation;
        }
        
        // Check total quantity
        const actualTotal = batches.reduce((sum, batch) => sum + batch.quantity, 0);
        if (actualTotal !== totalQuantity) {
            validation.isValid = false;
            validation.errors.push(`Quantity mismatch: expected ${totalQuantity}, got ${actualTotal}`);
        }
        
        // Check for empty batches
        const emptyBatches = batches.filter(batch => batch.quantity <= 0);
        if (emptyBatches.length > 0) {
            validation.isValid = false;
            validation.errors.push(`Empty batches found: ${emptyBatches.map(b => b.batchId).join(', ')}`);
        }
        
        // Check batch IDs are unique
        const batchIds = batches.map(batch => batch.batchId);
        const uniqueIds = [...new Set(batchIds)];
        if (batchIds.length !== uniqueIds.length) {
            validation.isValid = false;
            validation.errors.push('Duplicate batch IDs found');
        }
        
        return validation;
    }
}

// Export to window for global access
if (typeof window !== 'undefined') {
    window.BatchProcessor = BatchProcessor;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BatchProcessor };
}
