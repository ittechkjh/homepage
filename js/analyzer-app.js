/**
 * analyzer-app.js
 * 업비트 & 빗썸 코인 거래내역 분석기 (로그인 회원 전용 100% 로컬 독립 보관 엔진)
 */

const AnalyzerStorage = {
    getCurrentUserId: function () {
        try {
            const nick = localStorage.getItem('coinhub_nickname') || 'guest';
            return 'user_' + String(nick).trim().toLowerCase().replace(/[^a-zA-Z0-9가-힣]/g, '');
        } catch (e) {}
        return 'user_guest';
    },
    
    getKey: function (key) {
        const uid = this.getCurrentUserId();
        return 'coinhub_' + uid + '_' + key;
    },

    getTrades: function () {
        const storageKey = this.getKey('trades');
        try {
            const saved = localStorage.getItem(storageKey) || localStorage.getItem('coinhub_analyzer_trades');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    let needsResave = false;
                    const healed = parsed.map(item => {
                        const marketStr = String(item.market || '').toUpperCase();
                        const idStr = String(item.id || '').toUpperCase();
                        const isBithumbItem = idStr.startsWith('BITHUMB_') || 
                                              idStr.includes('BITHUMB') || 
                                              marketStr.includes('[') || 
                                              marketStr.includes('(') || 
                                              marketStr.includes('/KRW') ||
                                              (item.coinSymbol && ['팝체인', '이오스닥', '소폰', '너보스', '아스타'].includes(item.coinSymbol));
                        
                        if (isBithumbItem && item.exchange !== 'BITHUMB') {
                            item.exchange = 'BITHUMB';
                            needsResave = true;
                        }
                        if (item.coinSymbol === 'KRW' || item.market === 'KRW' || (item.type && item.type.includes('원화'))) {
                            if (isBithumbItem || idStr.startsWith('BITHUMB_') || idStr.includes('BITHUMB')) {
                                item.exchange = 'BITHUMB';
                                needsResave = true;
                            }
                        }
                        return item;
                    });
                    if (needsResave) {
                        try {
                            localStorage.setItem(storageKey, JSON.stringify(healed));
                            localStorage.setItem('coinhub_analyzer_trades', JSON.stringify(healed));
                        } catch (e) {}
                    }
                    return healed;
                }
            }
        } catch (e) {
            console.error('거래 내역 로드 실패:', e);
        }
        return [];
    },

    saveTrades: function (trades) {
        const storageKey = this.getKey('trades');
        try {
            localStorage.setItem(storageKey, JSON.stringify(trades));
            localStorage.setItem('coinhub_analyzer_trades', JSON.stringify(trades));
        } catch (e) {
            console.warn('로컬 저장소 용량 초과:', e);
        }
    },

    clearUserData: function () {
        const storageKey = this.getKey('trades');
        if (storageKey) {
            localStorage.removeItem(storageKey);
        }
        localStorage.removeItem('coinhub_analyzer_trades');
    }
};

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
            { id: 'winRate', name: '승률', default: true }
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
        ]
    },

    getHiddenCols: function (tableId) {
        try {
            const saved = localStorage.getItem('coinhub_hidden_cols_' + tableId);
            if (!saved) return [];
            const parsed = JSON.parse(saved);
            const colDefs = this.tables[tableId] || [];
            if (Array.isArray(parsed) && parsed.length < colDefs.length) {
                return parsed;
            }
        } catch (e) {}
        return [];
    },

    setHiddenCols: function (tableId, hiddenCols) {
        try {
            localStorage.setItem('coinhub_hidden_cols_' + tableId, JSON.stringify(hiddenCols));
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

            const th = table.querySelector('thead th:nth-child(' + nth + ')');
            if (th) th.style.display = isHidden ? 'none' : '';

            table.querySelectorAll('tbody tr td:nth-child(' + nth + ')').forEach(td => {
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
            itemsHtml += '<label class="col-toggle-item"><input type="checkbox" data-table="' + tableId + '" data-col="' + col.id + '" ' + (isChecked ? 'checked' : '') + '><span>' + col.name + '</span></label>';
        });

        container.innerHTML = '<div class="col-dropdown"><button class="btn btn-sm btn-outline col-dropdown-btn">⚙️ 컬럼 설정 ▼</button><div class="col-dropdown-menu"><div class="col-dropdown-header">표시할 컬럼 선택</div>' + itemsHtml + '</div></div>';

        const btn = container.querySelector('.col-dropdown-btn');
        const menu = container.querySelector('.col-dropdown-menu');

        if (btn && menu) {
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
    }
};

const App = {
    state: {
        rawTrades: [],
        reportData: null,
        method: localStorage.getItem('coinhub_calc_method') || 'fifo',
        exchangeFilter: 'ALL',
        activeTab: 'dashboard',
        sortStates: {
            coinsTable: { col: 'realizedProfit', asc: false },
            transfersTable: { col: 'time', asc: false },
            allActivitiesTable: { col: 'time', asc: false },
            monthlyTable: { col: 'period', asc: false }
        },
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

  // Reset any corrupt hidden column caches
  try {
    ['coinsTable', 'transfersTable', 'allActivitiesTable', 'monthlyTable'].forEach(tId => {
      const saved = localStorage.getItem('coinhub_hidden_cols_' + tId);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (!Array.isArray(parsed) || parsed.length > 5) {
            localStorage.removeItem('coinhub_hidden_cols_' + tId);
          }
        } catch (e) {
          localStorage.removeItem('coinhub_hidden_cols_' + tId);
        }
      }
    });
  } catch (e) {}

        try {
            this.initColumnDropdowns();
            this.bindEvents();
            
            if (typeof UpbitAPI !== 'undefined' && UpbitAPI.initMarketInfo) {
                await UpbitAPI.initMarketInfo();
            }
            
            this.checkAuthStatus();
            this.loadSavedTrades();
        } catch (err) {
            console.error('App 초기화 오류:', err);
        }
    },

        checkAuthStatus: function () {
        const mainContent = document.getElementById('analyzer-main-content');
        if (mainContent) {
            mainContent.style.display = 'block';
            mainContent.classList.remove('hidden');
        }
        const authGuard = document.getElementById('analyzer-auth-guard');
        if (authGuard) {
            authGuard.style.display = 'none';
            authGuard.classList.add('hidden');
        }
        this.updateUserBanner();
    },

    initColumnDropdowns: function () {
        ColumnManager.renderColumnDropdown('coinsTable', 'coinsColDropdownContainer');
        ColumnManager.renderColumnDropdown('transfersTable', 'transfersColDropdownContainer');
        ColumnManager.renderColumnDropdown('allActivitiesTable', 'activitiesColDropdownContainer');
        ColumnManager.renderColumnDropdown('monthlyTable', 'monthlyColDropdownContainer');
    },

    bindEvents: function () {
        // 서브탭 네비게이션
        document.querySelectorAll(".analyzer-subtab").forEach(tab => {
            tab.addEventListener('click', (e) => {
                const targetTab = e.currentTarget.dataset.subtab || e.currentTarget.dataset.tab;
                this.switchSubTab(targetTab);
            });
        });

        // 거래소 선택 필터
        const exchangeFilterSelect = document.getElementById('globalExchangeSelect');
        if (exchangeFilterSelect) {
            exchangeFilterSelect.addEventListener('change', (e) => {
                this.state.exchangeFilter = e.target.value;
                this.recalculate();
                const exName = e.target.value === 'ALL' ? '전체 거래소(통합)' : (e.target.value === 'UPBIT' ? '업비트' : '빗썸');
                this.showToast("분석 대상 거래소가 '" + exName + "'(으)로 변경되었습니다.", 'info');
            });
        }

        // 파일 드래그 & 드롭 및 선택
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');

        if (dropZone && fileInput) {
            dropZone.addEventListener('click', () => {
                if (!AnalyzerStorage.getCurrentUserId()) {
                    openAuthModal('login');
                    return;
                }
                fileInput.click();
            });
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('dragover');
            });
            dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('dragover');
                if (!AnalyzerStorage.getCurrentUserId()) {
                    openAuthModal('login');
                    return;
                }
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
            quickUploadBtn.addEventListener('click', () => {
                if (!AnalyzerStorage.getCurrentUserId()) {
                    openAuthModal('login');
                    return;
                }
                fileInput.click();
            });
        }

        // 샘플 데이터 버튼들
        const loadAllSampleBtn = document.getElementById('loadAllSampleBtn');
        const loadUpbitSampleBtn = document.getElementById('loadUpbitSampleBtn');
        const loadBithumbSampleBtn = document.getElementById('loadBithumbSampleBtn');

        if (loadAllSampleBtn) loadAllSampleBtn.addEventListener('click', () => this.loadSampleData('ALL'));
        if (loadUpbitSampleBtn) loadUpbitSampleBtn.addEventListener('click', () => this.loadSampleData('UPBIT'));
        if (loadBithumbSampleBtn) loadBithumbSampleBtn.addEventListener('click', () => this.loadSampleData('BITHUMB'));

        // 시세 새로고침 버튼
        const refreshTickerBtn = document.getElementById('refreshTickerBtn');
        if (refreshTickerBtn) {
            refreshTickerBtn.addEventListener('click', () => this.fetchLiveTickers(true));
        }

        // 엑셀 내보내기 버튼
        const exportExcelBtn = document.getElementById('exportExcelBtn');
        if (exportExcelBtn) {
            exportExcelBtn.addEventListener('click', () => {
                if (this.state.reportData) {
                    Exporter.exportExcelReport(this.state.reportData);
                } else {
                    this.showToast('내보낼 분석 데이터가 없습니다.', 'error');
                }
            });
        }

        const exportCSVBtn = document.getElementById('exportCSVBtn');
        if (exportCSVBtn) {
            exportCSVBtn.addEventListener('click', () => this.exportCurrentActivitiesCSV());
        }

        const printReportBtn = document.getElementById('printReportBtn');
        if (printReportBtn) {
            printReportBtn.addEventListener('click', () => Exporter.printReport(this.state.reportData));
        }

        const clearDataBtn = document.getElementById('clearDataBtn');
        if (clearDataBtn) {
            clearDataBtn.addEventListener('click', () => this.clearDataWithConfirm());
        }

        // 테이블 정렬 헤더 이벤트 바인딩
        this.bindTableSorting('coinsTable');
        this.bindTableSorting('transfersTable');
        this.bindTableSorting('allActivitiesTable');
        this.bindTableSorting('monthlyTable');

        // 필터 이벤트 바인딩
        const actSearch = document.getElementById('activitySearchInput');
        const actType = document.getElementById('activityTypeFilter');
        const actCoin = document.getElementById('activityCoinFilter');
        const actStart = document.getElementById('startDateInput');
        const actEnd = document.getElementById('endDateInput');

        if (actSearch) actSearch.addEventListener('input', (e) => {
            this.state.activityFilter.search = e.target.value.trim().toLowerCase();
            this.state.activityFilter.page = 1;
            this.renderAllActivitiesTable();
        });
        if (actType) actType.addEventListener('change', (e) => {
            this.state.activityFilter.typeGroup = e.target.value;
            this.state.activityFilter.page = 1;
            this.renderAllActivitiesTable();
        });
        if (actCoin) actCoin.addEventListener('change', (e) => {
            this.state.activityFilter.market = e.target.value;
            this.state.activityFilter.page = 1;
            this.renderAllActivitiesTable();
        });
        if (actStart) actStart.addEventListener('change', (e) => {
            this.state.activityFilter.startDate = e.target.value;
            this.state.activityFilter.page = 1;
            this.renderAllActivitiesTable();
        });
        if (actEnd) actEnd.addEventListener('change', (e) => {
            this.state.activityFilter.endDate = e.target.value;
            this.state.activityFilter.page = 1;
            this.renderAllActivitiesTable();
        });

        // 입출금 검색/필터
        const transExchangeSelect = document.getElementById('transferExchangeFilter');
        if (transExchangeSelect) {
            transExchangeSelect.addEventListener('change', (e) => {
                this.state.transferFilter.exchange = e.target.value;
                this.state.transferFilter.page = 1;
                this.renderTransfersTable();
            });
        }

        const transSearch = document.getElementById('transferSearchInput');
        const transType = document.getElementById('transferTypeFilter');

        if (transSearch) transSearch.addEventListener('input', (e) => {
            this.state.transferFilter.search = e.target.value.trim().toLowerCase();
            this.state.transferFilter.page = 1;
            this.renderTransfersTable();
        });
        if (transType) transType.addEventListener('change', (e) => {
            this.state.transferFilter.type = e.target.value;
            this.state.transferFilter.page = 1;
            this.renderTransfersTable();
        });

        this.updateCalcMethodUI();

        // Bind calcMethodSelect dropdown (old settings tab)
        const calcMethodSel = document.getElementById('calcMethodSelect');
        if (calcMethodSel) {
            calcMethodSel.value = this.state.method;
            calcMethodSel.addEventListener('change', (e) => {
                this.setCalcMethod(e.target.value);
            });
        }
    },

    setCalcMethod: function (method) {
        this.state.method = method;
        localStorage.setItem('coinhub_calc_method', method);
        this.updateCalcMethodUI();
        this.recalculate();
        this.showToast('손익 계산 알고리즘이 ' + (method === 'fifo' ? '선입선출법 (FIFO)' : '이동평균법 (Moving Avg)') + '으로 변경되었습니다.', 'info');
    },

    updateCalcMethodUI: function () {
        const isFifo = this.state.method === 'fifo';
        const optFifo = document.getElementById('opt-fifo');
        const optMoving = document.getElementById('opt-moving-avg');
        const radioFifo = document.getElementById('radio-fifo');
        const radioMoving = document.getElementById('radio-moving-avg');

        if (optFifo) optFifo.classList.toggle('active', isFifo);
        if (optMoving) optMoving.classList.toggle('active', !isFifo);
        if (radioFifo) radioFifo.checked = isFifo;
        if (radioMoving) radioMoving.checked = !isFifo;
    },

    bindTableSorting: function (tableId) {
        const table = document.getElementById(tableId);
        if (!table) return;

        table.querySelectorAll('thead th[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                const sortKey = th.dataset.sort;
                const state = this.state.sortStates[tableId];
                if (state.col === sortKey) {
                    state.asc = !state.asc;
                } else {
                    state.col = sortKey;
                    state.asc = false;
                }

                if (tableId === 'coinsTable') this.renderCoinsTable();
                else if (tableId === 'transfersTable') this.renderTransfersTable();
                else if (tableId === 'allActivitiesTable') this.renderAllActivitiesTable();
                else if (tableId === 'monthlyTable') this.renderMonthlyTable();
            });
        });
    },

    switchSubTab: function (tabId) {
        this.state.activeTab = tabId;
        document.querySelectorAll(".analyzer-subtab").forEach(tab => {
            const t = tab.dataset.subtab || tab.dataset.tab;
            tab.classList.toggle("active", t === tabId);
        });
        document.querySelectorAll(".analyzer-tab-pane").forEach(content => {
            const isActive = content.id === tabId + "Tab";
            content.classList.toggle("active", isActive);
            content.style.display = isActive ? "block" : "none";
        });

        if (tabId === "dashboard" && this.state.reportData) {
            setTimeout(() => ChartManager.renderAllCharts(this.state.reportData), 50);
        } else if (tabId === "coins") {
            this.renderCoinsTable();
        } else if (tabId === "transfers") {
            this.renderTransfersView();
        } else if (tabId === "allActivities") {
            this.renderAllActivitiesTable();
        } else if (tabId === "monthly") {
            this.renderMonthlyTable();
        } else if (tabId === "settings") {
            this.updateUserBanner();
            this.updateCalcMethodUI();
        }
    },
    switchTab: function (tabId) { this.switchSubTab(tabId); },

    handleFiles: async function (fileList) {
        if (!AnalyzerStorage.getCurrentUserId()) {
            openAuthModal('login');
            return;
        }

        this.showLoading(true, '파일 파싱 및 분석 중...');
        let newItems = [];
        let lastError = null;

        try {
            for (let i = 0; i < fileList.length; i++) {
                const file = fileList[i];
                try {
                    const items = await this.readFileAsync(file);
                    if (items && items.length > 0) {
                        newItems = UpbitParser.mergeTradeLists(newItems, items);
                    }
                } catch (err) {
                    console.error('파일 처리 실패 (' + file.name + '):', err);
                    lastError = err;
                }
            }

            if (newItems.length === 0) {
                const msg = lastError ? lastError.message : '유효한 거래 내역을 찾지 못했습니다. 업비트/빗썸에서 다운로드한 엑셀 또는 CSV 파일을 올려주세요.';
                this.showToast(msg, 'error');
                return;
            }

            this.state.rawTrades = UpbitParser.mergeTradeLists(this.state.rawTrades, newItems);
            this.saveTrades();
            this.recalculate();
            await this.fetchLiveTickers(false);

            this.showToast('총 ' + this.state.rawTrades.length + '건의 거래/입출금 내역이 정리되었습니다.', 'success');
            this.switchSubTab('dashboard');

        } finally {
            this.showLoading(false);
            const fileInput = document.getElementById('fileInput');
            if (fileInput) fileInput.value = '';
        }
    },

    readFileAsync: function (file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const arrayBuffer = e.target.result;
                let items = [];
                let lastParseError = null;

                try {
                    items = UpbitParser.parseExcel(arrayBuffer, file.name);
                    if (items && items.length > 0) return resolve(items);
                } catch (e1) {
                    lastParseError = e1;
                }

                try {
                    const utf8Text = new TextDecoder('utf-8').decode(arrayBuffer);
                    items = UpbitParser.parseCSV(utf8Text, file.name);
                    if (items && items.length > 0) return resolve(items);
                } catch (e2) {}

                try {
                    const euckrText = new TextDecoder('euc-kr').decode(arrayBuffer);
                    items = UpbitParser.parseCSV(euckrText, file.name);
                    if (items && items.length > 0) return resolve(items);
                } catch (e3) {}

                if (lastParseError) {
                    reject(lastParseError);
                } else {
                    reject(new Error('파일(' + file.name + ')에서 유효한 거래 내역을 인식하지 못했습니다.'));
                }
            };

            reader.onerror = (err) => reject(err);
            reader.readAsArrayBuffer(file);
        });
    },

    loadSampleData: async function (type = 'ALL') {
        this.showLoading(true, '샘플 데이터 로딩 및 손익 계산 중...');
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

            const typeLabel = (type === 'ALL' ? '업비트+빗썸 통합' : (type === 'UPBIT' ? '업비트 전용' : '빗썸 전용'));
            this.showToast('🎉 [' + typeLabel + '] 샘플 데이터 ' + items.length + '건이 로드되었습니다!', 'success');
            
            // Switch to dashboard and scroll smoothly
            this.switchSubTab('dashboard');
            setTimeout(() => {
                const target = document.getElementById('reportDashboard');
                if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        } catch (err) {
            console.error('샘플 데이터 로드 실패:', err);
            this.showToast('샘플 데이터 로드 중 오류가 발생했습니다: ' + err.message, 'error');
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
            exchange: this.state.exchangeFilter
        });

        // Immediately enrich with baseline/known prices synchronously so cards never start at 0
        if (typeof UpbitAPI !== 'undefined' && this.state.reportData && this.state.reportData.coinSummaries) {
            const initialEnriched = UpbitAPI.enrichCoinSummariesWithTickers(this.state.reportData.coinSummaries);
            this.state.reportData.totalCurrentValue = initialEnriched.totalCurrentValue;
            this.state.reportData.totalUnrealizedProfit = initialEnriched.totalUnrealizedProfit;
            if (this.state.reportData.summary) {
                this.state.reportData.summary.totalCurrentValue = initialEnriched.totalCurrentValue;
                this.state.reportData.summary.totalUnrealizedProfit = initialEnriched.totalUnrealizedProfit;
            }
        }

        this.updateCoinFilterOptions();
        this.renderAll();
        this.fetchLiveTickers(false);
        if (typeof CoinCalculators !== 'undefined' && CoinCalculators.importProfitCardFromAnalyzer) {
            try { CoinCalculators.importProfitCardFromAnalyzer(false); } catch (e) {}
        }
    },

    fetchLiveTickers: async function (showToast = false) {
        if (!this.state.reportData) return;

        const refreshBtn = document.getElementById('refreshTickerBtn');
        if (refreshBtn) refreshBtn.classList.add('spinning');

        try {
            const tradeMarkets = (this.state.reportData.coinSummaries || []).map(c => c.market || c.coinSymbol || '').filter(Boolean);
            const allMarkets = tradeMarkets.filter((v, i, a) => a.indexOf(v) === i);

            const tickers = await UpbitAPI.fetchTickers(allMarkets);
            const enriched = UpbitAPI.enrichCoinSummariesWithTickers(this.state.reportData.coinSummaries, tickers);
            
            this.state.reportData.totalCurrentValue = enriched.totalCurrentValue;
            this.state.reportData.totalUnrealizedProfit = enriched.totalUnrealizedProfit;
            if (this.state.reportData.summary) {
                this.state.reportData.summary.totalCurrentValue = enriched.totalCurrentValue;
                this.state.reportData.summary.totalUnrealizedProfit = enriched.totalUnrealizedProfit;
            }

            this.renderSummaryCards();
            this.updateTrackerUI();
            this.renderCoinsTable();
            try { ChartManager.renderPortfolioDoughnutChart(this.state.reportData.coinSummaries); } catch(e) {}
            try { ChartManager.renderCoinStackingChart(this.state.reportData.coinSummaries); } catch(e) {}

            const timeEl = document.getElementById('lastTickerUpdateTime');
            if (timeEl) {
                const now = new Date();
                timeEl.textContent = `실시간 시세 반영: ${now.toLocaleTimeString()}`;
            }

            if (showToast) {
                this.showToast('실시간 시세가 갱신되었습니다.', 'success');
            }
        } catch (err) {
            console.error('시세 갱신 오류:', err);
        } finally {
            if (refreshBtn) refreshBtn.classList.remove('spinning');
        }
    },

    renderAll: function () {
        this.renderSummaryCards();
        this.updateTrackerUI();
        this.renderCoinsTable();
        this.renderAllActivitiesTable();
        this.renderMonthlyTable();
        this.renderTransfersView();
        
        if (this.state.reportData) {
            ChartManager.renderAllCharts(this.state.reportData);
        }
    },

    renderSummaryCards: function () {
        const s = this.state.reportData ? this.state.reportData.summary : ProfitCalculator.getEmptyResult().summary;

        // Sum coin unrealized if not populated
        let calculatedUnrealized = 0;
        let calculatedCurrentVal = 0;
        if (this.state.reportData && this.state.reportData.coinSummaries) {
            this.state.reportData.coinSummaries.forEach(c => {
                if (c.holdingQty > 1e-8) {
                    const sym = (c.coinSymbol || (c.market ? c.market.replace('KRW-', '') : '')).toUpperCase();
                    let price = 0;
                    if (c.currentPrice && parseFloat(c.currentPrice) > 0) {
                        price = parseFloat(c.currentPrice);
                    } else if (typeof UpbitAPI !== 'undefined' && UpbitAPI.fallbackPrices && UpbitAPI.fallbackPrices[sym]) {
                        price = UpbitAPI.fallbackPrices[sym];
                    } else if (c.avgBuyPrice && parseFloat(c.avgBuyPrice) > 0) {
                        price = parseFloat(c.avgBuyPrice);
                    }

                    const val = c.holdingQty * price;
                    const upnl = val - (c.holdingCost || 0);
                    calculatedCurrentVal += val;
                    calculatedUnrealized += upnl;
                }
            });
        }

        const totalUnrealized = calculatedUnrealized;
        const unrealizedRoi = s.currentPortfolioCost > 0 ? (totalUnrealized / s.currentPortfolioCost) * 100 : 0;

        const realizedEl = document.getElementById('cardRealizedProfit');
        const realizedRoiEl = document.getElementById('cardRealizedRoi');
        if (realizedEl) {
            realizedEl.textContent = (s.totalRealizedProfit > 0 ? '+' : '') + this.formatCurrency(s.totalRealizedProfit);
            realizedEl.className = 'stat-value ' + this.getProfitColorClass(s.totalRealizedProfit);
        }
        if (realizedRoiEl) {
            realizedRoiEl.textContent = (s.totalRealizedRoi > 0 ? '+' : '') + s.totalRealizedRoi.toFixed(2) + '%';
            realizedRoiEl.className = 'stat-badge ' + this.getProfitColorClass(s.totalRealizedProfit);
        }

        const unrealizedEl = document.getElementById('cardUnrealizedProfit');
        const unrealizedRoiEl = document.getElementById('cardUnrealizedRoi');
        if (unrealizedEl) {
            unrealizedEl.textContent = (totalUnrealized > 0 ? '+' : '') + this.formatCurrency(totalUnrealized);
            unrealizedEl.className = 'stat-value ' + this.getProfitColorClass(totalUnrealized);
        }
        if (unrealizedRoiEl) {
            unrealizedRoiEl.textContent = (unrealizedRoi > 0 ? '+' : '') + unrealizedRoi.toFixed(2) + '%';
            unrealizedRoiEl.className = 'stat-badge ' + this.getProfitColorClass(totalUnrealized);
        }

        const investedEl = document.getElementById('cardCurrentHoldingCost');
        const cumBuyEl = document.getElementById('cardCumulativeBuy');
        const netDepositEl = document.getElementById('cardNetDeposit');
        if (investedEl) investedEl.textContent = this.formatCurrency(s.currentPortfolioCost);
        if (cumBuyEl) cumBuyEl.textContent = this.formatCurrency(s.totalCumulativeBuyAmount);
        if (netDepositEl) netDepositEl.textContent = this.formatCurrency(s.netKrwDeposits);

        const feesEl = document.getElementById('cardTotalFees');
        const winRateEl = document.getElementById('cardWinRate');
        if (feesEl) feesEl.textContent = this.formatCurrency(s.totalFees);
        if (winRateEl) winRateEl.textContent = s.totalWinRate.toFixed(1) + '% (' + s.totalWinTrades + '승 ' + s.totalLossTrades + '패 / 총 ' + s.totalTradesCount + '건)';
    },

    renderCoinsTable: function () {
        const tbody = document.querySelector('#coinsTable tbody');
        if (!tbody) return;

        let coins = this.state.reportData ? [...this.state.reportData.coinSummaries] : [];
        coins = coins.filter(c => c.market !== 'KRW' && c.market !== 'KRW-KRW' && c.coinSymbol !== 'KRW' && (!c.coinSymbol || (!c.coinSymbol.includes('입금') && !c.coinSymbol.includes('출금'))));

        if (coins.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" class="text-center py-8 text-muted">등록된 코인 거래 내역이 없습니다. 상단에서 엑셀 파일을 업로드해 주세요.</td></tr>';
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
            const sym = (coin.coinSymbol || (coin.market ? coin.market.replace('KRW-', '') : '')).toUpperCase();
            const coinName = coin.koreanName || (typeof UpbitAPI !== 'undefined' ? UpbitAPI.getKoreanName(coin.market) : coin.coinSymbol);
            const isBithumb = coin.exchange === 'BITHUMB';

            let currentPrice = 0;
            if (coin.currentPrice && parseFloat(coin.currentPrice) > 0) {
                currentPrice = parseFloat(coin.currentPrice);
            } else if (typeof UpbitAPI !== 'undefined' && UpbitAPI.fallbackPrices && UpbitAPI.fallbackPrices[sym]) {
                currentPrice = UpbitAPI.fallbackPrices[sym];
            } else if (parseFloat(coin.avgBuyPrice) > 0) {
                currentPrice = parseFloat(coin.avgBuyPrice);
            }
            coin.currentPrice = currentPrice;

            const hQty = parseFloat(coin.holdingQty) || 0;
            const hCost = parseFloat(coin.holdingCost) || 0;
            let unprofit = 0;
            let unroi = 0;

            if (hQty > 1e-8 && currentPrice > 0) {
                unprofit = (hQty * currentPrice) - hCost;
                unroi = hCost > 0 ? (unprofit / hCost) * 100 : 0;
                coin.unrealizedProfit = unprofit;
                coin.unrealizedRoi = unroi;
                coin.currentValue = hQty * currentPrice;
            }

            const profitClass = this.getProfitColorClass(coin.realizedProfit);
            const unprofitClass = this.getProfitColorClass(unprofit || 0);
            const stackingClass = this.getProfitColorClass(coin.gainedCoinQty || 0);

            const gainedQtyStr = coin.gainedCoinQty !== undefined 
                ? (coin.gainedCoinQty > 0 ? '+' : '') + Number(coin.gainedCoinQty).toLocaleString(undefined, { maximumFractionDigits: 6 }) + ' ' + (coin.coinSymbol || '')
                : '-';
            const gainedRoiStr = coin.gainedCoinRoi !== undefined 
                ? (coin.gainedCoinRoi > 0 ? '+' : '') + Number(coin.gainedCoinRoi).toFixed(2) + '%'
                : '';
            const changeStr = coin.change24h !== undefined ? '<div class="text-xs ' + this.getProfitColorClass(coin.change24h) + '">' + (coin.change24h > 0 ? '+' : '') + Number(coin.change24h).toFixed(2) + '%</div>' : '';
            const winRateStr = (coin.winRate || 0).toFixed(0);

            html += '<tr>' +
                '<td><div class="coin-info-cell"><span class="coin-symbol-badge">' + (coin.coinSymbol || '-') + '</span><div><div class="coin-korean-name">' + coinName + ' <span class="badge ' + (isBithumb ? 'badge-bithumb' : 'badge-upbit') + '">' + (coin.exchange || 'UPBIT') + '</span></div><div class="coin-market-code">' + (coin.market || '-') + '</div></div></div></td>' +
                '<td class="text-right ' + profitClass + '"><div class="font-bold">' + this.formatCurrency(coin.realizedProfit) + '</div><div class="text-xs">' + (coin.realizedRoi > 0 ? '+' : '') + (coin.realizedRoi || 0).toFixed(2) + '%</div></td>' +
                '<td class="text-right ' + stackingClass + '"><div class="font-bold">' + gainedQtyStr + '</div><div class="text-xs">' + gainedRoiStr + '</div></td>' +
                '<td class="text-right"><div class="font-medium">' + (coin.holdingQty > 0 ? Number(coin.holdingQty).toLocaleString(undefined, { maximumFractionDigits: 6 }) : '-') + '</div><div class="text-xs text-muted">' + (coin.holdingCost > 0 ? this.formatCurrency(coin.holdingCost) : '') + '</div></td>' +
                '<td class="text-right"><div>' + (coin.avgBuyPrice > 0 ? this.formatCurrency(coin.avgBuyPrice) : '-') + '</div></td>' +
                '<td class="text-right"><div>' + (currentPrice > 0 ? this.formatCurrency(currentPrice) : '-') + '</div>' + changeStr + '</td>' +
                '<td class="text-right ' + unprofitClass + '">' + (coin.holdingQty > 0 ? '<div class="font-bold">' + (unprofit > 0 ? '+' : '') + this.formatCurrency(unprofit || 0) + '</div><div class="text-xs">' + (unroi > 0 ? '+' : '') + (unroi || 0).toFixed(2) + '%</div>' : '<span class="text-muted">-</span>') + '</td>' +
                '<td class="text-right">' + this.formatCurrency(coin.totalBuyAmount) + '</td>' +
                '<td class="text-right">' + this.formatCurrency(coin.totalSellAmount) + '</td>' +
                '<td class="text-right text-muted">' + this.formatCurrency(coin.totalFee) + '</td>' +
                '<td class="text-center font-bold">' + winRateStr + '% <span class="text-xs text-muted font-normal">(' + (coin.winTrades || 0) + '승 ' + (coin.lossTrades || 0) + '패)</span></td>' +
            '</tr>';
        });

        tbody.innerHTML = html;
        ColumnManager.applyVisibility('coinsTable');
    },

    updateCoinFilterOptions: function () {
        const select = document.getElementById('activityCoinFilter');
        if (!select) return;

        const coins = this.state.reportData ? this.state.reportData.coinSummaries : [];
        const cleanCoins = coins.filter(c => c.market !== 'KRW' && c.market !== 'KRW-KRW' && c.coinSymbol !== 'KRW' && !c.coinSymbol.includes('입금') && !c.coinSymbol.includes('출금'));
        
        let html = '<option value="ALL">전체 코인</option>';
        cleanCoins.forEach(c => {
            const name = c.koreanName || c.coinSymbol;
            html += '<option value="' + c.market + '">' + name + ' (' + c.coinSymbol + ')</option>';
        });
        select.innerHTML = html;
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
            netDepEl.className = 'stat-value ' + (transfers.netKrwDeposit >= 0 ? 'color-profit-global' : 'color-loss-global');
        }

        const coinContainer = document.getElementById('coinTransferSummaryContainer');
        if (coinContainer) {
            if (!transfers.coinTransfers || transfers.coinTransfers.length === 0) {
                coinContainer.innerHTML = '<span class="text-xs text-muted">코인 입출금 내역이 없습니다. (입출금 엑셀 파일을 추가로 업로드하시면 자동 집계됩니다)</span>';
            } else {
                let cHtml = '';
                transfers.coinTransfers.forEach(ct => {
                    const isBithumb = ct.exchange === 'BITHUMB';
                    cHtml += '<div class="stat-card" style="padding: 12px 16px;">' +
                        '<div class="flex-center-gap" style="justify-content: space-between;"><div class="flex-center-gap"><span class="coin-symbol-badge-sm">' + ct.coinSymbol + '</span><span class="badge ' + (isBithumb ? 'badge-bithumb' : 'badge-upbit') + '">' + (ct.exchange || 'UPBIT') + '</span></div><span class="text-xs text-muted">입금 ' + ct.depositCount + ' / 출금 ' + ct.withdrawCount + '</span></div>' +
                        '<div class="text-sm font-bold" style="margin-top: 6px;">순 입금: ' + (ct.netQty > 0 ? '+' : '') + ct.netQty.toLocaleString(undefined, { maximumFractionDigits: 6 }) + ' ' + ct.coinSymbol + '</div>' +
                    '</div>';
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
                (it.coinSymbol && it.coinSymbol.toLowerCase().includes(f.search)) || 
                (it.market && it.market.toLowerCase().includes(f.search))
            );
        }
        if (f.exchange && f.exchange !== 'ALL') {
            items = items.filter(it => (it.exchange || 'UPBIT').toUpperCase() === f.exchange.toUpperCase());
        }
        if (f.type !== 'ALL') {
            items = items.filter(it => it.type === f.type);
        }

        const sort = this.state.sortStates.transfersTable;
        items.sort((a, b) => {
            let valA, valB;
            if (sort.col === 'asset') {
                valA = a.coinSymbol || a.market || '';
                valB = b.coinSymbol || b.market || '';
            } else if (sort.col === 'quantity') {
                valA = (a.coinSymbol === 'KRW' || a.type.includes('원화')) ? (a.amount || a.quantity || 0) : (a.quantity || 0);
                valB = (b.coinSymbol === 'KRW' || b.type.includes('원화')) ? (b.amount || b.quantity || 0) : (b.quantity || 0);
            } else if (sort.col === 'settlement') {
                valA = a.settlement || a.amount || a.quantity || 0;
                valB = b.settlement || b.amount || b.quantity || 0;
            } else {
                valA = a[sort.col] || 0;
                valB = b[sort.col] || 0;
            }
            if (typeof valA === 'string') return sort.asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
            return sort.asc ? valA - valB : valB - valA;
        });

        const totalItems = items.length;
        const totalPages = Math.ceil(totalItems / f.pageSize) || 1;
        f.page = Math.max(1, Math.min(f.page, totalPages));

        const startIndex = (f.page - 1) * f.pageSize;
        const pageItems = items.slice(startIndex, startIndex + f.pageSize);

        if (pageItems.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-muted">입출금 내역이 없습니다. (투자내역의 입출금 엑셀을 업로드하면 표시됩니다)</td></tr>';
            this.renderTransfersPagination(0, 1, 1);
            return;
        }

        let html = '';
        pageItems.forEach(t => {
            const isBithumb = t.exchange === 'BITHUMB';
            const typeStr = t.type || '';
            const isKrw = typeStr.includes('원화') || t.coinSymbol === 'KRW';
            const badgeClass = typeStr.includes('입금') ? (isKrw ? 'badge-deposit-krw' : 'badge-deposit-coin') : (isKrw ? 'badge-withdraw-krw' : 'badge-withdraw-coin');
            const name = typeof UpbitAPI !== 'undefined' ? UpbitAPI.getKoreanName(t.market || t.coinSymbol) : (t.market || t.coinSymbol || '');

            const qtyStr = isKrw ? this.formatCurrency(t.amount || t.quantity) : Number(t.quantity).toLocaleString(undefined, { maximumFractionDigits: 8 }) + ' ' + t.coinSymbol;
            const feeStr = t.fee > 0 ? (isKrw ? this.formatCurrency(t.fee) : t.fee + ' ' + t.coinSymbol) : (isKrw ? '0원' : '0 ' + t.coinSymbol);
            const settlementStr = isKrw ? this.formatCurrency(t.settlement || t.amount) : (t.settlement || t.quantity).toLocaleString(undefined, { maximumFractionDigits: 8 }) + ' ' + t.coinSymbol;

            html += '<tr>' +
                '<td><span class="badge ' + (isBithumb ? 'badge-bithumb' : 'badge-upbit') + '">' + (t.exchange || 'UPBIT') + '</span></td>' +
                '<td class="text-xs text-muted">' + (t.time || '-') + '</td>' +
                '<td><span class="badge ' + badgeClass + '">' + t.type + '</span></td>' +
                '<td><div class="flex-center-gap"><span class="coin-symbol-badge-sm">' + t.coinSymbol + '</span><span class="font-bold">' + name + '</span></div></td>' +
                '<td class="text-right font-bold">' + qtyStr + '</td>' +
                '<td class="text-right">' + (t.price > 1 ? this.formatCurrency(t.price) : (isKrw ? '1원' : '-')) + '</td>' +
                '<td class="text-right text-muted">' + feeStr + '</td>' +
                '<td class="text-right font-medium">' + settlementStr + '</td>' +
            '</tr>';
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

        paginContainer.innerHTML = '<div class="pagination-info text-xs text-muted">총 <strong>' + totalItems + '</strong>건 중 ' + ((currentPage - 1) * this.state.transferFilter.pageSize + 1) + ' - ' + Math.min(currentPage * this.state.transferFilter.pageSize, totalItems) + '건</div>' +
            '<div class="pagination-controls">' +
                '<button class="btn btn-sm" ' + (currentPage === 1 ? 'disabled' : '') + ' onclick="App.goToTransferPage(1)">«</button>' +
                '<button class="btn btn-sm" ' + (currentPage === 1 ? 'disabled' : '') + ' onclick="App.goToTransferPage(' + (currentPage - 1) + ')">‹ 이전</button>' +
                '<span class="page-current text-sm px-2 font-bold">' + currentPage + ' / ' + totalPages + '</span>' +
                '<button class="btn btn-sm" ' + (currentPage === totalPages ? 'disabled' : '') + ' onclick="App.goToTransferPage(' + (currentPage + 1) + ')">다음 ›</button>' +
                '<button class="btn btn-sm" ' + (currentPage === totalPages ? 'disabled' : '') + ' onclick="App.goToTransferPage(' + totalPages + ')">»</button>' +
            '</div>';
    },

    goToTransferPage: function (page) {
        this.state.transferFilter.page = page;
        this.renderTransfersTable();
    },

    renderAllActivitiesTable: function () {
        const tbody = document.querySelector('#allActivitiesTable tbody');
        if (!tbody) return;

        let items = this.state.reportData ? [...this.state.reportData.allActivities] : [];
        const f = this.state.activityFilter;

        if (f.search) {
            items = items.filter(it => 
                (it.coinSymbol && it.coinSymbol.toLowerCase().includes(f.search)) || 
                (it.market && it.market.toLowerCase().includes(f.search)) ||
                (UpbitAPI.getKoreanName(it.market || it.coinSymbol) || '').toLowerCase().includes(f.search)
            );
        }

        if (f.market && f.market !== 'ALL') {
            items = items.filter(it => it.market === f.market || it.coinSymbol === f.market || it.coinSymbol === f.market.replace('KRW-', ''));
        }

        if (f.typeGroup && f.typeGroup !== 'ALL') {
            if (f.typeGroup === 'TRADE_ALL') {
                items = items.filter(it => it.type === '매수' || it.type === '매도');
            } else if (f.typeGroup === 'TRANSFER_ALL') {
                items = items.filter(it => it.category === 'transfer' || it.type.includes('입금') || it.type.includes('출금'));
            } else {
                items = items.filter(it => it.type === f.typeGroup);
            }
        }

        if (f.startDate) {
            const cleanStart = f.startDate.replace(/[\.\/]/g, '-');
            items = items.filter(it => (it.date || '').replace(/[\.\/]/g, '-') >= cleanStart);
        }
        if (f.endDate) {
            const cleanEnd = f.endDate.replace(/[\.\/]/g, '-');
            items = items.filter(it => (it.date || '').replace(/[\.\/]/g, '-') <= cleanEnd);
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
            tbody.innerHTML = '<tr><td colspan="10" class="text-center py-8 text-muted">조건에 일치하는 내역이 없습니다.</td></tr>';
            this.renderActivitiesPagination(0, 1, 1);
            return;
        }

        let html = '';
        pageItems.forEach(it => {
            const isBithumb = it.exchange === 'BITHUMB';
            const badgeClass = this.getActivityBadgeClass(it.type);
            const profitClass = this.getProfitColorClass(it.realizedProfit || 0);
            const name = typeof UpbitAPI !== 'undefined' ? UpbitAPI.getKoreanName(it.market || it.coinSymbol) : (it.market || it.coinSymbol || '');
            const isKrw = (it.type && it.type.includes('원화')) || it.coinSymbol === 'KRW';

            const qtyStr = isKrw 
                ? this.formatCurrency(it.amount || it.quantity) 
                : (it.quantity ? Number(it.quantity).toLocaleString(undefined, { maximumFractionDigits: 8 }) : '-') + ' ' + (it.coinSymbol !== 'KRW' ? it.coinSymbol : '');
            const feeStr = it.fee > 0 
                ? (isKrw ? this.formatCurrency(it.fee) : it.fee + ' ' + it.coinSymbol) 
                : (isKrw ? '0원' : '0 ' + (it.coinSymbol !== 'KRW' ? it.coinSymbol : '원'));
            const settlementStr = isKrw 
                ? this.formatCurrency(it.settlement || it.amount) 
                : (it.category === 'transfer' ? (it.settlement || it.quantity).toLocaleString(undefined, { maximumFractionDigits: 8 }) + ' ' + it.coinSymbol : this.formatCurrency(it.settlement));

            html += '<tr>' +
                '<td><span class="badge ' + (isBithumb ? 'badge-bithumb' : 'badge-upbit') + '">' + (it.exchange || 'UPBIT') + '</span></td>' +
                '<td class="text-xs text-muted">' + (it.time || '-') + '</td>' +
                '<td><div class="flex-center-gap"><span class="coin-symbol-badge-sm">' + it.coinSymbol + '</span><span class="font-bold">' + name + '</span></div></td>' +
                '<td><span class="badge ' + badgeClass + '">' + it.type + '</span></td>' +
                '<td class="text-right font-medium">' + qtyStr + '</td>' +
                '<td class="text-right">' + (it.price > 1 ? this.formatCurrency(it.price) : (isKrw ? '1원' : '-')) + '</td>' +
                '<td class="text-right font-medium">' + (it.amount ? this.formatCurrency(it.amount) : qtyStr) + '</td>' +
                '<td class="text-right text-muted">' + feeStr + '</td>' +
                '<td class="text-right font-medium">' + settlementStr + '</td>' +
                '<td class="text-right ' + (it.type === '매도' ? profitClass : 'text-muted') + '">' +
                    (it.type === '매도' && it.realizedProfit !== undefined ? '<div class="font-bold">' + (it.realizedProfit > 0 ? '+' : '') + this.formatCurrency(it.realizedProfit) + '</div><div class="text-xs">' + (it.realizedRoi > 0 ? '+' : '') + it.realizedRoi.toFixed(2) + '%</div>' : '-') +
                '</td>' +
            '</tr>';
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
        return 'badge-buy';
    },

    renderActivitiesPagination: function (totalItems, currentPage, totalPages) {
        const paginContainer = document.getElementById('allActivitiesPagination');
        if (!paginContainer) return;

        if (totalItems === 0) {
            paginContainer.innerHTML = '';
            return;
        }

        paginContainer.innerHTML = '<div class="pagination-info text-xs text-muted">총 <strong>' + totalItems + '</strong>건 중 ' + ((currentPage - 1) * this.state.activityFilter.pageSize + 1) + ' - ' + Math.min(currentPage * this.state.activityFilter.pageSize, totalItems) + '건</div>' +
            '<div class="pagination-controls">' +
                '<button class="btn btn-sm" ' + (currentPage === 1 ? 'disabled' : '') + ' onclick="App.goToActivityPage(1)">«</button>' +
                '<button class="btn btn-sm" ' + (currentPage === 1 ? 'disabled' : '') + ' onclick="App.goToActivityPage(' + (currentPage - 1) + ')">‹ 이전</button>' +
                '<span class="page-current text-sm px-2 font-bold">' + currentPage + ' / ' + totalPages + '</span>' +
                '<button class="btn btn-sm" ' + (currentPage === totalPages ? 'disabled' : '') + ' onclick="App.goToActivityPage(' + (currentPage + 1) + ')">다음 ›</button>' +
                '<button class="btn btn-sm" ' + (currentPage === totalPages ? 'disabled' : '') + ' onclick="App.goToActivityPage(' + totalPages + ')">»</button>' +
            '</div>';
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
            tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-muted">월별 거래 데이터가 없습니다.</td></tr>';
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

            html += '<tr>' +
                '<td class="font-bold">' + m.period + '</td>' +
                '<td class="text-right ' + profitClass + ' font-bold">' + (m.realizedProfit > 0 ? '+' : '') + this.formatCurrency(m.realizedProfit) + '</td>' +
                '<td class="text-right">' + this.formatCurrency(m.buyVolume) + '</td>' +
                '<td class="text-right">' + this.formatCurrency(m.sellVolume) + '</td>' +
                '<td class="text-right font-medium">' + this.formatCurrency(m.totalVolume) + '</td>' +
                '<td class="text-right text-muted">' + this.formatCurrency(m.totalFees) + '</td>' +
                '<td class="text-center"><span class="font-bold">' + m.winRate.toFixed(0) + '%</span> <span class="text-xs text-muted">(' + m.winCount + '승 ' + m.lossCount + '패 / ' + m.tradesCount + '건)</span></td>' +
            '</tr>';
        });

        tbody.innerHTML = html;
        ColumnManager.applyVisibility('monthlyTable');
    },

    formatCurrency: function (num) {
        if (num === undefined || num === null || isNaN(num)) return '0원';
        const rounded = Math.round(num);
        return rounded.toLocaleString('ko-KR') + '원';
    },

    getProfitColorClass: function (num) {
        if (!num || num === 0) return 'text-muted';
        return num > 0 ? 'color-profit-kr' : 'color-loss-kr';
    },

    saveTrades: function () {
        AnalyzerStorage.saveTrades(this.state.rawTrades);
        this.updateUserBanner();
    },

    loadSavedTrades: function () {
        const uid = AnalyzerStorage.getCurrentUserId();
        if (!uid) {
            this.state.rawTrades = [];
            this.recalculate();
            return;
        }

        const saved = AnalyzerStorage.getTrades();
        if (Array.isArray(saved) && saved.length > 0) {
            this.state.rawTrades = saved;
            this.recalculate();
            this.fetchLiveTickers(false);
        } else {
            this.state.rawTrades = [];
            this.recalculate();
        }
        this.updateUserBanner();
    },

    clearDataWithConfirm: function () {
        if (confirm('현재 계정의 저장된 모든 거래 내역 데이터를 삭제하시겠습니까?\\n삭제 후 복구할 수 없습니다.')) {
            this.state.rawTrades = [];
            this.state.reportData = null;
            AnalyzerStorage.clearUserData();
            this.recalculate();
            this.updateUserBanner();
            this.showToast('현재 계정의 모든 거래 데이터가 깨끗하게 초기화되었습니다.', 'info');
        }
    },

    exportCurrentActivitiesCSV: function () {
        if (this.state.reportData && this.state.reportData.allActivities) {
            Exporter.exportCSV(this.state.reportData.allActivities);
        } else {
            this.showToast('내보낼 거래 내역이 없습니다.', 'error');
        }
    },

    updateUserBanner: function () {
        const u = window.currentUser || (function() { try { return JSON.parse(localStorage.getItem('coinhub_user')); } catch(e){ return null; } })();
        const nameEl = document.getElementById('analyzerCurrentUserName');
        const badgeEl = document.getElementById('analyzerUserModeBadge');
        const countEl = document.getElementById('analyzerSavedCountBadge');
        const settingsNameEl = document.getElementById('settingsUsernameDisplay');
        const settingsCountEl = document.getElementById('settingsSavedCountDisplay');

        const countText = '저장된 거래: ' + (this.state.rawTrades ? this.state.rawTrades.length : 0) + '건';

        if (u && u.username) {
            if (nameEl) nameEl.textContent = u.username;
            if (badgeEl) badgeEl.textContent = '👤 ' + u.username + ' 님 전용 격리 저장소';
            if (settingsNameEl) settingsNameEl.textContent = u.username;
        }
        if (countEl) countEl.textContent = countText;
        if (settingsCountEl) settingsCountEl.textContent = countText;
    },

    switchUser: function (user) {
        this.checkAuthStatus();
        if (user && user.username) {
            this.showToast(user.username + ' 님의 개인 거래 데이터 보관함으로 전환되었습니다.', 'info');
        }
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
        toast.className = 'toast toast-' + type;
        toast.innerHTML = '<div class="toast-content">' + message + '</div><button class="toast-close">&times;</button>';

        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.remove();
        });

        container.appendChild(toast);
        setTimeout(() => {
            toast.remove();
        }, 3500);
    },

    updateTrackerUI: function() {
        if (!this.state.reportData) return;
        
        const elTotalAssets = document.getElementById('tracker-total-assets');
        const elUnrealized = document.getElementById('tracker-unrealized-pnl');
        const elTopHoldings = document.getElementById('tracker-top-holdings');
        const elHoldingsBar = document.getElementById('tracker-holdings-bar');
        
        if (elTotalAssets) {
            const total = Math.round(this.state.reportData.totalCurrentValue || 0);
            elTotalAssets.innerText = total.toLocaleString(undefined, {maximumFractionDigits:0}) + ' ₩';
        }
        if (elUnrealized) {
            const upnl = Math.round(this.state.reportData.totalUnrealizedProfit || 0);
            elUnrealized.innerText = (upnl > 0 ? '+' : '') + upnl.toLocaleString(undefined, {maximumFractionDigits:0}) + ' ₩';
            elUnrealized.className = 'text-lg font-bold ' + (upnl > 0 ? 'text-emerald-400' : (upnl < 0 ? 'text-rose-400' : 'text-slate-100'));
        }
        
        if (elTopHoldings && elHoldingsBar) {
            const held = this.state.reportData.coinSummaries.filter(c => c.holdingQty > 0);
            held.sort((a,b) => (b.currentValue || (b.holdingQty * b.avgBuyPrice)) - (a.currentValue || (a.holdingQty * a.avgBuyPrice)));
            
            let totalVal = held.reduce((sum, c) => sum + (c.currentValue || (c.holdingQty * c.avgBuyPrice)), 0);
            if (totalVal <= 0) {
                elTopHoldings.innerText = '보유 자산 없음';
                elHoldingsBar.innerHTML = '';
            } else {
                let top3 = held.slice(0, 3);
                elTopHoldings.innerText = top3.map(c => c.coin + ' (' + Math.round(((c.currentValue || (c.holdingQty * c.avgBuyPrice)) / totalVal) * 100) + '%)').join(', ');
                
                const colors = ['bg-indigo-500', 'bg-purple-500', 'bg-cyan-500', 'bg-slate-700'];
                let barHtml = '';
                let accumulatedPct = 0;
                top3.forEach((c, idx) => {
                    let pct = ((c.currentValue || (c.holdingQty * c.avgBuyPrice)) / totalVal) * 100;
                    accumulatedPct += pct;
                    barHtml += `<div class="h-full ${colors[idx]}" style="width: ${pct}%"></div>`;
                });
                if (accumulatedPct < 100) {
                    barHtml += `<div class="h-full bg-slate-700" style="width: ${100 - accumulatedPct}%"></div>`;
                }
                elHoldingsBar.innerHTML = barHtml;
            }
        }
    }
};

if (typeof window !== 'undefined') {
    window.AnalyzerStorage = AnalyzerStorage;
    window.ColumnManager = ColumnManager;
    window.AnalyzerApp = App;
    window.App = App;

    if (!window._analyzerTickerInterval) {
        window._analyzerTickerInterval = setInterval(() => {
            const analyzerTab = document.getElementById('tab-analyzer');
            if (analyzerTab && !analyzerTab.classList.contains('hidden') && App && App.state && App.state.reportData) {
                App.fetchLiveTickers(false);
            }
        }, 12000);
    }
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { App.init(); });
    } else {
        App.init();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AnalyzerStorage, ColumnManager, App };
}

