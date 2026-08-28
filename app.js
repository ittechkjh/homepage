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
      { id: 104, author: 'CryptoMaster', text: '멘탈 관리에 정말 큰 도움 되는 글입니다. 감사합니다!', time: '3시간 전' },
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

// Active News State & Initial Mock News Data with Full Article Contents
let currentNewsFilter = 'ALL';
let newsCountdownSeconds = 30;
let newsCountdownTimer = null;
let currentViewingNewsId = null;

let NEWS_ITEMS = [
  {
    id: 'news-1',
    category: 'MARKET',
    categoryName: '📈 비트코인/시장',
    source: 'CoinDesk',
    sourceUrl: 'https://www.coindesk.com',
    author: 'Helene Braun 특파원',
    time: '방금 전',
    timestamp: Date.now() - 3 * 60 * 1000,
    isBreaking: true,
    title: '비트코인 현물 ETF, 일주일 만에 순유입 4억 2,000만 달러 돌파',
    summary: '기관 투자자들의 암호화폐 수용 확대와 거시 경제 안정세가 맞물리며 미국 비트코인 현물 ETF로의 기관 자금 유입이 가속화되고 있습니다.',
    takeaways: [
      '미국 11개 비트코인 현물 ETF로 5거래일 연속 순유입 달성',
      '블랙록 IBIT 및 피델리티 FBTC가 전체 유입액의 75% 주도',
      '기관 장외(OTC) 매집 물량 증가로 거래소 유통 잔고 5년 래 최저치 경신'
    ],
    content: `뉴욕 증권거래소에 상장된 미국 비트코인 현물 ETF로의 자금 순유입세가 가파른 상승 곡선을 그리고 있습니다. 파사이드 인베스터스(Farside Investors)의 최신 온체인 집계 데이터에 따르면, 지난 일주일간 11개 비트코인 현물 ETF로 유입된 순자금 규모는 4억 2,800만 달러(한화 약 5,700억 원)를 넘어섰습니다.\n\n특히 세계 최대 자산운용사인 블랙록의 iShares Bitcoin Trust(IBIT)와 피델리티의 Wise Origin Bitcoin Fund(FBTC)가 이번 상승 랠리의 주요 유입을 견인했습니다. IBIT는 단일 주간에만 2억 1,000만 달러 상당의 비트코인을 추가 매수하며 총 운용자산(AUM) 220억 달러 고지를 목전에 두고 있습니다.\n\n월가 금융 전문가들은 미국 연방준비제도(Fed)의 금리 인하 기대감과 미 대선 국면에서의 가상자산 친화적 정책 공약들이 기관 투자자들의 포트폴리오 다각화 수요를 자극하고 있다고 분석했습니다.\n\n글로벌 암호화폐 리서치사 관계자는 "거래소에 보관된 비트코인 보유량이 최근 5년 중 최저 수준으로 하락하면서 공급 부족(Supply Squeeze) 압력이 점차 가시화되고 있다"며 "현 추세가 이어질 경우 4분기 사상 최고가 재도전이 유력하다"고 전망했습니다.`,
    tickers: [
      { symbol: 'BTC', name: 'Bitcoin', change: '+3.45%', isUp: true },
      { symbol: 'IBIT', name: 'BlackRock ETF', change: '+3.80%', isUp: true }
    ]
  },
  {
    id: 'news-2',
    category: 'TECH',
    categoryName: '⚡ 기술/DeFi',
    source: 'Cointelegraph',
    sourceUrl: 'https://cointelegraph.com',
    author: 'Tom Mitchelhill 기자',
    time: '15분 전',
    timestamp: Date.now() - 15 * 60 * 1000,
    isBreaking: false,
    title: '이더리움 차기 업그레이드 테스트넷 성공적 가동... L2 수수료 80% 추가 절감',
    summary: '개발자 코어 회의에서 Layer 2 롤업 비용을 대폭 절감하는 EIP-4844 후속 데이터 가용성 개선 패치가 승인되었습니다.',
    takeaways: [
      '홀스카이(Holesky) 테스트넷에서 Pectra 업그레이드 1차 검증 완료',
      'EIP-7702 계정 추상화 및 밸리데이터 스테이킹 한도 2,048 ETH로 확대',
      '아비트럼, 옵티미즘, 베이스 등 L2 전송 수수료 $0.005 미만으로 감소 전망'
    ],
    content: `이더리움 코어 개발팀이 진행한 차기 메이저 하드포크 '펙트라(Pectra)'의 첫 번째 공식 테스트넷 시뮬레이션이 기술적 오류 없이 성공적으로 완료되었습니다.\n\n이번 업그레이드는 지난 덴쿤(Dencun) 업그레이드의 핵심이었던 '블롭(Blob)' 데이터 저장 용량을 2배 이상 확장하고, 스마트 컨트랙트 지갑의 UX를 웹2 수준으로 혁신하는 EIP-7702 제안을 포함하고 있습니다.\n\n이에 따라 Arbitrum, Optimism, Base 등 주요 Layer 2 롤업 네트워크의 가스비(수수료)는 현재보다 약 70~80% 추가 절감되어 트랜잭션당 0.005달러(약 6원) 이하로 떨어질 것으로 예상됩니다.\n\n이더리움 재단 연구원은 "펙트라 업그레이드는 기관급 대규모 탈중앙 금융(DeFi) 트랜잭션을 수용하기 위한 핵심 기반"이라며 "메인넷 정식 배포는 올해 4분기 말에서 내년 초로 예상된다"고 밝혔습니다.`,
    tickers: [
      { symbol: 'ETH', name: 'Ethereum', change: '+2.15%', isUp: true },
      { symbol: 'ARB', name: 'Arbitrum', change: '+5.40%', isUp: true },
      { symbol: 'OP', name: 'Optimism', change: '+4.80%', isUp: true }
    ]
  },
  {
    id: 'news-3',
    category: 'ALTCOIN',
    categoryName: '🚀 알트코인',
    source: 'The Block',
    sourceUrl: 'https://www.theblock.co',
    author: 'Tim Copeland 수석 애널리스트',
    time: '42분 전',
    timestamp: Date.now() - 42 * 60 * 1000,
    isBreaking: true,
    title: '솔라나 DeFi TVL 52억 달러 돌파... 탈중앙 거래소(DEX) 점유율 역대 최고',
    summary: '솔라나 메인넷의 일일 탈중앙 거래소 거래량이 급증하며 DEX 주간 거래량에서 이더리움 메인넷을 일시 추월했습니다.',
    takeaways: [
      '솔라나 TVL 52억 달러(약 7조 원) 돌파하며 연중 최고치 경신',
      'Jupiter, Raydium 등 주요 DEX 24시간 거래대금 28억 달러 기록',
      'DePIN 및 AI 연계 온체인 프로젝트 활성 지갑 수 전월 대비 40% 증가'
    ],
    content: `솔라나(Solana) 블록체인이 DeFi(탈중앙 금융)와 DePIN(탈중앙 물리 인프라), 밈코인 생태계의 폭발적인 성장에 힘입어 총 예치 자산(TVL) 52억 달러 고지를 돌파했습니다.\n\n디파이라마(DefiLlama) 통계에 따르면 솔라나 기반 대표 탈중앙 거래소 애그리게이터인 주피터(Jupiter)와 레이디움(Raydium)의 일일 합산 거래량은 28억 달러를 기록해 이더리움 메인넷 DEX 거래량을 상회했습니다.\n\n전문가들은 초당 3,000건 이상의 빠른 트랜잭션 처리 속도와 0.001달러 미만의 저렴한 수수료 구조가 개인 및 고빈도 알고리즘 트레이더들을 대거 유입시킨 원동력이라고 평가했습니다.\n\n솔라나 재단 관계자는 "Firedancer 독립 검증자 클라이언트 도입이 임박함에 따라 네트워크 처리량과 안정성이 한 단계 더 도약할 것"이라고 강조했습니다.`,
    tickers: [
      { symbol: 'SOL', name: 'Solana', change: '+8.94%', isUp: true },
      { symbol: 'JUP', name: 'Jupiter', change: '+12.30%', isUp: true },
      { symbol: 'RAY', name: 'Raydium', change: '+9.10%', isUp: true }
    ]
  },
  {
    id: 'news-4',
    category: 'MARKET',
    categoryName: '📈 비트코인/시장',
    source: 'Bloomberg Crypto',
    sourceUrl: 'https://www.bloomberg.com/crypto',
    author: 'Olga Kharif 금융 전문기자',
    time: '1시간 전',
    timestamp: Date.now() - 60 * 60 * 1000,
    isBreaking: false,
    title: '美 연준 금리 인하 사이클 본격화 전망... 글로벌 거시 유동성 가상자산 시장 유입',
    summary: '제롬 파월 연준 의장의 통화정책 완화 기조 발언 이후 글로벌 유동성 확장 기대감이 가상자산 및 위험자산 시장 전반으로 확산되고 있습니다.',
    takeaways: [
      '연방공개시장위원회(FOMC) 9월 0.25%p~0.50%p 금리 인하 확률 100% 반영',
      '달러 인덱스(DXY) 약세 전환에 따른 디지털 금(비트코인) 매력도 상승',
      '글로벌 M2 통화량 증가 추세와 비트코인 가격의 역사적 동조화 주목'
    ],
    content: `미국 연방준비제도(Fed)가 수년간 이어진 고금리 긴축 통화정책을 마무리하고 본격적인 금리 인하 사이클에 진입할 것이 확실시되면서 가상자산 시장이 강력한 모멘텀을 얻고 있습니다.\n\n블룸버그 인텔리전스 거시경제팀은 "역사적으로 글로벌 M2(광의 통화) 공급량 확대 국면에서 비트코인은 가장 높은 베타(민감도)를 보이며 시장을 주도해왔다"며 "금리 인하로 인한 글로벌 유동성 공급은 암호화폐 시장에 강력한 호재"라고 진단했습니다.\n\n실제로 달러화 가치를 나타내는 달러 인덱스(DXY)가 101선으로 하락하면서 대체 가치저장 수단으로서의 비트코인과 금(Gold)에 대한 투자 수요가 동반 상승하고 있습니다.`,
    tickers: [
      { symbol: 'BTC', name: 'Bitcoin', change: '+3.45%', isUp: true },
      { symbol: 'DXY', name: 'US Dollar Index', change: '-0.42%', isUp: false }
    ]
  },
  {
    id: 'news-5',
    category: 'TECH',
    categoryName: '⚡ 기술/DeFi',
    source: 'Decrypt',
    sourceUrl: 'https://decrypt.co',
    author: 'Sander Lutz 기자',
    time: '2시간 전',
    timestamp: Date.now() - 120 * 60 * 1000,
    isBreaking: false,
    title: 'AI x 블록체인 융합 인프라 프로젝트, 실리콘밸리 VC 펀딩 1억 5천만 달러 유치',
    summary: '탈중앙 GPU 연산 클러스터 및 온체인 AI 자율 에이전트 개발 스타트업들이 글로벌 벤처캐피털로부터 대규모 투자를 유치했습니다.',
    takeaways: [
      '탈중앙 AI 연산 네트워크 io.net 및 Render 생태계 투자 확대',
      'AI 에이전트가 온체인에서 자율적으로 자산을 거래하고 결제하는 프로토콜 등장',
      'a16z crypto, Paradigm 등 탑티어 크립토 VC 참여'
    ],
    content: `인공지능(AI)과 탈중앙 블록체인 인프라를 결합한 Web3 AI 프로토콜들이 실리콘밸리 벤처캐피털(VC) 시장에서 가장 뜨거운 투자 섹터로 부상했습니다.\n\n최근 1개월간 탈중앙 GPU 클러스터 컴퓨팅 및 온체인 AI 결제 인프라를 구축하는 5개 프로젝트가 총 1억 5,000만 달러(약 2,000억 원) 규모의 시리즈 A/B 펀딩을 마무리했습니다.\n\n업계 전문가들은 중앙화 빅테크 기업의 GPU 독점 문제를 탈중앙 크립토 인센티브 모델로 해결할 수 있다는 점에 주목하고 있습니다. 분산형 노드 참여자들은 유휴 그래픽카드를 제공하고 암호화폐 보상을 받으며, AI 스타트업들은 기존 클라우드 대비 70% 저렴한 비용으로 연산 자원을 대여받게 됩니다.`,
    tickers: [
      { symbol: 'RNDR', name: 'Render Token', change: '+7.60%', isUp: true },
      { symbol: 'NEAR', name: 'Near Protocol', change: '+6.10%', isUp: true },
      { symbol: 'FET', name: 'Artificial Superintelligence', change: '+11.20%', isUp: true }
    ]
  },
  {
    id: 'news-6',
    category: 'REGULATION',
    categoryName: '🏛️ 규제/정책',
    source: 'Reuters',
    sourceUrl: 'https://www.reuters.com',
    author: 'Hannah Lang 금융 정책 전문기자',
    time: '3시간 전',
    timestamp: Date.now() - 180 * 60 * 1000,
    isBreaking: false,
    title: '한국 금융당국, 가상자산이용자보호법 2단계 추진... 스테이블코인 및 법인 계좌 가이드라인 발표',
    summary: '원화 기반 스테이블코인 발행 규정 정립 및 법인·기관의 가상자산 실명계좌 허용 방안에 대한 정책 공청회가 본격화됩니다.',
    takeaways: [
      '가상자산이용자보호법 2단계 입법 준비 착수',
      '법인 및 기관 투자자의 국내 가상자산 거래소 실명계좌 발급 단계적 허용 검토',
      '원화 연동 스테이블코인 준비금 100% 국채·예금 의무화 방침'
    ],
    content: `금융위원회와 금융감독원이 지난달 시행된 '가상자산이용자보호법 1단계'에 이어, 가상자산 발행 및 공시 체계, 법인 계좌 허용을 골자로 하는 '2단계 법안' 마련에 본격 착수했습니다.\n\n이번 2단계 가이드라인의 핵심은 국내 상장 법인 및 전문 투자기관의 원화 실명확인 입출금 계정 개설 허용 여부입니다. 그동안 국내 법인은 가상자산 거래가 사실상 차단되어 있어 글로벌 시장 대비 경쟁력 약화 문제가 꾸준히 제기되어 왔습니다.\n\n또한 금융당국은 디지털 원화 기반 스테이블코인 발행 사업자의 요건을 은행 및 엄격한 건전성 요건을 갖춘 금융사로 한정하고, 발행액의 100%를 안전자산으로 예치하도록 하는 규제 프레임워크를 수립 중이라고 밝혔습니다.`,
    tickers: [
      { symbol: 'XRP', name: 'Ripple', change: '+1.40%', isUp: true },
      { symbol: 'USDC', name: 'USD Coin', change: '+0.01%', isUp: true }
    ]
  }
];

// Rolling Pool for Periodic Breaking News Injection
const NEWS_ROTATION_POOL = [
  {
    category: 'MARKET',
    categoryName: '📈 비트코인/시장',
    source: 'CoinDesk',
    sourceUrl: 'https://www.coindesk.com',
    author: '시장 동향팀',
    title: '🔥 [속보] 비트코인 66,000달러 일시 돌파... 숏 스퀴즈로 1억 2천만 달러 청산',
    summary: '바이낸스 및 OKX 등 주요 선물 거래소에서 숏 포지션 대규모 강제 청산이 발생하며 급등세가 연출되었습니다.',
    takeaways: [
      '비트코인 24시간 거래량 전일 대비 45% 급증',
      '파생상품 시장 미결제약정(OI) 사상 최고치 경신',
      '주요 저항선 65.5K 돌파 성공하며 추가 상승 여력 확대'
    ],
    content: `비트코인이 강력한 매수세와 함께 66,000달러 선을 일시 터치했습니다. 코인글래스(Coinglass)에 따르면 지난 1시간 동안 청산된 선물 숏 포지션 규모는 1억 2,000만 달러에 달합니다.\n\n선물 시장의 매도 압력이 해소되면서 현물 매수세가 가세해 상방 랠리를 이끌었습니다. 분석가들은 68,000달러가 다음 핵심 관문이 될 것으로 전망하고 있습니다.`,
    tickers: [{ symbol: 'BTC', name: 'Bitcoin', change: '+4.80%', isUp: true }]
  },
  {
    category: 'ALTCOIN',
    categoryName: '🚀 알트코인',
    source: 'The Block',
    sourceUrl: 'https://www.theblock.co',
    author: '알트코인 분석팀',
    title: '🔥 [속보] Sui(SUI) 메인넷 일일 트랜잭션 1억 건 달성... 대형 웹3 게임 런칭 효과',
    summary: '새롭게 출시된 온체인 RPG 게임 및 DeFi 프로토콜 활성화로 Sui 메인넷 처리량이 신기록을 작성했습니다.',
    takeaways: [
      'Sui 일일 활성 사용자 수(DAU) 120만 명 돌파',
      'Move 언어 기반 병렬 트랜잭션 처리 효율성 입증',
      '글로벌 거래소 상장 및 스테이킹 보상 프로그램 가동'
    ],
    content: `레이어1 블록체인 Sui(수이)가 일일 트랜잭션 수 1억 건을 돌파하며 역대 최고치를 달성했습니다.\n\n초당 수천 건의 트랜잭션을 실시간 처리하는 객체 중심 모델과 저렴한 수수료가 대규모 웹3 게이머와 온체인 사용자를 성공적으로 유입시켰다는 분석입니다.`,
    tickers: [{ symbol: 'SUI', name: 'Sui', change: '+14.20%', isUp: true }]
  },
  {
    category: 'TECH',
    categoryName: '⚡ 기술/DeFi',
    source: 'Cointelegraph',
    sourceUrl: 'https://cointelegraph.com',
    author: '블록체인 기술팀',
    title: '🔥 [속보] 비탈릭 부테린 "이더리움 L2 상호운용성 표준 가이드라인 다음 주 공개"',
    summary: '서로 다른 Layer 2 네트워크 간 자산 이동과 스마트 컨트랙트 호출을 원클릭으로 통합하는 표준안이 발표됩니다.',
    takeaways: [
      '크로스체인 브릿지 보안 취약점 대폭 개선',
      '사용자가 네트워크를 인식하지 않고도 단일 계정으로 모든 L2 사용 가능',
      'ERC-7683 크로스체인 인텐트 표준 채택 가속화'
    ],
    content: `이더리움 창시자 비탈릭 부테린이 소셜 미디어를 통해 서로 다른 L2 네트워크 간의 파편화 문제를 종결시킬 범용 상호운용성 가이드라인을 다음 주 정식 공개하겠다고 밝혔습니다.\n\n이를 통해 사용자는 별도의 브릿징 작업 없이 아비트럼, 옵티미즘, 베이스 간의 자산을 자유자재로 즉시 전송할 수 있게 됩니다.`,
    tickers: [
      { symbol: 'ETH', name: 'Ethereum', change: '+3.10%', isUp: true },
      { symbol: 'OP', name: 'Optimism', change: '+6.20%', isUp: true }
    ]
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
  initNewsPeriodicUpdater();

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
  const tabs = ['market', 'forum', 'chat', 'news', 'analyzer'];
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
  const item = NEWS_ITEMS.find(n => n.id === newsId) || NEWS_ROTATION_POOL.find(n => n.id === newsId);
  if (!item) return;

  currentViewingNewsId = newsId;

  document.getElementById('modal-news-category').innerText = item.categoryName || item.category;
  document.getElementById('modal-news-source').innerHTML = `<i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-cyan-400 inline"></i> ${item.source} (${item.author || '특파원'})`;
  document.getElementById('modal-news-time').innerText = item.time;
  document.getElementById('modal-news-title').innerText = item.title;

  // Render takeaways
  const takeawaysList = document.getElementById('modal-news-takeaways');
  if (takeawaysList) {
    const takeaways = item.takeaways && item.takeaways.length > 0 ? item.takeaways : [item.summary];
    takeawaysList.innerHTML = takeaways.map(t => `<li>${escapeHtml(t)}</li>`).join('');
  }

  // Render full body
  const contentEl = document.getElementById('modal-news-content');
  if (contentEl) {
    const paragraphs = (item.content || item.summary).split('\n\n');
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

  document.getElementById('news-detail-modal').classList.remove('hidden');
  lucide.createIcons();
}

function closeNewsDetailModal() {
  document.getElementById('news-detail-modal').classList.add('hidden');
  currentViewingNewsId = null;
}

function copyNewsLink() {
  const url = window.location.href;
  navigator.clipboard.writeText(url).then(() => {
    alert('속보 기사 링크가 복사되었습니다!');
  }).catch(() => {
    alert('기사 링크가 클립보드에 복사되었습니다.');
  });
}

function fetchLatestNews(isManual = false) {
  const refreshIcon = document.getElementById('news-refresh-icon');
  if (refreshIcon) refreshIcon.classList.add('animate-spin');

  // Inject a new breaking story from pool if available
  if (NEWS_ROTATION_POOL.length > 0) {
    const nextItem = NEWS_ROTATION_POOL.shift();
    nextItem.id = `news-${Date.now()}`;
    nextItem.time = '방금 전';
    nextItem.timestamp = Date.now();
    nextItem.isBreaking = true;
    NEWS_ITEMS.unshift(nextItem);
  }

  // Update relative timestamps
  updateNewsRelativeTimes();

  setTimeout(() => {
    if (refreshIcon) refreshIcon.classList.remove('animate-spin');
    newsCountdownSeconds = 30;
    renderNews();
    if (isManual) {
      // Toast notice
      const notice = document.createElement('div');
      notice.className = 'fixed bottom-20 right-6 z-50 bg-cyan-500 text-navy-950 px-4 py-2.5 rounded-xl font-bold text-xs shadow-2xl animate-in flex items-center gap-2';
      notice.innerHTML = `<i data-lucide="bell" class="w-4 h-4"></i> 최신 암호화폐 속보가 실시간 갱신되었습니다!`;
      document.body.appendChild(notice);
      lucide.createIcons();
      setTimeout(() => notice.remove(), 3000);
    }
  }, 600);
}

function updateNewsRelativeTimes() {
  const now = Date.now();
  NEWS_ITEMS.forEach(item => {
    if (!item.timestamp) return;
    const diffSec = Math.floor((now - item.timestamp) / 1000);
    if (diffSec < 60) {
      item.time = '방금 전';
    } else if (diffSec < 3600) {
      item.time = `${Math.floor(diffSec / 60)}분 전`;
    } else {
      item.time = `${Math.floor(diffSec / 3600)}시간 전`;
    }
  });
}

function initNewsPeriodicUpdater() {
  // Update countdown every second
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
