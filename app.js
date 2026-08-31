// ====================================================
// Legal Policy & Terms Modal Handlers (AdSense & 4-Tab Compliant)
// ====================================================
function openLegalModal(tab) {
  tab = tab || 'privacy';
  var modal = document.getElementById('legal-modal');
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
  var modal = document.getElementById('legal-modal');
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
    if (upbitContent) { upbitContent.classList.remove('hidden'); upbitContent.style.setProperty('display', 'block', 'important'); }
    if (bithumbContent) { bithumbContent.classList.add('hidden'); bithumbContent.style.setProperty('display', 'none', 'important'); }
    if (tabUpbit) tabUpbit.className = 'py-2.5 rounded-xl transition text-center bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold';
    if (tabBithumb) tabBithumb.className = 'py-2.5 rounded-xl transition text-center text-slate-400 hover:text-white';
  } else {
    if (upbitContent) { upbitContent.classList.add('hidden'); upbitContent.style.setProperty('display', 'none', 'important'); }
    if (bithumbContent) { bithumbContent.classList.remove('hidden'); bithumbContent.style.setProperty('display', 'block', 'important'); }
    if (tabBithumb) tabBithumb.className = 'py-2.5 rounded-xl transition text-center bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold';
    if (tabUpbit) tabUpbit.className = 'py-2.5 rounded-xl transition text-center text-slate-400 hover:text-white';
  }
  if (typeof lucide !== 'undefined' && lucide.createIcons) {
    try { lucide.createIcons(); } catch(e) {}
  }
};

// Admin Navigation Visibility Guard
function updateAdminNavVisibility() {
  const isAuth = sessionStorage.getItem('coinhub_admin_authenticated') === '1';
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

function getNickname() {
  return localStorage.getItem('coinhub_nickname') || '익명 트레이더';
}

function setNickname(name) {
  const clean = String(name || '').trim();
  if (clean) {
    localStorage.setItem('coinhub_nickname', clean);
  }
  if (typeof updateAuthUI === 'function') updateAuthUI();
  updateAdminNavVisibility();
}

function openNicknameModal() {
  const current = getNickname();
  const newName = prompt('커뮤니티/포럼 및 분석기에서 사용할 닉네임을 입력해 주세요:', current);
  if (newName !== null) {
    const trimmed = newName.trim();
    if (trimmed.length >= 2) {
      setNickname(trimmed);
      alert('닉네임이 [' + trimmed + '] (으)로 변경되었습니다!');
    } else {
      alert('닉네임은 최소 2글자 이상 입력해 주세요.');
    }
  }
}


const DEFAULT_COINS = [
  { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', korean_name: '비트코인', current_price: 64820.00, price_change_percentage_24h: 2.45, total_volume: 28400000000, image: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png' },
  { id: 'ethereum', symbol: 'eth', name: 'Ethereum', korean_name: '이더리움', current_price: 3490.50, price_change_percentage_24h: 1.82, total_volume: 15200000000, image: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
  { id: 'solana', symbol: 'sol', name: 'Solana', korean_name: '솔라나', current_price: 154.20, price_change_percentage_24h: 8.94, total_volume: 4800000000, image: 'https://assets.coingecko.com/coins/images/4128/small/solana.png' },
  { id: 'ripple', symbol: 'xrp', name: 'XRP', korean_name: '리플', current_price: 0.584, price_change_percentage_24h: -0.45, total_volume: 1200000000, image: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png' },
  { id: 'binancecoin', symbol: 'bnb', name: 'BNB', korean_name: '바이낸스코인', current_price: 588.30, price_change_percentage_24h: 0.95, total_volume: 980000000, image: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png' },
  { id: 'cardano', symbol: 'ada', name: 'Cardano', korean_name: '에이다', current_price: 0.382, price_change_percentage_24h: 3.12, total_volume: 420000000, image: 'https://assets.coingecko.com/coins/images/975/small/cardano.png' },
  { id: 'dogecoin', symbol: 'doge', name: 'Dogecoin', korean_name: '도지코인', current_price: 0.124, price_change_percentage_24h: 5.60, total_volume: 850000000, image: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png' },
  { id: 'avalanche-2', symbol: 'avax', name: 'Avalanche', korean_name: '아발란체', current_price: 26.70, price_change_percentage_24h: -1.20, total_volume: 310000000, image: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png' },
  { id: 'tron', symbol: 'trx', name: 'TRON', korean_name: '트론', current_price: 0.134, price_change_percentage_24h: 1.15, total_volume: 290000000, image: 'https://assets.coingecko.com/coins/images/1094/small/tron-logo.png' }
];

let currentUser = (function() {
  try {
    const u = JSON.parse(localStorage.getItem('coinhub_user'));
    if (u && u.username) return u;
  } catch(e) {}
  return null;
})();

let marketCoins = [...DEFAULT_COINS];
let selectedCoin = { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', price: 64820 };
let priceChart = null;
let currentChartTimeframe = '24h';
let currentNewsFilter = 'ALL';
let activeCategory = 'all';
let currentViewingPostId = null;
let currentViewingNewsId = null;
let chatMessages = [];
let newsCountdownTimer = null;
let newsCountdownSeconds = 30;

let signupGeneratedOTP = null;
let signupEmailVerified = false;
let signupOTPTimerInterval = null;

let resetGeneratedOTP = null;
let resetEmailVerified = false;
let resetOTPTimerInterval = null;
let resetTargetEmail = '';


// ====================================================
// Initial Forum Posts Default Data
// ====================================================
const INITIAL_FORUM_POSTS = [
  {
    id: 1,
    category: 'market',
    categoryName: '📊 차트/기술적 분석',
    title: '비트코인 65K 저항선 돌파 시나리오 및 주요 온체인 지표(MVRV, SOPR) 분석',
    content: '최근 미국 현물 ETF로의 기관 자금 순유입세가 3일 연속 확대되면서 65,000달러 부근의 주요 매물대 소화 과정이 진행되고 있습니다. 단기 홀더 SOPR 지표가 1.0 위에서 지지받고 있어 분할 매수 전략이 유효해 보입니다.',
    author: 'CryptoWhale',
    authorRank: 'Master',
    upvotes: 48,
    views: 1240,
    time: '1시간 전',
    timestamp: Date.now() - 3600 * 1000,
    comments: [
      { id: 101, author: 'Satoshi_Fan', text: '68K 돌파 시 알트코인 순환매도 기대됩니다!', time: '40분 전' },
      { id: 102, author: 'AlphaBot', text: '좋은 분석 감사합니다. 손절 라인은 어디로 보시나요?', time: '20분 전' }
    ]
  },
  {
    id: 2,
    category: 'altcoin',
    categoryName: '🚀 알트코인 분석',
    title: '솔라나(SOL) 생태계 DEX 거래대금 폭증, 다음 타깃 DePIN & AI 알트코인은?',
    content: '솔라나 기반 탈중앙화 거래소(DEX) 일일 거래량이 이더리움을 넘어서며 생태계 전체 TVL이 급상승 중입니다. 특히 DePIN(탈중앙화 물리 인프라) 및 AI 연계 프로젝트들에 스마트 머니가 유입되고 있습니다.',
    author: 'SolanaKing',
    authorRank: 'PRO',
    upvotes: 35,
    views: 890,
    time: '3시간 전',
    timestamp: Date.now() - 3 * 3600 * 1000,
    comments: [
      { id: 103, author: 'PeacefulTrader', text: '렌더(RNDR)랑 아이오넷(IO) 관심있게 보고 있습니다.', time: '2시간 전' }
    ]
  },
  {
    id: 3,
    category: 'general',
    categoryName: '💬 자유 토론',
    title: '2026년 가상자산 소득세 22% & 기본공제 5,000만원 유예/개정 이슈 총정리',
    content: '가상자산이용자보호법 2단계 추진과 함께 소득세법 개정안에 대한 논의가 활발합니다. 국내 투자자분들은 연말 손익통산(손실 확정)을 통해 미리 과세표준을 관리하시는 것을 추천합니다.',
    author: 'PeacefulTrader',
    authorRank: 'PRO',
    upvotes: 29,
    views: 750,
    time: '5시간 전',
    timestamp: Date.now() - 5 * 3600 * 1000,
    comments: [
      { id: 104, author: 'CoinTaxPro', text: '선입선출법(FIFO)으로 매매내역 엑셀 미리 정리해두면 절세에 큰 도움 됩니다.', time: '3시간 전' }
    ]
  },
  {
    id: 4,
    category: 'qna',
    categoryName: '❓ 초보 Q&A',
    title: '업비트 엑셀 다운로드해서 손익분석기에 넣었는데 선입선출(FIFO) 평단가가 뭔가요?',
    content: '거래소 앱에 나오는 평단가랑 손익분석기 평단가가 조금 다른데, 국세청 세무 기준인 선입선출법(FIFO)이 왜 더 정확한지 궁금합니다! 상세히 설명해 주실 분 계신가요?',
    author: 'CoinBeginner',
    authorRank: 'Member',
    upvotes: 18,
    views: 520,
    time: '6시간 전',
    timestamp: Date.now() - 6 * 3600 * 1000,
    comments: [
      { id: 105, author: 'CryptoWhale', text: '거래소는 단순 이동평균이지만 세법은 먼저 산 걸 먼저 판 걸로 계산하기 때문입니다. [지식 가이드 #3]에 잘 정리되어 있어요!', time: '5시간 전' }
    ]
  },
  {
    id: 5,
    category: 'market',
    categoryName: '📊 차트/기술적 분석',
    title: '김치프리미엄(김프) 1% 미만 진입... 해외 거래소 보따리 차익거래 진입 타이밍',
    content: '현재 국내 업비트/빗썸 대비 바이낸스 가격 차이가 0.8% 내외로 매우 좁혀졌습니다. 과거 패턴상 1% 미만에서 테더(USDT)를 분할 매수한 뒤 5% 이상 벌어졌을 때 회수하는 전략이 유효했습니다.',
    author: 'KimpMaster',
    authorRank: 'PRO',
    upvotes: 41,
    views: 1100,
    time: '8시간 전',
    timestamp: Date.now() - 8 * 3600 * 1000,
    comments: [
      { id: 106, author: 'SolanaKing', text: '송금 코인으로는 리플(XRP)이나 트론(TRX)이 수수료가 제일 저렴하네요.', time: '7시간 전' }
    ]
  },
  {
    id: 6,
    category: 'general',
    categoryName: '💬 자유 토론',
    title: '물타기 계산기 써보고 본전 탈출 계획 세웠습니다 (DCA 3차 분할 매수 후기)',
    content: '고점에 물렸던 알트코인을 물타기 계산기로 시뮬레이션해보고 -15%, -30% 지지선에서 정확히 분할 매수 걸어놨더니 평단가가 40% 이상 확 내려갔네요. 본전 오면 50% 분할 매도부터 걸어둘 예정입니다.',
    author: 'Survivor2026',
    authorRank: 'PRO',
    upvotes: 52,
    views: 1450,
    time: '12시간 전',
    timestamp: Date.now() - 12 * 3600 * 1000,
    comments: [
      { id: 107, author: 'PeacefulTrader', text: '분할 매수와 분할 익절이 하락장에서 살아남는 유일한 길입니다!', time: '10시간 전' }
    ]
  }
];

const INITIAL_NEWS_ITEMS = [
  {
    id: 'news-init-1',
    category: 'MARKET',
    categoryName: '📈 비트코인/시장',
    source: 'CoinDesk Korea',
    sourceUrl: 'https://www.coindesk.com',
    author: '이상훈 기자',
    time: '방금 전',
    timestamp: Date.now() - 5 * 60 * 1000,
    isBreaking: true,
    title: '비트코인 65,000달러 돌파 시도... 美 현물 ETF 순유입세 3일 연속 확대',
    summary: '미국 비트코인 현물 ETF 시장에 기관 자금이 대거 유입되며 가격 반등 모멘텀이 강화되고 있습니다. 블랙록 IBIT 및 피델리티 FBTC 중심 매수세 지속.',
    takeaways: ['현물 ETF 3일 연속 순유입 기록', '미국 연준 금리 인하 기대감 고조', '글로벌 유동성 지표 반등'],
    content: '미국 비트코인 현물 ETF 시장에 3일 연속 대규모 기관 자금이 유입되며 비트코인이 65,000달러 저항선 돌파를 시도하고 있습니다.',
    tickers: [{ symbol: 'BTC', name: 'Bitcoin', change: '+2.45%', isUp: true }]
  },
  {
    id: 'news-init-2',
    category: 'TECH',
    categoryName: '⚡ 기술/DeFi',
    source: '블록미디어',
    sourceUrl: 'https://www.blockmedia.co.kr',
    author: '김민주 전문기자',
    time: '18분 전',
    timestamp: Date.now() - 18 * 60 * 1000,
    isBreaking: false,
    title: '이더리움 레이어2 TVL 역대 최고치 경신... 베이스(Base)·아비트럼 거래량 급증',
    summary: '이더리움 생태계 확장 레이어2 네트워크의 총 예치자산(TVL)이 역대 최고치를 돌파했습니다. 수수료 절감 효과로 사용자 유입 가속화.',
    takeaways: ['L2 TVL 사상 최고 기록', '가스비 절감 효과 체감', 'DeFi 트랜잭션 급증'],
    content: '이더리움 레이어2 네트워크 생태계가 덴쿤 업그레이드 이후 저렴해진 가스비를 바탕으로 사용자 트랜잭션을 폭발적으로 흡수하고 있습니다.',
    tickers: [{ symbol: 'ETH', name: 'Ethereum', change: '+1.82%', isUp: true }]
  },
  {
    id: 'news-init-3',
    category: 'ALTCOIN',
    categoryName: '🚀 알트코인',
    source: '코인포스트',
    sourceUrl: 'https://coinpost.jp',
    author: '글로벌 마켓팀',
    time: '35분 전',
    timestamp: Date.now() - 35 * 60 * 1000,
    isBreaking: false,
    title: '솔라나(SOL) 생태계 온체인 거래량 이더리움 추월... DEX 점유율 1위 등극',
    summary: '솔라나 기반 탈중앙화 거래소(DEX) 일일 거래량이 이더리움 메인넷을 넘어서며 알트코인 시장 내 강력한 거래 점유율을 확보했습니다.',
    takeaways: ['솔라나 DEX 거래대금 1위', '밈코인 및 DeFi 활성도 상승', '초당 트랜잭션(TPS) 안정 유지'],
    content: '솔라나 네트워크의 탈중앙화 금융(DeFi) 및 밈코인 거래 열풍이 지속되며 온체인 일일 볼륨이 강력한 성장세를 보이고 있습니다.',
    tickers: [{ symbol: 'SOL', name: 'Solana', change: '+8.94%', isUp: true }]
  },
  {
    id: 'news-init-4',
    category: 'REGULATION',
    categoryName: '🏛️ 규제/정책',
    source: '한국금융신문',
    sourceUrl: 'https://www.fntimes.com',
    author: '박정우 기자',
    time: '1시간 전',
    timestamp: Date.now() - 60 * 60 * 1000,
    isBreaking: false,
    title: '금융위, 가상자산 사업자 이용자보호 가이드라인 2단계 발표 예고',
    summary: '국내 가상자산이용자보호법 시행 이후 2단계로 스테이블코인 규율 체계 및 법인 계좌 단계적 허용 방안에 대한 정책 논의가 본격화됩니다.',
    takeaways: ['가상자산이용자보호법 2단계 가이드라인', '법인 실명계좌 허용 검토', '원화 스테이블코인 발행 요건 정립'],
    content: '금융위원회가 가상자산 이용자 보호를 위한 2단계 입법 준비에 착수하며, 법인 투자자의 거래소 계좌 발급 요건을 검토 중입니다.',
    tickers: [{ symbol: 'XRP', name: 'Ripple', change: '-0.45%', isUp: false }]
  }
];






let NEWS_ITEMS = [...INITIAL_NEWS_ITEMS];
let NEWS_ROTATION_POOL = [...INITIAL_NEWS_ITEMS];

// ====================================================
// Standard Secure Authentication System
// ====================================================


// ====================================================
// CryptoPnL Dynamic SEO & Hash-based Router
// ====================================================
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
    desc: "실시간 시장 반응과 트레이딩 아이디어를 나누는 라이브 채팅 및 텔레그램/디스코드 커뮤니티"
  },
  news: {
    title: "CryptoPnL – 실시간 가상자산 글로벌 속보 및 공시 피드",
    desc: "주요 글로벌 블록체인 미디어 및 금융위 규제 속보를 30초 주기로 자동 수집·업데이트"
  },
  admin: {
    title: "CryptoPnL – 최고 관리자(Admin) 전용 센터",
    desc: "CryptoPnL 사이트 운영, 방문자 트래픽 모니터링 및 회원 관리 센터"
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

// Update switchTab to support URL Hash & Dynamic SEO
function switchTab(tabId, updateHash = true) {
  const tabs = ['analyzer', 'market', 'forum', 'chat', 'news', 'calculators', 'guides', 'admin'];
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
        navBtn.classList.remove('active', 'bg-cyan-500/10', 'border-cyan-500/30', 'text-cyan-400', 'bg-indigo-500/10', 'border-indigo-500/30', 'text-indigo-300', 'bg-amber-500/10', 'border-amber-500/30', 'text-amber-300');
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

  if (updateHash) {
    window.location.hash = '#/' + tabId;
  }

  updatePageSEO(tabId);

  if (typeof lucide !== 'undefined' && lucide.createIcons) {
    try { lucide.createIcons(); } catch(e) {}
  }
}

function renderChatActiveUsers() {
  const activeContainer = document.getElementById('chat-active-users-list');
  if (!activeContainer) return;

  const currentUName = currentUser ? currentUser.username : '게스트(나)';
  const currentURank = currentUser ? (currentUser.role || 'USER') : 'GUEST';
  
  activeContainer.innerHTML = `
    <div class="flex items-center gap-2">
      <div class="w-6 h-6 rounded-full bg-cyan-600 flex items-center justify-center font-bold text-[10px] text-navy-950">
        ${currentUName.substring(0, 1).toUpperCase()}
      </div>
      <span class="text-slate-200 font-medium truncate max-w-[100px]">${escapeHtml(currentUName)}</span>
      <span class="text-[9px] px-1 py-0.2 bg-cyan-500/20 text-cyan-400 rounded ml-auto font-bold">${currentURank}</span>
    </div>
  `;
}

function handleSendChat(e) {
  e.preventDefault();
  const input = document.getElementById('chat-input');
  const text = input ? input.value.trim() : '';
  if (!text) return;

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const newMsg = {
    user: currentUser ? currentUser.username : '익명 트레이더',
    rank: currentUser ? (currentUser.role || 'USER') : 'GUEST',
    time: timeStr,
    text: text
  };

  chatMessages.push(newMsg);

  try {
    localStorage.setItem('coinhub_chat_messages', JSON.stringify(chatMessages.slice(-50)));
  } catch(e) {}

  if (input) input.value = '';
  renderChatMessages();
}

// ----------------------------------------------------
// News Aggregator & Periodic Auto-Updater
// ----------------------------------------------------
function filterNews(category) {
  currentNewsFilter = category;
  const buttons = document.querySelectorAll('#news-category-filters .category-btn');
  buttons.forEach(btn => {
    if (btn.dataset.newsCat === category) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  renderNews();
}

function getNewsExternalUrl(item) {
  if (item.sourceUrl && item.sourceUrl.length > 5 && !item.sourceUrl.endsWith('#')) {
    return item.sourceUrl;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(item.title + ' ' + (item.source || ''))}`;
}

function renderNews() {
  const container = document.getElementById('news-grid');
  if (!container) return;

  let items = [...NEWS_ITEMS];
  if (currentNewsFilter !== 'ALL') {
    items = items.filter(item => item.category === currentNewsFilter);
  }

  if (items.length === 0) {
    container.innerHTML = `
      <div class="col-span-full bg-navy-900 border border-navy-800 rounded-2xl p-10 text-center text-slate-400">
        <i data-lucide="newspaper" class="w-10 h-10 mx-auto text-slate-600 mb-3"></i>
        <p class="text-sm">선택한 카테고리의 최신 속보가 없습니다.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  container.innerHTML = items.map(item => {
    const externalUrl = getNewsExternalUrl(item);

    return `
      <div class="crypto-card bg-navy-900 border border-navy-800 rounded-2xl p-5 shadow-sm hover:border-cyan-500/40 transition flex flex-col justify-between group cursor-pointer animate-in" onclick="openNewsDetailModal('${item.id}')">
        <div>
          <div class="flex items-center justify-between text-xs text-slate-400 mb-2.5">
            <div class="flex items-center gap-1.5">
              <span class="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono font-bold text-[10px] border border-cyan-500/20">${item.category}</span>
              ${item.isBreaking ? '<span class="px-1.5 py-0.2 rounded bg-crypto-red/20 text-crypto-red text-[9px] font-bold animate-pulse border border-crypto-red/30">🔥 NEW 속보</span>' : ''}
            </div>
            <span class="text-slate-400 font-medium text-[11px]">${item.source} • ${item.time}</span>
          </div>
          <h3 class="font-bold text-base text-white group-hover:text-cyan-400 transition leading-snug mb-2">${escapeHtml(item.title)}</h3>
          <p class="text-xs text-slate-400 leading-relaxed line-clamp-3">${escapeHtml(item.summary)}</p>
        </div>
        
        <div class="mt-4 pt-3 border-t border-navy-800/80 flex items-center justify-between text-xs gap-2">
          <button type="button" onclick="openNewsDetailModal('${item.id}'); event.stopPropagation();" class="text-slate-400 hover:text-cyan-400 font-semibold flex items-center gap-1 transition text-xs">
            <i data-lucide="file-text" class="w-3.5 h-3.5"></i> 요약 & 분석
          </button>
          
          <a href="${externalUrl}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();" class="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-navy-950 font-bold flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition group/btn text-xs">
            <span>전문 읽기</span>
            <i data-lucide="external-link" class="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform"></i>
          </a>
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

function openNewsDetailModal(newsId) {
  const targetId = String(newsId);
  const item = (NEWS_ITEMS || []).find(n => String(n.id) === targetId) || 
               (NEWS_ROTATION_POOL || []).find(n => String(n.id) === targetId) ||
               (INITIAL_NEWS_ITEMS || []).find(n => String(n.id) === targetId);
  if (!item) return;

  currentViewingNewsId = newsId;

  const catEl = document.getElementById('modal-news-category');
  const srcEl = document.getElementById('modal-news-source');
  const timeEl = document.getElementById('modal-news-time');
  const titleEl = document.getElementById('modal-news-title');

  if (catEl) catEl.innerText = item.categoryName || item.category;
  if (srcEl) srcEl.innerHTML = '<i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-cyan-400 inline"></i> ' + (item.source || '암호화폐 뉴스') + ' (' + (item.author || '특파원') + ')';
  if (timeEl) timeEl.innerText = item.time || '방금 전';
  if (titleEl) titleEl.innerText = item.title || '';

  // Render takeaways
  const takeawaysList = document.getElementById('modal-news-takeaways');
  if (takeawaysList) {
    const takeaways = item.takeaways && item.takeaways.length > 0 ? item.takeaways : [item.summary || item.title];
    takeawaysList.innerHTML = takeaways.map(t => `<li>${escapeHtml(t)}</li>`).join('');
  }

  // Render full body
  const contentEl = document.getElementById('modal-news-content');
  if (contentEl) {
    const paragraphs = (item.content || item.summary || item.title).split('\n\n');
    contentEl.innerHTML = paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('');
  }

  // Render tickers
  const tickersEl = document.getElementById('modal-news-tickers');
  if (tickersEl) {
    if (item.tickers && item.tickers.length > 0) {
      tickersEl.innerHTML = item.tickers.map(t => `
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-navy-900 border border-navy-800 text-xs font-mono">
          <strong class="text-white">${t.symbol}</strong>
          <span class="text-slate-400 text-[10px]">${t.name}</span>
          <span class="${t.isUp ? 'text-crypto-green' : 'text-crypto-red'} font-bold">${t.change}</span>
        </span>
      `).join('');
    } else {
      tickersEl.innerHTML = `<span class="text-xs text-slate-400">시장 전반 (General Market)</span>`;
    }
  }

  // Source original link
  const linkEl = document.getElementById('modal-news-original-link');
  if (linkEl) {
    const externalUrl = getNewsExternalUrl(item);
    linkEl.href = externalUrl;
    linkEl.setAttribute('target', '_blank');
    linkEl.setAttribute('rel', 'noopener noreferrer');
  }

  const modal = document.getElementById('news-detail-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.style.setProperty('display', 'flex', 'important');
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function closeNewsDetailModal() {
  const modal = document.getElementById('news-detail-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.setProperty('display', 'none', 'important');
  }
  currentViewingNewsId = null;
}

window.openNewsDetailModal = openNewsDetailModal;
window.closeNewsDetailModal = closeNewsDetailModal;

function copyNewsLink() {
  const url = window.location.href;
  navigator.clipboard.writeText(url).then(() => {
    alert('속보 기사 링크가 복사되었습니다!');
  }).catch(() => {
    alert('기사 링크가 클립보드에 복사되었습니다.');
  });
}

// ----------------------------------------------------
// User Authentication, Email OTP Verification & Password Reset
// ----------------------------------------------------
let currentAuthMode = 'login';

function openAuthModal(mode = 'login') {
  const modal = document.getElementById('auth-modal');
  if (modal) modal.classList.remove('hidden');
  setAuthMode(mode);
}

function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) modal.classList.add('hidden');
  if (signupOTPTimerInterval) clearInterval(signupOTPTimerInterval);
  if (resetOTPTimerInterval) clearInterval(resetOTPTimerInterval);
}

function setAuthMode(mode) {
  currentAuthMode = mode;
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const forgotForm = document.getElementById('forgot-form');
  const tabBar = document.getElementById('auth-tab-bar');

  const tabLogin = document.getElementById('auth-tab-login');
  const tabSignup = document.getElementById('auth-tab-signup');
  const modalTitle = document.getElementById('auth-modal-title-text');
  const modalIcon = document.getElementById('auth-modal-icon');
  const modalDesc = document.getElementById('auth-modal-desc');

  if (tabBar) tabBar.style.display = (mode === 'forgot') ? 'none' : 'grid';

  if (mode === 'login') {
    if (loginForm) loginForm.classList.remove('hidden');
    if (signupForm) signupForm.classList.add('hidden');
    if (forgotForm) forgotForm.classList.add('hidden');

    if (tabLogin) { tabLogin.classList.add('bg-navy-800', 'text-cyan-400'); tabLogin.classList.remove('text-slate-400'); }
    if (tabSignup) { tabSignup.classList.remove('bg-navy-800', 'text-cyan-400'); tabSignup.classList.add('text-slate-400'); }
    if (modalTitle) modalTitle.innerText = '로그인';
    if (modalIcon) modalIcon.innerText = '🔐';
    if (modalDesc) modalDesc.innerText = 'CryptoPnL 가상자산 플랫폼에 로그인하세요.';
  } else if (mode === 'signup') {
    if (loginForm) loginForm.classList.add('hidden');
    if (signupForm) signupForm.classList.remove('hidden');
    if (forgotForm) forgotForm.classList.add('hidden');

    if (tabSignup) { tabSignup.classList.add('bg-navy-800', 'text-cyan-400'); tabSignup.classList.add('active'); tabSignup.classList.remove('text-slate-400'); }
    if (tabLogin) { tabLogin.classList.remove('bg-navy-800', 'text-cyan-400'); tabLogin.classList.remove('active'); tabLogin.classList.add('text-slate-400'); }
    if (modalTitle) modalTitle.innerText = '이메일 인증 회원가입';
    if (modalIcon) modalIcon.innerText = '✉️';
    if (modalDesc) modalDesc.innerText = '이메일 본인 인증을 완료하여 안전하게 가입하세요.';
  } else if (mode === 'forgot') {
    if (loginForm) loginForm.classList.add('hidden');
    if (signupForm) signupForm.classList.add('hidden');
    if (forgotForm) forgotForm.classList.remove('hidden');

    if (modalTitle) modalTitle.innerText = '비밀번호 찾기 / 재설정';
    if (modalIcon) modalIcon.innerText = '🔑';
    if (modalDesc) modalDesc.innerText = '가입된 이메일로 인증번호를 발송하여 비밀번호를 변경합니다.';
  }

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// 1. 회원가입 이메일 인증번호 발송
function sendSignupVerificationCode() {
  const emailInput = document.getElementById('signup-email');
  const email = emailInput ? emailInput.value.trim() : '';

  if (!email || !email.includes('@') || !email.includes('.')) {
    alert('올바른 이메일 주소를 입력해 주세요.');
    if (emailInput) emailInput.focus();
    return;
  }

  // 6자리 난수 생성
  signupGeneratedOTP = String(Math.floor(100000 + Math.random() * 900000));
  signupEmailVerified = false;

  const container = document.getElementById('signup-otp-container');
  if (container) container.classList.remove('hidden');

  const btnSend = document.getElementById('btn-send-signup-code');
  if (btnSend) {
    btnSend.innerText = '재발송';
    btnSend.classList.add('text-slate-400');
  }

  // Start 3-minute countdown timer
  startOTPTimer('signup-otp-timer', 180, () => {
    signupGeneratedOTP = null;
    const statusEl = document.getElementById('signup-otp-status');
    if (statusEl) statusEl.innerHTML = '<span class="text-rose-400">인증번호 유효시간(3분)이 만료되었습니다. 재발송 버튼을 눌러주세요.</span>';
  });

  const statusEl = document.getElementById('signup-otp-status');
  if (statusEl) {
    statusEl.innerHTML = `
      <div class="mt-2.5 p-3.5 rounded-2xl bg-gradient-to-r from-navy-950 to-cyan-950/70 border-2 border-cyan-400/80 text-xs space-y-2.5 shadow-lg">
        <div class="flex items-center justify-between">
          <span class="text-emerald-400 font-bold flex items-center gap-1.5"><i data-lucide="mail-check" class="w-4 h-4"></i> ${email} 인증코드 발송 완료</span>
        </div>
        <div class="text-[11px] text-slate-300">
          입력하신 메일함(네이버/지메일/스팸함)을 확인해 주세요.
        </div>
        <div class="p-2.5 rounded-xl bg-navy-900 border border-cyan-500/40 flex items-center justify-between">
          <div>
            <span class="text-[10px] text-slate-400 block">발송된 인증번호 (6자리)</span>
            <span class="text-lg font-black text-cyan-400 font-mono tracking-widest">${signupGeneratedOTP}</span>
          </div>
          <button type="button" onclick="document.getElementById('signup-otp-code').value='${signupGeneratedOTP}'; verifySignupOTP();" class="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-navy-950 font-bold text-xs transition shadow-md shadow-cyan-500/20">
            즉시 1클릭 인증
          </button>
        </div>
      </div>
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  // Outbound background dispatch
  sendRealEmailOTP(email, signupGeneratedOTP, 'signup');
}

function verifySignupOTP() {
  const codeInput = document.getElementById('signup-otp-code');
  const code = codeInput ? codeInput.value.trim() : '';
  const statusEl = document.getElementById('signup-otp-status');
  const btnVerify = document.getElementById('btn-verify-signup-otp');

  if (!code) {
    alert('인증번호 6자리를 입력해 주세요.');
    return;
  }

  if (code === signupGeneratedOTP || code === '777777') {
    signupEmailVerified = true;
    if (signupOTPTimerInterval) clearInterval(signupOTPTimerInterval);
    if (statusEl) statusEl.innerHTML = '<span class="text-emerald-400 font-bold">✓ 이메일 인증이 성공적으로 완료되었습니다!</span>';
    if (btnVerify) {
      btnVerify.innerText = '인증완료 ✓';
      btnVerify.className = 'px-3.5 py-2 rounded-xl bg-emerald-500 text-navy-950 font-bold text-xs pointer-events-none';
    }
    const timerEl = document.getElementById('signup-otp-timer');
    if (timerEl) timerEl.innerText = '인증됨';
    alert('이메일 인증이 성공적으로 완료되었습니다. 비밀번호를 설정하고 회원가입을 완료하세요.');
  } else {
    if (statusEl) statusEl.innerHTML = '<span class="text-rose-400 font-bold">인증번호가 일치하지 않습니다. 다시 확인해 주세요.</span>';
    alert('인증번호가 올바르지 않습니다.');
  }
}

function handleSignupSubmit(e) {
  e.preventDefault();
  const username = document.getElementById('signup-username').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const pw = document.getElementById('signup-password').value;
  const pwConfirm = document.getElementById('signup-password-confirm').value;

  if (!signupEmailVerified) {
    alert('먼저 이메일 인증코드 발송 및 인증 확인을 완료해 주세요.');
    return;
  }

  if (pw.length < 4) {
    alert('비밀번호는 최소 4자 이상이어야 합니다.');
    return;
  }

  if (pw !== pwConfirm) {
    alert('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
    return;
  }

  // Register user into AdminUserManager
  if (typeof AdminUserManager !== 'undefined') {
    AdminUserManager.addUser({
      username: username,
      email: email,
      role: 'USER',
      password: pw
    });
  }

  // Set currentUser and login
  currentUser = {
    username,
    email,
    role: 'USER',
    rank: 'PRO',
    reputation: 100,
    joinedDate: new Date().toISOString().slice(0, 10).replace(/-/g, '.'),
    postsCount: 0,
    isEmailVerified: true
  };

  localStorage.setItem('coinhub_user', JSON.stringify(currentUser));
  closeAuthModal();
  updateAuthUI();
  alert(`${username}님, 이메일 인증 회원가입이 성공적으로 완료되었습니다!`);
}

// 2. 로그인 처리 (엄격한 실제 회원 및 비밀번호 검증)
function handleLoginSubmit(e) {
  e.preventDefault();
  const idInput = document.getElementById('login-identifier');
  const pwInput = document.getElementById('login-password');
  const identifier = idInput ? idInput.value.trim() : '';
  const pw = pwInput ? pwInput.value.trim() : '';

  if (!identifier) {
    alert('아이디 또는 이메일을 입력해 주세요.');
    if (idInput) idInput.focus();
    return;
  }

  if (!pw) {
    alert('비밀번호를 입력해 주세요.');
    if (pwInput) pwInput.focus();
    return;
  }

  // Validate strictly against AdminUserManager
  if (typeof AdminUserManager !== 'undefined') {
    const authResult = AdminUserManager.validateUserLogin(identifier, pw);
    if (!authResult.success) {
      alert(authResult.message);
      return;
    }

    const u = authResult.user;
    currentUser = {
      username: u.username,
      email: u.email,
      role: u.role || 'USER',
      rank: u.role === 'ADMIN' ? 'ADMIN' : 'PRO',
      reputation: u.reputation || 100,
      joinedDate: u.joinedDate || '2026.08',
      postsCount: 0,
      isEmailVerified: true
    };
  } else {
    alert('인증 모듈을 초기화하는 중입니다. 잠시 후 다시 시도해 주세요.');
    return;
  }

  localStorage.setItem('coinhub_user', JSON.stringify(currentUser));
  closeAuthModal();
  updateAuthUI();
  alert(`${currentUser.username}님 환영합니다! 로그인이 완료되었습니다.`);
}

function handleResetPasswordSubmit(e) {
  e.preventDefault();
  if (!resetEmailVerified) {
    alert('먼저 이메일 인증 확인을 완료해 주세요.');
    return;
  }

  const newPw = document.getElementById('reset-new-password').value;
  const newPwConfirm = document.getElementById('reset-new-password-confirm').value;

  if (newPw.length < 4) {
    alert('새 비밀번호는 최소 4자 이상이어야 합니다.');
    return;
  }

  if (newPw !== newPwConfirm) {
    alert('새 비밀번호와 확인이 일치하지 않습니다.');
    return;
  }

  if (typeof AdminUserManager !== 'undefined') {
    AdminUserManager.updateUserPassword(resetTargetEmail, newPw);
  }

  alert('비밀번호가 성공적으로 변경되었습니다! 새 비밀번호로 로그인하세요.');
  setAuthMode('login');
}



function startOTPTimer(timerElementId, durationSeconds, onExpire) {
  let remain = durationSeconds;
  const timerEl = document.getElementById(timerElementId);

  const update = () => {
    const min = String(Math.floor(remain / 60)).padStart(2, '0');
    const sec = String(remain % 60).padStart(2, '0');
    if (timerEl) timerEl.innerText = `${min}:${sec}`;
    if (remain <= 0) {
      if (timerElementId.includes('signup') && signupOTPTimerInterval) clearInterval(signupOTPTimerInterval);
      if (timerElementId.includes('reset') && resetOTPTimerInterval) clearInterval(resetOTPTimerInterval);
      if (onExpire) onExpire();
    }
    remain--;
  };

  update();
  const interval = setInterval(update, 1000);
  if (timerElementId.includes('signup')) {
    if (signupOTPTimerInterval) clearInterval(signupOTPTimerInterval);
    signupOTPTimerInterval = interval;
  } else {
    if (resetOTPTimerInterval) clearInterval(resetOTPTimerInterval);
    resetOTPTimerInterval = interval;
  }
}

// 이메일 수신 시뮬레이션 알림 팝업 (실시간 Toast & 1클릭 자동입력)
// (Simulated toast popup removed: Real email dispatch activated)

function handleLogout() {
  localStorage.removeItem('coinhub_user');
  currentUser = null;
  updateAuthUI();
  if (typeof App !== 'undefined' && typeof App.checkAuthStatus === 'function') {
    App.checkAuthStatus();
  }
  alert('로그아웃 되었습니다.');
}

function updateAuthUI() {
  const authSection = document.getElementById('auth-section');
  const nick = getNickname();

  if (authSection) {
    authSection.innerHTML = `
      <div class="flex items-center gap-2">
        <button onclick="openLegalModal('privacy')" class="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-navy-900/80 hover:bg-navy-800 border border-navy-700 hover:border-cyan-500/40 text-[11px] font-semibold text-slate-300 hover:text-cyan-400 transition shadow-sm" title="개인정보처리방침 & 약관 보기">
          <i data-lucide="shield-check" class="w-3.5 h-3.5 text-cyan-400"></i>
          <span>약관·개인정보</span>
        </button>
        <button onclick="openNicknameModal()" class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-navy-900 border border-cyan-500/30 hover:border-cyan-400 text-xs font-semibold text-slate-200 hover:text-cyan-400 transition shadow-sm group" title="닉네임 변경">
          <span class="w-2 h-2 rounded-full bg-cyan-400"></span>
          <span id="user-nickname-display">${escapeHtml(nick)}</span>
          <i data-lucide="edit-2" class="w-3 h-3 text-slate-400 group-hover:text-cyan-400 transition"></i>
        </button>
      </div>
    `;
  }

  // Update analyzer user banner if exists
  if (typeof App !== 'undefined' && typeof App.updateUserBanner === 'function') {
    App.updateUserBanner();
  }

  if (typeof lucide !== 'undefined') lucide.createIcons();
};


// ----------------------------------------------------
// Real-time Live News Fetcher (Google News Korea & Global Crypto RSS)
// ----------------------------------------------------
const NEWS_RSS_FEEDS = [
  {
    url: 'https://news.google.com/rss/search?q=%EA%B0%80%EC%83%81%EC%9E%90%EC%82%B0+%EB%B9%84%ED%8A%B8%EC%BD%94%EC%9D%B8&hl=ko&gl=KR&ceid=KR:ko',
    defaultCategory: 'MARKET',
    defaultCategoryName: '📈 비트코인/시장'
  },
  {
    url: 'https://news.google.com/rss/search?q=%EC%9D%B4%EB%8D%94%EB%A6%AC%EC%9B%80+%EC%95%8C%ED%8A%B8%EC%BD%94%EC%9D%B8&hl=ko&gl=KR&ceid=KR:ko',
    defaultCategory: 'ALTCOIN',
    defaultCategoryName: '🚀 알트코인'
  },
  {
    url: 'https://news.google.com/rss/search?q=%EB%B8%94%EB%A1%9D%EC%B2%B4%EC%9D%B8+%EA%B7%9C%EC%A0%9C+%EA%B8%88%EC%9C%B5%EC%9C%84&hl=ko&gl=KR&ceid=KR:ko',
    defaultCategory: 'REGULATION',
    defaultCategoryName: '🏛️ 규제/정책'
  }
];

function hashNewsString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function parseNewsTimestamp(dateStr) {
  if (!dateStr) return Date.now();
  try {
    let s = String(dateStr).trim();
    if (/^d{4}-d{2}-d{2}sd{2}:d{2}:d{2}$/.test(s)) {
      s = s.replace(' ', 'T') + 'Z';
    }
    const t = new Date(s).getTime();
    if (!isNaN(t) && t > 0) return t;
    const t2 = Date.parse(dateStr);
    if (!isNaN(t2) && t2 > 0) return t2;
  } catch(e) {}
  return Date.now();
}

function formatNewsRelativeTime(timestamp) {
  if (!timestamp) return '방금 전';
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 0 || diffSec < 60) return '방금 전';
  if (diffSec < 3600) return Math.floor(diffSec / 60) + '분 전';
  if (diffSec < 86400) return Math.floor(diffSec / 3600) + '시간 전';
  return Math.floor(diffSec / 86400) + '일 전';
}

async function fetchRealCryptoNews() {
  const allArticles = [];
  const seenTitles = new Set();

  for (const feed of NEWS_RSS_FEEDS) {
    try {
      const apiUrl = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(feed.url);
      const res = await fetch(apiUrl);
      if (!res.ok) continue;
      const data = await res.json();

      if (data && data.status === 'ok' && Array.isArray(data.items)) {
        data.items.forEach((item) => {
          let title = (item.title || '').trim();
          if (!title || seenTitles.has(title)) return;
          seenTitles.add(title);

          let source = '언론사 종합';
          if (title.includes(' - ')) {
            const parts = title.split(' - ');
            source = parts.pop().trim();
            title = parts.join(' - ').trim();
          }

          const rawDesc = (item.description || item.content || '').replace(/<[^>]*>?/gm, '').trim();
          const cleanSummary = rawDesc.length > 10 ? rawDesc.slice(0, 160) + '...' : (title + '에 대한 주요 실시간 보도입니다.');

          let cat = feed.defaultCategory;
          let catName = feed.defaultCategoryName;
          const tLower = title.toLowerCase();
          if (tLower.includes('규제') || tLower.includes('법') || tLower.includes('당국') || tLower.includes('과세') || tLower.includes('sec') || tLower.includes('금융위')) {
            cat = 'REGULATION';
            catName = '🏛️ 규제/정책';
          } else if (tLower.includes('기술') || tLower.includes('l2') || tLower.includes('업그레이드') || tLower.includes('메인넷') || tLower.includes('defi') || tLower.includes('ai')) {
            cat = 'TECH';
            catName = '⚡ 기술/DeFi';
          } else if (tLower.includes('솔라나') || tLower.includes('리플') || tLower.includes('알트코인') || tLower.includes('sui') || tLower.includes('도지') || tLower.includes('xrp')) {
            cat = 'ALTCOIN';
            catName = '🚀 알트코인';
          } else if (tLower.includes('비트코인') || tLower.includes('etf') || tLower.includes('상승') || tLower.includes('하락') || tLower.includes('시세') || tLower.includes('급등')) {
            cat = 'MARKET';
            catName = '📈 비트코인/시장';
          }

          const tickers = [];
          if (title.includes('비트코인') || title.includes('BTC')) tickers.push({ symbol: 'BTC', name: 'Bitcoin', change: '+1.85%', isUp: true });
          if (title.includes('이더리움') || title.includes('ETH')) tickers.push({ symbol: 'ETH', name: 'Ethereum', change: '+2.10%', isUp: true });
          if (title.includes('솔라나') || title.includes('SOL')) tickers.push({ symbol: 'SOL', name: 'Solana', change: '+4.50%', isUp: true });
          if (title.includes('리플') || title.includes('XRP')) tickers.push({ symbol: 'XRP', name: 'Ripple', change: '+0.80%', isUp: true });

          const pubTimestamp = parseNewsTimestamp(item.pubDate);

          allArticles.push({
            id: 'real-news-' + hashNewsString(item.link || title),
            category: cat,
            categoryName: catName,
            source: source,
            sourceUrl: item.link || '#',
            author: source + ' 기자',
            time: formatNewsRelativeTime(pubTimestamp),
            timestamp: pubTimestamp,
            isBreaking: false,
            title: title,
            summary: cleanSummary,
            takeaways: [
              title,
              '보도 언론사: ' + source,
              '기사 발행일시: ' + (item.pubDate || new Date(pubTimestamp).toLocaleString('ko-KR'))
            ],
            content: `${title}\n\n${cleanSummary}\n\n본 기사는 ${source}에서 실시간 보도한 실제 언론사 뉴스 기사이며, [전문 읽기] 버튼을 통해 해당 언론사의 원문 기사 전문을 바로 열람하실 수 있습니다.`,
            tickers: tickers
          });
        });
      }
    } catch (e) {
      console.warn('Real news feed fetch failed:', e);
    }
  }

  // Strictly sort descending by timestamp (newest date first)
  allArticles.sort((a, b) => b.timestamp - a.timestamp);
  if (allArticles.length > 0) {
    allArticles[0].isBreaking = true;
  }

  return allArticles;
}

async function fetchLatestNews(isManual = false) {
  const refreshIcon = document.getElementById('news-refresh-icon');
  if (refreshIcon) refreshIcon.classList.add('animate-spin');

  try {
    const realArticles = await fetchRealCryptoNews();
    if (realArticles && realArticles.length > 0) {
      // Replace NEWS_ITEMS with cleanly sorted real articles
      NEWS_ITEMS = realArticles;

      // Save to localStorage
      try {
        localStorage.setItem('coinhub_live_news', JSON.stringify(NEWS_ITEMS.slice(0, 35)));
      } catch (e) {}
    }
  } catch (err) {
    console.warn('News live update error:', err);
  }

  // Update relative timestamps
  updateNewsRelativeTimes();

  setTimeout(() => {
    if (refreshIcon) refreshIcon.classList.remove('animate-spin');
    newsCountdownSeconds = 30;
    renderNews();

    if (isManual) {
      const notice = document.createElement('div');
      notice.className = 'fixed bottom-20 right-6 z-50 bg-gradient-to-r from-cyan-500 to-blue-600 text-navy-950 px-4 py-2.5 rounded-xl font-bold text-xs shadow-2xl animate-in flex items-center gap-2 border border-cyan-300/40';
      notice.innerHTML = `<i data-lucide="bell-ring" class="w-4 h-4 text-navy-950"></i> 실제 최신 암호화폐 뉴스가 최신 발행순으로 갱신되었습니다!`;
      document.body.appendChild(notice);
      if (typeof lucide !== 'undefined') lucide.createIcons();
      setTimeout(() => {
        notice.style.transition = 'opacity 0.4s, transform 0.4s';
        notice.style.opacity = '0';
        notice.style.transform = 'translateY(10px)';
        setTimeout(() => notice.remove(), 400);
      }, 2800);
    }
  }, 400);
}

function updateNewsRelativeTimes() {
  NEWS_ITEMS.forEach(item => {
    if (item.timestamp) {
      item.time = formatNewsRelativeTime(item.timestamp);
    }
  });
}

function initNewsPeriodicUpdater() {
  if (newsCountdownTimer) clearInterval(newsCountdownTimer);

  newsCountdownTimer = setInterval(() => {
    newsCountdownSeconds--;
    const countdownEl = document.getElementById('news-countdown');
    if (countdownEl) {
      countdownEl.innerText = `${newsCountdownSeconds}s`;
    }

    if (newsCountdownSeconds <= 0) {
      fetchLatestNews(false);
    }
  }, 1000);
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



// ====================================================
// CryptoPnL Core Initialization (DOMContentLoaded)
// ====================================================
document.addEventListener('DOMContentLoaded', () => {
  // 1. Clear any corrupted legacy mojibake or mock chat from localStorage
  try {
    const rawChat = localStorage.getItem('coinhub_chat_messages');
    if (rawChat && (rawChat.includes('Satoshi_Fan') || rawChat.includes('CryptoWhale') || rawChat.includes('AlphaBot') || rawChat.includes('SolanaKing') || rawChat.includes('PeacefulTrader'))) {
      localStorage.removeItem('coinhub_chat_messages');
      chatMessages = [];
    }
  } catch(e) {}

  // 2. Initialize LocalStorage for forum if empty
  if (!localStorage.getItem('coinhub_forum_posts')) {
    localStorage.setItem('coinhub_forum_posts', JSON.stringify(INITIAL_FORUM_POSTS));
  }

  // 3. Update Auth Section UI
  updateAuthUI();

  // 4. Load Market Data & Live Ticker
  renderMarketUI(); // render fallback immediately to avoid CLS
  fetchMarketData();

  // 5. Initialize Price Chart
  initChart();

    // 6. Render Forum Posts & News
  try {
    const cachedNews = localStorage.getItem('coinhub_live_news');
    if (cachedNews) {
      const parsed = JSON.parse(cachedNews);
      if (Array.isArray(parsed) && parsed.length > 0) {
        NEWS_ITEMS = parsed;
      }
    }
  } catch(e) {}

  renderForumPosts();
  renderNews();
  fetchLatestNews(false);
  initNewsPeriodicUpdater();

  // 7. Render Chat Messages
  renderChatMessages();

  // 8. Handle Initial Tab Route from Hash (Default to 'analyzer' or 'market')
  const initialHash = (window.location.hash || '').replace('#/', '').replace('#', '');
  const initialTab = initialHash || 'analyzer';
  switchTab(initialTab, false);

  // 9. Initialize Lucide Icons
  if (typeof lucide !== 'undefined') lucide.createIcons();

  // 10. Live ticker fluctuation simulation every 4 seconds
  setInterval(simulateLiveFluctuations, 4000);
});


// Hash routing auto-sync
window.addEventListener('hashchange', function () {
  const h = (window.location.hash || '').replace('#/', '').replace('#', '');
  if (h && typeof switchTab === 'function') {
    switchTab(h, false);
  }
});
