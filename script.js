const typingForm = document.querySelector(".typing-form");
const chatContainer = document.querySelector(".chat-list");
const suggestions = document.querySelectorAll(".suggestion");
const toggleThemeButton = document.querySelector("#theme-toggle-button");
const deleteChatButton = document.querySelector("#delete-chat-button");

// State variables
let userMessage = null;
let isResponseGenerating = false;

// API configuration
const API_KEY = ""; // Your API key here
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyCu7KwRs1daR6lCx9PL8piOQl1TZUpfN80`;

// Load theme and chat data from local storage on page load
const loadDataFromLocalstorage = () => {
  const savedChats = localStorage.getItem("saved-chats");
  const isLightMode = (localStorage.getItem("themeColor") === "light_mode");

  document.body.classList.toggle("light_mode", isLightMode);
  toggleThemeButton.innerText = isLightMode ? "dark_mode" : "light_mode";
  chatContainer.innerHTML = savedChats || '';
  document.body.classList.toggle("hide-header", savedChats);
  chatContainer.scrollTo(0, chatContainer.scrollHeight);
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

// Show typing effect
const showTypingEffect = (text, textElement, incomingMessageDiv) => {
  const words = text.split(' ');
  let currentWordIndex = 0;

  const typingInterval = setInterval(() => {
    textElement.innerText += (currentWordIndex === 0 ? '' : ' ') + words[currentWordIndex++];
    incomingMessageDiv.querySelector(".icon").classList.add("hide");

    if (currentWordIndex === words.length) {
      clearInterval(typingInterval);
      isResponseGenerating = false;
      incomingMessageDiv.querySelectorAll(".icon").forEach(icon => icon.classList.remove("hide"));
      localStorage.setItem("saved-chats", chatContainer.innerHTML);
    }
    chatContainer.scrollTo(0, chatContainer.scrollHeight);
  }, 75);
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
    textElement.innerText = error.message;
    textElement.parentElement.closest(".message").classList.add("error");
  } finally {
    incomingMessageDiv.classList.remove("loading");
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
                  </div>
                </div>`;

  const incomingMessageDiv = createMessageElement(html, "incoming", "loading");
  chatContainer.appendChild(incomingMessageDiv);
  chatContainer.scrollTo(0, chatContainer.scrollHeight);
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
  const utterance = new SpeechSynthesisUtterance(messageText);
  utterance.lang = "en-US";
  speechSynthesis.speak(utterance);
  button.innerText = "volume_off";
  utterance.onend = () => button.innerText = "volume_up";
}

// Edit message
const editMessage = (editButton) => {
  const messageContent = editButton.closest(".message").querySelector(".message-content");
  const textElement = messageContent.querySelector(".text");
  const outgoingMessageDiv = editButton.closest(".message");

  // Check if already in edit mode
  if (messageContent.querySelector(".edit-input")) {
    return; // If edit input already exists, do nothing
  }

  const currentText = textElement.innerText;

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
  }
};

// Outgoing message handler
const handleOutgoingChat = () => {
  userMessage = typingForm.querySelector(".typing-input").value.trim() || userMessage;
  if(!userMessage || isResponseGenerating) return;

  isResponseGenerating = true;

  const html = `<div class="message-content">
      <div class="text">${userMessage}</div>
  </div>`;

  const outgoingMessageDiv = createMessageElement(html, "outgoing");
  chatContainer.appendChild(outgoingMessageDiv);
  typingForm.reset();
  document.body.classList.add("hide-header");
  chatContainer.scrollTo(0, chatContainer.scrollHeight);
  setTimeout(showLoadingAnimation, 500);
}

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
    handleOutgoingChat();
  });
});

// Form submit handler
typingForm.addEventListener("submit", (e) => {
  e.preventDefault(); 
  handleOutgoingChat();
});

// Load saved data
loadDataFromLocalstorage();

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