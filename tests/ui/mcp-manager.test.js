/**
 * UI Component Tests for MCP Server Management Interface
 *
 * These tests use Jest's DOM manipulation capabilities to test the UI components
 * for the MCP server management interface.
 */

// Mock fetch globally
global.fetch = jest.fn();

// Mock DOM elements and utilities
const mockElement = {
  addEventListener: jest.fn(),
  appendChild: jest.fn(),
  insertAdjacentHTML: jest.fn(),
  click: jest.fn(),
  style: {},
  innerHTML: ''
};

document.getElementById = jest.fn();
document.createElement = jest.fn(() => ({ ...mockElement }));
document.querySelector = jest.fn();
document.querySelectorAll = jest.fn(() => []);

// Properly mock document.body
Object.defineProperty(document.body, 'insertAdjacentHTML', {
  value: jest.fn(),
  writable: true
});

// Mock document.head.appendChild
jest.spyOn(document.head, 'appendChild').mockImplementation(() => {});

// Mock Utils
global.Utils = {
  showError: jest.fn(),
  showSuccess: jest.fn(),
  showInfo: jest.fn()
};

// Mock confirm
global.confirm = jest.fn();

// Import the MCPManager class
const MCPManager = require('../../public/js/mcp-manager');

describe('MCP Manager UI Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset fetch mock
    fetch.mockReset();

    // Mock successful fetch response
    fetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ servers: [] })
      })
    );

    // Mock DOM elements
    document.getElementById.mockImplementation((id) => {
      if (id === 'mcp-server-list') {
        return { innerHTML: '' };
      }
      if (id === 'mcp-server-editor') {
        return { style: {} };
      }
      if (id === 'mcp-editor-title') {
        return { textContent: '' };
      }
      if (id === 'mcp-server-name') {
        return { value: 'test-server', disabled: false };
      }
      if (id === 'mcp-display-name') {
        return { value: 'Test Server' };
      }
      if (id === 'mcp-server-type') {
        return { value: 'http' };
      }
      if (id === 'mcp-endpoint') {
        return { value: 'http://localhost:3001' };
      }
      if (id === 'mcp-api-key') {
        return { value: 'test-key' };
      }
      if (id === 'mcp-tab') {
        return { insertAdjacentHTML: jest.fn() };
      }
      return null;
    });

    // Initialize MCPManager
    MCPManager.init();
  });

  describe('init', () => {
    it('should initialize the MCPManager', () => {
      expect(MCPManager.serverList).toEqual([]);
      expect(MCPManager.selectedServer).toBeNull();
    });
  });

  describe('loadServers', () => {
    it('should load servers from the backend', async () => {
      // Arrange
      const mockServers = [
        {
          name: 'test-server',
          displayName: 'Test Server',
          endpoint: 'http://localhost:3001',
          apiKey: 'test-key',
          serverType: 'http',
          status: 'connected'
        }
      ];

      fetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ servers: mockServers })
        })
      );

      // Act
      const result = await MCPManager.loadServers();

      // Assert
      expect(fetch).toHaveBeenCalledWith('/api/mcp/servers');
      expect(MCPManager.serverList).toEqual(mockServers);
      expect(result).toEqual(mockServers);
    });

    it('should handle errors when loading servers', async () => {
      // Arrange
      fetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Failed to load servers' })
        })
      );

      // Act
      const result = await MCPManager.loadServers();

      // Assert
      expect(fetch).toHaveBeenCalledWith('/api/mcp/servers');
      expect(Utils.showError).toHaveBeenCalledWith('Failed to load MCP servers');
      expect(result).toEqual([]);
    });

    it('should handle network errors', async () => {
      // Arrange
      fetch.mockImplementationOnce(() =>
        Promise.reject(new Error('Network error'))
      );

      // Act
      const result = await MCPManager.loadServers();

      // Assert
      expect(fetch).toHaveBeenCalledWith('/api/mcp/servers');
      expect(Utils.showError).toHaveBeenCalledWith('Failed to load MCP servers');
      expect(result).toEqual([]);
    });
  });

  describe('updateServerList', () => {
    it('should update the server list in the UI', () => {
      // Arrange
      const serverListElement = { innerHTML: '' };
      document.getElementById.mockReturnValueOnce(serverListElement);

      MCPManager.serverList = [
        {
          name: 'test-server',
          displayName: 'Test Server',
          endpoint: 'http://localhost:3001',
          apiKey: 'test-key',
          serverType: 'http',
          status: 'connected'
        },
        {
          name: 'another-server',
          displayName: 'Another Server',
          endpoint: 'http://localhost:3002',
          apiKey: null,
          serverType: 'http',
          status: 'disconnected'
        }
      ];

      // Act
      MCPManager.updateServerList();

      // Assert
      expect(document.getElementById).toHaveBeenCalledWith('mcp-server-list');
      expect(serverListElement.innerHTML).toContain('Test Server');
      expect(serverListElement.innerHTML).toContain('Another Server');
      expect(serverListElement.innerHTML).toContain('status connected');
      expect(serverListElement.innerHTML).toContain('status disconnected');
    });

    it('should show empty state when no servers are available', () => {
      // Arrange
      const serverListElement = { innerHTML: '' };
      document.getElementById.mockReturnValueOnce(serverListElement);

      MCPManager.serverList = [];

      // Act
      MCPManager.updateServerList();

      // Assert
      expect(document.getElementById).toHaveBeenCalledWith('mcp-server-list');
      expect(serverListElement.innerHTML).toContain('No MCP servers configured');
    });
  });

  describe('addServer', () => {
    it('should show the server editor', () => {
      // Arrange
      const showServerEditorSpy = jest.spyOn(MCPManager, 'showServerEditor');

      // Act
      MCPManager.addServer();

      // Assert
      expect(showServerEditorSpy).toHaveBeenCalled();
    });
  });

  describe('showServerEditor', () => {
    it('should show the server editor for a new server', () => {
      // Arrange
      const editor = { style: {} };
      const editorTitle = { textContent: '' };
      const serverNameInput = { value: '', disabled: false };
      const displayNameInput = { value: '' };
      const serverTypeInput = { value: '' };
      const endpointInput = { value: '' };
      const apiKeyInput = { value: '' };

      document.getElementById.mockImplementation((id) => {
        if (id === 'mcp-server-editor') return editor;
        if (id === 'mcp-editor-title') return editorTitle;
        if (id === 'mcp-server-name') return serverNameInput;
        if (id === 'mcp-display-name') return displayNameInput;
        if (id === 'mcp-server-type') return serverTypeInput;
        if (id === 'mcp-endpoint') return endpointInput;
        if (id === 'mcp-api-key') return apiKeyInput;
        if (id === 'mcp-tab') return { insertAdjacentHTML: jest.fn() };
        return null;
      });

      // Act
      MCPManager.showServerEditor();

      // Assert
      expect(editor.style.display).toBe('block');
      expect(editorTitle.textContent).toBe('Add MCP Server');
      expect(serverNameInput.disabled).toBe(false);
      expect(serverNameInput.value).toBe('');
      expect(displayNameInput.value).toBe('');
      expect(serverTypeInput.value).toBe('stdio');
      expect(endpointInput.value).toBe('');
      expect(apiKeyInput.value).toBe('');
    });

    it('should show the server editor for an existing server', () => {
      // Arrange
      const editor = { style: {} };
      const editorTitle = { textContent: '' };
      const serverNameInput = { value: '', disabled: false };
      const displayNameInput = { value: '' };
      const serverTypeInput = { value: '' };
      const endpointInput = { value: '' };
      const apiKeyInput = { value: '' };

      document.getElementById.mockImplementation((id) => {
        if (id === 'mcp-server-editor') return editor;
        if (id === 'mcp-editor-title') return editorTitle;
        if (id === 'mcp-server-name') return serverNameInput;
        if (id === 'mcp-display-name') return displayNameInput;
        if (id === 'mcp-server-type') return serverTypeInput;
        if (id === 'mcp-endpoint') return endpointInput;
        if (id === 'mcp-api-key') return apiKeyInput;
        if (id === 'mcp-tab') return { insertAdjacentHTML: jest.fn() };
        return null;
      });

      MCPManager.serverList = [
        {
          name: 'test-server',
          displayName: 'Test Server',
          endpoint: 'http://localhost:3001',
          apiKey: 'test-key',
          serverType: 'http',
          status: 'connected'
        }
      ];

      // Act
      MCPManager.showServerEditor('test-server');

      // Assert
      expect(editor.style.display).toBe('block');
      expect(editorTitle.textContent).toBe('Edit MCP Server');
      expect(serverNameInput.disabled).toBe(true);
      expect(serverNameInput.value).toBe('test-server');
      expect(displayNameInput.value).toBe('Test Server');
      expect(serverTypeInput.value).toBe('http');
      expect(endpointInput.value).toBe('http://localhost:3001');
      expect(apiKeyInput.value).toBe('••••••');
    });
  });

  describe('cancelEdit', () => {
    it('should hide the server editor', () => {
      // Arrange
      const editor = { style: {} };
      document.getElementById.mockReturnValueOnce(editor);

      // Act
      MCPManager.cancelEdit();

      // Assert
      expect(document.getElementById).toHaveBeenCalledWith('mcp-server-editor');
      expect(editor.style.display).toBe('none');
      expect(MCPManager.selectedServer).toBeNull();
    });
  });

  describe('saveServer', () => {
    it('should save a new server', async () => {
      // Arrange
      const serverData = {
        name: 'test-server',
        displayName: 'Test Server',
        endpoint: 'http://localhost:3001',
        apiKey: 'test-key',
        serverType: 'http'
      };

      fetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            message: 'MCP server saved successfully',
            server: { ...serverData, apiKey: '••••••' }
          })
        })
      );

      const cancelEditSpy = jest.spyOn(MCPManager, 'cancelEdit');
      const loadServersSpy = jest.spyOn(MCPManager, 'loadServers');

      // Mock DOM elements
      document.getElementById.mockImplementation((id) => {
        if (id === 'mcp-server-name') return { value: serverData.name };
        if (id === 'mcp-display-name') return { value: serverData.displayName };
        if (id === 'mcp-server-type') return { value: serverData.serverType };
        if (id === 'mcp-endpoint') return { value: serverData.endpoint };
        if (id === 'mcp-api-key') return { value: serverData.apiKey };
        return null;
      });

      // Act
      await MCPManager.saveServer();

      // Assert
      expect(fetch).toHaveBeenCalledWith('/api/mcp/servers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ server: serverData })
      });

      expect(cancelEditSpy).toHaveBeenCalled();
      expect(loadServersSpy).toHaveBeenCalled();
      expect(Utils.showSuccess).toHaveBeenCalledWith(`MCP server 'Test Server' saved successfully`);
    });

    it('should validate required fields', async () => {
      // Arrange
      document.getElementById.mockImplementation((id) => {
        if (id === 'mcp-server-name') return { value: '' };
        if (id === 'mcp-display-name') return { value: 'Test Server' };
        if (id === 'mcp-server-type') return { value: 'http' };
        if (id === 'mcp-endpoint') return { value: 'http://localhost:3001' };
        if (id === 'mcp-api-key') return { value: 'test-key' };
        return null;
      });

      // Act
      await MCPManager.saveServer();

      // Assert
      expect(fetch).not.toHaveBeenCalled();
      expect(Utils.showError).toHaveBeenCalledWith('Server name is required');
    });

    it('should validate server name format', async () => {
      // Arrange
      document.getElementById.mockImplementation((id) => {
        if (id === 'mcp-server-name') return { value: 'invalid server name!' };
        if (id === 'mcp-display-name') return { value: 'Test Server' };
        if (id === 'mcp-server-type') return { value: 'http' };
        if (id === 'mcp-endpoint') return { value: 'http://localhost:3001' };
        if (id === 'mcp-api-key') return { value: 'test-key' };
        return null;
      });

      // Act
      await MCPManager.saveServer();

      // Assert
      expect(fetch).not.toHaveBeenCalled();
      expect(Utils.showError).toHaveBeenCalledWith('Server name must contain only letters, numbers, dashes, and underscores');
    });

    it('should validate endpoint is required', async () => {
      // Arrange
      document.getElementById.mockImplementation((id) => {
        if (id === 'mcp-server-name') return { value: 'test-server' };
        if (id === 'mcp-display-name') return { value: 'Test Server' };
        if (id === 'mcp-server-type') return { value: 'http' };
        if (id === 'mcp-endpoint') return { value: '' };
        if (id === 'mcp-api-key') return { value: 'test-key' };
        return null;
      });

      // Act
      await MCPManager.saveServer();

      // Assert
      expect(fetch).not.toHaveBeenCalled();
      expect(Utils.showError).toHaveBeenCalledWith('Endpoint is required');
    });

    it('should handle server errors', async () => {
      // Arrange
      document.getElementById.mockImplementation((id) => {
        if (id === 'mcp-server-name') return { value: 'test-server' };
        if (id === 'mcp-display-name') return { value: 'Test Server' };
        if (id === 'mcp-server-type') return { value: 'http' };
        if (id === 'mcp-endpoint') return { value: 'http://localhost:3001' };
        if (id === 'mcp-api-key') return { value: 'test-key' };
        return null;
      });

      fetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Server error' })
        })
      );

      // Act
      await MCPManager.saveServer();

      // Assert
      expect(fetch).toHaveBeenCalled();
      expect(Utils.showError).toHaveBeenCalledWith('Server error');
    });
  });

  describe('configureServer', () => {
    it('should show the server editor for the specified server', () => {
      // Arrange
      const showServerEditorSpy = jest.spyOn(MCPManager, 'showServerEditor');
      const serverName = 'test-server';

      // Act
      MCPManager.configureServer(serverName);

      // Assert
      expect(showServerEditorSpy).toHaveBeenCalledWith(serverName);
    });
  });

  describe('connectServer', () => {
    it('should connect to a server successfully', async () => {
      // Arrange
      const serverName = 'test-server';

      fetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            status: {
              connected: true,
              status: 'connected',
              message: 'Server is connected and responding'
            }
          })
        })
      );

      const loadServersSpy = jest.spyOn(MCPManager, 'loadServers');

      // Act
      await MCPManager.connectServer(serverName);

      // Assert
      expect(fetch).toHaveBeenCalledWith(`/api/mcp/servers/${serverName}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ config: {} })
      });

      expect(Utils.showSuccess).toHaveBeenCalledWith(`Connected to MCP server '${serverName}'`);
      expect(loadServersSpy).toHaveBeenCalled();
    });

    it('should handle connection failure', async () => {
      // Arrange
      const serverName = 'test-server';

      fetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            status: {
              connected: false,
              status: 'error',
              message: 'Failed to connect'
            }
          })
        })
      );

      const loadServersSpy = jest.spyOn(MCPManager, 'loadServers');

      // Act
      await MCPManager.connectServer(serverName);

      // Assert
      expect(fetch).toHaveBeenCalledWith(`/api/mcp/servers/${serverName}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ config: {} })
      });

      expect(Utils.showError).toHaveBeenCalledWith(`Failed to connect to MCP server: Failed to connect`);
      expect(loadServersSpy).toHaveBeenCalled();
    });

    it('should handle server errors', async () => {
      // Arrange
      const serverName = 'test-server';

      fetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Server error' })
        })
      );

      // Act
      await MCPManager.connectServer(serverName);

      // Assert
      expect(fetch).toHaveBeenCalled();
      expect(Utils.showError).toHaveBeenCalledWith('Server error');
    });
  });

  describe('removeServer', () => {
    it('should remove a server after confirmation', async () => {
      // Arrange
      const serverName = 'test-server';

      global.confirm.mockReturnValueOnce(true);

      fetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            message: `MCP server '${serverName}' removed successfully`
          })
        })
      );

      const loadServersSpy = jest.spyOn(MCPManager, 'loadServers');

      // Act
      await MCPManager.removeServer(serverName);

      // Assert
      expect(global.confirm).toHaveBeenCalledWith(`Are you sure you want to remove the MCP server '${serverName}'?`);
      expect(fetch).toHaveBeenCalledWith(`/api/mcp/servers/${serverName}`, {
        method: 'DELETE'
      });

      expect(Utils.showSuccess).toHaveBeenCalledWith(`MCP server '${serverName}' removed successfully`);
      expect(loadServersSpy).toHaveBeenCalled();
    });

    it('should not remove a server if not confirmed', async () => {
      // Arrange
      const serverName = 'test-server';

      global.confirm.mockReturnValueOnce(false);

      // Act
      await MCPManager.removeServer(serverName);

      // Assert
      expect(global.confirm).toHaveBeenCalledWith(`Are you sure you want to remove the MCP server '${serverName}'?`);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should handle server errors', async () => {
      // Arrange
      const serverName = 'test-server';

      global.confirm.mockReturnValueOnce(true);

      fetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Server error' })
        })
      );

      // Act
      await MCPManager.removeServer(serverName);

      // Assert
      expect(fetch).toHaveBeenCalled();
      expect(Utils.showError).toHaveBeenCalledWith('Server error');
    });
  });

  describe('refreshServers', () => {
    it('should refresh all server statuses', async () => {
      // Arrange
      fetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            results: {
              'test-server': {
                connected: true,
                status: 'connected'
              }
            }
          })
        })
      );

      const loadServersSpy = jest.spyOn(MCPManager, 'loadServers');

      // Act
      await MCPManager.refreshServers();

      // Assert
      expect(fetch).toHaveBeenCalledWith('/api/mcp/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ config: {} })
      });

      expect(Utils.showSuccess).toHaveBeenCalledWith('MCP server statuses refreshed');
      expect(loadServersSpy).toHaveBeenCalled();
    });

    it('should handle server errors', async () => {
      // Arrange
      fetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Server error' })
        })
      );

      // Act
      await MCPManager.refreshServers();

      // Assert
      expect(fetch).toHaveBeenCalled();
      expect(Utils.showError).toHaveBeenCalledWith('Server error');
    });
  });
});
