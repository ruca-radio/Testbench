const request = require('supertest');
const express = require('express');

// Mock database - must be done before requiring routes
jest.mock('../../database', () => require('../test-helpers').mockDatabase);

// Mock MCP provider functions
jest.mock('../../providers/mcp', () => ({
  executeMCPTool: jest.fn(),
  accessMCPResource: jest.fn(),
  fetchMCPServers: jest.fn(),
  getMCPServerTools: jest.fn(),
  getMCPServerResources: jest.fn(),
  checkMCPServerStatus: jest.fn()
}));

// Now require everything after mocks are set up
const mcpRoutes = require('../../routes/mcp');
const mcpProvider = require('../../providers/mcp');
const {
  mockDatabase,
  mockServers,
  mockTools,
  mockResources,
  resetMocks
} = require('../test-helpers');

// Create Express app for testing
const app = express();
app.use(express.json());
app.use(mcpRoutes);

describe('MCP Routes', () => {
  beforeEach(() => {
    resetMocks();
    jest.clearAllMocks();
  });

  describe('GET /api/mcp/servers', () => {
    it('should return all MCP servers with masked API keys', async () => {
      // Arrange
      mockDatabase.getAllMCPServers.mockReturnValue(mockServers);

      // Act
      const response = await request(app)
        .get('/api/mcp/servers')
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      expect(mockDatabase.getAllMCPServers).toHaveBeenCalled();
      expect(response.body).toHaveProperty('servers');
      expect(response.body.servers).toHaveLength(mockServers.length);

      // Check that API keys are masked
      response.body.servers.forEach(server => {
        if (server.apiKey) {
          expect(server.apiKey).toBe('••••••');
        }
      });
    });

    it('should handle errors', async () => {
      // Arrange
      const errorMessage = 'Database error';
      mockDatabase.getAllMCPServers.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      // Act
      const response = await request(app)
        .get('/api/mcp/servers')
        .expect('Content-Type', /json/)
        .expect(500);

      // Assert
      expect(response.body).toHaveProperty('error', errorMessage);
    });
  });

  describe('GET /api/mcp/servers/:name', () => {
    it('should return a specific MCP server with masked API key', async () => {
      // Arrange
      const serverName = 'test-server';
      mockDatabase.getMCPServer.mockReturnValue(mockServers[0]);

      // Act
      const response = await request(app)
        .get(`/api/mcp/servers/${serverName}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      expect(mockDatabase.getMCPServer).toHaveBeenCalledWith(serverName);
      expect(response.body).toHaveProperty('server');
      expect(response.body.server.name).toBe(serverName);

      // Check that API key is masked
      if (response.body.server.apiKey) {
        expect(response.body.server.apiKey).toBe('••••••');
      }
    });

    it('should return 404 when server is not found', async () => {
      // Arrange
      const serverName = 'non-existent-server';
      mockDatabase.getMCPServer.mockReturnValue(null);

      // Act
      const response = await request(app)
        .get(`/api/mcp/servers/${serverName}`)
        .expect('Content-Type', /json/)
        .expect(404);

      // Assert
      expect(response.body).toHaveProperty('error', `MCP server '${serverName}' not found`);
    });

    it('should handle errors', async () => {
      // Arrange
      const serverName = 'test-server';
      const errorMessage = 'Database error';
      mockDatabase.getMCPServer.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      // Act
      const response = await request(app)
        .get(`/api/mcp/servers/${serverName}`)
        .expect('Content-Type', /json/)
        .expect(500);

      // Assert
      expect(response.body).toHaveProperty('error', errorMessage);
    });
  });

  describe('POST /api/mcp/servers', () => {
    it('should create a new MCP server', async () => {
      // Arrange
      const newServer = {
        name: 'new-server',
        displayName: 'New Server',
        endpoint: 'http://localhost:3003',
        apiKey: 'new-api-key',
        serverType: 'http'
      };

      // Act
      const response = await request(app)
        .post('/api/mcp/servers')
        .send({ server: newServer })
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      expect(mockDatabase.saveMCPServer).toHaveBeenCalledWith(expect.objectContaining({
        name: newServer.name,
        displayName: newServer.displayName,
        endpoint: newServer.endpoint,
        apiKey: newServer.apiKey,
        serverType: newServer.serverType,
        status: 'disconnected'
      }));

      expect(response.body).toHaveProperty('message', `MCP server '${newServer.name}' saved successfully`);
      expect(response.body).toHaveProperty('server');
      expect(response.body.server.name).toBe(newServer.name);

      // Check that API key is masked in response
      expect(response.body.server.apiKey).toBe('••••••');
    });

    it('should return 400 when required fields are missing', async () => {
      // Arrange
      const invalidServer = {
        name: 'invalid-server'
        // Missing required fields
      };

      // Act
      const response = await request(app)
        .post('/api/mcp/servers')
        .send({ server: invalidServer })
        .expect('Content-Type', /json/)
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid server data');
      expect(mockDatabase.saveMCPServer).not.toHaveBeenCalled();
    });

    it('should return 400 when server name is invalid', async () => {
      // Arrange
      const invalidServer = {
        name: 'invalid server name!',
        displayName: 'Invalid Server',
        endpoint: 'http://localhost:3003',
        serverType: 'http'
      };

      // Act
      const response = await request(app)
        .post('/api/mcp/servers')
        .send({ server: invalidServer })
        .expect('Content-Type', /json/)
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Server name must contain only letters');
      expect(mockDatabase.saveMCPServer).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      // Arrange
      const newServer = {
        name: 'new-server',
        displayName: 'New Server',
        endpoint: 'http://localhost:3003',
        apiKey: 'new-api-key',
        serverType: 'http'
      };

      const errorMessage = 'Database error';
      mockDatabase.saveMCPServer.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      // Act
      const response = await request(app)
        .post('/api/mcp/servers')
        .send({ server: newServer })
        .expect('Content-Type', /json/)
        .expect(500);

      // Assert
      expect(response.body).toHaveProperty('error', errorMessage);
    });
  });

  describe('DELETE /api/mcp/servers/:name', () => {
    it('should delete an MCP server', async () => {
      // Arrange
      const serverName = 'test-server';
      mockDatabase.getMCPServer.mockReturnValue(mockServers[0]);

      // Act
      const response = await request(app)
        .delete(`/api/mcp/servers/${serverName}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      expect(mockDatabase.getMCPServer).toHaveBeenCalledWith(serverName);
      expect(mockDatabase.deleteMCPServer).toHaveBeenCalledWith(serverName);
      expect(response.body).toHaveProperty('message', `MCP server '${serverName}' deleted successfully`);
    });

    it('should return 404 when server is not found', async () => {
      // Arrange
      const serverName = 'non-existent-server';
      mockDatabase.getMCPServer.mockReturnValue(null);

      // Act
      const response = await request(app)
        .delete(`/api/mcp/servers/${serverName}`)
        .expect('Content-Type', /json/)
        .expect(404);

      // Assert
      expect(response.body).toHaveProperty('error', `MCP server '${serverName}' not found`);
      expect(mockDatabase.deleteMCPServer).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      // Arrange
      const serverName = 'test-server';
      mockDatabase.getMCPServer.mockReturnValue(mockServers[0]);

      const errorMessage = 'Database error';
      mockDatabase.deleteMCPServer.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      // Act
      const response = await request(app)
        .delete(`/api/mcp/servers/${serverName}`)
        .expect('Content-Type', /json/)
        .expect(500);

      // Assert
      expect(response.body).toHaveProperty('error', errorMessage);
    });
  });

  describe('POST /api/mcp/servers/:name/status', () => {
    it('should check server status and update it in the database when connected', async () => {
      // Arrange
      const serverName = 'test-server';
      mockDatabase.getMCPServer.mockReturnValue(mockServers[0]);

      const statusResponse = {
        connected: true,
        status: 'connected',
        message: 'Server is connected and responding',
        version: '1.0.0',
        capabilities: ['tools', 'resources']
      };

      mcpProvider.checkMCPServerStatus.mockResolvedValue(statusResponse);

      // Act
      const response = await request(app)
        .post(`/api/mcp/servers/${serverName}/status`)
        .send({ config: {} })
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      expect(mcpProvider.checkMCPServerStatus).toHaveBeenCalledWith(serverName, {});
      expect(mockDatabase.updateMCPServerStatus).toHaveBeenCalledWith(
        serverName,
        'connected',
        statusResponse.capabilities
      );
      expect(response.body).toHaveProperty('status', statusResponse);
    });

    it('should check server status and update it in the database when disconnected', async () => {
      // Arrange
      const serverName = 'test-server';
      mockDatabase.getMCPServer.mockReturnValue(mockServers[0]);

      const statusResponse = {
        connected: false,
        status: 'error',
        message: 'Server error'
      };

      mcpProvider.checkMCPServerStatus.mockResolvedValue(statusResponse);

      // Act
      const response = await request(app)
        .post(`/api/mcp/servers/${serverName}/status`)
        .send({ config: {} })
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      expect(mcpProvider.checkMCPServerStatus).toHaveBeenCalledWith(serverName, {});
      expect(mockDatabase.updateMCPServerStatus).toHaveBeenCalledWith(
        serverName,
        'error'
      );
      expect(response.body).toHaveProperty('status', statusResponse);
    });

    it('should return 404 when server is not found', async () => {
      // Arrange
      const serverName = 'non-existent-server';
      mockDatabase.getMCPServer.mockReturnValue(null);

      // Act
      const response = await request(app)
        .post(`/api/mcp/servers/${serverName}/status`)
        .send({ config: {} })
        .expect('Content-Type', /json/)
        .expect(404);

      // Assert
      expect(response.body).toHaveProperty('error', `MCP server '${serverName}' not found`);
      expect(mcpProvider.checkMCPServerStatus).not.toHaveBeenCalled();
      expect(mockDatabase.updateMCPServerStatus).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      // Arrange
      const serverName = 'test-server';
      mockDatabase.getMCPServer.mockReturnValue(mockServers[0]);

      const errorMessage = 'Provider error';
      mcpProvider.checkMCPServerStatus.mockRejectedValue(new Error(errorMessage));

      // Act
      const response = await request(app)
        .post(`/api/mcp/servers/${serverName}/status`)
        .send({ config: {} })
        .expect('Content-Type', /json/)
        .expect(500);

      // Assert
      expect(response.body).toHaveProperty('error', errorMessage);
      expect(mockDatabase.updateMCPServerStatus).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/mcp/servers/:name/tools', () => {
    it('should get server tools and save them to the database', async () => {
      // Arrange
      const serverName = 'test-server';
      mockDatabase.getMCPServer.mockReturnValue(mockServers[0]);
      mcpProvider.getMCPServerTools.mockResolvedValue(mockTools);

      // Act
      const response = await request(app)
        .post(`/api/mcp/servers/${serverName}/tools`)
        .send({ config: {} })
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      expect(mcpProvider.getMCPServerTools).toHaveBeenCalledWith(serverName, {});
      expect(mockDatabase.saveMCPServerTool).toHaveBeenCalledTimes(mockTools.length);
      expect(response.body).toHaveProperty('tools', mockTools);
    });

    it('should return 404 when server is not found', async () => {
      // Arrange
      const serverName = 'non-existent-server';
      mockDatabase.getMCPServer.mockReturnValue(null);

      // Act
      const response = await request(app)
        .post(`/api/mcp/servers/${serverName}/tools`)
        .send({ config: {} })
        .expect('Content-Type', /json/)
        .expect(404);

      // Assert
      expect(response.body).toHaveProperty('error', `MCP server '${serverName}' not found`);
      expect(mcpProvider.getMCPServerTools).not.toHaveBeenCalled();
      expect(mockDatabase.saveMCPServerTool).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      // Arrange
      const serverName = 'test-server';
      mockDatabase.getMCPServer.mockReturnValue(mockServers[0]);

      const errorMessage = 'Provider error';
      mcpProvider.getMCPServerTools.mockRejectedValue(new Error(errorMessage));

      // Act
      const response = await request(app)
        .post(`/api/mcp/servers/${serverName}/tools`)
        .send({ config: {} })
        .expect('Content-Type', /json/)
        .expect(500);

      // Assert
      expect(response.body).toHaveProperty('error', errorMessage);
      expect(mockDatabase.saveMCPServerTool).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/mcp/servers/:name/resources', () => {
    it('should get server resources and save them to the database', async () => {
      // Arrange
      const serverName = 'test-server';
      mockDatabase.getMCPServer.mockReturnValue(mockServers[0]);
      mcpProvider.getMCPServerResources.mockResolvedValue(mockResources);

      // Act
      const response = await request(app)
        .post(`/api/mcp/servers/${serverName}/resources`)
        .send({ config: {} })
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      expect(mcpProvider.getMCPServerResources).toHaveBeenCalledWith(serverName, {});
      expect(mockDatabase.saveMCPServerResource).toHaveBeenCalledTimes(mockResources.length);
      expect(response.body).toHaveProperty('resources', mockResources);
    });

    it('should return 404 when server is not found', async () => {
      // Arrange
      const serverName = 'non-existent-server';
      mockDatabase.getMCPServer.mockReturnValue(null);

      // Act
      const response = await request(app)
        .post(`/api/mcp/servers/${serverName}/resources`)
        .send({ config: {} })
        .expect('Content-Type', /json/)
        .expect(404);

      // Assert
      expect(response.body).toHaveProperty('error', `MCP server '${serverName}' not found`);
      expect(mcpProvider.getMCPServerResources).not.toHaveBeenCalled();
      expect(mockDatabase.saveMCPServerResource).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      // Arrange
      const serverName = 'test-server';
      mockDatabase.getMCPServer.mockReturnValue(mockServers[0]);

      const errorMessage = 'Provider error';
      mcpProvider.getMCPServerResources.mockRejectedValue(new Error(errorMessage));

      // Act
      const response = await request(app)
        .post(`/api/mcp/servers/${serverName}/resources`)
        .send({ config: {} })
        .expect('Content-Type', /json/)
        .expect(500);

      // Assert
      expect(response.body).toHaveProperty('error', errorMessage);
      expect(mockDatabase.saveMCPServerResource).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/mcp/execute/:server/:tool', () => {
    it('should execute a tool successfully', async () => {
      // Arrange
      const serverName = 'test-server';
      const toolName = 'test-tool';
      const args = { param: 'value' };
      const config = {};

      mockDatabase.getMCPServer.mockReturnValue(mockServers[0]);
      mcpProvider.executeMCPTool.mockResolvedValue({ result: 'success' });

      // Act
      const response = await request(app)
        .post(`/api/mcp/execute/${serverName}/${toolName}`)
        .send({ arguments: args, config })
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      expect(mockDatabase.getMCPServer).toHaveBeenCalledWith(serverName);
      expect(mcpProvider.executeMCPTool).toHaveBeenCalledWith(serverName, toolName, args, config);
      expect(response.body).toEqual({ result: 'success' });
    });

    it('should return 404 when server is not found', async () => {
      // Arrange
      const serverName = 'non-existent-server';
      const toolName = 'test-tool';

      mockDatabase.getMCPServer.mockReturnValue(null);

      // Act
      const response = await request(app)
        .post(`/api/mcp/execute/${serverName}/${toolName}`)
        .send({ arguments: {}, config: {} })
        .expect('Content-Type', /json/)
        .expect(404);

      // Assert
      expect(response.body).toHaveProperty('error', `MCP server '${serverName}' not found`);
      expect(mcpProvider.executeMCPTool).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      // Arrange
      const serverName = 'test-server';
      const toolName = 'test-tool';

      mockDatabase.getMCPServer.mockReturnValue(mockServers[0]);

      const errorMessage = 'Provider error';
      const error = new Error(errorMessage);
      error.status = 400;
      error.details = 'Invalid arguments';

      mcpProvider.executeMCPTool.mockRejectedValue(error);

      // Act
      const response = await request(app)
        .post(`/api/mcp/execute/${serverName}/${toolName}`)
        .send({ arguments: {}, config: {} })
        .expect('Content-Type', /json/)
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty('error', errorMessage);
      expect(response.body).toHaveProperty('details', 'Invalid arguments');
    });
  });

  describe('POST /api/mcp/access/:server', () => {
    it('should access a resource successfully', async () => {
      // Arrange
      const serverName = 'test-server';
      const uri = 'test://resource';
      const config = {};

      mockDatabase.getMCPServer.mockReturnValue(mockServers[0]);
      mcpProvider.accessMCPResource.mockResolvedValue({ content: 'resource content' });

      // Act
      const response = await request(app)
        .post(`/api/mcp/access/${serverName}`)
        .send({ uri, config })
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      expect(mockDatabase.getMCPServer).toHaveBeenCalledWith(serverName);
      expect(mcpProvider.accessMCPResource).toHaveBeenCalledWith(serverName, uri, config);
      expect(response.body).toEqual({ content: 'resource content' });
    });

    it('should return 400 when URI is missing', async () => {
      // Arrange
      const serverName = 'test-server';

      // Act
      const response = await request(app)
        .post(`/api/mcp/access/${serverName}`)
        .send({ config: {} })
        .expect('Content-Type', /json/)
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty('error', 'Resource URI is required');
      expect(mockDatabase.getMCPServer).not.toHaveBeenCalled();
      expect(mcpProvider.accessMCPResource).not.toHaveBeenCalled();
    });

    it('should return 404 when server is not found', async () => {
      // Arrange
      const serverName = 'non-existent-server';
      const uri = 'test://resource';

      mockDatabase.getMCPServer.mockReturnValue(null);

      // Act
      const response = await request(app)
        .post(`/api/mcp/access/${serverName}`)
        .send({ uri, config: {} })
        .expect('Content-Type', /json/)
        .expect(404);

      // Assert
      expect(response.body).toHaveProperty('error', `MCP server '${serverName}' not found`);
      expect(mcpProvider.accessMCPResource).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      // Arrange
      const serverName = 'test-server';
      const uri = 'test://resource';

      mockDatabase.getMCPServer.mockReturnValue(mockServers[0]);

      const errorMessage = 'Provider error';
      const error = new Error(errorMessage);
      error.status = 400;
      error.details = 'Invalid URI';

      mcpProvider.accessMCPResource.mockRejectedValue(error);

      // Act
      const response = await request(app)
        .post(`/api/mcp/access/${serverName}`)
        .send({ uri, config: {} })
        .expect('Content-Type', /json/)
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty('error', errorMessage);
      expect(response.body).toHaveProperty('details', 'Invalid URI');
    });
  });

  describe('POST /api/mcp/refresh', () => {
    it('should refresh all server statuses', async () => {
      // Arrange
      mockDatabase.getAllMCPServers.mockReturnValue(mockServers);

      const statusResponses = {
        'test-server': {
          connected: true,
          status: 'connected',
          message: 'Server is connected and responding',
          version: '1.0.0',
          capabilities: ['tools', 'resources']
        },
        'another-server': {
          connected: false,
          status: 'error',
          message: 'Server error'
        }
      };

      mcpProvider.checkMCPServerStatus.mockImplementation((serverName) => {
        return Promise.resolve(statusResponses[serverName]);
      });

      // Act
      const response = await request(app)
        .post('/api/mcp/refresh')
        .send({ config: {} })
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      expect(mockDatabase.getAllMCPServers).toHaveBeenCalled();
      expect(mcpProvider.checkMCPServerStatus).toHaveBeenCalledTimes(mockServers.length);

      // Check that statuses were updated
      expect(mockDatabase.updateMCPServerStatus).toHaveBeenCalledWith(
        'test-server',
        'connected',
        statusResponses['test-server'].capabilities
      );
      expect(mockDatabase.updateMCPServerStatus).toHaveBeenCalledWith(
        'another-server',
        'error'
      );

      expect(response.body).toHaveProperty('results');
      expect(response.body.results).toHaveProperty('test-server', statusResponses['test-server']);
      expect(response.body.results).toHaveProperty('another-server', statusResponses['another-server']);
    });

    it('should handle errors for individual servers', async () => {
      // Arrange
      mockDatabase.getAllMCPServers.mockReturnValue(mockServers);

      // First server succeeds, second fails
      mcpProvider.checkMCPServerStatus.mockImplementation((serverName) => {
        if (serverName === 'test-server') {
          return Promise.resolve({
            connected: true,
            status: 'connected',
            message: 'Server is connected and responding'
          });
        } else {
          return Promise.reject(new Error('Provider error'));
        }
      });

      // Act
      const response = await request(app)
        .post('/api/mcp/refresh')
        .send({ config: {} })
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      expect(mockDatabase.getAllMCPServers).toHaveBeenCalled();
      expect(mcpProvider.checkMCPServerStatus).toHaveBeenCalledTimes(mockServers.length);

      // Check that status was updated for the successful server
      expect(mockDatabase.updateMCPServerStatus).toHaveBeenCalledWith(
        'test-server',
        'connected',
        undefined
      );

      // Check that results include both success and error
      expect(response.body).toHaveProperty('results');
      expect(response.body.results).toHaveProperty('test-server');
      expect(response.body.results).toHaveProperty('another-server');
      expect(response.body.results['another-server']).toEqual({
        connected: false,
        status: 'error',
        message: 'Provider error'
      });
    });

    it('should handle global errors', async () => {
      // Arrange
      const errorMessage = 'Database error';
      mockDatabase.getAllMCPServers.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      // Act
      const response = await request(app)
        .post('/api/mcp/refresh')
        .send({ config: {} })
        .expect('Content-Type', /json/)
        .expect(500);

      // Assert
      expect(response.body).toHaveProperty('error', errorMessage);
      expect(mcpProvider.checkMCPServerStatus).not.toHaveBeenCalled();
      expect(mockDatabase.updateMCPServerStatus).not.toHaveBeenCalled();
    });
  });
});
