// Model Comparison Widget - For testing and comparing different models
class ModelComparisonWidget extends BaseWidget {
    constructor(widgetData) {
        super(widgetData);
        this.models = [];
        this.testCases = [];
        this.results = new Map();
        this.metrics = {
            responseTime: true,
            tokenUsage: true,
            quality: true,
            coherence: true,
            accuracy: true
        };
    }

    async onInit() {
        // Load available models
        await this.loadModels();
        
        // Load saved test cases
        this.loadTestCases();
        
        // Render UI
        this.render();
    }

    async loadModels() {
        try {
            const response = await fetch('/api/models/refresh');
            if (response.ok) {
                const data = await response.json();
                const allModels = data.models || {};
                
                // Flatten models from all providers
                this.models = [];
                Object.entries(allModels).forEach(([provider, models]) => {
                    if (Array.isArray(models)) {
                        models.forEach(model => {
                            this.models.push({
                                id: model.id,
                                name: model.name || model.id,
                                provider: provider,
                                selected: false
                            });
                        });
                    }
                });
            }
        } catch (error) {
            console.error('Failed to load models:', error);
        }
    }

    loadTestCases() {
        // Load from localStorage
        const saved = localStorage.getItem('model_test_cases');
        if (saved) {
            this.testCases = JSON.parse(saved);
        } else {
            // Default test cases
            this.testCases = [
                {
                    id: 'tc1',
                    name: 'General Knowledge',
                    prompt: 'What is the capital of France? Provide a brief description.',
                    expectedKeywords: ['Paris', 'France', 'capital'],
                    category: 'knowledge'
                },
                {
                    id: 'tc2',
                    name: 'Code Generation',
                    prompt: 'Write a Python function to calculate fibonacci numbers',
                    expectedKeywords: ['def', 'fibonacci', 'return'],
                    category: 'coding'
                },
                {
                    id: 'tc3',
                    name: 'Creative Writing',
                    prompt: 'Write a haiku about artificial intelligence',
                    expectedKeywords: ['syllable', 'nature', 'AI'],
                    category: 'creative'
                }
            ];
        }
    }

    render() {
        this.setContent(`
            <div class="model-comparison">
                <div class="comparison-header">
                    <div class="test-controls">
                        <button class="btn primary" onclick="window.enhancedWidgetSystem.widgets.get('${this.id}').runComparison()">
                            Run Comparison
                        </button>
                        <button class="btn secondary" onclick="window.enhancedWidgetSystem.widgets.get('${this.id}').addTestCase()">
                            Add Test Case
                        </button>
                        <button class="btn secondary" onclick="window.enhancedWidgetSystem.widgets.get('${this.id}').exportResults()">
                            Export Results
                        </button>
                    </div>
                </div>

                <div class="comparison-content">
                    <div class="models-selection">
                        <h4>Select Models to Compare</h4>
                        <div class="model-checkboxes" id="model-list-${this.id}">
                            ${this.renderModelList()}
                        </div>
                    </div>

                    <div class="test-cases">
                        <h4>Test Cases</h4>
                        <div class="test-case-list" id="test-cases-${this.id}">
                            ${this.renderTestCases()}
                        </div>
                    </div>

                    <div class="metrics-selection">
                        <h4>Metrics</h4>
                        <div class="metrics-checkboxes">
                            ${Object.entries(this.metrics).map(([metric, enabled]) => `
                                <label>
                                    <input type="checkbox" 
                                           value="${metric}" 
                                           ${enabled ? 'checked' : ''}
                                           onchange="window.enhancedWidgetSystem.widgets.get('${this.id}').toggleMetric('${metric}')">
                                    ${this.formatMetricName(metric)}
                                </label>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <div class="comparison-results" id="results-${this.id}">
                    <h4>Results</h4>
                    <div class="results-placeholder">
                        <p>Run a comparison to see results</p>
                    </div>
                </div>
            </div>
        `);
    }

    renderModelList() {
        const grouped = {};
        this.models.forEach(model => {
            if (!grouped[model.provider]) {
                grouped[model.provider] = [];
            }
            grouped[model.provider].push(model);
        });

        return Object.entries(grouped).map(([provider, models]) => `
            <div class="provider-group">
                <h5>${provider}</h5>
                ${models.map(model => `
                    <label>
                        <input type="checkbox" 
                               value="${model.id}" 
                               data-provider="${model.provider}"
                               onchange="window.enhancedWidgetSystem.widgets.get('${this.id}').toggleModel('${model.id}')">
                        ${model.name}
                    </label>
                `).join('')}
            </div>
        `).join('');
    }

    renderTestCases() {
        return this.testCases.map(tc => `
            <div class="test-case-item" data-test-id="${tc.id}">
                <div class="test-case-header">
                    <span class="test-name">${tc.name}</span>
                    <span class="test-category">${tc.category}</span>
                </div>
                <div class="test-prompt">${tc.prompt}</div>
                <div class="test-actions">
                    <button class="btn small" onclick="window.enhancedWidgetSystem.widgets.get('${this.id}').editTestCase('${tc.id}')">
                        Edit
                    </button>
                    <button class="btn small danger" onclick="window.enhancedWidgetSystem.widgets.get('${this.id}').removeTestCase('${tc.id}')">
                        Remove
                    </button>
                </div>
            </div>
        `).join('');
    }

    toggleModel(modelId) {
        const model = this.models.find(m => m.id === modelId);
        if (model) {
            model.selected = !model.selected;
        }
    }

    toggleMetric(metric) {
        this.metrics[metric] = !this.metrics[metric];
    }

    async runComparison() {
        // Get selected models
        const selectedModels = this.models.filter(m => m.selected);
        if (selectedModels.length < 2) {
            Utils.showError('Please select at least 2 models to compare');
            return;
        }

        // Clear previous results
        this.results.clear();

        // Show progress
        this.showComparisonProgress();

        // Run tests for each model
        for (const model of selectedModels) {
            const modelResults = await this.testModel(model);
            this.results.set(model.id, modelResults);
        }

        // Display results
        this.displayResults();
    }

    async testModel(model) {
        const results = {
            model: model,
            testResults: [],
            aggregateMetrics: {}
        };

        for (const testCase of this.testCases) {
            const startTime = Date.now();
            
            try {
                // Send test prompt to model
                const response = await fetch('/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messages: [{ role: 'user', content: testCase.prompt }],
                        model: model.id,
                        config: { [model.provider]: {} },
                        temperature: 0.7,
                        maxTokens: 500
                    })
                });

                const endTime = Date.now();
                const data = await response.json();

                if (response.ok) {
                    const result = {
                        testCase: testCase,
                        response: data.response,
                        responseTime: endTime - startTime,
                        success: true,
                        metrics: this.calculateMetrics(data.response, testCase, endTime - startTime)
                    };
                    results.testResults.push(result);
                } else {
                    results.testResults.push({
                        testCase: testCase,
                        error: data.error,
                        success: false
                    });
                }
            } catch (error) {
                results.testResults.push({
                    testCase: testCase,
                    error: error.message,
                    success: false
                });
            }
        }

        // Calculate aggregate metrics
        results.aggregateMetrics = this.calculateAggregateMetrics(results.testResults);

        return results;
    }

    calculateMetrics(response, testCase, responseTime) {
        const metrics = {};

        if (this.metrics.responseTime) {
            metrics.responseTime = responseTime;
        }

        if (this.metrics.tokenUsage) {
            // Approximate token count
            metrics.tokenUsage = Math.ceil(response.length / 4);
        }

        if (this.metrics.quality) {
            // Simple quality score based on response length and keyword matching
            let qualityScore = 0;
            
            // Length score
            if (response.length > 50) qualityScore += 0.3;
            if (response.length > 100) qualityScore += 0.2;
            
            // Keyword matching
            if (testCase.expectedKeywords) {
                const matches = testCase.expectedKeywords.filter(keyword => 
                    response.toLowerCase().includes(keyword.toLowerCase())
                );
                qualityScore += (matches.length / testCase.expectedKeywords.length) * 0.5;
            }
            
            metrics.quality = Math.min(qualityScore, 1.0);
        }

        if (this.metrics.coherence) {
            // Simple coherence check
            const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
            metrics.coherence = sentences.length > 0 ? Math.min(sentences.length / 5, 1.0) : 0;
        }

        if (this.metrics.accuracy) {
            // Check if response contains expected content
            if (testCase.expectedKeywords) {
                const matches = testCase.expectedKeywords.filter(keyword => 
                    response.toLowerCase().includes(keyword.toLowerCase())
                );
                metrics.accuracy = matches.length / testCase.expectedKeywords.length;
            } else {
                metrics.accuracy = response.length > 20 ? 0.5 : 0;
            }
        }

        return metrics;
    }

    calculateAggregateMetrics(testResults) {
        const aggregate = {};
        const successfulTests = testResults.filter(r => r.success);

        if (successfulTests.length === 0) return aggregate;

        // Average metrics
        const metricSums = {};
        successfulTests.forEach(result => {
            Object.entries(result.metrics).forEach(([key, value]) => {
                if (!metricSums[key]) metricSums[key] = { sum: 0, count: 0 };
                metricSums[key].sum += value;
                metricSums[key].count += 1;
            });
        });

        Object.entries(metricSums).forEach(([key, data]) => {
            aggregate[key] = data.sum / data.count;
        });

        // Success rate
        aggregate.successRate = successfulTests.length / testResults.length;

        return aggregate;
    }

    showComparisonProgress() {
        const resultsDiv = document.getElementById(`results-${this.id}`);
        resultsDiv.innerHTML = `
            <h4>Results</h4>
            <div class="comparison-progress">
                <div class="spinner"></div>
                <p>Running comparison tests...</p>
            </div>
        `;
    }

    displayResults() {
        const resultsDiv = document.getElementById(`results-${this.id}`);
        
        // Create comparison table
        const models = Array.from(this.results.values());
        
        resultsDiv.innerHTML = `
            <h4>Results</h4>
            <div class="results-summary">
                <table class="comparison-table">
                    <thead>
                        <tr>
                            <th>Model</th>
                            ${Object.keys(this.metrics).filter(m => this.metrics[m]).map(metric => 
                                `<th>${this.formatMetricName(metric)}</th>`
                            ).join('')}
                            <th>Success Rate</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${models.map(result => `
                            <tr>
                                <td>${result.model.name}</td>
                                ${Object.keys(this.metrics).filter(m => this.metrics[m]).map(metric => {
                                    const value = result.aggregateMetrics[metric];
                                    return `<td>${this.formatMetricValue(metric, value)}</td>`;
                                }).join('')}
                                <td>${this.formatMetricValue('successRate', result.aggregateMetrics.successRate)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div class="detailed-results">
                <h5>Detailed Test Results</h5>
                ${this.renderDetailedResults()}
            </div>

            <div class="results-charts">
                ${this.renderCharts()}
            </div>
        `;
    }

    renderDetailedResults() {
        const accordion = Array.from(this.results.entries()).map(([modelId, result]) => `
            <details class="model-details">
                <summary>${result.model.name}</summary>
                <div class="test-responses">
                    ${result.testResults.map(tr => `
                        <div class="test-response ${tr.success ? 'success' : 'error'}">
                            <h6>${tr.testCase.name}</h6>
                            ${tr.success ? `
                                <div class="response-text">${tr.response}</div>
                                <div class="response-metrics">
                                    ${Object.entries(tr.metrics).map(([metric, value]) => 
                                        `<span>${this.formatMetricName(metric)}: ${this.formatMetricValue(metric, value)}</span>`
                                    ).join(' • ')}
                                </div>
                            ` : `
                                <div class="error-message">Error: ${tr.error}</div>
                            `}
                        </div>
                    `).join('')}
                </div>
            </details>
        `).join('');

        return `<div class="results-accordion">${accordion}</div>`;
    }

    renderCharts() {
        // Simple text-based charts for now
        const models = Array.from(this.results.values());
        
        return `
            <div class="metric-charts">
                ${Object.keys(this.metrics).filter(m => this.metrics[m]).map(metric => {
                    const maxValue = Math.max(...models.map(m => m.aggregateMetrics[metric] || 0));
                    
                    return `
                        <div class="metric-chart">
                            <h6>${this.formatMetricName(metric)}</h6>
                            <div class="bar-chart">
                                ${models.map(result => {
                                    const value = result.aggregateMetrics[metric] || 0;
                                    const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
                                    
                                    return `
                                        <div class="bar-row">
                                            <span class="bar-label">${result.model.name}</span>
                                            <div class="bar-container">
                                                <div class="bar" style="width: ${percentage}%"></div>
                                                <span class="bar-value">${this.formatMetricValue(metric, value)}</span>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    formatMetricName(metric) {
        const names = {
            responseTime: 'Response Time',
            tokenUsage: 'Token Usage',
            quality: 'Quality Score',
            coherence: 'Coherence',
            accuracy: 'Accuracy',
            successRate: 'Success Rate'
        };
        return names[metric] || metric;
    }

    formatMetricValue(metric, value) {
        if (value === undefined || value === null) return 'N/A';
        
        switch (metric) {
            case 'responseTime':
                return `${value}ms`;
            case 'tokenUsage':
                return `~${value}`;
            case 'quality':
            case 'coherence':
            case 'accuracy':
            case 'successRate':
                return `${(value * 100).toFixed(1)}%`;
            default:
                return value.toFixed(2);
        }
    }

    addTestCase() {
        const modal = document.createElement('div');
        modal.className = 'test-case-modal modal';
        modal.style.display = 'flex';
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Add Test Case</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Name:</label>
                        <input type="text" id="test-name" placeholder="Test case name">
                    </div>
                    <div class="form-group">
                        <label>Category:</label>
                        <select id="test-category">
                            <option value="knowledge">Knowledge</option>
                            <option value="coding">Coding</option>
                            <option value="creative">Creative</option>
                            <option value="reasoning">Reasoning</option>
                            <option value="custom">Custom</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Prompt:</label>
                        <textarea id="test-prompt" rows="4" placeholder="Test prompt..."></textarea>
                    </div>
                    <div class="form-group">
                        <label>Expected Keywords (comma-separated):</label>
                        <input type="text" id="test-keywords" placeholder="keyword1, keyword2, ...">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button class="btn primary" onclick="window.enhancedWidgetSystem.widgets.get('${this.id}').saveTestCase()">
                        Save Test Case
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    saveTestCase() {
        const name = document.getElementById('test-name').value;
        const category = document.getElementById('test-category').value;
        const prompt = document.getElementById('test-prompt').value;
        const keywords = document.getElementById('test-keywords').value
            .split(',')
            .map(k => k.trim())
            .filter(k => k.length > 0);
        
        if (!name || !prompt) {
            Utils.showError('Please provide a name and prompt');
            return;
        }
        
        const testCase = {
            id: `tc-${Date.now()}`,
            name,
            category,
            prompt,
            expectedKeywords: keywords
        };
        
        this.testCases.push(testCase);
        this.saveTestCases();
        
        // Update UI
        const testCasesList = document.getElementById(`test-cases-${this.id}`);
        if (testCasesList) {
            testCasesList.innerHTML = this.renderTestCases();
        }
        
        // Close modal
        document.querySelector('.test-case-modal').remove();
    }

    removeTestCase(testId) {
        this.testCases = this.testCases.filter(tc => tc.id !== testId);
        this.saveTestCases();
        
        // Update UI
        const testCasesList = document.getElementById(`test-cases-${this.id}`);
        if (testCasesList) {
            testCasesList.innerHTML = this.renderTestCases();
        }
    }

    saveTestCases() {
        localStorage.setItem('model_test_cases', JSON.stringify(this.testCases));
    }

    exportResults() {
        if (this.results.size === 0) {
            Utils.showError('No results to export');
            return;
        }
        
        const exportData = {
            timestamp: new Date().toISOString(),
            testCases: this.testCases,
            results: Array.from(this.results.entries()).map(([modelId, result]) => ({
                model: result.model,
                aggregateMetrics: result.aggregateMetrics,
                testResults: result.testResults.map(tr => ({
                    testCase: tr.testCase.name,
                    success: tr.success,
                    responseTime: tr.metrics?.responseTime,
                    metrics: tr.metrics
                }))
            }))
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `model-comparison-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        Utils.showSuccess('Results exported successfully');
    }
}

// Register widget
window.ModelComparisonWidget = ModelComparisonWidget;