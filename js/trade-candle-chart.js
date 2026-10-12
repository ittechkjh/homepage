/**
 * trade-candle-chart.js
 * 업비트 & 빗썸 매수·매도 체결 타점(포인트 마커) 캔들 차트 및 복기 엔진
 * Powered by TradingView Lightweight Charts
 */

(function (window) {
    'use strict';

    const TradeCandleChart = {
        chartInstance: null,
        candleSeries: null,
        avgPriceLine: null,
        currentCoin: null,
        currentTrades: [],
        currentCandles: [],
        currentTimeframe: 'days',
        currentFilter: 'ALL',

        // 지원 타임프레임 정의
        timeframeConfigs: {
            'days': { label: '일봉', upbitType: 'days', count: 200 },
            'minutes/240': { label: '4시간', upbitType: 'minutes/240', count: 200 },
            'minutes/60': { label: '1시간', upbitType: 'minutes/60', count: 200 },
            'minutes/30': { label: '30분', upbitType: 'minutes/30', count: 200 },
            'minutes/15': { label: '15분', upbitType: 'minutes/15', count: 200 },
            'minutes/5': { label: '5분', upbitType: 'minutes/5', count: 200 }
        },

        // 손익분석기 코인 행에서 바로 호출
        openForCoin: function (marketOrSymbol) {
            if (!marketOrSymbol) return;

            let coinSummary = null;
            let trades = [];

            // 1. 손익분석기 데이터 조회
            const app = (typeof window.App !== 'undefined' ? window.App : null);
            if (app && app.state && app.state.reportData) {
                const rep = app.state.reportData;
                if (rep.coinSummaries) {
                    coinSummary = rep.coinSummaries.find(c => 
                        c.market === marketOrSymbol || 
                        c.coinSymbol === marketOrSymbol || 
                        (c.market && c.market.endsWith('-' + marketOrSymbol))
                    );
                }
            }

            // 2. 전체 거래내역에서 해당 코인 체결 필터링
            const storage = (typeof window.AnalyzerStorage !== 'undefined' ? window.AnalyzerStorage : null);
            if (storage && storage.getTrades) {
                const allTrades = storage.getTrades() || [];
                const sym = (coinSummary?.coinSymbol || marketOrSymbol.replace(/.*-/, '').replace(/.*:::/, '')).toUpperCase();
                trades = allTrades.filter(t => {
                    const tSym = (t.coinSymbol || (t.market ? t.market.replace(/.*-/, '').replace(/.*:::/, '') : '')).toUpperCase();
                    return tSym === sym && (t.type === '매수' || t.type === '매도');
                });
            }

            const sym = (coinSummary?.coinSymbol || marketOrSymbol.replace(/.*-/, '').replace(/.*:::/, '')).toUpperCase();
            const name = coinSummary?.koreanName || coinSummary?.name || sym;
            const market = coinSummary?.market || (marketOrSymbol.includes('-') ? marketOrSymbol : `KRW-${sym}`);
            const exchange = coinSummary?.exchange || (market.includes('BITHUMB') ? 'BITHUMB' : 'UPBIT');
            const avgBuyPrice = coinSummary?.avgBuyPrice || 0;
            const curPrice = coinSummary?.currentPrice || 0;

            this.openModal({
                symbol: sym,
                name: name,
                market: market,
                exchange: exchange,
                avgBuyPrice: avgBuyPrice,
                currentPrice: curPrice,
                holdingQty: coinSummary?.holdingQty || 0
            }, trades);
        },

        // 롤링 계산기에서 현재 선택 코인으로 호출
        openFromRollingCalculator: function () {
            const select = document.getElementById('rollingCoinSelect');
            if (!select) return;

            const selectedOpt = select.selectedOptions[0];
            const sym = selectedOpt?.getAttribute('data-symbol') || (select.value || '').replace(/^.*_/, '');
            if (!sym) {
                alert('먼저 롤링 계산기에서 코인을 선택해 주세요.');
                return;
            }

            this.openForCoin(sym);
        },

        // 모달 열기
        openModal: function (coinData, trades = []) {
            this.currentCoin = coinData;
            this.currentTrades = trades.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
            this.currentTimeframe = 'days';
            this.currentFilter = 'ALL';

            const modal = document.getElementById('tradeCandleChartModal');
            if (!modal) {
                console.error('tradeCandleChartModal element not found');
                return;
            }

            // 모달 헤더 데이터 채우기
            const titleEl = document.getElementById('tccModalTitle');
            const badgeEl = document.getElementById('tccModalBadges');
            const exBadgeClass = coinData.exchange === 'BITHUMB' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            const exName = coinData.exchange === 'BITHUMB' ? '🔶 빗썸' : '🔷 업비트';

            if (titleEl) {
                titleEl.innerHTML = `
                    <div class="flex items-center gap-2">
                        <span class="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-xs font-black text-white shadow-md">${coinData.symbol}</span>
                        <div>
                            <div class="flex items-center gap-2">
                                <span class="font-extrabold text-base sm:text-lg text-slate-100">${coinData.name}</span>
                                <span class="text-xs font-mono text-slate-400">(${coinData.symbol})</span>
                                <span class="px-2 py-0.5 rounded-lg border text-[11px] font-bold ${exBadgeClass}">${exName}</span>
                            </div>
                            <div class="text-[11px] text-slate-400 font-mono">${coinData.market}</div>
                        </div>
                    </div>
                `;
            }

            const buyCount = this.currentTrades.filter(t => t.type === '매수').length;
            const sellCount = this.currentTrades.filter(t => t.type === '매도').length;
            const avgStr = coinData.avgBuyPrice > 0 ? Number(coinData.avgBuyPrice).toLocaleString() + '원' : '-';

            if (badgeEl) {
                badgeEl.innerHTML = `
                    <span class="px-2.5 py-1 rounded-xl bg-navy-900 border border-navy-700 text-xs font-medium text-slate-300">
                        총 체결 <strong class="text-white">${this.currentTrades.length}건</strong> 
                        (<span class="text-rose-400 font-bold">매수 ${buyCount}회</span> / <span class="text-blue-400 font-bold">매도 ${sellCount}회</span>)
                    </span>
                    <span class="px-2.5 py-1 rounded-xl bg-navy-900 border border-navy-700 text-xs font-medium text-slate-300">
                        내 평단가: <strong class="text-amber-400 font-bold">${avgStr}</strong>
                    </span>
                `;
            }

            // 모달 보이기
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';

            // 타임프레임 버튼 UI 초기화
            this.updateTimeframeButtons();

            // 차트 렌더링
            setTimeout(() => {
                this.loadAndRenderChart(this.currentTimeframe);
                this.renderTradesTable();
            }, 50);
        },

        // 모달 닫기
        closeModal: function () {
            const modal = document.getElementById('tradeCandleChartModal');
            if (modal) modal.classList.add('hidden');
            document.body.style.overflow = '';
            this.destroyChart();
        },

        // 타임프레임 버튼 활성화 UI 갱신
        updateTimeframeButtons: function () {
            const container = document.getElementById('tccTimeframeContainer');
            if (!container) return;

            const buttons = container.querySelectorAll('button[data-tf]');
            buttons.forEach(btn => {
                const tf = btn.getAttribute('data-tf');
                if (tf === this.currentTimeframe) {
                    btn.className = 'px-3 py-1 rounded-xl bg-cyan-500 text-navy-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition cursor-pointer';
                } else {
                    btn.className = 'px-3 py-1 rounded-xl bg-navy-900 border border-navy-700 hover:bg-navy-800 text-slate-300 font-medium text-xs transition cursor-pointer';
                }
            });
        },

        // 타임프레임 변경
        switchTimeframe: function (tf) {
            if (this.currentTimeframe === tf) return;
            this.currentTimeframe = tf;
            this.updateTimeframeButtons();
            this.loadAndRenderChart(tf);
        },

        // 캔들 데이터 수신 및 차트 + 타점 마커 그리기
        loadAndRenderChart: async function (tf) {
            const container = document.getElementById('tccChartContainer');
            const loadingEl = document.getElementById('tccChartLoading');
            if (!container) return;

            if (loadingEl) loadingEl.classList.remove('hidden');

            const cfg = this.timeframeConfigs[tf] || this.timeframeConfigs['days'];
            const market = this.currentCoin.market;

            try {
                // 1. 거래소 캔들 데이터 로드 (UpbitAPI)
                let candles = [];
                if (typeof UpbitAPI !== 'undefined' && UpbitAPI.fetchCandles) {
                    candles = await UpbitAPI.fetchCandles(market, cfg.upbitType, cfg.count);
                }

                if (!candles || candles.length === 0) {
                    if (loadingEl) loadingEl.classList.add('hidden');
                    container.innerHTML = `
                        <div class="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                            <span>캔들 데이터를 불러올 수 없습니다. (${market})</span>
                            <span class="text-xs text-slate-500">네트워크 연결 또는 마켓 코드를 확인해 주세요.</span>
                        </div>
                    `;
                    return;
                }

                this.currentCandles = candles;
                this.renderLightweightChart(container, candles);

            } catch (err) {
                console.error('매매 타점 차트 로딩 실패:', err);
                if (container) {
                    container.innerHTML = `
                        <div class="h-full flex flex-col items-center justify-center text-rose-400 gap-1">
                            <span>차트 생성 중 오류가 발생했습니다.</span>
                            <span class="text-xs text-slate-400">${err.message || ''}</span>
                        </div>
                    `;
                }
            } finally {
                if (loadingEl) loadingEl.classList.add('hidden');
            }
        },

        // TradingView Lightweight Charts 렌더링
        renderLightweightChart: function (container, candles) {
            this.destroyChart();
            container.innerHTML = '';

            if (typeof LightweightCharts === 'undefined' || typeof LightweightCharts.createChart !== 'function') {
                container.innerHTML = '<div class="p-6 text-center text-slate-400">Lightweight Charts 라이브러리가 로드되지 않았습니다.</div>';
                return;
            }

            const isLight = document.documentElement.classList.contains('theme-light');
            const width = container.clientWidth || 800;
            const height = container.clientHeight || 450;

            const chart = LightweightCharts.createChart(container, {
                width: width,
                height: height,
                layout: {
                    background: { color: isLight ? '#ffffff' : '#070b14' },
                    textColor: isLight ? '#334155' : '#94a3b8',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                },
                grid: {
                    vertLines: { color: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)' },
                    horzLines: { color: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)' }
                },
                crosshair: {
                    mode: LightweightCharts.CrosshairMode ? LightweightCharts.CrosshairMode.Normal : 1
                },
                rightPriceScale: {
                    borderColor: isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.1)',
                    scaleMargins: { top: 0.1, bottom: 0.15 }
                },
                timeScale: {
                    borderColor: isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.1)',
                    timeVisible: this.currentTimeframe !== 'days',
                    secondsVisible: false
                }
            });

            this.chartInstance = chart;

            // 캔들 시리즈 추가 (한국 거래소 표준: 양봉 빨강, 음봉 파랑)
            const candleOptions = {
                upColor: '#ef4444',
                downColor: '#3b82f6',
                borderVisible: false,
                wickUpColor: '#ef4444',
                wickDownColor: '#3b82f6'
            };

            const isV5 = typeof chart.addSeries === 'function';
            const candleSeries = isV5
                ? chart.addSeries(LightweightCharts.CandlestickSeries, candleOptions)
                : chart.addCandlestickSeries(candleOptions);

            // 캔들 데이터 변환 및 정렬 (시간 기준 오름차순, 중복 시간 제거)
            const lwCandles = [];
            const seenTime = new Set();

            candles.forEach(c => {
                const sec = Math.floor(c.timestamp ? c.timestamp / 1000 : new Date(c.time).getTime() / 1000);
                if (!seenTime.has(sec)) {
                    seenTime.add(sec);
                    lwCandles.push({
                        time: sec,
                        open: c.open,
                        high: c.high,
                        low: c.low,
                        close: c.close
                    });
                }
            });

            lwCandles.sort((a, b) => a.time - b.time);
            candleSeries.setData(lwCandles);
            this.candleSeries = candleSeries;

            // 내 평단가 라인 추가 (있을 경우 황금색 점선)
            if (this.currentCoin.avgBuyPrice > 0) {
                this.avgPriceLine = candleSeries.createPriceLine({
                    price: this.currentCoin.avgBuyPrice,
                    color: '#f59e0b',
                    lineWidth: 2,
                    lineStyle: 2, // Dashed
                    axisLabelVisible: true,
                    title: `내 평단가 (${Number(this.currentCoin.avgBuyPrice).toLocaleString()}원)`
                });
            }

            // ========================================================
            // 🎯 핵심: 업비트 스타일 매수/매도 체결 타점(포인트 마커) 생성
            // ========================================================
            const markers = [];

            if (lwCandles.length > 0 && this.currentTrades.length > 0) {
                const minTime = lwCandles[0].time;
                const maxTime = lwCandles[lwCandles.length - 1].time;

                this.currentTrades.forEach(trade => {
                    const tradeSec = Math.floor(new Date(trade.time).getTime() / 1000);
                    if (isNaN(tradeSec)) return;

                    // 캔들 범위 내 또는 가장 근접한 캔들 시간 탐색
                    let matchedCandleTime = null;
                    if (this.currentTimeframe === 'days') {
                        // 일봉: 같은 날짜(00:00:00 UTC / 09:00:00 KST)에 해당하는 캔들 매칭
                        const tradeDateStr = trade.time.split(' ')[0];
                        const matched = candles.find(c => c.date === tradeDateStr || c.time.startsWith(tradeDateStr));
                        if (matched) {
                            matchedCandleTime = Math.floor(matched.timestamp / 1000);
                        }
                    } else {
                        // 분봉: 거래 시점 직전의 가장 최근 캔들 매칭
                        for (let i = lwCandles.length - 1; i >= 0; i--) {
                            if (lwCandles[i].time <= tradeSec) {
                                matchedCandleTime = lwCandles[i].time;
                                break;
                            }
                        }
                    }

                    // 캔들 범위 내에 있으면 마커 추가
                    if (matchedCandleTime && matchedCandleTime >= minTime && matchedCandleTime <= maxTime) {
                        const isBuy = (trade.type === '매수');
                        const priceStr = Number(trade.price).toLocaleString();
                        const qtyStr = Number(trade.quantity).toLocaleString(undefined, { maximumFractionDigits: 4 });

                        markers.push({
                            time: matchedCandleTime,
                            position: isBuy ? 'belowBar' : 'aboveBar',
                            color: isBuy ? '#ef4444' : '#3b82f6',
                            shape: isBuy ? 'arrowUp' : 'arrowDown',
                            text: isBuy ? `매수 @ ${priceStr}원 (${qtyStr}개)` : `매도 @ ${priceStr}원 (${qtyStr}개)`,
                            size: 1
                        });
                    }
                });
            }

            // 시간순 정렬 후 마커 적용
            markers.sort((a, b) => a.time - b.time);
            candleSeries.setMarkers(markers);

            // 전체 캔들 화면에 맞게 자동 줌
            chart.timeScale().fitContent();

            // 리사이즈 핸들러
            const resizeHandler = () => {
                if (this.chartInstance && container) {
                    this.chartInstance.applyOptions({
                        width: container.clientWidth || 800,
                        height: container.clientHeight || 450
                    });
                }
            };
            window.addEventListener('resize', resizeHandler);
            this._resizeHandler = resizeHandler;
        },

        // 차트 인스턴스 파괴
        destroyChart: function () {
            if (this._resizeHandler) {
                window.removeEventListener('resize', this._resizeHandler);
                this._resizeHandler = null;
            }
            if (this.chartInstance) {
                try {
                    this.chartInstance.remove();
                } catch (e) {}
                this.chartInstance = null;
                this.candleSeries = null;
                this.avgPriceLine = null;
            }
        },

        // 하단 체결 내역 테이블 렌더링
        renderTradesTable: function () {
            const tbody = document.getElementById('tccTradesTableBody');
            const countBadge = document.getElementById('tccTableCountBadge');
            if (!tbody) return;

            let filtered = this.currentTrades;
            if (this.currentFilter === 'BUY') {
                filtered = this.currentTrades.filter(t => t.type === '매수');
            } else if (this.currentFilter === 'SELL') {
                filtered = this.currentTrades.filter(t => t.type === '매도');
            }

            if (countBadge) countBadge.innerText = `${filtered.length}건`;

            if (filtered.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="py-6 text-center text-slate-500 text-xs">체결 내역이 없습니다.</td></tr>';
                return;
            }

            let html = '';
            filtered.forEach((t, idx) => {
                const isBuy = t.type === '매수';
                const typeBadge = isBuy
                    ? '<span class="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 font-bold text-[11px] border border-rose-500/30">🔴 매수</span>'
                    : '<span class="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 font-bold text-[11px] border border-blue-500/30">🔵 매도</span>';

                const pStr = Number(t.price).toLocaleString() + '원';
                const qStr = Number(t.quantity).toLocaleString(undefined, { maximumFractionDigits: 6 }) + '개';
                const aStr = Number(t.amount || (t.price * t.quantity)).toLocaleString() + '원';
                const feeStr = Number(t.fee || 0).toLocaleString() + '원';

                html += `
                <tr class="border-b border-navy-800/60 hover:bg-navy-900/60 transition cursor-pointer text-xs" onclick="TradeCandleChart.focusTradeOnChart('${t.time}')">
                    <td class="py-2.5 px-3 text-slate-400 font-mono text-[11px]">${t.time}</td>
                    <td class="py-2.5 px-2 text-center">${typeBadge}</td>
                    <td class="py-2.5 px-3 text-right font-mono font-medium text-slate-200">${pStr}</td>
                    <td class="py-2.5 px-3 text-right font-mono text-slate-300">${qStr}</td>
                    <td class="py-2.5 px-3 text-right font-mono font-bold ${isBuy ? 'text-slate-100' : 'text-blue-400'}">${aStr}</td>
                    <td class="py-2.5 px-3 text-right font-mono text-slate-400 text-[11px]">${feeStr}</td>
                </tr>
                `;
            });

            tbody.innerHTML = html;
        },

        // 테이블 필터 전환
        setTableFilter: function (filter) {
            this.currentFilter = filter;
            const btnAll = document.getElementById('tccFilterAll');
            const btnBuy = document.getElementById('tccFilterBuy');
            const btnSell = document.getElementById('tccFilterSell');

            const activeClass = 'px-2.5 py-1 rounded-lg text-xs font-bold transition bg-cyan-500 text-navy-950 shadow-sm cursor-pointer';
            const inactiveClass = 'px-2.5 py-1 rounded-lg text-xs font-semibold transition bg-navy-900 border border-navy-700 text-slate-400 hover:text-white cursor-pointer';

            if (btnAll) btnAll.className = filter === 'ALL' ? activeClass : inactiveClass;
            if (btnBuy) btnBuy.className = filter === 'BUY' ? activeClass : inactiveClass;
            if (btnSell) btnSell.className = filter === 'SELL' ? activeClass : inactiveClass;

            this.renderTradesTable();
        },

        // 특정 체결 클릭 시 해당 캔들 시점으로 차트 포커스 이동
        focusTradeOnChart: function (tradeTimeStr) {
            if (!this.chartInstance || !tradeTimeStr) return;
            const tSec = Math.floor(new Date(tradeTimeStr).getTime() / 1000);
            if (isNaN(tSec)) return;

            // 해당 시점 전후로 차트 가시 범위 스크롤
            try {
                this.chartInstance.timeScale().setVisibleRange({
                    from: tSec - (86400 * 15),
                    to: tSec + (86400 * 15)
                });
            } catch (e) {
                this.chartInstance.timeScale().scrollToPosition(0, true);
            }
        }
    };

    window.TradeCandleChart = TradeCandleChart;

})(typeof window !== 'undefined' ? window : this);
