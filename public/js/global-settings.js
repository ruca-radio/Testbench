/**
 * Global Settings Manager
 * Handles global application settings in the settings modal
 */
class GlobalSettings {
    static init() {
        this.settings = {};
        this.defaultSettings = this.getDefaultSettings();
        console.log('GlobalSettings initialized');
    }

    /**
     * Get default settings
     */
    static getDefaultSettings() {
        return {
            // Appearance
            theme: 'dark',
            fontSize: 'medium',
            compactMode: false,

            // Memory & Summarization
            persistentMemory: false,
            autoSummarize: true,
            summaryThreshold: 50,
            memoryRetention: 30,

            // Behavior
            autoTitle: true,
            streamingResponses: true,
            confirmDelete: true,
            sendOnEnter: true,

            // Privacy & Data
            localStorageOnly: false,
            analytics: false,
            crashReports: false
        };
    }

    /**
     * Load settings from backend and local storage
     */
    static async loadSettings() {
        try {
            // Load from backend first
            const response = await fetch('/api/settings/global');
            if (response.ok) {
                const data = await response.json();
                this.settings = { ...this.defaultSettings, ...data.settings };
            } else {
                // Fallback to local storage
                const localSettings = localStorage.getItem('globalSettings');
                if (localSettings) {
                    this.settings = { ...this.defaultSettings, ...JSON.parse(localSettings) };
                } else {
                    this.settings = { ...this.defaultSettings };
                }
            }
        } catch (error) {
            console.error('Error loading global settings:', error);
            // Use local storage as fallback
            const localSettings = localStorage.getItem('globalSettings');
            if (localSettings) {
                this.settings = { ...this.defaultSettings, ...JSON.parse(localSettings) };
            } else {
                this.settings = { ...this.defaultSettings };
            }
        }

        this.populateSettingsForm();
        this.applySettings();
    }

    /**
     * Populate settings form with current values
     */
    static populateSettingsForm() {
        // Appearance settings
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) {
            themeSelect.value = this.settings.theme || 'dark';
        }

        const fontSize = document.getElementById('font-size');
        if (fontSize) {
            fontSize.value = this.settings.fontSize || 'medium';
        }

        const compactMode = document.getElementById('compact-mode');
        if (compactMode) {
            compactMode.checked = this.settings.compactMode || false;
        }

        // Memory & Summarization settings
        const persistentMemory = document.getElementById('persistent-memory');
        if (persistentMemory) {
            persistentMemory.checked = this.settings.persistentMemory || false;
        }

        const autoSummarize = document.getElementById('auto-summarize');
        if (autoSummarize) {
            autoSummarize.checked = this.settings.autoSummarize !== false;
        }

        const summaryThreshold = document.getElementById('summary-threshold');
        if (summaryThreshold) {
            summaryThreshold.value = this.settings.summaryThreshold || 50;
        }

        const memoryRetention = document.getElementById('memory-retention');
        if (memoryRetention) {
            memoryRetention.value = this.settings.memoryRetention || 30;
        }

        // Behavior settings
        const autoTitle = document.getElementById('auto-title');
        if (autoTitle) {
            autoTitle.checked = this.settings.autoTitle !== false;
        }

        const streamingResponses = document.getElementById('streaming-responses');
        if (streamingResponses) {
            streamingResponses.checked = this.settings.streamingResponses !== false;
        }

        const confirmDelete = document.getElementById('confirm-delete');
        if (confirmDelete) {
            confirmDelete.checked = this.settings.confirmDelete !== false;
        }

        const sendOnEnter = document.getElementById('send-on-enter');
        if (sendOnEnter) {
            sendOnEnter.checked = this.settings.sendOnEnter !== false;
        }

        // Privacy & Data settings
        const localStorageOnly = document.getElementById('local-storage-only');
        if (localStorageOnly) {
            localStorageOnly.checked = this.settings.localStorageOnly || false;
        }

        const analytics = document.getElementById('analytics');
        if (analytics) {
            analytics.checked = this.settings.analytics || false;
        }

        const crashReports = document.getElementById('crash-reports');
        if (crashReports) {
            crashReports.checked = this.settings.crashReports || false;
        }
    }

    /**
     * Apply settings to the application
     */
    static applySettings() {
        // Apply theme
        this.changeTheme(this.settings.theme);

        // Apply font size
        this.changeFontSize(this.settings.fontSize);

        // Apply compact mode
        this.toggleCompactMode(this.settings.compactMode);

        // Store in local storage as backup
        localStorage.setItem('globalSettings', JSON.stringify(this.settings));
    }

    /**
     * Change application theme
     */
    static changeTheme(theme = null) {
        if (!theme) {
            const themeSelect = document.getElementById('theme-select');
            theme = themeSelect ? themeSelect.value : 'dark';
        }

        // Remove existing theme classes
        document.body.classList.remove('theme-light', 'theme-dark', 'theme-auto', 'theme-high-contrast');

        // Add new theme class
        document.body.classList.add(`theme-${theme}`);

        // Handle auto theme
        if (theme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.body.classList.add(prefersDark ? 'theme-dark' : 'theme-light');
        }

        // Update CSS custom properties for theme
        const root = document.documentElement;
        switch (theme) {
            case 'light':
                root.style.setProperty('--bg-primary', '#ffffff');
                root.style.setProperty('--bg-secondary', '#f8f9fa');
                root.style.setProperty('--text-primary', '#333333');
                root.style.setProperty('--text-secondary', '#666666');
                break;
            case 'dark':
                root.style.setProperty('--bg-primary', '#1a1a1a');
                root.style.setProperty('--bg-secondary', '#2d2d2d');
                root.style.setProperty('--text-primary', '#ffffff');
                root.style.setProperty('--text-secondary', '#cccccc');
                break;
            case 'high-contrast':
                root.style.setProperty('--bg-primary', '#000000');
                root.style.setProperty('--bg-secondary', '#111111');
                root.style.setProperty('--text-primary', '#ffffff');
                root.style.setProperty('--text-secondary', '#ffff00');
                break;
        }

        this.settings.theme = theme;
    }

    /**
     * Change font size
     */
    static changeFontSize(size = null) {
        if (!size) {
            const fontSizeSelect = document.getElementById('font-size');
            size = fontSizeSelect ? fontSizeSelect.value : 'medium';
        }

        // Remove existing font size classes
        document.body.classList.remove('font-small', 'font-medium', 'font-large', 'font-extra-large');

        // Add new font size class
        document.body.classList.add(`font-${size}`);

        // Update CSS custom properties for font sizes
        const root = document.documentElement;
        switch (size) {
            case 'small':
                root.style.setProperty('--font-size-base', '13px');
                root.style.setProperty('--font-size-small', '11px');
                root.style.setProperty('--font-size-large', '15px');
                break;
            case 'medium':
                root.style.setProperty('--font-size-base', '14px');
                root.style.setProperty('--font-size-small', '12px');
                root.style.setProperty('--font-size-large', '16px');
                break;
            case 'large':
                root.style.setProperty('--font-size-base', '16px');
                root.style.setProperty('--font-size-small', '14px');
                root.style.setProperty('--font-size-large', '18px');
                break;
            case 'extra-large':
                root.style.setProperty('--font-size-base', '18px');
                root.style.setProperty('--font-size-small', '16px');
                root.style.setProperty('--font-size-large', '20px');
                break;
        }

        this.settings.fontSize = size;
    }

    /**
     * Toggle compact mode
     */
    static toggleCompactMode(enabled = null) {
        if (enabled === null) {
            const compactModeCheckbox = document.getElementById('compact-mode');
            enabled = compactModeCheckbox ? compactModeCheckbox.checked : false;
        }

        if (enabled) {
            document.body.classList.add('compact-mode');
        } else {
            document.body.classList.remove('compact-mode');
        }

        this.settings.compactMode = enabled;
    }

    /**
     * Save all settings
     */
    static async saveSettings() {
        // Collect settings from form
        const newSettings = {
            // Appearance
            theme: document.getElementById('theme-select')?.value || 'dark',
            fontSize: document.getElementById('font-size')?.value || 'medium',
            compactMode: document.getElementById('compact-mode')?.checked || false,

            // Memory & Summarization
            persistentMemory: document.getElementById('persistent-memory')?.checked || false,
            autoSummarize: document.getElementById('auto-summarize')?.checked || false,
            summaryThreshold: parseInt(document.getElementById('summary-threshold')?.value) || 50,
            memoryRetention: parseInt(document.getElementById('memory-retention')?.value) || 30,

            // Behavior
            autoTitle: document.getElementById('auto-title')?.checked || false,
            streamingResponses: document.getElementById('streaming-responses')?.checked || false,
            confirmDelete: document.getElementById('confirm-delete')?.checked || false,
            sendOnEnter: document.getElementById('send-on-enter')?.checked || false,

            // Privacy & Data
            localStorageOnly: document.getElementById('local-storage-only')?.checked || false,
            analytics: document.getElementById('analytics')?.checked || false,
            crashReports: document.getElementById('crash-reports')?.checked || false
        };

        this.settings = { ...this.settings, ...newSettings };

        try {
            // Save to backend
            const response = await fetch('/api/settings/global', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ settings: newSettings })
            });

            if (!response.ok) {
                throw new Error('Failed to save to backend');
            }

            console.log('Global settings saved to backend');
        } catch (error) {
            console.error('Error saving global settings to backend:', error);
            // Continue with local storage even if backend fails
        }

        // Always save to local storage as backup
        localStorage.setItem('globalSettings', JSON.stringify(this.settings));

        // Apply the new settings
        this.applySettings();

        console.log('Global settings saved and applied');
    }

    /**
     * Clear all data - dangerous operation
     */
    static async clearAllData() {
        if (!confirm('Are you sure you want to clear ALL data? This will delete conversations, agents, workspaces, and all settings. This action cannot be undone.')) {
            return;
        }

        if (!confirm('This is your final warning. ALL DATA will be permanently deleted. Are you absolutely sure?')) {
            return;
        }

        try {
            // Clear backend data
            const response = await fetch('/api/settings/clear-all', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                Utils.showSuccess('All backend data cleared');
            } else {
                Utils.showError('Failed to clear backend data');
            }
        } catch (error) {
            console.error('Error clearing backend data:', error);
            Utils.showError('Failed to clear backend data');
        }

        // Clear local storage
        localStorage.clear();
        sessionStorage.clear();

        // Reset to defaults
        this.settings = { ...this.defaultSettings };
        this.populateSettingsForm();
        this.applySettings();

        Utils.showSuccess('All local data cleared. The page will reload.');

        // Reload page to ensure clean state
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    }

    /**
     * Reset settings to defaults
     */
    static async resetSettings() {
        if (!confirm('Are you sure you want to reset all settings to their default values?')) {
            return;
        }

        this.settings = { ...this.defaultSettings };

        try {
            // Save defaults to backend
            const response = await fetch('/api/settings/global', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ settings: this.settings })
            });

            if (response.ok) {
                console.log('Settings reset and saved to backend');
            }
        } catch (error) {
            console.error('Error saving reset settings to backend:', error);
        }

        // Save to local storage
        localStorage.setItem('globalSettings', JSON.stringify(this.settings));

        // Update form and apply settings
        this.populateSettingsForm();
        this.applySettings();

        Utils.showSuccess('Settings reset to defaults');
    }

    /**
     * Export settings
     */
    static exportSettings() {
        try {
            const exportData = {
                globalSettings: this.settings,
                exportDate: new Date().toISOString(),
                version: '1.0'
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `global-settings-${new Date().toISOString().split('T')[0]}.json`;
            a.click();

            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting settings:', error);
            Utils.showError('Failed to export settings');
        }
    }

    /**
     * Import settings
     */
    static importSettings() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    try {
                        const importData = JSON.parse(event.target.result);

                        if (!importData.globalSettings) {
                            throw new Error('Invalid settings file format');
                        }

                        this.settings = { ...this.defaultSettings, ...importData.globalSettings };

                        // Save imported settings
                        await this.saveSettings();

                        Utils.showSuccess('Settings imported successfully');
                    } catch (parseError) {
                        console.error('Error parsing settings file:', parseError);
                        Utils.showError('Invalid settings file format');
                    }
                };
                reader.readAsText(file);
            } catch (error) {
                console.error('Error importing settings:', error);
                Utils.showError('Failed to import settings');
            }
        };

        input.click();
    }

    /**
     * Get current setting value
     */
    static getSetting(key) {
        return this.settings[key] !== undefined ? this.settings[key] : this.defaultSettings[key];
    }

    /**
     * Set a setting value
     */
    static setSetting(key, value) {
        this.settings[key] = value;
        localStorage.setItem('globalSettings', JSON.stringify(this.settings));
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    GlobalSettings.init();
});

// Listen for system theme changes when in auto mode
if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (GlobalSettings.settings?.theme === 'auto') {
            GlobalSettings.changeTheme('auto');
        }
    });
}

window.GlobalSettings = GlobalSettings;
