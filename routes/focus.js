const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authenticate } = require('../middleware/auth');

// Focus Mode API endpoints

// Save conversation
router.post('/api/focus/conversations/save', authenticate({ required: false }), async (req, res) => {
    try {
        const { id, type, branches, currentBranch, created, updated, metadata } = req.body;
        
        if (!id || !branches) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Prepare the query
        const saveConversation = db.prepare(`
            INSERT OR REPLACE INTO focus_conversations 
            (id, type, branches, current_branch, created, updated, metadata, user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const userId = req.user?.id || null;
        
        saveConversation.run(
            id,
            type || 'focus',
            JSON.stringify(branches),
            currentBranch || 'main',
            created || new Date().toISOString(),
            updated || new Date().toISOString(),
            JSON.stringify(metadata || {}),
            userId
        );

        res.json({ 
            success: true, 
            message: 'Conversation saved successfully',
            id: id
        });

    } catch (error) {
        console.error('Error saving focus conversation:', error);
        res.status(500).json({ error: 'Failed to save conversation' });
    }
});

// Load conversation
router.get('/api/focus/conversations/:id', authenticate({ required: false }), async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id || null;

        const getConversation = db.prepare(`
            SELECT * FROM focus_conversations 
            WHERE id = ? AND (user_id = ? OR user_id IS NULL)
        `);

        const conversation = getConversation.get(id, userId);

        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        // Parse JSON fields
        conversation.branches = JSON.parse(conversation.branches);
        conversation.metadata = JSON.parse(conversation.metadata);

        res.json({ conversation });

    } catch (error) {
        console.error('Error loading focus conversation:', error);
        res.status(500).json({ error: 'Failed to load conversation' });
    }
});

// List conversations
router.get('/api/focus/conversations', authenticate({ required: false }), async (req, res) => {
    try {
        const userId = req.user?.id || null;
        const { limit = 50, offset = 0 } = req.query;

        const getConversations = db.prepare(`
            SELECT id, type, current_branch, created, updated, metadata
            FROM focus_conversations 
            WHERE user_id = ? OR user_id IS NULL
            ORDER BY updated DESC
            LIMIT ? OFFSET ?
        `);

        const conversations = getConversations.all(userId, parseInt(limit), parseInt(offset));

        // Parse metadata for each conversation
        conversations.forEach(conv => {
            conv.metadata = JSON.parse(conv.metadata);
        });

        res.json({ conversations });

    } catch (error) {
        console.error('Error listing focus conversations:', error);
        res.status(500).json({ error: 'Failed to list conversations' });
    }
});

// Delete conversation
router.delete('/api/focus/conversations/:id', authenticate({ required: false }), async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id || null;

        const deleteConversation = db.prepare(`
            DELETE FROM focus_conversations 
            WHERE id = ? AND (user_id = ? OR user_id IS NULL)
        `);

        const result = deleteConversation.run(id, userId);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        res.json({ success: true, message: 'Conversation deleted successfully' });

    } catch (error) {
        console.error('Error deleting focus conversation:', error);
        res.status(500).json({ error: 'Failed to delete conversation' });
    }
});

// Export conversation as PDF
router.post('/api/focus/export/pdf', authenticate({ required: false }), async (req, res) => {
    try {
        const exportData = req.body;
        
        // For now, we'll return an HTML version that can be printed to PDF
        // In a full implementation, you might use puppeteer or similar
        
        let html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${exportData.title}</title>
                <meta charset="utf-8">
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        max-width: 800px; 
                        margin: 0 auto; 
                        padding: 20px; 
                        line-height: 1.6;
                    }
                    .header { 
                        border-bottom: 2px solid #333; 
                        margin-bottom: 30px; 
                        padding-bottom: 20px; 
                    }
                    .message { 
                        margin-bottom: 20px; 
                        padding: 15px; 
                        border-radius: 8px; 
                        page-break-inside: avoid;
                    }
                    .user { 
                        background-color: #e3f2fd; 
                        margin-left: 50px;
                    }
                    .assistant { 
                        background-color: #f3e5f5; 
                        margin-right: 50px;
                    }
                    .system {
                        background-color: #f5f5f5;
                        font-style: italic;
                    }
                    .timestamp { 
                        color: #666; 
                        font-size: 0.9em; 
                        margin-bottom: 5px;
                    }
                    .branch { 
                        border-top: 2px solid #ddd; 
                        margin-top: 30px; 
                        padding-top: 20px; 
                        page-break-before: always;
                    }
                    .branch-header {
                        background-color: #f0f0f0;
                        padding: 10px;
                        margin-bottom: 20px;
                        border-radius: 5px;
                    }
                    pre { 
                        background: #f5f5f5; 
                        padding: 10px; 
                        overflow-x: auto; 
                        border-radius: 4px;
                    }
                    code {
                        background: #f5f5f5;
                        padding: 2px 4px;
                        border-radius: 3px;
                    }
                    @media print {
                        body { margin: 0; padding: 15px; }
                        .message { break-inside: avoid; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${exportData.title}</h1>
                    <p><strong>Created:</strong> ${new Date(exportData.created).toLocaleString()}</p>
                    ${exportData.currentBranch ? `<p><strong>Branch:</strong> ${exportData.currentBranch}</p>` : ''}
                </div>
        `;

        if (exportData.branches) {
            for (const [branchName, messages] of Object.entries(exportData.branches)) {
                html += `
                    <div class="branch">
                        <div class="branch-header">
                            <h2>Branch: ${branchName}</h2>
                        </div>
                `;
                html += formatMessagesAsHTML(messages);
                html += '</div>';
            }
        } else if (exportData.messages) {
            html += formatMessagesAsHTML(exportData.messages);
        }

        html += '</body></html>';

        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Disposition', `attachment; filename="conversation-${Date.now()}.html"`);
        res.send(html);

    } catch (error) {
        console.error('Error exporting PDF:', error);
        res.status(500).json({ error: 'Failed to export PDF' });
    }
});

function formatMessagesAsHTML(messages) {
    return messages.map(msg => {
        let messageClass = msg.role;
        if (msg.isError) messageClass += ' error';
        if (msg.isCompressed) messageClass += ' compressed';

        let content = `<div class="message ${messageClass}">`;
        
        if (msg.timestamp) {
            content += `<div class="timestamp">${new Date(msg.timestamp).toLocaleString()}</div>`;
        }
        
        content += `<div class="role"><strong>${msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'Assistant' : 'System'}:</strong></div>`;
        
        // Format message content with basic markdown support
        let formattedContent = msg.content
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
            
        content += `<div class="content">${formattedContent}</div>`;
        
        if (msg.metadata) {
            content += '<div class="metadata">';
            if (msg.metadata.model) content += `<small>Model: ${msg.metadata.model}</small> `;
            if (msg.metadata.tokens) content += `<small>Tokens: ${msg.metadata.tokens}</small>`;
            content += '</div>';
        }
        
        content += '</div>';
        return content;
    }).join('');
}

// Conversation analysis endpoint
router.post('/api/focus/analyze', authenticate({ required: false }), async (req, res) => {
    try {
        const { messages, analysisType = 'comprehensive' } = req.body;
        
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Messages array is required' });
        }

        // Create analysis prompt based on type
        let prompt;
        switch (analysisType) {
            case 'sentiment':
                prompt = 'Analyze the sentiment of this conversation. Provide an overall sentiment score (positive/negative/neutral) and identify emotional patterns.';
                break;
            case 'topics':
                prompt = 'Extract and list the main topics discussed in this conversation. Organize them by importance and frequency.';
                break;
            case 'summary':
                prompt = 'Create a concise summary of this conversation, highlighting key points, decisions, and outcomes.';
                break;
            case 'keypoints':
                prompt = 'Identify and list the key points, important insights, and actionable items from this conversation.';
                break;
            default:
                prompt = `Analyze this conversation and provide insights on:
1. Main topics discussed
2. Conversation sentiment  
3. Key points and decisions
4. Areas that need follow-up
5. Overall conversation quality`;
        }

        const conversationText = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
        const fullPrompt = `${prompt}\n\nConversation:\n${conversationText}`;

        // Use the chat endpoint for analysis
        const analysisResponse = await fetch(`${req.protocol}://${req.get('host')}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [{ role: 'user', content: fullPrompt }],
                model: 'gpt-4o',
                provider: 'openai'
            })
        });

        if (!analysisResponse.ok) {
            throw new Error('Analysis request failed');
        }

        const analysisData = await analysisResponse.json();
        const analysis = analysisData.choices?.[0]?.message?.content || 'Analysis failed';

        res.json({
            analysisType,
            analysis,
            messageCount: messages.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error analyzing conversation:', error);
        res.status(500).json({ error: 'Failed to analyze conversation' });
    }
});

// Template management
router.get('/api/focus/templates', authenticate({ required: false }), async (req, res) => {
    try {
        const templates = {
            brainstorm: {
                name: 'Brainstorming Session',
                description: 'Start a creative brainstorming session',
                template: "Let's brainstorm ideas about [topic]. Please help me explore different angles and creative solutions.",
                category: 'creative'
            },
            explain: {
                name: 'Explanation Request',
                description: 'Ask for detailed explanation',
                template: "Can you explain [concept/topic] in detail? I'd like to understand the key principles and practical applications.",
                category: 'learning'
            },
            'problem-solve': {
                name: 'Problem Solving',
                description: 'Structured problem-solving approach',
                template: "I'm facing a challenge with [describe problem]. Can you help me break it down and find potential solutions?",
                category: 'productivity'
            },
            creative: {
                name: 'Creative Writing',
                description: 'Creative writing assistance',
                template: "I need help with creative writing about [theme/topic]. Can you provide inspiration and help develop ideas?",
                category: 'creative'
            },
            analysis: {
                name: 'Analysis Request',
                description: 'In-depth analysis template',
                template: "Please analyze [subject/data/situation] and provide insights on: 1) Key patterns, 2) Important findings, 3) Recommendations for action.",
                category: 'analysis'
            },
            research: {
                name: 'Research Assistance',
                description: 'Research and information gathering',
                template: "I'm researching [topic]. Can you help me understand the current state, key players, recent developments, and important considerations?",
                category: 'research'
            }
        };

        res.json({ templates });

    } catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
});

module.exports = router;