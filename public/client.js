// Dynamic socket connection (Works automatically on Localhost and Render)
const socket = io();

const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');

// Handle Chat sending
window.addEventListener('keydown', (e) => {
  if (e.code === 'Enter') {
    if (document.activeElement === chatInput) {
      const msg = chatInput.value.trim();
      if (msg) {
        socket.emit('chatMessage', { text: msg });
      }
      chatInput.value = '';
      chatInput.blur();
    } else {
      chatInput.focus();
    }
  }
});

// Receive chat messages
socket.on('receiveMessage', (data) => {
  const msgEl = document.createElement('div');
  msgEl.innerHTML = `<strong style="color: #f59e0b;">${data.sender}:</strong> ${data.text}`;
  chatMessages.appendChild(msgEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;
});