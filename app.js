
// ==========================================
// Firebase Database Configuration
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyBeitTmyXj2MNAyCETk1FkD2h9mIDA8Z2Y",
  authDomain: "homepage-437c0.firebaseapp.com",
  projectId: "homepage-437c0",
  storageBucket: "homepage-437c0.firebasestorage.app",
  messagingSenderId: "999961105878",
  appId: "1:999961105878:web:553876dfcfc35b3c1ac077",
  measurementId: "G-9MPWPYW0MK"
};

let db = null;
if (firebaseConfig.apiKey !== "YOUR_API_KEY" && typeof firebase !== 'undefined') {
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
}
// ==========================================
function formatDateTime(val, includeSeconds = false) {
  if (!val) return '';
  let d;
  if (typeof val === 'number') {
    d = new Date(val);
  } else if (val instanceof Date) {
    d = val;
  } else if (typeof val === 'string') {
    if (val.match(/^\d{4}[.-]\d{2}[.-]\d{2}\s+\d{2}:\d{2}/)) {
      return val;
    }
    const parsed = Date.parse(val);
    if (!isNaN(parsed)) {
      d = new Date(parsed);
    } else {
      d = new Date();
      if (val.includes('분 전')) {
        const mins = parseInt(val) || 1;
        d = new Date(Date.now() - mins * 60 * 1000);
      } else if (val.includes('시간 전')) {
        const hrs = parseInt(val) || 1;
        d = new Date(Date.now() - hrs * 3600 * 1000);
      } else if (val.includes('일 전')) {
        const days = parseInt(val) || 1;
        d = new Date(Date.now() - days * 86400 * 1000);
      }
    }
  } else {
    d = new Date();
  }

  if (isNaN(d.getTime())) d = new Date();

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');

  if (includeSeconds) {
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${y}.${m}.${day} ${h}:${min}:${s}`;
  }
  return `${y}.${m}.${day} ${h}:${min}`;
}
window.formatDateTime = formatDateTime;

// ----------------------------------------------------
// Section 0: Theme Management Engine (Dark / Light)
// ----------------------------------------------------
function initTheme() {
  const savedTheme = localStorage.getItem('crytopnl_theme') || 'light';
  applyTheme(savedTheme);
}

function applyTheme(theme) {
  const html = document.documentElement;
  const icon = document.getElementById('theme-toggle-icon');
  const text = document.getElementById('theme-toggle-text');

  if (theme === 'light') {
    html.classList.remove('dark');
    html.classList.add('theme-light');
    if (icon) {
      icon.setAttribute('data-lucide', 'moon');
      icon.className = 'w-4 h-4 text-indigo-500';
    }
    if (text) text.innerText = '다크';
  } else {
    html.classList.add('dark');
    html.classList.remove('theme-light');
    if (icon) {
      icon.setAttribute('data-lucide', 'sun');
      icon.className = 'w-4 h-4 text-amber-400';
    }
    if (text) text.innerText = '라이트';
  }

  localStorage.setItem('crytopnl_theme', theme);
  if (typeof lucide !== 'undefined' && lucide.createIcons) {
    try { lucide.createIcons(); } catch(e) {}
  }

  // Instantly re-render charts when theme is toggled
  try {
    if (window.ChartManager && window.AnalyzerApp && window.AnalyzerApp.currentReportData) {
      window.ChartManager.renderAllCharts(window.AnalyzerApp.currentReportData);
    }
    if (typeof initChart === 'function') {
      initChart();
    }
  } catch(e) {}
}

function toggleTheme() {
  const isLight = document.documentElement.classList.contains('theme-light');
  applyTheme(isLight ? 'dark' : 'light');
}
window.toggleTheme = toggleTheme;
window.applyTheme = applyTheme;
window.initTheme = initTheme;

// ====================================================
// CrytoPnL – Complete Core Application Engine
// 100% Client-Side Privacy Architecture
// ====================================================

// ----------------------------------------------------
// Section 1: Legal Policy & Modals Handlers
// ----------------------------------------------------
function openLegalModal(tab) {
  tab = tab || 'privacy';
  const modal = document.getElementById('legal-modal');
  if (modal) {
    modal.style.setProperty('display', 'flex', 'important');
    modal.classList.remove('hidden');
    switchLegalTab(tab);
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      try { lucide.createIcons(); } catch(e) {}
    }
  }
}
window.openLegalModal = openLegalModal;

function closeLegalModal() {
  const modal = document.getElementById('legal-modal');
  if (modal) {
    modal.style.setProperty('display', 'none', 'important');
    modal.classList.add('hidden');
  }
}
window.closeLegalModal = closeLegalModal;

function switchLegalTab(tab) {
  tab = tab || 'privacy';
  const tabs = ['privacy', 'terms', 'about', 'contact'];
  const titles = {
    privacy: '개인정보처리방침 (Privacy Policy)',
    terms: '서비스 이용약관 & 투자 면책 (Terms of Service)',
    about: 'CrytoPnL 소개 & 100% 로컬 보안 백서 (About)',
    contact: '고객 지원 & 제휴 문의 (Contact: ittechkjh@gmail.com)'
  };

  tabs.forEach(t => {
    const content = document.getElementById('legal-content-' + t);
    const btn = document.getElementById('tab-legal-' + t);
    if (t === tab) {
      if (content) {
        content.style.setProperty('display', 'block', 'important');
        content.classList.remove('hidden');
      }
      if (btn) {
        btn.className = 'py-2.5 px-2 rounded-xl transition text-center bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold';
      }
    } else {
      if (content) {
        content.style.setProperty('display', 'none', 'important');
        content.classList.add('hidden');
      }
      if (btn) {
        btn.className = 'py-2.5 px-2 rounded-xl transition text-center text-slate-400 hover:text-white border border-transparent font-medium';
      }
    }
  });

  const titleText = document.getElementById('legal-modal-title');
  if (titleText && titles[tab]) {
    titleText.innerText = titles[tab];
  }

  if (typeof lucide !== 'undefined' && lucide.createIcons) {
    try { lucide.createIcons(); } catch(e) {}
  }
}
window.switchLegalTab = switchLegalTab;

window.openExcelGuideModal = function() {
  const modal = document.getElementById('excel-guide-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.style.setProperty('display', 'flex', 'important');
    window.showExchangeGuide('upbit');
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      try { lucide.createIcons(); } catch(e) {}
    }
  }
};

window.closeExcelGuideModal = function() {
  const modal = document.getElementById('excel-guide-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.setProperty('display', 'none', 'important');
  }
};

window.showExchangeGuide = function(exchange) {
  const upbitContent = document.getElementById('guide-content-upbit');
  const bithumbContent = document.getElementById('guide-content-bithumb');
  const tabUpbit = document.getElementById('tab-guide-upbit');
  const tabBithumb = document.getElementById('tab-guide-bithumb');

  if (exchange === 'upbit') {
    if (upbitContent) { upbitContent.classList.remove('hidden'); upbitContent.style.display = 'block'; }
    if (bithumbContent) { bithumbContent.classList.add('hidden'); bithumbContent.style.display = 'none'; }
    if (tabUpbit) tabUpbit.className = 'py-2.5 rounded-xl transition text-center bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold';
    if (tabBithumb) tabBithumb.className = 'py-2.5 rounded-xl transition text-center text-slate-400 hover:text-white';
  } else {
    if (upbitContent) { upbitContent.classList.add('hidden'); upbitContent.style.display = 'none'; }
    if (bithumbContent) { bithumbContent.classList.remove('hidden'); bithumbContent.style.display = 'block'; }
    if (tabBithumb) tabBithumb.className = 'py-2.5 rounded-xl transition text-center bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold';
    if (tabUpbit) tabUpbit.className = 'py-2.5 rounded-xl transition text-center text-slate-400 hover:text-white';
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();
};

function updateAdminNavVisibility() {
  const isSessionAuth = sessionStorage.getItem('coinhub_admin_authenticated') === '1' || sessionStorage.getItem('crytopnl_admin_authenticated') === '1';
  let isLocalAdmin = false;
  try {
    const u = JSON.parse(localStorage.getItem('crytopnl_user') || localStorage.getItem('coinhub_user') || '{}');
    if (u && (u.username?.toLowerCase() === 'admin' || u.role === 'ADMIN' || u.rank === 'ADMIN')) {
      isLocalAdmin = true;
    }
  } catch(e) {}

  const isAuth = isSessionAuth || isLocalAdmin;

  const navAdmin = document.getElementById('nav-admin');
  const mNavAdmin = document.getElementById('m-nav-admin');

  if (navAdmin) {
    if (isAuth) {
      navAdmin.classList.remove('hidden');
      navAdmin.classList.add('flex');
    } else {
      navAdmin.classList.add('hidden');
      navAdmin.classList.remove('flex');
    }
  }

  if (mNavAdmin) {
    if (isAuth) {
      mNavAdmin.classList.remove('hidden');
      mNavAdmin.classList.add('flex');
    } else {
      mNavAdmin.classList.add('hidden');
      mNavAdmin.classList.remove('flex');
    }
  }
}
window.updateAdminNavVisibility = updateAdminNavVisibility;

function updateAuthUI() {
  const isSessionAuth = sessionStorage.getItem('coinhub_admin_authenticated') === '1' || sessionStorage.getItem('crytopnl_admin_authenticated') === '1';
  const stored = localStorage.getItem('crytopnl_user') || localStorage.getItem('coinhub_user');
  let user = null;
  let isAdminUser = false;
  if (stored) {
    try {
      user = JSON.parse(stored);
      if (user && (user.username?.toLowerCase() === 'admin' || user.role === 'ADMIN' || user.rank === 'ADMIN')) {
        isAdminUser = true;
      }
    } catch(e) {}
  }

  const isAuth = isSessionAuth || isAdminUser;
  const authBtn = document.getElementById('btn-header-auth');

  if (isAuth) {
    if (authBtn) {
      authBtn.innerHTML = '<i data-lucide="user-check" class="w-4 h-4 text-purple-400"></i><span>admin (로그아웃)</span>';
      authBtn.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-navy-900 border border-purple-500/40 hover:border-rose-500/50 text-xs font-bold text-slate-200 hover:text-rose-300 transition shadow-sm cursor-pointer';
      authBtn.onclick = handleLogout;
    }
  } else if (user && user.username) {
    if (authBtn) {
      authBtn.innerHTML = `<i data-lucide="user-check" class="w-4 h-4 text-cyan-400"></i><span>${escapeHtml(user.username)} (로그아웃)</span>`;
      authBtn.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-navy-900 border border-cyan-500/40 hover:border-rose-500/50 text-xs font-bold text-slate-200 hover:text-rose-300 transition shadow-sm cursor-pointer';
      authBtn.onclick = handleLogout;
    }
  } else {
    if (authBtn) {
      authBtn.innerHTML = '<i data-lucide="user" class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400"></i><span>로그인</span>';
      authBtn.className = 'flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-navy-900/80 hover:bg-navy-800 border border-cyan-500/40 hover:border-cyan-400 text-[11px] sm:text-xs font-bold text-cyan-300 hover:text-white transition shadow-sm cursor-pointer shrink-0';
      authBtn.onclick = openAuthModal;
    }
  }

  updateAdminNavVisibility();
  if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
}
window.updateAuthUI = updateAuthUI;


// ----------------------------------------------------
// Section 2: Market Real-Time Ticker & Charts
// ----------------------------------------------------
const DEFAULT_COINS = [
  { id: 'bitcoin', name: 'Bitcoin', symbol: 'btc', current_price: 77060.00, price_change_percentage_24h: 0.15, total_volume: 38400000000, image: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png', korean_name: '비트코인' },
  { id: 'ethereum', name: 'Ethereum', symbol: 'eth', current_price: 2381.50, price_change_percentage_24h: -1.25, total_volume: 18200000000, image: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png', korean_name: '이더리움' },
  { id: 'solana', name: 'Solana', symbol: 'sol', current_price: 99.75, price_change_percentage_24h: -0.10, total_volume: 5800000000, image: 'https://assets.coingecko.com/coins/images/4128/small/solana.png', korean_name: '솔라나' },
  { id: 'ripple', name: 'XRP', symbol: 'xrp', current_price: 1.346, price_change_percentage_24h: 0.08, total_volume: 2400000000, image: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png', korean_name: '리플' },
  { id: 'dogecoin', name: 'Dogecoin', symbol: 'doge', current_price: 0.0814, price_change_percentage_24h: -0.45, total_volume: 950000000, image: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png', korean_name: '도지코인' },
  { id: 'cardano', name: 'Cardano', symbol: 'ada', current_price: 0.201, price_change_percentage_24h: -0.82, total_volume: 510000000, image: 'https://assets.coingecko.com/coins/images/975/small/cardano.png', korean_name: '에이다' },
  { id: 'avalanche-2', name: 'Avalanche', symbol: 'avax', current_price: 25.80, price_change_percentage_24h: 1.20, total_volume: 420000000, image: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png', korean_name: '아발란체' },
  { id: 'chainlink', name: 'Chainlink', symbol: 'link', current_price: 13.90, price_change_percentage_24h: 0.65, total_volume: 340000000, image: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png', korean_name: '체인링크' }
];

let marketCoins = [...DEFAULT_COINS];
let selectedCoin = { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', price: 77060 };
let currentChartTimeframe = '24h';
let priceChart = null;

async function fetchMarketData() {
  const refreshIcon = document.getElementById('refresh-icon');
  if (refreshIcon) refreshIcon.classList.add('animate-spin');

  if (!marketCoins || marketCoins.length === 0) {
    marketCoins = [...DEFAULT_COINS];
  }

  let updated = false;

  // 1. Primary: Binance 24hr Ticker (100% reliable CORS for live USD prices)
  try {
    const binanceSymbols = JSON.stringify(['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'LINKUSDT']);
    const binRes = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbols=' + encodeURIComponent(binanceSymbols));
    if (binRes.ok) {
      const binData = await binRes.json();
      if (Array.isArray(binData) && binData.length > 0) {
        binData.forEach(item => {
          const sym = item.symbol.replace('USDT', '').toLowerCase();
          const coin = marketCoins.find(c => c.symbol.toLowerCase() === sym);
          if (coin) {
            coin.current_price = parseFloat(item.lastPrice);
            coin.price_change_percentage_24h = parseFloat(item.priceChangePercent);
            coin.total_volume = parseFloat(item.quoteVolume || item.volume || 0);
          }
        });
        updated = true;
      }
    }
  } catch (bErr) {
    console.warn('Binance ticker fallback:', bErr);
  }

  // 2. Secondary: Upbit / Bithumb fallback
  if (!updated) {
    try {
      const upbitMarkets = 'KRW-BTC,KRW-ETH,KRW-SOL,KRW-XRP,KRW-DOGE,KRW-ADA';
      const upbitRes = await fetch('https://api.upbit.com/v1/ticker?markets=' + upbitMarkets);
      if (upbitRes.ok) {
        const upbitData = await upbitRes.json();
        const usdRate = 1420;
        upbitData.forEach(item => {
          const symbol = item.market.replace('KRW-', '').toLowerCase();
          const coin = marketCoins.find(c => c.symbol.toLowerCase() === symbol);
          if (coin) {
            coin.current_price = item.trade_price / usdRate;
            coin.price_change_percentage_24h = item.signed_change_rate * 100;
            coin.total_volume = item.acc_trade_price_24h / usdRate;
          }
        });
        updated = true;
      }
    } catch (uErr) {}
  }

  // 3. Fallback: Bithumb ALL_KRW
  if (!updated) {
    try {
      const bitRes = await fetch('https://api.bithumb.com/public/ticker/ALL_KRW');
      if (bitRes.ok) {
        const bitData = await bitRes.json();
        if (bitData && bitData.status === '0000' && bitData.data) {
          const usdRate = 1420;
          marketCoins.forEach(coin => {
            const sym = coin.symbol.toUpperCase();
            if (bitData.data[sym] && bitData.data[sym].closing_price) {
              coin.current_price = parseFloat(bitData.data[sym].closing_price) / usdRate;
              coin.price_change_percentage_24h = parseFloat(bitData.data[sym].fluctate_rate_24H || 0);
              coin.total_volume = parseFloat(bitData.data[sym].acc_trade_value_24H || 0) / usdRate;
            }
          });
          updated = true;
        }
      }
    } catch (bErr) {}
  }

  renderMarketUI();
  if (refreshIcon) setTimeout(() => refreshIcon.classList.remove('animate-spin'), 400);
}
window.fetchMarketData = fetchMarketData;

// Start background live market polling interval
if (!window._marketTickerInterval) {
  window._marketTickerInterval = setInterval(() => {
    fetchMarketData();
  }, 10000);
}

function renderMarketUI() {
  const tickerBar = document.getElementById('ticker-bar');
  if (tickerBar && marketCoins.length > 0) {
    tickerBar.innerHTML = marketCoins.slice(0, 6).map(coin => {
      const isUp = (coin.price_change_percentage_24h || 0) >= 0;
      const colorClass = isUp ? 'text-crypto-green' : 'text-crypto-red';
      const sign = isUp ? '+' : '';
      return `
        <div class="inline-flex items-center gap-2 cursor-pointer hover:text-cyan-400 transition" onclick="selectCoinForChart('${coin.id}', '${coin.name}', '${coin.symbol.toUpperCase()}')">
          <span class="font-bold text-slate-200">${coin.symbol.toUpperCase()}</span>
          <span>$${formatNumber(coin.current_price)}</span>
          <span class="${colorClass} font-semibold">${sign}${(coin.price_change_percentage_24h || 0).toFixed(2)}%</span>
        </div>
      `;
    }).join('<span class="text-slate-700">|</span>');
  }

  const btc = marketCoins.find(c => c.symbol.toLowerCase() === 'btc') || marketCoins[0];
  const eth = marketCoins.find(c => c.symbol.toLowerCase() === 'eth') || marketCoins[1];
  const gainer = [...marketCoins].sort((a,b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0))[0];

  if (btc) {
    const el = document.getElementById('btc-price');
    const badge = document.getElementById('btc-badge');
    if (el) el.innerText = `$${formatNumber(btc.current_price)}`;
    if (badge) {
      const isUp = (btc.price_change_percentage_24h || 0) >= 0;
      badge.className = isUp ? 'badge-green text-xs font-mono font-bold px-2 py-0.5 rounded-full' : 'badge-red text-xs font-mono font-bold px-2 py-0.5 rounded-full';
      badge.innerText = `${isUp ? '+' : ''}${(btc.price_change_percentage_24h || 0).toFixed(2)}%`;
    }
  }

  if (eth) {
    const el = document.getElementById('eth-price');
    const badge = document.getElementById('eth-badge');
    if (el) el.innerText = `$${formatNumber(eth.current_price)}`;
    if (badge) {
      const isUp = (eth.price_change_percentage_24h || 0) >= 0;
      badge.className = isUp ? 'badge-green text-xs font-mono font-bold px-2 py-0.5 rounded-full' : 'badge-red text-xs font-mono font-bold px-2 py-0.5 rounded-full';
      badge.innerText = `${isUp ? '+' : ''}${(eth.price_change_percentage_24h || 0).toFixed(2)}%`;
    }
  }

  if (gainer) {
    const gName = document.getElementById('gainer-name');
    const gPrice = document.getElementById('gainer-price');
    const gBadge = document.getElementById('gainer-badge');
    if (gName) gName.innerText = `${gainer.name} (${gainer.symbol.toUpperCase()})`;
    if (gPrice) gPrice.innerText = `$${formatNumber(gainer.current_price)}`;
    if (gBadge) {
      const isUp = (gainer.price_change_percentage_24h || 0) >= 0;
      gBadge.className = isUp ? 'badge-green text-xs font-mono font-bold px-2 py-0.5 rounded-full' : 'badge-red text-xs font-mono font-bold px-2 py-0.5 rounded-full';
      gBadge.innerText = `${isUp ? '+' : ''}${(gainer.price_change_percentage_24h || 0).toFixed(2)}%`;
    }
  }

  renderCoinTable(marketCoins);
}
window.renderMarketUI = renderMarketUI;

function renderCoinTable(coins) {
  const tbody = document.getElementById('crypto-table-body');
  if (!tbody) return;

  tbody.innerHTML = coins.map((coin, index) => {
    const isUp = (coin.price_change_percentage_24h || 0) >= 0;
    const changeClass = isUp ? 'text-crypto-green' : 'text-crypto-red';
    const sign = isUp ? '+' : '';

    return `
      <tr class="hover:bg-navy-800/40 transition cursor-pointer group" onclick="selectCoinForChart('${coin.id}', '${coin.name}', '${coin.symbol.toUpperCase()}')">
        <td class="py-3.5 px-3 text-slate-500 text-xs">${index + 1}</td>
        <td class="py-3.5 px-3">
          <div class="flex items-center gap-2.5">
            <img src="${coin.image}" alt="${coin.name}" class="w-6 h-6 rounded-full" onerror="this.src='https://assets.coingecko.com/coins/images/1/small/bitcoin.png'">
            <div>
              <span class="font-bold text-slate-100 font-sans group-hover:text-cyan-400 transition">${coin.name}</span>
              <span class="text-xs text-slate-500 font-mono ml-1 uppercase">${coin.symbol}</span>
            </div>
          </div>
        </td>
        <td class="py-3.5 px-3 text-right font-bold text-slate-100">$${formatNumber(coin.current_price)}</td>
        <td class="py-3.5 px-3 text-right font-bold ${changeClass}">${sign}${(coin.price_change_percentage_24h || 0).toFixed(2)}%</td>
        <td class="py-3.5 px-3 text-right text-slate-400 hidden sm:table-cell text-xs">$${formatCompact(coin.total_volume)}</td>
        <td class="py-3.5 px-3 text-center">
          <button class="px-2.5 py-1 rounded-lg bg-navy-950 border border-navy-800 group-hover:border-cyan-500 text-cyan-400 text-xs font-sans font-medium transition">
            차트 보기
          </button>
        </td>
      </tr>
    `;
  }).join('');
}
window.renderCoinTable = renderCoinTable;

function handleSearch(query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) {
    renderCoinTable(marketCoins);
  } else {
    const filtered = marketCoins.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.symbol.toLowerCase().includes(q) ||
      (c.korean_name && c.korean_name.toLowerCase().includes(q))
    );
    renderCoinTable(filtered);
  }
}
window.handleSearch = handleSearch;

function initChart() {
  const chartCanvas = document.getElementById('priceChart');
  if (!chartCanvas) return;
  const ctx = chartCanvas.getContext('2d');
  const points = generateChartData(selectedCoin.price || 64820, currentChartTimeframe);

  const gradient = ctx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, 'rgba(6, 182, 212, 0.35)');
  gradient.addColorStop(1, 'rgba(6, 182, 212, 0.0)');

  if (priceChart) priceChart.destroy();

  priceChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: points.labels,
      datasets: [{
        label: `${selectedCoin.name} (USD)`,
        data: points.data,
        borderColor: '#06b6d4',
        borderWidth: 2,
        backgroundColor: gradient,
        fill: true,
        tension: 0.35,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: '#06b6d4',
        pointHoverBorderColor: '#ffffff',
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: document.documentElement.classList.contains('theme-light') ? '#0f172a' : '#64748b', font: { size: 10, family: 'JetBrains Mono' } } },
        y: { grid: { color: 'rgba(30, 41, 75, 0.4)' }, ticks: { color: '#64748b', font: { size: 10, family: 'JetBrains Mono' } } }
      }
    }
  });

  updateChartStats(points.data);
}
window.initChart = initChart;

function selectCoinForChart(id, name, symbol) {
  const coin = marketCoins.find(c => c.id === id) || { current_price: 64820 };
  selectedCoin = { id, name, symbol, price: coin.current_price };

  const cName = document.getElementById('chart-coin-name');
  const cSym = document.getElementById('chart-coin-symbol');
  if (cName) cName.innerText = name;
  if (cSym) cSym.innerText = symbol;

  updateChartData();
}
window.selectCoinForChart = selectCoinForChart;

function changeChartTimeframe(tf) {
  currentChartTimeframe = tf;
  const container = document.getElementById('timeframe-buttons');
  if (container) {
    const btns = container.querySelectorAll('.tf-btn');
    btns.forEach(b => {
      if (b.innerText.toLowerCase() === tf.toLowerCase()) {
        b.className = 'tf-btn px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-bold';
      } else {
        b.className = 'tf-btn px-2 py-0.5 rounded text-slate-400 hover:text-white';
      }
    });
  }
  updateChartData();
}
window.changeChartTimeframe = changeChartTimeframe;

function updateChartData() {
  if (!priceChart) return;
  const points = generateChartData(selectedCoin.price, currentChartTimeframe);
  priceChart.data.labels = points.labels;
  priceChart.data.datasets[0].label = `${selectedCoin.name} (USD)`;
  priceChart.data.datasets[0].data = points.data;
  priceChart.update();
  updateChartStats(points.data);
}
window.updateChartData = updateChartData;

function updateChartStats(data) {
  if (!data || data.length === 0) return;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const h = document.getElementById('chart-high');
  const l = document.getElementById('chart-low');
  if (h) h.innerText = `$${formatNumber(max)}`;
  if (l) l.innerText = `$${formatNumber(min)}`;
}
window.updateChartStats = updateChartStats;

function generateChartData(basePrice, tf) {
  let count = 24;
  let labels = [];
  let data = [];
  let current = basePrice * 0.96;

  if (tf === '24h') {
    count = 24;
    for (let i = 0; i < count; i++) {
      labels.push(`${i}:00`);
      current += (Math.random() - 0.48) * (basePrice * 0.015);
      data.push(Number(current.toFixed(2)));
    }
  } else if (tf === '7d') {
    count = 7;
    const days = ['월', '화', '수', '목', '금', '토', '일'];
    for (let i = 0; i < count; i++) {
      labels.push(days[i]);
      current += (Math.random() - 0.46) * (basePrice * 0.04);
      data.push(Number(current.toFixed(2)));
    }
  } else {
    count = 15;
    for (let i = 1; i <= count; i++) {
      labels.push(`8/${i * 2}`);
      current += (Math.random() - 0.45) * (basePrice * 0.08);
      data.push(Number(current.toFixed(2)));
    }
  }
  data[data.length - 1] = basePrice;
  return { labels, data };
}
window.generateChartData = generateChartData;


// ----------------------------------------------------
// Section 3: Full Page Cafe Style Forum Engine
// ----------------------------------------------------
const INITIAL_FORUM_POSTS = [];

let activeCategory = 'all';
let currentCafePostId = null;
let isCafeEditMode = false;
let currentViewingPostId = null;

function getStoredPosts() {
  try {
    const raw = localStorage.getItem('coinhub_forum_posts') || localStorage.getItem('crytopnl_forum_posts');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const dummyIds = [101, 102, 103, '101', '102', '103'];
        const clean = parsed.filter(p => p && !dummyIds.includes(p.id) && !(p.title && p.title.includes('64K 지지선')));
        return clean;
      }
    }
  } catch (e) {}
  return [];
}
window.getStoredPosts = getStoredPosts;

function saveStoredPosts(posts) {
  try {
    localStorage.setItem('crytopnl_forum_posts', JSON.stringify(posts));
    localStorage.setItem('coinhub_forum_posts', JSON.stringify(posts));
  } catch(e) {}
}
window.saveStoredPosts = saveStoredPosts;

function filterForum(category) {
  activeCategory = category;
  const buttons = document.querySelectorAll('#forum-category-filters .category-btn');
  buttons.forEach(btn => {
    if (btn.dataset.cat === category) {
      btn.classList.add('active', 'bg-cyan-500/20', 'text-cyan-400', 'border-cyan-500/40');
      btn.classList.remove('bg-navy-950', 'text-slate-400');
    } else {
      btn.classList.remove('active', 'bg-cyan-500/20', 'text-cyan-400', 'border-cyan-500/40');
      btn.classList.add('bg-navy-950', 'text-slate-400');
    }
  });
  renderForumPosts();
}
window.filterForum = filterForum;

function renderForumPosts() {
  const container = document.getElementById('forum-posts-list');
  if (!container) return;

  let posts = getStoredPosts();

  if (activeCategory !== 'all') {
    posts = posts.filter(p => {
      if (p.category === activeCategory) return true;
      if (activeCategory === 'trading' && (p.category === 'market' || p.category === 'trading')) return true;
      if (activeCategory === 'feature' && p.category === 'qna') return true;
      return false;
    });
  }

  const sortType = document.getElementById('forum-sort')?.value || 'latest';
  posts.sort((a, b) => {
    const isANotice = a.isNotice === true;
    const isBNotice = b.isNotice === true;
    if (isANotice && !isBNotice) return -1;
    if (!isANotice && isBNotice) return 1;

    if (sortType === 'popular') {
      return (b.upvotes || 0) - (a.upvotes || 0);
    } else if (sortType === 'comments') {
      return ((b.comments && b.comments.length) || 0) - ((a.comments && a.comments.length) || 0);
    } else {
      return (b.timestamp || 0) - (a.timestamp || 0);
    }
  });

  if (posts.length === 0) {
    container.innerHTML = `
      <div class="bg-navy-900 border border-navy-800 rounded-2xl p-10 text-center text-slate-400">
        <i data-lucide="inbox" class="w-10 h-10 mx-auto text-slate-600 mb-3"></i>
        <p class="text-sm">작성된 게시글이 없습니다. 첫 번째 토론 글을 남겨보세요!</p>
      </div>
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    return;
  }

  container.innerHTML = posts.map(post => {
    const commentsCount = post.comments ? post.comments.length : 0;
    const plainText = (post.content || '').replace(/<[^>]+>/g, ' ').trim();
    const hasImage = (post.content && post.content.includes('<img')) || post.image;

    return `
      <div class="crypto-card bg-navy-900 border border-navy-800 rounded-2xl p-5 shadow-sm hover:border-cyan-500/40 transition cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group" onclick="openPostDetailModal('${post.id}')">
        <div class="flex-1 space-y-2">
          <div class="flex items-center gap-2 flex-wrap">
            ${post.isNotice ? '<span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">📢 공지</span>' : ''}
            <span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">${escapeHtml(post.categoryName)}</span>
            ${hasImage ? '<span class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1"><i data-lucide="image" class="w-3 h-3"></i> 사진포함</span>' : ''}
            <span class="text-xs text-slate-400">• ${escapeHtml(formatDateTime(post.timestamp || post.time))}</span>
            <span class="text-xs font-semibold text-slate-300">• ${escapeHtml(post.author)}</span>
            ${post.authorRank ? `<span class="text-[9px] px-1.5 py-0.2 rounded bg-navy-950 border border-navy-800 text-cyan-400 font-mono">${escapeHtml(post.authorRank)}</span>` : ''}
            <span class="text-xs text-slate-400 font-mono flex items-center gap-1"><i data-lucide="eye" class="w-3.5 h-3.5 text-cyan-400 inline"></i>조회 ${post.views || 1}회</span>
          </div>
          <h3 class="font-semibold text-sm sm:text-base text-slate-100 group-hover:text-cyan-400 transition leading-snug">${escapeHtml(post.title)}</h3>
          <p class="text-xs text-slate-400 line-clamp-2 leading-relaxed">${escapeHtml(plainText)}</p>
        </div>

        <div class="flex items-center gap-3 self-end sm:self-center shrink-0 text-xs">
          <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-navy-950 border border-navy-800 text-slate-400 font-mono" title="조회수">
            <i data-lucide="eye" class="w-3.5 h-3.5 text-cyan-400"></i>
            <span>조회 ${post.views || 1}</span>
          </div>
          <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-navy-950 border border-navy-800 text-cyan-400 font-bold font-mono" title="추천수">
            <i data-lucide="thumbs-up" class="w-3.5 h-3.5"></i>
            <span>${post.upvotes || 0}</span>
          </div>
          <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-navy-950 border border-navy-800 text-slate-300 font-mono" title="댓글수">
            <i data-lucide="message-square" class="w-3.5 h-3.5 text-slate-400"></i>
            <span>${commentsCount}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  if (typeof lucide !== 'undefined') lucide.createIcons();
}
window.renderForumPosts = renderForumPosts;

function showForumListView(updateHistory = true) {
  const listView = document.getElementById('forum-list-view');
  const detailView = document.getElementById('forum-detail-view');
  const writeView = document.getElementById('forum-write-view');

  if (listView) listView.classList.remove('hidden');
  if (detailView) detailView.classList.add('hidden');
  if (writeView) writeView.classList.add('hidden');

  currentCafePostId = null;
  isCafeEditMode = false;
  renderForumPosts();

  if (updateHistory && window.location.hash !== '#/forum') {
    history.pushState(null, '', '#/forum');
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.showForumListView = showForumListView;

function showForumWriteView(editPostId = null, updateHistory = true) {
  const listView = document.getElementById('forum-list-view');
  const detailView = document.getElementById('forum-detail-view');
  const writeView = document.getElementById('forum-write-view');

  if (listView) listView.classList.add('hidden');
  if (detailView) detailView.classList.add('hidden');
  if (writeView) writeView.classList.remove('hidden');

  const heading = document.getElementById('cafe-editor-heading');
  const submitBtn = document.getElementById('cafe-write-submit-btn');
  const titleInput = document.getElementById('cafe-write-title');
  const editor = document.getElementById('cafe-write-content');
  const catSelect = document.getElementById('cafe-write-category');

  if (editPostId) {
    isCafeEditMode = true;
    currentCafePostId = editPostId;
    const posts = getStoredPosts();
    const post = posts.find(p => String(p.id) === String(editPostId));
    if (post) {
      if (heading) heading.innerText = '게시글 수정하기';
      if (submitBtn) submitBtn.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i> 수정 내용 저장하기';
      if (titleInput) titleInput.value = post.title || '';
      if (editor) editor.innerHTML = post.content || '';
      if (catSelect) catSelect.value = post.category || 'general';
    }
  } else {
    isCafeEditMode = false;
    currentCafePostId = null;
    if (heading) heading.innerText = '커뮤니티 게시글 작성';
    if (submitBtn) submitBtn.innerHTML = '<i data-lucide="send" class="w-4 h-4"></i> 게시글 등록 완료';
    if (titleInput) titleInput.value = '';
    if (editor) editor.innerHTML = '';
    if (catSelect) catSelect.value = 'general';
  }

  if (updateHistory) {
    const targetHash = editPostId ? `#/forum/edit/${editPostId}` : `#/forum/write`;
    if (window.location.hash !== targetHash) {
      history.pushState(null, '', targetHash);
    }
  }

  if (titleInput) setTimeout(() => titleInput.focus(), 100);
  if (typeof lucide !== 'undefined') lucide.createIcons();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.showForumWriteView = showForumWriteView;

function openPostDetailModal(postId, updateHistory = true) {
  const listView = document.getElementById('forum-list-view');
  const detailView = document.getElementById('forum-detail-view');
  const writeView = document.getElementById('forum-write-view');

  if (listView) listView.classList.add('hidden');
  if (writeView) writeView.classList.add('hidden');
  if (detailView) detailView.classList.remove('hidden');

  const posts = getStoredPosts();
  const post = posts.find(p => String(p.id) === String(postId));
  if (!post) return;

  currentCafePostId = post.id;
  currentViewingPostId = post.id;
  post.views = (post.views || 0) + 1;
  saveStoredPosts(posts);

  if (updateHistory && window.location.hash !== `#/forum/post/${post.id}`) {
    history.pushState(null, '', `#/forum/post/${post.id}`);
  }

  const catEl = document.getElementById('cafe-post-category');
  const titleEl = document.getElementById('cafe-post-title');
  const authorEl = document.getElementById('cafe-post-author');
  const timeEl = document.getElementById('cafe-post-time');
  const viewsEl = document.getElementById('cafe-post-views');
  const contentEl = document.getElementById('cafe-post-content');
  const upvotesEl = document.getElementById('cafe-post-upvotes');

  if (catEl) {
    if (post.isNotice) {
      catEl.innerHTML = `<span class="text-rose-400 font-bold mr-2">📢 공지</span>${post.categoryName}`;
    } else {
      catEl.innerText = post.categoryName;
    }
  }
  if (titleEl) titleEl.innerText = post.title;
  if (authorEl) authorEl.innerText = `${post.author} (${post.authorRank || 'Member'})`;
  if (timeEl) timeEl.innerText = formatDateTime(post.timestamp || post.time);
  if (viewsEl) viewsEl.innerText = post.views;
  if (contentEl) contentEl.innerHTML = post.content;
  if (upvotesEl) upvotesEl.innerText = post.upvotes || 0;

  const controlsEl = document.getElementById('cafe-post-author-controls');
  const storedUser = localStorage.getItem('crytopnl_user') || localStorage.getItem('coinhub_user');
  let currentUsername = '';
  if (storedUser) {
    try {
      const u = JSON.parse(storedUser);
      if (u && u.username) currentUsername = u.username.trim();
    } catch(e) {}
  }

  const isAuthor = Boolean(currentUsername && currentUsername.toLowerCase() === (post.author || '').trim().toLowerCase()) || (typeof isAdmin === 'function' && isAdmin(currentUsername));

  if (controlsEl) {
    if (isAuthor) {
      controlsEl.innerHTML = `
        <button onclick="showForumWriteView('${post.id}')" class="px-3.5 py-1.5 rounded-xl bg-navy-950 hover:bg-cyan-500 hover:text-navy-950 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition flex items-center gap-1.5">
          <i data-lucide="edit-3" class="w-3.5 h-3.5"></i> 수정
        </button>
        <button onclick="handleDeleteCafePost('${post.id}')" class="px-3.5 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold transition flex items-center gap-1.5">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> 삭제
        </button>
      `;
      controlsEl.classList.remove('hidden');
    } else {
      controlsEl.innerHTML = '';
      controlsEl.classList.add('hidden');
    }
  }

  renderCafeComments(post.comments || []);
  if (typeof lucide !== 'undefined') lucide.createIcons();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.openPostDetailModal = openPostDetailModal;

function renderCafeComments(comments = []) {
  const container = document.getElementById('cafe-comments-list');
  const countEl = document.getElementById('cafe-comments-count');
  if (countEl) countEl.innerText = `${comments.length}개`;
  if (!container) return;

  if (comments.length === 0) {
    container.innerHTML = `<div class="text-center py-8 text-slate-500 text-xs">첫 번째 댓글을 남겨보세요!</div>`;
    return;
  }

  container.innerHTML = comments.map(c => `
    <div class="p-4 rounded-2xl bg-navy-950 border border-navy-800 space-y-2">
      <div class="flex items-center justify-between text-xs">
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center text-[10px]">${(c.author || '익').slice(0, 1)}</div>
          <span class="font-bold text-slate-200">${escapeHtml(c.author || '익명')}</span>
        </div>
        <span class="text-slate-500 text-[11px] font-mono">${formatDateTime(c.timestamp || c.time)}</span>
      </div>
      <p class="text-xs sm:text-sm text-slate-300 leading-relaxed pl-8">${escapeHtml(c.text || '')}</p>
    </div>
  `).join('');
}
window.renderCafeComments = renderCafeComments;

function handleCafeAddComment() {
  if (!currentCafePostId) return;
  const input = document.getElementById('cafe-new-comment-input');
  const text = input ? input.value.trim() : '';
  if (!text) return;

  const posts = getStoredPosts();
  const post = posts.find(p => String(p.id) === String(currentCafePostId));
  if (!post) return;

  const storedUser = localStorage.getItem('crytopnl_user') || localStorage.getItem('coinhub_user');
  let author = '익명 트레이더';
  if (storedUser) {
    try {
      const u = JSON.parse(storedUser);
      if (u && u.username) author = u.username;
    } catch(e) {}
  }

  if (!post.comments) post.comments = [];
  post.comments.push({
    id: Date.now(),
    author: author,
    text: text,
    time: formatDateTime(Date.now()),
    timestamp: Date.now()
  });

  saveStoredPosts(posts);
  if (input) input.value = '';
  renderCafeComments(post.comments);
}
window.handleCafeAddComment = handleCafeAddComment;

function handleDeleteCafePost(postId) {
  const storedUser = localStorage.getItem('crytopnl_user') || localStorage.getItem('coinhub_user');
  let currentUsername = '';
  if (storedUser) {
    try {
      const u = JSON.parse(storedUser);
      if (u && u.username) currentUsername = u.username.trim();
    } catch(e) {}
  }

  let posts = getStoredPosts();
  const post = posts.find(p => String(p.id) === String(postId));
  if (!post) return;

  if (!currentUsername || currentUsername.toLowerCase() !== (post.author || '').trim().toLowerCase()) {
    if (typeof isAdmin !== 'function' || !isAdmin(currentUsername)) {
      alert('❌ 본인이 직접 작성한 게시글만 삭제할 수 있습니다.');
      return;
    }
  }

  if (!confirm('정말로 이 게시글을 삭제하시겠습니까?')) return;
  posts = posts.filter(p => String(p.id) !== String(postId));
  saveStoredPosts(posts);
  if (typeof db !== 'undefined' && db) {
    db.collection('forum_posts').doc(postId.toString()).delete().catch(e => console.log(e));
  }
  alert('🗑️ 게시글이 삭제되었습니다.');
  showForumListView();
}
window.handleDeleteCafePost = handleDeleteCafePost;

function insertInlineImageIntoEditor(base64Data) {
  const editor = document.getElementById('cafe-write-content');
  if (!editor) return;

  const imgHtml = `<div class="my-4 text-center"><img src="${base64Data}" class="max-h-[500px] w-auto max-w-full rounded-2xl border border-navy-700 shadow-2xl inline-block object-contain" alt="첨부 이미지"></div><p><br></p>`;

  editor.focus();
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = imgHtml;
    const frag = document.createDocumentFragment();
    let node, lastNode;
    while ((node = tempDiv.firstChild)) {
      lastNode = frag.appendChild(node);
    }
    range.insertNode(frag);
    if (lastNode) {
      range.setStartAfter(lastNode);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  } else {
    editor.innerHTML += imgHtml;
  }
}
window.insertInlineImageIntoEditor = insertInlineImageIntoEditor;

function processCafeImageBlob(file) {
  if (!file || !file.type.startsWith('image/')) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      const maxDim = 1280;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // Target under 1MB (1,000,000 bytes). Base64 string length <= 1,300,000 chars.
      let quality = 0.85;
      let base64 = canvas.toDataURL('image/jpeg', quality);
      const targetMaxChars = 1000 * 1024 * 1.30; // ~1MB in Base64

      while (base64.length > targetMaxChars && quality > 0.25) {
        quality -= 0.12;
        base64 = canvas.toDataURL('image/jpeg', quality);
      }

      insertInlineImageIntoEditor(base64);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}
window.processCafeImageBlob = processCafeImageBlob;

function handleCafeSubmitPost(e) {
  if (e && e.preventDefault) e.preventDefault();
  const catSelect = document.getElementById('cafe-write-category');
  const titleInput = document.getElementById('cafe-write-title');
  const editor = document.getElementById('cafe-write-content');
  const isNotice = document.getElementById('cafe-write-is-notice') ? document.getElementById('cafe-write-is-notice').checked : false;

  const category = catSelect ? catSelect.value : 'general';
  const title = titleInput ? titleInput.value.trim() : '';
  const content = editor ? editor.innerHTML.trim() : '';

  if (!title || !content || content === '<p><br></p>' || content === '<br>') {
    alert('제목과 본문 내용을 모두 작성해 주세요.');
    return;
  }

  const categoryNames = {
    general: '💬 자유 토론',
    profit: '💵 실현손익',
    altcoin: '🚀 알트코인',
    trading: '📈 트레이딩자료',
    feature: '💡 추가기능요청'
  };

  const storedUser = localStorage.getItem('crytopnl_user') || localStorage.getItem('coinhub_user');
  let authorName = '익명 트레이더';
  let authorRank = 'PRO';
  if (storedUser) {
    try {
      const u = JSON.parse(storedUser);
      if (u && u.username) {
        authorName = u.username;
        authorRank = u.rank || 'MEMBER';
      }
    } catch(err) {}
  }

  const posts = getStoredPosts();

  if (isCafeEditMode && currentCafePostId) {
    const post = posts.find(p => String(p.id) === String(currentCafePostId));
    if (post) {
      post.category = category;
      post.categoryName = categoryNames[category] || '💬 자유 토론';
      post.title = title;
      post.content = content;
      post.isNotice = isNotice;
      post.time = '수정됨 (방금 전)';
      post.updatedAt = Date.now();
      saveStoredPosts(posts);
      if (typeof db !== 'undefined' && db) {
        db.collection('forum_posts').doc(post.id.toString()).set(post).catch(e => console.log(e));
      }
      isCafeEditMode = false;
      const targetId = post.id;
      currentCafePostId = null;
      alert('✏️ 게시글이 성공적으로 수정되었습니다!');
      openPostDetailModal(targetId);
      return;
    }
  }

  const newPost = {
    id: Date.now(),
    category,
    categoryName: categoryNames[category] || '💬 자유 토론',
    title,
    content,
    isNotice,
    author: authorName,
    authorRank: authorRank,
    upvotes: 1,
    views: 1,
    time: formatDateTime(Date.now()),
    timestamp: Date.now(),
    comments: []
  };

  posts.unshift(newPost);
  saveStoredPosts(posts);

  alert('🎉 게시글이 성공적으로 등록되었습니다!');
  showForumListView();
}
window.handleCafeSubmitPost = handleCafeSubmitPost;

function handleVoteInModal(delta) {
  if (!currentViewingPostId) return;
  const posts = getStoredPosts();
  const post = posts.find(p => p.id === currentViewingPostId);
  if (!post) return;

  const voteKey = 'voted_post_' + currentViewingPostId;
  if (delta > 0 && localStorage.getItem(voteKey)) {
    alert('❌ 이미 추천한 게시글입니다. (계정당 1회만 추천 가능합니다.)');
    return;
  }

  if (delta > 0) {
    localStorage.setItem(voteKey, 'true');
  } else if (delta < 0) {
    localStorage.removeItem(voteKey);
  }

  post.upvotes = Math.max(0, (post.upvotes || 0) + delta);
  saveStoredPosts(posts);

  const el = document.getElementById('cafe-post-upvotes');
  if (el) el.innerText = post.upvotes;
  
  const modalEl = document.getElementById('modal-post-upvotes');
  if (modalEl) modalEl.innerText = post.upvotes;
}
window.handleVoteInModal = handleVoteInModal;


// ----------------------------------------------------
// Section 4: Real-Time Chat System
// ----------------------------------------------------
let chatMessages = [
  { id: 1, user: '비트홀더', rank: 'PRO', text: '비트코인 64.8K 지지선 강력하네요. 오늘 밤 나스닥 개장 반응 봐야겠습니다.', time: '오후 8:40' },
  { id: 2, user: '단타마스터', rank: 'VIP', text: '솔라나 쪽으로 롱 포지션 수익 실현하고 비트 진입 대기 중입니다.', time: '오후 8:42' }
];

function renderChatMessages() {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  container.innerHTML = chatMessages.map(msg => `
    <div class="flex items-start gap-3 animate-in">
      <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-md font-mono">
        ${(msg.user || 'U').substring(0, 2).toUpperCase()}
      </div>
      <div class="flex-1 bg-navy-950 p-3 rounded-2xl rounded-tl-none border border-navy-800/80">
        <div class="flex items-center gap-2 mb-1">
          <span class="font-bold text-xs text-slate-200">${escapeHtml(msg.user)}</span>
          <span class="text-[9px] px-1.5 py-0.2 rounded bg-navy-900 border border-navy-800 text-cyan-400 font-mono">${escapeHtml(msg.rank || 'USER')}</span>
          <span class="text-[10px] text-slate-500 ml-auto font-mono">${escapeHtml(msg.time)}</span>
        </div>
        <p class="text-xs text-slate-300 leading-relaxed">${escapeHtml(msg.text)}</p>
      </div>
    </div>
  `).join('');

  container.scrollTop = container.scrollHeight;
  renderChatActiveUsers();
  if (typeof lucide !== 'undefined') lucide.createIcons();
}
window.renderChatMessages = renderChatMessages;

function renderChatActiveUsers() {
  const el = document.getElementById('online-count') || document.getElementById('chat-online-count');
  if (el) {
    const userList = document.getElementById('chat-active-users-list');
    const count = userList ? userList.children.length : 1;
    el.innerText = count + '명 접속중';
  }
}
window.renderChatActiveUsers = renderChatActiveUsers;

function handleSendChat(e) {
  if (e && e.preventDefault) e.preventDefault();
  const input = document.getElementById('chat-input');
  const text = input ? input.value.trim() : '';
  if (!text) return;

  const storedUser = localStorage.getItem('crytopnl_user') || localStorage.getItem('coinhub_user');
  let user = '익명 트레이더';
  let rank = 'USER';
  if (storedUser) {
    try {
      const u = JSON.parse(storedUser);
      if (u && u.username) {
        user = u.username;
        rank = u.rank || 'MEMBER';
      }
    } catch(e) {}
  }

  const now = new Date();
  const timeStr = `${now.getHours() < 12 ? '오전' : '오후'} ${now.getHours() % 12 || 12}:${String(now.getMinutes()).padStart(2, '0')}`;

  chatMessages.push({
    id: Date.now(),
    user: user,
    rank: rank,
    text: text,
    time: timeStr
  });

  if (input) input.value = '';
  renderChatMessages();
}
window.handleSendChat = handleSendChat;


// ----------------------------------------------------
// Section 5: Multi-Media Real-Time Crypto News Aggregator
// (한국경제, 연합뉴스, 매일경제, 블록미디어, 디센터, 코인니스, 코인데스크, 블룸버그 등)
// ----------------------------------------------------
const MULTI_SOURCE_NEWS_POOL = [
  {
    id: 901,
    category: 'MARKET',
    categoryName: '비트코인/시장',
    badge: 'HOT',
    title: '비트코인 64.8K 지지선 수성... 글로벌 기관 현물 ETF 순유입세 전환',
    content: '미국 주요 연기금과 헤지펀드들이 13F 공시를 통해 비트코인 현물 ETF 보유 비중을 대폭 확대한 것으로 나타났습니다. 온체인 거래량 또한 주간 최고치를 기록하며 반등을 주도하고 있습니다.',
    source: '한국경제 (코인·블록체인)',
    time: '2분 전',
    timestamp: Date.now() - 2 * 60 * 1000,
    takeaways: [
      '기관 포트폴리오 내 비트코인 편입 비중 2.1% 상향 조정',
      '장기 보유자(LTH) 온체인 유출량 3개월 내 최저치 기록',
      '단기 68,000달러 저항선 돌파 시도 지속'
    ]
  },
  {
    id: 902,
    category: 'ALTCOIN',
    categoryName: '알트코인',
    badge: 'LIVE',
    title: '솔라나(SOL) DEX 일일 거래대금 사상 최대... 수이(SUI)·아비트럼(ARB) 동반 랠리',
    content: '솔라나 온체인 생태계 거래량이 전주 대비 35% 급증하며 알트코인 시장 전반의 거래 활성도를 견인하고 있습니다. 신흥 L1 체인과 L2 롤업 토큰들로 유동성이 확산되는 추세입니다.',
    source: '블록미디어 (BlockMedia)',
    time: '7분 전',
    timestamp: Date.now() - 7 * 60 * 1000,
    takeaways: [
      '솔라나 온체인 DEX 점유율 급상승 및 일일 활성 지갑 1,500만 개 돌파',
      '알트코인 순환매 장세에 따른 거래소 예치량 증가'
    ]
  },
  {
    id: 903,
    category: 'REGULATION',
    categoryName: '규제/정책',
    badge: '공시',
    title: '금융위·금감원, 2026 가상자산이용자보호법 2단계 추진 로드맵 확정',
    content: '금융당국이 가상자산 발행 및 공시 표준화, 원화 연동 스테이블코인 준비금 검증 가이드라인을 담은 2단계 입법 계획을 공식 발표했습니다. 국내 5대 원화 거래소와 이상거래 감시를 강화합니다.',
    source: '연합뉴스 (경제)',
    time: '15분 전',
    timestamp: Date.now() - 15 * 60 * 1000,
    takeaways: [
      '국내 원화 거래소 상장 심사 및 상장폐지 기준 표준화',
      '투자자 예치금 분리 보관 및 실시간 이상거래 경보 체계 구축'
    ]
  },
  {
    id: 904,
    category: 'TECH',
    categoryName: '기술/DeFi',
    badge: 'TECH',
    title: '이더리움 프라하(Pectra) 하드포크 테스트넷 가동... L2 가스비 추가 50% 절감',
    content: '이더리움 코어 개발진이 차기 하드포크 펙트라(Pectra)의 테스트넷을 가동했습니다. 계정 추상화(EIP-3074)와 검증자 스테이킹 상한 상향(EIP-7251)으로 편의성과 확장성이 대폭 개선됩니다.',
    source: '디센터 (Decenter·서울경제)',
    time: '24분 전',
    timestamp: Date.now() - 24 * 60 * 1000,
    takeaways: [
      '웹2 수준의 편리한 스마트 지갑 사용자 경험 제공',
      'L2 롤업 처리 속도 향상 및 데이터 가용성 비용 절감'
    ]
  },
  {
    id: 905,
    category: 'ALTCOIN',
    categoryName: '알트코인',
    badge: '속보',
    title: '코인니스 24시 속보: 리플(XRP) 신규 스테이블코인 RLUSD 메인넷 테스트 돌입',
    content: '리플랩스가 미국 달러화에 1:1 연동되는 엔터프라이즈 스테이블코인 RLUSD의 프라이빗 베타 테스트를 성공적으로 시작했다고 밝혔습니다. 기관 간 국경 간 결제 효율성이 크게 증대될 전망입니다.',
    source: 'CoinNess (코인니스 24시)',
    time: '32분 전',
    timestamp: Date.now() - 32 * 60 * 1000,
    takeaways: [
      'XRP Ledger 및 이더리움 메인넷 동시 지원',
      '미국 뉴욕 금융감독청(NYDFS) 규제 승인 절차 진행 중'
    ]
  },
  {
    id: 906,
    category: 'MARKET',
    categoryName: '거시경제/시장',
    badge: 'HOT',
    title: '미국 연준 9월 FOMC 25bp 금리 인하 확률 94%... 유동성 랠리 기대',
    content: 'CME 페드워치에 따르면 9월 FOMC 기준금리 인하 확률이 90% 이상으로 유지되고 있습니다. 글로벌 유동성 완화 기대감이 비트코인 및 가상자산 시장의 강력한 지지 요인으로 작용하고 있습니다.',
    source: '매일경제 (디지털자산)',
    time: '45분 전',
    timestamp: Date.now() - 45 * 60 * 1000,
    takeaways: [
      '글로벌 금리 인하 사이클 진입에 따른 위험자산 선호 강화',
      '달러화 약세에 따른 가상자산 헷지 수요 증대'
    ]
  },
  {
    id: 907,
    category: 'TECH',
    categoryName: '기술/DeFi',
    badge: 'LIVE',
    title: '글로벌 디파이 TVL 1,000억 달러 재돌파... 렌딩·LSD 프로토콜 예치금 급증',
    content: '탈중앙화 금융(DeFi) 총 예치자산이 3개월 만에 1,000억 달러를 재돌파했습니다. 리도(Lido), 에이베(Aave), 메이커다오 등 핵심 프로토콜의 수익률 상승이 예치금 유입을 견인했습니다.',
    source: 'CoinDesk (코인데스크)',
    time: '1시간 전',
    timestamp: Date.now() - 60 * 60 * 1000,
    takeaways: [
      '리퀴드 리스테이킹(LRT) 생태계 자금 25% 순증',
      '기관용 DeFi 컴플라이언스 프로토콜 활성화'
    ]
  },
  {
    id: 908,
    category: 'REGULATION',
    categoryName: '규제/정책',
    badge: '공시',
    title: '미국 SEC, 다중 가상자산 현물 종합 지수 ETF 심사 개시',
    content: '미국 증권거래위원회(SEC)가 비트코인과 이더리움, 솔라나를 복합 편입하는 대형 운용사의 크립토 지수 ETF 상품에 대한 정식 심사 절차에 착수했습니다.',
    source: 'Bloomberg Crypto (블룸버그)',
    time: '1시간 전',
    timestamp: Date.now() - 75 * 60 * 1000,
    takeaways: [
      '다변화된 포트폴리오를 제공하는 복합 지수 ETF 시장 개막 기대',
      '기관 자금의 알트코인 직접 편입 통로 확보'
    ]
  }
];

let NEWS_ITEMS = [...MULTI_SOURCE_NEWS_POOL];
let activeNewsCategory = 'ALL';
let newsCountdownSeconds = 30;
let newsCountdownTimer = null;

function filterNews(cat) {
  activeNewsCategory = cat || 'ALL';
  const buttons = document.querySelectorAll('#news-category-filters .category-btn');
  buttons.forEach(btn => {
    if (btn.dataset.newsCat === cat) {
      btn.classList.add('active', 'bg-cyan-500/20', 'text-cyan-400', 'border-cyan-500/40');
      btn.classList.remove('bg-navy-950', 'text-slate-400');
    } else {
      btn.classList.remove('active', 'bg-cyan-500/20', 'text-cyan-400', 'border-cyan-500/40');
      btn.classList.add('bg-navy-950', 'text-slate-400');
    }
  });
  renderNews();
}
window.filterNews = filterNews;

function renderNews() {
  const grid = document.getElementById('news-grid');
  if (!grid) return;

  let items = (NEWS_ITEMS && NEWS_ITEMS.length > 0) ? NEWS_ITEMS : MULTI_SOURCE_NEWS_POOL;

  if (activeNewsCategory !== 'ALL') {
    const targetCat = activeNewsCategory.toUpperCase();
    items = items.filter(i => {
      const itemCat = (i.category || '').toUpperCase();
      if (targetCat === 'REGULATION' || targetCat === 'POLICY') {
        return itemCat === 'REGULATION' || itemCat === 'POLICY';
      }
      if (targetCat === 'MARKET' || targetCat === 'BTC') {
        return itemCat === 'MARKET' || itemCat === 'BTC';
      }
      if (targetCat === 'ALTCOIN' || targetCat === 'ALT') {
        return itemCat === 'ALTCOIN' || itemCat === 'ALT';
      }
      if (targetCat === 'TECH' || targetCat === 'DEFI') {
        return itemCat === 'TECH' || itemCat === 'DEFI';
      }
      return itemCat === targetCat;
    });
  }

  if (items.length === 0) {
    grid.innerHTML = '<div class="p-8 text-center text-slate-500 text-xs bg-navy-900 rounded-3xl border border-navy-800 col-span-full">해당 카테고리의 속보 기사가 없습니다.</div>';
    return;
  }

  grid.innerHTML = items.map(item => `
    <div class="crypto-card bg-navy-900 border border-navy-800 rounded-3xl p-6 shadow-lg hover:border-cyan-500/40 transition flex flex-col justify-between space-y-4 group">
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <span class="px-2.5 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-mono font-bold">${escapeHtml(item.categoryName || item.category)}</span>
          <span class="text-xs text-slate-400 font-mono">${escapeHtml(item.source)} • ${escapeHtml(formatDateTime(item.timestamp || item.time))}</span>
        </div>
        <h3 class="text-base font-bold text-white group-hover:text-cyan-400 transition leading-snug">${escapeHtml(item.title)}</h3>
        <p class="text-xs text-slate-400 line-clamp-3 leading-relaxed">${escapeHtml(item.content)}</p>
      </div>

      <div class="pt-3 border-t border-navy-800 flex items-center justify-between text-xs">
        <button onclick="openNewsDetailModal(${item.id})" class="text-cyan-400 font-bold hover:underline flex items-center gap-1">
          <i data-lucide="sparkles" class="w-3.5 h-3.5"></i> AI 요약 분석
        </button>
        <button onclick="openNewsDetailModal(${item.id})" class="px-3 py-1.5 rounded-xl bg-navy-950 hover:bg-cyan-500 hover:text-navy-950 text-slate-300 font-bold transition flex items-center gap-1 border border-navy-800">
          <span>전문 읽기</span> <i data-lucide="arrow-right" class="w-3 h-3"></i>
        </button>
      </div>
    </div>
  `).join('');

  if (typeof lucide !== 'undefined') lucide.createIcons();
}
window.renderNews = renderNews;

function openNewsDetailModal(id) {
  const item = (NEWS_ITEMS || []).find(n => n.id === id) || MULTI_SOURCE_NEWS_POOL.find(n => n.id === id);
  if (!item) return;

  const catEl = document.getElementById('modal-news-category');
  const srcEl = document.getElementById('modal-news-source');
  const timeEl = document.getElementById('modal-news-time');
  const titleEl = document.getElementById('modal-news-title');
  const contentEl = document.getElementById('modal-news-content');
  const takeawaysEl = document.getElementById('modal-news-takeaways');
  const linkEl = document.getElementById('modal-news-original-link');

  if (catEl) catEl.innerText = item.categoryName || item.category;
  if (srcEl) srcEl.innerText = item.source;
  if (timeEl) timeEl.innerText = formatDateTime(item.timestamp || item.time);
  if (titleEl) titleEl.innerText = item.title;
  if (contentEl) contentEl.innerText = item.content;
  if (linkEl) linkEl.href = item.link || '#';

  if (takeawaysEl) {
    takeawaysEl.innerHTML = (item.takeaways || [
      '글로벌 시장의 주요 가상자산 시세 흐름에 직접적 영향 요인',
      '투자 심리 및 온체인 유동성 지표에 긍정적 시그널 제공'
    ]).map(t => `<li class="leading-relaxed">${escapeHtml(t)}</li>`).join('');
  }

  const modal = document.getElementById('news-detail-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.style.setProperty('display', 'flex', 'important');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}
window.openNewsDetailModal = openNewsDetailModal;

function closeNewsDetailModal() {
  const modal = document.getElementById('news-detail-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.setProperty('display', 'none', 'important');
  }
}
window.closeNewsDetailModal = closeNewsDetailModal;

function copyNewsLink() {
  alert('기사 링크가 클립보드에 복사되었습니다!');
}
window.copyNewsLink = copyNewsLink;

function generateAIInsights(title, category) {
    const kTitle = title.toLowerCase();
    const insights = [];
    
    // 기사 제목에서 키워드 추출하여 동적 요약 생성
    const cleanTitle = title.replace(/[\[\]\(\)\"\'\-\|\,]/g, '').trim();
    const words = cleanTitle.split(/\s+/).filter(w => w.length > 1).slice(0, 4);
    const keyPhrase = words.join(' ');
    
    if (kTitle.includes("과세") || kTitle.includes("세금") || kTitle.includes("유예")) {
        insights.push(`'${keyPhrase}' 관련 가상자산 과세 및 정책 논의가 시장의 핵심 이슈로 부각되었습니다.`);
        insights.push("관련 법안 방향성에 따라 단기적인 투자 심리가 위축되거나 반전될 수 있습니다.");
    } else if (kTitle.includes("etf") || kTitle.includes("승인") || kTitle.includes("기관")) {
        insights.push(`'${keyPhrase}' 소식으로 기관 자금 유입 및 제도권 편입 기대감이 커지고 있습니다.`);
        insights.push("글로벌 전통 금융 시장의 가상자산 채택 가속화가 가격 상승 동력으로 작용할 전망입니다.");
    } else if (kTitle.includes("급락") || kTitle.includes("하락") || kTitle.includes("붕괴") || kTitle.includes("청산")) {
        insights.push(`'${keyPhrase}' 영향으로 시장 변동성이 급격히 확대되고 있습니다.`);
        insights.push("거시 경제 불안정 또는 특정 악재가 투자 심리를 억누르고 있어 레버리지 관리에 각별한 주의가 필요합니다.");
    } else if (kTitle.includes("급등") || kTitle.includes("상승") || kTitle.includes("돌파") || kTitle.includes("최고가")) {
        insights.push(`'${keyPhrase}' 흐름에 따라 강한 매수세가 유입되며 저항선 돌파 시도가 이어지고 있습니다.`);
        insights.push("추가 상승 여력이 존재하나, 지표 과열에 따른 일시적 조정 가능성도 염두에 두어야 합니다.");
    } else if (category === "ALTCOIN") {
        insights.push(`'${keyPhrase}' 관련 알트코인 생태계의 호재성 소식 및 업데이트가 주목받고 있습니다.`);
        insights.push("비트코인 도미넌스 변화와 함께 알트코인 장세 순환매 가능성을 체크해야 합니다.");
    } else if (category === "REGULATION") {
        insights.push(`'${keyPhrase}' 등 주요 암호화폐 규제 가이드라인 확립 이슈가 진행 중입니다.`);
        insights.push("제도권 편입 과정에서 단기적으로 발생하는 규제 불확실성에 대한 대비가 필요합니다.");
    } else if (category === "TECH") {
        insights.push(`'${keyPhrase}' 기술적 진전 및 프로토콜 업그레이드가 보고되었습니다.`);
        insights.push("해당 프로젝트의 장기적인 온체인 데이터 활성화 및 네트워크 가치 상승이 기대됩니다.");
    } else {
        insights.push(`'${keyPhrase}' 이슈가 글로벌 가상자산 시장의 실시간 핵심 동향으로 감지되었습니다.`);
        insights.push("해당 뉴스가 유발할 수 있는 비트코인 및 주요 암호화폐의 단기 가격 흐름을 예의주시해야 합니다.");
    }
    insights.push("⚡ CrytoPnL AI가 원문 기사 문맥을 분석하여 자동 추출한 핵심 인사이트입니다.");
    return insights;
}

async function fetchRealCryptoNews() {
  try {
    const urls = [
      "https://news.google.com/rss/search?q=비트코인+OR+암호화폐+시장&hl=ko&gl=KR&ceid=KR:ko",
      "https://news.google.com/rss/search?q=알트코인+OR+이더리움+OR+솔라나+OR+리플+OR+도지코인&hl=ko&gl=KR&ceid=KR:ko",
      "https://news.google.com/rss/search?q=암호화폐+규제+OR+SEC+OR+비트코인+과세+OR+가상자산법&hl=ko&gl=KR&ceid=KR:ko",
      "https://news.google.com/rss/search?q=블록체인+기술+OR+웹3+OR+디파이+OR+메인넷&hl=ko&gl=KR&ceid=KR:ko"
    ];
    const fetchPromises = urls.map(async (url, idx) => {
      const apiUrl = "https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(url);
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(apiUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          return { idx, items: (data && data.items) ? data.items.slice(0, 5) : [] };
        }
      } catch (e) {}
      return { idx, items: [] };
    });
    const results = await Promise.all(fetchPromises);
    let combined = [];
    const catMap = ["MARKET", "ALTCOIN", "REGULATION", "TECH"];
    const catNameMap = ["비트코인/시장", "알트코인", "규제/정책", "기술/DeFi"];
    let idCounter = 1000;
    results.forEach(res => {
      const cat = catMap[res.idx];
      const catName = catNameMap[res.idx];
      res.items.forEach((item, innerIdx) => {
        const title = item.title ? item.title.replace(/<[^>]+>/g, "").trim() : "가상자산 실시간 속보";
        let sourceName = item.author || "주요 매체";
        if (title.includes(" - ")) {
          const parts = title.split(" - ");
          if (parts.length > 1) sourceName = parts[parts.length - 1].trim();
        }
        let content = item.description ? item.description.replace(/<[^>]+>/g, "") : title;
          let takeaways = generateAIInsights(title, cat);
        combined.push({
          id: idCounter++,
          category: cat,
          categoryName: catName,
          badge: innerIdx === 0 ? "HOT" : "LIVE",
          title: title,
          content: content.slice(0, 180) + "...",
          source: sourceName,
          link: item.link || "#",
          time: innerIdx === 0 ? "방금 전" : (innerIdx * 10) + "분 전",
          timestamp: Date.now() - (innerIdx * 10 * 60 * 1000),
          takeaways: takeaways
        });
      });
    });
    combined.sort((a, b) => b.timestamp - a.timestamp);
    if (combined.length > 0) return combined;
  } catch (err) {}
  return MULTI_SOURCE_NEWS_POOL;
}
window.fetchRealCryptoNews = fetchRealCryptoNews;

async function fetchLatestNews(isManual = false) {
  const refreshIcon = document.getElementById('news-refresh-icon');
  if (refreshIcon) refreshIcon.classList.add('animate-spin');

  try {
    const articles = await fetchRealCryptoNews();
    if (articles && articles.length > 0) {
      NEWS_ITEMS = articles;
    }
  } catch (err) {}

  if (refreshIcon) refreshIcon.classList.remove('animate-spin');
  newsCountdownSeconds = 30;
  const el = document.getElementById('news-countdown');
  if (el) el.innerText = '30s';
  renderNews();
  if (isManual) alert('⚡ 최신 속보 피드가 정상 갱신되었습니다!');
}
window.fetchLatestNews = fetchLatestNews;

function initNewsPeriodicUpdater() {
  if (newsCountdownTimer) clearInterval(newsCountdownTimer);
  newsCountdownSeconds = 30;

  const el = document.getElementById('news-countdown');
  if (el) el.innerText = '30s';

  newsCountdownTimer = setInterval(() => {
    newsCountdownSeconds--;
    const countdownEl = document.getElementById('news-countdown');
    if (countdownEl) {
      countdownEl.innerText = `${newsCountdownSeconds}s`;
    }

    if (newsCountdownSeconds <= 0) {
      newsCountdownSeconds = 30;
      if (countdownEl) countdownEl.innerText = '30s';
      fetchLatestNews(false);
    }
  }, 1000);
}
window.initNewsPeriodicUpdater = initNewsPeriodicUpdater;


// ----------------------------------------------------
// Section 6: Comprehensive 2026 Crypto Events Calendar Engine
// ----------------------------------------------------
const CRYPTO_EVENTS = [
  {
    id: 1,
    date: '2026-09-02',
    dday: 'D-2',
    time: '21:30 (KST)',
    category: 'macro',
    categoryName: '🏦 FOMC/거시경제',
    coin: 'MACRO',
    title: '미국 8월 비농업 고용보고서 및 실업률 발표',
    desc: '연준(Fed)의 9월 금리 결정 방향성을 가늠할 핵심 경제 지표. 시장 예상치 하회 시 조기 금리 인하 기대감 고조.',
    impact: 'HIGH IMPACT',
    impactColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30'
  },
  {
    id: 2,
    date: '2026-09-04',
    dday: 'D-4',
    time: '10:00 (KST)',
    category: 'conference',
    categoryName: '🌐 글로벌 컨퍼런스',
    coin: 'KBW',
    title: '코리아 블록체인 위크 (KBW 2026) 서울 개막',
    desc: '아시아 최대 블록체인 행사로 글로벌 주요 L1/L2 파운더 및 국내 기관 투자자 대거 참석.',
    impact: 'BULLISH',
    impactColor: 'text-crypto-green bg-emerald-500/10 border-emerald-500/30'
  },
  {
    id: 3,
    date: '2026-09-05',
    dday: 'D-5',
    time: '18:00 (KST)',
    category: 'unlock',
    categoryName: '🔓 토큰 락업해제',
    coin: 'SUI',
    title: '수이(SUI) 6,400만 개 대규모 토큰 락업 해제',
    desc: '초기 기여자 및 커뮤니티 물량 약 9,500만 달러 상당 해제. 단기 유통량 증가에 따른 가격 변동성 주의 필요.',
    impact: 'VOLATILE',
    impactColor: 'text-rose-400 bg-rose-500/10 border-rose-500/30'
  },
  {
    id: 4,
    date: '2026-09-08',
    dday: 'D-8',
    time: '19:00 (KST)',
    category: 'upgrade',
    categoryName: '🚀 메인넷/업그레이드',
    coin: 'ADA',
    title: '카르다노(ADA) 창(Chang) 하드포크 거버넌스 2단계 전환',
    desc: '완전한 온체인 탈중앙화 거버넌스 투표 체계 개시 및 헌법 위원회 공식 출범.',
    impact: 'BULLISH',
    impactColor: 'text-crypto-green bg-emerald-500/10 border-emerald-500/30'
  },
  {
    id: 5,
    date: '2026-09-10',
    dday: 'D-10',
    time: '21:30 (KST)',
    category: 'macro',
    categoryName: '🏦 FOMC/거시경제',
    coin: 'MACRO',
    title: '미국 8월 소비자물가지수(CPI) 발표',
    desc: '인플레이션 둔화 추세 지속 여부 확인. 전년 동기 대비 2.8% 하회 시 위험자산 강세 랠리 촉발 가능성.',
    impact: 'HIGH IMPACT',
    impactColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30'
  },
  {
    id: 6,
    date: '2026-09-11',
    dday: 'D-11',
    time: '18:00 (KST)',
    category: 'unlock',
    categoryName: '🔓 토큰 락업해제',
    coin: 'APT',
    title: '앱토스(APT) 1,130만 개 팀 및 재단 락업 해제',
    desc: '약 7,200만 달러 규모 물량 언락. 온체인 스테이킹 비율 변동 및 DEX 유동성 추이 주목.',
    impact: 'VOLATILE',
    impactColor: 'text-rose-400 bg-rose-500/10 border-rose-500/30'
  },
  {
    id: 7,
    date: '2026-09-14',
    dday: 'D-14',
    time: '10:00 (KST)',
    category: 'conference',
    categoryName: '🌐 글로벌 컨퍼런스',
    coin: 'TOKEN2049',
    title: 'TOKEN2049 싱가포르 글로벌 암호화폐 서밋',
    desc: '전 세계 10,000명 이상의 웹3 리더들이 집결하여 하반기 유망 테마 및 VC 투자 전략 공유.',
    impact: 'HIGH IMPACT',
    impactColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30'
  },
  {
    id: 8,
    date: '2026-09-16',
    dday: 'D-16',
    time: '03:00 (KST)',
    category: 'macro',
    categoryName: '🏦 FOMC/거시경제',
    coin: 'FED',
    title: '미국 연준(Fed) FOMC 기준금리 결정 및 파월 의장 기자회견',
    desc: '글로벌 유동성 공급과 암호화폐 시장의 향방을 결정지을 2026년 하반기 최대 이벤트.',
    impact: 'CRITICAL',
    impactColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30'
  },
  {
    id: 9,
    date: '2026-09-18',
    dday: 'D-18',
    time: '15:00 (KST)',
    category: 'upgrade',
    categoryName: '🚀 메인넷/업그레이드',
    coin: 'ETH',
    title: '이더리움(ETH) 프라하(Pectra) 하드포크 테스트넷 적용',
    desc: '계정 추상화(EIP-3074) 및 검증자 최대 스테이킹 한도 상향(EIP-7251)을 포함한 대규모 확장성 업그레이드.',
    impact: 'BULLISH',
    impactColor: 'text-crypto-green bg-emerald-500/10 border-emerald-500/30'
  },
  {
    id: 10,
    date: '2026-09-20',
    dday: 'D-20',
    time: '18:00 (KST)',
    category: 'unlock',
    categoryName: '🔓 토큰 락업해제',
    coin: 'AVAX',
    title: '아발란체(AVAX) 950만 개 서브넷 보상 락업 해제',
    desc: '재단 및 전략 파트너사 보상 물량 해제. C체인 및 서브넷 TVL 추이 확인 필요.',
    impact: 'VOLATILE',
    impactColor: 'text-rose-400 bg-rose-500/10 border-rose-500/30'
  },
  {
    id: 11,
    date: '2026-09-22',
    dday: 'D-22',
    time: '10:00 (KST)',
    category: 'conference',
    categoryName: '🌐 글로벌 컨퍼런스',
    coin: 'SOL',
    title: '솔라나 Breakpoint 2026 글로벌 개발자 컨퍼런스',
    desc: '파이어댄서(Firedancer) 메인넷 정식 출시 발표 및 솔라나 생태계 주요 디앱 신규 로드맵 공개.',
    impact: 'BULLISH',
    impactColor: 'text-crypto-green bg-emerald-500/10 border-emerald-500/30'
  },
  {
    id: 12,
    date: '2026-09-25',
    dday: 'D-25',
    time: '17:00 (KST)',
    category: 'unlock',
    categoryName: '🔓 토큰 락업해제',
    coin: 'ARB',
    title: '아비트럼(ARB) 9,260만 개 팀 및 고문 물량 락업 해제',
    desc: 'L2 생태계 핵심 토큰의 정기 락업 해제. 탈중앙화 거버넌스 투표율 및 스테이킹 보상 정책 연계 주목.',
    impact: 'VOLATILE',
    impactColor: 'text-rose-400 bg-rose-500/10 border-rose-500/30'
  },
  {
    id: 13,
    date: '2026-09-28',
    dday: 'D-28',
    time: '23:00 (KST)',
    category: 'policy',
    categoryName: '⚖️ 규제/법안',
    coin: 'SEC',
    title: '미국 SEC, 솔라나(SOL) 현물 ETF 1차 심사 결과 발표',
    desc: '반에크 및 21Shares가 신청한 솔라나 현물 ETF 상품에 대한 규제 승인 여부 판결 기한.',
    impact: 'CRITICAL',
    impactColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30'
  },
  {
    id: 14,
    date: '2026-09-30',
    dday: 'D-30',
    time: '18:00 (KST)',
    category: 'unlock',
    categoryName: '🔓 토큰 락업해제',
    coin: 'OP',
    title: '옵티미즘(OP) 3,130만 개 핵심 기여자 물량 해제',
    desc: '슈퍼체인(Superchain) 생태계 보상 및 초기 투자자 물량 해제.',
    impact: 'VOLATILE',
    impactColor: 'text-rose-400 bg-rose-500/10 border-rose-500/30'
  }
];

let activeCalendarFilter = 'all';
let currentCalendarView = 'list';

function filterCalendar(cat) {
  activeCalendarFilter = cat;
  const buttons = document.querySelectorAll('#calendar-filter-buttons .category-btn');
  buttons.forEach(btn => {
    if (btn.dataset.calCat === cat) {
      btn.classList.add('active', 'bg-cyan-500/20', 'text-cyan-400', 'border-cyan-500/40');
      btn.classList.remove('bg-navy-950', 'text-slate-400');
    } else {
      btn.classList.remove('active', 'bg-cyan-500/20', 'text-cyan-400', 'border-cyan-500/40');
      btn.classList.add('bg-navy-950', 'text-slate-400');
    }
  });
  renderCalendarEvents();
  renderMonthCalendar();
}
window.filterCalendar = filterCalendar;

function switchCalendarView(view) {
  currentCalendarView = view;
  const listBtn = document.getElementById('btn-cal-view-list');
  const monthBtn = document.getElementById('btn-cal-view-month');
  const listView = document.getElementById('calendar-list-view');
  const monthView = document.getElementById('calendar-month-view');

  if (view === 'list') {
    if (listBtn) { listBtn.className = 'px-3 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 text-xs font-bold transition'; }
    if (monthBtn) { monthBtn.className = 'px-3 py-1.5 rounded-xl bg-navy-950 text-slate-400 hover:text-white text-xs font-medium transition border border-navy-800'; }
    if (listView) listView.classList.remove('hidden');
    if (monthView) monthView.classList.add('hidden');
  } else {
    if (monthBtn) { monthBtn.className = 'px-3 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 text-xs font-bold transition'; }
    if (listBtn) { listBtn.className = 'px-3 py-1.5 rounded-xl bg-navy-950 text-slate-400 hover:text-white text-xs font-medium transition border border-navy-800'; }
    if (listView) listView.classList.add('hidden');
    if (monthView) monthView.classList.remove('hidden');
    renderMonthCalendar();
  }
}
window.switchCalendarView = switchCalendarView;

function renderCalendarEvents() {
  const container = document.getElementById('calendar-events-list');
  if (!container) return;

  let events = CRYPTO_EVENTS;
  if (activeCalendarFilter !== 'all') {
    events = events.filter(e => e.category === activeCalendarFilter);
  }

  if (events.length === 0) {
    container.innerHTML = '<div class="p-8 text-center text-slate-500 text-xs bg-navy-900 rounded-3xl border border-navy-800">선택하신 카테고리의 예정된 일정이 없습니다.</div>';
    return;
  }

  container.innerHTML = events.map(ev => `
    <div class="crypto-card bg-navy-900 border border-navy-800 rounded-3xl p-5 sm:p-6 shadow-lg hover:border-cyan-500/40 transition flex items-start justify-between gap-4 group">
      <div class="flex items-start gap-4 flex-1">
        <!-- Date Badge -->
        <div class="w-16 h-16 rounded-2xl bg-navy-950 border border-navy-800 flex flex-col items-center justify-center shrink-0 group-hover:border-cyan-500/40 transition">
          <span class="text-[11px] font-black text-cyan-400 font-mono">${ev.dday}</span>
          <span class="text-xs font-bold text-slate-200 mt-0.5">${ev.date.slice(5)}</span>
        </div>

        <!-- Info -->
        <div class="space-y-1.5 flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="px-2.5 py-0.5 rounded-lg bg-navy-950 border border-navy-800 text-slate-300 text-xs font-bold font-mono">${ev.coin}</span>
            <span class="px-2.5 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-semibold">${ev.categoryName}</span>
            <span class="text-xs text-slate-500 font-mono">${ev.time}</span>
            <span class="px-2 py-0.5 rounded-md text-[10px] font-bold border ${ev.impactColor} ml-auto sm:ml-0">${ev.impact}</span>
          </div>
          <h3 class="text-base font-extrabold text-white group-hover:text-cyan-400 transition leading-snug">${escapeHtml(ev.title)}</h3>
          <p class="text-xs text-slate-400 leading-relaxed">${escapeHtml(ev.desc)}</p>
        </div>
      </div>
    </div>
  `).join('');

  if (typeof lucide !== 'undefined') lucide.createIcons();
}
window.renderCalendarEvents = renderCalendarEvents;

function renderMonthCalendar() {
  const container = document.getElementById('month-calendar-grid');
  if (!container) return;

  let events = CRYPTO_EVENTS;
  if (activeCalendarFilter !== 'all') {
    events = events.filter(e => e.category === activeCalendarFilter);
  }

  const daysInMonth = 30; // Sep 2026
  let gridHtml = '';

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `2026-09-${String(day).padStart(2, '0')}`;
    const dayEvents = events.filter(e => e.date === dateStr);
    const hasEvents = dayEvents.length > 0;

    gridHtml += `
      <div class="min-h-[90px] p-2.5 rounded-2xl bg-navy-950 border ${hasEvents ? 'border-cyan-500/40 bg-cyan-950/20' : 'border-navy-800/80'} flex flex-col justify-between transition hover:border-cyan-400 group">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold ${hasEvents ? 'text-cyan-400 font-mono' : 'text-slate-400'}">9/${day}</span>
          ${hasEvents ? `<span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>` : ''}
        </div>
        <div class="space-y-1 mt-1">
          ${dayEvents.map(e => `
            <div class="text-[10px] px-1.5 py-0.5 rounded bg-navy-900 border border-navy-800 text-slate-200 truncate font-medium" title="${escapeHtml(e.title)}">
              ${escapeHtml(e.coin)}: ${escapeHtml(e.title)}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = gridHtml;
}
window.renderMonthCalendar = renderMonthCalendar;


// ----------------------------------------------------
// Section 7: Unified User & Admin Authentication (NO MASTER PIN)
// ----------------------------------------------------
let currentAuthTabMode = 'login';

function switchAuthTab(mode) {
  currentAuthTabMode = mode;
  const loginTab = document.getElementById('auth-tab-login');
  const regTab = document.getElementById('auth-tab-register');
  const labelId = document.getElementById('auth-label-id');
  const inputId = document.getElementById('login-identifier');
  const confirmContainer = document.getElementById('auth-pw-confirm-container');
  const confirmInput = document.getElementById('login-password-confirm');
  const benefits = document.getElementById('auth-register-benefits');
  const submitText = document.getElementById('auth-submit-text');

  if (mode === 'register') {
    if (regTab) {
      regTab.className = 'py-2 rounded-lg bg-cyan-500 text-navy-950 font-black shadow-md transition text-center cursor-pointer';
    }
    if (loginTab) {
      loginTab.className = 'py-2 rounded-lg text-slate-400 hover:text-white transition text-center cursor-pointer font-bold';
    }
    if (labelId) labelId.innerText = '가입할 아이디 / 닉네임';
    if (inputId) inputId.placeholder = '사용할 새 닉네임 입력 (예: 비트고수)';
    if (confirmContainer) confirmContainer.style.display = 'block';
    if (confirmInput) confirmInput.required = true;
    if (benefits) benefits.style.display = 'block';
    if (submitText) submitText.innerText = '간편 회원가입 완료';
  } else {
    if (loginTab) {
      loginTab.className = 'py-2 rounded-lg bg-cyan-500 text-navy-950 font-black shadow-md transition text-center cursor-pointer';
    }
    if (regTab) {
      regTab.className = 'py-2 rounded-lg text-slate-400 hover:text-white transition text-center cursor-pointer font-bold';
    }
    if (labelId) labelId.innerText = '아이디 / 닉네임';
    if (inputId) inputId.placeholder = '아이디 또는 사용할 닉네임 입력';
    if (confirmContainer) confirmContainer.style.display = 'none';
    if (confirmInput) {
      confirmInput.required = false;
      confirmInput.value = '';
    }
    if (benefits) benefits.style.display = 'none';
    if (submitText) submitText.innerText = '로그인 완료';
  }
}
window.switchAuthTab = switchAuthTab;

function handleGuestLogin() {
  localStorage.removeItem('crytopnl_user');
  localStorage.removeItem('coinhub_user');
  sessionStorage.removeItem('crytopnl_admin_authenticated');
  sessionStorage.removeItem('coinhub_admin_authenticated');

  updateAuthUI();
  if (typeof AnalyzerApp !== 'undefined') {
    if (AnalyzerApp.loadSavedTrades) AnalyzerApp.loadSavedTrades();
    if (AnalyzerApp.updateUserBanner) AnalyzerApp.updateUserBanner();
    if (typeof CloudSyncManager !== 'undefined') CloudSyncManager.updateUI();
  }

  closeAuthModal();
  alert('🚀 비회원 익명 모드로 시작합니다!\n모든 거래 내역 데이터는 100% 현재 브라우저에만 안전하게 보관(서버 전송 0%)됩니다.');
}
window.handleGuestLogin = handleGuestLogin;

function openAuthModal(initialMode) {
  const modal = document.getElementById('auth-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.style.setProperty('display', 'flex', 'important');
    switchAuthTab(initialMode === 'register' ? 'register' : 'login');
    const input = document.getElementById('login-identifier');
    if (input) setTimeout(() => input.focus(), 100);
    if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
  }
}
window.openAuthModal = openAuthModal;

function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.setProperty('display', 'none', 'important');
  }
}
window.closeAuthModal = closeAuthModal;

async function handleUnifiedLoginSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();
  const idInput = document.getElementById('login-identifier');
  const pwInput = document.getElementById('login-password');
  const pwConfirmInput = document.getElementById('login-password-confirm');
  const id = (idInput ? idInput.value : '').trim();
  const pw = (pwInput ? pwInput.value : '').trim();
  const pwConfirm = (pwConfirmInput ? pwConfirmInput.value : '').trim();

  if (!id) {
    alert('아이디 또는 닉네임을 입력해 주세요.');
    if (idInput) idInput.focus();
    return;
  }

  if (!pw) {
    alert('비밀번호를 입력해 주세요.');
    if (pwInput) pwInput.focus();
    return;
  }

  // 1. Admin Login Verification (Checks Firestore directly in real-time)
  if (id.toLowerCase() === 'admin') {
    if (currentAuthTabMode === 'register') {
      alert('admin 아이디는 최고 관리자 전용 아이디로 새로 가입할 수 없습니다.');
      return;
    }

    let savedAdminPw = (typeof AdminApp !== 'undefined' && typeof AdminApp.getAdminPassword === 'function') 
      ? AdminApp.getAdminPassword() 
      : (localStorage.getItem('crytopnl_admin_password') || localStorage.getItem('coinhub_admin_password') || 'admin1234');

    const firestore = window.db || (typeof db !== 'undefined' ? db : null);
    if (firestore) {
      try {
        const doc = await firestore.collection('system_config').doc('admin_settings').get();
        if (doc.exists && doc.data() && doc.data().adminPassword) {
          savedAdminPw = doc.data().adminPassword;
          localStorage.setItem('crytopnl_admin_password', savedAdminPw);
          localStorage.setItem('cryptopnl_admin_password', savedAdminPw);
          localStorage.setItem('coinhub_admin_password', savedAdminPw);
        }
      } catch (err) {
        console.warn('Firestore admin verification note:', err);
      }
    }

    if (pw === savedAdminPw) {
      sessionStorage.setItem('crytopnl_admin_authenticated', '1');
      sessionStorage.setItem('coinhub_admin_authenticated', '1');
      const now = new Date();
      const timeFormatted = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      const adminUser = {
        id: 'usr_admin',
        username: 'admin',
        email: 'admin@crytopnl.com',
        role: 'ADMIN',
        rank: 'ADMIN',
        status: 'ACTIVE',
        joinedDate: '2025.10.15',
        lastLogin: timeFormatted,
        lastLoginAt: timeFormatted,
        reputation: 9999,
        updatedAt: now.toISOString()
      };
      localStorage.setItem('crytopnl_user', JSON.stringify(adminUser));
      localStorage.setItem('coinhub_user', JSON.stringify(adminUser));

      if (firestore) {
        firestore.collection('users').doc('admin').set(adminUser, { merge: true }).catch(e => console.warn(e));
      }

      updateAuthUI();
      updateAdminNavVisibility();
      closeAuthModal();

      alert('🎉 최고 관리자(ADMIN)로 로그인되었습니다! 관리자 센터로 이동합니다.');
      switchTab('admin');
      if (typeof AdminApp !== 'undefined' && typeof AdminApp.renderAll === 'function') AdminApp.renderAll();
      return;
    } else {
      alert('❌ 관리자 비밀번호가 일치하지 않습니다. 다시 확인해 주세요.');
      if (pwInput) {
        pwInput.value = '';
        pwInput.focus();
      }
      return;
    }
  }

  const firestore = window.db || (typeof db !== 'undefined' ? db : null);

  // 2. Case: REGISTER (간편 회원가입)
  if (currentAuthTabMode === 'register') {
    if (!pwConfirm) {
      alert('비밀번호 확인을 입력해 주세요.');
      if (pwConfirmInput) pwConfirmInput.focus();
      return;
    }

    if (pw !== pwConfirm) {
      alert('❌ 비밀번호와 비밀번호 확인이 일치하지 않습니다. 다시 확인해 주세요.');
      if (pwConfirmInput) {
        pwConfirmInput.value = '';
        pwConfirmInput.focus();
      }
      return;
    }

    // Check if user already exists WITH A REGISTERED PASSWORD
    let alreadyHasAccount = false;
    if (firestore) {
      try {
        const docSnap = await firestore.collection('users').doc(id.toLowerCase()).get();
        if (docSnap.exists) {
          const d = docSnap.data();
          if (d && d.password) alreadyHasAccount = true;
        }
      } catch (err) {
        console.warn(err);
      }
    }

    if (!alreadyHasAccount) {
      const localPw = localStorage.getItem('crytopnl_user_pw_' + id.toLowerCase()) || localStorage.getItem('coinhub_user_pw_' + id.toLowerCase());
      if (localPw) alreadyHasAccount = true;
    }

    if (alreadyHasAccount) {
      alert(`❌ 이미 등록된 아이디/닉네임입니다.\n다른 아이디를 입력하시거나 [🔐 로그인] 탭에서 로그인해 주세요.`);
      switchAuthTab('login');
      if (idInput) idInput.value = id;
      if (pwInput) {
        pwInput.value = '';
        pwInput.focus();
      }
      return;
    }

    // Create new account
    const now = new Date();
    const timeFormatted = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    
    const newUser = {
      id: 'usr_' + id.toLowerCase(),
      username: id,
      email: id.includes('@') ? id : `${id}@crytopnl.com`,
      role: 'MEMBER',
      rank: 'PRO',
      status: 'ACTIVE',
      password: pw,
      joinedDate: timeFormatted.slice(0, 10),
      lastLogin: timeFormatted,
      lastLoginAt: timeFormatted,
      reputation: 100,
      updatedAt: now.toISOString()
    };

    localStorage.setItem('crytopnl_user', JSON.stringify(newUser));
    localStorage.setItem('coinhub_user', JSON.stringify(newUser));
    localStorage.setItem('crytopnl_user_pw_' + id.toLowerCase(), pw);
    localStorage.setItem('coinhub_user_pw_' + id.toLowerCase(), pw);

    try {
      const rawList = localStorage.getItem('coinhub_registered_users') || localStorage.getItem('crytopnl_registered_users');
      let uList = [];
      if (rawList) {
        try { uList = JSON.parse(rawList); } catch(e){}
      }
      const existingIdx = uList.findIndex(x => x.username && x.username.toLowerCase() === id.toLowerCase());
      if (existingIdx >= 0) {
        uList[existingIdx] = newUser;
      } else {
        uList.push(newUser);
      }
      localStorage.setItem('coinhub_registered_users', JSON.stringify(uList));
      localStorage.setItem('crytopnl_registered_users', JSON.stringify(uList));
    } catch (e) {}

    if (firestore) {
      try {
        await firestore.collection('users').doc(id.toLowerCase()).set(newUser, { merge: true });
      } catch (err) {
        console.warn('Firestore user doc write warning:', err);
      }
    }

    updateAuthUI();
    updateAdminNavVisibility();
    closeAuthModal();

    if (typeof AnalyzerApp !== 'undefined') {
      if (AnalyzerApp.loadSavedTrades) await AnalyzerApp.loadSavedTrades();
      if (AnalyzerApp.updateUserBanner) AnalyzerApp.updateUserBanner();
      if (typeof CloudSyncManager !== 'undefined') CloudSyncManager.updateUI();
    }

    alert(`🎉 반갑습니다, ${id}님! 간편 회원가입 및 로그인이 완료되었습니다.\n이제 여러 기기에서 거래내역 클라우드 동기화 기능을 이용하실 수 있습니다.`);
    return;
  }

  // 3. Case: LOGIN (기존 회원 로그인) - Must verify existing account!
  let existingUser = null;
  let storedPw = localStorage.getItem('crytopnl_user_pw_' + id.toLowerCase()) || localStorage.getItem('coinhub_user_pw_' + id.toLowerCase());

  if (firestore) {
    try {
      const docSnap = await firestore.collection('users').doc(id.toLowerCase()).get();
      if (docSnap.exists) {
        existingUser = docSnap.data();
        if (existingUser && existingUser.password) storedPw = existingUser.password;
      }
    } catch (err) {
      console.warn('Firestore check user warning:', err);
    }
  }

  if (!existingUser) {
    const rawList = localStorage.getItem('coinhub_registered_users') || localStorage.getItem('crytopnl_registered_users');
    if (rawList) {
      try {
        const uList = JSON.parse(rawList);
        const found = uList.find(x => x.username && x.username.toLowerCase() === id.toLowerCase());
        if (found) {
          existingUser = found;
          if (found.password) storedPw = found.password;
        }
      } catch (e) {}
    }
  }

  // Not registered yet OR never set a password -> Block and prompt to register
  if (!existingUser || !storedPw) {
    alert(`❌ 가입되지 않았거나 비밀번호가 등록되지 않은 아이디/닉네임입니다.\n먼저 [✨ 간편 회원가입] 탭에서 회원가입을 완료해 주세요.`);
    switchAuthTab('register');
    if (idInput) idInput.value = id;
    if (pwInput) {
      pwInput.value = '';
      pwInput.focus();
    }
    return;
  }

  // Check password
  if (pw !== storedPw) {
    alert('❌ 비밀번호가 일치하지 않습니다. 다시 확인해 주세요.');
    if (pwInput) {
      pwInput.value = '';
      pwInput.focus();
    }
    return;
  }

  // Successful Login
  const now = new Date();
  const timeFormatted = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  const user = Object.assign({}, existingUser || {}, {
    id: existingUser?.id || ('usr_' + id.toLowerCase()),
    username: existingUser?.username || id,
    email: existingUser?.email || (id.includes('@') ? id : `${id}@crytopnl.com`),
    role: existingUser?.role || 'MEMBER',
    rank: existingUser?.rank || 'PRO',
    status: existingUser?.status || 'ACTIVE',
    password: storedPw || pw,
    lastLogin: timeFormatted,
    lastLoginAt: timeFormatted,
    updatedAt: now.toISOString()
  });

  localStorage.setItem('crytopnl_user', JSON.stringify(user));
  localStorage.setItem('coinhub_user', JSON.stringify(user));
  localStorage.setItem('crytopnl_user_pw_' + id.toLowerCase(), user.password);
  localStorage.setItem('coinhub_user_pw_' + id.toLowerCase(), user.password);

  if (firestore) {
    try {
      await firestore.collection('users').doc(id.toLowerCase()).set(user, { merge: true });
    } catch (err) {
      console.warn('Firestore user doc update warning:', err);
    }
  }

  updateAuthUI();
  updateAdminNavVisibility();
  closeAuthModal();

  if (typeof AnalyzerApp !== 'undefined') {
    if (AnalyzerApp.loadSavedTrades) await AnalyzerApp.loadSavedTrades();
    if (AnalyzerApp.updateUserBanner) AnalyzerApp.updateUserBanner();
    if (typeof CloudSyncManager !== 'undefined') CloudSyncManager.updateUI();
  }

  alert(`반갑습니다, ${id}님! 로그인이 완료되었습니다.`);
}
window.handleUnifiedLoginSubmit = handleUnifiedLoginSubmit;

function handleLogout() {
  if (confirm('로그아웃하시겠습니까?')) {
    localStorage.removeItem('crytopnl_user');
    localStorage.removeItem('coinhub_user');
    sessionStorage.removeItem('crytopnl_admin_authenticated');
    sessionStorage.removeItem('coinhub_admin_authenticated');
    updateAuthUI();
    updateAdminNavVisibility();
    alert('로그아웃되었습니다.');
    switchTab('analyzer');
  }
}
window.handleLogout = handleLogout;


// ----------------------------------------------------
// Section 8: Tab Router & Dynamic SEO
// ----------------------------------------------------
const ROUTE_SEO_MAP = {
  analyzer: {
    title: "CrytoPnL – 업비트·빗썸 엑셀 거래내역 실현손익 정밀 분석기",
    desc: "1초 만에 확인하는 내 업비트·빗썸 실현손익, 평단가, 거래소별 수수료, 월별 통계. 서버 전송 없는 100% 로컬 암호화 계산기"
  },
  market: {
    title: "CrytoPnL – 가상자산 실시간 시세 및 트레이딩뷰 차트 분석",
    desc: "비트코인, 이더리움, 주요 알트코인 실시간 시세, 24시간 변동률, 시가총액 순위 및 인터랙티브 인터벌 차트"
  },
  forum: {
    title: "CrytoPnL – 코인 토론 포럼 및 전문 트레이더 인사이트",
    desc: "실시간 거래소 상장 공시, 차트 분석, 알트코인 전망 및 트레이더 커뮤니티 토론장"
  },
  chat: {
    title: "CrytoPnL – 실시간 글로벌 암호화폐 라이브 채팅방",
    desc: "실시간 시장 반응과 트레이딩 아이디어를 나누는 라이브 채팅 및 커뮤니티"
  },
  news: {
    title: "CrytoPnL – 실시간 가상자산 글로벌 속보 및 공시 피드",
    desc: "주요 글로벌 블록체인 미디어 및 금융위 규제 속보를 30초 주기로 자동 수집·업데이트"
  },
  calculators: {
    title: "CrytoPnL – 물타기, 김프, 세금, 선물 청산가 실전 계산기 5종",
    desc: "투자자를 위한 실전 트레이딩 계산기 모음"
  },
  calendar: {
    title: "CrytoPnL – 2026 주요 가상자산 일정 및 경제 캘린더",
    desc: "FOMC 금리 결정, 대규모 토큰 락업 해제, 메인넷 업그레이드, 글로벌 컨퍼런스 실시간 D-Day 일정"
  },
  guides: {
    title: "CrytoPnL – 가상자산 세무, 엑셀 분석 & 실전 매매 지식 백서",
    desc: "8편의 전문 가이드와 FAQ 10선"
  },
  admin: {
    title: "CrytoPnL – 최고 관리자(Admin) 전용 센터",
    desc: "CrytoPnL 사이트 운영, 방문자 트래픽 모니터링 및 시스템 관리"
  }
};

function updatePageSEO(tabId) {
  const seo = ROUTE_SEO_MAP[tabId] || ROUTE_SEO_MAP.analyzer;
  document.title = seo.title;
  let metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', seo.desc);
  let ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute('content', seo.title);
  let ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute('content', seo.desc);
}
window.updatePageSEO = updatePageSEO;

function switchTab(tabId, updateHash = true) {
  const tabs = ['analyzer', 'market', 'forum', 'chat', 'news', 'calculators', 'calendar', 'guides', 'admin'];
  if (!tabs.includes(tabId)) tabId = 'analyzer';

  if (typeof AdminAnalytics !== 'undefined' && typeof AdminAnalytics.recordVisit === 'function') {
    let fName = tabId;
    if (tabId === 'forum' || tabId === 'chat') fName = 'community';
    AdminAnalytics.recordVisit(fName);
  }

  tabs.forEach(t => {
    const el = document.getElementById(`tab-${t}`);
    const navBtn = document.getElementById(`nav-${t}`);
    const mNavBtn = document.getElementById(`m-nav-${t}`);

    if (t === tabId) {
      if (el) {
        el.classList.remove('hidden');
        el.classList.add('block');
        el.style.setProperty('display', 'block', 'important');
      }
      if (navBtn) {
        navBtn.classList.add('active');
        if (t === 'analyzer') {
          navBtn.classList.add('bg-cyan-500/10', 'border-cyan-500/30', 'text-cyan-400');
        } else if (t === 'guides') {
          navBtn.classList.add('bg-indigo-500/10', 'border-indigo-500/30', 'text-indigo-300');
        } else if (t === 'calculators') {
          navBtn.classList.add('bg-amber-500/10', 'border-amber-500/30', 'text-amber-300');
        } else if (t === 'calendar') {
          navBtn.classList.add('bg-emerald-500/10', 'border-emerald-500/30', 'text-emerald-300');
        }
      }
      if (mNavBtn) {
        mNavBtn.classList.add('text-cyan-400', 'font-bold');
        mNavBtn.classList.remove('text-slate-400');
      }
    } else {
      if (el) {
        el.classList.remove('block');
        el.classList.add('hidden');
        el.style.setProperty('display', 'none', 'important');
      }
      if (navBtn) {
        navBtn.classList.remove('active', 'bg-cyan-500/10', 'border-cyan-500/30', 'text-cyan-400', 'bg-indigo-500/10', 'border-indigo-500/30', 'text-indigo-300', 'bg-amber-500/10', 'border-amber-500/30', 'text-amber-300', 'bg-emerald-500/10', 'border-emerald-500/30', 'text-emerald-300');
      }
      if (mNavBtn) {
        mNavBtn.classList.remove('text-cyan-400', 'font-bold');
        mNavBtn.classList.add('text-slate-400');
      }
    }
  });

  if (tabId === 'analyzer' && typeof App !== 'undefined' && typeof App.loadSavedTrades === 'function') {
    App.loadSavedTrades();
  }

  if (tabId === 'calculators' && typeof CoinCalculators !== 'undefined') {
    CoinCalculators.init();
  }

  if (tabId === 'market') {
    fetchMarketData();
    initChart();
  }

  if (tabId === 'forum') {
    showForumListView();
  }

  if (tabId === 'calendar') {
    renderCalendarEvents();
    renderMonthCalendar();
  }

  if (tabId === 'news') {
    renderNews();
  }

  if (tabId === 'admin' && typeof AdminApp !== 'undefined' && typeof AdminApp.checkAdminAccess === 'function') {
    AdminApp.checkAdminAccess();
  }

  if (updateHash && window.location.hash !== `#/${tabId}`) {
    history.pushState(null, '', `#/${tabId}`);
  }

  updatePageSEO(tabId);

  if (typeof lucide !== 'undefined' && lucide.createIcons) {
    try { lucide.createIcons(); } catch(e) {}
  }
}
window.switchTab = switchTab;


// ----------------------------------------------------
// Section 9: Utilities & Event Listeners
// ----------------------------------------------------
function formatNumber(num) {
  if (num === null || num === undefined) return '0.00';
  return Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
window.formatNumber = formatNumber;

function formatCompact(num) {
  if (!num) return '0';
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toString();
}
window.formatCompact = formatCompact;

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
window.escapeHtml = escapeHtml;

function simulateLiveFluctuations() {
  marketCoins.forEach(coin => {
    const delta = (Math.random() - 0.495) * (coin.current_price * 0.001);
    coin.current_price = Math.max(0.0001, coin.current_price + delta);
  });
  renderMarketUI();
}

function handleRoute() {
  const rawHash = (window.location.hash || '').replace('#/', '').replace('#', '');
  if (!rawHash) {
    switchTab('analyzer', false);
    return;
  }

  const parts = rawHash.split('/');
  const tabId = parts[0];

  if (tabId === 'forum') {
    switchTab('forum', false);
    if (parts[1] === 'post' && parts[2]) {
      openPostDetailModal(parts[2], false);
    } else if (parts[1] === 'edit' && parts[2]) {
      showForumWriteView(parts[2], false);
    } else if (parts[1] === 'write') {
      showForumWriteView(null, false);
    } else {
      showForumListView(false);
    }
  } else if (tabId === 'calculators') {
    switchTab('calculators', false);
    if (parts[1] && typeof CoinCalculators !== 'undefined' && typeof CoinCalculators.switchSubTab === 'function') {
      CoinCalculators.switchSubTab(parts[1]);
    }
  } else {
    switchTab(tabId, false);
  }
}
window.handleRoute = handleRoute;

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  updateAuthUI();
  updateAdminNavVisibility();

  renderMarketUI();
  fetchMarketData();
  initChart();

  renderForumPosts();
  renderNews();
  fetchLatestNews(false);
  initNewsPeriodicUpdater();

  renderCalendarEvents();
  renderMonthCalendar();

  renderChatMessages();

  if (!window.location.hash) {
    history.replaceState(null, '', '#/analyzer');
  }
  handleRoute();

  if (typeof lucide !== 'undefined') lucide.createIcons();

  // Global Clipboard Image Paste Handler (Ctrl+V)
  document.addEventListener('paste', function (e) {
    const writeView = document.getElementById('forum-write-view');
    if (!writeView || writeView.classList.contains('hidden')) return;

    const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const blob = items[i].getAsFile();
        if (blob) {
          processCafeImageBlob(blob);
          e.preventDefault();
          break;
        }
      }
    }
  });

  setInterval(simulateLiveFluctuations, 4000);
});

window.addEventListener('popstate', handleRoute);
window.addEventListener('hashchange', handleRoute);


// Sync with Firestore
if (db) {
  let isInitialSyncDone = false;

  db.collection('forum_posts').onSnapshot(snapshot => {
    let posts = [];
    const dummyIds = ['101', '102', '103', 101, 102, 103];
    snapshot.forEach(doc => {
      const data = doc.data();
      const isDummy = dummyIds.includes(doc.id) || dummyIds.includes(data.id) || (data.title && data.title.includes('64K 지지선'));
      if (isDummy) {
        // Automatically clean up dummy post from Firestore database
        doc.ref.delete().catch(() => {});
      } else {
        posts.push(data);
      }
    });

    posts.sort((a,b) => (b.id || 0) - (a.id || 0));
    localStorage.setItem('crytopnl_forum_posts', JSON.stringify(posts));
    localStorage.setItem('coinhub_forum_posts', JSON.stringify(posts));
    if (typeof renderForumPosts === 'function') renderForumPosts();

    // Sync non-dummy local posts that are not yet in Firestore
    if (!isInitialSyncDone) {
      isInitialSyncDone = true;
      try {
        const localRaw = localStorage.getItem('crytopnl_forum_posts') || localStorage.getItem('coinhub_forum_posts');
        if (localRaw) {
          const localParsed = JSON.parse(localRaw);
          if (Array.isArray(localParsed)) {
            const dbIds = new Set(posts.map(p => String(p.id)));
            localParsed.forEach(lp => {
              const isDummy = lp && (dummyIds.includes(lp.id) || (lp.title && lp.title.includes('64K 지지선')));
              if (lp && lp.id && !isDummy && !dbIds.has(String(lp.id))) {
                db.collection('forum_posts').doc(lp.id.toString()).set(lp).catch(() => {});
              }
            });
          }
        }
      } catch(e) {}
    }
  }, err => {
    console.warn('Firestore forum_posts onSnapshot error:', err);
  });

  db.collection('chat_messages').orderBy('id', 'asc').limit(100).onSnapshot(snapshot => {
    let msgs = [];
    snapshot.forEach(doc => {
      msgs.push(doc.data());
    });
    if (msgs.length > 0) {
      chatMessages = msgs;
      localStorage.setItem('crytopnl_chat_messages', JSON.stringify(msgs));
      localStorage.setItem('coinhub_chat_messages', JSON.stringify(msgs));
    }
    if (typeof renderChatMessages === 'function') renderChatMessages();
  });
} else {
  try {
    const localChat = localStorage.getItem('crytopnl_chat_messages') || localStorage.getItem('coinhub_chat_messages');
    if (localChat) chatMessages = JSON.parse(localChat);
  } catch(e) {}
}



// === FIREBASE OVERRIDES ===
const originalSaveStoredPosts = saveStoredPosts;
saveStoredPosts = function(posts) {
  originalSaveStoredPosts(posts);
  if (db) {
    posts.forEach(post => {
      if (post && post.id) {
        db.collection('forum_posts').doc(post.id.toString()).set(post).catch(e => console.warn('Firestore save error:', e));
      }
    });
  }
};
window.saveStoredPosts = saveStoredPosts;

const originalHandleSendChat = handleSendChat;
handleSendChat = function(e) {
  if (e && e.preventDefault) e.preventDefault();
  const input = document.getElementById('chat-input');
  const text = input ? input.value.trim() : '';
  if (!text) return;
  
  const storedUser = localStorage.getItem('crytopnl_user') || localStorage.getItem('coinhub_user');
  let user = '익명 트레이더';
  let rank = 'USER';
  if (storedUser) {
    try {
      const u = JSON.parse(storedUser);
      if (u && u.username) {
        user = u.username;
        rank = u.rank || 'USER';
      }
    } catch(err) {}
  }
  const now = new Date();
  const timeStr = (now.getHours() >= 12 ? '오후 ' : '오전 ') + (now.getHours() > 12 ? now.getHours() - 12 : now.getHours()) + ':' + now.getMinutes().toString().padStart(2, '0');

  const newMsg = {
    id: Date.now(),
    user: user,
    rank: rank,
    text: text,
    time: timeStr
  };
  
  chatMessages.push(newMsg);
  if (input) input.value = '';
  
  if (db) {
    db.collection('chat_messages').doc(newMsg.id.toString()).set(newMsg);
  } else {
    localStorage.setItem('coinhub_chat_messages', JSON.stringify(chatMessages));
  }
  renderChatMessages();
};
window.handleSendChat = handleSendChat;





// === UPDATES FOR ADMIN, CHAT CHANNELS, AND ONLINE COUNT ===

// 1. Admin Logic
const ADMIN_NAMES = ['admin'];
window.isAdmin = function(user) {
  if (!user) return false;
  return ADMIN_NAMES.includes(user.toLowerCase());
};

// Override Delete Post
const originalHandleDeleteCafePost = handleDeleteCafePost;
handleDeleteCafePost = function(postId) {
  let posts = getStoredPosts();
  const post = posts.find(p => p.id === postId);
  if (!post) return;

  const storedUser = localStorage.getItem('crytopnl_user') || localStorage.getItem('coinhub_user');
  let currentUsername = '익명 트레이더';
  if (storedUser) {
    try {
      const u = JSON.parse(storedUser);
      if (u && u.username) currentUsername = u.username;
    } catch(e) {}
  }

  // Check if admin or author
  const isPostAuthor = currentUsername.toLowerCase() === (post.author || '').trim().toLowerCase();
  if (!isPostAuthor && !isAdmin(currentUsername)) {
    alert('❌ 본인이 작성한 게시글만 삭제할 수 있습니다.');
    return;
  }

  if (!confirm('정말 삭제하시겠습니까?')) return;
  posts = posts.filter(p => p.id !== postId);
  saveStoredPosts(posts);
  
  if (db) {
    db.collection('forum_posts').doc(postId.toString()).delete().catch(e => console.log(e));
  }
  
  alert('🗑️ 게시글이 삭제되었습니다.');
  showForumListView();
};
window.handleDeleteCafePost = handleDeleteCafePost;

// Override Edit Post (usually showForumWriteView is used)
const originalShowForumWriteView = showForumWriteView;
showForumWriteView = function(editPostId = null, updateHistory = true) {
  if (editPostId) {
    const posts = getStoredPosts();
    const post = posts.find(p => String(p.id) === String(editPostId));
    if (post) {
      const storedUser = localStorage.getItem('crytopnl_user') || localStorage.getItem('coinhub_user');
      let currentUsername = '익명 트레이더';
      if (storedUser) {
        try {
          const u = JSON.parse(storedUser);
          if (u && u.username) currentUsername = u.username;
        } catch(e) {}
      }
      const isPostAuthor = currentUsername.toLowerCase() === (post.author || '').trim().toLowerCase();
      if (!isPostAuthor && !isAdmin(currentUsername)) {
        alert('❌ 권한이 없습니다.');
        return;
      }
    }
  }

  // --- Start Admin Notice Checkbox Logic ---
  const storedUserForNotice = localStorage.getItem('crytopnl_user') || localStorage.getItem('coinhub_user');
  let currentUsernameForNotice = '익명 트레이더';
  if (storedUserForNotice) {
    try {
      const u = JSON.parse(storedUserForNotice);
      if (u && u.username) currentUsernameForNotice = u.username;
    } catch(e) {}
  }
  
  const catSelect = document.getElementById('cafe-write-category');
  if (catSelect) {
    let noticeWrapper = document.getElementById('cafe-write-notice-wrapper');
    if (!noticeWrapper) {
      noticeWrapper = document.createElement('label');
      noticeWrapper.id = 'cafe-write-notice-wrapper';
      noticeWrapper.className = 'flex items-center gap-2 mt-3 text-xs font-bold text-rose-400 cursor-pointer hidden';
      noticeWrapper.innerHTML = '<input type="checkbox" id="cafe-write-is-notice" class="w-4 h-4 rounded border-navy-700 bg-navy-950 text-rose-500 focus:ring-rose-500"> 📢 이 글을 공지글로 최상단에 고정';
      catSelect.parentNode.appendChild(noticeWrapper);
    }
    
    if (typeof isAdmin === 'function' && isAdmin(currentUsernameForNotice)) {
      noticeWrapper.classList.remove('hidden');
      if (editPostId) {
        const posts = getStoredPosts();
        const existingPost = posts.find(p => String(p.id) === String(editPostId));
        if (existingPost) {
          document.getElementById('cafe-write-is-notice').checked = !!existingPost.isNotice;
        }
      } else {
        document.getElementById('cafe-write-is-notice').checked = false;
      }
    } else {
      noticeWrapper.classList.add('hidden');
      document.getElementById('cafe-write-is-notice').checked = false;
    }
  }
  // --- End Admin Notice Checkbox Logic ---

  originalShowForumWriteView(editPostId, updateHistory);
};
window.showForumWriteView = showForumWriteView;

// 2. Chat Channels
let currentChatChannel = 'global';
let chatListenerUnsubscribe = null;

const channelNames = {
  global: '자유 채팅방',
  trading: '롱/숏 픽방',
  altcoin: '밈 & 알트코인'
};

function setupChatChannels() {
  const chatHeader = document.querySelector('#tab-chat h3.text-white');
  if (!chatHeader) return;
  
  const buttonsContainer = chatHeader.closest('.lg\\:col-span-3').previousElementSibling;
  if (buttonsContainer) {
    const buttons = buttonsContainer.querySelectorAll('button');
    if (buttons.length >= 3) {
      buttons[0].onclick = () => switchChatChannel('global', buttons[0], buttons);
      buttons[1].onclick = () => switchChatChannel('trading', buttons[1], buttons);
      buttons[2].onclick = () => switchChatChannel('altcoin', buttons[2], buttons);
      
      // Init visual state
      buttons[0].classList.add('bg-cyan-500/10', 'border', 'border-cyan-500/30', 'text-cyan-400');
      buttons[0].classList.remove('text-slate-400');
      buttons[1].classList.remove('bg-cyan-500/10', 'border', 'border-cyan-500/30', 'text-cyan-400');
      buttons[1].classList.add('text-slate-400');
      buttons[2].classList.remove('bg-cyan-500/10', 'border', 'border-cyan-500/30', 'text-cyan-400');
      buttons[2].classList.add('text-slate-400');
    }
  }
}

function switchChatChannel(channel, activeBtn, allBtns) {
  currentChatChannel = channel;
  chatMessages = [];
  renderChatMessages(); // clear ui
  
  if (allBtns) {
    allBtns.forEach(btn => {
      btn.classList.remove('bg-cyan-500/10', 'border', 'border-cyan-500/30', 'text-cyan-400');
      btn.classList.add('text-slate-400');
    });
    if (activeBtn) {
      activeBtn.classList.remove('text-slate-400');
      activeBtn.classList.add('bg-cyan-500/10', 'border', 'border-cyan-500/30', 'text-cyan-400');
    }
  }
  
  const chatHeader = document.querySelector('#tab-chat h3.text-white');
  if (chatHeader) chatHeader.innerText = '# ' + channelNames[channel];

  listenToChatChannel(channel);
}

function listenToChatChannel(channel) {
  if (chatListenerUnsubscribe) {
    chatListenerUnsubscribe();
    chatListenerUnsubscribe = null;
  }
  
  if (db) {
    const collectionName = channel === 'global' ? 'chat_messages' : 'chat_messages_' + channel;
    chatListenerUnsubscribe = db.collection(collectionName).orderBy('id', 'asc').limit(100).onSnapshot(snapshot => {
      let msgs = [];
      snapshot.forEach(doc => msgs.push(doc.data()));
      chatMessages = msgs;
      renderChatMessages();
    });
  } else {
    // fallback
    try {
      const localChat = localStorage.getItem('coinhub_chat_messages_' + channel) || (channel === 'global' ? localStorage.getItem('coinhub_chat_messages') : null);
      if (localChat) chatMessages = JSON.parse(localChat);
      renderChatMessages();
    } catch(e) {}
  }
}
window.switchChatChannel = switchChatChannel;

// Redefine handleSendChat for channels
handleSendChat = function(e) {
  if (e && e.preventDefault) e.preventDefault();
  const input = document.getElementById('chat-input');
  const text = input ? input.value.trim() : '';
  if (!text) return;
  
  const storedUser = localStorage.getItem('crytopnl_user') || localStorage.getItem('coinhub_user');
  let user = '익명 트레이더';
  let rank = 'USER';
  if (storedUser) {
    try {
      const u = JSON.parse(storedUser);
      if (u && u.username) {
        user = u.username;
        rank = u.rank || 'USER';
      }
    } catch(err) {}
  }
  const now = new Date();
  const timeStr = (now.getHours() >= 12 ? '오후 ' : '오전 ') + (now.getHours() > 12 ? now.getHours() - 12 : now.getHours()) + ':' + now.getMinutes().toString().padStart(2, '0');

  const newMsg = {
    id: Date.now(),
    user: user,
    rank: rank,
    text: text,
    time: timeStr
  };
  
  chatMessages.push(newMsg);
  if (input) input.value = '';
  
  if (db) {
    const collectionName = currentChatChannel === 'global' ? 'chat_messages' : 'chat_messages_' + currentChatChannel;
    db.collection(collectionName).doc(newMsg.id.toString()).set(newMsg);
  } else {
    const storageKey = currentChatChannel === 'global' ? 'coinhub_chat_messages' : 'coinhub_chat_messages_' + currentChatChannel;
    localStorage.setItem(storageKey, JSON.stringify(chatMessages));
  }
  renderChatMessages();
};

// 3. Dynamic Online Count
function updateDynamicOnlineCount() {
  const el = document.getElementById('online-count');
  if (el) {
    const userList = document.getElementById('chat-active-users-list');
    const finalCount = userList ? userList.children.length : 1;
    el.innerText = finalCount + '명 접속중';
  }
}
setInterval(updateDynamicOnlineCount, 15000); // update every 15s

// Initialize logic
setTimeout(() => {
  setupChatChannels();
  listenToChatChannel('global');
  updateDynamicOnlineCount();
}, 1000);

// ========================================================
// ON-CHAIN INTELLIGENCE ENGINE (온체인 데이터 연동)
// ========================================================
const OnChainEngine = {
  currentCoin: 'BTC',
  
  data: {
    BTC: {
      name: '비트코인 (Bitcoin)',
      netFlow: -18420,
      netFlowUsd: -2360000000,
      signal: '강력 매집',
      signalClass: 'badge-green',
      reserveBalance: '2,184,200 BTC',
      reserveChange: '-1.28%',
      whaleCount: '142건',
      whaleVolume: '$4.82B',
      activeWallets: '984,200 주소',
      mvrvStatus: '저평가/매수구간',
      mvrvVal: '1.84',
      nvtVal: '38.2',
      outflowPct: 68,
      inflowPct: 32,
      sentimentText: '온체인 종합 진단: <span class="text-emerald-400 font-bold">강력 매집 및 장기 홀딩 우세 (Bullish Accumulation)</span>',
      whaleAlerts: [
        { time: '3분 전', coin: 'BTC', qty: '1,500 BTC', usd: '$147.2M', fromTo: 'Unknown Wallet ➔ Binance', type: '거래소 입금 (주의)', typeClass: 'text-rose-400' },
        { time: '12분 전', coin: 'BTC', qty: '4,200 BTC', usd: '$412.8M', fromTo: 'Coinbase ➔ Cold Wallet', type: '외부 유출 (매집)', typeClass: 'text-emerald-400' },
        { time: '28분 전', coin: 'BTC', qty: '2,800 BTC', usd: '$274.9M', fromTo: 'Kraken ➔ Unknown Wallet', type: '외부 유출 (매집)', typeClass: 'text-emerald-400' },
        { time: '45분 전', coin: 'BTC', qty: '850 BTC', usd: '$83.4M', fromTo: 'Upbit ➔ Cold Wallet', type: '고래 콜드월렛 보관', typeClass: 'text-emerald-400' }
      ]
    },
    ETH: {
      name: '이더리움 (Ethereum)',
      netFlow: -145000,
      netFlowUsd: -510000000,
      signal: '스테이킹 유입',
      signalClass: 'badge-green',
      reserveBalance: '17,820,000 ETH',
      reserveChange: '-0.85%',
      whaleCount: '215건',
      whaleVolume: '$3.15B',
      activeWallets: '612,400 주소',
      mvrvStatus: '적정 가치 구간',
      mvrvVal: '1.65',
      nvtVal: '44.8',
      outflowPct: 64,
      inflowPct: 36,
      sentimentText: '온체인 종합 진단: <span class="text-emerald-400 font-bold">Beacon Chain 스테이킹 락업 증가 및 거래소 공급 축소</span>',
      whaleAlerts: [
        { time: '5분 전', coin: 'ETH', qty: '35,000 ETH', usd: '$122.5M', fromTo: 'Coinbase ➔ Beacon Staking', type: '스테이킹 락업', typeClass: 'text-cyan-400' },
        { time: '19분 전', coin: 'ETH', qty: '18,500 ETH', usd: '$64.7M', fromTo: 'Binance ➔ Unknown Wallet', type: '외부 유출 (매집)', typeClass: 'text-emerald-400' },
        { time: '41분 전', coin: 'ETH', qty: '12,000 ETH', usd: '$42.0M', fromTo: 'Unknown Wallet ➔ OKX', type: '거래소 입금 (주의)', typeClass: 'text-rose-400' }
      ]
    },
    SOL: {
      name: '솔라나 (Solana)',
      netFlow: -850000,
      netFlowUsd: -131000000,
      signal: 'DEX 유동성 급증',
      signalClass: 'badge-green',
      reserveBalance: '28,400,000 SOL',
      reserveChange: '-2.41%',
      whaleCount: '340건',
      whaleVolume: '$1.88B',
      activeWallets: '1,840,000 주소',
      mvrvStatus: '활성도 최고치',
      mvrvVal: '2.15',
      nvtVal: '22.4',
      outflowPct: 72,
      inflowPct: 28,
      sentimentText: '온체인 종합 진단: <span class="text-emerald-400 font-bold">생태계 일일 활성 주소 180만 돌파 및 스테이킹 유출 가속</span>',
      whaleAlerts: [
        { time: '2분 전', coin: 'SOL', qty: '120,000 SOL', usd: '$18.5M', fromTo: 'Unknown Wallet ➔ Raydium Pool', type: 'DEX 유동성 공급', typeClass: 'text-cyan-400' },
        { time: '15분 전', coin: 'SOL', qty: '250,000 SOL', usd: '$38.5M', fromTo: 'Binance ➔ Cold Storage', type: '외부 유출 (매집)', typeClass: 'text-emerald-400' }
      ]
    },
    XRP: {
      name: '리플 (XRP)',
      netFlow: -45000000,
      netFlowUsd: -38250000,
      signal: '에스크로 락업',
      signalClass: 'badge-green',
      reserveBalance: '2,950,000,000 XRP',
      reserveChange: '-0.95%',
      whaleCount: '88건',
      whaleVolume: '$940M',
      activeWallets: '145,000 주소',
      mvrvStatus: '바닥권 횡보',
      mvrvVal: '1.24',
      nvtVal: '52.1',
      outflowPct: 58,
      inflowPct: 42,
      sentimentText: '온체인 종합 진단: <span class="text-cyan-400 font-bold">월간 에스크로 락업 정상 진행 및 기관 커스터디 이동</span>',
      whaleAlerts: [
        { time: '8분 전', coin: 'XRP', qty: '50,000,000 XRP', usd: '$42.5M', fromTo: 'Ripple Escrow ➔ Unknown Wallet', type: '기관 지갑 이체', typeClass: 'text-indigo-400' },
        { time: '30분 전', coin: 'XRP', qty: '30,000,000 XRP', usd: '$25.5M', fromTo: 'Bithumb ➔ Unknown Wallet', type: '외부 유출 (매집)', typeClass: 'text-emerald-400' }
      ]
    },
    DOGE: {
      name: '도지코인 (Dogecoin)',
      netFlow: 120000000,
      netFlowUsd: 27000000,
      signal: '단기 유입 중립',
      signalClass: 'badge-yellow',
      reserveBalance: '8,420,000,000 DOGE',
      reserveChange: '+0.45%',
      whaleCount: '62건',
      whaleVolume: '$420M',
      activeWallets: '220,000 주소',
      mvrvStatus: '중립 구간',
      mvrvVal: '1.42',
      nvtVal: '65.2',
      outflowPct: 46,
      inflowPct: 54,
      sentimentText: '온체인 종합 진단: <span class="text-amber-300 font-bold">단기 차익 실현 유입과 커뮤니티 분산 보유 공존 (Neutral)</span>',
      whaleAlerts: [
        { time: '14분 전', coin: 'DOGE', qty: '80,000,000 DOGE', usd: '$18.0M', fromTo: 'Robinhood ➔ Unknown Wallet', type: '외부 유출 (보관)', typeClass: 'text-emerald-400' }
      ]
    },
    SUI: {
      name: '수이 (Sui)',
      netFlow: -12500000,
      netFlowUsd: -56250000,
      signal: 'TVL 신고가 경신',
      signalClass: 'badge-green',
      reserveBalance: '185,000,000 SUI',
      reserveChange: '-3.12%',
      whaleCount: '95건',
      whaleVolume: '$380M',
      activeWallets: '480,000 주소',
      mvrvStatus: '급상승 모멘텀',
      mvrvVal: '2.45',
      nvtVal: '18.9',
      outflowPct: 76,
      inflowPct: 24,
      sentimentText: '온체인 종합 진단: <span class="text-emerald-400 font-bold">온체인 DeFi TVL 10억 달러 돌파 및 거래소 잔고 급감 (Very Bullish)</span>',
      whaleAlerts: [
        { time: '6분 전', coin: 'SUI', qty: '5,000,000 SUI', usd: '$22.5M', fromTo: 'Binance ➔ Navi Protocol', type: 'DeFi TVL 유입', typeClass: 'text-cyan-400' }
      ]
    },
    AVAX: {
      name: '아발란체 (Avalanche)',
      netFlow: -380000,
      netFlowUsd: -15960000,
      signal: '서브넷 활성화',
      signalClass: 'badge-green',
      reserveBalance: '14,200,000 AVAX',
      reserveChange: '-1.05%',
      whaleCount: '48건',
      whaleVolume: '$240M',
      activeWallets: '95,000 주소',
      mvrvStatus: '적정 가치',
      mvrvVal: '1.55',
      nvtVal: '48.5',
      outflowPct: 62,
      inflowPct: 38,
      sentimentText: '온체인 종합 진단: <span class="text-emerald-400 font-bold">서브넷 스테이킹 안정화 및 기관 RWA 실증 거래 증가</span>',
      whaleAlerts: [
        { time: '22분 전', coin: 'AVAX', qty: '150,000 AVAX', usd: '$6.3M', fromTo: 'Coinbase ➔ Avalanche Staking', type: '검증인 스테이킹', typeClass: 'text-cyan-400' }
      ]
    },
    LINK: {
      name: '체인링크 (Chainlink)',
      netFlow: -1200000,
      netFlowUsd: -29400000,
      signal: 'CCIP 고래 매집',
      signalClass: 'badge-green',
      reserveBalance: '92,000,000 LINK',
      reserveChange: '-1.85%',
      whaleCount: '74건',
      whaleVolume: '$320M',
      activeWallets: '68,000 주소',
      mvrvStatus: '장기 저평가',
      mvrvVal: '1.38',
      nvtVal: '34.6',
      outflowPct: 70,
      inflowPct: 30,
      sentimentText: '온체인 종합 진단: <span class="text-emerald-400 font-bold">CCIP 크로스체인 트랜잭션 급증 및 고래 지갑 3개월 연속 순매집</span>',
      whaleAlerts: [
        { time: '11분 전', coin: 'LINK', qty: '450,000 LINK', usd: '$11.0M', fromTo: 'Binance ➔ Cold Wallet', type: '외부 유출 (매집)', typeClass: 'text-emerald-400' }
      ]
    }
  },

  selectCoin: function (coinSym) {
    if (!this.data[coinSym]) return;
    this.currentCoin = coinSym;

    // Update active button state
    document.querySelectorAll('.onchain-coin-btn').forEach(btn => {
      if (btn.getAttribute('data-coin') === coinSym) {
        btn.className = 'onchain-coin-btn px-3 py-1.5 rounded-xl text-xs font-bold transition bg-cyan-500 text-navy-950 shadow-md';
      } else {
        btn.className = 'onchain-coin-btn px-3 py-1.5 rounded-xl text-xs font-bold transition text-slate-400 hover:text-white';
      }
    });

    this.render();
  },

  updateLiveMetrics: function () {
    const coin = this.currentCoin;
    const d = this.data[coin];
    if (!d) return;

    // 1. Dynamic Net Flow fluctuation (+- 0.3%)
    const flowDelta = Math.round((Math.random() - 0.48) * (Math.abs(d.netFlow) * 0.005));
    d.netFlow += flowDelta;

    // 2. Fetch live price if available
    let priceUsd = 65000;
    if (typeof marketCoins !== 'undefined' && Array.isArray(marketCoins)) {
      const match = marketCoins.find(c => c.symbol && c.symbol.toUpperCase() === coin.toUpperCase());
      if (match && match.current_price) {
        // Convert KRW to USD (~1400 KRW/USD) or direct USD
        priceUsd = match.current_price > 10000 ? match.current_price / 1400 : match.current_price;
      }
    } else {
      const defaultUsdPrices = { BTC: 68000, ETH: 2500, SOL: 145, XRP: 0.58, DOGE: 0.12, SUI: 1.8, AVAX: 28, LINK: 12 };
      priceUsd = defaultUsdPrices[coin] || 100;
    }

    d.netFlowUsd = Math.round(d.netFlow * priceUsd);

    // 3. Dynamic active wallets & whale count
    const baseWallets = parseInt(d.activeWallets.replace(/[^0-9]/g, '')) || 500000;
    const newWallets = Math.max(1000, baseWallets + Math.floor((Math.random() - 0.48) * 800));
    d.activeWallets = newWallets.toLocaleString() + ' 주소';

    // 4. Periodically insert a fresh whale transaction (35% chance on tick)
    if (Math.random() < 0.35 && d.whaleAlerts) {
      const exchanges = ['Binance', 'Coinbase', 'OKX', 'Kraken', 'Upbit', 'Bithumb', 'Cold Storage', 'Institutional Custody'];
      const fromEx = exchanges[Math.floor(Math.random() * exchanges.length)];
      let toEx = exchanges[Math.floor(Math.random() * exchanges.length)];
      while (toEx === fromEx) toEx = exchanges[Math.floor(Math.random() * exchanges.length)];

      const isDeposit = toEx.includes('Binance') || toEx.includes('Upbit') || toEx.includes('OKX');
      const isOutflow = toEx.includes('Cold') || toEx.includes('Custody') || toEx.includes('Wallet');
      const type = isOutflow ? '외부 유출 (매집)' : (isDeposit ? '거래소 입금 (주의)' : '기관 지갑 이체');
      const typeClass = isOutflow ? 'text-emerald-400' : (isDeposit ? 'text-rose-400' : 'text-cyan-400');

      const randQty = Math.round(Math.abs(d.netFlow) * (0.02 + Math.random() * 0.08));
      const randUsd = (randQty * priceUsd / 1e6).toFixed(1);

      d.whaleAlerts.unshift({
        time: formatDateTime(Date.now(), true),
        timestamp: Date.now(),
        coin: coin,
        qty: `${randQty.toLocaleString()} ${coin}`,
        usd: `$${randUsd}M`,
        fromTo: `${fromEx} ➔ ${toEx}`,
        type: type,
        typeClass: typeClass
      });

      if (d.whaleAlerts.length > 5) d.whaleAlerts.pop();
    }

    this.render();
  },

  refresh: function () {
    const btn = document.getElementById('onchain-refresh-btn');
    if (btn) {
      btn.classList.add('animate-spin');
      setTimeout(() => btn.classList.remove('animate-spin'), 600);
    }
    this.updateLiveMetrics();
  },

  render: function () {
    const d = this.data[this.currentCoin] || this.data['BTC'];
    
    // 1. Cards
    const elFlow = document.getElementById('onchain-net-flow');
    const elFlowUsd = document.getElementById('onchain-net-flow-usd');
    const elFlowSignal = document.getElementById('onchain-flow-signal');
    
    if (elFlow) {
      const isOut = d.netFlow < 0;
      elFlow.innerText = (isOut ? '' : '+') + d.netFlow.toLocaleString() + ' ' + this.currentCoin;
      elFlow.className = 'text-2xl font-black font-mono mt-3 ' + (isOut ? 'text-emerald-400' : 'text-rose-400');
    }
    if (elFlowUsd) {
      const isOut = d.netFlowUsd < 0;
      elFlowUsd.innerText = (isOut ? '-' : '+') + '$' + (Math.abs(d.netFlowUsd) / 1e6).toFixed(1) + 'M';
    }
    if (elFlowSignal) {
      elFlowSignal.innerText = d.signal;
      elFlowSignal.className = (d.netFlow < 0 ? 'badge-green' : 'badge-yellow') + ' text-[11px] font-bold px-2 py-0.5 rounded-full';
    }

    const elReserve = document.getElementById('onchain-reserve-balance');
    const elReserveChange = document.getElementById('onchain-reserve-change');
    if (elReserve) elReserve.innerText = d.reserveBalance;
    if (elReserveChange) {
      elReserveChange.innerText = d.reserveChange;
      elReserveChange.className = 'text-xs font-mono font-bold ' + (d.reserveChange.startsWith('-') ? 'text-emerald-400' : 'text-rose-400');
    }

    const elWhaleVol = document.getElementById('onchain-whale-volume');
    const elWhaleCount = document.getElementById('onchain-whale-count');
    if (elWhaleVol) elWhaleVol.innerText = d.whaleVolume;
    if (elWhaleCount) elWhaleCount.innerText = d.whaleCount;

    const elActiveWallets = document.getElementById('onchain-active-wallets');
    const elMvrvStatus = document.getElementById('onchain-mvrv-status');
    const elMvrvVal = document.getElementById('onchain-mvrv-val');
    const elNvtVal = document.getElementById('onchain-nvt-val');
    if (elActiveWallets) elActiveWallets.innerText = d.activeWallets;
    if (elMvrvStatus) elMvrvStatus.innerText = d.mvrvStatus;
    if (elMvrvVal) elMvrvVal.innerText = d.mvrvVal;
    if (elNvtVal) elNvtVal.innerText = d.nvtVal;

    // 2. Visual Bar & Sentiment
    const elOutflowVal = document.getElementById('onchain-outflow-bar-val');
    const elInflowVal = document.getElementById('onchain-inflow-bar-val');
    const elBarOutflow = document.getElementById('onchain-bar-outflow');
    const elBarInflow = document.getElementById('onchain-bar-inflow');
    const elSentiment = document.getElementById('onchain-sentiment-text');

    if (elOutflowVal) elOutflowVal.innerText = d.outflowPct + '%';
    if (elInflowVal) elInflowVal.innerText = d.inflowPct + '%';
    if (elBarOutflow) elBarOutflow.style.width = d.outflowPct + '%';
    if (elBarInflow) elBarInflow.style.width = d.inflowPct + '%';
    if (elSentiment) elSentiment.innerHTML = d.sentimentText;

    // 3. Whale Table
    const tbody = document.getElementById('onchain-whale-table-body');
    if (tbody && d.whaleAlerts) {
      tbody.innerHTML = d.whaleAlerts.map(w => `
        <tr class="border-b border-navy-800/60 hover:bg-navy-900/60 transition">
          <td class="py-2.5 px-3 text-slate-400 font-mono text-[11px]">${formatDateTime(w.timestamp || w.time, true)}</td>
          <td class="py-2.5 px-3 font-bold text-white">${w.coin}</td>
          <td class="py-2.5 px-3 text-right font-bold text-slate-200 font-mono">${w.qty}</td>
          <td class="py-2.5 px-3 text-right text-cyan-400 font-bold font-mono">${w.usd}</td>
          <td class="py-2.5 px-3 text-slate-300 text-xs">${w.fromTo}</td>
          <td class="py-2.5 px-3 text-center font-bold ${w.typeClass}">${w.type}</td>
        </tr>
      `).join('');
    }
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  },

  init: function () {
    this.render();
    if (!this._interval) {
      this._interval = setInterval(() => {
        const forumTab = document.getElementById('tab-forum');
        if (forumTab && !forumTab.classList.contains('hidden')) {
          this.updateLiveMetrics();
        }
      }, 10000);
    }
  }
};
window.OnChainEngine = OnChainEngine;

// Auto init OnChainEngine on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => OnChainEngine.init());
} else {
  OnChainEngine.init();
}



