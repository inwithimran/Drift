const typingForm = document.querySelector(".typing-form");
const chatContainer = document.querySelector(".chat-list");
const suggestions = document.querySelectorAll(".suggestion");
const toggleThemeButton = document.querySelector("#theme-toggle-button");
const deleteChatButton = document.querySelector("#delete-chat-button");
const sendMessageButton = document.querySelector("#send-message-button");
const typingInput = document.querySelector(".typing-input");
const goToBottomButton = document.querySelector("#go-to-bottom-button");

// State variables
let userMessage = null;
let isResponseGenerating = false;
let typingInterval = null; // Store typing interval for stopping

// API configuration
const API_KEY = "AIzaSyCu7KwRs1daR6lCx9PL8piOQl1TZUpfN80"; // Replace with your actual API key
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

// Load theme and chat data from local storage on page load
const loadDataFromLocalstorage = () => {
  const savedChats = localStorage.getItem("saved-chats");
  const isLightMode = (localStorage.getItem("themeColor") === "light_mode");

  document.body.classList.toggle("light_mode", isLightMode);
  toggleThemeButton.innerText = isLightMode ? "dark_mode" : "light_mode";
  chatContainer.innerHTML = savedChats || '';
  document.body.classList.toggle("hide-header", savedChats);
  chatContainer.scrollTo(0, chatContainer.scrollHeight);
  updateSendButtonVisibility();
  toggleGoToBottomButton();
  checkIconLoad();
}

// Create a new message element and return it
const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  if (classes.includes("outgoing")) {
    div.innerHTML = `
      <div class="message-content">
        <div class="text">${content.match(/<div class="message-content">\s*<div class="text">(.*?)<\/div>\s*<\/div>/)?.[1] || content}</div>
      </div>
      <div class="icon-container">
        <span onClick="editMessage(this)" class="icon material-symbols-rounded">edit</span>
        <span onClick="deleteMessage(this)" class="icon material-symbols-rounded">delete</span>
      </div>`;
  } else {
    div.innerHTML = content;
  }
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
  if (!fontLoaded) {
    goToBottomButton.classList.add("icon-fallback");
  }
  document.body.removeChild(testIcon);
};

// Show typing effect
const showTypingEffect = (text, textElement, incomingMessageDiv) => {
  const words = text.split(' ');
  let currentWordIndex = 0;

  typingInterval = setInterval(() => {
    textElement.innerText += (currentWordIndex === 0 ? '' : ' ') + words[currentWordIndex++];
    incomingMessageDiv.querySelector(".icon:not(.stop)").classList.add("hide");

    if (currentWordIndex === words.length) {
      clearInterval(typingInterval);
      typingInterval = null;
      isResponseGenerating = false;
      sendMessageButton.innerText = "arrow_upward"; // Reset to send icon
      sendMessageButton.removeAttribute("data-state"); // Remove pause state
      updateSendButtonVisibility();
      incomingMessageDiv.querySelectorAll(".icon").forEach(icon => icon.classList.remove("hide"));
      incomingMessageDiv.querySelector(".stop").classList.add("hide"); // Hide stop button when done
      localStorage.setItem("saved-chats", chatContainer.innerHTML);
    }
    chatContainer.scrollTo(0, chatContainer.scrollHeight);
    toggleGoToBottomButton();
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
      incomingMessageDiv.querySelector(".stop").classList.add("hide"); // Hide stop button
    }
    localStorage.setItem("saved-chats", chatContainer.innerHTML);
    toggleGoToBottomButton();
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
    textElement.insertAdjacentHTML("afterend", ``);
    showTypingEffect(apiResponse, textElement, incomingMessageDiv);
  } catch (error) {
    isResponseGenerating = false;
    userMessage = null; // Reset userMessage on error
    sendMessageButton.innerText = "arrow_upward"; // Reset to send icon
    sendMessageButton.removeAttribute("data-state"); // Remove pause state
    updateSendButtonVisibility();
    textElement.innerText = error.message;
    textElement.parentElement.closest(".message").classList.add("error");
    const incomingMessageDiv = document.querySelector(".message.incoming.error");
    if (incomingMessageDiv) {
      incomingMessageDiv.querySelectorAll(".icon").forEach(icon => icon.classList.add("hide"));
    }
  } finally {
    incomingMessageDiv.classList.remove("loading");
    localStorage.setItem("saved-chats", chatContainer.innerHTML);
    toggleGoToBottomButton();
  }
}

// Show loading message
const showLoadingAnimation = () => {
  const html = `<div class="message-content">
                  <p class="text"></p>
                  <div class="loading-indicator">
                    <div class="loading-bar"></div>
                    <div class="loading-bar"></div>
                    <div class="loading-bar"></div>
                  </div>
                  <div class="icon-container">
                    <span onClick="copyMessage(this)" class="icon material-symbols-rounded">content_copy</span>
                    <span onClick="speakMessage(this)" class="icon material-symbols-rounded">volume_up</span>
                    <span onClick="stopTyping(this)" class="icon material-symbols-rounded stop">stop</span>
                  </div>
                </div>`;

  const incomingMessageDiv = createMessageElement(html, "incoming", "loading");
  chatContainer.appendChild(incomingMessageDiv);
  chatContainer.scrollTo(0, chatContainer.scrollHeight);
  sendMessageButton.innerText = "pause"; // Change to pause icon
  sendMessageButton.setAttribute("data-state", "pause"); // Set pause state
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
  if (button.innerText === "volume_off") {
    speechSynthesis.cancel();
    button.innerText = "volume_up";
    return;
  }

  // Start new speech
  const utterance = new SpeechSynthesisUtterance(messageText);
  utterance.lang = "en-US";
  speechSynthesis.speak(utterance);
  button.innerText = "volume_off";
  
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
    textElement.innerHTML = currentText || textElement.dataset.originalText; // Restore original text if input is empty
    editInput.remove();
    messageContent.querySelector(".save-edit")?.remove();
    localStorage.setItem("saved-chats", chatContainer.innerHTML);
    toggleGoToBottomButton();
    return;
  }

  // Store original text for restoration
  const currentText = textElement.innerText;
  textElement.dataset.originalText = currentText;

  // Replace text with input and save button
  textElement.innerHTML = `
    <input type="text" class="edit-input" value="${currentText}" />
    <button class="save-edit">Save</button>
  `;

  const saveButton = messageContent.querySelector(".save-edit");
  saveButton.addEventListener("click", () => {
    const newText = messageContent.querySelector(".edit-input").value.trim();
    if (newText && !isResponseGenerating) {
      // Update the outgoing message
      textElement.innerHTML = newText;
      
      // Find and remove the next incoming message (if it exists)
      let nextSibling = outgoingMessageDiv.nextElementSibling;
      if (nextSibling && nextSibling.classList.contains("incoming")) {
        nextSibling.remove();
      }

      // Trigger new API response with edited message
      userMessage = newText;
      isResponseGenerating = true;
      localStorage.setItem("saved-chats", chatContainer.innerHTML);
      setTimeout(showLoadingAnimation, 500);
    }
    toggleGoToBottomButton();
  });
};

// Delete message
const deleteMessage = (deleteButton) => {
  if (confirm("Are you sure you want to delete this message?")) {
    const messageDiv = deleteButton.closest(".message");
    const nextSibling = messageDiv.nextElementSibling;

    // Remove the outgoing message
    messageDiv.remove();

    // If the next sibling exists and is an incoming message, remove it too
    if (nextSibling && nextSibling.classList.contains("incoming")) {
      nextSibling.remove();
    }

    // Update local storage
    localStorage.setItem("saved-chats", chatContainer.innerHTML);

    // Show header if no chats remain
    if (!chatContainer.children.length) {
      document.body.classList.remove("hide-header");
      localStorage.removeItem("saved-chats");
    }
    toggleGoToBottomButton();
  }
};

// Update send button visibility
const updateSendButtonVisibility = () => {
  const hasText = typingInput.value.trim().length > 0;
  // Disable button only if no text and not in pause state
  sendMessageButton.disabled = !hasText && !isResponseGenerating;
};

// Debounce function to limit scroll event frequency
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
};

// Function to toggle Go to Bottom button visibility
const toggleGoToBottomButton = () => {
  const isAtBottom = chatContainer.scrollHeight - chatContainer.scrollTop <= chatContainer.clientHeight + 1;
  goToBottomButton.classList.toggle("visible", !isAtBottom);
};

// Scroll to bottom when Go to Bottom button is clicked
goToBottomButton.addEventListener("click", () => {
  chatContainer.scrollTo({
    top: chatContainer.scrollHeight,
    behavior: "smooth"
  });
});

// Add scroll event listener with debounce to toggle button visibility
chatContainer.addEventListener("scroll", debounce(toggleGoToBottomButton, 100));

// Outgoing message handler
const handleOutgoingChat = () => {
  if (!userMessage || isResponseGenerating) return; // Prevent sending if userMessage is null or response is generating

  isResponseGenerating = true;

  const html = `<div class="message-content">
      <div class="text">${userMessage}</div>
  </div>`;

  const outgoingMessageDiv = createMessageElement(html, "outgoing");
  chatContainer.appendChild(outgoingMessageDiv);
  typingForm.reset();
  document.body.classList.add("hide-header");
  chatContainer.scrollTo(0, chatContainer.scrollHeight);
  toggleGoToBottomButton();
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
  if (confirm("Are you sure you want to delete all the chats?")) {
    localStorage.removeItem("saved-chats");
    loadDataFromLocalstorage();
  }
});

// Suggestion click handler
suggestions.forEach(suggestion => {
  suggestion.addEventListener("click", () => {
    userMessage = suggestion.querySelector(".text").innerText;
    typingInput.value = userMessage; // Set the input value to the suggestion text
    updateSendButtonVisibility();
    handleOutgoingChat();
  });
});

// Form submit handler
typingForm.addEventListener("submit", (e) => {
  e.preventDefault(); 
  if (!isResponseGenerating) {
    userMessage = typingInput.value.trim();
    handleOutgoingChat();
  }
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