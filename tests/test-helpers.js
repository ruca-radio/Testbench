const path = require('path');
const { createError } = require('../utils/helpers');

// Mock environment variables for testing
process.env.MCP_TEST_SERVER_ENDPOINT = 'http://localhost:3001';
process.env.MCP_TEST_SERVER_API_KEY = 'test-api-key';

// Mock database functions
const mockDatabase = {
  getAllMCPServers: jest.fn(),
  getMCPServer: jest.fn(),
  saveMCPServer: jest.fn(),
  deleteMCPServer: jest.fn(),
  updateMCPServerStatus: jest.fn(),
  saveMCPServerTool: jest.fn(),
  saveMCPServerResource: jest.fn()
};

// Mock fetch responses
const mockFetchResponses = {
  success: {
    ok: true,
    status: 200,
    json: async () => ({ success: true })
  },
  error: {
    ok: false,
    status: 500,
    json: async () => ({ error: 'Server error' })
  },
  notFound: {
    ok: false,
    status: 404,
    json: async () => ({ error: 'Not found' })
  },
  badRequest: {
    ok: false,
    status: 400,
    json: async () => ({ error: 'Bad request' })
  },
  unauthorized: {
    ok: false,
    status: 401,
    json: async () => ({ error: 'Unauthorized' })
  }
};

// Mock server data
const mockServers = [
  {
    name: 'test-server',
    displayName: 'Test Server',
    endpoint: 'http://localhost:3001',
    apiKey: 'test-api-key',
    serverType: 'http',
    status: 'connected',
    capabilities: {}
  },
  {
    name: 'another-server',
    displayName: 'Another Server',
    endpoint: 'http://localhost:3002',
    apiKey: null,
    serverType: 'http',
    status: 'disconnected',
    capabilities: {}
  }
];

// Mock tools data
const mockTools = [
  {
    name: 'test-tool',
    display_name: 'Test Tool',
    description: 'A test tool',
    input_schema: { type: 'object' },
    output_schema: { type: 'object' }
  }
];

// Mock resources data
const mockResources = [
  {
    uri: 'test://resource',
    display_name: 'Test Resource',
    description: 'A test resource',
    resource_type: 'text',
    metadata: {}
  }
];

// Reset all mocks between tests
const resetMocks = () => {
  jest.clearAllMocks();
  Object.keys(mockDatabase).forEach(key => {
    mockDatabase[key].mockReset();
  });
};

module.exports = {
  mockDatabase,
  mockFetchResponses,
  mockServers,
  mockTools,
  mockResources,
  resetMocks
};