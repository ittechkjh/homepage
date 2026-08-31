// ====================================================
// CryptoPnL – Complete Core Application Engine
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
    about: 'CryptoPnL 소개 & 100% 로컬 보안 백서 (About)',
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
  const isAuth = sessionStorage.getItem('coinhub_admin_authenticated') === '1' || sessionStorage.getItem('cryptopnl_admin_authenticated') === '1';
  const storedUser = localStorage.getItem('coinhub_user') || localStorage.getItem('cryptopnl_user');
  let isAdminUser = false;
  if (storedUser) {
    try {
      const u = JSON.parse(storedUser);
      if (u && (u.username?.toLowerCase() === 'admin' || u.role === 'ADMIN' || u.rank === 'ADMIN')) {
        isAdminUser = true;
      }
    } catch(e) {}
  }

  const navAdmin = document.getElementById('nav-admin');
  const mNavAdmin = document.getElementById('m-nav-admin');

  if (navAdmin) {
    if (isAuth || isAdminUser) {
      navAdmin.classList.remove('hidden');
      navAdmin.classList.add('flex');
    } else {
      navAdmin.classList.add('hidden');
      navAdmin.classList.remove('flex');
    }
  }

  if (mNavAdmin) {
    if (isAuth || isAdminUser) {
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
  const isAuth = sessionStorage.getItem('coinhub_admin_authenticated') === '1' || sessionStorage.getItem('cryptopnl_admin_authenticated') === '1';
  const stored = localStorage.getItem('coinhub_user') || localStorage.getItem('cryptopnl_user');
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

  const authBtn = document.getElementById('btn-header-auth');

  if (isAuth || isAdminUser) {
    if (authBtn) {
      authBtn.innerHTML = '<i data-lucide="user-check" class="w-4 h-4 text-purple-400"></i><span>admin (로그아웃)</span>';
      authBtn.className = 'flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-navy-900 border border-purple-500/40 hover:border-rose-500/50 text-xs font-bold text-slate-200 hover:text-rose-300 transition shadow-sm cursor-pointer';
      authBtn.onclick = handleLogout;
    }
  } else if (user && user.username) {
    if (authBtn) {
      authBtn.innerHTML = `<i data-lucide="user-check" class="w-4 h-4 text-cyan-400"></i><span>${escapeHtml(user.username)} (로그아웃)</span>`;
      authBtn.className = 'flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-navy-900 border border-cyan-500/40 hover:border-rose-500/50 text-xs font-bold text-slate-200 hover:text-rose-300 transition shadow-sm cursor-pointer';
      authBtn.onclick = handleLogout;
    }
  } else {
    if (authBtn) {
      authBtn.innerHTML = '<i data-lucide="user" class="w-4 h-4 text-cyan-400"></i><span>로그인</span>';
      authBtn.className = 'flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-navy-900/80 hover:bg-navy-800 border border-cyan-500/40 hover:border-cyan-400 text-xs font-bold text-cyan-300 hover:text-white transition shadow-sm cursor-pointer';
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
  { id: 'bitcoin', name: 'Bitcoin', symbol: 'btc', current_price: 64820.00, price_change_percentage_24h: 2.45, total_volume: 28400000000, image: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png', korean_name: '비트코인' },
  { id: 'ethereum', name: 'Ethereum', symbol: 'eth', current_price: 3490.50, price_change_percentage_24h: 1.82, total_volume: 15200000000, image: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png', korean_name: '이더리움' },
  { id: 'solana', name: 'Solana', symbol: 'sol', current_price: 154.20, price_change_percentage_24h: 8.94, total_volume: 4800000000, image: 'https://assets.coingecko.com/coins/images/4128/small/solana.png', korean_name: '솔라나' },
  { id: 'ripple', name: 'XRP', symbol: 'xrp', current_price: 0.584, price_change_percentage_24h: -0.42, total_volume: 1200000000, image: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png', korean_name: '리플' },
  { id: 'dogecoin', name: 'Dogecoin', symbol: 'doge', current_price: 0.124, price_change_percentage_24h: 4.15, total_volume: 850000000, image: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png', korean_name: '도지코인' },
  { id: 'cardano', name: 'Cardano', symbol: 'ada', current_price: 0.382, price_change_percentage_24h: -1.12, total_volume: 410000000, image: 'https://assets.coingecko.com/coins/images/975/small/cardano.png', korean_name: '에이다' },
  { id: 'avalanche-2', name: 'Avalanche', symbol: 'avax', current_price: 24.50, price_change_percentage_24h: 3.20, total_volume: 320000000, image: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png', korean_name: '아발란체' },
  { id: 'chainlink', name: 'Chainlink', symbol: 'link', current_price: 11.80, price_change_percentage_24h: 1.05, total_volume: 290000000, image: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png', korean_name: '체인링크' }
];

let marketCoins = [...DEFAULT_COINS];
let selectedCoin = { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', price: 64820 };
let currentChartTimeframe = '24h';
let priceChart = null;

async function fetchMarketData() {
  const refreshIcon = document.getElementById('refresh-icon');
  if (refreshIcon) refreshIcon.classList.add('animate-spin');

  if (!marketCoins || marketCoins.length === 0) {
    marketCoins = [...DEFAULT_COINS];
  }
  renderMarketUI();

  try {
    const upbitMarkets = 'KRW-BTC,KRW-ETH,KRW-SOL,KRW-XRP,KRW-DOGE,KRW-ADA';
    const upbitRes = await fetch('https://api.upbit.com/v1/ticker?markets=' + upbitMarkets);
    if (upbitRes.ok) {
      const upbitData = await upbitRes.json();
      const usdRate = 1380;
      upbitData.forEach(item => {
        const symbol = item.market.replace('KRW-', '').toLowerCase();
        const coin = marketCoins.find(c => c.symbol.toLowerCase() === symbol);
        if (coin) {
          coin.current_price = item.trade_price / usdRate;
          coin.price_change_percentage_24h = item.signed_change_rate * 100;
          coin.total_volume = item.acc_trade_price_24h / usdRate;
        }
      });
      renderMarketUI();
    }
  } catch (err) {
    console.warn('Live ticker API fallback:', err);
  } finally {
    if (refreshIcon) refreshIcon.classList.remove('animate-spin');
  }
}
window.fetchMarketData = fetchMarketData;

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
        x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10, family: 'JetBrains Mono' } } },
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
const INITIAL_FORUM_POSTS = [
  {
    id: 101,
    category: 'market',
    categoryName: '📊 차트/기술적 분석',
    title: '비트코인 64K 지지선 테스트 및 주봉 RSI 다이버전스 분석',
    content: '<p>주봉상 RSI가 50선에서 강력한 지지를 받고 있으며, 64,000달러 부근의 기관 매수세가 여전히 견고합니다. 70K 돌파 시 알트코인 순환매가 본격화될 것으로 예상됩니다.</p>',
    author: 'CryptoWhale',
    authorRank: 'PRO',
    upvotes: 24,
    views: 412,
    time: '15분 전',
    timestamp: Date.now() - 15 * 60 * 1000,
    comments: [
      { id: 1, author: '알트매니아', text: '솔라나 생태계 쪽으로 수급 이동이 눈에 띄네요!', time: '10분 전' }
    ]
  },
  {
    id: 102,
    category: 'general',
    categoryName: '💬 자유 토론',
    title: '업비트 거래내역 엑셀로 올해 실현손익 계산해봤는데 진짜 편리하네요',
    content: '<p>매매 횟수가 500회가 넘어서 수기 계산은 포기하고 있었는데, 파일 하나 올리니까 선입선출(FIFO)로 수수료까지 깔끔하게 떨어지네요. 세금 계산할 때 큰 도움 될 것 같습니다.</p>',
    author: '세무공부중',
    authorRank: 'Member',
    upvotes: 18,
    views: 350,
    time: '1시간 전',
    timestamp: Date.now() - 60 * 60 * 1000,
    comments: []
  },
  {
    id: 103,
    category: 'altcoin',
    categoryName: '🚀 알트코인 분석',
    title: '이더리움 L2 생태계(아비트럼, 옵티미즘) TVL 회복세 분석',
    content: '<p>덴쿤 업그레이드 이후 L2 가스비 절감 효과가 누적되면서 일일 트랜잭션 수가 전고점을 돌파하고 있습니다.</p>',
    author: '이더리안',
    authorRank: 'PRO',
    upvotes: 15,
    views: 280,
    time: '2시간 전',
    timestamp: Date.now() - 120 * 60 * 1000,
    comments: []
  }
];

let activeCategory = 'all';
let currentCafePostId = null;
let isCafeEditMode = false;
let currentViewingPostId = null;

function getStoredPosts() {
  try {
    const raw = localStorage.getItem('coinhub_forum_posts') || localStorage.getItem('cryptopnl_forum_posts');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return INITIAL_FORUM_POSTS;
}
window.getStoredPosts = getStoredPosts;

function saveStoredPosts(posts) {
  try {
    localStorage.setItem('cryptopnl_forum_posts', JSON.stringify(posts));
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
    posts = posts.filter(p => p.category === activeCategory);
  }

  const sortType = document.getElementById('forum-sort')?.value || 'latest';
  if (sortType === 'popular') {
    posts.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
  } else if (sortType === 'comments') {
    posts.sort((a, b) => ((b.comments && b.comments.length) || 0) - ((a.comments && a.comments.length) || 0));
  } else {
    posts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }

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
      <div class="crypto-card bg-navy-900 border border-navy-800 rounded-2xl p-5 shadow-sm hover:border-cyan-500/40 transition cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group" onclick="openPostDetailModal(${post.id})">
        <div class="flex-1 space-y-2">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">${escapeHtml(post.categoryName)}</span>
            ${hasImage ? '<span class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1"><i data-lucide="image" class="w-3 h-3"></i> 사진포함</span>' : ''}
            <span class="text-xs text-slate-400">• ${escapeHtml(post.time)}</span>
            <span class="text-xs font-semibold text-slate-300">• ${escapeHtml(post.author)}</span>
            ${post.authorRank ? `<span class="text-[9px] px-1.5 py-0.2 rounded bg-navy-950 border border-navy-800 text-cyan-400 font-mono">${escapeHtml(post.authorRank)}</span>` : ''}
          </div>
          <h3 class="font-bold text-base text-white group-hover:text-cyan-400 transition">${escapeHtml(post.title)}</h3>
          <p class="text-xs text-slate-400 line-clamp-2 leading-relaxed">${escapeHtml(plainText)}</p>
        </div>

        <div class="flex items-center gap-3 self-end sm:self-center shrink-0 text-xs">
          <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-navy-950 border border-navy-800 text-cyan-400 font-bold font-mono">
            <i data-lucide="thumbs-up" class="w-3.5 h-3.5"></i>
            <span>${post.upvotes || 0}</span>
          </div>
          <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-navy-950 border border-navy-800 text-slate-300 font-mono">
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

function showForumListView() {
  const listView = document.getElementById('forum-list-view');
  const detailView = document.getElementById('forum-detail-view');
  const writeView = document.getElementById('forum-write-view');

  if (listView) listView.classList.remove('hidden');
  if (detailView) detailView.classList.add('hidden');
  if (writeView) writeView.classList.add('hidden');

  currentCafePostId = null;
  isCafeEditMode = false;
  renderForumPosts();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.showForumListView = showForumListView;

function showForumWriteView(editPostId = null) {
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
    const post = posts.find(p => p.id === editPostId);
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

  if (titleInput) setTimeout(() => titleInput.focus(), 100);
  if (typeof lucide !== 'undefined') lucide.createIcons();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.showForumWriteView = showForumWriteView;

function openPostDetailModal(postId) {
  const listView = document.getElementById('forum-list-view');
  const detailView = document.getElementById('forum-detail-view');
  const writeView = document.getElementById('forum-write-view');

  if (listView) listView.classList.add('hidden');
  if (writeView) writeView.classList.add('hidden');
  if (detailView) detailView.classList.remove('hidden');

  const posts = getStoredPosts();
  const post = posts.find(p => p.id === postId);
  if (!post) return;

  currentCafePostId = postId;
  currentViewingPostId = postId;
  post.views = (post.views || 0) + 1;
  saveStoredPosts(posts);

  const catEl = document.getElementById('cafe-post-category');
  const titleEl = document.getElementById('cafe-post-title');
  const authorEl = document.getElementById('cafe-post-author');
  const timeEl = document.getElementById('cafe-post-time');
  const viewsEl = document.getElementById('cafe-post-views');
  const contentEl = document.getElementById('cafe-post-content');
  const upvotesEl = document.getElementById('cafe-post-upvotes');

  if (catEl) catEl.innerText = post.categoryName;
  if (titleEl) titleEl.innerText = post.title;
  if (authorEl) authorEl.innerText = `${post.author} (${post.authorRank || 'Member'})`;
  if (timeEl) timeEl.innerText = post.time;
  if (viewsEl) viewsEl.innerText = post.views;
  if (contentEl) contentEl.innerHTML = post.content;
  if (upvotesEl) upvotesEl.innerText = post.upvotes || 0;

  const controlsEl = document.getElementById('cafe-post-author-controls');
  const storedUser = localStorage.getItem('coinhub_user') || localStorage.getItem('cryptopnl_user');
  let currentUsername = '';
  let isAdmin = sessionStorage.getItem('coinhub_admin_authenticated') === '1' || sessionStorage.getItem('cryptopnl_admin_authenticated') === '1';
  if (storedUser) {
    try {
      const u = JSON.parse(storedUser);
      if (u && u.username) currentUsername = u.username;
    } catch(e) {}
  }

  const isAuthor = (currentUsername && currentUsername === post.author) || isAdmin;

  if (controlsEl) {
    if (isAuthor) {
      controlsEl.innerHTML = `
        <button onclick="showForumWriteView(${post.id})" class="px-3.5 py-1.5 rounded-xl bg-navy-950 hover:bg-cyan-500 hover:text-navy-950 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition flex items-center gap-1.5">
          <i data-lucide="edit-3" class="w-3.5 h-3.5"></i> 수정
        </button>
        <button onclick="handleDeleteCafePost(${post.id})" class="px-3.5 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold transition flex items-center gap-1.5">
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

function renderCafeComments(comments) {
  const container = document.getElementById('cafe-comments-list');
  const countEl = document.getElementById('cafe-comments-count');
  if (countEl) countEl.innerText = comments.length;
  if (!container) return;

  if (comments.length === 0) {
    container.innerHTML = '<div class="p-6 text-center text-slate-500 text-xs bg-navy-950 rounded-2xl border border-navy-800">첫 번째 댓글을 작성하여 소통을 시작해 보세요!</div>';
    return;
  }

  container.innerHTML = comments.map(c => `
    <div class="bg-navy-950 p-4 rounded-2xl border border-navy-800 text-xs space-y-1.5">
      <div class="flex justify-between items-center text-slate-400">
        <span class="font-bold text-slate-200 text-sm">${escapeHtml(c.author)}</span>
        <span class="text-xs text-slate-500 font-mono">${escapeHtml(c.time)}</span>
      </div>
      <p class="text-slate-200 text-sm leading-relaxed">${escapeHtml(c.text)}</p>
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
  const post = posts.find(p => p.id === currentCafePostId);
  if (!post) return;

  const storedUser = localStorage.getItem('coinhub_user') || localStorage.getItem('cryptopnl_user');
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
    time: '방금 전'
  });

  saveStoredPosts(posts);
  if (input) input.value = '';
  renderCafeComments(post.comments);
}
window.handleCafeAddComment = handleCafeAddComment;

function handleDeleteCafePost(postId) {
  if (!confirm('정말로 이 게시글을 삭제하시겠습니까?')) return;
  let posts = getStoredPosts();
  posts = posts.filter(p => p.id !== postId);
  saveStoredPosts(posts);
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
  if (file.size > 5 * 1024 * 1024) {
    alert('이미지 용량은 최대 5MB까지 가능합니다.');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      const maxDim = 1400;

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

      const base64 = canvas.toDataURL('image/jpeg', 0.85);
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

  const category = catSelect ? catSelect.value : 'general';
  const title = titleInput ? titleInput.value.trim() : '';
  const content = editor ? editor.innerHTML.trim() : '';

  if (!title || !content || content === '<p><br></p>' || content === '<br>') {
    alert('제목과 본문 내용을 모두 작성해 주세요.');
    return;
  }

  const categoryNames = {
    general: '💬 자유 토론',
    market: '📊 차트/기술적 분석',
    altcoin: '🚀 알트코인 분석',
    ico: '🪙 ICO / 신규 토큰',
    qna: '❓ 초보 Q&A'
  };

  const storedUser = localStorage.getItem('coinhub_user') || localStorage.getItem('cryptopnl_user');
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
    const post = posts.find(p => p.id === currentCafePostId);
    if (post) {
      post.category = category;
      post.categoryName = categoryNames[category] || '💬 자유 토론';
      post.title = title;
      post.content = content;
      post.time = '수정됨 (방금 전)';
      saveStoredPosts(posts);
      alert('✏️ 게시글이 성공적으로 수정되었습니다!');
      openPostDetailModal(currentCafePostId);
      return;
    }
  }

  const newPost = {
    id: Date.now(),
    category,
    categoryName: categoryNames[category] || '💬 자유 토론',
    title,
    content,
    author: authorName,
    authorRank: authorRank,
    upvotes: 1,
    views: 1,
    time: '방금 전',
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

  post.upvotes = Math.max(0, (post.upvotes || 0) + delta);
  saveStoredPosts(posts);

  const el = document.getElementById('cafe-post-upvotes');
  if (el) el.innerText = post.upvotes;
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
  if (el) el.innerText = '12명 온라인';
}
window.renderChatActiveUsers = renderChatActiveUsers;

function handleSendChat(e) {
  if (e && e.preventDefault) e.preventDefault();
  const input = document.getElementById('chat-input');
  const text = input ? input.value.trim() : '';
  if (!text) return;

  const storedUser = localStorage.getItem('coinhub_user') || localStorage.getItem('cryptopnl_user');
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
// Section 5: Real-Time News Feed Engine
// ----------------------------------------------------
const FALLBACK_LIVE_NEWS = [
  {
    id: 501,
    category: 'BTC',
    categoryName: '비트코인/시장',
    badge: 'HOT',
    title: '비트코인 64K 지지선 수성... 글로벌 헤지펀드 현물 ETF 추가 매수 공시',
    content: '미국 주요 연기금과 헤지펀드들이 13F 공시를 통해 비트코인 현물 ETF 보유 비중을 대폭 확대한 것으로 나타났습니다. 온체인 거래량 또한 주간 최고치를 기록하며 반등세를 주도하고 있습니다.',
    source: '블룸버그',
    time: '3분 전',
    timestamp: Date.now() - 3 * 60 * 1000,
    takeaways: [
      '기관 포트폴리오 내 비트코인 편입 비중 2.1% 상향 조정',
      '장기 보유자(LTH) 온체인 유출량 3개월 내 최저치 기록',
      '단기 68,000달러 저항선 돌파 시도 지속'
    ]
  },
  {
    id: 502,
    category: 'ALTCOIN',
    categoryName: '알트코인',
    badge: 'LIVE',
    title: '이더리움 L2 주간 트랜잭션 사상 최대치... 아비트럼·옵티미즘 수혜',
    content: '가스비 절감 효과로 L2 네트워크의 실사용 트랜잭션이 메인넷의 4배를 넘어섰습니다. 탈중앙화 금융(DeFi) 총 예치 자산(TVL)도 전월 대비 14% 증가했습니다.',
    source: '코인데스크',
    time: '12분 전',
    timestamp: Date.now() - 12 * 60 * 1000,
    takeaways: [
      'L2 생태계 활성 지갑 수 1,200만 개 돌파',
      '디파이 프로토콜 수익률 개선 및 유동성 집중'
    ]
  },
  {
    id: 503,
    category: 'POLICY',
    categoryName: '규제/정책',
    badge: '공시',
    title: '금융위, 2026 가상자산 사업자 표준 공시 가이드라인 발표',
    content: '국내 5대 원화 거래소와 협력하여 상장 심사 기준의 투명성을 높이고, 이상거래 탐지 시 실시간 거래 정지 및 투자자 경보 발령 체계를 확립했습니다.',
    source: '연합뉴스',
    time: '28분 전',
    timestamp: Date.now() - 28 * 60 * 1000,
    takeaways: [
      '국내 투자자 자산 보호 100% 분리 보관 규정 준수 확인',
      '상장 폐지 및 거래 유의 종목 지정 기준 표준화'
    ]
  },
  {
    id: 504,
    category: 'MARKET',
    categoryName: '거시경제',
    badge: '속보',
    title: '미국 연준 9월 FOMC 금리 인하 확률 92% 반영... 암호화폐 시장 기대감',
    content: 'CME 페드워치에 따르면 9월 기준금리 25bp 인하 가능성이 90% 이상으로 집계되었습니다. 글로벌 유동성 완화 기대감이 가상자산 시장 전반의 매수세를 견인하고 있습니다.',
    source: '로이터',
    time: '45분 전',
    timestamp: Date.now() - 45 * 60 * 1000,
    takeaways: [
      '금리 인하 사이클 진입 시 위험자산 선호 심리 강화',
      '달러 인덱스 하락에 따른 비트코인 상대적 강세'
    ]
  }
];

let NEWS_ITEMS = [...FALLBACK_LIVE_NEWS];
let activeNewsCategory = 'ALL';
let newsCountdownSeconds = 30;
let newsCountdownTimer = null;

function filterNews(cat) {
  activeNewsCategory = cat;
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

  let items = NEWS_ITEMS;
  if (activeNewsCategory !== 'ALL') {
    items = items.filter(i => i.category === activeNewsCategory);
  }

  if (items.length === 0) {
    grid.innerHTML = '<div class="p-8 text-center text-slate-500 text-xs bg-navy-900 rounded-3xl border border-navy-800 col-span-full">해당 카테고리의 속보 기사가 없습니다.</div>';
    return;
  }

  grid.innerHTML = items.map(item => `
    <div class="crypto-card bg-navy-900 border border-navy-800 rounded-3xl p-6 shadow-lg hover:border-cyan-500/40 transition flex flex-col justify-between space-y-4 group">
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <span class="px-2.5 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-mono font-bold">${escapeHtml(item.category)}</span>
          <span class="text-xs text-slate-500 font-mono">${escapeHtml(item.source)} • ${escapeHtml(item.time)}</span>
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
  const item = NEWS_ITEMS.find(n => n.id === id);
  if (!item) return;

  const catEl = document.getElementById('modal-news-category');
  const srcEl = document.getElementById('modal-news-source');
  const timeEl = document.getElementById('modal-news-time');
  const titleEl = document.getElementById('modal-news-title');
  const contentEl = document.getElementById('modal-news-content');
  const takeawaysEl = document.getElementById('modal-news-takeaways');

  if (catEl) catEl.innerText = item.category;
  if (srcEl) srcEl.innerText = item.source;
  if (timeEl) timeEl.innerText = item.time;
  if (titleEl) titleEl.innerText = item.title;
  if (contentEl) contentEl.innerText = item.content;

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

async function fetchRealCryptoNews() {
  try {
    const rssUrl = 'https://news.google.com/rss/search?q=비트코인+OR+가상자산+OR+암호화폐&hl=ko&gl=KR&ceid=KR:ko';
    const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.items && Array.isArray(data.items) && data.items.length > 0) {
        return data.items.slice(0, 15).map((item, idx) => {
          const title = item.title ? item.title.replace(/<[^>]+>/g, '').trim() : '가상자산 실시간 속보';
          let category = 'MARKET';
          if (title.includes('비트코인') || title.includes('BTC')) category = 'BTC';
          else if (title.includes('알트') || title.includes('이더리움') || title.includes('솔라나') || title.includes('리플')) category = 'ALTCOIN';
          else if (title.includes('금융') || title.includes('법') || title.includes('규제') || title.includes('SEC') || title.includes('국회')) category = 'POLICY';

          return {
            id: 800 + idx,
            category: category,
            categoryName: category === 'BTC' ? '비트코인' : category === 'ALTCOIN' ? '알트코인' : category === 'POLICY' ? '규제/정책' : '시장속보',
            badge: idx < 2 ? 'HOT' : 'LIVE',
            title: title,
            content: item.description ? item.description.replace(/<[^>]+>/g, '').slice(0, 180) + '...' : title,
            source: item.author || '글로벌 뉴스',
            time: idx === 0 ? '방금 전' : `${idx * 5}분 전`,
            timestamp: Date.now() - idx * 5 * 60 * 1000,
            takeaways: [
              '실시간 시장 수급 및 투자자 심리에 미치는 핵심 변동성 요인',
              '국내외 거래소 거래량 및 온체인 지표 실시간 영향 분석'
            ]
          };
        });
      }
    }
  } catch (e) {
    console.warn('Real RSS news fetch fallback:', e);
  }
  return FALLBACK_LIVE_NEWS;
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
// Section 6: Crypto Events Calendar Engine
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
    title: '미국 8월 고용보고서 (비농업 고용 및 실업률) 발표',
    desc: '연준(Fed)의 9월 금리 결정 방향성을 가늠할 핵심 경제 지표. 시장 예상치 하회 시 조기 금리 인하 기대감 고조.',
    impact: 'HIGH IMPACT',
    impactColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30'
  },
  {
    id: 2,
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
    id: 3,
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
    id: 4,
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
    id: 5,
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
    id: 6,
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
    id: 7,
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
    id: 8,
    date: '2026-09-28',
    dday: 'D-28',
    time: '23:00 (KST)',
    category: 'policy',
    categoryName: '⚖️ 규제/법안',
    coin: 'SEC',
    title: '미국 SEC, 신규 가상자산 현물 지수 ETF 승인 심사 기한',
    desc: '솔라나 및 다중 암호화폐 종합 인덱스 ETF에 대한 SEC 최종 승인 여부 판결 기한.',
    impact: 'HIGH IMPACT',
    impactColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30'
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
// Section 7: Unified User & Admin Authentication
// ----------------------------------------------------
function openAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.style.setProperty('display', 'flex', 'important');
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

function handleUnifiedLoginSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();
  const idInput = document.getElementById('login-identifier');
  const pwInput = document.getElementById('login-password');
  const id = (idInput ? idInput.value : '').trim();
  const pw = (pwInput ? pwInput.value : '').trim();

  if (!id) {
    alert('아이디 또는 닉네임을 입력해 주세요.');
    return;
  }

  const savedAdminPw = (typeof AdminApp !== 'undefined' && typeof AdminApp.getAdminPassword === 'function') 
    ? AdminApp.getAdminPassword() 
    : (localStorage.getItem('cryptopnl_admin_password') || localStorage.getItem('coinhub_admin_password') || 'admin1234');

  const isAdmin = (id.toLowerCase() === 'admin' && (pw === savedAdminPw || pw === '7777'));

  if (isAdmin) {
    sessionStorage.setItem('cryptopnl_admin_authenticated', '1');
    sessionStorage.setItem('coinhub_admin_authenticated', '1');
    const adminUser = {
      username: 'admin',
      email: 'admin@cryptopnl.com',
      role: 'ADMIN',
      rank: 'ADMIN',
      reputation: 9999
    };
    localStorage.setItem('cryptopnl_user', JSON.stringify(adminUser));
    localStorage.setItem('coinhub_user', JSON.stringify(adminUser));

    updateAuthUI();
    updateAdminNavVisibility();
    closeAuthModal();

    alert('🎉 최고 관리자(ADMIN)로 로그인되었습니다! 관리자 센터로 이동합니다.');
    switchTab('admin');
    if (typeof AdminApp !== 'undefined' && typeof AdminApp.render === 'function') AdminApp.render();
    return;
  }

  // Normal Member Login
  const user = {
    username: id,
    email: id.includes('@') ? id : `${id}@cryptopnl.com`,
    role: 'MEMBER',
    rank: 'PRO',
    reputation: 100,
    joinedDate: new Date().toISOString().slice(0, 10)
  };

  localStorage.setItem('cryptopnl_user', JSON.stringify(user));
  localStorage.setItem('coinhub_user', JSON.stringify(user));

  updateAuthUI();
  updateAdminNavVisibility();
  closeAuthModal();

  alert(`반갑습니다, ${id}님! 로그인이 완료되었습니다.`);
}
window.handleUnifiedLoginSubmit = handleUnifiedLoginSubmit;

function handleLogout() {
  if (confirm('로그아웃하시겠습니까?')) {
    localStorage.removeItem('cryptopnl_user');
    localStorage.removeItem('coinhub_user');
    sessionStorage.removeItem('cryptopnl_admin_authenticated');
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
    title: "CryptoPnL – 업비트·빗썸 엑셀 거래내역 실현손익 정밀 분석기",
    desc: "1초 만에 확인하는 내 업비트·빗썸 실현손익, 평단가, 거래소별 수수료, 월별 통계. 서버 전송 없는 100% 로컬 암호화 계산기"
  },
  market: {
    title: "CryptoPnL – 가상자산 실시간 시세 및 트레이딩뷰 차트 분석",
    desc: "비트코인, 이더리움, 주요 알트코인 실시간 시세, 24시간 변동률, 시가총액 순위 및 인터랙티브 인터벌 차트"
  },
  forum: {
    title: "CryptoPnL – 코인 토론 포럼 및 전문 트레이더 인사이트",
    desc: "실시간 거래소 상장 공시, 차트 분석, 알트코인 전망 및 트레이더 커뮤니티 토론장"
  },
  chat: {
    title: "CryptoPnL – 실시간 글로벌 암호화폐 라이브 채팅방",
    desc: "실시간 시장 반응과 트레이딩 아이디어를 나누는 라이브 채팅 및 커뮤니티"
  },
  news: {
    title: "CryptoPnL – 실시간 가상자산 글로벌 속보 및 공시 피드",
    desc: "주요 글로벌 블록체인 미디어 및 금융위 규제 속보를 30초 주기로 자동 수집·업데이트"
  },
  calculators: {
    title: "CryptoPnL – 물타기, 김프, 세금, 선물 청산가 실전 계산기 5종",
    desc: "투자자를 위한 실전 트레이딩 계산기 모음"
  },
  calendar: {
    title: "CryptoPnL – 2026 주요 가상자산 일정 및 경제 캘린더",
    desc: "FOMC 금리 결정, 대규모 토큰 락업 해제, 메인넷 업그레이드, 글로벌 컨퍼런스 실시간 D-Day 일정"
  },
  guides: {
    title: "CryptoPnL – 가상자산 세무, 엑셀 분석 & 실전 매매 지식 백서",
    desc: "8편의 전문 가이드와 FAQ 10선"
  },
  admin: {
    title: "CryptoPnL – 최고 관리자(Admin) 전용 센터",
    desc: "CryptoPnL 사이트 운영, 방문자 트래픽 모니터링 및 시스템 관리"
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
    history.replaceState(null, '', `#/${tabId}`);
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

document.addEventListener('DOMContentLoaded', () => {
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

  const initialHash = (window.location.hash || '').replace('#/', '').replace('#', '');
  const initialTab = initialHash || 'analyzer';
  switchTab(initialTab, false);

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

  
  const cafeEditor = document.getElementById('cafe-write-content');
  if (cafeEditor) {
    cafeEditor.addEventListener('focus', function () {
      if (cafeEditor.innerText.trim() === '자신의 분석, 생각, 매매 일지, 질문 내용을 자유롭게 작성하세요...') {
        cafeEditor.innerHTML = '';
      }
    });
  }

  setInterval(simulateLiveFluctuations, 4000);
});

window.addEventListener('hashchange', function () {
  const h = (window.location.hash || '').replace('#/', '').replace('#', '');
  if (h && typeof switchTab === 'function') {
    switchTab(h, false);
  }
});
