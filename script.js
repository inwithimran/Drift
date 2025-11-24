const typingForm = document.querySelector(".typing-form");
const chatContainer = document.querySelector(".chat-list");
const toggleThemeButton = document.querySelector("#theme-toggle-button");
const deleteChatButton = document.querySelector("#delete-chat-button");
const sendMessageButton = document.querySelector("#send-message-button");
const typingInput = document.querySelector(".typing-input");

// State variables
let userMessage = null;
let isResponseGenerating = false;
let typingInterval = null; 
let pendingOutgoingMessage = null; 

// API configuration
const API_KEY = "AIzaSyDg01Qkb2MgPVx856QxCbpWCn7k-PcoEBw"; // Replace with your actual API key
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${API_KEY}`;

// Configure Marked.js (FIX: Removed internal 'highlight' function to prevent double-render bugs)
if (typeof marked !== 'undefined') {
  marked.setOptions({
    breaks: true,
    gfm: true
    // highlight: removed to fix invisible text bug
  });
}

// Function to escape HTML special characters
const escapeHtml = (text) => {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Save chats
const saveChatsToLocalStorage = () => {
  const messages = chatContainer.querySelectorAll(".message");
  const filteredMessages = [];
  let skipNextOutgoing = false;

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.classList.contains("error")) {
      skipNextOutgoing = true;
      continue;
    }

    if (skipNextOutgoing && msg.classList.contains("outgoing")) {
      skipNextOutgoing = false;
      continue;
    }

    filteredMessages.push(msg);
  }

  const filteredHTML = filteredMessages.reverse().map(msg => msg.outerHTML).join('');
  localStorage.setItem("saved-chats", filteredHTML);
}

// Load data
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
  
  // Re-highlight code blocks on load
  if (typeof hljs !== 'undefined') {
      chatContainer.querySelectorAll('pre code').forEach((block) => {
          hljs.highlightElement(block);
      });
  }
}

// Create message element
const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);

  const messageContent = document.createElement("div");
  messageContent.classList.add("message-content");

  const textDiv = document.createElement("div");
  textDiv.classList.add("text");
  
  if (classes.includes("outgoing")) {
      textDiv.innerText = content; 
  } else {
      textDiv.innerHTML = typeof marked !== 'undefined' ? marked.parse(content) : content;
  }

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

// Create loading element
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
  `;
  messageContent.appendChild(iconContainer);

  div.appendChild(messageContent);
  return div;
}

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

// Show creator modal
const showCreatorModal = () => {
  const modalContent = `
    <div class="modal-content">
      <p class="modal-text"><strong>About the Creator</strong></p>
      <p class="modal-text">Drift - AI Chat Assistant was created by Tabib Imran, a passionate developer dedicated to building innovative and user-friendly applications. With a focus on leveraging AI to enhance user experiences, Tabib aims to make technology accessible and engaging for everyone.</p>
      <div class="modal-buttons">
        <button class="modal-cancel">Close</button>
      </div>
    </div>
  `;

  showCustomModal(modalContent, () => {}, { skipDefaultButtons: true });

  setTimeout(() => {
    const modal = document.querySelector(".custom-modal");
    if (modal) {
      const closeButton = modal.querySelector(".modal-cancel");
      const overlay = document.querySelector(".modal-overlay");

      closeButton.addEventListener("click", () => {
        overlay.remove();
      });
    }
  }, 0);
};

// Typing Effect
const showTypingEffect = (text, textElement, incomingMessageDiv) => {
  const words = text.split(' ');
  let currentWordIndex = 0;
  let accumulatedText = ""; 

  typingInterval = setInterval(() => {
    const isAtBottom = (chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight) < 50;

    accumulatedText += (currentWordIndex === 0 ? '' : ' ') + words[currentWordIndex++];
    
    if (typeof marked !== 'undefined') {
        let parsed = marked.parse(accumulatedText);
        parsed = parsed.replace(/<table>/g, '<div class="table-wrapper"><div class="table-container"><table>');
        parsed = parsed.replace(/<\/table>/g, '</table></div></div>');
        textElement.innerHTML = parsed;
    } else {
        textElement.innerText = accumulatedText;
    }

    incomingMessageDiv.querySelectorAll(".icon:not(.stop)").forEach(icon => icon.classList.add("hide"));

    saveChatsToLocalStorage();

    if (currentWordIndex === words.length) {
      clearInterval(typingInterval);
      typingInterval = null;
      isResponseGenerating = false;
      sendMessageButton.innerText = "arrow_upward"; 
      sendMessageButton.removeAttribute("data-state"); 
      updateSendButtonVisibility();
      
      incomingMessageDiv.querySelectorAll(".icon-container .icon").forEach(icon => {
        icon.classList.remove("hide");
        icon.style.visibility = 'visible'; 
      });
      
      const stopButton = incomingMessageDiv.querySelector(".stop");
      if (stopButton) {
        stopButton.classList.add("hide");
        stopButton.style.visibility = 'hidden';
      }
      
      // APPLY SYNTAX HIGHLIGHTING HERE (Once typing finishes)
      // This is the safest place to apply colors without breaking HTML
      if (typeof hljs !== 'undefined') {
        textElement.querySelectorAll('pre code').forEach((block) => {
           hljs.highlightElement(block);
        });
      }

      saveChatsToLocalStorage();
    }
    
    if (isAtBottom) {
        chatContainer.scrollTo(0, chatContainer.scrollHeight);
    }
  }, 30); 
};

// Stop typing
const stopTyping = (incomingMessageDiv) => {
  if (typingInterval) {
    clearInterval(typingInterval);
    typingInterval = null;
    isResponseGenerating = false;
    userMessage = null; 
    sendMessageButton.innerText = "arrow_upward"; 
    sendMessageButton.removeAttribute("data-state"); 
    updateSendButtonVisibility();
    if (incomingMessageDiv) {
      incomingMessageDiv.classList.remove("loading");
      incomingMessageDiv.querySelectorAll(".icon-container .icon").forEach(icon => {
        icon.classList.remove("hide");
        icon.style.visibility = 'visible'; 
      });
      const stopButton = incomingMessageDiv.querySelector(".stop");
      if (stopButton) {
        stopButton.classList.add("hide");
        stopButton.style.visibility = 'hidden';
      }
      
      const textElement = incomingMessageDiv.querySelector(".text");
      if (!textElement.innerText.trim()) {
        textElement.innerText = "Typing stopped.";
      }
      
      // Also apply highlights if stopped manually
       if (typeof hljs !== 'undefined') {
        textElement.querySelectorAll('pre code').forEach((block) => {
           hljs.highlightElement(block);
        });
      }
    }
    saveChatsToLocalStorage();
  }
};

const getCurrentDateTimeContext = () => {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit', 
        timeZoneName: 'short' 
    };
    const dateString = now.toLocaleDateString('en-US', options);
    
    return `You are a helpful AI assistant. The current date and time is ${dateString}. IMPORTANT: When providing code snippets (HTML, CSS, JS, Python, etc.), ALWAYS use Markdown code blocks with the language specified (e.g., \`\`\`python ... \`\`\`).`;
};

const getConversationHistory = () => {
    const messages = chatContainer.querySelectorAll(".message:not(.loading):not(.error)");
    const history = [];

    messages.forEach(message => {
        const role = message.classList.contains("outgoing") ? "user" : "model";
        const text = message.querySelector(".text").innerText.trim();

        if (text) {
            history.push({
                role: role,
                parts: [{ text: text }]
            });
        }
    });

    return history;
};

const generateAPIResponse = async (incomingMessageDiv) => {
  const textElement = incomingMessageDiv.querySelector(".text");
  
  const conversationHistory = getConversationHistory(); 
  const systemContext = getCurrentDateTimeContext();

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        contents: conversationHistory, 
        systemInstruction: {
            parts: [{ text: systemContext }]
        },
        tools: [{ "google_search": {} }]
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error.message);

    const apiResponse = data?.candidates[0].content.parts[0].text;
    
    incomingMessageDiv.querySelector(".loading-indicator")?.remove();
    showTypingEffect(apiResponse, textElement, incomingMessageDiv);
  } catch (error) {
    isResponseGenerating = false;
    userMessage = null;
    sendMessageButton.innerText = "arrow_upward";
    sendMessageButton.removeAttribute("data-state");
    updateSendButtonVisibility();
    textElement.innerText = error.message;
    incomingMessageDiv.querySelector(".loading-indicator")?.remove();
    incomingMessageDiv.classList.add("error");
    incomingMessageDiv.querySelectorAll(".icon").forEach(icon => {
      icon.classList.add("hide");
      icon.style.visibility = 'hidden';
    });
    saveChatsToLocalStorage();
  } finally {
    incomingMessageDiv.classList.remove("loading");
    pendingOutgoingMessage = null;
  }
};

const showLoadingAnimation = () => {
  const incomingMessageDiv = createLoadingMessageElement();
  chatContainer.appendChild(incomingMessageDiv);
  chatContainer.scrollTo(0, chatContainer.scrollHeight);
  sendMessageButton.innerText = "stop";
  sendMessageButton.setAttribute("data-state", "stop");
  updateSendButtonVisibility();
  generateAPIResponse(incomingMessageDiv);
  sendMessageButton.onclick = (e) => {
    e.preventDefault();
    if (sendMessageButton.disabled) return;
    if (isResponseGenerating) {
      stopTyping(incomingMessageDiv);
    } else {
      userMessage = typingInput.value.trim();
      handleOutgoingChat();
    }
  };
};

const copyMessage = (copyButton) => {
  const messageText = copyButton.closest(".message-content").querySelector(".text").innerText;
  
  const textarea = document.createElement("textarea");
  textarea.value = messageText;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);

  copyButton.innerText = "done";
  setTimeout(() => copyButton.innerText = "content_copy", 1000);
};

const speakMessage = (button) => {
  const messageText = button.closest(".message-content").querySelector(".text").innerText;
  
  if (button.innerText === "pause") {
    speechSynthesis.cancel();
    button.innerText = "volume_up";
    return;
  }

  const utterance = new SpeechSynthesisUtterance(messageText);
  utterance.lang = "en-US";
  speechSynthesis.speak(utterance);
  button.innerText = "pause";
  
  utterance.onend = () => {
    button.innerText = "volume_up";
  };
};

const editMessage = (editButton) => {
  const messageDiv = editButton.closest(".message");
  const textElement = messageDiv.querySelector(".text");
  const outgoingMessageDiv = messageDiv;
  const originalText = textElement.innerText;

  const modalContent = `
    <div class="modal-content">
      <p class="modal-text">Edit your message:</p>
      <textarea class="edit-input">${escapeHtml(originalText)}</textarea>
      <div class="modal-buttons">
        <button class="modal-cancel">Cancel</button>
        <button class="modal-confirm">Save</button>
      </div>
    </div>
  `;

  showCustomModal(modalContent, () => {
    const modal = document.querySelector(".custom-modal");
    const newText = modal.querySelector(".edit-input").value.trim();

    if (newText && !isResponseGenerating) {
      textElement.innerText = newText;
      let nextSibling = outgoingMessageDiv.nextElementSibling;
      if (nextSibling && nextSibling.classList.contains("incoming")) {
        nextSibling.remove();
      }
      userMessage = newText;
      isResponseGenerating = true;
      saveChatsToLocalStorage();
      setTimeout(showLoadingAnimation, 500);
    }
  }, { skipDefaultButtons: true });

  setTimeout(() => {
    const modal = document.querySelector(".custom-modal");
    if (modal) {
      const cancelButton = modal.querySelector(".modal-cancel");
      const confirmButton = modal.querySelector(".modal-confirm");
      const overlay = document.querySelector(".modal-overlay");

      cancelButton.addEventListener("click", () => {
        overlay.remove();
      });

      confirmButton.addEventListener("click", () => {
        const modal = document.querySelector(".custom-modal");
        const newText = modal.querySelector(".edit-input").value.trim();

        if (newText && !isResponseGenerating) {
          textElement.innerText = newText;
          let nextSibling = outgoingMessageDiv.nextElementSibling;
          if (nextSibling && nextSibling.classList.contains("incoming")) {
            nextSibling.remove();
          }
          userMessage = newText;
          isResponseGenerating = true;
          saveChatsToLocalStorage();
          setTimeout(showLoadingAnimation, 500);
        }
        overlay.remove();
      });
    }
  }, 0);
};

const showCustomModal = (message, onConfirm, options = {}) => {
  const { skipDefaultButtons = false } = options;

  const overlay = document.createElement("div");
  overlay.classList.add("modal-overlay");

  const modal = document.createElement("div");
  modal.classList.add("custom-modal");

  modal.innerHTML = skipDefaultButtons ? message : `
    <div class="modal-content">
      <p class="modal-text">${message}</p>
      <div class="modal-buttons">
        <button class="modal-cancel">Cancel</button>
        <button class="modal-confirm">Confirm</button>
      </div>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  if (!skipDefaultButtons) {
    const confirmButton = modal.querySelector(".modal-confirm");
    const cancelButton = modal.querySelector(".modal-cancel");

    confirmButton.addEventListener("click", () => {
      onConfirm();
      overlay.remove();
    });

    cancelButton.addEventListener("click", () => {
      overlay.remove();
    });
  }

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  });
};

const deleteMessage = (deleteButton) => {
  const messageDiv = deleteButton.closest(".message");
  const nextSibling = messageDiv.nextElementSibling;

  showCustomModal("Are you sure you want to delete this message?", () => {
    messageDiv.remove();
    if (nextSibling && nextSibling.classList.contains("incoming")) {
      nextSibling.remove();
    }
    saveChatsToLocalStorage();
    if (!chatContainer.children.length) {
      document.body.classList.remove("hide-header");
      localStorage.removeItem("saved-chats");
    }
  });
};

const updateSendButtonVisibility = () => {
  const hasText = typingInput.value.trim().length > 0;
  sendMessageButton.disabled = !hasText && !isResponseGenerating;
};

const handleOutgoingChat = () => {
  if (!userMessage || isResponseGenerating) return;

  isResponseGenerating = true;

  const outgoingMessageDiv = createMessageElement(userMessage, "outgoing");
  chatContainer.appendChild(outgoingMessageDiv);
  pendingOutgoingMessage = outgoingMessageDiv;
  typingForm.reset();
  document.body.classList.add("hide-header");
  chatContainer.scrollTo(0, chatContainer.scrollHeight);
  setTimeout(showLoadingAnimation, 500);
};

sendMessageButton.addEventListener("click", (e) => {
  e.preventDefault();
  if (sendMessageButton.disabled) return;
  if (isResponseGenerating) {
  } else {
    userMessage = typingInput.value.trim();
    handleOutgoingChat();
  }
});

toggleThemeButton.addEventListener("click", () => {
  const isLightMode = document.body.classList.toggle("light_mode");
  localStorage.setItem("themeColor", isLightMode ? "light_mode" : "dark_mode");
  toggleThemeButton.innerText = isLightMode ? "dark_mode" : "light_mode";
});

deleteChatButton.addEventListener("click", () => {
  showCustomModal("Are you sure you want to delete all the chats?", () => {
    localStorage.removeItem("saved-chats");
    loadDataFromLocalstorage();
  });
});

const bindSuggestionListeners = () => {
  const suggestions = document.querySelectorAll(".suggestion");
  suggestions.forEach(suggestion => {
    suggestion.addEventListener("click", () => {
      userMessage = suggestion.querySelector(".text").innerText;
      typingInput.value = userMessage;
      updateSendButtonVisibility();
      handleOutgoingChat();
    });
  });
};

document.addEventListener("DOMContentLoaded", () => {
  loadDataFromLocalstorage();
  setTimeout(bindSuggestionListeners, 100); 
});

typingForm.addEventListener("submit", (e) => {
  e.preventDefault();
});

typingInput.addEventListener("input", updateSendButtonVisibility);

sendMessageButton.disabled = true;

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