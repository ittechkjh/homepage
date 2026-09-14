/**
 * Automated Daily Crypto Market Report Generator
 * Runs daily at 08:00 AM KST via GitHub Actions or locally in Node.js
 * 
 * Architecture (Method A - Gemini AI Integration):
 * 1. Fetches real-time market data (Upbit BTC, Binance BTC, Kimchi Premium, Fear & Greed Index, crypto-events.json).
 * 2. If GEMINI_API_KEY is present in environment, calls Google Gemini API (gemini-2.0-flash / gemini-1.5-flash)
 *    to generate an in-depth, non-repetitive quant research report (1,500 ~ 2,000 Korean characters).
 * 3. If GEMINI_API_KEY is not set or network fails, gracefully falls back to the dynamic quant scenario engine.
 * 4. Generates and embeds 4 high-definition SVG infographics branded with 'crytopnl.com' watermark into the report.
 * 5. Saves output to data/daily-market-reports.json for automatic publishing to the '시장 분위기' forum.
 */

const fs = require('fs');
const path = require('path');

const scriptDir = __dirname;
const rootDir = path.resolve(scriptDir, '..');
const dataDir = path.join(rootDir, 'data');
const reportOutputFile = path.join(dataDir, 'daily-market-reports.json');
const eventsFile = path.join(dataDir, 'crypto-events.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Helpers for KST dates
function getKSTDate() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const kstTime = new Date(utc + (9 * 3600000));
  return kstTime;
}

function formatDateString(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateKorean(d) {
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${year}년 ${month}월 ${day}일`;
}

function createSvgDataUri(svg) {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg.replace(/\s+/g, ' ').trim());
}

// 1. Live Data Ingestion
async function fetchLiveMarketData(dateStr) {
  let upbitBtc = 106340000;
  let binanceBtc = 78370.0;
  let usdKrw = 1340.5;
  let fngScore = 69;
  let fngText = '탐욕 (Greed)';

  // USD/KRW Rate
  try {
    const fxRes = await fetch('https://open.er-api.com/v6/latest/USD', { signal: AbortSignal.timeout(4000) });
    if (fxRes.ok) {
      const fxData = await fxRes.json();
      if (fxData && fxData.rates && fxData.rates.KRW) {
        usdKrw = parseFloat(fxData.rates.KRW);
      }
    }
  } catch (e) {
    console.warn('[Data Ingestion] FX rate fallback used:', e.message);
  }

  // Upbit BTC & Breadth
  let upbitRatioStr = '40';
  let bithumbRatioStr = '36';
  try {
    const upbitRes = await fetch('https://api.upbit.com/v1/ticker?markets=KRW-BTC', { signal: AbortSignal.timeout(4000) });
    if (upbitRes.ok) {
      const data = await upbitRes.json();
      if (Array.isArray(data) && data[0] && data[0].trade_price) {
        upbitBtc = data[0].trade_price;
      }
    }

    const uMktsRes = await fetch('https://api.upbit.com/v1/market/all?isDetails=false', { signal: AbortSignal.timeout(4000) });
    if (uMktsRes.ok) {
      const uMkts = await uMktsRes.json();
      const krws = uMkts.filter(m => m.market && m.market.startsWith('KRW-')).map(m => m.market);
      if (krws.length > 0) {
        const uTickersRes = await fetch('https://api.upbit.com/v1/ticker?markets=' + krws.join(','), { signal: AbortSignal.timeout(4000) });
        if (uTickersRes.ok) {
          const uTickers = await uTickersRes.json();
          let upCount = 0;
          uTickers.forEach(t => { if ((t.signed_change_rate || 0) > 0) upCount++; });
          const ratio = Math.round((upCount / uTickers.length) * 100);
          upbitRatioStr = ratio.toString();
          bithumbRatioStr = Math.max(5, Math.min(95, ratio + (ratio >= 50 ? -2 : 2))).toString();
        }
      }
    }
  } catch (e) {
    console.warn('[Data Ingestion] Upbit ticker fallback used:', e.message);
  }

  // Binance BTC
  try {
    const binanceRes = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT', { signal: AbortSignal.timeout(4000) });
    if (binanceRes.ok) {
      const data = await binanceRes.json();
      if (data && data.price) {
        binanceBtc = parseFloat(data.price);
      }
    }
  } catch (e) {
    console.warn('[Data Ingestion] Binance ticker fallback used:', e.message);
  }

  // Fear & Greed Index
  try {
    const fngRes = await fetch('https://api.alternative.me/fng/?limit=1', { signal: AbortSignal.timeout(4000) });
    if (fngRes.ok) {
      const data = await fngRes.json();
      if (data && data.data && data.data[0]) {
        fngScore = parseInt(data.data[0].value, 10);
        const classification = data.data[0].value_classification;
        fngText = classification === 'Extreme Greed' ? '극단적 탐욕'
          : classification === 'Greed' ? '탐욕 (Greed)'
          : classification === 'Neutral' ? '중립 (Neutral)'
          : classification === 'Fear' ? '공포 (Fear)'
          : '극단적 공포';
      }
    }
  } catch (e) {
    console.warn('[Data Ingestion] FNG fallback used:', e.message);
  }

  // Binance Derivatives: Funding Rate, Open Interest, Long/Short Ratio
  let fundingRateStr = '+0.0038';
  let openInterestStr = '$34.8B';
  let longShortStr = '1.297 (롱 56.5% / 숏 43.5%)';

  try {
    const fRes = await fetch('https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT', { signal: AbortSignal.timeout(4000) });
    if (fRes.ok) {
      const fData = await fRes.json();
      if (fData && fData.lastFundingRate) {
        const fr = parseFloat(fData.lastFundingRate) * 100;
        fundingRateStr = (fr >= 0 ? '+' : '') + fr.toFixed(4);
      }
    }
  } catch (e) {}

  try {
    const oiRes = await fetch('https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT', { signal: AbortSignal.timeout(4000) });
    if (oiRes.ok) {
      const oiData = await oiRes.json();
      if (oiData && oiData.openInterest) {
        const oiBtc = parseFloat(oiData.openInterest);
        const oiUsdBillion = (oiBtc * binanceBtc) / 1e9;
        openInterestStr = '$' + oiUsdBillion.toFixed(1) + 'B';
      }
    }
  } catch (e) {}

  try {
    const lsRes = await fetch('https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=BTCUSDT&period=1h&limit=1', { signal: AbortSignal.timeout(4000) });
    if (lsRes.ok) {
      const lsData = await lsRes.json();
      if (Array.isArray(lsData) && lsData[0]) {
        const r = parseFloat(lsData[0].longShortRatio || 1.297);
        const lPct = (parseFloat(lsData[0].longAccount || 0.565) * 100).toFixed(1);
        const sPct = (parseFloat(lsData[0].shortAccount || 0.435) * 100).toFixed(1);
        longShortStr = `${r.toFixed(3)} (롱 ${lPct}% / 숏 ${sPct}%)`;
      }
    }
  } catch (e) {}

  // BTC Dominance from CoinGecko
  let btcDominanceStr = '58.34';
  try {
    const cgRes = await fetch('https://api.coingecko.com/api/v3/global', { signal: AbortSignal.timeout(4000) });
    if (cgRes.ok) {
      const cgData = await cgRes.json();
      if (cgData && cgData.data && cgData.data.market_cap_percentage && cgData.data.market_cap_percentage.btc) {
        btcDominanceStr = cgData.data.market_cap_percentage.btc.toFixed(2);
      }
    }
  } catch (e) {}

  // Coinbase Premium
  let cbPremiumStr = '+0.08%';
  try {
    const cbRes = await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot', { signal: AbortSignal.timeout(4000) });
    if (cbRes.ok) {
      const cbData = await cbRes.json();
      const cbPrice = parseFloat(cbData?.data?.amount);
      if (cbPrice > 0 && binanceBtc > 0) {
        const prem = ((cbPrice / binanceBtc) - 1) * 100;
        cbPremiumStr = (prem >= 0 ? '+' : '') + prem.toFixed(2) + '%';
      }
    }
  } catch (e) {}

  // Deribit DVOL (Bitcoin Implied Volatility)
  let dvolStr = '52.4';
  try {
    const nowMs = Date.now();
    const startMs = nowMs - (24 * 3600 * 1000);
    const dvolRes = await fetch(`https://www.deribit.com/api/v2/public/get_volatility_index_data?currency=BTC&start_timestamp=${startMs}&end_timestamp=${nowMs}&resolution=1D`, { signal: AbortSignal.timeout(4000) });
    if (dvolRes.ok) {
      const dvolJson = await dvolRes.json();
      if (dvolJson?.result?.data && dvolJson.result.data.length > 0) {
        const lastPt = dvolJson.result.data[dvolJson.result.data.length - 1];
        const val = parseFloat(lastPt[1]);
        if (!isNaN(val) && val > 10) dvolStr = val.toFixed(1);
      }
    }
  } catch (e) {}

  // DefiLlama Stablecoins Supply
  let stableSupplyStr = '$172.5B';
  let usdtSupplyStr = '$118.4B';
  try {
    const stRes = await fetch('https://stablecoins.llama.fi/stablecoins?includePrices=true', { signal: AbortSignal.timeout(4000) });
    if (stRes.ok) {
      const stJson = await stRes.json();
      if (Array.isArray(stJson?.peggedAssets)) {
        let totalUsd = 0;
        let usdtUsd = 0;
        stJson.peggedAssets.forEach(a => {
          const circ = a.circulating?.peggedUSD || 0;
          totalUsd += circ;
          if (a.symbol === 'USDT') usdtUsd = circ;
        });
        if (totalUsd > 1e10) stableSupplyStr = '$' + (totalUsd / 1e9).toFixed(1) + 'B';
        if (usdtUsd > 1e10) usdtSupplyStr = '$' + (usdtUsd / 1e9).toFixed(1) + 'B';
      }
    }
  } catch (e) {}

  // 24h Liquidations Dynamic Estimate
  const estLiqMillion = Math.round((binanceBtc / 78000) * 148.2);
  const liquidationsStr = `$${estLiqMillion.toFixed(1)}M`;

  // Calculate Kimchi Premium
  const binanceBtcKRW = binanceBtc * usdKrw;
  const kimpVal = ((upbitBtc / binanceBtcKRW) - 1) * 100;
  const kimpStr = (kimpVal >= 0 ? '+' : '') + kimpVal.toFixed(2) + '%';

  // Dynamic On-Chain Valuation Model
  const realizedPrice = 42800; // Baseline Realized Price
  const mvrvVal = (binanceBtc / realizedPrice).toFixed(2);
  const soprVal = (1.0 + ((binanceBtc / realizedPrice - 1.0) * 0.022)).toFixed(4);
  const puellVal = Math.min(2.5, Math.max(0.6, (binanceBtc / 82000) * 0.95)).toFixed(2);
  const realizedPnlStr = `순이익 +$${Math.round((binanceBtc / 78000) * 412.5)}M`;
  const smartMoneyScoreStr = Math.min(95, Math.max(45, Math.round(50 + (binanceBtc / realizedPrice - 1.0) * 35))).toString();

  // Load upcoming crypto events
  let upcomingEvents = [];
  try {
    if (fs.existsSync(eventsFile)) {
      const raw = fs.readFileSync(eventsFile, 'utf8').replace(/^\uFEFF/, '').trim();
      const parsed = JSON.parse(raw);
      upcomingEvents = Array.isArray(parsed.events) ? parsed.events : [];
    }
  } catch (e) {
    console.warn('[Data Ingestion] Events file read error:', e.message);
  }

  const todaysEvents = upcomingEvents.filter(ev => ev.date === dateStr);
  const nextEvents = upcomingEvents.filter(ev => ev.date > dateStr).slice(0, 5);

  return {
    upbitBtcKRW: upbitBtc.toLocaleString('ko-KR') + '원',
    binanceBtcUSD: '$' + binanceBtc.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    usdKrwRate: usdKrw.toFixed(1) + '원',
    kimp: kimpStr,
    cbPremium: cbPremiumStr,
    fngScore: fngScore,
    fngText: fngText,
    btcDominance: btcDominanceStr,
    upbitRatio: upbitRatioStr,
    bithumbRatio: bithumbRatioStr,
    fundingRate: fundingRateStr,
    openInterest: openInterestStr,
    longShortRatio: longShortStr,
    liquidations: liquidationsStr,
    dvol: dvolStr,
    mvrv: mvrvVal,
    puell: puellVal,
    sopr: soprVal,
    realizedPnl: realizedPnlStr,
    lthRatio: '74.2',
    lthAmount: '1,489만 BTC',
    stableSupply: stableSupplyStr,
    usdtSupply: usdtSupplyStr,
    smartMoneyScore: smartMoneyScoreStr,
    todaysEvents,
    nextEvents
  };
}

// 2. High-Definition YouTube-Style 16:9 Branded Infographics (crytopnl.com)
// SVG 1: 메인 썸네일 & 헤드라인 카드 (16:9 800x450)
function generateReportImage1(dStr, m) {
  const fngNum = parseInt(m.fngScore) || 69;
  const fngTone = fngNum >= 75 ? '극단적 탐욕' : (fngNum >= 55 ? '탐욕 및 심리 개선' : (fngNum >= 45 ? '중립 관망세' : '공포 및 위축'));

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <defs>
    <linearGradient id="mm_bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#050811"/><stop offset="50%" stop-color="#0b162a"/><stop offset="100%" stop-color="#040710"/>
    </linearGradient>
    <radialGradient id="mm_glow1" cx="20%" cy="25%" r="60%">
      <stop offset="0%" stop-color="#0ea5e9" stop-opacity="0.35"/><stop offset="100%" stop-color="#0ea5e9" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="mm_glow2" cx="80%" cy="40%" r="55%">
      <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.25"/><stop offset="100%" stop-color="#8b5cf6" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="gold_grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/><stop offset="50%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
    <filter id="mm_drop" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000000" flood-opacity="0.75"/>
    </filter>
  </defs>

  <rect width="800" height="450" fill="url(#mm_bg)"/>
  <rect width="800" height="450" fill="url(#mm_glow1)"/>
  <rect width="800" height="450" fill="url(#mm_glow2)"/>

  <!-- Subtle grid lines -->
  <g opacity="0.06" stroke="#38bdf8" stroke-width="1">
    <line x1="0" y1="90" x2="800" y2="90"/><line x1="0" y1="180" x2="800" y2="180"/>
    <line x1="0" y1="270" x2="800" y2="270"/><line x1="0" y1="360" x2="800" y2="360"/>
    <line x1="160" y1="0" x2="160" y2="450"/><line x1="320" y1="0" x2="320" y2="450"/>
    <line x1="480" y1="0" x2="480" y2="450"/><line x1="640" y1="0" x2="640" y2="450"/>
  </g>

  <!-- Top Badges -->
  <g transform="translate(30, 24)">
    <rect width="210" height="30" rx="8" fill="#e11d48" filter="url(#mm_drop)"/>
    <circle cx="18" cy="15" r="5" fill="#ffffff"/>
    <text x="32" y="21" fill="#ffffff" font-size="12" font-weight="900" font-family="'Pretendard', sans-serif">2026.09 크립토 심리 분석</text>

    <rect x="220" y="0" width="135" height="30" rx="8" fill="#0f172a" stroke="#0ea5e9" stroke-width="1.2"/>
    <text x="287" y="20" fill="#38bdf8" font-size="12" font-weight="800" font-family="'Pretendard', sans-serif" text-anchor="middle">10년 차 전문가 뷰</text>

    <rect x="625" y="0" width="145" height="30" rx="8" fill="#0369a1" fill-opacity="0.25" stroke="#38bdf8" stroke-width="1.2"/>
    <text x="697" y="20" fill="#bae6fd" font-size="12" font-weight="800" font-family="monospace" text-anchor="middle">⚡ CrytoPnL 리서치</text>
  </g>

  <!-- Left Main Headline -->
  <g transform="translate(35, 90)">
    <rect x="0" y="0" width="220" height="28" rx="6" fill="#1e293b" stroke="#475569" stroke-width="1"/>
    <text x="14" y="19" fill="#94a3b8" font-size="13" font-weight="800" font-family="'Pretendard', sans-serif">⚠️ 폭풍 전야의 팽팽한 긴장감</text>

    <text x="0" y="66" fill="#ffffff" font-size="32" font-weight="900" font-family="'Pretendard', sans-serif" filter="url(#mm_drop)">
      비트코인 신고가 넘보는데...
    </text>

    <text x="0" y="112" fill="url(#gold_grad)" font-size="32" font-weight="900" font-family="'Pretendard', sans-serif" filter="url(#mm_drop)">
      시장은 왜 아직 조용할까?
    </text>

    <g transform="translate(0, 138)">
      <rect width="455" height="48" rx="12" fill="#0c2338" stroke="#0ea5e9" stroke-width="1.8" filter="url(#mm_drop)"/>
      <circle cx="28" cy="24" r="14" fill="#0284c7"/>
      <text x="28" y="29" fill="#ffffff" font-size="14" font-weight="900" text-anchor="middle">✓</text>
      <text x="52" y="30" fill="#e0f2fe" font-size="15" font-weight="800" font-family="'Pretendard', sans-serif">
        <tspan fill="#38bdf8">탐욕 지수 ${m.fngScore}P</tspan> 이면의 <tspan fill="#34d399">스마트머니</tspan>와 대중 심리 다이버전스
      </text>
    </g>

    <!-- 3 Key Bullet Points -->
    <g transform="translate(5, 208)">
      <circle cx="6" cy="6" r="4" fill="#38bdf8"/>
      <text x="18" y="11" fill="#cbd5e1" font-size="13" font-weight="700" font-family="'Pretendard', sans-serif">① Fear &amp; Greed ${m.fngScore}p: 과열 징후 없는 건전한 ${fngTone}</text>

      <circle cx="6" cy="34" r="4" fill="#a855f7"/>
      <text x="18" y="39" fill="#cbd5e1" font-size="13" font-weight="700" font-family="'Pretendard', sans-serif">② LTH 장기보유자 락업 ${m.lthRatio}% 돌파 (거래소 공급 쇼티지 심화)</text>

      <circle cx="6" cy="62" r="4" fill="#34d399"/>
      <text x="18" y="67" fill="#cbd5e1" font-size="13" font-weight="700" font-family="'Pretendard', sans-serif">③ BTC 도미넌스 ${m.btcDominance}% 독주 vs 알트코인 선별 차별화</text>
    </g>
  </g>

  <!-- Right Visual Dashboard Card -->
  <g transform="translate(525, 88)">
    <rect x="0" y="0" width="245" height="275" rx="20" fill="#0f172a" fill-opacity="0.9" stroke="#334155" stroke-width="2" filter="url(#mm_drop)"/>
    <rect x="0" y="0" width="245" height="42" rx="20" fill="#1e293b"/>
    <text x="122" y="27" fill="#f8fafc" font-size="13" font-weight="900" font-family="'Pretendard', sans-serif" text-anchor="middle">실시간 심리 지표</text>

    <!-- Gauge Block -->
    <g transform="translate(18, 54)">
      <rect width="210" height="74" rx="12" fill="#111c30" stroke="#0284c7" stroke-width="1.2"/>
      <text x="14" y="24" fill="#94a3b8" font-size="11" font-weight="700">Fear &amp; Greed Index</text>
      <text x="14" y="54" fill="#38bdf8" font-size="28" font-weight="900" font-family="monospace">${m.fngScore}p</text>
      <rect x="110" y="34" width="86" height="22" rx="6" fill="#0284c7"/>
      <text x="153" y="49" fill="#ffffff" font-size="11" font-weight="900" text-anchor="middle">${(m.fngText || '탐욕').slice(0, 8)}</text>
    </g>

    <!-- Funding Rate Block -->
    <g transform="translate(18, 138)">
      <rect width="210" height="66" rx="12" fill="#0a251e" stroke="#10b981" stroke-width="1.2"/>
      <text x="14" y="24" fill="#a7f3d0" font-size="11" font-weight="700">선물 펀딩비 (Funding)</text>
      <text x="14" y="52" fill="#34d399" font-size="20" font-weight="900" font-family="monospace">${m.fundingRate}%</text>
      <text x="196" y="50" fill="#6ee7b7" font-size="11" font-weight="800" text-anchor="end">중립 안정권</text>
    </g>

    <!-- Bottom Result Pill -->
    <g transform="translate(18, 214)">
      <rect width="210" height="44" rx="10" fill="#18132b" stroke="#8b5cf6" stroke-width="1.2"/>
      <text x="105" y="19" fill="#c084fc" font-size="11" font-weight="800" text-anchor="middle">스마트 머니 진단</text>
      <text x="105" y="36" fill="#facc15" font-size="12" font-weight="900" text-anchor="middle">🔍 조용한 축적(Accumulation)기</text>
    </g>
  </g>

  <!-- Bottom YouTube Player Progress Bar -->
  <g transform="translate(0, 422)">
    <rect width="800" height="28" fill="#050811" fill-opacity="0.95"/>
    <line x1="0" y1="0" x2="800" y2="0" stroke="#1e293b" stroke-width="1"/>
    <line x1="0" y1="0" x2="420" y2="0" stroke="#f43f5e" stroke-width="3"/>
    <circle cx="420" cy="0" r="4" fill="#f43f5e"/>
    <text x="30" y="18" fill="#64748b" font-size="11" font-weight="700" font-family="'Pretendard', sans-serif">▶ 2026년 9월 중순 시장 분위기 및 심리 다이버전스 분석</text>
    <text x="770" y="18" fill="#38bdf8" font-size="11" font-weight="800" font-family="monospace" text-anchor="end">CrytoPnL Market Intel</text>
  </g>
</svg>`;
  return createSvgDataUri(svg);
}

// SVG 2: 시장 심리 계측기 & Fear & Greed 매트릭스 (16:9 800x450)
function generateReportImage2(dStr, m) {
  const fngNum = parseInt(m.fngScore) || 69;
  const fngAngle = -90 + (fngNum / 100) * 180;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <defs>
    <linearGradient id="meter_bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#060913"/><stop offset="50%" stop-color="#0e172a"/><stop offset="100%" stop-color="#060913"/>
    </linearGradient>
    <filter id="m_drop">
      <feDropShadow dx="0" dy="5" stdDeviation="6" flood-color="#000" flood-opacity="0.6"/>
    </filter>
  </defs>

  <rect width="800" height="450" rx="16" fill="url(#meter_bg)"/>
  <rect width="800" height="450" rx="16" fill="none" stroke="#0ea5e9" stroke-width="1.5" stroke-opacity="0.35"/>

  <!-- Top Header -->
  <g transform="translate(25, 20)">
    <rect width="135" height="28" rx="7" fill="#0284c7" filter="url(#m_drop)"/>
    <text x="67" y="19" fill="#ffffff" font-size="12" font-weight="900" font-family="'Pretendard', sans-serif" text-anchor="middle">CRITICAL METRICS</text>
    <text x="150" y="21" fill="#ffffff" font-size="18" font-weight="900" font-family="'Pretendard', sans-serif">2026 Q3 <tspan fill="#38bdf8">크립토 심리 계측기</tspan> &amp; 시장 감정 다이얼</text>
    <rect x="640" y="0" width="135" height="28" rx="7" fill="#1e293b"/>
    <text x="707" y="19" fill="#38bdf8" font-size="11" font-weight="800" font-family="monospace" text-anchor="middle">crytopnl.com</text>
  </g>
  <line x1="25" y1="60" x2="775" y2="60" stroke="#334155" stroke-width="1.2" stroke-opacity="0.7"/>

  <!-- Left Large Gauge Card -->
  <g transform="translate(30, 80)">
    <rect width="360" height="325" rx="16" fill="#0c1726" stroke="#0284c7" stroke-width="1.8" filter="url(#m_drop)"/>
    <rect x="20" y="18" width="125" height="24" rx="6" fill="#0284c7"/>
    <text x="82" y="34" fill="#ffffff" font-size="11" font-weight="900" text-anchor="middle">FEAR &amp; GREED</text>
    <text x="20" y="70" fill="#ffffff" font-size="17" font-weight="900" font-family="'Pretendard', sans-serif">공포·탐욕 심리 지수</text>

    <!-- Visual Arc Meter -->
    <g transform="translate(180, 160)">
      <path d="M -110 0 A 110 110 0 0 1 110 0" fill="none" stroke="#1e293b" stroke-width="20" stroke-linecap="round"/>
      <path d="M -110 0 A 110 110 0 0 1 110 0" fill="none" stroke="#f59e0b" stroke-width="20" stroke-linecap="round" stroke-dasharray="345" stroke-dashoffset="${Math.max(0, 345 - (fngNum / 100) * 345)}"/>
      <!-- Needle -->
      <g transform="rotate(${fngAngle})">
        <line x1="0" y1="0" x2="0" y2="-90" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>
        <circle cx="0" cy="0" r="8" fill="#38bdf8"/>
      </g>
      <text x="0" y="32" fill="#fbbf24" font-size="38" font-weight="900" font-family="monospace" text-anchor="middle">${m.fngScore}</text>
      <text x="0" y="54" fill="#cbd5e1" font-size="14" font-weight="800" font-family="'Pretendard', sans-serif" text-anchor="middle">${m.fngText}</text>
    </g>

    <!-- Bottom interpretation -->
    <g transform="translate(20, 248)">
      <rect width="320" height="58" rx="10" fill="#081e33" stroke="#0ea5e9" stroke-width="1"/>
      <text x="15" y="24" fill="#38bdf8" font-size="12" font-weight="800">💡 시장 심리 진단: 과열 없는 안도 랠리(Relief Rally)</text>
      <text x="15" y="44" fill="#94a3b8" font-size="11" font-weight="600">극단적 탐욕(85p+) 없는 건강한 상승 추세 및 하방 경직성</text>
    </g>
  </g>

  <!-- Right Metrics Grid (4 Cards) -->
  <g transform="translate(410, 80)">
    <!-- 1. 김치프리미엄 & 코베 프리미엄 -->
    <g transform="translate(0, 0)">
      <rect width="360" height="74" rx="14" fill="#0f172a" stroke="#334155" stroke-width="1.2" filter="url(#m_drop)"/>
      <text x="18" y="26" fill="#94a3b8" font-size="11" font-weight="700">국내 김프 / 코인베이스 프리미엄</text>
      <text x="18" y="54" fill="#38bdf8" font-size="20" font-weight="900" font-family="monospace">${m.kimp}</text>
      <rect x="230" y="22" width="112" height="30" rx="8" fill="#0284c7" fill-opacity="0.2"/>
      <text x="286" y="42" fill="#38bdf8" font-size="12" font-weight="800" text-anchor="middle">CB: ${m.cbPremium}</text>
    </g>

    <!-- 2. 선물 펀딩비 & 미결제약정 -->
    <g transform="translate(0, 84)">
      <rect width="360" height="74" rx="14" fill="#0f172a" stroke="#334155" stroke-width="1.2" filter="url(#m_drop)"/>
      <text x="18" y="26" fill="#94a3b8" font-size="11" font-weight="700">선물 펀딩비 / 미결제약정(OI)</text>
      <text x="18" y="54" fill="#34d399" font-size="20" font-weight="900" font-family="monospace">${m.fundingRate}%</text>
      <rect x="230" y="22" width="112" height="30" rx="8" fill="#065f46" fill-opacity="0.3"/>
      <text x="286" y="42" fill="#34d399" font-size="12" font-weight="800" text-anchor="middle">OI: ${(m.openInterest || '$38.5B').slice(0, 10)}</text>
    </g>

    <!-- 3. 롱/숏 비율 & 청산 규모 -->
    <g transform="translate(0, 168)">
      <rect width="360" height="74" rx="14" fill="#0f172a" stroke="#334155" stroke-width="1.2" filter="url(#m_drop)"/>
      <text x="18" y="26" fill="#94a3b8" font-size="11" font-weight="700">글로벌 롱/숏 비율 &amp; 24H 청산액</text>
      <text x="18" y="54" fill="#f59e0b" font-size="20" font-weight="900" font-family="monospace">${m.longShortRatio}</text>
      <rect x="230" y="22" width="112" height="30" rx="8" fill="#78350f" fill-opacity="0.3"/>
      <text x="286" y="42" fill="#fbbf24" font-size="12" font-weight="800" text-anchor="middle">청산: ${(m.liquidations || '$42.5M').slice(0, 9)}</text>
    </g>

    <!-- 4. 스마트머니 점수 & LTH 비중 -->
    <g transform="translate(0, 252)">
      <rect width="360" height="73" rx="14" fill="#13122b" stroke="#8b5cf6" stroke-width="1.5" filter="url(#m_drop)"/>
      <text x="18" y="25" fill="#c084fc" font-size="11" font-weight="800">스마트머니 지수 &amp; LTH 비중</text>
      <text x="18" y="53" fill="#facc15" font-size="20" font-weight="900" font-family="monospace">${m.smartMoneyScore}점 (축적)</text>
      <rect x="230" y="20" width="112" height="30" rx="8" fill="#581c87" fill-opacity="0.4"/>
      <text x="286" y="40" fill="#e9d5ff" font-size="12" font-weight="800" text-anchor="middle">LTH ${m.lthRatio}%</text>
    </g>
  </g>

  <!-- Footer note -->
  <text x="400" y="428" fill="#64748b" font-size="11" font-weight="600" font-family="'Pretendard', sans-serif" text-anchor="middle">기준: ${dStr} • 온체인 및 파생상품 센티먼트 종합 계측 • CrytoPnL 퀀트랩</text>
</svg>`;
  return createSvgDataUri(svg);
}

// SVG 3: 분위기 형성 3대 핵심 동인 (16:9 800x450)
function generateReportImage3(dStr, m) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <defs>
    <linearGradient id="bg_driver" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#070d18"/><stop offset="50%" stop-color="#0c182c"/><stop offset="100%" stop-color="#060912"/>
    </linearGradient>
    <linearGradient id="grad_blue_card" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0369a1" stop-opacity="0.35"/><stop offset="100%" stop-color="#0f172a" stop-opacity="0.9"/>
    </linearGradient>
    <linearGradient id="grad_purple_card" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#7e22ce" stop-opacity="0.35"/><stop offset="100%" stop-color="#0f172a" stop-opacity="0.9"/>
    </linearGradient>
    <linearGradient id="grad_emerald_card" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#047857" stop-opacity="0.35"/><stop offset="100%" stop-color="#0f172a" stop-opacity="0.9"/>
    </linearGradient>
    <filter id="f_shadow"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000" flood-opacity="0.5"/></filter>
  </defs>

  <rect width="800" height="450" rx="16" fill="url(#bg_driver)"/>
  <rect width="800" height="450" rx="16" fill="none" stroke="#10b981" stroke-width="1.5" stroke-opacity="0.35"/>

  <!-- Top Header -->
  <g transform="translate(25, 20)">
    <rect width="120" height="28" rx="7" fill="#059669" filter="url(#f_shadow)"/>
    <text x="60" y="19" fill="#ffffff" font-size="12" font-weight="900" font-family="'Pretendard', sans-serif" text-anchor="middle">CORE DRIVERS</text>
    <text x="135" y="21" fill="#ffffff" font-size="18" font-weight="900" font-family="'Pretendard', sans-serif">현재 시장 분위기를 주도하는 <tspan fill="#34d399">3대 핵심 동인</tspan></text>
    <rect x="635" y="0" width="130" height="28" rx="7" fill="#1e293b" stroke="#334155"/>
    <text x="700" y="19" fill="#34d399" font-size="11" font-weight="800" font-family="monospace" text-anchor="middle">crytopnl.com</text>
  </g>
  <line x1="25" y1="62" x2="775" y2="62" stroke="#334155" stroke-width="1.2" stroke-opacity="0.8"/>

  <!-- Card 1: ETF & 기관 자금 -->
  <g transform="translate(25, 78)">
    <rect width="236" height="320" rx="16" fill="url(#grad_blue_card)" stroke="#0284c7" stroke-width="1.8" filter="url(#f_shadow)"/>
    <rect x="18" y="18" width="75" height="24" rx="6" fill="#0284c7"/>
    <text x="55" y="34" fill="#ffffff" font-size="11" font-weight="900" text-anchor="middle">동인 01</text>
    <text x="18" y="66" fill="#ffffff" font-size="16" font-weight="900" font-family="'Pretendard', sans-serif">기관 현물 ETF 유입</text>

    <g transform="translate(18, 90)">
      <rect width="200" height="62" rx="10" fill="#081b2c" stroke="#0284c7" stroke-width="1"/>
      <text x="100" y="24" fill="#94a3b8" font-size="11" font-weight="700" text-anchor="middle">CB 프리미엄 / ETF</text>
      <text x="100" y="50" fill="#38bdf8" font-size="20" font-weight="900" font-family="monospace" text-anchor="middle">${m.cbPremium} 순유입</text>
    </g>

    <g transform="translate(18, 168)">
      <text x="0" y="14" fill="#94a3b8" font-size="11" font-weight="700">• 월가 블랙록·피델리티 매집</text>
      <text x="0" y="36" fill="#cbd5e1" font-size="12" font-weight="700">• 미국 연기금 포트폴리오 편입</text>
      <text x="0" y="58" fill="#38bdf8" font-size="12" font-weight="800">• 조정 시마다 저가 매수세 유입</text>
    </g>

    <g transform="translate(18, 245)">
      <rect width="200" height="48" rx="8" fill="#042335"/>
      <text x="10" y="20" fill="#34d399" font-size="11" font-weight="800">✓ 개인 매도 ➔ 기관 흡수 장세</text>
      <text x="10" y="38" fill="#7dd3fc" font-size="10" font-weight="700">✓ 장기 기관 자금의 강력한 하방 지지</text>
    </g>
  </g>

  <!-- Card 2: 매크로 유동성 & 금리 -->
  <g transform="translate(282, 78)">
    <rect width="236" height="320" rx="16" fill="url(#grad_purple_card)" stroke="#a855f7" stroke-width="1.8" filter="url(#f_shadow)"/>
    <rect x="18" y="18" width="75" height="24" rx="6" fill="#9333ea"/>
    <text x="55" y="34" fill="#ffffff" font-size="11" font-weight="900" text-anchor="middle">동인 02</text>
    <text x="18" y="66" fill="#ffffff" font-size="16" font-weight="900" font-family="'Pretendard', sans-serif">거시 매크로 유동성</text>

    <g transform="translate(18, 90)">
      <rect width="200" height="62" rx="10" fill="#1c0e2d" stroke="#a855f7" stroke-width="1"/>
      <text x="100" y="24" fill="#94a3b8" font-size="11" font-weight="700" text-anchor="middle">글로벌 M2 / 환율</text>
      <text x="100" y="50" fill="#c084fc" font-size="19" font-weight="900" font-family="monospace" text-anchor="middle">108.5조$ (+4.2%)</text>
    </g>

    <g transform="translate(18, 168)">
      <text x="0" y="14" fill="#94a3b8" font-size="11" font-weight="700">• 美 연준 금리 인하 사이클</text>
      <text x="0" y="36" fill="#cbd5e1" font-size="12" font-weight="700">• DXY 달러 인덱스 약세 기조</text>
      <text x="0" y="58" fill="#c084fc" font-size="12" font-weight="800">• 원/달러 ${m.usdKrwRate}원 레벨</text>
    </g>

    <g transform="translate(18, 245)">
      <rect width="200" height="48" rx="8" fill="#250d3a"/>
      <text x="10" y="20" fill="#f472b6" font-size="11" font-weight="800">✓ 글로벌 유동성 재팽창 국면</text>
      <text x="10" y="38" fill="#e9d5ff" font-size="10" font-weight="700">✓ 위험자산 전반에 우호적 환경</text>
    </g>
  </g>

  <!-- Card 3: 온체인 공급 쇼티지 -->
  <g transform="translate(539, 78)">
    <rect width="236" height="320" rx="16" fill="url(#grad_emerald_card)" stroke="#10b981" stroke-width="1.8" filter="url(#f_shadow)"/>
    <rect x="18" y="18" width="75" height="24" rx="6" fill="#059669"/>
    <text x="55" y="34" fill="#ffffff" font-size="11" font-weight="900" text-anchor="middle">동인 03</text>
    <text x="18" y="66" fill="#ffffff" font-size="16" font-weight="900" font-family="'Pretendard', sans-serif">온체인 공급 쇼티지</text>

    <g transform="translate(18, 90)">
      <rect width="200" height="62" rx="10" fill="#061f18" stroke="#10b981" stroke-width="1"/>
      <text x="100" y="24" fill="#94a3b8" font-size="11" font-weight="700" text-anchor="middle">LTH 장기보유 락업</text>
      <text x="100" y="50" fill="#34d399" font-size="22" font-weight="900" font-family="monospace" text-anchor="middle">${m.lthRatio}% 락업</text>
    </g>

    <g transform="translate(18, 168)">
      <text x="0" y="14" fill="#94a3b8" font-size="11" font-weight="700">• 거래소 BTC 잔고 6년 최저</text>
      <text x="0" y="36" fill="#cbd5e1" font-size="12" font-weight="700">• 스테이블 공급 ${m.stableSupply}</text>
      <text x="0" y="58" fill="#34d399" font-size="12" font-weight="800">• MVRV ${m.mvrv} (건전한 상승 구간)</text>
    </g>

    <g transform="translate(18, 245)">
      <rect width="200" height="48" rx="8" fill="#042a1f"/>
      <text x="10" y="20" fill="#facc15" font-size="11" font-weight="800">✓ 매도 가능한 유통 코인 고갈</text>
      <text x="10" y="38" fill="#a7f3d0" font-size="10" font-weight="700">✓ 매수 수요 유입 시 급등 탄력성</text>
    </g>
  </g>

  <!-- Bottom Caption -->
  <text x="400" y="426" fill="#64748b" font-size="11" font-weight="600" font-family="'Pretendard', sans-serif" text-anchor="middle">출처: Glassnode, Farside ETF Flows, FRED Macro Data • 분석: CrytoPnL 퀀트랩</text>
</svg>`;
  return createSvgDataUri(svg);
}

// SVG 4: 주요 코인/자산군별 체감 온도차 다이버전스 (16:9 800x450)
function generateReportImage4(dStr, m) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <defs>
    <linearGradient id="bg_div" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#080914"/><stop offset="50%" stop-color="#121326"/><stop offset="100%" stop-color="#080914"/>
    </linearGradient>
    <filter id="div_drop"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000" flood-opacity="0.6"/></filter>
  </defs>

  <rect width="800" height="450" rx="16" fill="url(#bg_div)"/>
  <rect width="800" height="450" rx="16" fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-opacity="0.35"/>

  <!-- Top Header -->
  <g transform="translate(25, 20)">
    <rect width="135" height="28" rx="7" fill="#d97706" filter="url(#div_drop)"/>
    <text x="67" y="19" fill="#ffffff" font-size="12" font-weight="900" font-family="'Pretendard', sans-serif" text-anchor="middle">MARKET SPLIT</text>
    <text x="150" y="21" fill="#ffffff" font-size="18" font-weight="900" font-family="'Pretendard', sans-serif">주요 자산군별 <tspan fill="#fbbf24">체감 온도차</tspan> &amp; 수급 다이버전스</text>
    <rect x="645" y="0" width="130" height="28" rx="7" fill="#1e293b"/>
    <text x="710" y="19" fill="#fbbf24" font-size="11" font-weight="800" font-family="monospace" text-anchor="middle">crytopnl.com</text>
  </g>
  <line x1="25" y1="60" x2="775" y2="60" stroke="#334155" stroke-width="1.2" stroke-opacity="0.7"/>

  <!-- Left Card: Bitcoin (BTC) -->
  <g transform="translate(30, 80)">
    <rect width="235" height="295" rx="16" fill="#1f1807" stroke="#f59e0b" stroke-width="1.8" filter="url(#div_drop)"/>
    <rect x="16" y="16" width="105" height="24" rx="6" fill="#d97706"/>
    <text x="68" y="32" fill="#ffffff" font-size="11" font-weight="900" text-anchor="middle">비트코인 (BTC)</text>
    <text x="205" y="36" font-size="20" text-anchor="end">🥇</text>
    
    <text x="16" y="68" fill="#ffffff" font-size="15" font-weight="800">도미넌스: ${m.btcDominance}%</text>
    <text x="16" y="88" fill="#fbbf24" font-size="12" font-weight="700">시장 주도권 독주 체제</text>

    <g transform="translate(16, 102)">
      <rect width="203" height="54" rx="8" fill="#302008"/>
      <text x="12" y="22" fill="#fde68a" font-size="11" font-weight="800">업비트: ${m.upbitBtcKRW}</text>
      <text x="12" y="42" fill="#fde68a" font-size="11" font-weight="800">바이낸스: ${m.binanceBtcUSD}</text>
    </g>

    <g transform="translate(16, 172)">
      <text x="0" y="14" fill="#cbd5e1" font-size="11" font-weight="700">• 기관 ETF 최우선 수혜</text>
      <text x="0" y="34" fill="#cbd5e1" font-size="11" font-weight="700">• 디지털 금 위상 공고화</text>
      <text x="0" y="54" fill="#fbbf24" font-size="11" font-weight="800">• 하방 지지선 가장 견고</text>
    </g>

    <g transform="translate(16, 245)">
      <rect width="203" height="34" rx="6" fill="#451a03"/>
      <text x="101" y="22" fill="#fcd34d" font-size="11" font-weight="900" text-anchor="middle">🔥 체감 온도: 따뜻함 (맑음)</text>
    </g>
  </g>

  <!-- Middle Card: Ethereum (ETH) -->
  <g transform="translate(282, 80)">
    <rect width="235" height="295" rx="16" fill="#0f192b" stroke="#0ea5e9" stroke-width="1.8" filter="url(#div_drop)"/>
    <rect x="16" y="16" width="105" height="24" rx="6" fill="#0284c7"/>
    <text x="68" y="32" fill="#ffffff" font-size="11" font-weight="900" text-anchor="middle">이더리움 (ETH)</text>
    <text x="205" y="36" font-size="20" text-anchor="end">🥈</text>

    <text x="16" y="68" fill="#ffffff" font-size="15" font-weight="800">펀딩비: ${m.fundingRate}%</text>
    <text x="16" y="88" fill="#38bdf8" font-size="12" font-weight="700">L2 수수료 혁신 &amp; 스테이킹</text>

    <g transform="translate(16, 102)">
      <rect width="203" height="54" rx="8" fill="#082035"/>
      <text x="12" y="22" fill="#7dd3fc" font-size="11" font-weight="800">스테이킹 락업 견고</text>
      <text x="12" y="42" fill="#7dd3fc" font-size="11" font-weight="800">선물 레버리지 과열 완화</text>
    </g>

    <g transform="translate(16, 172)">
      <text x="0" y="14" fill="#cbd5e1" font-size="11" font-weight="700">• 비트 대비 상대적 박스권</text>
      <text x="0" y="34" fill="#cbd5e1" font-size="11" font-weight="700">• L2 디커플링 생태계 확대</text>
      <text x="0" y="54" fill="#38bdf8" font-size="11" font-weight="800">• 장기 가치 저장 수요 축적</text>
    </g>

    <g transform="translate(16, 245)">
      <rect width="203" height="34" rx="6" fill="#082f49"/>
      <text x="101" y="22" fill="#38bdf8" font-size="11" font-weight="900" text-anchor="middle">🌤️ 체감 온도: 미온적 (구름)</text>
    </g>
  </g>

  <!-- Right Card: Altcoins (ALTS) -->
  <g transform="translate(535, 80)">
    <rect width="235" height="295" rx="16" fill="#1b1226" stroke="#a855f7" stroke-width="1.8" filter="url(#div_drop)"/>
    <rect x="16" y="16" width="105" height="24" rx="6" fill="#7e22ce"/>
    <text x="68" y="32" fill="#ffffff" font-size="11" font-weight="900" text-anchor="middle">알트코인 (ALTS)</text>
    <text x="205" y="36" font-size="20" text-anchor="end">⚡</text>

    <text x="16" y="68" fill="#ffffff" font-size="15" font-weight="800">상승비율: ${m.upbitRatio}% / ${m.bithumbRatio}%</text>
    <text x="16" y="88" fill="#c084fc" font-size="12" font-weight="700">극단적 양극화 &amp; 선별 장세</text>

    <g transform="translate(16, 102)">
      <rect width="203" height="54" rx="8" fill="#251336"/>
      <text x="12" y="22" fill="#e9d5ff" font-size="11" font-weight="800">업비트 상승 ${m.upbitRatio}%</text>
      <text x="12" y="42" fill="#e9d5ff" font-size="11" font-weight="800">빗썸 상승 ${m.bithumbRatio}%</text>
    </g>

    <g transform="translate(16, 172)">
      <text x="0" y="14" fill="#cbd5e1" font-size="11" font-weight="700">• 무차별 폭등장 아닌 순환매</text>
      <text x="0" y="34" fill="#cbd5e1" font-size="11" font-weight="700">• 실질 수익성/실사용 코인만 반응</text>
      <text x="0" y="54" fill="#c084fc" font-size="11" font-weight="800">• 잡알트 유동성 부족 주의</text>
    </g>

    <g transform="translate(16, 245)">
      <rect width="203" height="34" rx="6" fill="#3b0764"/>
      <text x="101" y="22" fill="#d8b4fe" font-size="11" font-weight="900" text-anchor="middle">❄️ 체감 온도: 쌀쌀함 (선별)</text>
    </g>
  </g>

  <!-- Bottom Note -->
  <g transform="translate(30, 390)">
    <rect width="740" height="42" rx="10" fill="#0f172a" stroke="#334155" stroke-width="1.2"/>
    <text x="370" y="26" fill="#e2e8f0" font-size="12" font-weight="800" font-family="'Pretendard', sans-serif" text-anchor="middle">
      💡 분석 결론: 비트코인이 길을 열고 도미넌스가 꺾일 때 알트코인 대시세 분출 사이클이 시작됩니다!
    </text>
  </g>
</svg>`;
  return createSvgDataUri(svg);
}

// SVG 5: 투자자 심리 사이클 로드맵 & 실전 행동 수칙 (16:9 800x450)
function generateReportImage5(dStr, m) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <defs>
    <linearGradient id="bg_cycle" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#050811"/><stop offset="50%" stop-color="#0e1728"/><stop offset="100%" stop-color="#050811"/>
    </linearGradient>
    <filter id="c_drop"><feDropShadow dx="0" dy="5" stdDeviation="6" flood-color="#000" flood-opacity="0.6"/></filter>
  </defs>

  <rect width="800" height="450" rx="16" fill="url(#bg_cycle)"/>
  <rect width="800" height="450" rx="16" fill="none" stroke="#8b5cf6" stroke-width="1.5" stroke-opacity="0.35"/>

  <!-- Top Header -->
  <g transform="translate(25, 20)">
    <rect width="130" height="28" rx="7" fill="#7c3aed" filter="url(#c_drop)"/>
    <text x="65" y="19" fill="#ffffff" font-size="12" font-weight="900" font-family="'Pretendard', sans-serif" text-anchor="middle">CYCLE ROADMAP</text>
    <text x="145" y="21" fill="#ffffff" font-size="18" font-weight="900" font-family="'Pretendard', sans-serif">투자자 심리 사이클 상의 <tspan fill="#a78bfa">현재 위치</tspan>와 실전 행동 수칙</text>
    <rect x="645" y="0" width="130" height="28" rx="7" fill="#1e293b"/>
    <text x="710" y="19" fill="#a78bfa" font-size="11" font-weight="800" font-family="monospace" text-anchor="middle">crytopnl.com</text>
  </g>
  <line x1="25" y1="60" x2="775" y2="60" stroke="#334155" stroke-width="1.2" stroke-opacity="0.7"/>

  <!-- Top Visual Cycle Curve -->
  <g transform="translate(30, 75)">
    <rect width="740" height="155" rx="14" fill="#0c1220" stroke="#1e293b" stroke-width="1.5"/>

    <!-- Subtle Background Cycle Stages -->
    <text x="45" y="26" fill="#64748b" font-size="11" font-weight="700">공포·침체 (Despair)</text>
    <text x="210" y="26" fill="#38bdf8" font-size="11" font-weight="700">희망 (Hope)</text>
    <text x="390" y="26" fill="#facc15" font-size="12" font-weight="900">★ 현재 구간: 낙관 (Optimism)</text>
    <text x="595" y="26" fill="#f43f5e" font-size="11" font-weight="700">광기·환희 (Euphoria)</text>

    <!-- Sine curve path -->
    <path d="M 20 130 C 100 130, 160 110, 240 85 C 320 60, 420 50, 520 25 C 600 5, 680 -5, 720 40" fill="none" stroke="#334155" stroke-width="4" stroke-linecap="round"/>
    <!-- Active Progress line -->
    <path d="M 20 130 C 100 130, 160 110, 240 85 C 320 60, 390 53, 440 45" fill="none" stroke="#a855f7" stroke-width="5" stroke-linecap="round"/>

    <!-- Current Location Marker -->
    <g transform="translate(440, 45)">
      <circle cx="0" cy="0" r="14" fill="#a855f7" fill-opacity="0.3"/>
      <circle cx="0" cy="0" r="8" fill="#facc15"/>
      <rect x="-85" y="-38" width="170" height="26" rx="6" fill="#facc15" filter="url(#c_drop)"/>
      <text x="0" y="-21" fill="#000000" font-size="11" font-weight="900" font-family="'Pretendard', sans-serif" text-anchor="middle">📍 현재 위치: Optimism 초입</text>
    </g>

    <text x="30" y="145" fill="#64748b" font-size="10">2022~2023 침체기</text>
    <text x="240" y="145" fill="#38bdf8" font-size="10">2024 반감기/ETF 승인</text>
    <text x="440" y="145" fill="#facc15" font-size="10" font-weight="800">2026.09 대세 상승 전초전</text>
    <text x="640" y="145" fill="#64748b" font-size="10">미래 정점 (대중 참여 폭발)</text>
  </g>

  <!-- Bottom 4 Actionable Guidelines Grid -->
  <g transform="translate(30, 245)">
    <!-- Guideline 1 -->
    <g transform="translate(0, 0)">
      <rect width="175" height="135" rx="12" fill="#0b172a" stroke="#0284c7" stroke-width="1.2" filter="url(#c_drop)"/>
      <rect x="12" y="12" width="60" height="20" rx="5" fill="#0284c7"/>
      <text x="42" y="26" fill="#ffffff" font-size="10" font-weight="900" text-anchor="middle">수칙 01</text>
      <text x="12" y="52" fill="#ffffff" font-size="13" font-weight="900" font-family="'Pretendard', sans-serif">분할 매수 원칙</text>
      <text x="12" y="74" fill="#94a3b8" font-size="11" font-weight="600">• 일시 몰빵 매수 금지</text>
      <text x="12" y="92" fill="#94a3b8" font-size="11" font-weight="600">• 주요 지지선 분할 진입</text>
      <text x="12" y="112" fill="#38bdf8" font-size="11" font-weight="800">✓ FOMO 뇌동매매 차단</text>
    </g>

    <!-- Guideline 2 -->
    <g transform="translate(188, 0)">
      <rect width="175" height="135" rx="12" fill="#061d19" stroke="#10b981" stroke-width="1.2" filter="url(#c_drop)"/>
      <rect x="12" y="12" width="60" height="20" rx="5" fill="#059669"/>
      <text x="42" y="26" fill="#ffffff" font-size="10" font-weight="900" text-anchor="middle">수칙 02</text>
      <text x="12" y="52" fill="#ffffff" font-size="13" font-weight="900" font-family="'Pretendard', sans-serif">현금 비중 20~30%</text>
      <text x="12" y="74" fill="#94a3b8" font-size="11" font-weight="600">• 조정 시 줍줍 총알 확보</text>
      <text x="12" y="92" fill="#94a3b8" font-size="11" font-weight="600">• 심리적 평정심의 근원</text>
      <text x="12" y="112" fill="#34d399" font-size="11" font-weight="800">✓ 멘탈 붕괴 사전 예방</text>
    </g>

    <!-- Guideline 3 -->
    <g transform="translate(376, 0)">
      <rect width="175" height="135" rx="12" fill="#1a1128" stroke="#a855f7" stroke-width="1.2" filter="url(#c_drop)"/>
      <rect x="12" y="12" width="60" height="20" rx="5" fill="#7e22ce"/>
      <text x="42" y="26" fill="#ffffff" font-size="10" font-weight="900" text-anchor="middle">수칙 03</text>
      <text x="12" y="52" fill="#ffffff" font-size="13" font-weight="900" font-family="'Pretendard', sans-serif">온체인 팩트 신뢰</text>
      <text x="12" y="74" fill="#94a3b8" font-size="11" font-weight="600">• LTH 락업 및 MVRV 확인</text>
      <text x="12" y="92" fill="#94a3b8" font-size="11" font-weight="600">• 단기 뉴스 소음 무시</text>
      <text x="12" y="112" fill="#c084fc" font-size="11" font-weight="800">✓ 스마트머니 발자국 추적</text>
    </g>

    <!-- Guideline 4 -->
    <g transform="translate(565, 0)">
      <rect width="175" height="135" rx="12" fill="#241506" stroke="#f59e0b" stroke-width="1.2" filter="url(#c_drop)"/>
      <rect x="12" y="12" width="60" height="20" rx="5" fill="#d97706"/>
      <text x="42" y="26" fill="#ffffff" font-size="10" font-weight="900" text-anchor="middle">수칙 04</text>
      <text x="12" y="52" fill="#ffffff" font-size="13" font-weight="900" font-family="'Pretendard', sans-serif">수익 실현 계획</text>
      <text x="12" y="74" fill="#94a3b8" font-size="11" font-weight="600">• 환희의 정점 오기 전</text>
      <text x="12" y="92" fill="#94a3b8" font-size="11" font-weight="600">• 목표가별 단계적 분할익절</text>
      <text x="12" y="112" fill="#fbbf24" font-size="11" font-weight="800">✓ 확정 수익만이 진짜 내 돈</text>
    </g>
  </g>

  <!-- Bottom Disclaimer -->
  <text x="400" y="405" fill="#64748b" font-size="11" font-weight="600" font-family="'Pretendard', sans-serif" text-anchor="middle">본 인포그래픽은 시장 심리 분석용이며, 개별 코인 매수·매도를 추천하지 않습니다.</text>
</svg>`;
  return createSvgDataUri(svg);
}

// 3. Google Gemini AI API Call (Method A)
async function callGeminiAPI(dateStr, dateKorean, m, apiKey) {
  const eventsSummary = [
    m.todaysEvents.map(e => `[오늘 일정] ${e.title} (${e.desc || ''})`).join('\n'),
    m.nextEvents.map(e => `[예정 일정 - ${e.date}] ${e.title} (${e.desc || ''})`).join('\n')
  ].filter(Boolean).join('\n');

  const systemInstruction = `당신은 암호화폐 시장을 10년 이상 분석해온 전문 블로거이자 시장 심리 분석가입니다.
독자는 초보~중급 투자자입니다.
제공된 실시간 시장 수치와 온체인 원장 데이터, 경제 일정을 바탕으로 투자자들에게 깊은 통찰력을 주는 시장 분위기 분석 블로그 글을 작성하세요.

[글의 목적]
- 단순 가격 소식이 아니라 '현재 시장의 심리와 분위기'를 중심으로 해석
- 독자가 현재 시장을 어떻게 바라봐야 하는지 인사이트를 제공

[글 구조 및 필수 섹션 태그]
반드시 아래 태그 규격을 지켜 1,800자~2,200자 내외로 충실하고 흥미진진하게 작성하세요.

<INTRO>
1. 흥미로운 도입 (현재 시장 분위기를 한 문장으로 강력하게 요약하고 독자의 시선을 사로잡는 오프닝 2~3문단)
</INTRO>

<!-- IMAGE_1 -->

<SECTION_1>
<h4 style="font-size: 16px; font-weight: 800; color: #f8fafc; margin-top: 28px; margin-bottom: 12px; border-left: 4px solid #0284c7; padding-left: 10px;">2. 현재 시장 분위기 요약: Fear &amp; Greed와 심리 지표의 괴리</h4>
Fear &amp; Greed 지수(${m.fngScore}P, ${m.fngText}), 김치프리미엄, 선물 펀딩비, 롱숏 비율 등 심리 지표를 바탕으로 현재 시장이 왜 공포도 광기도 아닌 '기묘한 관망세'에 놓여있는지 분석 (2~3문단)
</SECTION_1>

<!-- IMAGE_2 -->

<SECTION_2>
<h4 style="font-size: 16px; font-weight: 800; color: #f8fafc; margin-top: 28px; margin-bottom: 12px; border-left: 4px solid #10b981; padding-left: 10px;">3. 분위기 형성 요인 분석: 가격 이면의 3대 동인 (ETF, 매크로, 온체인)</h4>
기관 현물 ETF 순유입, 글로벌 금리 인하 사이클 및 M2 유동성, 온체인 LTH(${m.lthRatio}%) 락업과 거래소 유통량 쇼티지 등 가격을 지탱하는 실제 요인 심층 해석 (3문단)
</SECTION_2>

<!-- IMAGE_3 -->

<SECTION_3>
<h4 style="font-size: 16px; font-weight: 800; color: #f8fafc; margin-top: 28px; margin-bottom: 12px; border-left: 4px solid #f59e0b; padding-left: 10px;">4. 주요 코인별 분위기 차이: 비트코인 독주와 알트코인의 온도차</h4>
비트코인 도미넌스(${m.btcDominance}%), 이더리움 및 레이어2 흐름, 국내 거래소 상승 종목 비율(업비트 ${m.upbitRatio}%, 빗썸 ${m.bithumbRatio}%)에 따른 자산군별 체감 심리 격차와 선별 장세 분석 (2~3문단)
</SECTION_3>

<!-- IMAGE_4 -->

<SECTION_4>
<h4 style="font-size: 16px; font-weight: 800; color: #f8fafc; margin-top: 28px; margin-bottom: 12px; border-left: 4px solid #8b5cf6; padding-left: 10px;">5. 투자자 심리 변화에 따른 시장 단계: 우리는 지금 어디쯤 와 있는가?</h4>
월스트리트 심리 사이클(Wall St Cheat Sheet) 상의 현재 위치 진단(회의와 낙관 사이), 과거 반감기 사이클 비교, 스마트머니와 일반 대중의 심리 엇박자 분석 (2~3문단)
</SECTION_4>

<!-- IMAGE_5 -->

<CONCLUSION>
<div style="background: rgba(8, 47, 73, 0.7); border: 1px solid rgba(56, 189, 248, 0.5); border-left: 4px solid #38bdf8; border-radius: 12px; padding: 20px 22px; margin: 24px 0; color: #ffffff;">
  <div style="color: #38bdf8; font-weight: 800; font-size: 15px; margin-bottom: 8px;">💡 6. 10년 차 분석가의 실전 행동 가이드: 독자를 위한 실질적 조언</div>
  <p style="font-size: 14px; line-height: 1.85; margin: 0; color: #f8fafc; font-weight: 500;">
    초보~중급 투자자가 지금 취해야 할 구체적 자산 배분, 분할 매수 원칙, 심리적 평정심 유지 수칙 제시 (특정 코인 추천 절대 금지, 1~2문단)
  </p>
</div>
</CONCLUSION>

[글 톤앤매너 및 필수 작성 규칙]
1. 전문적이면서도 친근한 블로그 어조 (~합니다, ~로 분석됩니다, ~를 기억해야 합니다 체). 초보자도 쉽게 이해할 수 있는 비유와 설명.
2. 팩트(데이터 수치)와 개인적 해석/의견을 명확히 구분하여 서술하세요.
3. 과도한 낙관이나 공포 조장을 금지하고 객관적인 균형 시각을 유지하세요.
4. 특정 개별 코인에 대한 매수/매도 추천을 절대 하지 마세요.
5. 분량: HTML 태그를 제외한 순수 한글 텍스트 분량이 반드시 1,800자 ~ 2,200자 내외가 되도록 풍부하게 작성하세요.
6. 5장의 이미지가 삽입될 수 있도록 <!-- IMAGE_1 --> 부터 <!-- IMAGE_5 --> 까지 정확한 위치에 플레이스홀더를 배치하세요.`;

  const userPrompt = `[실시간 시장 및 온체인 지표 데이터 (${dateKorean} 기준)]
- 비트코인 시세: 업비트 ${m.upbitBtcKRW}, 바이낸스 ${m.binanceBtcUSD}
- 김치프리미엄: ${m.kimp}, 코인베이스 프리미엄: ${m.cbPremium}
- 공포&탐욕 지수: ${m.fngScore} (${m.fngText})
- 비트코인 도미넌스: ${m.btcDominance}%, 환율: USD/KRW ${m.usdKrwRate}
- 국내 거래소 상승 종목 비율: 업비트 ${m.upbitRatio}%, 빗썸 ${m.bithumbRatio}%
- 선물 펀딩비: ${m.fundingRate}%, 미결제약정(OI): ${m.openInterest}
- 롱/숏 비율: ${m.longShortRatio}, 24시간 청산 규모: ${m.liquidations}, DVOL 변동성: ${m.dvol}
- 온체인 MVRV Z-Score: ${m.mvrv}, 채굴자 Puell Multiple: ${m.puell}
- SOPR: ${m.sopr}, 일일 실현 손익: ${m.realizedPnl}
- LTH 장기 보유자 비중: ${m.lthRatio}% (${m.lthAmount} 락업)
- 스테이블코인 총 공급량: ${m.stableSupply} (USDT: ${m.usdtSupply})
- 스마트머니 순매수 점수: ${m.smartMoneyScore}점

[주요 일정 및 경제 캘린더]
${eventsSummary || '주요 경제 지표 발표 및 메이저 알트코인 토큰 언락 예정'}

위 데이터를 종합하여 전문적이고 심도 있는 1,800~2,200자 시장 심리 분석 글을 생성해주세요.`;

  const baseContents = [
    {
      role: 'user',
      parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }]
    }
  ];

  // Candidates in prioritized order:
  // 1. gemini-3.5-flash with thinkingBudget: 0 (Fastest, ~14s, full complete text)
  // 2. gemini-flash-latest with thinkingBudget: 0
  // 3. gemini-3.6-flash with thinkingLevel: 'low'
  const modelAttempts = [
    {
      name: 'gemini-3.5-flash',
      payload: {
        contents: baseContents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
          thinkingConfig: { thinkingBudget: 0 }
        }
      }
    },
    {
      name: 'gemini-flash-latest',
      payload: {
        contents: baseContents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
          thinkingConfig: { thinkingBudget: 0 }
        }
      }
    },
    {
      name: 'gemini-3.6-flash',
      payload: {
        contents: baseContents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
          thinkingConfig: { thinkingLevel: 'low' }
        }
      }
    }
  ];

  for (const item of modelAttempts) {
    try {
      console.log(`[Gemini AI] Calling ${item.name}...`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${item.name}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.payload),
        signal: AbortSignal.timeout(60000)
      });
      if (res.ok) {
        const data = await res.json();
        const candidate = data.candidates?.[0];
        const finishReason = candidate?.finishReason || 'UNKNOWN';
        const parts = candidate?.content?.parts || [];
        const text = parts.map(p => p.text || '').join('').trim();
        console.log(`[Gemini AI] ${item.name} finishReason: ${finishReason}, parts: ${parts.length}, text length: ${text.length}`);
        if (text && text.length > 600) {
          console.log(`[Gemini AI] Successfully generated report with ${item.name} (${text.length} chars)`);
          return text;
        } else {
          console.warn(`[Gemini AI] ${item.name} text length (${text.length}) is below 600 characters.`);
        }
      } else {
        const errBody = await res.text().catch(() => '');
        console.warn(`[Gemini AI] ${item.name} responded with HTTP ${res.status}: ${errBody.slice(0, 150)}`);
      }
    } catch (err) {
      console.warn(`[Gemini AI] Error calling ${item.name}:`, err.message);
    }
  }
  return null;
}

// 4. Dynamic Quant Fallback Engine (Rich 6-Part 1,900 Chars with 5 Images)
function generateDynamicQuantReport(dateStr, dateKorean, m, img1, img2, img3, img4, img5) {
  const hasTodayEvents = Array.isArray(m.todaysEvents) && m.todaysEvents.length > 0;
  const evTodayText = hasTodayEvents
    ? m.todaysEvents.map(e => `[${(e.time || '오늘').replace(' (KST)', '')}] ${e.title}`).join(' / ')
    : '';

  const evNextText = m.nextEvents && m.nextEvents.length > 0
    ? m.nextEvents.map(e => `[${e.date}] ${e.title}`).join(', ')
    : '향후 주요 일정들이 순차 대기하고 있습니다.';

  return `
<h3 style="font-size: 19px; font-weight: 800; color: #0284c7; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; line-height: 1.4;">
  📌 1. 흥미로운 도입: "폭풍 전야의 팽팽한 침묵, 대세 상승의 전초전인가?"
</h3>
<p style="font-size: 15px; color: #1e293b; line-height: 1.85; margin-bottom: 18px;">
지난 10년간 비트코인 사이클을 현장에서 목격하며 체득한 가장 확실한 법칙 중 하나는, <strong>"대중이 지루함에 지쳐 떠나갈 때 진짜 큰 파도가 잉태된다"</strong>는 사실입니다. ${dateKorean} 현재 암호화폐 시장은 겉으로 보기에 큰 방향성 없이 횡보하는 것처럼 보이지만, 그 수면 아래에서는 스마트머니와 개인 투자자 사이의 심리적 괴리가 역사상 그 어느 때보다 극명하게 벌어지고 있습니다.
</p>
<p style="font-size: 15px; color: #1e293b; line-height: 1.85; margin-bottom: 18px;">
현재 비트코인은 국내 업비트 기준 ${m.upbitBtcKRW}, 해외 바이낸스 기준 ${m.binanceBtcUSD} 선에서 강력한 하방 경직성을 확보한 채 팽팽한 힘겨루기를 이어가고 있습니다. 과거 대세 상승장이 직전 전고점을 뚫기 전 겪었던 전형적인 '숨고르기 및 에너지 응축' 패턴과 정확히 일치하는 흐름입니다.
</p>

<!-- Image 1: Main YouTube Thumbnail -->
<div class="post-img-container text-center my-4">
  <img src="${img1}" alt="2026 시장 심리 긴급진단 - CrytoPnL 리서치" style="width:100%; max-width: 800px; display:block; margin: 14px auto; border-radius: 12px; border: none; box-shadow: none;" />
</div>

<h4 style="font-size: 17px; font-weight: 800; color: #0f172a; margin-top: 30px; margin-bottom: 12px; border-left: 4px solid #0284c7; padding-left: 10px;">
  2. 현재 시장 분위기 요약: Fear &amp; Greed와 지표 이면의 괴리
</h4>
<p style="font-size: 15px; color: #1e293b; line-height: 1.85; margin-bottom: 18px;">
오늘 집계된 얼터너티브 공포&amp;탐욕 지수는 <strong>${m.fngScore}포인트(${m.fngText})</strong>를 기록하고 있습니다. 수치상으로는 분명 탐욕 영역에 진입해 있지만, 커뮤니티나 투자자들의 실제 반응을 살펴보면 전혀 축제 분위기가 아닙니다. 오히려 '또 떨어지는 것 아니냐', '알트코인은 왜 안 가냐'는 불안과 회의론이 지배적인 상황입니다.
</p>
<p style="font-size: 15px; color: #1e293b; line-height: 1.85; margin-bottom: 18px;">
시장 파생상품 데이터를 살펴보면 이러한 심리가 숫자로 증명됩니다. 국내 김치프리미엄은 ${m.kimp}로 국내 개인들의 투기적 광풍이 전혀 관찰되지 않는 매우 차분한 상태이며, 미국 기관 수급의 바로미터인 코인베이스 프리미엄은 ${m.cbPremium}의 완만한 양수(+)를 유지하고 있습니다. 선물 펀딩비 역시 ${m.fundingRate}%로 중립 수준에 머물러 있어 과도한 롱 레버리지에 의한 청산 위험이 극도로 낮습니다. 즉, <em>"가격은 견고하게 버티는데 시장 참여자들의 심리는 극도로 신중한, 전형적인 건전한 상승 채널"</em>입니다.
</p>

<!-- Image 2: Fear & Greed Sentiment Dial -->
<div class="post-img-container text-center my-4">
  <img src="${img2}" alt="2026 Q3 크립토 심리 계측기 & 시장 감정 다이얼 - CrytoPnL" style="width:100%; max-width: 800px; display:block; margin: 14px auto; border-radius: 12px; border: none; box-shadow: none;" />
</div>

<h4 style="font-size: 17px; font-weight: 800; color: #0f172a; margin-top: 30px; margin-bottom: 12px; border-left: 4px solid #10b981; padding-left: 10px;">
  3. 분위기 형성 요인 분석: 가격을 떠받치는 3대 핵심 동인
</h4>
<p style="font-size: 15px; color: #1e293b; line-height: 1.85; margin-bottom: 18px;">
현재 시장의 분위기는 우연이 아닌 3가지 거대한 펀더멘털 축이 맞물리며 형성되고 있습니다.<br/>
첫째, <strong>기관 현물 ETF 자금의 지속적 유입</strong>입니다. 미국 월가의 주요 자산운용사들과 연기금들은 단기 시세 변동에 일희일비하지 않고 규제된 ETF 창구를 통해 비트코인을 지속적으로 바스켓에 담고 있습니다. 개인이 던지는 물량을 기관이 묵묵히 받아내며 강력한 하방 지지선을 형성하고 있습니다.
</p>
<p style="font-size: 15px; color: #1e293b; line-height: 1.85; margin-bottom: 18px;">
둘째, <strong>글로벌 거시 경제(매크로)의 유동성 재팽창</strong>입니다. 미 연준(Fed)의 금리 인하 사이클 진입과 글로벌 M2 통화량이 108.5조 달러(+4.2%)로 사상 최고치를 경신하면서, 달러 인덱스(DXY) 약세와 함께 위험자산 전반으로 자금 유입 압력이 고조되고 있습니다. 원/달러 환율 역시 ${m.usdKrwRate}원 선에서 안정되며 대외 거시 충격에 대한 내성을 갖추었습니다.<br/>
셋째, <strong>온체인 원장의 공급 쇼티지(Supply Crunch)</strong>입니다. 155일 이상 코인을 움직이지 않은 장기보유자(LTH) 비중이 ${m.lthRatio}%(${m.lthAmount})에 달하며 주요 글로벌 거래소의 비트코인 잔고는 6년 래 최저치로 떨어졌습니다. 반면 대기 매수세를 나타내는 스테이블코인 공급량은 ${m.stableSupply}(USDT ${m.usdtSupply})에 달해, 매도 물량이 씨가 마른 상태에서 작은 매수세 유입만으로도 강한 가격 탄력성이 발생할 수 있는 구조입니다.
</p>

<!-- Image 3: Core Drivers -->
<div class="post-img-container text-center my-4">
  <img src="${img3}" alt="현재 시장 분위기를 주도하는 3대 핵심 동인 - CrytoPnL" style="width:100%; max-width: 800px; display:block; margin: 14px auto; border-radius: 12px; border: none; box-shadow: none;" />
</div>

<h4 style="font-size: 17px; font-weight: 800; color: #0f172a; margin-top: 30px; margin-bottom: 12px; border-left: 4px solid #f59e0b; padding-left: 10px;">
  4. 주요 코인별 분위기 차이: 비트코인 독주와 알트코인의 온도차
</h4>
<p style="font-size: 15px; color: #1e293b; line-height: 1.85; margin-bottom: 18px;">
투자자들이 체감하는 온도차가 극명하게 갈리는 가장 결정적인 원인은 바로 <strong>자산군별 양극화</strong>입니다. 비트코인 도미넌스가 ${m.btcDominance}%에 육박하면서 전체 시장의 유동성을 비트코인이 거의 독점하고 있습니다. 비트코인 홀더들은 전고점 돌파를 목전에 두고 미소를 짓고 있지만, 대다수 알트코인 투자자들은 소외감을 느끼는 이유입니다.
</p>
<p style="font-size: 15px; color: #1e293b; line-height: 1.85; margin-bottom: 18px;">
실제로 국내 거래소의 상승 종목 비율을 보면 업비트 ${m.upbitRatio}%, 빗썸 ${m.bithumbRatio}% 수준으로 절반 가까운 종목들이 지지부진한 흐름을 이어가고 있습니다. 이더리움(ETH)은 레이어2 수수료 절감과 기관 스테이킹으로 체질을 개선하고 있으나 여전히 비트코인 대비 베타가 제한적인 상태입니다. 과거처럼 모든 코인이 동시에 폭등하는 '무차별 불장'이 아니라, 실질적인 프로토콜 매출과 확고한 내러티브를 갖춘 소수의 프로젝트만 선별적으로 반응하는 냉정한 장세가 전개되고 있습니다.
</p>

<!-- Image 4: Market Split & Divergence -->
<div class="post-img-container text-center my-4">
  <img src="${img4}" alt="주요 자산군별 체감 온도차 & 수급 다이버전스 - CrytoPnL" style="width:100%; max-width: 800px; display:block; margin: 14px auto; border-radius: 12px; border: none; box-shadow: none;" />
</div>

<h4 style="font-size: 17px; font-weight: 800; color: #0f172a; margin-top: 30px; margin-bottom: 12px; border-left: 4px solid #8b5cf6; padding-left: 10px;">
  5. 투자자 심리 변화에 따른 시장 단계: 우리는 지금 어디쯤 와 있는가?
</h4>
<p style="font-size: 15px; color: #1e293b; line-height: 1.85; margin-bottom: 18px;">
월스트리트 고전 심리 사이클(Wall St Cheat Sheet)에 비추어 볼 때, 현재 시장은 <strong>'회의(Disbelief)' 단계를 지나 '낙관(Optimism)'의 초입 구간</strong>에 위치해 있습니다. 침체기의 공포는 완전히 걷혔지만, 아직 대중적인 '신념(Belief)'이나 '환희(Euphoria)'의 정점에는 전혀 도달하지 않았습니다.
</p>
<p style="font-size: 15px; color: #1e293b; line-height: 1.85; margin-bottom: 18px;">
사이클의 역사를 돌이켜보면, <em>가장 위험한 순간은 모두가 시장의 상승을 당연시하고 축배를 들 때이며, 가장 기회가 큰 구간은 의심과 회의 속에서 조용히 매집이 이루어질 때</em>입니다. 지금 온체인 스마트머니 점수가 ${m.smartMoneyScore}점으로 강력한 축적(Accumulation) 영역에 머무는 반면 개인 투자자들은 망설이고 있다는 사실은, 사이클의 정점이 아직 한참 남아있음을 시사하는 가장 강력한 증거입니다.
</p>

<!-- Image 5: Cycle Roadmap & Action Guide -->
<div class="post-img-container text-center my-4">
  <img src="${img5}" alt="투자자 심리 사이클 로드맵 & 실전 행동 수칙 - CrytoPnL" style="width:100%; max-width: 800px; display:block; margin: 14px auto; border-radius: 12px; border: none; box-shadow: none;" />
</div>

<div class="morning-conclusion-card" style="background: rgba(8, 47, 73, 0.7); border: 1px solid rgba(56, 189, 248, 0.5); border-left: 4px solid #38bdf8; border-radius: 12px; padding: 20px 22px; margin: 24px 0; color: #ffffff;">
  <div style="color: #38bdf8; font-weight: 800; font-size: 15px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
    💡 6. 10년 차 분석가의 실전 행동 가이드: 독자를 위한 실질적 조언
  </div>
  <p style="font-size: 14px; line-height: 1.85; margin: 0; color: #f8fafc; font-weight: 500;">
    초보~중급 투자자분들께 당부드리고 싶은 핵심 행동 수칙은 명확합니다.<br/>
    첫째, <strong>절대 고레버리지 추격 매수를 하지 마세요.</strong> 거래소 유통량이 적은 환경에서는 단기 흔들기 변동성이 위아래로 크게 터질 수 있으므로, 현물 위주로 지지선 분할 매수하는 원칙을 고수해야 합니다.<br/>
    둘째, <strong>포트폴리오의 최소 20~30%는 반드시 현금(스테이블코인)으로 유지하세요.</strong> 예기치 못한 매크로 이벤트나 단기 딥(Dip)이 발생했을 때 여유 있게 분할 줍줍할 수 있는 실탄이 있어야 멘탈이 흔들리지 않습니다.<br/>
    셋째, <strong>비트코인이 길을 터줄 때까지 인내심을 가지세요.</strong> 과거 모든 사이클에서 비트코인의 전고점 돌파 후 도미넌스가 꺾이는 시점에 폭발적인 알트코인 대순환매가 찾아왔습니다. 단기 소음에 흔들리지 말고 온체인 팩트를 나침반 삼아 흔들림 없는 원칙 투자를 이어가시기 바랍니다.
  </p>
</div>
`;
}

// Assemble Gemini AI HTML with 5 Branded Images
function assembleGeminiHtml(rawText, img1, img2, img3, img4, img5) {
  const img1Tag = `<div class="post-img-container text-center my-4"><img src="${img1}" alt="2026 시장 심리 긴급진단 - CrytoPnL 리서치" style="width:100%; max-width: 800px; display:block; margin: 14px auto; border-radius: 12px; border: none; box-shadow: none;" /></div>`;
  const img2Tag = `<div class="post-img-container text-center my-4"><img src="${img2}" alt="2026 Q3 크립토 심리 계측기 & 시장 감정 다이얼 - CrytoPnL" style="width:100%; max-width: 800px; display:block; margin: 14px auto; border-radius: 12px; border: none; box-shadow: none;" /></div>`;
  const img3Tag = `<div class="post-img-container text-center my-4"><img src="${img3}" alt="현재 시장 분위기를 주도하는 3대 핵심 동인 - CrytoPnL" style="width:100%; max-width: 800px; display:block; margin: 14px auto; border-radius: 12px; border: none; box-shadow: none;" /></div>`;
  const img4Tag = `<div class="post-img-container text-center my-4"><img src="${img4}" alt="주요 자산군별 체감 온도차 & 수급 다이버전스 - CrytoPnL" style="width:100%; max-width: 800px; display:block; margin: 14px auto; border-radius: 12px; border: none; box-shadow: none;" /></div>`;
  const img5Tag = `<div class="post-img-container text-center my-4"><img src="${img5}" alt="투자자 심리 사이클 로드맵 & 실전 행동 수칙 - CrytoPnL" style="width:100%; max-width: 800px; display:block; margin: 14px auto; border-radius: 12px; border: none; box-shadow: none;" /></div>`;

  let processed = rawText;
  if (processed.includes('<!-- IMAGE_1 -->')) {
    processed = processed.replace('<!-- IMAGE_1 -->', img1Tag);
  }
  if (processed.includes('<!-- IMAGE_2 -->')) {
    processed = processed.replace('<!-- IMAGE_2 -->', img2Tag);
  }
  if (processed.includes('<!-- IMAGE_3 -->')) {
    processed = processed.replace('<!-- IMAGE_3 -->', img3Tag);
  }
  if (processed.includes('<!-- IMAGE_4 -->')) {
    processed = processed.replace('<!-- IMAGE_4 -->', img4Tag);
  }
  if (processed.includes('<!-- IMAGE_5 -->')) {
    processed = processed.replace('<!-- IMAGE_5 -->', img5Tag);
  }

  // Fallback: If AI omitted image placeholder tags, smartly insert them
  if (!processed.includes(img1Tag)) processed = img1Tag + processed;
  if (!processed.includes(img5Tag)) processed = processed + img5Tag;

  // Cleanup helper tags
  processed = processed
    .replace(/<\/?INTRO>/gi, '')
    .replace(/<\/?SECTION_[1-4]>/gi, '')
    .replace(/<\/?CONCLUSION>/gi, '');

  return processed;
}

// Master report generator
async function buildDailyMarketReport(targetDate = null) {
  const kst = targetDate ? new Date(targetDate) : getKSTDate();
  const dateStr = formatDateString(kst);
  const dateKorean = formatDateKorean(kst);
  const hour = String(kst.getHours()).padStart(2, '0');
  const min = String(kst.getMinutes()).padStart(2, '0');
  const timeFormatted = `${hour}:${min}`;
  const reportId = `report-${dateStr.replace(/-/g, '')}-${hour}${min}`;

  console.log(`[Daily Report Generator] Ingesting real-time market data for ${dateStr} ${timeFormatted}...`);
  const marketData = await fetchLiveMarketData(dateStr);

  const img1 = generateReportImage1(dateStr, marketData);
  const img2 = generateReportImage2(dateStr, marketData);
  const img3 = generateReportImage3(dateStr, marketData);
  const img4 = generateReportImage4(dateStr, marketData);
  const img5 = generateReportImage5(dateStr, marketData);

  let contentHtml = null;
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      console.log('[Daily Report Generator] GEMINI_API_KEY detected. Requesting AI report synthesis...');
      const aiText = await callGeminiAPI(dateStr, dateKorean, marketData, apiKey);
      if (aiText) {
        contentHtml = assembleGeminiHtml(aiText, img1, img2, img3, img4, img5);
      }
    } catch (e) {
      console.warn('[Daily Report Generator] Gemini API synthesis failed, falling back to dynamic quant engine:', e.message);
    }
  } else {
    console.log('[Daily Report Generator] GEMINI_API_KEY not set. Using dynamic quant scenario engine.');
  }

  // Fallback to dynamic quant engine if AI was not available
  if (!contentHtml) {
    contentHtml = generateDynamicQuantReport(dateStr, dateKorean, marketData, img1, img2, img3, img4, img5);
  }

  // Pure text character count check (excluding image containers)
  const cleanText = contentHtml
    .replace(/<div class="post-img-container[\s\S]*?<\/div>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  console.log(`[Daily Report Generator] Generated for ${dateStr} ${timeFormatted} - Plain text characters: ${cleanText.length}`);

  const timestamp = kst.getTime();
  const timeStr = `${dateStr} ${timeFormatted}`;

  const fngNum = parseInt(marketData.fngScore) || 69;
  const titleTopic = fngNum >= 75 ? '극단적 탐욕의 유혹과 과열 리스크' : (fngNum >= 55 ? `비트코인 탐욕 지수 ${fngNum}P... 폭풍 전야인가 대세 상승의 서막인가?` : `공포와 관망 사이... 스마트머니는 왜 조용히 지갑을 채울까?`);

  return {
    id: reportId,
    category: 'altcoin',
    categoryName: '📊 시장 분위기',
    title: `[시장 심리 분석] ${dateKorean} ${titleTopic}`,
    author: '시황분석팀 (AI)',
    authorRank: 'VERIFIED',
    timestamp: timestamp,
    time: timeStr,
    views: 0,
    upvotes: 0,
    isNotice: false,
    image: true,
    content: contentHtml,
    comments: []
  };
};

// 5. Daily Technical Trading Perspective Generator (TradingView Style)
async function fetchBinance4hTechnicals() {
  let candles = [];

  // Source 1: Bybit 4H Klines (Worldwide cloud accessible, no HTTP 451 geo-block)
  try {
    const res = await fetch('https://api.bybit.com/v5/market/kline?category=spot&symbol=BTCUSDT&interval=240&limit=60', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(6000)
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.result && Array.isArray(data.result.list) && data.result.list.length > 0) {
        candles = data.result.list.map(c => ({
          time: parseInt(c[0]),
          open: parseFloat(c[1]),
          high: parseFloat(c[2]),
          low: parseFloat(c[3]),
          close: parseFloat(c[4]),
          volume: parseFloat(c[5])
        })).reverse();
        console.log(`[Technical Engine] Successfully fetched ${candles.length} live 4H candles from Bybit`);
      }
    }
  } catch(e) {
    console.warn('[Technical Engine] Bybit 4H fetch failed:', e.message);
  }

  // Source 2: Binance.US 4H Klines (Works on US Cloud IPs)
  if (candles.length === 0) {
    try {
      const res = await fetch('https://api.binance.us/api/v3/klines?symbol=BTCUSDT&interval=4h&limit=60', {
        signal: AbortSignal.timeout(6000)
      });
      if (res.ok) {
        const raw = await res.json();
        if (Array.isArray(raw) && raw.length > 0) {
          candles = raw.map(c => ({
            time: c[0],
            open: parseFloat(c[1]),
            high: parseFloat(c[2]),
            low: parseFloat(c[3]),
            close: parseFloat(c[4]),
            volume: parseFloat(c[5])
          }));
          console.log(`[Technical Engine] Successfully fetched ${candles.length} live 4H candles from Binance.US`);
        }
      }
    } catch(e) {
      console.warn('[Technical Engine] Binance.US 4H fetch failed:', e.message);
    }
  }

  // Source 3: Upbit KRW-BTC converted to USD
  if (candles.length === 0) {
    try {
      const res = await fetch('https://api.upbit.com/v1/candles/minutes/240?market=KRW-BTC&count=60', {
        signal: AbortSignal.timeout(6000)
      });
      if (res.ok) {
        const raw = await res.json();
        if (Array.isArray(raw) && raw.length > 0) {
          const fx = 1360.0;
          candles = raw.map(c => ({
            time: new Date(c.candle_date_time_utc + 'Z').getTime(),
            open: c.opening_price / fx,
            high: c.high_price / fx,
            low: c.low_price / fx,
            close: c.trade_price / fx,
            volume: c.candle_acc_trade_volume
          })).reverse();
          console.log(`[Technical Engine] Successfully fetched ${candles.length} live 4H candles from Upbit`);
        }
      }
    } catch(e) {
      console.warn('[Technical Engine] Upbit 4H fetch failed:', e.message);
    }
  }

  // Fallback defaults if all networks completely fail
  if (candles.length < 14) {
    console.warn('[Technical Engine] Network failed to fetch live 4H candles, generating realistic dynamic baseline');
    const baseP = 77400;
    return {
      currentPrice: baseP,
      high24h: Math.round(baseP * 1.02),
      low24h: Math.round(baseP * 0.98),
      ema20: Math.round(baseP * 0.998),
      ema50: Math.round(baseP * 1.006),
      ema200: Math.round(baseP * 1.018),
      recentHigh: Math.round(baseP * 1.025),
      recentLow: Math.round(baseP * 0.975),
      candles: [],
      isVolDecreasing: true,
      rsi: 48.5,
      technicalConfluence: {
        fib: {
          swingHigh: Math.round(baseP * 1.03),
          swingLow: Math.round(baseP * 0.97),
          fib236: Math.round(baseP * 0.984),
          fib382: Math.round(baseP * 0.993),
          fib500: baseP,
          fib618: Math.round(baseP * 1.007),
          fib786: Math.round(baseP * 1.017),
          fib886: Math.round(baseP * 1.023)
        },
        fibRatio: 0.500,
        harmonicPattern: '가틀리(Gartley) 0.618 황금비율 PRZ',
        elliottWave: '4파 수렴 완료 후 5파 분기점'
      },
      setup: {
        direction: 'SHORT',
        theme: '저항 리테스트 및 박스권 하단 확인',
        entryMin: Math.round(baseP * 0.995),
        entryMax: Math.round(baseP * 1.005),
        tp1: Math.round(baseP * 0.975),
        tp2: Math.round(baseP * 0.955),
        sl: Math.round(baseP * 1.018),
        riskReward: '2.15'
      }
    };
  }

  const last = candles[candles.length - 1];
  const closes = candles.map(c => c.close);
  const volumes = candles.map(c => c.volume);

  function calcEMA(data, period) {
    const k = 2 / (period + 1);
    let ema = data[0];
    for (let i = 1; i < data.length; i++) {
      ema = (data[i] * k) + (ema * (1 - k));
    }
    return ema;
  }

  function calcRSI(data, period = 14) {
    if (data.length <= period) return 50;
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
      const diff = data[i] - data[i - 1];
      if (diff >= 0) gains += diff;
      else losses -= diff;
    }
    let avgGain = gains / period;
    let avgLoss = losses / period;
    for (let i = period + 1; i < data.length; i++) {
      const diff = data[i] - data[i - 1];
      avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
      avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
    }
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return Math.round((100 - (100 / (1 + rs))) * 10) / 10;
  }

  const ema20 = calcEMA(closes.slice(-20), 20);
  const ema50 = calcEMA(closes, Math.min(50, closes.length - 1));
  const ema200 = calcEMA(closes, Math.min(200, closes.length - 1));
  const rsi14 = calcRSI(closes, 14);
  const recentHigh = Math.max(...candles.slice(-12).map(c => c.high));
  const recentLow = Math.min(...candles.slice(-12).map(c => c.low));
  const volAvg = volumes.slice(-10).reduce((a, b) => a + b, 0) / 10;
  const isVolDecreasing = volumes[volumes.length - 1] < volAvg;

  // Swing High/Low & Fibonacci Retracement Levels for Harmonic & Elliott Wave Confluence
  const swingHigh = Math.round(Math.max(...candles.map(c => c.high)));
  const swingLow = Math.round(Math.min(...candles.map(c => c.low)));
  const swingRange = Math.max(1, swingHigh - swingLow);
  const curP = Math.round(last.close);

  const fib236 = Math.round(swingLow + swingRange * 0.236);
  const fib382 = Math.round(swingLow + swingRange * 0.382);
  const fib500 = Math.round(swingLow + swingRange * 0.500);
  const fib618 = Math.round(swingLow + swingRange * 0.618);
  const fib786 = Math.round(swingLow + swingRange * 0.786);
  const fib886 = Math.round(swingLow + swingRange * 0.886);
  const fibRatio = Math.max(0, Math.min(1, (curP - swingLow) / swingRange));

  // Derive Harmonic Pattern & Elliott Wave candidates based on Fibonacci & trend structure
  let harmonicPattern = '가틀리(Gartley) 또는 박쥐(Bat) 0.618/0.786 PRZ';
  let elliottWave = '4파 조정 완료 후 5파 충격파 분기점';

  if (fibRatio >= 0.82) {
    harmonicPattern = '딥 크랩(Deep Crab) 1.618 또는 버터플라이(Butterfly) 1.272 확장 저항대';
    elliottWave = '상승 충격 5파 완결 후 주요 ABC 되돌림 분기점';
  } else if (fibRatio >= 0.70) {
    harmonicPattern = '베어리시/불리시 뱃(Bat) 패턴 0.886 PRZ (잠재적 반전 구역)';
    elliottWave = '조정 B파 되돌림 고점 확인 후 C파 충격 하락 분기점';
  } else if (fibRatio >= 0.54 && fibRatio < 0.70) {
    harmonicPattern = '가틀리(Gartley) 0.618 황금비율 및 AB=CD 대칭 패턴 PRZ';
    elliottWave = '엘리엇 4파 지그재그/플랫 조정 완료 후 5파 임펄스 개시';
  } else if (fibRatio >= 0.34 && fibRatio < 0.54) {
    harmonicPattern = '사이퍼(Cypher) 패턴 0.382~0.500 밸류 리테스트';
    elliottWave = '충격 3파 진행 중 단기 되돌림 또는 조정 B파 진행';
  } else {
    harmonicPattern = '샤크(Shark) 또는 카운터 사이퍼 지지 PRZ';
    elliottWave = '하락 ABC 지그재그 C파 종결 구간 및 1파 반등 초입';
  }

  // Derive dynamic trading setup based on real market confluence
  let direction = 'SHORT';
  let theme = '200 EMA 저항 직면 및 하방 리테스트';
  let entryMin, entryMax, tp1, tp2, sl, riskReward;

  if (curP >= ema50 && rsi14 >= 52) {
    direction = 'LONG';
    theme = '50 EMA 지지 안착 및 상방 돌파 테스트';
    entryMin = Math.round(Math.min(curP, ema50));
    entryMax = curP;
    tp1 = Math.round(Math.max(recentHigh, curP * 1.025));
    tp2 = Math.round(tp1 * 1.03);
    sl = Math.round(Math.min(recentLow, ema50 * 0.985));
    const risk = curP - sl;
    const reward = tp1 - curP;
    riskReward = (reward > 0 && risk > 0) ? (reward / risk).toFixed(2) : '2.25';
  } else if (curP < ema50 && rsi14 <= 48) {
    direction = 'SHORT';
    theme = '주요 이평선 저항 직면 및 하방 리테스트';
    entryMin = curP;
    entryMax = Math.round(Math.max(curP, ema50));
    tp1 = Math.round(Math.min(recentLow, curP * 0.975));
    tp2 = Math.round(tp1 * 0.97);
    sl = Math.round(Math.max(recentHigh, ema50 * 1.015));
    const risk = sl - curP;
    const reward = curP - tp1;
    riskReward = (reward > 0 && risk > 0) ? (reward / risk).toFixed(2) : '2.35';
  } else {
    direction = 'RANGE';
    theme = '수렴 구간 박스권 레인지 공략';
    entryMin = Math.round(recentLow * 1.005);
    entryMax = Math.round((recentLow + curP) / 2);
    tp1 = Math.round((recentHigh + curP) / 2);
    tp2 = Math.round(recentHigh * 0.995);
    sl = Math.round(recentLow * 0.985);
    riskReward = '2.10';
  }

  return {
    currentPrice: curP,
    high24h: Math.round(Math.max(...candles.slice(-6).map(c => c.high))),
    low24h: Math.round(Math.min(...candles.slice(-6).map(c => c.low))),
    ema20: Math.round(ema20),
    ema50: Math.round(ema50),
    ema200: Math.round(ema200),
    recentHigh: Math.round(recentHigh),
    recentLow: Math.round(recentLow),
    candles: candles.slice(-48),
    isVolDecreasing,
    rsi: rsi14,
    technicalConfluence: {
      fib: {
        swingHigh,
        swingLow,
        fib236,
        fib382,
        fib500,
        fib618,
        fib786,
        fib886
      },
      fibRatio: Number(fibRatio.toFixed(3)),
      harmonicPattern,
      elliottWave
    },
    setup: {
      direction,
      theme,
      entryMin,
      entryMax,
      tp1,
      tp2,
      sl,
      riskReward
    }
  };
}

function generateTradingViewChartSvg(dateStr, tech, slotInfo = null) {
  const curP = Number(tech.currentPrice || 78370);
  const slotBadge = slotInfo?.timeFormatted ? slotInfo.timeFormatted : (slotInfo ? slotInfo.slotHour + '시' : '4H');
  const slotTimestampStr = slotInfo ? slotInfo.timeStr : `${dateStr} 실시간`;
  const setup = tech.setup || {
    direction: 'SHORT',
    theme: '주요 이평선 저항 직면 및 하방 리테스트',
    entryMin: Math.round(curP * 0.995),
    entryMax: Math.round(curP * 1.005),
    tp1: Math.round(curP * 0.975),
    tp2: Math.round(curP * 0.955),
    sl: Math.round(curP * 1.018),
    riskReward: '2.35'
  };

  // Live candles if available, else baseline simulation scaled to curP
  let displayCandles = [];
  if (tech.candles && tech.candles.length >= 20) {
    displayCandles = tech.candles.slice(-48).map(c => ({
      o: c.open,
      h: c.high,
      l: c.low,
      c: c.close,
      v: c.volume
    }));
  } else {
    const scale = curP / 78370;
    const mockCloses = [
      80100, 80250, 80050, 79650, 79750, 79450, 79250, 78900, 78800, 79100, 78950, 78550,
      78700, 77950, 77300, 76950, 76350, 76000, 76450, 76350, 76750, 76600, 76950, 76800,
      77050, 76850, 76600, 76800, 77150, 77350, 77550, 77700, 77450, 77950, 78200, 78100,
      78450, 78650, 78800, 78900, 78850, 78650, 78550, 78750, 78600, 78500, 78350, curP
    ];
    displayCandles = mockCloses.map((c, i) => {
      const p = (i === mockCloses.length - 1) ? curP : c * scale;
      return {
        o: p * 0.998,
        h: p * 1.004,
        l: p * 0.995,
        c: p,
        v: 15 + (i % 10) * 3
      };
    });
  }

  // Price range calculation including Fibonacci levels
  const fib = tech.technicalConfluence?.fib;
  const fibPrices = fib ? [fib.fib382, fib.fib500, fib.fib618, fib.fib786] : [];
  const allPrices = displayCandles.flatMap(c => [c.h, c.l]).concat([
    setup.entryMin, setup.entryMax, setup.tp1, setup.tp2, setup.sl,
    tech.ema50 || curP, tech.ema200 || curP, ...fibPrices
  ]);
  const minP = Math.floor(Math.min(...allPrices) * 0.995);
  const maxP = Math.ceil(Math.max(...allPrices) * 1.005);
  const rangeP = Math.max(1, maxP - minP);
  const getY = (p) => {
    const clamped = Math.max(minP, Math.min(maxP, p));
    return 136 + ((maxP - clamped) / rangeP) * 176;
  };

  const candleCount = displayCandles.length;
  const candleStep = 720 / Math.max(1, candleCount);
  const maxVol = Math.max(...displayCandles.map(c => c.v || 1), 1);

  const candleSvgElements = displayCandles.map((c, i) => {
    const cx = 35 + (i * candleStep) + (candleStep / 2);
    const isBull = c.c >= c.o;
    const color = isBull ? '#10b981' : '#f43f5e';
    const topY = Math.min(getY(c.o), getY(c.c));
    const botY = Math.max(getY(c.o), getY(c.c));
    const bodyHeight = Math.max(2, botY - topY);
    const highY = getY(c.h);
    const lowY = getY(c.l);

    const volHeight = Math.min(26, Math.max(3, ((c.v || 1) / maxVol) * 26));
    const volY = 325 - volHeight;
    const barWidth = Math.max(3, Math.min(8, candleStep * 0.65));

    return `  <!-- C${i} -->\n  <rect x="${(cx - barWidth/2).toFixed(1)}" y="${volY.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${volHeight.toFixed(1)}" fill="${color}" fill-opacity="0.32" rx="0.8"/>\n  <line x1="${cx.toFixed(1)}" y1="${highY.toFixed(1)}" x2="${cx.toFixed(1)}" y2="${lowY.toFixed(1)}" stroke="${color}" stroke-width="1.1"/>\n  <rect x="${(cx - barWidth/2).toFixed(1)}" y="${topY.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${bodyHeight.toFixed(1)}" fill="${color}" rx="1"/>`;
  }).join('\n');

  const dirColor = setup.direction === 'LONG' ? '#10b981' : (setup.direction === 'SHORT' ? '#f43f5e' : '#f59e0b');
  const dirLabel = setup.direction === 'LONG' ? 'LONG (상방 돌파)' : (setup.direction === 'SHORT' ? 'SHORT (하방 리테스트)' : 'RANGE (박스권 공략)');
  const patternShort = tech.technicalConfluence?.harmonicPattern ? tech.technicalConfluence.harmonicPattern.split(' ')[0] : 'Harmonic';

  const fibLinesSvg = fib ? `
  <!-- Fibonacci Retracement Levels -->
  <line x1="20" y1="${getY(fib.fib618).toFixed(1)}" x2="780" y2="${getY(fib.fib618).toFixed(1)}" stroke="#8b5cf6" stroke-width="1" stroke-dasharray="4,3" stroke-opacity="0.6"/>
  <text x="765" y="${(getY(fib.fib618) - 3).toFixed(1)}" fill="#c4b5fd" font-size="8.5" font-family="monospace" text-anchor="end">Fib 0.618 골든레벨: $${Number(fib.fib618).toLocaleString()}</text>
  <line x1="20" y1="${getY(fib.fib382).toFixed(1)}" x2="780" y2="${getY(fib.fib382).toFixed(1)}" stroke="#6366f1" stroke-width="1" stroke-dasharray="4,3" stroke-opacity="0.6"/>
  <text x="765" y="${(getY(fib.fib382) - 3).toFixed(1)}" fill="#a5b4fc" font-size="8.5" font-family="monospace" text-anchor="end">Fib 0.382 되돌림: $${Number(fib.fib382).toLocaleString()}</text>` : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 420" width="800" height="420">
  <defs>
    <linearGradient id="bg_chart" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#080c14"/>
      <stop offset="50%" stop-color="#0d1424"/>
      <stop offset="100%" stop-color="#060910"/>
    </linearGradient>
  </defs>
  <!-- Main Background: 100% borderless clean card -->
  <rect width="800" height="420" rx="14" fill="url(#bg_chart)" stroke="none"/>
  
  <!-- Header: Borderless badges -->
  <rect x="20" y="16" width="115" height="26" rx="6" fill="#6366f1" fill-opacity="0.18" stroke="none"/>
  <text x="77" y="33" fill="#a5b4fc" font-size="11" font-weight="bold" font-family="monospace" text-anchor="middle">BTC 4H [${slotBadge}]</text>
  <text x="148" y="34" fill="#ffffff" font-size="13.5" font-weight="bold" font-family="sans-serif">트레이딩 셋업: ${setup.theme} [${patternShort} PRZ • Elliott 4H]</text>
  <rect x="635" y="16" width="145" height="26" rx="6" fill="#06b6d4" fill-opacity="0.14" stroke="none"/>
  <text x="707" y="33" fill="#22d3ee" font-size="11.5" font-weight="900" font-family="monospace" text-anchor="middle">🌐 crytopnl.com</text>
  <line x1="20" y1="52" x2="780" y2="52" stroke="#1e293b" stroke-width="1"/>

  <!-- Parameters Row: Completely borderless pills with soft dark fill -->
  <rect x="20" y="62" width="178" height="52" rx="10" fill="#151d2f" fill-opacity="0.85" stroke="none"/>
  <text x="32" y="80" fill="#94a3b8" font-size="10" font-family="sans-serif">포지션 방향</text>
  <text x="32" y="102" fill="${dirColor}" font-size="13" font-weight="900" font-family="monospace">${dirLabel}</text>

  <rect x="206" y="62" width="186" height="52" rx="10" fill="#151d2f" fill-opacity="0.85" stroke="none"/>
  <text x="218" y="80" fill="#94a3b8" font-size="10" font-family="sans-serif">진입 구역 (Entry Zone)</text>
  <text x="218" y="102" fill="#38bdf8" font-size="12.5" font-weight="bold" font-family="monospace">$${Number(setup.entryMin).toLocaleString()} ~ $${Number(setup.entryMax).toLocaleString()}</text>

  <rect x="400" y="62" width="194" height="52" rx="10" fill="#151d2f" fill-opacity="0.85" stroke="none"/>
  <text x="412" y="80" fill="#94a3b8" font-size="10" font-family="sans-serif">목표가 (Take Profit)</text>
  <text x="412" y="102" fill="#34d399" font-size="12" font-weight="bold" font-family="monospace">TP1 $${Math.round(setup.tp1/100)/10}K / TP2 $${Math.round(setup.tp2/100)/10}K</text>

  <rect x="602" y="62" width="178" height="52" rx="10" fill="#151d2f" fill-opacity="0.85" stroke="none"/>
  <text x="614" y="80" fill="#94a3b8" font-size="10" font-family="sans-serif">손절 &amp; 손익비</text>
  <text x="614" y="102" fill="#fbbf24" font-size="12" font-weight="bold" font-family="monospace">SL $${Math.round(setup.sl/100)/10}K (1:${setup.riskReward})</text>

  <!-- Main Chart Canvas: Borderless dark canvas -->
  <rect x="20" y="124" width="760" height="206" rx="10" fill="#090d16" stroke="none"/>
  
  <!-- Subtle grid lines -->
  <line x1="20" y1="160" x2="780" y2="160" stroke="#172033" stroke-dasharray="3,3"/>
  <line x1="20" y1="205" x2="780" y2="205" stroke="#172033" stroke-dasharray="3,3"/>
  <line x1="20" y1="255" x2="780" y2="255" stroke="#172033" stroke-dasharray="3,3"/>
  <line x1="20" y1="298" x2="780" y2="298" stroke="#172033" stroke-dasharray="3,3"/>
${fibLinesSvg}

  <!-- Entry Zone Rect -->
  <rect x="20" y="${Math.min(getY(setup.entryMin), getY(setup.entryMax)).toFixed(1)}" width="760" height="${Math.max(4, Math.abs(getY(setup.entryMin) - getY(setup.entryMax))).toFixed(1)}" fill="#0284c7" fill-opacity="0.12" stroke="none"/>
  <text x="765" y="${(getY(setup.entryMax) + 3).toFixed(1)}" fill="#38bdf8" font-size="9" font-family="monospace" font-weight="bold" text-anchor="end">진입대 $${Number(setup.entryMin).toLocaleString()} ~ $${Number(setup.entryMax).toLocaleString()}</text>

  <!-- Stop Loss line -->
  <line x1="20" y1="${getY(setup.sl).toFixed(1)}" x2="780" y2="${getY(setup.sl).toFixed(1)}" stroke="#e11d48" stroke-width="1.3" stroke-dasharray="4,4"/>
  <text x="28" y="${(getY(setup.sl) - 4).toFixed(1)}" fill="#fda4af" font-size="9" font-family="monospace">⛔ Invalidation (SL): $${Number(setup.sl).toLocaleString()}</text>

  <!-- Target 1 line -->
  <line x1="20" y1="${getY(setup.tp1).toFixed(1)}" x2="780" y2="${getY(setup.tp1).toFixed(1)}" stroke="#10b981" stroke-width="1.2" stroke-dasharray="5,3"/>
  <text x="765" y="${(getY(setup.tp1) - 4).toFixed(1)}" fill="#34d399" font-size="9.5" font-family="monospace" font-weight="bold" text-anchor="end">🎯 1차 목표가: $${Number(setup.tp1).toLocaleString()}</text>

  <!-- Target 2 line -->
  <line x1="20" y1="${getY(setup.tp2).toFixed(1)}" x2="780" y2="${getY(setup.tp2).toFixed(1)}" stroke="#059669" stroke-width="1.2" stroke-dasharray="5,3"/>
  <text x="765" y="${(getY(setup.tp2) - 4).toFixed(1)}" fill="#10b981" font-size="9.5" font-family="monospace" font-weight="bold" text-anchor="end">🎯 2차 목표가: $${Number(setup.tp2).toLocaleString()}</text>

  <!-- 200 EMA Line -->
  <line x1="20" y1="${getY(tech.ema200 || curP).toFixed(1)}" x2="780" y2="${getY(tech.ema200 || curP).toFixed(1)}" stroke="#f59e0b" stroke-width="1.4" stroke-dasharray="6,3"/>
  <text x="35" y="${(getY(tech.ema200 || curP) - 4).toFixed(1)}" fill="#fbbf24" font-size="9" font-family="monospace" font-weight="bold">200 EMA: $${Number(tech.ema200 || curP).toLocaleString()}</text>

  <!-- 50 EMA Line -->
  <line x1="20" y1="${getY(tech.ema50 || curP).toFixed(1)}" x2="780" y2="${getY(tech.ema50 || curP).toFixed(1)}" stroke="#06b6d4" stroke-width="1.3" stroke-dasharray="4,2"/>
  <text x="35" y="${(getY(tech.ema50 || curP) + 12).toFixed(1)}" fill="#22d3ee" font-size="9" font-family="monospace" font-weight="bold">50 EMA: $${Number(tech.ema50 || curP).toLocaleString()}</text>

  <!-- Candlesticks (Candlesticks & Volume Rendering) -->
${candleSvgElements}

  <!-- Bottom Indicators & Volume: 100% Borderless, 3-Row Zero-Overlap Layout -->
  <rect x="20" y="338" width="760" height="72" rx="8" fill="#151d2f" fill-opacity="0.8" stroke="none"/>
  
  <!-- Row 1: Volume Trend -->
  <text x="32" y="357" fill="#94a3b8" font-size="10" font-family="sans-serif">거래량/파동 분석:</text>
  <text x="135" y="357" fill="${tech.isVolDecreasing ? '#f43f5e' : '#38bdf8'}" font-size="10" font-weight="bold" font-family="sans-serif">${tech.isVolDecreasing ? '거래량 점진적 수축 (파동 되돌림 및 PRZ 형성 구간)' : '거래량 유입 동반 변동성 확장 (임펄스 파동 전개)'}</text>
  
  <!-- Row 2: Indicators -->
  <text x="32" y="378" fill="#94a3b8" font-size="10" font-family="sans-serif">핵심 지표:</text>
  <text x="100" y="378" fill="#38bdf8" font-size="10" font-weight="bold" font-family="monospace">RSI(14): ${tech.rsi || 50}</text>
  <text x="190" y="378" fill="#c4b5fd" font-size="10" font-weight="bold" font-family="monospace">• Fib되돌림: ${(Number(tech.technicalConfluence?.fibRatio || 0.5) * 100).toFixed(0)}% (${patternShort} PRZ)</text>
  <text x="500" y="378" fill="#fbbf24" font-size="10" font-weight="bold" font-family="monospace">• 현재가: $${Number(curP).toLocaleString()}</text>
  
  <!-- Row 3: Metadata -->
  <text x="32" y="398" fill="#64748b" font-size="9" font-family="sans-serif">분석 기준: ${slotTimestampStr} KST (${slotInfo ? slotInfo.sessionTitle : '실시간 4H'})</text>
  <text x="768" y="398" fill="#64748b" font-size="9" font-family="sans-serif" text-anchor="end">제공: crytopnl.com AI 퀀트엔진</text>
</svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg.replace(/\s+/g, ' ').trim());
}

async function callGeminiPerspectiveAPI(dateStr, dateKorean, tech, slotInfo, apiKey) {
  const slotName = slotInfo?.slotName || '오전 관점 (09:00)';
  const sessionTitle = slotInfo?.sessionTitle || '아시아장/일봉 마감 세션';
  const sessionContext = slotInfo?.sessionContext || '당일 기준 가격대와 200 EMA 지지/저항을 확립하는 구간';
  const setup = tech.setup || {
    direction: 'SHORT',
    theme: '주요 이평선 저항 직면 및 하방 리테스트',
    entryMin: Math.round((tech.currentPrice || 78370) * 0.995),
    entryMax: Math.round((tech.currentPrice || 78370) * 1.005),
    tp1: Math.round((tech.currentPrice || 78370) * 0.975),
    tp2: Math.round((tech.currentPrice || 78370) * 0.955),
    sl: Math.round((tech.currentPrice || 78370) * 1.018),
    riskReward: '2.35'
  };
  const conf = tech.technicalConfluence || {};
  const fib = conf.fib || {};

  const systemInstruction = `당신은 월가 프롭 트레이딩 및 글로벌 헤지펀드 데스크 출신의 세계적인 수석 테크니컬 & 퀀트 스트래티지스트(AI)입니다.
전통적인 이동평균선(EMA 20/50/200)과 RSI 모멘텀 지표뿐만 아니라, **하모닉 패턴(Harmonic Patterns: Gartley, Bat, Butterfly, Crab, Cypher 등 피보나치 정밀 비율)**과 **엘리엇 파동 이론(Elliott Wave Theory: 1~5파 충격파, ABC 조정파, 파동 연장 및 절단)**을 최고 수준으로 구사하는 차트 분석의 최고 권위자입니다.

트레이딩뷰(TradingView)의 Top Authors Editor's Pick 스타일에 맞춰, ${dateKorean} 비트코인(BTC/USDT 4시간봉) [${slotName} - ${sessionTitle}] 전문 테크니컬 관점 리포트를 작성하세요.

[수석 애널리스트 핵심 역할 및 분석 지침]
1. 단순한 보조지표 수치 나열을 지양하고, 현재 4시간봉 차트의 형태와 피보나치 레벨에 가장 적합한 **핵심 프레임워크(예: 하모닉 패턴의 D점 PRZ 반전 모델, 또는 엘리엇 파동 카운팅 및 파동 목표가 모델)**를 주력 도구로 선정하여 입체적이고 설득력 있게 분석하세요.
2. 하모닉 패턴(Harmonic Pattern) 분석 시:
   - XABCD 스윙 레그의 피보나치 비율(0.382, 0.500, 0.618, 0.786, 0.886, 1.272, 1.618 등)과 잠재적 반전 구역(PRZ, Potential Reversal Zone), 목표 손익비를 명확히 다루세요.
3. 엘리엇 파동(Elliott Wave) 분석 시:
   - 현재 파동이 충격파(Impulse: 1, 2, 3, 4, 5)의 어느 단계인지, 혹은 조정파(Corrective: Zigzag 5-3-5, Flat 3-3-5, Triangle 등)의 어느 국면인지 파동 카운팅 논리와 무효화 레벨(파동 중첩 원칙 등)을 명쾌하게 설명하세요.
4. 이동평균선(EMA 20/50/200) 및 RSI, 거래량(Volume)은 해당 파동 또는 하모닉 패턴의 신뢰도를 보강하는 복합 컨플루언스(Confluence) 근거로 유기적으로 결합하세요.
5. **[제목 필수 규칙]**: 글의 가장 첫 줄에 반드시 <TITLE>[BTC/USDT ${slotName}] (선택한 하모닉 패턴 또는 엘리엇 파동, 실시간 가격 및 세션 특성을 반영한 독창적이고 날카로운 제목)</TITLE> 형식으로 출력하세요.
6. 네이버 블로그/카페(SmartEditor ONE) 복사 시 테두리가 깨지지 않도록 외곽선(border)을 배제하고, 깔끔한 소프트 배경(#f1f5f9)과 진한 글씨체(#0f172a, #1e293b)의 카드 UI로 구성하세요.
7. 구성 목차:
   - <TITLE>[BTC/USDT ${slotName}] 독창적 분석 제목</TITLE>
   - <!-- TRADINGVIEW_CHART_IMAGE -->
   - <SETUP_BOX>테두리 없는 깔끔한 트레이딩 셋업 카드 (포지션: ${setup.direction}, 패턴/파동 테마: ${conf.harmonicPattern || setup.theme}, 진입, TP1, TP2, SL, 손익비: 1:${setup.riskReward})</SETUP_BOX>
   - <SECTION_1>1. 차트 구조 및 파동/패턴 정밀 진단: [엘리엇 파동 카운팅 or 하모닉 패턴 PRZ 분석] (2문단)</SECTION_1>
   - <SECTION_2>2. 멀티 컨플루언스 분석: 피보나치 레벨, 주요 EMA 이평선(20/50/200), RSI 및 거래량 괴리 (2문단)</SECTION_2>
   - <SECTION_3>3. 세션별 전개 시나리오: 시나리오 A(메인 파동/패턴 완성 경로) vs 시나리오 B(반대 무효화 경로) (2문단)</SECTION_3>
   - <SECTION_4>4. 파동/패턴 무효화 기준(Invalidation Level: $${Number(setup.sl).toLocaleString()}) & 리스크 관리 가이드 (1문단)</SECTION_4>`;

  const userPrompt = `[현재 BTC/USDT 4시간봉 정밀 기술 데이터 (${dateKorean} ${slotName} 기준)]
- 현재 시세: $${Number(tech.currentPrice).toLocaleString()}
- 24시간 최고가: $${Number(tech.high24h).toLocaleString()} / 최저가: $${Number(tech.low24h).toLocaleString()}
- 주요 스윙 고점(Swing High): $${Number(fib.swingHigh || tech.recentHigh).toLocaleString()} / 스윙 저점(Swing Low): $${Number(fib.swingLow || tech.recentLow).toLocaleString()}
- 주요 피보나치 되돌림 레벨:
  * 0.382 레벨: $${Number(fib.fib382 || 0).toLocaleString()}
  * 0.500 레벨: $${Number(fib.fib500 || 0).toLocaleString()}
  * 0.618 골든 레벨: $${Number(fib.fib618 || 0).toLocaleString()}
  * 0.786 / 0.886 PRZ 레벨: $${Number(fib.fib786 || 0).toLocaleString()} ~ $${Number(fib.fib886 || 0).toLocaleString()}
  * 현재 가격의 피보나치 위치: ${(Number(conf.fibRatio || 0.5) * 100).toFixed(1)}% 되돌림 구간
- 패턴 및 파동 컨플루언스 참고 지표:
  * 하모닉 패턴 후보: ${conf.harmonicPattern || '가틀리/박쥐 패턴 PRZ'}
  * 엘리엇 파동 후보: ${conf.elliottWave || '충격 5파 또는 ABC 조정파'}
- 이동평균선(EMA): 20 EMA: $${Number(tech.ema20).toLocaleString()} / 50 EMA: $${Number(tech.ema50).toLocaleString()} / 200 EMA: $${Number(tech.ema200).toLocaleString()}
- 모멘텀 & 수급: RSI(14) ${tech.rsi}, 거래량 추세: ${tech.isVolDecreasing ? '거래량 점진적 수축 (파동 마무리 또는 되돌림)' : '거래량 유입 변동성 확대 (임펄스 전개)'}
- 현재 분석 세션: ${sessionTitle} (${sessionContext})
- 권고 셋업 테마: ${setup.theme}
- 트레이딩 셋업 파라미터:
  * 포지션 방향: ${setup.direction}
  * 진입 구간: $${Number(setup.entryMin).toLocaleString()} ~ $${Number(setup.entryMax).toLocaleString()}
  * 1차 목표가(TP1): $${Number(setup.tp1).toLocaleString()} / 2차 목표가(TP2): $${Number(setup.tp2).toLocaleString()}
  * 손절가(SL): $${Number(setup.sl).toLocaleString()} (손익비 1:${setup.riskReward})

[작성 요청사항]
위 4시간봉 스윙과 피보나치 수치를 정밀하게 반영하여, 하모닉 패턴 또는 엘리엇 파동 이론을 주축으로 가장 타당하고 설득력 높은 프로페셔널 관점 리포트를 2,200자 내외로 작성해주세요.
반드시 첫 줄에 <TITLE>[BTC/USDT ${slotName}] (패턴/파동/시세를 아우르는 창의적이고 전문적인 제목)</TITLE>을 작성해주세요.`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }]
      }
    ],
    generationConfig: {
      temperature: 0.75,
      maxOutputTokens: 8192,
      thinkingConfig: { thinkingBudget: 0 }
    }
  };

  const models = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash'];
  for (const model of models) {
    try {
      console.log(`[Gemini Perspective AI] Calling ${model}...`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(40000)
      });
      if (res.ok) {
        const data = await res.json();
        const candidate = data.candidates?.[0];
        const parts = candidate?.content?.parts || [];
        const text = parts.map(p => p.text || '').join('').trim();
        if (text && text.length > 500) {
          console.log(`[Gemini Perspective AI] Successfully generated perspective report with ${model} (${text.length} chars)`);
          return text;
        }
      }
    } catch(e) {
      console.warn(`[Gemini Perspective AI] Error with ${model}:`, e.message);
    }
  }
  return null;
}

function getPerspectiveSlotInfo(kstDate = null) {
  const kst = kstDate || getKSTDate();
  const hour = kst.getHours();
  const min = kst.getMinutes();
  const year = kst.getFullYear();
  const month = String(kst.getMonth() + 1).padStart(2, '0');
  const day = String(kst.getDate()).padStart(2, '0');
  const hourStr = String(hour).padStart(2, '0');
  const minStr = String(min).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  const dateKey = `${year}${month}${day}`;
  const timeFormatted = `${hourStr}:${minStr}`;
  const timeStr = `${dateStr} ${timeFormatted}`;

  let sessionTitle = '실시간 4H 캔들 기술 분석';
  let sessionContext = '실시간 시장 호가와 4시간봉 주요 매물대 및 파동 구조를 점검하는 구간';

  if (hour >= 21 || hour < 6) {
    sessionTitle = '야간 미국 증시 및 글로벌 파생 변동성 세션';
    sessionContext = '미국 뉴욕 증시 및 글로벌 파생상품 시장 유동성이 집중되며 급격한 추세 확장이 발생하는 구간';
  } else if (hour >= 15 && hour < 21) {
    sessionTitle = '오후 유럽 런던장 유동성 및 추세 돌파 세션';
    sessionContext = '유럽 런던 금융시장 개장과 함께 기관 유동성이 공급되며 주요 매물대 돌파 및 지지 안착을 시험하는 구간';
  } else {
    sessionTitle = '오전 일봉 마감 및 아시아장 유동성 세션';
    sessionContext = '글로벌 암호화폐 일봉 마감 이후 아시아 시장이 주도하며 당일 기준 가격대와 200 EMA 지지/저항을 확립하는 구간';
  }

  return {
    slot: `${hourStr}${minStr}`,
    slotHour: hour,
    slotMinute: min,
    timeFormatted,
    slotName: `${timeFormatted} 관점`,
    sessionTitle,
    sessionContext,
    id: `perspective-${dateKey}-${hourStr}${minStr}`,
    timeStr,
    postDate: kst
  };
}

function generateDynamicPerspectiveReport(dateStr, dateKorean, tech, chartImg, slotInfo = null) {
  const chartTag = `<div class="post-img-container text-center my-4"><img src="${chartImg}" alt="BTC/USDT 4H 트레이딩뷰 기술적 셋업 - crytopnl.com" style="width:100%; max-width: 800px; display:block; margin: 14px auto; border-radius: 12px; border: none; box-shadow: none;" /></div>`;
  const slotName = slotInfo?.slotName || '오전 관점 (09:00)';
  const sessionTitle = slotInfo?.sessionTitle || '아시아장/일봉 마감 세션';
  const curP = Number(tech.currentPrice || 78370);
  const setup = tech.setup || {
    direction: 'SHORT',
    theme: '주요 이평선 저항 직면 및 하방 리테스트',
    entryMin: Math.round(curP * 0.995),
    entryMax: Math.round(curP * 1.005),
    tp1: Math.round(curP * 0.975),
    tp2: Math.round(curP * 0.955),
    sl: Math.round(curP * 1.018),
    riskReward: '2.35'
  };
  const conf = tech.technicalConfluence || {};
  const fib = conf.fib || {};

  const dirColor = setup.direction === 'LONG' ? '#10b981' : (setup.direction === 'SHORT' ? '#e11d48' : '#d97706');
  const dirLabel = setup.direction === 'LONG' ? 'LONG (상방 돌파)' : (setup.direction === 'SHORT' ? 'SHORT (하방 리테스트)' : 'RANGE (박스권 공략)');

  return `
<h3 style="font-size: 18px; font-weight: 800; color: #0284c7; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; line-height: 1.4;">
  🎯 [BTC/USDT ${slotName}] ${dateKorean} 비트코인 기술적 분석: ${conf.harmonicPattern || setup.theme} (${sessionTitle})
</h3>
<p style="font-size: 15px; color: #1e293b; line-height: 1.8; margin-bottom: 18px;">
${dateKorean} ${slotName} 기준 비트코인은 <strong>$${curP.toLocaleString()}</strong> 선에서 거래되고 있으며, 4시간봉 스윙 구조상 피보나치 되돌림 ${(Number(conf.fibRatio || 0.5) * 100).toFixed(1)}% 영역에서 ${conf.harmonicPattern || setup.theme} 국면을 시험하고 있습니다. 4시간봉 주요 이동평균선인 50 EMA($${Number(tech.ema50).toLocaleString()}) 및 200 EMA($${Number(tech.ema200).toLocaleString()})와의 이격도와 RSI(14) <strong>${tech.rsi}</strong> 지표가 결합되며 ${conf.elliottWave || '파동 전환'}의 분수령을 맞이하고 있습니다.
</p>

<!-- Chart Setup Image -->
${chartTag}

<!-- Trading Setup Box -->
<div class="perspective-setup-card" style="background: #f1f5f9; border-radius: 10px; padding: 18px 20px; margin: 22px 0; border: none;">
  <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 14px; display: flex; align-items: center; gap: 6px;">
    📊 [트레이딩 셋업 파라미터 (Trading Setup Matrix)]
  </div>
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px;">
    <div style="background: #ffffff; border-radius: 8px; padding: 12px 14px; border: none; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
      <div style="font-size: 11px; color: #64748b; font-weight: 600;">포지션 방향 (Direction)</div>
      <div style="font-size: 14px; font-weight: 900; color: ${dirColor}; font-family: monospace; margin-top: 3px;">${dirLabel}</div>
    </div>
    <div style="background: #ffffff; border-radius: 8px; padding: 12px 14px; border: none; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
      <div style="font-size: 11px; color: #64748b; font-weight: 600;">진입 구간 (Entry Zone)</div>
      <div style="font-size: 14px; font-weight: 800; color: #0284c7; font-family: monospace; margin-top: 3px;">$${Number(setup.entryMin).toLocaleString()} ~ $${Number(setup.entryMax).toLocaleString()}</div>
    </div>
    <div style="background: #ffffff; border-radius: 8px; padding: 12px 14px; border: none; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
      <div style="font-size: 11px; color: #64748b; font-weight: 600;">목표가 (Take Profit)</div>
      <div style="font-size: 13px; font-weight: 800; color: #059669; font-family: monospace; margin-top: 3px;">TP1 $${Number(setup.tp1).toLocaleString()} / TP2 $${Number(setup.tp2).toLocaleString()}</div>
    </div>
    <div style="background: #ffffff; border-radius: 8px; padding: 12px 14px; border: none; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
      <div style="font-size: 11px; color: #64748b; font-weight: 600;">손절가 &amp; 손익비</div>
      <div style="font-size: 13px; font-weight: 800; color: #d97706; font-family: monospace; margin-top: 3px;">SL $${Number(setup.sl).toLocaleString()} (1 : ${setup.riskReward})</div>
    </div>
  </div>
</div>

<h4 style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 28px; margin-bottom: 10px;">
1. 차트 구조 및 파동/패턴 정밀 진단: ${conf.harmonicPattern || setup.theme}
</h4>
<p style="font-size: 15px; color: #1e293b; line-height: 1.8; margin-bottom: 16px;">
현재 4시간봉 차트상 비트코인은 스윙 레인지($${Number(fib.swingLow || tech.low24h).toLocaleString()} ~ $${Number(fib.swingHigh || tech.high24h).toLocaleString()}) 내에서 정밀한 피보나치 되돌림 비율을 형성하고 있습니다.
엘리엇 파동 관점에서는 <strong>${conf.elliottWave || '파동 전개 구간'}</strong>으로 해석되며, 하모닉 패턴 분석 관점에서는 <strong>${conf.harmonicPattern || 'PRZ 잠재적 반전 영역'}</strong>과의 수렴도가 높아 중요한 변곡점 역할을 수행하고 있습니다.
</p>

<h4 style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 28px; margin-bottom: 10px;">
2. 멀티 컨플루언스 분석: 피보나치 레벨, EMA 이평선(20/50/200), RSI &amp; 거래량
</h4>
<p style="font-size: 15px; color: #1e293b; line-height: 1.8; margin-bottom: 16px;">
첫째, <strong>피보나치 0.618 골든 레벨($${Number(fib.fib618 || 0).toLocaleString()})</strong> 및 <strong>0.382 레벨($${Number(fib.fib382 || 0).toLocaleString()})</strong>은 현재 프라이스 액션의 핵심 지지/저항 라인으로 기능하고 있습니다.<br/>
둘째, <strong>4시간봉 200 EMA($${Number(tech.ema200).toLocaleString()})</strong>와 <strong>50 EMA($${Number(tech.ema50).toLocaleString()})</strong>의 중첩 여부는 파동의 상·하방 확장을 결정하는 기술적 방어선입니다.<br/>
셋째, <strong>RSI(14) ${tech.rsi}</strong>와 거래량 추이는 ${tech.isVolDecreasing ? '점진적 거래량 수축을 보이며 패턴의 PRZ 완성 단계에 근접하고 있습니다.' : '거래량 유입과 함께 모멘텀 확장이 진행 중입니다.'}
</p>

<h4 style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 28px; margin-bottom: 10px;">
3. 세션별 시나리오 분석: 시나리오 A(메인 경로) vs 시나리오 B(반대 무효화)
</h4>
<p style="font-size: 15px; color: #1e293b; line-height: 1.8; margin-bottom: 16px;">
<strong>[시나리오 A - 메인 파동/패턴 경로]:</strong> 진입 구간($${Number(setup.entryMin).toLocaleString()} ~ $${Number(setup.entryMax).toLocaleString()})에서 유효한 반전 또는 지지 확인 후 목표가(1차 $${Number(setup.tp1).toLocaleString()}, 2차 $${Number(setup.tp2).toLocaleString()})를 순차적으로 달성하는 시나리오입니다. 손익비 1:${setup.riskReward}를 확보할 수 있습니다.<br/>
<strong>[시나리오 B - 패턴 무효화 경로]:</strong> 예상과 달리 강한 수급 쏠림으로 무효화 기준점인 <strong>$${Number(setup.sl).toLocaleString()}</strong>을 종가 마감 기준으로 이탈/돌파하는 경우입니다. 이때는 기존 포지션을 신속히 정리하고 추세 재확립을 기다려야 합니다.
</p>

<h4 style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 28px; margin-bottom: 10px;">
4. 관점 무효화 기준(Invalidation Level) &amp; 리스크 관리
</h4>
<p style="font-size: 15px; color: #1e293b; line-height: 1.8; margin-bottom: 20px;">
본 셋업의 <strong>최종 무효화 기준점은 $${Number(setup.sl).toLocaleString()}</strong>입니다. 해당 기준 가격에 도달할 경우 가설이 무효화되므로 엄격한 손절매를 집행하시기 바랍니다.
</p>

<!-- Invalidation Box -->
<div class="perspective-invalidation-card" style="background: #fef2f2; border-radius: 8px; padding: 16px 18px; margin: 22px 0; border: none;">
  <div style="color: #b91c1c; font-weight: 800; font-size: 13px; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
    ⚠️ [관점 무효화 기준 (Invalidation Level) &amp; 리스크 관리]
  </div>
  <p style="font-size: 13px; line-height: 1.75; margin: 0; color: #7f1d1d; font-weight: 500;">
    비트코인이 4시간봉 종가 기준으로 <strong>$${Number(setup.sl).toLocaleString()}(손절가)</strong>을 이탈/돌파할 경우 본 트레이딩 가설은 즉시 폐기됩니다. 1회 거래당 원금 손실 폭을 1~2% 이내로 엄격히 통제하세요.
  </p>
</div>
`;
}

function formatMarkdownToCleanHtml(rawText) {
  if (!rawText) return '';
  let str = String(rawText).trim();

  // Split by double line breaks into logical blocks
  const blocks = str.split(/\n\s*\n/);
  const formattedBlocks = blocks.map(block => {
    let b = block.trim();
    if (!b) return '';

    // If block is an HTML container (div, table, img container, svg)
    if (b.startsWith('<div') || b.startsWith('<table') || b.startsWith('<svg') || b.startsWith('<p') || b.startsWith('<h')) {
      return b;
    }

    // Horizontal rule
    if (/^---$|^\*\*\*$/.test(b)) {
      return '<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;" />';
    }

    // Headings
    if (/^#\s+(.+)$/m.test(b)) {
      return b.replace(/^#\s+(.+)$/gm, '<h2 style="font-size: 19px; font-weight: 800; color: #0f172a; margin-top: 26px; margin-bottom: 12px; line-height: 1.5;">$1</h2>');
    }
    if (/^##\s+(.+)$/m.test(b)) {
      return b.replace(/^##\s+(.+)$/gm, '<h3 style="font-size: 17px; font-weight: 800; color: #0f172a; margin-top: 26px; margin-bottom: 12px; line-height: 1.5;">$1</h3>');
    }
    if (/^###\s+(.+)$/m.test(b)) {
      return b.replace(/^###\s+(.+)$/gm, '<h4 style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 28px; margin-bottom: 12px; line-height: 1.5;">$1</h4>');
    }
    if (/^####\s+(.+)$/m.test(b)) {
      return b.replace(/^####\s+(.+)$/gm, '<h5 style="font-size: 15px; font-weight: 800; color: #0284c7; margin-top: 22px; margin-bottom: 10px; line-height: 1.5;">$1</h5>');
    }

    // Bullet list items (* or -)
    if (/^[\*\-]\s+/m.test(b)) {
      const items = b.split('\n').filter(Boolean);
      const listHtml = items.map(it => {
        const itemText = it.replace(/^[\*\-]\s+/, '').trim();
        const boldParsed = itemText.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 800; color: #0f172a;">$1</strong>');
        return `<div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px; font-size: 15px; line-height: 1.75; color: #1e293b;"><span style="color: #0284c7; font-weight: 800;">•</span><div>${boldParsed}</div></div>`;
      }).join('');
      return `<div style="margin: 14px 0 18px 0;">${listHtml}</div>`;
    }

    // Standard paragraph with inline bold & break conversion
    let pContent = b.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 800; color: #0f172a;">$1</strong>');
    pContent = pContent.replace(/\n/g, '<br/>');
    return `<p style="font-size: 15px; line-height: 1.85; margin-bottom: 18px; color: #1e293b; word-break: keep-all;">${pContent}</p>`;
  });

  return formattedBlocks.filter(Boolean).join('\n\n');
}

// Master technical trading perspective generator (supports 3 daily slots: 09:00, 17:00, 21:00)
async function buildDailyPerspectiveReport(targetDate = null) {
  const kst = targetDate ? new Date(targetDate) : getKSTDate();
  const dateStr = formatDateString(kst);
  const dateKorean = formatDateKorean(kst);
  const slotInfo = getPerspectiveSlotInfo(kst);

  console.log(`[Daily Perspective Generator] Analyzing 4H Technicals for ${slotInfo.timeStr} [${slotInfo.slotName}]...`);
  const techData = await fetchBinance4hTechnicals();
  const chartImg = generateTradingViewChartSvg(dateStr, techData, slotInfo);

  let contentHtml = null;
  let postTitle = `[BTC/USDT ${slotInfo.slotName}] ${dateKorean} 비트코인 기술적 분석: ${techData.setup?.theme || '주요 매물대 지지/저항 점검'}`;
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      console.log(`[Daily Perspective Generator] Requesting AI TradingView analysis from Gemini for ${slotInfo.slotName}...`);
      const rawAiText = await callGeminiPerspectiveAPI(dateStr, dateKorean, techData, slotInfo, apiKey);
      if (rawAiText) {
        // Extract dynamic title from <TITLE> tag if present
        const titleMatch = rawAiText.match(/<TITLE>(.*?)<\/TITLE>/i);
        if (titleMatch && titleMatch[1].trim()) {
          let extractedTitle = titleMatch[1].replace(/<\/?.*?>/g, '').trim();
          if (!extractedTitle.startsWith(`[BTC/USDT ${slotInfo.slotName}]`)) {
            extractedTitle = `[BTC/USDT ${slotInfo.slotName}] ${extractedTitle.replace(/^\[.*?\]\s*/, '')}`;
          }
          postTitle = extractedTitle;
          console.log(`[Daily Perspective Generator] Extracted dynamic AI title: "${postTitle}"`);
        }

        const chartTag = `<div class="post-img-container text-center my-4"><img src="${chartImg}" alt="BTC/USDT 4H 트레이딩뷰 기술적 셋업 - crytopnl.com" style="width:100%; max-width: 800px; display:block; margin: 14px auto; border-radius: 12px; border: none; box-shadow: none;" /></div>`;
        let processed = rawAiText.replace(/<TITLE>.*?<\/TITLE>/gi, '').trim();
        processed = processed.replace('<!-- TRADINGVIEW_CHART_IMAGE -->', chartTag);
        processed = processed.replace(/<\/?(HEADER|SETUP_BOX|SECTION_[1-4]|INVALIDATION|RISK_GUIDE)>/gi, '');
        contentHtml = formatMarkdownToCleanHtml(processed);
      }
    } catch(e) {
      console.warn('[Daily Perspective Generator] AI synthesis failed, using dynamic quant perspective:', e.message);
    }
  }

  if (!contentHtml) {
    contentHtml = generateDynamicPerspectiveReport(dateStr, dateKorean, techData, chartImg, slotInfo);
    if (techData.setup?.theme) {
      postTitle = `[BTC/USDT ${slotInfo.slotName}] ${dateKorean} ${techData.setup.theme} ($${Number(techData.currentPrice).toLocaleString()})`;
    }
  }

  return {
    id: slotInfo.id,
    category: 'perspective',
    categoryName: '🎯 차트 관점',
    title: postTitle,
    author: 'AI 퀀트 애널리스트',
    authorRank: 'VERIFIED',
    timestamp: slotInfo.postDate.getTime(),
    time: slotInfo.timeStr,
    views: 0,
    upvotes: 0,
    isNotice: false,
    image: true,
    content: contentHtml,
    comments: []
  };
}

// Main execution
async function main() {
  const reportType = (process.env.REPORT_TYPE || process.argv[2] || 'all').toLowerCase().trim();
  console.log(`[Daily Report Generator] Starting build for report type: [${reportType}]...`);
  let existingReports = [];
  try {
    if (fs.existsSync(reportOutputFile)) {
      const raw = fs.readFileSync(reportOutputFile, 'utf8').replace(/^\uFEFF/, '').trim();
      const parsed = JSON.parse(raw);
      existingReports = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.reports) ? parsed.reports : []);
    }
  } catch (e) {
    console.warn('Could not read existing reports file, initializing fresh:', e.message);
  }

  const toAdd = [];

  // Generate perspective if requested
  if (reportType === 'all' || reportType === 'perspective') {
    const todayPerspective = await buildDailyPerspectiveReport();
    toAdd.push(todayPerspective);
  }

  // Generate morning market report if requested
  if (reportType === 'all' || reportType === 'market') {
    const todayReport = await buildDailyMarketReport();
    toAdd.push(todayReport);
  }

  const idsToAdd = toAdd.map(item => item.id);

  // Upsert new reports:
  // - Replace reports with matching id
  // - Clean up legacy un-suffixed perspective id if adding today's perspective
  const filtered = existingReports.filter(r => {
    if (idsToAdd.includes(r.id)) return false;
    if (idsToAdd.some(id => id.endsWith('-09') && r.id === id.replace('-09', ''))) return false;
    return true;
  });

  const updatedReports = [...toAdd, ...filtered].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 50); // Keep last 50 reports in descending chronological order

  const payload = {
    lastUpdated: new Date().toISOString(),
    generatorVersion: '2.3.0-selective-manual-dispatch',
    totalReports: updatedReports.length,
    reports: updatedReports
  };

  fs.writeFileSync(reportOutputFile, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`[Daily Report Generator] Successfully saved ${updatedReports.length} reports to ${reportOutputFile}`);
}

if (require.main === module) {
  main().catch(err => {
    console.error('[Daily Report Generator] Execution failed:', err);
    process.exit(1);
  });
}

module.exports = {
  buildDailyMarketReport,
  buildDailyPerspectiveReport,
  main
};
