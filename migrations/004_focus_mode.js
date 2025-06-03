const Database = require('better-sqlite3');

function migrateFocusMode(db) {
    console.log('Running Focus Mode migration...');

    try {
        // Create focus_conversations table
        db.exec(`
            CREATE TABLE IF NOT EXISTS focus_conversations (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL DEFAULT 'focus',
                branches TEXT NOT NULL, -- JSON string of conversation branches
                current_branch TEXT NOT NULL DEFAULT 'main',
                created TEXT NOT NULL,
                updated TEXT NOT NULL,
                metadata TEXT, -- JSON string for additional metadata
                user_id INTEGER,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Create index for better performance
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_focus_conversations_user_id 
            ON focus_conversations(user_id)
        `);

        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_focus_conversations_updated 
            ON focus_conversations(updated)
        `);

        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_focus_conversations_type 
            ON focus_conversations(type)
        `);

        // Create focus_templates table for conversation templates
        db.exec(`
            CREATE TABLE IF NOT EXISTS focus_templates (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                template_content TEXT NOT NULL,
                category TEXT DEFAULT 'general',
                user_id INTEGER,
                is_public INTEGER DEFAULT 0,
                created TEXT NOT NULL,
                updated TEXT NOT NULL,
                usage_count INTEGER DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Insert default templates
        const insertTemplate = db.prepare(`
            INSERT OR IGNORE INTO focus_templates 
            (id, name, description, template_content, category, is_public, created, updated)
            VALUES (?, ?, ?, ?, ?, 1, ?, ?)
        `);

        const now = new Date().toISOString();

        const defaultTemplates = [
            {
                id: 'brainstorm',
                name: 'Brainstorming Session',
                description: 'Start a creative brainstorming session',
                template: "Let's brainstorm ideas about [topic]. Please help me explore different angles and creative solutions. Consider:\n\n1. Traditional approaches\n2. Innovative alternatives\n3. Potential obstacles\n4. Resource requirements\n5. Timeline considerations",
                category: 'creative'
            },
            {
                id: 'explain',
                name: 'Explanation Request',
                description: 'Ask for detailed explanation',
                template: "Can you explain [concept/topic] in detail? I'd like to understand:\n\n1. The key principles and fundamentals\n2. Practical applications and examples\n3. Common misconceptions\n4. Related concepts I should know\n5. How this applies to my specific situation",
                category: 'learning'
            },
            {
                id: 'problem-solve',
                name: 'Problem Solving',
                description: 'Structured problem-solving approach',
                template: "I'm facing a challenge with [describe problem]. Can you help me:\n\n1. Break down the problem into components\n2. Identify root causes\n3. Generate potential solutions\n4. Evaluate pros and cons of each approach\n5. Create an action plan with next steps",
                category: 'productivity'
            },
            {
                id: 'creative',
                name: 'Creative Writing',
                description: 'Creative writing assistance',
                template: "I need help with creative writing about [theme/topic]. Please help me:\n\n1. Develop compelling characters or concepts\n2. Create an engaging narrative structure\n3. Generate vivid descriptions and imagery\n4. Explore different perspectives and angles\n5. Refine the tone and style",
                category: 'creative'
            },
            {
                id: 'analysis',
                name: 'Analysis Request',
                description: 'In-depth analysis template',
                template: "Please analyze [subject/data/situation] and provide insights on:\n\n1. Key patterns and trends\n2. Important findings and observations\n3. Potential implications\n4. Strengths and weaknesses\n5. Recommendations for action",
                category: 'analysis'
            },
            {
                id: 'research',
                name: 'Research Assistance',
                description: 'Research and information gathering',
                template: "I'm researching [topic]. Can you help me understand:\n\n1. Current state and recent developments\n2. Key players and stakeholders\n3. Important challenges and opportunities\n4. Best practices and lessons learned\n5. Resources for further investigation",
                category: 'research'
            },
            {
                id: 'decision',
                name: 'Decision Making',
                description: 'Structured decision-making process',
                template: "I need to make a decision about [situation]. Please help me:\n\n1. Clarify my goals and criteria\n2. Identify all available options\n3. Evaluate each option against my criteria\n4. Consider potential risks and benefits\n5. Make a well-reasoned recommendation",
                category: 'productivity'
            },
            {
                id: 'review',
                name: 'Review and Feedback',
                description: 'Get feedback on work or ideas',
                template: "Please review my [work/idea/plan] and provide feedback on:\n\n1. Overall quality and effectiveness\n2. Areas of strength\n3. Areas for improvement\n4. Suggestions for enhancement\n5. Alternative approaches to consider\n\n[Paste your work here]",
                category: 'productivity'
            }
        ];

        defaultTemplates.forEach(template => {
            insertTemplate.run(
                template.id,
                template.name,
                template.description,
                template.template,
                template.category,
                now,
                now
            );
        });

        // Create focus_exports table to track exports
        db.exec(`
            CREATE TABLE IF NOT EXISTS focus_exports (
                id TEXT PRIMARY KEY,
                conversation_id TEXT NOT NULL,
                export_format TEXT NOT NULL,
                export_options TEXT, -- JSON string
                file_path TEXT,
                created TEXT NOT NULL,
                user_id INTEGER,
                FOREIGN KEY (conversation_id) REFERENCES focus_conversations(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Create focus_analytics table for conversation analytics
        db.exec(`
            CREATE TABLE IF NOT EXISTS focus_analytics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id TEXT NOT NULL,
                message_count INTEGER DEFAULT 0,
                token_count INTEGER DEFAULT 0,
                duration_minutes INTEGER DEFAULT 0,
                topics_discussed TEXT, -- JSON array
                sentiment_score REAL,
                compression_events INTEGER DEFAULT 0,
                branch_count INTEGER DEFAULT 1,
                export_count INTEGER DEFAULT 0,
                last_updated TEXT NOT NULL,
                FOREIGN KEY (conversation_id) REFERENCES focus_conversations(id) ON DELETE CASCADE
            )
        `);

        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_focus_analytics_conversation_id 
            ON focus_analytics(conversation_id)
        `);

        console.log('Focus Mode migration completed successfully');

    } catch (error) {
        console.error('Error in Focus Mode migration:', error);
        throw error;
    }
}

module.exports = { migrateFocusMode };