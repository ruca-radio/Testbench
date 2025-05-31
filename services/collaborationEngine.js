/**
 * Simplified Multi-Agent Collaboration Engine
 * Basic agent-to-agent communication for personal use
 */

const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');

/**
 * Message Broker for Agent Communication
 */
class MessageBroker extends EventEmitter {
    constructor() {
        super();
        this.subscribers = new Map();
    }

    async publishMessage(message) {
        try {
            const enhancedMessage = {
                ...message,
                id: uuidv4(),
                timestamp: new Date().toISOString()
            };

            // Deliver directly to subscriber
            const callback = this.subscribers.get(message.toAgentId);
            if (callback) {
                callback(enhancedMessage);
            }
            return enhancedMessage;
        } catch (error) {
            console.error('Error publishing message:', error);
            throw error;
        }
    }

    async subscribeAgent(agentId, callback) {
        this.subscribers.set(agentId, callback);
    }
}

/**
 * Multi-Agent Collaboration Engine
 */
class CollaborationEngine extends EventEmitter {
    constructor() {
        super();
        this.messageBroker = new MessageBroker();
        this.connectedAgents = new Map();
        this.webSocketServer = null;
    }

    setWebSocketServer(io) {
        this.webSocketServer = io;
        this.setupWebSocketHandlers();
    }

    setupWebSocketHandlers() {
        if (!this.webSocketServer) return;

        this.webSocketServer.on('connection', (socket) => {
            console.log(`Agent client connected: ${socket.id}`);

            // Agent registration
            socket.on('agent:register', async (agentData) => {
                try {
                    this.connectedAgents.set(socket.id, {
                        agentId: agentData.agentId,
                        socketId: socket.id,
                        connectedAt: Date.now(),
                        status: 'online'
                    });

                    socket.agentId = agentData.agentId;
                    socket.join(`agent:${agentData.agentId}`);

                    // Subscribe to message broker
                    await this.messageBroker.subscribeAgent(agentData.agentId, (message) => {
                        socket.emit('agent:message', message);
                    });

                    socket.emit('agent:registered', { success: true, agentId: agentData.agentId });
                } catch (error) {
                    console.error('Error registering agent:', error);
                    socket.emit('agent:error', { error: error.message });
                }
            });

            // Agent messaging
            socket.on('agent:send', async (messageData) => {
                try {
                    const message = {
                        toAgentId: messageData.toAgentId,
                        fromAgentId: messageData.fromAgentId,
                        content: messageData.content,
                        messageType: messageData.messageType || 'message'
                    };

                    await this.messageBroker.publishMessage(message);
                    socket.emit('agent:message:sent', { success: true });
                } catch (error) {
                    console.error('Error sending agent message:', error);
                    socket.emit('agent:error', { error: error.message });
                }
            });

            // Disconnection handling
            socket.on('disconnect', () => {
                this.connectedAgents.delete(socket.id);
                console.log(`Agent client disconnected: ${socket.id}`);
            });
        });
    }
}

// Create singleton instance
const collaborationEngine = new CollaborationEngine();
module.exports = collaborationEngine;
