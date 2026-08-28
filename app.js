/**
 * CoinHub - Cryptocurrency Community & Market Hub
 * Core JavaScript Logic
 */

// Global State
let marketCoins = [];
let selectedCoin = { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', price: 64820, change24h: 2.45 };
let priceChart = null;
let currentChartTimeframe = '24h';
let activeCategory = 'all';
let currentUser = JSON.parse(localStorage.getItem('coinhub_user')) || null;
let currentViewingPostId = null;

// Initial Mock Forum Data
const INITIAL_FORUM_POSTS = [
  {
    id: 1,
    category: 'market',
    categoryName: '📊 차트/기술적 분석',
    title: '비트코인 65K 돌파 시도와 4분기 불장 시나리오 공유합니다',
    author: 'CryptoWhale',
    authorRank: 'VIP',
    content: `현재 비트코인이 64K 지지선을 견고하게 지켜주면서 65,500달러 저항선 돌파를 시도하고 있습니다.\n\n주요 관전 포인트:\n1. 200일 이동평균선 상회 유지\n2. 온체인 고래 지갑 매집 증가\n3. 금리 인하 기대감에 따른 글로벌 유동성 공급\n\n단기 조정 시 62.8K가 강력한 매수 지점이 될 것으로 보이며, 68K 돌파 시 전고점 트라이 가능성이 높습니다. 다들 어떻게 보시나요?`,
    upvotes: 42,
    views: 890,
    time: '35분 전',
    timestamp: Date.now() - 35 * 60 * 1000,
    comments: [
      { id: 101, author: 'Satoshi_Fan', text: '동의합니다. 62.8K 부근에서 분할 매수 대기 중입니다.', time: '20분 전' },
      { id: 102, author: 'MoonRider', text: '도미넌스 빠지면서 알트장도 같이 올 것 같네요!', time: '10분 전' }
    ]
  },
  {
    id: 2,
    category: 'altcoin',
    categoryName: '🚀 알트코인 분석',
    title: '솔라나(SOL) 생태계 DePIN + AI 메타 유망 프로젝트 총정리',
    author: 'SolanaKing',
    authorRank: 'PRO',
    content: `최근 솔라나 생태계의 거래량과 TVL이 급격히 증가하고 있습니다.\n\n특히 주목할 만한 3가지 테마:\n1. Render / io.net - 탈중앙 GPU 연산\n2. Helium - 탈중앙 무선 네트워크 인프라\n3. Jupiter - 솔라나 DEX 애그리게이터\n\n솔라나 가격이 150달러를 돌파하며 다음 타겟은 180달러로 보고 있습니다. 포트폴리오 비중 20% 유지 중입니다.`,
    upvotes: 38,
    views: 650,
    time: '2시간 전',
    timestamp: Date.now() - 2 * 3600 * 1000,
    comments: [
      { id: 103, author: 'DeFi_Master', text: 'Jupiter 스테이킹 보상도 쏠쏠하더라고요.', time: '1시간 전' }
    ]
  },
  {
    id: 3,
    category: 'general',
    categoryName: '💬 자유 토론',
    title: '코린이 3년차의 하락장/상승장 멘탈 관리 원칙 5가지',
    author: 'PeacefulTrader',
    authorRank: 'Member',
    content: `암호화폐 시장에서 살아남기 위해 제가 세운 철칙입니다.\n\n1. 몰빵 금지, 무조건 분할 매수/분할 매도\n2. FOMO(추격매수) 오면 스마트폰 끄고 산책하기\n3. 손절 라인은 진입 전 미리 정해두기\n4. 수익금의 30%는 무조건 스테이블코인 또는 현금화\n5. 남의 수익 인증에 흔들리지 않기\n\n모두 성투하시길 바랍니다!`,
    upvotes: 56,
    views: 1240,
    time: '4시간 전',
    timestamp: Date.now() - 4 * 3600 * 1000,
    comments: [
      { id: 104, author: 'ittechkjh', text: '멘탈 관리에 정말 큰 도움 되는 글입니다. 감사합니다!', time: '3시간 전' },
      { id: 105, author: 'Hodl_Forever', text: '1번과 4번이 제일 지키기 어렵지만 핵심이네요.', time: '2시간 전' }
    ]
  },
  {
    id: 4,
    category: 'ico',
    categoryName: '🪙 ICO / 신규 토큰',
    title: '레이어2 신규 프로젝트 에어드랍 작업 가이드 (테스트넷 참여)',
    author: 'AirdropHunter',
    authorRank: 'PRO',
    content: `비용 없이 참여 가능한 유망 레이어2 테스트넷 에어드랍 가이드입니다.\n\n1. 메타마스크 세폴리아 테스트넷 연결\n2. 공식 파우셋에서 테스트 토큰 수령\n3. 브릿지 트랜잭션 5회 이상 발생\n4. 공식 디스코드 가입 후 역할 획득\n\n상세 트랜잭션 주소는 댓글로 남겨두겠습니다.`,
    upvotes: 29,
    views: 520,
    time: '6시간 전',
    timestamp: Date.now() - 6 * 3600 * 1000,
    comments: []
  },
  {
    id: 5,
    category: 'qna',
    categoryName: '❓ 초보 Q&A',
    title: '하드웨어 월렛(Ledger / Tangem) 꼭 사야 할까요?',
    author: 'NewbieCoin',
    authorRank: 'Newbie',
    content: `거래소에만 코인을 보관 중인데 주변에서 콜드월렛을 추천하네요.\n자산이 대략 500만원 정도인데 지금 시점에 하드웨어 월렛을 사는 게 좋을까요? 장단점이 궁금합니다.`,
    upvotes: 15,
    views: 380,
    time: '8시간 전',
    timestamp: Date.now() - 8 * 3600 * 1000,
    comments: [
      { id: 106, author: 'SecurityFirst', text: '장기 보유 목적이라면 500만원이어도 콜드월렛 추천합니다. FTX 사태 떠올려보세요.', time: '7시간 전' }
    ]
  }
];

// Fallback Crypto Data (In case CoinGecko rate limits)
const DEFAULT_COINS = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', image: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png', current_price: 64820, price_change_percentage_24h: 2.45, total_volume: 28450120000, high_24h: 65400, low_24h: 63100 },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', image: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png', current_price: 3490.50, price_change_percentage_24h: 1.82, total_volume: 15230000000, high_24h: 3520, low_24h: 3410 },
  { id: 'solana', symbol: 'SOL', name: 'Solana', image: 'https://assets.coingecko.com/coins/images/4128/small/solana.png', current_price: 154.20, price_change_percentage_24h: 8.94, total_volume: 4890000000, high_24h: 156.8, low_24h: 140.2 },
  { id: 'ripple', symbol: 'XRP', name: 'XRP', image: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png', current_price: 0.584, price_change_percentage_24h: -0.65, total_volume: 1240000000, high_24h: 0.595, low_24h: 0.578 },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', image: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png', current_price: 0.124, price_change_percentage_24h: 4.12, total_volume: 890000000, high_24h: 0.128, low_24h: 0.118 },
  { id: 'binancecoin', symbol: 'BNB', name: 'BNB', image: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png', current_price: 582.40, price_change_percentage_24h: 1.15, total_volume: 950000000, high_24h: 588, low_24h: 575 },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano', image: 'https://assets.coingecko.com/coins/images/975/small/cardano.png', current_price: 0.385, price_change_percentage_24h: -1.24, total_volume: 320000000, high_24h: 0.395, low_24h: 0.380 },
  { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche', image: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png', current_price: 26.80, price_change_percentage_24h: 5.40, total_volume: 450000000, high_24h: 27.4, low_24h: 25.1 },
  { id: 'chainlink', symbol: 'LINK', name: 'Chainlink', image: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png', current_price: 12.45, price_change_percentage_24h: 3.20, total_volume: 280000000, high_24h: 12.8, low_24h: 11.9 },
  { id: 'sui', symbol: 'SUI', name: 'Sui', image: 'https://assets.coingecko.com/coins/images/26375/small/sui-ocean-square.png', current_price: 0.982, price_change_percentage_24h: 12.40, total_volume: 610000000, high_24h: 1.02, low_24h: 0.86 }
];

// Initial Mock News Data
const NEWS_ITEMS = [
  {
    category: 'MARKET',
    source: 'CoinDesk',
    time: '18분 전',
    title: '비트코인 현물 ETF, 일주일 만에 순유입 4억 달러 돌파',
    summary: '기관 투자자들의 암호화폐 수용 확대와 거시 경제 안정세가 맞물리며 미국 비트코인 현물 ETF로의 자금 유입이 가속화되고 있습니다.',
    url: '#'
  },
  {
    category: 'TECH',
    source: 'Cointelegraph',
    time: '45분 전',
    title: '이더리움 차기 업그레이드 테스트넷 성공적 완료... 수수료 80% 절감 기대',
    summary: '개발자 코어 회의에서 Layer 2 롤업 비용을 대폭 절감하는 EIP-4844 후속 데이터 가용성 개선 패치가 승인되었습니다.',
    url: '#'
  },
  {
    category: 'DEFI',
    source: 'The Block',
    time: '2시간 전',
    title: '솔라나 DeFi TVL 50억 달러 돌파... 밈코인 거래량 및 DEX 활성화 주도',
    summary: '탈중앙 거래소 거래량이 역대 최고치를 갱신하면서 솔라나 메인넷 수수료 수익이 이더리움을 일시 추월했습니다.',
    url: '#'
  },
  {
    category: 'POLICY',
    source: 'Bloomberg Crypto',
    time: '3시간 전',
    title: '美 연준 금리 인하 사이클 진입 시사... 위험자산 시장 훈풍',
    summary: '제롬 파월 의장의 통화정책 완화 발언 이후 글로벌 유동성 확장 기대감이 가상자산 시장으로 번지고 있습니다.',
    url: '#'
  },
  {
    category: 'ALTCOIN',
    source: 'Decrypt',
    time: '5시간 전',
    title: 'AI x 블록체인 융합 프로젝트, 실리콘밸리 VC 투자 1위 달성',
    summary: '탈중앙 연산 네트워크 및 온체인 AI 에이전트 개발 프로젝트들이 최근 1달간 1억 5천만 달러 규모의 펀딩을 유치했습니다.',
    url: '#'
  },
  {
    category: 'REGULATION',
    source: 'Reuters',
    time: '7시간 전',
    title: '한국 금융당국, 가상자산이용자보호법 2단계 추진... 스테이블코인 가이드라인 발표 예정',
    summary: '원화 기반 스테이블코인 발행 요건 및 법인 계좌 허용 방안에 대한 공청회가 다음 달 개최될 예정입니다.',
    url: '#'
  }
];

// Live Chat Initial Messages
let chatMessages = [
  { user: 'Satoshi_Fan', rank: 'PRO', time: '20:25', text: '오늘 비트 움직임 심상치 않네요 65K 뚫을 기세입니다 🔥' },
  { user: 'CryptoWhale', rank: 'VIP', time: '20:26', text: '숏 포지션 청산 물량 많이 나왔습니다. 상방 압력 강합니다.' },
  { user: 'SolanaKing', rank: 'PRO', time: '20:28', text: '솔라나 154달러 안착했네요! 알트들도 따라갈듯' },
  { user: 'CoinBeginner', rank: 'Newbie', time: '20:30', text: '지금 진입해도 안 늦었을까요?? 조언 부탁드립니다!' },
  { user: 'PeacefulTrader', rank: 'Member', time: '20:31', text: '@CoinBeginner 한 번에 다 사지 마시고 3~4회 분할 매수로 접근하세요!' }
];

// ----------------------------------------------------
// Initialization
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // Initialize LocalStorage for forum if empty
  if (!localStorage.getItem('coinhub_forum_posts')) {
    localStorage.setItem('coinhub_forum_posts', JSON.stringify(INITIAL_FORUM_POSTS));
  }

  // Update Auth Section UI
  updateAuthUI();

  // Load Market Data
  fetchMarketData();

  // Initialize Price Chart
  initChart();

  // Render Forum Posts
  renderForumPosts();

  // Render News
  renderNews();

  // Render Chat
  renderChatMessages();

  // Initialize Lucide Icons
  lucide.createIcons();

  // Simulate Live Ticker Fluctuations every 4 seconds
  setInterval(simulateLiveFluctuations, 4000);
});

// ----------------------------------------------------
// Tab Switching
// ----------------------------------------------------
function switchTab(tabId) {
  const tabs = ['market', 'forum', 'chat', 'news'];
  tabs.forEach(t => {
    const el = document.getElementById(`tab-${t}`);
    const navBtn = document.getElementById(`nav-${t}`);
    const mNavBtn = document.getElementById(`m-nav-${t}`);

    if (t === tabId) {
      el.classList.remove('hidden');
      el.classList.add('block');
      if (navBtn) navBtn.classList.add('active');
      if (mNavBtn) {
        mNavBtn.classList.add('text-cyan-400');
        mNavBtn.classList.remove('text-slate-400');
      }
    } else {
      el.classList.remove('block');
      el.classList.add('hidden');
      if (navBtn) navBtn.classList.remove('active');
      if (mNavBtn) {
        mNavBtn.classList.remove('text-cyan-400');
        mNavBtn.classList.add('text-slate-400');
      }
    }
  });

  lucide.createIcons();
}

// ----------------------------------------------------
// Market Data & Ticker Logic
// ----------------------------------------------------
async function fetchMarketData() {
  const refreshIcon = document.getElementById('refresh-icon');
  if (refreshIcon) refreshIcon.classList.add('animate-spin');

  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=true&price_change_percentage=24h'
    );
    if (!response.ok) throw new Error('API Rate Limit or Network Error');
    const data = await response.json();
    marketCoins = data;
  } catch (err) {
    console.warn('Using default fallback crypto market data:', err);
    marketCoins = DEFAULT_COINS;
  } finally {
    if (refreshIcon) refreshIcon.classList.remove('animate-spin');
    renderMarketUI();
  }
}

function renderMarketUI() {
  // 1. Render Top Ticker Bar
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

  // 2. Update Top 3 Cards
  const btc = marketCoins.find(c => c.symbol.toLowerCase() === 'btc') || marketCoins[0];
  const eth = marketCoins.find(c => c.symbol.toLowerCase() === 'eth') || marketCoins[1];
  const gainer = [...marketCoins].sort((a,b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0))[0];

  if (btc) {
    document.getElementById('btc-price').innerText = `$${formatNumber(btc.current_price)}`;
    const btcBadge = document.getElementById('btc-badge');
    const isUp = (btc.price_change_percentage_24h || 0) >= 0;
    btcBadge.className = isUp ? 'badge-green text-xs font-mono font-bold px-2 py-0.5 rounded-full' : 'badge-red text-xs font-mono font-bold px-2 py-0.5 rounded-full';
    btcBadge.innerText = `${isUp ? '+' : ''}${(btc.price_change_percentage_24h || 0).toFixed(2)}%`;
  }

  if (eth) {
    document.getElementById('eth-price').innerText = `$${formatNumber(eth.current_price)}`;
    const ethBadge = document.getElementById('eth-badge');
    const isUp = (eth.price_change_percentage_24h || 0) >= 0;
    ethBadge.className = isUp ? 'badge-green text-xs font-mono font-bold px-2 py-0.5 rounded-full' : 'badge-red text-xs font-mono font-bold px-2 py-0.5 rounded-full';
    ethBadge.innerText = `${isUp ? '+' : ''}${(eth.price_change_percentage_24h || 0).toFixed(2)}%`;
  }

  if (gainer) {
    document.getElementById('gainer-name').innerText = `${gainer.name} (${gainer.symbol.toUpperCase()})`;
    document.getElementById('gainer-price').innerText = `$${formatNumber(gainer.current_price)}`;
    const gBadge = document.getElementById('gainer-badge');
    const isUp = (gainer.price_change_percentage_24h || 0) >= 0;
    gBadge.className = isUp ? 'badge-green text-xs font-mono font-bold px-2 py-0.5 rounded-full' : 'badge-red text-xs font-mono font-bold px-2 py-0.5 rounded-full';
    gBadge.innerText = `${isUp ? '+' : ''}${(gainer.price_change_percentage_24h || 0).toFixed(2)}%`;
  }

  // 3. Render Table Rows
  renderCoinTable(marketCoins);
}

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

function handleSearch(query) {
  if (!query) {
    renderCoinTable(marketCoins);
    return;
  }
  const filtered = marketCoins.filter(c => 
    c.name.toLowerCase().includes(query.toLowerCase()) || 
    c.symbol.toLowerCase().includes(query.toLowerCase())
  );
  renderCoinTable(filtered);
}

// ----------------------------------------------------
// Interactive Price Chart (Chart.js)
// ----------------------------------------------------
function initChart() {
  const ctx = document.getElementById('priceChart').getContext('2d');
  
  // Generate Mock historical data based on timeframe
  const points = generateChartData(selectedCoin.price || 64820, currentChartTimeframe);

  const gradient = ctx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, 'rgba(6, 182, 212, 0.35)');
  gradient.addColorStop(1, 'rgba(6, 182, 212, 0.0)');

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
        legend: { display: false },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: '#0b0f19',
          titleColor: '#94a3b8',
          bodyColor: '#38bdf8',
          borderColor: '#1e294b',
          borderWidth: 1,
          padding: 10,
          displayColors: false,
          callbacks: {
            label: function(context) {
              return `$${formatNumber(context.parsed.y)}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#64748b', font: { size: 10, family: 'JetBrains Mono' } }
        },
        y: {
          grid: { color: 'rgba(30, 41, 75, 0.4)' },
          ticks: { color: '#64748b', font: { size: 10, family: 'JetBrains Mono' } }
        }
      }
    }
  });

  updateChartStats(points.data);
}

function selectCoinForChart(id, name, symbol) {
  const coin = marketCoins.find(c => c.id === id) || { current_price: 64820 };
  selectedCoin = { id, name, symbol, price: coin.current_price };

  document.getElementById('chart-coin-name').innerText = name;
  document.getElementById('chart-coin-symbol').innerText = symbol;

  updateChartData();
}

function changeChartTimeframe(tf) {
  currentChartTimeframe = tf;
  const container = document.getElementById('timeframe-buttons');
  if (container) {
    const btns = container.querySelectorAll('.tf-btn');
    btns.forEach(b => {
      if (b.innerText.toLowerCase() === tf.toLowerCase()) {
        b.className = 'tf-btn px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400';
      } else {
        b.className = 'tf-btn px-2 py-0.5 rounded text-slate-400 hover:text-white';
      }
    });
  }
  updateChartData();
}

function updateChartData() {
  if (!priceChart) return;
  const points = generateChartData(selectedCoin.price, currentChartTimeframe);
  priceChart.data.labels = points.labels;
  priceChart.data.datasets[0].label = `${selectedCoin.name} (USD)`;
  priceChart.data.datasets[0].data = points.data;
  priceChart.update();
  updateChartStats(points.data);
}

function updateChartStats(data) {
  if (!data || data.length === 0) return;
  const max = Math.max(...data);
  const min = Math.min(...data);
  document.getElementById('chart-high').innerText = `$${formatNumber(max)}`;
  document.getElementById('chart-low').innerText = `$${formatNumber(min)}`;
}

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

// ----------------------------------------------------
// Community Forum Logic (CRUD & LocalStorage)
// ----------------------------------------------------
function getStoredPosts() {
  return JSON.parse(localStorage.getItem('coinhub_forum_posts')) || INITIAL_FORUM_POSTS;
}

function saveStoredPosts(posts) {
  localStorage.setItem('coinhub_forum_posts', JSON.stringify(posts));
}

function filterForum(category) {
  activeCategory = category;
  const buttons = document.querySelectorAll('#forum-category-filters .category-btn');
  buttons.forEach(btn => {
    if (btn.dataset.cat === category) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  renderForumPosts();
}

function renderForumPosts() {
  const container = document.getElementById('forum-posts-list');
  if (!container) return;

  let posts = getStoredPosts();

  // Category filter
  if (activeCategory !== 'all') {
    posts = posts.filter(p => p.category === activeCategory);
  }

  // Sorting
  const sortType = document.getElementById('forum-sort')?.value || 'latest';
  if (sortType === 'popular') {
    posts.sort((a, b) => b.upvotes - a.upvotes);
  } else if (sortType === 'comments') {
    posts.sort((a, b) => (b.comments?.length || 0) - (a.comments?.length || 0));
  } else {
    posts.sort((a, b) => b.timestamp - a.timestamp);
  }

  if (posts.length === 0) {
    container.innerHTML = `
      <div class="bg-navy-900 border border-navy-800 rounded-2xl p-10 text-center text-slate-400">
        <i data-lucide="inbox" class="w-10 h-10 mx-auto text-slate-600 mb-3"></i>
        <p class="text-sm">작성된 게시글이 없습니다. 첫 번째 토론 글을 남겨보세요!</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  container.innerHTML = posts.map(post => {
    const commentsCount = post.comments ? post.comments.length : 0;
    return `
      <div class="crypto-card bg-navy-900 border border-navy-800 rounded-2xl p-5 shadow-sm hover:border-cyan-500/40 transition cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" onclick="openPostDetailModal(${post.id})">
        <div class="flex-1 space-y-2">
          <div class="flex items-center gap-2">
            <span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">${post.categoryName}</span>
            <span class="text-xs text-slate-400">• ${post.time}</span>
            <span class="text-xs font-semibold text-slate-300">• ${post.author}</span>
            ${post.authorRank ? `<span class="text-[9px] px-1.5 py-0.2 rounded bg-navy-950 border border-navy-800 text-cyan-400 font-mono">${post.authorRank}</span>` : ''}
          </div>
          <h3 class="font-bold text-base text-white hover:text-cyan-400 transition">${escapeHtml(post.title)}</h3>
          <p class="text-xs text-slate-400 line-clamp-2">${escapeHtml(post.content)}</p>
        </div>

        <div class="flex items-center gap-3 self-end sm:self-center shrink-0 text-xs">
          <!-- Upvote Count -->
          <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-navy-950 border border-navy-800 text-cyan-400 font-bold font-mono">
            <i data-lucide="thumbs-up" class="w-3.5 h-3.5"></i>
            <span>${post.upvotes}</span>
          </div>

          <!-- Comments Count -->
          <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-navy-950 border border-navy-800 text-slate-300 font-mono">
            <i data-lucide="message-square" class="w-3.5 h-3.5 text-slate-400"></i>
            <span>${commentsCount}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

function openNewPostModal() {
  document.getElementById('new-post-modal').classList.remove('hidden');
}

function closeNewPostModal() {
  document.getElementById('new-post-modal').classList.add('hidden');
}

function handleCreatePost(e) {
  e.preventDefault();
  const category = document.getElementById('post-category-select').value;
  const title = document.getElementById('post-title-input').value.trim();
  const content = document.getElementById('post-content-input').value.trim();

  if (!title || !content) return;

  const categoryNames = {
    general: '💬 자유 토론',
    market: '📊 차트/기술적 분석',
    altcoin: '🚀 알트코인 분석',
    ico: '🪙 ICO / 신규 토큰',
    qna: '❓ 초보 Q&A'
  };

  const newPost = {
    id: Date.now(),
    category,
    categoryName: categoryNames[category] || '💬 자유 토론',
    title,
    content,
    author: currentUser ? currentUser.username : '익명 트레이더',
    authorRank: currentUser ? currentUser.rank : 'Member',
    upvotes: 1,
    views: 1,
    time: '방금 전',
    timestamp: Date.now(),
    comments: []
  };

  const posts = getStoredPosts();
  posts.unshift(newPost);
  saveStoredPosts(posts);

  closeNewPostModal();
  document.getElementById('post-title-input').value = '';
  document.getElementById('post-content-input').value = '';

  renderForumPosts();
  alert('게시글이 성공적으로 등록되었습니다!');
}

function openPostDetailModal(postId) {
  const posts = getStoredPosts();
  const post = posts.find(p => p.id === postId);
  if (!post) return;

  currentViewingPostId = postId;
  post.views = (post.views || 0) + 1;
  saveStoredPosts(posts);

  document.getElementById('modal-post-category').innerText = post.categoryName;
  document.getElementById('modal-post-title').innerText = post.title;
  document.getElementById('modal-post-author').innerText = `${post.author} (${post.authorRank || 'Member'})`;
  document.getElementById('modal-post-time').innerText = post.time;
  document.getElementById('modal-post-views').innerText = post.views;
  document.getElementById('modal-post-content').innerText = post.content;
  document.getElementById('modal-post-upvotes').innerText = post.upvotes;

  renderModalComments(post.comments || []);

  document.getElementById('post-detail-modal').classList.remove('hidden');
  lucide.createIcons();
}

function closePostDetailModal() {
  document.getElementById('post-detail-modal').classList.add('hidden');
  currentViewingPostId = null;
  renderForumPosts();
}

function handleVoteInModal(delta) {
  if (!currentViewingPostId) return;
  const posts = getStoredPosts();
  const post = posts.find(p => p.id === currentViewingPostId);
  if (!post) return;

  post.upvotes = Math.max(0, (post.upvotes || 0) + delta);
  saveStoredPosts(posts);

  document.getElementById('modal-post-upvotes').innerText = post.upvotes;
}

function renderModalComments(comments) {
  const container = document.getElementById('modal-comments-list');
  document.getElementById('modal-comments-count').innerText = comments.length;

  if (comments.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-500 py-3">첫 번째 댓글을 남겨보세요!</p>`;
    return;
  }

  container.innerHTML = comments.map(c => `
    <div class="bg-navy-950 p-3 rounded-xl border border-navy-800 text-xs">
      <div class="flex justify-between items-center text-slate-400 mb-1">
        <span class="font-bold text-slate-200">${c.author}</span>
        <span class="text-[10px]">${c.time}</span>
      </div>
      <p class="text-slate-300 leading-normal">${escapeHtml(c.text)}</p>
    </div>
  `).join('');
}

function handleAddComment() {
  if (!currentViewingPostId) return;
  const input = document.getElementById('new-comment-input');
  const text = input.value.trim();
  if (!text) return;

  const posts = getStoredPosts();
  const post = posts.find(p => p.id === currentViewingPostId);
  if (!post) return;

  if (!post.comments) post.comments = [];
  post.comments.push({
    id: Date.now(),
    author: currentUser ? currentUser.username : '익명 트레이더',
    text,
    time: '방금 전'
  });

  saveStoredPosts(posts);
  input.value = '';
  renderModalComments(post.comments);
}

// ----------------------------------------------------
// Real-Time Chat System
// ----------------------------------------------------
function renderChatMessages() {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  container.innerHTML = chatMessages.map(msg => `
    <div class="flex items-start gap-3 animate-in">
      <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-md">
        ${msg.user.substring(0, 2).toUpperCase()}
      </div>
      <div class="flex-1 bg-navy-950 p-3 rounded-2xl rounded-tl-none border border-navy-800/80">
        <div class="flex items-center gap-2 mb-1">
          <span class="font-bold text-xs text-slate-200">${msg.user}</span>
          <span class="text-[9px] px-1.5 py-0.2 rounded bg-navy-900 border border-navy-800 text-cyan-400 font-mono">${msg.rank}</span>
          <span class="text-[10px] text-slate-500 ml-auto font-mono">${msg.time}</span>
        </div>
        <p class="text-xs text-slate-300 leading-relaxed">${escapeHtml(msg.text)}</p>
      </div>
    </div>
  `).join('');

  container.scrollTop = container.scrollHeight;
}

function handleSendChat(e) {
  e.preventDefault();
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  chatMessages.push({
    user: currentUser ? currentUser.username : '익명 트레이더',
    rank: currentUser ? currentUser.rank : 'Member',
    time: timeStr,
    text
  });

  input.value = '';
  renderChatMessages();

  // Simulated auto-reply after 2 seconds
  setTimeout(() => {
    const botReplies = [
      '오늘 장세는 분할 매수 관점이 유효해 보입니다!',
      '미국 CPI 발표 전까지는 횡보 흐름 유지될 가능성이 큽니다.',
      '알트 도미넌스 반등 오면 크게 튈 수 있는 자리네요.',
      '수익 보신 분들 축하드립니다! 익절은 항상 옳습니다 🚀'
    ];
    const randomReply = botReplies[Math.floor(Math.random() * botReplies.length)];
    const replyNow = new Date();
    chatMessages.push({
      user: 'AlphaBot',
      rank: 'PRO',
      time: `${String(replyNow.getHours()).padStart(2, '0')}:${String(replyNow.getMinutes()).padStart(2, '0')}`,
      text: randomReply
    });
    renderChatMessages();
  }, 2500);
}

// ----------------------------------------------------
// News Aggregator
// ----------------------------------------------------
function renderNews() {
  const container = document.getElementById('news-grid');
  if (!container) return;

  container.innerHTML = NEWS_ITEMS.map(item => `
    <div class="bg-navy-900 border border-navy-800 rounded-2xl p-5 shadow-sm hover:border-cyan-500/40 transition flex flex-col justify-between group">
      <div>
        <div class="flex items-center justify-between text-xs text-slate-400 mb-2.5">
          <span class="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono font-bold text-[10px] border border-cyan-500/20">${item.category}</span>
          <span class="text-slate-500 font-medium">${item.source} • ${item.time}</span>
        </div>
        <h3 class="font-bold text-base text-white group-hover:text-cyan-400 transition leading-snug mb-2">${item.title}</h3>
        <p class="text-xs text-slate-400 leading-relaxed">${item.summary}</p>
      </div>
      <div class="mt-4 pt-3 border-t border-navy-800/80 flex items-center justify-between text-xs text-cyan-400 font-semibold">
        <span>전문 읽기</span>
        <i data-lucide="arrow-up-right" class="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"></i>
      </div>
    </div>
  `).join('');

  lucide.createIcons();
}

// ----------------------------------------------------
// User Authentication & Profile Simulation
// ----------------------------------------------------
function openAuthModal(mode) {
  document.getElementById('auth-modal').classList.remove('hidden');
}

function closeAuthModal() {
  document.getElementById('auth-modal').classList.add('hidden');
}

function handleAuthSubmit(e) {
  e.preventDefault();
  const username = document.getElementById('auth-username').value.trim();
  const email = document.getElementById('auth-email').value.trim();

  if (!username || !email) return;

  currentUser = {
    username,
    email,
    rank: 'PRO',
    reputation: 150,
    joinedDate: '2026.08',
    postsCount: 1
  };

  localStorage.setItem('coinhub_user', JSON.stringify(currentUser));
  closeAuthModal();
  updateAuthUI();
  alert(`${username}님 환영합니다! 로그인이 완료되었습니다.`);
}

function handleLogout() {
  localStorage.removeItem('coinhub_user');
  currentUser = null;
  updateAuthUI();
  alert('로그아웃 되었습니다.');
}

function updateAuthUI() {
  const authSection = document.getElementById('auth-section');
  if (!authSection) return;

  if (currentUser) {
    authSection.innerHTML = `
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-xs text-navy-950 font-mono shadow-md">
          ${currentUser.username.substring(0, 2).toUpperCase()}
        </div>
        <div class="hidden sm:block text-left text-xs">
          <div class="font-bold text-slate-100 flex items-center gap-1">
            ${currentUser.username}
            <span class="text-[9px] px-1 py-0.2 bg-cyan-500/20 text-cyan-400 rounded">PRO</span>
          </div>
          <div class="text-[10px] text-slate-400">평판점수: ${currentUser.reputation}점</div>
        </div>
        <button onclick="handleLogout()" class="ml-2 text-xs text-slate-400 hover:text-crypto-red transition p-1.5 rounded-lg hover:bg-navy-800" title="로그아웃">
          <i data-lucide="log-out" class="w-4 h-4"></i>
        </button>
      </div>
    `;
  } else {
    authSection.innerHTML = `
      <button onclick="openAuthModal('login')" class="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-navy-950 font-bold text-xs sm:text-sm px-4 py-2 rounded-lg shadow-lg shadow-cyan-500/20 transition flex items-center gap-1.5">
        <i data-lucide="user" class="w-4 h-4"></i> 로그인 / 가입
      </button>
    `;
  }

  lucide.createIcons();
}

// ----------------------------------------------------
// Utility Functions
// ----------------------------------------------------
function formatNumber(num) {
  if (num === null || num === undefined) return '0.00';
  if (num < 1) return num.toFixed(4);
  return Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCompact(num) {
  if (!num) return '0';
  if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  return Number(num).toLocaleString();
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function simulateLiveFluctuations() {
  if (marketCoins.length === 0) return;
  const randomIndex = Math.floor(Math.random() * Math.min(marketCoins.length, 5));
  const targetCoin = marketCoins[randomIndex];
  const delta = (Math.random() - 0.49) * 0.003;
  targetCoin.current_price = Number((targetCoin.current_price * (1 + delta)).toFixed(2));
}
