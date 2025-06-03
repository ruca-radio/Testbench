/**
 * Comprehensive QA Framework
 * Automated testing for all endpoints and system validation
 * Provides automated testing, validation, and QA checklists
 */

class QAFramework {
    constructor() {
        this.testSuites = new Map();
        this.testResults = [];
        this.validators = new Map();
        this.endpoints = new Map();
        this.qaChecklist = [];
        this.init();
    }

    init() {
        this.setupEndpoints();
        this.setupValidators();
        this.setupTestSuites();
        this.setupQAChecklist();
        console.log('QA Framework initialized');
    }

    /**
     * Setup endpoint definitions for testing
     */
    setupEndpoints() {
        this.endpoints.set('settings', {
            list: { method: 'GET', path: '/api/settings/list/all' },
            save: { method: 'POST', path: '/api/settings/save' },
            testConnection: { method: 'POST', path: '/api/models/test-connection' }
        });

        this.endpoints.set('models', {
            list: { method: 'GET', path: '/api/models/list' },
            testConnection: { method: 'POST', path: '/api/models/test-connection' },
            refresh: { method: 'POST', path: '/api/models/refresh' }
        });

        this.endpoints.set('tools', {
            agentManagement: { method: 'POST', path: '/api/tools/agent_management' },
            workspaceOps: { method: 'POST', path: '/api/tools/workspace_ops' }
        });

        this.endpoints.set('chat', {
            send: { method: 'POST', path: '/chat' },
            clear: { method: 'POST', path: '/api/chat/clear' }
        });

        this.endpoints.set('health', {
            status: { method: 'GET', path: '/api/health/status' },
            ping: { method: 'GET', path: '/api/health/ping' }
        });
    }

    /**
     * Setup response validators
     */
    setupValidators() {
        this.validators.set('standardResponse', (response) => {
            const required = ['success'];
            const missing = required.filter(field => !(field in response));
            return {
                isValid: missing.length === 0,
                errors: missing.map(field => `Missing required field: ${field}`)
            };
        });

        this.validators.set('settingsList', (response) => {
            if (!response.success) return { isValid: false, errors: ['Response not successful'] };

            const errors = [];
            if (!response.settings || typeof response.settings !== 'object') {
                errors.push('Settings object missing or invalid');
            }

            return { isValid: errors.length === 0, errors };
        });

        this.validators.set('modelsList', (response) => {
            if (!response.success) return { isValid: false, errors: ['Response not successful'] };

            const errors = [];
            if (!Array.isArray(response.models)) {
                errors.push('Models array missing or invalid');
            }

            return { isValid: errors.length === 0, errors };
        });

        this.validators.set('connectionTest', (response) => {
            const errors = [];
            if (typeof response.success !== 'boolean') {
                errors.push('Success field missing or not boolean');
            }
            if (!response.message) {
                errors.push('Message field missing');
            }

            return { isValid: errors.length === 0, errors };
        });

        this.validators.set('agentManagement', (response) => {
            const errors = [];
            if (typeof response.success !== 'boolean') {
                errors.push('Success field missing or not boolean');
            }

            return { isValid: errors.length === 0, errors };
        });
    }

    /**
     * Setup comprehensive test suites
     */
    setupTestSuites() {
        // Settings API Test Suite
        this.testSuites.set('settings', [
            {
                name: 'Settings List API',
                test: () => this.testSettingsListAPI()
            },
            {
                name: 'Settings Save API',
                test: () => this.testSettingsSaveAPI()
            },
            {
                name: 'Connection Test API',
                test: () => this.testConnectionAPI()
            }
        ]);

        // Models API Test Suite
        this.testSuites.set('models', [
            {
                name: 'Models List API',
                test: () => this.testModelsListAPI()
            },
            {
                name: 'Models Connection Test',
                test: () => this.testModelsConnectionAPI()
            }
        ]);

        // Tools API Test Suite
        this.testSuites.set('tools', [
            {
                name: 'Agent Management Tool',
                test: () => this.testAgentManagementTool()
            },
            {
                name: 'Workspace Operations Tool',
                test: () => this.testWorkspaceOperationsTool()
            }
        ]);

        // Enhanced Forms Test Suite
        this.testSuites.set('enhanced-forms', [
            {
                name: 'Enhanced Forms Component',
                test: () => this.testEnhancedFormsComponent()
            },
            {
                name: 'Form Validation',
                test: () => this.testFormValidation()
            },
            {
                name: 'Real-time Validation',
                test: () => this.testRealTimeValidation()
            }
        ]);

        // Integration Test Suite
        this.testSuites.set('integration', [
            {
                name: 'Settings Modal Integration',
                test: () => this.testSettingsModalIntegration()
            },
            {
                name: 'TestBench Agent Integration',
                test: () => this.testTestBenchAgentIntegration()
            },
            {
                name: 'Enhanced Settings Manager',
                test: () => this.testEnhancedSettingsManager()
            }
        ]);

        // System Health Test Suite
        this.testSuites.set('health', [
            {
                name: 'System Health Check',
                test: () => this.testSystemHealth()
            },
            {
                name: 'Error Handling',
                test: () => this.testErrorHandling()
            },
            {
                name: 'Performance Metrics',
                test: () => this.testPerformanceMetrics()
            }
        ]);
    }

    /**
     * Setup QA Checklist
     */
    setupQAChecklist() {
        this.qaChecklist = [
            {
                category: 'API Connectivity',
                items: [
                    'Settings API returns correct format',
                    'Models API handles provider configuration',
                    'Connection testing works for all providers',
                    'Error responses include helpful messages',
                    'Response times are acceptable (<5s)'
                ]
            },
            {
                category: 'Enhanced Forms',
                items: [
                    'Form components render correctly',
                    'Real-time validation works',
                    'Password toggle functionality',
                    'Connection testing integrated',
                    'Validation messages display properly'
                ]
            },
            {
                category: 'TestBench Agent Tools',
                items: [
                    'Agent management CRUD operations work',
                    'Workspace operations function correctly',
                    'Agent testing capability works',
                    'Error handling is robust',
                    'Database operations are reliable'
                ]
            },
            {
                category: 'User Experience',
                items: [
                    'Settings modal loads without errors',
                    'Form fields are responsive',
                    'Loading states are shown',
                    'Success/error notifications work',
                    'Accessibility requirements met'
                ]
            },
            {
                category: 'Integration',
                items: [
                    'Enhanced forms work with existing modal',
                    'TestBench tools integrate properly',
                    'Settings persist correctly',
                    'No JavaScript errors in console',
                    'All dependencies load correctly'
                ]
            }
        ];
    }

    /**
     * Run comprehensive QA test suite
     */
    async runComprehensiveQA() {
        console.log('🔍 Starting Comprehensive QA Test Suite...');
        this.testResults = [];

        const startTime = Date.now();
        let totalTests = 0;
        let passedTests = 0;

        // Run all test suites
        for (const [suiteName, tests] of this.testSuites) {
            console.log(`📋 Running ${suiteName} test suite...`);

            for (const test of tests) {
                totalTests++;
                const result = await this.runSingleTest(suiteName, test);
                this.testResults.push(result);
                if (result.status === 'passed') passedTests++;
            }
        }

        const duration = Date.now() - startTime;
        const report = this.generateQAReport(totalTests, passedTests, duration);

        console.log('📊 QA Test Suite Complete');
        console.log(`✅ ${passedTests}/${totalTests} tests passed (${((passedTests/totalTests)*100).toFixed(1)}%)`);
        console.log(`⏱️ Duration: ${duration}ms`);

        return report;
    }

    /**
     * Run a single test with error handling
     */
    async runSingleTest(suiteName, test) {
        const startTime = Date.now();

        try {
            console.log(`  🧪 ${test.name}`);
            const result = await test.test();
            const duration = Date.now() - startTime;

            return {
                suite: suiteName,
                name: test.name,
                status: 'passed',
                duration,
                result,
                error: null
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`  ❌ ${test.name} - ${error.message}`);

            return {
                suite: suiteName,
                name: test.name,
                status: 'failed',
                duration,
                result: null,
                error: error.message
            };
        }
    }

    // === API TEST IMPLEMENTATIONS ===

    async testSettingsListAPI() {
        const response = await Utils.apiCall('/api/settings/list/all');
        const validation = this.validators.get('settingsList')(response);

        if (!validation.isValid) {
            throw new Error(`Settings List API validation failed: ${validation.errors.join(', ')}`);
        }

        return { message: 'Settings list API working correctly', response };
    }

    async testSettingsSaveAPI() {
        const testSettings = {
            openai_api_key: 'test-key-123',
            anthropic_api_key: 'test-key-456'
        };

        const response = await Utils.apiCall('/api/settings/save', {
            method: 'POST',
            body: { settings: testSettings }
        });

        const validation = this.validators.get('standardResponse')(response);
        if (!validation.isValid) {
            throw new Error(`Settings Save API validation failed: ${validation.errors.join(', ')}`);
        }

        return { message: 'Settings save API working correctly', response };
    }

    async testConnectionAPI() {
        const response = await Utils.apiCall('/api/models/test-connection', {
            method: 'POST',
            body: {
                provider: 'openai',
                apiKey: 'test-key'
            }
        });

        const validation = this.validators.get('connectionTest')(response);
        if (!validation.isValid) {
            throw new Error(`Connection Test API validation failed: ${validation.errors.join(', ')}`);
        }

        return { message: 'Connection test API responding correctly', response };
    }

    async testModelsListAPI() {
        const response = await Utils.apiCall('/api/models/list');
        const validation = this.validators.get('modelsList')(response);

        if (!validation.isValid) {
            throw new Error(`Models List API validation failed: ${validation.errors.join(', ')}`);
        }

        return { message: 'Models list API working correctly', response };
    }

    async testModelsConnectionAPI() {
        const response = await Utils.apiCall('/api/models/test-connection', {
            method: 'POST',
            body: {
                provider: 'ollama',
                endpoint: 'http://localhost:11434'
            }
        });

        const validation = this.validators.get('connectionTest')(response);
        if (!validation.isValid) {
            throw new Error(`Models Connection API validation failed: ${validation.errors.join(', ')}`);
        }

        return { message: 'Models connection API working correctly', response };
    }

    async testAgentManagementTool() {
        const response = await Utils.apiCall('/api/tools/agent_management', {
            method: 'POST',
            body: {
                action: 'list',
                filters: {}
            }
        });

        const validation = this.validators.get('agentManagement')(response);
        if (!validation.isValid) {
            throw new Error(`Agent Management Tool validation failed: ${validation.errors.join(', ')}`);
        }

        return { message: 'Agent management tool working correctly', response };
    }

    async testWorkspaceOperationsTool() {
        const response = await Utils.apiCall('/api/tools/workspace_ops', {
            method: 'POST',
            body: {
                action: 'list'
            }
        });

        const validation = this.validators.get('agentManagement')(response);
        if (!validation.isValid) {
            throw new Error(`Workspace Operations Tool validation failed: ${validation.errors.join(', ')}`);
        }

        return { message: 'Workspace operations tool working correctly', response };
    }

    // === COMPONENT TEST IMPLEMENTATIONS ===

    async testEnhancedFormsComponent() {
        if (!window.EnhancedForms) {
            throw new Error('EnhancedForms component not loaded');
        }

        // Test form component creation
        const testConfig = {
            id: 'qa-test-input',
            label: 'QA Test Input',
            type: 'text',
            required: true,
            validators: [EnhancedForms.validators.required]
        };

        const formGroup = EnhancedForms.createInputGroup(testConfig);
        if (!formGroup || !formGroup.querySelector('.enhanced-input')) {
            throw new Error('Enhanced form component creation failed');
        }

        // Cleanup
        formGroup.remove();

        return { message: 'Enhanced forms component working correctly' };
    }

    async testFormValidation() {
        if (!window.EnhancedForms) {
            throw new Error('EnhancedForms component not loaded');
        }

        // Test validation functions
        const emailResult = EnhancedForms.validators.email('test@example.com');
        if (!emailResult.isValid) {
            throw new Error('Email validation failed for valid email');
        }

        const requiredResult = EnhancedForms.validators.required('');
        if (requiredResult.isValid) {
            throw new Error('Required validation passed for empty value');
        }

        return { message: 'Form validation working correctly' };
    }

    async testRealTimeValidation() {
        // This test would be more comprehensive in a real browser environment
        if (!window.EnhancedForms) {
            throw new Error('EnhancedForms component not loaded');
        }

        return { message: 'Real-time validation component available' };
    }

    async testSettingsModalIntegration() {
        if (!window.SettingsModal) {
            throw new Error('SettingsModal not loaded');
        }

        if (!window.EnhancedSettingsManager) {
            throw new Error('EnhancedSettingsManager not loaded');
        }

        return { message: 'Settings modal integration components loaded' };
    }

    async testTestBenchAgentIntegration() {
        if (!window.TestBenchManager) {
            throw new Error('TestBenchManager not loaded');
        }

        if (!window.TestBenchToolsTester) {
            throw new Error('TestBenchToolsTester not loaded');
        }

        return { message: 'TestBench agent integration components loaded' };
    }

    async testEnhancedSettingsManager() {
        if (!window.EnhancedSettingsManager) {
            throw new Error('EnhancedSettingsManager not loaded');
        }

        return { message: 'Enhanced settings manager loaded and initialized' };
    }

    async testSystemHealth() {
        const response = await Utils.apiCall('/api/health/status');

        if (!response || typeof response !== 'object') {
            throw new Error('System health endpoint not responding properly');
        }

        return { message: 'System health check working', response };
    }

    async testErrorHandling() {
        try {
            // Test error handling with invalid endpoint
            await Utils.apiCall('/api/invalid/endpoint');
            throw new Error('Error handling test failed - should have thrown error');
        } catch (error) {
            if (error.message.includes('should have thrown')) {
                throw error;
            }
            // Expected error occurred
            return { message: 'Error handling working correctly' };
        }
    }

    async testPerformanceMetrics() {
        const startTime = Date.now();
        await Utils.apiCall('/api/settings/list/all');
        const duration = Date.now() - startTime;

        if (duration > 5000) {
            throw new Error(`Settings API too slow: ${duration}ms`);
        }

        return { message: `Performance acceptable: ${duration}ms` };
    }

    /**
     * Generate comprehensive QA report
     */
    generateQAReport(totalTests, passedTests, duration) {
        const failedTests = totalTests - passedTests;
        const successRate = ((passedTests / totalTests) * 100).toFixed(1);

        const report = {
            summary: {
                totalTests,
                passedTests,
                failedTests,
                successRate: `${successRate}%`,
                duration: `${duration}ms`,
                timestamp: new Date().toISOString(),
                status: failedTests === 0 ? 'PASS' : 'FAIL'
            },
            testResults: this.testResults,
            qaChecklist: this.qaChecklist,
            failedTests: this.testResults.filter(test => test.status === 'failed'),
            recommendations: this.generateRecommendations()
        };

        return report;
    }

    /**
     * Generate recommendations based on test results
     */
    generateRecommendations() {
        const failed = this.testResults.filter(test => test.status === 'failed');
        const recommendations = [];

        if (failed.length === 0) {
            recommendations.push('✅ All tests passed! The system is functioning correctly.');
            recommendations.push('🔄 Consider running regular QA checks to maintain quality.');
        } else {
            recommendations.push('⚠️ Some tests failed. Please review the following:');

            failed.forEach(test => {
                recommendations.push(`- Fix ${test.suite}/${test.name}: ${test.error}`);
            });

            if (failed.some(test => test.suite === 'settings')) {
                recommendations.push('🔧 Settings API issues detected - check backend connectivity');
            }

            if (failed.some(test => test.suite === 'tools')) {
                recommendations.push('🛠️ TestBench tools issues detected - verify database connectivity');
            }

            if (failed.some(test => test.suite === 'enhanced-forms')) {
                recommendations.push('📝 Enhanced forms issues detected - check JavaScript dependencies');
            }
        }

        return recommendations;
    }

    /**
     * Export QA report to file
     */
    exportQAReport(report) {
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `qa-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log('📁 QA report exported successfully');
    }

    /**
     * Quick health check for all systems
     */
    async quickHealthCheck() {
        console.log('⚡ Running quick health check...');

        const checks = [
            { name: 'Settings API', test: () => this.testSettingsListAPI() },
            { name: 'Models API', test: () => this.testModelsListAPI() },
            { name: 'Agent Tools', test: () => this.testAgentManagementTool() },
            { name: 'Components', test: () => this.testEnhancedFormsComponent() }
        ];

        const results = [];
        for (const check of checks) {
            try {
                await check.test();
                results.push({ name: check.name, status: 'PASS' });
                console.log(`✅ ${check.name}`);
            } catch (error) {
                results.push({ name: check.name, status: 'FAIL', error: error.message });
                console.log(`❌ ${check.name}: ${error.message}`);
            }
        }

        const passed = results.filter(r => r.status === 'PASS').length;
        console.log(`🎯 Quick Health Check: ${passed}/${results.length} systems healthy`);

        return results;
    }
}

// Create global instance
window.QAFramework = new QAFramework();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QAFramework;
}
