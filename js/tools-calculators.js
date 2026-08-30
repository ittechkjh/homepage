/**
 * tools-calculators.js
 * 코인허브(CoinHub) 코인 계산기 5대 킬러 도구 엔진
 * 1. 물타기 & 불타기 평단가/탈출 시뮬레이터
 * 2. 김치프리미엄(김프) & 거래소 간 보따리(아비트라지) 계산기 (실시간 연동)
 * 3. 가상자산 소득세(코인 세금) 정밀 계산기
 * 4. 해외 선물 롱/숏 레버리지 & 강제 청산가 계산기
 * 5. 업비트·빗썸 수익률 자랑용 바이럴 카드 생성기 (Canvas)
 */

const CoinCalculators = {
    activeSubTab: "water",
    exchangeRateUsdKrw: 1380,
    coinStatsMap: {},

    init: function () {
        this.bindEvents();
        this.calcWater();
        this.calcTax();
        this.calcFutures();
        this.fetchKimpData();
        this.renderProfitCard();
    },

    bindEvents: function () {
        const waterInputs = ["waterCurrentPrice", "waterCurrentQty", "waterAddPrice", "waterAddAmount", "waterFeeRate"];
        waterInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener("input", () => this.calcWater());
        });

        const taxInputs = ["taxTotalSell", "taxTotalBuy", "taxTotalFee", "taxDeductionType"];
        taxInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener("input", () => this.calcTax());
        });

        const futuresInputs = ["futuresEntryPrice", "futuresMargin", "futuresLeverage", "futuresTargetPrice", "futuresPosType", "futuresMarginMode"];
        futuresInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener("input", () => this.calcFutures());
        });

        const cardInputs = ["cardNick", "cardRoi", "cardWinrate", "cardPeriod", "cardTopCoin", "cardTheme", "cardHideAmount"];
        cardInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener("input", () => this.renderProfitCard());
        });
    },

    switchSubTab: function (tabId) {
        this.activeSubTab = tabId;
        document.querySelectorAll(".calc-subtab-btn").forEach(btn => {
            const isMatch = (btn.dataset.calctab === tabId);
            btn.classList.toggle("active", isMatch);
            if (isMatch) {
                btn.className = "calc-subtab-btn active px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold shadow-md shadow-amber-500/10";
            } else {
                btn.className = "calc-subtab-btn px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 text-slate-400 hover:text-white border border-transparent font-medium hover:bg-navy-900";
            }
        });

        document.querySelectorAll(".calc-subtab-content").forEach(content => {
            const isTarget = (content.id === "calc-tab-" + tabId);
            content.style.display = isTarget ? "block" : "none";
            content.classList.toggle("hidden", !isTarget);
        });

        if (tabId === "kimp") {
            this.fetchKimpData();
        } else if (tabId === "card") {
            this.renderProfitCard();
        }

        if (typeof lucide !== "undefined" && lucide.createIcons) {
            try { lucide.createIcons(); } catch (e) {}
        }
    },

    // 1. 물타기 & 불타기 계산기
    calcWater: function () {
        const curPrice = parseFloat(document.getElementById("waterCurrentPrice")?.value) || 0;
        const curQty = parseFloat(document.getElementById("waterCurrentQty")?.value) || 0;
        const addPrice = parseFloat(document.getElementById("waterAddPrice")?.value) || 0;
        const addAmount = parseFloat(document.getElementById("waterAddAmount")?.value) || 0;
        const feePercent = parseFloat(document.getElementById("waterFeeRate")?.value || 0.05) / 100;

        const curTotalCost = curPrice * curQty;
        const addQty = addPrice > 0 ? (addAmount / addPrice) : 0;
        const newTotalQty = curQty + addQty;
        const newTotalCost = curTotalCost + addAmount;
        const newAvgPrice = newTotalQty > 0 ? (newTotalCost / newTotalQty) : 0;

        const breakEvenPrice = (newTotalQty > 0 && (1 - feePercent) > 0)
            ? (newTotalCost * (1 + feePercent)) / (newTotalQty * (1 - feePercent))
            : newAvgPrice;

        const refPrice = addPrice > 0 ? addPrice : curPrice;
        const requiredGain = refPrice > 0 ? ((breakEvenPrice - refPrice) / refPrice) * 100 : 0;

        const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
        setTxt("waterResNewAvg", Math.round(newAvgPrice).toLocaleString("ko-KR") + "원");
        setTxt("waterResTotalQty", newTotalQty.toLocaleString("ko-KR", { maximumFractionDigits: 6 }));
        setTxt("waterResTotalCost", Math.round(newTotalCost).toLocaleString("ko-KR") + "원");
        setTxt("waterResBreakEven", Math.round(breakEvenPrice).toLocaleString("ko-KR") + "원");
        
        const gainEl = document.getElementById("waterResRequiredGain");
        if (gainEl) {
            gainEl.innerText = (requiredGain > 0 ? "+" : "") + requiredGain.toFixed(2) + "%";
            gainEl.className = "font-black font-mono " + (requiredGain > 0 ? "text-rose-400" : "text-emerald-400");
        }

        this.renderWaterSimTable(curPrice, curQty, addPrice);
    },

    renderWaterSimTable: function (curPrice, curQty, addPrice) {
        const tbody = document.getElementById("waterSimTableBody");
        if (!tbody || addPrice <= 0 || curQty <= 0) return;

        const curTotalCost = curPrice * curQty;
        const amounts = [500000, 1000000, 2000000, 3000000, 5000000, 10000000];

        tbody.innerHTML = amounts.map(amt => {
            const addQ = amt / addPrice;
            const totQ = curQty + addQ;
            const totC = curTotalCost + amt;
            const avgP = totC / totQ;
            const dropPct = ((avgP - curPrice) / curPrice) * 100;
            const breakEven = avgP * 1.001;

            return `<tr class="border-b border-navy-800 hover:bg-navy-800/40 transition text-xs">` +
              `<td class="py-2.5 px-3 font-semibold text-slate-200">+${(amt / 10000).toLocaleString()}만원</td>` +
              `<td class="py-2.5 px-3 text-right font-mono text-cyan-400 font-bold">${Math.round(avgP).toLocaleString()}원</td>` +
              `<td class="py-2.5 px-3 text-right font-mono ${dropPct < 0 ? "text-emerald-400" : "text-rose-400"}">${dropPct.toFixed(2)}%</td>` +
              `<td class="py-2.5 px-3 text-right font-mono text-slate-300">${Math.round(breakEven).toLocaleString()}원</td>` +
            `</tr>`;
        }).join("");
    },

    // 2. 김치프리미엄 & 보따리(아비트라지) 계산기 (실시간 연동)
    fetchKimpData: async function () {
        const kimpBody = document.getElementById("kimpTableBody");
        if (!kimpBody) return;

        try {
            const upbitRes = await fetch("https://api.upbit.com/v1/ticker?markets=KRW-BTC,KRW-ETH,KRW-XRP,KRW-SOL,KRW-DOGE,KRW-TRX,KRW-USDT");
            if (!upbitRes.ok) throw new Error("업비트 API 응답 실패");
            const upbitData = await upbitRes.json();

            const usdtItem = upbitData.find(d => d.market === "KRW-USDT");
            const liveUsdRate = (usdtItem && usdtItem.trade_price > 1000) ? usdtItem.trade_price : (this.exchangeRateUsdKrw || 1380);
            this.exchangeRateUsdKrw = liveUsdRate;

            const setRateEl = document.getElementById("kimpUsdRateDisplay");
            if (setRateEl) setRateEl.innerText = "기준환율: 1$ = " + Math.round(liveUsdRate).toLocaleString() + "원 (실시간)";

            let binancePrices = {};
            try {
                const binanceSymbols = JSON.stringify(["BTCUSDT", "ETHUSDT", "XRPUSDT", "SOLUSDT", "DOGEUSDT", "TRXUSDT"]);
                const binanceRes = await fetch("https://api.binance.com/api/v3/ticker/price?symbols=" + encodeURIComponent(binanceSymbols));
                if (binanceRes.ok) {
                    const binanceList = await binanceRes.json();
                    binanceList.forEach(item => {
                        const s = item.symbol.replace("USDT", "");
                        binancePrices[s] = parseFloat(item.price);
                    });
                }
            } catch (binErr) {
                console.warn("Binance direct API fallback:", binErr);
            }

            const rows = upbitData.filter(d => d.market !== "KRW-USDT").map(item => {
                const sym = item.market.replace("KRW-", "");
                const upbitKrw = item.trade_price;
                const binanceUsd = binancePrices[sym] || (upbitKrw / (liveUsdRate * 1.015));
                const binanceKrw = binanceUsd * liveUsdRate;
                const diffKrw = upbitKrw - binanceKrw;
                const kimpPercent = binanceKrw > 0 ? (diffKrw / binanceKrw) * 100 : 0;

                return `<tr class="border-b border-navy-800 hover:bg-navy-800/40 transition text-xs">` +
                  `<td class="py-3 px-3 font-bold text-white flex items-center gap-1.5">` +
                    `<span class="w-6 h-6 rounded-full bg-navy-950 flex items-center justify-center text-[10px] text-cyan-400 font-mono font-black">${sym}</span>` +
                    `<span>${sym}</span>` +
                  `</td>` +
                  `<td class="py-3 px-3 text-right font-mono font-bold text-slate-100">${upbitKrw.toLocaleString()}원</td>` +
                  `<td class="py-3 px-3 text-right font-mono text-slate-400">$${binanceUsd.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>` +
                  `<td class="py-3 px-3 text-right font-mono ${diffKrw >= 0 ? "text-rose-400" : "text-cyan-400"}">${diffKrw >= 0 ? "+" : ""}${Math.round(diffKrw).toLocaleString()}원</td>` +
                  `<td class="py-3 px-3 text-right font-mono font-black ${kimpPercent >= 0 ? "text-rose-400" : "text-cyan-400"}">` +
                    `<span class="px-2 py-0.5 rounded-lg ${kimpPercent >= 0 ? "bg-rose-500/10 border border-rose-500/20" : "bg-cyan-500/10 border border-cyan-500/20"}">` +
                      `${kimpPercent >= 0 ? "+" : ""}${kimpPercent.toFixed(2)}%` +
                    `</span>` +
                  `</td>` +
                `</tr>`;
            }).join("");

            kimpBody.innerHTML = rows;
            this.calcArbitrage();
        } catch (e) {
            console.warn("Kimp fetch error:", e);
        }
    },

    calcArbitrage: function () {
        const sendAmountKrw = parseFloat(document.getElementById("arbSendAmount")?.value) || 5000000;
        const coinType = document.getElementById("arbCoinSelect")?.value || "XRP";
        const kimpRate = parseFloat(document.getElementById("arbCustomKimp")?.value || 1.8) / 100;
        const feeNetwork = coinType === "XRP" ? 1500 : (coinType === "TRX" ? 1400 : 8000);

        const tradeFee = sendAmountKrw * 0.001;
        const kimpGainKrw = sendAmountKrw * kimpRate;
        const netProfitKrw = kimpGainKrw - feeNetwork - tradeFee;
        const roi = sendAmountKrw > 0 ? (netProfitKrw / sendAmountKrw) * 100 : 0;

        const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
        setTxt("arbResNetworkFee", feeNetwork.toLocaleString() + "원");
        setTxt("arbResTradeFee", Math.round(tradeFee).toLocaleString() + "원");
        setTxt("arbResNetProfit", (netProfitKrw >= 0 ? "+" : "") + Math.round(netProfitKrw).toLocaleString() + "원");
        
        const roiEl = document.getElementById("arbResRoi");
        if (roiEl) {
            roiEl.innerText = (roi >= 0 ? "+" : "") + roi.toFixed(2) + "%";
            roiEl.className = "font-mono font-bold " + (roi >= 0 ? "text-emerald-400" : "text-rose-400");
        }
    },

    // Helper: Retrieve accurate calculation report from Analyzer Engine
    getAnalyzerData: function () {
        const getApp = () => (typeof window !== "undefined" && window.App) ? window.App : ((typeof App !== "undefined") ? App : null);
        const getCalc = () => (typeof window !== "undefined" && window.ProfitCalculator) ? window.ProfitCalculator : ((typeof ProfitCalculator !== "undefined") ? ProfitCalculator : null);
        const getStorage = () => (typeof window !== "undefined" && window.AnalyzerStorage) ? window.AnalyzerStorage : ((typeof AnalyzerStorage !== "undefined") ? AnalyzerStorage : null);

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

    // 3. 코인 세금 계산기
    calcTax: function () {
        const totalSell = parseFloat(document.getElementById("taxTotalSell")?.value) || 0;
        const totalBuy = parseFloat(document.getElementById("taxTotalBuy")?.value) || 0;
        const totalFee = parseFloat(document.getElementById("taxTotalFee")?.value) || 0;
        const deductType = document.getElementById("taxDeductionType")?.value || "250";

        const basicDeduction = deductType === "5000" ? 50000000 : 2500000;
        const netProfit = totalSell - totalBuy - totalFee;
        const taxableBase = Math.max(0, netProfit - basicDeduction);
        
        const incomeTax = taxableBase * 0.20;
        const localTax = taxableBase * 0.02;
        const totalTax = incomeTax + localTax;
        const effectiveRate = netProfit > 0 ? (totalTax / netProfit) * 100 : 0;

        const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
        setTxt("taxResNetProfit", Math.round(netProfit).toLocaleString("ko-KR") + "원");
        setTxt("taxResDeduction", Math.round(basicDeduction).toLocaleString("ko-KR") + "원");
        setTxt("taxResTaxableBase", Math.round(taxableBase).toLocaleString("ko-KR") + "원");
        setTxt("taxResIncomeTax", Math.round(incomeTax).toLocaleString("ko-KR") + "원");
        setTxt("taxResLocalTax", Math.round(localTax).toLocaleString("ko-KR") + "원");
        setTxt("taxResTotalTax", Math.round(totalTax).toLocaleString("ko-KR") + "원");
        setTxt("taxResEffectiveRate", effectiveRate.toFixed(2) + "%");

        const taxBadge = document.getElementById("taxStatusBadge");
        if (taxBadge) {
            if (netProfit <= basicDeduction) {
                taxBadge.innerText = "🛡️ 비과세 대상 (공제 한도 내 수익)";
                taxBadge.className = "px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs";
            } else {
                taxBadge.innerText = "⚠️ 납부 대상 (예상 세금: " + Math.round(totalTax).toLocaleString() + "원)";
                taxBadge.className = "px-3 py-1 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold text-xs";
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
            setVal("taxTotalSell", sellAmt);
            setVal("taxTotalBuy", buyAmt);
            setVal("taxTotalFee", feeAmt);
            this.calcTax();
            alert("손익 분석기의 실측 손익 데이터(총 매도액 " + sellAmt.toLocaleString() + "원, 매수액 " + buyAmt.toLocaleString() + "원, 수수료 " + feeAmt.toLocaleString() + "원)가 세금 계산기에 성공적으로 반영되었습니다!");
        } else {
            alert("손익 분석기에 업로드된 거래내역이 없습니다. 먼저 [손익 분석기]에서 엑셀을 업로드하거나 샘플 데이터를 로드해 주세요.");
        }
    },

    // 4. 해외 선물 청산가 & ROE 계산기
    calcFutures: function () {
        const posType = document.getElementById("futuresPosType")?.value || "LONG";
        const entryPrice = parseFloat(document.getElementById("futuresEntryPrice")?.value) || 64000;
        const marginUsdt = parseFloat(document.getElementById("futuresMargin")?.value) || 1000;
        const leverage = parseFloat(document.getElementById("futuresLeverage")?.value) || 10;
        const targetPrice = parseFloat(document.getElementById("futuresTargetPrice")?.value) || 68000;

        const positionSizeUsdt = marginUsdt * leverage;
        const positionCoinQty = entryPrice > 0 ? (positionSizeUsdt / entryPrice) : 0;
        const mmr = 0.005;

        let liqPrice = 0;
        if (posType === "LONG") {
            liqPrice = entryPrice * (1 - (1 / leverage) + mmr);
        } else {
            liqPrice = entryPrice * (1 + (1 / leverage) - mmr);
        }
        liqPrice = Math.max(0, liqPrice);

        const liqDistance = entryPrice > 0 ? Math.abs((liqPrice - entryPrice) / entryPrice) * 100 : 0;

        let pnlUsdt = 0;
        if (posType === "LONG") {
            pnlUsdt = (targetPrice - entryPrice) * positionCoinQty;
        } else {
            pnlUsdt = (entryPrice - targetPrice) * positionCoinQty;
        }
        const roePercent = marginUsdt > 0 ? (pnlUsdt / marginUsdt) * 100 : 0;
        const pnlKrw = pnlUsdt * (this.exchangeRateUsdKrw || 1380);

        const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
        setTxt("futuresResLiqPrice", "$" + liqPrice.toLocaleString(undefined, { maximumFractionDigits: 2 }));
        setTxt("futuresResLiqDistance", liqDistance.toFixed(2) + "% 남음");
        setTxt("futuresResPosSize", "$" + positionSizeUsdt.toLocaleString() + " (" + positionCoinQty.toFixed(4) + ")");
        setTxt("futuresResPnlUsdt", (pnlUsdt >= 0 ? "+" : "") + "$" + pnlUsdt.toLocaleString(undefined, { maximumFractionDigits: 2 }));
        setTxt("futuresResPnlKrw", (pnlKrw >= 0 ? "+" : "") + Math.round(pnlKrw).toLocaleString() + "원");
        
        const roeEl = document.getElementById("futuresResRoe");
        if (roeEl) {
            roeEl.innerText = (roePercent >= 0 ? "+" : "") + roePercent.toFixed(2) + "%";
            roeEl.className = "text-lg font-black font-mono " + (roePercent >= 0 ? "text-emerald-400" : "text-rose-400");
        }
    },

    setFuturesLeverage: function (lev) {
        const el = document.getElementById("futuresLeverage");
        if (el) {
            el.value = lev;
            this.calcFutures();
        }
    },

    // 5. 수익 인증 카드 생성기
    onCoinSelectChange: function () {
        const selectEl = document.getElementById('cardTopCoin');
        if (!selectEl) return;
        const selectedVal = selectEl.value;
        
        if (this.coinStatsMap && this.coinStatsMap[selectedVal]) {
            const stat = this.coinStatsMap[selectedVal];
            const roiEl = document.getElementById('cardRoi');
            const winrateEl = document.getElementById('cardWinrate');
            if (roiEl && stat.roi) roiEl.value = stat.roi;
            if (winrateEl && stat.winrate) winrateEl.value = stat.winrate;
        }
        this.renderProfitCard();
    },

    renderProfitCard: function () {
        const canvas = document.getElementById("profitCardCanvas");
        if (!canvas) return;
        const ctx = canvas.getContext("2d");

        canvas.width = 800;
        canvas.height = 480;

        const nick = (document.getElementById("cardNick")?.value || "익명 트레이더").trim();
        const roi = (document.getElementById("cardRoi")?.value || "+142.8%").trim();
        const winrate = (document.getElementById("cardWinrate")?.value || "78.5%").trim();
        const period = (document.getElementById("cardPeriod")?.value || "2024.01 ~ 2026.08").trim();
        const topCoin = (document.getElementById("cardTopCoin")?.value || "BTC (비트코인)").trim();
        const theme = document.getElementById("cardTheme")?.value || "cyber";
        const hideAmount = document.getElementById("cardHideAmount")?.checked;

        let bgGrad;
        if (theme === "gold") {
            bgGrad = ctx.createLinearGradient(0, 0, 800, 480);
            bgGrad.addColorStop(0, "#1c1503");
            bgGrad.addColorStop(0.5, "#0b0f19");
            bgGrad.addColorStop(1, "#2a1e05");
        } else if (theme === "emerald") {
            bgGrad = ctx.createLinearGradient(0, 0, 800, 480);
            bgGrad.addColorStop(0, "#021f17");
            bgGrad.addColorStop(0.5, "#07090e");
            bgGrad.addColorStop(1, "#063324");
        } else {
            bgGrad = ctx.createLinearGradient(0, 0, 800, 480);
            bgGrad.addColorStop(0, "#07090e");
            bgGrad.addColorStop(0.5, "#0f172a");
            bgGrad.addColorStop(1, "#081e36");
        }
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 800, 480);

        ctx.lineWidth = 4;
        ctx.strokeStyle = theme === "gold" ? "#f59e0b" : (theme === "emerald" ? "#10b981" : "#06b6d4");
        ctx.strokeRect(16, 16, 768, 448);

        ctx.fillStyle = theme === "gold" ? "rgba(245, 158, 11, 0.15)" : "rgba(6, 182, 212, 0.15)";
        ctx.beginPath();
        ctx.arc(760, 40, 100, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 24px Inter, sans-serif";
        ctx.fillText("CoinHub PRO", 48, 64);

        ctx.fillStyle = "#06b6d4";
        ctx.font = "bold 13px Inter, sans-serif";
        ctx.fillText("• 업비트·빗썸 공식 손익 인증서", 210, 62);

        ctx.fillStyle = "#94a3b8";
        ctx.font = "15px Inter, sans-serif";
        ctx.fillText("트레이더: " + nick, 48, 104);

        ctx.fillStyle = "#64748b";
        ctx.font = "13px Inter, sans-serif";
        ctx.fillText("검증 기간: " + period, 500, 104);

        ctx.strokeStyle = "#1e294b";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(48, 124);
        ctx.lineTo(752, 124);
        ctx.stroke();

        ctx.fillStyle = "#94a3b8";
        ctx.font = "bold 15px Inter, sans-serif";
        ctx.fillText("누적 실현 수익률 (ROI)", 48, 164);

        const isPositive = !roi.includes("-");
        ctx.fillStyle = isPositive ? "#10b981" : "#f43f5e";
        ctx.font = "black 64px Inter, sans-serif";
        ctx.fillText(roi, 48, 236);

        const drawStatBox = (x, y, title, val, color = "#ffffff") => {
            ctx.fillStyle = "rgba(11, 15, 25, 0.7)";
            ctx.fillRect(x, y, 215, 80);
            ctx.strokeStyle = "#1e294b";
            ctx.strokeRect(x, y, 215, 80);

            ctx.fillStyle = "#94a3b8";
            ctx.font = "13px Inter, sans-serif";
            ctx.fillText(title, x + 16, y + 28);

            ctx.fillStyle = color;
            ctx.font = "bold 20px Inter, sans-serif";
            ctx.fillText(val, x + 16, y + 60);
        };

        drawStatBox(48, 280, "매매 승률", winrate, "#06b6d4");
        drawStatBox(285, 280, "최대 수익 코인", topCoin, "#f59e0b");
        drawStatBox(522, 280, "데이터 신뢰도", hideAmount ? "100% 로컬 검증" : "실측 FIFO 정산", "#a855f7");

        ctx.fillStyle = "#64748b";
        ctx.font = "12px Inter, sans-serif";
        ctx.fillText("⚡ 100% 로컬 독립 연산 엔진 • https://coinhub.kr", 48, 430);

        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 12px Inter, sans-serif";
        ctx.fillText("CoinHub Certified Trade Result", 570, 430);
    },

    downloadProfitCard: function () {
        const canvas = document.getElementById("profitCardCanvas");
        if (!canvas) return;
        const link = document.createElement("a");
        link.download = "CoinHub_수익인증_" + Date.now() + ".png";
        link.href = canvas.toDataURL("image/png");
        link.click();
    },

    copyCardToClipboard: async function () {
        const canvas = document.getElementById("profitCardCanvas");
        if (!canvas) return;
        try {
            canvas.toBlob(async blob => {
                const item = new ClipboardItem({ "image/png": blob });
                await navigator.clipboard.write([item]);
                alert("수익 인증 카드가 클립보드에 복사되었습니다! 카카오톡이나 커뮤니티에 Ctrl+V로 붙여넣으세요.");
            });
        } catch (err) {
            alert("클립보드 복사를 지원하지 않는 브라우저입니다. [이미지 다운로드]를 이용해 주세요.");
        }
    },

        importProfitCardFromAnalyzer: function () {
        const rep = this.getAnalyzerData();
        const nick = (typeof getNickname === 'function' ? getNickname() : '익명 트레이더');
        const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };

        if (rep && rep.summary) {
            const s = rep.summary;
            const rawRoi = (typeof s.totalRealizedRoi === 'number') ? s.totalRealizedRoi : ((typeof s.realizedRoi === 'number') ? s.realizedRoi : parseFloat(s.totalRealizedRoi || s.realizedRoi || 0));
            const rawWinrate = (typeof s.totalWinRate === 'number') ? s.totalWinRate : ((typeof s.winRate === 'number') ? s.winRate : parseFloat(s.totalWinRate || s.winRate || 0));
            const roiStr = (rawRoi > 0 ? '+' : '') + rawRoi.toFixed(2) + '%';
            const winrateStr = rawWinrate.toFixed(1) + '%';

            // Build coinStatsMap
            this.coinStatsMap = {
                '전체 포트폴리오 (통합)': { roi: roiStr, winrate: winrateStr }
            };

            let coinSelectHtml = '<option value="전체 포트폴리오 (통합)">🪙 전체 포트폴리오 (통합)</option>';
            let defaultCoin = '전체 포트폴리오 (통합)';

            if (rep.coinSummaries && rep.coinSummaries.length > 0) {
                const sorted = [...rep.coinSummaries].sort((a, b) => (b.realizedProfit || 0) - (a.realizedProfit || 0));
                sorted.forEach(c => {
                    const cName = c.coin || c.market || '코인';
                    const cRoi = (typeof c.realizedRoi === 'number') ? ((c.realizedRoi > 0 ? '+' : '') + c.realizedRoi.toFixed(2) + '%') : roiStr;
                    const cWinrate = (typeof c.winRate === 'number') ? (c.winRate.toFixed(1) + '%') : winrateStr;
                    this.coinStatsMap[cName] = { roi: cRoi, winrate: cWinrate };
                    coinSelectHtml += '<option value="' + cName + '">' + cName + ' (수익률: ' + cRoi + ')</option>';
                });
            }

            const coinSelectEl = document.getElementById('cardTopCoin');
            if (coinSelectEl) {
                coinSelectEl.innerHTML = coinSelectHtml;
                coinSelectEl.value = defaultCoin;
            }

            let periodStr = '2024.01 ~ 2026.08';
            if (s.startDate && s.endDate) {
                periodStr = String(s.startDate).slice(0, 10) + ' ~ ' + String(s.endDate).slice(0, 10);
            }

            setVal('cardNick', nick);
            setVal('cardRoi', roiStr);
            setVal('cardWinrate', winrateStr);
            setVal('cardPeriod', periodStr);

            this.renderProfitCard();
            this.switchSubTab('card');
            alert('손익 분석기의 거래 코인 목록(' + (rep.coinSummaries ? rep.coinSummaries.length : 0) + '종)과 전체 수익률(' + roiStr + ')이 반영되었습니다! 원하는 코인을 드롭다운에서 자유롭게 선택하세요.');
        } else {
            alert('손익 분석기에 업로드된 거래내역이 없습니다. 먼저 [손익 분석기]에서 엑셀을 업로드하거나 샘플 데이터를 로드해 주세요.');
        }
    }
};

if (typeof window !== "undefined") {
    window.CoinCalculators = CoinCalculators;
}

if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => { CoinCalculators.init(); });
    } else {
        CoinCalculators.init();
    }
}
