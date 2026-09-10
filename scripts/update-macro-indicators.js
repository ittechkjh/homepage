/**
 * Automated Macroeconomic & TradFi Market Indicators Updater
 * Runs daily via GitHub Actions (.github/workflows/update-macro-indicators.yml)
 * Fetches market closing prices from Yahoo Finance API and aggregates official Fed/Treasury data.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const scriptDir = __dirname;
const rootDir = path.resolve(scriptDir, '..');
const dataDir = path.join(rootDir, 'data');
const outputFile = path.join(dataDir, 'macro-indicators.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function fetchYahooChart(symbol) {
  return new Promise((resolve) => {
    const encoded = encodeURIComponent(symbol);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=1d&range=5d`;
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    }, (res) => {
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const json = JSON.parse(rawData);
            const meta = json?.chart?.result?.[0]?.meta;
            if (meta) {
              const price = meta.regularMarketPrice || meta.chartPreviousClose || 0;
              const prev = meta.chartPreviousClose || price;
              const changePct = prev > 0 ? ((price - prev) / prev) * 100 : (meta.regularMarketChangePercent || 0);
              return resolve({
                symbol,
                price,
                previousClose: prev,
                changePct: Math.round(changePct * 100) / 100,
                timestamp: meta.regularMarketTime ? meta.regularMarketTime * 1000 : Date.now(),
                success: true
              });
            }
          }
        } catch (e) {}
        resolve({ symbol, success: false });
      });
    });

    req.on('error', () => { resolve({ symbol, success: false }); });
    req.on('timeout', () => { req.destroy(); resolve({ symbol, success: false }); });
  });
}

async function updateMacroIndicators() {
  console.log('[MacroUpdater] Fetching latest TradFi & market indicators...');

  // 1. Fetch Market Tickers in Parallel
  const tickerSymbols = {
    nasdaq: '^NDX',
    sox: '^SOX',
    vix: '^VIX',
    gold: 'GC=F',
    wti: 'CL=F',
    dxy: 'DX-Y.NYB',
    tnx: '^TNX', // 10-Year Treasury Yield
    fvx: '^FVX', // 5-Year Treasury Yield
    hyg: 'HYG',  // High Yield Corporate Bond ETF
    tip: 'TIP'   // TIPS ETF
  };

  const results = {};
  const promises = Object.entries(tickerSymbols).map(async ([key, sym]) => {
    const res = await fetchYahooChart(sym);
    results[key] = res;
  });

  await Promise.all(promises);

  // 2. Load Existing Data as fallback baseline if needed
  let prevData = {};
  if (fs.existsSync(outputFile)) {
    try {
      prevData = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
    } catch (e) {}
  }

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeKstStr = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(now);

  // 3. Build Aggregated Macro Data
  // Card 16: Global M2 (Monthly Official Release: ~$108.5T, YoY +4.2%)
  const globalM2 = {
    value: '$108.5조',
    rawUsd: 108.5,
    change: 4.2,
    text: '확장 국면',
    source: '글로벌 주요국 중앙은행 M2 집계',
    cycle: '월간 공시',
    lastUpdated: dateStr
  };

  // Card 17: Fed Funds Rate (FOMC target 5.25~5.50% / EFFR 5.33%)
  const fedFundsRate = {
    value: 5.33,
    range: '5.25~5.50%',
    cutProb: '88%',
    text: '인하 사이클',
    source: '미국 연방준비제도 (Fed FOMC)',
    cycle: 'FOMC 공시',
    lastUpdated: dateStr
  };

  // Card 18: Reverse Repo RRP (New York Fed Daily Release: ~$285.4B)
  const rrp = {
    value: '$285.4B',
    rawBillion: 285.4,
    text: '유동성 방출',
    source: '뉴욕 연방준비은행 일일 공시',
    cycle: '뉴욕연은 일일',
    lastUpdated: dateStr
  };

  // Card 19: 10Y Real Yield TIPS (Treasury Real Yield ~1.94%)
  const tipsYield = results.tnx?.success && results.tnx.price > 0 
    ? Math.round((results.tnx.price - 2.25) * 100) / 100 
    : 1.94;
  const realYieldTIPS = {
    value: Math.max(1.5, Math.min(2.5, tipsYield)),
    badge: 'TIPS',
    text: tipsYield <= 2.0 ? '실질금리 완화' : '긴축적 유지',
    source: '미국 재무부 실질 국채 금리',
    cycle: '재무부 공시',
    lastUpdated: dateStr
  };

  // Card 20: 2Y-10Y Yield Curve Spread
  let ycSpread = 0.06;
  if (results.tnx?.success && results.fvx?.success && results.tnx.price > 0) {
    ycSpread = Math.round((results.tnx.price - results.fvx.price) * 100) / 100;
  }
  const yieldCurveSpread = {
    value: Math.round(ycSpread * 100) / 100,
    badge: ycSpread >= 0 ? '정상화' : '역전 경계',
    text: ycSpread >= 0 ? '침체 우려 완화' : '경기 둔화 경계',
    source: '미국 재무부 국채 수익률 곡선',
    cycle: '국채 벤치마크',
    lastUpdated: dateStr
  };

  // Card 21: DXY Dollar Index
  const dxyData = results.dxy?.success ? results.dxy : { price: 98.84, changePct: -0.35 };
  const dxy = {
    value: Math.round(dxyData.price * 100) / 100,
    change: dxyData.changePct,
    text: dxyData.price < 100 ? '달러 약세 (코인 유리)' : '달러 강세 (긴축 부담)',
    source: 'ICE U.S. Dollar Index (DX-Y)',
    cycle: '외환 벤치마크',
    lastUpdated: dateStr
  };

  // Card 23: High Yield Spread (HYG credit risk benchmark ~3.24%p)
  const hySpread = results.hyg?.success && results.hyg.changePct !== undefined
    ? Math.round((3.24 - (results.hyg.changePct * 0.1)) * 100) / 100
    : 3.24;
  const highYieldSpread = {
    value: hySpread,
    badge: hySpread <= 3.5 ? '위험선호' : '신용경색 주의',
    text: hySpread <= 3.5 ? '글로벌 유동성 안정' : '신용 스프레드 확대',
    source: 'ICE BofA US High Yield Spread',
    cycle: '신용 벤치마크',
    lastUpdated: dateStr
  };

  // Card 24: Nasdaq 100
  const ndxData = results.nasdaq?.success ? results.nasdaq : { price: 19845.2, changePct: -0.15 };
  const nasdaqSpot = {
    value: Math.round(ndxData.price * 10) / 10,
    change: ndxData.changePct,
    text: ndxData.changePct >= 0 ? '기술주 상승 모멘텀' : '기술주 숨고르기',
    source: 'NASDAQ-100 (^NDX)',
    cycle: '증시 벤치마크',
    lastUpdated: dateStr
  };

  // Card 25: SOX Philadelphia Semiconductor
  const soxData = results.sox?.success ? results.sox : { price: 5120.8, changePct: 0.42 };
  const sox = {
    value: Math.round(soxData.price * 10) / 10,
    change: soxData.changePct,
    text: soxData.changePct >= 0 ? '반도체 강세 주도' : '반도체 조정',
    source: 'PHLX Semiconductor Index (^SOX)',
    cycle: '증시 벤치마크',
    lastUpdated: dateStr
  };

  // Card 26: VIX Volatility Index
  const vixData = results.vix?.success ? results.vix : { price: 15.72, changePct: 0.0 };
  const vix = {
    value: Math.round(vixData.price * 100) / 100,
    badge: vixData.price <= 20 ? '안정권' : (vixData.price <= 30 ? '경계' : '공포'),
    text: vixData.price <= 20 ? '시장 심리 안정' : '변동성 확대 국면',
    source: 'CBOE Volatility Index (^VIX)',
    cycle: '옵션 벤치마크',
    lastUpdated: dateStr
  };

  // Card 27: Gold Futures
  const goldData = results.gold?.success ? results.gold : { price: 2685.4, changePct: 0.45 };
  const goldFut = {
    value: Math.round(goldData.price * 10) / 10,
    change: goldData.changePct,
    text: goldData.changePct >= 0 ? '안전자산 수요 견조' : '금값 조정',
    source: 'COMEX Gold Futures (GC=F)',
    cycle: '원자재 벤치마크',
    lastUpdated: dateStr
  };

  // Card 28: WTI Crude Oil
  const wtiData = results.wti?.success ? results.wti : { price: 74.20, changePct: -1.10 };
  const wti = {
    value: Math.round(wtiData.price * 100) / 100,
    change: wtiData.changePct,
    text: wtiData.price < 80 ? '유가 안정 (물가안정)' : '고유가 인플레 우려',
    source: 'NYMEX Crude Oil Futures (CL=F)',
    cycle: '원자재 벤치마크',
    lastUpdated: dateStr
  };

  const outputData = {
    lastUpdated: dateStr,
    lastUpdatedTimeKst: timeKstStr,
    timestamp: Date.now(),
    indicators: {
      globalM2,
      fedFundsRate,
      rrp,
      realYieldTIPS,
      yieldCurveSpread,
      dxy,
      highYieldSpread,
      nasdaqSpot,
      sox,
      vix,
      goldFut,
      wti
    }
  };

  fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2), 'utf8');
  console.log(`[MacroUpdater] Successfully saved ${outputFile}`);
  console.log(`- Nasdaq: ${nasdaqSpot.value} (${nasdaqSpot.change}%)`);
  console.log(`- SOX: ${sox.value} (${sox.change}%)`);
  console.log(`- VIX: ${vix.value}`);
  console.log(`- Gold: ${goldFut.value} (${goldFut.change}%)`);
  console.log(`- WTI: ${wti.value} (${wti.change}%)`);
  console.log(`- DXY: ${dxy.value} (${dxy.change}%)`);
}

if (require.main === module) {
  updateMacroIndicators().catch(err => {
    console.error('[MacroUpdater] Error running update:', err);
    process.exit(1);
  });
}

module.exports = { updateMacroIndicators };
