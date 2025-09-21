# Real-Time Location Tracker

**Real-time location tracking web app** using Node.js, Express, Socket.IO and Leaflet.js.  
Users can see their own location on a map and track other connected users in real time. Clicking a marker shows the user's name. The app also shows notifications when new users join and when users move.

---

## Demo
> Deploy the app to a hosting provider with HTTPS (Render, Vercel, Netlify, etc.) to enable browser notifications.

---

## Features
- Real-time location updates using Socket.IO.
- Interactive map display using Leaflet.
- User name prompt on first visit.
- Markers for each connected user with name shown on click.
- Browser notifications when a new user joins or when a user moves.
- In-page (toast) notifications as fallback (useful for local testing).
- Simple deterministic color per user for marker customization.

---

## Tech stack
- Node.js + Express
- Socket.IO
- Leaflet.js
- EJS (view engine)
- HTML/CSS/Vanilla JS

---

## Local setup

### Prerequisites
- Node.js (v14+ recommended)
- npm or yarn
- Git

### Install & run
```bash
# clone repo
git clone https://github.com/azeemali2001/realtime-tracker.git
cd realtime-tracker

# install dependencies
npm install

# run locally
npm start
# or if start script not set:
# node app.js
