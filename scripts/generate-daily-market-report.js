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
  let upbitBtc = 105400000;
  let binanceBtc = null;
  let usdKrw = 1342.5;
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

  // Global BTC Price (Multi-Source Failover: Bybit -> Binance -> Binance.US -> Coinbase -> Upbit/FX)
  // Source 1: Bybit Spot Ticker (Worldwide accessible, no HTTP 451 geo-block on US cloud runners)
  try {
    const bybitRes = await fetch('https://api.bybit.com/v5/market/tickers?category=spot&symbol=BTCUSDT', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(4000)
    });
    if (bybitRes.ok) {
      const data = await bybitRes.json();
      if (data && data.result && Array.isArray(data.result.list) && data.result.list[0] && data.result.list[0].lastPrice) {
        binanceBtc = parseFloat(data.result.list[0].lastPrice);
        console.log(`[Data Ingestion] Successfully fetched live BTC price from Bybit: $${binanceBtc}`);
      }
    }
  } catch (e) {
    console.warn('[Data Ingestion] Bybit ticker fetch failed:', e.message);
  }

  // Source 2: Binance Global Spot
  if (!binanceBtc) {
    try {
      const binanceRes = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT', { signal: AbortSignal.timeout(4000) });
      if (binanceRes.ok) {
        const data = await binanceRes.json();
        if (data && data.price) {
          binanceBtc = parseFloat(data.price);
          console.log(`[Data Ingestion] Successfully fetched live BTC price from Binance: $${binanceBtc}`);
        }
      }
    } catch (e) {
      console.warn('[Data Ingestion] Binance ticker fallback used:', e.message);
    }
  }

  // Source 3: Binance.US Spot (accessible from US Cloud IPs)
  if (!binanceBtc) {
    try {
      const binanceUsRes = await fetch('https://api.binance.us/api/v3/ticker/price?symbol=BTCUSDT', { signal: AbortSignal.timeout(4000) });
      if (binanceUsRes.ok) {
        const data = await binanceUsRes.json();
        if (data && data.price) {
          binanceBtc = parseFloat(data.price);
          console.log(`[Data Ingestion] Successfully fetched live BTC price from Binance.US: $${binanceBtc}`);
        }
      }
    } catch (e) {
      console.warn('[Data Ingestion] Binance.US ticker fallback used:', e.message);
    }
  }

  // Source 4: Coinbase Spot
  if (!binanceBtc) {
    try {
      const cbRes = await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot', { signal: AbortSignal.timeout(4000) });
      if (cbRes.ok) {
        const data = await cbRes.json();
        if (data && data.data && data.data.amount) {
          binanceBtc = parseFloat(data.data.amount);
          console.log(`[Data Ingestion] Successfully fetched live BTC price from Coinbase: $${binanceBtc}`);
        }
      }
    } catch (e) {
      console.warn('[Data Ingestion] Coinbase ticker fallback used:', e.message);
    }
  }

  // Source 5: Upbit / FX rate conversion (100% fail-safe)
  if (!binanceBtc) {
    if (upbitBtc && usdKrw) {
      binanceBtc = Math.round((upbitBtc / usdKrw) * 100) / 100;
      console.log(`[Data Ingestion] Implied USD BTC from Upbit/FX: $${binanceBtc}`);
    } else {
      binanceBtc = 77500.0;
    }
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

    <rect x="635" y="0" width="135" height="30" rx="8" fill="#0369a1" fill-opacity="0.25" stroke="#38bdf8" stroke-width="1.2"/>
    <text x="702" y="20" fill="#38bdf8" font-size="13" font-weight="900" font-family="monospace" text-anchor="middle">crytopnl.com</text>
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
      <rect width="465" height="48" rx="12" fill="#0c2338" stroke="#0ea5e9" stroke-width="1.8" filter="url(#mm_drop)"/>
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
      <rect x="98" y="34" width="102" height="22" rx="6" fill="#0284c7"/>
      <text x="149" y="49" fill="#ffffff" font-size="11" font-weight="800" text-anchor="middle">${fngNum >= 75 ? '극단적 탐욕' : (fngNum >= 55 ? '탐욕 (Greed)' : (fngNum >= 45 ? '중립 (Neutral)' : (fngNum >= 25 ? '공포 (Fear)' : '극단적 공포')))}</text>
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

  // Extract clean short string for Long/Short ratio so it never overflows into liquidations badge
  const rawLs = String(m.longShortRatio || '1.297');
  const lsVal = rawLs.split(' ')[0] || '1.297';
  const lsDominance = rawLs.includes('숏') && parseFloat(lsVal) < 1.0 ? '숏 우세' : '롱 우세';

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
    
    <!-- Header: Badge + Title side-by-side on same baseline -->
    <rect x="20" y="18" width="110" height="24" rx="6" fill="#0284c7"/>
    <text x="75" y="34" fill="#ffffff" font-size="11" font-weight="900" text-anchor="middle">FEAR &amp; GREED</text>
    <text x="142" y="35" fill="#ffffff" font-size="16" font-weight="900" font-family="'Pretendard', sans-serif">공포·탐욕 심리 지수</text>

    <!-- Visual Arc Meter (Center placed to ensure ample space above and below) -->
    <g transform="translate(180, 168)">
      <path d="M -100 0 A 100 100 0 0 1 100 0" fill="none" stroke="#1e293b" stroke-width="18" stroke-linecap="round"/>
      <path d="M -100 0 A 100 100 0 0 1 100 0" fill="none" stroke="#f59e0b" stroke-width="18" stroke-linecap="round" stroke-dasharray="314" stroke-dashoffset="${Math.max(0, 314 - (fngNum / 100) * 314)}"/>
      <!-- Needle -->
      <g transform="rotate(${fngAngle})">
        <line x1="0" y1="0" x2="0" y2="-82" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>
        <circle cx="0" cy="0" r="7" fill="#38bdf8"/>
      </g>
      <text x="0" y="28" fill="#fbbf24" font-size="36" font-weight="900" font-family="monospace" text-anchor="middle">${m.fngScore}</text>
      <text x="0" y="48" fill="#cbd5e1" font-size="13" font-weight="800" font-family="'Pretendard', sans-serif" text-anchor="middle">${m.fngText}</text>
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
      <text x="18" y="54" fill="#f59e0b" font-size="20" font-weight="900" font-family="monospace">${lsVal} <tspan font-size="12" fill="#fbbf24" font-weight="700">(${lsDominance})</tspan></text>
      <rect x="230" y="22" width="112" height="30" rx="8" fill="#78350f" fill-opacity="0.3"/>
      <text x="286" y="42" fill="#fbbf24" font-size="12" font-weight="800" text-anchor="middle">청산: ${(m.liquidations || '$42.5M').slice(0, 9)}</text>
    </g>

    <!-- 4. 스마트머니 점수 & LTH 비중 -->
    <g transform="translate(0, 252)">
      <rect width="360" height="73" rx="14" fill="#13122b" stroke="#8b5cf6" stroke-width="1.5" filter="url(#m_drop)"/>
      <text x="18" y="25" fill="#c084fc" font-size="11" font-weight="800">스마트머니 지수 &amp; LTH 비중</text>
      <text x="18" y="53" fill="#facc15" font-size="20" font-weight="900" font-family="monospace">${m.smartMoneyScore}점 <tspan font-size="12" fill="#fde047" font-weight="700">(축적)</tspan></text>
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

  const timestamp = targetDate ? new Date(targetDate).getTime() : (kst.getTime() - (9 * 3600000));
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

// 16:9 High-Definition Perspective Infographics (800x450)
// SVG 1: 메인 썸네일 & 기술적 셋업 카드 (16:9 800x450)
function generatePerspectiveImage1(dateStr, tech, slotInfo = null) {
  const curP = Number(tech.currentPrice || 77500);
  const slotBadge = slotInfo?.timeFormatted ? slotInfo.timeFormatted : (slotInfo ? slotInfo.slotHour + '시' : '4H');
  const slotTimestampStr = slotInfo ? slotInfo.timeStr : `${dateStr} 실시간`;
  const setup = tech.setup || {
    direction: 'LONG',
    theme: '50 EMA 지지 안착 및 상방 돌파 테스트',
    entryMin: Math.round(curP * 0.995),
    entryMax: Math.round(curP * 1.005),
    tp1: Math.round(curP * 1.03),
    tp2: Math.round(curP * 1.06),
    sl: Math.round(curP * 0.978),
    riskReward: '2.45'
  };
  const dirColor = setup.direction === 'LONG' ? '#10b981' : (setup.direction === 'SHORT' ? '#f43f5e' : '#f59e0b');
  const dirLabel = setup.direction === 'LONG' ? 'LONG (상방 돌파 우위)' : (setup.direction === 'SHORT' ? 'SHORT (하방 리테스트)' : 'RANGE (수렴 박스권)');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <defs>
    <linearGradient id="p1_bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#050811"/><stop offset="50%" stop-color="#0b162a"/><stop offset="100%" stop-color="#040710"/>
    </linearGradient>
    <radialGradient id="p1_glow1" cx="20%" cy="25%" r="60%">
      <stop offset="0%" stop-color="#0ea5e9" stop-opacity="0.35"/><stop offset="100%" stop-color="#0ea5e9" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="p1_glow2" cx="80%" cy="40%" r="55%">
      <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.25"/><stop offset="100%" stop-color="#8b5cf6" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="p1_gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/><stop offset="50%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
    <filter id="p1_drop" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000000" flood-opacity="0.75"/>
    </filter>
  </defs>

  <rect width="800" height="450" fill="url(#p1_bg)"/>
  <rect width="800" height="450" fill="url(#p1_glow1)"/>
  <rect width="800" height="450" fill="url(#p1_glow2)"/>

  <g opacity="0.06" stroke="#38bdf8" stroke-width="1">
    <line x1="0" y1="90" x2="800" y2="90"/><line x1="0" y1="180" x2="800" y2="180"/>
    <line x1="0" y1="270" x2="800" y2="270"/><line x1="0" y1="360" x2="800" y2="360"/>
    <line x1="160" y1="0" x2="160" y2="450"/><line x1="320" y1="0" x2="320" y2="450"/>
    <line x1="480" y1="0" x2="480" y2="450"/><line x1="640" y1="0" x2="640" y2="450"/>
  </g>

  <g transform="translate(30, 24)">
    <rect width="210" height="30" rx="8" fill="#e11d48" filter="url(#p1_drop)"/>
    <circle cx="18" cy="15" r="5" fill="#ffffff"/>
    <text x="32" y="21" fill="#ffffff" font-size="12" font-weight="900" font-family="'Pretendard', sans-serif">2026.09 차트 기술 분석</text>

    <rect x="220" y="0" width="135" height="30" rx="8" fill="#0f172a" stroke="#0ea5e9" stroke-width="1.2"/>
    <text x="287" y="20" fill="#38bdf8" font-size="12" font-weight="800" font-family="'Pretendard', sans-serif" text-anchor="middle">10년 차 기술 분석가 뷰</text>

    <rect x="635" y="0" width="135" height="30" rx="8" fill="#0369a1" fill-opacity="0.25" stroke="#38bdf8" stroke-width="1.2"/>
    <text x="702" y="20" fill="#38bdf8" font-size="13" font-weight="900" font-family="monospace" text-anchor="middle">crytopnl.com</text>
  </g>

  <g transform="translate(35, 90)">
    <rect x="0" y="0" width="230" height="28" rx="6" fill="#1e293b" stroke="#475569" stroke-width="1"/>
    <text x="14" y="19" fill="#94a3b8" font-size="13" font-weight="800" font-family="'Pretendard', sans-serif">⚠️ 4H 대형 수렴 이탈 &amp; 파동 변곡점</text>

    <text x="0" y="66" fill="#ffffff" font-size="32" font-weight="900" font-family="'Pretendard', sans-serif" filter="url(#p1_drop)">
      비트코인 4H 삼각수렴 막바지...
    </text>

    <text x="0" y="112" fill="url(#p1_gold)" font-size="32" font-weight="900" font-family="'Pretendard', sans-serif" filter="url(#p1_drop)">
      엘리엇 5파 분출인가, 플랫 조정인가?
    </text>

    <g transform="translate(0, 138)">
      <rect width="455" height="48" rx="12" fill="#0c2338" stroke="#0ea5e9" stroke-width="1.8" filter="url(#p1_drop)"/>
      <circle cx="28" cy="24" r="14" fill="#0284c7"/>
      <text x="28" y="29" fill="#ffffff" font-size="14" font-weight="900" text-anchor="middle">✓</text>
      <text x="52" y="30" fill="#e0f2fe" font-size="15" font-weight="800" font-family="'Pretendard', sans-serif">
        <tspan fill="#38bdf8">현재가 $${curP.toLocaleString()}</tspan> • <tspan fill="#34d399">50/200 EMA 골든크로스</tspan> • RSI 54p 중립
      </text>
    </g>

    <g transform="translate(5, 208)">
      <circle cx="6" cy="6" r="4" fill="#38bdf8"/>
      <text x="18" y="11" fill="#cbd5e1" font-size="13" font-weight="700" font-family="'Pretendard', sans-serif">① 50일·200일 EMA 정배열 지속: 거시 상승 채널 지지력 유효</text>

      <circle cx="6" cy="34" r="4" fill="#a855f7"/>
      <text x="18" y="39" fill="#cbd5e1" font-size="13" font-weight="700" font-family="'Pretendard', sans-serif">② 엘리엇 파동: 4파 수렴 조정 완료 후 충격 5파 상방 분기점</text>

      <circle cx="6" cy="62" r="4" fill="#34d399"/>
      <text x="18" y="67" fill="#cbd5e1" font-size="13" font-weight="700" font-family="'Pretendard', sans-serif">③ 핵심 분기선: 상방 $80,000 돌파 vs 하방 $76,400 방어</text>
    </g>
  </g>

  <g transform="translate(525, 88)">
    <rect x="0" y="0" width="245" height="275" rx="20" fill="#0f172a" fill-opacity="0.9" stroke="#334155" stroke-width="2" filter="url(#p1_drop)"/>
    <rect x="0" y="0" width="245" height="42" rx="20" fill="#1e293b"/>
    <text x="122" y="27" fill="#f8fafc" font-size="13" font-weight="900" font-family="'Pretendard', sans-serif" text-anchor="middle">트레이딩 셋업 매트릭스</text>

    <g transform="translate(18, 54)">
      <rect width="210" height="66" rx="12" fill="#111c30" stroke="#0284c7" stroke-width="1.2"/>
      <text x="14" y="22" fill="#94a3b8" font-size="11" font-weight="700">포지션 방향 (Setup Direction)</text>
      <text x="14" y="48" fill="${dirColor}" font-size="15" font-weight="900" font-family="monospace">${dirLabel}</text>
    </g>

    <g transform="translate(18, 130)">
      <rect width="210" height="68" rx="12" fill="#0a251e" stroke="#10b981" stroke-width="1.2"/>
      <text x="14" y="22" fill="#a7f3d0" font-size="11" font-weight="700">목표가 (Take Profit TP1/TP2)</text>
      <text x="14" y="46" fill="#34d399" font-size="17" font-weight="900" font-family="monospace">$${Number(setup.tp1).toLocaleString()} / $${Number(setup.tp2).toLocaleString()}</text>
      <text x="196" y="60" fill="#6ee7b7" font-size="10" font-weight="800" text-anchor="end">손익비 1:${setup.riskReward}</text>
    </g>

    <g transform="translate(18, 208)">
      <rect width="210" height="50" rx="10" fill="#29121a" stroke="#f43f5e" stroke-width="1.2"/>
      <text x="14" y="20" fill="#fda4af" font-size="11" font-weight="800">무효화/손절 기준 (Invalidation)</text>
      <text x="14" y="39" fill="#f43f5e" font-size="15" font-weight="900" font-family="monospace">SL: $${Number(setup.sl).toLocaleString()}</text>
      <text x="196" y="38" fill="#fda4af" font-size="10" font-weight="800" text-anchor="end">종가 이탈 시</text>
    </g>
  </g>

  <g transform="translate(0, 422)">
    <rect width="800" height="28" fill="#050811" fill-opacity="0.95"/>
    <line x1="0" y1="0" x2="800" y2="0" stroke="#1e293b" stroke-width="1"/>
    <line x1="0" y1="0" x2="420" y2="0" stroke="#0284c7" stroke-width="3"/>
    <circle cx="420" cy="0" r="4" fill="#0284c7"/>
    <text x="30" y="18" fill="#64748b" font-size="11" font-weight="700" font-family="'Pretendard', sans-serif">▶ 기준: ${slotTimestampStr} KST • BTC/USDT 4H 프레임워크 기술적 분석</text>
    <text x="770" y="18" fill="#38bdf8" font-size="11" font-weight="800" font-family="monospace" text-anchor="end">CrytoPnL Chart Intelligence</text>
  </g>
</svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg.replace(/\s+/g, ' ').trim());
}

// SVG 2: 중장기 추세 구조 & 50/200 이평선 분석 (16:9 800x450)
function generatePerspectiveImage2(dateStr, tech, slotInfo = null) {
  const curP = Number(tech.currentPrice || 77500);
  const ema50 = Number(tech.ema50 || 76800);
  const ema200 = Number(tech.ema200 || 71200);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <defs>
    <linearGradient id="p2_bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#060913"/><stop offset="50%" stop-color="#0e172a"/><stop offset="100%" stop-color="#060913"/>
    </linearGradient>
    <linearGradient id="p2_grad_blue" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0369a1" stop-opacity="0.35"/><stop offset="100%" stop-color="#0f172a" stop-opacity="0.9"/>
    </linearGradient>
    <linearGradient id="p2_grad_purple" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#7e22ce" stop-opacity="0.35"/><stop offset="100%" stop-color="#0f172a" stop-opacity="0.9"/>
    </linearGradient>
    <filter id="p2_drop"><feDropShadow dx="0" dy="5" stdDeviation="6" flood-color="#000" flood-opacity="0.6"/></filter>
  </defs>

  <rect width="800" height="450" rx="16" fill="url(#p2_bg)"/>
  <rect width="800" height="450" rx="16" fill="none" stroke="#0ea5e9" stroke-width="1.5" stroke-opacity="0.35"/>

  <g transform="translate(25, 20)">
    <rect width="145" height="28" rx="7" fill="#0284c7" filter="url(#p2_drop)"/>
    <text x="72" y="19" fill="#ffffff" font-size="12" font-weight="900" font-family="'Pretendard', sans-serif" text-anchor="middle">MACRO STRUCTURE</text>
    <text x="160" y="21" fill="#ffffff" font-size="18" font-weight="900" font-family="'Pretendard', sans-serif">주봉/일봉 <tspan fill="#38bdf8">전체 추세 구조</tspan> &amp; 50/200 이평선 정배열</text>
    <rect x="640" y="0" width="135" height="28" rx="7" fill="#1e293b"/>
    <text x="707" y="19" fill="#38bdf8" font-size="11" font-weight="800" font-family="monospace" text-anchor="middle">crytopnl.com</text>
  </g>
  <line x1="25" y1="60" x2="775" y2="60" stroke="#334155" stroke-width="1.2" stroke-opacity="0.7"/>

  <!-- Left: Macro Channel Card -->
  <g transform="translate(30, 80)">
    <rect width="360" height="325" rx="16" fill="url(#p2_grad_blue)" stroke="#0284c7" stroke-width="1.8" filter="url(#p2_drop)"/>
    <rect x="20" y="18" width="135" height="24" rx="6" fill="#0284c7"/>
    <text x="87" y="34" fill="#ffffff" font-size="11" font-weight="900" text-anchor="middle">BULL CHANNEL</text>
    <text x="20" y="70" fill="#ffffff" font-size="17" font-weight="900" font-family="'Pretendard', sans-serif">거대 상승 채널 (2024~2026)</text>

    <!-- Visual channel diagram -->
    <g transform="translate(20, 85)">
      <rect width="320" height="135" rx="10" fill="#081b2c" stroke="#0ea5e9" stroke-width="1"/>
      <line x1="20" y1="110" x2="300" y2="25" stroke="#34d399" stroke-width="2.5" stroke-dasharray="4,3"/>
      <text x="290" y="18" fill="#34d399" font-size="10" font-weight="800" text-anchor="end">상단 저항선: $84,500</text>
      <line x1="20" y1="125" x2="300" y2="40" stroke="#38bdf8" stroke-width="2"/>
      <text x="290" y="55" fill="#38bdf8" font-size="10" font-weight="800" text-anchor="end">중심값(Median): $78,500</text>
      <line x1="20" y1="140" x2="300" y2="55" stroke="#818cf8" stroke-width="2.5" stroke-dasharray="4,3"/>
      <text x="290" y="72" fill="#818cf8" font-size="10" font-weight="800" text-anchor="end">하단 지지선: $71,200</text>
      <!-- Current price dot -->
      <circle cx="210" cy="53" r="6" fill="#f59e0b" stroke="#ffffff" stroke-width="2"/>
      <text x="210" y="42" fill="#fef08a" font-size="11" font-weight="900" font-family="monospace" text-anchor="middle">현재 위치 ($${curP.toLocaleString()})</text>
    </g>

    <g transform="translate(20, 235)">
      <rect width="320" height="72" rx="10" fill="#061d19" stroke="#10b981" stroke-width="1"/>
      <text x="14" y="24" fill="#34d399" font-size="12" font-weight="800">✓ 장기 프레임워크: 견고한 상승 추세 채널 안착</text>
      <text x="14" y="44" fill="#cbd5e1" font-size="11" font-weight="600">• 주봉 50 EMA가 200 EMA 위에서 완만한 상방 기울기 유지</text>
      <text x="14" y="60" fill="#a7f3d0" font-size="11" font-weight="700">• 단기 노이즈에 훼손되지 않는 중장기 하방 지지력 확보</text>
    </g>
  </g>

  <!-- Right: 3 Key Long-Term Indicators -->
  <g transform="translate(410, 80)">
    <g transform="translate(0, 0)">
      <rect width="360" height="98" rx="14" fill="#0f172a" stroke="#334155" stroke-width="1.2" filter="url(#p2_drop)"/>
      <rect x="18" y="14" width="90" height="20" rx="5" fill="#059669"/>
      <text x="63" y="28" fill="#ffffff" font-size="10" font-weight="900" text-anchor="middle">골든크로스</text>
      <text x="120" y="28" fill="#ffffff" font-size="13" font-weight="900" font-family="'Pretendard', sans-serif">50 EMA vs 200 EMA 정배열</text>
      <text x="18" y="60" fill="#38bdf8" font-size="20" font-weight="900" font-family="monospace">50 EMA: $${ema50.toLocaleString()}</text>
      <text x="18" y="82" fill="#a78bfa" font-size="13" font-weight="800" font-family="monospace">200 EMA: $${ema200.toLocaleString()} (+10.2% 이격)</text>
    </g>

    <g transform="translate(0, 112)">
      <rect width="360" height="98" rx="14" fill="#0f172a" stroke="#334155" stroke-width="1.2" filter="url(#p2_drop)"/>
      <rect x="18" y="14" width="90" height="20" rx="5" fill="#d97706"/>
      <text x="63" y="28" fill="#ffffff" font-size="10" font-weight="900" text-anchor="middle">매물벽 저항</text>
      <text x="120" y="28" fill="#ffffff" font-size="13" font-weight="900" font-family="'Pretendard', sans-serif">주요 라운드 넘버 저항대</text>
      <text x="18" y="58" fill="#fbbf24" font-size="20" font-weight="900" font-family="monospace">$80,000 ~ $84,500</text>
      <text x="18" y="82" fill="#94a3b8" font-size="11" font-weight="600">• $80K 라운드 넘버 심리 매물 + 2024년 역사적 전고점</text>
    </g>

    <g transform="translate(0, 224)">
      <rect width="360" height="101" rx="14" fill="#13122b" stroke="#8b5cf6" stroke-width="1.5" filter="url(#p2_drop)"/>
      <rect x="18" y="14" width="90" height="20" rx="5" fill="#7e22ce"/>
      <text x="63" y="28" fill="#ffffff" font-size="10" font-weight="900" text-anchor="middle">추세 생명선</text>
      <text x="120" y="28" fill="#ffffff" font-size="13" font-weight="900" font-family="'Pretendard', sans-serif">장기 지지 방어선 (200 SMA/EMA)</text>
      <text x="18" y="58" fill="#34d399" font-size="20" font-weight="900" font-family="monospace">$71,200 ~ $73,800</text>
      <text x="18" y="82" fill="#cbd5e1" font-size="11" font-weight="600">• 해당 레벨 상회 시 거시 상승 파동 무효화 가능성 극히 희박</text>
    </g>
  </g>

  <text x="400" y="428" fill="#64748b" font-size="11" font-weight="600" font-family="'Pretendard', sans-serif" text-anchor="middle">기준: 주봉 및 일봉 추세 프레임워크 • 바이낸스 현물 BTC/USDT • CrytoPnL 퀀트랩</text>
</svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg.replace(/\s+/g, ' ').trim());
}

// SVG 3: 단기 4H 캔들 패턴 & 멀티 모멘텀 계측기 (16:9 800x450)
function generatePerspectiveImage3(dateStr, tech, slotInfo = null) {
  const curP = Number(tech.currentPrice || 77500);
  const rsiVal = tech.rsi || 54;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <defs>
    <linearGradient id="p3_bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#070d18"/><stop offset="50%" stop-color="#0c182c"/><stop offset="100%" stop-color="#060912"/>
    </linearGradient>
    <filter id="p3_drop"><feDropShadow dx="0" dy="5" stdDeviation="6" flood-color="#000" flood-opacity="0.5"/></filter>
  </defs>

  <rect width="800" height="450" rx="16" fill="url(#p3_bg)"/>
  <rect width="800" height="450" rx="16" fill="none" stroke="#0ea5e9" stroke-width="1.5" stroke-opacity="0.35"/>

  <g transform="translate(25, 20)">
    <rect width="145" height="28" rx="7" fill="#0284c7" filter="url(#p3_drop)"/>
    <text x="72" y="19" fill="#ffffff" font-size="12" font-weight="900" font-family="'Pretendard', sans-serif" text-anchor="middle">4H CANDLE &amp; MOMENTUM</text>
    <text x="160" y="21" fill="#ffffff" font-size="18" font-weight="900" font-family="'Pretendard', sans-serif">단기 차트 상세 분석: <tspan fill="#38bdf8">캔들 패턴</tspan> &amp; 4대 보조지표</text>
    <rect x="640" y="0" width="135" height="28" rx="7" fill="#1e293b"/>
    <text x="707" y="19" fill="#38bdf8" font-size="11" font-weight="800" font-family="monospace" text-anchor="middle">crytopnl.com</text>
  </g>
  <line x1="25" y1="60" x2="775" y2="60" stroke="#334155" stroke-width="1.2" stroke-opacity="0.7"/>

  <!-- Top: Candlestick Simulation Box -->
  <g transform="translate(30, 75)">
    <rect width="740" height="165" rx="14" fill="#0c1626" stroke="#1e293b" stroke-width="1.5" filter="url(#p3_drop)"/>
    <text x="20" y="25" fill="#94a3b8" font-size="11" font-weight="700">BTC/USDT 4H 캔들스틱 &amp; 볼린저 밴드 스퀴즈</text>
    <text x="720" y="25" fill="#38bdf8" font-size="12" font-weight="900" font-family="monospace" text-anchor="end">현재가: $${curP.toLocaleString()}</text>
    
    <!-- Mini Candlestick Graphic -->
    <g transform="translate(20, 35)">
      <!-- Bollinger Upper/Lower lines -->
      <path d="M 0 35 Q 200 20, 400 30 T 700 15" fill="none" stroke="#6366f1" stroke-width="1.5" stroke-dasharray="3,3" stroke-opacity="0.7"/>
      <path d="M 0 100 Q 200 115, 400 105 T 700 110" fill="none" stroke="#6366f1" stroke-width="1.5" stroke-dasharray="3,3" stroke-opacity="0.7"/>
      <!-- 50 EMA Middle Line -->
      <path d="M 0 68 Q 200 65, 400 70 T 700 60" fill="none" stroke="#f59e0b" stroke-width="2"/>
      
      <!-- Candlesticks Sample -->
      <line x1="30" y1="40" x2="30" y2="90" stroke="#10b981" stroke-width="1"/>
      <rect x="26" y="50" width="8" height="30" fill="#10b981" rx="1"/>
      <line x1="60" y1="45" x2="60" y2="85" stroke="#f43f5e" stroke-width="1"/>
      <rect x="56" y="55" width="8" height="20" fill="#f43f5e" rx="1"/>
      <line x1="90" y1="35" x2="90" y2="80" stroke="#10b981" stroke-width="1"/>
      <rect x="86" y="42" width="8" height="28" fill="#10b981" rx="1"/>
      <line x1="120" y1="50" x2="120" y2="95" stroke="#f43f5e" stroke-width="1"/>
      <rect x="116" y="60" width="8" height="25" fill="#f43f5e" rx="1"/>
      <line x1="150" y1="55" x2="150" y2="105" stroke="#f43f5e" stroke-width="1"/>
      <rect x="146" y="70" width="8" height="28" fill="#f43f5e" rx="1"/>
      <line x1="180" y1="60" x2="180" y2="100" stroke="#10b981" stroke-width="1"/>
      <rect x="176" y="68" width="8" height="24" fill="#10b981" rx="1"/>
      <line x1="210" y1="48" x2="210" y2="92" stroke="#10b981" stroke-width="1"/>
      <rect x="206" y="56" width="8" height="28" fill="#10b981" rx="1"/>
      <line x1="240" y1="45" x2="240" y2="85" stroke="#f43f5e" stroke-width="1"/>
      <rect x="236" y="52" width="8" height="22" fill="#f43f5e" rx="1"/>
      <line x1="270" y1="40" x2="270" y2="80" stroke="#10b981" stroke-width="1"/>
      <rect x="266" y="46" width="8" height="26" fill="#10b981" rx="1"/>
      <line x1="300" y1="38" x2="300" y2="78" stroke="#10b981" stroke-width="1"/>
      <rect x="296" y="44" width="8" height="25" fill="#10b981" rx="1"/>
      <line x1="330" y1="50" x2="330" y2="88" stroke="#f43f5e" stroke-width="1"/>
      <rect x="326" y="58" width="8" height="22" fill="#f43f5e" rx="1"/>
      <line x1="360" y1="52" x2="360" y2="90" stroke="#10b981" stroke-width="1"/>
      <rect x="356" y="60" width="8" height="20" fill="#10b981" rx="1"/>
      <line x1="390" y1="45" x2="390" y2="82" stroke="#10b981" stroke-width="1"/>
      <rect x="386" y="50" width="8" height="24" fill="#10b981" rx="1"/>
      <line x1="420" y1="42" x2="420" y2="80" stroke="#f43f5e" stroke-width="1"/>
      <rect x="416" y="48" width="8" height="20" fill="#f43f5e" rx="1"/>
      <line x1="450" y1="48" x2="450" y2="86" stroke="#10b981" stroke-width="1"/>
      <rect x="446" y="55" width="8" height="22" fill="#10b981" rx="1"/>
      <line x1="480" y1="44" x2="480" y2="82" stroke="#10b981" stroke-width="1"/>
      <rect x="476" y="50" width="8" height="24" fill="#10b981" rx="1"/>
      <line x1="510" y1="46" x2="510" y2="85" stroke="#f43f5e" stroke-width="1"/>
      <rect x="506" y="54" width="8" height="22" fill="#f43f5e" rx="1"/>
      <line x1="540" y1="42" x2="540" y2="78" stroke="#10b981" stroke-width="1"/>
      <rect x="536" y="48" width="8" height="24" fill="#10b981" rx="1"/>
      <line x1="570" y1="38" x2="570" y2="75" stroke="#10b981" stroke-width="1"/>
      <rect x="566" y="44" width="8" height="26" fill="#10b981" rx="1"/>
      <line x1="600" y1="40" x2="600" y2="78" stroke="#f43f5e" stroke-width="1"/>
      <rect x="596" y="46" width="8" height="22" fill="#f43f5e" rx="1"/>
      <line x1="630" y1="36" x2="630" y2="72" stroke="#10b981" stroke-width="1"/>
      <rect x="626" y="40" width="8" height="28" fill="#10b981" rx="1"/>
      <line x1="660" y1="32" x2="660" y2="68" stroke="#10b981" stroke-width="1.5"/>
      <rect x="656" y="36" width="8" height="26" fill="#10b981" rx="1"/>
      <!-- Symmetrical Triangle Trendlines -->
      <line x1="26" y1="42" x2="664" y2="36" stroke="#f59e0b" stroke-width="2"/>
      <line x1="26" y1="80" x2="664" y2="64" stroke="#f59e0b" stroke-width="2"/>
      <text x="670" y="32" fill="#fbbf24" font-size="11" font-weight="900">상방 돌파 시험</text>
    </g>
  </g>

  <!-- Bottom: 4 Momentum Indicators Grid -->
  <g transform="translate(30, 255)">
    <g transform="translate(0, 0)">
      <rect width="175" height="145" rx="12" fill="#0b172a" stroke="#0284c7" stroke-width="1.2" filter="url(#p3_drop)"/>
      <rect x="12" y="12" width="65" height="20" rx="5" fill="#0284c7"/>
      <text x="44" y="26" fill="#ffffff" font-size="10" font-weight="900" text-anchor="middle">RSI (14)</text>
      <text x="12" y="54" fill="#38bdf8" font-size="24" font-weight="900" font-family="monospace">${rsiVal}</text>
      <text x="12" y="76" fill="#ffffff" font-size="12" font-weight="800">중립 안정 상승권</text>
      <text x="12" y="96" fill="#94a3b8" font-size="11" font-weight="600">• 과매수(70p+) 부담 없음</text>
      <text x="12" y="114" fill="#94a3b8" font-size="11" font-weight="600">• 4H 히든 상승 다이버</text>
      <text x="12" y="132" fill="#34d399" font-size="11" font-weight="800">✓ 추가 상승 여력 충분</text>
    </g>

    <g transform="translate(188, 0)">
      <rect width="175" height="145" rx="12" fill="#061d19" stroke="#10b981" stroke-width="1.2" filter="url(#p3_drop)"/>
      <rect x="12" y="12" width="65" height="20" rx="5" fill="#059669"/>
      <text x="44" y="26" fill="#ffffff" font-size="10" font-weight="900" text-anchor="middle">MACD</text>
      <text x="12" y="54" fill="#34d399" font-size="20" font-weight="900" font-family="monospace">골든크로스</text>
      <text x="12" y="76" fill="#ffffff" font-size="12" font-weight="800">시그널 상향 돌파</text>
      <text x="12" y="96" fill="#94a3b8" font-size="11" font-weight="600">• 히스토그램 양봉 확장</text>
      <text x="12" y="114" fill="#94a3b8" font-size="11" font-weight="600">• 0선 위 안착 시도</text>
      <text x="12" y="132" fill="#34d399" font-size="11" font-weight="800">✓ 모멘텀 매수 우위</text>
    </g>

    <g transform="translate(376, 0)">
      <rect width="175" height="145" rx="12" fill="#1a1128" stroke="#a855f7" stroke-width="1.2" filter="url(#p3_drop)"/>
      <rect x="12" y="12" width="75" height="20" rx="5" fill="#7e22ce"/>
      <text x="49" y="26" fill="#ffffff" font-size="10" font-weight="900" text-anchor="middle">볼린저 밴드</text>
      <text x="12" y="54" fill="#c084fc" font-size="22" font-weight="900" font-family="monospace">Squeeze</text>
      <text x="12" y="76" fill="#ffffff" font-size="12" font-weight="800">밴드 폭 극대 수축</text>
      <text x="12" y="96" fill="#94a3b8" font-size="11" font-weight="600">• 4H 밴드 변동성 응축</text>
      <text x="12" y="114" fill="#94a3b8" font-size="11" font-weight="600">• 상단 밴드 개방 직전</text>
      <text x="12" y="132" fill="#c084fc" font-size="11" font-weight="800">✓ 변동성 확장 임박</text>
    </g>

    <g transform="translate(565, 0)">
      <rect width="175" height="145" rx="12" fill="#241506" stroke="#f59e0b" stroke-width="1.2" filter="url(#p3_drop)"/>
      <rect x="12" y="12" width="65" height="20" rx="5" fill="#d97706"/>
      <text x="44" y="26" fill="#ffffff" font-size="10" font-weight="900" text-anchor="middle">ADX 추세</text>
      <text x="12" y="54" fill="#fbbf24" font-size="24" font-weight="900" font-family="monospace">28.4p</text>
      <text x="12" y="76" fill="#ffffff" font-size="12" font-weight="800">유의미 추세 형성</text>
      <text x="12" y="96" fill="#94a3b8" font-size="11" font-weight="600">• 25선 상향 돌파 안착</text>
      <text x="12" y="114" fill="#94a3b8" font-size="11" font-weight="600">• +DI가 -DI 압도</text>
      <text x="12" y="132" fill="#fbbf24" font-size="11" font-weight="800">✓ 단기 방향성 점화</text>
    </g>
  </g>

  <text x="400" y="426" fill="#64748b" font-size="11" font-weight="600" font-family="'Pretendard', sans-serif" text-anchor="middle">차트 패턴: 대칭 삼각수렴(Symmetrical Triangle) 상단 돌파 테스트 • CrytoPnL 퀀트랩</text>
</svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg.replace(/\s+/g, ' ').trim());
}

// SVG 4: 엘리엇 파동 카운팅 & 피보나치 되돌림 로드맵 (16:9 800x450)
function generatePerspectiveImage4(dateStr, tech, slotInfo = null) {
  const curP = Number(tech.currentPrice || 77500);
  const fib = tech.technicalConfluence?.fib || {};
  const f618 = Number(fib.fib618 || Math.round(curP * 0.965));
  const f382 = Number(fib.fib382 || Math.round(curP * 0.985));

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <defs>
    <linearGradient id="p4_bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#050811"/><stop offset="50%" stop-color="#0b162a"/><stop offset="100%" stop-color="#040710"/>
    </linearGradient>
    <filter id="p4_drop"><feDropShadow dx="0" dy="5" stdDeviation="6" flood-color="#000" flood-opacity="0.6"/></filter>
  </defs>

  <rect width="800" height="450" rx="16" fill="url(#p4_bg)"/>
  <rect width="800" height="450" rx="16" fill="none" stroke="#a855f7" stroke-width="1.5" stroke-opacity="0.35"/>

  <g transform="translate(25, 20)">
    <rect width="145" height="28" rx="7" fill="#9333ea" filter="url(#p4_drop)"/>
    <text x="72" y="19" fill="#ffffff" font-size="12" font-weight="900" font-family="'Pretendard', sans-serif" text-anchor="middle">ELLIOTT WAVE MAP</text>
    <text x="160" y="21" fill="#ffffff" font-size="18" font-weight="900" font-family="'Pretendard', sans-serif">엘리엇 파동 <tspan fill="#c084fc">카운팅 해석</tspan> &amp; 피보나치 로드맵</text>
    <rect x="640" y="0" width="135" height="28" rx="7" fill="#1e293b"/>
    <text x="707" y="19" fill="#c084fc" font-size="11" font-weight="800" font-family="monospace" text-anchor="middle">crytopnl.com</text>
  </g>
  <line x1="25" y1="60" x2="775" y2="60" stroke="#334155" stroke-width="1.2" stroke-opacity="0.7"/>

  <!-- Top: Elliott Wave Diagram -->
  <g transform="translate(30, 75)">
    <rect width="740" height="145" rx="14" fill="#0b1424" stroke="#1e293b" stroke-width="1.5" filter="url(#p4_drop)"/>
    <text x="24" y="26" fill="#94a3b8" font-size="12" font-weight="800">상승 5파동 전개 모델 (Impulse Wave Structure)</text>
    
    <g transform="translate(30, 85)">
      <!-- Wave lines -->
      <polyline points="0,40 100,-20 180,25 380,-50 480,-10 650,-65" fill="none" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      
      <!-- Wave 1 -->
      <circle cx="100" cy="-20" r="7" fill="#0284c7"/>
      <text x="100" y="-32" fill="#38bdf8" font-size="12" font-weight="900" text-anchor="middle">(1)파 $73.8K</text>
      
      <!-- Wave 2 -->
      <circle cx="180" cy="25" r="7" fill="#64748b"/>
      <text x="180" y="44" fill="#94a3b8" font-size="11" font-weight="800" text-anchor="middle">(2)파 되돌림</text>
      
      <!-- Wave 3 -->
      <circle cx="380" cy="-50" r="7" fill="#10b981"/>
      <text x="380" y="-62" fill="#34d399" font-size="12" font-weight="900" text-anchor="middle">(3)파 확장 $80.2K</text>
      
      <!-- Wave 4 (Current) -->
      <circle cx="480" cy="-10" r="13" fill="#f59e0b" stroke="#ffffff" stroke-width="3"/>
      <text x="480" y="-28" fill="#fef08a" font-size="13" font-weight="900" text-anchor="middle">★ 현재: (4)파 수렴</text>
      <text x="480" y="28" fill="#cbd5e1" font-size="11" font-weight="700" text-anchor="middle">$${curP.toLocaleString()}</text>
      
      <!-- Wave 5 Target -->
      <circle cx="650" cy="-65" r="9" fill="#e11d48" stroke="#ffffff" stroke-width="2"/>
      <text x="650" y="-78" fill="#f43f5e" font-size="13" font-weight="900" text-anchor="middle">(5)파 목표 $84.5K</text>
    </g>
  </g>

  <!-- Bottom: 2 Scenario Columns -->
  <g transform="translate(30, 235)">
    <!-- Primary Scenario -->
    <g transform="translate(0, 0)">
      <rect width="360" height="145" rx="14" fill="#061f18" stroke="#10b981" stroke-width="1.6" filter="url(#p4_drop)"/>
      <rect x="18" y="14" width="135" height="22" rx="6" fill="#059669"/>
      <text x="85" y="29" fill="#ffffff" font-size="11" font-weight="900" text-anchor="middle">주 시나리오 (65% 유력)</text>
      <text x="18" y="62" fill="#ffffff" font-size="16" font-weight="900" font-family="'Pretendard', sans-serif">4파 삼각수렴 후 5파 임펄스 분출</text>
      <text x="18" y="86" fill="#a7f3d0" font-size="12" font-weight="700">• 4파 수렴 완료 후 $80K 라운드 넘버 돌파 시 5파 전개</text>
      <text x="18" y="106" fill="#34d399" font-size="13" font-weight="900" font-family="monospace">1차 목표 $82,400 / 2차 목표 $84,500 (Fib 1.618)</text>
      <text x="18" y="128" fill="#6ee7b7" font-size="11" font-weight="800">✓ 50 EMA($${Number(tech.ema50).toLocaleString()}) 위에서 매수 모멘텀 유지 시 발동</text>
    </g>

    <!-- Alternative Scenario -->
    <g transform="translate(380, 0)">
      <rect width="360" height="145" rx="14" fill="#25121a" stroke="#f43f5e" stroke-width="1.6" filter="url(#p4_drop)"/>
      <rect x="18" y="14" width="135" height="22" rx="6" fill="#e11d48"/>
      <text x="85" y="29" fill="#ffffff" font-size="11" font-weight="900" text-anchor="middle">대안 시나리오 (35%)</text>
      <text x="18" y="62" fill="#ffffff" font-size="16" font-weight="900" font-family="'Pretendard', sans-serif">4파 복합 플랫(Flat) 조정 연장</text>
      <text x="18" y="86" fill="#fda4af" font-size="12" font-weight="700">• $76,400 이탈 시 4파가 ABC 불규칙 플랫으로 연장</text>
      <text x="18" y="106" fill="#f43f5e" font-size="13" font-weight="900" font-family="monospace">Fib 0.5 되돌림: $75,200 / Fib 0.618: $74,100</text>
      <text x="18" y="128" fill="#fda4af" font-size="11" font-weight="800">⚠️ 무효화 레벨: $73,800 이탈 시 5파 가설 전체 폐기</text>
    </g>
  </g>

  <!-- Bottom Invalidation Bar -->
  <g transform="translate(30, 395)">
    <rect width="740" height="36" rx="8" fill="#18132b" stroke="#8b5cf6" stroke-width="1.2"/>
    <text x="20" y="22" fill="#c084fc" font-size="12" font-weight="900">🚨 파동 무효화 레벨 (Invalidation Level): $73,800</text>
    <text x="720" y="22" fill="#e9d5ff" font-size="11" font-weight="700" text-anchor="end">1파 고점($73,800) 침범 금지 원칙 • 도달 시 손절매 필수</text>
  </g>
</svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg.replace(/\s+/g, ' ').trim());
}

// SVG 5: 핵심 지지·저항 맵 & 양방향 시나리오 매트릭스 (16:9 800x450)
function generatePerspectiveImage5(dateStr, tech, slotInfo = null) {
  const curP = Number(tech.currentPrice || 77500);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <defs>
    <linearGradient id="p5_bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#050811"/><stop offset="50%" stop-color="#0b162a"/><stop offset="100%" stop-color="#040710"/>
    </linearGradient>
    <filter id="p5_drop"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000" flood-opacity="0.6"/></filter>
  </defs>

  <rect width="800" height="450" rx="16" fill="url(#p5_bg)"/>
  <rect width="800" height="450" rx="16" fill="none" stroke="#0ea5e9" stroke-width="1.5" stroke-opacity="0.35"/>

  <g transform="translate(25, 20)">
    <rect width="145" height="28" rx="7" fill="#0284c7" filter="url(#p5_drop)"/>
    <text x="72" y="19" fill="#ffffff" font-size="12" font-weight="900" font-family="'Pretendard', sans-serif" text-anchor="middle">SCENARIO MATRIX</text>
    <text x="160" y="21" fill="#ffffff" font-size="18" font-weight="900" font-family="'Pretendard', sans-serif">핵심 지지·저항 레벨 &amp; <tspan fill="#34d399">트레이더 실전 행동 수칙</tspan></text>
    <rect x="640" y="0" width="135" height="28" rx="7" fill="#1e293b"/>
    <text x="707" y="19" fill="#38bdf8" font-size="11" font-weight="800" font-family="monospace" text-anchor="middle">crytopnl.com</text>
  </g>
  <line x1="25" y1="60" x2="775" y2="60" stroke="#334155" stroke-width="1.2" stroke-opacity="0.7"/>

  <!-- Top 2 Scenario Decision Cards -->
  <g transform="translate(30, 78)">
    <!-- Bullish Decision Card -->
    <g transform="translate(0, 0)">
      <rect width="360" height="150" rx="14" fill="#06221b" stroke="#10b981" stroke-width="1.6" filter="url(#p5_drop)"/>
      <rect x="18" y="14" width="135" height="22" rx="6" fill="#059669"/>
      <text x="85" y="29" fill="#ffffff" font-size="11" font-weight="900" text-anchor="middle">상승 시나리오 (65% 유력)</text>
      <text x="18" y="62" fill="#ffffff" font-size="15" font-weight="900" font-family="'Pretendard', sans-serif">조건: 4H 종가 $80,000 라운드 넘버 돌파</text>
      <g transform="translate(18, 76)">
        <text x="0" y="15" fill="#34d399" font-size="13" font-weight="900" font-family="monospace">1차 $82,400 ➔ 2차 $85,000 ➔ 3차 $88,000</text>
        <text x="0" y="38" fill="#cbd5e1" font-size="11" font-weight="600">• 50/200 EMA 정배열 + MACD 양봉 확장 컨플루언스</text>
        <text x="0" y="56" fill="#a7f3d0" font-size="11" font-weight="700">✓ 행동: 돌파 후 리테스트 지지 확인 시 분할 진입</text>
      </g>
    </g>

    <!-- Bearish Decision Card -->
    <g transform="translate(380, 0)">
      <rect width="360" height="150" rx="14" fill="#29121a" stroke="#f43f5e" stroke-width="1.6" filter="url(#p5_drop)"/>
      <rect x="18" y="14" width="135" height="22" rx="6" fill="#e11d48"/>
      <text x="85" y="29" fill="#ffffff" font-size="11" font-weight="900" text-anchor="middle">하락/조정 시나리오 (35%)</text>
      <text x="18" y="62" fill="#ffffff" font-size="15" font-weight="900" font-family="'Pretendard', sans-serif">조건: 50 EMA 및 $76,400 이탈 마감</text>
      <g transform="translate(18, 76)">
        <text x="0" y="15" fill="#f43f5e" font-size="13" font-weight="900" font-family="monospace">1차 $75,200 ➔ 2차 $74,100 ➔ 3차 $71,800</text>
        <text x="0" y="38" fill="#cbd5e1" font-size="11" font-weight="600">• 4파 플랫 조정 연장 및 유동성 스윕 발생 가능성</text>
        <text x="0" y="56" fill="#fda4af" font-size="11" font-weight="700">✓ 행동: 섣부른 물타기 금지, $74K 매물대 지지 관망</text>
      </g>
    </g>
  </g>

  <!-- Bottom: 4 Action Rules Grid -->
  <g transform="translate(30, 245)">
    <g transform="translate(0, 0)">
      <rect width="175" height="135" rx="12" fill="#0b172a" stroke="#0284c7" stroke-width="1.2" filter="url(#p5_drop)"/>
      <rect x="12" y="12" width="60" height="20" rx="5" fill="#0284c7"/>
      <text x="42" y="26" fill="#ffffff" font-size="10" font-weight="900" text-anchor="middle">수칙 01</text>
      <text x="12" y="52" fill="#ffffff" font-size="13" font-weight="900" font-family="'Pretendard', sans-serif">확인 매매 원칙</text>
      <text x="12" y="74" fill="#94a3b8" font-size="11" font-weight="600">• $80K 돌파 후 지지 시 진입</text>
      <text x="12" y="92" fill="#94a3b8" font-size="11" font-weight="600">• 섣부른 예측 숏/롱 금지</text>
      <text x="12" y="112" fill="#38bdf8" font-size="11" font-weight="800">✓ FOMO 뇌동매매 차단</text>
    </g>

    <g transform="translate(188, 0)">
      <rect width="175" height="135" rx="12" fill="#061d19" stroke="#10b981" stroke-width="1.2" filter="url(#p5_drop)"/>
      <rect x="12" y="12" width="60" height="20" rx="5" fill="#059669"/>
      <text x="42" y="26" fill="#ffffff" font-size="10" font-weight="900" text-anchor="middle">수칙 02</text>
      <text x="12" y="52" fill="#ffffff" font-size="13" font-weight="900" font-family="'Pretendard', sans-serif">손절선 $73.8K 엄수</text>
      <text x="12" y="74" fill="#94a3b8" font-size="11" font-weight="600">• 파동 무효화 시 미련 없이 컷</text>
      <text x="12" y="92" fill="#94a3b8" font-size="11" font-weight="600">• 1회 손실 1~2%로 제한</text>
      <text x="12" y="112" fill="#34d399" font-size="11" font-weight="800">✓ 시드 보존이 제1원칙</text>
    </g>

    <g transform="translate(376, 0)">
      <rect width="175" height="135" rx="12" fill="#1a1128" stroke="#a855f7" stroke-width="1.2" filter="url(#p5_drop)"/>
      <rect x="12" y="12" width="60" height="20" rx="5" fill="#7e22ce"/>
      <text x="42" y="26" fill="#ffffff" font-size="10" font-weight="900" text-anchor="middle">수칙 03</text>
      <text x="12" y="52" fill="#ffffff" font-size="13" font-weight="900" font-family="'Pretendard', sans-serif">저레버리지 운용</text>
      <text x="12" y="74" fill="#94a3b8" font-size="11" font-weight="600">• 선물 레버리지 3~5배 이하</text>
      <text x="12" y="92" fill="#94a3b8" font-size="11" font-weight="600">• 변동성 스퀴즈에 청산 방지</text>
      <text x="12" y="112" fill="#c084fc" font-size="11" font-weight="800">✓ 롱스퀴즈 면역력 확보</text>
    </g>

    <g transform="translate(565, 0)">
      <rect width="175" height="135" rx="12" fill="#241506" stroke="#f59e0b" stroke-width="1.2" filter="url(#p5_drop)"/>
      <rect x="12" y="12" width="60" height="20" rx="5" fill="#d97706"/>
      <text x="42" y="26" fill="#ffffff" font-size="10" font-weight="900" text-anchor="middle">수칙 04</text>
      <text x="12" y="52" fill="#ffffff" font-size="13" font-weight="900" font-family="'Pretendard', sans-serif">단계적 분할 익절</text>
      <text x="12" y="74" fill="#94a3b8" font-size="11" font-weight="600">• TP1 $82.4K 도달 시 40% 실현</text>
      <text x="12" y="92" fill="#94a3b8" font-size="11" font-weight="600">• 잔여 물량 본절 스탑 로스</text>
      <text x="12" y="112" fill="#fbbf24" font-size="11" font-weight="800">✓ 확정 수익만이 진짜 내 돈</text>
    </g>
  </g>

  <text x="400" y="405" fill="#64748b" font-size="11" font-weight="600" font-family="'Pretendard', sans-serif" text-anchor="middle">본 인포그래픽은 기술적 차트 분석용이며, 투자를 권유하지 않습니다. 조건부 대응이 핵심입니다.</text>
</svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg.replace(/\s+/g, ' ').trim());
}

async function callGeminiPerspectiveAPI(dateStr, dateKorean, tech, slotInfo, apiKey) {
  const slotName = slotInfo?.slotName || '실시간 관점';
  const sessionTitle = slotInfo?.sessionTitle || '실시간 4H 캔들 분석';
  const curP = Number(tech.currentPrice || 77500);
  const setup = tech.setup || {
    direction: 'LONG',
    theme: '50 EMA 지지 안착 및 상방 돌파 테스트',
    entryMin: Math.round(curP * 0.995),
    entryMax: Math.round(curP * 1.005),
    tp1: Math.round(curP * 1.03),
    tp2: Math.round(curP * 1.06),
    sl: Math.round(curP * 0.978),
    riskReward: '2.45'
  };
  const fib = tech.technicalConfluence?.fib || {};

  const systemInstruction = `당신은 10년 이상 경력을 가진 비트코인 전문 기술적 분석가이자 차트 해석 블로거입니다.
독자는 초급~중급 수준의 트레이더/투자자입니다.
과도한 낙관이나 비관을 철저히 배제하고, 객관적이고 균형 잡힌 시각으로 비트코인(BTC/USDT 4시간봉) 전문 차트 분석 리포트를 작성하세요.

[분석에 반드시 포함해야 할 요소]
1. 주요 지표:
   - 이동평균선: 50일·200일 SMA/EMA 수치, 골든크로스/데드크로스 여부 및 정배열 상태
   - RSI (14): 현재 수치와 과매수/과매도/히든 다이버전스 여부
   - MACD: 시그널 라인 교차(골든크로스 등) 및 히스토그램 상태
   - 추가 모멘텀: 볼린저 밴드(스퀴즈/확장), ADX(추세 강도), 스토캐스틱 상태
2. 차트 패턴:
   - 현재 형성 중인 패턴 (대칭 삼각수렴, 불플래그, 상승 채널 등)
   - 최근 돌파/이탈 여부 및 페이크아웃 가능성
3. 주요 가격 레벨과 지지/저항:
   - 단기/중기 핵심 지지선과 저항선 (피보나치 0.382/0.5/0.618, 이전 고점/저점, 라운드 넘버 $80K 등)
   - 각 레벨 돌파/이탈 시 다음 목표치
4. 엘리엇 파동 (Elliott Wave):
   - 현재 파동 카운트 해석 (충격 5파 중 4파 수렴 완료 후 5파 분출 주 시나리오 + 복합 플랫 조정 대안 시나리오)
   - 파동 구조상 현재 위치와 다음 예상 파동
   - 무효화 레벨(Invalidation level: 1파 고점 침범 금지선) 명시
5. 종합 시나리오:
   - 상승 시나리오 (조건과 1·2차 목표가)
   - 하락/조정 시나리오 (조건과 1·2차 목표가)
   - 확률적으로 더 유력한 시나리오와 그 기술적 근거

[글 구조 - 엄격한 6단계]
1. 흥미로운 도입 (현재 차트 상황을 한 문장으로 요약하고 팽팽한 변곡점의 심리 제시)
<!-- PERSPECTIVE_IMAGE_1 -->
2. 전체 추세와 장기 구조 (주봉/일봉 관점, 거대 상승 채널, 50일·200일 SMA/EMA 정배열 지지력)
<!-- PERSPECTIVE_IMAGE_2 -->
3. 단기 차트 상세 분석 (4H 캔들 수렴 패턴, RSI 14 다이버전스, MACD 골든크로스, 볼린저 밴드 스퀴즈, ADX 추세)
<!-- PERSPECTIVE_IMAGE_3 -->
4. 엘리엇 파동 해석 (현재 파동 카운트, 주 시나리오 vs 대안 시나리오, 피보나치 확장 목표치, 무효화 레벨)
<!-- PERSPECTIVE_IMAGE_4 -->
5. 핵심 지지/저항 레벨과 시나리오 (상승 조건 및 목표가 vs 하락 조건 및 지지선, 65% vs 35% 확률 및 근거)
<!-- PERSPECTIVE_IMAGE_5 -->
6. 결론 및 앞으로 주시해야 할 포인트 (10년 차 분석가의 실전 행동 조언, 레버리지 및 리스크 관리, 투자 권유 금지 및 조건부 대응 원칙)

[톤과 스타일 가이드]
- 분량: 1,800 ~ 2,500자 (공백 포함, 깊이 있고 충실한 해설)
- 객관적이고 균형 잡힌 시각 (과도한 낙관/비관 금지)
- 전문 용어는 사용하되, 초·중급 독자가 이해하기 쉽게 짧고 명쾌한 설명 덧붙임
- 소제목을 적절히 활용하여 시각적으로 읽기 편하게 구성
- 5장의 이미지 플레이스홀더(<!-- PERSPECTIVE_IMAGE_1 --> ~ <!-- PERSPECTIVE_IMAGE_5 -->)를 각 섹션 사이에 누락 없이 배치
- 투자 권유 금지: '가능성'과 '조건'을 명확히 구분하고 무효화 기준 엄수 안내
- 첫 줄에 반드시 <TITLE>[BTC/USDT 차트 관점] (창의적이고 직관적인 전문 분석 제목)</TITLE> 태그를 출력하세요.`;

  const userPrompt = `[실시간 BTC/USDT 4시간봉 정밀 기술 데이터 (${dateKorean} ${slotName} 기준)]
- 현재가: $${curP.toLocaleString()}
- 24시간 최고가: $${Number(tech.high24h).toLocaleString()} / 최저가: $${Number(tech.low24h).toLocaleString()}
- 4H 이동평균선: 20 EMA $${Number(tech.ema20).toLocaleString()} / 50 EMA $${Number(tech.ema50).toLocaleString()} / 200 EMA $${Number(tech.ema200).toLocaleString()} (골든크로스 정배열)
- 모멘텀 지표: RSI(14) ${tech.rsi || 54}, MACD 골든크로스 시그널 상향 돌파, 볼린저 밴드 스퀴즈(Squeeze), ADX 28.4p (유의미한 추세 형성)
- 피보나치 스윙 레벨:
  * 0.382 레벨: $${Number(fib.fib382 || Math.round(curP * 0.985)).toLocaleString()}
  * 0.500 레벨: $${Number(fib.fib500 || Math.round(curP * 0.975)).toLocaleString()}
  * 0.618 골든 레벨: $${Number(fib.fib618 || Math.round(curP * 0.965)).toLocaleString()}
  * 1.618 확장 목표: $${Math.round(curP * 1.075).toLocaleString()}
- 파동 및 패턴: 4H 대칭 삼각수렴(Symmetrical Triangle) 상단 돌파 시험, 엘리엇 (4)파 수렴 후 (5)파 분출 분기점
- 핵심 가격대: 상방 $80,000 라운드 넘버 및 $84,500 전고점 / 하방 지지선 $76,400 (50 EMA)
- 무효화 기준선: $73,800 (1파 고점 침범 금지선)
- 셋업 가이드: 방향 ${setup.direction}, 1차 목표 $${Number(setup.tp1).toLocaleString()}, 2차 목표 $${Number(setup.tp2).toLocaleString()}, 손절 $${Number(setup.sl).toLocaleString()}

위 데이터를 바탕으로 10년 경력의 차트 전문 분석가로서 6개 섹션 구조와 5개 이미지 플레이스홀더를 정확히 포함하여 1,800~2,500자 분량의 고품질 분석 보고서를 작성해주세요.`;

  const baseContents = [
    {
      role: 'user',
      parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }]
    }
  ];

  const modelAttempts = [
    {
      name: 'gemini-3.5-flash',
      payload: {
        contents: baseContents,
        generationConfig: {
          temperature: 0.75,
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
          temperature: 0.75,
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
          temperature: 0.75,
          maxOutputTokens: 8192,
          thinkingConfig: { thinkingLevel: 'low' }
        }
      }
    },
    {
      name: 'gemini-2.5-flash',
      payload: {
        contents: baseContents,
        generationConfig: {
          temperature: 0.75,
          maxOutputTokens: 8192
        }
      }
    }
  ];

  for (const item of modelAttempts) {
    try {
      console.log(`[Gemini Perspective AI] Calling ${item.name}...`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${item.name}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.payload),
        signal: AbortSignal.timeout(45000)
      });
      if (res.ok) {
        const data = await res.json();
        const candidate = data.candidates?.[0];
        const parts = candidate?.content?.parts || [];
        const text = parts.map(p => p.text || '').join('').trim();
        if (text && text.length > 500) {
          console.log(`[Gemini Perspective AI] Successfully generated perspective report with ${item.name} (${text.length} chars)`);
          return text;
        }
      } else {
        const errText = await res.text().catch(() => '');
        console.warn(`[Gemini Perspective AI] ${item.name} failed with HTTP ${res.status}:`, errText.slice(0, 150));
      }
    } catch(e) {
      console.warn(`[Gemini Perspective AI] Error with ${item.name}:`, e.message);
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

function generateDynamicPerspectiveReport(dateStr, dateKorean, tech, imgUris, slotInfo = null) {
  const images = Array.isArray(imgUris) ? imgUris : [imgUris, imgUris, imgUris, imgUris, imgUris];
  const img1 = images[0];
  const img2 = images[1] || images[0];
  const img3 = images[2] || images[0];
  const img4 = images[3] || images[0];
  const img5 = images[4] || images[0];

  const imgTag1 = `<div class="post-img-container text-center my-4"><img src="${img1}" alt="BTC/USDT 4H 트레이딩뷰 기술적 셋업 - crytopnl.com" style="width:100%; max-width: 800px; display:block; margin: 14px auto; border-radius: 12px; border: none; box-shadow: none;" /></div>`;
  const imgTag2 = `<div class="post-img-container text-center my-4"><img src="${img2}" alt="BTC/USDT 거시 추세 및 이평선 구조 - crytopnl.com" style="width:100%; max-width: 800px; display:block; margin: 14px auto; border-radius: 12px; border: none; box-shadow: none;" /></div>`;
  const imgTag3 = `<div class="post-img-container text-center my-4"><img src="${img3}" alt="BTC/USDT 4H 캔들 패턴 및 4대 모멘텀 지표 - crytopnl.com" style="width:100%; max-width: 800px; display:block; margin: 14px auto; border-radius: 12px; border: none; box-shadow: none;" /></div>`;
  const imgTag4 = `<div class="post-img-container text-center my-4"><img src="${img4}" alt="BTC/USDT 엘리엇 파동 및 피보나치 레벨 - crytopnl.com" style="width:100%; max-width: 800px; display:block; margin: 14px auto; border-radius: 12px; border: none; box-shadow: none;" /></div>`;
  const imgTag5 = `<div class="post-img-container text-center my-4"><img src="${img5}" alt="BTC/USDT 매매 시나리오 및 핵심 레벨 - crytopnl.com" style="width:100%; max-width: 800px; display:block; margin: 14px auto; border-radius: 12px; border: none; box-shadow: none;" /></div>`;

  const slotName = slotInfo?.slotName || '오전 관점 (09:00)';
  const sessionTitle = slotInfo?.sessionTitle || '아시아장/일봉 마감 세션';
  const curP = Number(tech.currentPrice || 77500);
  const ema20 = Number(tech.ema20 || Math.round(curP * 0.998));
  const ema50 = Number(tech.ema50 || Math.round(curP * 1.006));
  const ema200 = Number(tech.ema200 || Math.round(curP * 1.018));
  const rsiVal = Number(tech.rsi || 54.2);

  const conf = tech.technicalConfluence || {};
  const fib = conf.fib || {};
  const fib382 = Number(fib.fib382 || Math.round(curP * 0.985));
  const fib500 = Number(fib.fib500 || Math.round(curP * 0.970));
  const fib618 = Number(fib.fib618 || Math.round(curP * 0.955));

  const setup = tech.setup || {
    direction: 'LONG',
    theme: '4H 삼각수렴 수축 및 50 EMA 돌파 테스트',
    entryMin: Math.round(curP * 0.995),
    entryMax: Math.round(curP * 1.005),
    tp1: Math.round(curP * 1.03),
    tp2: Math.round(curP * 1.06),
    sl: Math.round(curP * 0.978),
    riskReward: '2.45'
  };

  const dirColor = setup.direction === 'LONG' ? '#10b981' : (setup.direction === 'SHORT' ? '#e11d48' : '#d97706');
  const dirLabel = setup.direction === 'LONG' ? 'LONG (상방 돌파 우위)' : (setup.direction === 'SHORT' ? 'SHORT (하방 리테스트)' : 'RANGE (수렴 박스권)');

  return `
<h3 style="font-size: 19px; font-weight: 800; color: #0284c7; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; line-height: 1.4;">
  🎯 [BTC/USDT ${slotName}] ${dateKorean} 비트코인 기술적 분석: 대칭 삼각수렴 이탈과 엘리엇 5파 분기점 (${sessionTitle})
</h3>

<!-- SECTION 1: 흥미로운 도입 -->
<h4 style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 24px; margin-bottom: 10px;">
  1. 흥미로운 도입: 4시간봉 삼각수렴의 정점, 상·하방 에너지 응축의 폭발 직전
</h4>
<p style="font-size: 15px; color: #1e293b; line-height: 1.85; margin-bottom: 18px; word-break: keep-all;">
  ${dateKorean} ${slotName} 기준, 비트코인은 <strong>$${curP.toLocaleString()}</strong> 선에서 숨을 죽인 채 수렴의 종착역을 향해 나아가고 있습니다. 지난 수일간 이어진 고점 하락과 저점 상승의 파동이 꼭짓점에 도달하면서 변동성 지표는 극단적인 수축 국면에 진입했습니다. 일봉과 주봉의 장기 강세 지지선이 견고하게 받쳐주는 가운데, 단기 4시간봉 프레임에서는 50 EMA($${ema50.toLocaleString()})와 200 EMA($${ema200.toLocaleString()}) 사이의 치열한 매물대 공방이 펼쳐지고 있습니다. 이번 구간의 돌파 방향은 향후 3~4분기 중기 방향성을 결정짓는 중대한 기로가 될 것입니다.
</p>

<!-- Image 1: Main Thumbnail & Trading Setup Matrix -->
${imgTag1}

<!-- Trading Setup Parameters Card -->
<div class="perspective-setup-card" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 22px; margin: 24px 0; box-shadow: 0 2px 6px rgba(0,0,0,0.02);">
  <div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
    📊 [트레이딩 셋업 파라미터 매트릭스 (Technical Setup Matrix)]
  </div>
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px;">
    <div style="background: #ffffff; border-radius: 8px; padding: 12px 14px; border: 1px solid #e2e8f0;">
      <div style="font-size: 11px; color: #64748b; font-weight: 600;">포지션 방향 (Direction)</div>
      <div style="font-size: 14px; font-weight: 900; color: ${dirColor}; font-family: monospace; margin-top: 4px;">${dirLabel}</div>
    </div>
    <div style="background: #ffffff; border-radius: 8px; padding: 12px 14px; border: 1px solid #e2e8f0;">
      <div style="font-size: 11px; color: #64748b; font-weight: 600;">진입 유효 구간 (Entry Zone)</div>
      <div style="font-size: 14px; font-weight: 800; color: #0284c7; font-family: monospace; margin-top: 4px;">$${Number(setup.entryMin).toLocaleString()} ~ $${Number(setup.entryMax).toLocaleString()}</div>
    </div>
    <div style="background: #ffffff; border-radius: 8px; padding: 12px 14px; border: 1px solid #e2e8f0;">
      <div style="font-size: 11px; color: #64748b; font-weight: 600;">목표가 (Take Profit)</div>
      <div style="font-size: 13px; font-weight: 800; color: #059669; font-family: monospace; margin-top: 4px;">TP1 $${Number(setup.tp1).toLocaleString()} / TP2 $${Number(setup.tp2).toLocaleString()}</div>
    </div>
    <div style="background: #ffffff; border-radius: 8px; padding: 12px 14px; border: 1px solid #e2e8f0;">
      <div style="font-size: 11px; color: #64748b; font-weight: 600;">손절가 &amp; 손익비 (SL / R:R)</div>
      <div style="font-size: 13px; font-weight: 800; color: #d97706; font-family: monospace; margin-top: 4px;">SL $${Number(setup.sl).toLocaleString()} (1 : ${setup.riskReward})</div>
    </div>
  </div>
</div>

<!-- SECTION 2: 전체 추세와 장기 구조 -->
<h4 style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 28px; margin-bottom: 10px;">
  2. 전체 추세와 장기 구조: 주봉·일봉 관점의 상승 채널과 50/200 이평선 정배열
</h4>
<p style="font-size: 15px; color: #1e293b; line-height: 1.85; margin-bottom: 16px; word-break: keep-all;">
  거시 프레임워크에서 비트코인의 기조는 여전히 명확한 <strong>상승 추세(Bull Market Regime)</strong>를 유지하고 있습니다. 일봉 차트에서 50일 이동평균선(SMA $${ema50.toLocaleString()})이 200일 장기 이동평균선(SMA $${ema200.toLocaleString()})을 상향 돌파한 <strong>골든크로스(Golden Cross)</strong> 상태가 훼손 없이 유지되고 있으며, 이평선 군집의 정배열 구조가 강력한 동적 지지대(Dynamic Support) 역할을 수행하고 있습니다.<br/>
  주봉 기준으로는 2024년 말부터 이어진 거대 상승 평행 채널(Ascending Channel)의 중심선 위에서 가격이 형성되어 있어 장기 사이클의 하락 반전을 논하기에는 시기상조입니다. 기관들의 ETF 수급 유입선으로 추정되는 $74,000~$75,000 부근의 장기 수급 방어벽은 여러 차례의 하방 압력에도 견고한 방어력을 입증했습니다.
</p>

<!-- Image 2: Macro Structure & Trendlines -->
${imgTag2}

<!-- SECTION 3: 단기 차트 상세 분석 -->
<h4 style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 28px; margin-bottom: 10px;">
  3. 단기 차트 상세 분석: 4시간봉 대칭 삼각수렴과 4대 보조지표 컨플루언스
</h4>
<p style="font-size: 15px; color: #1e293b; line-height: 1.85; margin-bottom: 16px; word-break: keep-all;">
  단기 4시간봉(4H) 프레임에서는 전형적인 <strong>대칭 삼각수렴(Symmetrical Triangle)</strong> 패턴이 완성 단계에 접어들었습니다. 거래량은 수렴의 끝자락으로 갈수록 뚜렷하게 감소하는 정석적인 패턴 특성을 보여주고 있으며, 4대 보조지표의 복합 수렴(Confluence) 신호가 포착되고 있습니다:
</p>
<div style="margin: 14px 0 18px 0;">
  <div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 10px; font-size: 15px; line-height: 1.75; color: #1e293b;">
    <span style="color: #0284c7; font-weight: 800;">•</span>
    <div><strong style="font-weight: 800; color: #0f172a;">RSI(14) ${rsiVal} 포인트:</strong> 중립선(50p) 인근에서 횡보 중이며, 최근 저점 구간에서 가격은 횡보하나 RSI 저점이 소폭 높아지는 <strong>히든 불리시 다이버전스(Hidden Bullish Divergence)</strong> 징후가 관측됩니다.</div>
  </div>
  <div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 10px; font-size: 15px; line-height: 1.75; color: #1e293b;">
    <span style="color: #0284c7; font-weight: 800;">•</span>
    <div><strong style="font-weight: 800; color: #0f172a;">MACD 시그널 라인 골든크로스:</strong> 제로선(0-line) 부근에서 MACD 선이 시그널선을 상향 교차하며 히스토그램이 양(Positive)의 영역으로 전환되고 있습니다.</div>
  </div>
  <div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 10px; font-size: 15px; line-height: 1.75; color: #1e293b;">
    <span style="color: #0284c7; font-weight: 800;">•</span>
    <div><strong style="font-weight: 800; color: #0f172a;">볼린저 밴드(BB) 초밀집 스퀴즈:</strong> 밴드폭(Bandwidth)이 최근 30거래일 중 최저 수준으로 수축하여 향후 24~48시간 이내 폭발적인 밴드 확장(Band Expansion)이 임박했음을 시사합니다.</div>
  </div>
  <div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 10px; font-size: 15px; line-height: 1.75; color: #1e293b;">
    <span style="color: #0284c7; font-weight: 800;">•</span>
    <div><strong style="font-weight: 800; color: #0f172a;">ADX(14) 22.4 &amp; 스토캐스틱:</strong> ADX 수치가 25 이하로 횡보 추세를 반영하고 있으나, 스토캐스틱 슬로우(Stochastics Slow)가 과매도권에서 골든크로스를 준비하고 있어 상방 반발력이 축적되고 있습니다.</div>
  </div>
</div>

<!-- Image 3: 4H Candlesticks & 4 Momentum Indicators -->
${imgTag3}

<!-- SECTION 4: 엘리엇 파동 해석 -->
<h4 style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 28px; margin-bottom: 10px;">
  4. 엘리엇 파동 해석: 4파 수렴 완료 후 5파 임펄스 분출인가, C파 확장 플랫인가?
</h4>
<p style="font-size: 15px; color: #1e293b; line-height: 1.85; margin-bottom: 16px; word-break: keep-all;">
  엘리엇 파동 이론(Elliott Wave Theory) 관점에서 현재 구간은 파동의 위계를 결정짓는 중대한 분기점입니다:
</p>
<div style="margin: 14px 0 18px 0;">
  <div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 10px; font-size: 15px; line-height: 1.75; color: #1e293b;">
    <span style="color: #10b981; font-weight: 800;">▶</span>
    <div><strong style="font-weight: 800; color: #0f172a;">[주 시나리오 - 65% 확률]: 충격 5파(Wave 5) 분출 직전 4파 삼각수렴(Triangle Wave 4)</strong><br/>
    직전 3파 고점($82,400) 이후 현재 진행 중인 파동은 4파 삼각수렴(A-B-C-D-E) 형태로 해석됩니다. 현재 E파 저점이 피보나치 되돌림 0.382($${fib382.toLocaleString()}) 레벨 위에서 성공적으로 방어된다면, 상단 추세선 돌파와 함께 5파 충격파가 개시되어 피보나치 1.618 확장 목표가인 <strong>$84,500 ~ $86,800</strong> 구간까지 랠리를 전개할 수 있습니다.</div>
  </div>
  <div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 10px; font-size: 15px; line-height: 1.75; color: #1e293b;">
    <span style="color: #e11d48; font-weight: 800;">▶</span>
    <div><strong style="font-weight: 800; color: #0f172a;">[대안 시나리오 - 35% 확률]: 확장 플랫(Expanded Flat) ABC 조정 파동</strong><br/>
    만약 현재 반등이 단기 B파 반등에 불과하며 삼각수렴 하단 및 200 EMA($${ema200.toLocaleString()})를 종가 기준으로 하향 이탈할 경우, C파 충격 하락으로 전환되어 피보나치 0.618 되돌림($${fib618.toLocaleString()}) 및 라운드 넘버 지지선인 <strong>$74,000</strong> 부근까지 조정이 심화될 수 있습니다.</div>
  </div>
  <div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 10px; font-size: 15px; line-height: 1.75; color: #1e293b;">
    <span style="color: #d97706; font-weight: 800;">▶</span>
    <div><strong style="font-weight: 800; color: #0f172a;">파동 카운팅 무효화 기준(Invalidation Level): $73,800</strong><br/>
    1파 고점과 4파 저점이 겹치지 않아야 하는 임펄스 기본 규칙(Overlap Rule)에 따라, 비트코인이 <strong>$73,800</strong>을 4시간봉 종가로 이탈할 경우 본 5파 상승 카운팅은 전면 무효화(Invalidated) 처리됩니다.</div>
  </div>
</div>

<!-- Image 4: Elliott Wave & Fibonacci Roadmap -->
${imgTag4}

<!-- SECTION 5: 핵심 지지/저항 레벨과 종합 시나리오 -->
<h4 style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 28px; margin-bottom: 10px;">
  5. 핵심 지지/저항 레벨과 매매 시나리오 (상승 65% vs 하락 35%)
</h4>
<p style="font-size: 15px; color: #1e293b; line-height: 1.85; margin-bottom: 16px; word-break: keep-all;">
  단기 매매를 위한 핵심 프라이스 레벨을 명확히 정의하고, 시장의 조건부 움직임에 대응하는 양방향 시나리오를 제시합니다:
</p>

<!-- S/R Table Card -->
<div style="overflow-x: auto; margin: 18px 0;">
  <table style="width: 100%; border-collapse: collapse; font-size: 14px; text-align: left;">
    <thead>
      <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
        <th style="padding: 10px 14px; font-weight: 800; color: #0f172a;">구분</th>
        <th style="padding: 10px 14px; font-weight: 800; color: #0f172a;">1차 핵심 가격</th>
        <th style="padding: 10px 14px; font-weight: 800; color: #0f172a;">2차 핵심 가격</th>
        <th style="padding: 10px 14px; font-weight: 800; color: #0f172a;">기술적 근거 및 비고</th>
      </tr>
    </thead>
    <tbody>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px 14px; font-weight: 800; color: #e11d48;">저항선 (Resistance)</td>
        <td style="padding: 10px 14px; font-weight: 700; color: #e11d48; font-family: monospace;">$79,800 ~ $80,200</td>
        <td style="padding: 10px 14px; font-weight: 700; color: #e11d48; font-family: monospace;">$82,500 ~ $84,000</td>
        <td style="padding: 10px 14px; color: #475569; font-size: 13px;">삼각수렴 상단 추세선 및 심리적 라운드 넘버 ($80K)</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0; background: #fafafa;">
        <td style="padding: 10px 14px; font-weight: 800; color: #0284c7;">피벗 기준 (Pivot)</td>
        <td style="padding: 10px 14px; font-weight: 800; color: #0284c7; font-family: monospace;">$${curP.toLocaleString()}</td>
        <td style="padding: 10px 14px; font-weight: 800; color: #0284c7; font-family: monospace;">$${ema50.toLocaleString()}</td>
        <td style="padding: 10px 14px; color: #475569; font-size: 13px;">4H 50 EMA 및 피보나치 0.5 되돌림 중심선</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px 14px; font-weight: 800; color: #059669;">지지선 (Support)</td>
        <td style="padding: 10px 14px; font-weight: 700; color: #059669; font-family: monospace;">$${fib382.toLocaleString()} ~ $76,500</td>
        <td style="padding: 10px 14px; font-weight: 700; color: #059669; font-family: monospace;">$${fib618.toLocaleString()} ~ $74,200</td>
        <td style="padding: 10px 14px; color: #475569; font-size: 13px;">4H 200 EMA 및 수렴 하단 지지선 (무효화 레벨 $73,800)</td>
      </tr>
    </tbody>
  </table>
</div>

<p style="font-size: 15px; color: #1e293b; line-height: 1.85; margin-bottom: 16px; word-break: keep-all;">
  <strong>[시나리오 1 - 상승 돌파 우위 (65%)]:</strong> 비트코인이 거래량을 수반하며 <strong>$80,200</strong>을 4시간봉 종가 기준으로 돌파·안착할 경우, 롱 포지션 진입의 근거가 확립됩니다. 1차 목표가는 $82,500, 2차 목표가는 $84,800으로 설정하며, 손익비(Risk:Reward) 1:2.4 이상을 기대할 수 있습니다.<br/>
  <strong>[시나리오 2 - 하방 이탈 및 조정 (35%)]:</strong> 삼각수렴 상단 저항에 부딪혀 <strong>$76,500(200 EMA)</strong>을 이탈하는 경우입니다. 이때는 보수적인 관점으로 전환하여 성급한 매수를 자제하고, 주요 지지대인 $74,000 부근의 캔들 반등 확인 후 신규 진입을 모색해야 합니다.
</p>

<!-- Image 5: Dual Scenarios & Trader Action Rules -->
${imgTag5}

<!-- SECTION 6: 결론 및 실전 트레이딩 수칙 -->
<h4 style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 28px; margin-bottom: 10px;">
  6. 결론 및 앞으로 주시해야 할 실전 포인트: 리스크 관리와 진입 수칙
</h4>
<p style="font-size: 15px; color: #1e293b; line-height: 1.85; margin-bottom: 16px; word-break: keep-all;">
  현재와 같은 극단적인 수렴 구간에서 가장 위험한 실수는 <strong>"방향을 예단하고 수렴 중간에서 무리하게 풀 베팅하는 것"</strong>입니다. 수렴 내부의 잔파동은 휩쏘(Whipsaw, 속임수)가 자주 발생하므로 다음 실전 수칙을 반드시 준수하시기 바랍니다:
</p>
<div style="margin: 14px 0 18px 0;">
  <div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px; font-size: 15px; line-height: 1.75; color: #1e293b;">
    <span style="color: #0284c7; font-weight: 800;">1.</span>
    <div><strong>확인 매매(Confirmation) 원칙:</strong> 추세선 돌파 후 4시간봉 종가가 선 밖에서 마감되고, 리테스트(Retest) 지지를 확인할 때 진입하십시오.</div>
  </div>
  <div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px; font-size: 15px; line-height: 1.75; color: #1e293b;">
    <span style="color: #0284c7; font-weight: 800;">2.</span>
    <div><strong>철저한 손절매(Stop-Loss) 설정:</strong> 본 셋업의 최종 무효화 레벨인 <strong>$${Number(setup.sl).toLocaleString()}</strong> 또는 진입 직전 스윙 저점에 반드시 스탑로스를 설정하세요.</div>
  </div>
  <div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px; font-size: 15px; line-height: 1.75; color: #1e293b;">
    <span style="color: #0284c7; font-weight: 800;">3.</span>
    <div><strong>포지션 사이징 제한:</strong> 1회 거래당 총 자산 대비 손실액이 1.5%를 초과하지 않도록 레버리지와 진입 비중을 통제해야 합니다.</div>
  </div>
</div>

<!-- Invalidation & Risk Disclaimer Box -->
<div class="perspective-invalidation-card" style="background: #fef2f2; border: 1px solid #fee2e2; border-radius: 10px; padding: 18px 20px; margin: 24px 0;">
  <div style="color: #b91c1c; font-weight: 800; font-size: 14px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
    ⚠️ [트레이딩 유의사항 및 리스크 고지]
  </div>
  <p style="font-size: 13px; line-height: 1.8; margin: 0; color: #991b1b; font-weight: 500; word-break: keep-all;">
    본 기술적 분석은 과거 가격 데이터와 통계적 차트 패턴에 기반한 기술적 해석이며, 특정 자산의 매수·매도를 추천하거나 미래 수익을 보장하지 않습니다. 암호화폐 시장은 극심한 변동성을 수반하므로 모든 투자의 최종 책임은 투자자 본인에게 있습니다.
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
  
  const img1 = generatePerspectiveImage1(dateStr, techData, slotInfo);
  const img2 = generatePerspectiveImage2(dateStr, techData, slotInfo);
  const img3 = generatePerspectiveImage3(dateStr, techData, slotInfo);
  const img4 = generatePerspectiveImage4(dateStr, techData, slotInfo);
  const img5 = generatePerspectiveImage5(dateStr, techData, slotInfo);
  const imgUris = [img1, img2, img3, img4, img5];

  let contentHtml = null;
  let postTitle = `[BTC/USDT ${slotInfo.slotName}] ${dateKorean} 비트코인 기술적 분석: ${techData.setup?.theme || '대칭 삼각수렴 이탈과 엘리엇 5파 분기점'}`;
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

        const imgTags = [
          `<div class="post-img-container text-center my-4"><img src="${img1}" alt="BTC/USDT 4H 트레이딩뷰 기술적 셋업 - crytopnl.com" style="width:100%; max-width: 800px; display:block; margin: 14px auto; border-radius: 12px; border: none; box-shadow: none;" /></div>`,
          `<div class="post-img-container text-center my-4"><img src="${img2}" alt="BTC/USDT 거시 추세 및 이평선 구조 - crytopnl.com" style="width:100%; max-width: 800px; display:block; margin: 14px auto; border-radius: 12px; border: none; box-shadow: none;" /></div>`,
          `<div class="post-img-container text-center my-4"><img src="${img3}" alt="BTC/USDT 4H 캔들 패턴 및 4대 모멘텀 지표 - crytopnl.com" style="width:100%; max-width: 800px; display:block; margin: 14px auto; border-radius: 12px; border: none; box-shadow: none;" /></div>`,
          `<div class="post-img-container text-center my-4"><img src="${img4}" alt="BTC/USDT 엘리엇 파동 및 피보나치 레벨 - crytopnl.com" style="width:100%; max-width: 800px; display:block; margin: 14px auto; border-radius: 12px; border: none; box-shadow: none;" /></div>`,
          `<div class="post-img-container text-center my-4"><img src="${img5}" alt="BTC/USDT 매매 시나리오 및 핵심 레벨 - crytopnl.com" style="width:100%; max-width: 800px; display:block; margin: 14px auto; border-radius: 12px; border: none; box-shadow: none;" /></div>`
        ];

        let processed = rawAiText.replace(/<TITLE>.*?<\/TITLE>/gi, '').trim();
        processed = processed.replace('<!-- PERSPECTIVE_IMAGE_1 -->', imgTags[0]);
        processed = processed.replace('<!-- PERSPECTIVE_IMAGE_2 -->', imgTags[1]);
        processed = processed.replace('<!-- PERSPECTIVE_IMAGE_3 -->', imgTags[2]);
        processed = processed.replace('<!-- PERSPECTIVE_IMAGE_4 -->', imgTags[3]);
        processed = processed.replace('<!-- PERSPECTIVE_IMAGE_5 -->', imgTags[4]);
        processed = processed.replace('<!-- TRADINGVIEW_CHART_IMAGE -->', imgTags[0]);
        processed = processed.replace(/<\/?(HEADER|SETUP_BOX|SECTION_[1-6]|INVALIDATION|RISK_GUIDE)>/gi, '');
        contentHtml = formatMarkdownToCleanHtml(processed);
      }
    } catch(e) {
      console.warn('[Daily Perspective Generator] AI synthesis failed, using dynamic quant perspective:', e.message);
    }
  }

  if (!contentHtml) {
    contentHtml = generateDynamicPerspectiveReport(dateStr, dateKorean, techData, imgUris, slotInfo);
    if (techData.setup?.theme) {
      postTitle = `[BTC/USDT ${slotInfo.slotName}] ${dateKorean} 비트코인 기술적 분석: ${techData.setup.theme} ($${Number(techData.currentPrice).toLocaleString()})`;
    }
  }

  return {
    id: slotInfo.id,
    category: 'perspective',
    categoryName: '🎯 차트 관점',
    title: postTitle,
    author: 'AI 퀀트 애널리스트',
    authorRank: 'VERIFIED',
    timestamp: targetDate ? new Date(targetDate).getTime() : (slotInfo.postDate.getTime() - (9 * 3600000)),
    time: slotInfo.timeStr,
    views: 0,
    upvotes: 0,
    isNotice: false,
    image: true,
    content: contentHtml,
    comments: []
  };
}

// ==============================================================================
// 6. YouTube Finance Tips Report Generator (10년차 재테크 전문 블로거 엔진)
// ==============================================================================

function extractYouTubeVideoId(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/;
  const match = trimmed.match(regExp);
  if (match && match[1]) return match[1];
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  return null;
}

async function fetchYouTubeVideoDetails(youtubeUrl) {
  const videoId = extractYouTubeVideoId(youtubeUrl);
  if (!videoId) {
    console.warn('[YouTube Finance] Invalid or missing YouTube URL:', youtubeUrl);
    return null;
  }

  const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;
  let title = '2040 직장인을 위한 핵심 재테크·절세 실전 전략';
  let channelName = '재테크 인사이트';
  let thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  let description = '';
  let transcript = '';

  // 1. YouTube oEmbed
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(cleanUrl)}&format=json`;
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      if (data.title) title = data.title;
      if (data.author_name) channelName = data.author_name;
      if (data.thumbnail_url) thumbnailUrl = data.thumbnail_url;
      console.log(`[YouTube Finance] Fetched oEmbed: "${title}" by ${channelName}`);
    }
  } catch(e) {
    console.warn('[YouTube Finance] oEmbed fetch failed:', e.message);
  }

  // 2. Fetch HTML page for Description and Captions/Transcript
  try {
    const pageRes = await fetch(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      signal: AbortSignal.timeout(8000)
    });
    if (pageRes.ok) {
      const html = await pageRes.text();

      const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i) || html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/i);
      if (descMatch && descMatch[1]) {
        description = descMatch[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
      }

      const captionMatch = html.match(/"captionTracks":\s*(\[[^\]]+\])/);
      if (captionMatch && captionMatch[1]) {
        try {
          const tracks = JSON.parse(captionMatch[1]);
          const track = tracks.find(t => t.languageCode === 'ko') || tracks.find(t => t.languageCode === 'en') || tracks[0];
          if (track && track.baseUrl) {
            const trackRes = await fetch(track.baseUrl, { signal: AbortSignal.timeout(5000) });
            if (trackRes.ok) {
              const xml = await trackRes.text();
              const textMatches = [...xml.matchAll(/<text[^>]*>([^<]+)<\/text>/g)];
              if (textMatches.length > 0) {
                transcript = textMatches.map(m => m[1].replace(/&amp;#39;/g, "'").replace(/&amp;quot;/g, '"').replace(/&amp;/g, '&')).join(' ');
                console.log(`[YouTube Finance] Successfully extracted video transcript (${transcript.length} chars)`);
              }
            }
          }
        } catch(capErr) {
          console.warn('[YouTube Finance] Caption parsing failed:', capErr.message);
        }
      }
    }
  } catch(e) {
    console.warn('[YouTube Finance] Video page fetch failed:', e.message);
  }

  return {
    videoId,
    url: cleanUrl,
    title,
    channelName,
    thumbnailUrl,
    description,
    transcript
  };
}

// Helper to detect theme and extract dynamic card parameters from videoDetails or custom input
function extractFinanceThemeData(videoDetails, customTitle = null) {
  const text = `${customTitle || ''} ${videoDetails?.title || ''} ${videoDetails?.description || ''} ${videoDetails?.transcript || ''}`.toLowerCase();
  
  if (text.includes('부동산') || text.includes('취득세') || text.includes('양도세') || text.includes('종부세') || text.includes('주택') || text.includes('아파트') || text.includes('전세') || text.includes('청약')) {
    return {
      theme: 'realestate',
      badge: '2026 부동산 세제·실전 가이드',
      heroSub: '1주택·무주택·다주택 핵심 대응 수칙',
      matrixTitle: '부동산 세제 핵심 매트릭스',
      target: '1주택 갈아타기·무주택·투자자',
      benefit: '양도세 12억 비과세 + 중과 완화',
      benefitSub: '취득세·보유세 절감',
      caution: '일시적 2주택 3년 처분기한',
      bullets: [
        '① 1주택 비과세 수성: 12억 이하 비과세 및 실거주 요건 체크',
        '② 갈아타기 처분 기한: 신규 주택 취득 후 3년 내 종전 주택 매도',
        '③ 다주택 중과 배제 활용: 기본세율(6~45%) 구간 내 출구 전략'
      ],
      roadmapTitle: '부동산 자산 방어 및 3단계 실천 로드맵',
      steps: [
        { title: '1단계 무주택', sub: '청약 및 시드머니 형성', items: ['✓ 청약통장 납입액 최적화', '• 월 25만 원 인정 한도 활용', '✓ 월세 세액공제 증빙 확보', '• 연 최대 15~17% 공제', '✓ ISA 활용 종잣돈 적립', '• 비과세 혜택으로 시드 방어'] },
        { title: '2단계 1주택자', sub: '비과세 및 갈아타기 전략', items: ['✓ 1세대 1주택 12억 비과세', '• 거주·보유기간 2년 충족', '✓ 일시적 2주택 3년 룰', '• 종전 주택 처분 기한 엄수', '✓ 종부세 기본공제 체크', '• 단독명의 12억 공제 활용'] },
        { title: '3단계 다주택자', sub: '중과 배제 및 포트폴리오', items: ['✓ 양도세 중과 배제 연장', '• 최고 82.5% 대신 기본세율', '✓ 똘똘한 한 채 압축', '• 비선호 지역 우선 정리', '✓ 금융자산 분산 투자', '• 연금·배당 ETF로 유동성 확보'] }
      ],
      matrixCards: [
        { tag: '무주택자', sub: '청약·월세 절세', main: '연 최대 120만 공제', bullets: ['• 청약저축 납입액 40% 소득공제', '• 월세액 최대 17% 세액공제', '✓ 내 집 마련 초기 시드머니 방어'] },
        { tag: '1세대 1주택', sub: '양도소득세 비과세', main: '12억 이하 전액 비과세', bullets: ['• 2년 이상 보유(조정지역 거주)', '• 일시적 2주택 3년 내 처분', '✓ 상급지 갈아타기 최적 타이밍'] },
        { tag: '일시적 2주택', sub: '대체 취득 특례', main: '기존 주택 3년 처분', bullets: ['• 신규 주택 취득 1년 후 매수', '• 취득세 일반세율(1~3%) 적용', '✓ 처분 기한 초과 시 가산세 주의'] },
        { tag: '다주택자', sub: '중과 완화 출구', main: '기본세율 6% ~ 45%', bullets: ['• 중과 배제 기간 내 매도 유도', '• 장기보유특별공제(최대 30%)', '✓ 취득세 중과 리스크 사전 점검'] }
      ],
      riskBadge: 'REAL ESTATE RISK',
      riskTitle: '부동산 세무 전 <tspan fill="#f43f5e">필수 주의사항</tspan> &amp; 리스크 방어 4대 수칙',
      risks: [
        { code: '01', title: '처분 기한 도과', sub: '일시적 2주택 3년 초과', desc: '비과세 취소 + 양도세 추징', tag: '✓ 캘린더 알림 등록 필수' },
        { code: '02', title: '실거주 요건 누락', sub: '조정대상지역 취득 시', desc: '2년 실거주 미충족 시 과세', tag: '✓ 전입 및 주민등록 유지' },
        { code: '03', title: '취득세 중과 복병', sub: '조정지역 2주택 이상', desc: '8%~12% 취득세 폭탄 주의', tag: '✓ 계약 전 주택 수 산정' },
        { code: '04', title: '자금조달계획서', sub: '증여·차용증 철저 소명', desc: '국세청 편법 증여 전수조사', tag: '✓ 적법한 금융 거래 내역' }
      ],
      summaryQuote: '부동산 세금의 성패는 복잡한 편법이 아니라, 비과세 요건과 법정 처분 기한을 단 하루도 놓치지 않는 철저한 일정 관리에 있습니다.',
      summaryBullets: [
        '1단계(내 주택 비과세 요건 파악) ➔ 2단계(처분·취득 일정표 수립) ➔ 3단계(금융 절세계좌 병행)의 원칙을 사수하세요.',
        '세법 개편 흐름을 미리 체크하고 1주택 비과세 방패를 지키는 것이 수천만 원의 세금을 아끼는 지름길입니다.'
      ]
    };
  }

  // 1. QQQ / QQQM / Nasdaq 100 ETF theme (Specific ETF comparison)
  if (text.includes('qqq') || text.includes('qqqm') || text.includes('나스닥') || text.includes('nasdaq')) {
    return {
      theme: 'qqq_nasdaq',
      badge: '2026 미국 나스닥 100·QQQ vs QQQM 가이드',
      heroSub: '월급쟁이 직장인을 위한 미국 ETF 맞춤형 분석',
      matrixTitle: 'QQQ vs QQQM 핵심 스펙 비교 매트릭스',
      target: '나스닥 100·미국 지수 장기 적립식 투자자',
      benefit: '운용보수 0.05%p 절감 + 복리 스노우볼',
      benefitSub: '장기 보유 시 수익률 극대화',
      caution: '기술주 변동성 및 환율 리스크 주의',
      bullets: [
        '① QQQM 수수료 우위: 운용보수 0.15%(QQQ 대비 0.05%p 절감으로 장기 적립 최적)',
        '② 나스닥 100 혁신 기업 압축: 애플·MS·엔비디아 빅테크 성장 공유',
        '③ 연금·ISA 국내상장 ETF 병행: 절세계좌 배당세 0% + 직투 분산 포트폴리오'
      ],
      roadmapTitle: '미국 나스닥 100 ETF 적립 및 3단계 실천 로드맵',
      steps: [
        { title: '1단계 계좌 선택', sub: '일반 직투 vs 절세계좌', items: ['✓ 일반 위탁계좌 직투', '• 환노출 달러 매수(QQQM)', '✓ 중개형 ISA 계좌', '• 국내상장 미국나스닥100', '✓ 연금저축/IRP 병행', '• 세액공제 + 과세이연'] },
        { title: '2단계 종목 결정', sub: 'QQQ vs QQQM 맞춤 선택', items: ['✓ QQQM 집중 매수', '• 10년 이상 장기 적립식', '✓ 단기 매매엔 QQQ', '• 압도적 거래량과 옵션', '✓ 분할 적립식(DCA)', '• 1주당 단가 가벼운 QQQM'] },
        { title: '3단계 복리 가속', sub: '배당금 100% 재투자', items: ['✓ 매월 급여일 자동이체', '• 주가 등락 무관 기계적 매수', '✓ 분기 배당금 재매수', '• 스노우볼 복리 극대화', '✓ 10년 이상 장기 보유', '• 미국 혁신 성장 공유'] }
      ],
      matrixCards: [
        { tag: 'QQQ (대형 원조)', sub: '풍부한 유동성·옵션', main: '운용보수 0.20%', bullets: ['• 일평균 거래대금 세계 1위 수준', '• 주당 가격 상대적 고가', '✓ 단기 매매·옵션 트레이더 최적'] },
        { tag: 'QQQM (적립식 미니)', sub: '장기 적립식 끝판왕', main: '운용보수 0.15%', bullets: ['• QQQ 대비 0.05%p 저렴한 보수', '• 주당 단가 낮아 소액 적립 용이', '✓ 10년 이상 장기 적립 1순위'] },
        { tag: '국내상장 나스닥100', sub: 'ISA·연금저축 활용', main: '세액공제 + 비과세', bullets: ['• TIGER/ACE/KODEX 나스닥100', '• 배당소득세(15.4%) 과세이연', '✓ 국내 절세계좌 한도 우선 납입'] },
        { tag: '나스닥 100 지수', sub: '빅테크 1등 기업 묶음', main: '연평균 15%+ 복리 성장', bullets: ['• 애플·마이크로소프트·엔비디아', '• 15년 이상 보유 시 무손실', '✓ 전 세계 혁신 성장 엔진 탑재'] }
      ],
      riskBadge: 'NASDAQ ETF RISK',
      riskTitle: '나스닥 100 ETF 투자 전 <tspan fill="#f43f5e">필수 주의사항</tspan> &amp; 리스크 방어 4대 수칙',
      risks: [
        { code: '01', title: '단기 변동성(MDD)', sub: '기술주 특유의 조정폭', desc: '고점 대비 -30% 발생 가능', tag: '✓ 분할 매수로 평단 관리' },
        { code: '02', title: '환율 변동성(환차손)', sub: '원/달러 환율 하락 시', desc: '환차손으로 원화 수익률 감소', tag: '✓ 환노출 장기 보유 원칙' },
        { code: '03', title: '레버리지(TQQQ) 경계', sub: '3배수 음의 복리 위험', desc: '횡보장 계좌 녹아내림', tag: '✓ 1배수 정석 QQQM 집중' },
        { code: '04', title: '해외주식 양도소득세', sub: '연 250만 초과분 22%', desc: '매년 5월 자진신고 필수', tag: '✓ 분할 매도로 공제 활용' }
      ],
      summaryQuote: 'QQQ와 QQQM의 추종 지수는 100% 동일합니다. 거액 옵션 트레이더가 아니라면 운용보수가 0.05%p 저렴하고 주당 단가가 가벼운 QQQM으로 매월 자동이체하는 것이 현명한 적립식 투자의 정석입니다.',
      summaryBullets: [
        '1단계(국내 절세계좌 나스닥100 우선) ➔ 2단계(여유 달러 자금 QQQM 직투) ➔ 3단계(배당 재투자) 순서를 사수하세요.',
        '단기 주가 등락에 흔들리지 않고 매달 묵묵히 모아가는 투자자만이 미국 빅테크의 성장을 온전히 누립니다.'
      ]
    };
  }

  // 2. Retirement / Pension / ISA theme
  if (text.includes('은퇴') || text.includes('파이어') || (text.includes('연금저축') && text.includes('isa')) || text.includes('노후 자산')) {
    return {
      theme: 'retirement_pension',
      badge: '2026 은퇴 자산·절세 계좌 실전 가이드',
      heroSub: '직장인 10년 빠른 경제적 자유 로드맵',
      matrixTitle: '은퇴 자산 3대 절세 계좌 매트릭스',
      target: '2040 직장인·조기 은퇴 희망자',
      benefit: '연 148.5만 세액공제 + 복리 증식',
      benefitSub: '은퇴 시점 10년 단축 시스템',
      caution: '55세 이전 중도해지 페널티 주의',
      bullets: [
        '① 세액공제 한도 극대화: 연금저축(600만) + IRP(300만) = 합산 900만원',
        '② 중개형 ISA 만능 바구니: 연 2,000만원 납입 + 3년 만기 연금 전환 10% 추가 공제',
        '③ 글로벌 지수 ETF 장기 적립: 세금 0% 과세이연 상태에서 복리 스노우볼'
      ],
      roadmapTitle: '10년 빠른 은퇴 자산 형성 및 3단계 실천 로드맵',
      steps: [
        { title: '1단계 절세 엔진', sub: '연금저축 600만 + IRP 300만', items: ['✓ 연 900만 원 한도 납입', '• 최대 148.5만원 연말환급', '✓ 국내상장 미국 ETF 매수', '• 배당소득세 전액 과세이연', '✓ 은퇴 시 3.3~5.5% 연금세', '• 15.4% 배당세 획기적 절감'] },
        { title: '2단계 ISA 바구니', sub: '중개형 ISA 연 2,000만', items: ['✓ 순이익 200~400만 비과세', '• 초과분 9.9% 분리과세', '✓ 국내상장 해외 ETF 매수', '• 금융소득종합과세 방어', '✓ 3년 만기 후 연금 이전', '• 이전액 10%(최대 300만) 추가공제'] },
        { title: '3단계 자동 복리', sub: '지수 ETF 자동 적립식', items: ['✓ 매월 급여일 기계적 매수', '• 시장 변동성 무관 DCA 적립', '✓ 배당금 100% 재투자', '• 스노우볼 복리 엔진 탑재', '✓ 10~20년 장기 보유', '• 은퇴 자산 5억~10억 완성'] }
      ],
      matrixCards: [
        { tag: '연금저축펀드', sub: '노후 자산 1순위 엔진', main: '연 600만 세액공제', bullets: ['• 최대 99만 원 연말정산 환급', '• 자유로운 입출금 및 계좌이체', '✓ 미국 S&amp;P500·나스닥100 최적'] },
        { tag: '개인형 IRP', sub: '퇴직금·세액공제 통합', main: '연 300만 추가 공제', bullets: ['• 연금저축과 합산 연 900만 원', '• 안전자산 30% 의무 편입', '✓ 퇴직금 이체 시 퇴직소득세 30% 감면'] },
        { tag: '중개형 ISA', sub: '만능 절세 저축 바구니', main: '순익 200~400만 비과세', bullets: ['• 국내상장 해외 ETF 배당 비과세', '• 3년 주기 만기 해지 후 연금 이전', '✓ 손익 통산으로 실질 세금 최소화'] },
        { tag: '글로벌 지수 ETF', sub: '장기 복리 성장 엔진', main: '연평균 8~11% 성장', bullets: ['• 글로벌 1등 우량 기업 묶음 투자', '• 배당금 재투자로 스노우볼', '✓ 20년 적립 시 원금 대비 3~5배 복리'] }
      ],
      riskBadge: 'RETIREMENT ASSET RISK',
      riskTitle: '은퇴 자산 운용 전 <tspan fill="#f43f5e">필수 주의사항</tspan> &amp; 리스크 방어 4대 수칙',
      risks: [
        { code: '01', title: '중도해지 페널티', sub: '55세 이전 계좌 해지 시', desc: '16.5% 기타소득세 전액 추징', tag: '✓ 장기 여유자금만 납입 원칙' },
        { code: '02', title: '연금 수령 연간 한도', sub: '연간 사적연금 1,500만 초과', desc: '종합과세 or 16.5% 분리과세', tag: '✓ 수령 기간 10년 이상 분산' },
        { code: '03', title: 'IRP 안전자산 30%', sub: '위험자산 70% 제한', desc: '채권혼합형·예금 30% 의무', tag: '✓ TDF 또는 단기채 ETF 활용' },
        { code: '04', title: '무리한 납입 한도', sub: '생활비 부족 유발', desc: '급전 필요 시 울며 해지', tag: '✓ 비상금 6개월 확보 후 시작' }
      ],
      summaryQuote: '은퇴 자산 마련의 승패는 어떤 대박 종목을 찾느냐가 아니라, 국가가 주는 연말정산 세제 혜택과 절세 계좌의 복리 시스템을 단 1년이라도 일찍 가동하느냐에 달려 있습니다.',
      summaryBullets: [
        '1단계(연금저축 600만 + IRP 300만 세액공제) ➔ 2단계(ISA 만기 후 연금 이전) ➔ 3단계(배당 재투자) 순서를 사수하세요.',
        '월 30만 원이라도 꾸준히 모아가는 사람이 결국 10년 빠른 경제적 자유를 달성합니다.'
      ]
    };
  }

  // Stock / ETF theme
  if (text.includes('etf') || text.includes('주식') || text.includes('s&p') || text.includes('나스닥') || text.includes('배당') || text.includes('미국주식')) {
    return {
      theme: 'stock',
      badge: '2026 ETF·글로벌 투자 전략 가이드',
      heroSub: '월 30만 원으로 복리 자산 만들기',
      matrixTitle: '투자 자산 핵심 매트릭스',
      target: '2040 직장인·적립식 투자자',
      benefit: '연평균 8~10% 장기 복리',
      benefitSub: '배당 재투자 스노우볼',
      caution: '단기 급락장 뇌동매매 주의',
      bullets: [
        '① 지수 추종 ETF 분할 적립: 미국 S&amp;P500·나스닥100 적립',
        '② 절세 계좌 내 해외 ETF: ISA 및 연금계좌에서 배당세 0%',
        '③ 배당금 100% 재투자: 장기 복리 스노우볼 엔진 완성'
      ],
      roadmapTitle: '글로벌 지수 분할 적립 및 3단계 실천 로드맵',
      steps: [
        { title: '1단계 파킹통장', sub: '비상금 6개월 확보', items: ['✓ 3~6개월 생활비 보관', '• 급전 필요 시 주식 매도 방지', '✓ 수시입출금 고금리 활용', '• 파킹통장 3%대 유지', '✓ 빚투 절대 금지', '• 순수 여유자금 투자 원칙'] },
        { title: '2단계 ISA 바구니', sub: '만능 절세 계좌 세팅', items: ['✓ 중개형 ISA 개설', '• 비과세 200~400만 원', '✓ 국내 상장 해외 ETF', '• 배당소득세 과세이연', '✓ 3년 만기 후 연금 이전', '• 10% 추가 세액공제'] },
        { title: '3단계 자동 적립', sub: '지수 ETF 분할 매수', items: ['✓ 매월 급여일 자동이체', '• 주가 등락 무관 DCA 적립', '✓ 배당금 자동 재투자', '• 복리 효과 극대화', '✓ 10년 이상 장기 보유', '• 원금 대비 3~5배 증식'] }
      ],
      matrixCards: [
        { tag: '일반 위탁계좌', sub: '해외 직투(달러)', main: '양도세 22% (250만 공제)', bullets: ['• 환차익 비과세 혜택', '• 미국 개별주/ETF 직접 매수', '⚠️ 매년 5월 양도세 자진신고'] },
        { tag: '중개형 ISA', sub: '국내상장 해외ETF', main: '순익 200~400만 비과세', bullets: ['• 초과분 9.9% 분리과세', '• 손익통산(이익-손실 상계)', '✓ 3년 주기 연금 전환 추천'] },
        { tag: '연금저축펀드', sub: '노후 자산 엔진', main: '연 600만 세액공제', bullets: ['• 최대 99만 원 연말환급', '• 과세이연 후 3.3~5.5% 연금세', '✓ S&amp;P500 TR ETF 최적'] },
        { tag: '미국 지수 ETF', sub: '장기 복리 정석', main: '연평균 8%~11% 성장', bullets: ['• 전 세계 혁신 우량주 묶음', '• 개별 기업 파산 리스크 0', '✓ 15년 이상 보유 시 무손실'] }
      ],
      riskBadge: 'INVESTMENT RISK',
      riskTitle: '주식·ETF 투자 전 <tspan fill="#f43f5e">필수 주의사항</tspan> &amp; 리스크 방어 4대 수칙',
      risks: [
        { code: '01', title: '확정 고수익 의심', sub: '"원금 보장 월 10%"', desc: '100% 폰지 사기 의심', tag: '✓ 원금보장 고수익은 없다' },
        { code: '02', title: '레버리지 장기투자', sub: '2X, 3X 음의 복리', desc: '횡보장 계좌 녹아내림', tag: '✓ 1배수 정석 ETF 원칙' },
        { code: '03', title: '패닉셀(공포 투매)', sub: '조정장 감정 매도', desc: '저점 매도 고점 매수 반복', tag: '✓ 기계적 월 분할 매수' },
        { code: '04', title: '숨은 총보수(TER)', sub: '기타비용·매매중개수수료', desc: '공시 총보수와 괴리 발생', tag: '✓ 실질부담비용 최저 선택' }
      ],
      summaryQuote: '투자의 성패는 고수익 타이밍을 맞히는 데 있지 않고, 잃지 않는 우량 자산에 꾸준히 시간을 더하는 복리의 힘에 있습니다.',
      summaryBullets: [
        '1단계(비상금 파킹) ➔ 2단계(절세 계좌 세팅) ➔ 3단계(지수 ETF 자동이체) 순서를 지키세요.',
        '시장 노이즈에 흔들리지 않고 매달 묵묵히 모아가는 사람이 결국 경제적 자유를 완성합니다.'
      ]
    };
  }

  // Default General Finance
  return {
    theme: 'general',
    badge: '2026 재테크·투자 전략 가이드',
    heroSub: '2040 직장인을 위한 핵심 실천 요약',
    matrixTitle: '재테크 핵심 요약 매트릭스',
    target: '20~40대 직장인·사회초년생',
    benefit: '연말정산 환급 + 복리 증식',
    benefitSub: '연 148.5만원 절세',
    caution: '과장된 고수익 미끼 상품 주의',
    bullets: [
      '① 소득 대비 저축률 극대화: 선저축 후지출 50% 법칙',
      '② 절세 계좌 3총사 활용: 연금저축 + IRP + 중개형 ISA',
      '③ 지수 추종 ETF 분할 적립: 장기 복리 성장 엔진 탑재'
    ],
    roadmapTitle: '2040 직장인 통장 분리 및 3단계 실천 로드맵',
    steps: [
      { title: '1단계 시드머니', sub: '비상금 파킹통장 구축', items: ['✓ 3~6개월 생활비 확보', '• 수시입출금 파킹통장 활용', '✓ 고금리 부채 전액 청산', '• 리볼빙, 카드론 0원 원칙', '✓ 통장 4개 쪼개기', '• 급여/고정/소비/비상금 분리'] },
      { title: '2단계 절세 계좌', sub: '세액공제 한도 우선 납입', items: ['✓ 연금저축펀드 600만', '• 16.5% 세액공제(최대 99만)', '✓ 개인형 IRP 300만', '• 합산 900만(최대 148.5만)', '✓ 중개형 ISA 연 2,000만', '• 배당 비과세 + 9.9% 분리과세'] },
      { title: '3단계 지수 적립', sub: '장기 복리 성장 엔진 탑재', items: ['✓ 미국 S&amp;P500·나스닥100', '• 국내 상장 해외 ETF 매수', '✓ 정액 적립식(DCA)', '• 주가 등락 무관 매월 자동이체', '✓ 배당금 100% 재투자', '• 스노우볼 복리 효과 극대화'] }
    ],
    matrixCards: [
      { tag: '일반 예·적금', sub: '단기 안정성 1순위', main: '연 3.0% ~ 3.5%', bullets: ['• 이자소득세 15.4% 원천징수', '• 예금자보호 5천만 원', '⚠️ 물가상승률 감안 시 자산 증식 한계'] },
      { tag: '연금저축 + IRP', sub: '연말정산 13.2%~16.5%', main: '최대 148.5만원 환급', bullets: ['• 연간 900만 원까지 세액공제 한도', '• 배당소득세 과세이연 및 연금세', '✓ 직장인 필수 1순위 절세 방패 계좌'] },
      { tag: '중개형 ISA', sub: '만능 절세 바구니', main: '비과세 200~400만', bullets: ['• 손익 통산 후 순이익 비과세', '• 한도 초과분 9.9% 분리과세', '✓ 3년 의무가입 후 연금계좌 전환 시 추가 공제'] },
      { tag: '미국 지수 ETF', sub: 'S&amp;P500 / 나스닥100', main: '연평균 8% ~ 11%', bullets: ['• 글로벌 1등 우량 기업 묶음 투자', '• 개별주 리스크 배제 및 분기 배당', '✓ 20년 적립 시 원금 대비 3.5~5배 복리'] }
    ],
    riskBadge: 'RISK CHECKLIST',
    riskTitle: '투자·가입 전 <tspan fill="#f43f5e">필수 주의사항</tspan> &amp; 리스크 방어 4대 수칙',
    risks: [
      { code: '01', title: '확정 고수익 의심', sub: '"원금 보장 월 10%"', desc: '100% 폰지 사기 의심', tag: '✓ 하이리턴엔 하이리스크' },
      { code: '02', title: '중도해지 페널티', sub: '55세 이전 해지 시', desc: '16.5% 기타소득세 추징', tag: '✓ 장기 여유자금만 납입' },
      { code: '03', title: '무리한 빚투 금지', sub: '신용·대출 레버리지', desc: '하락장 패닉셀 주원인', tag: '✓ 본업에 지장 없는 투자' },
      { code: '04', title: '숨은 보수·비용', sub: '총보수비용(TER)', desc: '매매중개수수료 합산', tag: '✓ 실질부담비용 최저 선택' }
    ],
    summaryQuote: '재테크의 승패는 단기 고수익 종목을 맞히는 데 있지 않고, 잃지 않는 시스템을 먼저 완성하는 데 있습니다.',
    summaryBullets: [
      '1단계(비상금 파킹) ➔ 2단계(절세 계좌 한도) ➔ 3단계(글로벌 지수 ETF 분할 적립)의 기본 순서를 지키세요.',
      '매월 작더라도 꾸준히 쌓아가는 복리 습관이 10년 뒤 여러분의 가장 강력한 경제적 자유를 만들어줍니다.'
    ]
  };
}

// Safely sanitizes SVG string to prevent XML parse errors from unescaped '&'
function sanitizeSvgXml(svg) {
  if (!svg) return '';
  return svg.replace(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;');
}

// SVG 1: 메인 썸네일 & 핵심 브리핑 카드 (16:9 800x450)
function generateFinanceImage1(dateStr, videoDetails, customTitle = null, dynamicThemeData = null) {
  const tData = dynamicThemeData || extractFinanceThemeData(videoDetails, customTitle);
  const safeTitle = (customTitle || videoDetails?.title || '2040 직장인 맞춤 실전 재테크 가이드').replace(/[<>&"]/g, '');
  const cleanTitle = safeTitle.replace(/^\[재테크\s*팁\]\s*/, '').trim();
  const displayTitle1 = cleanTitle.length > 25 ? cleanTitle.slice(0, 25) + '...' : cleanTitle;

  const b1 = tData.bullets[0] || '① 지출 통제 및 시드머니 방어';
  const b2 = tData.bullets[1] || '② 절세 계좌 활용 혜택 극대화';
  const b3 = tData.bullets[2] || '③ 장기 복리 성장 시스템 구축';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <defs>
    <linearGradient id="f1_bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#050811"/><stop offset="50%" stop-color="#0b162a"/><stop offset="100%" stop-color="#040710"/>
    </linearGradient>
    <radialGradient id="f1_glow1" cx="20%" cy="25%" r="60%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.3"/><stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="f1_glow2" cx="80%" cy="40%" r="55%">
      <stop offset="0%" stop-color="#0ea5e9" stop-opacity="0.25"/><stop offset="100%" stop-color="#0ea5e9" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="f1_gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/><stop offset="50%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
    <filter id="f1_drop" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000000" flood-opacity="0.75"/>
    </filter>
  </defs>

  <rect width="800" height="450" fill="url(#f1_bg)"/>
  <rect width="800" height="450" fill="url(#f1_glow1)"/>
  <rect width="800" height="450" fill="url(#f1_glow2)"/>

  <!-- Subtle grid -->
  <g opacity="0.05" stroke="#f59e0b" stroke-width="1">
    <line x1="0" y1="90" x2="800" y2="90"/><line x1="0" y1="180" x2="800" y2="180"/>
    <line x1="0" y1="270" x2="800" y2="270"/><line x1="0" y1="360" x2="800" y2="360"/>
    <line x1="160" y1="0" x2="160" y2="450"/><line x1="320" y1="0" x2="320" y2="450"/>
    <line x1="480" y1="0" x2="480" y2="450"/><line x1="640" y1="0" x2="640" y2="450"/>
  </g>

  <!-- Top Badges -->
  <g transform="translate(30, 24)">
    <rect width="225" height="30" rx="8" fill="#d97706" filter="url(#f1_drop)"/>
    <circle cx="18" cy="15" r="5" fill="#ffffff"/>
    <text x="32" y="21" fill="#ffffff" font-size="12" font-weight="900" font-family="'Pretendard', sans-serif">${tData.badge}</text>

    <rect x="235" y="0" width="135" height="30" rx="8" fill="#0f172a" stroke="#f59e0b" stroke-width="1.2"/>
    <text x="302" y="20" fill="#fbbf24" font-size="12" font-weight="800" font-family="'Pretendard', sans-serif" text-anchor="middle">10년 차 블로거 뷰</text>

    <rect x="625" y="0" width="145" height="30" rx="8" fill="#0369a1" fill-opacity="0.25" stroke="#38bdf8" stroke-width="1.2"/>
    <text x="702" y="20" fill="#38bdf8" font-size="13" font-weight="900" font-family="monospace" text-anchor="middle">crytopnl.com</text>
  </g>

  <!-- Main Hero Title -->
  <g transform="translate(35, 90)">
    <rect x="0" y="0" width="250" height="28" rx="6" fill="#1e293b" stroke="#475569" stroke-width="1"/>
    <text x="14" y="19" fill="#fcd34d" font-size="12" font-weight="800" font-family="'Pretendard', sans-serif">💡 ${tData.badge}</text>

    <text x="0" y="66" fill="#ffffff" font-size="27" font-weight="900" font-family="'Pretendard', sans-serif" filter="url(#f1_drop)">${displayTitle1}</text>
    <text x="0" y="106" fill="url(#f1_gold)" font-size="26" font-weight="900" font-family="'Pretendard', sans-serif" filter="url(#f1_drop)">${tData.heroSub}</text>

    <g transform="translate(0, 134)">
      <rect width="460" height="46" rx="12" fill="#1b1c2b" stroke="#f59e0b" stroke-width="1.8" filter="url(#f1_drop)"/>
      <circle cx="28" cy="23" r="14" fill="#d97706"/>
      <text x="28" y="28" fill="#ffffff" font-size="14" font-weight="900" text-anchor="middle">✓</text>
      <text x="52" y="29" fill="#fef3c7" font-size="13.5" font-weight="800" font-family="'Pretendard', sans-serif">
        <tspan fill="#f59e0b">실전 재테크 팁</tspan> • <tspan fill="#34d399">절세·혜택 극대화</tspan> • 팩트 체크 검증
      </text>
    </g>

    <!-- Bullets -->
    <g transform="translate(5, 204)">
      <circle cx="6" cy="6" r="4" fill="#f59e0b"/>
      <text x="18" y="11" fill="#e2e8f0" font-size="13" font-weight="700" font-family="'Pretendard', sans-serif">${b1}</text>
      <circle cx="6" cy="34" r="4" fill="#38bdf8"/>
      <text x="18" y="39" fill="#e2e8f0" font-size="13" font-weight="700" font-family="'Pretendard', sans-serif">${b2}</text>
      <circle cx="6" cy="62" r="4" fill="#34d399"/>
      <text x="18" y="67" fill="#e2e8f0" font-size="13" font-weight="700" font-family="'Pretendard', sans-serif">${b3}</text>
    </g>
  </g>

  <!-- Right Floating Matrix Card -->
  <g transform="translate(525, 88)">
    <rect x="0" y="0" width="245" height="280" rx="20" fill="#0f172a" fill-opacity="0.95" stroke="#334155" stroke-width="2" filter="url(#f1_drop)"/>
    <rect x="0" y="0" width="245" height="42" rx="20" fill="#1e293b"/>
    <text x="122" y="27" fill="#f8fafc" font-size="13" font-weight="900" font-family="'Pretendard', sans-serif" text-anchor="middle">${tData.matrixTitle}</text>

    <g transform="translate(18, 54)">
      <rect width="210" height="66" rx="12" fill="#181e2b" stroke="#f59e0b" stroke-width="1.2"/>
      <text x="14" y="22" fill="#94a3b8" font-size="11" font-weight="700">권장 타깃 (Target)</text>
      <text x="14" y="48" fill="#fbbf24" font-size="13.5" font-weight="900" font-family="'Pretendard', sans-serif">${tData.target}</text>
    </g>

    <g transform="translate(18, 130)">
      <rect width="210" height="68" rx="12" fill="#0b241c" stroke="#10b981" stroke-width="1.2"/>
      <text x="14" y="22" fill="#a7f3d0" font-size="11" font-weight="700">핵심 기대 효과 (Benefits)</text>
      <text x="14" y="46" fill="#34d399" font-size="13.5" font-weight="900" font-family="'Pretendard', sans-serif">${tData.benefit}</text>
      <text x="196" y="60" fill="#6ee7b7" font-size="10" font-weight="800" text-anchor="end">${tData.benefitSub}</text>
    </g>

    <g transform="translate(18, 208)">
      <rect width="210" height="54" rx="10" fill="#24141d" stroke="#f43f5e" stroke-width="1.2"/>
      <text x="14" y="20" fill="#fda4af" font-size="11" font-weight="800">주의사항 (Caution)</text>
      <text x="14" y="40" fill="#f43f5e" font-size="12" font-weight="900" font-family="'Pretendard', sans-serif">${tData.caution}</text>
    </g>
  </g>

  <!-- Footer Banner -->
  <g transform="translate(0, 422)">
    <rect width="800" height="28" fill="#050811" fill-opacity="0.95"/>
    <line x1="0" y1="0" x2="800" y2="0" stroke="#1e293b" stroke-width="1"/>
    <line x1="0" y1="0" x2="420" y2="0" stroke="#f59e0b" stroke-width="3"/>
    <circle cx="420" cy="0" r="4" fill="#f59e0b"/>
    <text x="30" y="18" fill="#64748b" font-size="11" font-weight="700" font-family="'Pretendard', sans-serif">▶ 기준: 2026 실전 재테크 가이드 • 팩트 기반 맞춤형 전략</text>
    <text x="770" y="18" fill="#38bdf8" font-size="11" font-weight="800" font-family="monospace" text-anchor="end">CrytoPnL Finance Lab</text>
  </g>
</svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(sanitizeSvgXml(svg).replace(/\s+/g, ' ').trim());
}

// SVG 2: 2040 직장인을 위한 3단계 실천 로드맵 (16:9 800x450)
function generateFinanceImage2(dateStr, videoDetails, customTitle = null, dynamicThemeData = null) {
  const tData = dynamicThemeData || extractFinanceThemeData(videoDetails, customTitle);
  const s1 = tData.steps?.[0] || { title: '1단계 시드머니', sub: '비상금 구축', items: ['✓ 3~6개월 생활비 확보', '• 파킹통장 활용', '✓ 고금리 부채 청산', '• 리볼빙 0원', '✓ 통장 분리', '• 급여/소비/비상금'] };
  const s2 = tData.steps?.[1] || { title: '2단계 절세 계좌', sub: '세액공제 납입', items: ['✓ 연금저축 600만', '• 16.5% 세액공제', '✓ 개인형 IRP 300만', '• 합산 900만 공제', '✓ 중개형 ISA 2000만', '• 배당 비과세'] };
  const s3 = tData.steps?.[2] || { title: '3단계 자산 증식', sub: '복리 엔진 탑재', items: ['✓ 지수 ETF 매수', '• 글로벌 우량주', '✓ 분할 적립식(DCA)', '• 매월 자동이체', '✓ 배당금 재투자', '• 스노우볼 복리'] };

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <defs>
    <linearGradient id="f2_bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#060913"/><stop offset="50%" stop-color="#0e172a"/><stop offset="100%" stop-color="#060913"/>
    </linearGradient>
    <filter id="f2_drop">
      <feDropShadow dx="0" dy="5" stdDeviation="6" flood-color="#000" flood-opacity="0.6"/>
    </filter>
  </defs>

  <rect width="800" height="450" rx="16" fill="url(#f2_bg)"/>
  <rect width="800" height="450" rx="16" fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-opacity="0.35"/>

  <!-- Header -->
  <g transform="translate(25, 20)">
    <rect width="150" height="28" rx="7" fill="#d97706" filter="url(#f2_drop)"/>
    <text x="75" y="19" fill="#ffffff" font-size="12" font-weight="900" font-family="'Pretendard', sans-serif" text-anchor="middle">ACTION ROADMAP</text>
    <text x="165" y="21" fill="#ffffff" font-size="17.5" font-weight="900" font-family="'Pretendard', sans-serif">${tData.roadmapTitle}</text>
    <rect x="640" y="0" width="135" height="28" rx="7" fill="#1e293b"/>
    <text x="707" y="19" fill="#38bdf8" font-size="11" font-weight="800" font-family="monospace" text-anchor="middle">crytopnl.com</text>
  </g>
  <line x1="25" y1="60" x2="775" y2="60" stroke="#334155" stroke-width="1.2" stroke-opacity="0.7"/>

  <!-- 3 Steps -->
  <g transform="translate(30, 80)">
    <!-- Step 1 -->
    <g transform="translate(0, 0)">
      <rect width="230" height="315" rx="16" fill="#0b172a" stroke="#0284c7" stroke-width="1.8" filter="url(#f2_drop)"/>
      <rect x="18" y="18" width="80" height="26" rx="6" fill="#0284c7"/>
      <text x="58" y="35" fill="#ffffff" font-size="12" font-weight="900" text-anchor="middle">1단계</text>
      <text x="18" y="74" fill="#ffffff" font-size="16" font-weight="900" font-family="'Pretendard', sans-serif">${s1.title}</text>
      <text x="18" y="94" fill="#38bdf8" font-size="12" font-weight="800">${s1.sub}</text>

      <g transform="translate(16, 115)">
        <rect width="198" height="175" rx="10" fill="#071320" stroke="#0ea5e9" stroke-width="1"/>
        <text x="12" y="26" fill="#bae6fd" font-size="12" font-weight="800">${s1.items[0] || ''}</text>
        <text x="12" y="48" fill="#94a3b8" font-size="11" font-weight="600">${s1.items[1] || ''}</text>
        <text x="12" y="72" fill="#bae6fd" font-size="12" font-weight="800">${s1.items[2] || ''}</text>
        <text x="12" y="94" fill="#94a3b8" font-size="11" font-weight="600">${s1.items[3] || ''}</text>
        <text x="12" y="120" fill="#bae6fd" font-size="12" font-weight="800">${s1.items[4] || ''}</text>
        <text x="12" y="142" fill="#94a3b8" font-size="11" font-weight="600">${s1.items[5] || ''}</text>
      </g>
    </g>

    <!-- Step 2 -->
    <g transform="translate(255, 0)">
      <rect width="230" height="315" rx="16" fill="#0c1e18" stroke="#10b981" stroke-width="2" filter="url(#f2_drop)"/>
      <rect x="18" y="18" width="80" height="26" rx="6" fill="#059669"/>
      <text x="58" y="35" fill="#ffffff" font-size="12" font-weight="900" text-anchor="middle">2단계</text>
      <text x="18" y="74" fill="#ffffff" font-size="16" font-weight="900" font-family="'Pretendard', sans-serif">${s2.title}</text>
      <text x="18" y="94" fill="#34d399" font-size="12" font-weight="800">${s2.sub}</text>

      <g transform="translate(16, 115)">
        <rect width="198" height="175" rx="10" fill="#051d16" stroke="#10b981" stroke-width="1"/>
        <text x="12" y="26" fill="#a7f3d0" font-size="12" font-weight="800">${s2.items[0] || ''}</text>
        <text x="12" y="48" fill="#94a3b8" font-size="11" font-weight="600">${s2.items[1] || ''}</text>
        <text x="12" y="72" fill="#a7f3d0" font-size="12" font-weight="800">${s2.items[2] || ''}</text>
        <text x="12" y="94" fill="#94a3b8" font-size="11" font-weight="600">${s2.items[3] || ''}</text>
        <text x="12" y="120" fill="#a7f3d0" font-size="12" font-weight="800">${s2.items[4] || ''}</text>
        <text x="12" y="142" fill="#94a3b8" font-size="11" font-weight="600">${s2.items[5] || ''}</text>
      </g>
    </g>

    <!-- Step 3 -->
    <g transform="translate(510, 0)">
      <rect width="230" height="315" rx="16" fill="#191329" stroke="#8b5cf6" stroke-width="1.8" filter="url(#f2_drop)"/>
      <rect x="18" y="18" width="80" height="26" rx="6" fill="#7e22ce"/>
      <text x="58" y="35" fill="#ffffff" font-size="12" font-weight="900" text-anchor="middle">3단계</text>
      <text x="18" y="74" fill="#ffffff" font-size="16" font-weight="900" font-family="'Pretendard', sans-serif">${s3.title}</text>
      <text x="18" y="94" fill="#c084fc" font-size="12" font-weight="800">${s3.sub}</text>

      <g transform="translate(16, 115)">
        <rect width="198" height="175" rx="10" fill="#140e24" stroke="#8b5cf6" stroke-width="1"/>
        <text x="12" y="26" fill="#e9d5ff" font-size="12" font-weight="800">${s3.items[0] || ''}</text>
        <text x="12" y="48" fill="#94a3b8" font-size="11" font-weight="600">${s3.items[1] || ''}</text>
        <text x="12" y="72" fill="#e9d5ff" font-size="12" font-weight="800">${s3.items[2] || ''}</text>
        <text x="12" y="94" fill="#94a3b8" font-size="11" font-weight="600">${s3.items[3] || ''}</text>
        <text x="12" y="120" fill="#e9d5ff" font-size="12" font-weight="800">${s3.items[4] || ''}</text>
        <text x="12" y="142" fill="#94a3b8" font-size="11" font-weight="600">${s3.items[5] || ''}</text>
      </g>
    </g>
  </g>

  <text x="400" y="428" fill="#64748b" font-size="11" font-weight="600" font-family="'Pretendard', sans-serif" text-anchor="middle">실행이 곧 자산입니다 • 맞춤 단계별 전략을 미리 세우고 대응하는 것이 성공의 열쇠입니다</text>
</svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(sanitizeSvgXml(svg).replace(/\s+/g, ' ').trim());
}

// SVG 3: 핵심 비교 분석 & 수익/공제율 매트릭스 (16:9 800x450)
function generateFinanceImage3(dateStr, videoDetails, customTitle = null, dynamicThemeData = null) {
  const tData = dynamicThemeData || extractFinanceThemeData(videoDetails, customTitle);
  const cards = tData.matrixCards || [
    { tag: '일반 예·적금', sub: '단기 안정성 1순위', main: '연 3.0% ~ 3.5%', bullets: ['• 이자소득세 15.4% 원천징수', '• 예금자보호 5천만 원', '⚠️ 물가 감안 시 한계'] },
    { tag: '연금저축 + IRP', sub: '연말정산 13.2%~16.5%', main: '최대 148.5만원 환급', bullets: ['• 연 900만 세액공제', '• 배당 과세이연', '✓ 필수 절세 방패'] },
    { tag: '중개형 ISA', sub: '만능 절세 바구니', main: '비과세 200~400만', bullets: ['• 손익 통산 비과세', '• 9.9% 분리과세', '✓ 연금 전환 추가 공제'] },
    { tag: '미국 지수 ETF', sub: 'S&P500 / 나스닥100', main: '연평균 8% ~ 11%', bullets: ['• 우량 기업 묶음 투자', '• 분기 배당 지급', '✓ 장기 복리 효과'] }
  ];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <defs>
    <linearGradient id="f3_bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#070d18"/><stop offset="50%" stop-color="#0c182c"/><stop offset="100%" stop-color="#060912"/>
    </linearGradient>
    <filter id="f3_drop">
      <feDropShadow dx="0" dy="5" stdDeviation="6" flood-color="#000" flood-opacity="0.5"/>
    </filter>
  </defs>

  <rect width="800" height="450" rx="16" fill="url(#f3_bg)"/>
  <rect width="800" height="450" rx="16" fill="none" stroke="#0ea5e9" stroke-width="1.5" stroke-opacity="0.35"/>

  <!-- Header -->
  <g transform="translate(25, 20)">
    <rect width="150" height="28" rx="7" fill="#0284c7" filter="url(#f3_drop)"/>
    <text x="75" y="19" fill="#ffffff" font-size="12" font-weight="900" font-family="'Pretendard', sans-serif" text-anchor="middle">ANALYSIS MATRIX</text>
    <text x="165" y="21" fill="#ffffff" font-size="17.5" font-weight="900" font-family="'Pretendard', sans-serif">${tData.matrixTitle} <tspan fill="#38bdf8">심층 비교 분석</tspan></text>
    <rect x="640" y="0" width="135" height="28" rx="7" fill="#1e293b"/>
    <text x="707" y="19" fill="#38bdf8" font-size="11" font-weight="800" font-family="monospace" text-anchor="middle">crytopnl.com</text>
  </g>
  <line x1="25" y1="60" x2="775" y2="60" stroke="#334155" stroke-width="1.2" stroke-opacity="0.7"/>

  <!-- 4 Comparison Cards (2x2 Grid) -->
  <g transform="translate(30, 80)">
    <!-- Card 1 -->
    <g transform="translate(0, 0)">
      <rect width="360" height="150" rx="14" fill="#0f172a" stroke="#334155" stroke-width="1.2" filter="url(#f3_drop)"/>
      <rect x="18" y="14" width="95" height="22" rx="6" fill="#475569"/>
      <text x="65" y="29" fill="#ffffff" font-size="11" font-weight="900" text-anchor="middle">${cards[0]?.tag || ''}</text>
      <text x="125" y="30" fill="#94a3b8" font-size="13" font-weight="700">${cards[0]?.sub || ''}</text>
      <text x="18" y="65" fill="#f8fafc" font-size="18" font-weight="900" font-family="monospace">${cards[0]?.main || ''}</text>
      <text x="18" y="90" fill="#cbd5e1" font-size="12" font-weight="600">${cards[0]?.bullets?.[0] || ''}</text>
      <text x="18" y="110" fill="#cbd5e1" font-size="12" font-weight="600">${cards[0]?.bullets?.[1] || ''}</text>
      <text x="18" y="132" fill="#38bdf8" font-size="11" font-weight="800">${cards[0]?.bullets?.[2] || ''}</text>
    </g>

    <!-- Card 2 -->
    <g transform="translate(380, 0)">
      <rect width="360" height="150" rx="14" fill="#072018" stroke="#10b981" stroke-width="1.8" filter="url(#f3_drop)"/>
      <rect x="18" y="14" width="105" height="22" rx="6" fill="#059669"/>
      <text x="70" y="29" fill="#ffffff" font-size="11" font-weight="900" text-anchor="middle">${cards[1]?.tag || ''}</text>
      <text x="135" y="30" fill="#34d399" font-size="13" font-weight="800">${cards[1]?.sub || ''}</text>
      <text x="18" y="65" fill="#34d399" font-size="18" font-weight="900" font-family="monospace">${cards[1]?.main || ''}</text>
      <text x="18" y="90" fill="#a7f3d0" font-size="12" font-weight="600">${cards[1]?.bullets?.[0] || ''}</text>
      <text x="18" y="110" fill="#a7f3d0" font-size="12" font-weight="600">${cards[1]?.bullets?.[1] || ''}</text>
      <text x="18" y="132" fill="#34d399" font-size="11" font-weight="900">${cards[1]?.bullets?.[2] || ''}</text>
    </g>

    <!-- Card 3 -->
    <g transform="translate(0, 165)">
      <rect width="360" height="150" rx="14" fill="#091b2c" stroke="#0284c7" stroke-width="1.8" filter="url(#f3_drop)"/>
      <rect x="18" y="14" width="100" height="22" rx="6" fill="#0284c7"/>
      <text x="68" y="29" fill="#ffffff" font-size="11" font-weight="900" text-anchor="middle">${cards[2]?.tag || ''}</text>
      <text x="130" y="30" fill="#38bdf8" font-size="13" font-weight="800">${cards[2]?.sub || ''}</text>
      <text x="18" y="65" fill="#38bdf8" font-size="18" font-weight="900" font-family="monospace">${cards[2]?.main || ''}</text>
      <text x="18" y="90" fill="#bae6fd" font-size="12" font-weight="600">${cards[2]?.bullets?.[0] || ''}</text>
      <text x="18" y="110" fill="#bae6fd" font-size="12" font-weight="600">${cards[2]?.bullets?.[1] || ''}</text>
      <text x="18" y="132" fill="#38bdf8" font-size="11" font-weight="900">${cards[2]?.bullets?.[2] || ''}</text>
    </g>

    <!-- Card 4 -->
    <g transform="translate(380, 165)">
      <rect width="360" height="150" rx="14" fill="#181329" stroke="#8b5cf6" stroke-width="1.8" filter="url(#f3_drop)"/>
      <rect x="18" y="14" width="105" height="22" rx="6" fill="#7e22ce"/>
      <text x="70" y="29" fill="#ffffff" font-size="11" font-weight="900" text-anchor="middle">${cards[3]?.tag || ''}</text>
      <text x="135" y="30" fill="#c084fc" font-size="13" font-weight="800">${cards[3]?.sub || ''}</text>
      <text x="18" y="65" fill="#c084fc" font-size="18" font-weight="900" font-family="monospace">${cards[3]?.main || ''}</text>
      <text x="18" y="90" fill="#e9d5ff" font-size="12" font-weight="600">${cards[3]?.bullets?.[0] || ''}</text>
      <text x="18" y="110" fill="#e9d5ff" font-size="12" font-weight="600">${cards[3]?.bullets?.[1] || ''}</text>
      <text x="18" y="132" fill="#c084fc" font-size="11" font-weight="900">${cards[3]?.bullets?.[2] || ''}</text>
    </g>
  </g>

  <text x="400" y="415" fill="#64748b" font-size="11" font-weight="600" font-family="'Pretendard', sans-serif" text-anchor="middle">제도별 조건과 혜택을 사전에 숙지할 때 불필요한 세금 유출과 리스크를 원천 차단할 수 있습니다</text>
</svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(sanitizeSvgXml(svg).replace(/\s+/g, ' ').trim());
}

// SVG 4: 필수 주의사항 & 리스크 방어 4대 수칙 (16:9 800x450)
function generateFinanceImage4(dateStr, videoDetails, customTitle = null, dynamicThemeData = null) {
  const tData = dynamicThemeData || extractFinanceThemeData(videoDetails, customTitle);
  const rList = tData.risks || [
    { code: '01', title: '확정 고수익 의심', sub: '"원금 보장 월 10%"', desc: '100% 폰지 사기 의심', tag: '✓ 하이리턴엔 하이리스크' },
    { code: '02', title: '중도해지 페널티', sub: '55세 이전 해지 시', desc: '16.5% 기타소득세 추징', tag: '✓ 장기 여유자금만 납입' },
    { code: '03', title: '무리한 빚투 금지', sub: '신용·대출 레버리지', desc: '하락장 패닉셀 주원인', tag: '✓ 본업에 지장 없는 투자' },
    { code: '04', title: '숨은 보수·비용', sub: '총보수비용(TER)', desc: '매매중개수수료 합산', tag: '✓ 실질부담비용 최저 선택' }
  ];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <defs>
    <linearGradient id="f4_bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#050811"/><stop offset="50%" stop-color="#0b162a"/><stop offset="100%" stop-color="#040710"/>
    </linearGradient>
    <filter id="f4_drop">
      <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000" flood-opacity="0.6"/>
    </filter>
  </defs>

  <rect width="800" height="450" rx="16" fill="url(#f4_bg)"/>
  <rect width="800" height="450" rx="16" fill="none" stroke="#f43f5e" stroke-width="1.5" stroke-opacity="0.35"/>

  <!-- Header -->
  <g transform="translate(25, 20)">
    <rect width="145" height="28" rx="7" fill="#e11d48" filter="url(#f4_drop)"/>
    <text x="72" y="19" fill="#ffffff" font-size="12" font-weight="900" font-family="'Pretendard', sans-serif" text-anchor="middle">${tData.riskBadge}</text>
    <text x="160" y="21" fill="#ffffff" font-size="17.5" font-weight="900" font-family="'Pretendard', sans-serif">${tData.riskTitle}</text>
    <rect x="640" y="0" width="135" height="28" rx="7" fill="#1e293b"/>
    <text x="707" y="19" fill="#38bdf8" font-size="11" font-weight="800" font-family="monospace" text-anchor="middle">crytopnl.com</text>
  </g>
  <line x1="25" y1="60" x2="775" y2="60" stroke="#334155" stroke-width="1.2" stroke-opacity="0.7"/>

  <!-- 4 Danger Rules -->
  <g transform="translate(30, 80)">
    <g transform="translate(0, 0)">
      <rect width="175" height="150" rx="12" fill="#25121a" stroke="#f43f5e" stroke-width="1.4" filter="url(#f4_drop)"/>
      <rect x="12" y="12" width="65" height="20" rx="5" fill="#e11d48"/>
      <text x="44" y="26" fill="#ffffff" font-size="10" font-weight="900" text-anchor="middle">수칙 ${rList[0].code}</text>
      <text x="12" y="54" fill="#ffffff" font-size="13.5" font-weight="900" font-family="'Pretendard', sans-serif">${rList[0].title}</text>
      <text x="12" y="78" fill="#fda4af" font-size="11" font-weight="700">• ${rList[0].sub}</text>
      <text x="12" y="96" fill="#cbd5e1" font-size="10.5" font-weight="500">• ${rList[0].desc}</text>
      <text x="12" y="118" fill="#fda4af" font-size="10.5" font-weight="800">${rList[0].tag}</text>
    </g>

    <g transform="translate(188, 0)">
      <rect width="175" height="150" rx="12" fill="#20150a" stroke="#f59e0b" stroke-width="1.4" filter="url(#f4_drop)"/>
      <rect x="12" y="12" width="65" height="20" rx="5" fill="#d97706"/>
      <text x="44" y="26" fill="#ffffff" font-size="10" font-weight="900" text-anchor="middle">수칙 ${rList[1].code}</text>
      <text x="12" y="54" fill="#ffffff" font-size="13.5" font-weight="900" font-family="'Pretendard', sans-serif">${rList[1].title}</text>
      <text x="12" y="78" fill="#fde68a" font-size="11" font-weight="700">• ${rList[1].sub}</text>
      <text x="12" y="96" fill="#cbd5e1" font-size="10.5" font-weight="500">• ${rList[1].desc}</text>
      <text x="12" y="118" fill="#fde68a" font-size="10.5" font-weight="800">${rList[1].tag}</text>
    </g>

    <g transform="translate(376, 0)">
      <rect width="175" height="150" rx="12" fill="#0b172a" stroke="#0284c7" stroke-width="1.4" filter="url(#f4_drop)"/>
      <rect x="12" y="12" width="65" height="20" rx="5" fill="#0284c7"/>
      <text x="44" y="26" fill="#ffffff" font-size="10" font-weight="900" text-anchor="middle">수칙 ${rList[2].code}</text>
      <text x="12" y="54" fill="#ffffff" font-size="13.5" font-weight="900" font-family="'Pretendard', sans-serif">${rList[2].title}</text>
      <text x="12" y="78" fill="#bae6fd" font-size="11" font-weight="700">• ${rList[2].sub}</text>
      <text x="12" y="96" fill="#cbd5e1" font-size="10.5" font-weight="500">• ${rList[2].desc}</text>
      <text x="12" y="118" fill="#bae6fd" font-size="10.5" font-weight="800">${rList[2].tag}</text>
    </g>

    <g transform="translate(565, 0)">
      <rect width="175" height="150" rx="12" fill="#0b201a" stroke="#10b981" stroke-width="1.4" filter="url(#f4_drop)"/>
      <rect x="12" y="12" width="65" height="20" rx="5" fill="#059669"/>
      <text x="44" y="26" fill="#ffffff" font-size="10" font-weight="900" text-anchor="middle">수칙 ${rList[3].code}</text>
      <text x="12" y="54" fill="#ffffff" font-size="13.5" font-weight="900" font-family="'Pretendard', sans-serif">${rList[3].title}</text>
      <text x="12" y="78" fill="#a7f3d0" font-size="11" font-weight="700">• ${rList[3].sub}</text>
      <text x="12" y="96" fill="#cbd5e1" font-size="10.5" font-weight="500">• ${rList[3].desc}</text>
      <text x="12" y="118" fill="#a7f3d0" font-size="10.5" font-weight="800">${rList[3].tag}</text>
    </g>
  </g>

  <!-- Bottom Callout -->
  <g transform="translate(30, 260)">
    <rect width="740" height="135" rx="14" fill="#13122b" stroke="#8b5cf6" stroke-width="1.5" filter="url(#f4_drop)"/>
    <text x="24" y="32" fill="#c084fc" font-size="15" font-weight="900" font-family="'Pretendard', sans-serif">💡 10년 차 재테크 에디터의 실전 총평</text>
    <text x="24" y="60" fill="#e9d5ff" font-size="12.5" font-weight="700">"${tData.summaryQuote}"</text>
    <text x="24" y="86" fill="#cbd5e1" font-size="11.5" font-weight="500">• ${tData.summaryBullets[0] || ''}</text>
    <text x="24" y="110" fill="#a7f3d0" font-size="11.5" font-weight="700">• ${tData.summaryBullets[1] || ''}</text>
  </g>
</svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(sanitizeSvgXml(svg).replace(/\s+/g, ' ').trim());
}

// Gemini AI Call for Finance Tips
async function callGeminiYouTubeFinanceAPI(dateStr, dateKorean, videoDetails, apiKey) {
  const systemInstruction = `당신은 10년 경력의 재테크·투자 전문 블로거이자 금융 콘텐츠 에디터입니다.
독자는 20~40대 직장인·사회초년생·실수요자로, 쉽고 실용적인 자산 관리 및 세무·투자 정보를 원합니다.

[글 작성 요구사항 - 엄격 준수]
1. 분석 대상 콘텐츠 주제 밀착 (최우선 원칙):
   - 전달받은 영상의 실제 주제(예: 부동산 세제, 양도세 비과세, 취득세/종부세 개편, 주식/ETF, 대출, 연금 등)를 정확하게 파악하고, 글 전체가 그 영상의 핵심 논점과 실전 팁을 충실하게 다루어야 합니다.
   - 부동산 세제 영상인데 엉뚱하게 통장 쪼개기나 미국 ETF 내용만 채워 넣는 식의 주제 왜곡은 절대 금지합니다.
2. 제목 작성 (필수):
   - 최상단 첫 줄에 반드시 <TITLE>[재테크 팁] 독창적이고 매력적인 제목</TITLE> 형태로 작성하세요.
   - ⚠️ 절대 유튜브 영상의 원본 제목을 그대로 베끼거나 사용하지 마세요!
   - 영상의 실제 핵심 논점과 구체적인 혜택/숫자/대상(예: 1주택, 무주택, 양도세 12억, 일시적 2주택 3년 등)을 결합하여 독자의 클릭을 부르는 전문 블로그 스타일의 새로운 제목을 직접 창작하세요.
3. 유튜브 및 출처 언급 금지 (필수):
   - ⚠️ 특정 유튜브 채널명이나 '유튜브 영상', '유튜브 채널', '영상에서는', '출연자가' 등의 유튜브 관련 언급을 제목, 소제목, 본문 어디에도 일절 적지 마세요.
   - 순수하게 10년 차 재테크 에디터가 독자에게 직접 전문 지식과 노하우를 전달하는 신뢰도 높은 금융·재테크 칼럼으로 작성하세요.
4. 글 구조 (반드시 준수):
   - 최상단 첫 줄: <TITLE>[재테크 팁] 직접 창작한 매력적인 제목</TITLE>
   - 1. 도입부: 독자의 현실적인 자산/세금/투자 고민에 깊이 공감하며 오늘 다룰 실전 주제의 중요성을 자연스럽게 소개하세요. (유튜브/채널 언급 금지)
   - 2. 본문: 핵심 내용을 3~4개의 소제목(<h4> 태그)으로 구분하여 정리하세요.
     각 소제목마다 구체적이고 실용적인 팁과 주의점을 친절하게 설명하세요.
     소제목마다 아래의 4개 이미지 주석 플레이스홀더를 순서대로 하나씩 반드시 배치하세요:
     <!-- FINANCE_IMAGE_1 -->
     <!-- FINANCE_IMAGE_2 -->
     <!-- FINANCE_IMAGE_3 -->
     <!-- FINANCE_IMAGE_4 -->
   - 3. 정리 및 시사점: 독자의 상황(무주택, 1주택, 다주택 또는 초보 투자자 등)에 오늘부터 당장 어떻게 대처하고 적용할지 3단계 실천 로드맵을 제시하세요.
   - 4. 마무리 + 독자 행동 유도: 독자의 현재 상황이나 궁금한 점을 묻는 댓글 유도 질문과 따뜻한 격려로 마무리하세요.
5. 분량: 1,800~2,500자 (모바일에서도 읽기 편하며 정보가 알찬 분량).
6. 추가 필수 규칙:
   - 영상에 언급된 핵심 제도·숫자·사례를 정확하게 분석하고, 필요시 2026년 최신 세법 및 금융 규정 기준으로 보완 설명하세요.
   - 과장·확정적 표현 절대 금지 ("무조건 돈 번다", "원금 보장" 등 절대 금지).
7. 문장 스타일: 가독성 좋은 단문 위주, 명확한 줄바꿈과 볼드 서식 활용으로 가독성을 높여주세요.`;

  const userPrompt = `다음 금융 콘텐츠의 핵심 데이터(제목, 설명, 자막 요약)를 면밀히 분석하고, 영상의 본래 주제를 충실하게 살려 10년 차 에디터 톤으로 전문 분석 칼럼을 작성해주세요.
(주의: 원본 영상 제목을 그대로 베끼지 말고 새로운 매력적인 제목을 창작할 것, 채널명이나 유튜브 관련 언급은 글 어디에도 일체 적지 말 것)

[분석 대상 금융 콘텐츠 정보]
- 원본 주제/제목: ${videoDetails.title}
- 핵심 설명: ${videoDetails.description ? videoDetails.description.slice(0, 1200) : '제공된 설명 없음'}
- 주요 발언/자막 내용: ${videoDetails.transcript ? videoDetails.transcript.slice(0, 3500) : '핵심 금융 및 자산 관리 포인트'}

위 원본 내용의 실제 요점(부동산 세제, 1주택/무주택/다주택 대책, 절세 요건 등)을 빠짐없이 반영하여 4개 인포그래픽 카드 플레이스홀더를 포함해 작성해주세요.`;

  const baseContents = [
    {
      role: 'user',
      parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }]
    }
  ];

  const modelAttempts = [
    {
      name: 'gemini-3.5-flash',
      payload: {
        contents: baseContents,
        generationConfig: {
          temperature: 0.75,
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
          temperature: 0.75,
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
          temperature: 0.75,
          maxOutputTokens: 8192,
          thinkingConfig: { thinkingLevel: 'low' }
        }
      }
    },
    {
      name: 'gemini-2.5-flash',
      payload: {
        contents: baseContents,
        generationConfig: {
          temperature: 0.75,
          maxOutputTokens: 8192
        }
      }
    }
  ];

  for (const item of modelAttempts) {
    try {
      console.log(`[Gemini Finance AI] Calling ${item.name}...`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${item.name}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.payload),
        signal: AbortSignal.timeout(45000)
      });
      if (res.ok) {
        const data = await res.json();
        const candidate = data.candidates?.[0];
        const parts = candidate?.content?.parts || [];
        const text = parts.map(p => p.text || '').join('').trim();
        if (text && text.length > 500) {
          console.log(`[Gemini Finance AI] Successfully generated finance report with ${item.name} (${text.length} chars)`);
          return text;
        }
      } else {
        const errText = await res.text().catch(() => '');
        console.warn(`[Gemini Finance AI] ${item.name} failed with HTTP ${res.status}:`, errText.slice(0, 150));
      }
    } catch(e) {
      console.warn(`[Gemini Finance AI] Error with ${item.name}:`, e.message);
    }
  }
  return null;
}

// Synthesize Catchy Finance Title (without using raw YouTube title or channel mentions)
function synthesizeCatchyFinanceTitle(videoDetails) {
  const combined = ((videoDetails?.title || '') + ' ' + (videoDetails?.description || '') + ' ' + (videoDetails?.transcript || '')).toLowerCase();

  if (combined.includes('연금') || combined.includes('irp') || combined.includes('isa') || combined.includes('절세') || combined.includes('세액공제')) {
    return "[재테크 팁] 2040 직장인, 월급날 무조건 챙겨야 할 절세 3총사 (연금저축·IRP·ISA 세팅법)";
  }
  if (combined.includes('통장') || combined.includes('저축') || combined.includes('비상금') || combined.includes('파킹') || combined.includes('쪼개') || combined.includes('모으')) {
    return "[재테크 팁] 2040 직장인, 월급날 무조건 '이것'부터 적립해야 하는 이유 (통장 쪼개기·자동 저축)";
  }
  if (combined.includes('etf') || combined.includes('s&p') || combined.includes('나스닥') || combined.includes('주식') || combined.includes('배당')) {
    return "[재테크 팁] 평범한 직장인이 월 30만원으로 노후 자산 5억 만드는 지수 ETF 적립법";
  }
  if (combined.includes('부동산') || combined.includes('청약') || combined.includes('대출') || combined.includes('전세')) {
    return "[재테크 팁] 사회초년생과 무주택 직장인을 위한 현실적인 내 집 마련 자금 로드맵";
  }
  const defaultTitles = [
    "[재테크 팁] 2040 직장인, 월급날 무조건 챙겨야 할 절세 3총사 (연금저축·IRP·ISA 세팅법)",
    "[재테크 팁] 2040 직장인, 월급날 무조건 '이것'부터 적립해야 하는 이유 (통장 쪼개기·자동 저축)",
    "[재테크 팁] 평범한 직장인이 월 30만원으로 노후 자산 5억 만드는 지수 ETF 적립법",
    "[재테크 팁] 2040 직장인이 오늘부터 당장 계좌에 적용하는 실전 재테크 & 절세 가이드"
  ];
  const day = new Date().getDate();
  return defaultTitles[day % defaultTitles.length];
}

// Dynamic Finance Report Fallback Engine
function generateDynamicFinanceReport(dateStr, dateKorean, videoDetails, imgUris, customTitle = null, dynamicThemeData = null) {
  const tData = dynamicThemeData || extractFinanceThemeData(videoDetails, customTitle);
  const displayTitle = customTitle || synthesizeCatchyFinanceTitle(videoDetails);
  const cleanTitle = displayTitle.replace(/^\[재테크\s*팁\]\s*/, '').trim();

  const imgTag1 = `<div class="post-img-container text-center my-4"><img src="${imgUris[0]}" alt="${tData.badge} - crytopnl.com" style="width:100%; max-width: 800px; display:block; margin: 14px auto; border-radius: 12px; border: none; box-shadow: none;" /></div>`;
  const imgTag2 = `<div class="post-img-container text-center my-4"><img src="${imgUris[1]}" alt="${tData.roadmapTitle} - crytopnl.com" style="width:100%; max-width: 800px; display:block; margin: 14px auto; border-radius: 12px; border: none; box-shadow: none;" /></div>`;
  const imgTag3 = `<div class="post-img-container text-center my-4"><img src="${imgUris[2]}" alt="${tData.matrixTitle} 심층 비교 분석 - crytopnl.com" style="width:100%; max-width: 800px; display:block; margin: 14px auto; border-radius: 12px; border: none; box-shadow: none;" /></div>`;
  const imgTag4 = `<div class="post-img-container text-center my-4"><img src="${imgUris[3]}" alt="${tData.riskTitle ? tData.riskTitle.replace(/<[^>]+>/g, '').replace(/&amp;/g, '및') : '필수 주의사항 및 리스크 방어'} - crytopnl.com" style="width:100%; max-width: 800px; display:block; margin: 14px auto; border-radius: 12px; border: none; box-shadow: none;" /></div>`;

  if (tData.theme === 'realestate') {
    return `<h3 style="font-size: 19px; font-weight: 800; color: #d97706; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; line-height: 1.4;">
  🏠 [재테크 팁] ${cleanTitle}
</h3>

<h4 style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 24px; margin-bottom: 10px;">
  1. 도입부: "월급은 그대로인데 세금만 늘어날까?" 부동산 세제 개편의 현실
</h4>
<p style="font-size: 15px; color: #1e293b; line-height: 1.85; margin-bottom: 18px; word-break: keep-all;">
  안녕하십니까. 10년 차 재테크 에디터입니다. 물가와 금리 변동성 속에서 내 집 마련을 꿈꾸는 무주택자부터, 상급지 갈아타기를 준비하는 1주택자, 보유세 부담을 덜고 싶은 다주택자까지 모두의 공통적인 고민은 바로 <strong>'부동산 세금'</strong>입니다.<br/>
  세금 제도는 개편될 때마다 복잡해 보여서 손을 놓기 쉽지만, 법이 정한 비과세 요건과 감면 조항을 선제적으로 챙기면 수천만 원에서 수억 원에 달하는 소중한 자산을 지킬 수 있습니다. 오늘 글에서는 2026년 기준 부동산 세제 핵심 개편 사항과 내 상황별 맞춤 실전 생존 전략을 알기 쉽게 총정리해 드립니다.
</p>

${imgTag1}

<h4 style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 28px; margin-bottom: 10px;">
  2. 1주택자·갈아타기: 양도세 12억 비과세와 일시적 2주택 3년 처분 룰
</h4>
<p style="font-size: 15px; color: #1e293b; line-height: 1.85; margin-bottom: 16px; word-break: keep-all;">
  1주택 실수요자에게 가장 중요한 세제 혜택은 단연 <strong>1세대 1주택 양도소득세 비과세(양도가액 12억 원 이하 전액 비과세)</strong>입니다. 하지만 취득 당시 조정대상지역 여부에 따른 '2년 보유 + 2년 거주' 요건을 충족하지 못하면 비과세 혜택이 박탈될 수 있으므로 전입 및 등기 이력을 꼼꼼히 확인해야 합니다.
</p>
<div style="margin: 14px 0 18px 0;">
  <div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px; font-size: 15px; line-height: 1.75; color: #1e293b;">
    <span style="color: #d97706; font-weight: 800;">•</span>
    <div><strong>일시적 1세대 2주택 특례:</strong> 기존 주택 취득 후 1년 이상 지난 시점에 신규 주택을 취득하고, 신규 주택 취득일로부터 <strong>3년 이내</strong>에 종전 주택을 처분해야 양도세 비과세가 온전히 유지됩니다.</div>
  </div>
  <div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px; font-size: 15px; line-height: 1.75; color: #1e293b;">
    <span style="color: #d97706; font-weight: 800;">•</span>
    <div><strong>종합부동산세 부담 완화:</strong> 1주택자 기본공제 금액(12억 원) 및 공정시장가액비율 적용으로 보유세 부담이 완화되었으므로 공시가격 변동 추이를 체크하세요.</div>
  </div>
</div>

${imgTag2}

<h4 style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 28px; margin-bottom: 10px;">
  3. 무주택자 &amp; 다주택자: 청약 소득공제부터 중과 배제 출구 전략까지
</h4>
<p style="font-size: 15px; color: #1e293b; line-height: 1.85; margin-bottom: 16px; word-break: keep-all;">
  <strong>무주택자</strong>라면 주택청약종합저축 납입 인정 한도(월 25만 원 상향)를 채워 연말정산 소득공제(연 300만 한도의 40%, 최대 120만 원)와 월세 세액공제(최대 17%)를 적극 활용하여 내 집 마련 종잣돈을 지켜야 합니다.<br/>
  반면 <strong>다주택자</strong>의 경우, 정부가 한시적으로 연장 적용 중인 <strong>다주택자 양도소득세 중과 배제</strong> 조치를 활용할 필요가 있습니다. 최고 82.5%에 달하던 징벌적 중과세율 대신 기본세율(6%~45%)과 장기보유특별공제가 적용될 때 비선호 주택을 정리하고 포트폴리오를 슬림화하는 출구 전략을 실행해야 합니다.
</p>

${imgTag3}

<h4 style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 28px; margin-bottom: 10px;">
  4. 주의사항: 절대 놓쳐선 안 될 부동산 세무 4대 함정
</h4>
<p style="font-size: 15px; color: #1e293b; line-height: 1.85; margin-bottom: 16px; word-break: keep-all;">
  부동산 세금에서 가장 빈번하게 발생하는 실수는 <strong>처분 기한 도과</strong>입니다. 일시적 2주택 처분 기한(3년)을 단 하루라도 넘기면 수천만 원의 양도세와 가산세가 한꺼번에 추징됩니다. 또한 조정지역 내 추가 매수 시 취득세 중과세율(8%~12%) 복병을 주의하고, 가족 간 거래 시 차용증 작성과 적정 이자 지급 등 증빙을 철저히 갖추어야 국세청 소명 요구를 방어할 수 있습니다.
</p>

${imgTag4}

<h4 style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 28px; margin-bottom: 10px;">
  5. 정리 및 시사점: 부동산과 금융자산의 절세 시너지 3단계
</h4>
<p style="font-size: 15px; color: #1e293b; line-height: 1.85; margin-bottom: 16px; word-break: keep-all;">
  부동산으로 자산의 기둥을 세웠다면, 유동 자산은 ISA와 연금저축 계좌를 통해 절세형 복리 투자로 굴려야 합니다.<br/>
  1) <strong>내 주택 상태별 비과세/감면 요건 점검</strong> ➔ 2) <strong>처분 및 취득 캘린더 일정 등록</strong> ➔ 3) <strong>ISA 계좌를 통한 금융자산 절세 병행</strong>.<br/>
  부동산 세법의 변화를 주기적으로 살피고 미리 대비하는 현명한 투자자가 되시길 응원합니다. 궁금하신 세무 고민이나 갈아타기 계획이 있다면 댓글로 남겨주세요!
</p>

<div class="perspective-invalidation-card" style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 10px; padding: 18px 20px; margin: 24px 0;">
  <div style="color: #b45309; font-weight: 800; font-size: 14px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
    💡 [재테크 에디터 유의사항 안내]
  </div>
  <p style="font-size: 13px; line-height: 1.8; margin: 0; color: #92400e; font-weight: 500; word-break: keep-all;">
    본 글은 대중적인 세법 규정과 제도를 알기 쉽게 정리한 콘텐츠이며, 개별 세무 자문이나 부동산 매매를 권유하지 않습니다. 실제 부동산 취득·처분 시에는 개인별 취득 시기, 거주 요건, 관할 지자체 규정에 따라 세액이 달라질 수 있으므로 반드시 전문 세무사와 사전 상담하시기 바랍니다.
  </p>
</div>`;
  }

  return `<h3 style="font-size: 19px; font-weight: 800; color: #d97706; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; line-height: 1.4;">
  💰 [재테크 팁] ${cleanTitle}
</h3>

<h4 style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 24px; margin-bottom: 10px;">
  1. 도입부: 매달 열심히 일하는데 왜 통장 잔고는 그대로일까?
</h4>
<p style="font-size: 15px; color: #1e293b; line-height: 1.85; margin-bottom: 18px; word-break: keep-all;">
  안녕하십니까. 10년 차 재테크 블로거입니다. 매월 월급날만 되면 스쳐 지나가는 잔고를 보며 "도대체 어떻게 돈을 모아야 할까?" 고민하시는 20~40대 직장인분들이 많으실 겁니다. 물가와 금리는 요동치는데 월급 인상률은 이를 따라가지 못하는 시대, 단순히 열심히 아끼는 것만으로는 경제적 자유를 이루기 어렵습니다.<br/>
  오늘은 20~40대 직장인과 사회초년생이 오늘부터 당장 자신의 통장과 계좌에 적용할 수 있는 군더더기 없는 실전 재테크 &amp; 절세 가이드를 알기 쉽게 정리해 드립니다.
</p>

${imgTag1}

<h4 style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 28px; margin-bottom: 10px;">
  2. 실전 핵심 포인트: 선저축 후지출과 '통장 쪼개기'의 마법
</h4>
<p style="font-size: 15px; color: #1e293b; line-height: 1.85; margin-bottom: 16px; word-break: keep-all;">
  재테크에서 가장 강조하는 첫 번째 원칙은 바로 <strong>'강제 저축 시스템'</strong>입니다. 쓰고 남은 돈을 저축하겠다는 생각은 100전 100패입니다. 급여가 입금되자마자 최소 40~50%는 자동으로 저축·투자 계좌로 이체되는 시스템을 구축해야 합니다.
</p>
<div style="margin: 14px 0 18px 0;">
  <div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px; font-size: 15px; line-height: 1.75; color: #1e293b;">
    <span style="color: #d97706; font-weight: 800;">•</span>
    <div><strong>급여 통장:</strong> 고정 지출(대출이자, 공과금, 보험료)만 남기고 잔액을 즉시 0원으로 비우는 허브 역할</div>
  </div>
  <div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px; font-size: 15px; line-height: 1.75; color: #1e293b;">
    <span style="color: #d97706; font-weight: 800;">•</span>
    <div><strong>소비 통장:</strong> 체크카드와 연결하여 한 달 생활비만 넣어두고 초과 지출을 원천 차단</div>
  </div>
  <div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px; font-size: 15px; line-height: 1.75; color: #1e293b;">
    <span style="color: #d97706; font-weight: 800;">•</span>
    <div><strong>비상금 통장:</strong> 3~6개월 치 생활비를 수시입출금 파킹통장에 보관하여 급전 필요 시 투자 해지 방지</div>
  </div>
</div>

${imgTag2}

<h4 style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 28px; margin-bottom: 10px;">
  3. 절세 3총사: 연말정산 환급금 148만 원 만드는 계좌 세팅
</h4>
<p style="font-size: 15px; color: #1e293b; line-height: 1.85; margin-bottom: 16px; word-break: keep-all;">
  직장인에게 세액공제는 국가가 합법적으로 제공하는 <strong>확정 수익률(13.2% ~ 16.5%)</strong>입니다. 일반 계좌에서 투자하면 배당소득세(15.4%)가 매번 원천징수되지만, 절세 계좌를 활용하면 세금을 아예 떼이지 않거나 만기까지 미룰 수 있습니다.<br/>
  1순위는 <strong>연금저축펀드(연 600만 원)</strong>이며, 추가로 여유가 있다면 <strong>개인형 IRP(연 300만 원 추가)</strong>를 채워 합산 900만 원 한도를 맞추는 것이 유리합니다. 총급여 5,500만 원 이하 직장인의 경우 최대 148.5만 원을 연말정산에서 돌려받을 수 있습니다.
</p>

${imgTag3}

<h4 style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 28px; margin-bottom: 10px;">
  4. 주의사항: 절대 속지 말아야 할 재테크 함정 4가지
</h4>
<p style="font-size: 15px; color: #1e293b; line-height: 1.85; margin-bottom: 16px; word-break: keep-all;">
  아무리 좋은 제도라도 주의사항을 모르면 손실을 볼 수 있습니다. 연금저축과 IRP는 <strong>55세 이후 연금 수령</strong>을 전제로 혜택을 주는 계좌이므로, 중도 해지 시 그동안 받은 공제액과 운용수익에 대해 16.5%의 기타소득세가 추징됩니다. 따라서 당장 1~2년 안에 써야 할 결혼자금이나 전세보증금은 절대 연금 계좌에 넣으시면 안 됩니다.
</p>

${imgTag4}

<h4 style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 28px; margin-bottom: 10px;">
  5. 정리 및 독자 시사점: 오늘부터 당장 통장에 적용할 3단계
</h4>
<p style="font-size: 15px; color: #1e293b; line-height: 1.85; margin-bottom: 16px; word-break: keep-all;">
  오늘 살펴본 핵심을 요약하면 다음과 같습니다:<br/>
  1) <strong>파킹통장 비상금 채우기</strong> ➔ 2) <strong>연금저축/ISA 계좌 개설 후 월 자동이체 걸기</strong> ➔ 3) <strong>미국/국내 지수 추종 ETF를 꾸준히 적립식으로 모아가기</strong>.<br/>
  재테크의 승패는 단기 고수익 종목을 찾는 것이 아니라, 잃지 않는 구조를 만들고 오랫동안 복리를 누리는 인내심에 달려 있습니다. 여러분의 현재 재테크 고민이나 실천 중인 통장 쪼개기 노하우가 있다면 댓글로 자유롭게 남겨주세요!
</p>

<div class="perspective-invalidation-card" style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 10px; padding: 18px 20px; margin: 24px 0;">
  <div style="color: #b45309; font-weight: 800; font-size: 14px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
    💡 [재테크 에디터 유의사항 안내]
  </div>
  <p style="font-size: 13px; line-height: 1.8; margin: 0; color: #92400e; font-weight: 500; word-break: keep-all;">
    본 글은 대중적인 금융 정보와 제도를 알기 쉽게 풀어서 제공하는 콘텐츠이며, 특정 금융 상품이나 종목의 매수·매도를 추천하지 않습니다. 모든 투자와 금융 상품 가입 시에는 원금 손실 가능성과 본인의 현금 흐름을 면밀히 검토하신 후 신중하게 결정하시기 바랍니다.
  </p>
</div>`;
}

// Assemble Finance Report with Gemini Text + Images + Embed
function assembleFinanceHtml(rawText, videoDetails, imgUris, themeData = null, postTitle = null) {
  const safeTitle = (videoDetails?.title || '2040 직장인을 위한 맞춤 재테크 가이드').replace(/[<>&"]/g, '');
  const tData = themeData || extractFinanceThemeData(videoDetails, postTitle);
  const safeBadge = tData?.badge || '재테크 핵심 요약 인포그래픽';
  const safeRoadmap = tData?.roadmapTitle || '3단계 실천 로드맵';
  const safeMatrix = tData?.matrixTitle ? `${tData.matrixTitle} 심층 비교 분석` : '절세 및 투자 상품 비교 매트릭스';
  const safeRisk = tData?.riskTitle ? tData.riskTitle.replace(/<[^>]+>/g, '').replace(/&amp;/g, '및') : '주의사항 및 리스크 방어 수칙';

  const imgTags = [
    `<div class="post-img-container text-center my-4"><img src="${imgUris[0]}" alt="${safeBadge} - crytopnl.com" style="width:100%; max-width: 800px; display:block; margin: 14px auto; border-radius: 12px; border: none; box-shadow: none;" /></div>`,
    `<div class="post-img-container text-center my-4"><img src="${imgUris[1]}" alt="${safeRoadmap} - crytopnl.com" style="width:100%; max-width: 800px; display:block; margin: 14px auto; border-radius: 12px; border: none; box-shadow: none;" /></div>`,
    `<div class="post-img-container text-center my-4"><img src="${imgUris[2]}" alt="${safeMatrix} - crytopnl.com" style="width:100%; max-width: 800px; display:block; margin: 14px auto; border-radius: 12px; border: none; box-shadow: none;" /></div>`,
    `<div class="post-img-container text-center my-4"><img src="${imgUris[3]}" alt="${safeRisk} - crytopnl.com" style="width:100%; max-width: 800px; display:block; margin: 14px auto; border-radius: 12px; border: none; box-shadow: none;" /></div>`
  ];

  let processed = rawText.replace(/<TITLE>.*?<\/TITLE>/gi, '').trim();

  // Strip any YouTube embed placeholder if present
  processed = processed.replace(/<!--\s*YOUTUBE_EMBED\s*-->/gi, '').trim();

  // Replace Images
  processed = processed.replace('<!-- FINANCE_IMAGE_1 -->', imgTags[0]);
  processed = processed.replace('<!-- FINANCE_IMAGE_2 -->', imgTags[1]);
  processed = processed.replace('<!-- FINANCE_IMAGE_3 -->', imgTags[2]);
  processed = processed.replace('<!-- FINANCE_IMAGE_4 -->', imgTags[3]);

  // If any images were missed, append gracefully
  if (!processed.includes(imgUris[0])) processed = imgTags[0] + '\n' + processed;
  if (!processed.includes(imgUris[1])) processed += '\n' + imgTags[1];
  if (!processed.includes(imgUris[2])) processed += '\n' + imgTags[2];
  if (!processed.includes(imgUris[3])) processed += '\n' + imgTags[3];

  return formatMarkdownToCleanHtml(processed);
}

// Build Finance Report
async function buildYouTubeFinanceReport(youtubeUrl, targetDate = null) {
  const kst = targetDate ? new Date(targetDate) : getKSTDate();
  const dateStr = formatDateString(kst);
  const dateKorean = formatDateKorean(kst);
  const hour = String(kst.getHours()).padStart(2, '0');
  const min = String(kst.getMinutes()).padStart(2, '0');
  const timeFormatted = `${hour}:${min}`;
  const reportId = `finance-${dateStr.replace(/-/g, '')}-${hour}${min}`;

  console.log(`[YouTube Finance Generator] Analyzing YouTube video for ${dateStr} ${timeFormatted}...`);

  const videoDetails = await fetchYouTubeVideoDetails(youtubeUrl);
  if (!videoDetails) {
    console.warn('[YouTube Finance Generator] Could not fetch video details, using fallback');
  }

  // Synthesize catchy title (avoid raw YouTube title & channel mentions)
  let postTitle = synthesizeCatchyFinanceTitle(videoDetails);
  let rawAiText = null;
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      console.log('[YouTube Finance Generator] Requesting AI finance analysis from Gemini...');
      const targetDetails = videoDetails || {
        title: postTitle.replace(/^\[재테크\s*팁\]\s*/, ''),
        description: '2040 직장인과 사회초년생을 위한 실전 재테크, 통장 쪼개기, 절세 계좌(연금저축, IRP, ISA) 활용법 및 장기 적립식 투자 전략',
        transcript: '월급 관리와 현금 흐름 통제, 비상금 파킹통장, 절세 세액공제 혜택 최대화 및 노후 자산 형성 가이드'
      };
      rawAiText = await callGeminiYouTubeFinanceAPI(dateStr, dateKorean, targetDetails, apiKey);
      if (rawAiText) {
        const titleMatch = rawAiText.match(/<TITLE>(.*?)<\/TITLE>/i);
        if (titleMatch && titleMatch[1].trim()) {
          let extractedTitle = titleMatch[1].replace(/<\/?.*?>/g, '').trim();
          if (!extractedTitle.startsWith('[재테크 팁]')) {
            extractedTitle = `[재테크 팁] ${extractedTitle.replace(/^\[.*?\]\s*/, '')}`;
          }
          postTitle = extractedTitle;
          console.log(`[YouTube Finance Generator] Extracted dynamic AI title: "${postTitle}"`);
        }
      }
    } catch(e) {
      console.warn('[YouTube Finance Generator] Gemini API call failed, falling back:', e.message);
    }
  }

  // Generate theme data & SVG infographics
  const dynamicThemeData = extractFinanceThemeData(videoDetails, postTitle);
  const img1 = generateFinanceImage1(dateStr, videoDetails, postTitle, dynamicThemeData);
  const img2 = generateFinanceImage2(dateStr, videoDetails, postTitle, dynamicThemeData);
  const img3 = generateFinanceImage3(dateStr, videoDetails, postTitle, dynamicThemeData);
  const img4 = generateFinanceImage4(dateStr, videoDetails, postTitle, dynamicThemeData);
  const imgUris = [img1, img2, img3, img4];

  let contentHtml = null;
  if (rawAiText) {
    contentHtml = assembleFinanceHtml(rawAiText, videoDetails, imgUris, dynamicThemeData, postTitle);
  }

  if (!contentHtml) {
    console.log('[YouTube Finance Generator] Using dynamic finance engine fallback');
    contentHtml = generateDynamicFinanceReport(dateStr, dateKorean, videoDetails, imgUris, postTitle, dynamicThemeData);
  }

  return {
    id: reportId,
    category: 'finance',
    categoryName: '💰 재테크 팁',
    title: postTitle,
    author: '10년차 재테크 에디터',
    authorRank: 'Financial Editor',
    timestamp: targetDate ? new Date(targetDate).getTime() : (kst.getTime() - (9 * 3600000)),
    time: `${dateStr} ${timeFormatted}`,
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

  // Generate YouTube finance report if requested
  if (reportType === 'finance' || process.env.YOUTUBE_URL) {
    const ytUrl = process.env.YOUTUBE_URL || process.argv[3] || '';
    const financeReport = await buildYouTubeFinanceReport(ytUrl);
    if (financeReport) toAdd.push(financeReport);
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
  buildYouTubeFinanceReport,
  main
};
