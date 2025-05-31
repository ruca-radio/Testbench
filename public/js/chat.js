// Chat interface management
class ChatInterface {
    static init() {
        console.log('ChatInterface initialized');
    }

    static addMessage(role, content) {
        const chatContainer = document.getElementById('chat-messages');
        if (!chatContainer) return;

        // Create a document fragment to minimize DOM reflows
        const fragment = document.createDocumentFragment();

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'content';

        if (role === 'assistant') {
            // Convert markdown to HTML for assistant messages
            contentDiv.innerHTML = this.formatMarkdown(content);
        } else {
            contentDiv.textContent = content;
        }

        // Build the message structure in the fragment
        messageDiv.appendChild(contentDiv);
        fragment.appendChild(messageDiv);

        // Single DOM operation to add the fragment
        chatContainer.appendChild(fragment);

        // Use requestAnimationFrame for smoother scrolling
        requestAnimationFrame(() => {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        });
    }

    static showTyping() {
        const chatContainer = document.getElementById('chat-messages');
        if (!chatContainer) return null;

        // Create a document fragment
        const fragment = document.createDocumentFragment();

        const typingDiv = document.createElement('div');
        typingDiv.className = 'message assistant typing';
        typingDiv.id = 'typing-indicator';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'content';
        contentDiv.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';

        // Build the typing indicator in the fragment
        typingDiv.appendChild(contentDiv);
        fragment.appendChild(typingDiv);

        // Single DOM operation
        chatContainer.appendChild(fragment);

        // Use requestAnimationFrame for smoother scrolling
        requestAnimationFrame(() => {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        });

        return 'typing-indicator';
    }

    static hideTyping(typingId) {
        if (typingId) {
            const typingElement = document.getElementById(typingId);
            if (typingElement) {
                typingElement.remove();
            }
        }
    }

    static clearChat() {
        const chatContainer = document.getElementById('chat-messages');
        if (chatContainer) {
            chatContainer.innerHTML = '';
        }
    }

    static formatMarkdown(text) {
        if (!text) return '';

        // First, escape any HTML to prevent XSS attacks
        const escapeHTML = (str) => {
            return str
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        };

        // Escape HTML but preserve line breaks for proper formatting
        let safeText = escapeHTML(text);

        // Basic markdown formatting (applied to the sanitized text)
        let formatted = safeText
            // Code blocks - ensure content is properly escaped
            .replace(/```([\s\S]*?)```/g, (match, codeContent) => {
                return `<pre><code>${codeContent}</code></pre>`;
            })
            // Inline code
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            // Bold
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Italic
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // Line breaks
            .replace(/\n/g, '<br>');

        // Use DOMPurify if available (would need to be added to the project)
        if (window.DOMPurify) {
            return window.DOMPurify.sanitize(formatted);
        }

        return formatted;
    }
}

window.ChatInterface = ChatInterface;
