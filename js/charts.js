/**
 * charts.js
 * Chart.js 기반 인터랙티브 시각화 차트 및
 * 트레이딩뷰(TradingView) 스타일 다이나믹 캔들스틱 매매타점 차트 엔진
 * (우측 Y축 상하 드래그 세로축 늘림/줄임, 하단 X축 가로축 조절, 더블클릭 Auto-Fit, 타점 정밀 시간 매칭)
 */

const ChartManager = {
    instances: {},
    candleChartState: {
        market: '',
        period: 'days',
        candles: [],
        trades: [],
        visibleCount: 60, // 화면에 표시될 캔들 개수 (줌 레벨)
        scrollOffset: 0,  // 우측 끝(최신)으로부터 과거 방향으로 이동한 캔들 수 (0 = 최신)
        
        // 트레이딩뷰 스타일 수동 Y축 세로 스케일 배율
        customYScale: 1.0, 
        yCenterPrice: null,

        // 드래그 인터랙션 모드 ('chart_pan' | 'y_axis_scale' | 'x_axis_scale')
        dragMode: null,
        dragStartX: 0,
        dragStartY: 0,
        dragStartOffset: 0,
        dragStartVisibleCount: 60,
        dragStartYScale: 1.0,

        isLoadingPast: false,
        hasMorePast: true,
        hoverIndex: -1,
        hoverTrade: null,
        mouseX: 0,
        mouseY: 0,
        isHovered: false
    },

    getThemeColors: function () {
        const isDark = document.body.classList.contains('dark-theme') || !document.body.classList.contains('light-theme');
        const colorConvention = localStorage.getItem('upbit_color_convention') || 'korean';

        const profitColor = colorConvention === 'korean' ? '#ef4444' : '#10b981';
        const lossColor = colorConvention === 'korean' ? '#3b82f6' : '#ef4444';
        const profitBg = colorConvention === 'korean' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)';
        const lossBg = colorConvention === 'korean' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)';

        const textColor = isDark ? '#94a3b8' : '#64748b';
        const textHighlight = isDark ? '#f8fafc' : '#0f172a';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.07)';
        const crosshairColor = isDark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.45)';
        const tooltipBg = isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)';
        const tooltipText = isDark ? '#f8fafc' : '#0f172a';
        const axisBg = isDark ? '#182030' : '#f1f5f9';

        return {
            isDark,
            profitColor,
            lossColor,
            profitBg,
            lossBg,
            textColor,
            textHighlight,
            gridColor,
            crosshairColor,
            tooltipBg,
            tooltipText,
            axisBg
        };
    },

    destroyChart: function (chartKey) {
        if (this.instances[chartKey]) {
            this.instances[chartKey].destroy();
            delete this.instances[chartKey];
        }
    },

    renderAllCharts: function (data) {
        if (!data) return;
        this.renderCumulativeProfitChart(data.cumulativeProfitHistory);
        this.renderMonthlyProfitChart(data.monthlyStats);
        this.renderCoinProfitChart(data.coinSummaries);
        this.renderPortfolioDoughnutChart(data.coinSummaries);
        this.renderCoinStackingChart(data.coinSummaries);
    },

    /**
     * 1. 누적 실현손익 추이 차트
     */
    renderCumulativeProfitChart: function (history) {
        const canvas = document.getElementById('cumulativeProfitChart');
        if (!canvas) return;

        this.destroyChart('cumulative');
        if (!history || history.length === 0) return;

        const colors = this.getThemeColors();
        const ctx = canvas.getContext('2d');

        const labels = history.map(item => item.time.substring(2, 16));
        const dataValues = history.map(item => Math.round(item.cumulativeProfit));

        const lastValue = dataValues[dataValues.length - 1] || 0;
        const mainColor = lastValue >= 0 ? colors.profitColor : colors.lossColor;

        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, lastValue >= 0 ? colors.profitBg : colors.lossBg);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        this.instances['cumulative'] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: '누적 실현손익 (KRW)',
                    data: dataValues,
                    borderColor: mainColor,
                    backgroundColor: gradient,
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.25,
                    pointRadius: history.length > 30 ? 0 : 3,
                    pointHoverRadius: 6,
                    pointBackgroundColor: mainColor
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: colors.tooltipBg,
                        titleColor: colors.tooltipText,
                        bodyColor: colors.tooltipText,
                        borderColor: colors.gridColor,
                        borderWidth: 1,
                        padding: 10,
                        callbacks: {
                            label: function (context) {
                                const val = context.parsed.y;
                                const item = history[context.dataIndex];
                                const sign = val > 0 ? '+' : '';
                                return [
                                    `누적 손익: ${sign}${val.toLocaleString()} 원`,
                                    `해당 거래 (${item.coinSymbol}): ${(item.tradeProfit > 0 ? '+' : '')}${Math.round(item.tradeProfit).toLocaleString()} 원`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: colors.gridColor },
                        ticks: { color: colors.textColor, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 }
                    },
                    y: {
                        grid: { color: colors.gridColor },
                        ticks: {
                            color: colors.textColor,
                            callback: function (val) {
                                if (Math.abs(val) >= 100000000) return (val / 100000000).toFixed(1) + '억';
                                if (Math.abs(val) >= 10000) return (val / 10000).toFixed(0) + '만';
                                return val.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    },

    /**
     * 2. 월별 실현손익 막대 차트
     */
    renderMonthlyProfitChart: function (monthlyStats) {
        const canvas = document.getElementById('monthlyProfitChart');
        if (!canvas) return;

        this.destroyChart('monthly');
        if (!monthlyStats || monthlyStats.length === 0) return;

        const colors = this.getThemeColors();
        const ctx = canvas.getContext('2d');

        const labels = monthlyStats.map(m => m.period);
        const dataValues = monthlyStats.map(m => Math.round(m.realizedProfit));
        const bgColors = dataValues.map(v => v >= 0 ? colors.profitColor : colors.lossColor);

        this.instances['monthly'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '월별 실현손익 (KRW)',
                    data: dataValues,
                    backgroundColor: bgColors,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: colors.tooltipBg,
                        titleColor: colors.tooltipText,
                        bodyColor: colors.tooltipText,
                        callbacks: {
                            label: function (context) {
                                const m = monthlyStats[context.dataIndex];
                                const val = context.parsed.y;
                                return [
                                    `실현손익: ${(val > 0 ? '+' : '')}${val.toLocaleString()} 원`,
                                    `거래대금: ${Math.round(m.totalVolume).toLocaleString()} 원`,
                                    `승률: ${m.winRate.toFixed(1)}% (${m.winCount}승 ${m.lossCount}패)`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: colors.textColor }
                    },
                    y: {
                        grid: { color: colors.gridColor },
                        ticks: {
                            color: colors.textColor,
                            callback: function (val) {
                                if (Math.abs(val) >= 100000000) return (val / 100000000).toFixed(1) + '억';
                                if (Math.abs(val) >= 10000) return (val / 10000).toFixed(0) + '만';
                                return val.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    },

    /**
     * 3. 코인별 실현손익 랭킹 차트
     */
    renderCoinProfitChart: function (coinSummaries) {
        const canvas = document.getElementById('coinProfitChart');
        if (!canvas) return;

        this.destroyChart('coinProfit');
        if (!coinSummaries || coinSummaries.length === 0) return;

        const colors = this.getThemeColors();
        const ctx = canvas.getContext('2d');

        const sorted = [...coinSummaries]
            .filter(c => Math.abs(c.realizedProfit) > 0)
            .sort((a, b) => b.realizedProfit - a.realizedProfit)
            .slice(0, 8);

        if (sorted.length === 0) return;

        const labels = sorted.map(c => c.koreanName || c.coinSymbol);
        const dataValues = sorted.map(c => Math.round(c.realizedProfit));
        const bgColors = dataValues.map(v => v >= 0 ? colors.profitColor : colors.lossColor);

        this.instances['coinProfit'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    data: dataValues,
                    backgroundColor: bgColors,
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: colors.tooltipBg,
                        titleColor: colors.tooltipText,
                        bodyColor: colors.tooltipText,
                        callbacks: {
                            label: function (context) {
                                const val = context.parsed.x;
                                const coin = sorted[context.dataIndex];
                                return [
                                    `실현손익: ${(val > 0 ? '+' : '')}${val.toLocaleString()} 원`,
                                    `수익률: ${(coin.realizedRoi > 0 ? '+' : '')}${coin.realizedRoi.toFixed(2)}%`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: colors.gridColor },
                        ticks: {
                            color: colors.textColor,
                            callback: function (val) {
                                if (Math.abs(val) >= 100000000) return (val / 100000000).toFixed(1) + '억';
                                if (Math.abs(val) >= 10000) return (val / 10000).toFixed(0) + '만';
                                return val.toLocaleString();
                            }
                        }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: colors.textColor }
                    }
                }
            }
        });
    },

    /**
     * 4. 포트폴리오 보유 비중 도넛 차트
     */
    renderPortfolioDoughnutChart: function (coinSummaries) {
        const canvas = document.getElementById('portfolioDoughnutChart');
        if (!canvas) return;

        this.destroyChart('doughnut');
        if (!coinSummaries) return;

        const colors = this.getThemeColors();
        const ctx = canvas.getContext('2d');

        const holdingCoins = coinSummaries.filter(c => c.holdingQty > 1e-8);
        if (holdingCoins.length === 0) {
            this.instances['doughnut'] = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['보유 잔고 없음'],
                    datasets: [{
                        data: [1],
                        backgroundColor: [colors.gridColor]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } }
                }
            });
            return;
        }

        const labels = holdingCoins.map(c => c.koreanName || c.coinSymbol);
        const dataValues = holdingCoins.map(c => Math.round(c.currentValue || c.holdingCost));

        const palette = [
            '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', 
            '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#14b8a6'
        ];

        this.instances['doughnut'] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: dataValues,
                    backgroundColor: palette.slice(0, labels.length),
                    borderWidth: 2,
                    borderColor: colors.isDark ? '#1e293b' : '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: colors.textColor, boxWidth: 12, padding: 12 }
                    },
                    tooltip: {
                        backgroundColor: colors.tooltipBg,
                        titleColor: colors.tooltipText,
                        bodyColor: colors.tooltipText,
                        callbacks: {
                            label: function (context) {
                                const val = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                                return `${val.toLocaleString()} 원 (${pct}%)`;
                            }
                        }
                    }
                },
                cutout: '65%'
            }
        });
    },

    /**
     * 5. 코인 갯수 늘리기 (Coin Stacking) 랭킹 차트
     */
    renderCoinStackingChart: function (coinSummaries) {
        const canvas = document.getElementById('coinStackingChart');
        if (!canvas) return;

        this.destroyChart('stacking');
        if (!coinSummaries || coinSummaries.length === 0) return;

        const colors = this.getThemeColors();
        const ctx = canvas.getContext('2d');

        const sorted = [...coinSummaries]
            .filter(c => c.gainedCoinQty && Math.abs(c.gainedCoinQty) > 1e-6)
            .sort((a, b) => b.gainedCoinRoi - a.gainedCoinRoi)
            .slice(0, 8);

        if (sorted.length === 0) return;

        const labels = sorted.map(c => `${c.koreanName || c.coinSymbol} (${c.coinSymbol})`);
        const dataValues = sorted.map(c => Number(c.gainedCoinRoi.toFixed(2)));
        const bgColors = dataValues.map(v => v >= 0 ? colors.profitColor : colors.lossColor);

        this.instances['stacking'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '코인 수량 증가율 (%)',
                    data: dataValues,
                    backgroundColor: bgColors,
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: colors.tooltipBg,
                        titleColor: colors.tooltipText,
                        bodyColor: colors.tooltipText,
                        callbacks: {
                            label: function (context) {
                                const coin = sorted[context.dataIndex];
                                const sign = coin.gainedCoinQty > 0 ? '+' : '';
                                return [
                                    `수량 증감: ${sign}${coin.gainedCoinQty.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${coin.coinSymbol}`,
                                    `매수대비 수량증가율: ${sign}${coin.gainedCoinRoi.toFixed(2)}%`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: colors.gridColor },
                        ticks: {
                            color: colors.textColor,
                            callback: (val) => `${val}%`
                        }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: colors.textColor }
                    }
                }
            }
        });
    },

    /**
     * =========================================================================
     * ★ 6. 트레이딩뷰(TradingView) 스타일 다이나믹 캔들스틱 매매타점 차트 엔진
     * (우측 Y축 상하 드래그 세로축 조절, 하단 X축 가로축 조절, 더블클릭 Auto-Fit, 타점 정밀 시간 매칭)
     * =========================================================================
     */
    initCandleChartEngine: function (market, period, initialCandles, trades) {
        const state = this.candleChartState;
        state.market = market;
        state.period = period;
        state.candles = initialCandles || [];
        state.trades = trades || [];
        state.visibleCount = Math.min(60, state.candles.length || 60);
        state.scrollOffset = 0; // 0 = 최신 캔들이 화면 우측 끝에 위치
        state.customYScale = 1.0;
        state.yCenterPrice = null;
        state.hasMorePast = true;
        state.isLoadingPast = false;

        const canvas = document.getElementById('tradePointsChartCanvas');
        if (!canvas) return;

        this.bindCandleCanvasEvents(canvas);
        this.drawTradingViewCandleChart();
    },

    /**
     * 주기(Period)에 따른 1개 캔들의 시간 폭(밀리초) 반환
     */
    getCandleWindowMs: function (period) {
        if (period === 'minutes/1') return 60 * 1000;
        if (period === 'minutes/3') return 3 * 60 * 1000;
        if (period === 'minutes/5') return 5 * 60 * 1000;
        if (period === 'minutes/10') return 10 * 60 * 1000;
        if (period === 'minutes/15') return 15 * 60 * 1000;
        if (period === 'minutes/30') return 30 * 60 * 1000;
        if (period === 'minutes/60') return 60 * 60 * 1000;
        if (period === 'minutes/240') return 240 * 60 * 1000;
        if (period === 'weeks') return 7 * 86400 * 1000;
        if (period === 'months') return 30 * 86400 * 1000;
        return 86400 * 1000; // days (기본 일봉 24시간)
    },

    bindCandleCanvasEvents: function (canvas) {
        if (canvas._tvEventsBound) return;

        const state = this.candleChartState;
        const padding = { top: 35, right: 90, bottom: 35, left: 15 };

        // 마우스 이동 & 드래그
        canvas.addEventListener('mousemove', (e) => {
            const r = canvas.getBoundingClientRect();
            const width = r.width;
            const height = r.height;
            state.mouseX = e.clientX - r.left;
            state.mouseY = e.clientY - r.top;
            state.isHovered = true;

            // 드래그 중인 경우
            if (state.dragMode === 'y_axis_scale') {
                // 우측 Y축 세로 드래그 (위로 드래그 = 확대, 아래로 드래그 = 축소)
                const dy = state.mouseY - state.dragStartY;
                const scaleFactor = 1 - (dy / 150);
                state.customYScale = Math.max(0.15, Math.min(8.0, state.dragStartYScale * scaleFactor));
                this.drawTradingViewCandleChart();
                return;
            }

            if (state.dragMode === 'x_axis_scale') {
                // 하단 X축 가로 드래그 (좌우 간격 조절)
                const dx = state.mouseX - state.dragStartX;
                const countDelta = Math.round(dx / 8);
                const newCount = state.dragStartVisibleCount - countDelta;
                if (newCount >= 15 && newCount <= 250) {
                    state.visibleCount = newCount;
                }
                this.drawTradingViewCandleChart();
                return;
            }

            if (state.dragMode === 'chart_pan') {
                // 중앙 차트 좌우 이동 (Pan)
                const dx = state.mouseX - state.dragStartX;
                const chartW = width - padding.left - padding.right;
                const candleWidth = chartW / state.visibleCount;
                const shiftCandles = Math.round(dx / candleWidth);

                const maxOffset = Math.max(0, state.candles.length - state.visibleCount);
                state.scrollOffset = Math.max(0, Math.min(maxOffset + 30, state.dragStartOffset + shiftCandles));

                // 과거 끝(왼쪽 끝)에 도달하면 과거 데이터 자동 추가 로딩 (무한 스크롤)
                if (state.scrollOffset >= state.candles.length - state.visibleCount - 15) {
                    this.loadMorePastCandles();
                }
                this.drawTradingViewCandleChart();
                return;
            }

            // 마우스 커서 모양 제어
            if (state.mouseX >= width - padding.right) {
                canvas.style.cursor = 'ns-resize'; // Y축 가격 조절 화살표
            } else if (state.mouseY >= height - padding.bottom) {
                canvas.style.cursor = 'ew-resize'; // X축 시간 조절 화살표
            } else {
                canvas.style.cursor = 'crosshair'; // 차트 십자선
            }

            this.drawTradingViewCandleChart();
        });

        // 마우스 다운 (드래그 시작)
        canvas.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // 좌클릭만
            const r = canvas.getBoundingClientRect();
            const width = r.width;
            const height = r.height;
            state.dragStartX = e.clientX - r.left;
            state.dragStartY = e.clientY - r.top;
            state.dragStartOffset = state.scrollOffset;
            state.dragStartVisibleCount = state.visibleCount;
            state.dragStartYScale = state.customYScale;

            if (state.dragStartX >= width - padding.right) {
                state.dragMode = 'y_axis_scale';
                canvas.style.cursor = 'ns-resize';
            } else if (state.dragStartY >= height - padding.bottom) {
                state.dragMode = 'x_axis_scale';
                canvas.style.cursor = 'ew-resize';
            } else {
                state.dragMode = 'chart_pan';
                canvas.style.cursor = 'grabbing';
            }
        });

        // 마우스 업 (드래그 종료)
        window.addEventListener('mouseup', () => {
            if (state.dragMode) {
                state.dragMode = null;
                canvas.style.cursor = 'crosshair';
            }
        });

        // 우측 축 또는 차트 더블클릭 시 Auto-Fit 자동 스케일 복귀
        canvas.addEventListener('dblclick', (e) => {
            state.customYScale = 1.0;
            state.yCenterPrice = null;
            this.drawTradingViewCandleChart();
        });

        // 마우스 리브
        canvas.addEventListener('mouseleave', () => {
            if (!state.dragMode) {
                state.isHovered = false;
                state.hoverIndex = -1;
                state.hoverTrade = null;
                this.drawTradingViewCandleChart();
            }
        });

        // 마우스 휠 (Zoom In / Zoom Out)
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomDelta = e.deltaY < 0 ? -4 : 4;
            const newCount = state.visibleCount + zoomDelta;

            if (newCount >= 15 && newCount <= 250 && newCount <= state.candles.length + 20) {
                state.visibleCount = newCount;
                const maxOffset = Math.max(0, state.candles.length - state.visibleCount);
                state.scrollOffset = Math.min(maxOffset, state.scrollOffset);
                this.drawTradingViewCandleChart();
            }
        }, { passive: false });

        // 창 크기 조절 시 리렌더링
        window.addEventListener('resize', () => {
            if (document.getElementById('tradePointsTab').classList.contains('active')) {
                this.drawTradingViewCandleChart();
            }
        });

        canvas._tvEventsBound = true;
    },

    /**
     * 과거 캔들 데이터 비동기 추가 로딩 (Infinite Scroll)
     */
    loadMorePastCandles: async function () {
        const state = this.candleChartState;
        if (state.isLoadingPast || !state.hasMorePast || state.candles.length === 0) return;

        state.isLoadingPast = true;
        const oldestCandle = state.candles[0];
        const toTime = oldestCandle.time;

        try {
            const moreCandles = await UpbitAPI.fetchCandles(state.market, state.period, 200, toTime);
            if (moreCandles && moreCandles.length > 0) {
                const existingTimes = new Set(state.candles.map(c => c.time));
                const newPastCandles = moreCandles.filter(c => !existingTimes.has(c.time));

                if (newPastCandles.length > 0) {
                    state.candles = [...newPastCandles, ...state.candles];
                    state.scrollOffset += newPastCandles.length;
                    state.dragStartOffset += newPastCandles.length;
                } else {
                    state.hasMorePast = false;
                }
            } else {
                state.hasMorePast = false;
            }
        } catch (err) {
            console.warn('과거 캔들 로드 실패:', err);
        } finally {
            state.isLoadingPast = false;
            this.drawTradingViewCandleChart();
        }
    },

    /**
     * 🎯 매매 타점으로 차트 뷰포트 즉시 이동 (Focus Trades)
     */
    focusOnTrades: function () {
        const state = this.candleChartState;
        if (!state.trades || state.trades.length === 0 || state.candles.length === 0) {
            alert('해당 코인의 매매 체결 타점이 없습니다.');
            return;
        }

        const targetTrade = state.trades[state.trades.length - 1];
        const targetTime = new Date(targetTrade.time).getTime();

        let closestIdx = -1;
        let minDiff = Infinity;

        for (let i = 0; i < state.candles.length; i++) {
            const cTime = new Date(state.candles[i].time).getTime();
            const diff = Math.abs(targetTime - cTime);
            if (diff < minDiff) {
                minDiff = diff;
                closestIdx = i;
            }
        }

        if (closestIdx !== -1) {
            const targetOffset = (state.candles.length - 1) - closestIdx - Math.floor(state.visibleCount / 2);
            state.scrollOffset = Math.max(0, Math.min(state.candles.length - state.visibleCount, targetOffset));
            state.customYScale = 1.0;
            state.yCenterPrice = null;
            this.drawTradingViewCandleChart();
        }
    },

    /**
     * ⟲ 최신 시세 뷰포트로 리셋 & Auto-Fit
     */
    resetCandleView: function () {
        const state = this.candleChartState;
        state.visibleCount = 60;
        state.scrollOffset = 0;
        state.customYScale = 1.0;
        state.yCenterPrice = null;
        this.drawTradingViewCandleChart();
    },

    zoomCandleView: function (delta) {
        const state = this.candleChartState;
        const newCount = state.visibleCount + delta;
        if (newCount >= 15 && newCount <= 250) {
            state.visibleCount = newCount;
            this.drawTradingViewCandleChart();
        }
    },

    /**
     * 트레이딩뷰 스타일 캔버스 메인 렌더링 루프
     */
    drawTradingViewCandleChart: function () {
        const canvas = document.getElementById('tradePointsChartCanvas');
        if (!canvas) return;

        const state = this.candleChartState;
        const { candles, trades, visibleCount, scrollOffset, customYScale, mouseX, mouseY, isHovered, period } = state;
        if (!candles || candles.length === 0) return;

        const ctx = canvas.getContext('2d');
        const container = canvas.parentElement;
        const dpr = window.devicePixelRatio || 1;
        const width = container.clientWidth || 800;
        const height = 440;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.scale(dpr, dpr);

        const colors = this.getThemeColors();
        const padding = { top: 35, right: 90, bottom: 35, left: 15 };
        const chartW = width - padding.left - padding.right;
        const chartH = height - padding.top - padding.bottom;

        ctx.clearRect(0, 0, width, height);

        // 1. 현재 뷰포트에 표시될 캔들 슬라이스 계산
        const totalCandles = candles.length;
        const endIndex = Math.max(1, totalCandles - scrollOffset);
        const startIndex = Math.max(0, endIndex - visibleCount);
        const visibleCandles = candles.slice(startIndex, endIndex);

        if (visibleCandles.length === 0) return;

        // 2. 동적 Y축 가격 범위 (Auto Dynamic Scaling + 수동 customYScale 조절)
        let minPrice = Infinity;
        let maxPrice = -Infinity;

        visibleCandles.forEach(c => {
            if (c.low < minPrice) minPrice = c.low;
            if (c.high > maxPrice) maxPrice = c.high;
        });

        // 뷰포트 시간 범위 (타점 매칭용)
        const vWindowMs = this.getCandleWindowMs(period);
        const vStartMs = new Date(visibleCandles[0].time).getTime() - (vWindowMs / 2);
        const vEndMs = new Date(visibleCandles[visibleCandles.length - 1].time).getTime() + (vWindowMs / 2);

        // 뷰포트 내에 실제로 들어오는 매매 타점만 Y축 스케일에 반영
        trades.forEach(t => {
            const tMs = new Date(t.time).getTime();
            if (tMs >= vStartMs && tMs <= vEndMs) {
                if (t.price < minPrice) minPrice = t.price;
                if (t.price > maxPrice) maxPrice = t.price;
            }
        });

        // 기본 Auto-Fit 범위
        let rawRange = (maxPrice - minPrice) || (minPrice * 0.05) || 1;
        let centerPrice = (maxPrice + minPrice) / 2;

        // 수동 Y축 세로 스케일 적용 (customYScale)
        let scaledRange = rawRange / (customYScale || 1.0);
        let finalMinPrice = Math.max(0, centerPrice - scaledRange * 0.54);
        let finalMaxPrice = centerPrice + scaledRange * 0.54;

        const getY = (p) => padding.top + chartH - ((p - finalMinPrice) / (finalMaxPrice - finalMinPrice)) * chartH;
        const candleStep = chartW / visibleCandles.length;
        const getX = (idx) => padding.left + (idx + 0.5) * candleStep;
        const candleW = Math.max(2, Math.min(22, candleStep * 0.75));

        // 3. 배경 그리드 & Y축 가격 눈금
        ctx.lineWidth = 1;
        ctx.strokeStyle = colors.gridColor;
        ctx.fillStyle = colors.textColor;
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'left';

        const yTicksCount = 6;
        for (let i = 0; i <= yTicksCount; i++) {
            const p = finalMinPrice + (finalMaxPrice - finalMinPrice) * (i / yTicksCount);
            const y = getY(p);

            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();

            // Y축 라벨
            let priceLabel = Math.round(p).toLocaleString();
            if (p >= 100000000) priceLabel = (p / 100000000).toFixed(2) + '억';
            else if (p >= 10000) priceLabel = (p / 10000).toFixed(0) + '만';
            ctx.fillText(priceLabel + '원', width - padding.right + 8, y + 4);
        }

        // X축 시간 눈금
        const xStep = Math.max(1, Math.floor(visibleCandles.length / 6));
        ctx.textAlign = 'center';
        for (let i = 0; i < visibleCandles.length; i += xStep) {
            const x = getX(i);
            const c = visibleCandles[i];
            
            ctx.beginPath();
            ctx.moveTo(x, padding.top);
            ctx.lineTo(x, height - padding.bottom);
            ctx.stroke();

            let timeLabel = c.date;
            if (period.startsWith('minutes')) {
                timeLabel = c.time.substring(5, 16);
            } else if (period === 'weeks' || period === 'months') {
                timeLabel = c.date.substring(2, 7);
            } else {
                timeLabel = c.date.substring(5, 10);
            }
            ctx.fillText(timeLabel, x, height - 12);
        }

        // 4. 최신 종가 점선 라인 & 우측 현재가 뱃지
        const latestCandle = candles[candles.length - 1];
        if (latestCandle) {
            const latestY = getY(latestCandle.close);
            if (latestY >= padding.top && latestY <= height - padding.bottom) {
                const isLatestUp = latestCandle.close >= latestCandle.open;
                const badgeColor = isLatestUp ? colors.profitColor : colors.lossColor;

                ctx.save();
                ctx.strokeStyle = badgeColor;
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.moveTo(padding.left, latestY);
                ctx.lineTo(width - padding.right, latestY);
                ctx.stroke();

                ctx.fillStyle = badgeColor;
                ctx.fillRect(width - padding.right + 2, latestY - 9, padding.right - 6, 18);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 10px sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(Math.round(latestCandle.close).toLocaleString(), width - padding.right + 6, latestY + 4);
                ctx.restore();
            }
        }

        // 5. 캔들스틱 (Candlestick) 렌더링
        visibleCandles.forEach((c, i) => {
            const x = getX(i);
            const isUp = c.close >= c.open;
            const candleColor = isUp ? colors.profitColor : colors.lossColor;

            const openY = getY(c.open);
            const closeY = getY(c.close);
            const highY = getY(c.high);
            const lowY = getY(c.low);

            ctx.strokeStyle = candleColor;
            ctx.fillStyle = candleColor;

            // 윗꼬리 / 아랫꼬리 심지 (Wick)
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x, highY);
            ctx.lineTo(x, lowY);
            ctx.stroke();

            // 캔들 몸통 (Body)
            const bodyY = Math.min(openY, closeY);
            const bodyH = Math.max(2, Math.abs(closeY - openY));
            ctx.fillRect(x - candleW / 2, bodyY, candleW, bodyH);
        });

        // 6. ★ 매수 / 매도 체결 타점 정밀 시간 매칭 & 렌더링 (벽면 뭉침 버그 완벽 방지)
        const matchedTrades = [];
        const matchThresholdMs = vWindowMs * 0.95; // 캔들 1개 주기 이내의 거래만 허용

        trades.forEach(trade => {
            const tradeMs = new Date(trade.time).getTime();
            
            // 뷰포트 시간 범위 밖의 거래는 즉시 제외 (벽면 뭉침 방지)
            if (tradeMs < vStartMs || tradeMs > vEndMs) return;

            let closestIdx = -1;
            let minDiff = Infinity;

            for (let i = 0; i < visibleCandles.length; i++) {
                const cMs = new Date(visibleCandles[i].time).getTime();
                const diff = Math.abs(tradeMs - cMs);
                if (diff < minDiff) {
                    minDiff = diff;
                    closestIdx = i;
                }
            }

            // 가장 가까운 캔들과의 시간 차이가 임계값 이내일 때만 캔들에 부착
            if (closestIdx !== -1 && minDiff <= matchThresholdMs) {
                const candle = visibleCandles[closestIdx];
                const x = getX(closestIdx);
                const isBuy = trade.type === '매수';

                // 체결가 Y좌표 계산
                let y = getY(trade.price);

                // 만약 체결가가 캔들 밖으로 너무 벗어나면 캔들 상/하단 근처로 밀착
                const highY = getY(candle.high);
                const lowY = getY(candle.low);

                if (isBuy) {
                    // 매수 마커는 캔들 저가 아래 또는 체결단가 위치에 밀착
                    y = Math.max(y, lowY + 12);
                } else {
                    // 매도 마커는 캔들 고가 위 또는 체결단가 위치에 밀착
                    y = Math.min(y, highY - 12);
                }

                // 차트 상하 경계선 클리핑 방지
                y = Math.max(padding.top + 14, Math.min(height - padding.bottom - 14, y));

                matchedTrades.push({
                    trade,
                    x,
                    y,
                    candleIdx: closestIdx
                });
            }
        });

        // 타점 마커 그리기
        matchedTrades.forEach(mt => {
            const isBuy = mt.trade.type === '매수';
            const mColor = isBuy ? '#ef4444' : '#3b82f6';
            const mSize = 9;

            ctx.save();
            ctx.fillStyle = mColor;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;

            ctx.beginPath();
            if (isBuy) {
                // 🔴 위로 향하는 삼각형 (▲ BUY)
                ctx.moveTo(mt.x, mt.y - mSize);
                ctx.lineTo(mt.x - mSize, mt.y + mSize);
                ctx.lineTo(mt.x + mSize, mt.y + mSize);
            } else {
                // 🔵 아래로 향하는 삼각형 (▼ SELL)
                ctx.moveTo(mt.x, mt.y + mSize);
                ctx.lineTo(mt.x - mSize, mt.y - mSize);
                ctx.lineTo(mt.x + mSize, mt.y - mSize);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 라벨 (BUY / SELL)
            ctx.font = 'bold 9px sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            const labelY = isBuy ? mt.y + mSize + 12 : mt.y - mSize - 4;
            ctx.fillText(isBuy ? 'BUY' : 'SELL', mt.x, labelY);
            ctx.restore();
        });

        // 7. 트레이딩뷰 정통 크로스헤어 & 툴팁 & 상단 상태 가이드
        if (isHovered && mouseX >= padding.left && mouseX <= width - padding.right && mouseY >= padding.top && mouseY <= height - padding.bottom) {
            const relX = mouseX - padding.left;
            const idx = Math.min(visibleCandles.length - 1, Math.max(0, Math.floor(relX / candleStep)));
            const candle = visibleCandles[idx];
            const candleX = getX(idx);

            // 십자선
            ctx.save();
            ctx.strokeStyle = colors.crosshairColor;
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);

            ctx.beginPath();
            ctx.moveTo(candleX, padding.top);
            ctx.lineTo(candleX, height - padding.bottom);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(padding.left, mouseY);
            ctx.lineTo(width - padding.right, mouseY);
            ctx.stroke();

            // X축 시간 뱃지 (하단)
            ctx.setLineDash([]);
            ctx.fillStyle = colors.axisBg;
            ctx.strokeStyle = colors.gridColor;
            ctx.fillRect(candleX - 55, height - padding.bottom + 2, 110, 20);
            ctx.strokeRect(candleX - 55, height - padding.bottom + 2, 110, 20);
            ctx.fillStyle = colors.textHighlight;
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(candle.time, candleX, height - padding.bottom + 16);

            // Y축 가격 뱃지 (우측)
            const hoverPrice = finalMinPrice + ((height - padding.bottom - mouseY) / chartH) * (finalMaxPrice - finalMinPrice);
            ctx.fillStyle = colors.axisBg;
            ctx.fillRect(width - padding.right + 2, mouseY - 10, padding.right - 6, 20);
            ctx.strokeRect(width - padding.right + 2, mouseY - 10, padding.right - 6, 20);
            ctx.fillStyle = colors.textHighlight;
            ctx.textAlign = 'left';
            ctx.fillText(Math.round(hoverPrice).toLocaleString(), width - padding.right + 6, mouseY + 4);
            ctx.restore();

            // 상단 O/H/L/C 시세 정보
            const isUp = candle.close >= candle.open;
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillStyle = colors.textColor;

            const timeStr = candle.time;
            const openStr = `시: ${Math.round(candle.open).toLocaleString()}`;
            const highStr = `고: ${Math.round(candle.high).toLocaleString()}`;
            const lowStr = `저: ${Math.round(candle.low).toLocaleString()}`;
            const closeStr = `종: ${Math.round(candle.close).toLocaleString()}`;
            const volStr = `거래량: ${candle.volume.toFixed(2)}`;

            ctx.fillText(`${timeStr}   ${openStr}   ${highStr}   ${lowStr}   ${volStr}   `, padding.left, 18);
            ctx.fillStyle = isUp ? colors.profitColor : colors.lossColor;
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText(closeStr, padding.left + 420, 18);

            // 타점 마커 호버 툴팁
            let hoveredTrade = null;
            for (const mt of matchedTrades) {
                const dist = Math.hypot(mouseX - mt.x, mouseY - mt.y);
                if (dist < 18 || mt.candleIdx === idx) {
                    hoveredTrade = mt.trade;
                    break;
                }
            }

            if (hoveredTrade) {
                this.drawTradeTooltip(ctx, hoveredTrade, mouseX, mouseY, width, height, colors);
            }
        } else {
            // 상단 가이드라인
            ctx.font = '12px sans-serif';
            ctx.fillStyle = colors.textColor;
            ctx.textAlign = 'left';
            ctx.fillText(`💡 [우측 Y축 드래그]: 세로 늘림/줄임 | [우측 축 더블클릭]: 자동맞춤(Auto-Fit) | [하단 X축 드래그]: 가로 조절 | [중앙 드래그]: 시세 이동`, padding.left, 18);
        }

        // 로딩 중 표시
        if (state.isLoadingPast) {
            ctx.save();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(padding.left, padding.top, 160, 28);
            ctx.fillStyle = '#ffffff';
            ctx.font = '11px sans-serif';
            ctx.fillText('⏳ 이전 과거 캔들 로딩 중...', padding.left + 10, padding.top + 18);
            ctx.restore();
        }
    },

    drawTradeTooltip: function (ctx, trade, x, y, width, height, colors) {
        const isBuy = trade.type === '매수';
        const lines = [
            isBuy ? `🔴 [매수 체결] ${trade.exchange || 'UPBIT'}` : `🔵 [매도 체결] ${trade.exchange || 'UPBIT'}`,
            `체결단가: ${Math.round(trade.price).toLocaleString()}원`,
            `체결수량: ${trade.quantity.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${trade.coinSymbol}`,
            `거래금액: ${Math.round(trade.amount).toLocaleString()}원`,
            `체결일시: ${trade.time}`
        ];

        if (!isBuy && trade.realizedProfit !== undefined) {
            const sign = trade.realizedProfit > 0 ? '+' : '';
            lines.push(`실현손익: ${sign}${Math.round(trade.realizedProfit).toLocaleString()}원 (${sign}${(trade.realizedRoi || 0).toFixed(2)}%)`);
        }

        ctx.save();
        ctx.font = '11px sans-serif';
        const boxW = 220;
        const boxH = lines.length * 18 + 14;
        let boxX = x + 15;
        let boxY = y - boxH / 2;

        if (boxX + boxW > width - 10) boxX = x - boxW - 15;
        if (boxY < 30) boxY = 30;
        if (boxY + boxH > height - 10) boxY = height - boxH - 10;

        ctx.fillStyle = colors.tooltipBg;
        ctx.strokeStyle = isBuy ? '#ef4444' : '#3b82f6';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(boxX, boxY, boxW, boxH, 8);
        } else {
            ctx.rect(boxX, boxY, boxW, boxH);
        }
        ctx.fill();
        ctx.stroke();

        lines.forEach((line, i) => {
            ctx.fillStyle = i === 0 ? (isBuy ? '#ef4444' : '#3b82f6') : colors.tooltipText;
            ctx.font = i === 0 ? 'bold 12px sans-serif' : '11px sans-serif';
            ctx.fillText(line, boxX + 12, boxY + 20 + i * 18);
        });

        ctx.restore();
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChartManager;
}
