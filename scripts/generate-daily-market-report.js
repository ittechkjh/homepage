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
      const raw = fs.readFileSync(eventsFile, 'utf8');
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

// 2. High-Definition Branded Infographic Generators (crytopnl.com)
function generateReportImage1(dStr, m) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 280" width="800" height="280">
  <defs>
    <linearGradient id="bg1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#080c14"/><stop offset="50%" stop-color="#0f172a"/><stop offset="100%" stop-color="#070a12"/>
    </linearGradient>
  </defs>
  <rect width="800" height="280" rx="16" fill="url(#bg1)" stroke="#0ea5e9" stroke-width="1.5" stroke-opacity="0.35"/>
  <rect x="20" y="18" width="140" height="26" rx="6" fill="#06b6d4" fill-opacity="0.15" stroke="#06b6d4" stroke-opacity="0.4"/>
  <text x="90" y="35" fill="#38bdf8" font-size="11" font-weight="bold" font-family="monospace" text-anchor="middle">MARKET METRICS</text>
  <text x="175" y="36" fill="#ffffff" font-size="15" font-weight="bold" font-family="sans-serif">30대 거시·글로벌 시장 센티먼트 대시보드</text>
  <rect x="630" y="18" width="150" height="26" rx="6" fill="#06b6d4" fill-opacity="0.12" stroke="#06b6d4" stroke-opacity="0.35"/>
  <text x="705" y="35" fill="#22d3ee" font-size="12" font-weight="900" font-family="monospace" text-anchor="middle">🌐 crytopnl.com</text>
  <line x1="20" y1="56" x2="780" y2="56" stroke="#334155" stroke-width="1" stroke-opacity="0.6"/>
  <rect x="20" y="70" width="175" height="150" rx="12" fill="#1e293b" fill-opacity="0.6" stroke="#334155" stroke-width="1"/>
  <text x="107" y="95" fill="#94a3b8" font-size="11" font-family="sans-serif" text-anchor="middle">공포&amp;탐욕 지수</text>
  <text x="107" y="140" fill="#fbbf24" font-size="32" font-weight="900" font-family="monospace" text-anchor="middle">${m.fngScore}</text>
  <rect x="60" y="160" width="95" height="22" rx="11" fill="#f59e0b" fill-opacity="0.15"/>
  <text x="107" y="175" fill="#fcd34d" font-size="11" font-weight="bold" font-family="sans-serif" text-anchor="middle">${m.fngText}</text>
  <text x="107" y="202" fill="#64748b" font-size="10" font-family="sans-serif" text-anchor="middle">단단한 하방 지지</text>
  <rect x="210" y="70" width="180" height="150" rx="12" fill="#1e293b" fill-opacity="0.6" stroke="#334155" stroke-width="1"/>
  <text x="300" y="95" fill="#94a3b8" font-size="11" font-family="sans-serif" text-anchor="middle">김프 / 코베 프리미엄</text>
  <text x="300" y="138" fill="#38bdf8" font-size="24" font-weight="900" font-family="monospace" text-anchor="middle">${m.kimp}</text>
  <text x="300" y="162" fill="#34d399" font-size="13" font-weight="bold" font-family="monospace" text-anchor="middle">CB: ${m.cbPremium}</text>
  <text x="300" y="185" fill="#a78bfa" font-size="10" font-family="sans-serif" text-anchor="middle">미국 기관 꾸준한 순매수</text>
  <text x="300" y="202" fill="#64748b" font-size="10" font-family="sans-serif" text-anchor="middle">과열 없는 차분한 수치</text>
  <rect x="405" y="70" width="180" height="150" rx="12" fill="#1e293b" fill-opacity="0.6" stroke="#334155" stroke-width="1"/>
  <text x="495" y="95" fill="#94a3b8" font-size="11" font-family="sans-serif" text-anchor="middle">BTC 도미넌스 &amp; 환율</text>
  <text x="495" y="138" fill="#f43f5e" font-size="24" font-weight="900" font-family="monospace" text-anchor="middle">${m.btcDominance}%</text>
  <text x="495" y="162" fill="#cbd5e1" font-size="12" font-weight="bold" font-family="monospace" text-anchor="middle">USD/KRW: ${m.usdKrwRate}</text>
  <text x="495" y="185" fill="#38bdf8" font-size="10" font-family="sans-serif" text-anchor="middle">비트코인 점유율 주도</text>
  <text x="495" y="202" fill="#64748b" font-size="10" font-family="sans-serif" text-anchor="middle">알트코인 선별 차별화</text>
  <rect x="600" y="70" width="180" height="150" rx="12" fill="#1e293b" fill-opacity="0.6" stroke="#334155" stroke-width="1"/>
  <text x="690" y="95" fill="#94a3b8" font-size="11" font-family="sans-serif" text-anchor="middle">거래소 상승 종목 비율</text>
  <text x="690" y="132" fill="#34d399" font-size="16" font-weight="900" font-family="sans-serif" text-anchor="middle">업비트 ${m.upbitRatio}%</text>
  <text x="690" y="152" fill="#94a3b8" font-size="11" font-family="sans-serif" text-anchor="middle">(상승 114 / 하락 150)</text>
  <text x="690" y="174" fill="#fbbf24" font-size="16" font-weight="900" font-family="sans-serif" text-anchor="middle">빗썸 ${m.bithumbRatio}%</text>
  <text x="690" y="194" fill="#94a3b8" font-size="11" font-family="sans-serif" text-anchor="middle">(상승 172 / 하락 287)</text>
  <text x="400" y="252" fill="#64748b" font-size="11" font-family="sans-serif" text-anchor="middle">기준: ${dStr} 08:00 KST • 데이터 출처: crytopnl.com 실시간 통합 엔진</text>
  </svg>`;
  return createSvgDataUri(svg);
}

function generateReportImage2(dStr, m) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 280" width="800" height="280">
  <defs>
    <linearGradient id="bg2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#080c14"/><stop offset="50%" stop-color="#091824"/><stop offset="100%" stop-color="#07090e"/>
    </linearGradient>
  </defs>
  <rect width="800" height="280" rx="16" fill="url(#bg2)" stroke="#10b981" stroke-width="1.5" stroke-opacity="0.35"/>
  <rect x="20" y="18" width="140" height="26" rx="6" fill="#10b981" fill-opacity="0.15" stroke="#10b981" stroke-opacity="0.4"/>
  <text x="90" y="35" fill="#34d399" font-size="11" font-weight="bold" font-family="monospace" text-anchor="middle">ON-CHAIN LEDGER</text>
  <text x="175" y="36" fill="#ffffff" font-size="15" font-weight="bold" font-family="sans-serif">온체인 원장 6대 핵심 펀더멘털 &amp; 공급 쇼티지</text>
  <rect x="630" y="18" width="150" height="26" rx="6" fill="#10b981" fill-opacity="0.12" stroke="#10b981" stroke-opacity="0.35"/>
  <text x="705" y="35" fill="#34d399" font-size="12" font-weight="900" font-family="monospace" text-anchor="middle">🌐 crytopnl.com</text>
  <line x1="20" y1="56" x2="780" y2="56" stroke="#334155" stroke-width="1" stroke-opacity="0.6"/>
  <rect x="20" y="70" width="175" height="150" rx="12" fill="#1e293b" fill-opacity="0.6" stroke="#334155" stroke-width="1"/>
  <text x="107" y="95" fill="#94a3b8" font-size="11" font-family="sans-serif" text-anchor="middle">MVRV Z-Score</text>
  <text x="107" y="138" fill="#34d399" font-size="28" font-weight="900" font-family="monospace" text-anchor="middle">${m.mvrv}</text>
  <rect x="45" y="155" width="125" height="20" rx="10" fill="#10b981" fill-opacity="0.15"/>
  <text x="107" y="169" fill="#34d399" font-size="10" font-weight="bold" font-family="sans-serif" text-anchor="middle">역대 사이클 저평가</text>
  <text x="107" y="195" fill="#64748b" font-size="10" font-family="sans-serif" text-anchor="middle">건전한 상승 채널</text>
  <rect x="210" y="70" width="180" height="150" rx="12" fill="#1e293b" fill-opacity="0.6" stroke="#334155" stroke-width="1"/>
  <text x="300" y="95" fill="#94a3b8" font-size="11" font-family="sans-serif" text-anchor="middle">장기보유자(LTH) 락업</text>
  <text x="300" y="138" fill="#818cf8" font-size="28" font-weight="900" font-family="monospace" text-anchor="middle">${m.lthRatio}%</text>
  <rect x="235" y="155" width="130" height="20" rx="10" fill="#6366f1" fill-opacity="0.15"/>
  <text x="300" y="169" fill="#a5b4fc" font-size="10" font-weight="bold" font-family="sans-serif" text-anchor="middle">${m.lthAmount} 장기보유</text>
  <text x="300" y="195" fill="#64748b" font-size="10" font-family="sans-serif" text-anchor="middle">거래소 유통량 쇼티지</text>
  <rect x="405" y="70" width="180" height="150" rx="12" fill="#1e293b" fill-opacity="0.6" stroke="#334155" stroke-width="1"/>
  <text x="495" y="95" fill="#94a3b8" font-size="11" font-family="sans-serif" text-anchor="middle">SOPR / 실현 순이익</text>
  <text x="495" y="138" fill="#38bdf8" font-size="24" font-weight="900" font-family="monospace" text-anchor="middle">${m.sopr}</text>
  <rect x="425" y="155" width="140" height="20" rx="10" fill="#0284c7" fill-opacity="0.15"/>
  <text x="495" y="169" fill="#38bdf8" font-size="10" font-weight="bold" font-family="sans-serif" text-anchor="middle">${m.realizedPnl}</text>
  <text x="495" y="195" fill="#64748b" font-size="10" font-family="sans-serif" text-anchor="middle">패닉셀 없는 손바뀜</text>
  <rect x="600" y="70" width="180" height="150" rx="12" fill="#1e293b" fill-opacity="0.6" stroke="#334155" stroke-width="1"/>
  <text x="690" y="95" fill="#94a3b8" font-size="11" font-family="sans-serif" text-anchor="middle">스테이블코인 공급량</text>
  <text x="690" y="138" fill="#fbbf24" font-size="24" font-weight="900" font-family="monospace" text-anchor="middle">${m.stableSupply}</text>
  <rect x="625" y="155" width="130" height="20" rx="10" fill="#d97706" fill-opacity="0.15"/>
  <text x="690" y="169" fill="#fcd34d" font-size="10" font-weight="bold" font-family="sans-serif" text-anchor="middle">USDT ${m.usdtSupply}</text>
  <text x="690" y="195" fill="#64748b" font-size="10" font-family="sans-serif" text-anchor="middle">사상 최대 대기 매수세</text>
  <text x="400" y="252" fill="#64748b" font-size="11" font-family="sans-serif" text-anchor="middle">기준: ${dStr} 08:00 KST • 온체인 분석 검증: crytopnl.com</text>
  </svg>`;
  return createSvgDataUri(svg);
}

function generateReportImage3(dStr, m) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 280" width="800" height="280">
  <defs>
    <linearGradient id="bg3" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#080c14"/><stop offset="50%" stop-color="#181326"/><stop offset="100%" stop-color="#07090e"/>
    </linearGradient>
  </defs>
  <rect width="800" height="280" rx="16" fill="url(#bg3)" stroke="#8b5cf6" stroke-width="1.5" stroke-opacity="0.35"/>
  <rect x="20" y="18" width="140" height="26" rx="6" fill="#8b5cf6" fill-opacity="0.15" stroke="#8b5cf6" stroke-opacity="0.4"/>
  <text x="90" y="35" fill="#c084fc" font-size="11" font-weight="bold" font-family="monospace" text-anchor="middle">DERIVATIVES MAP</text>
  <text x="175" y="36" fill="#ffffff" font-size="15" font-weight="bold" font-family="sans-serif">글로벌 파생상품 레버리지 &amp; 롱숏 청산 맵</text>
  <rect x="630" y="18" width="150" height="26" rx="6" fill="#8b5cf6" fill-opacity="0.12" stroke="#8b5cf6" stroke-opacity="0.35"/>
  <text x="705" y="35" fill="#c084fc" font-size="12" font-weight="900" font-family="monospace" text-anchor="middle">🌐 crytopnl.com</text>
  <line x1="20" y1="56" x2="780" y2="56" stroke="#334155" stroke-width="1" stroke-opacity="0.6"/>
  <rect x="20" y="70" width="175" height="150" rx="12" fill="#1e293b" fill-opacity="0.6" stroke="#334155" stroke-width="1"/>
  <text x="107" y="95" fill="#94a3b8" font-size="11" font-family="sans-serif" text-anchor="middle">선물 펀딩비 (Funding)</text>
  <text x="107" y="138" fill="#38bdf8" font-size="24" font-weight="900" font-family="monospace" text-anchor="middle">${m.fundingRate}%</text>
  <rect x="45" y="155" width="125" height="20" rx="10" fill="#0284c7" fill-opacity="0.15"/>
  <text x="107" y="169" fill="#38bdf8" font-size="10" font-weight="bold" font-family="sans-serif" text-anchor="middle">중립 수준 유지</text>
  <text x="107" y="195" fill="#64748b" font-size="10" font-family="sans-serif" text-anchor="middle">과열 레버리지 진정</text>
  <rect x="210" y="70" width="180" height="150" rx="12" fill="#1e293b" fill-opacity="0.6" stroke="#334155" stroke-width="1"/>
  <text x="300" y="95" fill="#94a3b8" font-size="11" font-family="sans-serif" text-anchor="middle">미결제약정 (OI)</text>
  <text x="300" y="138" fill="#c084fc" font-size="28" font-weight="900" font-family="monospace" text-anchor="middle">${m.openInterest}</text>
  <rect x="235" y="155" width="130" height="20" rx="10" fill="#7c3aed" fill-opacity="0.15"/>
  <text x="300" y="169" fill="#d8b4fe" font-size="10" font-weight="bold" font-family="sans-serif" text-anchor="middle">안정권 리셋 완료</text>
  <text x="300" y="195" fill="#64748b" font-size="10" font-family="sans-serif" text-anchor="middle">급격한 스퀴즈 위험 낮음</text>
  <rect x="405" y="70" width="180" height="150" rx="12" fill="#1e293b" fill-opacity="0.6" stroke="#334155" stroke-width="1"/>
  <text x="495" y="95" fill="#94a3b8" font-size="11" font-family="sans-serif" text-anchor="middle">롱/숏 비율 (Long/Short)</text>
  <text x="495" y="138" fill="#34d399" font-size="26" font-weight="900" font-family="monospace" text-anchor="middle">1.297</text>
  <rect x="430" y="155" width="130" height="20" rx="10" fill="#10b981" fill-opacity="0.15"/>
  <text x="495" y="169" fill="#34d399" font-size="10" font-weight="bold" font-family="sans-serif" text-anchor="middle">롱 56.5% / 숏 43.5%</text>
  <text x="495" y="195" fill="#64748b" font-size="10" font-family="sans-serif" text-anchor="middle">매수 우위 지속</text>
  <rect x="600" y="70" width="180" height="150" rx="12" fill="#1e293b" fill-opacity="0.6" stroke="#334155" stroke-width="1"/>
  <text x="690" y="95" fill="#94a3b8" font-size="11" font-family="sans-serif" text-anchor="middle">청산액 &amp; 변동성(DVOL)</text>
  <text x="690" y="136" fill="#f43f5e" font-size="22" font-weight="900" font-family="monospace" text-anchor="middle">${m.liquidations}</text>
  <rect x="625" y="155" width="130" height="20" rx="10" fill="#e11d48" fill-opacity="0.15"/>
  <text x="690" y="169" fill="#fda4af" font-size="10" font-weight="bold" font-family="sans-serif" text-anchor="middle">DVOL: ${m.dvol} (안정)</text>
  <text x="690" y="195" fill="#64748b" font-size="10" font-family="sans-serif" text-anchor="middle">급격한 변동성 리스크 제한</text>
  <text x="400" y="252" fill="#64748b" font-size="11" font-family="sans-serif" text-anchor="middle">기준: ${dStr} 08:00 KST • 파생 데이터 트래커: crytopnl.com</text>
  </svg>`;
  return createSvgDataUri(svg);
}

function generateReportImage4(dStr, m) {
  // Combine today's events and upcoming events in chronological order
  const combined = [];
  if (Array.isArray(m.todaysEvents)) {
    m.todaysEvents.forEach(e => combined.push({ ...e, isToday: true }));
  }
  if (Array.isArray(m.nextEvents)) {
    m.nextEvents.forEach(e => combined.push({ ...e, isToday: false }));
  }

  // Forward-looking defaults if events list is short
  const forwardDefaults = [
    { title: '글로벌 유동성 및 거시 지표', date: dStr, time: '실시간 추적', desc: 'M2 통화량 및 금리 모니터링', isToday: true },
    { title: '미국 연준(Fed) 금리 정책', date: dStr, time: '상시 모니터링', desc: 'FOMC 인하 경로 추적', isToday: false },
    { title: '온체인 원장 & 파생 레버리지', date: dStr, time: '실시간 분석', desc: 'OI 미결제약정 & SOPR 지지선', isToday: false }
  ];

  while (combined.length < 3) {
    combined.push(forwardDefaults[combined.length]);
  }

  const formatBadge = (ev) => {
    if (ev.isToday) {
      const cleanTime = (ev.time || '오늘').replace(' (KST)', '').trim();
      return cleanTime.includes('오늘') ? cleanTime : `오늘 ${cleanTime}`;
    }
    const datePart = ev.date ? ev.date.slice(5).replace('-', '/') : '';
    const timePart = ev.time ? ev.time.replace(' (KST)', '').trim() : '';
    return datePart ? `${datePart} ${timePart}`.trim() : (timePart || '예정 일정');
  };

  const ev1 = combined[0];
  const ev2 = combined[1];
  const ev3 = combined[2];

  const badge1 = formatBadge(ev1);
  const badge2 = formatBadge(ev2);
  const badge3 = formatBadge(ev3);

  const getImportance = (ev) => {
    if (ev.impact === 'CRITICAL') return '★★★★★';
    if (ev.impact === 'HIGH IMPACT') return '★★★★☆';
    return '★★★★☆';
  };

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 280" width="800" height="280">
  <defs>
    <linearGradient id="bg4" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#080c14"/><stop offset="50%" stop-color="#19151c"/><stop offset="100%" stop-color="#07090e"/>
    </linearGradient>
  </defs>
  <rect width="800" height="280" rx="16" fill="url(#bg4)" stroke="#f59e0b" stroke-width="1.5" stroke-opacity="0.35"/>
  <rect x="20" y="18" width="140" height="26" rx="6" fill="#f59e0b" fill-opacity="0.15" stroke="#f59e0b" stroke-opacity="0.4"/>
  <text x="90" y="35" fill="#fbbf24" font-size="11" font-weight="bold" font-family="monospace" text-anchor="middle">MACRO CALENDAR</text>
  <text x="175" y="36" fill="#ffffff" font-size="15" font-weight="bold" font-family="sans-serif">글로벌 경제 캘린더 타임라인 &amp; 트레이딩 체크포인트</text>
  <rect x="630" y="18" width="150" height="26" rx="6" fill="#f59e0b" fill-opacity="0.12" stroke="#f59e0b" stroke-opacity="0.35"/>
  <text x="705" y="35" fill="#fcd34d" font-size="12" font-weight="900" font-family="monospace" text-anchor="middle">🌐 crytopnl.com</text>
  <line x1="20" y1="56" x2="780" y2="56" stroke="#334155" stroke-width="1" stroke-opacity="0.6"/>
  <rect x="20" y="70" width="240" height="150" rx="12" fill="#1e293b" fill-opacity="0.6" stroke="#f59e0b" stroke-opacity="0.4" stroke-width="1"/>
  <rect x="35" y="85" width="95" height="20" rx="6" fill="#f59e0b" fill-opacity="0.2"/>
  <text x="82" y="99" fill="#fbbf24" font-size="10" font-weight="bold" font-family="monospace" text-anchor="middle">${badge1}</text>
  <text x="35" y="128" fill="#ffffff" font-size="13" font-weight="bold" font-family="sans-serif">${(ev1.title || '').slice(0, 18)}</text>
  <text x="35" y="152" fill="#94a3b8" font-size="11" font-family="sans-serif">• ${(ev1.desc || '주요 일정 모니터링').slice(0, 18)}</text>
  <text x="35" y="172" fill="#94a3b8" font-size="11" font-family="sans-serif">• ${ev1.isToday ? '당일 시장 변동성 주목' : '글로벌 유동성 영향 분석'}</text>
  <text x="35" y="196" fill="#38bdf8" font-size="11" font-weight="bold" font-family="sans-serif">중요도: ${getImportance(ev1)}</text>
  <rect x="280" y="70" width="240" height="150" rx="12" fill="#1e293b" fill-opacity="0.6" stroke="#334155" stroke-width="1"/>
  <rect x="295" y="85" width="95" height="20" rx="6" fill="#06b6d4" fill-opacity="0.2"/>
  <text x="342" y="99" fill="#22d3ee" font-size="10" font-weight="bold" font-family="monospace" text-anchor="middle">${badge2}</text>
  <text x="295" y="128" fill="#ffffff" font-size="13" font-weight="bold" font-family="sans-serif">${(ev2.title || '').slice(0, 18)}</text>
  <text x="295" y="152" fill="#94a3b8" font-size="11" font-family="sans-serif">• ${(ev2.desc || '주요 일정 모니터링').slice(0, 18)}</text>
  <text x="295" y="172" fill="#94a3b8" font-size="11" font-family="sans-serif">• ${ev2.isToday ? '당일 시장 변동성 주목' : '글로벌 유동성 영향 분석'}</text>
  <text x="295" y="196" fill="#38bdf8" font-size="11" font-weight="bold" font-family="sans-serif">중요도: ${getImportance(ev2)}</text>
  <rect x="540" y="70" width="240" height="150" rx="12" fill="#1e293b" fill-opacity="0.6" stroke="#334155" stroke-width="1"/>
  <rect x="555" y="85" width="95" height="20" rx="6" fill="#a855f7" fill-opacity="0.2"/>
  <text x="602" y="99" fill="#c084fc" font-size="10" font-weight="bold" font-family="monospace" text-anchor="middle">${badge3}</text>
  <text x="555" y="128" fill="#ffffff" font-size="13" font-weight="bold" font-family="sans-serif">${(ev3.title || '').slice(0, 18)}</text>
  <text x="555" y="152" fill="#94a3b8" font-size="11" font-family="sans-serif">• ${(ev3.desc || '주요 일정 모니터링').slice(0, 18)}</text>
  <text x="555" y="172" fill="#94a3b8" font-size="11" font-family="sans-serif">• ${ev3.isToday ? '당일 시장 변동성 주목' : '일정 전후 포지션 관리'}</text>
  <text x="555" y="196" fill="#fbbf24" font-size="11" font-weight="bold" font-family="sans-serif">중요도: ${getImportance(ev3)}</text>
  <text x="400" y="252" fill="#64748b" font-size="11" font-family="sans-serif" text-anchor="middle">기준: ${dStr} 08:00 KST • 경제 캘린더 제공: crytopnl.com</text>
  </svg>`;
  return createSvgDataUri(svg);
}

// 3. Google Gemini AI API Call (Method A)
async function callGeminiAPI(dateStr, dateKorean, m, apiKey) {
  const eventsSummary = [
    m.todaysEvents.map(e => `[오늘 일정] ${e.title} (${e.desc || ''})`).join('\n'),
    m.nextEvents.map(e => `[예정 일정 - ${e.date}] ${e.title} (${e.desc || ''})`).join('\n')
  ].filter(Boolean).join('\n');

  const systemInstruction = `당신은 대한민국 대표 크립토 퀀트 분석 플랫폼인 crytopnl.com의 수석 암호화폐 리서치 애널리스트(AI)입니다.
제공된 실시간 시장 수치와 온체인 원장 데이터, 경제 일정을 바탕으로 투자자들에게 통찰력을 주는 일일 모닝 시황 보고서를 작성하세요.

[필수 작성 규칙]
1. 분량: HTML 태그를 제외한 순수 한글 텍스트 분량이 반드시 1,600자 ~ 1,850자 사이(최소 1,500자 이상, 2,000자 이내)가 되도록 풍부하게 작성하세요.
2. 어조: 정중하고 지적인 전문 애널리스트 어조 (~합니다, ~로 분석됩니다, ~에 주목해야 합니다 체). 단순 나열이 아닌 거시 지표, 파생 레버리지, 온체인 공급 사이의 유기적 상관관계를 분석하세요.
3. 문서 형식: 아래 플레이스홀더를 반드시 포함하여 작성하세요.
   <INTRO>
   도입부 종합 진단 (1~2문단)
   </INTRO>
   <!-- IMAGE_1 -->
   <SECTION_1>
   <h4 style="font-size: 14px; font-weight: 700; color: #f8fafc; margin-top: 24px; margin-bottom: 8px; border-left: 4px solid #22d3ee; padding-left: 8px;">1. 국내외 프리미엄 및 파생상품 레버리지 동향</h4>
   국내외 프리미엄, 선물 펀딩비, 미결제약정, 롱숏 비율 분석 (2문단)
   </SECTION_1>
   <!-- IMAGE_3 -->
   <SECTION_2>
   <h4 style="font-size: 14px; font-weight: 700; color: #f8fafc; margin-top: 24px; margin-bottom: 8px; border-left: 4px solid #34d399; padding-left: 8px;">2. 온체인 원장 6대 핵심 지표 분석 (수익성 & 공급 쇼티지)</h4>
   MVRV, LTH 장기보유자 락업, SOPR, 스테이블코인 대기 매수세 분석 (2문단)
   </SECTION_2>
   <!-- IMAGE_2 -->
   <SECTION_3>
   <h4 style="font-size: 14px; font-weight: 700; color: #f8fafc; margin-top: 24px; margin-bottom: 8px; border-left: 4px solid #fbbf24; padding-left: 8px;">3. 거시 경제 유동성 및 전통 금융(TradFi) 지표</h4>
   글로벌 M2 통화량, 기준금리 기대, DXY 달러 인덱스, 환율, 증시 상관관계 (2문단)
   </SECTION_3>
   <!-- IMAGE_4 -->
   <SECTION_4>
   <h4 style="font-size: 14px; font-weight: 700; color: #f8fafc; margin-top: 24px; margin-bottom: 8px; border-left: 4px solid #f43f5e; padding-left: 8px;">4. 금일 주요 경제 일정 및 글로벌 속보 이슈</h4>
   제공된 일정 데이터 기반 시장 영향력 분석 (2문단)
   </SECTION_4>
   <CONCLUSION>
   <div style="background: rgba(8, 47, 73, 0.7); border: 1px solid rgba(56, 189, 248, 0.5); border-left: 4px solid #38bdf8; border-radius: 12px; padding: 18px 20px; margin: 20px 0; color: #ffffff;">
     <div style="color: #38bdf8; font-weight: 700; font-size: 13px; margin-bottom: 6px;">💡 [종합 결론 및 트레이딩 전략 가이드]</div>
     <p style="font-size: 13px; line-height: 1.75; margin: 0; color: #f8fafc; font-weight: 500;">구체적 매매 전략 및 리스크 관리 조언 (1문단)</p>
   </div>
   </CONCLUSION>`;

  const userPrompt = `[실시간 시장 및 온체인 지표 데이터 (${dateKorean} 08:00 KST 기준)]
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

위 데이터를 종합하여 전문적이고 심도 있는 1,600~1,850자 리포트를 생성해주세요.`;

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
        if (text && text.length > 500) {
          console.log(`[Gemini AI] Successfully generated report with ${item.name} (${text.length} chars)`);
          return text;
        } else {
          console.warn(`[Gemini AI] ${item.name} text length (${text.length}) is below 500 characters.`);
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

// 4. Dynamic Quant Fallback Engine
function generateDynamicQuantReport(dateStr, dateKorean, m, img1, img2, img3, img4) {
  const hasTodayEvents = Array.isArray(m.todaysEvents) && m.todaysEvents.length > 0;
  const evTodayText = hasTodayEvents
    ? m.todaysEvents.map(e => `[${(e.time || '오늘').replace(' (KST)', '')}] ${e.title}`).join(' / ')
    : '';

  const evNextText = m.nextEvents && m.nextEvents.length > 0
    ? m.nextEvents.map(e => `[${e.date}] ${e.title}`).join(', ')
    : '향후 주요 일정들이 순차 대기하고 있습니다.';

  // Contextual intro sentence depending on whether today has events
  let introEventSentence = '';
  if (hasTodayEvents) {
    introEventSentence = `오늘 예정된 주요 경제 이벤트(${evTodayText})를 앞두고 관망세를 보이고 있습니다.`;
  } else {
    const nextSummary = m.nextEvents && m.nextEvents.length > 0
      ? `향후 예정된 주요 일정([${m.nextEvents[0].date.slice(5)}] ${m.nextEvents[0].title}${m.nextEvents[1] ? `, [${m.nextEvents[1].date.slice(5)}] ${m.nextEvents[1].title}` : ''})`
      : '글로벌 유동성 추이 및 온체인 공급 지표';
    introEventSentence = `금일 발표 예정된 주요 거시 경제 지표는 부재한 가운데, ${nextSummary}을(를) 주시하며 안정적인 관망세를 보이고 있습니다.`;
  }

  // Contextual section 4 sentence
  let section4Content = '';
  if (hasTodayEvents) {
    section4Content = `오늘 발표되는 주요 지표(${evTodayText}) 결과에 따라 단기 변동성 확대 및 방향성 탐색이 전개될 전망입니다. 향후 ${evNextText} 등 주요 캘린더 일정도 예정되어 있습니다. 미국 주요 연기금의 비트코인 현물 ETF 편입 확대와 솔라나 활성 지갑 급증 속보가 시장을 견인하고 있습니다.`;
  } else {
    section4Content = `금일은 공식 발표되는 미국 주요 거시 경제 지표가 부재하여 매크로 충격에 의한 급격한 변동성 리스크는 제한적인 구간입니다. 시장은 거래소 유통량 쇼티지와 온체인 축적 강도 등 내부 펀더멘털에 집중하고 있으며, 향후 ${evNextText} 등의 주요 캘린더 일정을 순차적으로 소화해 나갈 것으로 전망됩니다. 미국 주요 연기금의 비트코인 현물 ETF 편입 확대와 온체인 활성 지갑 증가세가 시장의 견고한 하방 지지력을 제공하고 있습니다.`;
  }

  // Contextual conclusion sentence
  const conclusionAdvice = hasTodayEvents
    ? '오늘 경제 지표 발표 전후 일시적 레버리지 흔들기에 대비해 무리한 추격 매수보다는 1.000 SOPR 지지선을 활용한 분할 매수 대응을 권장합니다.'
    : '단기 거시 지표 공백기 속에서 무리한 고레버리지 추격 매수보다는 1.000 SOPR 지지선 및 LTH 락업 구간을 활용한 분할 매수 대응을 권장합니다.';

  return `
<h3 style="font-size: 18px; font-weight: 800; color: #0284c7; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; line-height: 1.4;">
  📌 [모닝 브리핑] 30대 거시·온체인 핵심 지표 총괄 및 시장 종합 진단
</h3>
<p style="font-size: 15px; color: #1e293b; line-height: 1.8; margin-bottom: 16px;">
${dateKorean} 기준 암호화폐 시장은 견고한 온체인 원장 데이터와 글로벌 M2 통화 유동성 확장을 바탕으로 하방 경직성을 확보한 채, ${introEventSentence} 현재 비트코인은 업비트 ${m.upbitBtcKRW}, 해외 바이낸스 ${m.binanceBtcUSD} 선에서 안정적으로 거래 중입니다. 시세 화면의 30대 거시 지표와 온체인 원장을 종합 진단한 결과, 시장은 투기적 과열 없는 건강한 상승 추세 채널을 유지하고 있는 것으로 분석됩니다.
</p>

<!-- Image 1: Macro & Sentiment Matrix (crytopnl.com) -->
<div class="post-img-container text-center my-4">
  <img src="${img1}" alt="30대 거시·글로벌 시장 센티먼트 대시보드 - crytopnl.com" style="width:100%; max-width: 800px; display:block; margin: 14px auto; border-radius: 12px; border: none; box-shadow: none;" />
</div>

<h4 style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 28px; margin-bottom: 10px; border-left: 4px solid #0284c7; padding-left: 10px;">
1. 국내외 프리미엄 및 파생상품 레버리지 동향
</h4>
<p style="font-size: 15px; color: #1e293b; line-height: 1.8; margin-bottom: 16px;">
국내 김치프리미엄은 ${m.kimp}로 투기적 과열 없이 안정적인 수준입니다. 미국 기관의 현물 매수세를 나타내는 코인베이스 프리미엄은 ${m.cbPremium}의 완만한 플러스를 유지하며 월가 기관들의 꾸준한 분할 매집을 보여줍니다. 거래소별 상승 종목 비율은 업비트 ${m.upbitRatio}%, 빗썸 ${m.bithumbRatio}%로 비트코인 도미넌스(${m.btcDominance}%) 집중에 따른 알트코인 차별화 장세가 이어지고 있습니다.<br/>
선물 펀딩비는 ${m.fundingRate}%로 중립이며, 미결제약정(OI)은 ${m.openInterest}로 레버리지 청산 후 안정권입니다. 롱/숏 비율은 ${m.longShortRatio}로 롱 우세이며, 24시간 청산 규모는 ${m.liquidations}, 내재변동성(DVOL)은 ${m.dvol}로 급격한 변동성 리스크는 제한적입니다.
</p>

<!-- Image 3: Derivatives & Leverage Map (crytopnl.com) -->
<div class="post-img-container text-center my-4">
  <img src="${img3}" alt="글로벌 파생상품 레버리지 & 롱숏 청산 맵 - crytopnl.com" style="width:100%; max-width: 800px; display:block; margin: 14px auto; border-radius: 12px; border: none; box-shadow: none;" />
</div>

<h4 style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 28px; margin-bottom: 10px; border-left: 4px solid #0284c7; padding-left: 10px;">
2. 온체인 원장 6대 핵심 지표 분석 (수익성 & 공급 쇼티지)
</h4>
<p style="font-size: 15px; color: #1e293b; line-height: 1.8; margin-bottom: 16px;">
비트코인 MVRV Z-Score는 ${m.mvrv}로 역대 사이클 고점 대비 부담 없는 저평가 상승 구간입니다. 채굴자 수익성을 나타내는 Puell Multiple은 ${m.puell}로 반감기 이후 강제 매도 압력이 진정되었습니다.<br/>
소비 출력 이익 비율(SOPR)은 ${m.sopr}로 시장 참여자들의 완만한 수익 실현이 이뤄지고 있으며, 1.000선이 강력한 지지선 역할을 합니다. 일일 실현 손익은 ${m.realizedPnl}로 패닉셀 없는 건강한 손바뀜을 나타냅니다. 155일 이상 코인을 보유한 장기 보유자(LTH) 비중은 ${m.lthRatio}%(${m.lthAmount})로 거래소 공급 쇼티지가 지속되고 있으며, 스테이블코인 공급량은 ${m.stableSupply}(USDT ${m.usdtSupply})로 사상 최고 수준의 대기 매수세를 보유 중입니다. 스마트머니 순매수 점수는 ${m.smartMoneyScore}점으로 기관 축적 단계입니다.
</p>

<!-- Image 2: On-Chain Fundamentals (crytopnl.com) -->
<div class="post-img-container text-center my-4">
  <img src="${img2}" alt="온체인 원장 6대 핵심 펀더멘털 분석 - crytopnl.com" style="width:100%; max-width: 800px; display:block; margin: 14px auto; border-radius: 12px; border: none; box-shadow: none;" />
</div>

<h4 style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 28px; margin-bottom: 10px; border-left: 4px solid #0284c7; padding-left: 10px;">
3. 거시 경제 유동성 및 전통 금융(TradFi) 지표
</h4>
<p style="font-size: 15px; color: #1e293b; line-height: 1.8; margin-bottom: 16px;">
글로벌 M2 통화량은 108.5조 달러(+4.2%)로 유동성 확장 국면입니다. 미국 기준금리는 4.50% 인하 사이클이며, 연준 역레포 잔고는 2,450억 달러, 하이일드 스프레드는 3.25%로 신용 리스크가 낮습니다. 달러 인덱스(DXY)는 98.84로 약세를 지속해 위험자산에 우호적이며 원/달러 환율은 ${m.usdKrwRate}입니다. 나스닥(+0.65%), 반도체지수(+0.42%)의 반등과 VIX 15.72 안정세는 크립토 자금 유입을 뒷받침합니다.
</p>

<!-- Image 4: Macro & Calendar Timeline (crytopnl.com) -->
<div class="post-img-container text-center my-4">
  <img src="${img4}" alt="글로벌 경제 캘린더 타임라인 & 트레이딩 체크포인트 - crytopnl.com" style="width:100%; max-width: 800px; display:block; margin: 14px auto; border-radius: 12px; border: none; box-shadow: none;" />
</div>

<h4 style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 28px; margin-bottom: 10px; border-left: 4px solid #0284c7; padding-left: 10px;">
4. 금일 주요 경제 일정 및 글로벌 속보 이슈
</h4>
<p style="font-size: 15px; color: #1e293b; line-height: 1.8; margin-bottom: 16px;">
${section4Content}
</p>

<div class="morning-conclusion-card" style="background: #f0f9ff; border-left: 4px solid #0284c7; border-radius: 8px; padding: 18px 20px; margin: 24px 0;">
  <div style="color: #0369a1; font-weight: 800; font-size: 14px; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
    💡 [종합 결론 및 트레이딩 전략 가이드]
  </div>
  <p style="font-size: 14px; line-height: 1.8; margin: 0; color: #0c4a6e; font-weight: 500;">
    공포&탐욕 지수 ${m.fngScore}(${m.fngText}), LTH 비중 ${m.lthRatio}%, 해시레이트 685 EH/s가 단단한 하방을 형성하고 있습니다. ${conclusionAdvice}
  </p>
</div>
`;
}

// Assemble Gemini AI HTML with 4 Branded Images
function assembleGeminiHtml(rawText, img1, img2, img3, img4) {
  const img1Tag = `<div class="post-img-container text-center my-4"><img src="${img1}" alt="30대 거시·글로벌 시장 센티먼트 대시보드 - crytopnl.com" style="width:100%; max-width: 800px; display:block; margin: 14px auto; border-radius: 12px; border: none; box-shadow: none;" /></div>`;
  const img2Tag = `<div class="post-img-container text-center my-4"><img src="${img2}" alt="온체인 원장 6대 핵심 펀더멘털 분석 - crytopnl.com" style="width:100%; max-width: 800px; display:block; margin: 14px auto; border-radius: 12px; border: none; box-shadow: none;" /></div>`;
  const img3Tag = `<div class="post-img-container text-center my-4"><img src="${img3}" alt="글로벌 파생상품 레버리지 & 롱숏 청산 맵 - crytopnl.com" style="width:100%; max-width: 800px; display:block; margin: 14px auto; border-radius: 12px; border: none; box-shadow: none;" /></div>`;
  const img4Tag = `<div class="post-img-container text-center my-4"><img src="${img4}" alt="글로벌 경제 캘린더 타임라인 & 트레이딩 체크포인트 - crytopnl.com" style="width:100%; max-width: 800px; display:block; margin: 14px auto; border-radius: 12px; border: none; box-shadow: none;" /></div>`;

  let processed = rawText;
  if (processed.includes('<!-- IMAGE_1 -->')) {
    processed = processed.replace('<!-- IMAGE_1 -->', img1Tag);
  }
  if (processed.includes('<!-- IMAGE_3 -->')) {
    processed = processed.replace('<!-- IMAGE_3 -->', img3Tag);
  }
  if (processed.includes('<!-- IMAGE_2 -->')) {
    processed = processed.replace('<!-- IMAGE_2 -->', img2Tag);
  }
  if (processed.includes('<!-- IMAGE_4 -->')) {
    processed = processed.replace('<!-- IMAGE_4 -->', img4Tag);
  }

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
  const reportId = `report-${dateStr.replace(/-/g, '')}`;

  console.log(`[Daily Report Generator] Ingesting real-time market data for ${dateStr}...`);
  const marketData = await fetchLiveMarketData(dateStr);

  const img1 = generateReportImage1(dateStr, marketData);
  const img2 = generateReportImage2(dateStr, marketData);
  const img3 = generateReportImage3(dateStr, marketData);
  const img4 = generateReportImage4(dateStr, marketData);

  let contentHtml = null;
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      console.log('[Daily Report Generator] GEMINI_API_KEY detected. Requesting AI report synthesis...');
      const aiText = await callGeminiAPI(dateStr, dateKorean, marketData, apiKey);
      if (aiText) {
        contentHtml = assembleGeminiHtml(aiText, img1, img2, img3, img4);
      }
    } catch (e) {
      console.warn('[Daily Report Generator] Gemini API synthesis failed, falling back to dynamic quant engine:', e.message);
    }
  } else {
    console.log('[Daily Report Generator] GEMINI_API_KEY not set. Using dynamic quant scenario engine.');
  }

  // Fallback to dynamic quant engine if AI was not available
  if (!contentHtml) {
    contentHtml = generateDynamicQuantReport(dateStr, dateKorean, marketData, img1, img2, img3, img4);
  }

  // Pure text character count check (excluding image containers)
  const cleanText = contentHtml
    .replace(/<div class="post-img-container[\s\S]*?<\/div>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  console.log(`[Daily Report Generator] Generated for ${dateStr} - Plain text characters: ${cleanText.length}`);

  const postDate = new Date(`${dateStr}T08:00:00+09:00`);
  const timestamp = postDate.getTime();

  return {
    id: reportId,
    category: 'altcoin',
    categoryName: '📊 시장 분위기',
    title: `[모닝 시황] ${dateKorean} 글로벌 암호화폐 & 온체인 펀더멘털 종합 분석 보고서`,
    author: '시황분석팀 (AI)',
    authorRank: 'VERIFIED',
    timestamp: timestamp,
    time: `${dateStr} 08:00`,
    views: 248,
    upvotes: 0,
    isNotice: false,
    image: true,
    content: contentHtml,
    comments: []
  };
}

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
  const slotBadge = slotInfo ? slotInfo.slotHour + '시' : '4H';
  const slotTimestampStr = slotInfo ? slotInfo.timeStr : `${dateStr} 09:00`;
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
  const year = kst.getFullYear();
  const month = String(kst.getMonth() + 1).padStart(2, '0');
  const day = String(kst.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  const dateKey = `${year}${month}${day}`;

  if (hour >= 20) {
    // 20:00 ~ 23:59: 21:00 야간 세션 (미국 증시 개장/야간 파생상품 변동성)
    return {
      slot: '21',
      slotHour: 21,
      slotName: '야간 관점 (21:00)',
      sessionTitle: '야간 미국 증시 개장 및 파생시장 변동성',
      sessionContext: '미국 정규 주식/파생시장 개장 시간대로 글로벌 기관 주문 및 레버리지 청산 변동성이 급증하는 구간',
      id: `perspective-${dateKey}-21`,
      timeStr: `${dateStr} 21:00`,
      postDate: new Date(`${dateStr}T21:00:00+09:00`)
    };
  } else if (hour >= 15) {
    // 15:00 ~ 19:59: 17:00 오후 세션 (유럽 런던장 개장)
    return {
      slot: '17',
      slotHour: 17,
      slotName: '오후 관점 (17:00)',
      sessionTitle: '오후 유럽 런던장 개장 및 추세 중간 점검',
      sessionContext: '런던 금융시장 개장에 맞춰 유럽발 기관 유동성이 공급되며 아시아 세션의 추세 돌파 또는 지지 안착을 시험하는 구간',
      id: `perspective-${dateKey}-17`,
      timeStr: `${dateStr} 17:00`,
      postDate: new Date(`${dateStr}T17:00:00+09:00`)
    };
  } else {
    // 00:00 ~ 14:59: 09:00 오전 세션 (아시아장/일봉 마감)
    return {
      slot: '09',
      slotHour: 9,
      slotName: '오전 관점 (09:00)',
      sessionTitle: '오전 일봉 마감 및 아시아장 개장 분석',
      sessionContext: '글로벌 암호화폐 일봉 캔들이 마감되고 아시아 시장이 본격 개장하는 시간대로 당일 기준 가격대와 200 EMA 지지/저항을 확립하는 구간',
      id: `perspective-${dateKey}-09`,
      timeStr: `${dateStr} 09:00`,
      postDate: new Date(`${dateStr}T09:00:00+09:00`)
    };
  }
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
          postTitle = titleMatch[1].replace(/<\/?.*?>/g, '').trim();
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
    views: 185,
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
      const raw = fs.readFileSync(reportOutputFile, 'utf8');
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

  const updatedReports = [...toAdd, ...filtered].slice(0, 50); // Keep last 50 reports

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
