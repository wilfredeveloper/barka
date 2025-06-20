/**
 * Enhanced app.js: Enhanced WebSocket client with proper authentication and client ID management
 */

/**
 * Configuration and Global Variables
 */
class OvaraClient {
    constructor() {
        // Client configuration
        this.clientId = this.getOrCreateClientId();
        this.token = this.getAuthToken();
        this.conversationId = null;
        this.connectionId = null;
        this.websocket = null;
        this.isAudio = false;
        this.isRecording = false;
        this.currentMessageId = null;
        
        // Connection state
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        
        // DOM elements
        this.initializeDOMElements();
        
        // Audio components
        this.audioPlayerNode = null;
        this.audioPlayerContext = null;
        this.audioRecorderNode = null;
        this.audioRecorderContext = null;
        this.micStream = null;
        
        console.log(`Ovara Client initialized with ID: ${this.clientId}`);
    }

    /**
     * Client ID Management
     */
    getOrCreateClientId() {
        let clientId = localStorage.getItem('ovara_client_id');
        if (!clientId) {
            // Generate a new client ID (in production, this would come from your auth system)
            clientId = 'client_' + Date.now() + '_' + Math.random().toString(36).substring(2);
            localStorage.setItem('ovara_client_id', clientId);
            console.log(`Generated new client ID: ${clientId}`);
        }
        return clientId;
    }

    /**
     * Authentication Token Management
     */
    getAuthToken() {
        // In production, this would be a proper JWT token from your auth system
        let token = localStorage.getItem('ovara_auth_token');
        if (!token) {
            // Generate a demo token (in production, get this from your auth endpoint)
            token = this.generateDemoToken();
            localStorage.setItem('ovara_auth_token', token);
        }
        return token;
    }

    generateDemoToken() {
        // This is a demo token - in production, get this from your authentication system
        const payload = {
            user_id: `user_${this.clientId}`,
            client_id: this.clientId,
            exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
            iat: Math.floor(Date.now() / 1000)
        };
        
        // Simple base64 encoding for demo (use proper JWT in production)
        return btoa(JSON.stringify(payload));
    }

    /**
     * DOM Element Initialization
     */
    initializeDOMElements() {
        this.messageForm = document.getElementById("messageForm");
        this.messageInput = document.getElementById("message");
        this.messagesDiv = document.getElementById("messages");
        this.statusDot = document.getElementById("connection-dot");
        this.connectionStatus = document.getElementById("connection-status");
        this.typingIndicator = document.getElementById("typing-indicator");
        this.startAudioButton = document.getElementById("startAudioButton");
        this.stopAudioButton = document.getElementById("stopAudioButton");
        this.recordingContainer = document.getElementById("recording-status-container");
        
        // Add client info display
        this.addClientInfoDisplay();
        
        // Initialize event handlers
        this.initializeEventHandlers();
    }

    addClientInfoDisplay() {
        // Add client info to the UI
        const clientInfo = document.createElement('div');
        clientInfo.id = 'client-info';
        clientInfo.innerHTML = `
            <div class="client-info">
                <span>Client ID: ${this.clientId}</span>
                <span id="connection-id">Connection: Not connected</span>
                <span id="conversation-id">Conversation: None</span>
            </div>
        `;
        document.body.insertBefore(clientInfo, document.body.firstChild);
    }

    /**
     * Event Handlers
     */
    initializeEventHandlers() {
        // Form submission
        if (this.messageForm) {
            this.messageForm.onsubmit = (e) => this.handleMessageSubmit(e);
        }

        // Audio controls
        if (this.startAudioButton) {
            this.startAudioButton.addEventListener("click", () => this.startAudio());
        }
        
        if (this.stopAudioButton) {
            this.stopAudioButton.addEventListener("click", () => this.stopAudio());
        }

        // Auto-resize textarea
        if (this.messageInput) {
            this.messageInput.addEventListener('input', () => {
                this.messageInput.style.height = 'auto';
                this.messageInput.style.height = this.messageInput.scrollHeight + 'px';
            });
        }
    }

    /**
     * WebSocket Connection Management
     */
    connect() {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            console.log("WebSocket already connected");
            return;
        }

        const wsUrl = this.buildWebSocketUrl();
        console.log(`Connecting to: ${wsUrl}`);
        
        this.websocket = new WebSocket(wsUrl);
        this.setupWebSocketHandlers();
    }

    buildWebSocketUrl() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const params = new URLSearchParams({
            token: this.token,
            is_audio: this.isAudio.toString()
        });
        
        if (this.conversationId) {
            params.append('conversation_id', this.conversationId);
        }
        
        return `${protocol}//${host}/ws/${this.clientId}?${params.toString()}`;
    }

    setupWebSocketHandlers() {
        this.websocket.onopen = () => this.handleConnectionOpen();
        this.websocket.onmessage = (event) => this.handleMessage(event);
        this.websocket.onclose = (event) => this.handleConnectionClose(event);
        this.websocket.onerror = (error) => this.handleConnectionError(error);
    }

    handleConnectionOpen() {
        console.log("WebSocket connection opened");
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        this.updateConnectionStatus("Connected", true);
        this.enableControls(true);
    }

    handleMessage(event) {
        try {
            const message = JSON.parse(event.data);
            console.log("[AGENT TO CLIENT]", message);
            
            // Handle connection establishment
            if (message.type === "connection_established") {
                this.connectionId = message.connection_id;
                this.conversationId = message.conversation_id;
                this.updateClientInfo();
                return;
            }
            
            // Handle typing indicators
            if (!message.turn_complete && 
                (message.mime_type === "text/plain" || message.mime_type === "audio/pcm")) {
                this.showTypingIndicator(true);
            }
            
            // Handle turn completion
            if (message.turn_complete) {
                this.currentMessageId = null;
                this.showTypingIndicator(false);
                return;
            }
            
            // Handle audio messages
            if (message.mime_type === "audio/pcm" && this.audioPlayerNode) {
                this.handleAudioMessage(message);
            }
            
            // Handle text messages
            if (message.mime_type === "text/plain") {
                this.handleTextMessage(message);
            }
            
        } catch (error) {
            console.error("Error parsing message:", error);
        }
    }

    handleConnectionClose(event) {
        console.log("WebSocket connection closed", event);
        this.isConnected = false;
        this.connectionId = null;
        
        this.updateConnectionStatus("Disconnected", false);
        this.enableControls(false);
        this.showTypingIndicator(false);
        
        // Attempt reconnection
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
            console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
            
            this.updateConnectionStatus(`Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`, false);
            setTimeout(() => this.connect(), delay);
        } else {
            this.updateConnectionStatus("Connection failed", false);
        }
    }

    handleConnectionError(error) {
        console.error("WebSocket error:", error);
        this.updateConnectionStatus("Connection error", false);
    }

    /**
     * Message Handling
     */
    handleTextMessage(message) {
        this.showTypingIndicator(false);
        
        const role = message.role || "model";
        
        // Append to existing message if it's a continuation
        if (this.currentMessageId && role === "model") {
            this.appendToExistingMessage(message.data);
            return;
        }
        
        // Create new message
        this.createNewMessage(message.data, role);
    }

    appendToExistingMessage(newText) {
        const existingMessage = document.getElementById(this.currentMessageId);
        if (!existingMessage) return;
        
        const contentContainer = existingMessage.querySelector(".message-content");
        if (!contentContainer) return;
        
        const existingText = contentContainer.getAttribute("data-raw-text") || "";
        const completeText = existingText + newText;
        
        contentContainer.setAttribute("data-raw-text", completeText);
        
        try {
            contentContainer.innerHTML = marked.parse(completeText);
        } catch (error) {
            console.warn("Markdown parsing error:", error);
            contentContainer.textContent = completeText;
        }
        
        this.scrollToBottom();
    }

    createNewMessage(text, role) {
        const messageId = Math.random().toString(36).substring(7);
        const messageElem = document.createElement("div");
        messageElem.id = messageId;
        messageElem.className = role === "user" ? "message user-message" : "message agent-message";
        
        // Add audio icon for model messages if audio is enabled
        if (this.isAudio && role === "model") {
            const audioIcon = document.createElement("span");
            audioIcon.className = "audio-icon";
            messageElem.appendChild(audioIcon);
        }
        
        // Create content container
        const contentContainer = document.createElement("div");
        contentContainer.className = "message-content";
        contentContainer.setAttribute("data-raw-text", text);
        
        if (role === "model") {
            try {
                contentContainer.innerHTML = marked.parse(text);
            } catch (error) {
                console.warn("Markdown parsing error:", error);
                contentContainer.textContent = text;
            }
        } else {
            contentContainer.textContent = text;
        }
        
        messageElem.appendChild(contentContainer);
        this.messagesDiv.appendChild(messageElem);
        
        if (role === "model") {
            this.currentMessageId = messageId;
        }
        
        this.scrollToBottom();
    }

    handleAudioMessage(message) {
        if (this.audioPlayerNode) {
            this.audioPlayerNode.port.postMessage(this.base64ToArray(message.data));
            
            // Add audio icon to current message if needed
            if (this.currentMessageId) {
                const messageElem = document.getElementById(this.currentMessageId);
                if (messageElem && !messageElem.querySelector(".audio-icon") && this.isAudio) {
                    const audioIcon = document.createElement("span");
                    audioIcon.className = "audio-icon";
                    messageElem.prepend(audioIcon);
                }
            }
        }
    }

    /**
     * Message Sending
     */
    handleMessageSubmit(e) {
        e.preventDefault();
        const message = this.messageInput.value.trim();
        if (!message) return false;
        
        // Create user message in UI
        this.createNewMessage(message, "user");
        
        // Clear input
        this.messageInput.value = "";
        this.messageInput.style.height = "auto";
        this.messageInput.style.height = "50px";
        
        // Show typing indicator
        this.showTypingIndicator(true);
        
        // Send message
        this.sendMessage({
            mime_type: "text/plain",
            data: message,
            role: "user"
        });
        
        console.log("[CLIENT TO AGENT]", message);
        return false;
    }

    sendMessage(message) {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify(message));
        } else {
            console.error("WebSocket not connected");
        }
    }

    /**
     * UI Updates
     */
    updateConnectionStatus(status, isConnected) {
        if (this.connectionStatus) {
            this.connectionStatus.textContent = status;
        }
        
        if (this.statusDot) {
            if (isConnected) {
                this.statusDot.classList.add("connected");
            } else {
                this.statusDot.classList.remove("connected");
            }
        }
    }

    updateClientInfo() {
        const connectionIdElem = document.getElementById("connection-id");
        const conversationIdElem = document.getElementById("conversation-id");
        
        if (connectionIdElem) {
            connectionIdElem.textContent = `Connection: ${this.connectionId || 'None'}`;
        }
        
        if (conversationIdElem) {
            conversationIdElem.textContent = `Conversation: ${this.conversationId || 'None'}`;
        }
    }

    enableControls(enabled) {
        const sendButton = document.getElementById("sendButton");
        if (sendButton) {
            sendButton.disabled = !enabled;
        }
    }

    showTypingIndicator(show) {
        if (this.typingIndicator) {
            if (show) {
                this.typingIndicator.classList.add("visible");
            } else {
                this.typingIndicator.classList.remove("visible");
            }
        }
    }

    scrollToBottom() {
        if (this.messagesDiv) {
            this.messagesDiv.scrollTop = this.messagesDiv.scrollHeight;
        }
    }

    /**
     * Utility Functions
     */
    base64ToArray(base64) {
        const binaryString = window.atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    arrayBufferToBase64(buffer) {
        let binary = "";
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    /**
     * Audio Methods (placeholder - would need full audio implementation)
     */
    async startAudio() {
        console.log("Starting audio mode...");
        this.isAudio = true;
        // Audio implementation would go here
        this.connect(); // Reconnect with audio enabled
    }

    stopAudio() {
        console.log("Stopping audio mode...");
        this.isAudio = false;
        // Audio cleanup would go here
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.close();
        }
    }
}

// Initialize the client when the page loads
let ovaraClient;
document.addEventListener('DOMContentLoaded', () => {
    ovaraClient = new OvaraClient();
    ovaraClient.connect();
});

// Export for global access
window.ovaraClient = ovaraClient;
