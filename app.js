// app.js
const express = require('express');
const path = require('path');
const http = require('http');
const socketio = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  // optional socket.io config for production tuning
  pingTimeout: 30000,
  // pingInterval: 25000
});

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

// Simple per-socket rate limiter state (in-memory)
const MIN_SEND_INTERVAL_MS = 500; // allow send at most 2x/sec per socket

io.on('connection', (socket) => {
  console.log('CONNECTED', socket.id, 'from', socket.handshake.address);

  // attach metadata for convenience (color + shortId)
  socket.meta = {
    createdAt: Date.now(),
    lastSent: 0,
    color: randomColorFromId(socket.id),
    shortId: socket.id.slice(0, 6)
  };

  // receive location from a client
  socket.on('send-location', (data) => {
    const now = Date.now();

    // rate limit per-socket
    if (now - socket.meta.lastSent < MIN_SEND_INTERVAL_MS) {
      // ignore too-frequent messages (or you can emit an error back)
      return;
    }
    socket.meta.lastSent = now;

    // basic validation
    if (!data || typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
      return;
    }
    const lat = Number(data.latitude);
    const lon = Number(data.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lon)) return;
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return;

    // Broadcast to everyone (including sender) a normalized packet
    const packet = {
      id: socket.id,
      shortId: socket.meta.shortId,
      color: socket.meta.color,
      latitude: lat,
      longitude: lon,
      ts: now
    };

    // Use io.emit so sender also receives the canonical packet (keeps everyone in sync)
    io.emit('receive-location', packet);
  });

  socket.on('disconnect', () => {
    console.log('DISCONNECTED', socket.id);
    // notify everyone so clients can remove marker
    io.emit('user-disconnect', { id: socket.id });
  });
});

app.get('/', (req, res) => {
  res.render('index');
});


// small deterministic color generator from id
function randomColorFromId(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash << 5) - hash + id.charCodeAt(i);
  const r = (hash & 0xFF0000) >> 16;
  const g = (hash & 0x00FF00) >> 8;
  const b = hash & 0x0000FF;
  // convert to hex and ensure 2-digit
  return `#${((r & 0xFF) << 16 | (g & 0xFF) << 8 | (b & 0xFF)).toString(16).padStart(6, '0')}`;
}

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
