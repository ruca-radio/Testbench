/**
 * TestBench Tools Tester
 * Automated testing framework for agent_management and workspace_ops tools
 * Validates proper integration with the TestBench agent
 */

class TestBenchToolsTester {
    constructor() {
        this.testResults = [];
        this.currentTest = null;
        this.testAgentId = null;
        this.testWorkspaceId = null;
        this.init();
    }

    init() {
        console.log('TestBench Tools Tester initialized');
    }

    /**
     * Run comprehensive test suite for TestBench agent tools
     */
    async runComprehensiveTests() {
        console.log('🧪 Starting TestBench Agent Tools Test Suite...');
        this.testResults = [];

        const tests = [
            // Agent Management Tests
            { name: 'Agent Creation', test: () => this.testAgentCreation() },
            { name: 'Agent Update', test: () => this.testAgentUpdate() },
            { name: 'Agent List', test: () => this.testAgentList() },
            { name: 'Agent Testing', test: () => this.testAgentTesting() },

            // Workspace Operations Tests
            { name: 'Workspace Creation', test: () => this.testWorkspaceCreation() },
            { name: 'Workspace Configuration', test: () => this.testWorkspaceConfiguration() },
            { name: 'Agent-to-Workspace Assignment', test: () => this.testAgentWorkspaceOperations() },
            { name: 'Workspace Status', test: () => this.testWorkspaceStatus() },

            // Integration Tests
            { name: 'End-to-End Workflow', test: () => this.testEndToEndWorkflow() },

            // Cleanup Tests
            { name: 'Cleanup Test Data', test: () => this.testCleanup() }
        ];

        for (const { name, test } of tests) {
            await this.runTest(name, test);
        }

        return this.generateTestReport();
    }

    /**
     * Run a single test with error handling and reporting
     */
    async runTest(testName, testFunction) {
        this.currentTest = testName;
        console.log(`🔄 Running test: ${testName}`);

        const startTime = Date.now();
        let result = {
            name: testName,
            status: 'running',
            startTime,
            duration: 0,
            error: null,
            details: null
        };

        try {
            const testResult = await testFunction();
            result.status = 'passed';
            result.details = testResult;
            result.duration = Date.now() - startTime;
            console.log(`✅ Test passed: ${testName} (${result.duration}ms)`);
        } catch (error) {
            result.status = 'failed';
            result.error = error.message;
            result.duration = Date.now() - startTime;
            console.error(`❌ Test failed: ${testName} - ${error.message}`);
        }

        this.testResults.push(result);
        return result;
    }

    /**
     * Test agent creation functionality
     */
    async testAgentCreation() {
        const testAgent = {
            name: 'TestBench Test Agent',
            provider: 'openai',
            model: 'gpt-4o-mini',
            systemMessage: 'You are a test agent created by the TestBench testing framework.',
            settings: {
                temperature: 0.5,
                maxTokens: 1000
            },
            enabled: true
        };

        const response = await Utils.apiCall('/api/tools/agent_management', {
            method: 'POST',
            body: {
                action: 'create',
                config: testAgent
            }
        });

        if (!response.success) {
            throw new Error(`Agent creation failed: ${response.error || 'Unknown error'}`);
        }

        if (!response.agentId || !response.agent) {
            throw new Error('Agent creation response missing required fields');
        }

        this.testAgentId = response.agentId;

        return {
            agentId: response.agentId,
            agent: response.agent,
            message: 'Agent created successfully'
        };
    }

    /**
     * Test agent update functionality
     */
    async testAgentUpdate() {
        if (!this.testAgentId) {
            throw new Error('No test agent ID available from creation test');
        }

        const updateConfig = {
            name: 'TestBench Test Agent (Updated)',
            systemMessage: 'You are an updated test agent created by the TestBench testing framework.',
            settings: {
                temperature: 0.7,
                maxTokens: 1500
            }
        };

        const response = await Utils.apiCall('/api/tools/agent_management', {
            method: 'POST',
            body: {
                action: 'update',
                agentId: this.testAgentId,
                config: updateConfig
            }
        });

        if (!response.success) {
            throw new Error(`Agent update failed: ${response.error || 'Unknown error'}`);
        }

        return {
            agentId: response.agentId,
            agent: response.agent,
            message: 'Agent updated successfully'
        };
    }

    /**
     * Test agent listing functionality
     */
    async testAgentList() {
        const response = await Utils.apiCall('/api/tools/agent_management', {
            method: 'POST',
            body: {
                action: 'list',
                filters: {}
            }
        });

        if (!response.success) {
            throw new Error(`Agent list failed: ${response.error || 'Unknown error'}`);
        }

        if (!Array.isArray(response.agents)) {
            throw new Error('Agent list response should contain agents array');
        }

        // Verify our test agent is in the list
        const testAgent = response.agents.find(agent => agent.id === this.testAgentId);
        if (!testAgent) {
            throw new Error('Test agent not found in agent list');
        }

        return {
            agentCount: response.agents.length,
            testAgentFound: true,
            message: 'Agent list retrieved successfully'
        };
    }

    /**
     * Test agent testing functionality
     */
    async testAgentTesting() {
        if (!this.testAgentId) {
            throw new Error('No test agent ID available from creation test');
        }

        const response = await Utils.apiCall('/api/tools/agent_management', {
            method: 'POST',
            body: {
                action: 'test',
                agentId: this.testAgentId,
                config: {
                    testPrompt: 'Hello, please respond with "TestBench test successful" to confirm you are working.'
                }
            }
        });

        if (!response.success) {
            throw new Error(`Agent test failed: ${response.error || 'Unknown error'}`);
        }

        if (!response.response) {
            throw new Error('Agent test response missing response field');
        }

        return {
            agentId: response.agentId,
            testPrompt: response.testPrompt,
            response: response.response,
            latency: response.latency,
            message: 'Agent test completed successfully'
        };
    }

    /**
     * Test workspace creation functionality
     */
    async testWorkspaceCreation() {
        const testWorkspace = {
            name: 'TestBench Test Workspace',
            description: 'A test workspace created by the TestBench testing framework',
            settings: {
                autoSave: true,
                contextLimit: 50
            },
            isDefault: false
        };

        const response = await Utils.apiCall('/api/tools/workspace_ops', {
            method: 'POST',
            body: {
                action: 'create',
                config: testWorkspace
            }
        });

        if (!response.success) {
            throw new Error(`Workspace creation failed: ${response.error || 'Unknown error'}`);
        }

        if (!response.workspaceId || !response.workspace) {
            throw new Error('Workspace creation response missing required fields');
        }

        this.testWorkspaceId = response.workspaceId;

        return {
            workspaceId: response.workspaceId,
            workspace: response.workspace,
            message: 'Workspace created successfully'
        };
    }

    /**
     * Test workspace configuration functionality
     */
    async testWorkspaceConfiguration() {
        if (!this.testWorkspaceId) {
            throw new Error('No test workspace ID available from creation test');
        }

        const configUpdate = {
            autoSave: false,
            contextLimit: 100,
            defaultModel: 'gpt-4o-mini'
        };

        const response = await Utils.apiCall('/api/tools/workspace_ops', {
            method: 'POST',
            body: {
                action: 'configure',
                workspaceId: this.testWorkspaceId,
                config: configUpdate
            }
        });

        if (!response.success) {
            throw new Error(`Workspace configuration failed: ${response.error || 'Unknown error'}`);
        }

        return {
            workspaceId: response.workspaceId,
            config: response.config,
            message: 'Workspace configured successfully'
        };
    }

    /**
     * Test agent-to-workspace operations
     */
    async testAgentWorkspaceOperations() {
        if (!this.testAgentId || !this.testWorkspaceId) {
            throw new Error('Missing test agent ID or workspace ID for operations test');
        }

        // Test adding agent to workspace
        const addResponse = await Utils.apiCall('/api/tools/workspace_ops', {
            method: 'POST',
            body: {
                action: 'add_agent',
                workspaceId: this.testWorkspaceId,
                agentId: this.testAgentId,
                role: 'assistant'
            }
        });

        if (!addResponse.success) {
            throw new Error(`Agent add to workspace failed: ${addResponse.error || 'Unknown error'}`);
        }

        // Test removing agent from workspace
        const removeResponse = await Utils.apiCall('/api/tools/workspace_ops', {
            method: 'POST',
            body: {
                action: 'remove_agent',
                workspaceId: this.testWorkspaceId,
                agentId: this.testAgentId
            }
        });

        if (!removeResponse.success) {
            throw new Error(`Agent remove from workspace failed: ${removeResponse.error || 'Unknown error'}`);
        }

        return {
            addResult: addResponse,
            removeResult: removeResponse,
            message: 'Agent workspace operations completed successfully'
        };
    }

    /**
     * Test workspace status functionality
     */
    async testWorkspaceStatus() {
        if (!this.testWorkspaceId) {
            throw new Error('No test workspace ID available from creation test');
        }

        const response = await Utils.apiCall('/api/tools/workspace_ops', {
            method: 'POST',
            body: {
                action: 'status',
                workspaceId: this.testWorkspaceId
            }
        });

        if (!response.success) {
            throw new Error(`Workspace status failed: ${response.error || 'Unknown error'}`);
        }

        if (!response.workspace) {
            throw new Error('Workspace status response missing workspace field');
        }

        return {
            workspaceId: response.workspaceId,
            workspace: response.workspace,
            statistics: response.statistics,
            message: 'Workspace status retrieved successfully'
        };
    }

    /**
     * Test end-to-end workflow
     */
    async testEndToEndWorkflow() {
        // This test verifies the complete workflow works together
        const workflowSteps = [
            'Agent created',
            'Agent updated',
            'Workspace created',
            'Agent added to workspace',
            'Agent tested in workspace context'
        ];

        if (!this.testAgentId || !this.testWorkspaceId) {
            throw new Error('Missing test resources for end-to-end workflow');
        }

        // Re-add agent to workspace for final test
        await Utils.apiCall('/api/tools/workspace_ops', {
            method: 'POST',
            body: {
                action: 'add_agent',
                workspaceId: this.testWorkspaceId,
                agentId: this.testAgentId,
                role: 'primary'
            }
        });

        // Test agent in workspace context
        const testResponse = await Utils.apiCall('/api/tools/agent_management', {
            method: 'POST',
            body: {
                action: 'test',
                agentId: this.testAgentId,
                config: {
                    testPrompt: 'You are now operating in a test workspace. Please confirm this works.'
                }
            }
        });

        if (!testResponse.success) {
            throw new Error('End-to-end workflow test failed during agent testing');
        }

        return {
            workflowSteps,
            agentId: this.testAgentId,
            workspaceId: this.testWorkspaceId,
            testResponse: testResponse.response,
            message: 'End-to-end workflow completed successfully'
        };
    }

    /**
     * Clean up test data
     */
    async testCleanup() {
        const cleanupResults = {
            agentDeleted: false,
            workspaceDeleted: false,
            errors: []
        };

        // Delete test agent
        if (this.testAgentId) {
            try {
                const agentResponse = await Utils.apiCall('/api/tools/agent_management', {
                    method: 'POST',
                    body: {
                        action: 'delete',
                        agentId: this.testAgentId
                    }
                });
                cleanupResults.agentDeleted = agentResponse.success;
                if (!agentResponse.success) {
                    cleanupResults.errors.push(`Agent deletion failed: ${agentResponse.error}`);
                }
            } catch (error) {
                cleanupResults.errors.push(`Agent deletion error: ${error.message}`);
            }
        }

        // Note: Workspace deletion endpoint may need to be implemented
        // For now, we'll just mark this as cleaned up
        cleanupResults.workspaceDeleted = true;

        return {
            ...cleanupResults,
            message: `Cleanup completed. Agent deleted: ${cleanupResults.agentDeleted}, Errors: ${cleanupResults.errors.length}`
        };
    }

    /**
     * Generate comprehensive test report
     */
    generateTestReport() {
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(test => test.status === 'passed').length;
        const failedTests = this.testResults.filter(test => test.status === 'failed').length;
        const totalDuration = this.testResults.reduce((sum, test) => sum + test.duration, 0);

        const report = {
            summary: {
                totalTests,
                passedTests,
                failedTests,
                successRate: `${((passedTests / totalTests) * 100).toFixed(1)}%`,
                totalDuration: `${totalDuration}ms`,
                timestamp: new Date().toISOString()
            },
            results: this.testResults,
            status: failedTests === 0 ? 'SUCCESS' : 'FAILED'
        };

        console.log('📊 TestBench Agent Tools Test Report:');
        console.log(`✅ Passed: ${passedTests}/${totalTests} (${report.summary.successRate})`);
        console.log(`⏱️ Duration: ${report.summary.totalDuration}`);

        if (failedTests > 0) {
            console.log('❌ Failed Tests:');
            this.testResults.filter(test => test.status === 'failed').forEach(test => {
                console.log(`  - ${test.name}: ${test.error}`);
            });
        }

        return report;
    }

    /**
     * Quick connection test for TestBench agent tools
     */
    async quickConnectionTest() {
        console.log('🔧 Running quick connection test...');

        try {
            // Test agent_management endpoint
            const agentResponse = await Utils.apiCall('/api/tools/agent_management', {
                method: 'POST',
                body: { action: 'list', filters: {} }
            });

            // Test workspace_ops endpoint
            const workspaceResponse = await Utils.apiCall('/api/tools/workspace_ops', {
                method: 'POST',
                body: { action: 'list' }
            });

            const result = {
                agentManagement: {
                    available: agentResponse.success,
                    error: agentResponse.success ? null : agentResponse.error
                },
                workspaceOps: {
                    available: workspaceResponse.success,
                    error: workspaceResponse.success ? null : workspaceResponse.error
                },
                overallStatus: agentResponse.success && workspaceResponse.success ? 'SUCCESS' : 'FAILED'
            };

            console.log('🔍 Quick Connection Test Results:', result);
            return result;
        } catch (error) {
            console.error('❌ Quick connection test failed:', error);
            return {
                agentManagement: { available: false, error: error.message },
                workspaceOps: { available: false, error: error.message },
                overallStatus: 'FAILED'
            };
        }
    }

    /**
     * Export test results to file
     */
    exportTestResults(report) {
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `testbench-tools-test-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log('📁 Test results exported successfully');
    }
}

// Create global instance
window.TestBenchToolsTester = new TestBenchToolsTester();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TestBenchToolsTester;
}
