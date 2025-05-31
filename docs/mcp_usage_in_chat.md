# Using MCP in Chat

This document explains how users and models can leverage MCP server capabilities within the Multi-Model Agentic Chat platform.

## How to Use MCP Context in Conversations

Once MCP servers are configured and enabled, their tools become available to the language models during conversations. The process is typically seamless for the end-user.

1.  **Automatic Tool Discovery:**
    *   When a conversation starts or the context changes, the chat platform queries connected MCP servers for their available tools.
    *   Information about these tools (name, description, required parameters) is provided to the language model, often as part of the system prompt or a special tool manifest.

2.  **Model-Initiated Tool Use:**
    *   The language model, based on its understanding of the user's query and the available tools, can decide to use an MCP tool to fulfill the request.
    *   For example, if a user asks, "What's the weather in London?", and a `get_weather` tool is available via an MCP server, the model can request to use this tool.
    *   The model formulates a request to the platform, specifying the tool name and any necessary parameters (e.g., `tool_name: "get_weather"`, `parameters: {"location": "London"}`).

3.  **Platform Orchestration:**
    *   The chat platform receives the model's request.
    *   It identifies the correct MCP server responsible for the tool.
    *   It sends a standardized request to the MCP server to execute the tool with the provided parameters.

4.  **Receiving and Using Tool Output:**
    *   The MCP server processes the request and returns a result (e.g., weather data for London).
    *   The platform passes this result back to the language model.
    *   The model then uses this information to generate a natural language response for the user (e.g., "The current weather in London is...").

**User Experience:**
For the end-user, this process is often invisible. They simply ask a question or make a request, and the platform, in conjunction with the language model and MCP servers, works to provide an answer or perform an action. Some platforms might offer transparency by indicating when a tool is being used (e.g., "Searching for weather information...").

## Available MCP Tools and Resources

The specific MCP tools and resources available depend on the MCP servers connected to the platform. Each MCP server exposes a set of capabilities.

**Discovering Available Tools:**

*   **Platform UI:** Some platforms may have a UI section where users or administrators can view a list of all connected MCP servers and the tools they provide. This might include descriptions of each tool, expected inputs, and example usage.
*   **Model Interaction:** Users can sometimes ask the model directly about its capabilities, e.g., "What tools do you have access to?" or "Can you search the web for me?". The model's ability to answer accurately depends on how tool information is presented to it.
*   **Developer Documentation:** The primary source of truth for available tools from a specific MCP server is its own documentation, typically provided by the developer of that MCP server.

**Common Types of MCP Tools:**

*   **Data Retrieval:** Accessing databases, APIs for weather, stocks, news, etc.
*   **Computation:** Performing calculations, data analysis.
*   **External Service Interaction:** Sending emails, creating calendar events, interacting with project management tools.
*   **Custom Business Logic:** Executing proprietary business processes.

## Troubleshooting Common Issues

Here are some common issues that might arise when using MCP tools and how to approach troubleshooting:

1.  **Tool Not Available or Not Recognized:**
    *   **Cause:** The MCP server might be disabled, misconfigured, or unreachable. The specific tool might not be exposed by any connected server.
    *   **Troubleshooting:**
        *   Check the platform's MCP server configuration settings to ensure the server is enabled and the URL is correct.
        *   Verify network connectivity between the chat platform and the MCP server.
        *   Consult the MCP server's documentation to confirm the tool name and its availability.
        *   Check platform logs for errors related to MCP server discovery or communication.

2.  **Incorrect Tool Usage or Parameters:**
    *   **Cause:** The model might be trying to use a tool with incorrect parameter names, types, or values.
    *   **Troubleshooting:**
        *   This is often an issue for the model developers or prompt engineers to refine.
        *   If user input directly influences parameters, ensure the input is clear.
        *   Check MCP server logs for details on why a request was rejected (e.g., "Missing required parameter: 'location'").

3.  **MCP Server Errors:**
    *   **Cause:** The MCP server itself might encounter an internal error while processing a request, or the external service it relies on might be down.
    *   **Troubleshooting:**
        *   Check the logs of the specific MCP server for error messages.
        *   The error message returned to the chat platform might provide clues.
        *   If the MCP server relies on a third-party API, check the status of that API.

4.  **Timeout Issues:**
    *   **Cause:** The MCP server might be taking too long to respond, exceeding the configured timeout.
    *   **Troubleshooting:**
        *   Increase the timeout setting in the chat platform's configuration if appropriate.
        *   Investigate performance issues on the MCP server or the external services it calls.
        *   Optimize the MCP tool's execution time.

5.  **Authentication/Authorization Failures:**
    *   **Cause:** API key might be invalid, expired, or lack necessary permissions.
    *   **Troubleshooting:**
        *   Verify the API key used by the chat platform to connect to the MCP server.
        *   Ensure the API key has the correct permissions for the requested tool or resource on the MCP server.
        *   Check MCP server logs for authentication errors.

**General Troubleshooting Steps:**

*   **Check Platform Logs:** The main chat platform logs are often the first place to look for errors related to MCP interactions.
*   **Check MCP Server Logs:** If you have access, the logs on the MCP server itself can provide detailed error information.
*   **Isolate the Issue:** Try a simpler request or a different tool from the same MCP server to see if the issue is widespread or specific.
*   **Consult Documentation:** Refer to the documentation for both the chat platform and the specific MCP server.