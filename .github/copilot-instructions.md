# GitHub Copilot Instructions for Testbench

## Project Overview

Testbench is a comprehensive, multi-model, multi-provider AI inference platform with advanced widget-based UI, multi-agent collaboration, and infinite extensibility. The project uses Node.js/Express for the backend and vanilla JavaScript for the frontend.

## Technology Stack

- **Backend**: Node.js 18+, Express.js
- **Database**: SQLite with better-sqlite3
- **Frontend**: Vanilla JavaScript (no framework), HTML, CSS
- **AI Providers**: OpenAI, Anthropic, OpenRouter, Ollama, MCP servers
- **Testing**: Jest with node, jsdom environments
- **Real-time**: Socket.io (partial implementation)
- **Authentication**: JWT-based (middleware exists)

## Code Style and Standards

### General Principles

- Write clean, maintainable code with clear separation of concerns
- Follow existing patterns in the codebase
- Prioritize readability over cleverness
- Use async/await for asynchronous operations (avoid callbacks)
- Handle errors gracefully with try-catch blocks
- Log errors with context using console.error

### JavaScript Style

- Use `const` by default, `let` when reassignment is needed, never `var`
- Use template literals for string interpolation
- Use arrow functions for callbacks and functional operations
- Use destructuring for object and array values when it improves readability
- Follow semicolon usage as seen in existing files (generally used)
- Use meaningful variable and function names (descriptive, not abbreviated)

### Backend (Node.js/Express)

- **File Organization**:
  - Routes in `/routes` - each route file handles a specific domain (agents, chat, models, etc.)
  - Middleware in `/middleware` - authentication, rate limiting, etc.
  - Providers in `/providers` - one file per AI provider (openai.js, anthropic.js, etc.)
  - Services in `/services` - business logic and shared functionality
  - Utils in `/utils` - helper functions and utilities

- **API Endpoints**:
  - Use RESTful conventions
  - Return consistent JSON responses with `{ success: boolean, data?: any, error?: string }`
  - Handle errors with proper HTTP status codes (400, 401, 404, 500, etc.)
  - Include request validation
  - Use async route handlers with try-catch blocks

- **Database**:
  - Use better-sqlite3 synchronous API
  - Database initialization in `database.js`
  - Use prepared statements to prevent SQL injection
  - Include proper error handling for database operations

- **Provider Integration**:
  - Each provider should implement consistent interface
  - Handle streaming responses where supported
  - Implement proper error handling and retry logic
  - Include model discovery and configuration

### Frontend (Vanilla JavaScript)

- **File Organization**:
  - Main HTML files in `/public` (index.html, collaboration.html, etc.)
  - JavaScript in `/public/js`
  - CSS in `/public/css`
  - Static assets in `/public/images`

- **Widget System**:
  - All widgets should extend `BaseWidget` class when appropriate
  - Widgets use grid-based layout (12x12)
  - Implement drag-and-drop with existing patterns
  - Save/restore widget state
  - Handle resize and minimize events

- **UI Patterns**:
  - Use vanilla JavaScript DOM manipulation (no jQuery or frameworks)
  - Event delegation for dynamic content
  - Fetch API for HTTP requests
  - WebSocket/Socket.io for real-time features (when fully implemented)
  - Use `async/await` for API calls

- **Styling**:
  - Use existing CSS classes and patterns
  - Maintain consistent spacing and layout
  - Support both light and dark modes where applicable
  - Ensure responsive design for widgets

### Testing

- **Test Organization**:
  - Unit tests in `/tests/unit`
  - Integration tests in `/tests/integration`
  - UI tests in `/tests/ui`
  - Use descriptive test names that explain what is being tested

- **Test Structure**:
  - Use Jest test framework
  - Group related tests with `describe` blocks
  - Use `beforeEach`/`afterEach` for setup/cleanup
  - Mock external dependencies (API calls, database, etc.)
  - Test both success and error cases
  - Aim for 70% code coverage (as configured in jest.config.js)

- **Test Patterns**:
  ```javascript
  describe('Feature or Component', () => {
    beforeEach(() => {
      // Setup
    });

    test('should do something specific', async () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = await functionUnderTest(input);
      
      // Assert
      expect(result).toBe(expected);
    });

    test('should handle errors appropriately', async () => {
      // Test error cases
    });
  });
  ```

## Multi-Agent System

- **Agent Roles**: Orchestrator, Specialist, Reviewer, Coder, Researcher, Analyst, Writer
- **Orchestration Modes**: Sequential, Parallel, Hierarchical, Collaborative
- **Agent Communication**: Use `/api/agents/execute` endpoint for agent-to-agent messaging
- **Human-in-the-Loop**: Support requesting human intervention when needed

## Security Considerations

- Never commit API keys or secrets (use `.env` file)
- Validate and sanitize all user inputs
- Use rate limiting for API endpoints (already configured)
- Implement proper authentication checks using middleware
- Prevent SQL injection with prepared statements
- Handle CORS appropriately (already configured)

## Documentation

- Add JSDoc comments for public functions and complex logic
- Update README.md when adding major features
- Include inline comments for non-obvious code
- Document API endpoints with request/response examples

## Error Handling

- Use try-catch blocks for async operations
- Provide meaningful error messages to users
- Log errors with sufficient context for debugging
- Use appropriate HTTP status codes
- Implement graceful degradation where possible

## Performance

- Use connection pooling for database operations
- Implement caching where appropriate
- Stream large responses when possible
- Use pagination for list endpoints
- Minimize database queries (avoid N+1 queries)

## Dependencies

- Add new dependencies only when necessary
- Prefer well-maintained, popular packages
- Keep dependencies up to date
- Document why a dependency was added

## Git Practices

- Write clear, descriptive commit messages
- Keep commits focused on a single concern
- Test changes before committing
- Follow the existing branching strategy

## Environment Configuration

- Use `.env` file for configuration (never commit it)
- Provide `.env.example` with all required variables
- Document all environment variables
- Use sensible defaults where appropriate

## Common Patterns to Follow

### API Route Pattern
```javascript
router.post('/endpoint', async (req, res) => {
  try {
    // Validate request
    const { param } = req.body;
    if (!param) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameter' 
      });
    }

    // Process request
    const result = await processRequest(param);

    // Return response
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error in endpoint:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});
```

### Provider Integration Pattern
```javascript
async function sendRequest(messages, options = {}) {
  try {
    const response = await client.chat.completions.create({
      model: options.model,
      messages: messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2000,
      stream: options.stream || false
    });

    return response;
  } catch (error) {
    console.error('Provider error:', error);
    throw new Error(`Provider request failed: ${error.message}`);
  }
}
```

### Widget Pattern (Frontend)
```javascript
class CustomWidget extends BaseWidget {
  constructor(config) {
    super(config);
    this.initializeWidget();
  }

  initializeWidget() {
    this.createUI();
    this.attachEventListeners();
  }

  createUI() {
    // Build widget HTML
  }

  attachEventListeners() {
    // Attach event handlers
  }

  async handleAction() {
    try {
      const response = await fetch('/api/endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data })
      });
      
      const result = await response.json();
      this.updateUI(result);
    } catch (error) {
      this.showError(error.message);
    }
  }
}
```

## When Making Changes

1. **Understand the context**: Review related files and existing patterns
2. **Test your changes**: Run tests with `npm test`
3. **Follow conventions**: Match the style and structure of existing code
4. **Handle errors**: Add appropriate error handling
5. **Update documentation**: Document new features or changes
6. **Consider impact**: Think about how changes affect other parts of the system

## Areas Under Active Development

- Real-time collaboration features (WebSocket implementation)
- Knowledge management and RAG integration
- Advanced workflow designer
- Enhanced testing and benchmarking capabilities

## Known Technical Debt

- Some widgets use inconsistent patterns (extending vs not extending BaseWidget)
- Mixed async/callback patterns in some areas
- Missing WebSocket server implementation for real-time features
- Limited automated test coverage in some areas

When working in these areas, prioritize consistency and follow the newer patterns found in recently updated files.
