# MCP Server Setup and Configuration

This guide details how to add, configure, and manage MCP servers within the Multi-Model Agentic Chat platform.

## Adding and Configuring MCP Servers

MCP servers are added and configured through the platform's settings interface or via a configuration file.

**1. Via Platform Settings UI (Recommended for most users):**

*   Navigate to the "Settings" or "Integrations" section of the platform.
*   Look for an "MCP Servers" or "External Tools" management area.
*   Click "Add New MCP Server" or a similar button.
*   You will typically need to provide the following information:
    *   **Server Name:** A user-friendly name for the MCP server (e.g., "Weather API Server", "Internal Database Access").
    *   **Server URL:** The base URL of the MCP server (e.g., `https://mcp.example.com/api`).
    *   **API Key (if required):** The API key or authentication token for accessing this MCP server. This should be handled securely.
    *   **Description (Optional):** A brief description of the server's purpose or the tools it provides.
    *   **Enabled/Disabled:** A toggle to activate or deactivate the server.

**2. Via Configuration File (Advanced users / GitOps):**

MCP server configurations can also be managed in a central configuration file (e.g., `config.json`, `settings.yaml`, or environment variables). The exact file and format depend on the platform's architecture.

Example (conceptual `mcp_servers.json`):
```json
[
  {
    "name": "Weather API Server",
    "url": "https://api.weatherprovider.com/mcp",
    "apiKey": "YOUR_WEATHER_API_KEY_HERE", // Consider using environment variables for sensitive data
    "description": "Provides weather information tools.",
    "enabled": true
  },
  {
    "name": "Knowledge Base Access",
    "url": "http://localhost:8080/mcp-kb", // Internal MCP server
    "apiKey": null, // No API key needed for this internal server
    "description": "Access to internal company knowledge base.",
    "enabled": true
  }
]
```

*   Refer to the platform's main documentation for the specific configuration file path and structure.
*   **Important:** Avoid hardcoding API keys directly in version-controlled configuration files. Use environment variables or a secrets management system.

## Security Considerations and Best Practices

*   **HTTPS:** Always use HTTPS for MCP server URLs to ensure encrypted communication.
*   **API Key Management:**
    *   Store API keys securely. Do not embed them directly in client-side code or version-controlled files unless they are placeholders for environment variables.
    *   Use environment variables (e.g., `MCP_WEATHER_API_KEY`) on the server running the chat platform to inject API keys into the configuration.
    *   Rotate API keys regularly according to the provider's recommendations.
    *   Grant API keys the minimum necessary permissions.
*   **Network Security:**
    *   If MCP servers are internal, ensure they are protected by firewalls and network segmentation.
    *   Restrict access to MCP server endpoints to only the chat platform's IP address if possible.
*   **Input Validation:** The chat platform and MCP servers should validate all inputs to prevent injection attacks or unexpected behavior.
*   **Authentication and Authorization:**
    *   MCP servers should authenticate requests from the chat platform (e.g., via API keys, OAuth tokens).
    *   Implement authorization checks if different tools or data within an MCP server require different access levels.
*   **Rate Limiting:** Implement rate limiting on MCP servers to prevent abuse and ensure fair usage. The chat platform may also implement client-side rate limiting.
*   **Logging and Monitoring:** Maintain logs for MCP server requests and responses for auditing and troubleshooting. Monitor server health and performance.

## Environment Variables and Configuration Options

The chat platform may use environment variables to configure aspects of the MCP integration globally or to supply sensitive information like API keys.

Common environment variables might include:

*   `MCP_SERVER_CONFIG_PATH`: Path to a JSON or YAML file listing MCP server configurations.
*   `MCP_DEFAULT_TIMEOUT_MS`: Default timeout in milliseconds for requests to MCP servers.
*   `MCP_GLOBAL_API_KEY_FOR_SERVER_[SERVER_NAME]`: A pattern for supplying API keys, e.g., `MCP_GLOBAL_API_KEY_FOR_WEATHER_API_SERVER`.

Specific configuration options available within the platform settings or configuration files could include:

*   **Timeout Settings:** Per-server or global timeout for MCP requests.
*   **Retry Mechanisms:** Configuration for retrying failed MCP requests.
*   **Tool Whitelisting/Blacklisting:** Options to explicitly enable or disable specific tools from an MCP server, even if the server itself is enabled.
*   **Caching:** Settings for caching responses from MCP servers to improve performance and reduce costs.

Always consult the primary documentation for your specific version of the Multi-Model Agentic Chat platform for the most accurate and up-to-date list of environment variables and configuration options related to MCP server integration.