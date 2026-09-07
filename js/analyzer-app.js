/**
 * analyzer-app.js
 * 업비트 & 빗썸 코인 거래내역 분석기 (로그인 회원 전용 100% 로컬 독립 보관 엔진)
 */

const AnalyzerDB = {
    dbPromise: null,
    getDB: function () {
        if (!this.dbPromise) {
            this.dbPromise = new Promise((resolve) => {
                if (typeof indexedDB === 'undefined') return resolve(null);
                const req = indexedDB.open('CoinHubAnalyzerDB', 2);
                req.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains('tradesStore')) {
                        db.createObjectStore('tradesStore');
                    }
                };
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => resolve(null);
            });
        }
        return this.dbPromise;
    },
    saveTrades: async function (trades, uid) {
        try {
            const db = await this.getDB();
            if (!db) return;
            const targetUid = uid || (typeof AnalyzerStorage !== 'undefined' ? AnalyzerStorage.getCurrentUserId() : 'user_default');
            const tx = db.transaction('tradesStore', 'readwrite');
            tx.objectStore('tradesStore').put(trades, 'trades_' + targetUid);
        } catch (e) {
            console.warn('IndexedDB save failed:', e);
        }
    },
    getTrades: async function (uid) {
        try {
            const db = await this.getDB();
            if (!db) return null;
            const targetUid = uid || (typeof AnalyzerStorage !== 'undefined' ? AnalyzerStorage.getCurrentUserId() : 'user_default');
            return new Promise((resolve) => {
                const tx = db.transaction('tradesStore', 'readonly');
                const req = tx.objectStore('tradesStore').get('trades_' + targetUid);
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => resolve(null);
            });
        } catch (e) {
            return null;
        }
    },
    clear: async function (uid) {
        try {
            const db = await this.getDB();
            if (!db) return;
            const targetUid = uid || (typeof AnalyzerStorage !== 'undefined' ? AnalyzerStorage.getCurrentUserId() : 'user_default');
            const tx = db.transaction('tradesStore', 'readwrite');
            tx.objectStore('tradesStore').delete('trades_' + targetUid);
        } catch (e) {}
    }
};

const AnalyzerStorage = {
    getCurrentUserId: function () {
        try {
            const userStr = localStorage.getItem('coinhub_user') || localStorage.getItem('crytopnl_user');
            if (userStr) {
                const user = JSON.parse(userStr);
                const nick = user.username || user.nickname;
                if (nick) return 'user_' + String(nick).trim().toLowerCase().replace(/[^a-zA-Z0-9가-힣]/g, '');
            }
            const nickLegacy = localStorage.getItem('coinhub_nickname') || localStorage.getItem('crytopnl_nickname');
            if (nickLegacy) return 'user_' + String(nickLegacy).trim().toLowerCase().replace(/[^a-zA-Z0-9가-힣]/g, '');
        } catch (e) {}
        return 'user_default';
    },
    
    getKey: function (key) {
        const uid = this.getCurrentUserId();
        return 'coinhub_' + uid + '_' + key;
    },

    healTrades: function (parsed) {
        if (!Array.isArray(parsed) || parsed.length === 0) return [];
        return parsed.map(item => {
            // MATIC -> POL 심볼 표준화만 안전하게 보정하고, 엑셀 파싱 시 결정된 원본 exchange/market/수량/단가는 100% 무손실 보존
            if (item.coinSymbol === 'MATIC') {
                item.coinSymbol = 'POL';
            }
            if (item.market === 'KRW-MATIC') {
                item.market = 'KRW-POL';
            }
            return item;
        });
    },

    getTrades: function () {
        try {
            const saved = localStorage.getItem(this.getKey('trades'));
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return this.healTrades(parsed);
                }
            }
        } catch (e) {
            console.error('로컬스토리지 거래 내역 로드 실패:', e);
        }
        return [];
    },

    saveTrades: function (trades) {
        if (!Array.isArray(trades)) return;
        const uid = this.getCurrentUserId();
        // 1. 계정 전용 IndexedDB 키에 영구 보관
        if (typeof AnalyzerDB !== 'undefined') {
            AnalyzerDB.saveTrades(trades, uid);
        }
        // 2. 계정 전용 localStorage 키에 보관
        try {
            const json = JSON.stringify(trades);
            if (json.length < 2.5 * 1024 * 1024) {
                localStorage.setItem(this.getKey('trades'), json);
            } else {
                localStorage.removeItem(this.getKey('trades'));
            }
        } catch (e) {
            try {
                localStorage.removeItem(this.getKey('trades'));
            } catch (err) {}
        }
    },

    clearUserData: function () {
        const uid = this.getCurrentUserId();
        try {
            localStorage.removeItem(this.getKey('trades'));
        } catch (e) {}
        if (typeof AnalyzerDB !== 'undefined') {
            AnalyzerDB.clear(uid);
        }
    }
};

const CloudSyncManager = {
    // Mode: 'LOCAL' (default) or 'CLOUD'
    getMode: function () {
        const uid = AnalyzerStorage.getCurrentUserId();
        if (uid === 'user_default') return 'LOCAL';
        return localStorage.getItem('coinhub_storage_mode_' + uid) || 'LOCAL';
    },

    setMode: async function (mode) {
        const uid = AnalyzerStorage.getCurrentUserId();
        if (uid === 'user_default') {
            if (mode === 'CLOUD') {
                if (typeof openAuthModal === 'function') openAuthModal('login');
                return false;
            }
            return true;
        }
        localStorage.setItem('coinhub_storage_mode_' + uid, mode);
        
        if (mode === 'CLOUD') {
            if (App.state && App.state.rawTrades && App.state.rawTrades.length > 0) {
                await this.saveToCloud(App.state.rawTrades);
                App.showToast('☁️ 현재 거래 내역 ' + App.state.rawTrades.length + '건이 클라우드 DB에 안전하게 동기화되었습니다!', 'success');
            } else {
                const loaded = await this.loadFromCloud();
                if (loaded && loaded.length > 0) {
                    App.state.rawTrades = AnalyzerStorage.healTrades(loaded);
                    App.recalculate();
                    App.updateUserBanner();
                    App.showToast('☁️ 클라우드에서 ' + loaded.length + '건의 거래 내역을 성공적으로 불러왔습니다!', 'success');
                } else {
                    App.showToast('☁️ 클라우드 동기화 모드가 활성화되었습니다. 모든 기기에서 접속 가능합니다.', 'success');
                }
            }
        } else {
            App.showToast('🔒 100% 로컬 기기 보관 모드로 전환되었습니다. 서버 전송 0% 프라이버시가 유지됩니다.', 'info');
        }
        this.updateUI();
        this.renderModalState();
        return true;
    },

    saveToCloud: async function (trades) {
        const uid = AnalyzerStorage.getCurrentUserId();
        if (uid === 'user_default' || this.getMode() !== 'CLOUD') return;
        const firestore = window.db || (typeof db !== 'undefined' ? db : null);
        if (!firestore) {
            console.warn('Firestore DB 연결 대기 중');
            return;
        }

        try {
            const CHUNK_SIZE = 2000;
            const chunks = [];
            const safeTrades = Array.isArray(trades) ? trades : [];
            for (let i = 0; i < safeTrades.length; i += CHUNK_SIZE) {
                chunks.push(safeTrades.slice(i, i + CHUNK_SIZE));
            }

            const mainDocRef = firestore.collection('user_trades').doc(uid);
            await mainDocRef.set({
                uid: uid,
                updatedAt: new Date().toISOString(),
                totalCount: safeTrades.length,
                chunkCount: chunks.length
            }, { merge: true });

            const batch = firestore.batch();
            for (let c = 0; c < chunks.length; c++) {
                const chunkDocRef = mainDocRef.collection('chunks').doc('chunk_' + c);
                batch.set(chunkDocRef, {
                    index: c,
                    tradesJson: JSON.stringify(chunks[c])
                });
            }
            await batch.commit();
        } catch (e) {
            console.error('클라우드 동기화 저장 오류:', e);
        }
    },

    loadFromCloud: async function () {
        const uid = AnalyzerStorage.getCurrentUserId();
        if (uid === 'user_default') return null;
        const firestore = window.db || (typeof db !== 'undefined' ? db : null);
        if (!firestore) return null;

        try {
            const mainDocRef = firestore.collection('user_trades').doc(uid);
            const mainDoc = await mainDocRef.get();
            if (!mainDoc.exists) return null;

            const mainData = mainDoc.data();
            const chunkCount = mainData.chunkCount || 0;
            if (chunkCount === 0) return null;

            const chunksSnapshot = await mainDocRef.collection('chunks').get();
            let allTrades = [];
            const chunkDocs = [];
            chunksSnapshot.forEach(doc => chunkDocs.push(doc.data()));
            chunkDocs.sort((a, b) => a.index - b.index);

            for (const c of chunkDocs) {
                if (c && c.tradesJson) {
                    const parsed = JSON.parse(c.tradesJson);
                    if (Array.isArray(parsed)) {
                        allTrades = allTrades.concat(parsed);
                    }
                }
            }

            if (allTrades.length > 0) {
                localStorage.setItem('coinhub_storage_mode_' + uid, 'CLOUD');
                return allTrades;
            }
        } catch (e) {
            console.error('클라우드 동기화 로드 오류:', e);
        }
        return null;
    },

    deleteFromCloud: async function () {
        const uid = AnalyzerStorage.getCurrentUserId();
        if (uid === 'user_default') return;
        const firestore = window.db || (typeof db !== 'undefined' ? db : null);
        if (!firestore) return;

        try {
            const mainDocRef = firestore.collection('user_trades').doc(uid);
            const chunksSnapshot = await mainDocRef.collection('chunks').get();
            const batch = firestore.batch();
            chunksSnapshot.forEach(doc => batch.delete(doc.ref));
            batch.delete(mainDocRef);
            await batch.commit();
            localStorage.setItem('coinhub_storage_mode_' + uid, 'LOCAL');
        } catch (e) {
            console.error('클라우드 데이터 삭제 오류:', e);
        }
    },

    manualSyncNow: async function () {
        const uid = AnalyzerStorage.getCurrentUserId();
        if (uid === 'user_default') {
            if (typeof openAuthModal === 'function') openAuthModal('login');
            return;
        }
        if (!App.state.rawTrades || App.state.rawTrades.length === 0) {
            App.showToast('동기화할 거래 내역 데이터가 없습니다.', 'error');
            return;
        }
        App.showLoading(true, '클라우드 DB에 안전하게 백업 중...');
        try {
            localStorage.setItem('coinhub_storage_mode_' + uid, 'CLOUD');
            await this.saveToCloud(App.state.rawTrades);
            this.updateUI();
            this.renderModalState();
            App.showToast('🎉 현재 ' + App.state.rawTrades.length + '건의 거래 내역이 클라우드 DB에 안전하게 백업되었습니다!', 'success');
        } catch (e) {
            App.showToast('클라우드 동기화 중 오류가 발생했습니다.', 'error');
        } finally {
            App.showLoading(false);
        }
    },

    purgeCloudDataWithConfirm: async function () {
        const uid = AnalyzerStorage.getCurrentUserId();
        if (uid === 'user_default') return;
        if (confirm('클라우드 DB에 보관된 거래 내역 백업을 완전히 삭제하시겠습니까?\\n(현재 기기의 로컬 데이터는 보존됩니다.)')) {
            await this.deleteFromCloud();
            await this.setMode('LOCAL');
            App.showToast('클라우드 백업 데이터가 완전히 삭제되었으며, 로컬 전용 모드로 변경되었습니다.', 'info');
        }
    },

    updateUI: function () {
        const uid = AnalyzerStorage.getCurrentUserId();
        const mode = this.getMode();
        const badgeEl = document.getElementById('storageModeBadge');
        
        if (badgeEl) {
            if (uid === 'user_default') {
                badgeEl.innerHTML = `
                    <button type="button" onclick="CloudSyncManager.openModal()" class="badge-guest inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer shadow-sm">
                        <i data-lucide="shield" class="w-3.5 h-3.5"></i>
                        <span>🔒 로컬 기기 보관 (비회원)</span>
                        <span class="text-[10px] font-black underline ml-0.5">설정</span>
                    </button>
                `;
            } else if (mode === 'CLOUD') {
                badgeEl.innerHTML = `
                    <button type="button" onclick="CloudSyncManager.openModal()" class="badge-cloud inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black transition cursor-pointer shadow-sm">
                        <i data-lucide="cloud" class="w-3.5 h-3.5 animate-pulse"></i>
                        <span>☁️ 클라우드 동기화 (회원)</span>
                        <span class="text-[10px] font-black underline ml-0.5">변경</span>
                    </button>
                `;
            } else {
                badgeEl.innerHTML = `
                    <button type="button" onclick="CloudSyncManager.openModal()" class="badge-local inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black transition cursor-pointer shadow-sm">
                        <i data-lucide="shield-check" class="w-3.5 h-3.5"></i>
                        <span>🔒 100% 로컬 보관 (회원)</span>
                        <span class="text-[10px] font-black underline ml-0.5">변경</span>
                    </button>
                `;
            }
            if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
        }
    },

    openModal: function () {
        const modal = document.getElementById('storage-sync-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.style.setProperty('display', 'flex', 'important');
            this.renderModalState();
            if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
        }
    },

    closeModal: function () {
        const modal = document.getElementById('storage-sync-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.style.setProperty('display', 'none', 'important');
        }
    },

    renderModalState: function () {
        const uid = AnalyzerStorage.getCurrentUserId();
        const mode = this.getMode();
        const isGuest = (uid === 'user_default');

        const optLocal = document.getElementById('storageOptLocal');
        const optCloud = document.getElementById('storageOptCloud');
        const guestNotice = document.getElementById('storageGuestNotice');
        const memberControl = document.getElementById('storageMemberControl');

        if (guestNotice && memberControl) {
            if (isGuest) {
                guestNotice.classList.remove('hidden');
                guestNotice.style.setProperty('display', 'block', 'important');
                memberControl.classList.add('hidden');
                memberControl.style.setProperty('display', 'none', 'important');
            } else {
                guestNotice.classList.add('hidden');
                guestNotice.style.setProperty('display', 'none', 'important');
                memberControl.classList.remove('hidden');
                memberControl.style.setProperty('display', 'block', 'important');
            }
        }

        if (optLocal && optCloud) {
            if (mode === 'LOCAL') {
                optLocal.classList.add('border-cyan-500', 'bg-cyan-950/40');
                optLocal.classList.remove('border-navy-800', 'bg-navy-950');
                optCloud.classList.remove('border-cyan-500', 'bg-cyan-950/40');
                optCloud.classList.add('border-navy-800', 'bg-navy-950');
            } else {
                optCloud.classList.add('border-cyan-500', 'bg-cyan-950/40');
                optCloud.classList.remove('border-navy-800', 'bg-navy-950');
                optLocal.classList.remove('border-cyan-500', 'bg-cyan-950/40');
                optLocal.classList.add('border-navy-800', 'bg-navy-950');
            }
        }
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

        if (typeof TableResizeManager !== 'undefined') {
            TableResizeManager.makeResizable(tableId);
        }
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

        container.innerHTML = '<div class="col-dropdown">' +
            '<button class="btn btn-sm btn-outline col-dropdown-btn">⚙️ 컬럼 설정 ▼</button>' +
            '<div class="col-dropdown-menu">' +
                '<div class="col-dropdown-header">표시할 컬럼 선택</div>' +
                itemsHtml +
                '<div style="border-top: 1px solid var(--border-color, rgba(255,255,255,0.1)); margin-top: 6px; padding-top: 6px;">' +
                    '<button type="button" class="btn-reset-widths" data-table="' + tableId + '" style="background: none; border: none; color: var(--text-muted, #94a3b8); font-size: 0.75rem; cursor: pointer; padding: 4px 6px; width: 100%; text-align: left; transition: color 0.15s;">↺ 컬럼 너비 기본값으로 초기화</button>' +
                '</div>' +
            '</div>' +
        '</div>';

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

            const resetBtn = container.querySelector('.btn-reset-widths');
            if (resetBtn) {
                resetBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    TableResizeManager.resetTableWidths(tableId);
                    menu.classList.remove('show');
                    if (typeof App !== 'undefined' && App.showToast) {
                        App.showToast('컬럼 너비가 기본값으로 초기화되었습니다.', 'info');
                    }
                });
            }

            document.addEventListener('click', (e) => {
                if (!container.contains(e.target)) {
                    menu.classList.remove('show');
                }
            });
        }
    }
};

const TableResizeManager = {
    tables: ['coinsTable', 'transfersTable', 'allActivitiesTable', 'monthlyTable'],

    init: function () {
        this.tables.forEach(tableId => {
            this.makeResizable(tableId);
        });
    },

    getSavedWidths: function (tableId) {
        try {
            const saved = localStorage.getItem('coinhub_col_widths_' + tableId);
            if (saved) return JSON.parse(saved);
        } catch (e) {}
        return {};
    },

    saveWidths: function (tableId, widths) {
        try {
            localStorage.setItem('coinhub_col_widths_' + tableId, JSON.stringify(widths));
        } catch (e) {}
    },

    makeResizable: function (tableId) {
        const table = document.getElementById(tableId);
        if (!table) return;

        const thead = table.querySelector('thead');
        if (!thead) return;

        const thList = thead.querySelectorAll('tr:first-child th');
        if (!thList || thList.length === 0) return;

        const savedWidths = this.getSavedWidths(tableId);

        thList.forEach((th, colIdx) => {
            th.classList.add('resizable-th');
            const colKey = th.dataset.sort || ('col_' + colIdx);

            if (savedWidths[colKey]) {
                const w = savedWidths[colKey];
                th.style.width = w + 'px';
                th.style.minWidth = w + 'px';
            }

            if (th.querySelector('.col-resizer')) return;

            const resizer = document.createElement('div');
            resizer.className = 'col-resizer';
            resizer.setAttribute('title', '드래그: 너비 조절 / 더블클릭: 기본값');

            resizer.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
            });

            resizer.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.preventDefault();

                const startX = e.pageX;
                const startWidth = th.offsetWidth;
                resizer.classList.add('is-resizing');
                document.body.classList.add('resizing-col');

                const onMouseMove = (moveEvent) => {
                    moveEvent.preventDefault();
                    const diff = moveEvent.pageX - startX;
                    const newWidth = Math.max(45, startWidth + diff);
                    th.style.width = newWidth + 'px';
                    th.style.minWidth = newWidth + 'px';
                };

                const onMouseUp = (upEvent) => {
                    upEvent.preventDefault();
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);

                    resizer.classList.remove('is-resizing');
                    document.body.classList.remove('resizing-col');

                    const currentWidths = TableResizeManager.getSavedWidths(tableId);
                    currentWidths[colKey] = th.offsetWidth;
                    TableResizeManager.saveWidths(tableId, currentWidths);
                };

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });

            resizer.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                e.preventDefault();
                th.style.width = '';
                th.style.minWidth = '';
                const currentWidths = TableResizeManager.getSavedWidths(tableId);
                delete currentWidths[colKey];
                TableResizeManager.saveWidths(tableId, currentWidths);
            });

            th.appendChild(resizer);
        });
    },

    resetTableWidths: function (tableId) {
        try {
            localStorage.removeItem('coinhub_col_widths_' + tableId);
            const table = document.getElementById(tableId);
            if (table) {
                table.querySelectorAll('thead th').forEach(th => {
                    th.style.width = '';
                    th.style.minWidth = '';
                });
            }
        } catch (e) {}
    }
};

const TRADING_SETUPS = {
    pullback: {
        id: 'pullback',
        name: '눌림목 / 지지선 반등',
        badgeBg: 'rgba(6, 182, 212, 0.15)',
        badgeColor: '#06b6d4',
        border: 'rgba(6, 182, 212, 0.3)',
        icon: '🎯',
        desc: '주요 지지선 또는 피보나치/이평선 눌림목 반등 확인 후 진입'
    },
    breakout: {
        id: 'breakout',
        name: '돌파 매매 / 변동성 돌파',
        badgeBg: 'rgba(59, 130, 246, 0.15)',
        badgeColor: '#3b82f6',
        border: 'rgba(59, 130, 246, 0.3)',
        icon: '🚀',
        desc: '주요 저항선, 전고점 돌파 또는 박스권 상단 거래량 실린 돌파 진입'
    },
    trend: {
        id: 'trend',
        name: '추세 추종 / 이평 정배열',
        badgeBg: 'rgba(16, 185, 129, 0.15)',
        badgeColor: '#10b981',
        border: 'rgba(16, 185, 129, 0.3)',
        icon: '🌊',
        desc: '중장기 상승 추세선 및 이동평균선 정배열 국면에서 모멘텀 편승'
    },
    scalping: {
        id: 'scalping',
        name: '단타 / 스캘핑',
        badgeBg: 'rgba(245, 158, 11, 0.15)',
        badgeColor: '#f59e0b',
        border: 'rgba(245, 158, 11, 0.3)',
        icon: '⚡',
        desc: '분봉/호가창 기반의 초단기 거래, 빠른 손익 실현'
    },
    dca: {
        id: 'dca',
        name: '분할 매수 / DCA 적립식',
        badgeBg: 'rgba(139, 92, 246, 0.15)',
        badgeColor: '#8b5cf6',
        border: 'rgba(139, 92, 246, 0.3)',
        icon: '🧱',
        desc: '정기적 또는 가격 하락 구간마다 계획적인 분할 매수 후 익절'
    },
    news: {
        id: 'news',
        name: '공시 / 호재 / 뉴스 매매',
        badgeBg: 'rgba(236, 72, 153, 0.15)',
        badgeColor: '#ec4899',
        border: 'rgba(236, 72, 153, 0.3)',
        icon: '📢',
        desc: '상장, 메인넷, 파트너십, 거시 경제 발표 등 재료 기반 매매'
    },
    fomo: {
        id: 'fomo',
        name: '뇌동 매매 / 충동 진입',
        badgeBg: 'rgba(244, 63, 94, 0.15)',
        badgeColor: '#f43f5e',
        border: 'rgba(244, 63, 94, 0.3)',
        icon: '⚠️',
        desc: '급등 추격 매수 또는 원칙 없는 충동적 감정 매매 (개선 필요)'
    },
    general: {
        id: 'general',
        name: '일반 / 미분류',
        badgeBg: 'rgba(100, 116, 139, 0.15)',
        badgeColor: '#94a3b8',
        border: 'rgba(100, 116, 139, 0.3)',
        icon: '📦',
        desc: '특별한 셋업 분류 없이 진행된 기본 매매'
    }
};

const TRADE_EMOTIONS = {
    calm: { id: 'calm', label: '😊 침착·원칙준수', color: '#10b981' },
    greedy: { id: 'greedy', label: '🤑 탐욕·흥분', color: '#f59e0b' },
    fear: { id: 'fear', label: '😰 불안·공포', color: '#8b5cf6' },
    revenge: { id: 'revenge', label: '😡 뇌동·분노', color: '#f43f5e' }
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
            monthlyTable: { col: 'period', asc: false },
            journalTable: { col: 'time', asc: false }
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
        },
        journalFilter: {
            exchange: 'ALL',
            setup: 'ALL',
            emotion: 'ALL',
            result: 'ALL',
            market: 'ALL',
            search: '',
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
            if (typeof TableResizeManager !== 'undefined') {
                TableResizeManager.init();
            }
            
            if (typeof UpbitAPI !== 'undefined' && UpbitAPI.initMarketInfo) {
                await UpbitAPI.initMarketInfo();
            }
            
            this.checkAuthStatus();
            await this.loadSavedTrades();
            this.initJournalDB();
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

        const btnCoinsAll = document.getElementById('btnCoinsFilterAll');
        const btnCoinsHolding = document.getElementById('btnCoinsFilterHolding');
        if (btnCoinsAll) btnCoinsAll.addEventListener('click', () => this.setCoinsFilterMode('ALL'));
        if (btnCoinsHolding) btnCoinsHolding.addEventListener('click', () => this.setCoinsFilterMode('HOLDING'));

        // 파일 드래그 & 드롭 및 선택
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');

        if (dropZone && fileInput) {
            dropZone.addEventListener('click', () => {
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
        this.bindTableSorting('journalTable');

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

    handleSortClick: function (tableId, sortKey) {
        if (!this.state.sortStates[tableId]) {
            this.state.sortStates[tableId] = { col: sortKey, asc: false };
        }
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
        else if (tableId === 'journalTable') this.renderJournalTable();
    },

    bindTableSorting: function (tableId) {
        const table = document.getElementById(tableId);
        if (!table) return;

        const thead = table.querySelector('thead');
        if (!thead) return;

        thead.onclick = (e) => {
            if (e.target.closest('.col-resizer')) return;
            const th = e.target.closest('th[data-sort]');
            if (!th) return;
            const sortKey = th.dataset.sort;
            if (sortKey) {
                this.handleSortClick(tableId, sortKey);
            }
        };

        table.querySelectorAll('thead th[data-sort]').forEach(th => {
            th.style.cursor = 'pointer';
            th.style.userSelect = 'none';
        });
    },

    setCoinsFilterMode: function (mode) {
        this.state.coinsFilterMode = mode;
        const btnAll = document.getElementById('btnCoinsFilterAll');
        const btnHolding = document.getElementById('btnCoinsFilterHolding');
        if (btnAll) {
            btnAll.classList.toggle('btn-primary', mode === 'ALL');
            btnAll.classList.toggle('btn-outline', mode !== 'ALL');
        }
        if (btnHolding) {
            btnHolding.classList.toggle('btn-primary', mode === 'HOLDING');
            btnHolding.classList.toggle('btn-outline', mode !== 'HOLDING');
        }
        this.renderCoinsTable();
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
        } else if (tabId === "journal") {
            this.renderJournalView();
        } else if (tabId === "settings") {
            this.updateUserBanner();
            this.updateCalcMethodUI();
        }
    },
    switchTab: function (tabId) { this.switchSubTab(tabId); },

    handleFiles: async function (fileList) {
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
        this.renderJournalView();
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

        const totalEvaluatedValue = Math.max(0, (s.currentPortfolioCost || 0) + totalUnrealized);
        const totalEvalEl = document.getElementById('cardTotalEvaluatedValue');
        const holdValEl = document.getElementById('cardCurrentHoldingValue');
        if (totalEvalEl) totalEvalEl.textContent = this.formatCurrency(totalEvaluatedValue);
        if (holdValEl) holdValEl.textContent = this.formatCurrency(totalEvaluatedValue);

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

        // 1. Pre-calculate all price, value, profit, and stacking fields BEFORE sorting
        coins.forEach(coin => {
            const sym = (coin.coinSymbol || (coin.market ? coin.market.replace('KRW-', '') : '')).toUpperCase();
            coin.koreanName = coin.koreanName || (typeof UpbitAPI !== 'undefined' ? UpbitAPI.getKoreanName(coin.market) : coin.coinSymbol);

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
            if (hQty > 1e-4 && currentPrice > 0 && (hQty * currentPrice >= 100) && hCost >= 100) {
                coin.unrealizedProfit = (hQty * currentPrice) - hCost;
                coin.unrealizedRoi = hCost > 0 ? (coin.unrealizedProfit / hCost) * 100 : 0;
                coin.currentValue = hQty * currentPrice;
            } else {
                coin.holdingQty = 0;
                coin.holdingCost = 0;
                coin.unrealizedProfit = 0;
                coin.unrealizedRoi = 0;
                coin.currentValue = 0;
            }

            if (coin.currentPrice > 0) {
                coin.gainedCoinQty = (coin.realizedProfit || 0) / coin.currentPrice;
                coin.gainedCoinRoi = (coin.totalBuyQty || 0) > 0 ? (coin.gainedCoinQty / coin.totalBuyQty) * 100 : 0;
            }
        });

        // 2. Perform robust numerical / alphabetical sorting on master array
        const sort = this.state.sortStates.coinsTable;
        coins.sort((a, b) => {
            let valA = 0;
            let valB = 0;

            if (sort.col === 'coin') {
                valA = a.coinSymbol || '';
                valB = b.coinSymbol || '';
                return sort.asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
            } else if (sort.col === 'gainedCoin') {
                valA = parseFloat(a.gainedCoinQty) || 0;
                valB = parseFloat(b.gainedCoinQty) || 0;
            } else if (sort.col === 'holdingQty') {
                valA = parseFloat(a.holdingQty) || 0;
                valB = parseFloat(b.holdingQty) || 0;
            } else if (sort.col === 'avgBuyPrice') {
                valA = parseFloat(a.avgBuyPrice) || 0;
                valB = parseFloat(b.avgBuyPrice) || 0;
            } else if (sort.col === 'currentPrice') {
                valA = parseFloat(a.currentPrice) || 0;
                valB = parseFloat(b.currentPrice) || 0;
            } else if (sort.col === 'unrealizedProfit') {
                valA = parseFloat(a.unrealizedProfit) || 0;
                valB = parseFloat(b.unrealizedProfit) || 0;
            } else if (sort.col === 'realizedProfit') {
                valA = parseFloat(a.realizedProfit) || 0;
                valB = parseFloat(b.realizedProfit) || 0;
            } else if (sort.col === 'totalBuyAmount') {
                valA = parseFloat(a.totalBuyAmount) || 0;
                valB = parseFloat(b.totalBuyAmount) || 0;
            } else if (sort.col === 'totalSellAmount') {
                valA = parseFloat(a.totalSellAmount) || 0;
                valB = parseFloat(b.totalSellAmount) || 0;
            } else if (sort.col === 'totalFee') {
                valA = parseFloat(a.totalFee) || 0;
                valB = parseFloat(b.totalFee) || 0;
            } else if (sort.col === 'winRate') {
                valA = parseFloat(a.winRate) || 0;
                valB = parseFloat(b.winRate) || 0;
            } else {
                valA = a[sort.col] || 0;
                valB = b[sort.col] || 0;
            }

            return sort.asc ? valA - valB : valB - valA;
        });

        if (this.state.reportData) {
            this.state.reportData.coinSummaries = coins;
        }

        // Apply view filter (ALL vs HOLDING) to display list
        let displayCoins = coins;
        if (this.state.coinsFilterMode === 'HOLDING') {
            displayCoins = coins.filter(c => c.holdingQty > 1e-4 && c.holdingCost >= 100);
        }

        if (displayCoins.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" class="text-center py-8 text-muted">' + 
                (this.state.coinsFilterMode === 'HOLDING' ? '현재 보유 중인 코인 잔고가 없습니다. 전체 거래 종목을 확인하려면 상단 [전체 거래 종목]을 클릭하세요.' : '등록된 코인 거래 내역이 없습니다.') + 
                '</td></tr>';
            return;
        }

        // 3. Update header indicators (▲ / ▼)
        const table = document.getElementById('coinsTable');
        if (table) {
            table.querySelectorAll('thead th[data-sort]').forEach(th => {
                const sKey = th.dataset.sort;
                let baseText = th.getAttribute('data-original-title');
                if (!baseText) {
                    baseText = th.textContent.replace(/[ ⬍▲▼]/g, '').trim();
                    th.setAttribute('data-original-title', baseText);
                }
                if (sKey === sort.col) {
                    th.textContent = baseText + (sort.asc ? ' ▲' : ' ▼');
                    th.style.color = '#38bdf8';
                } else {
                    th.textContent = baseText + ' ⬍';
                    th.style.color = '';
                }
            });
        }

        let html = '';
        displayCoins.forEach(coin => {
            const sym = (coin.coinSymbol || (coin.market ? coin.market.replace('KRW-', '') : '')).toUpperCase();
            const coinName = coin.koreanName || (typeof UpbitAPI !== 'undefined' ? UpbitAPI.getKoreanName(coin.market) : coin.coinSymbol);
            const isBithumb = coin.exchange === 'BITHUMB';
            const currentPrice = coin.currentPrice || 0;
            const unprofit = coin.unrealizedProfit || 0;
            const unroi = coin.unrealizedRoi || 0;

            const profitClass = this.getProfitColorClass(coin.realizedProfit);
            const unprofitClass = this.getProfitColorClass(unprofit);
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
                '<td class="text-right"><div>' + (coin.avgBuyPrice > 0 ? this.formatPrice(coin.avgBuyPrice) : '-') + '</div></td>' +
                '<td class="text-right"><div>' + (currentPrice > 0 ? this.formatPrice(currentPrice) : '-') + '</div>' + changeStr + '</td>' +
                '<td class="text-right ' + unprofitClass + '">' + (coin.holdingQty > 0 ? '<div class="font-bold">' + (unprofit > 0 ? '+' : '') + this.formatCurrency(unprofit) + '</div><div class="text-xs">' + (unroi > 0 ? '+' : '') + unroi.toFixed(2) + '%</div>' : '<span class="text-muted">-</span>') + '</td>' +
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

        const journalSelect = document.getElementById('journalCoinFilter');
        if (journalSelect) {
            journalSelect.innerHTML = html;
        }
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
            const feeStr = t.fee > 0 ? (isKrw ? this.formatCurrency(t.fee) : Number(t.fee).toLocaleString(undefined, { maximumFractionDigits: 8 }) + ' ' + t.coinSymbol) : (isKrw ? '0원' : '0 ' + t.coinSymbol);
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
            const isTrade = it.category === 'trade' || it.type === '매수' || it.type === '매도';
            const isBtcOrUsdtMarket = it.market && (it.market.startsWith('BTC-') || it.market.startsWith('USDT-'));
            const feeIsKrw = (isTrade && !isBtcOrUsdtMarket) || isKrw || (it.market && it.market.startsWith('KRW-'));

            const qtyStr = isKrw 
                ? this.formatCurrency(it.amount || it.quantity) 
                : (it.quantity ? Number(it.quantity).toLocaleString(undefined, { maximumFractionDigits: 8 }) : '-') + ' ' + (it.coinSymbol !== 'KRW' ? it.coinSymbol : '');
            
            let feeStr = '0원';
            if (feeIsKrw) {
                feeStr = it.fee > 0 ? this.formatCurrency(it.fee) : '0원';
            } else {
                const feeUnit = isBtcOrUsdtMarket ? it.market.split('-')[0] : (it.coinSymbol || '');
                feeStr = it.fee > 0 
                    ? (Number(it.fee).toLocaleString(undefined, { maximumFractionDigits: 8 }) + ' ' + feeUnit) 
                    : ('0 ' + feeUnit);
            }

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

    // ==========================================
    // 📓 트레이딩 저널 & 셋업 분석 + 포트폴리오 트래커
    // ==========================================
    getJournalStorage: function () {
        try {
            const saved = localStorage.getItem('coinhub_trade_journal');
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            return {};
        }
    },

    saveJournalStorage: function (data) {
        try {
            localStorage.setItem('coinhub_trade_journal', JSON.stringify(data));
        } catch (e) {
            console.error('저널 로컬 저장 오류:', e);
        }
    },

    initJournalDB: async function () {
        try {
            if (typeof firebase !== 'undefined' && firebase.auth) {
                firebase.auth().onAuthStateChanged(async (user) => {
                    if (user) {
                        const loaded = await this.loadJournalFromDB();
                        if (loaded) {
                            this.renderJournalView(true);
                        }
                    } else {
                        const badge = document.getElementById('journalDbStatusBadge');
                        if (badge) {
                            badge.innerHTML = '💾 로컬 캐시 모드 (로그인 시 DB 자동 연동)';
                            badge.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700 text-[11px] font-bold text-slate-300';
                        }
                    }
                });
            } else {
                await this.loadJournalFromDB();
            }
        } catch (e) {
            console.warn('저널 DB 초기화 오류:', e);
        }
    },

    saveJournalToDB: async function (store) {
        const firestore = window.db || (typeof db !== 'undefined' ? db : null);
        const uid = (typeof AnalyzerStorage !== 'undefined' ? AnalyzerStorage.getCurrentUserId() : null)
            || (window.auth && window.auth.currentUser ? window.auth.currentUser.uid : null);

        const badge = document.getElementById('journalDbStatusBadge');

        if (!firestore || !uid || uid === 'user_default') {
            if (badge) {
                badge.innerHTML = '💾 로컬 캐시 모드 (로그인 시 DB 자동 연동)';
                badge.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700 text-[11px] font-bold text-slate-300';
            }
            return;
        }

        try {
            if (badge) {
                badge.innerHTML = '☁️ DB 저장 중...';
                badge.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-[11px] font-bold text-cyan-300 animate-pulse';
            }

            // 사용자 맞춤 메모, 수동 지정 셋업 및 감정 기록만 필터링하여 1MB 한도 초과 방지
            const entriesToSave = {};
            Object.entries(store).forEach(([k, v]) => {
                if (!v.isAuto || (v.note && v.note.trim()) || (v.emotion && v.emotion !== 'calm')) {
                    entriesToSave[k] = v;
                }
            });

            await firestore.collection('user_trade_journal').doc(uid).set({
                uid: uid,
                updatedAt: new Date().toISOString(),
                journal: entriesToSave
            }, { merge: true });

            if (badge) {
                badge.innerHTML = '☁️ DB 실시간 연동 완료';
                badge.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-[11px] font-bold text-emerald-300';
            }
        } catch (e) {
            console.warn('저널 DB 동기화 오류 (로컬 보관):', e);
            if (badge) {
                badge.innerHTML = '⚠️ DB 동기화 지연 (로컬 안전 보관)';
                badge.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-950/60 border border-amber-500/40 text-[11px] font-bold text-amber-300';
            }
        }
    },

    loadJournalFromDB: async function () {
        const firestore = window.db || (typeof db !== 'undefined' ? db : null);
        const uid = (typeof AnalyzerStorage !== 'undefined' ? AnalyzerStorage.getCurrentUserId() : null)
            || (window.auth && window.auth.currentUser ? window.auth.currentUser.uid : null);

        const badge = document.getElementById('journalDbStatusBadge');

        if (!firestore || !uid || uid === 'user_default') {
            if (badge) {
                badge.innerHTML = '💾 로컬 캐시 모드 (로그인 시 DB 자동 연동)';
                badge.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700 text-[11px] font-bold text-slate-300';
            }
            return false;
        }

        try {
            const docSnap = await firestore.collection('user_trade_journal').doc(uid).get();
            if (docSnap.exists) {
                const data = docSnap.data();
                if (data && data.journal) {
                    const localStore = this.getJournalStorage();
                    const merged = { ...localStore, ...data.journal };
                    this.saveJournalStorage(merged);
                    if (badge) {
                        badge.innerHTML = '☁️ DB 실시간 연동 완료';
                        badge.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-[11px] font-bold text-emerald-300';
                    }
                    return true;
                }
            }
        } catch (e) {
            console.warn('저널 DB 불러오기 실패:', e);
        }
        return false;
    },

    getTradeKey: function (t) {
        return (t.id || (t.time + '_' + (t.exchange || 'UPBIT') + '_' + (t.market || t.coinSymbol) + '_' + Math.round(t.price || 0) + '_' + Math.round((t.qty || 0) * 10000)));
    },

    getJournalEntry: function (t) {
        const key = this.getTradeKey(t);
        const store = this.getJournalStorage();
        if (store[key]) {
            const entry = store[key];
            // 과거 알고리즘 버그로 모든 거래가 'pullback'으로 쏠렸던 자동 태깅 데이터 보정
            if (entry.isAuto || (!entry.note && entry.setup === 'pullback' && !entry.manuallyLocked)) {
                entry.setup = this.autoClassifyTradeSetup(t);
            }
            // 심리 상태도 자동 상태이거나 수동 지정하지 않은 경우 행동 패턴 기반으로 정밀 재추론
            if (entry.isAuto || (!entry.manuallyLocked && (!entry.emotion || entry.emotion === 'calm'))) {
                entry.emotion = this.autoClassifyTradeEmotion(t, entry.setup);
            }
            return entry;
        }
        const defaultSetup = this.autoClassifyTradeSetup(t);
        const defaultEmotion = this.autoClassifyTradeEmotion(t, defaultSetup);
        return { setup: defaultSetup, note: '', emotion: defaultEmotion, isAuto: true };
    },

    saveJournalField: function (tradeKey, field, value) {
        const store = this.getJournalStorage();
        if (!store[tradeKey]) {
            store[tradeKey] = { setup: 'general', note: '', emotion: 'calm' };
        }
        store[tradeKey][field] = value;
        store[tradeKey].isAuto = false;
        store[tradeKey].manuallyLocked = true;
        store[tradeKey].updatedAt = Date.now();
        this.saveJournalStorage(store);
        this.saveJournalToDB(store);

        // 상단 지표 및 셋업 성적표 실시간 재계산
        const realizedTrades = (this.state.reportData && this.state.reportData.trades)
            ? this.state.reportData.trades.filter(t => t.type === '매도' && t.realizedProfit !== undefined)
            : [];
        this.renderJournalKPIs(realizedTrades, store);
        this.renderSetupAnalytics(realizedTrades, store);
        this.renderBestWorstTrades(realizedTrades, store);
    },

    onTradeSetupSelect: function (tradeKey, newSetup) {
        this.saveJournalField(tradeKey, 'setup', newSetup);
        const setupName = TRADING_SETUPS[newSetup]?.name || newSetup;
        this.showToast('🎯 매매 셋업이 "' + setupName + '"(으)로 DB 동기화되었습니다.', 'success');
    },

    onTradeEmotionSelect: function (tradeKey, newEmotion) {
        this.saveJournalField(tradeKey, 'emotion', newEmotion);
        const emotionLabel = TRADE_EMOTIONS[newEmotion]?.label || newEmotion;
        this.showToast('심리 상태가 "' + emotionLabel + '"(으)로 DB에 반영되었습니다.', 'info');
    },

    onTradeNoteChange: function (tradeKey, newNote) {
        this.saveJournalField(tradeKey, 'note', newNote.trim());
        this.showToast('📝 복기 메모가 클라우드 DB에 안전하게 동기화되었습니다.', 'success');
    },

    autoClassifyTradeSetup: function (t) {
        const profit = t.realizedProfit || 0;
        let roi = 0;
        if (t.realizedRoi !== undefined && !isNaN(t.realizedRoi)) {
            roi = Number(t.realizedRoi);
        } else if (t.profitRate !== undefined && !isNaN(t.profitRate)) {
            roi = Number(t.profitRate);
        } else {
            const cost = t.costBasis || t.buyCost || (t.avgBuyPrice && t.qty ? t.avgBuyPrice * t.qty : 0);
            if (cost > 0) {
                roi = (profit / cost) * 100;
            }
        }

        const isWin = profit > 0;
        const sym = (t.coinSymbol || (t.market ? t.market.replace('KRW-', '') : '')).toUpperCase();
        const isMajor = ['BTC', 'ETH', 'SOL', 'XRP'].includes(sym);

        // 1. 뇌동/충동 손실 (fomo): 급락 손절 지연 (-6% 이하 큰 손실 or 50만원 이상 손실 or 복합 손실)
        if (!isWin && (roi <= -6.0 || profit <= -500000 || (roi <= -3.5 && profit <= -150000))) {
            return 'fomo';
        }

        // 2. 호재/공시 급등 (news): 알트코인 대형 급등 익절 (+20% 이상 익절)
        if (isWin && roi >= 20.0 && !['BTC', 'ETH'].includes(sym)) {
            return 'news';
        }

        // 3. 돌파 매매 (breakout): 강력한 슈팅 돌파 (+10% 이상 익절 or 100만원 이상 대형 익절)
        if (isWin && (roi >= 10.0 || profit >= 1000000)) {
            return 'breakout';
        }

        // 4. 단타/스캘핑 (scalping): ±2% 이내의 초단기 짧은 매매
        if ((isWin && roi > 0 && roi <= 2.2) || (!isWin && roi >= -2.0 && roi < 0)) {
            return 'scalping';
        }

        // 5. 추세 추종 (trend): 지속적인 추세 탑승 익절 (+4.5% ~ +10.0%)
        if (isWin && roi >= 4.5 && roi < 10.0) {
            return 'trend';
        }

        // 6. 분할/DCA (dca): 메이저 코인(BTC/ETH/SOL/XRP)의 안정적인 적립식 분할 매수 후 익절 (+2.0% ~ +7.0%)
        if (isMajor && isWin && roi >= 2.0 && roi < 7.0) {
            return 'dca';
        }

        // 7. 눌림목/지지선 반등 (pullback): 지지선 반등 익절 (+2.2% ~ +4.5%) 또는 지지선 이탈 원칙 손절 (-2.0% ~ -6.0%)
        if ((isWin && roi > 2.2 && roi <= 4.5) || (!isWin && roi > -6.0 && roi <= -2.0)) {
            return 'pullback';
        }

        // 8. 일반/미분류 (general): 기본
        return 'general';
    },

    autoClassifyTradeEmotion: function (t, setup) {
        const profit = t.realizedProfit || 0;
        let roi = 0;
        if (t.realizedRoi !== undefined && !isNaN(t.realizedRoi)) {
            roi = Number(t.realizedRoi);
        } else if (t.profitRate !== undefined && !isNaN(t.profitRate)) {
            roi = Number(t.profitRate);
        } else {
            const cost = t.costBasis || t.buyCost || (t.avgBuyPrice && t.qty ? t.avgBuyPrice * t.qty : 0);
            if (cost > 0) roi = (profit / cost) * 100;
        }

        const currentSetup = setup || this.autoClassifyTradeSetup(t);

        // 1. 😡 뇌동·분노 (revenge): fomo 셋업, -6% 이하 큰 손실 방치, 50만원 이상 대형 손실
        if (currentSetup === 'fomo' || roi <= -6.0 || profit <= -500000) {
            return 'revenge';
        }

        // 2. 🤑 탐욕·흥분 (greedy): +12% 이상 급등 익절, news/breakout 셋업, 80만원 이상 대형 익절
        if (roi >= 12.0 || currentSetup === 'news' || currentSetup === 'breakout' || profit >= 800000) {
            return 'greedy';
        }

        // 3. 😰 불안·공포 (fear):
        //    - 손실 공포 패닉컷: -1.5% ~ -6.0% 손절 (지지선 이탈 공포)
        //    - 수익 반납 공포 조기 청산: +0.05% ~ +0.8% 극소 익절 (불안해서 바로 던짐)
        if ((roi < 0 && roi > -6.0) || (profit > 0 && roi > 0 && roi <= 0.8)) {
            return 'fear';
        }

        // 4. 😊 침착·원칙준수 (calm):
        //    - 메이저 적립식 분할 매매 (dca)
        //    - 추세 추종 (trend, +4.5% ~ +10%)
        //    - 단타/스캘핑 정석 익절 (scalping, +0.8% ~ +2.2%)
        //    - 눌림목 지지선 반등 정석 익절 (pullback, +2.2% ~ +4.5%)
        return 'calm';
    },

    autoTagAllTrades: function (forceAll = false) {
        if (!this.state.reportData || !this.state.reportData.trades) {
            this.showToast('분석할 거래 내역이 없습니다. 먼저 엑셀 파일을 업로드하거나 샘플 데이터를 로드하세요.', 'error');
            return;
        }

        const realizedTrades = this.state.reportData.trades.filter(t => t.type === '매도' && t.realizedProfit !== undefined);
        if (realizedTrades.length === 0) {
            this.showToast('분석할 실현 매도 거래가 없습니다.', 'info');
            return;
        }

        const store = this.getJournalStorage();
        let taggedCount = 0;

        realizedTrades.forEach(t => {
            const key = this.getTradeKey(t);
            const shouldTag = !store[key] || store[key].isAuto || (forceAll && !store[key].note && !store[key].manuallyLocked);
            if (shouldTag) {
                const setup = this.autoClassifyTradeSetup(t);
                const emotion = this.autoClassifyTradeEmotion(t, setup);
                store[key] = {
                    setup: setup,
                    note: store[key]?.note || '',
                    emotion: emotion,
                    isAuto: true,
                    updatedAt: Date.now()
                };
                taggedCount++;
            }
        });

        this.saveJournalStorage(store);
        this.saveJournalToDB(store);
        this.renderJournalView(true);
        this.showToast('✨ 총 ' + taggedCount + '건의 거래에 AI 매매 전략 및 심리 상태 정밀 분석 태깅이 완료되었습니다!', 'success');
    },

    resetJournalStorage: function () {
        if (!confirm('저장된 모든 매매 일지 메모와 셋업 설정을 초기화하시겠습니까? (로컬 및 DB 초기화)')) return;
        localStorage.removeItem('coinhub_trade_journal');
        this.saveJournalToDB({});
        this.renderJournalView(true);
        this.showToast('트레이딩 저널 데이터가 초기화되었습니다.', 'info');
    },

    renderJournalView: function (fullTableRender = true) {
        const pane = document.getElementById('journalTab');
        if (!pane) return;

        const realizedTrades = (this.state.reportData && this.state.reportData.trades)
            ? this.state.reportData.trades.filter(t => t.type === '매도' && t.realizedProfit !== undefined)
            : [];
        const journalStore = this.getJournalStorage();

        this.renderJournalKPIs(realizedTrades, journalStore);
        this.renderSetupAnalytics(realizedTrades, journalStore);
        this.renderPortfolioTracker();
        this.renderBestWorstTrades(realizedTrades, journalStore);

        if (fullTableRender) {
            this.renderJournalTable();
        }
    },

    renderJournalKPIs: function (realizedTrades, journalStore) {
        const container = document.getElementById('journalKpiCards');
        if (!container) return;

        if (!realizedTrades || realizedTrades.length === 0) {
            container.innerHTML = `
              <div class="journal-kpi-card p-4 rounded-2xl bg-navy-900/90 border border-navy-800 flex flex-col justify-between">
                <span class="text-xs text-slate-400">총 실현 매도 거래</span>
                <span class="text-xl font-mono font-bold text-white mt-1">0건</span>
                <span class="text-[11px] text-slate-500 mt-2">데이터 업로드 대기</span>
              </div>
              <div class="journal-kpi-card p-4 rounded-2xl bg-navy-900/90 border border-navy-800 flex flex-col justify-between">
                <span class="text-xs text-slate-400">최고 수익 셋업</span>
                <span class="text-xl font-mono font-bold text-emerald-400 mt-1">-</span>
                <span class="text-[11px] text-slate-500 mt-2">수익 기여도 1위</span>
              </div>
              <div class="journal-kpi-card p-4 rounded-2xl bg-navy-900/90 border border-navy-800 flex flex-col justify-between">
                <span class="text-xs text-slate-400">최대 손실 셋업</span>
                <span class="text-xl font-mono font-bold text-rose-400 mt-1">-</span>
                <span class="text-[11px] text-slate-500 mt-2">리스크 개선 필요</span>
              </div>
              <div class="journal-kpi-card p-4 rounded-2xl bg-navy-900/90 border border-navy-800 flex flex-col justify-between">
                <span class="text-xs text-slate-400">포트폴리오 자산 배분</span>
                <span class="text-xl font-mono font-bold text-cyan-400 mt-1">-</span>
                <span class="text-[11px] text-slate-500 mt-2">자산 진단 대기</span>
              </div>
            `;
            return;
        }

        const totalTrades = realizedTrades.length;
        let winTrades = 0;
        let lossTrades = 0;
        let totalRealized = 0;

        // Group by setup
        const setupStats = {};
        Object.keys(TRADING_SETUPS).forEach(sId => {
            setupStats[sId] = { id: sId, count: 0, win: 0, loss: 0, profit: 0 };
        });

        realizedTrades.forEach(t => {
            const key = this.getTradeKey(t);
            const entry = journalStore[key] || { setup: this.autoClassifyTradeSetup(t) };
            const sId = entry.setup && setupStats[entry.setup] ? entry.setup : 'general';
            const p = t.realizedProfit || 0;

            totalRealized += p;
            setupStats[sId].count++;
            setupStats[sId].profit += p;

            if (p > 0) {
                winTrades++;
                setupStats[sId].win++;
            } else if (p < 0) {
                lossTrades++;
                setupStats[sId].loss++;
            }
        });

        const overallWinRate = totalTrades > 0 ? (winTrades / totalTrades) * 100 : 0;

        // Find best & worst setup
        const sortedSetups = Object.values(setupStats).filter(s => s.count > 0).sort((a, b) => b.profit - a.profit);
        const bestSetup = sortedSetups.length > 0 && sortedSetups[0].profit > 0 ? sortedSetups[0] : null;
        const worstSetup = sortedSetups.length > 0 && sortedSetups[sortedSetups.length - 1].profit < 0 ? sortedSetups[sortedSetups.length - 1] : null;

        // Portfolio summary
        const totalEval = this.state.reportData?.summary?.totalCurrentValue || 0;
        const heldCoins = (this.state.reportData?.coinSummaries || []).filter(c => c.holdingQty > 1e-4);
        const btcEthVal = heldCoins.filter(c => ['BTC', 'ETH'].includes(c.coinSymbol)).reduce((sum, c) => sum + (c.currentValue || 0), 0);
        const majorRatio = totalEval > 0 ? Math.round((btcEthVal / totalEval) * 100) : 0;

        container.innerHTML = `
          <!-- Card 1: 총 실현 매도 & 승률 -->
          <div class="journal-kpi-card p-4 rounded-2xl bg-navy-900/90 border border-navy-800 flex flex-col justify-between shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-xs text-slate-400">총 실현 매도 거래</span>
              <span class="text-[10px] px-2 py-0.5 rounded-full font-bold ${overallWinRate >= 50 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}">
                승률 ${overallWinRate.toFixed(1)}%
              </span>
            </div>
            <div class="mt-2">
              <span class="text-xl font-mono font-bold text-white">${totalTrades}건</span>
              <span class="text-xs text-slate-400 ml-1.5 font-medium">(${winTrades}승 ${lossTrades}패)</span>
            </div>
            <div class="text-[11px] text-slate-400 mt-2 pt-2 border-t border-navy-800 flex items-center justify-between">
              <span>누적 실현손익</span>
              <span class="font-mono font-bold ${totalRealized >= 0 ? 'text-emerald-400' : 'text-rose-400'}">
                ${totalRealized >= 0 ? '+' : ''}${this.formatCurrency(totalRealized)}
              </span>
            </div>
          </div>

          <!-- Card 2: 최고 수익 셋업 -->
          <div class="journal-kpi-card p-4 rounded-2xl bg-navy-900/90 border border-navy-800 flex flex-col justify-between shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-xs text-slate-400">최고 수익 셋업</span>
              <span class="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300">효자 전략</span>
            </div>
            <div class="mt-2">
              <div class="text-base font-extrabold text-white flex items-center gap-1.5 truncate">
                <span>${bestSetup ? TRADING_SETUPS[bestSetup.id]?.icon : '✨'}</span>
                <span>${bestSetup ? TRADING_SETUPS[bestSetup.id]?.name : '분석 진행 중'}</span>
              </div>
              <div class="text-lg font-mono font-bold text-emerald-400 mt-0.5">
                ${bestSetup ? '+' + this.formatCurrency(bestSetup.profit) : '수익 셋업 없음'}
              </div>
            </div>
            <div class="text-[11px] text-slate-400 mt-2 pt-2 border-t border-navy-800 flex items-center justify-between">
              <span>해당 셋업 승률</span>
              <span class="font-bold text-slate-200">
                ${bestSetup && bestSetup.count > 0 ? ((bestSetup.win / bestSetup.count) * 100).toFixed(0) + '% (' + bestSetup.win + '승 ' + bestSetup.loss + '패)' : '-'}
              </span>
            </div>
          </div>

          <!-- Card 3: 최대 손실 셋업 -->
          <div class="journal-kpi-card p-4 rounded-2xl bg-navy-900/90 border border-navy-800 flex flex-col justify-between shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-xs text-slate-400">최대 손실 셋업</span>
              <span class="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-500/20 text-rose-300">개선 필요</span>
            </div>
            <div class="mt-2">
              <div class="text-base font-extrabold text-white flex items-center gap-1.5 truncate">
                <span>${worstSetup ? TRADING_SETUPS[worstSetup.id]?.icon : '🛡️'}</span>
                <span>${worstSetup ? TRADING_SETUPS[worstSetup.id]?.name : '손실 셋업 없음'}</span>
              </div>
              <div class="text-lg font-mono font-bold text-rose-400 mt-0.5">
                ${worstSetup ? this.formatCurrency(worstSetup.profit) : '손실 없음 (우수)'}
              </div>
            </div>
            <div class="text-[11px] text-slate-400 mt-2 pt-2 border-t border-navy-800 flex items-center justify-between">
              <span>해당 셋업 승률</span>
              <span class="font-bold text-slate-200">
                ${worstSetup && worstSetup.count > 0 ? ((worstSetup.win / worstSetup.count) * 100).toFixed(0) + '% (' + worstSetup.win + '승 ' + worstSetup.loss + '패)' : '-'}
              </span>
            </div>
          </div>

          <!-- Card 4: 포트폴리오 자산 배분 & 건전성 -->
          <div class="journal-kpi-card p-4 rounded-2xl bg-navy-900/90 border border-navy-800 flex flex-col justify-between shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-xs text-slate-400">포트폴리오 자산 배분</span>
              <span class="text-[10px] px-2 py-0.5 rounded-full font-bold ${majorRatio >= 40 ? 'bg-cyan-500/20 text-cyan-300' : 'bg-amber-500/20 text-amber-300'}">
                ${majorRatio >= 40 ? '🛡️ 메이저 중심' : '🔥 알트 중심'}
              </span>
            </div>
            <div class="mt-2">
              <span class="text-xl font-mono font-bold text-cyan-400">${this.formatCurrency(totalEval)}</span>
              <div class="text-xs text-slate-400 mt-0.5">보유 ${heldCoins.length}개 코인 운용 중</div>
            </div>
            <div class="text-[11px] text-slate-400 mt-2 pt-2 border-t border-navy-800 flex items-center justify-between">
              <span>비트코인·이더 비중</span>
              <span class="font-bold text-slate-200">${majorRatio}%</span>
            </div>
          </div>
        `;
    },

    renderSetupAnalytics: function (realizedTrades, journalStore) {
        const container = document.getElementById('setupAnalyticsList');
        if (!container) return;

        if (!realizedTrades || realizedTrades.length === 0) {
            container.innerHTML = '<p class="text-center py-6 text-xs text-slate-500">실현 매도 거래 데이터가 없습니다.</p>';
            return;
        }

        const setupStats = {};
        Object.keys(TRADING_SETUPS).forEach(sId => {
            setupStats[sId] = {
                ...TRADING_SETUPS[sId],
                count: 0,
                win: 0,
                loss: 0,
                profit: 0,
                totalWinProfit: 0,
                totalLossAmount: 0
            };
        });

        realizedTrades.forEach(t => {
            const key = this.getTradeKey(t);
            const entry = journalStore[key] || { setup: this.autoClassifyTradeSetup(t) };
            const sId = entry.setup && setupStats[entry.setup] ? entry.setup : 'general';
            const p = t.realizedProfit || 0;

            setupStats[sId].count++;
            setupStats[sId].profit += p;
            if (p > 0) {
                setupStats[sId].win++;
                setupStats[sId].totalWinProfit += p;
            } else if (p < 0) {
                setupStats[sId].loss++;
                setupStats[sId].totalLossAmount += Math.abs(p);
            }
        });

        const totalTrades = realizedTrades.length;
        const sortedList = Object.values(setupStats).sort((a, b) => b.profit - a.profit);

        let html = '';
        sortedList.forEach(s => {
            const winRate = s.count > 0 ? (s.win / s.count) * 100 : 0;
            const share = totalTrades > 0 ? (s.count / totalTrades) * 100 : 0;
            const profitFactor = s.totalLossAmount > 0 ? (s.totalWinProfit / s.totalLossAmount).toFixed(2) : (s.totalWinProfit > 0 ? '∞' : '-');

            let badgeHtml = '';
            if (s.count === 0) {
                badgeHtml = '<span class="text-[10px] px-2 py-0.5 rounded-lg bg-slate-800 text-slate-400">표본 없음</span>';
            } else if (s.id === 'fomo') {
                badgeHtml = '<span class="text-[10px] px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">🛑 원칙 개선 필수</span>';
            } else if (s.profit > 0 && winRate >= 65) {
                badgeHtml = '<span class="text-[10px] px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">🚀 핵심 수익 셋업</span>';
            } else if (s.profit > 0 && winRate >= 50) {
                badgeHtml = '<span class="text-[10px] px-2 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">🟢 안정적 익절</span>';
            } else if (s.profit < 0) {
                badgeHtml = '<span class="text-[10px] px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">⚠️ 손실 유발 주의</span>';
            } else {
                badgeHtml = '<span class="text-[10px] px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300">보통</span>';
            }

            html += `
              <div class="journal-setup-item p-3.5 rounded-xl bg-navy-950/70 border border-navy-800/80 hover:border-cyan-500/30 transition">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div class="flex items-center gap-2">
                    <span class="text-lg">${s.icon}</span>
                    <div>
                      <div class="font-bold text-sm text-white flex items-center gap-1.5 flex-wrap">
                        <span>${s.name}</span>
                        ${badgeHtml}
                      </div>
                      <div class="text-[11px] text-slate-400">${s.desc}</div>
                    </div>
                  </div>
                  <div class="text-right sm:self-center">
                    <div class="text-sm font-mono font-extrabold ${s.profit > 0 ? 'text-emerald-400' : (s.profit < 0 ? 'text-rose-400' : 'text-slate-400')}">
                      ${s.profit > 0 ? '+' : ''}${this.formatCurrency(s.profit)}
                    </div>
                    <div class="text-[10px] text-slate-400 font-mono">
                      손익비: <strong class="text-slate-200">${profitFactor}</strong>
                    </div>
                  </div>
                </div>

                <!-- Progress & Stats Bar -->
                <div class="space-y-1 pt-1.5 border-t border-navy-900">
                  <div class="flex items-center justify-between text-[11px] text-slate-400">
                    <span>${s.count}건 거래 (${share.toFixed(0)}% 비중) · ${s.win}승 ${s.loss}패</span>
                    <span class="font-bold ${winRate >= 50 ? 'text-emerald-400' : 'text-rose-400'}">승률 ${winRate.toFixed(0)}%</span>
                  </div>
                  <div class="w-full bg-navy-900 rounded-full h-1.5 overflow-hidden flex">
                    <div class="bg-emerald-500 h-full transition-all" style="width: ${winRate}%"></div>
                    <div class="bg-rose-500 h-full transition-all" style="width: ${100 - winRate}%"></div>
                  </div>
                </div>
              </div>
            `;
        });

        container.innerHTML = html;
    },

    renderPortfolioTracker: function () {
        const container = document.getElementById('portfolioTrackerContent');
        if (!container) return;

        const report = this.state.reportData;
        if (!report || !report.coinSummaries) {
            container.innerHTML = '<p class="text-center py-6 text-xs text-slate-500">포트폴리오 분석 데이터가 없습니다.</p>';
            return;
        }

        const totalEval = report.summary?.totalCurrentValue || 0;
        const totalInvested = report.summary?.currentPortfolioCost || 0;
        const totalUpnl = report.summary?.totalUnrealizedProfit || 0;
        const totalRoi = totalInvested > 0 ? (totalUpnl / totalInvested) * 100 : 0;

        const held = report.coinSummaries.filter(c => c.holdingQty > 1e-4 && (c.currentValue >= 100 || c.holdingCost >= 100));
        held.sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0));

        // Group by category
        const majorCoins = ['BTC', 'ETH'];
        const largeAlts = ['SOL', 'XRP', 'DOGE', 'ADA', 'AVAX', 'LINK', 'DOT', 'NEAR', 'SUI', 'SHIB', 'POL', 'TRX'];

        let majorVal = 0;
        let largeAltVal = 0;
        let smallAltVal = 0;

        held.forEach(c => {
            const sym = (c.coinSymbol || '').toUpperCase();
            const val = c.currentValue || 0;
            if (majorCoins.includes(sym)) majorVal += val;
            else if (largeAlts.includes(sym)) largeAltVal += val;
            else smallAltVal += val;
        });

        const majorPct = totalEval > 0 ? (majorVal / totalEval) * 100 : 0;
        const largePct = totalEval > 0 ? (largeAltVal / totalEval) * 100 : 0;
        const smallPct = totalEval > 0 ? (smallAltVal / totalEval) * 100 : 0;

        // Health check advice
        let healthTip = '';
        if (held.length === 0) {
            healthTip = '현재 보유 중인 코인이 없습니다. 전체 매매 내역은 저널 테이블에서 확인하세요.';
        } else if (held.length === 1 && totalEval > 100000) {
            healthTip = '⚠️ <strong>단일 종목 올인 상태:</strong> 1개 종목에 100% 집중되어 변동성 리스크가 매우 큽니다. 분산 매매를 권장합니다.';
        } else if (majorPct >= 50) {
            healthTip = '🛡️ <strong>안정적 포트폴리오:</strong> 비트코인/이더리움 메이저 자산이 과반수를 차지하여 시장 급변 시 하방 경직성이 우수합니다.';
        } else if (smallPct >= 50) {
            healthTip = '🔥 <strong>고위험 중소형 알트 과다:</strong> 급등락 위험이 높으므로 익절 목표가를 사전에 설정하고 현금 비중을 확보하세요.';
        } else {
            healthTip = '⚖️ <strong>균형 잡힌 배분:</strong> 메이저와 주요 대형 알트가 고르게 분산되어 있어 리스크 관리에 유리한 상태입니다.';
        }

        let coinsListHtml = '';
        held.slice(0, 5).forEach((c, idx) => {
            const pct = totalEval > 0 ? ((c.currentValue || 0) / totalEval) * 100 : 0;
            const pnl = c.unrealizedProfit || 0;
            const roi = c.unrealizedRoi || 0;

            coinsListHtml += `
              <div class="flex items-center justify-between py-1.5 text-xs border-b border-navy-800/60 last:border-b-0">
                <div class="flex items-center gap-2">
                  <span class="w-4 text-center font-mono text-[10px] text-slate-500 font-bold">${idx + 1}</span>
                  <span class="font-bold text-white">${c.koreanName || c.coinSymbol}</span>
                  <span class="text-[10px] text-slate-400 font-mono">(${pct.toFixed(1)}%)</span>
                </div>
                <div class="text-right font-mono">
                  <div class="text-slate-200 font-medium">${this.formatCurrency(c.currentValue || 0)}</div>
                  <div class="text-[10px] ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}">
                    ${pnl >= 0 ? '+' : ''}${this.formatCurrency(pnl)} (${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%)
                  </div>
                </div>
              </div>
            `;
        });

        container.innerHTML = `
          <!-- Overall Portfolio Snapshot -->
          <div class="portfolio-health-box p-3.5 rounded-xl bg-navy-950/70 border border-navy-800/80">
            <div class="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>총 평가손익 (수익률)</span>
              <span>총 투자원금: ${this.formatCurrency(totalInvested)}</span>
            </div>
            <div class="flex items-baseline justify-between">
              <span class="text-lg font-mono font-extrabold ${totalUpnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}">
                ${totalUpnl >= 0 ? '+' : ''}${this.formatCurrency(totalUpnl)}
              </span>
              <span class="text-xs font-mono font-bold px-2 py-0.5 rounded-lg ${totalRoi >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}">
                ${totalRoi >= 0 ? '+' : ''}${totalRoi.toFixed(2)}%
              </span>
            </div>
          </div>

          <!-- Asset Allocation Segmented Bar -->
          <div class="space-y-2">
            <div class="flex items-center justify-between text-xs font-bold text-slate-300">
              <span>자산군 배분 비율</span>
              <span class="text-[11px] text-slate-400">${held.length}개 보유 종목</span>
            </div>
            <div class="w-full h-3 rounded-full overflow-hidden flex bg-navy-950 border border-navy-800">
              <div class="bg-amber-500 h-full transition-all" style="width: ${majorPct}%" title="메이저 (BTC/ETH): ${majorPct.toFixed(1)}%"></div>
              <div class="bg-indigo-500 h-full transition-all" style="width: ${largePct}%" title="대형 알트: ${largePct.toFixed(1)}%"></div>
              <div class="bg-cyan-500 h-full transition-all" style="width: ${smallPct}%" title="중소형 알트: ${smallPct.toFixed(1)}%"></div>
            </div>
            <div class="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-amber-500 inline-block"></span> 메이저 ${majorPct.toFixed(0)}%</span>
              <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span> 대형알트 ${largePct.toFixed(0)}%</span>
              <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-cyan-500 inline-block"></span> 기타 ${smallPct.toFixed(0)}%</span>
            </div>
          </div>

          <!-- Top Holdings List -->
          <div class="space-y-1">
            <div class="text-xs font-bold text-slate-300 mb-1">보유 자산 비중 Top 5</div>
            <div class="portfolio-health-box p-2.5 rounded-xl bg-navy-950/50 border border-navy-800/60">
              ${coinsListHtml || '<div class="text-center py-2 text-xs text-slate-500">보유 종목 없음</div>'}
            </div>
          </div>

          <!-- Health Advice Note -->
          <div class="portfolio-health-box p-3 rounded-xl bg-navy-900 border border-cyan-500/20 text-xs text-slate-300 leading-relaxed">
            ${healthTip}
          </div>
        `;
    },

    renderBestWorstTrades: function (realizedTrades, journalStore) {
        const bestContainer = document.getElementById('journalBestTrades');
        const worstContainer = document.getElementById('journalWorstTrades');
        if (!bestContainer || !worstContainer) return;

        if (!realizedTrades || realizedTrades.length === 0) {
            bestContainer.innerHTML = '<div class="text-center py-4 text-xs text-slate-500">실현 매도 거래 데이터가 없습니다.</div>';
            worstContainer.innerHTML = '<div class="text-center py-4 text-xs text-slate-500">실현 매도 거래 데이터가 없습니다.</div>';
            return;
        }

        // Sort descending for best
        const sortedBest = [...realizedTrades].sort((a, b) => (b.realizedProfit || 0) - (a.realizedProfit || 0));
        // Sort ascending for worst
        const sortedWorst = [...realizedTrades].sort((a, b) => (a.realizedProfit || 0) - (b.realizedProfit || 0));

        const renderItem = (t, rank, isBest) => {
            const key = this.getTradeKey(t);
            const entry = journalStore[key] || { setup: this.autoClassifyTradeSetup(t), note: '' };
            const setupObj = TRADING_SETUPS[entry.setup] || TRADING_SETUPS.general;
            const profit = t.realizedProfit || 0;
            const roi = (t.realizedRoi !== undefined && !isNaN(t.realizedRoi))
                ? Number(t.realizedRoi)
                : (t.profitRate !== undefined ? Number(t.profitRate) : (t.costBasis > 0 ? (profit / t.costBasis) * 100 : (t.buyCost > 0 ? (profit / t.buyCost) * 100 : 0)));
            const ex = (t.exchange || 'UPBIT').toUpperCase();
            const exBadge = ex === 'BITHUMB'
                ? '<span class="text-[9px] px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-400 font-bold border border-orange-500/30">빗썸</span>'
                : '<span class="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30">업비트</span>';

            return `
              <div class="journal-subcard-item p-3 rounded-xl bg-navy-950/80 border border-navy-800/80 flex items-center justify-between gap-3">
                <div class="flex items-center gap-2.5 min-w-0">
                  <span class="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${isBest ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}">
                    ${rank}
                  </span>
                  <div class="min-w-0">
                    <div class="font-bold text-xs text-white flex items-center gap-1.5 flex-wrap">
                      <span>${t.coinSymbol || t.market}</span>
                      ${exBadge}
                      <span class="text-[10px] px-1.5 py-0.2 rounded bg-navy-800 text-slate-400 font-mono">${(t.time || '').substring(0, 10)}</span>
                    </div>
                    <div class="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                      <span>${setupObj.icon}</span>
                      <span>${setupObj.name}</span>
                      ${entry.note ? `<span class="text-slate-500 truncate">· "${entry.note}"</span>` : ''}
                    </div>
                  </div>
                </div>
                <div class="text-right flex-shrink-0 font-mono">
                  <div class="text-xs font-bold ${profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}">
                    ${profit >= 0 ? '+' : ''}${this.formatCurrency(profit)}
                  </div>
                  <div class="text-[10px] ${roi >= 0 ? 'text-emerald-400' : 'text-rose-400'}">
                    ${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%
                  </div>
                </div>
              </div>
            `;
        };

        const bestList = sortedBest.filter(t => (t.realizedProfit || 0) > 0).slice(0, 3);
        const worstList = sortedWorst.filter(t => (t.realizedProfit || 0) < 0).slice(0, 3);

        bestContainer.innerHTML = bestList.length > 0
            ? bestList.map((t, idx) => renderItem(t, idx + 1, true)).join('')
            : '<div class="text-center py-4 text-xs text-slate-500">익절 거래가 없습니다.</div>';

        worstContainer.innerHTML = worstList.length > 0
            ? worstList.map((t, idx) => renderItem(t, idx + 1, false)).join('')
            : '<div class="text-center py-4 text-xs text-slate-500">손실 거래가 없습니다 (100% 승률!).</div>';
    },

    renderJournalTable: function () {
        const tbody = document.querySelector('#journalTable tbody');
        if (!tbody) return;

        const realizedTrades = (this.state.reportData && this.state.reportData.trades)
            ? this.state.reportData.trades.filter(t => t.type === '매도' && t.realizedProfit !== undefined)
            : [];

        const countBadge = document.getElementById('journalTotalCountBadge');
        const journalStore = this.getJournalStorage();
        const f = this.state.journalFilter;

        let filtered = realizedTrades;

        // Filter by Exchange
        if (f.exchange && f.exchange !== 'ALL') {
            filtered = filtered.filter(t => (t.exchange || 'UPBIT').toUpperCase() === f.exchange);
        }

        // Filter by Setup
        if (f.setup && f.setup !== 'ALL') {
            filtered = filtered.filter(t => {
                const entry = this.getJournalEntry(t);
                return entry.setup === f.setup;
            });
        }

        // Filter by Emotion
        if (f.emotion && f.emotion !== 'ALL') {
            filtered = filtered.filter(t => {
                const entry = this.getJournalEntry(t);
                return (entry.emotion || 'calm') === f.emotion;
            });
        }

        // Filter by Result
        if (f.result === 'WIN') {
            filtered = filtered.filter(t => (t.realizedProfit || 0) > 0);
        } else if (f.result === 'LOSS') {
            filtered = filtered.filter(t => (t.realizedProfit || 0) < 0);
        }

        // Filter by Market/Coin
        if (f.market && f.market !== 'ALL') {
            filtered = filtered.filter(t => t.market === f.market || t.coinSymbol === f.market || t.coinSymbol === f.market.replace('KRW-', ''));
        }

        // Filter by Search
        if (f.search) {
            filtered = filtered.filter(t => {
                const key = this.getTradeKey(t);
                const entry = journalStore[key] || {};
                const note = (entry.note || '').toLowerCase();
                const sym = (t.coinSymbol || '').toLowerCase();
                const name = (UpbitAPI.getKoreanName(t.market || t.coinSymbol) || '').toLowerCase();
                return sym.includes(f.search) || name.includes(f.search) || note.includes(f.search);
            });
        }

        if (countBadge) countBadge.textContent = filtered.length + '건';

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center py-8 text-muted">일치하는 매매 저널 내역이 없습니다.</td></tr>';
            const pagin = document.getElementById('journalPagination');
            if (pagin) pagin.innerHTML = '';
            return;
        }

        // Sorting
        const sort = this.state.sortStates.journalTable || { col: 'time', asc: false };
        filtered.sort((a, b) => {
            let valA;
            let valB;
            if (sort.col === 'exchange') {
                valA = a.exchange || 'UPBIT';
                valB = b.exchange || 'UPBIT';
            } else if (sort.col === 'emotion') {
                valA = this.getJournalEntry(a).emotion || 'calm';
                valB = this.getJournalEntry(b).emotion || 'calm';
            } else {
                valA = a[sort.col] !== undefined ? a[sort.col] : 0;
                valB = b[sort.col] !== undefined ? b[sort.col] : 0;
            }
            if (typeof valA === 'string') return sort.asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
            return sort.asc ? valA - valB : valB - valA;
        });

        // Pagination
        const totalItems = filtered.length;
        const totalPages = Math.ceil(totalItems / f.pageSize);
        if (f.page > totalPages) f.page = totalPages;
        if (f.page < 1) f.page = 1;

        const startIndex = (f.page - 1) * f.pageSize;
        const pageItems = filtered.slice(startIndex, startIndex + f.pageSize);

        let html = '';
        pageItems.forEach(t => {
            const key = this.getTradeKey(t);
            const entry = this.getJournalEntry(t);
            const profit = t.realizedProfit || 0;
            const roi = (t.realizedRoi !== undefined && !isNaN(t.realizedRoi))
                ? Number(t.realizedRoi)
                : (t.profitRate !== undefined ? Number(t.profitRate) : (t.costBasis > 0 ? (profit / t.costBasis) * 100 : (t.buyCost > 0 ? (profit / t.buyCost) * 100 : 0)));
            const profitClass = this.getProfitColorClass(profit);
            const coinName = UpbitAPI.getKoreanName(t.market || t.coinSymbol) || t.coinSymbol;
            const ex = (t.exchange || 'UPBIT').toUpperCase();
            const exBadge = ex === 'BITHUMB'
                ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">빗썸</span>'
                : '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">업비트</span>';

            // Setup select options
            let setupOptionsHtml = '';
            Object.values(TRADING_SETUPS).forEach(s => {
                const isSelected = entry.setup === s.id ? 'selected' : '';
                setupOptionsHtml += `<option value="${s.id}" ${isSelected}>${s.icon} ${s.name}</option>`;
            });

            // Emotion select options
            let emotionOptionsHtml = '';
            Object.values(TRADE_EMOTIONS).forEach(em => {
                const isSelected = entry.emotion === em.id ? 'selected' : '';
                emotionOptionsHtml += `<option value="${em.id}" ${isSelected}>${em.label}</option>`;
            });

            html += `
              <tr>
                <td class="text-xs text-muted font-mono whitespace-nowrap">${t.time || '-'}</td>
                <td class="text-center whitespace-nowrap">${exBadge}</td>
                <td>
                  <div class="flex-center-gap">
                    <span class="coin-symbol-badge-sm">${t.coinSymbol}</span>
                    <span class="font-bold text-white">${coinName}</span>
                  </div>
                </td>
                <td class="text-right font-mono font-medium">
                  <div>${this.formatPrice(t.price)}</div>
                  <div class="text-[11px] text-muted">${t.qty ? Number(t.qty).toLocaleString(undefined, { maximumFractionDigits: 6 }) : '-'} ${t.coinSymbol}</div>
                </td>
                <td class="text-right font-mono font-medium">
                  <div>${this.formatPrice(t.avgBuyPrice)}</div>
                  <div class="text-[11px] text-muted">${this.formatCurrency(t.costBasis || t.buyCost || (t.avgBuyPrice * t.qty))}</div>
                </td>
                <td class="text-right ${profitClass} font-mono">
                  <div class="font-bold text-sm">${profit > 0 ? '+' : ''}${this.formatCurrency(profit)}</div>
                  <div class="text-xs">${roi > 0 ? '+' : ''}${roi.toFixed(2)}%</div>
                </td>
                <td class="text-center">
                  <select onchange="App.onTradeSetupSelect('${key}', this.value)" class="journal-select w-full rounded-lg px-2 py-1 outline-none focus:border-cyan-500 cursor-pointer">
                    ${setupOptionsHtml}
                  </select>
                </td>
                <td class="text-center">
                  <select onchange="App.onTradeEmotionSelect('${key}', this.value)" class="journal-select w-full rounded-lg px-2 py-1 outline-none focus:border-cyan-500 cursor-pointer">
                    ${emotionOptionsHtml}
                  </select>
                </td>
                <td>
                  <input type="text" value="${(entry.note || '').replace(/"/g, '&quot;')}" placeholder="복기 메모 입력 후 엔터 (DB 자동 동기화)..." onchange="App.onTradeNoteChange('${key}', this.value)" class="journal-input placeholder-slate-500 text-xs rounded-lg px-2.5 py-1 outline-none transition w-full">
                </td>
              </tr>
            `;
        });

        tbody.innerHTML = html;
        this.renderJournalPagination(totalItems, f.page, totalPages);
    },

    renderJournalPagination: function (totalItems, currentPage, totalPages) {
        const paginContainer = document.getElementById('journalPagination');
        if (!paginContainer) return;

        if (totalItems === 0) {
            paginContainer.innerHTML = '';
            return;
        }

        paginContainer.innerHTML = '<div class="pagination-info text-xs text-muted">총 <strong>' + totalItems + '</strong>건 중 ' + ((currentPage - 1) * this.state.journalFilter.pageSize + 1) + ' - ' + Math.min(currentPage * this.state.journalFilter.pageSize, totalItems) + '건</div>' +
            '<div class="pagination-controls">' +
                '<button class="btn btn-sm" ' + (currentPage === 1 ? 'disabled' : '') + ' onclick="App.goToJournalPage(1)">«</button>' +
                '<button class="btn btn-sm" ' + (currentPage === 1 ? 'disabled' : '') + ' onclick="App.goToJournalPage(' + (currentPage - 1) + ')">‹ 이전</button>' +
                '<span class="page-current text-sm px-2 font-bold">' + currentPage + ' / ' + totalPages + '</span>' +
                '<button class="btn btn-sm" ' + (currentPage === totalPages ? 'disabled' : '') + ' onclick="App.goToJournalPage(' + (currentPage + 1) + ')">다음 ›</button>' +
                '<button class="btn btn-sm" ' + (currentPage === totalPages ? 'disabled' : '') + ' onclick="App.goToJournalPage(' + totalPages + ')">»</button>' +
            '</div>';
    },

    goToJournalPage: function (page) {
        this.state.journalFilter.page = page;
        this.renderJournalTable();
    },

    onJournalFilterChange: function () {
        const exEl = document.getElementById('journalExchangeFilter');
        const setupEl = document.getElementById('journalSetupFilter');
        const emoEl = document.getElementById('journalEmotionFilter');
        const resultEl = document.getElementById('journalResultFilter');
        const coinEl = document.getElementById('journalCoinFilter');

        if (exEl) this.state.journalFilter.exchange = exEl.value;
        if (setupEl) this.state.journalFilter.setup = setupEl.value;
        if (emoEl) this.state.journalFilter.emotion = emoEl.value;
        if (resultEl) this.state.journalFilter.result = resultEl.value;
        if (coinEl) this.state.journalFilter.market = coinEl.value;

        this.state.journalFilter.page = 1;
        this.renderJournalTable();
    },

    onJournalSearchInput: function (e) {
        this.state.journalFilter.search = e.target.value.trim().toLowerCase();
        this.state.journalFilter.page = 1;
        this.renderJournalTable();
    },

    formatCurrency: function (num) {
        if (num === undefined || num === null || isNaN(num)) return '0원';
        const rounded = Math.round(num);
        return rounded.toLocaleString('ko-KR') + '원';
    },

    formatPrice: function (num) {
        if (num === undefined || num === null || isNaN(num)) return '-';
        const n = parseFloat(num);
        if (n === 0) return '0원';
        if (n >= 1000) {
            // 1,000원 이상: 10,040원, 33,574원 (필요시 소수점 2자리)
            return n.toLocaleString('ko-KR', { maximumFractionDigits: 2 }) + '원';
        } else if (n >= 100) {
            // 100원 ~ 1,000원: 104.5원, 313.2원 (최대 소수점 2자리)
            return n.toLocaleString('ko-KR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + '원';
        } else if (n >= 1) {
            // 1원 ~ 100원 (비체인, 더그래프, 크로노스 등): 9.24원, 22.40원, 74.10원 (소수점 2~4자리)
            return n.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) + '원';
        } else if (n >= 0.01) {
            // 0.01원 ~ 1원: 0.1924원
            return n.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) + '원';
        } else {
            // 0.01원 미만 (시바이누, 페페 등): 0.01925원
            return n.toLocaleString('ko-KR', { minimumFractionDigits: 4, maximumFractionDigits: 8 }) + '원';
        }
    },

    getProfitColorClass: function (num) {
        if (!num || num === 0) return 'text-muted';
        return num > 0 ? 'color-profit-kr' : 'color-loss-kr';
    },

    saveTrades: function () {
        AnalyzerStorage.saveTrades(this.state.rawTrades);
        if (typeof CloudSyncManager !== 'undefined' && CloudSyncManager.getMode() === 'CLOUD') {
            CloudSyncManager.saveToCloud(this.state.rawTrades);
        }
        this.updateUserBanner();
        if (typeof CloudSyncManager !== 'undefined') CloudSyncManager.updateUI();
    },

    loadSavedTrades: async function () {
        let tradesToUse = [];
        const uid = AnalyzerStorage.getCurrentUserId();

        // 1. 회원이 로그인된 상태인 경우 Firebase Firestore 클라우드 백업을 우선 확인/로드
        if (uid !== 'user_default' && typeof CloudSyncManager !== 'undefined') {
            try {
                const cloudTrades = await CloudSyncManager.loadFromCloud();
                if (Array.isArray(cloudTrades) && cloudTrades.length > 0) {
                    tradesToUse = cloudTrades;
                    if (typeof AnalyzerDB !== 'undefined') {
                        await AnalyzerDB.saveTrades(cloudTrades, uid);
                    }
                }
            } catch (e) {
                console.warn('클라우드 DB 로드 오류:', e);
            }
        }

        // 2. 현재 계정(uid) 전용 로컬 IndexedDB에서 로드
        if (tradesToUse.length === 0 && typeof AnalyzerDB !== 'undefined') {
            try {
                const savedDb = await AnalyzerDB.getTrades(uid);
                if (Array.isArray(savedDb) && savedDb.length > 0) {
                    tradesToUse = savedDb;
                }
            } catch (e) {
                console.warn('IndexedDB 로드 오류:', e);
            }
        }

        // 3. 현재 계정(uid) 전용 localStorage에서 로드
        if (tradesToUse.length === 0) {
            try {
                const savedSync = AnalyzerStorage.getTrades();
                if (Array.isArray(savedSync) && savedSync.length > 0) {
                    tradesToUse = savedSync;
                    if (typeof AnalyzerDB !== 'undefined') {
                        await AnalyzerDB.saveTrades(savedSync, uid);
                    }
                }
            } catch (e) {}
        }

        if (tradesToUse.length > 0) {
            const healed = AnalyzerStorage.healTrades(tradesToUse);
            this.state.rawTrades = healed;
            this.recalculate();
            this.fetchLiveTickers(false);
            this.updateUserBanner();
            if (typeof CloudSyncManager !== 'undefined') CloudSyncManager.updateUI();
            return;
        }

        this.state.rawTrades = [];
        this.recalculate();
        this.updateUserBanner();
        if (typeof CloudSyncManager !== 'undefined') CloudSyncManager.updateUI();
    },

    clearDataWithConfirm: function () {
        if (confirm('현재 계정의 저장된 모든 거래 내역 데이터를 삭제하시겠습니까?\\n삭제 후 복구할 수 없습니다.')) {
            this.state.rawTrades = [];
            this.state.reportData = null;
            AnalyzerStorage.clearUserData();
            if (typeof CloudSyncManager !== 'undefined') {
                CloudSyncManager.deleteFromCloud();
            }
            this.recalculate();
            this.updateUserBanner();
            if (typeof CloudSyncManager !== 'undefined') CloudSyncManager.updateUI();
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
            if (badgeEl) badgeEl.textContent = '👤 ' + u.username + ' 님 보관소';
            if (settingsNameEl) settingsNameEl.textContent = u.username;
        } else {
            if (nameEl) nameEl.textContent = '손님(비회원)';
            if (badgeEl) badgeEl.textContent = '👤 비회원 로컬 모드';
            if (settingsNameEl) settingsNameEl.textContent = '손님(비회원)';
        }
        if (countEl) countEl.textContent = countText;
        if (settingsCountEl) settingsCountEl.textContent = countText;
        if (typeof CloudSyncManager !== 'undefined') CloudSyncManager.updateUI();
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
            const held = this.state.reportData.coinSummaries.filter(c => c.holdingQty > 1e-4 && (c.holdingCost >= 500 || (c.currentValue && c.currentValue >= 500)));
            held.sort((a,b) => (b.currentValue || (b.holdingQty * b.avgBuyPrice)) - (a.currentValue || (a.holdingQty * a.avgBuyPrice)));
            
            let totalVal = held.reduce((sum, c) => sum + (c.currentValue || (c.holdingQty * c.avgBuyPrice)), 0);
            if (totalVal <= 0) {
                elTopHoldings.innerText = '보유 자산 없음';
                elHoldingsBar.innerHTML = '';
            } else {
                let top3 = held.slice(0, 3);
                elTopHoldings.innerText = top3.map(c => (c.koreanName || c.coinSymbol || c.coin || '') + ' (' + Math.round(((c.currentValue || (c.holdingQty * c.avgBuyPrice)) / totalVal) * 100) + '%)').join(', ');
                
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
    window.CloudSyncManager = CloudSyncManager;
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

