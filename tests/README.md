# MCP Server Integration Tests

This directory contains tests for the MCP Server integration in our Multi-Model Agentic Chat platform.

## Test Structure

The tests are organized into the following categories:

- **Unit Tests** (`tests/unit/`): Tests for individual functions and modules
- **Integration Tests** (`tests/integration/`): Tests for API routes and interactions between components
- **UI Component Tests** (`tests/ui/`): Tests for UI components and user interactions

## Test Files

### Unit Tests

- `providers-mcp.test.js`: Tests for the MCP provider functions in `providers/mcp.js`

### Integration Tests

- `routes-mcp.test.js`: Tests for the MCP server routes in `routes/mcp.js`
- `routes-chat-mcp.test.js`: Tests for the chat route with MCP context in `routes/chat.js`

### UI Component Tests

- `mcp-manager.test.js`: Tests for the MCP server management interface in `public/js/mcp-manager.js`
- `mcp-context-selector.test.js`: Tests for the MCP context selector in `public/js/mcp-context-selector.js`

## Test Helpers

- `test-helpers.js`: Common test utilities and mock data

## Running Tests

You can run the tests using the following command:

```bash
node run-tests.js
```

Or run individual test categories:

```bash
# Run unit tests
npx jest tests/unit

# Run integration tests
npx jest tests/integration

# Run UI component tests
npx jest tests/ui
```

## Test Coverage

The tests cover:

- **Happy path scenarios**: Tests for successful operations
- **Error handling**: Tests for error conditions and edge cases
- **Security aspects**: Tests for API key handling and permissions
- **Performance considerations**: Tests for efficient resource usage

## Test Approach

The tests follow the Test-Driven Development (TDD) approach:

1. Write failing tests first
2. Implement the minimum code to make the tests pass
3. Refactor the code while keeping the tests passing

## Mocking

The tests use Jest's mocking capabilities to mock external dependencies:

- `node-fetch` for HTTP requests
- Database functions
- DOM elements for UI tests

## Test Environment

The tests run in a Node.js environment using Jest. The UI tests use Jest's DOM manipulation capabilities to test the UI components without a browser.