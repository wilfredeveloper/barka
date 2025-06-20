/**
 * app.js: JS code for the adk-streaming sample app.
 */

/**
 * WebSocket handling
 */

// Global variables
const sessionId = Math.random().toString().substring(10);
const ws_url = "ws://" + window.location.host + "/ws/" + sessionId;
let websocket = null;
let is_audio = false;
let currentMessageId = null; // Track the current message ID during a conversation turn

// Get DOM elements
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("message");
const messagesDiv = document.getElementById("messages");
const statusDot = document.getElementById("connection-dot");
const connectionStatus = document.getElementById("connection-status");
const typingIndicator = document.getElementById("typing-indicator");
const startAudioButton = document.getElementById("startAudioButton");
const stopAudioButton = document.getElementById("stopAudioButton");
const recordingContainer = document.getElementById(
  "recording-status-container"
);

// WebSocket handlers
function connectWebsocket() {
  // Connect websocket
  const wsUrl = ws_url + "?is_audio=" + is_audio;
  websocket = new WebSocket(wsUrl);

  // Handle connection open
  websocket.onopen = function () {
    // Connection opened messages
    console.log("WebSocket connection opened.");
    connectionStatus.textContent = "Connected";
    statusDot.classList.add("connected");

    // Enable the Send button
    document.getElementById("sendButton").disabled = false;
    addSubmitHandler();
  };

  // Handle incoming messages
  websocket.onmessage = function (event) {
    // Parse the incoming message
    const message_from_server = JSON.parse(event.data);
    console.log("[AGENT TO CLIENT] ", message_from_server);

    // Show typing indicator for first message in a response sequence,
    // but not for turn_complete messages
    if (
      !message_from_server.turn_complete &&
      (message_from_server.mime_type === "text/plain" ||
        message_from_server.mime_type === "audio/pcm")
    ) {
      typingIndicator.classList.add("visible");
    }

    // Check if the turn is complete
    if (
      message_from_server.turn_complete &&
      message_from_server.turn_complete === true
    ) {
      // Reset currentMessageId to ensure the next message gets a new element
      currentMessageId = null;
      typingIndicator.classList.remove("visible");
      return;
    }

    // If it's audio, play it
    if (message_from_server.mime_type === "audio/pcm" && audioPlayerNode) {
      audioPlayerNode.port.postMessage(base64ToArray(message_from_server.data));

      // If we have an existing message element for this turn, add audio icon if needed
      if (currentMessageId) {
        const messageElem = document.getElementById(currentMessageId);
        if (
          messageElem &&
          !messageElem.querySelector(".audio-icon") &&
          is_audio
        ) {
          const audioIcon = document.createElement("span");
          audioIcon.className = "audio-icon";
          messageElem.prepend(audioIcon);
        }
      }
    }

    // Handle text messages
    if (message_from_server.mime_type === "text/plain") {
      // Hide typing indicator
      typingIndicator.classList.remove("visible");

      const role = message_from_server.role || "model";

      // If we already have a message element for this turn, append to it
      if (currentMessageId && role === "model") {
        const existingMessage = document.getElementById(currentMessageId);
        if (existingMessage) {
          // Find the content container within the message
          const contentContainer =
            existingMessage.querySelector(".message-content");
          if (contentContainer) {
            // Get existing text and append new text
            const existingText =
              contentContainer.getAttribute("data-raw-text") || "";
            const newText = existingText + message_from_server.data;

            // Store the raw text for future appends
            contentContainer.setAttribute("data-raw-text", newText);

            // Parse and render the complete markdown
            try {
              contentContainer.innerHTML = marked.parse(newText);
            } catch (error) {
              console.warn("Markdown parsing error:", error);
              // Fallback to plain text if markdown parsing fails
              contentContainer.textContent = newText;
            }
          }

          // Scroll to the bottom
          messagesDiv.scrollTop = messagesDiv.scrollHeight;
          return;
        }
      }

      // Create a new message element if it's a new turn or user message
      const messageId = Math.random().toString(36).substring(7);
      const messageElem = document.createElement("div");
      messageElem.id = messageId;

      // Set class based on role
      messageElem.className =
        role === "user" ? "message user-message" : "message agent-message";

      // Add audio icon for model messages if audio is enabled
      if (is_audio && role === "model") {
        const audioIcon = document.createElement("span");
        audioIcon.className = "audio-icon";
        messageElem.appendChild(audioIcon);
      }

      // Create content container for markdown rendering
      if (role === "model") {
        const contentContainer = document.createElement("div");
        contentContainer.className = "message-content";
        contentContainer.setAttribute(
          "data-raw-text",
          message_from_server.data
        );
        try {
          contentContainer.innerHTML = marked.parse(message_from_server.data);
        } catch (error) {
          console.warn("Markdown parsing error:", error);
          contentContainer.textContent = message_from_server.data;
        }
        messageElem.appendChild(contentContainer);
      } else {
        // For user messages, create a content container too for consistency
        const contentContainer = document.createElement("div");
        contentContainer.className = "message-content";
        contentContainer.textContent = message_from_server.data;
        messageElem.appendChild(contentContainer);
      }

      // Add the message to the DOM
      messagesDiv.appendChild(messageElem);

      // Remember the ID of this message for subsequent responses in this turn
      if (role === "model") {
        currentMessageId = messageId;
      }

      // Scroll to the bottom
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
  };

  // Handle connection close
  websocket.onclose = function () {
    console.log("WebSocket connection closed.");
    document.getElementById("sendButton").disabled = true;
    connectionStatus.textContent = "Disconnected. Reconnecting...";
    statusDot.classList.remove("connected");
    typingIndicator.classList.remove("visible");
    setTimeout(function () {
      console.log("Reconnecting...");
      connectWebsocket();
    }, 5000);
  };

  websocket.onerror = function (e) {
    console.log("WebSocket error: ", e);
    connectionStatus.textContent = "Connection error";
    statusDot.classList.remove("connected");
    typingIndicator.classList.remove("visible");
  };
}
connectWebsocket();

// Add submit handler to the form
function addSubmitHandler() {
  messageForm.onsubmit = function (e) {
    e.preventDefault();
    const message = messageInput.value.trim();
    if (message) {
      // Create user message with new structure
      const messageElem = document.createElement("div");
      messageElem.className = "message user-message";

      const contentContainer = document.createElement("div");
      contentContainer.className = "message-content";
      contentContainer.textContent = message;
      messageElem.appendChild(contentContainer);

      messagesDiv.appendChild(messageElem);
      messageInput.value = "";

      // Reset textarea height
      messageInput.style.height = "auto";
      messageInput.style.height = "50px";

      // Show typing indicator after sending message
      typingIndicator.classList.add("visible");

      sendMessage({
        mime_type: "text/plain",
        data: message,
        role: "user",
      });
      console.log("[CLIENT TO AGENT] " + message);
      // Scroll down to the bottom of the messagesDiv
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
    return false;
  };
}

// Send a message to the server as a JSON string
function sendMessage(message) {
  if (websocket && websocket.readyState == WebSocket.OPEN) {
    const messageJson = JSON.stringify(message);
    websocket.send(messageJson);
  }
}

// Decode Base64 data to Array
function base64ToArray(base64) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Audio handling
 */

let audioPlayerNode;
let audioPlayerContext;
let audioRecorderNode;
let audioRecorderContext;
let micStream;
let isRecording = false;

// Import the audio worklets
import { startAudioPlayerWorklet } from "./audio-player.js";
import { startAudioRecorderWorklet } from "./audio-recorder.js";

// Start audio
function startAudio() {
  // Start audio output
  startAudioPlayerWorklet().then(([node, ctx]) => {
    audioPlayerNode = node;
    audioPlayerContext = ctx;
  });
  // Start audio input
  startAudioRecorderWorklet(audioRecorderHandler).then(
    ([node, ctx, stream]) => {
      audioRecorderNode = node;
      audioRecorderContext = ctx;
      micStream = stream;
      isRecording = true;
    }
  );
}

// Stop audio recording
function stopAudio() {
  if (audioRecorderNode) {
    audioRecorderNode.disconnect();
    audioRecorderNode = null;
  }

  if (audioRecorderContext) {
    audioRecorderContext
      .close()
      .catch((err) => console.error("Error closing audio context:", err));
    audioRecorderContext = null;
  }

  if (micStream) {
    micStream.getTracks().forEach((track) => track.stop());
    micStream = null;
  }

  isRecording = false;
}

// Start the audio only when the user clicked the button
// (due to the gesture requirement for the Web Audio API)
startAudioButton.addEventListener("click", () => {
  startAudioButton.disabled = true;
  startAudioButton.textContent = "Voice Enabled";
  startAudioButton.classList.add("hidden");
  stopAudioButton.classList.remove("hidden");
  recordingContainer.classList.remove("hidden");
  document.body.classList.add("recording-active");
  startAudio();
  is_audio = true;

  // Add class to messages container to enable audio styling
  messagesDiv.classList.add("audio-enabled");

  connectWebsocket(); // reconnect with the audio mode
});

// Stop audio recording when stop button is clicked
stopAudioButton.addEventListener("click", () => {
  stopAudio();
  stopAudioButton.classList.add("hidden");
  startAudioButton.classList.remove("hidden");
  startAudioButton.disabled = false;
  startAudioButton.textContent = "🎤 Voice";
  recordingContainer.classList.add("hidden");
  document.body.classList.remove("recording-active");

  // Remove audio styling class
  messagesDiv.classList.remove("audio-enabled");

  // Reconnect without audio mode
  is_audio = false;

  // Only reconnect if the connection is still open
  if (websocket && websocket.readyState === WebSocket.OPEN) {
    websocket.close();
    // The onclose handler will trigger reconnection
  }
});

// Audio recorder handler
function audioRecorderHandler(pcmData) {
  // Only send data if we're still recording
  if (!isRecording) return;

  // Send the pcm data as base64
  sendMessage({
    mime_type: "audio/pcm",
    data: arrayBufferToBase64(pcmData),
  });

  // Log every few samples to avoid flooding the console
  if (Math.random() < 0.01) {
    // Only log ~1% of audio chunks
    console.log("[CLIENT TO AGENT] sent audio data");
  }
}

// Encode an array buffer with Base64
function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
