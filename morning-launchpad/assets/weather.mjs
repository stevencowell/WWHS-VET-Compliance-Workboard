// Fixed town coordinates only. No browser location or workboard data is sent.
const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=-35.12&longitude=147.37&current=temperature_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Australia%2FSydney&forecast_days=1&timeformat=unixtime';
const REFRESH_MS = 30 * 60 * 1000;
const sydneyDay = value => new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit' }).format(value);
const number = value => typeof value === 'number' && Number.isFinite(value);

export function weatherCondition(code, isDay) {
  if (code === 0) return [isDay ? 'Clear skies' : 'Clear night', isDay ? '☀' : '☾'];
  if (code === 1) return ['Mostly clear', isDay ? '☀' : '☾'];
  if (code === 2) return ['Partly cloudy', '⛅'];
  if (code === 3) return ['Overcast', '☁'];
  if ([45, 48].includes(code)) return ['Fog', '☁'];
  if ([51, 53, 55, 56, 57].includes(code)) return ['Drizzle', '☂'];
  if ([61, 63, 65, 66, 67].includes(code)) return ['Rain', '☂'];
  if ([71, 73, 75, 77, 85, 86].includes(code)) return ['Snow', '❄'];
  if ([80, 81, 82].includes(code)) return ['Showers', '☂'];
  if ([95, 96, 99].includes(code)) return ['Thunderstorms', 'ϟ'];
  return ['Conditions unavailable', '–'];
}

export function readWeather(data, now = Date.now()) {
  const current = data?.current;
  const time = current?.time * 1000;
  if (!number(current?.temperature_2m) || !number(current?.time) ||
      now - time > 90 * 60 * 1000 || time - now > 15 * 60 * 1000) {
    throw new Error('Current weather is unavailable or out of date.');
  }
  const [condition, icon] = weatherCondition(current.weather_code, current.is_day === 1);
  const daily = data.daily;
  const index = daily?.time?.findIndex(value => number(value) && sydneyDay(value * 1000) === sydneyDay(now)) ?? -1;
  const high = daily?.temperature_2m_max?.[index];
  const low = daily?.temperature_2m_min?.[index];
  const rain = daily?.precipitation_probability_max?.[index];
  const forecast = [];
  if (number(high) && number(low)) forecast.push(`High ${Math.round(high)}° · Low ${Math.round(low)}°`);
  if (number(rain) && rain >= 0 && rain <= 100) forecast.push(`Rain ${Math.round(rain)}%`);
  return {
    temperature: `${Math.round(current.temperature_2m)}°C`, condition, icon,
    forecast: forecast.join(' · ') || 'Today’s forecast unavailable',
    updated: new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Sydney', hour: 'numeric', minute: '2-digit' }).format(time)
  };
}

if (globalThis.customElements && !customElements.get('launchpad-weather')) {
  class LaunchpadWeather extends HTMLElement {
    connectedCallback() {
      this.setAttribute('aria-label', 'Wagga Wagga weather');
      this.setAttribute('role', 'region');
      this.innerHTML = `<div class="weather-current"><span class="weather-icon" aria-hidden="true">☀</span><strong class="weather-temperature">—</strong><div class="weather-place"><strong>Wagga Wagga</strong><span class="weather-condition">Loading weather…</span></div></div><div class="weather-forecast" aria-live="polite"></div><div class="weather-footer"><span class="weather-updated"></span><a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Weather by Open-Meteo ↗</a></div>`;
      this.lastAttempt = 0;
      this.refresh = () => {
        if (!document.hidden && Date.now() - this.lastAttempt >= REFRESH_MS) this.load();
      };
      document.addEventListener('visibilitychange', this.refresh);
      this.timer = setInterval(this.refresh, REFRESH_MS);
      this.load();
    }

    disconnectedCallback() {
      clearInterval(this.timer);
      document.removeEventListener('visibilitychange', this.refresh);
      this.request?.abort();
    }

    async load() {
      this.lastAttempt = Date.now();
      const request = new AbortController();
      this.request?.abort();
      this.request = request;
      const timeout = setTimeout(() => request.abort(), 8000);
      try {
        const response = await fetch(WEATHER_URL, { signal: request.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
        if (!response.ok) throw new Error('Weather service unavailable.');
        const weather = readWeather(await response.json());
        if (!this.isConnected || this.request !== request) return;
        for (const key of ['temperature', 'condition', 'icon', 'forecast']) this.querySelector(`.weather-${key}`).textContent = weather[key];
        this.querySelector('.weather-updated').textContent = `As at ${weather.updated}`;
      } catch {
        if (!this.isConnected || this.request !== request) return;
        this.querySelector('.weather-temperature').textContent = '—';
        this.querySelector('.weather-icon').textContent = '☁';
        this.querySelector('.weather-condition').textContent = 'Weather unavailable';
        this.querySelector('.weather-forecast').textContent = 'Updates automatically when available.';
        this.querySelector('.weather-updated').textContent = '';
      } finally {
        clearTimeout(timeout);
      }
    }
  }
  customElements.define('launchpad-weather', LaunchpadWeather);
}
