/**
 * Knowledge Manager
 * Handles knowledge base management in the settings modal
 */
class KnowledgeManager {
    static init() {
        this.knowledgeBases = [];
        this.selectedKnowledgeBase = null;
        console.log('KnowledgeManager initialized');
    }

    /**
     * Load knowledge bases from the backend
     */
    static async loadKnowledgeBases() {
        try {
            const response = await fetch('/api/knowledge/bases');
            if (response.ok) {
                const data = await response.json();
                this.knowledgeBases = data.knowledgeBases || [];
                this.updateKnowledgeBaseList();
                console.log('Knowledge bases loaded:', this.knowledgeBases.length);
                return this.knowledgeBases;
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to load knowledge bases');
            }
        } catch (error) {
            console.error('Error loading knowledge bases:', error);
            // Don't show error for missing endpoint - it's expected
            if (!error.message.includes('404')) {
                Utils.showError('Failed to load knowledge bases');
            }
            return [];
        }
    }

    /**
     * Update the knowledge base list in the UI
     */
    static updateKnowledgeBaseList() {
        const listElement = document.getElementById('knowledge-base-list');
        if (!listElement) return;

        if (this.knowledgeBases.length === 0) {
            listElement.innerHTML = `
            <div class="knowledge-base-item">
                <div class="kb-info">
                    <h5>Personal Documents</h5>
                    <p>0 documents • Vector embeddings disabled</p>
                </div>
                <div class="kb-actions">
                    <button class="btn small" onclick="KnowledgeManager.editKnowledgeBase('personal')">Configure</button>
                    <button class="btn small primary" onclick="KnowledgeManager.addDatabase()">Enable</button>
                </div>
            </div>
            `;
            return;
        }

        let html = '';
        this.knowledgeBases.forEach(kb => {
            html += `
            <div class="knowledge-base-item" data-kb-id="${kb.id}">
                <div class="kb-info">
                    <h5>${kb.name}</h5>
                    <p>${kb.documentCount || 0} documents • ${kb.vectorEnabled ? 'Vector embeddings enabled' : 'Vector embeddings disabled'}</p>
                    <span class="kb-meta">Type: ${kb.type} • Size: ${this.formatSize(kb.size || 0)}</span>
                </div>
                <div class="kb-actions">
                    <button class="btn small" onclick="KnowledgeManager.editKnowledgeBase('${kb.id}')">Edit</button>
                    <button class="btn small" onclick="KnowledgeManager.uploadDocuments('${kb.id}')">Upload</button>
                    <button class="btn small danger" onclick="KnowledgeManager.deleteKnowledgeBase('${kb.id}')">Delete</button>
                </div>
            </div>
            `;
        });

        listElement.innerHTML = html;
    }

    /**
     * Format file size
     */
    static formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Add a new knowledge base
     */
    static addDatabase() {
        this.showKnowledgeBaseEditor();
    }

    /**
     * Edit an existing knowledge base
     */
    static editKnowledgeBase(kbId) {
        const kb = this.knowledgeBases.find(k => k.id === kbId);
        this.showKnowledgeBaseEditor(kb);
    }

    /**
     * Show knowledge base editor
     */
    static showKnowledgeBaseEditor(knowledgeBase = null) {
        // Create editor if it doesn't exist
        if (!document.getElementById('knowledge-base-editor')) {
            const editorHTML = `
            <div id="knowledge-base-editor" class="knowledge-base-editor modal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="kb-editor-title">Create Knowledge Base</h3>
                        <button class="modal-close" onclick="KnowledgeManager.closeEditor()">&times;</button>
                    </div>

                    <div class="modal-body">
                        <div class="settings-group">
                            <label for="kb-name">Name:</label>
                            <input type="text" id="kb-name" placeholder="My Knowledge Base">
                        </div>

                        <div class="settings-group">
                            <label for="kb-description">Description:</label>
                            <textarea id="kb-description" placeholder="Describe this knowledge base..."></textarea>
                        </div>

                        <div class="settings-group">
                            <label for="kb-type">Type:</label>
                            <select id="kb-type">
                                <option value="documents">Document Collection</option>
                                <option value="structured">Structured Data</option>
                                <option value="web">Web Sources</option>
                                <option value="api">API Integration</option>
                            </select>
                        </div>

                        <div class="settings-group">
                            <label for="kb-vector-enabled">Enable Vector Embeddings:</label>
                            <input type="checkbox" id="kb-vector-enabled" checked>
                            <div class="input-hint">Enable semantic search and AI-powered retrieval</div>
                        </div>

                        <div class="settings-group">
                            <label for="kb-embedding-model">Embedding Model:</label>
                            <select id="kb-embedding-model">
                                <option value="text-embedding-ada-002">OpenAI Ada v2</option>
                                <option value="text-embedding-3-small">OpenAI v3 Small</option>
                                <option value="text-embedding-3-large">OpenAI v3 Large</option>
                                <option value="sentence-transformers">Local Sentence Transformers</option>
                            </select>
                        </div>

                        <div class="settings-group">
                            <label for="kb-chunk-size">Chunk Size:</label>
                            <input type="number" id="kb-chunk-size" value="1000" min="100" max="4000">
                            <div class="input-hint">Size of text chunks for processing (characters)</div>
                        </div>

                        <div class="settings-group">
                            <label for="kb-chunk-overlap">Chunk Overlap:</label>
                            <input type="number" id="kb-chunk-overlap" value="200" min="0" max="1000">
                            <div class="input-hint">Overlap between chunks (characters)</div>
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button class="btn secondary" onclick="KnowledgeManager.closeEditor()">Cancel</button>
                        <button class="btn primary" onclick="KnowledgeManager.saveKnowledgeBase()">Save Knowledge Base</button>
                    </div>
                </div>
            </div>
            `;

            document.body.insertAdjacentHTML('beforeend', editorHTML);
        }

        // Show editor
        const editor = document.getElementById('knowledge-base-editor');
        const title = document.getElementById('kb-editor-title');

        if (knowledgeBase) {
            title.textContent = 'Edit Knowledge Base';
            document.getElementById('kb-name').value = knowledgeBase.name;
            document.getElementById('kb-description').value = knowledgeBase.description || '';
            document.getElementById('kb-type').value = knowledgeBase.type || 'documents';
            document.getElementById('kb-vector-enabled').checked = knowledgeBase.vectorEnabled !== false;
            document.getElementById('kb-embedding-model').value = knowledgeBase.embeddingModel || 'text-embedding-ada-002';
            document.getElementById('kb-chunk-size').value = knowledgeBase.chunkSize || 1000;
            document.getElementById('kb-chunk-overlap').value = knowledgeBase.chunkOverlap || 200;
            this.selectedKnowledgeBase = knowledgeBase;
        } else {
            title.textContent = 'Create Knowledge Base';
            document.getElementById('kb-name').value = '';
            document.getElementById('kb-description').value = '';
            document.getElementById('kb-type').value = 'documents';
            document.getElementById('kb-vector-enabled').checked = true;
            document.getElementById('kb-embedding-model').value = 'text-embedding-ada-002';
            document.getElementById('kb-chunk-size').value = 1000;
            document.getElementById('kb-chunk-overlap').value = 200;
            this.selectedKnowledgeBase = null;
        }

        editor.style.display = 'flex';
    }

    /**
     * Close knowledge base editor
     */
    static closeEditor() {
        const editor = document.getElementById('knowledge-base-editor');
        if (editor) {
            editor.style.display = 'none';
        }
        this.selectedKnowledgeBase = null;
    }

    /**
     * Save knowledge base
     */
    static async saveKnowledgeBase() {
        const name = document.getElementById('kb-name').value.trim();
        const description = document.getElementById('kb-description').value.trim();
        const type = document.getElementById('kb-type').value;
        const vectorEnabled = document.getElementById('kb-vector-enabled').checked;
        const embeddingModel = document.getElementById('kb-embedding-model').value;
        const chunkSize = parseInt(document.getElementById('kb-chunk-size').value) || 1000;
        const chunkOverlap = parseInt(document.getElementById('kb-chunk-overlap').value) || 200;

        if (!name) {
            Utils.showError('Knowledge base name is required');
            return;
        }

        const kbData = {
            name,
            description,
            type,
            vectorEnabled,
            embeddingModel,
            chunkSize,
            chunkOverlap
        };

        try {
            const url = this.selectedKnowledgeBase
                ? `/api/knowledge/bases/${this.selectedKnowledgeBase.id}`
                : '/api/knowledge/bases';

            const method = this.selectedKnowledgeBase ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(kbData)
            });

            if (response.ok) {
                this.closeEditor();
                await this.loadKnowledgeBases();
                Utils.showSuccess(`Knowledge base '${name}' ${this.selectedKnowledgeBase ? 'updated' : 'created'} successfully`);
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save knowledge base');
            }
        } catch (error) {
            console.error('Error saving knowledge base:', error);
            Utils.showError(error.message);
        }
    }

    /**
     * Delete a knowledge base
     */
    static async deleteKnowledgeBase(kbId) {
        const kb = this.knowledgeBases.find(k => k.id === kbId);
        if (!kb) return;

        if (!confirm(`Are you sure you want to delete the knowledge base '${kb.name}'? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/knowledge/bases/${kbId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                await this.loadKnowledgeBases();
                Utils.showSuccess(`Knowledge base '${kb.name}' deleted successfully`);
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete knowledge base');
            }
        } catch (error) {
            console.error('Error deleting knowledge base:', error);
            Utils.showError(error.message);
        }
    }

    /**
     * Upload documents to a knowledge base
     */
    static uploadDocuments(kbId) {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = '.txt,.pdf,.doc,.docx,.md,.json';

        input.onchange = async (e) => {
            const files = Array.from(e.target.files);
            if (files.length === 0) return;

            try {
                const formData = new FormData();
                files.forEach(file => {
                    formData.append('documents', file);
                });

                Utils.showInfo(`Uploading ${files.length} document(s)...`);

                const response = await fetch(`/api/knowledge/bases/${kbId}/documents`, {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const data = await response.json();
                    await this.loadKnowledgeBases();
                    Utils.showSuccess(`Uploaded ${data.processed || files.length} document(s) successfully`);
                } else {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to upload documents');
                }
            } catch (error) {
                console.error('Error uploading documents:', error);
                Utils.showError(error.message);
            }
        };

        input.click();
    }

    /**
     * Import knowledge base data
     */
    static importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,.csv,.txt';

        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const formData = new FormData();
                formData.append('data', file);

                Utils.showInfo('Importing data...');

                const response = await fetch('/api/knowledge/import', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const data = await response.json();
                    await this.loadKnowledgeBases();
                    Utils.showSuccess(`Imported ${data.records || 0} records successfully`);
                } else {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to import data');
                }
            } catch (error) {
                console.error('Error importing data:', error);
                Utils.showError(error.message);
            }
        };

        input.click();
    }

    /**
     * Export knowledge base data
     */
    static exportData() {
        try {
            const exportData = {
                knowledgeBases: this.knowledgeBases.map(kb => ({
                    ...kb,
                    // Don't export actual document content for security
                    documents: undefined
                })),
                exportDate: new Date().toISOString(),
                version: '1.0'
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `knowledge-bases-${new Date().toISOString().split('T')[0]}.json`;
            a.click();

            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting data:', error);
            Utils.showError('Failed to export data');
        }
    }

    /**
     * Update RAG settings
     */
    static updateRAGSettings() {
        const embeddingModel = document.getElementById('embedding-model')?.value;
        const chunkSize = document.getElementById('chunk-size')?.value;
        const chunkOverlap = document.getElementById('chunk-overlap')?.value;
        const similarityThreshold = document.getElementById('similarity-threshold')?.value;

        // Update similarity threshold display
        const thresholdValue = document.getElementById('similarity-threshold-value');
        if (thresholdValue && similarityThreshold) {
            thresholdValue.textContent = similarityThreshold;
        }

        console.log('RAG settings updated:', {
            embeddingModel,
            chunkSize,
            chunkOverlap,
            similarityThreshold
        });
    }

    /**
     * Test vector store connection
     */
    static async testVectorStore() {
        const storeType = document.getElementById('vector-store-type')?.value;
        const endpoint = document.getElementById('vector-store-endpoint')?.value;

        try {
            Utils.showInfo('Testing vector store connection...');

            const response = await fetch('/api/knowledge/vector-store/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: storeType,
                    endpoint: endpoint
                })
            });

            if (response.ok) {
                const data = await response.json();
                Utils.showSuccess(`Vector store connection successful (${data.latency}ms)`);
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Vector store connection failed');
            }
        } catch (error) {
            console.error('Error testing vector store:', error);
            Utils.showError(error.message);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    KnowledgeManager.init();

    // Set up event listeners for RAG settings
    const similarityThreshold = document.getElementById('similarity-threshold');
    if (similarityThreshold) {
        similarityThreshold.addEventListener('input', KnowledgeManager.updateRAGSettings);
    }
});

window.KnowledgeManager = KnowledgeManager;
