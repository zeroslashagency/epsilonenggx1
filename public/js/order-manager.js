/**
 * Order Management Module
 * Handles order creation, updating, deletion, and table management
 * Extracted from index.html
 */

// Global variables for order management
let savedOrders = [];
let editingOrderId = null;

// Make variables available globally
window.savedOrders = savedOrders;

/**
 * Update priority background color
 */
function updatePriorityBackground(container, priorityType) {
    if (!container) return;
    
    // Remove all existing priority classes
    container.className = 'order-section-priority-bg';
    
    // Add the new priority class and active state immediately
    container.classList.add(priorityType, 'active');
    
    // Force immediate visibility - always visible
    container.style.opacity = '0.3';
    container.style.visibility = 'visible';
    container.style.display = 'block';
    container.style.zIndex = '0';
    
    // Force a reflow to ensure styles are applied
    container.offsetHeight;
}

/**
 * Add a new order
 */
async function addOrder() {
    // Prevent double submission
    if (window.isSubmittingOrder) {
        console.log('Order submission already in progress, ignoring duplicate');
        return;
    }
    window.isSubmittingOrder = true;
    
    try {
        // Validate mandatory fields
        if (!window.selectedPartNumber) {
            alert('Please select a part number');
            return;
        }

    const quantity = parseInt(document.getElementById('orderQuantity').value);
    console.log('Order quantity value:', document.getElementById('orderQuantity').value);
    console.log('Parsed quantity:', quantity);
    
    if (!quantity || quantity <= 0 || isNaN(quantity)) {
        alert('Please enter a valid order quantity (must be a number greater than 0)');
        return;
    }

    const priorityElement = document.querySelector('input[name="priority"]:checked');
    if (!priorityElement) {
        alert('Please select a priority');
        return;
    }

    const dueDate = document.getElementById('dueDate').value;
    // Due date is now optional - no validation required

    // Ensure latest checkbox selections are captured even if OK wasn't clicked
    let operationSeq = document.getElementById('operationSeq').value;
    try {
        // If the dropdown exists, derive from its current checkbox state
        if (document.getElementById('operationDropdown')) {
            operationSeq = deriveOperationSeqFromCheckboxes();
        }
    } catch (e) {
        console.warn('Failed deriving operation sequence from checkboxes, using hidden value:', e);
    }
    
    // Debug: Check what operation sequence value we're getting
    console.log('Order submission - operationSeq value:', operationSeq);
    console.log('Order submission - operationSeqDisplay value:', document.getElementById('operationSeqDisplay').value);
    
    // Filter operations based on selection
    const filteredOperations = getFilteredOperations(window.selectedPartNumber, operationSeq);
    if (filteredOperations.length === 0) {
        alert('No operations found for the selected criteria. Please check your operation selection.');
        return;
    }
    
    console.log('Order submission - Final filtered operations:', filteredOperations.map(op => `Op ${op.OperationSeq}: ${op.OperationName}`));

    // Capture batch mode
    const batchModeElement = document.querySelector('input[name="batchMode"]:checked');
    const batchMode = batchModeElement ? batchModeElement.value : 'auto-split';
    
    // Capture custom batch size if in custom mode
    const customBatchSize = batchMode === 'custom-batch-size' ? 
        document.getElementById('customBatchSize').value : null;

    // Capture optional overrides
    const order = {
        id: editingOrderId !== null ? editingOrderId : Date.now(),
        partNumber: window.selectedPartNumber,
        operationSeq: operationSeq || null,
        filteredOperations: filteredOperations, // Store filtered operations
        quantity: quantity,
        priority: priorityElement.value,
        dueDate: dueDate || null, // Store null if empty
        batchMode: batchMode,
        customBatchSize: customBatchSize,
        // Optional overrides (null if blank, will use global settings)
        breakdownMachine: document.getElementById('orderBreakdownMachine').value || null,
        breakdownDateTime: buildBreakdownRangeString(),
        startDateTime: document.getElementById('orderStartDateTime').value || null,
        holidayRange: buildHolidayRangeString(),
        setupWindow: document.getElementById('orderSetupWindow').value || null
    };

    if (editingOrderId !== null) {
        // Update existing order
        const idx = savedOrders.findIndex(o => o.id === editingOrderId);
        if (idx !== -1) savedOrders[idx] = order; else savedOrders.push(order);
        updateOrdersTable();
        exitEditMode();
        showAlert('Order updated successfully! Click "Run Schedule" to generate results.', 'success');
        
        // Save to Supabase
        await saveOrderToSupabase(order);
    } else {
        // Create new order
        savedOrders.push(order);
        updateOrdersTable();
        resetForm();
        showAlert('Order added successfully!', 'success');
        
        // Save to Supabase
        await saveOrderToSupabase(order);
    }
    
    } catch (error) {
        console.error('Error adding order:', error);
        showAlert('Error adding order: ' + error.message, 'error');
    } finally {
        // Reset submission flag
        window.isSubmittingOrder = false;
    }
}

/**
 * Save order to Supabase database
 */
async function saveOrderToSupabase(order) {
    try {
        if (!window.supabase) {
            console.warn('Supabase not available, skipping database save');
            return;
        }

        // Get current user
        const { data: { user }, error: userError } = await window.supabase.auth.getUser();
        if (userError || !user) {
            console.warn('No authenticated user, skipping database save');
            return;
        }

        // Prepare order data for Supabase
        const orderData = {
            id: order.id,
            user_id: user.id,
            part_number: order.partNumber,
            // Note: operation_seq column may not exist in database schema
            // operation_seq: order.operationSeq,
            quantity: order.quantity,
            priority: order.priority,
            // Note: due_date and filtered_operations columns may not exist in database schema
            // due_date: order.dueDate || null,
            // filtered_operations: JSON.stringify(order.filteredOperations),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // Save to Supabase
        const { data, error } = await window.supabase
            .from('saved_orders')
            .upsert(orderData);

        if (error) {
            console.error('Failed to save order to Supabase:', error);
            
            // Check if it's a schema error (missing column)
            if (error.code === 'PGRST204' && error.message.includes('due_date')) {
                console.error('Database schema error: due_date column missing from saved_orders table');
                showAlert('Database schema error: Please contact administrator to fix missing due_date column', 'error');
            } else {
                showAlert('Warning: Order saved locally but failed to sync with database', 'warning');
            }
        } else {
            console.log('✅ Order saved to Supabase successfully:', data);
        }
    } catch (error) {
        console.error('Error saving order to Supabase:', error);
        showAlert('Warning: Order saved locally but failed to sync with database', 'warning');
    }
}

/**
 * Update an existing order
 */
function updateOrder() {
    addOrder(); // Reuse addOrder logic for updates
}

/**
 * Delete an order
 */
function deleteOrder(orderId) {
    if (confirm('Are you sure you want to delete this order?')) {
        savedOrders = savedOrders.filter(order => order.id !== orderId);
        updateOrdersTable();
        showAlert('Order deleted successfully!', 'success');
    }
}

/**
 * Clear all saved orders
 */
function clearAllSavedOrders() {
    if (confirm('Are you sure you want to clear all saved orders? This action cannot be undone.')) {
        savedOrders = [];
        updateOrdersTable();
        showAlert('All orders cleared successfully!', 'success');
    }
}

/**
 * Clear invalid orders (orders with Unknown part number or 0 quantity)
 */
async function clearInvalidOrders() {
    const invalidOrders = savedOrders.filter(order => 
        order.partNumber === 'Unknown' || order.quantity <= 0
    );
    
    if (invalidOrders.length === 0) {
        alert('No invalid orders found.');
        return;
    }
    
    if (confirm(`Found ${invalidOrders.length} invalid orders. Do you want to delete them?`)) {
        try {
            // Delete from Supabase
            if (window.supabase) {
                for (const order of invalidOrders) {
                    const { error } = await window.supabase
                        .from('saved_orders')
                        .delete()
                        .eq('id', order.id);
                    
                    if (error) {
                        console.error(`Error deleting invalid order ${order.id}:`, error);
                    }
                }
            }
            
            // Remove from local array
            savedOrders = savedOrders.filter(order => 
                order.partNumber !== 'Unknown' && order.quantity > 0
            );
            window.savedOrders = savedOrders;
            updateOrdersTable();
            
            alert(`Cleared ${invalidOrders.length} invalid orders successfully.`);
        } catch (error) {
            console.error('Error clearing invalid orders:', error);
            alert('Error clearing invalid orders: ' + error.message);
        }
    }
}

/**
 * Update the orders table display
 */
function updateOrdersTable() {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;

    if (savedOrders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12" class="empty-state">No orders added yet</td></tr>';
        return;
    }

    tbody.innerHTML = savedOrders.map(order => {
        // Add null checks to prevent undefined values
        const partNumber = order.partNumber || 'Unknown';
        const operationSeq = order.operationSeq || 'All';
        const quantity = order.quantity || 0;
        const priority = order.priority || 'Normal';
        const dueDate = order.dueDate || 'Not set';
        const batchMode = order.batchMode || 'auto-split';
        const breakdownMachine = order.breakdownMachine || 'None';
        const breakdownDateTime = order.breakdownDateTime || 'None';
        const startDateTime = order.startDateTime || 'Use Global';
        const holidayRange = order.holidayRange || 'None';
        const setupWindow = order.setupWindow || 'Use Global';
        
        const breakdownInfo = breakdownDateTime !== 'None' ? 
            `${breakdownMachine}: ${breakdownDateTime}` : 
            'None';

        return `
            <tr class="priority-${priority.toLowerCase()}">
                <td>${partNumber}</td>
                <td>${operationSeq}</td>
                <td>${quantity}</td>
                <td><span class="priority-${priority.toLowerCase()}">${priority}</span></td>
                <td>${dueDate}</td>
                <td>${batchMode}</td>
                <td>${breakdownMachine}</td>
                <td>${breakdownDateTime}</td>
                <td>${startDateTime}</td>
                <td>${holidayRange}</td>
                <td>${setupWindow}</td>
                <td>
                    <button class="btn btn-danger" onclick="deleteOrder(${order.id})">Delete</button>
                    <button class="btn btn-primary" onclick="editOrder(${order.id})">Edit</button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Edit an existing order
 */
function editOrder(orderId) {
    const order = savedOrders.find(o => o.id === orderId);
    if (!order) return;

    // Set form values
    document.getElementById('partNumber').value = order.partNumber;
        window.selectedPartNumber = order.partNumber;
    
    // Populate operation sequences
    populateOperationSequences(order.partNumber);
    
    // Set operation sequence
    if (order.operationSeq) {
        document.getElementById('operationSeq').value = order.operationSeq;
        // Update display
        const operations = (window.OP_MASTER || []).filter(op => 
            String(op.PartNumber).trim() === order.partNumber && 
            op.OperationSeq == order.operationSeq
        );
        
        if (operations.length > 0) {
            const firstOp = operations[0];
            document.getElementById('operationSeqDisplay').value = `Seq ${order.operationSeq}: ${firstOp.OperationName} (${firstOp.Machine})`;
        }
    }

    // Set priority
    const priorityRadio = document.getElementById(`priority${order.priority}`);
    if (priorityRadio) {
        priorityRadio.checked = true;
        
        // Update priority background
        const priorityBg = document.getElementById('orderSectionPriorityBg');
        if (priorityBg) {
            updatePriorityBackground(priorityBg, order.priority.toLowerCase());
        }
    }

    // Set quantity
    document.getElementById('orderQuantity').value = order.quantity;

    // Set due date
    if (order.dueDate) {
        document.getElementById('dueDate').value = order.dueDate;
    }

    // Set batch mode
    const batchOptions = document.querySelectorAll('.three-way-toggle .toggle-option');
    batchOptions.forEach(opt => opt.classList.remove('active'));
    const selectedBatchMode = document.querySelector(`.three-way-toggle .toggle-option[data-mode="${order.batchMode}"]`);
    if (selectedBatchMode) {
        selectedBatchMode.classList.add('active');
    }

    // Set custom batch size if applicable
    if (order.batchMode === 'custom-batch-size' && order.customBatchSize) {
        document.getElementById('customBatchSize').value = order.customBatchSize;
        document.getElementById('customBatchSizeContainer').style.display = 'block';
    }

    // Set optional overrides
    if (order.breakdownMachine) {
        document.getElementById('orderBreakdownMachine').value = order.breakdownMachine;
    }
    
    if (order.startDateTime) {
        document.getElementById('orderStartDateTime').value = order.startDateTime;
    }
    
    if (order.setupWindow) {
        document.getElementById('orderSetupWindow').value = order.setupWindow;
    }

    // Set editing mode
    editingOrderId = orderId;
    
    // Update form buttons
    document.getElementById('orderSubmitBtn').style.display = 'none';
    document.getElementById('editOrderBtn').style.display = 'inline-flex';
    document.getElementById('cancelEditBtn').style.display = 'inline-flex';

    // Scroll to form
    document.getElementById('orderForm').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Exit edit mode
 */
function exitEditMode() {
    editingOrderId = null;
    
    // Update form buttons
    document.getElementById('orderSubmitBtn').style.display = 'inline-flex';
    document.getElementById('editOrderBtn').style.display = 'none';
    document.getElementById('cancelEditBtn').style.display = 'none';
    
    // Clear form
    clearForm();
}

/**
 * Cancel edit mode
 */
function cancelEdit() {
    exitEditMode();
}

/**
 * Reset form to default state
 */
function resetForm() {
    clearForm();
}

/**
 * Get filtered operations for a part and operation sequence
 */
function getFilteredOperations(partNumber, operationSeq) {
    // Use test data if available, otherwise use database data
    const dataSource = isUsingTestData ? testUserData : window.OP_MASTER;
    
    // Get all operations for this part number from data source
    const allOperations = dataSource.filter(op => {
        const partNum = op.PartNumber || op.partnumber;
        return partNum === partNumber;
    });
    
    console.log(`Found ${allOperations.length} total operations for ${partNumber}:`, 
        allOperations.map(op => `Op ${op.OperationSeq}: ${op.OperationName}`));
    
    // If no operation sequence specified, return all operations
    if (!operationSeq || operationSeq === '') {
        console.log('No operation sequence specified, returning all operations');
        return allOperations;
    }
    
    // Filter by operation sequence(s)
    let filteredOps;
    if (operationSeq.includes(',')) {
        // Multiple sequences selected (comma-separated)
        const selectedSequences = operationSeq.split(',').map(seq => parseInt(seq.trim()));
        filteredOps = allOperations.filter(op => selectedSequences.includes(op.OperationSeq));
        console.log(`Filtered to ${filteredOps.length} operations for sequences ${operationSeq}:`, 
            filteredOps.map(op => `Op ${op.OperationSeq}: ${op.OperationName}`));
    } else {
        // Single sequence selected
        filteredOps = allOperations.filter(op => op.OperationSeq == operationSeq);
        console.log(`Filtered to ${filteredOps.length} operations for sequence ${operationSeq}:`, 
            filteredOps.map(op => `Op ${op.OperationSeq}: ${op.OperationName}`));
    }
    
    return filteredOps;
}

/**
 * Build breakdown range string from form inputs
 */
function buildBreakdownRangeString() {
    const start = document.getElementById('orderBreakdownStart').value;
    const end = document.getElementById('orderBreakdownEnd').value;
    
    if (start && end) {
        return `${start} to ${end}`;
    }
    return null;
}

/**
 * Build holiday range string from form inputs
 */
function buildHolidayRangeString() {
    const start = document.getElementById('orderHolidayStart').value;
    const end = document.getElementById('orderHolidayEnd').value;
    
    if (start && end) {
        return `${start} to ${end}`;
    }
    return null;
}

/**
 * Show alert message
 */
function showAlert(message, type = 'info') {
    // Create alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
    // Insert at top of container
    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(alertDiv, container.firstChild);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 5000);
    }
}

// Make functions available globally
window.addOrder = addOrder;
window.updateOrder = updateOrder;
window.deleteOrder = deleteOrder;
window.clearAllSavedOrders = clearAllSavedOrders;
window.clearInvalidOrders = clearInvalidOrders;
window.editOrder = editOrder;
window.resetForm = resetForm;
window.updateOrdersTable = updateOrdersTable;
window.saveOrderToSupabase = saveOrderToSupabase;

// Export functions for use in other modules
window.OrderManager = {
    addOrder,
    updateOrder,
    deleteOrder,
    clearAllSavedOrders,
    clearInvalidOrders,
    updateOrdersTable,
    editOrder,
    exitEditMode,
    cancelEdit,
    resetForm,
    getFilteredOperations,
    buildBreakdownRangeString,
    buildHolidayRangeString,
    showAlert,
    getSavedOrders: () => savedOrders,
    setSavedOrders: (orders) => { savedOrders = orders; window.savedOrders = savedOrders; },
    saveOrderToSupabase
};
