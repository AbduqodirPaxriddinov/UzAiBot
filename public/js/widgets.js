// REAL-TIME WIDGETS MANAGER
document.addEventListener('DOMContentLoaded', () => {
  initClock();
  fetchWeather();
  fetchCurrency();
  fetchNews();

  document.getElementById('refreshCurrencyBtn')?.addEventListener('click', fetchCurrency);
});

function initClock() {
  const clockEl = document.getElementById('liveClock');
  const dateEl = document.getElementById('liveDate');

  function update() {
    const now = new Date();
    if (clockEl) clockEl.textContent = now.toLocaleTimeString('ru-RU');
    if (dateEl) dateEl.textContent = now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  update();
  setInterval(update, 1000);
}

async function fetchWeather() {
  try {
    const res = await fetch('/api/weather?city=Ташкент');
    const data = await res.json();

    const cityEl = document.getElementById('wCity');
    const tempEl = document.getElementById('wTemp');
    const condEl = document.getElementById('wCond');
    const humEl = document.getElementById('wHum');
    const windEl = document.getElementById('wWind');

    if (cityEl) cityEl.textContent = data.city;
    if (tempEl) tempEl.textContent = `+${data.temp}°C`;
    if (condEl) condEl.textContent = data.condition;
    if (humEl) humEl.textContent = data.humidity;
    if (windEl) windEl.textContent = data.wind;
  } catch (err) {
    console.error('Weather fetch error:', err);
  }
}

async function fetchCurrency() {
  try {
    const res = await fetch('/api/currency');
    const data = await res.json();

    const usdEl = document.getElementById('rateUsd');
    const eurEl = document.getElementById('rateEur');
    const rubEl = document.getElementById('rateRub');

    if (usdEl) usdEl.textContent = data.rates.UZS.toLocaleString('ru-RU') + ' UZS';
    if (eurEl) eurEl.textContent = data.rates.EUR ? (data.rates.UZS * 1.08).toLocaleString('ru-RU') + ' UZS' : '13 920 UZS';
    if (rubEl) rubEl.textContent = data.rates.RUB ? (data.rates.UZS / data.rates.RUB).toFixed(1) + ' UZS' : '140.5 UZS';
  } catch (err) {
    console.error('Currency fetch error:', err);
  }
}

async function fetchNews() {
  try {
    const res = await fetch('/api/news');
    const news = await res.json();
    const newsList = document.getElementById('newsList');
    if (newsList && Array.isArray(news)) {
      newsList.innerHTML = news.map(item => `
        <div class="news-item">
          <span class="news-cat">${item.category}</span>
          <p>${item.title}</p>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('News fetch error:', err);
  }
}
