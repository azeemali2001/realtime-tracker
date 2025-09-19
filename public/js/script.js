// public/js/script.js
const socket = io();

// Ask for name
let myName = prompt("Enter your name:", "Guest") || "Guest";
socket.emit('set-name', myName);

// Map setup
const map = L.map('map').setView([0, 0], 16);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Store markers
const markers = {};
let myShortId = null;
let myColor = '#000000';

// Throttle sending location
const SEND_INTERVAL_MS = 1000;
let lastSent = 0;

// Custom icon
const createIcon = (color) => {
  return L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -35]
  });
};

socket.on('connect', () => {
  console.log('socket id:', socket.id);
});

// Receive location
socket.on('receive-location', (pkt) => {
  if (!pkt || !pkt.id) return;
  const { id, shortId, color, latitude, longitude, name } = pkt;

  if (id === socket.id) {
    myShortId = shortId;
    myColor = color;
  }

  const latlng = [latitude, longitude];

  if (markers[id]) {
    markers[id].setLatLng(latlng);
    markers[id].bindPopup(`<b>${name || shortId || id}</b>`);
  } else {
    const marker = L.marker(latlng, { icon: createIcon(color || '#3388ff') }).addTo(map);
    marker.bindPopup(`<b>${name || shortId || id}</b>`);
    markers[id] = marker;
  }
});

// Remove marker on disconnect
socket.on('user-disconnect', (obj) => {
  const id = (typeof obj === 'object' && obj.id) ? obj.id : obj;
  if (!id) return;
  if (markers[id]) {
    map.removeLayer(markers[id]);
    delete markers[id];
  }
});

// Geolocation
if (navigator.geolocation) {
  navigator.geolocation.watchPosition(
    (position) => {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      const now = Date.now();
      if (now - lastSent >= SEND_INTERVAL_MS) {
        lastSent = now;
        socket.emit('send-location', { latitude: Number(latitude), longitude: Number(longitude) });
      }

      const myId = socket.id || 'me';
      const shortId = myShortId || myId.slice(0, 6);
      const color = myColor || '#000000';

      const latlng = [latitude, longitude];
      if (markers[myId]) {
        markers[myId].setLatLng(latlng);
        markers[myId].bindPopup(`<b>You (${myName})</b>`);
      } else {
        const marker = L.marker(latlng, { icon: createIcon(color) }).addTo(map);
        marker.bindPopup(`<b>You (${myName})</b>`);
        markers[myId] = marker;

        if (!map._hasCenteredOnce) {
          map.setView(latlng, 18);
          map._hasCenteredOnce = true;
        }
      }
    },
    (err) => {
      console.error('geolocation error', err);
    },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
  );
} else {
  console.error('Geolocation not supported in this browser.');
}
