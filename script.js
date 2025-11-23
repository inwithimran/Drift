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
const API_KEY = "AIzaSyC0179Ov6tOnoTQtpSByRtB1DH_2AMpQWc"; // Replace with your actual API key
// UPDATED MODEL: Switched from gemini-2.0-flash to the stronger gemini-2.5-flash-preview-09-2025
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${API_KEY}`;

// Function to escape HTML special characters
const escapeHtml = (text) => {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Save chats to local storage, excluding error messages and their preceding outgoing messages
const saveChatsToLocalStorage = () => {
  const messages = chatContainer.querySelectorAll(".message");
  const filteredMessages = [];
  let skipNextOutgoing = false;

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.classList.contains("error")) {
      // Skip error message and set flag to skip the preceding outgoing message
      skipNextOutgoing = true;
      continue;
    }

    if (skipNextOutgoing && msg.classList.contains("outgoing")) {
      // Skip the outgoing message before an error
      skipNextOutgoing = false;
      continue;
    }

    filteredMessages.push(msg);
  }

  // Reverse the filtered messages to maintain original order
  const filteredHTML = filteredMessages.reverse().map(msg => msg.outerHTML).join('');
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
  
  // চেক করা হচ্ছে এটি আউটগোইং (ইউজার) মেসেজ কিনা।
  // ইউজার মেসেজ প্লেইন টেক্সট রাখা নিরাপদ, আর ইনকামিং মেসেজ আমরা showTypingEffect এ হ্যান্ডেল করব।
  if (classes.includes("outgoing")) {
      textDiv.innerText = content; 
  } else {
      // ইনকামিং মেসেজের জন্য প্রাথমিক অবস্থায় খালি রাখা বা লোডিং টেক্সট দেওয়া যেতে পারে
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

  // Add event listener for the close button
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

// Show typing effect (UPDATED FOR MARKDOWN & SMART SCROLL)
const showTypingEffect = (text, textElement, incomingMessageDiv) => {
  const words = text.split(' ');
  let currentWordIndex = 0;
  let accumulatedText = ""; // পুরো টেক্সট জমা রাখার জন্য ভেরিয়েবল

  typingInterval = setInterval(() => {
    // SMART SCROLL LOGIC START:
    // নতুন টেক্সট যোগ করার আগে চেক করুন ইউজার কি বর্তমানে চ্যাটের একদম নিচে আছেন কিনা?
    // 100px বাফার রাখা হয়েছে যাতে ছোটখাটো পার্থক্যের কারণে সমস্যা না হয়।
    const isAtBottom = (chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight) < 20;

    // প্রতিবার একটি করে শব্দ যোগ করা হচ্ছে
    accumulatedText += (currentWordIndex === 0 ? '' : ' ') + words[currentWordIndex++];
    
    // Marked লাইব্রেরি ব্যবহার করে Markdown রেন্ডার করা হচ্ছে
    if (typeof marked !== 'undefined') {
        textElement.innerHTML = marked.parse(accumulatedText);
    } else {
        // যদি লাইব্রেরি না থাকে তবে সাধারণ টেক্সট হিসেবে দেখাবে
        textElement.innerText = accumulatedText;
    }

    incomingMessageDiv.querySelectorAll(".icon:not(.stop)").forEach(icon => icon.classList.add("hide"));

    // Save to local storage during typing
    saveChatsToLocalStorage();

    if (currentWordIndex === words.length) {
      clearInterval(typingInterval);
      typingInterval = null;
      isResponseGenerating = false;
      sendMessageButton.innerText = "arrow_upward"; // Reset to send icon
      sendMessageButton.removeAttribute("data-state"); // Remove pause state
      updateSendButtonVisibility();
      
      // Ensure all icons are visible after typing (no hover required)
      incomingMessageDiv.querySelectorAll(".icon-container .icon").forEach(icon => {
        icon.classList.remove("hide");
        icon.style.visibility = 'visible'; // Override CSS visibility: hidden
      });
      
      // Explicitly hide the stop button if present
      const stopButton = incomingMessageDiv.querySelector(".stop");
      if (stopButton) {
        stopButton.classList.add("hide");
        stopButton.style.visibility = 'hidden';
      }
      
      saveChatsToLocalStorage();
    }
    
    // SMART SCROLL LOGIC END:
    // শুধুমাত্র যদি ইউজার আগে থেকেই নিচে থাকেন (isAtBottom সত্য হয়), তবেই অটোমেটিক স্ক্রল করুন।
    // যদি তিনি উপরে স্ক্রল করে কিছু পড়ছেন, তবে তাকে ডিস্টার্ব করা হবে না।
    if (isAtBottom) {
        chatContainer.scrollTo(0, chatContainer.scrollHeight);
    }
  }, 60); // টাইপিং স্পিড
};

// Stop typing effect
const stopTyping = (incomingMessageDiv) => {
  if (typingInterval) {
    clearInterval(typingInterval);
    typingInterval = null;
    isResponseGenerating = false;
    userMessage = null; // Reset userMessage to prevent sending old text
    sendMessageButton.innerText = "arrow_upward"; // Reset to send icon
    sendMessageButton.removeAttribute("data-state"); // Remove pause state
    updateSendButtonVisibility();
    if (incomingMessageDiv) {
      incomingMessageDiv.classList.remove("loading");
      incomingMessageDiv.querySelectorAll(".icon-container .icon").forEach(icon => {
        icon.classList.remove("hide");
        icon.style.visibility = 'visible'; // Override CSS visibility: hidden
      });
      const stopButton = incomingMessageDiv.querySelector(".stop");
      if (stopButton) {
        stopButton.classList.add("hide");
        stopButton.style.visibility = 'hidden';
      }
      // Ensure the message has some text to avoid empty messages
      const textElement = incomingMessageDiv.querySelector(".text");
      if (!textElement.innerText.trim()) {
        textElement.innerText = "Typing stopped.";
      }
    }
    saveChatsToLocalStorage();
  }
};

// Function to get current date and time context
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
    
    return `You are a helpful AI assistant. The current date and time is ${dateString}. Use this information when answering questions about the present date or time.`;
};

// **NEW FUNCTION: সম্পূর্ণ কথোপকথনের ইতিহাস তৈরি করা হচ্ছে**
// এটি চ্যাট কনটেইনার থেকে সমস্ত বার্তা সংগ্রহ করে API-এর জন্য উপযুক্ত বিন্যাসে সাজিয়ে দেবে।
const getConversationHistory = () => {
    // শুধুমাত্র লোডিং বা ত্রুটিপূর্ণ বার্তাগুলি বাদ দিয়ে অন্যান্য বার্তাগুলি সংগ্রহ করা হচ্ছে
    const messages = chatContainer.querySelectorAll(".message:not(.loading):not(.error)");
    const history = [];

    messages.forEach(message => {
        // বার্তার ধরন অনুযায়ী role নির্ধারণ করা হচ্ছে
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

// API response fetch
const generateAPIResponse = async (incomingMessageDiv) => {
  const textElement = incomingMessageDiv.querySelector(".text");
  
  // সম্পূর্ণ কথোপকথনের ইতিহাস সংগ্রহ করা হচ্ছে
  const conversationHistory = getConversationHistory(); 
  
  // বর্তমান তারিখ ও সময় সহ সিস্টেম ইনস্ট্রাকশন তৈরি করা হচ্ছে
  const systemContext = getCurrentDateTimeContext();

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        // **গুরুত্বপূর্ণ পরিবর্তন: এখানে পুরো conversation history পাঠানো হচ্ছে**
        contents: conversationHistory, 
        
        // সিস্টেম ইনস্ট্রাকশন যোগ করা হচ্ছে, যাতে AI মডেল তার persona এবং বর্তমান তারিখ জানতে পারে
        systemInstruction: {
            parts: [{ text: systemContext }]
        },
        // Google Search Grounding Tool সক্রিয় করা হচ্ছে
        tools: [{ "google_search": {} }]
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error.message);

    // UPDATED: Removed the regex replace that was stripping markdown (**)
    // We want the raw markdown from the API so 'marked' can parse it
    const apiResponse = data?.candidates[0].content.parts[0].text;
    
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
    incomingMessageDiv.querySelectorAll(".icon").forEach(icon => {
      icon.classList.add("hide");
      icon.style.visibility = 'hidden';
    });
    saveChatsToLocalStorage(); // Save non-error messages, excluding preceding outgoing
  } finally {
    incomingMessageDiv.classList.remove("loading");
    pendingOutgoingMessage = null; // Clear pending message
  }
};

// Show loading message
const showLoadingAnimation = () => {
  const incomingMessageDiv = createLoadingMessageElement();
  chatContainer.appendChild(incomingMessageDiv);
  chatContainer.scrollTo(0, chatContainer.scrollHeight);
  sendMessageButton.innerText = "stop"; // Change to pause icon
  sendMessageButton.setAttribute("data-state", "stop"); // Set pause state
  updateSendButtonVisibility();
  generateAPIResponse(incomingMessageDiv);
  // Update send button click handler to pass incomingMessageDiv to stopTyping
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

// Copy to clipboard
const copyMessage = (copyButton) => {
  // innerText is used here, which is GOOD because it copies plain text without HTML tags
  const messageText = copyButton.closest(".message-content").querySelector(".text").innerText;
  navigator.clipboard.writeText(messageText);
  copyButton.innerText = "done";
  setTimeout(() => copyButton.innerText = "content_copy", 1000);
};

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
};

// Edit message using a modal
const editMessage = (editButton) => {
  const messageDiv = editButton.closest(".message");
  const textElement = messageDiv.querySelector(".text");
  const outgoingMessageDiv = messageDiv;
  const originalText = textElement.innerText;

  // Create modal content with textarea
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

  // Show custom modal without default buttons
  showCustomModal(modalContent, () => {
    const modal = document.querySelector(".custom-modal");
    const newText = modal.querySelector(".edit-input").value.trim();

    if (newText && !isResponseGenerating) {
      // Update the outgoing message
      textElement.innerText = newText;

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
  }, { skipDefaultButtons: true });

  // Add event listeners for custom buttons
  setTimeout(() => {
    const modal = document.querySelector(".custom-modal");
    if (modal) {
      const cancelButton = modal.querySelector(".modal-cancel");
      const confirmButton = modal.querySelector(".modal-confirm");
      const overlay = document.querySelector(".modal-overlay");

      // Cancel button: close the modal
      cancelButton.addEventListener("click", () => {
        overlay.remove();
      });

      // Save button: trigger onConfirm and close modal
      confirmButton.addEventListener("click", () => {
        const modal = document.querySelector(".custom-modal");
        const newText = modal.querySelector(".edit-input").value.trim();

        if (newText && !isResponseGenerating) {
          // Update the outgoing message
          textElement.innerText = newText;

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
        overlay.remove();
      });
    }
  }, 0);
};

// Show custom modal for confirmation
const showCustomModal = (message, onConfirm, options = {}) => {
  const { skipDefaultButtons = false } = options;

  // Create modal overlay
  const overlay = document.createElement("div");
  overlay.classList.add("modal-overlay");

  // Create modal
  const modal = document.createElement("div");
  modal.classList.add("custom-modal");

  // Modal content
  modal.innerHTML = skipDefaultButtons ? message : `
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

  // Event listeners for buttons (only if not skipped)
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
};

// Send/Pause button handler
sendMessageButton.addEventListener("click", (e) => {
  e.preventDefault();
  if (sendMessageButton.disabled) return; // Ignore if disabled
  if (isResponseGenerating) {
    // Note: The specific incomingMessageDiv is handled in showLoadingAnimation
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