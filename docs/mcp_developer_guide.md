# MCP Developer Guide

This guide is for developers who want to build MCP servers or extend the MCP integration within the Multi-Model Agentic Chat platform.

## API Reference for MCP Endpoints

An MCP server typically exposes a set of standardized HTTP endpoints that the chat platform interacts with. While the exact specification can evolve, common endpoints include:

**1. Tool Discovery / Manifest Endpoint**

*   **Purpose:** Allows the chat platform to discover the tools and capabilities offered by the MCP server.
*   **Method:** `GET`
*   **Path:** Often `/manifest`, `/tools`, or `/` (root)
*   **Response (JSON):** A structured description of available tools. Each tool definition usually includes:
    *   `name`: A unique identifier for the tool (e.g., `get_weather`, `search_database`).
    *   `description`: A human-readable description of what the tool does, often used by the language model to understand its purpose.
    *   `parameters`: An object or array describing the input parameters the tool expects. For each parameter:
        *   `name`: Parameter name.
        *   `type`: Data type (e.g., `string`, `number`, `boolean`, `object`, `array`).
        *   `description`: Explanation of the parameter.
        *   `required`: Boolean indicating if the parameter is mandatory.
    *   `returns` (Optional): Description of the expected output or data structure returned by the tool.

    **Example Response:**
    ```json
    {
      "tools": [
        {
          "name": "get_current_weather",
          "description": "Fetches the current weather conditions for a specified location.",
          "parameters": [
            {
              "name": "location",
              "type": "string",
              "description": "The city and state, or zip code for which to get the weather.",
              "required": true
            },
            {
              "name": "unit",
              "type": "string",
              "description": "Temperature unit ('celsius' or 'fahrenheit'). Defaults to 'celsius'.",
              "required": false
            }
          ],
          "returns": {
            "type": "object",
            "properties": {
              "temperature": {"type": "number"},
              "condition": {"type": "string"},
              "humidity": {"type": "number"}
            }
          }
        }
        // ... other tools
      ]
    }
    ```

**2. Tool Execution Endpoint**

*   **Purpose:** Allows the chat platform to request the execution of a specific tool.
*   **Method:** `POST`
*   **Path:** Often `/execute_tool`, `/run/{tool_name}`, or a similar dynamic path.
*   **Request Body (JSON):**
    *   `tool_name`: The name of the tool to execute.
    *   `parameters`: An object containing the parameters and their values for the tool.

    **Example Request Body:**
    ```json
    {
      "tool_name": "get_current_weather",
      "parameters": {
        "location": "San Francisco, CA",
        "unit": "fahrenheit"
      }
    }
    ```
*   **Response (JSON):**
    *   **Success (e.g., HTTP 200 OK):**
        ```json
        {
          "status": "success",
          "result": {
            // Tool-specific output, e.g.:
            "temperature": 65,
            "condition": "Cloudy",
            "humidity": 70
          }
        }
        ```
    *   **Error (e.g., HTTP 4xx or 5xx):**
        ```json
        {
          "status": "error",
          "error_code": "INVALID_PARAMETER", // Or other error codes
          "message": "Required parameter 'location' was not provided."
        }
        ```

**Authentication:**
MCP servers should secure these endpoints. Common methods include:
*   **API Keys:** Passed in a header (e.g., `X-API-Key: YOUR_API_KEY` or `Authorization: Bearer YOUR_API_KEY`).
*   **OAuth 2.0:** For more complex scenarios.

## How to Extend the MCP Integration

There are two main ways to extend the MCP integration:

**1. Building a New MCP Server:**

*   **Choose a Language/Framework:** Select any programming language and web framework you are comfortable with (e.g., Python with Flask/FastAPI, Node.js with Express, Java with Spring Boot, Go).
*   **Implement Endpoints:**
    *   Create the `/manifest` (or equivalent) endpoint to describe your tools.
    *   Create the `/execute_tool` (or equivalent) endpoint to handle tool execution requests.
*   **Define Tools:** Design the tools your server will offer. For each tool:
    *   Determine its purpose and functionality.
    *   Define its input parameters (name, type, description, required).
    *   Define the structure of its output.
*   **Implement Tool Logic:** Write the code that performs the action for each tool (e.g., call an external API, query a database, run a calculation).
*   **Add Authentication:** Secure your MCP server's endpoints.
*   **Documentation:** Document your MCP server's API, including available tools, parameters, and authentication methods.
*   **Deployment:** Deploy your MCP server to a reachable environment (cloud, on-premise).
*   **Registration:** Add and configure your new MCP server in the Multi-Model Agentic Chat platform (see Setup and Configuration guide).

**2. Contributing to an Existing MCP Server:**

*   If an existing MCP server is open source or managed internally, you might be able to contribute new tools or improvements to it.
*   Follow the contribution guidelines of that specific project.
*   This typically involves understanding its codebase, adding new tool definitions to its manifest, and implementing the corresponding execution logic.

## Testing and Security Guidelines for MCP Server Developers

**Testing:**

*   **Unit Tests:** Test individual components and functions within your MCP server, especially the logic for each tool.
*   **Integration Tests:** Test the interaction between your MCP server and any external services it relies on (e.g., third-party APIs, databases). Mock these external services where appropriate.
*   **Endpoint Tests (API Tests):**
    *   Test the `/manifest` endpoint to ensure it returns a correctly formatted list of tools.
    *   Test the `/execute_tool` endpoint with various valid and invalid inputs:
        *   Correct parameters.
        *   Missing required parameters.
        *   Incorrect parameter types.
        *   Edge cases.
    *   Verify successful responses and error responses (correct status codes and error messages).
*   **Security Testing:**
    *   Test authentication mechanisms.
    *   Attempt common web vulnerabilities (e.g., injection attacks if your tools process raw input in unsafe ways, though this should be mitigated by design).
*   **Load Testing (Optional but Recommended):** If your MCP server is expected to handle high traffic, perform load tests to understand its performance characteristics.

**Security Guidelines:**

*   **Authentication:** Always require authentication for your MCP server endpoints. Use strong API keys or other robust authentication methods.
*   **Authorization:** If different tools or data require different access levels, implement authorization checks after authentication.
*   **Input Validation:**
    *   Rigorously validate all incoming data from the chat platform (tool names, parameter values, types).
    *   Do not trust input. Sanitize or reject unexpected/malformed data.
    *   Protect against injection vulnerabilities if parameters are used to construct queries or commands. Use parameterized queries for databases.
*   **HTTPS:** Expose your MCP server endpoints over HTTPS only.
*   **Error Handling:** Implement robust error handling. Return clear, informative error messages but avoid leaking sensitive internal details.
*   **Least Privilege:** If your MCP server interacts with other services (databases, APIs), ensure the credentials it uses have the minimum necessary permissions.
*   **Dependency Management:** Keep your server's software dependencies up-to-date to patch known vulnerabilities.
*   **Logging:** Log requests, responses, and errors for auditing, debugging, and security monitoring. Be careful not to log sensitive data like API keys or full request/response payloads if they contain PII.
*   **Rate Limiting:** Implement rate limiting to protect your server and any backend services from abuse or denial-of-service attacks.
*   **Secrets Management:** Store API keys, database credentials, and other secrets securely (e.g., using environment variables, a secrets management service like HashiCorp Vault, AWS Secrets Manager, etc.). Do not hardcode them in your source code.
*   **Regular Security Audits:** Periodically review your MCP server's code and configuration for security vulnerabilities.