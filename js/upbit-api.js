/**
 * upbit-api.js
 * 업비트 & 빗썸 Public API (실시간 시세, 다주기 캔들 시세, 과거 데이터 페이징, 한글/영문 심볼 양방향 매퍼)
 */

const UpbitAPI = {
    // 주요 코인 한글명 -> 영문 심볼 매핑 사전 (빗썸/업비트 통합)
    koreanToSymbolMap: {
        '아캄': 'ARKM',
        '비트코인': 'BTC',
        '이더리움': 'ETH',
        '솔라나': 'SOL',
        '리플': 'XRP',
        '도지코인': 'DOGE',
        '월드코인': 'WLD',
        '수이': 'SUI',
        '앱토스': 'APT',
        '세이': 'SEI',
        '스타크넷': 'STRK',
        '미나': 'MINA',
        '블러': 'BLUR',
        '시바이누': 'SHIB',
        '페페': 'PEPE',
        '봉크': 'BONK',
        '플로키': 'FLOKI',
        '에이다': 'ADA',
        '아발란체': 'AVAX',
        '폴카닷': 'DOT',
        '체인링크': 'LINK',
        '니어프로토콜': 'NEAR',
        '스택스': 'STX',
        '트론': 'TRX',
        '이더리움클래식': 'ETC',
        '비트코인캐시': 'BCH',
        '스텔라루멘': 'XLM',
        '샌드박스': 'SAND',
        '디센트럴랜드': 'MANA',
        '엑시인피니티': 'AXS',
        '플로우': 'FLOW',
        '알고랜드': 'ALGO',
        '코스모스': 'ATOM',
        '이오스': 'EOS',
        '웨이브': 'WAVES',
        '칠리즈': 'CHZ',
        '엔진코인': 'ENJ',
        '베이직어텐션토큰': 'BAT',
        '질리카': 'ZIL',
        '아이콘': 'ICX',
        '비체인': 'VET',
        '네오': 'NEO',
        '가스': 'GAS',
        '온톨로지': 'ONT',
        '퀀텀': 'QTUM',
        '카바': 'KAVA',
        '1인치': '1INCH',
        '에이브': 'AAVE',
        '유니스왑': 'UNI',
        '메이커': 'MKR',
        '커브': 'CRV',
        '펜들': 'PENDLE',
        '타이코': 'TAIKO',
        '바운스토큰': 'AUCTION',
        '렌더토큰': 'RENDER',
        '지토': 'JTO',
        '웜홀': 'W',
        '제타체인': 'ZETA',
        '오픈캠퍼스': 'EDU',
        '옵티미즘': 'OP',
        '아비트럼': 'ARB',
        '셀레스티아': 'TIA',
        '온도파이낸스': 'ONDO',
        '폴리곤': 'POL',
        '폴리곤(POL)': 'POL',
        '매틱': 'POL',
        '대한민국 원': 'KRW'
    },

    knownKoreanNames: {
        'ARKM': '아캄',
        'BTC': '비트코인',
        'ETH': '이더리움',
        'SOL': '솔라나',
        'XRP': '리플',
        'DOGE': '도지코인',
        'WLD': '월드코인',
        'SUI': '수이',
        'APT': '앱토스',
        'SEI': '세이',
        'STRK': '스타크넷',
        'MINA': '미나',
        'BLUR': '블러',
        'SHIB': '시바이누',
        'PEPE': '페페',
        'BONK': '봉크',
        'FLOKI': '플로키',
        'ADA': '에이다',
        'AVAX': '아발란체',
        'DOT': '폴카닷',
        'MATIC': '폴리곤',
        'POL': '폴리곤(POL)',
        'TRX': '트론',
        'LINK': '체인링크',
        'NEAR': '니어프로토콜',
        'ETC': '이더리움클래식',
        'BCH': '비트코인캐시',
        'XLM': '스텔라루멘',
        'SAND': '샌드박스',
        'MANA': '디센트럴랜드',
        'AXS': '엑시인피니티',
        'FLOW': '플로우',
        'STX': '스택스',
        'ALGO': '알고랜드',
        'ATOM': '코스모스',
        'EOS': '이오스',
        'WAVES': '웨이브',
        'CHZ': '칠리즈',
        'ENJ': '엔진코인',
        'BAT': '베이직어텐션토큰',
        'ZIL': '질리카',
        'ICX': '아이콘',
        'VET': '비체인',
        'NEO': '네오',
        'GAS': '가스',
        'ONT': '온톨로지',
        'QTUM': '퀀텀',
        'KAVA': '카바',
        '1INCH': '1인치',
        'AAVE': '에이브',
        'UNI': '유니스왑',
        'MKR': '메이커',
        'CRV': '커브',
        'PENDLE': '펜들',
        'TAIKO': '타이코',
        'AUCTION': '바운스토큰',
        'RENDER': '렌더토큰',
        'JTO': '지토',
        'W': '웜홀',
        'ZETA': '제타체인',
        'EDU': '오픈캠퍼스',
        'OP': '옵티미즘',
        'ARB': '아비트럼',
        'TIA': '셀레스티아',
        'ONDO': '온도파이낸스',
        'KRW': '대한민국 원'
    },

    marketInfoMap: {},
    isMarketInfoLoaded: false,

    initMarketInfo: async function () {
        if (this.isMarketInfoLoaded) return;
        try {
            const res = await fetch('https://api.upbit.com/v1/market/all?isDetails=false');
            if (res.ok) {
                const data = await res.json();
                data.forEach(item => {
                    this.marketInfoMap[item.market] = {
                        koreanName: item.korean_name,
                        englishName: item.english_name,
                        market: item.market
                    };
                    // 한글명 -> 영문 심볼/마켓 매핑 자동 등록
                    const symbol = item.market.split('-')[1];
                    if (symbol) {
                        this.koreanToSymbolMap[item.korean_name] = symbol;
                        this.knownKoreanNames[symbol] = item.korean_name;
                    }
                });
                this.isMarketInfoLoaded = true;
            }
        } catch (err) {
            console.warn('업비트 마켓 정보 로드 실패 (기본 사전 사용):', err.message);
        }
    },

    /**
     * 입력값(한글명, 티커, 마켓 등)을 표준 영문 마켓(예: KRW-ARKM)과 심볼(ARKM)로 정규화
     */
    getStandardMarketInfo: function (input) {
        if (!input) return { symbol: '', market: '' };
        let str = String(input).trim();

        if (str === 'KRW' || str === '원화' || str === '대한민국 원') {
            return { symbol: 'KRW', market: 'KRW-KRW' };
        }

        // 괄호 안에 영문 티커가 있는 경우 (예: 아캄(ARKM), 비트코인(BTC))
        const match = str.match(/\((.*?)\)/);
        if (match && match[1]) {
            str = match[1].trim();
        }

        // 슬래시가 있는 경우 (예: ARKM/KRW)
        if (str.includes('/')) {
            const parts = str.split('/');
            str = parts[0].trim();
        }

        // 1. 이미 'KRW-XXX' 형태인 경우
        if (str.startsWith('KRW-') || str.startsWith('BTC-') || str.startsWith('USDT-')) {
            const parts = str.split('-');
            const symbolCandidate = parts[1];
            // 만약 심볼 부분이 한글인 경우 (예: KRW-아캄)
            if (this.koreanToSymbolMap[symbolCandidate]) {
                const sym = this.koreanToSymbolMap[symbolCandidate];
                return { symbol: sym, market: `KRW-${sym}` };
            }
            return { symbol: symbolCandidate.toUpperCase(), market: str.toUpperCase() };
        }

        // 2. 한글 코인명인 경우 (예: '아캄', '비트코인')
        if (this.koreanToSymbolMap[str]) {
            const sym = this.koreanToSymbolMap[str];
            return { symbol: sym, market: `KRW-${sym}` };
        }

        // 3. 영문 심볼인 경우 (예: 'ARKM', 'BTC')
        const upper = str.toUpperCase();
        return { symbol: upper, market: `KRW-${upper}` };
    },

    getKoreanName: function (marketOrSymbol) {
        if (!marketOrSymbol) return '';
        const { symbol, market } = this.getStandardMarketInfo(marketOrSymbol);

        if (symbol === 'KRW') return '대한민국 원';

        if (this.marketInfoMap[market]) {
            return this.marketInfoMap[market].koreanName;
        }
        if (this.knownKoreanNames[symbol]) {
            return this.knownKoreanNames[symbol];
        }
        return symbol;
    },

    fetchTickers: async function (markets) {
        if (!markets || markets.length === 0) return {};

        const krwMarkets = markets
            .map(m => this.getStandardMarketInfo(m).market)
            .filter(m => m && m !== 'KRW-KRW' && m !== 'KRW')
            .filter((v, i, a) => a.indexOf(v) === i);

        if (krwMarkets.length === 0) return {};

        try {
            const marketParam = krwMarkets.join(',');
            const res = await fetch(`https://api.upbit.com/v1/ticker?markets=${encodeURIComponent(marketParam)}`);
            
            if (!res.ok) {
                throw new Error(`업비트 API 응답 오류 (${res.status})`);
            }

            const tickerArray = await res.json();
            const tickerMap = {};

            tickerArray.forEach(item => {
                tickerMap[item.market] = {
                    market: item.market,
                    tradePrice: item.trade_price,
                    prevClosingPrice: item.prev_closing_price,
                    change: item.change,
                    changeRate: item.change_rate,
                    signedChangeRate: item.signed_change_rate,
                    signedChangePrice: item.signed_change_price,
                    accTradePrice24h: item.acc_trade_price_24h,
                    highPrice: item.high_price,
                    lowPrice: item.low_price,
                    timestamp: item.timestamp
                };
            });

            return tickerMap;
        } catch (err) {
            console.error('업비트 실시간 시세 조회 실패:', err);
            return {};
        }
    },

    /**
     * 업비트 & 빗썸 다주기 캔들 시세 데이터 조회 API
     * (한글명/티커 자동 정규화 + 업비트 ➔ 빗썸 폴백 완벽 지원)
     */
    fetchCandles: async function (marketOrSymbol, candleType = 'days', count = 200, to = '') {
        const { symbol, market } = this.getStandardMarketInfo(marketOrSymbol);
        if (!symbol || symbol === 'KRW') return [];

        let url = `https://api.upbit.com/v1/candles/${candleType}?market=${encodeURIComponent(market)}&count=${count}`;
        if (to) {
            let toParam = to;
            if (to.includes(' ')) {
                toParam = to.replace(' ', 'T') + '+09:00';
            }
            url += `&to=${encodeURIComponent(toParam)}`;
        }

        try {
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    return data.reverse().map(c => ({
                        time: c.candle_date_time_kst.replace('T', ' '),
                        date: c.candle_date_time_kst.split('T')[0],
                        open: c.opening_price,
                        high: c.high_price,
                        low: c.low_price,
                        close: c.trade_price,
                        volume: c.candle_acc_trade_volume,
                        price: c.trade_price,
                        timestamp: new Date(c.candle_date_time_kst).getTime()
                    }));
                }
            }
        } catch (err) {
            console.warn(`업비트 캔들 API 실패 (${market}), 빗썸 API로 대체 시도:`, err);
        }

        // 2순위: 빗썸 공식 캔들 API 폴백 호출
        try {
            let bithumbInterval = '24h';
            if (candleType === 'minutes/1') bithumbInterval = '1m';
            else if (candleType === 'minutes/3') bithumbInterval = '3m';
            else if (candleType === 'minutes/5') bithumbInterval = '5m';
            else if (candleType === 'minutes/10') bithumbInterval = '10m';
            else if (candleType === 'minutes/30') bithumbInterval = '30m';
            else if (candleType === 'minutes/60') bithumbInterval = '1h';
            else if (candleType === 'minutes/240') bithumbInterval = '6h';
            else if (candleType === 'days') bithumbInterval = '24h';
            else if (candleType === 'weeks' || candleType === 'months') bithumbInterval = '24h';

            const bRes = await fetch(`https://api.bithumb.com/public/candlestick/${encodeURIComponent(symbol)}_KRW/${bithumbInterval}`);
            if (bRes.ok) {
                const bData = await bRes.json();
                if (bData && bData.status === '0000' && Array.isArray(bData.data)) {
                    // 빗썸 데이터 포맷: [ [time_ms, open, close, high, low, volume], ... ]
                    const bCandles = bData.data.slice(-count).map(row => {
                        const d = new Date(Number(row[0]));
                        const timeStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:00`;
                        const dateStr = timeStr.split(' ')[0];
                        return {
                            time: timeStr,
                            date: dateStr,
                            open: parseFloat(row[1]),
                            close: parseFloat(row[2]),
                            high: parseFloat(row[3]),
                            low: parseFloat(row[4]),
                            volume: parseFloat(row[5]),
                            price: parseFloat(row[2]),
                            timestamp: Number(row[0])
                        };
                    });
                    return bCandles;
                }
            }
        } catch (bErr) {
            console.warn(`빗썸 캔들 API 조회 실패 (${symbol}):`, bErr);
        }

        return [];
    },

    enrichCoinSummariesWithTickers: function (coinSummaries, tickerMap) {
        let totalCurrentValue = 0;
        let totalUnrealizedProfit = 0;

        coinSummaries.forEach(coin => {
            const { symbol, market } = this.getStandardMarketInfo(coin.market || coin.coinSymbol);
            const ticker = tickerMap[market];

            coin.koreanName = this.getKoreanName(market);

            if (ticker && coin.holdingQty > 1e-8) {
                coin.currentPrice = ticker.tradePrice;
                coin.currentValue = coin.holdingQty * ticker.tradePrice;
                coin.unrealizedProfit = coin.currentValue - coin.holdingCost;
                coin.unrealizedRoi = coin.holdingCost > 0 
                    ? (coin.unrealizedProfit / coin.holdingCost) * 100 
                    : 0;
                coin.change24h = ticker.signedChangeRate * 100;
                
                totalCurrentValue += coin.currentValue;
                totalUnrealizedProfit += coin.unrealizedProfit;
            } else if (ticker) {
                coin.currentPrice = ticker.tradePrice;
                coin.currentValue = 0;
                coin.unrealizedProfit = 0;
                coin.unrealizedRoi = 0;
                coin.change24h = ticker.signedChangeRate * 100;
            } else {
                coin.currentPrice = coin.currentPrice || 0;
                coin.currentValue = coin.currentValue || (coin.holdingQty * coin.avgBuyPrice);
                coin.unrealizedProfit = coin.unrealizedProfit || 0;
                coin.unrealizedRoi = coin.unrealizedRoi || 0;
                coin.change24h = 0;
            }

            if (coin.currentPrice > 0) {
                coin.gainedCoinQty = coin.realizedProfit / coin.currentPrice;
                coin.gainedCoinRoi = coin.totalBuyQty > 0 ? (coin.gainedCoinQty / coin.totalBuyQty) * 100 : 0;
            }
        });

        return {
            coinSummaries,
            totalCurrentValue,
            totalUnrealizedProfit
        };
    },

    enrichStakingWithTickers: function (stakingRecords, tickerMap) {
        let totalStakingValue = 0;
        let totalAnnualEstimatedReward = 0;

        stakingRecords.forEach(rec => {
            const { market } = this.getStandardMarketInfo(rec.market || rec.coinSymbol);
            const ticker = tickerMap[market];
            rec.koreanName = this.getKoreanName(market);

            if (ticker) {
                rec.currentPrice = ticker.tradePrice;
                rec.currentValue = rec.currentStakedQty * ticker.tradePrice;
                totalStakingValue += rec.currentValue;
            } else {
                rec.currentPrice = 0;
                rec.currentValue = 0;
            }

            if (rec.apy && rec.currentValue > 0) {
                rec.annualReward = rec.currentValue * (rec.apy / 100);
                totalAnnualEstimatedReward += rec.annualReward;
            }
        });

        return {
            stakingRecords,
            totalStakingValue,
            totalAnnualEstimatedReward
        };
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = UpbitAPI;
}
