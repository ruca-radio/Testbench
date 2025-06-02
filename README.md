# AI Inference Platform

A comprehensive, multi-model, multi-provider AI inference platform with advanced widget-based UI, multi-agent collaboration, and infinite extensibility.

## Overview

This platform provides a flexible and powerful environment for AI interaction, supporting:
- **Multiple AI Providers**: OpenAI, Anthropic, OpenRouter, Ollama, and MCP servers
- **Multi-Agent Collaboration**: Agents can work together in various orchestration modes
- **Widget-Based UI**: Drag-and-drop interface with customizable workspaces
- **Human-in-the-Loop**: Seamless integration of human oversight in AI workflows
- **Knowledge Management**: RAG capabilities with document and knowledge base support
- **Real-time Collaboration**: Multiple users can work together in shared sessions

## Key Features

### 🤖 Multi-Provider Support
- **OpenAI**: GPT-4o, GPT-4o-mini, and other OpenAI models
- **Anthropic**: Claude 3.5 Sonnet, Claude 3 Haiku, and other Claude models
- **OpenRouter**: Access to 100+ models through a single API
- **Ollama**: Local model support for privacy-conscious deployments
- **MCP (Model Context Protocol)**: Support for MCP-compliant servers

### 🎭 Advanced Agent System
- **Agent Roles**: Orchestrator, Specialist, Reviewer, Coder, Researcher, Analyst, Writer
- **Orchestration Modes**:
  - Sequential: Agents work one after another
  - Parallel: Multiple agents work simultaneously
  - Hierarchical: Lead agent delegates to sub-agents
  - Collaborative: Agents discuss and reach consensus
- **Human-in-the-Loop**: Request human intervention when needed
- **Agent Communication**: Direct agent-to-agent messaging

### 🧩 Widget System
- **Workspace Types**:
  - **Chat**: Simple single-model chat interface
  - **Agentic**: Multi-agent collaboration workspace
  - **Testing**: Model comparison and benchmarking
  - **Collaborative**: Real-time shared sessions
  - **Research**: Knowledge-enhanced workflows
  - **Development**: Code-focused environment
- **Core Widgets**:
  - Chat Widget
  - Shared Chat Widget
  - Agent Orchestrator
  - Model Comparison
  - System Monitor
  - Quick Config
  - Agent Status
  - Conversation History
- **Widget Features**:
  - Drag-and-drop positioning
  - Resizable and minimizable
  - Grid-based layout (12x12)
  - Save/load layouts
  - Export/import configurations

### 📚 Knowledge Management
- **Knowledge Bases**: Create and manage document collections
- **RAG Integration**: Automatic context retrieval for enhanced responses
- **Document Support**: PDF, TXT, MD, and other formats
- **Vector Search**: Efficient similarity-based retrieval
- **Citation Tracking**: Source attribution for generated responses

### 🔧 Developer Features
- **RESTful API**: Full programmatic access
- **WebSocket Support**: Real-time communication
- **Plugin System**: Extend functionality with custom tools
- **MCP Integration**: Connect to external tool servers
- **Comprehensive Logging**: Detailed activity and error tracking

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- API keys for desired providers

### Installation

1. Clone the repository:
```bash
git clone https://github.com/patrickdeluca/Testbench.git
cd Testbench
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment:
```bash
cp .env.example .env
```

4. Edit `.env` and add your API keys:
```env
# Required for OpenAI models
OPENAI_API_KEY=your-key-here

# Optional providers
ANTHROPIC_API_KEY=your-key-here
OPENROUTER_API_KEY=your-key-here
OLLAMA_BASE_URL=http://localhost:11434

# Server configuration
PORT=3000
NODE_ENV=production
```

5. Start the server:
```bash
npm start
```

6. Open your browser at http://localhost:3000

## Usage Guide

### Basic Chat
1. Select a model from the dropdown
2. Type your message and press Enter
3. View AI responses in the chat interface

### Multi-Agent Collaboration
1. Click the workspace selector and choose "Agentic"
2. Add agents using the "+" button
3. Configure agent roles and models
4. Create a new task and assign agents
5. Watch agents collaborate in real-time

### Model Comparison
1. Select "Testing" workspace type
2. Add Model Comparison widget
3. Select models to compare
4. Create test cases or use defaults
5. Run comparison and analyze results

### Widget Management
1. Press `Ctrl+E` to enter edit mode
2. Click "Add Widget" to add new widgets
3. Drag widgets to reposition
4. Resize using corner handles
5. Save layout for future use

## API Documentation

### Chat Endpoint
```http
POST /chat
Content-Type: application/json

{
  "messages": [
    {"role": "user", "content": "Hello"}
  ],
  "model": "gpt-4o",
  "temperature": 0.7,
  "maxTokens": 2000
}
```

### Agent Execution
```http
POST /api/agents/execute
Content-Type: application/json

{
  "agentId": "agent-123",
  "message": "Analyze this code",
  "context": {
    "sessionId": "session-456",
    "previousMessages": []
  }
}
```

### Model Refresh
```http
GET /api/models/refresh
```

## Configuration

### Provider Settings
Configure providers in Settings modal or via API:
- API keys
- Base URLs
- Model availability
- Rate limits

### Agent Configuration
```json
{
  "name": "Code Expert",
  "role": "coder",
  "model": "claude-3-5-sonnet-20241022",
  "provider": "anthropic",
  "settings": {
    "temperature": 0.3,
    "system_prompt": "You are an expert programmer..."
  }
}
```

### Workspace Configuration
Workspaces are saved automatically and include:
- Widget positions and states
- Active agents
- Model selections
- User preferences

## Advanced Features

### MCP Server Integration
1. Configure MCP servers in settings
2. Enable desired tools
3. Use natural language to invoke tools
4. View tool execution results

### Knowledge Base Creation
1. Navigate to Knowledge Manager
2. Create new knowledge base
3. Upload documents
4. Configure retrieval settings
5. Enable for conversations

### Custom Workflows
Create automated workflows using the orchestration engine:
```javascript
{
  "name": "Code Review Workflow",
  "steps": [
    {
      "agent": "coder",
      "action": "implement",
      "prompt": "Implement the requested feature"
    },
    {
      "agent": "reviewer", 
      "action": "review",
      "prompt": "Review the code for quality and security"
    },
    {
      "type": "human_review",
      "prompt": "Approve final implementation"
    }
  ]
}
```

## Troubleshooting

### Common Issues

**Models not loading:**
- Check API key configuration
- Verify provider endpoints
- Review browser console for errors

**Agent communication failures:**
- Ensure agents are properly configured
- Check orchestration mode settings
- Verify agent roles and capabilities

**Widget system issues:**
- Clear browser cache
- Reset layout to defaults
- Check browser compatibility

### Debug Mode
Enable debug logging:
```env
DEBUG=true
LOG_LEVEL=debug
```

## Contributing

We welcome contributions! Please see our contributing guidelines for:
- Code style standards
- Testing requirements
- Pull request process
- Issue reporting

## Security

- API keys are stored securely and never exposed to clients
- All inter-agent communication is logged
- Human-in-the-loop for sensitive operations
- Rate limiting and usage monitoring
- Input validation and sanitization

## License

[License Type] - See LICENSE file for details

## Acknowledgments

Built with:
- Express.js for the backend
- SQLite for data persistence
- Modern vanilla JavaScript for the frontend
- Various AI provider SDKs

## Support

For issues, questions, or contributions:
- GitHub Issues: [repository-issues-url]
- Documentation: See `/docs` folder
- Community: [community-link]
