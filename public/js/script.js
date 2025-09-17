// public/js/script.js
const socket = io();

// Map setup: start centered somewhere (0,0), zoom very close
const map = L.map('map').setView([0, 0], 16); // 16 = street level zoom
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// store markers by socket id
const markers = {};
let myShortId = null;
let myColor = '#000000';

// Throttle sending location to server
const SEND_INTERVAL_MS = 1000; 
let lastSent = 0;

// Custom icon template
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

// When server sends location packets
socket.on('receive-location', (pkt) => {
  if (!pkt || !pkt.id) return;
  const { id, shortId, color, latitude, longitude } = pkt;

  if (id === socket.id) {
    myShortId = shortId;
    myColor = color;
  }

  const latlng = [latitude, longitude];

  if (markers[id]) {
    markers[id].setLatLng(latlng);
  } else {
    const marker = L.marker(latlng, { icon: createIcon(color || '#3388ff') }).addTo(map);
    marker.bindPopup(`<b>${shortId || id}</b>`);
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

// Handle geolocation and send to server
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

      // Show own marker immediately
      const myId = socket.id || 'me';
      const shortId = myShortId || myId.slice(0, 6);
      const color = myColor || '#000000';

      const latlng = [latitude, longitude];
      if (markers[myId]) {
        markers[myId].setLatLng(latlng);
      } else {
        const marker = L.marker(latlng, { icon: createIcon(color) }).addTo(map);
        marker.bindPopup(`<b>You (${shortId})</b>`);
        markers[myId] = marker;

        // Center and zoom the map very close to your location
        if (!map._hasCenteredOnce) {
          map.setView(latlng, 18); // 18 = very close/street level
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
