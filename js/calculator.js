/**
 * calculator.js
 * 업비트 & 빗썸 매매 손익, 입출금, 스테이킹, 전체 통합 활동 타임라인 계산 엔진
 */

const ProfitCalculator = {
    calculate: function (items, options = {}) {
        const method = options.method || 'fifo';
        const exchangeFilter = options.exchange || 'ALL';
        const customStaking = options.customStaking || [];
        
        if (!items || items.length === 0) {
            return this.getEmptyResult(method);
        }

        // 거래소 필터링
        let filteredItems = items;
        if (exchangeFilter !== 'ALL') {
            filteredItems = items.filter(it => it.exchange === exchangeFilter);
        }

        // 카테고리별 분리
        const tradeItems = filteredItems.filter(it => 
      (it.category === 'trade' || it.type === '매수' || it.type === '매도') &&
      it.market !== 'KRW' && it.market !== 'KRW-KRW' && it.coinSymbol !== 'KRW' &&
      it.coinSymbol !== '입금' && it.coinSymbol !== '출금' && it.coinSymbol !== '매수' && it.coinSymbol !== '매도'
  );
        const transferItems = filteredItems.filter(it => it.category === 'transfer' || it.type.includes('입금') || it.type.includes('출금'));
        const stakingItems = filteredItems.filter(it => it.category === 'staking' || it.type.includes('스테이킹'));

        // 입출금 집계
        const transfersSummary = this.calculateTransfers(transferItems);

        // 스테이킹 집계
        const stakingSummary = this.calculateStaking(stakingItems, customStaking);

        // 매매 손익 및 코인 잔고 계산을 위해 코인 관련 항목 전체(매매 + 코인입출금 + 스테이킹)를 마켓별로 그룹화
        const tradesByMarket = {};
        filteredItems.forEach(item => {
            if (item.market === 'KRW' || item.market === 'KRW-KRW' || item.coinSymbol === 'KRW' ||
                item.type === '원화입금' || item.type === '원화출금') {
                return;
            }
            if (item.coinSymbol === '입금' || item.coinSymbol === '출금' || item.coinSymbol === '매수' || item.coinSymbol === '매도') {
                return;
            }
            const groupKey = `${item.exchange || 'UPBIT'}:::${item.market}`;
            if (!tradesByMarket[groupKey]) {
                tradesByMarket[groupKey] = [];
            }
            tradesByMarket[groupKey].push(item);
        });

        const coinSummaries = {};
        const enrichedTrades = [];
        const cumulativeProfitHistory = [];
        let runningCumulativeProfit = 0;

        const monthlyStatsMap = {};
        const yearlyStatsMap = {};

        for (const [market, marketTrades] of Object.entries(tradesByMarket)) {
            const coinResult = method === 'fifo' 
                ? this.calculateMarketFIFO(market, marketTrades)
                : this.calculateMarketMovingAvg(market, marketTrades);

            coinSummaries[market] = coinResult.summary;
            coinResult.enrichedTrades.forEach(t => enrichedTrades.push(t));
        }

        enrichedTrades.sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));

        // 월별/연도별 및 누적 손익 집계
        enrichedTrades.forEach(trade => {
            const monthKey = trade.time.substring(0, 7);
            const yearKey = trade.time.substring(0, 4);

            if (!monthlyStatsMap[monthKey]) {
                monthlyStatsMap[monthKey] = {
                    period: monthKey,
                    realizedProfit: 0,
                    buyVolume: 0,
                    sellVolume: 0,
                    totalVolume: 0,
                    totalFees: 0,
                    tradesCount: 0,
                    winCount: 0,
                    lossCount: 0
                };
            }
            if (!yearlyStatsMap[yearKey]) {
                yearlyStatsMap[yearKey] = {
                    period: yearKey,
                    realizedProfit: 0,
                    buyVolume: 0,
                    sellVolume: 0,
                    totalVolume: 0,
                    totalFees: 0,
                    tradesCount: 0,
                    winCount: 0,
                    lossCount: 0
                };
            }

            const mStat = monthlyStatsMap[monthKey];
            const yStat = yearlyStatsMap[yearKey];

            mStat.tradesCount++;
            yStat.tradesCount++;
            mStat.totalFees += trade.fee;
            yStat.totalFees += trade.fee;

            if (trade.type === '매수') {
                mStat.buyVolume += trade.amount;
                yStat.buyVolume += trade.amount;
                mStat.totalVolume += trade.amount;
                yStat.totalVolume += trade.amount;
            } else if (trade.type === '매도') {
                mStat.sellVolume += trade.amount;
                yStat.sellVolume += trade.amount;
                mStat.totalVolume += trade.amount;
                yStat.totalVolume += trade.amount;

                const profit = trade.realizedProfit || 0;
                mStat.realizedProfit += profit;
                yStat.realizedProfit += profit;

                if (profit > 0) {
                    mStat.winCount++;
                    yStat.winCount++;
                } else if (profit < 0) {
                    mStat.lossCount++;
                    yStat.lossCount++;
                }

                runningCumulativeProfit += profit;
                cumulativeProfitHistory.push({
                    time: trade.time,
                    date: trade.date,
                    market: trade.market,
                    coinSymbol: trade.coinSymbol,
                    exchange: trade.exchange || 'UPBIT',
                    tradeProfit: profit,
                    cumulativeProfit: runningCumulativeProfit,
                    roi: trade.realizedRoi || 0
                });
            }
        });

        // 원금 및 종합 통계 산출
        let totalCumulativeBuyAmount = 0;
        let totalCumulativeSellAmount = 0;
        let totalFees = 0;
        let totalRealizedProfit = 0;
        let totalWinTrades = 0;
        let totalLossTrades = 0;
        let totalSellTrades = 0;
        let totalBuyTrades = 0;
        let currentPortfolioCost = 0;

        Object.values(coinSummaries).forEach(c => {
            totalCumulativeBuyAmount += c.totalBuyAmount;
            totalCumulativeSellAmount += c.totalSellAmount;
            totalFees += c.totalFee;
            totalRealizedProfit += c.realizedProfit;
            totalWinTrades += c.winTrades;
            totalLossTrades += c.lossTrades;
            totalSellTrades += c.totalSellCount;
            totalBuyTrades += c.totalBuyCount;
            currentPortfolioCost += c.holdingCost;
        });

        const totalTradesCount = enrichedTrades.length;
        const totalWinRate = totalSellTrades > 0 ? (totalWinTrades / totalSellTrades) * 100 : 0;
        
        const closedCostBasis = totalCumulativeBuyAmount - currentPortfolioCost;
        const totalRealizedRoi = closedCostBasis > 0 ? (totalRealizedProfit / closedCostBasis) * 100 : 0;

        const monthlyStats = Object.values(monthlyStatsMap).sort((a, b) => a.period.localeCompare(b.period));
        monthlyStats.forEach(m => {
            const sellTrades = m.winCount + m.lossCount;
            m.winRate = sellTrades > 0 ? (m.winCount / sellTrades) * 100 : 0;
        });

        const yearlyStats = Object.values(yearlyStatsMap).sort((a, b) => a.period.localeCompare(b.period));
        yearlyStats.forEach(y => {
            const sellTrades = y.winCount + y.lossCount;
            y.winRate = sellTrades > 0 ? (y.winCount / sellTrades) * 100 : 0;
        });

        const DEFAULT_MARKET_PRICES = {
            'BTC': 106145000, 'ETH': 3280000, 'SOL': 137400, 'XRP': 1854, 'DOGE': 112,
            'ADA': 275, 'AVAX': 35600, 'DOT': 5200, 'MATIC': 420, 'POL': 420,
            'LINK': 19200, 'NEAR': 4800, 'TRX': 240, 'ETC': 24500, 'SUI': 2550,
            'APT': 7900, 'SEI': 380, 'SHIB': 0.019, 'PEPE': 0.012, 'WLD': 2150,
            'RENDER': 6200, 'ATOM': 5800, 'ALGO': 175, 'XLM': 130, 'SAND': 340,
            'MANA': 380, 'AXS': 5800, 'FLOW': 780, 'EOS': 680, 'ENJ': 190,
            'HBAR': 95, 'CRO': 72.0, 'STX': 2100, 'VET': 28, 'ICP': 10500,
            'TIA': 6200, 'INJ': 24000, 'BLUR': 220, 'MINA': 580, 'KAVA': 480,
            'CHZ': 78, 'AAVE': 175000, 'UNI': 9200, 'IMX': 1750, 'GALA': 25,
            'OP': 1850, 'ARB': 680, 'CELO': 720, 'QTUM': 3200, 'NEO': 13800,
            'GAS': 4100, 'ONT': 240, 'ONG': 380, 'IOST': 8.8, 'THETA': 1550,
            'TFUEL': 72, 'ZIL': 20, 'KAIA': 170, 'KLAY': 170, 'MEW': 8.8,
            'BONK': 0.024, 'WIF': 2600, 'FLOKI': 0.19, 'TON': 6800, 'ONDO': 1080,
            'PENDLE': 4800, 'JUP': 1080, 'PYTH': 410, 'ENA': 620, 'STRK': 490,
            'TAO': 510000, 'FET': 1350, 'GRT': 240, 'AR': 21500, 'FIL': 4800
        };

        const coinSummariesList = Object.values(coinSummaries).sort((a, b) => b.realizedProfit - a.realizedProfit);

        let totalCurrentValue = 0;
        let totalUnrealizedProfit = 0;

        coinSummariesList.forEach(coin => {
            const sym = (coin.coinSymbol || (coin.market ? coin.market.replace('KRW-', '') : '')).toUpperCase();
            let livePrice = 0;
            let change24hVal = 0;

            if (parseFloat(coin.currentPrice) > 0 && parseFloat(coin.currentPrice) !== parseFloat(coin.avgBuyPrice)) {
                livePrice = parseFloat(coin.currentPrice);
            } else if (typeof UpbitAPI !== 'undefined' && UpbitAPI.fallbackPrices && UpbitAPI.fallbackPrices[sym]) {
                livePrice = UpbitAPI.fallbackPrices[sym];
            } else if (DEFAULT_MARKET_PRICES[sym]) {
                livePrice = DEFAULT_MARKET_PRICES[sym];
            } else if (parseFloat(coin.avgBuyPrice) > 0) {
                livePrice = parseFloat(coin.avgBuyPrice);
            }

            coin.currentPrice = livePrice;
            coin.change24h = change24hVal;

            const hQty = parseFloat(coin.holdingQty) || 0;
            const hCost = parseFloat(coin.holdingCost) || 0;

            if (hQty > 1e-8 && livePrice > 0) {
                coin.currentValue = hQty * livePrice;
                coin.unrealizedProfit = coin.currentValue - hCost;
                coin.unrealizedRoi = hCost > 0 ? (coin.unrealizedProfit / hCost) * 100 : 0;
                totalCurrentValue += coin.currentValue;
                totalUnrealizedProfit += coin.unrealizedProfit;
            } else {
                coin.currentValue = 0;
                coin.unrealizedProfit = 0;
                coin.unrealizedRoi = 0;
            }

            if (coin.currentPrice > 0) {
                coin.gainedCoinQty = (coin.realizedProfit || 0) / coin.currentPrice;
                coin.gainedCoinRoi = (coin.totalBuyQty || 0) > 0 ? (coin.gainedCoinQty / coin.totalBuyQty) * 100 : 0;
            }
        });

        // ★ 전체 통합 활동 내역 (All Activities Timeline): 매매 + 입출금 + 스테이킹 전체를 시간순으로 병합
        const allActivities = [
            ...enrichedTrades,
            ...transferItems,
            ...stakingItems
        ];
        allActivities.sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));

        return {
            method: method,
            exchange: exchangeFilter,
            summary: {
                currentPortfolioCost: currentPortfolioCost,
                totalCurrentValue: totalCurrentValue,
                totalUnrealizedProfit: totalUnrealizedProfit,
                totalUnrealizedRoi: currentPortfolioCost > 0 ? (totalUnrealizedProfit / currentPortfolioCost) * 100 : 0,
                netKrwDeposits: transfersSummary.netKrwDeposit,
                totalCumulativeBuyAmount: totalCumulativeBuyAmount,
                totalCumulativeSellAmount: totalCumulativeSellAmount,
                totalInvested: currentPortfolioCost,
                totalSold: totalCumulativeSellAmount,
                totalFees: totalFees,
                totalRealizedProfit: totalRealizedProfit,
                totalRealizedRoi: totalRealizedRoi,
                totalTradesCount: totalTradesCount,
                totalBuyTrades: totalBuyTrades,
                totalSellTrades: totalSellTrades,
                totalWinTrades: totalWinTrades,
                totalLossTrades: totalLossTrades,
                totalWinRate: totalWinRate,
                coinsCount: coinSummariesList.length,
                holdingCoinsCount: coinSummariesList.filter(c => c.holdingQty > 1e-8).length
            },
            coinSummaries: coinSummariesList,
            totalCurrentValue: totalCurrentValue,
            totalUnrealizedProfit: totalUnrealizedProfit,
            totalUnrealizedRoi: currentPortfolioCost > 0 ? (totalUnrealizedProfit / currentPortfolioCost) * 100 : 0,
            monthlyStats: monthlyStats,
            yearlyStats: yearlyStats,
            cumulativeProfitHistory: cumulativeProfitHistory,
            trades: enrichedTrades,
            allActivities: allActivities, // 전체 통합 활동 내역
            transfers: transfersSummary,
            staking: stakingSummary,
            rawTransfersList: transferItems,
            rawStakingList: stakingItems
        };
    },

    calculateTransfers: function (transferItems) {
        let totalKrwDeposit = 0;
        let totalKrwWithdraw = 0;
        let totalKrwDepositFees = 0;
        let totalKrwWithdrawFees = 0;
        const coinTransfersMap = {};

        transferItems.forEach(item => {
            const type = item.type;
            const amount = item.amount || (item.quantity * item.price) || 0;
            const fee = item.fee || 0;

            if (type === '원화입금' || (item.market === 'KRW' && type.includes('입금'))) {
                totalKrwDeposit += amount;
                totalKrwDepositFees += fee;
            } else if (type === '원화출금' || (item.market === 'KRW' && type.includes('출금'))) {
                totalKrwWithdraw += amount;
                totalKrwWithdrawFees += fee;
            } else {
                // 코인 입출금 (거래소별 독립 분리 집계)
                const ex = item.exchange || 'UPBIT';
                const key = `${ex}:::${item.coinSymbol}`;
                if (!coinTransfersMap[key]) {
                    coinTransfersMap[key] = {
                        coinSymbol: item.coinSymbol,
                        market: item.market,
                        exchange: ex,
                        depositQty: 0,
                        withdrawQty: 0,
                        depositCount: 0,
                        withdrawCount: 0,
                        totalFees: 0
                    };
                }
                const cTrans = coinTransfersMap[key];
                cTrans.totalFees += fee;

                if (type.includes('입금')) {
                    cTrans.depositQty += item.quantity;
                    cTrans.depositCount++;
                } else if (type.includes('출금')) {
                    cTrans.withdrawQty += item.quantity;
                    cTrans.withdrawCount++;
                }
            }
        });

        const netKrwDeposit = totalKrwDeposit - totalKrwWithdraw;
        const coinTransfersList = Object.values(coinTransfersMap).map(c => ({
            ...c,
            netQty: c.depositQty - c.withdrawQty
        }));

        transferItems.sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));

        return {
            totalKrwDeposit,
            totalKrwWithdraw,
            totalKrwDepositFees,
            totalKrwWithdrawFees,
            netKrwDeposit,
            totalTransferCount: transferItems.length,
            coinTransfers: coinTransfersList,
            items: transferItems
        };
    },

    calculateStaking: function (stakingItems, customStaking = []) {
        const stakingMap = {};

        stakingItems.forEach(item => {
            const symbol = item.coinSymbol;
            if (!stakingMap[symbol]) {
                stakingMap[symbol] = {
                    coinSymbol: symbol,
                    market: item.market,
                    exchange: item.exchange || 'UPBIT',
                    stakedQty: 0,
                    unstakedQty: 0,
                    currentStakedQty: 0,
                    totalRewardQty: 0,
                    totalRewardKrw: 0,
                    rewardCount: 0,
                    isCustom: false
                };
            }

            const rec = stakingMap[symbol];
            if (item.type === '스테이킹') {
                rec.stakedQty += item.quantity;
            } else if (item.type === '언스테이킹') {
                rec.unstakedQty += item.quantity;
            } else if (item.type === '스테이킹보상') {
                rec.totalRewardQty += item.quantity;
                rec.totalRewardKrw += (item.amount || (item.quantity * item.price));
                rec.rewardCount++;
            }
            rec.currentStakedQty = Math.max(0, rec.stakedQty - rec.unstakedQty);
        });

        customStaking.forEach(custom => {
            const symbol = custom.coinSymbol;
            if (!stakingMap[symbol]) {
                stakingMap[symbol] = {
                    coinSymbol: symbol,
                    market: custom.market || `KRW-${symbol}`,
                    exchange: custom.exchange || 'UPBIT',
                    stakedQty: custom.quantity || 0,
                    unstakedQty: 0,
                    currentStakedQty: custom.quantity || 0,
                    totalRewardQty: 0,
                    totalRewardKrw: 0,
                    rewardCount: 0,
                    apy: custom.apy || 0,
                    startDate: custom.startDate || '',
                    isCustom: true
                };
            } else {
                stakingMap[symbol].currentStakedQty += (custom.quantity || 0);
                stakingMap[symbol].stakedQty += (custom.quantity || 0);
                if (custom.apy) stakingMap[symbol].apy = custom.apy;
                if (custom.startDate) stakingMap[symbol].startDate = custom.startDate;
            }
        });

        const stakingList = Object.values(stakingMap);
        stakingItems.sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));

        return {
            records: stakingList,
            items: stakingItems,
            totalStakingCoinsCount: stakingList.length
        };
    },

    calculateMarketFIFO: function (marketKey, trades) {
        const buyQueue = [];
        const enrichedTrades = [];
        
        let totalBuyAmount = 0;
        let totalSellAmount = 0;
        let totalBuyQty = 0;
        let totalSellQty = 0;
        let totalFee = 0;
        let realizedProfit = 0;
        let winTrades = 0;
        let lossTrades = 0;
        let totalBuyCount = 0;
        let totalSellCount = 0;

        const market = marketKey.includes(':::') ? marketKey.split(':::')[1] : marketKey;
        const exchange = (trades[0] && trades[0].exchange) ? trades[0].exchange : (marketKey.includes(':::') ? marketKey.split(':::')[0] : 'UPBIT');
        const coinSymbol = market.includes('-') ? market.split('-')[1] : market;

        trades.forEach(trade => {
            const enriched = { ...trade };
            totalFee += (trade.fee || 0);

            if (trade.type === '매수') {
                totalBuyCount++;
                totalBuyAmount += trade.amount;
                totalBuyQty += trade.quantity;

                const feePerUnit = trade.quantity > 0 ? (trade.fee || 0) / trade.quantity : 0;
                buyQueue.push({
                    quantity: trade.quantity,
                    remainingQty: trade.quantity,
                    price: trade.price,
                    feePerUnit: feePerUnit,
                    time: trade.time,
                    tradeAmount: trade.amount
                });

                enriched.costBasis = 0;
                enriched.realizedProfit = 0;
                enriched.realizedRoi = 0;
                enrichedTrades.push(enriched);

            } else if (trade.type === '매도') {
                totalSellCount++;
                totalSellAmount += trade.amount;
                totalSellQty += trade.quantity;

                let sellQtyRemaining = trade.quantity;
                let tradeCostBasis = 0;
                let tradeBuyFees = 0;

                while (sellQtyRemaining > 1e-8 && buyQueue.length > 0) {
                    const currentBuy = buyQueue[0];
                    const matchQty = Math.min(sellQtyRemaining, currentBuy.remainingQty);

                    tradeCostBasis += matchQty * currentBuy.price;
                    tradeBuyFees += matchQty * currentBuy.feePerUnit;

                    currentBuy.remainingQty -= matchQty;
                    sellQtyRemaining -= matchQty;

                    if (currentBuy.remainingQty <= 1e-8) {
                        buyQueue.shift();
                    }
                }

                if (sellQtyRemaining > 1e-8) {
                    tradeCostBasis += sellQtyRemaining * trade.price;
                }

                const sellFee = trade.fee || 0;
                const netCostBasis = tradeCostBasis + tradeBuyFees;
                const netSellProceeds = trade.amount - sellFee;
                const tradeProfit = netSellProceeds - netCostBasis;
                const tradeRoi = netCostBasis > 0 ? (tradeProfit / netCostBasis) * 100 : 0;

                realizedProfit += tradeProfit;
                if (tradeProfit > 0) winTrades++;
                else if (tradeProfit < 0) lossTrades++;

                enriched.costBasis = netCostBasis;
                enriched.realizedProfit = tradeProfit;
                enriched.realizedRoi = tradeRoi;
                enrichedTrades.push(enriched);

            } else if (trade.type === '코인출금' || trade.type === '출금' || trade.type.includes('출금')) {
                // 코인 외부 출금/전송: 대기열에서 수량 차감 (보유 잔고 동기화, 매매 실현손익은 미발생)
                let withdrawQtyRemaining = trade.quantity;
                while (withdrawQtyRemaining > 1e-8 && buyQueue.length > 0) {
                    const currentBuy = buyQueue[0];
                    const matchQty = Math.min(withdrawQtyRemaining, currentBuy.remainingQty);
                    currentBuy.remainingQty -= matchQty;
                    withdrawQtyRemaining -= matchQty;
                    if (currentBuy.remainingQty <= 1e-8) {
                        buyQueue.shift();
                    }
                }
            } else if (trade.type === '코인입금' || trade.type === '입금' || trade.type.includes('입금') || trade.type === '스테이킹보상') {
                // 코인 입금 / 스테이킹 보상: 대기열에 추가
                buyQueue.push({
                    quantity: trade.quantity,
                    remainingQty: trade.quantity,
                    price: trade.price || 0,
                    feePerUnit: 0,
                    time: trade.time,
                    tradeAmount: trade.amount || (trade.quantity * (trade.price || 0))
                });
            }
        });

        let holdingQty = 0;
        let holdingCost = 0;
        buyQueue.forEach(lot => {
            holdingQty += lot.remainingQty;
            holdingCost += (lot.remainingQty * lot.price) + (lot.remainingQty * lot.feePerUnit);
        });

        // Dust & negligible holding cleanup (소수점 잔여 먼지/수수료 잔여 dust, 실질적 전량 매도/출금/마이그레이션 완료 처리)
        const netBought = totalBuyQty;
        const netHoldingRatio = netBought > 0 ? (holdingQty / netBought) : 0;
        const remainingDiff = Math.abs(totalBuyQty - totalSellQty);
        if (holdingQty <= 1e-4 || netHoldingRatio < 0.005 || remainingDiff <= 0.001 || (holdingCost > 0 && holdingCost < 100)) {
            holdingQty = 0;
            holdingCost = 0;
        }

        const avgBuyPrice = holdingQty > 1e-8 ? holdingCost / holdingQty : 0;
        const totalTradeVolume = totalBuyAmount + totalSellAmount;
        const realizedRoi = (totalBuyAmount - holdingCost) > 0 
            ? (realizedProfit / (totalBuyAmount - holdingCost)) * 100 
            : 0;

        const avgSellPrice = totalSellQty > 0 ? totalSellAmount / totalSellQty : 0;
        const referencePrice = avgSellPrice > 0 ? avgSellPrice : avgBuyPrice;
        const gainedCoinQty = referencePrice > 0 ? (realizedProfit / referencePrice) : 0;
        const gainedCoinRoi = totalBuyQty > 0 ? (gainedCoinQty / totalBuyQty) * 100 : 0;

        return {
            summary: {
                market,
                coinSymbol,
                exchange,
                totalBuyAmount,
                totalSellAmount,
                totalBuyQty,
                totalSellQty,
                totalFee,
                realizedProfit,
                realizedRoi,
                holdingQty: holdingQty > 1e-8 ? holdingQty : 0,
                holdingCost: holdingCost > 1e-8 ? holdingCost : 0,
                avgBuyPrice,
                avgSellPrice,
                gainedCoinQty,
                gainedCoinRoi,
                winTrades,
                lossTrades,
                winRate: totalSellCount > 0 ? (winTrades / totalSellCount) * 100 : 0,
                totalBuyCount,
                totalSellCount,
                totalTradesCount: totalBuyCount + totalSellCount,
                totalTradeVolume
            },
            enrichedTrades
        };
    },

    calculateMarketMovingAvg: function (marketKey, trades) {
        const enrichedTrades = [];

        let totalBuyAmount = 0;
        let totalSellAmount = 0;
        let totalBuyQty = 0;
        let totalSellQty = 0;
        let totalFee = 0;
        let realizedProfit = 0;
        let winTrades = 0;
        let lossTrades = 0;
        let totalBuyCount = 0;
        let totalSellCount = 0;

        let holdingQty = 0;
        let holdingCost = 0;
        let avgBuyPrice = 0;

        const market = marketKey.includes(':::') ? marketKey.split(':::')[1] : marketKey;
        const exchange = (trades[0] && trades[0].exchange) ? trades[0].exchange : (marketKey.includes(':::') ? marketKey.split(':::')[0] : 'UPBIT');
        const coinSymbol = market.includes('-') ? market.split('-')[1] : market;

        trades.forEach(trade => {
            const enriched = { ...trade };
            totalFee += (trade.fee || 0);

            if (trade.type === '매수') {
                totalBuyCount++;
                totalBuyAmount += trade.amount;
                totalBuyQty += trade.quantity;

                const buyTotalCost = trade.amount + (trade.fee || 0);
                holdingCost += buyTotalCost;
                holdingQty += trade.quantity;
                avgBuyPrice = holdingQty > 1e-8 ? holdingCost / holdingQty : 0;

                enriched.costBasis = 0;
                enriched.realizedProfit = 0;
                enriched.realizedRoi = 0;
                enriched.currentAvgPrice = avgBuyPrice;
                enrichedTrades.push(enriched);

            } else if (trade.type === '매도') {
                totalSellCount++;
                totalSellAmount += trade.amount;
                totalSellQty += trade.quantity;

                const sellQty = trade.quantity;
                const costBasis = sellQty * avgBuyPrice;
                const netSellProceeds = trade.amount - (trade.fee || 0);
                const tradeProfit = netSellProceeds - costBasis;
                const tradeRoi = costBasis > 0 ? (tradeProfit / costBasis) * 100 : 0;

                realizedProfit += tradeProfit;
                if (tradeProfit > 0) winTrades++;
                else if (tradeProfit < 0) lossTrades++;

                holdingQty = Math.max(0, holdingQty - sellQty);
                if (holdingQty <= 1e-8) {
                    holdingQty = 0;
                    holdingCost = 0;
                    avgBuyPrice = 0;
                } else {
                    holdingCost = holdingQty * avgBuyPrice;
                }

                enriched.costBasis = costBasis;
                enriched.realizedProfit = tradeProfit;
                enriched.realizedRoi = tradeRoi;
                enriched.currentAvgPrice = avgBuyPrice;
                enrichedTrades.push(enriched);

            } else if (trade.type === '코인출금' || trade.type === '출금' || trade.type.includes('출금')) {
                holdingQty = Math.max(0, holdingQty - trade.quantity);
                if (holdingQty <= 1e-8) {
                    holdingQty = 0;
                    holdingCost = 0;
                    avgBuyPrice = 0;
                } else {
                    holdingCost = holdingQty * avgBuyPrice;
                }
            } else if (trade.type === '코인입금' || trade.type === '입금' || trade.type.includes('입금') || trade.type === '스테이킹보상') {
                const depAmount = trade.amount || (trade.quantity * (trade.price || 0));
                holdingQty += trade.quantity;
                if (depAmount > 0) {
                    holdingCost += depAmount;
                    avgBuyPrice = holdingQty > 1e-8 ? holdingCost / holdingQty : 0;
                }
            }
        });

        // Dust & negligible holding cleanup (소수점 잔여 먼지/수수료 잔여 dust, 실질적 전량 매도/출금/마이그레이션 완료 처리)
        const netBought = totalBuyQty;
        const netHoldingRatio = netBought > 0 ? (holdingQty / netBought) : 0;
        const remainingDiff = Math.abs(totalBuyQty - totalSellQty);
        if (holdingQty <= 1e-4 || netHoldingRatio < 0.005 || remainingDiff <= 0.001 || (holdingCost > 0 && holdingCost < 100)) {
            holdingQty = 0;
            holdingCost = 0;
            avgBuyPrice = 0;
        }

        const totalTradeVolume = totalBuyAmount + totalSellAmount;
        const realizedRoi = (totalBuyAmount - holdingCost) > 0 
            ? (realizedProfit / (totalBuyAmount - holdingCost)) * 100 
            : 0;

        const avgSellPrice = totalSellCount > 0 ? totalSellAmount / totalSellQty : 0;
        const referencePrice = avgSellPrice > 0 ? avgSellPrice : avgBuyPrice;
        const gainedCoinQty = referencePrice > 0 ? (realizedProfit / referencePrice) : 0;
        const gainedCoinRoi = totalBuyQty > 0 ? (gainedCoinQty / totalBuyQty) * 100 : 0;

        return {
            summary: {
                market,
                coinSymbol,
                exchange,
                totalBuyAmount,
                totalSellAmount,
                totalBuyQty,
                totalSellQty,
                totalFee,
                realizedProfit,
                realizedRoi,
                holdingQty: holdingQty > 1e-8 ? holdingQty : 0,
                holdingCost: holdingCost > 1e-8 ? holdingCost : 0,
                avgBuyPrice,
                avgSellPrice,
                gainedCoinQty,
                gainedCoinRoi,
                winTrades,
                lossTrades,
                winRate: totalSellCount > 0 ? (winTrades / totalSellCount) * 100 : 0,
                totalBuyCount,
                totalSellCount,
                totalTradesCount: totalBuyCount + totalSellCount,
                totalTradeVolume
            },
            enrichedTrades
        };
    },

    getEmptyResult: function (method = 'fifo') {
        return {
            method: method,
            exchange: 'ALL',
            summary: {
                currentPortfolioCost: 0,
                netKrwDeposits: 0,
                totalCumulativeBuyAmount: 0,
                totalCumulativeSellAmount: 0,
                totalInvested: 0,
                totalSold: 0,
                totalFees: 0,
                totalRealizedProfit: 0,
                totalRealizedRoi: 0,
                totalTradesCount: 0,
                totalBuyTrades: 0,
                totalSellTrades: 0,
                totalWinTrades: 0,
                totalLossTrades: 0,
                totalWinRate: 0,
                coinsCount: 0,
                holdingCoinsCount: 0
            },
            coinSummaries: [],
            monthlyStats: [],
            yearlyStats: [],
            cumulativeProfitHistory: [],
            trades: [],
            allActivities: [],
            transfers: {
                totalKrwDeposit: 0,
                totalKrwWithdraw: 0,
                netKrwDeposit: 0,
                coinTransfers: [],
                items: []
            },
            staking: {
                records: [],
                items: []
            },
            rawTransfersList: [],
            rawStakingList: []
        };
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProfitCalculator;
}

if (typeof window !== "undefined") { window.ProfitCalculator = ProfitCalculator; }
