const express = require('express');
const router = express.Router();
const database = require('../database');

// Settings management endpoints
router.get('/api/settings/get/:provider', async (req, res) => {
    const { provider } = req.params;

    try {
        const settings = database.getProviderSettings(provider);
        res.json({ provider, settings });
    } catch (error) {
        console.error(`Error getting settings for ${provider}:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

// GET summary of TestBench system settings backups
router.get('/api/settings/testbench/backup/info', async (req, res) => {
    try {
        const backups = database.getAllBackupSnapshots('system_settings');
        const last = backups.length > 0 ? backups[0].createdAt : null;
        res.json({ last_backup: last, backup_count: backups.length });
    } catch (error) {
        console.error('Error fetching backup info:', error.message);
        res.status(500).json({ error: error.message });
    }
});

router.post('/api/settings/update/:provider', async (req, res) => {
    const { provider } = req.params;
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ error: 'Settings object is required' });
    }

    try {
        for (const [key, value] of Object.entries(settings)) {
            database.setSetting(provider, key, value);
        }
        res.json({
            message: `Settings saved for ${provider}`,
            provider,
            settings
        });
    } catch (error) {
        console.error(`Error saving settings for ${provider}:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

// Get all settings for all providers
router.get('/api/settings/list/all', async (req, res) => {
    try {
        const providers = ['openai', 'anthropic', 'openrouter', 'ollama'];
        const allSettings = {};

        for (const provider of providers) {
            allSettings[provider] = database.getProviderSettings(provider);
        }

        // FIXED: Return settings directly, not wrapped in { settings: }
        res.json(allSettings);
    } catch (error) {
        console.error('Error getting all settings:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Bulk update settings for multiple providers
router.post('/api/settings/action/bulk-update', async (req, res) => {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ error: 'Settings object is required' });
    }

    try {
        const results = {};

        for (const [provider, providerSettings] of Object.entries(settings)) {
            if (typeof providerSettings === 'object') {
                for (const [key, value] of Object.entries(providerSettings)) {
                    database.setSetting(provider, key, value);
                }
                results[provider] = 'saved';
            }
        }

        res.json({
            message: 'Bulk settings update completed',
            results
        });
    } catch (error) {
        console.error('Error saving bulk settings:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Delete specific setting
router.delete('/api/settings/action/delete/:provider/:key', async (req, res) => {
    const { provider, key } = req.params;

    try {
        database.setSetting(provider, key, null); // Set to null to delete
        res.json({
            message: `Setting '${key}' deleted for ${provider}`,
            provider,
            key
        });
    } catch (error) {
        console.error(`Error deleting setting ${key} for ${provider}:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

// ===== TESTBENCH AGENT ENDPOINTS =====

// TestBench system-level setting modifications
router.post('/api/settings/testbench/system-modify', async (req, res) => {
    const { action, settings, configuration, backup = true } = req.body;

    // Handle special actions
    if (action === 'reset_to_defaults') {
        try {
            database.db.exec('DELETE FROM settings');
            return res.json({ success: true, message: 'All settings reset to defaults', timestamp: new Date().toISOString() });
        } catch (err) {
            console.error('Error resetting to defaults:', err.message);
            return res.status(500).json({ error: 'Failed to reset settings', details: err.message });
        }
    }
    if (action === 'factory_reset') {
        // Not implemented: handler for full factory reset
        return res.status(501).json({ error: 'Factory reset not implemented' });
    }

    // Standard settings update
    const settingsObj = settings || configuration;
    if (!settingsObj || typeof settingsObj !== 'object') {
        return res.status(400).json({ error: 'Settings object is required' });
    }
    try {
        let backupId = null;
        if (backup) {
            const currentSettings = {};
            const providers = ['openai', 'anthropic', 'openrouter', 'ollama'];
            for (const provider of providers) {
                currentSettings[provider] = database.getProviderSettings(provider);
            }
            const backupResult = database.createBackupSnapshot({
                name: `system-settings-backup-${Date.now()}`,
                description: `Backup before settings update`,
                snapshotType: 'system_settings',
                snapshotData: { settings: currentSettings, timestamp: new Date().toISOString() },
                createdByAgent: null
            });
            backupId = backupResult.lastInsertRowid;
        }
        const results = {};
        for (const [provider, providerSettings] of Object.entries(settingsObj)) {
            if (typeof providerSettings === 'object') {
                for (const [key, value] of Object.entries(providerSettings)) {
                    database.setSetting(provider, key, value);
                }
                results[provider] = 'updated';
            }
        }
        return res.json({
            success: true,
            message: 'System settings updated',
            results,
            backupId,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error updating system settings:', error.message);
        return res.status(500).json({ error: 'Failed to update settings', details: error.message });
    }
});

// TestBench settings backup and restore
router.post('/api/settings/testbench/backup', async (req, res) => {
    const { agentId, action, backupId, name, description } = req.body;

    if (!agentId || !action) {
        return res.status(400).json({ error: 'Agent ID and action (create/restore) are required' });
    }

    try {
        // Check TestBench permissions
        const agent = database.getAgentEnhanced(agentId);
        if (!agent || agent.role !== 'testbench') {
            return res.status(403).json({ error: 'Insufficient permissions. TestBench role required.' });
        }

        const hasBackupPermission = database.hasPermission('testbench', 'system', 'settings', 'backup');
        if (!hasBackupPermission) {
            return res.status(403).json({ error: 'TestBench agent lacks backup permissions.' });
        }

        if (action === 'create') {
            // Create backup
            const currentSettings = {};
            const providers = ['openai', 'anthropic', 'openrouter', 'ollama'];

            for (const provider of providers) {
                currentSettings[provider] = database.getProviderSettings(provider);
            }

            const result = database.createBackupSnapshot({
                name: name || `settings-backup-${Date.now()}`,
                description: description || `Settings backup created by TestBench agent ${agentId}`,
                snapshotType: 'system_settings',
                snapshotData: {
                    settings: currentSettings,
                    timestamp: new Date().toISOString(),
                    agentId
                },
                createdByAgent: agentId
            });

            database.logTestBenchAction(agentId, 'backup_create', 'settings', result.lastInsertRowid,
                { name, description }, true, null, req.ip, req.get('User-Agent'));

            res.json({
                success: true,
                action: 'create',
                backupId: result.lastInsertRowid,
                message: 'Settings backup created successfully',
                timestamp: new Date().toISOString()
            });

        } else if (action === 'restore') {
            // Restore from backup
            if (!backupId) {
                return res.status(400).json({ error: 'Backup ID is required for restore action' });
            }

            const hasRestorePermission = database.hasPermission('testbench', 'system', 'settings', 'restore');
            if (!hasRestorePermission) {
                return res.status(403).json({ error: 'TestBench agent lacks restore permissions.' });
            }

            const backup = database.getBackupSnapshot(backupId);
            if (!backup || backup.snapshotType !== 'system_settings') {
                return res.status(404).json({ error: 'Settings backup not found' });
            }

            // Restore settings
            const { settings } = backup.snapshotData;
            const results = {};

            for (const [provider, providerSettings] of Object.entries(settings)) {
                if (typeof providerSettings === 'object') {
                    for (const [key, value] of Object.entries(providerSettings)) {
                        database.setSetting(provider, key, value);
                    }
                    results[provider] = 'restored';
                }
            }

            database.logTestBenchAction(agentId, 'backup_restore', 'settings', backupId,
                { backupName: backup.name }, true, null, req.ip, req.get('User-Agent'));

            res.json({
                success: true,
                action: 'restore',
                backupId,
                results,
                message: `Settings restored from backup: ${backup.name}`,
                timestamp: new Date().toISOString()
            });

        } else {
            return res.status(400).json({ error: 'Invalid action. Use "create" or "restore"' });
        }

    } catch (error) {
        if (agentId) {
            database.logTestBenchAction(agentId, `backup_${action}`, 'settings', backupId || 'unknown',
                { action, backupId }, false, error.message, req.ip, req.get('User-Agent'));
        }

        console.error('Error in TestBench backup operation:', error.message);
        res.status(500).json({ error: 'Failed to perform backup operation.', details: error.message });
    }
});

// TestBench configuration validation
router.post('/api/settings/testbench/validate', async (req, res) => {
    const { agentId, configuration, configType } = req.body;

    if (!agentId || !configuration) {
        return res.status(400).json({ error: 'Agent ID and configuration are required' });
    }

    try {
        // Check TestBench permissions
        const agent = database.getAgentEnhanced(agentId);
        if (!agent || agent.role !== 'testbench') {
            return res.status(403).json({ error: 'Insufficient permissions. TestBench role required.' });
        }

        const validation = {
            valid: true,
            errors: [],
            warnings: [],
            recommendations: []
        };

        // Validate based on configuration type
        if (configType === 'agent') {
            // Validate agent configuration
            if (!configuration.role) {
                validation.errors.push('Agent role is required');
                validation.valid = false;
            }

            if (!configuration.settings || !configuration.settings.temperature) {
                validation.warnings.push('Temperature setting not specified, will use default');
            } else if (configuration.settings.temperature < 0 || configuration.settings.temperature > 2) {
                validation.errors.push('Temperature must be between 0 and 2');
                validation.valid = false;
            }

            if (!configuration.capabilities) {
                validation.warnings.push('No capabilities defined');
            }

            if (configuration.preferred_models && configuration.preferred_models.length === 0) {
                validation.warnings.push('No preferred models specified');
            }

        } else if (configType === 'workspace') {
            // Validate workspace configuration
            if (configuration.config && configuration.config.max_agents) {
                if (configuration.config.max_agents > 20) {
                    validation.warnings.push('More than 20 agents may impact performance');
                }
            }

            if (configuration.default_agents) {
                for (const defaultAgent of configuration.default_agents) {
                    if (!defaultAgent.role || !defaultAgent.model) {
                        validation.errors.push('Default agents must have role and model specified');
                        validation.valid = false;
                    }
                }
            }

        } else if (configType === 'system_settings') {
            // Validate system settings
            for (const [provider, settings] of Object.entries(configuration)) {
                if (provider === 'openai' && settings.api_key) {
                    if (!settings.api_key.startsWith('sk-')) {
                        validation.errors.push('OpenAI API key should start with "sk-"');
                        validation.valid = false;
                    }
                }

                if (provider === 'anthropic' && settings.api_key) {
                    if (!settings.api_key.startsWith('sk-ant-')) {
                        validation.errors.push('Anthropic API key should start with "sk-ant-"');
                        validation.valid = false;
                    }
                }
            }
        }

        // Add general recommendations
        if (validation.valid) {
            validation.recommendations.push('Configuration appears valid and ready to use');
        }

        database.logTestBenchAction(agentId, 'validate_config', 'configuration', configType || 'unknown',
            { configType, valid: validation.valid }, true, null, req.ip, req.get('User-Agent'));

        res.json({
            success: true,
            validation,
            configType,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        if (agentId) {
            database.logTestBenchAction(agentId, 'validate_config', 'configuration', configType || 'unknown',
                { configType }, false, error.message, req.ip, req.get('User-Agent'));
        }

        console.error('Error in TestBench validation:', error.message);
        res.status(500).json({ error: 'Failed to validate configuration.', details: error.message });
    }
});

// TestBench configuration templates
router.get('/api/settings/testbench/templates', async (req, res) => {
    const { agentId, configType } = req.query;

    if (!agentId) {
        return res.status(400).json({ error: 'Agent ID is required' });
    }

    try {
        // Check TestBench permissions
        const agent = database.getAgentEnhanced(agentId);
        if (!agent || agent.role !== 'testbench') {
            return res.status(403).json({ error: 'Insufficient permissions. TestBench role required.' });
        }

        const hasTemplatePermission = database.hasPermission('testbench', 'configuration', 'templates', 'read');
        if (!hasTemplatePermission) {
            return res.status(403).json({ error: 'TestBench agent lacks template access permissions.' });
        }

        // Get templates
        const templates = database.getAllTestBenchConfigurations(configType, true);

        database.logTestBenchAction(agentId, 'list_templates', 'configuration', 'templates',
            { configType, count: templates.length }, true, null, req.ip, req.get('User-Agent'));

        res.json({
            success: true,
            templates,
            configType: configType || 'all',
            count: templates.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        if (agentId) {
            database.logTestBenchAction(agentId, 'list_templates', 'configuration', 'templates',
                { configType }, false, error.message, req.ip, req.get('User-Agent'));
        }

        console.error('Error getting TestBench templates:', error.message);
        res.status(500).json({ error: 'Failed to get configuration templates.', details: error.message });
    }
});

// Apply TestBench configuration template
router.post('/api/settings/testbench/templates/:templateId/apply', async (req, res) => {
    const { templateId } = req.params;
    const { agentId, targetName, overrides = {} } = req.body;

    if (!agentId) {
        return res.status(400).json({ error: 'Agent ID is required' });
    }

    try {
        // Check TestBench permissions
        const agent = database.getAgentEnhanced(agentId);
        if (!agent || agent.role !== 'testbench') {
            return res.status(403).json({ error: 'Insufficient permissions. TestBench role required.' });
        }

        const hasApplyPermission = database.hasPermission('testbench', 'configuration', 'templates', 'apply');
        if (!hasApplyPermission) {
            return res.status(403).json({ error: 'TestBench agent lacks template apply permissions.' });
        }

        // Get template
        const template = database.getTestBenchConfiguration(templateId);
        if (!template || !template.isTemplate) {
            return res.status(404).json({ error: 'Template not found' });
        }

        // Apply template based on type
        let result = {};
        const configData = { ...template.configData, ...overrides };

        if (template.configType === 'agent') {
            // Create agent from template
            const newAgent = {
                name: targetName || `${template.name}-${Date.now()}`,
                provider: configData.preferred_models?.[0]?.split('.')[0] || 'openai',
                model: configData.preferred_models?.[0] || 'gpt-4o',
                settings: configData.settings,
                role: configData.role,
                capabilities: configData.capabilities,
                enabled: true
            };

            const agentResult = database.saveAgentEnhanced(newAgent);
            result = { type: 'agent', id: agentResult.lastInsertRowid, name: newAgent.name };

        } else if (template.configType === 'workspace') {
            // Create workspace from template
            const newWorkspace = {
                name: targetName || `${template.name}-${Date.now()}`,
                description: `Workspace created from template: ${template.name}`,
                config: configData.config,
                isDefault: false
            };

            const workspaceResult = database.createWorkspace(newWorkspace);
            result = { type: 'workspace', id: workspaceResult.lastInsertRowid, name: newWorkspace.name };

            // Create default agents if specified
            if (configData.default_agents) {
                for (const agentConfig of configData.default_agents) {
                    const defaultAgent = {
                        name: `${newWorkspace.name}-${agentConfig.role}`,
                        provider: agentConfig.model.split('.')[0] || 'openai',
                        model: agentConfig.model,
                        settings: { temperature: 0.7, ...agentConfig.settings },
                        role: agentConfig.role,
                        capabilities: { messaging: true, collaboration: true },
                        enabled: true
                    };

                    const defaultAgentResult = database.saveAgentEnhanced(defaultAgent);
                    database.addAgentToWorkspace(workspaceResult.lastInsertRowid, defaultAgentResult.lastInsertRowid, agentConfig.role);
                }
            }
        }

        database.logTestBenchAction(agentId, 'apply_template', 'configuration', templateId,
            { templateName: template.name, targetName, overrides, result }, true, null, req.ip, req.get('User-Agent'));

        res.json({
            success: true,
            message: `Template '${template.name}' applied successfully`,
            template: {
                id: template.id,
                name: template.name,
                configType: template.configType
            },
            result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        if (agentId) {
            database.logTestBenchAction(agentId, 'apply_template', 'configuration', templateId,
                { templateId, targetName, overrides }, false, error.message, req.ip, req.get('User-Agent'));
        }

        console.error('Error applying TestBench template:', error.message);
        res.status(500).json({ error: 'Failed to apply configuration template.', details: error.message });
    }
});

module.exports = router;
