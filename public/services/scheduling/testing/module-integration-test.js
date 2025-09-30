/**
 * Module Integration Test
 * Tests that all extracted modules work together correctly
 */

class ModuleIntegrationTest {
    constructor() {
        this.testResults = [];
    }

    /**
     * Run all integration tests
     * @returns {Object} Test results
     */
    runAllTests() {
        Logger.log("=== STARTING MODULE INTEGRATION TESTS ===");
        
        this.testResults = [];
        
        // Test 1: Core modules
        this.testCoreModules();
        
        // Test 2: Batch processing
        this.testBatchProcessing();
        
        // Test 3: Machine selection
        this.testMachineSelection();
        
        // Test 4: Operator management
        this.testOperatorManagement();
        
        // Test 5: Timing calculations
        this.testTimingCalculations();
        
        // Test 6: Integration between modules
        this.testModuleIntegration();
        
        return this.generateTestReport();
    }

    /**
     * Test core modules (CONFIG, Logger)
     */
    testCoreModules() {
        try {
            // Test CONFIG
            if (typeof CONFIG === 'undefined') {
                throw new Error('CONFIG not defined');
            }
            if (!CONFIG.MAX_CONCURRENT_SETUPS) {
                throw new Error('CONFIG.MAX_CONCURRENT_SETUPS not defined');
            }
            
            // Test Logger
            if (typeof Logger === 'undefined') {
                throw new Error('Logger not defined');
            }
            if (typeof Logger.log !== 'function') {
                throw new Error('Logger.log not a function');
            }
            
            this.testResults.push({
                test: 'Core Modules',
                status: 'PASS',
                message: 'CONFIG and Logger modules loaded successfully'
            });
            
        } catch (error) {
            this.testResults.push({
                test: 'Core Modules',
                status: 'FAIL',
                message: error.message
            });
        }
    }

    /**
     * Test batch processing module
     */
    testBatchProcessing() {
        try {
            if (typeof BatchProcessor === 'undefined') {
                throw new Error('BatchProcessor not defined');
            }
            
            const batchProcessor = new BatchProcessor();
            
            // Test batch splitting
            const batches = batchProcessor.calculateBatchSplitting(500, 100, 'normal', null, null, 'auto-split');
            
            if (!Array.isArray(batches)) {
                throw new Error('Batch splitting did not return array');
            }
            
            if (batches.length === 0) {
                throw new Error('No batches created');
            }
            
            // Test validation
            const validation = batchProcessor.validateBatches(batches, 500);
            if (!validation.isValid) {
                throw new Error(`Batch validation failed: ${validation.errors.join(', ')}`);
            }
            
            this.testResults.push({
                test: 'Batch Processing',
                status: 'PASS',
                message: `Created ${batches.length} batches successfully`
            });
            
        } catch (error) {
            this.testResults.push({
                test: 'Batch Processing',
                status: 'FAIL',
                message: error.message
            });
        }
    }

    /**
     * Test machine selection module
     */
    testMachineSelection() {
        try {
            if (typeof MachineSelector === 'undefined') {
                throw new Error('MachineSelector not defined');
            }
            
            const machineSelector = new MachineSelector();
            
            // Test machine availability check
            const isAvailable = machineSelector.isMachineAvailable('VMC 1', new Date(), new Date(Date.now() + 60000));
            
            if (typeof isAvailable !== 'boolean') {
                throw new Error('isMachineAvailable did not return boolean');
            }
            
            // Test utilization calculation
            const utilization = machineSelector.getMachineUtilization('VMC 1');
            
            if (typeof utilization !== 'object') {
                throw new Error('getMachineUtilization did not return object');
            }
            
            this.testResults.push({
                test: 'Machine Selection',
                status: 'PASS',
                message: 'Machine selection module working correctly'
            });
            
        } catch (error) {
            this.testResults.push({
                test: 'Machine Selection',
                status: 'FAIL',
                message: error.message
            });
        }
    }

    /**
     * Test operator management module
     */
    testOperatorManagement() {
        try {
            if (typeof OperatorManager === 'undefined') {
                throw new Error('OperatorManager not defined');
            }
            
            const operatorManager = new OperatorManager();
            
            // Test operator priority calculation
            const priority = operatorManager.calculateOperatorPriority('A', 100, 50, 'morning');
            
            if (typeof priority !== 'number') {
                throw new Error('calculateOperatorPriority did not return number');
            }
            
            // Test shift operators
            const morningOperators = operatorManager.getOperatorsForShift('morning');
            
            if (!Array.isArray(morningOperators)) {
                throw new Error('getOperatorsForShift did not return array');
            }
            
            if (morningOperators.length === 0) {
                throw new Error('No morning operators found');
            }
            
            this.testResults.push({
                test: 'Operator Management',
                status: 'PASS',
                message: `Found ${morningOperators.length} morning operators`
            });
            
        } catch (error) {
            this.testResults.push({
                test: 'Operator Management',
                status: 'FAIL',
                message: error.message
            });
        }
    }

    /**
     * Test timing calculations module
     */
    testTimingCalculations() {
        try {
            if (typeof TimingCalculator === 'undefined') {
                throw new Error('TimingCalculator not defined');
            }
            
            const timingCalculator = new TimingCalculator();
            
            // Test duration calculation
            const startTime = new Date();
            const endTime = new Date(startTime.getTime() + 3600000); // 1 hour later
            
            const duration = timingCalculator.calculateDuration(startTime, endTime);
            
            if (typeof duration !== 'object') {
                throw new Error('calculateDuration did not return object');
            }
            
            if (duration.hours !== 1) {
                throw new Error(`Expected 1 hour, got ${duration.hours}`);
            }
            
            // Test duration formatting
            const formatted = timingCalculator.formatDuration(3600000);
            
            if (typeof formatted !== 'string') {
                throw new Error('formatDuration did not return string');
            }
            
            this.testResults.push({
                test: 'Timing Calculations',
                status: 'PASS',
                message: `Duration calculation working: ${formatted}`
            });
            
        } catch (error) {
            this.testResults.push({
                test: 'Timing Calculations',
                status: 'FAIL',
                message: error.message
            });
        }
    }

    /**
     * Test integration between modules
     */
    testModuleIntegration() {
        try {
            // Test that modules can work together
            const batchProcessor = new BatchProcessor();
            const machineSelector = new MachineSelector();
            const operatorManager = new OperatorManager();
            const timingCalculator = new TimingCalculator();
            
            // Create a test order
            const testOrder = {
                partNumber: 'TEST-001',
                quantity: 300,
                priority: 'normal',
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            };
            
            // Test batch splitting
            const batches = batchProcessor.calculateBatchSplitting(testOrder.quantity, 100, testOrder.priority);
            
            // Test machine selection
            const testOperation = {
                SetupTime_Min: 60,
                CycleTime_Min: 5,
                EligibleMachines: 'VMC 1,VMC 2'
            };
            
            const selectedMachine = machineSelector.selectOptimalMachine(testOperation, testOrder, new Date());
            
            // Test operator assignment
            const morningOperators = operatorManager.getOperatorsForShift('morning');
            const selectedOperator = morningOperators[0];
            
            // Test timing calculation
            const timing = timingCalculator.calculatePreliminaryTiming(
                testOperation, 
                testOrder, 
                batches[0].quantity, 
                selectedOperator, 
                new Date()
            );
            
            if (!timing.setupStart || !timing.setupEnd || !timing.runStart || !timing.runEnd) {
                throw new Error('Timing calculation missing required fields');
            }
            
            this.testResults.push({
                test: 'Module Integration',
                status: 'PASS',
                message: `All modules integrated successfully: ${batches.length} batches, machine: ${selectedMachine}, operator: ${selectedOperator}`
            });
            
        } catch (error) {
            this.testResults.push({
                test: 'Module Integration',
                status: 'FAIL',
                message: error.message
            });
        }
    }

    /**
     * Generate test report
     * @returns {Object} Test report
     */
    generateTestReport() {
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(result => result.status === 'PASS').length;
        const failedTests = totalTests - passedTests;
        
        const report = {
            summary: {
                totalTests: totalTests,
                passed: passedTests,
                failed: failedTests,
                successRate: (passedTests / totalTests) * 100
            },
            results: this.testResults,
            status: failedTests === 0 ? 'ALL_PASSED' : 'SOME_FAILED'
        };
        
        Logger.log("=== MODULE INTEGRATION TEST RESULTS ===");
        Logger.log(`Total Tests: ${totalTests}`);
        Logger.log(`Passed: ${passedTests}`);
        Logger.log(`Failed: ${failedTests}`);
        Logger.log(`Success Rate: ${report.summary.successRate.toFixed(1)}%`);
        
        this.testResults.forEach(result => {
            const status = result.status === 'PASS' ? '✅' : '❌';
            Logger.log(`${status} ${result.test}: ${result.message}`);
        });
        
        return report;
    }
}

// Export to window for global access
if (typeof window !== 'undefined') {
    window.ModuleIntegrationTest = ModuleIntegrationTest;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ModuleIntegrationTest };
}
