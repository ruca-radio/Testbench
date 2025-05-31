/**
 * UI Component Tests for MCP Context Selector
 * 
 * These tests use Jest's DOM manipulation capabilities to test the UI components
 * for the MCP context selector interface.
 */

// Mock fetch globally
global.fetch = jest.fn();

// Mock DOM elements and utilities
document.getElementById = jest.fn();
document.createElement = jest.fn(() => ({
  addEventListener: jest.fn(),
  appendChild: jest.fn(),
  insertAdjacentHTML: jest.fn(),
  click: jest.fn(),
  style: {}
}));
document.querySelector = jest.fn();
document.querySelectorAll = jest.fn(() => []);
document.body = {
  insertAdjacentHTML: jest.fn()
};
document.head = {
  appendChild: jest.fn()
};

// Mock Utils
global.Utils = {
  showError: jest.fn(),
  showSuccess: jest.fn(),
  showInfo: jest.fn()
};

// Import the MCPContextSelector class
const MCPContextSelector = require('../../public/js/mcp-context-selector');

describe('MCP Context Selector UI Component', () => {
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
      if (id === 'mcp-context-selector') {
        return { innerHTML: '' };
      }
      if (id === 'mcp-context-list') {
        return { innerHTML: '' };
      }
      if (id === 'mcp-context-input') {
        return { value: '' };
      }
      return null;
    });
    
    // Initialize MCPContextSelector
    MCPContextSelector.init();
  });

  describe('init', () => {
    it('should initialize the MCPContextSelector', () => {
      expect(MCPContextSelector.servers).toEqual([]);
      expect(MCPContextSelector.selectedContext).toEqual([]);
    });
  });

  describe('loadServers', () => {
    it('should load servers from the backend', async () => {
      // Arrange
      const mockServers = [
        {
          name: 'test-server',
          displayName: 'Test Server',
          status: 'connected',
          resources: [
            {
              uri: 'test://resource',
              display_name: 'Test Resource'
            }
          ]
        }
      ];
      
      fetch.mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ servers: mockServers })
        })
      );

      // Act
      const result = await MCPContextSelector.loadServers();

      // Assert
      expect(fetch).toHaveBeenCalledWith('/api/mcp/servers');
      expect(MCPContextSelector.servers).toEqual(mockServers);
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
      const result = await MCPContextSelector.loadServers();

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
      const result = await MCPContextSelector.loadServers();

      // Assert
      expect(fetch).toHaveBeenCalledWith('/api/mcp/servers');
      expect(Utils.showError).toHaveBeenCalledWith('Failed to load MCP servers');
      expect(result).toEqual([]);
    });
  });

  describe('loadServerResources', () => {
    it('should load resources for a server', async () => {
      // Arrange
      const serverName = 'test-server';
      const mockResources = [
        {
          uri: 'test://resource',
          display_name: 'Test Resource'
        }
      ];
      
      fetch.mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ resources: mockResources })
        })
      );

      // Act
      const result = await MCPContextSelector.loadServerResources(serverName);

      // Assert
      expect(fetch).toHaveBeenCalledWith(`/api/mcp/servers/${serverName}/resources`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ config: {} })
      });
      expect(result).toEqual(mockResources);
    });

    it('should handle errors when loading resources', async () => {
      // Arrange
      const serverName = 'test-server';
      
      fetch.mockImplementationOnce(() => 
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Failed to load resources' })
        })
      );

      // Act
      const result = await MCPContextSelector.loadServerResources(serverName);

      // Assert
      expect(fetch).toHaveBeenCalledWith(`/api/mcp/servers/${serverName}/resources`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ config: {} })
      });
      expect(Utils.showError).toHaveBeenCalledWith('Failed to load resources for server test-server');
      expect(result).toEqual([]);
    });
  });

  describe('updateServerList', () => {
    it('should update the server list in the UI', () => {
      // Arrange
      const selectorElement = { innerHTML: '' };
      document.getElementById.mockReturnValueOnce(selectorElement);
      
      MCPContextSelector.servers = [
        {
          name: 'test-server',
          displayName: 'Test Server',
          status: 'connected',
          resources: [
            {
              uri: 'test://resource',
              display_name: 'Test Resource'
            }
          ]
        },
        {
          name: 'another-server',
          displayName: 'Another Server',
          status: 'disconnected',
          resources: []
        }
      ];

      // Act
      MCPContextSelector.updateServerList();

      // Assert
      expect(document.getElementById).toHaveBeenCalledWith('mcp-context-selector');
      expect(selectorElement.innerHTML).toContain('Test Server');
      expect(selectorElement.innerHTML).toContain('Another Server');
      expect(selectorElement.innerHTML).toContain('status connected');
      expect(selectorElement.innerHTML).toContain('status disconnected');
    });

    it('should show empty state when no servers are available', () => {
      // Arrange
      const selectorElement = { innerHTML: '' };
      document.getElementById.mockReturnValueOnce(selectorElement);
      
      MCPContextSelector.servers = [];

      // Act
      MCPContextSelector.updateServerList();

      // Assert
      expect(document.getElementById).toHaveBeenCalledWith('mcp-context-selector');
      expect(selectorElement.innerHTML).toContain('No MCP servers available');
    });
  });

  describe('toggleServerResources', () => {
    it('should toggle server resources visibility', () => {
      // Arrange
      const serverName = 'test-server';
      const resourcesElement = { style: {} };
      const toggleIcon = { classList: { toggle: jest.fn() } };
      
      document.querySelector.mockImplementation((selector) => {
        if (selector === `#${serverName}-resources`) return resourcesElement;
        if (selector === `#${serverName}-toggle i`) return toggleIcon;
        return null;
      });

      // Act
      MCPContextSelector.toggleServerResources(serverName);

      // Assert
      expect(document.querySelector).toHaveBeenCalledWith(`#${serverName}-resources`);
      expect(document.querySelector).toHaveBeenCalledWith(`#${serverName}-toggle i`);
      expect(resourcesElement.style.display).toBe('block');
      expect(toggleIcon.classList.toggle).toHaveBeenCalledWith('fa-chevron-down');
      expect(toggleIcon.classList.toggle).toHaveBeenCalledWith('fa-chevron-right');
    });

    it('should hide resources if already visible', () => {
      // Arrange
      const serverName = 'test-server';
      const resourcesElement = { style: { display: 'block' } };
      const toggleIcon = { classList: { toggle: jest.fn() } };
      
      document.querySelector.mockImplementation((selector) => {
        if (selector === `#${serverName}-resources`) return resourcesElement;
        if (selector === `#${serverName}-toggle i`) return toggleIcon;
        return null;
      });

      // Act
      MCPContextSelector.toggleServerResources(serverName);

      // Assert
      expect(resourcesElement.style.display).toBe('none');
      expect(toggleIcon.classList.toggle).toHaveBeenCalledWith('fa-chevron-down');
      expect(toggleIcon.classList.toggle).toHaveBeenCalledWith('fa-chevron-right');
    });
  });

  describe('addResourceToContext', () => {
    it('should add a resource to the context', () => {
      // Arrange
      const serverName = 'test-server';
      const resourceUri = 'test://resource';
      const resourceName = 'Test Resource';
      const contextListElement = { innerHTML: '' };
      
      document.getElementById.mockReturnValueOnce(contextListElement);
      
      // Act
      MCPContextSelector.addResourceToContext(serverName, resourceUri, resourceName);

      // Assert
      expect(document.getElementById).toHaveBeenCalledWith('mcp-context-list');
      expect(contextListElement.innerHTML).toContain(resourceName);
      expect(contextListElement.innerHTML).toContain(`${serverName}://${resourceUri}`);
      expect(MCPContextSelector.selectedContext).toContain(`${serverName}://${resourceUri}`);
    });

    it('should not add duplicate resources', () => {
      // Arrange
      const serverName = 'test-server';
      const resourceUri = 'test://resource';
      const resourceName = 'Test Resource';
      const contextListElement = { innerHTML: '' };
      
      document.getElementById.mockReturnValueOnce(contextListElement);
      
      // Add the resource once
      MCPContextSelector.selectedContext = [`${serverName}://${resourceUri}`];

      // Act
      MCPContextSelector.addResourceToContext(serverName, resourceUri, resourceName);

      // Assert
      expect(document.getElementById).toHaveBeenCalledWith('mcp-context-list');
      expect(MCPContextSelector.selectedContext).toHaveLength(1);
      expect(MCPContextSelector.selectedContext).toContain(`${serverName}://${resourceUri}`);
    });
  });

  describe('removeResourceFromContext', () => {
    it('should remove a resource from the context', () => {
      // Arrange
      const resourceUri = 'test-server://test-resource';
      const contextListElement = { innerHTML: '' };
      
      document.getElementById.mockReturnValueOnce(contextListElement);
      
      // Add the resource first
      MCPContextSelector.selectedContext = [resourceUri];

      // Act
      MCPContextSelector.removeResourceFromContext(resourceUri);

      // Assert
      expect(document.getElementById).toHaveBeenCalledWith('mcp-context-list');
      expect(MCPContextSelector.selectedContext).toHaveLength(0);
    });
  });

  describe('updateContextList', () => {
    it('should update the context list in the UI', () => {
      // Arrange
      const contextListElement = { innerHTML: '' };
      document.getElementById.mockReturnValueOnce(contextListElement);
      
      MCPContextSelector.selectedContext = [
        'test-server://test-resource',
        'another-server://another-resource'
      ];
      
      MCPContextSelector.servers = [
        {
          name: 'test-server',
          displayName: 'Test Server',
          resources: [
            {
              uri: 'test-resource',
              display_name: 'Test Resource'
            }
          ]
        },
        {
          name: 'another-server',
          displayName: 'Another Server',
          resources: [
            {
              uri: 'another-resource',
              display_name: 'Another Resource'
            }
          ]
        }
      ];

      // Act
      MCPContextSelector.updateContextList();

      // Assert
      expect(document.getElementById).toHaveBeenCalledWith('mcp-context-list');
      expect(contextListElement.innerHTML).toContain('Test Resource');
      expect(contextListElement.innerHTML).toContain('Another Resource');
      expect(contextListElement.innerHTML).toContain('test-server://test-resource');
      expect(contextListElement.innerHTML).toContain('another-server://another-resource');
    });

    it('should show empty state when no context is selected', () => {
      // Arrange
      const contextListElement = { innerHTML: '' };
      document.getElementById.mockReturnValueOnce(contextListElement);
      
      MCPContextSelector.selectedContext = [];

      // Act
      MCPContextSelector.updateContextList();

      // Assert
      expect(document.getElementById).toHaveBeenCalledWith('mcp-context-list');
      expect(contextListElement.innerHTML).toContain('No context selected');
    });
  });

  describe('getSelectedContext', () => {
    it('should return the selected context', () => {
      // Arrange
      MCPContextSelector.selectedContext = [
        'test-server://test-resource',
        'another-server://another-resource'
      ];

      // Act
      const result = MCPContextSelector.getSelectedContext();

      // Assert
      expect(result).toEqual(MCPContextSelector.selectedContext);
    });
  });

  describe('clearContext', () => {
    it('should clear the selected context', () => {
      // Arrange
      MCPContextSelector.selectedContext = [
        'test-server://test-resource',
        'another-server://another-resource'
      ];
      
      const contextListElement = { innerHTML: '' };
      document.getElementById.mockReturnValueOnce(contextListElement);

      // Act
      MCPContextSelector.clearContext();

      // Assert
      expect(document.getElementById).toHaveBeenCalledWith('mcp-context-list');
      expect(MCPContextSelector.selectedContext).toHaveLength(0);
      expect(contextListElement.innerHTML).toContain('No context selected');
    });
  });

  describe('addCustomContext', () => {
    it('should add a custom context URI', () => {
      // Arrange
      const inputElement = { value: 'custom-server://custom-resource' };
      document.getElementById.mockReturnValueOnce(inputElement);
      
      const contextListElement = { innerHTML: '' };
      document.getElementById.mockReturnValueOnce(contextListElement);

      // Act
      MCPContextSelector.addCustomContext();

      // Assert
      expect(document.getElementById).toHaveBeenCalledWith('mcp-context-input');
      expect(document.getElementById).toHaveBeenCalledWith('mcp-context-list');
      expect(MCPContextSelector.selectedContext).toContain('custom-server://custom-resource');
      expect(inputElement.value).toBe('');
    });

    it('should validate the custom context URI format', () => {
      // Arrange
      const inputElement = { value: 'invalid-format' };
      document.getElementById.mockReturnValueOnce(inputElement);

      // Act
      MCPContextSelector.addCustomContext();

      // Assert
      expect(document.getElementById).toHaveBeenCalledWith('mcp-context-input');
      expect(Utils.showError).toHaveBeenCalledWith('Invalid context URI format. Use format: server://resource');
      expect(MCPContextSelector.selectedContext).toHaveLength(0);
    });

    it('should not add empty context', () => {
      // Arrange
      const inputElement = { value: '' };
      document.getElementById.mockReturnValueOnce(inputElement);

      // Act
      MCPContextSelector.addCustomContext();

      // Assert
      expect(document.getElementById).toHaveBeenCalledWith('mcp-context-input');
      expect(MCPContextSelector.selectedContext).toHaveLength(0);
    });
  });
});