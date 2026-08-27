# Weather Dashboard (Open-Meteo)

A simple weather dashboard (static frontend) that fetches data from Open-Meteo (no API key required). Features:
- Search city (geocoding via Open-Meteo)
- Current weather (temperature, wind, humidity)
- 7-day forecast
- Hourly temperature chart (next 24 hrs) using Chart.js

How to run
1. Download the files (index.html, style.css, app.js).
2. Open `index.html` in a modern browser (Chrome, Edge, Firefox).
   - No server is required for basic usage.
   - For local HTTP server (recommended for some browsers), you can run:
     - Python 3: `python -m http.server 8000`
     - Then open http://localhost:8000

Notes
- Uses Open-Meteo APIs:
  - Geocoding: https://geocoding-api.open-meteo.com/
  - Weather: https://api.open-meteo.com/
- No API key needed.
- Customize and extend: add units toggle (°C/°F), caching, local storage for recent searches, or integrate other APIs.
