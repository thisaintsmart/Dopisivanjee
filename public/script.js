class CryptoChat {
    constructor() {
        this.socket = io();
        this.currentUser = null;
        this.typingTimeout = null;
        
        this.initializeEventListeners();
        this.setupSocketEvents();
    }

    initializeEventListeners() {
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        const fileButton = document.getElementById('fileButton');
        const fileInput = document.getElementById('fileInput');

        // Send message on button click
        sendButton.addEventListener('click', () => this.sendMessage());

        // Send message on Enter key
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        // Typing indicators
        messageInput.addEventListener('input', () => {
            this.socket.emit('typing');
            clearTimeout(this.typingTimeout);
            this.typingTimeout = setTimeout(() => {
                this.socket.emit('stop typing');
            }, 1000);
        });

        // File upload
        fileButton.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
    }

    setupSocketEvents() {
        // User joined/left events
        this.socket.on('user joined', (data) => {
            this.updateUserList(data.users);
            this.addSystemMessage(`${data.username} joined the chat`);
        });

        this.socket.on('user left', (data) => {
            this.updateUserList(data.users);
            this.addSystemMessage(`${data.username} left the chat`);
        });

        // Chat messages
        this.socket.on('chat message', (data) => {
            this.addMessage(data);
        });

        // File uploads
        this.socket.on('file upload', (fileData) => {
            this.addFileMessage(fileData);
        });

        // Typing indicators
        this.socket.on('user typing', (username) => {
            this.showTypingIndicator(`${username} is typing...`);
        });

        this.socket.on('user stop typing', (username) => {
            this.hideTypingIndicator();
        });
    }

    sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const message = messageInput.value.trim();

        if (message) {
            this.socket.emit('chat message', { message });
            messageInput.value = '';
        }
    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('File size must be less than 10MB');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.socket.emit('file upload', result);
            } else {
                alert('File upload failed');
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Upload failed');
        }

        // Reset file input
        event.target.value = '';
    }

    addMessage(data) {
        const messagesContainer = document.getElementById('messages');
        const messageElement = document.createElement('div');
        messageElement.className = `message ${data.username === this.currentUser ? 'own' : 'other'}`;

        messageElement.innerHTML = `
            <div class="message-header">
                <strong>${this.escapeHtml(data.username)}</strong>
                <span>${this.formatTime(data.timestamp)}</span>
            </div>
            <div class="message-content">
                ${this.escapeHtml(data.originalMessage)}
                <span class="encryption-badge">ENCRYPTED</span>
            </div>
        `;

        messagesContainer.appendChild(messageElement);
        this.scrollToBottom();
    }

    addFileMessage(fileData) {
        const messagesContainer = document.getElementById('messages');
        const messageElement = document.createElement('div');
        messageElement.className = `message ${fileData.username === this.currentUser ? 'own' : 'other'}`;

        messageElement.innerHTML = `
            <div class="message-header">
                <strong>${this.escapeHtml(fileData.username)}</strong>
                <span>${this.formatTime(fileData.timestamp)}</span>
            </div>
            <div class="file-message">
                <i class="fas fa-file file-icon"></i>
                <div class="file-info">
                    <div class="file-name">${this.escapeHtml(fileData.originalName)}</div>
                    <div class="file-size">${this.formatFileSize(fileData.size)}</div>
                </div>
                <a href="${fileData.url}" download class="download-btn">
                    <i class="fas fa-download"></i>
                </a>
            </div>
        `;

        messagesContainer.appendChild(messageElement);
        this.scrollToBottom();
    }

    addSystemMessage(text) {
        const messagesContainer = document.getElementById('messages');
        const messageElement = document.createElement('div');
        messageElement.className = 'message system';
        messageElement.style.cssText = `
            text-align: center;
            background: #ffeaa7;
            color: #2d3436;
            max-width: 100%;
            font-style: italic;
            margin: 10px auto;
        `;
        messageElement.textContent = text;
        messagesContainer.appendChild(messageElement);
        this.scrollToBottom();
    }

    updateUserList(users) {
        const userList = document.getElementById('userList');
        const userCount = document.getElementById('userCount');
        
        userList.innerHTML = '';
        userCount.textContent = users.length;

        users.forEach(user => {
            const userElement = document.createElement('div');
            userElement.className = 'user-item';
            userElement.innerHTML = `
                <div class="user-avatar">${user.charAt(0).toUpperCase()}</div>
                <span>${this.escapeHtml(user)}</span>
            `;
            userList.appendChild(userElement);
        });
    }

    showTypingIndicator(text) {
        const indicator = document.getElementById('typingIndicator');
        indicator.textContent = text;
        indicator.style.display = 'block';
    }

    hideTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        indicator.style.display = 'none';
    }

    scrollToBottom() {
        const messagesContainer = document.getElementById('messages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    formatTime(timestamp) {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Initialize the chat when page loads
document.addEventListener('DOMContentLoaded', () => {
    new CryptoChat();
});