const typingForm = document.querySelector(".typing-form");
const chatContainer = document.querySelector(".chat-list");
const toggleThemeButton = document.querySelector("#theme-toggle-button");
const deleteChatButton = document.querySelector("#delete-chat-button");
const sendMessageButton = document.querySelector("#send-message-button");
const typingInput = document.querySelector(".typing-input");

// State variables
let userMessage = null;
let isResponseGenerating = false;
let typingInterval = null; // Store typing interval for stopping
let pendingOutgoingMessage = null; // Track outgoing message until API response

// API configuration
const API_KEY = "AIzaSyCu7KwRs1daR6lCx9PL8piOQl1TZUpfN80"; // Replace with your actual API key
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

// Function to escape HTML special characters
const escapeHtml = (text) => {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Save chats to local storage, excluding error messages and pending outgoing message if error exists
const saveChatsToLocalStorage = () => {
  const messages = chatContainer.querySelectorAll(".message:not(.error)");
  const filteredMessages = Array.from(messages).filter(msg => {
    // Exclude the pending outgoing message if an error exists
    if (msg === pendingOutgoingMessage && chatContainer.querySelector(".message.error")) {
      return false;
    }
    return true;
  });
  const filteredHTML = filteredMessages.map(msg => msg.outerHTML).join('');
  localStorage.setItem("saved-chats", filteredHTML);
}

// Load theme and chat data from local storage on page load
const loadDataFromLocalstorage = () => {
  const savedChats = localStorage.getItem("saved-chats");
  const isLightMode = localStorage.getItem("themeColor") === "light_mode";

  document.body.classList.toggle("light_mode", isLightMode);
  toggleThemeButton.innerText = isLightMode ? "dark_mode" : "light_mode";
  chatContainer.innerHTML = savedChats || '';
  document.body.classList.toggle("hide-header", !!savedChats);
  chatContainer.scrollTo(0, chatContainer.scrollHeight);
  updateSendButtonVisibility();
  checkIconLoad();
}

// Create a new message element and return it
const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);

  const messageContent = document.createElement("div");
  messageContent.classList.add("message-content");

  const textDiv = document.createElement("div");
  textDiv.classList.add("text");
  textDiv.innerText = content; // Use innerText for safety

  messageContent.appendChild(textDiv);

  const iconContainer = document.createElement("div");
  iconContainer.classList.add("icon-container");

  if (classes.includes("outgoing")) {
    iconContainer.innerHTML = `
      <span onClick="editMessage(this)" class="icon material-symbols-rounded">edit</span>
      <span onClick="deleteMessage(this)" class="icon material-symbols-rounded delete-color">delete</span>
    `;
  } else {
    iconContainer.innerHTML = `
      <span onClick="copyMessage(this)" class="icon material-symbols-rounded">content_copy</span>
      <span onClick="speakMessage(this)" class="icon material-symbols-rounded">volume_up</span>
    `;
  }

  div.appendChild(messageContent);
  div.appendChild(iconContainer);

  return div;
}

// Create loading message element
const createLoadingMessageElement = () => {
  const div = document.createElement("div");
  div.classList.add("message", "incoming", "loading");

  const messageContent = document.createElement("div");
  messageContent.classList.add("message-content");

  const textDiv = document.createElement("div");
  textDiv.classList.add("text");
  messageContent.appendChild(textDiv);

  const loadingIndicator = document.createElement("div");
  loadingIndicator.classList.add("loading-indicator");
  loadingIndicator.innerHTML = `
    <div class="loading-bar"></div>
    <div class="loading-bar"></div>
    <div class="loading-bar"></div>
  `;
  messageContent.appendChild(loadingIndicator);

  const iconContainer = document.createElement("div");
  iconContainer.classList.add("icon-container");
  iconContainer.innerHTML = `
    <span onClick="copyMessage(this)" class="icon material-symbols-rounded hide">content_copy</span>
    <span onClick="speakMessage(this)" class="icon material-symbols-rounded hide">volume_up</span>
    <span onClick="stopTyping()" class="icon material-symbols-rounded stop">stop</span>
  `;
  messageContent.appendChild(iconContainer);

  div.appendChild(messageContent);
  return div;
}

// Check if Material Symbols font loaded, fallback if not
const checkIconLoad = () => {
  const testIcon = document.createElement("span");
  testIcon.className = "material-symbols-rounded";
  testIcon.innerText = "arrow_downward";
  testIcon.style.position = "absolute";
  testIcon.style.visibility = "hidden";
  document.body.appendChild(testIcon);

  const fontLoaded = window.getComputedStyle(testIcon).fontFamily.includes("Material Symbols Rounded");
  document.body.removeChild(testIcon);
};

// Show typing effect
const showTypingEffect = (text, textElement, incomingMessageDiv) => {
  const words = text.split(' ');
  let currentWordIndex = 0;

  typingInterval = setInterval(() => {
    textElement.innerText += (currentWordIndex === 0 ? '' : ' ') + words[currentWordIndex++];
    incomingMessageDiv.querySelector(".icon:not(.stop)")?.classList.add("hide");

    // Save to local storage during typing
    saveChatsToLocalStorage();

    if (currentWordIndex === words.length) {
      clearInterval(typingInterval);
      typingInterval = null;
      isResponseGenerating = false;
      sendMessageButton.innerText = "arrow_upward"; // Reset to send icon
      sendMessageButton.removeAttribute("data-state"); // Remove pause state
      updateSendButtonVisibility();
      incomingMessageDiv.querySelectorAll(".icon").forEach(icon => icon.classList.remove("hide"));
      incomingMessageDiv.querySelector(".stop")?.classList.add("hide"); // Hide stop button when done
      saveChatsToLocalStorage();
    }
    chatContainer.scrollTo(0, chatContainer.scrollHeight);
  }, 75);
}

// Stop typing effect
const stopTyping = () => {
  if (typingInterval) {
    clearInterval(typingInterval);
    typingInterval = null;
    isResponseGenerating = false;
    userMessage = null; // Reset userMessage to prevent sending old text
    sendMessageButton.innerText = "arrow_upward"; // Reset to send icon
    sendMessageButton.removeAttribute("data-state"); // Remove pause state
    updateSendButtonVisibility();
    const incomingMessageDiv = document.querySelector(".message.incoming:not(.error)");
    if (incomingMessageDiv) {
      incomingMessageDiv.querySelectorAll(".icon").forEach(icon => icon.classList.remove("hide"));
      incomingMessageDiv.querySelector(".stop")?.classList.add("hide"); // Hide stop button
    }
    saveChatsToLocalStorage();
  }
}

// API response fetch
const generateAPIResponse = async (incomingMessageDiv) => {
  const textElement = incomingMessageDiv.querySelector(".text");

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        contents: [{ 
          role: "user", 
          parts: [{ text: userMessage }] 
        }] 
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error.message);

    const apiResponse = data?.candidates[0].content.parts[0].text.replace(/\*\*(.*?)\*\*/g, '$1');
    incomingMessageDiv.querySelector(".loading-indicator")?.remove(); // Remove loading indicator
    showTypingEffect(apiResponse, textElement, incomingMessageDiv);
  } catch (error) {
    isResponseGenerating = false;
    userMessage = null; // Reset userMessage on error
    sendMessageButton.innerText = "arrow_upward"; // Reset to send icon
    sendMessageButton.removeAttribute("data-state"); // Remove pause state
    updateSendButtonVisibility();
    textElement.innerText = error.message;
    incomingMessageDiv.querySelector(".loading-indicator")?.remove(); // Remove loading indicator
    incomingMessageDiv.classList.add("error");
    incomingMessageDiv.querySelectorAll(".icon").forEach(icon => icon.classList.add("hide"));
    saveChatsToLocalStorage(); // Save non-error messages, excluding pending outgoing
  } finally {
    incomingMessageDiv.classList.remove("loading");
    pendingOutgoingMessage = null; // Clear pending message
  }
}

// Show loading message
const showLoadingAnimation = () => {
  const incomingMessageDiv = createLoadingMessageElement();
  chatContainer.appendChild(incomingMessageDiv);
  chatContainer.scrollTo(0, chatContainer.scrollHeight);
  sendMessageButton.innerText = "stop"; // Change to pause icon
  sendMessageButton.setAttribute("data-state", "stop"); // Set pause state
  updateSendButtonVisibility();
  generateAPIResponse(incomingMessageDiv);
}

// Copy to clipboard
const copyMessage = (copyButton) => {
  const messageText = copyButton.closest(".message-content").querySelector(".text").innerText;
  navigator.clipboard.writeText(messageText);
  copyButton.innerText = "done";
  setTimeout(() => copyButton.innerText = "content_copy", 1000);
}

// Text-to-Speech
const speakMessage = (button) => {
  const messageText = button.closest(".message-content").querySelector(".text").innerText;
  
  // If speech is already active, stop it
  if (button.innerText === "pause") {
    speechSynthesis.cancel();
    button.innerText = "volume_up";
    return;
  }

  // Start new speech
  const utterance = new SpeechSynthesisUtterance(messageText);
  utterance.lang = "en-US";
  speechSynthesis.speak(utterance);
  button.innerText = "pause";
  
  // Reset icon when speech ends
  utterance.onend = () => {
    button.innerText = "volume_up";
  };
}

// Edit message
const editMessage = (editButton) => {
  const messageContent = editButton.closest(".message").querySelector(".message-content");
  const textElement = messageContent.querySelector(".text");
  const outgoingMessageDiv = editButton.closest(".message");

  // Check if already in edit mode
  const editInput = messageContent.querySelector(".edit-input");
  if (editInput) {
    // If edit input exists, close edit mode by restoring the original text
    const currentText = editInput.value.trim();
    textElement.innerText = currentText || textElement.dataset.originalText; // Use innerText instead of innerHTML
    editInput.remove();
    messageContent.querySelector(".edit-buttons")?.remove();
    saveChatsToLocalStorage();
    return;
  }

  // Store original text for restoration
  const currentText = textElement.innerText;
  textElement.dataset.originalText = currentText;

  // Replace text with input and save/cancel buttons
  textElement.innerHTML = `
    <textarea type="text" class="edit-input">${currentText}</textarea>
    <div class="edit-buttons">
      <button class="cancel-edit">Cancel</button>
      <button class="save-edit">Save</button>
    </div>
  `;

  const saveButton = messageContent.querySelector(".save-edit");
  const cancelButton = messageContent.querySelector(".cancel-edit");

  saveButton.addEventListener("click", () => {
    const newText = messageContent.querySelector(".edit-input").value.trim();
    if (newText && !isResponseGenerating) {
      // Update the outgoing message
      textElement.innerText = newText; // Use innerText instead of innerHTML
      
      // Find and remove the next incoming message (if it exists)
      let nextSibling = outgoingMessageDiv.nextElementSibling;
      if (nextSibling && nextSibling.classList.contains("incoming")) {
        nextSibling.remove();
      }

      // Trigger new API response with edited message
      userMessage = newText;
      isResponseGenerating = true;
      saveChatsToLocalStorage();
      setTimeout(showLoadingAnimation, 500);
    }
  });

  cancelButton.addEventListener("click", () => {
    // Restore original text and remove edit input/buttons
    textElement.innerText = textElement.dataset.originalText; // Use innerText instead of innerHTML
    messageContent.querySelector(".edit-buttons")?.remove();
    saveChatsToLocalStorage();
  });
};

// Show custom modal for confirmation
const showCustomModal = (message, onConfirm) => {
  // Create modal overlay
  const overlay = document.createElement("div");
  overlay.classList.add("modal-overlay");

  // Create modal
  const modal = document.createElement("div");
  modal.classList.add("custom-modal");

  // Modal content
  modal.innerHTML = `
    <div class="modal-content">
      <p class="modal-text">${message}</p>
      <div class="modal-buttons">
        <button class="modal-cancel">Cancel</button>
        <button class="modal-confirm">Confirm</button>
      </div>
    </div>
  `;

  // Append modal to overlay and overlay to body
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Event listeners for buttons
  const confirmButton = modal.querySelector(".modal-confirm");
  const cancelButton = modal.querySelector(".modal-cancel");

  confirmButton.addEventListener("click", () => {
    onConfirm();
    overlay.remove();
  });

  cancelButton.addEventListener("click", () => {
    overlay.remove();
  });

  // Close modal on overlay click
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  });
};

// Delete message
const deleteMessage = (deleteButton) => {
  const messageDiv = deleteButton.closest(".message");
  const nextSibling = messageDiv.nextElementSibling;

  showCustomModal("Are you sure you want to delete this message?", () => {
    // Remove the outgoing message
    messageDiv.remove();

    // If the next sibling exists and is an incoming message, remove it too
    if (nextSibling && nextSibling.classList.contains("incoming")) {
      nextSibling.remove();
    }

    // Update local storage
    saveChatsToLocalStorage();

    // Show header if no chats remain
    if (!chatContainer.children.length) {
      document.body.classList.remove("hide-header");
      localStorage.removeItem("saved-chats");
    }
  });
};

// Update send button visibility
const updateSendButtonVisibility = () => {
  const hasText = typingInput.value.trim().length > 0;
  // Disable button only if no text and not in pause state
  sendMessageButton.disabled = !hasText && !isResponseGenerating;
};

// Outgoing message handler
const handleOutgoingChat = () => {
  if (!userMessage || isResponseGenerating) return; // Prevent sending if userMessage is null or response is generating

  isResponseGenerating = true;

  const outgoingMessageDiv = createMessageElement(userMessage, "outgoing");
  chatContainer.appendChild(outgoingMessageDiv);
  pendingOutgoingMessage = outgoingMessageDiv; // Track pending outgoing message
  typingForm.reset();
  document.body.classList.add("hide-header");
  chatContainer.scrollTo(0, chatContainer.scrollHeight);
  setTimeout(showLoadingAnimation, 500);
}

// Send/Pause button handler
sendMessageButton.addEventListener("click", (e) => {
  e.preventDefault();
  if (sendMessageButton.disabled) return; // Ignore if disabled
  if (isResponseGenerating) {
    stopTyping();
  } else {
    userMessage = typingInput.value.trim();
    handleOutgoingChat();
  }
});

// Theme toggle
toggleThemeButton.addEventListener("click", () => {
  const isLightMode = document.body.classList.toggle("light_mode");
  localStorage.setItem("themeColor", isLightMode ? "light_mode" : "dark_mode");
  toggleThemeButton.innerText = isLightMode ? "dark_mode" : "light_mode";
});

// Delete chats
deleteChatButton.addEventListener("click", () => {
  showCustomModal("Are you sure you want to delete all the chats?", () => {
    localStorage.removeItem("saved-chats");
    loadDataFromLocalstorage();
  });
});

// Suggestion click handler
const bindSuggestionListeners = () => {
  const suggestions = document.querySelectorAll(".suggestion");
  suggestions.forEach(suggestion => {
    suggestion.addEventListener("click", () => {
      userMessage = suggestion.querySelector(".text").innerText;
      typingInput.value = userMessage; // Set the input value to the suggestion text
      updateSendButtonVisibility();
      handleOutgoingChat();
    });
  });
};

// Initialize suggestion listeners after suggestions are populated
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(bindSuggestionListeners, 100); // Delay to ensure suggestions are populated
});

// Prevent form submission on Enter key (allow Enter to add new line)
typingForm.addEventListener("submit", (e) => {
  e.preventDefault(); // Prevent form submission
});

// Input change handler to show/hide send button
typingInput.addEventListener("input", updateSendButtonVisibility);

// Initialize send button state
sendMessageButton.disabled = true; // Disable button by default
loadDataFromLocalstorage();

// Export chat to text file
const exportChat = () => {
  const allMessages = document.querySelectorAll(".message .text");
  let textContent = "";
  allMessages.forEach(msg => {
    textContent += msg.innerText + "\n\n";
  });

  const blob = new Blob([textContent], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "chat_export.txt";
  a.click();
};