/**
 * charts.js
 * Chart.js 기반 인터랙티브 손익 및 포트폴리오 시각화 엔진
 */

const ChartManager = {
    instances: {},

    getThemeColors: function () {
        const isLight = document.documentElement.classList.contains('theme-light') || !document.documentElement.classList.contains('dark');
        const profitColor = '#f43f5e';
        const lossColor = '#3b82f6';
        const profitBg = 'rgba(244, 63, 94, 0.15)';
        const lossBg = 'rgba(59, 130, 246, 0.15)';

        // In light mode, use deep dark black/slate for 100% crystal clear readability
        const textColor = isLight ? '#0f172a' : '#94a3b8';
        const textHighlight = isLight ? '#0f172a' : '#f8fafc';
        const gridColor = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.07)';
        const tooltipBg = isLight ? 'rgba(15, 23, 42, 0.95)' : 'rgba(15, 23, 42, 0.95)';
        const tooltipText = '#f8fafc';
        const cardBorder = isLight ? '#ffffff' : '#182030';

        return {
            isDark: !isLight,
            isLight,
            profitColor,
            lossColor,
            profitBg,
            lossBg,
            textColor,
            textHighlight,
            gridColor,
            tooltipBg,
            tooltipText,
            cardBorder
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

        const labels = history.map(h => h.time ? h.time.split(' ')[0] : '');
        const dataValues = history.map(h => h.cumulativeProfit);

        const lastVal = dataValues[dataValues.length - 1] || 0;
        const lineColor = lastVal >= 0 ? colors.profitColor : colors.lossColor;
        const gradient = ctx.createLinearGradient(0, 0, 0, 260);
        gradient.addColorStop(0, lastVal >= 0 ? 'rgba(244, 63, 94, 0.35)' : 'rgba(59, 130, 246, 0.35)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.0)');

        this.instances['cumulative'] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: '누적 실현손익 (원)',
                    data: dataValues,
                    borderColor: lineColor,
                    backgroundColor: gradient,
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.25,
                    pointRadius: history.length > 50 ? 0 : 3,
                    pointHoverRadius: 6,
                    pointBackgroundColor: lineColor
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
                                return '누적 실현손익: ' + (val > 0 ? '+' : '') + Math.round(val).toLocaleString('ko-KR') + '원';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: colors.gridColor },
                        ticks: { color: colors.textColor, maxTicksLimit: 8, font: { size: 11 } }
                    },
                    y: {
                        grid: { color: colors.gridColor },
                        ticks: {
                            color: colors.textColor,
                            font: { size: 11 },
                            callback: function (value) {
                                if (Math.abs(value) >= 100000000) return (value / 100000000).toFixed(1) + '억';
                                if (Math.abs(value) >= 10000) return (value / 10000).toFixed(0) + '만';
                                return value.toLocaleString('ko-KR');
                            }
                        }
                    }
                }
            }
        });
    },

    /**
     * 2. 월별 실현손익 비교 차트
     */
    renderMonthlyProfitChart: function (monthlyStats) {
        const canvas = document.getElementById('monthlyProfitChart');
        if (!canvas) return;

        this.destroyChart('monthly');
        if (!monthlyStats || monthlyStats.length === 0) return;

        const colors = this.getThemeColors();
        const ctx = canvas.getContext('2d');

        const labels = monthlyStats.map(m => m.period);
        const dataValues = monthlyStats.map(m => m.realizedProfit);
        const bgColors = dataValues.map(v => v >= 0 ? colors.profitColor : colors.lossColor);

        this.instances['monthly'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '월별 실현손익',
                    data: dataValues,
                    backgroundColor: bgColors,
                    borderRadius: 4,
                    maxBarThickness: 36
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
                                const val = context.parsed.y;
                                return '실현손익: ' + (val > 0 ? '+' : '') + Math.round(val).toLocaleString('ko-KR') + '원';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: colors.textColor, font: { size: 11 } }
                    },
                    y: {
                        grid: { color: colors.gridColor },
                        ticks: {
                            color: colors.textColor,
                            font: { size: 11 },
                            callback: function (value) {
                                if (Math.abs(value) >= 10000) return (value / 10000).toFixed(0) + '만';
                                return value.toLocaleString('ko-KR');
                            }
                        }
                    }
                }
            }
        });
    },

    /**
     * 3. 수익이 가장 높은 코인 상위 TOP (Top Profit Coins)
     */
    renderCoinStackingChart: function (coinSummaries) {
        const canvas = document.getElementById('coinStackingChart');
        if (!canvas) return;

        this.destroyChart('stacking');
        if (!coinSummaries || coinSummaries.length === 0) return;

        const colors = this.getThemeColors();
        const ctx = canvas.getContext('2d');

        // 실현손익이 0보다 큰 코인을 수익금 내림차순으로 정렬하여 상위 8개 추출
        const topProfitCoins = [...coinSummaries]
            .filter(c => (c.realizedProfit || 0) > 0)
            .sort((a, b) => (b.realizedProfit || 0) - (a.realizedProfit || 0))
            .slice(0, 8);

        if (topProfitCoins.length === 0) return;

        const labels = topProfitCoins.map(c => (c.koreanName || c.coinSymbol));
        const dataValues = topProfitCoins.map(c => Math.round(c.realizedProfit || 0));
        const bgColors = dataValues.map(() => colors.profitColor);

        this.instances['stacking'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '실현수익금 (원)',
                    data: dataValues,
                    backgroundColor: bgColors,
                    borderRadius: 4,
                    maxBarThickness: 24
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
                                const coin = topProfitCoins[context.dataIndex];
                                const val = context.parsed.x;
                                const roi = coin.realizedRoi || 0;
                                return [
                                    '실현수익금: +' + Math.round(val).toLocaleString('ko-KR') + '원',
                                    '실현수익률: ' + (roi > 0 ? '+' : '') + roi.toFixed(2) + '%'
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
                            font: { size: 11 },
                            callback: function (val) {
                                if (Math.abs(val) >= 100000000) return (val / 100000000).toFixed(1) + '억';
                                if (Math.abs(val) >= 10000) return (val / 10000).toFixed(0) + '만';
                                return val.toLocaleString('ko-KR');
                            }
                        }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: colors.textHighlight, font: { size: 11, weight: 'bold' } }
                    }
                }
            }
        });
    },

    /**
     * 4. 코인별 실현손익 상위 차트
     */
    renderCoinProfitChart: function (coinSummaries) {
        const canvas = document.getElementById('coinProfitChart');
        if (!canvas) return;

        this.destroyChart('coinProfit');
        if (!coinSummaries || coinSummaries.length === 0) return;

        const colors = this.getThemeColors();
        const ctx = canvas.getContext('2d');

        const topCoins = [...coinSummaries]
            .sort((a, b) => Math.abs(b.realizedProfit) - Math.abs(a.realizedProfit))
            .slice(0, 8);

        const labels = topCoins.map(c => (c.koreanName || c.coinSymbol));
        const dataValues = topCoins.map(c => c.realizedProfit);
        const bgColors = dataValues.map(v => v >= 0 ? colors.profitColor : colors.lossColor);

        this.instances['coinProfit'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '실현손익 (원)',
                    data: dataValues,
                    backgroundColor: bgColors,
                    borderRadius: 4,
                    maxBarThickness: 28
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
                                const val = context.parsed.y;
                                return '실현손익: ' + (val > 0 ? '+' : '') + Math.round(val).toLocaleString('ko-KR') + '원';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: colors.textColor, font: { size: 11 } }
                    },
                    y: {
                        grid: { color: colors.gridColor },
                        ticks: {
                            color: colors.textColor,
                            font: { size: 11 },
                            callback: function (value) {
                                if (Math.abs(value) >= 10000) return (value / 10000).toFixed(0) + '만';
                                return value.toLocaleString('ko-KR');
                            }
                        }
                    }
                }
            }
        });
    },

    /**
     * 5. 포트폴리오 보유 비중 도넛 차트
     */
    renderPortfolioDoughnutChart: function (coinSummaries) {
        const canvas = document.getElementById('portfolioDoughnutChart');
        if (!canvas) return;

        this.destroyChart('portfolio');
        if (!coinSummaries || coinSummaries.length === 0) return;

        const holdingCoins = coinSummaries.filter(c => c.holdingQty > 1e-8);
        if (holdingCoins.length === 0) return;

        const colors = this.getThemeColors();
        const ctx = canvas.getContext('2d');

        const labels = holdingCoins.map(c => (c.koreanName || c.coinSymbol));
        const dataValues = holdingCoins.map(c => c.currentValue || c.holdingCost || 1);
        const palette = [
            '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
            '#10b981', '#6366f1', '#14b8a6', '#f97316', '#84cc16'
        ];

        this.instances['portfolio'] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: dataValues,
                    backgroundColor: palette.slice(0, labels.length),
                    borderWidth: 2,
                    borderColor: colors.cardBorder
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '68%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: colors.textHighlight, boxWidth: 12, font: { size: 11 } }
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
                                return context.label + ': ' + Math.round(val).toLocaleString('ko-KR') + '원 (' + pct + '%)';
                            }
                        }
                    }
                }
            }
        });
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChartManager;
}

window.ChartManager = ChartManager;
