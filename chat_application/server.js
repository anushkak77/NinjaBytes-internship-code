const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// In-memory storage for user data and messages
const users = new Map();
const messages = [];

wss.on('connection', (ws) => {
  // Handle new user connection
  ws.on('message', (message) => {
    const parsedMessage = JSON.parse(message);

    if (parsedMessage.type === 'join') {
      // Register new user
      const { username } = parsedMessage;
      users.set(username, ws);

      // Send existing messages to the new user
      messages.forEach((msg) => ws.send(JSON.stringify(msg)));

      // Notify other users about the new user
      broadcast({
        type: 'info',
        content: `${username} has joined the chat.`,
      });
    } else if (parsedMessage.type === 'message') {
      // Broadcast the message to the appropriate user
      const { from, to, content } = parsedMessage;
      const targetUser = users.get(to);

      if (targetUser) {
        // Send the message to the target user
        targetUser.send(JSON.stringify({ type: 'message', from, content }));
      } else {
        // Notify the sender that the target user is not available
        ws.send(
          JSON.stringify({
            type: 'info',
            content: `${to} is not available or does not exist.`,
          })
        );
      }
    }
  });

  // Handle user disconnection
  ws.on('close', () => {
    const disconnectedUser = [...users.entries()].find(([key, value]) => value === ws);

    if (disconnectedUser) {
      users.delete(disconnectedUser[0]);
      broadcast({
        type: 'info',
        content: `${disconnectedUser[0]} has left the chat.`,
      });
    }
  });
});

function broadcast(message) {
  // Broadcast the message to all connected clients
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

app.use(express.static('public'));

server.listen(3000, () => {
  console.log('Server is listening on port 3000');
});
