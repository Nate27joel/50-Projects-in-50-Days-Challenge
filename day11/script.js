const API_BASE = "https://api.open-meteo.com/v1/forecast";
const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";

const els = {
  form: document.querySelector("#searchForm"),
  cityInput: document.querySelector("#cityInput"),
  status: document.querySelector("#status"),
  weatherContent: document.querySelector("#weatherContent"),
  cityName: document.querySelector("#cityName"),
  currentDate: document.querySelector("#currentDate"),
  currentIcon: document.querySelector("#currentIcon"),
  currentTemp: document.querySelector("#currentTemp"),
  degree: document.querySelector("#degree"),
  condition: document.querySelector("#condition"),
  feelsLike: document.querySelector("#feelsLike"),
  humidity: document.querySelector("#humidity"),
  wind: document.querySelector("#wind"),
  uv: document.querySelector("#uv"),
  forecastGrid: document.querySelector("#forecastGrid"),
  celsiusBtn: document.querySelector("#celsiusBtn"),
  fahrenheitBtn: document.querySelector("#fahrenheitBtn"),
  locationBtn: document.querySelector("#locationBtn")
};

let unit = "celsius";
let latestWeather = null;
let latestPlace = null;

const weatherCodes = {
  0: ["Clear sky", "☀️"], 1: ["Mainly clear", "🌤️"], 2: ["Partly cloudy", "⛅"],
  3: ["Overcast", "☁️"], 45: ["Fog", "🌫️"], 48: ["Rime fog", "🌫️"],
  51: ["Light drizzle", "🌦️"], 53: ["Drizzle", "🌦️"], 55: ["Heavy drizzle", "🌧️"],
  56: ["Freezing drizzle", "🌧️"], 57: ["Freezing drizzle", "🌧️"],
  61: ["Light rain", "🌦️"], 63: ["Rain", "🌧️"], 65: ["Heavy rain", "🌧️"],
  66: ["Freezing rain", "🌧️"], 67: ["Freezing rain", "🌧️"],
  71: ["Light snow", "🌨️"], 73: ["Snow", "🌨️"], 75: ["Heavy snow", "❄️"], 77: ["Snow grains", "🌨️"],
  80: ["Rain showers", "🌦️"], 81: ["Rain showers", "🌧️"], 82: ["Heavy showers", "⛈️"],
  85: ["Snow showers", "🌨️"], 86: ["Heavy snow showers", "❄️"],
  95: ["Thunderstorm", "⛈️"], 96: ["Thunderstorm with hail", "⛈️"], 99: ["Thunderstorm with hail", "⛈️"]
};

function weatherInfo(code) {
  return weatherCodes[code] || ["Weather unavailable", "🌡️"];
}

function showStatus(message, isError = false) {
  els.status.textContent = message;
  els.status.classList.toggle("error", isError);
}

function displayTemp(celsius) {
  const value = unit === "celsius" ? celsius : (celsius * 9 / 5) + 32;
  return Math.round(value);
}

function formatDay(dateString, options = { weekday: "short" }) {
  return new Date(`${dateString}T12:00:00`).toLocaleDateString(undefined, options);
}

async function findCity(city) {
  const response = await fetch(`${GEOCODE_URL}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
  if (!response.ok) throw new Error("Could not search for that city. Try again.");
  const data = await response.json();
  if (!data.results?.length) throw new Error("City not found. Check the spelling and try again.");
  return data.results[0];
}

async function fetchWeather(place) {
  const params = new URLSearchParams({
    latitude: place.latitude,
    longitude: place.longitude,
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,uv_index_max",
    timezone: "auto",
    forecast_days: "5",
    temperature_unit: "celsius",
    wind_speed_unit: "kmh"
  });
  const response = await fetch(`${API_BASE}?${params}`);
  if (!response.ok) throw new Error("Weather data is unavailable right now. Please try again.");
  return response.json();
}

function renderForecast(daily) {
  els.forecastGrid.innerHTML = "";
  daily.time.forEach((date, index) => {
    const [description, icon] = weatherInfo(daily.weather_code[index]);
    const card = document.createElement("article");
    card.className = "forecast-day";
    card.innerHTML = `
      <p class="day-name">${index === 0 ? "Today" : formatDay(date)}</p>
      <div class="day-icon" aria-hidden="true">${icon}</div>
      <p class="day-condition">${description}</p>
      <div class="day-temps"><span>${displayTemp(daily.temperature_2m_max[index])}°</span><span class="low">${displayTemp(daily.temperature_2m_min[index])}°</span></div>`;
    els.forecastGrid.appendChild(card);
  });
}

function renderWeather(place, data) {
  latestPlace = place;
  latestWeather = data;
  const current = data.current;
  const [description, icon] = weatherInfo(current.weather_code);
  els.cityName.textContent = [place.name, place.admin1, place.country].filter((part, index, arr) => part && arr.indexOf(part) === index).join(", ");
  els.currentDate.textContent = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  els.currentIcon.textContent = icon;
  els.currentTemp.textContent = displayTemp(current.temperature_2m);
  els.degree.textContent = unit === "celsius" ? "°C" : "°F";
  els.condition.textContent = description;
  els.feelsLike.textContent = `${displayTemp(current.apparent_temperature)}°${unit === "celsius" ? "C" : "F"}`;
  els.humidity.textContent = `${current.relative_humidity_2m}%`;
  els.wind.textContent = `${Math.round(current.wind_speed_10m)} km/h`;
  els.uv.textContent = data.daily.uv_index_max?.[0] ?? "—";
  renderForecast(data.daily);
  els.weatherContent.hidden = false;
  showStatus(`Updated just now · Local time ${current.time.replace("T", " ")}`);
}

async function loadCity(city) {
  if (!city.trim()) {
    showStatus("Please enter a city name first.", true);
    els.cityInput.focus();
    return;
  }
  showStatus(`Finding weather for ${city.trim()}…`);
  try {
    const place = await findCity(city.trim());
    const weather = await fetchWeather(place);
    renderWeather(place, weather);
  } catch (error) {
    showStatus(error.message || "Something went wrong. Please try again.", true);
  }
}

els.form.addEventListener("submit", event => {
  event.preventDefault();
  loadCity(els.cityInput.value);
});

function setUnit(nextUnit) {
  unit = nextUnit;
  els.celsiusBtn.classList.toggle("active", unit === "celsius");
  els.fahrenheitBtn.classList.toggle("active", unit === "fahrenheit");
  if (latestWeather && latestPlace) renderWeather(latestPlace, latestWeather);
}

els.celsiusBtn.addEventListener("click", () => setUnit("celsius"));
els.fahrenheitBtn.addEventListener("click", () => setUnit("fahrenheit"));

els.locationBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    showStatus("Geolocation is not supported by this browser.", true);
    return;
  }
  showStatus("Getting your location…");
  navigator.geolocation.getCurrentPosition(async position => {
    try {
      const place = {
        name: "Your location",
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
      const weather = await fetchWeather(place);
      renderWeather(place, weather);
    } catch (error) {
      showStatus(error.message || "Could not load local weather.", true);
    }
  }, () => showStatus("Location access was blocked. Search for a city instead.", true), {
    enableHighAccuracy: false, timeout: 10000
  });
});

// Load a useful default forecast when the page opens.
loadCity("Lagos");
