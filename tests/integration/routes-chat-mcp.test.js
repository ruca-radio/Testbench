const request = require('supertest');
const express = require('express');
const { mockDatabase, resetMocks } = require('../test-helpers');

// Mock database - must be done before requiring routes
jest.mock('../../database', () => require('../test-helpers').mockDatabase);

// Now require the routes after mocking
const chatRoutes = require('../../routes/chat');

// Mock MCP provider functions
jest.mock('../../providers/mcp', () => ({
  accessMCPResource: jest.fn()
}));
const mcpProvider = require('../../providers/mcp');

// Mock other providers
jest.mock('../../providers/openai', () => ({
  handleOpenAI: jest.fn()
}));
const openaiProvider = require('../../providers/openai');

// Create Express app for testing
const app = express();
app.use(express.json());
app.use(chatRoutes);

describe('Chat Routes with MCP Context', () => {
  beforeEach(() => {
    resetMocks();
    jest.clearAllMocks();
  });

  describe('POST /chat', () => {
    it('should process chat request with MCP context', async () => {
      // Arrange
      const mcpContext = [
        'test-server://test-resource',
        'another-server://another-resource'
      ];

      const messages = [
        { role: 'user', content: 'Hello' }
      ];

      const mockServer1 = {
        name: 'test-server',
        endpoint: 'http://localhost:3001',
        apiKey: 'test-key'
      };

      const mockServer2 = {
        name: 'another-server',
        endpoint: 'http://localhost:3002',
        apiKey: null
      };

      mockDatabase.getMCPServer.mockImplementation((serverName) => {
        if (serverName === 'test-server') return mockServer1;
        if (serverName === 'another-server') return mockServer2;
        return null;
      });

      mcpProvider.accessMCPResource.mockImplementation((serverName, uri) => {
        if (serverName === 'test-server' && uri === 'test-resource') {
          return Promise.resolve({ content: 'Test resource content' });
        }
        if (serverName === 'another-server' && uri === 'another-resource') {
          return Promise.resolve({ content: 'Another resource content' });
        }
        return Promise.reject(new Error('Resource not found'));
      });

      openaiProvider.handleOpenAI.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Hello, I can help you with that.'
            }
          }
        ]
      });

      // Act
      const response = await request(app)
        .post('/chat')
        .send({
          messages,
          model: 'gpt-4o',
          mcpContext
        })
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      expect(mcpProvider.accessMCPResource).toHaveBeenCalledTimes(2);
      expect(mcpProvider.accessMCPResource).toHaveBeenCalledWith('test-server', 'test-resource', {});
      expect(mcpProvider.accessMCPResource).toHaveBeenCalledWith('another-server', 'another-resource', {});

      // Check that the MCP context was added to the messages
      expect(openaiProvider.handleOpenAI).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('Test resource content')
          }),
          expect.objectContaining({
            role: 'user',
            content: 'Hello'
          })
        ]),
        'gpt-4o',
        {},
        {},
        undefined
      );

      expect(response.body).toEqual({
        response: 'Hello, I can help you with that.',
        model: 'gpt-4o',
        provider: 'openai',
        responseTime: expect.any(Number)
      });
    });

    it('should append MCP context to existing system message', async () => {
      // Arrange
      const mcpContext = [
        'test-server://test-resource'
      ];

      const messages = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello' }
      ];

      mockDatabase.getMCPServer.mockReturnValue({
        name: 'test-server',
        endpoint: 'http://localhost:3001',
        apiKey: 'test-key'
      });

      mcpProvider.accessMCPResource.mockResolvedValue({
        content: 'Test resource content'
      });

      openaiProvider.handleOpenAI.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Hello, I can help you with that.'
            }
          }
        ]
      });

      // Act
      const response = await request(app)
        .post('/chat')
        .send({
          messages,
          model: 'gpt-4o',
          mcpContext
        })
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      expect(mcpProvider.accessMCPResource).toHaveBeenCalledTimes(1);

      // Check that the MCP context was appended to the existing system message
      expect(openaiProvider.handleOpenAI).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('You are a helpful assistant.')
          }),
          expect.objectContaining({
            role: 'user',
            content: 'Hello'
          })
        ]),
        'gpt-4o',
        {},
        {},
        undefined
      );

      // Check that the system message contains both the original content and the MCP context
      const systemMessage = openaiProvider.handleOpenAI.mock.calls[0][0][0];
      expect(systemMessage.content).toContain('You are a helpful assistant.');
      expect(systemMessage.content).toContain('Available context:');
      expect(systemMessage.content).toContain('Test resource content');
    });

    it('should continue without MCP context when resource access fails', async () => {
      // Arrange
      const mcpContext = [
        'test-server://test-resource'
      ];

      const messages = [
        { role: 'user', content: 'Hello' }
      ];

      mockDatabase.getMCPServer.mockReturnValue({
        name: 'test-server',
        endpoint: 'http://localhost:3001',
        apiKey: 'test-key'
      });

      mcpProvider.accessMCPResource.mockRejectedValue(new Error('Resource access failed'));

      openaiProvider.handleOpenAI.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Hello, I can help you with that.'
            }
          }
        ]
      });

      // Act
      const response = await request(app)
        .post('/chat')
        .send({
          messages,
          model: 'gpt-4o',
          mcpContext
        })
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      expect(mcpProvider.accessMCPResource).toHaveBeenCalledTimes(1);

      // Check that the original messages were passed without MCP context
      expect(openaiProvider.handleOpenAI).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: 'Hello'
          })
        ]),
        'gpt-4o',
        {},
        {},
        undefined
      );

      expect(response.body).toEqual({
        response: 'Hello, I can help you with that.',
        model: 'gpt-4o',
        provider: 'openai',
        responseTime: expect.any(Number)
      });
    });

    it('should handle invalid MCP context format', async () => {
      // Arrange
      const mcpContext = [
        'invalid-format'
      ];

      const messages = [
        { role: 'user', content: 'Hello' }
      ];

      openaiProvider.handleOpenAI.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Hello, I can help you with that.'
            }
          }
        ]
      });

      // Act
      const response = await request(app)
        .post('/chat')
        .send({
          messages,
          model: 'gpt-4o',
          mcpContext
        })
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      expect(mcpProvider.accessMCPResource).not.toHaveBeenCalled();

      // Check that the original messages were passed without MCP context
      expect(openaiProvider.handleOpenAI).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: 'Hello'
          })
        ]),
        'gpt-4o',
        {},
        {},
        undefined
      );

      expect(response.body).toEqual({
        response: 'Hello, I can help you with that.',
        model: 'gpt-4o',
        provider: 'openai',
        responseTime: expect.any(Number)
      });
    });

    it('should handle server not found', async () => {
      // Arrange
      const mcpContext = [
        'non-existent-server://test-resource'
      ];

      const messages = [
        { role: 'user', content: 'Hello' }
      ];

      mockDatabase.getMCPServer.mockReturnValue(null);

      openaiProvider.handleOpenAI.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Hello, I can help you with that.'
            }
          }
        ]
      });

      // Act
      const response = await request(app)
        .post('/chat')
        .send({
          messages,
          model: 'gpt-4o',
          mcpContext
        })
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      expect(mcpProvider.accessMCPResource).not.toHaveBeenCalled();

      // Check that the original messages were passed without MCP context
      expect(openaiProvider.handleOpenAI).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: 'Hello'
          })
        ]),
        'gpt-4o',
        {},
        {},
        undefined
      );

      expect(response.body).toEqual({
        response: 'Hello, I can help you with that.',
        model: 'gpt-4o',
        provider: 'openai',
        responseTime: expect.any(Number)
      });
    });
  });

  describe('POST /api/chat/completion', () => {
    it('should process chat completion request with MCP context', async () => {
      // Arrange
      const mcpContext = [
        'test-server://test-resource'
      ];

      const messages = [
        { role: 'user', content: 'Hello' }
      ];

      mockDatabase.getMCPServer.mockReturnValue({
        name: 'test-server',
        endpoint: 'http://localhost:3001',
        apiKey: 'test-key'
      });

      mcpProvider.accessMCPResource.mockResolvedValue({
        content: 'Test resource content'
      });

      const completionResponse = {
        choices: [
          {
            message: {
              content: 'Hello, I can help you with that.'
            }
          }
        ]
      };

      openaiProvider.handleOpenAI.mockResolvedValue(completionResponse);

      // Act
      const response = await request(app)
        .post('/api/chat/completion')
        .send({
          messages,
          model: 'gpt-4o',
          mcpContext
        })
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      expect(mcpProvider.accessMCPResource).toHaveBeenCalledTimes(1);

      // Check that the MCP context was added to the messages
      expect(openaiProvider.handleOpenAI).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('Test resource content')
          }),
          expect.objectContaining({
            role: 'user',
            content: 'Hello'
          })
        ]),
        'gpt-4o',
        {},
        {},
        undefined
      );

      expect(response.body).toEqual(completionResponse);
    });
  });
});
