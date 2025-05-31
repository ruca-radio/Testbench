const { 
  executeMCPTool, 
  accessMCPResource, 
  fetchMCPServers, 
  getMCPServerTools, 
  getMCPServerResources, 
  checkMCPServerStatus 
} = require('../../providers/mcp');

const { createError } = require('../../utils/helpers');
const { 
  mockDatabase, 
  mockFetchResponses, 
  mockServers, 
  mockTools, 
  mockResources, 
  resetMocks 
} = require('../test-helpers');

// Mock node-fetch
jest.mock('node-fetch', () => jest.fn());
const fetch = require('node-fetch');

// Mock database
jest.mock('../../database', () => mockDatabase);

describe('MCP Provider', () => {
  beforeEach(() => {
    resetMocks();
    jest.clearAllMocks();
  });

  describe('executeMCPTool', () => {
    it('should execute a tool successfully', async () => {
      // Arrange
      const serverName = 'test-server';
      const toolName = 'test-tool';
      const arguments = { param: 'value' };
      const providerConfig = {
        'test-server': {
          endpoint: 'http://test-endpoint',
          key: 'test-key'
        }
      };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: 'success' })
      });

      // Act
      const result = await executeMCPTool(serverName, toolName, arguments, providerConfig);

      // Assert
      expect(fetch).toHaveBeenCalledWith(
        'http://test-endpoint/tools/test-tool',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-key'
          }),
          body: JSON.stringify(arguments)
        })
      );
      expect(result).toEqual({ result: 'success' });
    });

    it('should use environment variables when config is not provided', async () => {
      // Arrange
      const serverName = 'test_server';
      const toolName = 'test-tool';
      const arguments = { param: 'value' };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: 'success' })
      });

      // Act
      const result = await executeMCPTool(serverName, toolName, arguments);

      // Assert
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/tools/test-tool',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key'
          }),
          body: JSON.stringify(arguments)
        })
      );
      expect(result).toEqual({ result: 'success' });
    });

    it('should throw an error when endpoint is not configured', async () => {
      // Arrange
      const serverName = 'unknown-server';
      const toolName = 'test-tool';
      const arguments = { param: 'value' };
      
      // Act & Assert
      await expect(executeMCPTool(serverName, toolName, arguments))
        .rejects
        .toThrow('MCP server endpoint not configured for unknown-server');
    });

    it('should throw an error when the server returns an error', async () => {
      // Arrange
      const serverName = 'test-server';
      const toolName = 'test-tool';
      const arguments = { param: 'value' };
      
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' })
      });

      // Act & Assert
      await expect(executeMCPTool(serverName, toolName, arguments, {
        'test-server': { endpoint: 'http://test-endpoint' }
      }))
        .rejects
        .toThrow('Server error');
    });

    it('should handle fetch errors', async () => {
      // Arrange
      const serverName = 'test-server';
      const toolName = 'test-tool';
      const arguments = { param: 'value' };
      
      const fetchError = new Error('Network error');
      fetchError.name = 'FetchError';
      fetch.mockRejectedValueOnce(fetchError);

      // Act & Assert
      await expect(executeMCPTool(serverName, toolName, arguments, {
        'test-server': { endpoint: 'http://test-endpoint' }
      }))
        .rejects
        .toThrow('Failed to connect to MCP server test-server: Network error');
    });
  });

  describe('accessMCPResource', () => {
    it('should access a resource successfully', async () => {
      // Arrange
      const serverName = 'test-server';
      const uri = 'test://resource';
      const providerConfig = {
        'test-server': {
          endpoint: 'http://test-endpoint',
          key: 'test-key'
        }
      };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: 'resource content' })
      });

      // Act
      const result = await accessMCPResource(serverName, uri, providerConfig);

      // Assert
      expect(fetch).toHaveBeenCalledWith(
        'http://test-endpoint/resources?uri=test%3A%2F%2Fresource',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Accept': 'application/json',
            'Authorization': 'Bearer test-key'
          })
        })
      );
      expect(result).toEqual({ content: 'resource content' });
    });

    it('should use environment variables when config is not provided', async () => {
      // Arrange
      const serverName = 'test_server';
      const uri = 'test://resource';
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: 'resource content' })
      });

      // Act
      const result = await accessMCPResource(serverName, uri);

      // Assert
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/resources?uri=test%3A%2F%2Fresource',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Accept': 'application/json',
            'Authorization': 'Bearer test-api-key'
          })
        })
      );
      expect(result).toEqual({ content: 'resource content' });
    });

    it('should throw an error when endpoint is not configured', async () => {
      // Arrange
      const serverName = 'unknown-server';
      const uri = 'test://resource';
      
      // Act & Assert
      await expect(accessMCPResource(serverName, uri))
        .rejects
        .toThrow('MCP server endpoint not configured for unknown-server');
    });

    it('should throw an error when the server returns an error', async () => {
      // Arrange
      const serverName = 'test-server';
      const uri = 'test://resource';
      
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' })
      });

      // Act & Assert
      await expect(accessMCPResource(serverName, uri, {
        'test-server': { endpoint: 'http://test-endpoint' }
      }))
        .rejects
        .toThrow('Server error');
    });

    it('should handle fetch errors', async () => {
      // Arrange
      const serverName = 'test-server';
      const uri = 'test://resource';
      
      const fetchError = new Error('Network error');
      fetchError.name = 'FetchError';
      fetch.mockRejectedValueOnce(fetchError);

      // Act & Assert
      await expect(accessMCPResource(serverName, uri, {
        'test-server': { endpoint: 'http://test-endpoint' }
      }))
        .rejects
        .toThrow('Failed to connect to MCP server test-server: Network error');
    });
  });

  describe('fetchMCPServers', () => {
    it('should return an empty array by default', async () => {
      // Act
      const result = await fetchMCPServers();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getMCPServerTools', () => {
    it('should get server tools successfully', async () => {
      // Arrange
      const serverName = 'test-server';
      const providerConfig = {
        'test-server': {
          endpoint: 'http://test-endpoint',
          key: 'test-key'
        }
      };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tools: mockTools })
      });

      // Act
      const result = await getMCPServerTools(serverName, providerConfig);

      // Assert
      expect(fetch).toHaveBeenCalledWith(
        'http://test-endpoint/tools',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Accept': 'application/json',
            'Authorization': 'Bearer test-key'
          })
        })
      );
      expect(result).toEqual(mockTools);
    });

    it('should use environment variables when config is not provided', async () => {
      // Arrange
      const serverName = 'test_server';
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tools: mockTools })
      });

      // Act
      const result = await getMCPServerTools(serverName);

      // Assert
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/tools',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Accept': 'application/json',
            'Authorization': 'Bearer test-api-key'
          })
        })
      );
      expect(result).toEqual(mockTools);
    });

    it('should throw an error when endpoint is not configured', async () => {
      // Arrange
      const serverName = 'unknown-server';
      
      // Act & Assert
      await expect(getMCPServerTools(serverName))
        .rejects
        .toThrow('MCP server endpoint not configured for unknown-server');
    });

    it('should throw an error when the server returns an error', async () => {
      // Arrange
      const serverName = 'test-server';
      
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' })
      });

      // Act & Assert
      await expect(getMCPServerTools(serverName, {
        'test-server': { endpoint: 'http://test-endpoint' }
      }))
        .rejects
        .toThrow('Server error');
    });

    it('should handle fetch errors', async () => {
      // Arrange
      const serverName = 'test-server';
      
      const fetchError = new Error('Network error');
      fetchError.name = 'FetchError';
      fetch.mockRejectedValueOnce(fetchError);

      // Act & Assert
      await expect(getMCPServerTools(serverName, {
        'test-server': { endpoint: 'http://test-endpoint' }
      }))
        .rejects
        .toThrow('Failed to connect to MCP server test-server: Network error');
    });
  });

  describe('getMCPServerResources', () => {
    it('should get server resources successfully', async () => {
      // Arrange
      const serverName = 'test-server';
      const providerConfig = {
        'test-server': {
          endpoint: 'http://test-endpoint',
          key: 'test-key'
        }
      };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ resources: mockResources })
      });

      // Act
      const result = await getMCPServerResources(serverName, providerConfig);

      // Assert
      expect(fetch).toHaveBeenCalledWith(
        'http://test-endpoint/resources',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Accept': 'application/json',
            'Authorization': 'Bearer test-key'
          })
        })
      );
      expect(result).toEqual(mockResources);
    });

    it('should use environment variables when config is not provided', async () => {
      // Arrange
      const serverName = 'test_server';
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ resources: mockResources })
      });

      // Act
      const result = await getMCPServerResources(serverName);

      // Assert
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/resources',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Accept': 'application/json',
            'Authorization': 'Bearer test-api-key'
          })
        })
      );
      expect(result).toEqual(mockResources);
    });

    it('should throw an error when endpoint is not configured', async () => {
      // Arrange
      const serverName = 'unknown-server';
      
      // Act & Assert
      await expect(getMCPServerResources(serverName))
        .rejects
        .toThrow('MCP server endpoint not configured for unknown-server');
    });

    it('should throw an error when the server returns an error', async () => {
      // Arrange
      const serverName = 'test-server';
      
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' })
      });

      // Act & Assert
      await expect(getMCPServerResources(serverName, {
        'test-server': { endpoint: 'http://test-endpoint' }
      }))
        .rejects
        .toThrow('Server error');
    });

    it('should handle fetch errors', async () => {
      // Arrange
      const serverName = 'test-server';
      
      const fetchError = new Error('Network error');
      fetchError.name = 'FetchError';
      fetch.mockRejectedValueOnce(fetchError);

      // Act & Assert
      await expect(getMCPServerResources(serverName, {
        'test-server': { endpoint: 'http://test-endpoint' }
      }))
        .rejects
        .toThrow('Failed to connect to MCP server test-server: Network error');
    });
  });

  describe('checkMCPServerStatus', () => {
    it('should check server status successfully when connected', async () => {
      // Arrange
      const serverName = 'test-server';
      const providerConfig = {
        'test-server': {
          endpoint: 'http://test-endpoint',
          key: 'test-key'
        }
      };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          version: '1.0.0',
          capabilities: ['tools', 'resources']
        })
      });

      // Act
      const result = await checkMCPServerStatus(serverName, providerConfig);

      // Assert
      expect(fetch).toHaveBeenCalledWith(
        'http://test-endpoint/status',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Accept': 'application/json',
            'Authorization': 'Bearer test-key'
          }),
          timeout: 5000
        })
      );
      expect(result).toEqual({
        connected: true,
        status: 'connected',
        message: 'Server is connected and responding',
        version: '1.0.0',
        capabilities: ['tools', 'resources']
      });
    });

    it('should return unconfigured status when endpoint is not configured', async () => {
      // Arrange
      const serverName = 'unknown-server';
      
      // Act
      const result = await checkMCPServerStatus(serverName);

      // Assert
      expect(result).toEqual({
        connected: false,
        status: 'unconfigured',
        message: 'Server endpoint not configured'
      });
    });

    it('should return error status when the server returns an error', async () => {
      // Arrange
      const serverName = 'test-server';
      
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' })
      });

      // Act
      const result = await checkMCPServerStatus(serverName, {
        'test-server': { endpoint: 'http://test-endpoint' }
      });

      // Assert
      expect(result).toEqual({
        connected: false,
        status: 'error',
        message: 'Server error'
      });
    });

    it('should return unreachable status when fetch fails', async () => {
      // Arrange
      const serverName = 'test-server';
      
      const fetchError = new Error('Network error');
      fetch.mockRejectedValueOnce(fetchError);

      // Act
      const result = await checkMCPServerStatus(serverName, {
        'test-server': { endpoint: 'http://test-endpoint' }
      });

      // Assert
      expect(result).toEqual({
        connected: false,
        status: 'unreachable',
        message: 'Network error'
      });
    });
  });
});