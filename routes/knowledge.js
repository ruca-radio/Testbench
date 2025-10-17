const express = require('express');
const router = express.Router();
const database = require('../database');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for document uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../data/uploads');
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow common document types
        const allowedTypes = [
            'text/plain',
            'text/markdown',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/csv',
            'application/json'
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Unsupported file type: ${file.mimetype}`));
        }
    }
});

// Get all knowledge bases
router.get('/api/knowledge/bases', async (req, res) => {
    try {
        const knowledgeBases = database.getAllKnowledgeBases();
        res.json({
            knowledgeBases: knowledgeBases || [],
            count: knowledgeBases ? knowledgeBases.length : 0
        });
    } catch (error) {
        console.error('Error getting knowledge bases:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Get specific knowledge base
router.get('/api/knowledge/bases/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const knowledgeBase = database.getKnowledgeBase(id);
        if (!knowledgeBase) {
            return res.status(404).json({ error: 'Knowledge base not found' });
        }
        res.json({ knowledgeBase });
    } catch (error) {
        console.error(`Error getting knowledge base ${id}:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

// Create new knowledge base
router.post('/api/knowledge/bases', async (req, res) => {
    const {
        name,
        description,
        type = 'documents',
        vectorEnabled = true,
        embeddingModel = 'text-embedding-ada-002',
        chunkSize = 1000,
        chunkOverlap = 200
    } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Knowledge base name is required' });
    }

    try {
        const knowledgeBase = {
            id: `kb_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            name,
            description,
            type,
            vectorEnabled,
            embeddingModel,
            chunkSize,
            chunkOverlap,
            documentCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        database.createKnowledgeBase(knowledgeBase);

        res.status(201).json({
            knowledgeBase,
            message: `Knowledge base '${name}' created successfully`
        });
    } catch (error) {
        console.error('Error creating knowledge base:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Update knowledge base
router.put('/api/knowledge/bases/:id', async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    try {
        const existingKB = database.getKnowledgeBase(id);
        if (!existingKB) {
            return res.status(404).json({ error: 'Knowledge base not found' });
        }

        const updatedKB = {
            ...existingKB,
            ...updateData,
            id, // Ensure ID doesn't change
            updatedAt: new Date().toISOString()
        };

        database.updateKnowledgeBase(id, updatedKB);

        res.json({
            knowledgeBase: updatedKB,
            message: `Knowledge base '${updatedKB.name}' updated successfully`
        });
    } catch (error) {
        console.error(`Error updating knowledge base ${id}:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

// Delete knowledge base
router.delete('/api/knowledge/bases/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const knowledgeBase = database.getKnowledgeBase(id);
        if (!knowledgeBase) {
            return res.status(404).json({ error: 'Knowledge base not found' });
        }

        // Delete associated documents and their files
        const documents = database.getKnowledgeBaseDocuments(id);
        for (const doc of documents) {
            // Delete physical file if it exists
            if (doc.filepath) {
                try {
                    await fs.unlink(doc.filepath);
                } catch (fileError) {
                    console.error(`Warning: Could not delete file ${doc.filepath}:`, fileError.message);
                }
            }
        }

        // Delete knowledge base (cascade will delete documents from database)
        database.deleteKnowledgeBase(id);

        res.json({
            message: `Knowledge base '${knowledgeBase.name}' and ${documents.length} associated documents deleted successfully`,
            deletedId: id,
            documentsDeleted: documents.length
        });
    } catch (error) {
        console.error(`Error deleting knowledge base ${id}:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

// Upload documents to knowledge base
router.post('/api/knowledge/bases/:id/documents', upload.array('documents', 10), async (req, res) => {
    const { id } = req.params;

    try {
        const knowledgeBase = database.getKnowledgeBase(id);
        if (!knowledgeBase) {
            return res.status(404).json({ error: 'Knowledge base not found' });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No documents provided' });
        }

        const uploadedDocuments = [];
        for (const file of req.files) {
            const document = {
                id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
                filename: file.originalname,
                filepath: file.path,
                mimetype: file.mimetype,
                size: file.size,
                knowledgeBaseId: id,
                uploadedAt: new Date().toISOString(),
                processed: false
            };

            database.addDocumentToKnowledgeBase(id, document);
            uploadedDocuments.push(document);
        }

        // Update document count
        const updatedKB = {
            ...knowledgeBase,
            documentCount: (knowledgeBase.documentCount || 0) + uploadedDocuments.length,
            updatedAt: new Date().toISOString()
        };
        database.updateKnowledgeBase(id, updatedKB);

        res.json({
            message: `${uploadedDocuments.length} documents uploaded successfully`,
            documents: uploadedDocuments,
            knowledgeBase: updatedKB
        });
    } catch (error) {
        console.error(`Error uploading documents to knowledge base ${id}:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

// Import knowledge base data
router.post('/api/knowledge/import', async (req, res) => {
    const { knowledgeBases } = req.body;

    if (!knowledgeBases || !Array.isArray(knowledgeBases)) {
        return res.status(400).json({ error: 'Invalid knowledge bases data' });
    }

    try {
        const imported = [];
        const errors = [];

        for (const kb of knowledgeBases) {
            try {
                // Generate new ID to avoid conflicts
                const newKB = {
                    ...kb,
                    id: `kb_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                database.createKnowledgeBase(newKB);
                imported.push(newKB);
            } catch (error) {
                errors.push({
                    name: kb.name || 'Unknown',
                    error: error.message
                });
            }
        }

        res.json({
            message: `Import completed: ${imported.length} successful, ${errors.length} failed`,
            imported: imported.length,
            failed: errors.length,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error) {
        console.error('Error importing knowledge bases:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Test vector store connection
router.post('/api/knowledge/vector-store/test', async (req, res) => {
    const { config = {} } = req.body;

    try {
        // Mock vector store test - in a real implementation, this would test
        // connection to vector database (e.g., Pinecone, Weaviate, etc.)
        const testResult = {
            connected: true,
            provider: config.provider || 'local',
            endpoint: config.endpoint || 'local',
            dimensions: config.dimensions || 1536,
            message: 'Vector store connection successful'
        };

        // Simulate connection test delay
        await new Promise(resolve => setTimeout(resolve, 500));

        res.json({
            ...testResult,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error testing vector store:', error.message);
        res.status(500).json({
            connected: false,
            error: error.message,
            message: 'Vector store connection failed',
            timestamp: new Date().toISOString()
        });
    }
});

// Get knowledge base documents
router.get('/api/knowledge/bases/:id/documents', async (req, res) => {
    const { id } = req.params;

    try {
        const documents = database.getKnowledgeBaseDocuments(id);
        res.json({
            documents: documents || [],
            count: documents ? documents.length : 0
        });
    } catch (error) {
        console.error(`Error getting documents for knowledge base ${id}:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

// Search within knowledge base
router.post('/api/knowledge/bases/:id/search', async (req, res) => {
    const { id } = req.params;
    const { query, limit = 10 } = req.body;

    if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
    }

    try {
        // Mock search implementation - in a real system, this would use vector search
        const documents = database.getKnowledgeBaseDocuments(id) || [];
        const results = documents
            .filter(doc =>
                doc.filename.toLowerCase().includes(query.toLowerCase()) ||
                (doc.content && doc.content.toLowerCase().includes(query.toLowerCase()))
            )
            .slice(0, limit)
            .map(doc => ({
                ...doc,
                score: Math.random(), // Mock relevance score
                snippet: doc.content ? doc.content.substring(0, 200) + '...' : null
            }));

        res.json({
            query,
            results,
            count: results.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error(`Error searching knowledge base ${id}:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
