class ChatInterface {
    constructor() {
        this.conversations = [];
        this.currentConversationId = null;
        this.isGenerating = false;
        this.currentAbortController = null;
        
        this.initializeElements();
        this.bindEvents();
        this.loadConversations();
        this.refreshModels();
        this.createNewConversation();
    }

    initializeElements() {
        this.elements = {
            serverUrl: document.getElementById('server-url'),
            modelSelect: document.getElementById('model-select'),
            refreshModels: document.getElementById('refresh-models'),
            newConversation: document.getElementById('new-conversation'),
            conversationList: document.getElementById('conversation-list'),
            chatMessages: document.getElementById('chat-messages'),
            userInput: document.getElementById('user-input'),
            sendButton: document.getElementById('send-button'),
            stopButton: document.getElementById('stop-button'),
            streamMode: document.getElementById('stream-mode'),
            temperature: document.getElementById('temperature'),
            temperatureValue: document.getElementById('temperature-value'),
            maxTokens: document.getElementById('max-tokens'),
            loadingIndicator: document.getElementById('loading-indicator')
        };
    }

    bindEvents() {
        // Input events
        this.elements.userInput.addEventListener('input', () => {
            this.updateSendButton();
        });

        this.elements.userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey && !this.isGenerating) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Button events
        this.elements.sendButton.addEventListener('click', () => this.sendMessage());
        this.elements.stopButton.addEventListener('click', () => this.stopGeneration());
        this.elements.newConversation.addEventListener('click', () => this.createNewConversation());
        this.elements.refreshModels.addEventListener('click', () => this.refreshModels());

        // Configuration events
        this.elements.temperature.addEventListener('input', (e) => {
            this.elements.temperatureValue.textContent = e.target.value;
        });

        this.elements.serverUrl.addEventListener('change', () => {
            this.refreshModels();
        });
    }

    updateSendButton() {
        const hasText = this.elements.userInput.value.trim().length > 0;
        this.elements.sendButton.disabled = !hasText || this.isGenerating;
    }

    async refreshModels() {
        try {
            const serverUrl = this.elements.serverUrl.value.trim();
            if (!serverUrl) return;

            const response = await fetch(`${serverUrl}/get_model_info`);
            if (!response.ok) throw new Error('Failed to fetch model info');
            
            const modelInfo = await response.json();
            
            // Clear current options except auto
            this.elements.modelSelect.innerHTML = '<option value="auto">自动检测</option>';
            
            if (modelInfo.model_path) {
                const option = document.createElement('option');
                option.value = modelInfo.model_path;
                option.textContent = modelInfo.model_path.split('/').pop() || modelInfo.model_path;
                option.selected = true;
                this.elements.modelSelect.appendChild(option);
            }
            
            this.showConnectionStatus(true);
        } catch (error) {
            console.error('Failed to refresh models:', error);
            this.showConnectionStatus(false);
        }
    }

    showConnectionStatus(connected) {
        // Update connection status in the header if needed
        const existingStatus = document.querySelector('.connection-status');
        if (existingStatus) {
            existingStatus.remove();
        }

        const status = document.createElement('div');
        status.className = 'connection-status';
        status.innerHTML = `
            <span class="status-dot ${connected ? '' : 'disconnected'}"></span>
            ${connected ? '已连接' : '连接失败'}
        `;
        
        document.querySelector('.config-section').appendChild(status);
    }

    createNewConversation() {
        const conversation = {
            id: Date.now().toString(),
            title: '新对话',
            messages: [],
            createdAt: new Date()
        };

        this.conversations.unshift(conversation);
        this.currentConversationId = conversation.id;
        this.saveConversations();
        this.renderConversationList();
        this.renderMessages();
        
        // Clear input
        this.elements.userInput.value = '';
        this.updateSendButton();
    }

    loadConversations() {
        const saved = localStorage.getItem('sglang_conversations');
        if (saved) {
            try {
                this.conversations = JSON.parse(saved);
                // Convert date strings back to Date objects
                this.conversations.forEach(conv => {
                    conv.createdAt = new Date(conv.createdAt);
                });
            } catch (error) {
                console.error('Failed to load conversations:', error);
                this.conversations = [];
            }
        }
    }

    saveConversations() {
        try {
            localStorage.setItem('sglang_conversations', JSON.stringify(this.conversations));
        } catch (error) {
            console.error('Failed to save conversations:', error);
        }
    }

    renderConversationList() {
        this.elements.conversationList.innerHTML = '';
        
        this.conversations.forEach(conversation => {
            const item = document.createElement('div');
            item.className = `conversation-item ${conversation.id === this.currentConversationId ? 'active' : ''}`;
            item.innerHTML = `
                <div class="conversation-title">${this.escapeHtml(conversation.title)}</div>
                <div class="conversation-time">${this.formatTime(conversation.createdAt)}</div>
            `;
            
            item.addEventListener('click', () => {
                this.switchConversation(conversation.id);
            });
            
            this.elements.conversationList.appendChild(item);
        });
    }

    switchConversation(conversationId) {
        this.currentConversationId = conversationId;
        this.renderConversationList();
        this.renderMessages();
    }

    getCurrentConversation() {
        return this.conversations.find(c => c.id === this.currentConversationId);
    }

    updateConversationTitle(conversation) {
        if (conversation.messages.length > 0 && conversation.title === '新对话') {
            const firstUserMessage = conversation.messages.find(m => m.role === 'user');
            if (firstUserMessage) {
                conversation.title = firstUserMessage.content.slice(0, 30) + (firstUserMessage.content.length > 30 ? '...' : '');
                this.saveConversations();
                this.renderConversationList();
            }
        }
    }

    renderMessages() {
        // Clear messages except system message
        const systemMessage = this.elements.chatMessages.querySelector('.system-message');
        this.elements.chatMessages.innerHTML = '';
        if (systemMessage) {
            this.elements.chatMessages.appendChild(systemMessage);
        }

        const conversation = this.getCurrentConversation();
        if (!conversation) return;

        conversation.messages.forEach(message => {
            this.addMessageToUI(message.role, message.content, false);
        });

        this.scrollToBottom();
    }

    async sendMessage() {
        const content = this.elements.userInput.value.trim();
        if (!content || this.isGenerating) return;

        const conversation = this.getCurrentConversation();
        if (!conversation) return;

        // Add user message
        const userMessage = { role: 'user', content };
        conversation.messages.push(userMessage);
        this.addMessageToUI('user', content);
        
        // Clear input
        this.elements.userInput.value = '';
        this.updateSendButton();
        
        // Update conversation title if needed
        this.updateConversationTitle(conversation);

        // Generate assistant response
        await this.generateResponse(conversation);
    }

    async generateResponse(conversation) {
        this.setGeneratingState(true);
        
        try {
            const serverUrl = this.elements.serverUrl.value.trim();
            const model = this.elements.modelSelect.value === 'auto' ? 
                this.elements.modelSelect.options[this.elements.modelSelect.selectedIndex].textContent :
                this.elements.modelSelect.value;
            
            const requestData = {
                model: model,
                messages: conversation.messages,
                temperature: parseFloat(this.elements.temperature.value),
                max_tokens: parseInt(this.elements.maxTokens.value),
                stream: this.elements.streamMode.checked
            };

            this.currentAbortController = new AbortController();

            if (this.elements.streamMode.checked) {
                await this.handleStreamResponse(serverUrl, requestData, conversation);
            } else {
                await this.handleNormalResponse(serverUrl, requestData, conversation);
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error generating response:', error);
                this.addErrorMessage('生成回复时出错: ' + error.message);
            }
        } finally {
            this.setGeneratingState(false);
        }
    }

    async handleStreamResponse(serverUrl, requestData, conversation) {
        const response = await fetch(`${serverUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData),
            signal: this.currentAbortController.signal
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let content = '';
        let messageElement = null;

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6).trim();
                        if (data === '[DONE]') continue;
                        
                        try {
                            const parsed = JSON.parse(data);
                            const delta = parsed.choices?.[0]?.delta?.content;
                            if (delta) {
                                content += delta;
                                if (!messageElement) {
                                    messageElement = this.addMessageToUI('assistant', '', true);
                                }
                                this.updateMessageContent(messageElement, content);
                                this.scrollToBottom();
                            }
                        } catch (e) {
                            // Ignore parsing errors for individual chunks
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }

        if (content) {
            conversation.messages.push({ role: 'assistant', content });
            this.saveConversations();
        }
    }

    async handleNormalResponse(serverUrl, requestData, conversation) {
        this.showLoadingIndicator(true);
        
        const response = await fetch(`${serverUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData),
            signal: this.currentAbortController.signal
        });

        this.showLoadingIndicator(false);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        
        if (content) {
            conversation.messages.push({ role: 'assistant', content });
            this.addMessageToUI('assistant', content);
            this.saveConversations();
        }
    }

    addMessageToUI(role, content, isStreaming = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        if (isStreaming) {
            contentDiv.innerHTML = '<span class="typing-indicator">AI 正在思考<span class="typing-dots"><span></span><span></span><span></span></span></span>';
        } else {
            contentDiv.innerHTML = this.formatMessage(content);
        }
        
        messageDiv.appendChild(contentDiv);
        this.elements.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
        
        return messageDiv;
    }

    updateMessageContent(messageElement, content) {
        const contentDiv = messageElement.querySelector('.message-content');
        contentDiv.innerHTML = this.formatMessage(content);
    }

    formatMessage(content) {
        // Simple markdown-like formatting
        let formatted = this.escapeHtml(content);
        
        // Code blocks
        formatted = formatted.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        
        // Inline code
        formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Line breaks
        formatted = formatted.replace(/\n/g, '<br>');
        
        return formatted;
    }

    addErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        this.elements.chatMessages.appendChild(errorDiv);
        this.scrollToBottom();
    }

    stopGeneration() {
        if (this.currentAbortController) {
            this.currentAbortController.abort();
        }
        this.setGeneratingState(false);
    }

    setGeneratingState(isGenerating) {
        this.isGenerating = isGenerating;
        this.elements.sendButton.style.display = isGenerating ? 'none' : 'block';
        this.elements.stopButton.style.display = isGenerating ? 'block' : 'none';
        this.updateSendButton();
    }

    showLoadingIndicator(show) {
        this.elements.loadingIndicator.style.display = show ? 'block' : 'none';
    }

    scrollToBottom() {
        this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatTime(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return '刚才';
        if (diffMins < 60) return `${diffMins}分钟前`;
        if (diffHours < 24) return `${diffHours}小时前`;
        if (diffDays < 7) return `${diffDays}天前`;
        
        return date.toLocaleDateString('zh-CN');
    }
}

// Initialize the chat interface when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ChatInterface();
});