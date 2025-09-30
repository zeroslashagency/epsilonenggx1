/**
 * UI Handlers Module
 * Handles all UI interactions, event listeners, and form management
 * Extracted from index.html
 */

// Global variables for UI state

/**
 * Setup part number search functionality
 */
function setupPartNumberSearch() {
    const partInput = document.getElementById('partNumber');
    const suggestions = document.getElementById('partSuggestions');

    if (!partInput || !suggestions) return;

    partInput.addEventListener('input', function() {
        const query = this.value.toLowerCase();
        const parts = getAvailablePartNumbers();
        let matches = [];
        
        if (query.length === 0) {
            matches = parts.slice(0, 20);
        } else {
            matches = parts.filter(part => part.toLowerCase().includes(query));
        }

        if (matches.length > 0) {
            suggestions.innerHTML = matches.map(part => 
                `<div class="suggestion-item" onclick="selectPartNumber('${part}')">${part}</div>`
            ).join('');
            suggestions.style.display = 'block';
        } else {
            suggestions.style.display = 'none';
        }
    });

    // Show initial list on focus
    partInput.addEventListener('focus', function() {
        const parts = getAvailablePartNumbers();
        console.log('Part numbers on focus:', parts);
        
        if (parts.length === 0) {
            // Retry after a short delay if data not loaded yet
            setTimeout(() => {
                const retryParts = getAvailablePartNumbers();
                console.log('Retry part numbers:', retryParts);
                if (retryParts.length > 0) {
                    const matches = retryParts.slice(0, 20);
                    suggestions.innerHTML = matches.map(part => 
                        `<div class="suggestion-item" onclick="selectPartNumber('${part}')">${part}</div>`
                    ).join('');
                    suggestions.style.display = 'block';
                }
            }, 500);
            return;
        }
        
        const matches = parts.slice(0, 20);
        if (matches.length > 0) {
            suggestions.innerHTML = matches.map(part => 
                `<div class="suggestion-item" onclick="selectPartNumber('${part}')">${part}</div>`
            ).join('');
            suggestions.style.display = 'block';
        }
    });

    // Hide suggestions when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.part-input-container')) {
            suggestions.style.display = 'none';
        }
    });
}

/**
 * Setup empty part number search when no data is available
 */
function setupEmptyPartNumberSearch() {
    const partNumberInput = document.getElementById('partNumber');
    const partNumberResults = document.getElementById('partNumberResults');
    
    if (partNumberInput) {
        partNumberInput.placeholder = 'Import Excel file first to see part numbers';
        partNumberInput.disabled = true;
    }
    
    if (partNumberResults) {
        partNumberResults.innerHTML = '<div style="padding: 10px; color: #888; font-style: italic;">No part numbers available. Please import Excel file first.</div>';
        partNumberResults.style.display = 'block';
    }
    
    // Use the global getAvailablePartNumbers function from main.js
    // Don't override it with empty array
}

/**
 * Select a part number from suggestions
 */
function selectPartNumber(partNumber) {
    window.selectedPartNumber = partNumber;
    document.getElementById('partNumber').value = partNumber;
    document.getElementById('partSuggestions').style.display = 'none';
    
    // Populate operation sequences for selected part
    populateOperationSequences(partNumber);
}

/**
 * Populate operation sequences for selected part
 */
function populateOperationSequences(partNumber) {
    const operationSeqDisplay = document.getElementById('operationSeqDisplay');
    const operationDropdown = document.getElementById('operationDropdown');
    const operationSelectedTags = document.getElementById('operationSelectedTags');
    
    if (!operationSeqDisplay || !operationDropdown) return;

    // Get operations for this part
    const operations = (window.OP_MASTER || []).filter(op => 
        String(op.PartNumber).trim() === partNumber
    );

    if (operations.length === 0) {
        operationSeqDisplay.placeholder = 'No operations found for this part';
        operationSeqDisplay.disabled = true;
        operationDropdown.innerHTML = '<div class="frappe-autocomplete-empty">No operations found for this part</div>';
        return;
    }

    // Enable the dropdown
    operationSeqDisplay.placeholder = 'Select operation sequence...';
    operationSeqDisplay.disabled = false;

    // Populate dropdown content with Frappe UI structure
    populateFrappeDropdownContent(operations);
    
    // Auto-select ALL operation sequences for this part
    if (operations.length > 0) {
        // Get all unique operation sequences
        const allSequences = [...new Set(operations.map(op => op.OperationSeq))].sort();
        console.log('Auto-selecting all operation sequences:', allSequences);
        
        // Update display to show all selected sequences
        updateOperationSequenceDisplay(allSequences);
        
        console.log('All operation sequences auto-selected:', allSequences);
    }
}

/**
 * Toggle operation dropdown (Frappe UI style)
 */
function toggleOperationDropdown() {
    const dropdown = document.getElementById('operationDropdown');
    const input = document.getElementById('operationSeqDisplay');
    
    if (!dropdown || !input) return;

    if (dropdown.style.display === 'none' || dropdown.style.display === '') {
        dropdown.style.display = 'block';
        input.focus();
    } else {
        dropdown.style.display = 'none';
    }
}

/**
 * Populate Frappe UI dropdown content with operations
 */
function populateFrappeDropdownContent(operations) {
    const dropdown = document.getElementById('operationDropdown');
    if (!dropdown) return;

    // Group operations by sequence
    const groupedOps = operations.reduce((acc, op) => {
        const seq = op.OperationSeq;
        if (!acc[seq]) {
            acc[seq] = [];
        }
        acc[seq].push(op);
        return acc;
    }, {});

    // Create dropdown items with Frappe UI structure
    let html = '';
    Object.keys(groupedOps).sort((a, b) => parseInt(a) - parseInt(b)).forEach(seq => {
        const ops = groupedOps[seq];
        const firstOp = ops[0];
        
        html += `
            <div class="frappe-autocomplete-item" onclick="selectFrappeOperationSequence('${seq}')">
                <input type="checkbox" class="frappe-autocomplete-checkbox" id="opSeq${seq}" value="${seq}" checked>
                <label class="frappe-autocomplete-label" for="opSeq${seq}">
                    Op ${seq}: ${firstOp.OperationName || 'Operation'}
                </label>
            </div>
        `;
    });

    // Add Clear All button
    html += `
        <div class="frappe-autocomplete-clear">
            <button type="button" class="frappe-autocomplete-clear-btn" onclick="clearAllFrappeOperations()">
                Clear All
            </button>
        </div>
    `;

    dropdown.innerHTML = html;
}

/**
 * Select operation sequence (Frappe UI style)
 */
function selectFrappeOperationSequence(seq) {
    const checkbox = document.getElementById(`opSeq${seq}`);
    if (!checkbox) return;

    // Toggle the checkbox
    checkbox.checked = !checkbox.checked;

    // Get all currently selected sequences
    const allCheckboxes = document.querySelectorAll('.frappe-autocomplete-checkbox:checked');
    const selectedSequences = Array.from(allCheckboxes).map(cb => cb.value).sort();
    
    console.log('Currently selected sequences:', selectedSequences);
    
    // Update display
    updateOperationSequenceDisplay(selectedSequences);
}

/**
 * Update operation sequence display
 */
function updateOperationSequenceDisplay(selectedSequences) {
    const operationSeqDisplay = document.getElementById('operationSeqDisplay');
    const operationSeq = document.getElementById('operationSeq');
    const operationSelectedTags = document.getElementById('operationSelectedTags');
    
    if (!operationSeqDisplay || !operationSeq) return;
    
    if (selectedSequences.length === 0) {
        operationSeqDisplay.value = 'Select operation sequence...';
        operationSeq.value = '';
        if (operationSelectedTags) {
            operationSelectedTags.style.display = 'none';
        }
    } else {
        operationSeqDisplay.value = `Op ${selectedSequences.join(', Op ')}`;
        operationSeq.value = selectedSequences.join(',');
        
        // Update selected tags display
        if (operationSelectedTags) {
            updateSelectedTags(selectedSequences);
        }
    }
}

/**
 * Update selected tags display
 */
function updateSelectedTags(selectedSequences) {
    const operationSelectedTags = document.getElementById('operationSelectedTags');
    if (!operationSelectedTags) return;
    
    if (selectedSequences.length === 0) {
        operationSelectedTags.style.display = 'none';
        return;
    }
    
    let html = '';
    selectedSequences.forEach(seq => {
        html += `
            <div class="frappe-autocomplete-tag">
                Op ${seq}
                <button type="button" class="frappe-autocomplete-tag-remove" onclick="removeOperationTag('${seq}')">
                    ×
                </button>
            </div>
        `;
    });
    
    operationSelectedTags.innerHTML = html;
    operationSelectedTags.style.display = 'flex';
}

/**
 * Remove operation tag
 */
function removeOperationTag(seq) {
    const checkbox = document.getElementById(`opSeq${seq}`);
    if (checkbox) {
        checkbox.checked = false;
    }
    
    // Get remaining selected sequences
    const allCheckboxes = document.querySelectorAll('.frappe-autocomplete-checkbox:checked');
    const selectedSequences = Array.from(allCheckboxes).map(cb => cb.value).sort();
    
    updateOperationSequenceDisplay(selectedSequences);
}

/**
 * Clear all operations
 */
function clearAllFrappeOperations() {
    const checkboxes = document.querySelectorAll('.frappe-autocomplete-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    
    updateOperationSequenceDisplay([]);
}

/**
 * Populate dropdown content with operations
 */
function populateDropdownContent(operations) {
    const dropdown = document.getElementById('operationDropdown');
    if (!dropdown) return;

    // Group operations by sequence
    const groupedOps = operations.reduce((acc, op) => {
        const seq = op.OperationSeq;
        if (!acc[seq]) {
            acc[seq] = [];
        }
        acc[seq].push(op);
        return acc;
    }, {});

    // Create dropdown items
    let html = '';
    Object.keys(groupedOps).sort((a, b) => parseInt(a) - parseInt(b)).forEach(seq => {
        const ops = groupedOps[seq];
        const firstOp = ops[0];
        
        html += `
            <div class="operation-dropdown-item" onclick="selectOperationSequence('${seq}')">
                <input type="checkbox" name="operationSeq" value="${seq}" id="opSeq${seq}">
                <label for="opSeq${seq}">
                    <strong>Op ${seq}</strong>
                </label>
            </div>
        `;
    });

    dropdown.innerHTML = html;
}

/**
 * Select operation sequence
 */
function selectOperationSequence(seq) {
    const operationSeqDisplay = document.getElementById('operationSeqDisplay');
    const operationSeq = document.getElementById('operationSeq');
    const dropdown = document.getElementById('operationDropdown');
    const btn = document.getElementById('operationSeqBtn');
    
    if (!operationSeqDisplay || !operationSeq || !dropdown || !btn) return;

    // Toggle the checkbox
    const checkbox = document.getElementById(`opSeq${seq}`);
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
    }

    // Get all currently selected sequences
    const allCheckboxes = document.querySelectorAll('input[name="operationSeq"]:checked');
    const selectedSequences = Array.from(allCheckboxes).map(checkbox => checkbox.value).sort();
    
    console.log('Currently selected sequences:', selectedSequences);
    
    // Update display to show all selected sequences
    if (selectedSequences.length === 0) {
        operationSeqDisplay.value = 'Select operation sequence...';
        operationSeq.value = '';
    } else if (selectedSequences.length === 1) {
        operationSeqDisplay.value = `Op ${selectedSequences[0]}`;
        operationSeq.value = selectedSequences[0];
    } else {
        operationSeqDisplay.value = `Op ${selectedSequences.join(', Op ')}`;
        operationSeq.value = selectedSequences.join(',');
    }

    // Don't close dropdown automatically - let user select multiple
    // dropdown.style.display = 'none';
    // btn.classList.remove('open');
}

/**
 * Setup batch mode toggle
 */
function setupBatchModeToggle() {
    console.log('Setting up batch mode toggle...');
    
    // Find the batch mode toggle by looking for the specific label text
    let batchModeToggle = null;
    const formGroups = document.querySelectorAll('.form-group');
    
    formGroups.forEach(group => {
        const label = group.querySelector('label');
        if (label && label.textContent.includes('Batch Mode Switch')) {
            batchModeToggle = group.querySelector('.three-way-toggle');
            console.log('Found batch mode toggle:', batchModeToggle);
        }
    });
    
    if (!batchModeToggle) {
        console.warn('Batch mode toggle not found');
        return;
    }
    
    const toggleOptions = batchModeToggle.querySelectorAll('.toggle-option');
    console.log('Found toggle options:', toggleOptions.length);
    
    const customBatchContainer = document.getElementById('customBatchSizeContainer');
    
    toggleOptions.forEach(option => {
        option.addEventListener('click', function() {
            console.log('Batch mode option clicked:', this.dataset.mode);
            
            // Remove active class from all options in this toggle only
            toggleOptions.forEach(opt => opt.classList.remove('active'));
            
            // Add active class to clicked option
            this.classList.add('active');
            
            // Handle custom batch size visibility
            const mode = this.dataset.mode;
            if (mode === 'custom-batch-size' && customBatchContainer) {
                customBatchContainer.style.display = 'block';
            } else if (customBatchContainer) {
                customBatchContainer.style.display = 'none';
            }
            
            // Update hidden radio inputs
            let radioInput = null;
            if (mode === 'single-batch') {
                radioInput = document.getElementById('batchModeSingle');
            } else if (mode === 'auto-split') {
                radioInput = document.getElementById('batchModeAuto');
            } else if (mode === 'custom-batch-size') {
                radioInput = document.getElementById('batchModeCustom');
            }
            
            if (radioInput) {
                radioInput.checked = true;
                console.log('Updated radio input:', radioInput.id, 'to checked');
            } else {
                console.warn('Radio input not found for mode:', mode);
            }
        });
    });
    
    console.log('Batch mode toggle setup complete');
}

/**
 * Setup priority toggle
 */
function setupPriorityToggle() {
    const priorityRadios = document.querySelectorAll('input[name="priority"]');
    const priorityBg = document.getElementById('orderSectionPriorityBg');
    
    priorityRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.checked) {
                const priorityType = this.value.toLowerCase();
                updatePriorityBackground(priorityBg, priorityType);
            }
        });
    });
    
    // Set initial background based on default selection
    const defaultRadio = document.querySelector('input[name="priority"]:checked');
    if (defaultRadio && priorityBg) {
        const priorityType = defaultRadio.value.toLowerCase();
        updatePriorityBackground(priorityBg, priorityType);
    }
}

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
 * Setup form submission
 */
function setupFormSubmission() {
    const form = document.getElementById('orderForm');
    if (!form) return;

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (editingOrderId) {
            updateOrder();
        } else {
            addOrder();
        }
    });
}

/**
 * Setup due date field
 */
function setupDueDateField() {
    // Due date is now optional - no automatic default setting
    const dueDateInput = document.getElementById('dueDate');
    // Remove auto-fill behavior to allow truly optional due dates
}

/**
 * Set default due date
 */
function setDefaultDueDate() {
    // No longer set default due date - leave field empty for optional behavior
    // const oneWeekFromNow = new Date();
    // oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
    // document.getElementById('dueDate').value = oneWeekFromNow.toISOString().split('T')[0];
}

/**
 * Switch between tabs
 */
function switchTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab content
    const selectedTab = document.getElementById(tabName + 'Tab');
    if (selectedTab) {
        selectedTab.style.display = 'block';
    }
    
    // Add active class to selected tab button
    const selectedBtn = document.querySelector(`[onclick="switchTab('${tabName}')"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
}

/**
 * Toggle optional overrides section
 */
function toggleOptionalOverrides() {
    const content = document.getElementById('optionalOverridesContent');
    const icon = document.getElementById('overrideToggleIcon');
    
    if (!content || !icon) return;

    if (content.style.display === 'none' || content.style.display === '') {
        content.style.display = 'grid';
        icon.textContent = '▼';
    } else {
        content.style.display = 'none';
        icon.textContent = '▶';
    }
}

/**
 * Clear form
 */
function clearForm() {
    const form = document.getElementById('orderForm');
    if (form) {
        form.reset();
    }
    
    // Reset UI state
    window.selectedPartNumber = '';
    editingOrderId = null;
    
    // Reset operation dropdown
    const operationSeqDisplay = document.getElementById('operationSeqDisplay');
    const operationSeqBtn = document.getElementById('operationSeqBtn');
    const operationSeq = document.getElementById('operationSeq');
    
    if (operationSeqDisplay) operationSeqDisplay.value = '';
    if (operationSeqBtn) operationSeqBtn.disabled = true;
    if (operationSeq) operationSeq.value = '';
    
    // Hide custom batch size container
    const customBatchContainer = document.getElementById('customBatchSizeContainer');
    if (customBatchContainer) {
        customBatchContainer.style.display = 'none';
    }
    
    // Reset priority to normal
    const normalPriorityRadio = document.getElementById('priorityNormal');
    if (normalPriorityRadio) {
        normalPriorityRadio.checked = true;
    }
    
    // Reset priority background to normal
    const priorityBg = document.getElementById('orderSectionPriorityBg');
    if (priorityBg) {
        updatePriorityBackground(priorityBg, 'normal');
    }
    
    // Reset batch mode to auto-split
    const batchOptions = document.querySelectorAll('.three-way-toggle .toggle-option');
    batchOptions.forEach(opt => opt.classList.remove('active'));
    const autoOption = document.querySelector('.three-way-toggle .toggle-option[data-mode="auto-split"]');
    if (autoOption) {
        autoOption.classList.add('active');
    }
}

// Export functions for use in other modules
window.UIHandlers = {
    setupPartNumberSearch,
    setupEmptyPartNumberSearch,
    selectPartNumber,
    populateOperationSequences,
    toggleOperationDropdown,
    populateDropdownContent,
    selectOperationSequence,
    setupBatchModeToggle,
    setupPriorityToggle,
    setupFormSubmission,
    setupDueDateField,
    setDefaultDueDate,
    switchTab,
    toggleOptionalOverrides,
    clearForm
};
