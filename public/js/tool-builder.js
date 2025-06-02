// Tool Builder AI Assistant
class ToolBuilder {
    constructor() {
        this.currentTool = null;
        this.templates = this.loadTemplates();
        this.isInitialized = false;
    }

    static async init() {
        if (!window.toolBuilder) {
            window.toolBuilder = new ToolBuilder();
        }
        await window.toolBuilder.initialize();
        console.log('ToolBuilder initialized');
    }

    async initialize() {
        if (this.isInitialized) return;
        
        try {
            // Load any saved tools
            await this.loadSavedTools();
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize Tool Builder:', error);
        }
    }

    loadTemplates() {
        return {
            webScraper: {
                name: "Web Scraper",
                category: "web",
                template: {
                    id: "web-scraper",
                    name: "Web Scraper Tool",
                    version: "1.0.0",
                    description: "Extracts data from web pages",
                    category: "web",
                    requirements: {
                        runtime: "node",
                        dependencies: ["axios", "cheerio"],
                        permissions: ["network"]
                    },
                    configuration: {
                        parameters: [
                            {
                                name: "url",
                                type: "string",
                                required: true,
                                description: "URL to scrape"
                            },
                            {
                                name: "selector",
                                type: "string",
                                required: true,
                                description: "CSS selector for data extraction"
                            }
                        ]
                    }
                }
            },
            dataTransformer: {
                name: "Data Transformer",
                category: "data",
                template: {
                    id: "data-transformer",
                    name: "Data Transformer Tool",
                    version: "1.0.0",
                    description: "Transforms data between formats",
                    category: "data",
                    requirements: {
                        runtime: "node",
                        dependencies: [],
                        permissions: []
                    },
                    configuration: {
                        parameters: [
                            {
                                name: "input",
                                type: "object",
                                required: true,
                                description: "Input data"
                            },
                            {
                                name: "format",
                                type: "string",
                                required: true,
                                description: "Output format",
                                validation: {
                                    enum: ["json", "csv", "xml", "yaml"]
                                }
                            }
                        ]
                    }
                }
            },
            apiIntegration: {
                name: "API Integration",
                category: "integration",
                template: {
                    id: "api-integration",
                    name: "API Integration Tool",
                    version: "1.0.0",
                    description: "Integrates with external APIs",
                    category: "integration",
                    requirements: {
                        runtime: "node",
                        dependencies: ["axios"],
                        permissions: ["network"]
                    },
                    configuration: {
                        parameters: [
                            {
                                name: "endpoint",
                                type: "string",
                                required: true,
                                description: "API endpoint URL"
                            },
                            {
                                name: "method",
                                type: "string",
                                required: true,
                                description: "HTTP method",
                                validation: {
                                    enum: ["GET", "POST", "PUT", "DELETE"]
                                }
                            },
                            {
                                name: "headers",
                                type: "object",
                                required: false,
                                description: "Request headers"
                            },
                            {
                                name: "body",
                                type: "object",
                                required: false,
                                description: "Request body"
                            }
                        ],
                        secrets: [
                            {
                                name: "API_KEY",
                                description: "API key for authentication",
                                required: false
                            }
                        ]
                    }
                }
            }
        };
    }

    async loadSavedTools() {
        try {
            const response = await fetch('/api/tools/list/custom');
            if (response.ok) {
                const data = await response.json();
                this.savedTools = data.tools || [];
            }
        } catch (error) {
            console.error('Error loading saved tools:', error);
            this.savedTools = [];
        }
    }

    // Create tool builder UI
    static createToolBuilderUI() {
        return `
        <div class="tool-builder-container">
            <h3>AI Tool Builder</h3>
            <p class="description">Create custom tools with AI assistance</p>
            
            <div class="tool-builder-chat">
                <div class="chat-messages" id="tool-builder-messages">
                    <div class="welcome-message">
                        <div class="assistant-avatar">🛠️</div>
                        <div class="message-content">
                            <p><strong>Tool Builder Assistant</strong></p>
                            <p>I can help you create custom tools for your AI agents. Describe what kind of tool you need, and I'll help you build it!</p>
                            <p>For example:</p>
                            <ul>
                                <li>"I need a tool to extract email addresses from text"</li>
                                <li>"Create a tool that converts CSV to JSON"</li>
                                <li>"Build a tool to fetch weather data for a city"</li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div class="chat-input-container">
                    <input type="text" id="tool-builder-input" placeholder="Describe the tool you want to create..."
                           onkeypress="ToolBuilder.handleChatKeyPress(event)">
                    <button class="btn primary" onclick="ToolBuilder.sendMessage()">Create Tool</button>
                </div>
            </div>
            
            <div class="tool-templates">
                <h4>Quick Start Templates</h4>
                <div class="template-grid">
                    <div class="template-item" onclick="ToolBuilder.useTemplate('webScraper')">
                        <div class="template-icon">🌐</div>
                        <h5>Web Scraper</h5>
                        <p>Extract data from websites</p>
                    </div>
                    <div class="template-item" onclick="ToolBuilder.useTemplate('dataTransformer')">
                        <div class="template-icon">🔄</div>
                        <h5>Data Transformer</h5>
                        <p>Convert between formats</p>
                    </div>
                    <div class="template-item" onclick="ToolBuilder.useTemplate('apiIntegration')">
                        <div class="template-icon">🔌</div>
                        <h5>API Integration</h5>
                        <p>Connect to external APIs</p>
                    </div>
                </div>
            </div>
            
            <div class="current-tool" id="current-tool-workspace" style="display: none;">
                <h4>Tool Workspace</h4>
                <div class="tool-editor">
                    <div class="tool-definition">
                        <h5>Tool Definition</h5>
                        <pre id="tool-definition-json"></pre>
                    </div>
                    <div class="tool-implementation">
                        <h5>Implementation</h5>
                        <textarea id="tool-implementation-code" rows="20"></textarea>
                    </div>
                </div>
                <div class="tool-actions">
                    <button class="btn secondary" onclick="ToolBuilder.testTool()">Test Tool</button>
                    <button class="btn primary" onclick="ToolBuilder.saveTool()">Save Tool</button>
                    <button class="btn" onclick="ToolBuilder.exportTool()">Export</button>
                </div>
            </div>
            
            <div class="saved-tools">
                <h4>Your Tools</h4>
                <div id="saved-tools-list" class="tools-list">
                    <p class="empty-state">No custom tools yet</p>
                </div>
            </div>
        </div>
        `;
    }

    static handleChatKeyPress(event) {
        if (event.key === 'Enter') {
            ToolBuilder.sendMessage();
        }
    }

    static async sendMessage() {
        const input = document.getElementById('tool-builder-input');
        if (!input || !input.value.trim()) return;

        const message = input.value.trim();
        input.value = '';

        // Add user message to chat
        ToolBuilder.addChatMessage('user', message);

        try {
            // Send to tool builder endpoint
            const response = await fetch('/api/tools/builder/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    description: message,
                    context: 'tool-creation'
                })
            });

            if (response.ok) {
                const data = await response.json();
                ToolBuilder.addChatMessage('assistant', data.message);
                
                if (data.tool) {
                    window.toolBuilder.currentTool = data.tool;
                    ToolBuilder.displayTool(data.tool);
                }
            } else {
                throw new Error('Failed to generate tool');
            }
        } catch (error) {
            console.error('Error generating tool:', error);
            // Fallback to client-side tool generation
            ToolBuilder.generateToolLocally(message);
        }
    }

    static addChatMessage(sender, content) {
        const messagesContainer = document.getElementById('tool-builder-messages');
        if (!messagesContainer) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;

        if (sender === 'assistant') {
            messageDiv.innerHTML = `
                <div class="assistant-avatar">🛠️</div>
                <div class="message-content">
                    <p>${content}</p>
                </div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="message-content user-content">
                    <p>${content}</p>
                </div>
            `;
        }

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    static generateToolLocally(description) {
        const lowerDesc = description.toLowerCase();
        let tool = null;

        // Pattern matching for common tool requests
        if (lowerDesc.includes('email') && (lowerDesc.includes('extract') || lowerDesc.includes('find'))) {
            tool = ToolBuilder.createEmailExtractorTool();
        } else if (lowerDesc.includes('csv') && lowerDesc.includes('json')) {
            tool = ToolBuilder.createCSVToJSONTool();
        } else if (lowerDesc.includes('weather')) {
            tool = ToolBuilder.createWeatherTool();
        } else if (lowerDesc.includes('translate')) {
            tool = ToolBuilder.createTranslationTool();
        } else {
            // Generic tool based on description
            tool = ToolBuilder.createGenericTool(description);
        }

        if (tool) {
            window.toolBuilder.currentTool = tool;
            ToolBuilder.displayTool(tool);
            ToolBuilder.addChatMessage('assistant', 
                `I've created a ${tool.definition.name} tool for you. You can modify the definition and implementation as needed.`);
        }
    }

    static createEmailExtractorTool() {
        return {
            definition: {
                id: "email-extractor",
                name: "Email Extractor",
                version: "1.0.0",
                description: "Extracts email addresses from text",
                category: "data",
                requirements: {
                    runtime: "node",
                    dependencies: [],
                    permissions: []
                },
                configuration: {
                    parameters: [{
                        name: "text",
                        type: "string",
                        required: true,
                        description: "Text to extract emails from"
                    }]
                },
                interface: {
                    input: {
                        type: "object",
                        properties: {
                            text: { type: "string", description: "Input text" }
                        }
                    },
                    output: {
                        type: "object",
                        properties: {
                            emails: { type: "array", description: "Extracted email addresses" },
                            count: { type: "number", description: "Number of emails found" }
                        }
                    }
                }
            },
            implementation: `class EmailExtractor {
    constructor(config = {}) {
        this.config = config;
        this.name = "Email Extractor";
        this.version = "1.0.0";
    }

    async execute(input) {
        try {
            if (!input.text) {
                throw new Error("Text parameter is required");
            }

            // Email regex pattern
            const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}/g;
            
            // Extract emails
            const emails = input.text.match(emailRegex) || [];
            
            // Remove duplicates
            const uniqueEmails = [...new Set(emails)];

            return {
                success: true,
                result: {
                    emails: uniqueEmails,
                    count: uniqueEmails.length
                },
                metadata: {
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                metadata: {
                    timestamp: new Date().toISOString()
                }
            };
        }
    }
}

module.exports = EmailExtractor;`
        };
    }

    static createCSVToJSONTool() {
        return {
            definition: {
                id: "csv-to-json",
                name: "CSV to JSON Converter",
                version: "1.0.0",
                description: "Converts CSV data to JSON format",
                category: "data",
                requirements: {
                    runtime: "node",
                    dependencies: [],
                    permissions: []
                },
                configuration: {
                    parameters: [{
                        name: "csv",
                        type: "string",
                        required: true,
                        description: "CSV data to convert"
                    }, {
                        name: "hasHeaders",
                        type: "boolean",
                        required: false,
                        default: true,
                        description: "Whether the first row contains headers"
                    }]
                }
            },
            implementation: `class CSVToJSON {
    constructor(config = {}) {
        this.config = config;
        this.name = "CSV to JSON Converter";
        this.version = "1.0.0";
    }

    async execute(input) {
        try {
            if (!input.csv) {
                throw new Error("CSV parameter is required");
            }

            const hasHeaders = input.hasHeaders !== false;
            const lines = input.csv.trim().split('\\n');
            
            if (lines.length === 0) {
                return {
                    success: true,
                    result: [],
                    metadata: { timestamp: new Date().toISOString() }
                };
            }

            const headers = hasHeaders ? 
                lines[0].split(',').map(h => h.trim()) : 
                Array.from({length: lines[0].split(',').length}, (_, i) => \`column\${i + 1}\`);
            
            const startIndex = hasHeaders ? 1 : 0;
            const result = [];

            for (let i = startIndex; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim());
                const obj = {};
                
                headers.forEach((header, index) => {
                    obj[header] = values[index] || '';
                });
                
                result.push(obj);
            }

            return {
                success: true,
                result: result,
                metadata: {
                    timestamp: new Date().toISOString(),
                    rowCount: result.length,
                    columnCount: headers.length
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                metadata: {
                    timestamp: new Date().toISOString()
                }
            };
        }
    }
}

module.exports = CSVToJSON;`
        };
    }

    static createWeatherTool() {
        return {
            definition: {
                id: "weather-fetcher",
                name: "Weather Fetcher",
                version: "1.0.0",
                description: "Fetches weather data for a location",
                category: "web",
                requirements: {
                    runtime: "node",
                    dependencies: ["axios"],
                    permissions: ["network"]
                },
                configuration: {
                    parameters: [{
                        name: "location",
                        type: "string",
                        required: true,
                        description: "City name or coordinates"
                    }],
                    secrets: [{
                        name: "WEATHER_API_KEY",
                        description: "API key for weather service",
                        required: true
                    }]
                }
            },
            implementation: `class WeatherFetcher {
    constructor(config = {}) {
        this.config = config;
        this.name = "Weather Fetcher";
        this.version = "1.0.0";
    }

    async execute(input) {
        try {
            if (!input.location) {
                throw new Error("Location parameter is required");
            }

            if (!this.config.secrets?.WEATHER_API_KEY) {
                throw new Error("Weather API key is required");
            }

            const axios = require('axios');
            const apiKey = this.config.secrets.WEATHER_API_KEY;
            const location = encodeURIComponent(input.location);
            
            // Example using OpenWeatherMap API
            const url = \`https://api.openweathermap.org/data/2.5/weather?q=\${location}&appid=\${apiKey}&units=metric\`;
            
            const response = await axios.get(url);
            const data = response.data;

            return {
                success: true,
                result: {
                    location: data.name,
                    country: data.sys.country,
                    temperature: data.main.temp,
                    feels_like: data.main.feels_like,
                    humidity: data.main.humidity,
                    description: data.weather[0].description,
                    wind_speed: data.wind.speed
                },
                metadata: {
                    timestamp: new Date().toISOString(),
                    source: 'OpenWeatherMap'
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                metadata: {
                    timestamp: new Date().toISOString()
                }
            };
        }
    }
}

module.exports = WeatherFetcher;`
        };
    }

    static createGenericTool(description) {
        const toolName = description.split(' ').slice(0, 3).join(' ');
        const toolId = toolName.toLowerCase().replace(/\s+/g, '-');

        return {
            definition: {
                id: toolId,
                name: toolName,
                version: "1.0.0",
                description: description,
                category: "custom",
                requirements: {
                    runtime: "node",
                    dependencies: [],
                    permissions: []
                },
                configuration: {
                    parameters: [{
                        name: "input",
                        type: "object",
                        required: true,
                        description: "Input data for processing"
                    }]
                }
            },
            implementation: `class ${toolName.replace(/\s+/g, '')} {
    constructor(config = {}) {
        this.config = config;
        this.name = "${toolName}";
        this.version = "1.0.0";
    }

    async execute(input) {
        try {
            if (!input.input) {
                throw new Error("Input parameter is required");
            }

            // TODO: Implement your tool logic here
            // This is a template that you can modify
            
            const result = {
                processed: true,
                data: input.input,
                // Add your processing logic here
            };

            return {
                success: true,
                result: result,
                metadata: {
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                metadata: {
                    timestamp: new Date().toISOString()
                }
            };
        }
    }
}

module.exports = ${toolName.replace(/\s+/g, '')};`
        };
    }

    static displayTool(tool) {
        const workspace = document.getElementById('current-tool-workspace');
        const definitionEl = document.getElementById('tool-definition-json');
        const implementationEl = document.getElementById('tool-implementation-code');

        if (workspace) {
            workspace.style.display = 'block';
        }

        if (definitionEl) {
            definitionEl.textContent = JSON.stringify(tool.definition, null, 2);
        }

        if (implementationEl) {
            implementationEl.value = tool.implementation;
        }
    }

    static useTemplate(templateName) {
        const template = window.toolBuilder.templates[templateName];
        if (!template) return;

        let implementation = '';
        switch (templateName) {
            case 'webScraper':
                implementation = ToolBuilder.getWebScraperImplementation();
                break;
            case 'dataTransformer':
                implementation = ToolBuilder.getDataTransformerImplementation();
                break;
            case 'apiIntegration':
                implementation = ToolBuilder.getAPIIntegrationImplementation();
                break;
        }

        const tool = {
            definition: template.template,
            implementation: implementation
        };

        window.toolBuilder.currentTool = tool;
        ToolBuilder.displayTool(tool);
        ToolBuilder.addChatMessage('assistant', 
            `I've loaded the ${template.name} template. You can customize it to fit your needs.`);
    }

    static getWebScraperImplementation() {
        return `class WebScraper {
    constructor(config = {}) {
        this.config = config;
        this.name = "Web Scraper Tool";
        this.version = "1.0.0";
    }

    async execute(input) {
        try {
            if (!input.url) {
                throw new Error("URL parameter is required");
            }
            if (!input.selector) {
                throw new Error("Selector parameter is required");
            }

            const axios = require('axios');
            const cheerio = require('cheerio');

            // Fetch the webpage
            const response = await axios.get(input.url);
            const $ = cheerio.load(response.data);

            // Extract data using the selector
            const results = [];
            $(input.selector).each((index, element) => {
                results.push({
                    text: $(element).text().trim(),
                    html: $(element).html(),
                    attributes: element.attribs
                });
            });

            return {
                success: true,
                result: {
                    url: input.url,
                    selector: input.selector,
                    count: results.length,
                    data: results
                },
                metadata: {
                    timestamp: new Date().toISOString(),
                    statusCode: response.status
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                metadata: {
                    timestamp: new Date().toISOString()
                }
            };
        }
    }
}

module.exports = WebScraper;`;
    }

    static getDataTransformerImplementation() {
        return `class DataTransformer {
    constructor(config = {}) {
        this.config = config;
        this.name = "Data Transformer Tool";
        this.version = "1.0.0";
    }

    async execute(input) {
        try {
            if (!input.input) {
                throw new Error("Input data is required");
            }
            if (!input.format) {
                throw new Error("Output format is required");
            }

            let result;
            const data = input.input;

            switch (input.format.toLowerCase()) {
                case 'json':
                    result = JSON.stringify(data, null, 2);
                    break;
                
                case 'csv':
                    result = this.toCSV(data);
                    break;
                
                case 'xml':
                    result = this.toXML(data);
                    break;
                
                case 'yaml':
                    result = this.toYAML(data);
                    break;
                
                default:
                    throw new Error(\`Unsupported format: \${input.format}\`);
            }

            return {
                success: true,
                result: {
                    format: input.format,
                    data: result
                },
                metadata: {
                    timestamp: new Date().toISOString(),
                    inputType: typeof data,
                    outputFormat: input.format
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                metadata: {
                    timestamp: new Date().toISOString()
                }
            };
        }
    }

    toCSV(data) {
        if (Array.isArray(data) && data.length > 0) {
            const headers = Object.keys(data[0]);
            const csv = [
                headers.join(','),
                ...data.map(row => 
                    headers.map(header => 
                        JSON.stringify(row[header] || '')
                    ).join(',')
                )
            ].join('\\n');
            return csv;
        }
        return '';
    }

    toXML(data, rootName = 'root') {
        const toXMLString = (obj, name) => {
            if (Array.isArray(obj)) {
                return obj.map(item => toXMLString(item, 'item')).join('');
            } else if (typeof obj === 'object' && obj !== null) {
                const attrs = Object.entries(obj)
                    .map(([key, value]) => \`<\${key}>\${toXMLString(value, key)}</\${key}>\`)
                    .join('');
                return \`<\${name}>\${attrs}</\${name}>\`;
            }
            return obj;
        };
        
        return \`<?xml version="1.0" encoding="UTF-8"?>\\n\${toXMLString(data, rootName)}\`;
    }

    toYAML(data, indent = 0) {
        const spaces = ' '.repeat(indent);
        
        if (Array.isArray(data)) {
            return data.map(item => \`\${spaces}- \${this.toYAML(item, indent + 2)}\`).join('\\n');
        } else if (typeof data === 'object' && data !== null) {
            return Object.entries(data)
                .map(([key, value]) => {
                    if (typeof value === 'object') {
                        return \`\${spaces}\${key}:\\n\${this.toYAML(value, indent + 2)}\`;
                    }
                    return \`\${spaces}\${key}: \${value}\`;
                })
                .join('\\n');
        }
        return data;
    }
}

module.exports = DataTransformer;`;
    }

    static getAPIIntegrationImplementation() {
        return `class APIIntegration {
    constructor(config = {}) {
        this.config = config;
        this.name = "API Integration Tool";
        this.version = "1.0.0";
    }

    async execute(input) {
        try {
            if (!input.endpoint) {
                throw new Error("Endpoint parameter is required");
            }
            if (!input.method) {
                throw new Error("Method parameter is required");
            }

            const axios = require('axios');
            
            // Build request configuration
            const requestConfig = {
                url: input.endpoint,
                method: input.method.toUpperCase(),
                headers: input.headers || {}
            };

            // Add API key if provided
            if (this.config.secrets?.API_KEY) {
                requestConfig.headers['Authorization'] = \`Bearer \${this.config.secrets.API_KEY}\`;
            }

            // Add body for POST/PUT requests
            if (['POST', 'PUT', 'PATCH'].includes(requestConfig.method) && input.body) {
                requestConfig.data = input.body;
            }

            // Make the request
            const response = await axios(requestConfig);

            return {
                success: true,
                result: {
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers,
                    data: response.data
                },
                metadata: {
                    timestamp: new Date().toISOString(),
                    method: input.method,
                    endpoint: input.endpoint
                }
            };
        } catch (error) {
            const errorDetails = error.response ? {
                status: error.response.status,
                statusText: error.response.statusText,
                data: error.response.data
            } : {
                message: error.message
            };

            return {
                success: false,
                error: error.message,
                errorDetails: errorDetails,
                metadata: {
                    timestamp: new Date().toISOString(),
                    method: input.method,
                    endpoint: input.endpoint
                }
            };
        }
    }
}

module.exports = APIIntegration;`;
    }

    static async testTool() {
        if (!window.toolBuilder.currentTool) {
            Utils.showError('No tool to test');
            return;
        }

        const testInput = prompt('Enter test input (JSON format):');
        if (!testInput) return;

        try {
            const input = JSON.parse(testInput);
            
            // Show test is running
            Utils.showInfo('Testing tool...');

            // In a real implementation, this would send to backend for execution
            // For now, we'll simulate the test
            setTimeout(() => {
                const mockResult = {
                    success: true,
                    result: {
                        message: "Tool test completed successfully",
                        input: input,
                        output: "Mock output data"
                    },
                    metadata: {
                        timestamp: new Date().toISOString(),
                        executionTime: "123ms"
                    }
                };

                Utils.showModal('Tool Test Results', `
                    <pre>${JSON.stringify(mockResult, null, 2)}</pre>
                `);
            }, 1000);

        } catch (error) {
            Utils.showError('Invalid JSON input');
        }
    }

    static async saveTool() {
        if (!window.toolBuilder.currentTool) {
            Utils.showError('No tool to save');
            return;
        }

        try {
            const response = await fetch('/api/tools/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tool: window.toolBuilder.currentTool
                })
            });

            if (response.ok) {
                Utils.showSuccess('Tool saved successfully');
                await window.toolBuilder.loadSavedTools();
                ToolBuilder.updateSavedToolsList();
            } else {
                throw new Error('Failed to save tool');
            }
        } catch (error) {
            // Fallback to local storage
            const tools = JSON.parse(localStorage.getItem('custom_tools') || '[]');
            tools.push(window.toolBuilder.currentTool);
            localStorage.setItem('custom_tools', JSON.stringify(tools));
            
            Utils.showSuccess('Tool saved locally');
            window.toolBuilder.savedTools = tools;
            ToolBuilder.updateSavedToolsList();
        }
    }

    static exportTool() {
        if (!window.toolBuilder.currentTool) {
            Utils.showError('No tool to export');
            return;
        }

        const tool = window.toolBuilder.currentTool;
        const exportData = {
            version: "1.0",
            tool: tool,
            exported: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${tool.definition.id}-tool.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        Utils.showSuccess('Tool exported successfully');
    }

    static updateSavedToolsList() {
        const listEl = document.getElementById('saved-tools-list');
        if (!listEl) return;

        const tools = window.toolBuilder.savedTools || [];
        
        if (tools.length === 0) {
            listEl.innerHTML = '<p class="empty-state">No custom tools yet</p>';
            return;
        }

        listEl.innerHTML = tools.map((tool, index) => `
            <div class="saved-tool-item">
                <div class="tool-info">
                    <h5>${tool.definition.name}</h5>
                    <p>${tool.definition.description}</p>
                    <span class="tool-category">${tool.definition.category}</span>
                </div>
                <div class="tool-actions">
                    <button class="btn small" onclick="ToolBuilder.loadTool(${index})">Load</button>
                    <button class="btn small" onclick="ToolBuilder.deleteTool(${index})">Delete</button>
                </div>
            </div>
        `).join('');
    }

    static loadTool(index) {
        const tools = window.toolBuilder.savedTools || [];
        if (index >= 0 && index < tools.length) {
            window.toolBuilder.currentTool = tools[index];
            ToolBuilder.displayTool(tools[index]);
            Utils.showSuccess('Tool loaded');
        }
    }

    static deleteTool(index) {
        if (!confirm('Are you sure you want to delete this tool?')) return;

        const tools = window.toolBuilder.savedTools || [];
        if (index >= 0 && index < tools.length) {
            tools.splice(index, 1);
            window.toolBuilder.savedTools = tools;
            
            // Update local storage
            localStorage.setItem('custom_tools', JSON.stringify(tools));
            
            ToolBuilder.updateSavedToolsList();
            Utils.showSuccess('Tool deleted');
        }
    }

    static createTranslationTool() {
        return {
            definition: {
                id: "text-translator",
                name: "Text Translator",
                version: "1.0.0",
                description: "Translates text between languages",
                category: "data",
                requirements: {
                    runtime: "node",
                    dependencies: ["axios"],
                    permissions: ["network"]
                },
                configuration: {
                    parameters: [{
                        name: "text",
                        type: "string",
                        required: true,
                        description: "Text to translate"
                    }, {
                        name: "targetLanguage",
                        type: "string",
                        required: true,
                        description: "Target language code (e.g., 'es', 'fr', 'de')"
                    }, {
                        name: "sourceLanguage",
                        type: "string",
                        required: false,
                        default: "auto",
                        description: "Source language code or 'auto' for detection"
                    }]
                }
            },
            implementation: `class TextTranslator {
    constructor(config = {}) {
        this.config = config;
        this.name = "Text Translator";
        this.version = "1.0.0";
    }

    async execute(input) {
        try {
            if (!input.text) {
                throw new Error("Text parameter is required");
            }
            if (!input.targetLanguage) {
                throw new Error("Target language is required");
            }

            // This is a mock implementation
            // In production, you would use a translation API like Google Translate or DeepL
            
            const mockTranslations = {
                'es': {
                    'hello': 'hola',
                    'world': 'mundo',
                    'how are you': 'cómo estás'
                },
                'fr': {
                    'hello': 'bonjour',
                    'world': 'monde',
                    'how are you': 'comment allez-vous'
                },
                'de': {
                    'hello': 'hallo',
                    'world': 'welt',
                    'how are you': 'wie geht es dir'
                }
            };

            const targetLang = input.targetLanguage.toLowerCase();
            const textLower = input.text.toLowerCase();
            
            let translatedText = input.text;
            
            if (mockTranslations[targetLang] && mockTranslations[targetLang][textLower]) {
                translatedText = mockTranslations[targetLang][textLower];
            } else {
                // Simulate translation by adding language prefix
                translatedText = \`[\${targetLang}] \${input.text}\`;
            }

            return {
                success: true,
                result: {
                    originalText: input.text,
                    translatedText: translatedText,
                    sourceLanguage: input.sourceLanguage || 'auto',
                    targetLanguage: input.targetLanguage,
                    confidence: 0.95
                },
                metadata: {
                    timestamp: new Date().toISOString(),
                    translationService: 'mock'
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                metadata: {
                    timestamp: new Date().toISOString()
                }
            };
        }
    }
}

module.exports = TextTranslator;`
        };
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    // Load saved tools from local storage on startup
    const savedTools = JSON.parse(localStorage.getItem('custom_tools') || '[]');
    if (window.toolBuilder) {
        window.toolBuilder.savedTools = savedTools;
    }
});

// Export for global access
window.ToolBuilder = ToolBuilder;