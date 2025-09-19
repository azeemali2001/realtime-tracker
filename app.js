// app.js
const express = require('express');
const path = require('path');
const http = require('http');
const socketio = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  pingTimeout: 30000
});

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

// Rate limiter per socket
const MIN_SEND_INTERVAL_MS = 500;

io.on('connection', (socket) => {
  console.log('CONNECTED', socket.id, 'from', socket.handshake.address);

  // Ask the client for a name
  socket.on('set-name', (name) => {
    socket.meta = {
      createdAt: Date.now(),
      lastSent: 0,
      color: randomColorFromId(socket.id),
      shortId: socket.id.slice(0, 6),
      name: name || "Guest"
    };
  });

  // receive location from a client
  socket.on('send-location', (data) => {
    const now = Date.now();

    if (!socket.meta) return; // name not set yet

    // rate limit per-socket
    if (now - socket.meta.lastSent < MIN_SEND_INTERVAL_MS) return;
    socket.meta.lastSent = now;

    // validation
    if (!data || typeof data.latitude !== 'number' || typeof data.longitude !== 'number') return;
    const lat = Number(data.latitude);
    const lon = Number(data.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lon)) return;
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return;

    // Broadcast normalized packet
    const packet = {
      id: socket.id,
      shortId: socket.meta.shortId,
      color: socket.meta.color,
      latitude: lat,
      longitude: lon,
      ts: now,
      name: socket.meta.name
    };

    io.emit('receive-location', packet);
  });

  socket.on('disconnect', () => {
    console.log('DISCONNECTED', socket.id);
    io.emit('user-disconnect', { id: socket.id });
  });
});

app.get('/', (req, res) => {
  res.render('index');
});

// deterministic color from id
function randomColorFromId(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash << 5) - hash + id.charCodeAt(i);
  const r = (hash & 0xFF0000) >> 16;
  const g = (hash & 0x00FF00) >> 8;
  const b = hash & 0x0000FF;
  return `#${((r & 0xFF) << 16 | (g & 0xFF) << 8 | (b & 0xFF)).toString(16).padStart(6, '0')}`;
}

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
