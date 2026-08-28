const AnalyzerStorage = {
    getCurrentUserId: function () {
        try {
            const u = window.currentUser || JSON.parse(localStorage.getItem("coinhub_user"));
            if (u && u.username) return String(u.username).trim().toLowerCase();
        } catch (e) {}
        return "guest";
    },
    getKey: function (key) {
        return "coinhub_" + this.getCurrentUserId() + "_" + key;
    },
    getTrades: function () {
        try {
            const saved = localStorage.getItem(this.getKey("trades"));
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (e) {
            console.error("거래 내역 로드 실패:", e);
        }
        return [];
    },
    saveTrades: function (trades) {
        try {
            localStorage.setItem(this.getKey("trades"), JSON.stringify(trades));
        } catch (e) {
            console.warn("거래 내역 저장 오류/용량 초과:", e);
        }
    },
    getStaking: function () {
        try {
            const saved = localStorage.getItem(this.getKey("custom_staking"));
            return saved ? JSON.parse(saved) : [];
        } catch (e) { return []; }
    },
    saveStaking: function (staking) {
        try {
            localStorage.setItem(this.getKey("custom_staking"), JSON.stringify(staking));
        } catch (e) {}
    },
    clearUserData: function () {
        localStorage.removeItem(this.getKey("trades"));
        localStorage.removeItem(this.getKey("custom_staking"));
    }
};

/**
 * app.js
 * 메인 애플리케이션 상태 관리, UI 상호작용 및 이벤트 바인딩
 * (전 테이블 컬럼 정렬/숨기기, 트레이딩뷰 스타일 다이나믹 캔들스틱 매매타점 차트)
 */

const ColumnManager = {
    tables: {
        coinsTable: [
            { id: 'coin', name: '코인명 / 거래소', default: true },
            { id: 'realizedProfit', name: '실현손익 (수익률)', default: true },
            { id: 'gainedCoin', name: '늘린 코인수량 (환산)', default: true },
            { id: 'holdingQty', name: '보유수량 (보유원금)', default: true },
            { id: 'avgBuyPrice', name: '매수 평단가', default: true },
            { id: 'currentPrice', name: '실시간 현재가', default: true },
            { id: 'unrealizedProfit', name: '평가손익 (평가수익률)', default: true },
            { id: 'totalBuyAmount', name: '총 매수금액', default: true },
            { id: 'totalSellAmount', name: '총 매도금액', default: true },
            { id: 'totalFee', name: '수수료', default: true },
            { id: 'winRate', name: '승률 / 타점', default: true }
        ],
        transfersTable: [
            { id: 'exchange', name: '거래소', default: true },
            { id: 'time', name: '일시', default: true },
            { id: 'type', name: '구분', default: true },
            { id: 'asset', name: '자산', default: true },
            { id: 'quantity', name: '수량 / 금액', default: true },
            { id: 'price', name: '단가', default: true },
            { id: 'fee', name: '수수료', default: true },
            { id: 'settlement', name: '정산금액', default: true }
        ],
        stakingTable: [
            { id: 'coin', name: '코인명 / 거래소', default: true },
            { id: 'stakedQty', name: '스테이킹 수량', default: true },
            { id: 'currentPrice', name: '실시간 현재가', default: true },
            { id: 'currentValue', name: '현재 평가금액', default: true },
            { id: 'apy', name: '연이율 (APY)', default: true },
            { id: 'totalReward', name: '누적 보상수량 (원금)', default: true },
            { id: 'annualReward', name: '예상 연간 보상', default: true },
            { id: 'manage', name: '관리', default: true }
        ],
        allActivitiesTable: [
            { id: 'exchange', name: '거래소', default: true },
            { id: 'time', name: '체결/처리시간', default: true },
            { id: 'asset', name: '코인/자산', default: true },
            { id: 'type', name: '구분', default: true },
            { id: 'quantity', name: '수량', default: true },
            { id: 'price', name: '단가', default: true },
            { id: 'amount', name: '거래/입출금액', default: true },
            { id: 'fee', name: '수수료', default: true },
            { id: 'settlement', name: '정산금액', default: true },
            { id: 'realizedProfit', name: '실현손익', default: true }
        ],
        monthlyTable: [
            { id: 'period', name: '년월', default: true },
            { id: 'realizedProfit', name: '실현손익', default: true },
            { id: 'buyVolume', name: '총 매수대금', default: true },
            { id: 'sellVolume', name: '총 매도대금', default: true },
            { id: 'totalVolume', name: '총 거래대금', default: true },
            { id: 'totalFees', name: '수수료 합계', default: true },
            { id: 'winRate', name: '승률', default: true }
        ],
        tradePointsHistoryTable: [
            { id: 'exchange', name: '거래소', default: true },
            { id: 'time', name: '체결일시', default: true },
            { id: 'type', name: '구분', default: true },
            { id: 'price', name: '체결단가', default: true },
            { id: 'quantity', name: '체결수량', default: true },
            { id: 'amount', name: '거래금액', default: true },
            { id: 'fee', name: '수수료', default: true },
            { id: 'realizedProfit', name: '실현손익', default: true }
        ]
    },

    getHiddenCols: function (tableId) {
        try {
            const saved = localStorage.getItem(`upbit_hidden_cols_${tableId}`);
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    },

    setHiddenCols: function (tableId, hiddenCols) {
        try {
            localStorage.setItem(`upbit_hidden_cols_${tableId}`, JSON.stringify(hiddenCols));
        } catch (e) {}
    },

    toggleCol: function (tableId, colId, isHidden) {
        let hidden = this.getHiddenCols(tableId);
        if (isHidden) {
            if (!hidden.includes(colId)) hidden.push(colId);
        } else {
            hidden = hidden.filter(id => id !== colId);
        }
        this.setHiddenCols(tableId, hidden);
        this.applyVisibility(tableId);
    },

    applyVisibility: function (tableId) {
        const table = document.getElementById(tableId);
        if (!table) return;

        const hidden = this.getHiddenCols(tableId);
        const colDefs = this.tables[tableId] || [];

        colDefs.forEach((col, idx) => {
            const isHidden = hidden.includes(col.id);
            const nth = idx + 1;

            const th = table.querySelector(`thead th:nth-child(${nth})`);
            if (th) th.style.display = isHidden ? 'none' : '';

            table.querySelectorAll(`tbody tr td:nth-child(${nth})`).forEach(td => {
                td.style.display = isHidden ? 'none' : '';
            });
        });
    },

    renderColumnDropdown: function (tableId, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const colDefs = this.tables[tableId] || [];
        const hidden = this.getHiddenCols(tableId);

        let itemsHtml = '';
        colDefs.forEach(col => {
            const isChecked = !hidden.includes(col.id);
            itemsHtml += `
                <label class="col-toggle-item">
                    <input type="checkbox" data-table="${tableId}" data-col="${col.id}" ${isChecked ? 'checked' : ''}>
                    <span>${col.name}</span>
                </label>
            `;
        });

        container.innerHTML = `
            <div class="col-dropdown">
                <button class="btn btn-sm btn-outline col-dropdown-btn">⚙️ 컬럼 설정 ▼</button>
                <div class="col-dropdown-menu">
                    <div class="col-dropdown-header">표시할 컬럼 선택</div>
                    ${itemsHtml}
                </div>
            </div>
        `;

        const btn = container.querySelector('.col-dropdown-btn');
        const menu = container.querySelector('.col-dropdown-menu');

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('show');
        });

        container.querySelectorAll('input[type="checkbox"]').forEach(chk => {
            chk.addEventListener('change', (e) => {
                const tId = e.target.dataset.table;
                const cId = e.target.dataset.col;
                const isHidden = !e.target.checked;
                ColumnManager.toggleCol(tId, cId, isHidden);
            });
        });

        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                menu.classList.remove('show');
            }
        });
    }
};

const App = {
    state: {
        rawTrades: [],
        reportData: null,
        customStaking: JSON.parse(localStorage.getItem('upbit_custom_staking') || '[]'),
        method: localStorage.getItem('upbit_calc_method') || 'fifo',
        theme: localStorage.getItem('upbit_theme') || 'dark',
        colorConvention: localStorage.getItem('upbit_color_convention') || 'korean',
        exchangeFilter: 'ALL',
        autoRefreshTicker: false,
        tickerTimer: null,
        activeTab: 'dashboard',
        // 타점 차트 상태
        selectedPointsMarket: '',
        selectedCandlePeriod: 'days', // 'minutes/1', 'minutes/5', 'minutes/15', 'minutes/60', 'minutes/240', 'days', 'weeks', 'months'
        // 테이블 정렬 상태들
        sortStates: {
            coinsTable: { col: 'realizedProfit', asc: false },
            transfersTable: { col: 'time', asc: false },
            stakingTable: { col: 'currentValue', asc: false },
            allActivitiesTable: { col: 'time', asc: false },
            monthlyTable: { col: 'period', asc: false },
            tradePointsHistoryTable: { col: 'time', asc: false }
        },
        // 필터 상태들
        activityFilter: {
            search: '',
            market: 'ALL',
            typeGroup: 'ALL',
            startDate: '',
            endDate: '',
            page: 1,
            pageSize: 20
        },
        transferFilter: {
            search: '',
            type: 'ALL',
            page: 1,
            pageSize: 20
        }
    },

    init: async function () {
        try {
            this.applyTheme();
            this.initColumnDropdowns();
            this.bindEvents();
            
            if (typeof UpbitAPI !== 'undefined' && UpbitAPI.initMarketInfo) {
                await UpbitAPI.initMarketInfo();
            }
            
            this.loadSavedTrades();
            
            // 저장된 데이터가 없는 경우 기본 샘플 데이터를 자동으로 로드하여 화면이 비어있지 않도록 보장
            if (!this.state.rawTrades || this.state.rawTrades.length === 0) {
                await this.loadSampleData('ALL');
            }
        } catch (err) {
            console.error('App 초기화 중 오류 발생:', err);
            // 긴급 fallback 렌더링
            this.recalculate();
        }
    },

    initColumnDropdowns: function () {
        ColumnManager.renderColumnDropdown('coinsTable', 'coinsColDropdownContainer');
        ColumnManager.renderColumnDropdown('transfersTable', 'transfersColDropdownContainer');
        ColumnManager.renderColumnDropdown('stakingTable', 'stakingColDropdownContainer');
        ColumnManager.renderColumnDropdown('allActivitiesTable', 'activitiesColDropdownContainer');
        ColumnManager.renderColumnDropdown('monthlyTable', 'monthlyColDropdownContainer');
        ColumnManager.renderColumnDropdown('tradePointsHistoryTable', 'pointsHistoryColDropdownContainer');
    },

    applyTheme: function () {
        if (this.state.theme === 'light') {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
        } else {
            document.body.classList.remove('light-theme');
            document.body.classList.add('dark-theme');
        }

        const themeToggleBtn = document.getElementById('themeToggleBtn');
        if (themeToggleBtn) {
            themeToggleBtn.innerHTML = this.state.theme === 'light' ? '🌙 다크 모드' : '☀️ 라이트 모드';
        }

        const colorSelect = document.getElementById('colorConventionSelect');
        if (colorSelect) {
            colorSelect.value = this.state.colorConvention;
        }

        const methodSelect = document.getElementById('calcMethodSelect');
        if (methodSelect) {
            methodSelect.value = this.state.method;
        }
    },

    bindEvents: function () {
        // 탭 네비게이션
        document.querySelectorAll(".analyzer-subtab").forEach(tab => {
            tab.addEventListener('click', (e) => {
                const targetTab = e.currentTarget.dataset.subtab || e.currentTarget.dataset.tab;
                this.switchTab(targetTab);
            });
        });

        // 거래소 선택 필터
        const exchangeFilterSelect = document.getElementById('globalExchangeSelect');
        if (exchangeFilterSelect) {
            exchangeFilterSelect.addEventListener('change', (e) => {
                this.state.exchangeFilter = e.target.value;
                this.recalculate();
                const exName = e.target.value === 'ALL' ? '전체 거래소(통합)' : (e.target.value === 'UPBIT' ? '업비트' : '빗썸');
                this.showToast(`분석 대상 거래소가 '${exName}'(으)로 변경되었습니다.`, 'info');
            });
        }

        // 파일 드래그 & 드롭 및 선택
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');

        if (dropZone && fileInput) {
            dropZone.addEventListener('click', () => fileInput.click());
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('dragover');
            });
            dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('dragover');
                if (e.dataTransfer.files.length > 0) {
                    this.handleFiles(e.dataTransfer.files);
                }
            });

            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleFiles(e.target.files);
                }
            });
        }

        const quickUploadBtn = document.getElementById('quickUploadBtn');
        if (quickUploadBtn && fileInput) {
            quickUploadBtn.addEventListener('click', () => fileInput.click());
        }

        // 샘플 데이터 로드 링크들
        const loadAllSampleBtn = document.getElementById('loadAllSampleBtn');
        if (loadAllSampleBtn) {
            loadAllSampleBtn.addEventListener('click', () => this.loadSampleData('ALL'));
        }

        const loadUpbitSampleBtn = document.getElementById('loadUpbitSampleBtn');
        if (loadUpbitSampleBtn) {
            loadUpbitSampleBtn.addEventListener('click', () => this.loadSampleData('UPBIT'));
        }

        const loadBithumbSampleBtn = document.getElementById('loadBithumbSampleBtn');
        if (loadBithumbSampleBtn) {
            loadBithumbSampleBtn.addEventListener('click', () => this.loadSampleData('BITHUMB'));
        }

        // 계산 방식 변경
        const methodSelect = document.getElementById('calcMethodSelect');
        if (methodSelect) {
            methodSelect.addEventListener('change', (e) => {
                this.state.method = e.target.value;
                localStorage.setItem('upbit_calc_method', this.state.method);
                this.recalculate();
                this.showToast(`계산 방식이 '${e.target.value === 'fifo' ? '선입선출법(FIFO)' : '이동평균법'}'(으)로 변경되었습니다.`, 'info');
            });
        }

        const colorSelect = document.getElementById('colorConventionSelect');
        if (colorSelect) {
            colorSelect.addEventListener('change', (e) => {
                this.state.colorConvention = e.target.value;
                localStorage.setItem('upbit_color_convention', this.state.colorConvention);
                this.renderAll();
            });
        }

        const themeToggleBtn = document.getElementById('themeToggleBtn');
        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', () => {
                this.state.theme = this.state.theme === 'dark' ? 'light' : 'dark';
                localStorage.setItem('upbit_theme', this.state.theme);
                this.applyTheme();
                this.renderAll();
            });
        }

        const refreshTickerBtn = document.getElementById('refreshTickerBtn');
        if (refreshTickerBtn) {
            refreshTickerBtn.addEventListener('click', () => this.fetchLiveTickers(true));
        }

        const autoTickerCheck = document.getElementById('autoTickerCheck');
        if (autoTickerCheck) {
            autoTickerCheck.addEventListener('change', (e) => {
                this.state.autoRefreshTicker = e.target.checked;
                if (this.state.autoRefreshTicker) {
                    this.startTickerTimer();
                    this.showToast('실시간 시세 30초 자동 갱신이 활성화되었습니다.', 'info');
                } else {
                    this.stopTickerTimer();
                    this.showToast('실시간 시세 자동 갱신이 중지되었습니다.', 'info');
                }
            });
        }

        const exportExcelBtn = document.getElementById('exportExcelBtn');
        if (exportExcelBtn) {
            exportExcelBtn.addEventListener('click', () => {
                if (this.state.reportData) {
                    Exporter.exportExcelReport(this.state.reportData);
                } else {
                    this.showToast('내보낼 데이터가 없습니다.', 'warning');
                }
            });
        }

        const exportCSVBtn = document.getElementById('exportCSVBtn');
        if (exportCSVBtn) {
            exportCSVBtn.addEventListener('click', () => {
                if (this.state.reportData && this.state.reportData.allActivities) {
                    Exporter.exportCSV(this.state.reportData.allActivities);
                } else {
                    this.showToast('내보낼 데이터가 없습니다.', 'warning');
                }
            });
        }

        const printReportBtn = document.getElementById('printReportBtn');
        if (printReportBtn) {
            printReportBtn.addEventListener('click', () => Exporter.printReport());
        }

        const clearDataBtn = document.getElementById('clearDataBtn');
        if (clearDataBtn) {
            clearDataBtn.addEventListener('click', () => {
                if (confirm('저장된 모든 거래 및 입출금 내역 데이터를 삭제하시겠습니까?')) {
                    this.clearData();
                }
            });
        }

        // 타점 차트 제어 이벤트 (코인 & 분봉/일봉/주봉/월봉 주기 선택)
        const pointsMarketSelect = document.getElementById('pointsMarketSelect');
        if (pointsMarketSelect) {
            pointsMarketSelect.addEventListener('change', (e) => {
                this.state.selectedPointsMarket = e.target.value;
                this.loadAndRenderTradePointsChart();
            });
        }

        const pointsPeriodSelect = document.getElementById('pointsPeriodSelect');
        if (pointsPeriodSelect) {
            pointsPeriodSelect.addEventListener('change', (e) => {
                this.state.selectedCandlePeriod = e.target.value;
                document.querySelectorAll('#candlePeriodGroup .btn-period').forEach(b => {
                    b.classList.toggle('active', b.dataset.period === e.target.value);
                });
                this.loadAndRenderTradePointsChart();
            });
        }

        document.querySelectorAll('#candlePeriodGroup .btn-period').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#candlePeriodGroup .btn-period').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                const period = e.currentTarget.dataset.period;
                this.state.selectedCandlePeriod = period;
                if (pointsPeriodSelect) pointsPeriodSelect.value = period;
                this.loadAndRenderTradePointsChart();
            });
        });

        // 트레이딩뷰 컨트롤 버튼들 바인딩
        const focusPointsBtn = document.getElementById('focusPointsBtn');
        if (focusPointsBtn) {
            focusPointsBtn.addEventListener('click', () => {
                ChartManager.focusOnTrades();
                this.showToast('매매 타점 위치로 차트가 이동되었습니다.', 'info');
            });
        }

        const resetPointsViewBtn = document.getElementById('resetPointsViewBtn');
        if (resetPointsViewBtn) {
            resetPointsViewBtn.addEventListener('click', () => {
                ChartManager.resetCandleView();
                this.showToast('최신 시세 뷰로 초기화되었습니다.', 'info');
            });
        }

        const zoomInPointsBtn = document.getElementById('zoomInPointsBtn');
        if (zoomInPointsBtn) {
            zoomInPointsBtn.addEventListener('click', () => ChartManager.zoomCandleView(-8));
        }

        const zoomOutPointsBtn = document.getElementById('zoomOutPointsBtn');
        if (zoomOutPointsBtn) {
            zoomOutPointsBtn.addEventListener('click', () => ChartManager.zoomCandleView(8));
        }

        const refreshPointsChartBtn = document.getElementById('refreshPointsChartBtn');
        if (refreshPointsChartBtn) {
            refreshPointsChartBtn.addEventListener('click', () => {
                this.loadAndRenderTradePointsChart();
                this.showToast('타점 차트가 새로고침되었습니다.', 'info');
            });
        }

        // 모든 테이블 th 정렬 이벤트 바인딩
        document.querySelectorAll('table th[data-sort]').forEach(th => {
            th.addEventListener('click', (e) => {
                const table = th.closest('table');
                if (!table) return;
                const tableId = table.id;
                const sortKey = th.dataset.sort;

                if (!this.state.sortStates[tableId]) {
                    this.state.sortStates[tableId] = { col: sortKey, asc: false };
                }

                const sState = this.state.sortStates[tableId];
                if (sState.col === sortKey) {
                    sState.asc = !sState.asc;
                } else {
                    sState.col = sortKey;
                    sState.asc = false;
                }

                if (tableId === 'coinsTable') this.renderCoinsTable();
                else if (tableId === 'transfersTable') this.renderTransfersTable();
                else if (tableId === 'stakingTable') this.renderStakingView();
                else if (tableId === 'allActivitiesTable') this.renderAllActivitiesTable();
                else if (tableId === 'monthlyTable') this.renderMonthlyTable();
                else if (tableId === 'tradePointsHistoryTable') {
                    const coinTrades = this.state.reportData ? this.state.reportData.trades.filter(t => t.market === this.state.selectedPointsMarket) : [];
                    this.renderTradePointsHistoryTable(coinTrades);
                }
            });
        });

        // 전체 통합 내역 필터 이벤트
        const activitySearchInput = document.getElementById('activitySearchInput');
        if (activitySearchInput) {
            activitySearchInput.addEventListener('input', (e) => {
                this.state.activityFilter.search = e.target.value.trim().toLowerCase();
                this.state.activityFilter.page = 1;
                this.renderAllActivitiesTable();
            });
        }

        const activityTypeFilter = document.getElementById('activityTypeFilter');
        if (activityTypeFilter) {
            activityTypeFilter.addEventListener('change', (e) => {
                this.state.activityFilter.typeGroup = e.target.value;
                this.state.activityFilter.page = 1;
                this.renderAllActivitiesTable();
            });
        }

        const activityCoinFilter = document.getElementById('activityCoinFilter');
        if (activityCoinFilter) {
            activityCoinFilter.addEventListener('change', (e) => {
                this.state.activityFilter.market = e.target.value;
                this.state.activityFilter.page = 1;
                this.renderAllActivitiesTable();
            });
        }

        const startDateInput = document.getElementById('startDateInput');
        const endDateInput = document.getElementById('endDateInput');
        if (startDateInput && endDateInput) {
            const handleDateChange = () => {
                this.state.activityFilter.startDate = startDateInput.value;
                this.state.activityFilter.endDate = endDateInput.value;
                this.state.activityFilter.page = 1;
                this.renderAllActivitiesTable();
            };
            startDateInput.addEventListener('change', handleDateChange);
            endDateInput.addEventListener('change', handleDateChange);
        }

        // 입출금 전용 필터 이벤트
        const transferSearchInput = document.getElementById('transferSearchInput');
        if (transferSearchInput) {
            transferSearchInput.addEventListener('input', (e) => {
                this.state.transferFilter.search = e.target.value.trim().toLowerCase();
                this.state.transferFilter.page = 1;
                this.renderTransfersTable();
            });
        }

        const transferTypeFilter = document.getElementById('transferTypeFilter');
        if (transferTypeFilter) {
            transferTypeFilter.addEventListener('change', (e) => {
                this.state.transferFilter.type = e.target.value;
                this.state.transferFilter.page = 1;
                this.renderTransfersTable();
            });
        }

        // 스테이킹 모달
        const openStakingModalBtn = document.getElementById('openStakingModalBtn');
        const stakingModal = document.getElementById('stakingModal');
        const closeStakingModalBtn = document.getElementById('closeStakingModalBtn');
        const saveStakingBtn = document.getElementById('saveStakingBtn');

        if (openStakingModalBtn && stakingModal) {
            openStakingModalBtn.addEventListener('click', () => {
                stakingModal.style.display = 'flex';
            });
        }
        if (closeStakingModalBtn && stakingModal) {
            closeStakingModalBtn.addEventListener('click', () => {
                stakingModal.style.display = 'none';
            });
        }
        if (saveStakingBtn) {
            saveStakingBtn.addEventListener('click', () => this.handleSaveCustomStaking());
        }
    },

    switchSubTab: function (tabId) {
        this.state.activeTab = tabId;
        document.querySelectorAll(".analyzer-subtab").forEach(tab => {
            tab.classList.toggle("active", (tab.dataset.subtab || tab.dataset.tab) === tabId);
        });
        document.querySelectorAll(".analyzer-tab-pane").forEach(content => {
            content.classList.toggle("active", content.id === tabId + "Tab");
            content.style.display = (content.id === tabId + "Tab") ? "block" : "none";
        });

        if (tabId === "dashboard" && this.state.reportData) {
            setTimeout(() => ChartManager.renderAllCharts(this.state.reportData), 50);
        } else if (tabId === "tradePoints" && this.state.reportData) {
            setTimeout(() => this.loadAndRenderTradePointsChart(), 50);
        }
    },
    switchTab: function (tabId) { this.switchSubTab(tabId); },
        this.state.activeTab = tabId;
        document.querySelectorAll(".analyzer-subtab").forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabId);
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabId}Tab`);
        });

        if (tabId === 'dashboard' && this.state.reportData) {
            setTimeout(() => ChartManager.renderAllCharts(this.state.reportData), 50);
        } else if (tabId === 'tradePoints' && this.state.reportData) {
            setTimeout(() => this.loadAndRenderTradePointsChart(), 50);
        }
    },

    viewCoinTradePoints: function (market) {
        this.state.selectedPointsMarket = market;
        const select = document.getElementById('pointsMarketSelect');
        if (select) select.value = market;
        this.switchTab('tradePoints');
    },

    handleFiles: async function (fileList) {
        this.showLoading(true, '파일 파싱 및 분석 중...');
        let newItems = [];
        let lastError = null;
        let lastFailedFile = null;

        try {
            for (let i = 0; i < fileList.length; i++) {
                const file = fileList[i];
                try {
                    const items = await this.readFileAsync(file);
                    if (items && items.length > 0) {
                        newItems = UpbitParser.mergeTradeLists(newItems, items);
                    } else {
                        lastFailedFile = file;
                    }
                } catch (err) {
                    console.error(`파일 처리 실패 (${file.name}):`, err);
                    lastError = err;
                    lastFailedFile = file;
                }
            }

            if (newItems.length === 0) {
                const msg = lastError ? lastError.message : '유효한 거래 또는 입출금 내역을 찾지 못했습니다.';
                this.showToast(msg, 'error');
                if (lastFailedFile) {
                    this.showDiagnosticModal(lastFailedFile, msg);
                }
                return;
            }

            this.state.rawTrades = UpbitParser.mergeTradeLists(this.state.rawTrades, newItems);
            this.saveTrades();
            this.recalculate();
            await this.fetchLiveTickers(false);

            this.showToast(`총 ${this.state.rawTrades.length}건의 거래/입출금 내역이 정리되었습니다.`, 'success');
            this.switchTab('dashboard');

        } finally {
            this.showLoading(false);
            const fileInput = document.getElementById('fileInput');
            if (fileInput) fileInput.value = '';
        }
    },

    showDiagnosticModal: function (file, errorMsg) {
        let modal = document.getElementById('diagnosticModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'diagnosticModal';
            modal.className = 'modal-backdrop';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 700px;">
                    <div class="modal-header">
                        <div class="modal-title">🔍 엑셀 파일 로딩 정밀 진단 리포트</div>
                        <button class="modal-close" onclick="document.getElementById('diagnosticModal').style.display='none'">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div style="margin-bottom: 12px;">
                            <strong>파일명:</strong> <span id="diagFileName" class="text-muted"></span> (<span id="diagFileSize"></span>)
                        </div>
                        <div style="margin-bottom: 12px;">
                            <strong>오류 원인:</strong> <span id="diagErrorMsg" style="color: #ef4444; font-weight: bold;"></span>
                        </div>
                        <div class="stat-card" style="padding: 12px; margin-bottom: 12px; background: rgba(0,0,0,0.3);">
                            <div style="font-weight: 700; margin-bottom: 6px; font-size: 0.82rem;">💡 파일 해결 가이드</div>
                            <div style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.6;">
                                1. 업비트 웹(PC) <strong>[투자내역] > [거래내역]</strong> 또는 <strong>[입출금]</strong> 페이지에서 우측 <strong>[엑셀 다운로드]</strong>를 통해 새로 받은 엑셀 파일을 올려주세요.<br>
                                2. 파일이 비밀번호로 잠겨있거나 손상되지 않았는지 확인해주세요.<br>
                                3. 아래 <strong>'샘플 거래 데이터로 바로 체험하기'</strong>를 클릭하시면 즉시 모든 기능을 정상 테스트할 수 있습니다.
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline" onclick="document.getElementById('diagnosticModal').style.display='none'">닫기</button>
                        <button class="btn btn-primary" onclick="document.getElementById('diagnosticModal').style.display='none'; App.loadSampleData();">💡 샘플 데이터로 확인하기</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        document.getElementById('diagFileName').textContent = file.name;
        document.getElementById('diagFileSize').textContent = `${(file.size / 1024).toFixed(1)} KB`;
        document.getElementById('diagErrorMsg').textContent = errorMsg;
        modal.style.display = 'flex';
    },

    readFileAsync: function (file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const arrayBuffer = e.target.result;
                let items = [];
                let lastParseError = null;

                // 1차 시도: SheetJS로 엑셀/바이너리/CSV 통합 파싱 (ArrayBuffer)
                try {
                    items = UpbitParser.parseExcel(arrayBuffer, file.name);
                    if (items && items.length > 0) {
                        return resolve(items);
                    }
                } catch (e1) {
                    lastParseError = e1;
                }

                // 2차 시도: UTF-8 텍스트 CSV 디코딩 파싱
                try {
                    const utf8Text = new TextDecoder('utf-8').decode(arrayBuffer);
                    items = UpbitParser.parseCSV(utf8Text, file.name);
                    if (items && items.length > 0) {
                        return resolve(items);
                    }
                } catch (e2) {}

                // 3차 시도: EUC-KR (한국어 윈도우 엑셀 CSV 기본 인코딩) 파싱
                try {
                    const euckrText = new TextDecoder('euc-kr').decode(arrayBuffer);
                    items = UpbitParser.parseCSV(euckrText, file.name);
                    if (items && items.length > 0) {
                        return resolve(items);
                    }
                } catch (e3) {}

                // 4차 시도: Windows-949 디코딩 파싱
                try {
                    const cp949Text = new TextDecoder('windows-949').decode(arrayBuffer);
                    items = UpbitParser.parseCSV(cp949Text, file.name);
                    if (items && items.length > 0) {
                        return resolve(items);
                    }
                } catch (e4) {}

                if (lastParseError) {
                    reject(lastParseError);
                } else {
                    reject(new Error(`파일(${file.name})에서 유효한 거래 내역을 인식하지 못했습니다.`));
                }
            };

            reader.onerror = (err) => reject(err);
            reader.readAsArrayBuffer(file);
        });
    },

    loadSampleData: async function (type = 'ALL') {
        this.showLoading(true, '샘플 데이터 로딩 중...');
        try {
            let sampleRows = [];
            if (type === 'UPBIT') {
                sampleRows = SampleData.getUpbitSampleRows();
            } else if (type === 'BITHUMB') {
                sampleRows = SampleData.getBithumbSampleRows();
            } else {
                sampleRows = SampleData.getSampleRows();
            }

            const items = UpbitParser.parse2DArray([
                Object.keys(sampleRows[0]),
                ...sampleRows.map(r => Object.values(r))
            ], type === 'BITHUMB' ? 'bithumb_sample.xlsx' : 'upbit_sample.xlsx');

            this.state.rawTrades = items;
            this.saveTrades();
            this.recalculate();
            await this.fetchLiveTickers(false);

            this.showToast(`${type === 'ALL' ? '업비트+빗썸 통합' : (type === 'UPBIT' ? '업비트' : '빗썸')} 샘플 데이터가 로드되었습니다.`, 'success');
            this.switchTab('dashboard');
        } catch (err) {
            console.error('샘플 데이터 로드 실패:', err);
            this.showToast('샘플 데이터 로드 중 오류가 발생했습니다.', 'error');
        } finally {
            this.showLoading(false);
        }
    },

    recalculate: function () {
        if (!this.state.rawTrades || this.state.rawTrades.length === 0) {
            this.state.reportData = ProfitCalculator.getEmptyResult(this.state.method);
            this.renderAll();
            return;
        }

        this.state.reportData = ProfitCalculator.calculate(this.state.rawTrades, {
            method: this.state.method,
            exchange: this.state.exchangeFilter,
            customStaking: this.state.customStaking
        });

        this.updateCoinFilterOptions();
        this.updatePointsMarketSelectOptions();
        this.renderAll();
    },

    fetchLiveTickers: async function (showToast = false) {
        if (!this.state.reportData) return;

        const refreshBtn = document.getElementById('refreshTickerBtn');
        if (refreshBtn) refreshBtn.classList.add('spinning');

        try {
            const tradeMarkets = this.state.reportData.coinSummaries.map(c => c.market);
            const stakingMarkets = (this.state.reportData.staking.records || []).map(s => s.market);
            const allMarkets = [...tradeMarkets, ...stakingMarkets].filter((v, i, a) => a.indexOf(v) === i);

            const tickers = await UpbitAPI.fetchTickers(allMarkets);
            
            const enriched = UpbitAPI.enrichCoinSummariesWithTickers(this.state.reportData.coinSummaries, tickers);
            this.state.reportData.totalCurrentValue = enriched.totalCurrentValue;
            this.state.reportData.totalUnrealizedProfit = enriched.totalUnrealizedProfit;

            if (this.state.reportData.staking && this.state.reportData.staking.records) {
                const stakingEnriched = UpbitAPI.enrichStakingWithTickers(this.state.reportData.staking.records, tickers);
                this.state.reportData.staking.totalStakingValue = stakingEnriched.totalStakingValue;
                this.state.reportData.staking.totalAnnualEstimatedReward = stakingEnriched.totalAnnualEstimatedReward;
            }

            this.renderSummaryCards();
            this.renderCoinsTable();
            this.renderStakingView();
            ChartManager.renderPortfolioDoughnutChart(this.state.reportData.coinSummaries);
            ChartManager.renderCoinStackingChart(this.state.reportData.coinSummaries);

            const lastUpdatedElem = document.getElementById('lastTickerUpdateTime');
            if (lastUpdatedElem) {
                const now = new Date();
                lastUpdatedElem.textContent = `최근 시세 갱신: ${now.toLocaleTimeString()}`;
            }

            if (showToast) {
                this.showToast('실시간 시세가 갱신되었습니다.', 'success');
            }
        } catch (err) {
            console.error('시세 갱신 오류:', err);
            if (showToast) {
                this.showToast('실시간 시세 조회 중 오류가 발생했습니다.', 'error');
            }
        } finally {
            if (refreshBtn) refreshBtn.classList.remove('spinning');
        }
    },

    startTickerTimer: function () {
        this.stopTickerTimer();
        this.fetchLiveTickers(false);
        this.state.tickerTimer = setInterval(() => {
            this.fetchLiveTickers(false);
        }, 30000);
    },

    stopTickerTimer: function () {
        if (this.state.tickerTimer) {
            clearInterval(this.state.tickerTimer);
            this.state.tickerTimer = null;
        }
    },

    renderAll: function () {
        this.renderSummaryCards();
        this.renderCoinsTable();
        this.renderAllActivitiesTable();
        this.renderMonthlyTable();
        this.renderTransfersView();
        this.renderStakingView();
        
        if (this.state.reportData) {
            ChartManager.renderAllCharts(this.state.reportData);
        }

        const hasData = this.state.rawTrades.length > 0;
        document.querySelectorAll('.requires-data').forEach(el => {
            el.style.display = hasData ? '' : 'none';
        });
        document.querySelectorAll('.requires-empty').forEach(el => {
            el.style.display = hasData ? 'none' : '';
        });
    },

    renderSummaryCards: function () {
        const s = this.state.reportData ? this.state.reportData.summary : ProfitCalculator.getEmptyResult().summary;
        const totalCurrentVal = this.state.reportData ? (this.state.reportData.totalCurrentValue || 0) : 0;
        const totalUnrealized = this.state.reportData ? (this.state.reportData.totalUnrealizedProfit || 0) : 0;
        const unrealizedRoi = s.currentPortfolioCost > 0 ? (totalUnrealized / s.currentPortfolioCost) * 100 : 0;

        // 1. 누적 실현손익
        const realizedEl = document.getElementById('cardRealizedProfit');
        const realizedRoiEl = document.getElementById('cardRealizedRoi');
        if (realizedEl) {
            realizedEl.textContent = this.formatCurrency(s.totalRealizedProfit);
            realizedEl.className = `stat-value ${this.getProfitColorClass(s.totalRealizedProfit)}`;
        }
        if (realizedRoiEl) {
            realizedRoiEl.textContent = `${s.totalRealizedRoi > 0 ? '+' : ''}${s.totalRealizedRoi.toFixed(2)}%`;
            realizedRoiEl.className = `stat-badge ${this.getProfitColorClass(s.totalRealizedProfit)}`;
        }

        // 2. 실시간 평가손익
        const unrealizedEl = document.getElementById('cardUnrealizedProfit');
        const unrealizedRoiEl = document.getElementById('cardUnrealizedRoi');
        if (unrealizedEl) {
            unrealizedEl.textContent = this.formatCurrency(totalUnrealized);
            unrealizedEl.className = `stat-value ${this.getProfitColorClass(totalUnrealized)}`;
        }
        if (unrealizedRoiEl) {
            unrealizedRoiEl.textContent = `${unrealizedRoi > 0 ? '+' : ''}${unrealizedRoi.toFixed(2)}%`;
            unrealizedRoiEl.className = `stat-badge ${this.getProfitColorClass(totalUnrealized)}`;
        }

        // 3. 보유원금 / 순투입원금 / 누적매수대금
        const investedEl = document.getElementById('cardCurrentHoldingCost');
        const cumBuyEl = document.getElementById('cardCumulativeBuy');
        const netDepositEl = document.getElementById('cardNetDeposit');
        if (investedEl) investedEl.textContent = this.formatCurrency(s.currentPortfolioCost);
        if (cumBuyEl) cumBuyEl.textContent = this.formatCurrency(s.totalCumulativeBuyAmount);
        if (netDepositEl) netDepositEl.textContent = this.formatCurrency(s.netKrwDeposits);

        // 4. 총 수수료 및 승률
        const feesEl = document.getElementById('cardTotalFees');
        const winRateEl = document.getElementById('cardWinRate');
        if (feesEl) feesEl.textContent = this.formatCurrency(s.totalFees);
        if (winRateEl) winRateEl.textContent = `${s.totalWinRate.toFixed(1)}% (${s.totalWinTrades}승 ${s.totalLossTrades}패 / 총 ${s.totalTradesCount}건)`;
    },

    renderCoinsTable: function () {
        const tbody = document.querySelector('#coinsTable tbody');
        if (!tbody) return;

        let coins = this.state.reportData ? [...this.state.reportData.coinSummaries] : [];
        if (coins.length === 0) {
            tbody.innerHTML = `<tr><td colspan="11" class="text-center py-6 text-muted">등록된 코인 거래 내역이 없습니다.</td></tr>`;
            return;
        }

        const sort = this.state.sortStates.coinsTable;
        coins.sort((a, b) => {
            let valA = a[sort.col] || 0;
            let valB = b[sort.col] || 0;
            if (typeof valA === 'string') return sort.asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
            return sort.asc ? valA - valB : valB - valA;
        });

        let html = '';
        coins.forEach(coin => {
            const coinName = coin.koreanName || UpbitAPI.getKoreanName(coin.market);
            const profitClass = this.getProfitColorClass(coin.realizedProfit);
            const unprofitClass = this.getProfitColorClass(coin.unrealizedProfit || 0);
            const stackingClass = this.getProfitColorClass(coin.gainedCoinQty || 0);
            const isBithumb = coin.exchange === 'BITHUMB';

            const gainedQtyStr = coin.gainedCoinQty !== undefined 
                ? `${coin.gainedCoinQty > 0 ? '+' : ''}${coin.gainedCoinQty.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${coin.coinSymbol}`
                : '-';
            const gainedRoiStr = coin.gainedCoinRoi !== undefined 
                ? `${coin.gainedCoinRoi > 0 ? '+' : ''}${coin.gainedCoinRoi.toFixed(2)}%`
                : '';

            html += `
                <tr>
                    <td>
                        <div class="coin-info-cell">
                            <span class="coin-symbol-badge">${coin.coinSymbol}</span>
                            <div>
                                <div class="coin-korean-name">
                                    ${coinName} 
                                    <span class="badge ${isBithumb ? 'badge-bithumb' : 'badge-upbit'}">${coin.exchange || 'UPBIT'}</span>
                                </div>
                                <div class="coin-market-code">${coin.market}</div>
                            </div>
                        </div>
                    </td>
                    <td class="text-right ${profitClass}">
                        <div class="font-bold">${this.formatCurrency(coin.realizedProfit)}</div>
                        <div class="text-xs">${(coin.realizedRoi > 0 ? '+' : '')}${coin.realizedRoi.toFixed(2)}%</div>
                    </td>
                    <td class="text-right ${stackingClass}">
                        <div class="font-bold">${gainedQtyStr}</div>
                        <div class="text-xs">${gainedRoiStr}</div>
                    </td>
                    <td class="text-right">
                        <div class="font-medium">${coin.holdingQty > 0 ? coin.holdingQty.toLocaleString(undefined, { maximumFractionDigits: 6 }) : '-'}</div>
                        <div class="text-xs text-muted">${coin.holdingCost > 0 ? this.formatCurrency(coin.holdingCost) : ''}</div>
                    </td>
                    <td class="text-right">
                        <div>${coin.avgBuyPrice > 0 ? this.formatCurrency(coin.avgBuyPrice) : '-'}</div>
                    </td>
                    <td class="text-right">
                        <div>${coin.currentPrice > 0 ? this.formatCurrency(coin.currentPrice) : '-'}</div>
                        ${coin.change24h ? `<div class="text-xs ${this.getProfitColorClass(coin.change24h)}">${coin.change24h > 0 ? '+' : ''}${coin.change24h.toFixed(2)}%</div>` : ''}
                    </td>
                    <td class="text-right ${unprofitClass}">
                        ${coin.holdingQty > 0 ? `
                            <div class="font-bold">${this.formatCurrency(coin.unrealizedProfit || 0)}</div>
                            <div class="text-xs">${(coin.unrealizedRoi > 0 ? '+' : '')}${(coin.unrealizedRoi || 0).toFixed(2)}%</div>
                        ` : '<span class="text-muted">-</span>'}
                    </td>
                    <td class="text-right">${this.formatCurrency(coin.totalBuyAmount)}</td>
                    <td class="text-right">${this.formatCurrency(coin.totalSellAmount)}</td>
                    <td class="text-right text-muted">${this.formatCurrency(coin.totalFee)}</td>
                    <td class="text-center">
                        <div class="flex-center-gap" style="justify-content: center;">
                            <span class="text-xs font-bold">${coin.winRate.toFixed(0)}%</span>
                            <button class="btn btn-sm btn-outline" style="padding: 2px 8px; font-size: 0.72rem; color: var(--brand-primary); border-color: var(--brand-primary);" onclick="App.viewCoinTradePoints('${coin.market}')">
                                🎯 타점
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
        ColumnManager.applyVisibility('coinsTable');
    },

    /**
     * ★ 트레이딩뷰 스타일 다이나믹 캔들스틱 매수/매도 타점 차트 로드 및 렌더링
     */
    loadAndRenderTradePointsChart: async function () {
        const rawMarket = this.state.selectedPointsMarket;
        if (!rawMarket || !this.state.reportData) return;

        const { symbol, market } = UpbitAPI.getStandardMarketInfo(rawMarket);
        const period = this.state.selectedCandlePeriod || 'days';
        const coinTrades = this.state.reportData.trades.filter(t => t.market === rawMarket || t.market === market || t.coinSymbol === symbol);
        const coinSummary = this.state.reportData.coinSummaries.find(c => c.market === rawMarket || c.market === market || c.coinSymbol === symbol);
        const coinName = coinSummary ? (coinSummary.koreanName || coinSummary.coinSymbol) : UpbitAPI.getKoreanName(market);

        // 상단 타이틀 갱신
        const titleEl = document.getElementById('pointsChartTitle');
        if (titleEl) {
            titleEl.textContent = `🎯 ${coinName} (${symbol} / ${market}) 트레이딩뷰 스타일 다이나믹 캔들 차트`;
        }

        // 상단 요약 카드 갱신
        if (coinSummary) {
            const buyCntEl = document.getElementById('pointsBuyCount');
            const avgBuyEl = document.getElementById('pointsAvgBuyPrice');
            const totalBuyAmtEl = document.getElementById('pointsTotalBuyAmt');
            const sellCntEl = document.getElementById('pointsSellCount');
            const avgSellEl = document.getElementById('pointsAvgSellPrice');
            const totalSellAmtEl = document.getElementById('pointsTotalSellAmt');
            const profitEl = document.getElementById('pointsRealizedProfit');
            const roiEl = document.getElementById('pointsRealizedRoi');
            const winRateEl = document.getElementById('pointsWinRate');
            const holdQtyEl = document.getElementById('pointsHoldingQty');
            const holdValEl = document.getElementById('pointsHoldingValue');
            const unrlEl = document.getElementById('pointsUnrealized');

            if (buyCntEl) buyCntEl.textContent = `${coinSummary.totalBuyCount}회`;
            if (avgBuyEl) avgBuyEl.textContent = this.formatCurrency(coinSummary.avgBuyPrice);
            if (totalBuyAmtEl) totalBuyAmtEl.textContent = this.formatCurrency(coinSummary.totalBuyAmount);
            if (sellCntEl) sellCntEl.textContent = `${coinSummary.totalSellCount}회`;
            if (avgSellEl) avgSellEl.textContent = this.formatCurrency(coinSummary.avgSellPrice);
            if (totalSellAmtEl) totalSellAmtEl.textContent = this.formatCurrency(coinSummary.totalSellAmount);
            
            if (profitEl) {
                profitEl.textContent = this.formatCurrency(coinSummary.realizedProfit);
                profitEl.className = `stat-value ${this.getProfitColorClass(coinSummary.realizedProfit)}`;
            }
            if (roiEl) {
                roiEl.textContent = `${coinSummary.realizedRoi > 0 ? '+' : ''}${coinSummary.realizedRoi.toFixed(2)}%`;
                roiEl.className = `stat-badge ${this.getProfitColorClass(coinSummary.realizedProfit)}`;
            }
            if (winRateEl) winRateEl.textContent = `${coinSummary.winRate.toFixed(1)}% (${coinSummary.winTrades}승 ${coinSummary.lossTrades}패)`;

            if (holdQtyEl) holdQtyEl.textContent = coinSummary.holdingQty > 0 ? `${coinSummary.holdingQty.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${coinSummary.coinSymbol}` : '잔고 없음';
            if (holdValEl) holdValEl.textContent = this.formatCurrency(coinSummary.currentValue || coinSummary.holdingCost);
            if (unrlEl) {
                const unProfit = coinSummary.unrealizedProfit || 0;
                unrlEl.textContent = this.formatCurrency(unProfit);
                unrlEl.className = this.getProfitColorClass(unProfit);
            }
        }

        // 초기 200개 캔들 API 호출
        let candles = await UpbitAPI.fetchCandles(market, period, 200);

        // Fallback 캔들 생성 (오프라인/에러 대비)
        if (!candles || candles.length === 0) {
            candles = coinTrades.map(t => ({
                time: t.time,
                date: t.date,
                close: t.price,
                price: t.price,
                open: t.price * (t.type === '매수' ? 0.99 : 1.01),
                high: t.price * 1.02,
                low: t.price * 0.98,
                volume: t.quantity,
                timestamp: new Date(t.time).getTime()
            }));
        }

        // 트레이딩뷰 스타일 다이나믹 엔진 초기화 및 렌더링
        ChartManager.initCandleChartEngine(market, period, candles, coinTrades);

        // 하단 타점 히스토리 테이블 렌더링
        this.renderTradePointsHistoryTable(coinTrades);
    },

    renderTradePointsHistoryTable: function (trades) {
        const tbody = document.querySelector('#tradePointsHistoryTable tbody');
        if (!tbody) return;

        if (!trades || trades.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center py-6 text-muted">체결 타점 내역이 없습니다.</td></tr>`;
            return;
        }

        let sorted = [...trades];
        const sort = this.state.sortStates.tradePointsHistoryTable;
        sorted.sort((a, b) => {
            let valA = a[sort.col] || 0;
            let valB = b[sort.col] || 0;
            if (typeof valA === 'string') return sort.asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
            return sort.asc ? valA - valB : valB - valA;
        });

        let html = '';
        sorted.forEach(t => {
            const isBuy = t.type === '매수';
            const isBithumb = t.exchange === 'BITHUMB';
            const profitClass = this.getProfitColorClass(t.realizedProfit || 0);

            html += `
                <tr>
                    <td>
                        <span class="badge ${isBithumb ? 'badge-bithumb' : 'badge-upbit'}">${t.exchange || 'UPBIT'}</span>
                    </td>
                    <td class="text-xs text-muted">${t.time}</td>
                    <td>
                        <span class="badge ${isBuy ? 'badge-buy' : 'badge-sell'}">${t.type}</span>
                    </td>
                    <td class="text-right font-bold">${this.formatCurrency(t.price)}</td>
                    <td class="text-right font-medium">${t.quantity.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${t.coinSymbol}</td>
                    <td class="text-right font-medium">${this.formatCurrency(t.amount)}</td>
                    <td class="text-right text-muted">${this.formatCurrency(t.fee)}</td>
                    <td class="text-right ${t.type === '매도' ? profitClass : 'text-muted'}">
                        ${t.type === '매도' && t.realizedProfit !== undefined ? `
                            <span class="font-bold">${(t.realizedProfit > 0 ? '+' : '')}${this.formatCurrency(t.realizedProfit)}</span>
                            <span class="text-xs">(${(t.realizedRoi > 0 ? '+' : '')}${t.realizedRoi.toFixed(2)}%)</span>
                        ` : '-'}
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
        ColumnManager.applyVisibility('tradePointsHistoryTable');
    },

    updatePointsMarketSelectOptions: function () {
        const select = document.getElementById('pointsMarketSelect');
        if (!select) return;

        const coins = this.state.reportData ? this.state.reportData.coinSummaries : [];
        if (coins.length === 0) {
            select.innerHTML = '<option value="">등록된 코인 없음</option>';
            return;
        }

        let html = '';
        coins.forEach(c => {
            const name = c.koreanName || c.coinSymbol;
            html += `<option value="${c.market}">${name} (${c.coinSymbol} / ${c.exchange || 'UPBIT'})</option>`;
        });

        select.innerHTML = html;

        if (!this.state.selectedPointsMarket || !coins.some(c => c.market === this.state.selectedPointsMarket)) {
            this.state.selectedPointsMarket = coins[0].market;
        }
        select.value = this.state.selectedPointsMarket;
    },

    renderTransfersView: function () {
        const transfers = this.state.reportData ? this.state.reportData.transfers : null;
        if (!transfers) return;

        const krwDepEl = document.getElementById('transferTotalKrwDeposit');
        const krwWithEl = document.getElementById('transferTotalKrwWithdraw');
        const netDepEl = document.getElementById('transferNetKrwDeposit');

        if (krwDepEl) krwDepEl.textContent = this.formatCurrency(transfers.totalKrwDeposit);
        if (krwWithEl) krwWithEl.textContent = this.formatCurrency(transfers.totalKrwWithdraw);
        if (netDepEl) {
            netDepEl.textContent = this.formatCurrency(transfers.netKrwDeposit);
            netDepEl.className = `stat-value ${transfers.netKrwDeposit >= 0 ? 'color-profit-global' : 'color-loss-global'}`;
        }

        const coinContainer = document.getElementById('coinTransferSummaryContainer');
        if (coinContainer) {
            if (transfers.coinTransfers.length === 0) {
                coinContainer.innerHTML = '<span class="text-xs text-muted">코인 입출금 내역이 없습니다.</span>';
            } else {
                let cHtml = '';
                transfers.coinTransfers.forEach(ct => {
                    const isBithumb = ct.exchange === 'BITHUMB';
                    cHtml += `
                        <div class="stat-card" style="padding: 12px 16px;">
                            <div class="flex-center-gap" style="justify-content: space-between;">
                                <div class="flex-center-gap">
                                    <span class="coin-symbol-badge-sm">${ct.coinSymbol}</span>
                                    <span class="badge ${isBithumb ? 'badge-bithumb' : 'badge-upbit'}">${ct.exchange || 'UPBIT'}</span>
                                </div>
                                <span class="text-xs text-muted">입금 ${ct.depositCount} / 출금 ${ct.withdrawCount}</span>
                            </div>
                            <div class="text-sm font-bold" style="margin-top: 6px;">
                                순 입금: ${ct.netQty > 0 ? '+' : ''}${ct.netQty.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${ct.coinSymbol}
                            </div>
                        </div>
                    `;
                });
                coinContainer.innerHTML = cHtml;
            }
        }

        this.renderTransfersTable();
    },

    renderTransfersTable: function () {
        const tbody = document.querySelector('#transfersTable tbody');
        if (!tbody) return;

        let items = (this.state.reportData && this.state.reportData.transfers) ? [...this.state.reportData.transfers.items] : [];
        const f = this.state.transferFilter;

        if (f.search) {
            items = items.filter(it => 
                it.coinSymbol.toLowerCase().includes(f.search) || 
                it.market.toLowerCase().includes(f.search) ||
                (UpbitAPI.getKoreanName(it.market) || '').toLowerCase().includes(f.search)
            );
        }
        if (f.type !== 'ALL') {
            items = items.filter(it => it.type === f.type);
        }

        const sort = this.state.sortStates.transfersTable;
        items.sort((a, b) => {
            let valA = a[sort.col] || 0;
            let valB = b[sort.col] || 0;
            if (typeof valA === 'string') return sort.asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
            return sort.asc ? valA - valB : valB - valA;
        });

        const totalItems = items.length;
        const totalPages = Math.ceil(totalItems / f.pageSize) || 1;
        f.page = Math.max(1, Math.min(f.page, totalPages));

        const startIndex = (f.page - 1) * f.pageSize;
        const pageItems = items.slice(startIndex, startIndex + f.pageSize);

        if (pageItems.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center py-6 text-muted">입출금 내역이 없습니다.</td></tr>`;
            this.renderTransfersPagination(0, 1, 1);
            return;
        }

        let html = '';
        pageItems.forEach(t => {
            const isBithumb = t.exchange === 'BITHUMB';
            const name = UpbitAPI.getKoreanName(t.market);
            const badgeClass = this.getActivityBadgeClass(t.type);
            const isKrw = t.type.includes('원화') || t.coinSymbol === 'KRW';

            const qtyStr = isKrw 
                ? this.formatCurrency(t.amount || t.quantity) 
                : `${t.quantity.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${t.coinSymbol}`;
            const feeStr = t.fee > 0 
                ? (isKrw ? this.formatCurrency(t.fee) : `${t.fee} ${t.coinSymbol}`) 
                : (isKrw ? '0원' : `0 ${t.coinSymbol}`);
            const settlementStr = isKrw 
                ? this.formatCurrency(t.settlement || t.amount) 
                : `${(t.settlement || t.quantity).toLocaleString(undefined, { maximumFractionDigits: 8 })} ${t.coinSymbol}`;

            html += `
                <tr>
                    <td>
                        <span class="badge ${isBithumb ? 'badge-bithumb' : 'badge-upbit'}">${t.exchange || 'UPBIT'}</span>
                    </td>
                    <td class="text-xs text-muted">${t.time || '-'}</td>
                    <td>
                        <span class="badge ${badgeClass}">${t.type}</span>
                    </td>
                    <td>
                        <div class="flex-center-gap">
                            <span class="coin-symbol-badge-sm">${t.coinSymbol}</span>
                            <span class="font-bold">${name}</span>
                        </div>
                    </td>
                    <td class="text-right font-bold">${qtyStr}</td>
                    <td class="text-right">${t.price > 1 ? this.formatCurrency(t.price) : (isKrw ? '1원' : '-')}</td>
                    <td class="text-right text-muted">${feeStr}</td>
                    <td class="text-right font-medium">${settlementStr}</td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
        ColumnManager.applyVisibility('transfersTable');
        this.renderTransfersPagination(totalItems, f.page, totalPages);
    },

    renderTransfersPagination: function (totalItems, currentPage, totalPages) {
        const paginContainer = document.getElementById('transfersPagination');
        if (!paginContainer) return;

        if (totalItems === 0) {
            paginContainer.innerHTML = '';
            return;
        }

        let html = `
            <div class="pagination-info text-xs text-muted">
                총 <strong>${totalItems}</strong>건 중 ${(currentPage - 1) * this.state.transferFilter.pageSize + 1} - ${Math.min(currentPage * this.state.transferFilter.pageSize, totalItems)}건
            </div>
            <div class="pagination-controls">
                <button class="btn btn-sm" ${currentPage === 1 ? 'disabled' : ''} onclick="App.goToTransferPage(1)">«</button>
                <button class="btn btn-sm" ${currentPage === 1 ? 'disabled' : ''} onclick="App.goToTransferPage(${currentPage - 1})">‹ 이전</button>
                <span class="page-current text-sm px-2 font-bold">${currentPage} / ${totalPages}</span>
                <button class="btn btn-sm" ${currentPage === totalPages ? 'disabled' : ''} onclick="App.goToTransferPage(${currentPage + 1})">다음 ›</button>
                <button class="btn btn-sm" ${currentPage === totalPages ? 'disabled' : ''} onclick="App.goToTransferPage(${totalPages})">»</button>
            </div>
        `;

        paginContainer.innerHTML = html;
    },

    goToTransferPage: function (page) {
        this.state.transferFilter.page = page;
        this.renderTransfersTable();
    },

    renderStakingView: function () {
        const staking = this.state.reportData ? this.state.reportData.staking : null;
        if (!staking) return;

        const totalValEl = document.getElementById('stakingTotalValue');
        const totalAnnualEl = document.getElementById('stakingAnnualReward');
        const countEl = document.getElementById('stakingCoinsCount');

        if (totalValEl) totalValEl.textContent = this.formatCurrency(staking.totalStakingValue || 0);
        if (totalAnnualEl) totalAnnualEl.textContent = this.formatCurrency(staking.totalAnnualEstimatedReward || 0);
        if (countEl) countEl.textContent = `${staking.records.length} 종목`;

        const tbody = document.querySelector('#stakingTable tbody');
        if (!tbody) return;

        if (staking.records.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center py-6 text-muted">스테이킹 중인 코인이 없습니다. 우측 상단의 '➕ 스테이킹 추가' 버튼을 눌러 등록해보세요.</td></tr>`;
            return;
        }

        let records = [...staking.records];
        const sort = this.state.sortStates.stakingTable;
        records.sort((a, b) => {
            let valA = a[sort.col] || 0;
            let valB = b[sort.col] || 0;
            if (typeof valA === 'string') return sort.asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
            return sort.asc ? valA - valB : valB - valA;
        });

        let html = '';
        records.forEach((st, idx) => {
            const name = st.koreanName || UpbitAPI.getKoreanName(st.market);
            const isBithumb = st.exchange === 'BITHUMB';

            html += `
                <tr>
                    <td>
                        <div class="coin-info-cell">
                            <span class="coin-symbol-badge">${st.coinSymbol}</span>
                            <div>
                                <div class="font-bold">
                                    ${name}
                                    <span class="badge ${isBithumb ? 'badge-bithumb' : 'badge-upbit'}">${st.exchange || 'UPBIT'}</span>
                                </div>
                                <div class="text-xs text-muted">${st.isCustom ? '사용자 직접등록' : '자동감지'}</div>
                            </div>
                        </div>
                    </td>
                    <td class="text-right font-bold">
                        ${st.currentStakedQty.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${st.coinSymbol}
                    </td>
                    <td class="text-right">
                        ${st.currentPrice ? this.formatCurrency(st.currentPrice) : '-'}
                    </td>
                    <td class="text-right font-bold color-profit-kr">
                        ${st.currentValue ? this.formatCurrency(st.currentValue) : '-'}
                    </td>
                    <td class="text-center font-bold text-sm">
                        ${st.apy ? `<span class="badge badge-buy">${st.apy}% APY</span>` : '-'}
                    </td>
                    <td class="text-right">
                        <div>${st.totalRewardQty > 0 ? st.totalRewardQty.toLocaleString(undefined, { maximumFractionDigits: 6 }) + ' ' + st.coinSymbol : '-'}</div>
                        <div class="text-xs text-muted">${st.totalRewardKrw > 0 ? this.formatCurrency(st.totalRewardKrw) : ''}</div>
                    </td>
                    <td class="text-right font-medium">
                        ${st.annualReward ? this.formatCurrency(st.annualReward) : '-'}
                    </td>
                    <td class="text-center">
                        ${st.isCustom ? `
                            <button class="btn btn-sm btn-outline" onclick="App.deleteCustomStaking(${idx})">삭제</button>
                        ` : '<span class="text-xs text-muted">자동</span>'}
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
        ColumnManager.applyVisibility('stakingTable');
    },

    handleSaveCustomStaking: function () {
        const symbolInput = document.getElementById('stakingSymbolInput');
        const qtyInput = document.getElementById('stakingQtyInput');
        const apyInput = document.getElementById('stakingApyInput');
        const exSelect = document.getElementById('stakingExchangeSelect');

        if (!symbolInput || !qtyInput) return;

        const symbol = symbolInput.value.trim().toUpperCase();
        const qty = parseFloat(qtyInput.value);
        const apy = parseFloat(apyInput.value || '0');
        const exchange = exSelect ? exSelect.value : 'UPBIT';

        if (!symbol || isNaN(qty) || qty <= 0) {
            alert('코인 심볼과 스테이킹 수량을 올바르게 입력해주세요.');
            return;
        }

        this.state.customStaking.push({
            coinSymbol: symbol,
            market: `KRW-${symbol}`,
            exchange: exchange,
            quantity: qty,
            apy: apy,
            startDate: new Date().toISOString().slice(0, 10)
        });

        localStorage.setItem('upbit_custom_staking', JSON.stringify(this.state.customStaking));
        
        const modal = document.getElementById('stakingModal');
        if (modal) modal.style.display = 'none';

        symbolInput.value = '';
        qtyInput.value = '';
        if (apyInput) apyInput.value = '';

        this.recalculate();
        this.fetchLiveTickers(false);
        this.showToast(`${symbol} (${exchange}) 스테이킹이 추가되었습니다.`, 'success');
    },

    deleteCustomStaking: function (index) {
        if (confirm('이 스테이킹 항목을 삭제하시겠습니까?')) {
            this.state.customStaking.splice(index, 1);
            localStorage.setItem('upbit_custom_staking', JSON.stringify(this.state.customStaking));
            this.recalculate();
            this.fetchLiveTickers(false);
            this.showToast('스테이킹 항목이 삭제되었습니다.', 'info');
        }
    },

    renderAllActivitiesTable: function () {
        const tbody = document.querySelector('#allActivitiesTable tbody');
        if (!tbody) return;

        let items = this.state.reportData ? [...this.state.reportData.allActivities] : [];
        const f = this.state.activityFilter;

        if (f.search) {
            items = items.filter(it => 
                it.coinSymbol.toLowerCase().includes(f.search) || 
                it.market.toLowerCase().includes(f.search) ||
                (UpbitAPI.getKoreanName(it.market) || '').toLowerCase().includes(f.search)
            );
        }

        if (f.market !== 'ALL') {
            items = items.filter(it => it.market === f.market || it.coinSymbol === f.market.replace('KRW-', ''));
        }

        if (f.typeGroup !== 'ALL') {
            if (f.typeGroup === 'TRADE_ALL') {
                items = items.filter(it => it.type === '매수' || it.type === '매도');
            } else if (f.typeGroup === 'TRANSFER_ALL') {
                items = items.filter(it => it.category === 'transfer' || it.type.includes('입금') || it.type.includes('출금'));
            } else if (f.typeGroup === 'STAKING_ALL') {
                items = items.filter(it => it.category === 'staking' || it.type.includes('스테이킹'));
            } else {
                items = items.filter(it => it.type === f.typeGroup);
            }
        }

        if (f.startDate) {
            items = items.filter(it => it.date >= f.startDate);
        }
        if (f.endDate) {
            items = items.filter(it => it.date <= f.endDate);
        }

        const sort = this.state.sortStates.allActivitiesTable;
        items.sort((a, b) => {
            let valA = a[sort.col] || 0;
            let valB = b[sort.col] || 0;
            if (typeof valA === 'string') return sort.asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
            return sort.asc ? valA - valB : valB - valA;
        });

        const totalItems = items.length;
        const totalPages = Math.ceil(totalItems / f.pageSize) || 1;
        f.page = Math.max(1, Math.min(f.page, totalPages));

        const startIndex = (f.page - 1) * f.pageSize;
        const pageItems = items.slice(startIndex, startIndex + f.pageSize);

        if (pageItems.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" class="text-center py-6 text-muted">조건에 일치하는 내역이 없습니다.</td></tr>`;
            this.renderActivitiesPagination(0, 1, 1);
            return;
        }

        let html = '';
        pageItems.forEach(it => {
            const isBithumb = it.exchange === 'BITHUMB';
            const badgeClass = this.getActivityBadgeClass(it.type);
            const profitClass = this.getProfitColorClass(it.realizedProfit || 0);
            const name = UpbitAPI.getKoreanName(it.market);
            const isKrw = it.type.includes('원화') || it.coinSymbol === 'KRW';

            const qtyStr = isKrw 
                ? this.formatCurrency(it.amount || it.quantity) 
                : `${it.quantity ? it.quantity.toLocaleString(undefined, { maximumFractionDigits: 8 }) : '-'} ${it.coinSymbol !== 'KRW' ? it.coinSymbol : ''}`;
            const feeStr = it.fee > 0 
                ? (isKrw ? this.formatCurrency(it.fee) : `${it.fee} ${it.coinSymbol}`) 
                : (isKrw ? '0원' : `0 ${it.coinSymbol !== 'KRW' ? it.coinSymbol : '원'}`);
            const settlementStr = isKrw 
                ? this.formatCurrency(it.settlement || it.amount) 
                : (it.category === 'transfer' ? `${(it.settlement || it.quantity).toLocaleString(undefined, { maximumFractionDigits: 8 })} ${it.coinSymbol}` : this.formatCurrency(it.settlement));

            html += `
                <tr>
                    <td>
                        <span class="badge ${isBithumb ? 'badge-bithumb' : 'badge-upbit'}">${it.exchange || 'UPBIT'}</span>
                    </td>
                    <td class="text-xs text-muted">${it.time || '-'}</td>
                    <td>
                        <div class="flex-center-gap">
                            <span class="coin-symbol-badge-sm">${it.coinSymbol}</span>
                            <span class="font-bold">${name}</span>
                        </div>
                    </td>
                    <td>
                        <span class="badge ${badgeClass}">${it.type}</span>
                    </td>
                    <td class="text-right font-medium">${qtyStr}</td>
                    <td class="text-right">
                        ${it.price > 1 ? this.formatCurrency(it.price) : (isKrw ? '1원' : '-')}
                    </td>
                    <td class="text-right font-medium">
                        ${it.amount ? this.formatCurrency(it.amount) : qtyStr}
                    </td>
                    <td class="text-right text-muted">${feeStr}</td>
                    <td class="text-right font-medium">${settlementStr}</td>
                    <td class="text-right ${it.type === '매도' ? profitClass : 'text-muted'}">
                        ${it.type === '매도' && it.realizedProfit !== undefined ? `
                            <div class="font-bold">${(it.realizedProfit > 0 ? '+' : '')}${this.formatCurrency(it.realizedProfit)}</div>
                            <div class="text-xs">${(it.realizedRoi > 0 ? '+' : '')}${it.realizedRoi.toFixed(2)}%</div>
                        ` : '-'}
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
        ColumnManager.applyVisibility('allActivitiesTable');
        this.renderActivitiesPagination(totalItems, f.page, totalPages);
    },

    getActivityBadgeClass: function (type) {
        if (type === '매수') return 'badge-buy';
        if (type === '매도') return 'badge-sell';
        if (type === '원화입금') return 'badge-deposit-krw';
        if (type === '원화출금') return 'badge-withdraw-krw';
        if (type === '코인입금') return 'badge-deposit-coin';
        if (type === '코인출금') return 'badge-withdraw-coin';
        if (type === '스테이킹') return 'badge-staking';
        if (type === '스테이킹보상') return 'badge-reward';
        if (type === '언스테이킹') return 'badge-staking';
        return 'badge-buy';
    },

    renderActivitiesPagination: function (totalItems, currentPage, totalPages) {
        const paginContainer = document.getElementById('allActivitiesPagination');
        if (!paginContainer) return;

        if (totalItems === 0) {
            paginContainer.innerHTML = '';
            return;
        }

        let html = `
            <div class="pagination-info text-xs text-muted">
                총 <strong>${totalItems}</strong>건 중 ${(currentPage - 1) * this.state.activityFilter.pageSize + 1} - ${Math.min(currentPage * this.state.activityFilter.pageSize, totalItems)}건
            </div>
            <div class="pagination-controls">
                <button class="btn btn-sm" ${currentPage === 1 ? 'disabled' : ''} onclick="App.goToActivityPage(1)">«</button>
                <button class="btn btn-sm" ${currentPage === 1 ? 'disabled' : ''} onclick="App.goToActivityPage(${currentPage - 1})">‹ 이전</button>
                <span class="page-current text-sm px-2 font-bold">${currentPage} / ${totalPages}</span>
                <button class="btn btn-sm" ${currentPage === totalPages ? 'disabled' : ''} onclick="App.goToActivityPage(${currentPage + 1})">다음 ›</button>
                <button class="btn btn-sm" ${currentPage === totalPages ? 'disabled' : ''} onclick="App.goToActivityPage(${totalPages})">»</button>
            </div>
        `;

        paginContainer.innerHTML = html;
    },

    goToActivityPage: function (page) {
        this.state.activityFilter.page = page;
        this.renderAllActivitiesTable();
    },

    renderMonthlyTable: function () {
        const tbody = document.querySelector('#monthlyTable tbody');
        if (!tbody) return;

        let months = this.state.reportData ? [...this.state.reportData.monthlyStats] : [];
        if (months.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-muted">월별 거래 데이터가 없습니다.</td></tr>`;
            return;
        }

        const sort = this.state.sortStates.monthlyTable;
        months.sort((a, b) => {
            let valA = a[sort.col] || 0;
            let valB = b[sort.col] || 0;
            if (typeof valA === 'string') return sort.asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
            return sort.asc ? valA - valB : valB - valA;
        });

        let html = '';
        months.forEach(m => {
            const profitClass = this.getProfitColorClass(m.realizedProfit);

            html += `
                <tr>
                    <td class="font-bold">${m.period}</td>
                    <td class="text-right ${profitClass} font-bold">
                        ${(m.realizedProfit > 0 ? '+' : '')}${this.formatCurrency(m.realizedProfit)}
                    </td>
                    <td class="text-right">${this.formatCurrency(m.buyVolume)}</td>
                    <td class="text-right">${this.formatCurrency(m.sellVolume)}</td>
                    <td class="text-right font-medium">${this.formatCurrency(m.totalVolume)}</td>
                    <td class="text-right text-muted">${this.formatCurrency(m.totalFees)}</td>
                    <td class="text-center">
                        <span class="font-bold">${m.winRate.toFixed(0)}%</span>
                        <span class="text-xs text-muted">(${m.winCount}승 ${m.lossCount}패 / ${m.tradesCount}건)</span>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
        ColumnManager.applyVisibility('monthlyTable');
    },

    updateCoinFilterOptions: function () {
        const select = document.getElementById('activityCoinFilter');
        if (!select) return;

        const currentVal = this.state.activityFilter.market;
        const coins = this.state.reportData ? this.state.reportData.coinSummaries : [];

        let html = '<option value="ALL">전체 코인</option>';
        coins.forEach(c => {
            const name = c.koreanName || c.coinSymbol;
            html += `<option value="${c.market}">${name} (${c.coinSymbol})</option>`;
        });

        select.innerHTML = html;
        select.value = currentVal;
    },

    formatCurrency: function (num) {
        if (num === null || num === undefined || isNaN(num)) return '0원';
        return `${Math.round(num).toLocaleString()}원`;
    },

    getProfitColorClass: function (val) {
        if (!val || Math.abs(val) < 1e-6) return 'text-muted';
        const isKorean = this.state.colorConvention === 'korean';

        if (val > 0) {
            return isKorean ? 'color-profit-kr' : 'color-profit-global';
        } else {
            return isKorean ? 'color-loss-kr' : 'color-loss-global';
        }
    },

    saveTrades: function () {
        AnalyzerStorage.saveTrades(this.state.rawTrades);
        AnalyzerStorage.saveStaking(this.state.customStaking);
        this.updateUserBanner();
    },

    loadSavedTrades: function () {
        const saved = AnalyzerStorage.getTrades();
        if (Array.isArray(saved) && saved.length > 0) {
            this.state.rawTrades = saved;
            this.state.customStaking = AnalyzerStorage.getStaking();
            this.recalculate();
            this.fetchLiveTickers(false);
        } else {
            this.state.rawTrades = [];
            this.state.customStaking = [];
            this.recalculate();
        }
        this.updateUserBanner();
    },

    clearData: function () {
        this.state.rawTrades = [];
        this.state.customStaking = [];
        this.state.reportData = null;
        AnalyzerStorage.clearUserData();
        this.recalculate();
        this.updateUserBanner();
        this.showToast("현재 사용자의 모든 거래 및 스테이킹 데이터가 초기화되었습니다.", "info");
    },

    updateUserBanner: function () {
        const uid = AnalyzerStorage.getCurrentUserId();
        const isGuest = uid === "guest";
        const u = window.currentUser || (function() { try { return JSON.parse(localStorage.getItem("coinhub_user")); } catch(e){ return null; } })();
        const displayName = isGuest ? "게스트 (방문자)" : (u && u.username ? u.username : uid);

        const nameEl = document.getElementById("analyzerCurrentUserName");
        const badgeEl = document.getElementById("analyzerUserModeBadge");
        const countEl = document.getElementById("analyzerSavedCountBadge");

        if (nameEl) nameEl.textContent = displayName;
        if (badgeEl) {
            badgeEl.textContent = isGuest ? "🔒 게스트 독립 보관함" : "👤 " + displayName + " 회원 전용 보관함";
            badgeEl.className = isGuest
                ? "px-2 py-0.5 rounded bg-navy-950 border border-slate-700 text-slate-400 font-mono text-[11px]"
                : "px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-mono text-[11px] font-bold";
        }
        if (countEl) {
            countEl.textContent = "저장된 거래: " + (this.state.rawTrades ? this.state.rawTrades.length : 0) + "건";
        }
    },

    switchUser: function (user) {
        this.loadSavedTrades();
        this.updateUserBanner();
        const name = user && user.username ? user.username : "게스트";
        this.showToast(name + " 님의 개인 거래 데이터 보관함으로 전환되었습니다.", "info");
    },

    showLoading: function (show, text = '처리 중...') {
        let loader = document.getElementById('globalLoader');
        if (!loader) return;
        const textElem = loader.querySelector('.loader-text');
        if (textElem) textElem.textContent = text;
        loader.style.display = show ? 'flex' : 'none';
    },

    showToast: function (message, type = 'info') {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">${message}</div>
            <button class="toast-close">&times;</button>
        `;

        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.remove();
        });

        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = App;
}


window.AnalyzerApp = App;
