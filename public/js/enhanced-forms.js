/**
 * Enhanced Form Components System
 * Provides real-time validation, connection testing, and enhanced UX
 */

class EnhancedForms {
    constructor() {
        this.validators = new Map();
        this.connectionTesters = new Map();
        this.debounceTimers = new Map();
        this.init();
    }

    init() {
        // Auto-initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.autoInitialize());
        } else {
            this.autoInitialize();
        }
    }

    autoInitialize() {
        // Auto-enhance existing forms
        document.querySelectorAll('.enhanced-form').forEach(form => {
            this.enhanceForm(form);
        });

        // Auto-enhance existing input groups
        document.querySelectorAll('.enhanced-input-group').forEach(group => {
            this.enhanceInputGroup(group);
        });
    }

    /**
     * Create an enhanced input group with validation and real-time feedback
     */
    createInputGroup(config) {
        const {
            id,
            label,
            type = 'text',
            value = '',
            placeholder = '',
            required = false,
            disabled = false,
            validators = [],
            help = '',
            className = '',
            testConnection = null,
            showPasswordToggle = false
        } = config;

        const groupElement = document.createElement('div');
        groupElement.className = `enhanced-input-group ${className}`;
        groupElement.dataset.inputId = id;

        // Create label
        const labelElement = document.createElement('label');
        labelElement.className = `enhanced-label ${required ? 'required' : ''}`;
        labelElement.setAttribute('for', id);
        labelElement.textContent = label;

        // Create input container for icons/buttons
        const inputContainer = document.createElement('div');
        inputContainer.style.position = 'relative';

        // Create input element
        const inputElement = document.createElement(type === 'textarea' ? 'textarea' : 'input');
        inputElement.id = id;
        inputElement.name = id;
        inputElement.className = 'enhanced-input';
        inputElement.value = value;
        inputElement.placeholder = placeholder;
        inputElement.disabled = disabled;

        if (type !== 'textarea') {
            inputElement.type = type;
        }

        if (required) {
            inputElement.setAttribute('required', '');
        }

        // Create status indicator
        const statusIndicator = document.createElement('span');
        statusIndicator.className = 'input-status-indicator';
        statusIndicator.style.display = 'none';

        // Create password toggle if needed
        let passwordToggle = null;
        if (showPasswordToggle && type === 'password') {
            passwordToggle = document.createElement('span');
            passwordToggle.className = 'password-toggle';
            passwordToggle.innerHTML = '👁️';
            passwordToggle.title = 'Show/Hide Password';

            passwordToggle.addEventListener('click', () => {
                const isPassword = inputElement.type === 'password';
                inputElement.type = isPassword ? 'text' : 'password';
                passwordToggle.innerHTML = isPassword ? '🙈' : '👁️';
                passwordToggle.title = isPassword ? 'Hide Password' : 'Show Password';
            });

            groupElement.classList.add('has-icon');
        }

        // Create validation message container
        const validationMessage = document.createElement('div');
        validationMessage.className = 'input-validation-message';

        // Create help text
        let helpElement = null;
        if (help) {
            helpElement = document.createElement('div');
            helpElement.className = 'input-help';
            helpElement.textContent = help;
        }

        // Assemble the input group
        inputContainer.appendChild(inputElement);
        inputContainer.appendChild(statusIndicator);
        if (passwordToggle) {
            inputContainer.appendChild(passwordToggle);
        }

        groupElement.appendChild(labelElement);
        groupElement.appendChild(inputContainer);
        groupElement.appendChild(validationMessage);
        if (helpElement) {
            groupElement.appendChild(helpElement);
        }

        // Store validators
        if (validators.length > 0) {
            this.validators.set(id, validators);
        }

        // Store connection tester
        if (testConnection) {
            this.connectionTesters.set(id, testConnection);
        }

        // Add real-time validation
        this.addRealTimeValidation(inputElement, id);

        // Add connection testing if configured
        if (testConnection) {
            this.addConnectionTesting(inputElement, id, testConnection);
        }

        return groupElement;
    }

    /**
     * Enhance an existing form
     */
    enhanceForm(form) {
        form.addEventListener('submit', (e) => {
            if (!this.validateForm(form)) {
                e.preventDefault();
                this.focusFirstInvalidInput(form);
            }
        });

        // Add enhanced styling
        form.classList.add('enhanced-form-active');
    }

    /**
     * Enhance an existing input group
     */
    enhanceInputGroup(group) {
        const input = group.querySelector('.enhanced-input');
        if (!input) return;

        const id = input.id || input.name;
        if (!id) return;

        // Add real-time validation if not already added
        if (!input.hasAttribute('data-enhanced')) {
            this.addRealTimeValidation(input, id);
            input.setAttribute('data-enhanced', 'true');
        }
    }

    /**
     * Add real-time validation to an input
     */
    addRealTimeValidation(input, id) {
        const validateInput = () => {
            const result = this.validateInput(id, input.value);
            this.updateInputStatus(id, result);
        };

        // Validate on input with debouncing
        input.addEventListener('input', () => {
            clearTimeout(this.debounceTimers.get(id));
            this.debounceTimers.set(id, setTimeout(validateInput, 300));
        });

        // Validate on blur (immediate)
        input.addEventListener('blur', validateInput);

        // Clear validation on focus
        input.addEventListener('focus', () => {
            this.clearInputStatus(id);
        });
    }

    /**
     * Add connection testing capability
     */
    addConnectionTesting(input, id, tester) {
        let testButton = input.parentElement.querySelector('.test-connection-btn');

        if (!testButton) {
            testButton = document.createElement('button');
            testButton.type = 'button';
            testButton.className = 'enhanced-btn small secondary test-connection-btn';
            testButton.innerHTML = '🔗 Test';
            testButton.title = 'Test Connection';
            testButton.style.position = 'absolute';
            testButton.style.right = '50px';
            testButton.style.top = '50%';
            testButton.style.transform = 'translateY(-50%)';
            testButton.style.marginTop = '12px';
            testButton.style.zIndex = '10';

            input.parentElement.appendChild(testButton);
            input.parentElement.classList.add('has-icon');
        }

        testButton.addEventListener('click', async () => {
            await this.testConnection(id, tester);
        });
    }

    /**
     * Validate a single input
     */
    validateInput(id, value) {
        const validators = this.validators.get(id) || [];
        const input = document.getElementById(id);

        if (!input) {
            return { isValid: true };
        }

        // Check HTML5 validation first
        if (!input.checkValidity()) {
            return {
                isValid: false,
                message: input.validationMessage,
                type: 'error'
            };
        }

        // Run custom validators
        for (const validator of validators) {
            const result = validator(value, input);
            if (!result.isValid) {
                return result;
            }
        }

        return { isValid: true, message: '', type: 'success' };
    }

    /**
     * Update input visual status
     */
    updateInputStatus(id, result) {
        const group = document.querySelector(`[data-input-id="${id}"]`);
        if (!group) return;

        const input = group.querySelector('.enhanced-input');
        const statusIndicator = group.querySelector('.input-status-indicator');
        const validationMessage = group.querySelector('.input-validation-message');

        if (!input || !statusIndicator || !validationMessage) return;

        // Clear existing classes
        input.classList.remove('error', 'success', 'warning');
        statusIndicator.style.display = 'none';
        statusIndicator.className = 'input-status-indicator';

        if (!result.isValid) {
            input.classList.add(result.type || 'error');
            statusIndicator.style.display = 'block';
            statusIndicator.innerHTML = result.type === 'warning' ? '⚠️' : '❌';
            validationMessage.className = `input-validation-message ${result.type || 'error'}`;
            validationMessage.textContent = result.message || 'Invalid input';
        } else if (input.value.trim()) {
            input.classList.add('success');
            statusIndicator.style.display = 'block';
            statusIndicator.innerHTML = '✅';
            validationMessage.className = 'input-validation-message success';
            validationMessage.textContent = result.message || '';
        } else {
            validationMessage.className = 'input-validation-message';
            validationMessage.textContent = '';
        }
    }

    /**
     * Clear input status
     */
    clearInputStatus(id) {
        const group = document.querySelector(`[data-input-id="${id}"]`);
        if (!group) return;

        const input = group.querySelector('.enhanced-input');
        const statusIndicator = group.querySelector('.input-status-indicator');
        const validationMessage = group.querySelector('.input-validation-message');

        if (input) {
            input.classList.remove('error', 'success', 'warning');
        }
        if (statusIndicator) {
            statusIndicator.style.display = 'none';
        }
        if (validationMessage) {
            validationMessage.className = 'input-validation-message';
            validationMessage.textContent = '';
        }
    }

    /**
     * Test connection for an input
     */
    async testConnection(id, tester) {
        const group = document.querySelector(`[data-input-id="${id}"]`);
        if (!group) return;

        const input = group.querySelector('.enhanced-input');
        const statusIndicator = group.querySelector('.input-status-indicator');
        const testButton = group.querySelector('.test-connection-btn');

        if (!input || !statusIndicator) return;

        // Show testing state
        statusIndicator.style.display = 'block';
        statusIndicator.className = 'input-status-indicator loading';
        statusIndicator.innerHTML = '🔄';

        if (testButton) {
            testButton.disabled = true;
            testButton.innerHTML = '🔄 Testing...';
        }

        try {
            const result = await tester(input.value, input);

            if (result.success) {
                this.updateInputStatus(id, {
                    isValid: true,
                    message: result.message || 'Connection successful',
                    type: 'success'
                });

                // Show connection status
                this.showConnectionStatus(id, 'connected', result.message);
            } else {
                this.updateInputStatus(id, {
                    isValid: false,
                    message: result.message || 'Connection failed',
                    type: 'error'
                });

                this.showConnectionStatus(id, 'disconnected', result.message);
            }
        } catch (error) {
            this.updateInputStatus(id, {
                isValid: false,
                message: `Connection test failed: ${error.message}`,
                type: 'error'
            });

            this.showConnectionStatus(id, 'disconnected', error.message);
        } finally {
            if (testButton) {
                testButton.disabled = false;
                testButton.innerHTML = '🔗 Test';
            }
        }
    }

    /**
     * Show connection status indicator
     */
    showConnectionStatus(id, status, message) {
        const group = document.querySelector(`[data-input-id="${id}"]`);
        if (!group) return;

        let statusElement = group.querySelector('.connection-status-indicator');
        if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.className = 'connection-status-indicator';
            group.appendChild(statusElement);
        }

        const statusIcons = {
            connected: '🟢',
            disconnected: '🔴',
            testing: '🟡',
            unknown: '⚪'
        };

        statusElement.className = `connection-status-indicator status-${status}`;
        statusElement.innerHTML = `${statusIcons[status] || ''} ${message || status}`;
    }

    /**
     * Validate entire form
     */
    validateForm(form) {
        let isValid = true;
        const inputs = form.querySelectorAll('.enhanced-input');

        inputs.forEach(input => {
            const id = input.id || input.name;
            if (id) {
                const result = this.validateInput(id, input.value);
                this.updateInputStatus(id, result);
                if (!result.isValid) {
                    isValid = false;
                }
            }
        });

        return isValid;
    }

    /**
     * Focus first invalid input
     */
    focusFirstInvalidInput(form) {
        const invalidInput = form.querySelector('.enhanced-input.error');
        if (invalidInput) {
            invalidInput.focus();
            invalidInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    /**
     * Common validators
     */
    static validators = {
        required: (value) => ({
            isValid: value.trim().length > 0,
            message: 'This field is required',
            type: 'error'
        }),

        email: (value) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return {
                isValid: !value || emailRegex.test(value),
                message: 'Please enter a valid email address',
                type: 'error'
            };
        },

        url: (value) => {
            try {
                if (!value) return { isValid: true };
                new URL(value);
                return { isValid: true };
            } catch {
                return {
                    isValid: false,
                    message: 'Please enter a valid URL',
                    type: 'error'
                };
            }
        },

        apiKey: (value) => ({
            isValid: !value || (value.length >= 10 && /^[a-zA-Z0-9\-_]+$/.test(value)),
            message: 'API key should be at least 10 characters and contain only letters, numbers, hyphens, and underscores',
            type: value && value.length < 10 ? 'warning' : 'error'
        }),

        number: (value, input) => {
            const num = parseFloat(value);
            const min = input.getAttribute('min');
            const max = input.getAttribute('max');

            if (!value) return { isValid: true };
            if (isNaN(num)) {
                return { isValid: false, message: 'Please enter a valid number', type: 'error' };
            }
            if (min !== null && num < parseFloat(min)) {
                return { isValid: false, message: `Value must be at least ${min}`, type: 'error' };
            }
            if (max !== null && num > parseFloat(max)) {
                return { isValid: false, message: `Value must be at most ${max}`, type: 'error' };
            }

            return { isValid: true };
        }
    };

    /**
     * Common connection testers
     */
    static connectionTesters = {
        openai: async (apiKey) => {
            if (!apiKey) throw new Error('API key is required');

            const response = await Utils.apiCall('/api/models/test-connection', {
                method: 'POST',
                body: { provider: 'openai', apiKey }
            });

            return response;
        },

        anthropic: async (apiKey) => {
            if (!apiKey) throw new Error('API key is required');

            const response = await Utils.apiCall('/api/models/test-connection', {
                method: 'POST',
                body: { provider: 'anthropic', apiKey }
            });

            return response;
        },

        url: async (url) => {
            if (!url) throw new Error('URL is required');

            try {
                const response = await fetch(url, {
                    method: 'HEAD',
                    mode: 'no-cors',
                    timeout: 5000
                });
                return { success: true, message: 'URL is accessible' };
            } catch (error) {
                return { success: false, message: `Unable to reach URL: ${error.message}` };
            }
        }
    };
}

// Create global instance
window.EnhancedForms = new EnhancedForms();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedForms;
}
