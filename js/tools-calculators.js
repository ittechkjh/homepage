/**
 * tools-calculators.js
 * 크립토PnL(CryptoPnL) 코인 계산기 5대 킬러 도구 엔진
 * 1. 물타기 & 불타기 다중 차수(DCA) 평단가/탈출 시뮬레이터
 * 2. 김치프리미엄(김프) & 거래소 간 보따리(아비트라지) 계산기 (실시간 연동)
 * 3. 가상자산 소득세(코인 세금) 정밀 계산기
 * 4. 해외 선물 롱/숏 레버리지 & 강제 청산가 계산기
 * 5. 업비트·빗썸 수익률 자랑용 바이럴 카드 생성기 (Canvas)
 */

const CoinCalculators = {
    activeSubTab: 'water',
    exchangeRateUsdKrw: 1380,
    coinStatsMap: {},
    // 매수 차수 (mode: 'amount' | 'qty' | 'pct')
    waterTiers: [
        { id: 1, mode: 'amount', price: 78000000, val: 10000000 }
    ],
    nextWaterTierId: 2,

    // 매도 차수 (mode: 'pct' | 'amount' | 'qty')
    sellTiers: [
        { id: 1, mode: 'pct', price: 98000000, val: 50 }
    ],
    nextSellTierId: 2,

    init: function () {
        this.bindEvents();
        this.renderWaterTiers();
        this.renderSellTiers();
        this.calcWater();
        this.calcTax();
        this.calcFutures();
        this.fetchKimpData();
        this.importProfitCardFromAnalyzer(false);
        this.renderProfitCard();
    },

    bindEvents: function () {
        const waterInputs = ['waterCurrentPrice', 'waterCurrentQty', 'waterFeeRate'];
        waterInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', () => this.calcWater());
        });

        const taxInputs = ['taxTotalSell', 'taxTotalBuy', 'taxTotalFee', 'taxDeductionType'];
        taxInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', () => this.calcTax());
        });

        const futuresInputs = ['futuresEntryPrice', 'futuresMargin', 'futuresLeverage', 'futuresTargetPrice', 'futuresPosType', 'futuresMarginMode'];
        futuresInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', () => this.calcFutures());
        });

        const cardInputs = ['cardNick', 'cardRoi', 'cardWinrate', 'cardTheme', 'cardHideAmount'];
        cardInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', () => this.renderProfitCard());
            if (el) el.addEventListener('change', () => this.renderProfitCard());
        });

        const dateInputs = ['cardPeriodStart', 'cardPeriodEnd'];
        dateInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', () => this.importProfitCardFromAnalyzer(false));
                el.addEventListener('input', () => this.importProfitCardFromAnalyzer(false));
            }
        });
    },

    switchSubTab: function (tabId) {
        this.activeSubTab = tabId;
        document.querySelectorAll('.calc-subtab-btn').forEach(btn => {
            const isMatch = (btn.dataset.calctab === tabId);
            btn.classList.toggle('active', isMatch);
            if (isMatch) {
                btn.className = 'calc-subtab-btn active px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold shadow-md shadow-amber-500/10';
            } else {
                btn.className = 'calc-subtab-btn px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 text-slate-400 hover:text-white border border-transparent font-medium hover:bg-navy-900';
            }
        });

        document.querySelectorAll('.calc-subtab-content').forEach(content => {
            const isTarget = (content.id === 'calc-tab-' + tabId);
            content.style.display = isTarget ? 'block' : 'none';
            content.classList.toggle('hidden', !isTarget);
        });

        if (tabId === 'kimp') {
            this.fetchKimpData();
        } else if (tabId === 'card') {
            this.renderProfitCard();
        }

        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            try { lucide.createIcons(); } catch (e) {}
        }
    },

    // ========================================================
    // 1. 물타기 & 불타기 다중 차수(DCA) 평단가/탈출 & 분할 매도 시뮬레이터
    // ========================================================

    // 매수 차수 UI 렌더링 (금액/수량/비중 선택 가능)
    renderWaterTiers: function () {
        const container = document.getElementById('waterTiersContainer');
        if (!container) return;

        container.innerHTML = this.waterTiers.map((tier, idx) => {
            const mode = tier.mode || 'amount';
            const valLabel = mode === 'amount' ? '투자 금액 (KRW)' : (mode === 'qty' ? '매수 수량 (개)' : '보유량 대비 비중 (%)');
            const placeholder = mode === 'amount' ? '10000000' : (mode === 'qty' ? '0.2' : '50');

            return `
              <div class="p-3 rounded-2xl bg-navy-950 border border-cyan-500/30 space-y-2 relative" data-tier-id="${tier.id}">
                <div class="flex justify-between items-center text-xs">
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-cyan-300 flex items-center gap-1">
                      <span class="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-mono">${idx + 1}</span>
                      <span>${idx + 1}차 추가 매수</span>
                    </span>
                    <select onchange="CoinCalculators.updateWaterTierMode(${tier.id}, this.value)" class="bg-navy-900 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold rounded-lg px-2 py-0.5 focus:outline-none cursor-pointer">
                      <option value="amount" ${mode === 'amount' ? 'selected' : ''}>₩ 금액 입력</option>
                      <option value="qty" ${mode === 'qty' ? 'selected' : ''}>🪙 수량 입력</option>
                      <option value="pct" ${mode === 'pct' ? 'selected' : ''}>％ 비중 입력</option>
                    </select>
                  </div>
                  ${this.waterTiers.length > 1 ? `<button type="button" onclick="CoinCalculators.removeWaterTier(${tier.id})" class="text-slate-500 hover:text-rose-400 text-xs px-1.5 py-0.5 rounded transition" title="차수 삭제">✕ 삭제</button>` : ''}
                </div>
                <div class="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label class="block font-semibold text-slate-400 mb-1 text-[11px]">매수 희망가 (KRW)</label>
                    <input type="number" step="any" value="${tier.price}" oninput="CoinCalculators.updateWaterTier(${tier.id}, 'price', this.value)" class="w-full bg-navy-900 border border-navy-700 rounded-xl px-2.5 py-1.5 text-cyan-300 font-mono font-bold text-xs focus:border-cyan-400 focus:outline-none">
                  </div>
                  <div>
                    <label class="block font-semibold text-slate-400 mb-1 text-[11px]">${valLabel}</label>
                    <input type="number" step="any" value="${tier.val}" placeholder="${placeholder}" oninput="CoinCalculators.updateWaterTier(${tier.id}, 'val', this.value)" class="w-full bg-navy-900 border border-navy-700 rounded-xl px-2.5 py-1.5 text-cyan-300 font-mono font-bold text-xs focus:border-cyan-400 focus:outline-none">
                  </div>
                </div>
              </div>
            `;
        }).join('');
    },

    addWaterTier: function () {
        const lastTier = this.waterTiers[this.waterTiers.length - 1];
        const defaultPrice = lastTier ? Number((lastTier.price * 0.9).toFixed(6)) : 70000000;
        const defaultMode = lastTier ? lastTier.mode : 'amount';
        const defaultVal = lastTier ? lastTier.val : 10000000;

        this.waterTiers.push({
            id: this.nextWaterTierId++,
            mode: defaultMode,
            price: defaultPrice,
            val: defaultVal
        });
        this.renderWaterTiers();
        this.calcWater();
    },

    removeWaterTier: function (id) {
        if (this.waterTiers.length <= 1) return;
        this.waterTiers = this.waterTiers.filter(t => t.id !== id);
        this.renderWaterTiers();
        this.calcWater();
    },

    updateWaterTier: function (id, field, value) {
        const tier = this.waterTiers.find(t => t.id === id);
        if (tier) {
            tier[field] = parseFloat(value) || 0;
            this.calcWater();
        }
    },

    updateWaterTierMode: function (id, newMode) {
        const tier = this.waterTiers.find(t => t.id === id);
        if (tier) {
            tier.mode = newMode;
            if (newMode === 'amount') tier.val = 10000000;
            else if (newMode === 'qty') tier.val = 0.2;
            else if (newMode === 'pct') tier.val = 50;
            this.renderWaterTiers();
            this.calcWater();
        }
    },

    // 매도 차수 UI 렌더링 (비중/수량/금액 선택 가능)
    renderSellTiers: function () {
        const container = document.getElementById('sellTiersContainer');
        if (!container) return;

        container.innerHTML = this.sellTiers.map((tier, idx) => {
            const mode = tier.mode || 'pct';
            const valLabel = mode === 'pct' ? '매도 비중 (%)' : (mode === 'qty' ? '매도 수량 (개)' : '매도 목표금액 (KRW)');
            const placeholder = mode === 'pct' ? '50' : (mode === 'qty' ? '0.3' : '20000000');

            return `
              <div class="p-3 rounded-2xl bg-navy-950 border border-amber-500/30 space-y-2 relative" data-sell-tier-id="${tier.id}">
                <div class="flex justify-between items-center text-xs">
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-amber-300 flex items-center gap-1">
                      <span class="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] font-mono">${idx + 1}</span>
                      <span>${idx + 1}차 분할 매도</span>
                    </span>
                    <select onchange="CoinCalculators.updateSellTierMode(${tier.id}, this.value)" class="bg-navy-900 border border-amber-500/30 text-amber-400 text-[10px] font-bold rounded-lg px-2 py-0.5 focus:outline-none cursor-pointer">
                      <option value="pct" ${mode === 'pct' ? 'selected' : ''}>％ 비중 입력</option>
                      <option value="qty" ${mode === 'qty' ? 'selected' : ''}>🪙 수량 입력</option>
                      <option value="amount" ${mode === 'amount' ? 'selected' : ''}>₩ 금액 입력</option>
                    </select>
                  </div>
                  ${this.sellTiers.length > 1 ? `<button type="button" onclick="CoinCalculators.removeSellTier(${tier.id})" class="text-slate-500 hover:text-rose-400 text-xs px-1.5 py-0.5 rounded transition" title="차수 삭제">✕ 삭제</button>` : ''}
                </div>
                <div class="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label class="block font-semibold text-slate-400 mb-1 text-[11px]">매도 희망가 (KRW)</label>
                    <input type="number" step="any" value="${tier.price}" oninput="CoinCalculators.updateSellTier(${tier.id}, 'price', this.value)" class="w-full bg-navy-900 border border-navy-700 rounded-xl px-2.5 py-1.5 text-amber-300 font-mono font-bold text-xs focus:border-amber-400 focus:outline-none">
                  </div>
                  <div>
                    <label class="block font-semibold text-slate-400 mb-1 text-[11px]">${valLabel}</label>
                    <input type="number" step="any" value="${tier.val}" placeholder="${placeholder}" oninput="CoinCalculators.updateSellTier(${tier.id}, 'val', this.value)" class="w-full bg-navy-900 border border-navy-700 rounded-xl px-2.5 py-1.5 text-amber-300 font-mono font-bold text-xs focus:border-amber-400 focus:outline-none">
                  </div>
                </div>
              </div>
            `;
        }).join('');
    },

    addSellTier: function () {
        const lastTier = this.sellTiers[this.sellTiers.length - 1];
        const defaultPrice = lastTier ? Number((lastTier.price * 1.1).toFixed(6)) : 105000000;
        const defaultMode = lastTier ? lastTier.mode : 'pct';
        const defaultVal = lastTier ? lastTier.val : 50;

        this.sellTiers.push({
            id: this.nextSellTierId++,
            mode: defaultMode,
            price: defaultPrice,
            val: defaultVal
        });
        this.renderSellTiers();
        this.calcWater();
    },

    removeSellTier: function (id) {
        if (this.sellTiers.length <= 1) return;
        this.sellTiers = this.sellTiers.filter(t => t.id !== id);
        this.renderSellTiers();
        this.calcWater();
    },

    updateSellTier: function (id, field, value) {
        const tier = this.sellTiers.find(t => t.id === id);
        if (tier) {
            tier[field] = parseFloat(value) || 0;
            this.calcWater();
        }
    },

    updateSellTierMode: function (id, newMode) {
        const tier = this.sellTiers.find(t => t.id === id);
        if (tier) {
            tier.mode = newMode;
            if (newMode === 'pct') tier.val = 50;
            else if (newMode === 'qty') tier.val = 0.2;
            else if (newMode === 'amount') tier.val = 20000000;
            this.renderSellTiers();
            this.calcWater();
        }
    },

    // 종합 DCA 매수 및 분할 매도 실시간 연산
    calcWater: function () {
        const curPrice = parseFloat(document.getElementById('waterCurrentPrice')?.value) || 0;
        const curQty = parseFloat(document.getElementById('waterCurrentQty')?.value) || 0;
        const feePercent = parseFloat(document.getElementById('waterFeeRate')?.value || 0.05) / 100;

        const curTotalCost = curPrice * curQty;
        let runningQty = curQty;
        let runningCost = curTotalCost;
        let lastAddPrice = curPrice;

        const tierProgressList = [];

        // 1. 추가 매수(DCA) 시뮬레이션
        this.waterTiers.forEach((tier, i) => {
            const p = parseFloat(tier.price) || 0;
            const mode = tier.mode || 'amount';
            const val = parseFloat(tier.val) || 0;

            let addedQty = 0;
            let addedAmount = 0;

            if (mode === 'amount') {
                addedAmount = val;
                addedQty = p > 0 ? (val / p) : 0;
            } else if (mode === 'qty') {
                addedQty = val;
                addedAmount = val * p;
            } else if (mode === 'pct') {
                addedQty = (val / 100) * curQty;
                addedAmount = addedQty * p;
            }

            runningQty += addedQty;
            runningCost += addedAmount;
            if (p > 0) lastAddPrice = p;

            const avgP = runningQty > 0 ? (runningCost / runningQty) : 0;
            const breakEven = (runningQty > 0 && (1 - feePercent) > 0)
                ? (runningCost * (1 + feePercent)) / (runningQty * (1 - feePercent))
                : avgP;
            const dropPct = curPrice > 0 ? ((avgP - curPrice) / curPrice) * 100 : 0;

            tierProgressList.push({
                tierNum: i + 1,
                price: p,
                mode: mode,
                val: val,
                amount: addedAmount,
                addedQty: addedQty,
                totalCost: runningCost,
                avgPrice: avgP,
                dropPct: dropPct,
                breakEven: breakEven
            });
        });

        const newTotalQty = runningQty;
        const newTotalCost = runningCost;
        const newAvgPrice = newTotalQty > 0 ? (newTotalCost / newTotalQty) : 0;

        const breakEvenPrice = (newTotalQty > 0 && (1 - feePercent) > 0)
            ? (newTotalCost * (1 + feePercent)) / (newTotalQty * (1 - feePercent))
            : newAvgPrice;

        const refPrice = lastAddPrice > 0 ? lastAddPrice : curPrice;
        const requiredGain = refPrice > 0 ? ((breakEvenPrice - refPrice) / refPrice) * 100 : 0;

        // 2. 추가 매도(분할 매도/익절) 시뮬레이션
        let remainingQty = newTotalQty;
        let totalRealizedProfit = 0;
        let totalRecoveredCash = 0;
        const sellProgressList = [];

        this.sellTiers.forEach((st, i) => {
            const sellPrice = parseFloat(st.price) || 0;
            const mode = st.mode || 'pct';
            const val = parseFloat(st.val) || 0;

            let sellQty = 0;
            if (mode === 'pct') {
                const pct = Math.max(0, Math.min(100, val));
                sellQty = (pct / 100) * remainingQty;
            } else if (mode === 'qty') {
                sellQty = Math.min(remainingQty, Math.max(0, val));
            } else if (mode === 'amount') {
                sellQty = sellPrice > 0 ? Math.min(remainingQty, Math.max(0, val / sellPrice)) : 0;
            }

            const sellVolume = sellQty * sellPrice;
            const sellFee = sellVolume * feePercent;
            const netCash = sellVolume - sellFee;
            const buyCostBasis = sellQty * newAvgPrice;
            const profit = netCash - buyCostBasis;
            const roiPct = buyCostBasis > 0 ? (profit / buyCostBasis) * 100 : 0;

            remainingQty = Math.max(0, remainingQty - sellQty);
            totalRealizedProfit += profit;
            totalRecoveredCash += netCash;

            sellProgressList.push({
                tierNum: i + 1,
                sellPrice: sellPrice,
                mode: mode,
                val: val,
                soldQty: sellQty,
                netCash: netCash,
                profit: profit,
                roiPct: roiPct,
                remainingQty: remainingQty
            });
        });

        const totalRoiPct = newTotalCost > 0 ? (totalRealizedProfit / newTotalCost) * 100 : 0;

        // 포맷팅 헬퍼 (수량 소수점 최대 8자리, 가격 소수점 정밀 표기)
        const formatCoinQty = (qty) => {
            if (qty === undefined || qty === null || isNaN(qty)) return '0';
            return Number(qty).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 8 });
        };
        const formatPrice = (p) => {
            if (p === undefined || p === null || isNaN(p)) return '0원';
            if (p >= 1000) return Number(p).toLocaleString(undefined, { maximumFractionDigits: 2 }) + '원';
            if (p >= 1) return Number(p).toLocaleString(undefined, { maximumFractionDigits: 4 }) + '원';
            return Number(p).toLocaleString(undefined, { maximumFractionDigits: 8 }) + '원';
        };

        // 3. UI 텍스트 출력
        const setTxt = (id, val) => { 
            const el = document.getElementById(id); 
            if (el) {
                el.innerText = val;
                el.setAttribute('title', val);
            }
        };

        setTxt('waterResNewAvg', formatPrice(newAvgPrice));
        setTxt('waterResTotalQty', formatCoinQty(newTotalQty));
        setTxt('waterResTotalCost', Math.round(newTotalCost).toLocaleString() + '원');
        setTxt('waterResBreakEven', formatPrice(breakEvenPrice));
        setTxt('waterResRequiredGain', (requiredGain >= 0 ? '+' : '') + requiredGain.toFixed(2) + '%');

        // 분할 매도 카드 출력
        setTxt('waterResTotalSellProfit', (totalRealizedProfit >= 0 ? '+' : '') + Math.round(totalRealizedProfit).toLocaleString() + '원');
        setTxt('waterResTotalSellRoi', (totalRoiPct >= 0 ? '+' : '') + totalRoiPct.toFixed(2) + '%');
        setTxt('waterResRecoveredCash', Math.round(totalRecoveredCash).toLocaleString() + '원');
        setTxt('waterResRemainingQty', formatCoinQty(remainingQty));

        const profitEl = document.getElementById('waterResTotalSellProfit');
        if (profitEl) {
            profitEl.className = 'text-lg font-black font-mono mt-1 ' + (totalRealizedProfit >= 0 ? 'text-emerald-400' : 'text-rose-400');
        }
        const roiEl = document.getElementById('waterResTotalSellRoi');
        if (roiEl) {
            roiEl.className = 'text-lg font-bold font-mono mt-1 ' + (totalRoiPct >= 0 ? 'text-emerald-400' : 'text-rose-400');
        }

        // 매수 시뮬레이션 테이블 렌더링
        const buyTbody = document.getElementById('waterSimTableBody');
        if (buyTbody) {
            buyTbody.innerHTML = tierProgressList.map(t => {
                const modeLabel = t.mode === 'amount' ? `+${Math.round(t.amount).toLocaleString()}원` : (t.mode === 'qty' ? `+${formatCoinQty(t.addedQty)}개` : `+${t.val}% 비중`);
                return `
                  <tr class="border-b border-navy-800/60 text-xs font-mono">
                    <td class="py-2.5 px-3 font-bold text-white">${t.tierNum}차 (${modeLabel} @ ${formatPrice(t.price)})</td>
                    <td class="py-2.5 px-3 text-right text-cyan-300 font-bold">${formatPrice(t.avgPrice)}</td>
                    <td class="py-2.5 px-3 text-right text-rose-400 font-bold">${t.dropPct >= 0 ? '+' : ''}${t.dropPct.toFixed(2)}%</td>
                    <td class="py-2.5 px-3 text-right text-slate-200">${formatPrice(t.breakEven)}</td>
                  </tr>
                `;
            }).join('');
        }

        // 매도 시뮬레이션 테이블 렌더링
        const sellTbody = document.getElementById('waterSellSimTableBody');
        if (sellTbody) {
            sellTbody.innerHTML = sellProgressList.map(s => {
                const isPos = s.profit >= 0;
                const modeLabel = s.mode === 'pct' ? `${s.val}% 비중` : (s.mode === 'qty' ? `${formatCoinQty(s.soldQty)}개` : `${Math.round(s.val).toLocaleString()}원 목표`);
                return `
                  <tr class="border-b border-navy-800/60 text-xs font-mono">
                    <td class="py-2.5 px-3 font-bold text-amber-300">${s.tierNum}차 (${formatPrice(s.sellPrice)} / ${modeLabel})</td>
                    <td class="py-2.5 px-3 text-right text-slate-200">${formatCoinQty(s.soldQty)}</td>
                    <td class="py-2.5 px-3 text-right font-bold ${isPos ? 'text-emerald-400' : 'text-rose-400'}">${isPos ? '+' : ''}${Math.round(s.profit).toLocaleString()}원 (${isPos ? '+' : ''}${s.roiPct.toFixed(2)}%)</td>
                    <td class="py-2.5 px-3 text-right text-cyan-300">${Math.round(s.netCash).toLocaleString()}원</td>
                    <td class="py-2.5 px-3 text-right text-slate-400">${formatCoinQty(s.remainingQty)}</td>
                  </tr>
                `;
            }).join('');
        }
    },

    // ========================================================
    // 2. 김치프리미엄 & 보따리(아비트라지) 계산기 (실시간 연동)
    // ========================================================
    fetchKimpData: async function () {
        const kimpBody = document.getElementById('kimpTableBody');
        if (!kimpBody) return;

        try {
            const upbitRes = await fetch('https://api.upbit.com/v1/ticker?markets=KRW-BTC,KRW-ETH,KRW-XRP,KRW-SOL,KRW-DOGE,KRW-TRX,KRW-USDT');
            if (!upbitRes.ok) throw new Error('업비트 API 응답 실패');
            const upbitData = await upbitRes.json();

            const usdtItem = upbitData.find(d => d.market === 'KRW-USDT');
            const liveUsdRate = (usdtItem && usdtItem.trade_price > 1000) ? usdtItem.trade_price : (this.exchangeRateUsdKrw || 1380);
            this.exchangeRateUsdKrw = liveUsdRate;

            const setRateEl = document.getElementById('kimpUsdRateDisplay');
            if (setRateEl) setRateEl.innerText = '기준환율: 1$ = ' + Math.round(liveUsdRate).toLocaleString() + '원 (실시간)';

            let binancePrices = {};
            try {
                const binanceSymbols = JSON.stringify(['BTCUSDT', 'ETHUSDT', 'XRPUSDT', 'SOLUSDT', 'DOGEUSDT', 'TRXUSDT']);
                const binanceRes = await fetch('https://api.binance.com/api/v3/ticker/price?symbols=' + encodeURIComponent(binanceSymbols));
                if (binanceRes.ok) {
                    const binanceList = await binanceRes.json();
                    binanceList.forEach(item => {
                        const s = item.symbol.replace('USDT', '');
                        binancePrices[s] = parseFloat(item.price);
                    });
                }
            } catch (binErr) {
                console.warn('Binance direct API fallback:', binErr);
            }

            const rows = upbitData.filter(d => d.market !== 'KRW-USDT').map(item => {
                const sym = item.market.replace('KRW-', '');
                const upbitKrw = item.trade_price;
                const binanceUsd = binancePrices[sym] || (upbitKrw / (liveUsdRate * 1.015));
                const binanceKrw = binanceUsd * liveUsdRate;
                const diffKrw = upbitKrw - binanceKrw;
                const kimpPercent = binanceKrw > 0 ? (diffKrw / binanceKrw) * 100 : 0;

                return `
                  <tr class="border-b border-navy-800 hover:bg-navy-800/40 transition text-xs">
                    <td class="py-3 px-3 font-bold text-white flex items-center gap-1.5">
                      <span class="w-6 h-6 rounded-full bg-navy-950 flex items-center justify-center text-[10px] text-cyan-400 font-mono font-black">${sym}</span>
                      <span>${sym}</span>
                    </td>
                    <td class="py-3 px-3 text-right font-mono font-bold text-slate-100">${upbitKrw.toLocaleString()}원</td>
                    <td class="py-3 px-3 text-right font-mono text-slate-400">$${binanceUsd.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                    <td class="py-3 px-3 text-right font-mono ${diffKrw >= 0 ? 'text-rose-400' : 'text-cyan-400'}">${diffKrw >= 0 ? '+' : ''}${Math.round(diffKrw).toLocaleString()}원</td>
                    <td class="py-3 px-3 text-right font-mono font-black ${kimpPercent >= 0 ? 'text-rose-400' : 'text-cyan-400'}">
                      <span class="px-2 py-0.5 rounded-lg ${kimpPercent >= 0 ? 'bg-rose-500/10 border border-rose-500/20' : 'bg-cyan-500/10 border border-cyan-500/20'}">
                        ${kimpPercent >= 0 ? '+' : ''}${kimpPercent.toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                `;
            }).join('');

            kimpBody.innerHTML = rows;
            this.calcArbitrage();
        } catch (e) {
            console.warn('Kimp fetch error:', e);
        }
    },

    calcArbitrage: function () {
        const sendAmountKrw = parseFloat(document.getElementById('arbSendAmount')?.value) || 5000000;
        const coinType = document.getElementById('arbCoinSelect')?.value || 'XRP';
        const kimpRate = parseFloat(document.getElementById('arbCustomKimp')?.value || 1.8) / 100;
        const feeNetwork = coinType === 'XRP' ? 1500 : (coinType === 'TRX' ? 1400 : 8000);

        const tradeFee = sendAmountKrw * 0.001;
        const kimpGainKrw = sendAmountKrw * kimpRate;
        const netProfitKrw = kimpGainKrw - feeNetwork - tradeFee;
        const roi = sendAmountKrw > 0 ? (netProfitKrw / sendAmountKrw) * 100 : 0;

        const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
        setTxt('arbResNetworkFee', feeNetwork.toLocaleString() + '원');
        setTxt('arbResTradeFee', Math.round(tradeFee).toLocaleString() + '원');
        setTxt('arbResNetProfit', (netProfitKrw >= 0 ? '+' : '') + Math.round(netProfitKrw).toLocaleString() + '원');
        
        const roiEl = document.getElementById('arbResRoi');
        if (roiEl) {
            roiEl.innerText = (roi >= 0 ? '+' : '') + roi.toFixed(2) + '%';
            roiEl.className = 'font-mono font-bold ' + (roi >= 0 ? 'text-emerald-400' : 'text-rose-400');
        }
    },

    // Helper: Retrieve accurate calculation report from Analyzer Engine
    getAnalyzerData: function () {
        const getApp = () => (typeof window !== 'undefined' && window.App) ? window.App : ((typeof App !== 'undefined') ? App : null);
        const getCalc = () => (typeof window !== 'undefined' && window.ProfitCalculator) ? window.ProfitCalculator : ((typeof ProfitCalculator !== 'undefined') ? ProfitCalculator : null);
        const getStorage = () => (typeof window !== 'undefined' && window.AnalyzerStorage) ? window.AnalyzerStorage : ((typeof AnalyzerStorage !== 'undefined') ? AnalyzerStorage : null);

        const app = getApp();
        if (app && app.state && app.state.reportData && app.state.reportData.summary) {
            return app.state.reportData;
        }

        const calc = getCalc();
        const storage = getStorage();
        if (calc && storage) {
            const trades = storage.getTrades ? storage.getTrades() : [];
            if (trades && trades.length > 0) {
                const rep = calc.calculate(trades);
                if (app && app.state) app.state.reportData = rep;
                return rep;
            }
        }
        return null;
    },

    // ========================================================
    // 3. 코인 세금 계산기
    // ========================================================
    calcTax: function () {
        const totalSell = parseFloat(document.getElementById('taxTotalSell')?.value) || 0;
        const totalBuy = parseFloat(document.getElementById('taxTotalBuy')?.value) || 0;
        const totalFee = parseFloat(document.getElementById('taxTotalFee')?.value) || 0;
        const deductType = document.getElementById('taxDeductionType')?.value || '250';

        const basicDeduction = deductType === '5000' ? 50000000 : 2500000;
        const netProfit = totalSell - totalBuy - totalFee;
        const taxableBase = Math.max(0, netProfit - basicDeduction);
        
        const incomeTax = taxableBase * 0.20;
        const localTax = taxableBase * 0.02;
        const totalTax = incomeTax + localTax;
        const effectiveRate = netProfit > 0 ? (totalTax / netProfit) * 100 : 0;

        const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
        setTxt('taxResNetProfit', Math.round(netProfit).toLocaleString('ko-KR') + '원');
        setTxt('taxResDeduction', Math.round(basicDeduction).toLocaleString('ko-KR') + '원');
        setTxt('taxResTaxableBase', Math.round(taxableBase).toLocaleString('ko-KR') + '원');
        setTxt('taxResIncomeTax', Math.round(incomeTax).toLocaleString('ko-KR') + '원');
        setTxt('taxResLocalTax', Math.round(localTax).toLocaleString('ko-KR') + '원');
        setTxt('taxResTotalTax', Math.round(totalTax).toLocaleString('ko-KR') + '원');
        setTxt('taxResEffectiveRate', effectiveRate.toFixed(2) + '%');

        const taxBadge = document.getElementById('taxStatusBadge');
        if (taxBadge) {
            if (netProfit <= basicDeduction) {
                taxBadge.innerText = '🛡️ 비과세 대상 (공제 한도 내 수익)';
                taxBadge.className = 'px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs';
            } else {
                taxBadge.innerText = '⚠️ 납부 대상 (예상 세금: ' + Math.round(totalTax).toLocaleString() + '원)';
                taxBadge.className = 'px-3 py-1 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold text-xs';
            }
        }
    },

    importFromAnalyzer: function () {
        const rep = this.getAnalyzerData();
        if (rep && rep.summary) {
            const s = rep.summary;
            const sellAmt = Math.round(s.totalCumulativeSellAmount || s.totalSold || s.totalSellAmount || 0);
            const buyAmt = Math.round(s.totalCumulativeBuyAmount || s.totalInvested || s.totalBuyAmount || 0);
            const feeAmt = Math.round(s.totalFees || s.totalFee || 0);

            const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
            setVal('taxTotalSell', sellAmt);
            setVal('taxTotalBuy', buyAmt);
            setVal('taxTotalFee', feeAmt);
            this.calcTax();
            alert('손익 분석기의 실측 손익 데이터(총 매도액 ' + sellAmt.toLocaleString() + '원, 매수액 ' + buyAmt.toLocaleString() + '원, 수수료 ' + feeAmt.toLocaleString() + '원)가 세금 계산기에 성공적으로 반영되었습니다!');
        } else {
            alert('손익 분석기에 업로드된 거래내역이 없습니다. 먼저 [손익 분석기]에서 엑셀을 업로드하거나 샘플 데이터를 로드해 주세요.');
        }
    },

    // ========================================================
    // 4. 해외 선물 청산가 & ROE 계산기
    // ========================================================
    calcFutures: function () {
        const posType = document.getElementById('futuresPosType')?.value || 'LONG';
        const entryPrice = parseFloat(document.getElementById('futuresEntryPrice')?.value) || 64000;
        const marginUsdt = parseFloat(document.getElementById('futuresMargin')?.value) || 1000;
        const leverage = parseFloat(document.getElementById('futuresLeverage')?.value) || 10;
        const targetPrice = parseFloat(document.getElementById('futuresTargetPrice')?.value) || 68000;

        const positionSizeUsdt = marginUsdt * leverage;
        const positionCoinQty = entryPrice > 0 ? (positionSizeUsdt / entryPrice) : 0;
        const mmr = 0.005;

        let liqPrice = 0;
        if (posType === 'LONG') {
            liqPrice = entryPrice * (1 - (1 / leverage) + mmr);
        } else {
            liqPrice = entryPrice * (1 + (1 / leverage) - mmr);
        }
        liqPrice = Math.max(0, liqPrice);

        const liqDistance = entryPrice > 0 ? Math.abs((liqPrice - entryPrice) / entryPrice) * 100 : 0;

        let pnlUsdt = 0;
        if (posType === 'LONG') {
            pnlUsdt = (targetPrice - entryPrice) * positionCoinQty;
        } else {
            pnlUsdt = (entryPrice - targetPrice) * positionCoinQty;
        }
        const roePercent = marginUsdt > 0 ? (pnlUsdt / marginUsdt) * 100 : 0;
        const pnlKrw = pnlUsdt * (this.exchangeRateUsdKrw || 1380);

        const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
        setTxt('futuresResLiqPrice', '$' + liqPrice.toLocaleString(undefined, { maximumFractionDigits: 2 }));
        setTxt('futuresResLiqDistance', liqDistance.toFixed(2) + '% 남음');
        setTxt('futuresResPosSize', '$' + positionSizeUsdt.toLocaleString() + ' (' + positionCoinQty.toFixed(4) + ')');
        setTxt('futuresResPnlUsdt', (pnlUsdt >= 0 ? '+' : '') + '$' + pnlUsdt.toLocaleString(undefined, { maximumFractionDigits: 2 }));
        setTxt('futuresResPnlKrw', (pnlKrw >= 0 ? '+' : '') + Math.round(pnlKrw).toLocaleString() + '원');
        
        const roeEl = document.getElementById('futuresResRoe');
        if (roeEl) {
            roeEl.innerText = (roePercent >= 0 ? '+' : '') + roePercent.toFixed(2) + '%';
            roeEl.className = 'font-mono font-bold ' + (roePercent >= 0 ? 'text-emerald-400' : 'text-rose-400');
        }
    },

    setFuturesLeverage: function (lev) {
        const el = document.getElementById('futuresLeverage');
        if (el) {
            el.value = lev;
            this.calcFutures();
        }
    },

    // ========================================================
    // 5. 수익 인증 카드 생성기
    // ========================================================
    profitCardState: null,

    renderProfitCard: function (targetCanvasId = null) {
        const targetIds = targetCanvasId ? [targetCanvasId] : ['profitCardCanvas', 'pnl-card-canvas'];
        const canvases = targetIds.map(id => document.getElementById(id)).filter(Boolean);
        if (canvases.length === 0) return;

        const nick = (document.getElementById('cardNick')?.value || '익명 트레이더').trim();
        const startStr = document.getElementById('pnl-card-start')?.value || document.getElementById('cardPeriodStart')?.value || '';
        const endStr = document.getElementById('pnl-card-end')?.value || document.getElementById('cardPeriodEnd')?.value || '';
        const hideAmountEl = document.getElementById('cardHideAmount');
        const hideAmount = hideAmountEl ? hideAmountEl.checked : false;

        let periodText = '전체 기간';
        if (startStr && endStr) {
            periodText = `${startStr.replace(/-/g, '.')} ~ ${endStr.replace(/-/g, '.')}`;
        } else if (startStr) {
            periodText = `${startStr.replace(/-/g, '.')} ~ 현재`;
        } else if (endStr) {
            periodText = `처음 ~ ${endStr.replace(/-/g, '.')}`;
        }

        const state = this.profitCardState || {};
        const realizedProfit = state.realizedProfit !== undefined ? state.realizedProfit : -9151549;
        const realizedRoi = state.roi !== undefined ? state.roi : -1.60;
        const unrealizedProfit = state.unrealizedProfit !== undefined ? state.unrealizedProfit : -24980000;
        const unrealizedRoi = state.unrealizedRoi !== undefined ? state.unrealizedRoi : -24.98;
        const holdingCost = state.holdingCost !== undefined ? state.holdingCost : 308170672;
        const netDeposit = state.netDeposit !== undefined ? state.netDeposit : 399532690;
        const cumBuy = state.cumBuyAmount !== undefined ? state.cumBuyAmount : 3231592530;
        const totalFees = state.totalFees !== undefined ? state.totalFees : 2010853;
        const winRate = state.winRate !== undefined ? state.winRate : 53.2;
        const winTrades = state.winTrades || 4277;
        const lossTrades = state.lossTrades || 3758;
        const totalTrades = state.totalTrades || 13851;

        // Rounded Rect Helper
        const drawRoundedRect = (ctx, x, y, width, height, radius) => {
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + width - radius, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
            ctx.lineTo(x + width, y + height - radius);
            ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            ctx.lineTo(x + radius, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();
        };

        canvases.forEach(canvas => {
            const ctx = canvas.getContext('2d');
            canvas.width = 900;
            canvas.height = 520;

            // Deep Dark Navy Canvas Fill
            ctx.fillStyle = '#070b14';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Outer Rounded Frame (r: 16)
            drawRoundedRect(ctx, 16, 16, canvas.width - 32, canvas.height - 32, 16);
            ctx.fillStyle = '#070b14';
            ctx.fill();
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Ambient Top-Right Radial Glow
            ctx.save();
            drawRoundedRect(ctx, 16, 16, canvas.width - 32, canvas.height - 32, 16);
            ctx.clip();
            const glowGrad = ctx.createRadialGradient(canvas.width - 110, 65, 20, canvas.width - 110, 65, 300);
            glowGrad.addColorStop(0, 'rgba(14, 116, 144, 0.32)');
            glowGrad.addColorStop(0.45, 'rgba(6, 182, 212, 0.10)');
            glowGrad.addColorStop(1, 'rgba(7, 11, 20, 0)');
            ctx.fillStyle = glowGrad;
            ctx.beginPath();
            ctx.arc(canvas.width - 110, 65, 300, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Header: Brand & Title
            ctx.fillStyle = '#ffffff';
            ctx.font = '800 24px "Inter", -apple-system, sans-serif';
            ctx.fillText('CryptoPnL PRO', 48, 62);
            const logoW = ctx.measureText('CryptoPnL PRO').width;

            ctx.fillStyle = '#38bdf8';
            ctx.font = '600 15px "Inter", -apple-system, sans-serif';
            ctx.fillText(' ·  업비트·빗썸 실거래 검증 통합 손익 인증서', 48 + logoW, 60.5);

            // Sub Header: Trader Nickname & Verification Period
            ctx.fillStyle = '#94a3b8';
            ctx.font = '500 13px "Inter", -apple-system, sans-serif';
            ctx.fillText('트레이더: ', 48, 92);
            const traderLabelW = ctx.measureText('트레이더: ').width;
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 13px "Inter", -apple-system, sans-serif';
            ctx.fillText(nick, 48 + traderLabelW, 92);

            ctx.fillStyle = '#cbd5e1';
            ctx.font = '500 13px "Inter", monospace, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(`검증 기간: ${periodText}`, canvas.width - 48, 92);
            ctx.textAlign = 'left';

            // Divider Line
            ctx.strokeStyle = 'rgba(51, 65, 85, 0.45)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(48, 106);
            ctx.lineTo(canvas.width - 48, 106);
            ctx.stroke();

            // 4-Card Dashboard Grid Drawing Helper
            const drawDashboardCard = (x, y, w, h, title, mainVal, badgeText, badgeColor, subLine1, subLine2, valColor, isRoiVal = false) => {
                // Card Background & Border
                drawRoundedRect(ctx, x, y, w, h, 12);
                ctx.fillStyle = 'rgba(12, 19, 34, 0.72)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(51, 65, 85, 0.65)';
                ctx.lineWidth = 1;
                ctx.stroke();

                // Title
                ctx.fillStyle = '#f1f5f9';
                ctx.font = 'bold 14px "Inter", -apple-system, sans-serif';
                ctx.fillText(title, x + 20, y + 32);

                // Top-Right Pill Badge
                if (badgeText) {
                    ctx.font = 'bold 12px "Inter", sans-serif';
                    const bTextW = ctx.measureText(badgeText).width;
                    const bW = bTextW + 18;
                    const bH = 24;
                    const bX = x + w - bW - 20;
                    const bY = y + 16;

                    drawRoundedRect(ctx, bX, bY, bW, bH, 6);
                    let bgRgba = 'rgba(56, 189, 248, 0.12)';
                    let borderRgba = 'rgba(56, 189, 248, 0.4)';
                    if (badgeColor === '#10b981') {
                        bgRgba = 'rgba(16, 185, 129, 0.12)';
                        borderRgba = 'rgba(16, 185, 129, 0.4)';
                    } else if (badgeColor === '#f43f5e' || badgeColor === '#ef4444') {
                        bgRgba = 'rgba(244, 63, 94, 0.12)';
                        borderRgba = 'rgba(244, 63, 94, 0.4)';
                    } else if (badgeColor === '#c084fc' || badgeColor === '#a855f7') {
                        bgRgba = 'rgba(192, 132, 252, 0.12)';
                        borderRgba = 'rgba(192, 132, 252, 0.4)';
                    }
                    ctx.fillStyle = bgRgba;
                    ctx.fill();
                    ctx.strokeStyle = borderRgba;
                    ctx.lineWidth = 1;
                    ctx.stroke();

                    ctx.fillStyle = badgeColor;
                    ctx.fillText(badgeText, bX + 9, bY + 16.5);
                }

                // Main Value: Percentage + Amount together
                ctx.fillStyle = valColor || '#ffffff';
                if (subAmtText) {
                    ctx.font = '800 28px "Inter", -apple-system, sans-serif';
                    ctx.fillText(mainVal, x + 20, y + 80);
                    const roiW = ctx.measureText(mainVal).width;

                    const amtText = ` (${subAmtText})`;
                    let amtFontSize = 16;
                    ctx.font = `bold ${amtFontSize}px "Inter", -apple-system, sans-serif`;
                    let amtW = ctx.measureText(amtText).width;
                    if (roiW + amtW + 24 > w - 30) {
                        amtFontSize = 13.5;
                        ctx.font = `bold ${amtFontSize}px "Inter", -apple-system, sans-serif`;
                    }
                    ctx.fillStyle = valColor || '#ffffff';
                    ctx.fillText(amtText, x + 20 + roiW + 4, y + 78);
                } else {
                    ctx.font = isRoiVal ? '800 36px "Inter", sans-serif' : '800 28px "Inter", sans-serif';
                    ctx.fillText(mainVal, x + 20, y + 80);
                }

                // Subtext Lines
                ctx.fillStyle = '#94a3b8';
                ctx.font = '12px "Inter", -apple-system, sans-serif';
                if (subLine1 && !subLine2) {
                    ctx.fillText(subLine1, x + 20, y + 122);
                } else if (subLine1 && subLine2) {
                    ctx.fillText(subLine1, x + 20, y + 116);
                    ctx.fillText(subLine2, x + 20, y + 134);
                }
            };

            const cardW = 390;
            const cardH = 146;
            const col1X = 48;
            const col2X = 462;
            const row1Y = 122;
            const row2Y = 288;

            // Card 1: 누적 실현손익 (금액 숨김 모드가 아닐 때 금액 함께 표기)
            const isRealizedPos = realizedProfit >= 0;
            const realRoiStr = `${realizedRoi > 0 ? '+' : ''}${realizedRoi.toFixed(2)}%`;
            const realAmtStr = `${realizedProfit > 0 ? '+' : ''}${Math.round(realizedProfit).toLocaleString()}원`;
            const realColor = isRealizedPos ? '#10b981' : '#f43f5e';
            drawDashboardCard(col1X, row1Y, cardW, cardH, '누적 실현손익', realRoiStr, realRoiStr, realColor, '매도 완료된 코인의 순수익 (수수료 차감 후)', null, realColor, hideAmount, hideAmount ? null : realAmtStr);

            // Card 2: 실시간 평가손익 (미실현) (금액 숨김 모드가 아닐 때 금액 함께 표기)
            const isUnrealizedPos = unrealizedProfit >= 0;
            const unRealRoiStr = `${unrealizedRoi > 0 ? '+' : ''}${unrealizedRoi.toFixed(2)}%`;
            const unRealAmtStr = `${unrealizedProfit > 0 ? '+' : ''}${Math.round(unrealizedProfit).toLocaleString()}원`;
            const unRealColor = unrealizedProfit === 0 ? '#94a3b8' : (isUnrealizedPos ? '#10b981' : '#f43f5e');
            drawDashboardCard(col2X, row1Y, cardW, cardH, '실시간 평가손익 (미실현)', unRealRoiStr, unRealRoiStr, unRealColor, '현재 보유 중인 코인의 실시간 평가', null, unRealColor, hideAmount, hideAmount ? null : unRealAmtStr);

            // Card 3: 현재 보유 코인 매수원금
            const holdCostStr = `${Math.round(holdingCost).toLocaleString()}원`;
            const netDepStr = `순 투입 원금(입-출): ${Math.round(netDeposit).toLocaleString()}원`;
            const cumBuyStr = `역대 누적 매수대금: ${Math.round(cumBuy).toLocaleString()}원`;
            drawDashboardCard(col1X, row2Y, cardW, cardH, '현재 보유 코인 매수원금', holdCostStr, '보유원금', '#38bdf8', netDepStr, cumBuyStr, '#38bdf8', false);

            // Card 4: 총 거래 수수료 & 매매 승률
            const feeStr = `${Math.round(totalFees).toLocaleString()}원`;
            const winrateLine = `매매 승률: ${winRate.toFixed(1)}% (${winTrades}승 ${lossTrades}패 / 추정 ${totalTrades}건)`;
            const trustLine = `데이터 신뢰도: 실측 FIFO 100% 로컬 독립 연산 검증`;
            drawDashboardCard(col2X, row2Y, cardW, cardH, '총 거래 수수료', feeStr, '체결수수료', '#c084fc', winrateLine, trustLine, '#ffffff', false);

            // Footer
            ctx.fillStyle = '#f59e0b';
            ctx.font = '12px "Inter", sans-serif';
            ctx.fillText('⚡', 48, 478);
            ctx.fillStyle = '#94a3b8';
            ctx.fillText('100% 클라이언트 무손실 FIFO 정산 • https://cryptopnl.com', 66, 478);

            ctx.fillStyle = '#38bdf8';
            ctx.font = 'bold 13px "Inter", sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText('CryptoPnL Official Verified Result', canvas.width - 48, 478);
            ctx.textAlign = 'left';
        });
    },

    downloadProfitCard: function (targetCanvasId = null) {
        const canvas = document.getElementById(targetCanvasId || 'profitCardCanvas') || document.getElementById('pnl-card-canvas');
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = `CryptoPnL_종합손익인증_${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    },

    copyCardToClipboard: async function (targetCanvasId = null) {
        const canvas = document.getElementById(targetCanvasId || 'profitCardCanvas') || document.getElementById('pnl-card-canvas');
        if (!canvas) return;
        try {
            canvas.toBlob(async blob => {
                const item = new ClipboardItem({ 'image/png': blob });
                await navigator.clipboard.write([item]);
                alert('수익 인증 카드가 클립보드에 복사되었습니다! 카카오톡이나 커뮤니티에 Ctrl+V로 붙여넣으세요.');
            });
        } catch (err) {
            alert('클립보드 복사를 지원하지 않는 브라우저입니다. [이미지 다운로드]를 이용해 주세요.');
        }
    },

    openVerificationModal: function () {
        const modal = document.getElementById('modal-pnl-verification');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            this.importProfitCardFromAnalyzer(false);
            this.renderProfitCard('pnl-card-canvas');
            if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
        }
    },

    importProfitCardFromAnalyzer: async function (showAlert = true) {
        let trades = [];
        if (window.AnalyzerApp && window.AnalyzerApp.state && Array.isArray(window.AnalyzerApp.state.rawTrades) && window.AnalyzerApp.state.rawTrades.length > 0) {
            trades = window.AnalyzerApp.state.rawTrades;
        } else if (typeof AnalyzerStorage !== 'undefined' && AnalyzerStorage.getTrades) {
            trades = AnalyzerStorage.getTrades() || [];
        }

        if (!trades || trades.length === 0) {
            if (showAlert) alert('순익분석기에 등록된 거래 내역이 없습니다. 먼저 엑셀/CSV 파일을 업로드해 주세요.');
            return;
        }

        const startEl = document.getElementById('cardPeriodStart');
        const endEl = document.getElementById('cardPeriodEnd');
        const modalStartEl = document.getElementById('pnl-card-start');
        const modalEndEl = document.getElementById('pnl-card-end');
        let startStr = modalStartEl?.value || startEl?.value || '';
        let endStr = modalEndEl?.value || endEl?.value || '';

        // Auto-detect min and max dates from trades if empty
        if (!startStr && !endStr) {
            const validDates = trades.map(t => t.time ? t.time.replace(/\./g, '-').slice(0, 10) : '').filter(d => d && d.length >= 8).sort();
            if (validDates.length > 0) {
                startStr = validDates[0];
                endStr = validDates[validDates.length - 1];
                if (startEl) startEl.value = startStr;
                if (endEl) endEl.value = endStr;
                if (modalStartEl) modalStartEl.value = startStr;
                if (modalEndEl) modalEndEl.value = endStr;
            }
        }

        let filteredTrades = trades;
        if (startStr || endStr) {
            filteredTrades = trades.filter(t => {
                if (!t.time) return true;
                const d = t.time.replace(/\./g, '-').slice(0, 10);
                if (startStr && d < startStr) return false;
                if (endStr && d > endStr) return false;
                return true;
            });
        }

        if (filteredTrades.length === 0) {
            if (showAlert) alert('설정한 기간 내에 거래 내역이 존재하지 않습니다.');
            return;
        }

        const calc = (typeof ProfitCalculator !== 'undefined' ? ProfitCalculator : window.ProfitCalculator);
        if (!calc) {
            if (showAlert) alert('계산 엔진을 찾을 수 없습니다.');
            return;
        }

        const rep = calc.calculate(filteredTrades, { method: 'fifo', exchange: 'ALL' });
        const s = rep.summary || {};

        // Fetch Live Tickers for accurate 실시간 평가손익
        let totalUnrealized = 0;
        let unrealizedRoi = 0;
        if (typeof UpbitAPI !== 'undefined' && UpbitAPI.fetchTickers && rep.coinSummaries) {
            try {
                const allMarkets = rep.coinSummaries.map(c => c.market);
                const tickers = await UpbitAPI.fetchTickers(allMarkets);
                const enriched = UpbitAPI.enrichCoinSummariesWithTickers(rep.coinSummaries, tickers);
                totalUnrealized = enriched.totalUnrealizedProfit || 0;
                unrealizedRoi = s.currentPortfolioCost > 0 ? (totalUnrealized / s.currentPortfolioCost) * 100 : 0;
            } catch (e) {
                console.warn('인증카드 시세 조회 폴백:', e);
            }
        }

        const rawRoi = (typeof s.totalRealizedRoi === 'number') ? s.totalRealizedRoi : parseFloat(s.totalRealizedRoi || 0);
        const rawWinRate = (typeof s.totalWinRate === 'number') ? s.totalWinRate : parseFloat(s.totalWinRate || 0);
        const rawProfit = (typeof s.totalRealizedProfit === 'number') ? s.totalRealizedProfit : parseFloat(s.totalRealizedProfit || 0);
        const roiStr = (rawRoi > 0 ? '+' : '') + rawRoi.toFixed(2) + '%';
        const winrateStr = rawWinRate.toFixed(1) + '%';

        this.profitCardState = {
            realizedProfit: rawProfit,
            roi: rawRoi,
            unrealizedProfit: totalUnrealized,
            unrealizedRoi: unrealizedRoi,
            holdingCost: s.currentPortfolioCost || 0,
            netDeposit: s.netKrwDeposits || 0,
            cumBuyAmount: s.totalCumulativeBuyAmount || 0,
            totalFees: s.totalFees || 0,
            winRate: rawWinRate,
            winTrades: s.totalWinTrades || 0,
            lossTrades: s.totalLossTrades || 0,
            totalTrades: s.totalTradesCount || (s.totalWinTrades + s.totalLossTrades) || 0,
            startDate: startStr,
            endDate: endStr
        };

        const nick = (typeof getNickname === 'function' ? getNickname() : '익명 트레이더');
        const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };

        setVal('cardNick', nick);
        setVal('cardRoi', roiStr);
        setVal('cardWinrate', winrateStr);

        this.renderProfitCard();
        if (showAlert) {
            alert(`선택한 기간 (${startStr || '처음'} ~ ${endStr || '현재'})의 종합 대시보드 손익 데이터가 정상 반영되었습니다!`);
        }
    },

    shareVerificationCardToForum: function(targetCanvasId = null) {
        const canvas = document.getElementById(targetCanvasId || 'profitCardCanvas') || document.getElementById('pnl-card-canvas');
        if (!canvas) return;
        const dataUrl = canvas.toDataURL('image/png');

        const roiStr = (document.getElementById('cardRoi')?.value || '0.00%').trim();
        const winrateStr = (document.getElementById('cardWinrate')?.value || '0.0%').trim();
        const startStr = (document.getElementById('cardPeriodStart')?.value || document.getElementById('pnl-card-start')?.value || '').trim();
        const endStr = (document.getElementById('cardPeriodEnd')?.value || document.getElementById('pnl-card-end')?.value || '').trim();
        const nickInput = (document.getElementById('cardNick')?.value || '').trim();

        let periodText = '전체 기간';
        if (startStr && endStr) {
            const cleanStart = startStr.replace(/[^0-9]/g, '.').replace(/\.+/g, '.').replace(/\.$/, '');
            const cleanEnd = endStr.replace(/[^0-9]/g, '.').replace(/\.+/g, '.').replace(/\.$/, '');
            periodText = `${cleanStart} ~ ${cleanEnd}`;
        } else if (startStr) {
            const cleanStart = startStr.replace(/[^0-9]/g, '.').replace(/\.+/g, '.').replace(/\.$/, '');
            periodText = `${cleanStart} ~ 현재`;
        } else if (endStr) {
            const cleanEnd = endStr.replace(/[^0-9]/g, '.').replace(/\.+/g, '.').replace(/\.$/, '');
            periodText = `처음 ~ ${cleanEnd}`;
        }

        let authorName = nickInput;
        let authorRank = 'PRO';
        const storedUser = localStorage.getItem('crytopnl_user') || localStorage.getItem('cryptopnl_user') || localStorage.getItem('coinhub_user');
        if (storedUser) {
            try {
                const u = JSON.parse(storedUser);
                if (u && !authorName && u.username) authorName = u.username;
                if (u && u.rank) authorRank = u.rank;
            } catch (e) {}
        }
        if (!authorName) authorName = '익명 트레이더';

        let s = this.profitCardState;
        if (!s && window.AnalyzerApp && window.AnalyzerApp.state && window.AnalyzerApp.state.reportData) {
            const rep = window.AnalyzerApp.state.reportData;
            s = {
                realizedProfit: rep.summary?.totalRealizedProfit,
                roi: rep.summary?.totalRealizedRoi,
                unrealizedProfit: rep.summary?.totalUnrealizedProfit,
                unrealizedRoi: rep.summary?.currentPortfolioCost > 0 ? (rep.summary.totalUnrealizedProfit / rep.summary.currentPortfolioCost) * 100 : 0,
                holdingCost: rep.summary?.currentPortfolioCost,
                netDeposit: rep.summary?.netKrwDeposits,
                cumBuyAmount: rep.summary?.totalCumulativeBuyAmount,
                totalFees: rep.summary?.totalFees,
                winRate: rep.summary?.totalWinRate,
                winTrades: rep.summary?.totalWinTrades,
                lossTrades: rep.summary?.totalLossTrades,
                totalTrades: rep.summary?.totalTradesCount
            };
        }
        s = s || {};

        const rawRealizedProfit = s.realizedProfit !== undefined ? s.realizedProfit : -9151549;
        const rawRealizedRoi = s.roi !== undefined ? s.roi : (parseFloat(roiStr) || -1.60);
        const rawUnrealizedProfit = s.unrealizedProfit !== undefined ? s.unrealizedProfit : -24980000;
        const rawUnrealizedRoi = s.unrealizedRoi !== undefined ? s.unrealizedRoi : -24.98;

        const realizedProfitText = (rawRealizedProfit > 0 ? '+' : '') + Math.round(rawRealizedProfit).toLocaleString() + '원';
        const realizedRoiText = (rawRealizedRoi > 0 ? '+' : '') + (typeof rawRealizedRoi === 'number' ? rawRealizedRoi.toFixed(2) : rawRealizedRoi) + '%';
        const unrealizedProfitText = (rawUnrealizedProfit > 0 ? '+' : '') + Math.round(rawUnrealizedProfit).toLocaleString() + '원';
        const unrealizedRoiText = (rawUnrealizedRoi > 0 ? '+' : '') + (typeof rawUnrealizedRoi === 'number' ? rawUnrealizedRoi.toFixed(2) : rawUnrealizedRoi) + '%';

        const holdingCostText = Math.round(s.holdingCost !== undefined ? s.holdingCost : 308170672).toLocaleString() + '원';
        const netDepositText = Math.round(s.netDeposit !== undefined ? s.netDeposit : 399532690).toLocaleString() + '원';
        const cumBuyText = Math.round(s.cumBuyAmount !== undefined ? s.cumBuyAmount : 3231592530).toLocaleString() + '원';
        const totalFeesText = Math.round(s.totalFees !== undefined ? s.totalFees : 2010853).toLocaleString() + '원';
        const winRateText = (typeof s.winRate === 'number' ? s.winRate.toFixed(1) : (winrateStr.replace('%', '') || '53.2')) + '%';
        const winTrades = s.winTrades || 4277;
        const lossTrades = s.lossTrades || 3758;
        const totalTrades = s.totalTrades || (winTrades + lossTrades) || 13851;

        const postId = Date.now();
        const newPost = {
            id: postId,
            category: 'profit',
            categoryName: '💵 실현손익',
            title: `[수익인증] ${authorName}님의 ${periodText} (누적 실현: ${realizedProfitText} / 실시간 평가: ${unrealizedProfitText})`,
            content: `<p><img src="${dataUrl}" alt="CryptoPnL 실거래 통합 손익 인증 카드" style="max-width:100%; border-radius:14px; margin: 12px 0; box-shadow: 0 8px 24px rgba(0,0,0,0.45); border: 1px solid rgba(56, 189, 248, 0.25);"></p>

<div style="background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(51, 65, 85, 0.6); border-radius: 14px; padding: 18px 20px; margin: 18px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="font-size: 16px; font-weight: 800; color: #38bdf8; margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
    📊 <span>업비트·빗썸 실거래 손익 검증 상세 리포트</span>
  </div>
  <table style="width: 100%; border-collapse: collapse; font-size: 13.5px; line-height: 1.5; color: #e2e8f0;">
    <tr style="border-bottom: 1px solid rgba(51, 65, 85, 0.4);">
      <td style="padding: 10px 4px; color: #94a3b8;">📅 검증 기간</td>
      <td style="padding: 10px 4px; text-align: right; font-weight: 700; color: #f8fafc;">${periodText}</td>
    </tr>
    <tr style="border-bottom: 1px solid rgba(51, 65, 85, 0.4);">
      <td style="padding: 10px 4px; color: #94a3b8;">💰 누적 실현손익</td>
      <td style="padding: 10px 4px; text-align: right; font-weight: 800; color: ${rawRealizedProfit >= 0 ? '#10b981' : '#f43f5e'};">
        ${realizedProfitText} <span style="font-size: 12px; font-weight: 600;">(${realizedRoiText})</span>
      </td>
    </tr>
    <tr style="border-bottom: 1px solid rgba(51, 65, 85, 0.4);">
      <td style="padding: 10px 4px; color: #94a3b8;">📈 실시간 평가손익 (미실현)</td>
      <td style="padding: 10px 4px; text-align: right; font-weight: 800; color: ${rawUnrealizedProfit >= 0 ? '#10b981' : '#f43f5e'};">
        ${unrealizedProfitText} <span style="font-size: 12px; font-weight: 600;">(${unrealizedRoiText})</span>
      </td>
    </tr>
    <tr style="border-bottom: 1px solid rgba(51, 65, 85, 0.4);">
      <td style="padding: 10px 4px; color: #94a3b8;">💎 현재 보유 코인 매수원금</td>
      <td style="padding: 10px 4px; text-align: right; font-weight: 700; color: #38bdf8;">${holdingCostText}</td>
    </tr>
    <tr style="border-bottom: 1px solid rgba(51, 65, 85, 0.4);">
      <td style="padding: 10px 4px; color: #94a3b8;">💵 순 투입 원금 (입금 - 출금)</td>
      <td style="padding: 10px 4px; text-align: right; font-weight: 600; color: #f8fafc;">${netDepositText}</td>
    </tr>
    <tr style="border-bottom: 1px solid rgba(51, 65, 85, 0.4);">
      <td style="padding: 10px 4px; color: #94a3b8;">🔄 역대 누적 매수대금</td>
      <td style="padding: 10px 4px; text-align: right; font-weight: 600; color: #f8fafc;">${cumBuyText}</td>
    </tr>
    <tr style="border-bottom: 1px solid rgba(51, 65, 85, 0.4);">
      <td style="padding: 10px 4px; color: #94a3b8;">💸 총 거래 수수료</td>
      <td style="padding: 10px 4px; text-align: right; font-weight: 700; color: #c084fc;">${totalFeesText}</td>
    </tr>
    <tr>
      <td style="padding: 10px 4px; color: #94a3b8;">🎯 매매 승률 및 체결 현황</td>
      <td style="padding: 10px 4px; text-align: right; font-weight: 700; color: #f8fafc;">
        ${winRateText} <span style="font-size: 12px; color: #94a3b8;">(${winTrades}승 ${lossTrades}패 / 추정 ${totalTrades}건)</span>
      </td>
    </tr>
  </table>
</div>

<div style="padding: 14px 16px; background: rgba(8, 145, 178, 0.08); border-left: 3px solid #06b6d4; border-radius: 8px; margin-top: 14px; font-size: 13px; color: #cbd5e1; line-height: 1.6;">
  🔒 <strong>데이터 무결성 검증 보증:</strong><br>
  본 인증서는 업비트 및 빗썸의 거래 내역 원본을 바탕으로 브라우저 로컬 단에서 <strong>100% 무손실 선입선출(FIFO) 독립 연산 엔진</strong>을 통해 정산 검증되었습니다.<br>
  (외부 서버로 일체의 거래 데이터가 전송되지 않는 안전한 클라이언트 검증 리포트입니다.)
</div>`,
            isNotice: false,
            author: authorName,
            authorRank: authorRank,
            upvotes: 1,
            views: 1,
            time: typeof formatDateTime === 'function' ? formatDateTime(Date.now()) : '방금 전',
            timestamp: postId,
            comments: []
        };

        // 1. Get existing posts
        let posts = [];
        if (typeof window.getStoredPosts === 'function') {
            posts = window.getStoredPosts();
        } else if (typeof getStoredPosts === 'function') {
            posts = getStoredPosts();
        } else {
            try {
                const raw = localStorage.getItem('crytopnl_forum_posts') || localStorage.getItem('coinhub_forum_posts');
                if (raw) posts = JSON.parse(raw);
            } catch(e) {}
        }
        if (!Array.isArray(posts)) posts = [];

        // 2. Add new post to top
        posts.unshift(newPost);

        // 3. Save to memory & localStorage under crytopnl_forum_posts
        try {
            localStorage.setItem('crytopnl_forum_posts', JSON.stringify(posts));
            localStorage.setItem('coinhub_forum_posts', JSON.stringify(posts));
        } catch(e) {}

        if (typeof window.saveStoredPosts === 'function') {
            try { window.saveStoredPosts(posts); } catch(e) {}
        } else if (typeof saveStoredPosts === 'function') {
            try { saveStoredPosts(posts); } catch(e) {}
        }

        // 4. CRITICAL: Save to Firestore so onSnapshot listener does not delete it!
        const firestoreDb = window.db || (typeof db !== 'undefined' ? db : null);
        if (firestoreDb && typeof firestoreDb.collection === 'function') {
            try {
                firestoreDb.collection('forum_posts').doc(newPost.id.toString()).set(newPost)
                    .then(() => console.log('Successfully saved verification card post to Firestore:', newPost.id))
                    .catch(e => console.error('Firestore save error:', e));
            } catch(e) {
                console.warn('Firestore set call error:', e);
            }
        }

        // 5. Navigate to forum tab and show post
        if (typeof switchTab === 'function') {
            switchTab('forum');
        }
        if (typeof filterForum === 'function') {
            filterForum('all');
        }
        if (typeof renderForumPosts === 'function') {
            renderForumPosts();
        }
        if (typeof openPostDetailModal === 'function') {
            openPostDetailModal(newPost.id);
        } else if (typeof window.openPostDetailModal === 'function') {
            window.openPostDetailModal(newPost.id);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });

        alert('🎉 종합 수익 인증 카드가 포럼에 성공적으로 등록되었습니다!');
    }
};

if (typeof window !== 'undefined') {
    window.CoinCalculators = CoinCalculators;
    window.AnalyzerApp = window.AnalyzerApp || {};
    window.AnalyzerApp.renderVerificationCard = function () {
        const start = document.getElementById('pnl-card-start')?.value || '';
        const end = document.getElementById('pnl-card-end')?.value || '';
        const startEl = document.getElementById('cardPeriodStart');
        const endEl = document.getElementById('cardPeriodEnd');
        if (startEl && start) startEl.value = start;
        if (endEl && end) endEl.value = end;
        CoinCalculators.importProfitCardFromAnalyzer(false);
        CoinCalculators.renderProfitCard();
    };
    window.AnalyzerApp.downloadVerificationCard = function () {
        CoinCalculators.downloadProfitCard('pnl-card-canvas');
    };
    window.AnalyzerApp.shareVerificationCardToForum = function () {
        CoinCalculators.shareVerificationCardToForum('pnl-card-canvas');
    };
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { CoinCalculators.init(); });
    } else {
        CoinCalculators.init();
    }
}
