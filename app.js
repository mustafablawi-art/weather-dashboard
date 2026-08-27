// Simple Weather Dashboard using Open-Meteo (no API key).
// Save as app.js and include as module in index.html

const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const messageEl = document.getElementById('message');

const currentCard = document.getElementById('current');
const forecastCard = document.getElementById('forecast');
const hourlyCard = document.getElementById('hourly');

const locationNameEl = document.getElementById('locationName');
const currentTimeEl = document.getElementById('currentTime');
const temperatureEl = document.getElementById('temperature');
const weatherTextEl = document.getElementById('weatherText');
const windEl = document.getElementById('wind');
const humidityEl = document.getElementById('humidity');
const pressureEl = document.getElementById('pressure');

const forecastGrid = document.getElementById('forecastGrid');
const hourlyCtx = document.getElementById('hourlyChart').getContext('2d');

let hourlyChart = null;

searchBtn.addEventListener('click', () => {
  const q = cityInput.value.trim();
  if (!q) {
    showMessage('Please enter a city name.');
    return;
  }
  lookupAndShow(q);
});

cityInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') searchBtn.click();
});

// Utility: show message
function showMessage(text, timeout = 3000) {
  messageEl.textContent = text;
  if (timeout) setTimeout(()=> { if (messageEl.textContent === text) messageEl.textContent = '' }, timeout);
}

// 1) Geocoding: get lat/lon for city
async function geocodeCity(name) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=5&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Geocoding request failed');
  const data = await res.json();
  if (!data.results || data.results.length === 0) return null;
  // return first result with essential fields
  return data.results.map(r => ({
    name: r.name,
    country: r.country,
    admin1: r.admin1,
    latitude: r.latitude,
    longitude: r.longitude,
    timezone: r.timezone
  }));
}

// 2) Fetch weather from Open-Meteo
async function fetchWeather(lat, lon, timezone='auto') {
  // request current + hourly + daily
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current_weather: 'true',
    hourly: 'temperature_2m,relativehumidity_2m',
    daily: 'temperature_2m_max,temperature_2m_min,weathercode',
    timezone: timezone
  });
  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Weather request failed');
  return res.json();
}

// Map Open-Meteo weathercode to description + emoji
function weatherCodeToText(code) {
  // simplified mapping
  const map = {
    0: ['Clear', '☀️'],
    1: ['Mainly clear', '🌤️'],
    2: ['Partly cloudy', '⛅'],
    3: ['Overcast', '☁️'],
    45: ['Fog', '🌫️'],
    48: ['Depositing rime fog', '🌫️'],
    51: ['Drizzle: Light', '🌦️'],
    53: ['Drizzle: Moderate', '🌦️'],
    55: ['Drizzle: Dense', '🌧️'],
    61: ['Rain: Slight', '🌧️'],
    63: ['Rain: Moderate', '🌧️'],
    65: ['Rain: Heavy', '🌧️'],
    71: ['Snow: Slight', '🌨️'],
    73: ['Snow: Moderate', '🌨️'],
    75: ['Snow: Heavy', '❄️'],
    80: ['Rain showers: Slight', '🌦️'],
    81: ['Rain showers: Moderate', '🌧️'],
    82: ['Rain showers: Violent', '⛈️'],
    95: ['Thunderstorm', '⛈️'],
    96: ['Thunderstorm with slight hail', '⛈️'],
    99: ['Thunderstorm with heavy hail', '⛈️']
  };
  return map[code] || ['Unknown',''];
}

// Render UI
function showCurrent(locationLabel, weather, humidity) {
  currentCard.classList.remove('hidden');
  locationNameEl.textContent = locationLabel;
  currentTimeEl.textContent = `As of ${new Date().toLocaleString()}`;
  const tempC = weather.temperature;
  temperatureEl.innerHTML = `${tempC.toFixed(1)}°C`;
  const [text, emoji] = weatherCodeToText(weather.weathercode);
  weatherTextEl.textContent = `${emoji} ${text}`;
  windEl.textContent = `${weather.windspeed} km/h (${weather.winddirection}°)`;
  humidityEl.textContent = humidity != null ? `${humidity}%` : '—';
  pressureEl.textContent = '—'; // Open-Meteo current endpoint does not include pressure by default
}

function renderForecast(daily) {
  forecastCard.classList.remove('hidden');
  forecastGrid.innerHTML = '';
  const days = daily.time;
  for (let i = 0; i < days.length; i++) {
    const date = days[i];
    const maxT = daily.temperature_2m_max[i];
    const minT = daily.temperature_2m_min[i];
    const wcode = daily.weathercode ? daily.weathercode[i] : 0;
    const [text, emoji] = weatherCodeToText(wcode);
    const el = document.createElement('div');
    el.className = 'forecast-day';
    el.innerHTML = `
      <div class="date">${new Date(date).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})}</div>
      <div class="icon" style="font-size:20px;margin:8px 0">${emoji}</div>
      <div class="temp">${maxT.toFixed(0)}° / ${minT.toFixed(0)}°</div>
      <div class="muted" style="font-size:12px">${text}</div>
    `;
    forecastGrid.appendChild(el);
  }
}

function renderHourlyChart(hourly) {
  hourlyCard.classList.remove('hidden');
  // build arrays for next 24 hours
  const times = hourly.time.slice(0, 48); // ensure we have at least 24, then pick next 24 from now
  const temps = hourly.temperature_2m.slice(0, 48);

  // Determine starting index near current time
  const nowISO = new Date().toISOString().slice(0,16); // yyyy-mm-ddTHH:MM
  // Find closest time index
  let startIndex = 0;
  for (let i = 0; i < times.length; i++) {
    if (times[i].slice(0,13) >= nowISO.slice(0,13)) { startIndex = i; break; }
  }
  const labels = times.slice(startIndex, startIndex + 24).map(t => {
    const d = new Date(t);
    return d.toLocaleTimeString(undefined, {hour: '2-digit', minute: '2-digit'});
  });
  const data = temps.slice(startIndex, startIndex + 24);

  if (hourlyChart) hourlyChart.destroy();
  hourlyChart = new Chart(hourlyCtx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Temperature (°C)',
        data,
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6,182,212,0.12)',
        fill: true,
        tension: 0.25,
        pointRadius: 2
      }]
    },
    options: {
      scales: {
        y: { beginAtZero: false }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

// Orchestration
async function lookupAndShow(query) {
  try {
    showMessage('Searching...', 0);
    currentCard.classList.add('hidden');
    forecastCard.classList.add('hidden');
    hourlyCard.classList.add('hidden');

    const geos = await geocodeCity(query);
    if (!geos || geos.length === 0) {
      showMessage('No matching location found.');
      return;
    }
    const loc = geos[0];
    const locationLabel = `${loc.name}${loc.admin1 ? ', '+loc.admin1 : ''}${loc.country ? ', '+loc.country : ''}`;

    const weatherResp = await fetchWeather(loc.latitude, loc.longitude, loc.timezone || 'auto');

    // current weather
    const current = weatherResp.current_weather;
    // humidity is inside hourly: find matching hour
    let humidity = null;
    if (weatherResp.hourly) {
      const idx = weatherResp.hourly.time.indexOf(current.time);
      if (idx !== -1 && weatherResp.hourly.relativehumidity_2m) humidity = weatherResp.hourly.relativehumidity_2m[idx];
    }

    showCurrent(locationLabel, current, humidity);
    if (weatherResp.daily) renderForecast(weatherResp.daily);
    if (weatherResp.hourly) renderHourlyChart(weatherResp.hourly);

    showMessage('', 0);
  } catch (err) {
    console.error(err);
    showMessage('Error: ' + (err.message || 'Failed to load weather'));
  }
}

// Optionally, run a demo search
lookupAndShow('Cairo');
