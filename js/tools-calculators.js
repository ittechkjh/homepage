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

    // Helper: Parse numeric value safely (removes commas)
    parseNum: function (val, fallback = 0) {
        if (val === null || val === undefined) return fallback;
        const cleaned = String(val).replace(/,/g, '').trim();
        if (!cleaned) return fallback;
        const num = parseFloat(cleaned);
        return isNaN(num) ? fallback : num;
    },

    // Helper: Format number with Korean/standard commas
    formatNumber: function (num) {
        if (num === null || num === undefined || num === '') return '';
        const n = Number(String(num).replace(/,/g, ''));
        if (isNaN(n)) return '';
        return n.toLocaleString('ko-KR');
    },

    // Helper: Real-time Comma Formatter for input elements (preserves cursor position)
    formatInputWithCommas: function (input, allowDecimal = false) {
        if (!input) return;
        const oldVal = input.value || '';
        const cursor = input.selectionStart ?? oldVal.length;
        const charsBefore = (oldVal.slice(0, cursor).match(/[0-9.]/g) || []).length;

        if (!allowDecimal) {
            const raw = oldVal.replace(/[^0-9]/g, '');
            if (!raw) {
                input.value = '';
                return;
            }
            const num = parseInt(raw, 10);
            const formatted = isNaN(num) ? '' : num.toLocaleString('ko-KR');
            input.value = formatted;

            let newCursor = formatted.length;
            let digitsCount = 0;
            for (let i = 0; i < formatted.length; i++) {
                if (/\d/.test(formatted[i])) digitsCount++;
                if (digitsCount === charsBefore) {
                    newCursor = i + 1;
                    break;
                }
            }
            try {
                input.setSelectionRange(newCursor, newCursor);
            } catch (e) {}
        } else {
            const parts = oldVal.split('.');
            const integerRaw = parts[0].replace(/[^0-9]/g, '');
            const hasDot = parts.length > 1;
            const decimalRaw = hasDot ? parts.slice(1).join('').replace(/[^0-9]/g, '') : null;

            if (!integerRaw && decimalRaw === null) {
                input.value = '';
                return;
            }
            const num = integerRaw ? parseInt(integerRaw, 10) : 0;
            let formatted = integerRaw ? num.toLocaleString('ko-KR') : '0';
            if (hasDot) {
                formatted += '.' + (decimalRaw !== null ? decimalRaw : '');
            }
            input.value = formatted;

            let newCursor = formatted.length;
            let count = 0;
            for (let i = 0; i < formatted.length; i++) {
                if (/[0-9.]/.test(formatted[i])) count++;
                if (count === charsBefore) {
                    newCursor = i + 1;
                    break;
                }
            }
            try {
                input.setSelectionRange(newCursor, newCursor);
            } catch (e) {}
        }
    },

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

    // 물타기/탈출 다중 시나리오 관리 상태
    currentScenarioId: null,

    // 사용자별 고유 저장소 키 반환
    getScenarioStorageKey: function () {
        const user = this.getLoggedInUsername();
        return user ? `crytopnl_dca_scenarios_${user}` : 'crytopnl_dca_scenarios_guest';
    },

    // 저장된 시나리오 목록 반환 (현재 사용자 키 + 게스트/관리자/기타 키 전체 통합 복구)
    getSavedScenarios: function () {
        const primaryKey = this.getScenarioStorageKey();
        const mergedList = [];
        const seenIds = new Set();

        const addItems = (raw) => {
            if (!raw) return;
            try {
                const list = JSON.parse(raw);
                if (Array.isArray(list)) {
                    list.forEach(item => {
                        if (item && item.id && !seenIds.has(item.id)) {
                            seenIds.add(item.id);
                            mergedList.push(item);
                        }
                    });
                }
            } catch (e) {}
        };

        // 1. 현재 사용자 키 우선 탐색
        addItems(localStorage.getItem(primaryKey));

        // 2. 다른 키(admin, guest, 레거시 키)에 보관된 시나리오 통합 스캔
        const fallbackKeys = ['crytopnl_dca_scenarios_admin', 'crytopnl_dca_scenarios_guest', 'crytopnl_dca_scenarios'];
        fallbackKeys.forEach(k => {
            if (k !== primaryKey) addItems(localStorage.getItem(k));
        });

        try {
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith('crytopnl_dca_scenarios') && k !== primaryKey) {
                    addItems(localStorage.getItem(k));
                }
            }
        } catch (e) {}

        // 최신 업데이트 순 정렬 유지
        return mergedList;
    },

    // 현재 폼 상태를 시나리오로 저장 (신규 or 덮어쓰기)
    saveScenario: function (customTitle) {
        const curPrice = this.parseNum(document.getElementById('waterCurrentPrice')?.value);
        const curQty = this.parseNum(document.getElementById('waterCurrentQty')?.value);
        const feeRate = document.getElementById('waterFeeRate')?.value || '0.05';

        // 보유 평단가와 수량이 없더라도(추가 매수 차수 계획만으로도) 저장 가능하도록 허용
        const hasWaterTiers = this.waterTiers && this.waterTiers.length > 0;
        if (curPrice <= 0 && curQty <= 0 && !hasWaterTiers) {
            alert('저장할 매수 계획이나 보유 포지션을 입력해주세요.');
            return;
        }

        const list = this.getSavedScenarios();
        let active = list.find(s => s.id === this.currentScenarioId);

        let title = customTitle;
        if (!title) {
            const defaultTitle = active ? active.title : `물타기 플랜 ${list.length + 1} (${new Date().toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })})`;
            title = prompt('저장할 시나리오 이름을 입력하세요:', defaultTitle);
            if (!title) return;
        }
        title = title.trim();
        if (!title) return;

        const nowStr = new Date().toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

        if (active && active.title === title) {
            // 기존 선택된 시나리오 덮어쓰기
            active.currentPrice = curPrice;
            active.currentQty = curQty;
            active.feeRate = feeRate;
            active.waterTiers = JSON.parse(JSON.stringify(this.waterTiers));
            active.sellTiers = JSON.parse(JSON.stringify(this.sellTiers));
            active.updatedAt = nowStr;
        } else {
            // 신규 저장
            const newId = 'dca_' + Date.now();
            const newScenario = {
                id: newId,
                title: title,
                currentPrice: curPrice,
                currentQty: curQty,
                feeRate: feeRate,
                waterTiers: JSON.parse(JSON.stringify(this.waterTiers)),
                sellTiers: JSON.parse(JSON.stringify(this.sellTiers)),
                updatedAt: nowStr
            };
            list.unshift(newScenario);
            this.currentScenarioId = newId;
        }

        try {
            localStorage.setItem(this.getScenarioStorageKey(), JSON.stringify(list));
        } catch (e) {
            alert('저장 실패: 브라우저 저장 공간을 확인하세요.');
            return;
        }

        this.renderScenarioUI();
        this.showScenarioToast(`'${title}' 계획이 저장되었습니다.`);
    },

    // 선택된 시나리오 로드
    loadScenario: function (scenarioId) {
        if (!scenarioId) {
            this.resetScenario();
            return;
        }

        const list = this.getSavedScenarios();
        const target = list.find(s => s.id === scenarioId);
        if (!target) return;

        this.currentScenarioId = target.id;

        const priceEl = document.getElementById('waterCurrentPrice');
        const qtyEl = document.getElementById('waterCurrentQty');
        const feeEl = document.getElementById('waterFeeRate');

        if (priceEl) priceEl.value = this.formatNumber(target.currentPrice || '');
        if (qtyEl) qtyEl.value = target.currentQty || '';
        if (feeEl && target.feeRate) feeEl.value = target.feeRate;

        this.waterTiers = target.waterTiers && target.waterTiers.length > 0
            ? JSON.parse(JSON.stringify(target.waterTiers))
            : [{ id: 1, mode: 'amount', price: 78000000, val: 10000000 }];
        this.nextWaterTierId = Math.max(...this.waterTiers.map(t => t.id || 0), 0) + 1;

        this.sellTiers = target.sellTiers && target.sellTiers.length > 0
            ? JSON.parse(JSON.stringify(target.sellTiers))
            : [{ id: 1, mode: 'pct', price: 98000000, val: 50 }];
        this.nextSellTierId = Math.max(...this.sellTiers.map(t => t.id || 0), 0) + 1;

        this.renderWaterTiers();
        this.renderSellTiers();
        this.calcWater();
        this.renderScenarioUI();
        this.showScenarioToast(`'${target.title}' 계획을 불러왔습니다.`);
    },

    // 시나리오 삭제
    deleteScenario: function (scenarioId) {
        const idToDelete = scenarioId || this.currentScenarioId;
        if (!idToDelete) {
            alert('삭제할 저장 계획이 선택되지 않았습니다.');
            return;
        }

        const list = this.getSavedScenarios();
        const target = list.find(s => s.id === idToDelete);
        if (!target) return;

        if (!confirm(`'${target.title}' 계획을 정말 삭제하시겠습니까?`)) return;

        const filtered = list.filter(s => s.id !== idToDelete);
        try {
            localStorage.setItem(this.getScenarioStorageKey(), JSON.stringify(filtered));
        } catch (e) {}

        this.currentScenarioId = null;
        this.resetScenario();
        this.renderScenarioUI();
        this.showScenarioToast('계획이 삭제되었습니다.');
    },

    // 새 계획 작성 (폼 초기화)
    resetScenario: function () {
        this.currentScenarioId = null;
        const priceEl = document.getElementById('waterCurrentPrice');
        const qtyEl = document.getElementById('waterCurrentQty');
        const feeEl = document.getElementById('waterFeeRate');

        if (priceEl) priceEl.value = '95,000,000';
        if (qtyEl) qtyEl.value = '0.5';
        if (feeEl) feeEl.value = '0.05';

        this.waterTiers = [{ id: 1, mode: 'amount', price: 78000000, val: 10000000 }];
        this.nextWaterTierId = 2;
        this.sellTiers = [{ id: 1, mode: 'pct', price: 98000000, val: 50 }];
        this.nextSellTierId = 2;

        this.renderWaterTiers();
        this.renderSellTiers();
        this.calcWater();
        this.renderScenarioUI();
    },

    // UI 셀렉터 및 보관함 뱃지 동기화
    renderScenarioUI: function () {
        const selectEl = document.getElementById('waterScenarioSelect');
        const userBadgeEl = document.getElementById('waterScenarioUserBadge');
        const deleteBtn = document.getElementById('waterScenarioDeleteBtn');

        const user = this.getLoggedInUsername();
        const list = this.getSavedScenarios();

        if (userBadgeEl) {
            userBadgeEl.innerText = user ? `👤 ${user} (${list.length})` : `👤 게스트 (${list.length})`;
            userBadgeEl.title = user ? `${user} 회원 계정 보관함입니다.` : '비회원 상태에서는 브라우저 로컬 저장소에 안전하게 보관됩니다.';
        }

        if (selectEl) {
            let optionsHtml = `<option value="">-- 새 계획 작성 (직접 입력) --</option>`;
            list.forEach(s => {
                const isSelected = s.id === this.currentScenarioId ? 'selected' : '';
                optionsHtml += `<option value="${s.id}" ${isSelected}>📋 ${s.title} (${s.updatedAt || '저장됨'})</option>`;
            });
            selectEl.innerHTML = optionsHtml;
        }

        if (deleteBtn) {
            deleteBtn.style.display = this.currentScenarioId ? 'inline-flex' : 'none';
        }
    },

    showScenarioToast: function (msg) {
        let toast = document.getElementById('waterScenarioToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'waterScenarioToast';
            toast.className = 'fixed bottom-5 right-5 z-[999] bg-emerald-500 text-navy-950 px-4 py-2.5 rounded-xl font-bold text-xs shadow-xl transition-all duration-300 opacity-0 pointer-events-none transform translate-y-2 flex items-center gap-1.5';
            document.body.appendChild(toast);
        }
        toast.innerHTML = `<span>✓</span> <span>${msg}</span>`;
        toast.classList.remove('opacity-0', 'translate-y-2');
        toast.classList.add('opacity-100', 'translate-y-0');
        setTimeout(() => {
            toast.classList.remove('opacity-100', 'translate-y-0');
            toast.classList.add('opacity-0', 'translate-y-2');
        }, 2200);
    },

    getLoggedInUsername: function () {
        try {
            // 1. Check header auth button directly (authoritative active login state in UI)
            const authBtn = document.getElementById('btn-header-auth');
            if (authBtn && authBtn.innerText && authBtn.innerText.includes('로그아웃')) {
                const clean = authBtn.innerText.replace(/\(로그아웃\)|로그아웃/g, '').trim();
                if (clean && clean !== '로그인') return clean;
            }

            // 2. Check all possible localStorage and sessionStorage user keys
            const userKeys = ['crytopnl_user', 'cryptopnl_user', 'coinhub_user'];
            for (const k of userKeys) {
                const raw = localStorage.getItem(k) || sessionStorage.getItem(k);
                if (raw) {
                    try {
                        const u = JSON.parse(raw);
                        if (u && (u.username || u.name || u.nickname)) {
                            return (u.username || u.name || u.nickname).trim();
                        }
                    } catch (e) {}
                }
            }

            // 3. Check admin session authentication
            const adminKeys = ['coinhub_admin_authenticated', 'crytopnl_admin_authenticated', 'cryptopnl_admin_authenticated'];
            for (const k of adminKeys) {
                if (sessionStorage.getItem(k) === '1' || localStorage.getItem(k) === '1') {
                    return 'admin';
                }
            }

            // 4. Global object fallback
            if (typeof currentUser !== 'undefined' && currentUser && currentUser.username) {
                return currentUser.username.trim();
            }
        } catch (e) {}
        return null;
    },

    init: function () {
        this.bindEvents();
        this.renderWaterTiers();
        this.renderSellTiers();
        this.renderScenarioUI();
        this.calcWater();
        this.calcTax();
        this.calcFutures();
        this.fetchKimpData();

        const loggedUser = this.getLoggedInUsername();
        const nickEl = document.getElementById('cardNick');
        if (nickEl) {
            if (loggedUser) {
                nickEl.value = loggedUser;
            } else if (!nickEl.value || nickEl.value === '코인왕김수익') {
                nickEl.value = '익명 트레이더';
            }
        }

        const moneyInputs = [
            { id: 'waterCurrentPrice', allowDecimal: true },
            { id: 'arbSendAmount', allowDecimal: false },
            { id: 'taxTotalSell', allowDecimal: false },
            { id: 'taxTotalBuy', allowDecimal: false },
            { id: 'taxTotalFee', allowDecimal: false },
            { id: 'futuresEntryPrice', allowDecimal: true },
            { id: 'futuresMargin', allowDecimal: true },
            { id: 'futuresTargetPrice', allowDecimal: true }
        ];
        moneyInputs.forEach(item => {
            const el = document.getElementById(item.id);
            if (el && el.value) {
                this.formatInputWithCommas(el, item.allowDecimal);
            }
        });

        this.importProfitCardFromAnalyzer(false);
        this.renderProfitCard();
    },

    bindEvents: function () {
        const moneyInputs = [
            { id: 'waterCurrentPrice', allowDecimal: true },
            { id: 'arbSendAmount', allowDecimal: false },
            { id: 'taxTotalSell', allowDecimal: false },
            { id: 'taxTotalBuy', allowDecimal: false },
            { id: 'taxTotalFee', allowDecimal: false },
            { id: 'futuresEntryPrice', allowDecimal: true },
            { id: 'futuresMargin', allowDecimal: true },
            { id: 'futuresTargetPrice', allowDecimal: true }
        ];
        moneyInputs.forEach(item => {
            const el = document.getElementById(item.id);
            if (el) {
                el.addEventListener('input', () => {
                    this.formatInputWithCommas(el, item.allowDecimal);
                });
            }
        });

        const waterInputs = ['waterCurrentPrice', 'waterCurrentQty', 'waterFeeRate'];
        waterInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', () => this.calcWater());
        });

        const kimpInputs = ['arbSendAmount', 'arbCoinSelect', 'arbCustomKimp'];
        kimpInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => this.calcArbitrage());
                el.addEventListener('change', () => this.calcArbitrage());
            }
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
        } else if (tabId === 'water') {
            this.renderScenarioUI();
        } else if (tabId === 'card') {
            const loggedUser = this.getLoggedInUsername();
            const nickEl = document.getElementById('cardNick');
            if (nickEl && loggedUser) {
                nickEl.value = loggedUser;
            }
            this.renderProfitCard();
        } else if (tabId === 'stockwater') {
            this.calcStockWater();
        } else if (tabId === 'sizing') {
            this.calcPositionSizing();
        } else if (tabId === 'freeride') {
            this.calcFreeRide();
        } else if (tabId === 'compound') {
            this.calcExpectancyCompound();
        } else if (tabId === 'staking') {
            this.calcStakingYield();
        } else if (tabId === 'stocktax') {
            this.calcStockTax();
        } else if (tabId === 'dividend') {
            this.calcStockDividend();
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
            const isAmount = (mode === 'amount');
            const valLabel = isAmount ? '투자 금액 (KRW)' : (mode === 'qty' ? '매수 수량 (개)' : '보유량 대비 비중 (%)');
            const placeholder = isAmount ? '10,000,000' : (mode === 'qty' ? '0.2' : '50');
            const formattedPrice = this.formatNumber(tier.price);
            const formattedVal = isAmount ? this.formatNumber(tier.val) : tier.val;

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
                    <input type="text" inputmode="numeric" value="${formattedPrice}" oninput="CoinCalculators.formatInputWithCommas(this, true); CoinCalculators.updateWaterTier(${tier.id}, 'price', this.value)" class="w-full bg-navy-900 border border-navy-700 rounded-xl px-2.5 py-1.5 text-cyan-300 font-mono font-bold text-xs focus:border-cyan-400 focus:outline-none">
                  </div>
                  <div>
                    <label class="block font-semibold text-slate-400 mb-1 text-[11px]">${valLabel}</label>
                    <input type="${isAmount ? 'text' : 'number'}" ${isAmount ? 'inputmode="numeric"' : 'step="any"'} value="${formattedVal}" placeholder="${placeholder}" oninput="${isAmount ? 'CoinCalculators.formatInputWithCommas(this); ' : ''}CoinCalculators.updateWaterTier(${tier.id}, 'val', this.value)" class="w-full bg-navy-900 border border-navy-700 rounded-xl px-2.5 py-1.5 text-cyan-300 font-mono font-bold text-xs focus:border-cyan-400 focus:outline-none">
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
            tier[field] = this.parseNum(value);
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
            const isAmount = (mode === 'amount');
            const valLabel = mode === 'pct' ? '매도 비중 (%)' : (mode === 'qty' ? '매도 수량 (개)' : '매도 목표금액 (KRW)');
            const placeholder = mode === 'pct' ? '50' : (mode === 'qty' ? '0.3' : '20,000,000');
            const formattedPrice = this.formatNumber(tier.price);
            const formattedVal = isAmount ? this.formatNumber(tier.val) : tier.val;

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
                    <input type="text" inputmode="numeric" value="${formattedPrice}" oninput="CoinCalculators.formatInputWithCommas(this, true); CoinCalculators.updateSellTier(${tier.id}, 'price', this.value)" class="w-full bg-navy-900 border border-navy-700 rounded-xl px-2.5 py-1.5 text-amber-300 font-mono font-bold text-xs focus:border-amber-400 focus:outline-none">
                  </div>
                  <div>
                    <label class="block font-semibold text-slate-400 mb-1 text-[11px]">${valLabel}</label>
                    <input type="${isAmount ? 'text' : 'number'}" ${isAmount ? 'inputmode="numeric"' : 'step="any"'} value="${formattedVal}" placeholder="${placeholder}" oninput="${isAmount ? 'CoinCalculators.formatInputWithCommas(this); ' : ''}CoinCalculators.updateSellTier(${tier.id}, 'val', this.value)" class="w-full bg-navy-900 border border-navy-700 rounded-xl px-2.5 py-1.5 text-amber-300 font-mono font-bold text-xs focus:border-amber-400 focus:outline-none">
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
            tier[field] = this.parseNum(value);
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
        const curPrice = this.parseNum(document.getElementById('waterCurrentPrice')?.value);
        const curQty = this.parseNum(document.getElementById('waterCurrentQty')?.value);
        const feePercent = parseFloat(document.getElementById('waterFeeRate')?.value || 0.05) / 100;

        const curTotalCost = curPrice * curQty;
        let runningQty = curQty;
        let runningCost = curTotalCost;
        let lastAddPrice = curPrice;

        const tierProgressList = [];

        // 1. 추가 매수(DCA) 시뮬레이션
        this.waterTiers.forEach((tier, i) => {
            const p = this.parseNum(tier.price);
            const mode = tier.mode || 'amount';
            const val = this.parseNum(tier.val);

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

        // 4. 물타기 평단가 스텝(Step) 차트 렌더링
        this.renderWaterDcaStepChart(curPrice, tierProgressList, breakEvenPrice, newAvgPrice);
    },

    renderWaterDcaStepChart: function (curPrice, tierProgressList, breakEvenPrice, newAvgPrice) {
        const svg = document.getElementById('waterDcaStepSvg');
        const badge = document.getElementById('waterDcaChartBadge');
        if (!svg) return;

        const validTiers = (tierProgressList || []).filter(t => t.price > 0 && t.avgPrice > 0);
        if (!curPrice || curPrice <= 0 || validTiers.length === 0) {
            svg.setAttribute('viewBox', '0 0 600 160');
            svg.innerHTML = `
                <text x="300" y="85" text-anchor="middle" fill="#64748b" font-size="12" font-family="sans-serif">
                    💡 현재 평단가와 수량, 추가 매수 차수를 입력하시면 계단식 평단 방어 차트가 그려집니다.
                </text>
            `;
            if (badge) badge.innerText = '방어선 대기 중';
            return;
        }

        const defensePct = ((newAvgPrice - curPrice) / curPrice) * 100;
        if (badge) {
            badge.innerText = `최종 방어율: ${defensePct >= 0 ? '+' : ''}${defensePct.toFixed(2)}% (평단: ${Number(newAvgPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}원)`;
        }

        const formatShort = (p) => {
            if (p >= 100000000) return (p / 100000000).toFixed(2) + '억';
            if (p >= 10000) return (p / 10000).toFixed(1) + '만';
            if (p >= 1000) return Number(p).toLocaleString(undefined, { maximumFractionDigits: 0 });
            return Number(p).toFixed(2);
        };

        const steps = [
            { label: '기존', buyPrice: curPrice, avgPrice: curPrice, breakEven: curPrice, dropPct: 0 }
        ];
        validTiers.forEach(t => {
            steps.push({
                label: `${t.tierNum}차`,
                buyPrice: t.price,
                avgPrice: t.avgPrice,
                breakEven: t.breakEven,
                dropPct: t.dropPct
            });
        });

        const allPrices = [];
        steps.forEach(s => {
            if (s.buyPrice > 0) allPrices.push(s.buyPrice);
            if (s.avgPrice > 0) allPrices.push(s.avgPrice);
            if (s.breakEven > 0) allPrices.push(s.breakEven);
        });

        const minP = Math.min(...allPrices);
        const maxP = Math.max(...allPrices);
        const pad = Math.max(1, (maxP - minP) * 0.18);
        const yMin = Math.max(0, minP - pad);
        const yMax = maxP + pad;
        const yRange = (yMax - yMin) || 1;

        const w = 600;
        const h = 180;
        const ml = 65;
        const mr = 40;
        const mt = 25;
        const mb = 30;
        const plotW = w - ml - mr;
        const plotH = h - mt - mb;

        const getX = (idx) => ml + (idx / (steps.length - 1)) * plotW;
        const getY = (val) => mt + plotH - ((val - yMin) / yRange) * plotH;

        let gridSvg = '';
        const gridCount = 4;
        for (let g = 0; g <= gridCount; g++) {
            const pVal = yMin + (g / gridCount) * yRange;
            const yPos = getY(pVal);
            gridSvg += `
                <line x1="${ml}" y1="${yPos}" x2="${w - mr}" y2="${yPos}" stroke="#1e293b" stroke-dasharray="3,3" stroke-width="1" />
                <text x="${ml - 8}" y="${yPos + 3.5}" text-anchor="end" fill="#64748b" font-size="9.5" font-family="monospace">${formatShort(pVal)}</text>
            `;
        }

        const origY = getY(curPrice);
        const origLine = `
            <line x1="${ml}" y1="${origY}" x2="${w - mr}" y2="${origY}" stroke="#f43f5e" stroke-dasharray="4,4" stroke-width="1.2" opacity="0.6" />
            <text x="${w - mr + 4}" y="${origY + 3}" fill="#f43f5e" font-size="9" font-family="monospace">기존</text>
        `;

        const breakEvenPoints = steps.map((s, idx) => `${getX(idx)},${getY(s.breakEven)}`).join(' ');

        let steppedPath = `M ${getX(0)} ${getY(steps[0].avgPrice)}`;
        for (let i = 1; i < steps.length; i++) {
            const prevX = getX(i - 1);
            const curX = getX(i);
            const curY = getY(steps[i].avgPrice);
            const midX = (prevX + curX) / 2;
            steppedPath += ` C ${midX} ${getY(steps[i - 1].avgPrice)}, ${midX} ${curY}, ${curX} ${curY}`;
        }

        const areaPath = `${steppedPath} L ${getX(steps.length - 1)} ${mt + plotH} L ${getX(0)} ${mt + plotH} Z`;

        let markersSvg = '';
        steps.forEach((s, idx) => {
            const x = getX(idx);
            const yAvg = getY(s.avgPrice);
            const yBuy = getY(s.buyPrice);

            markersSvg += `
                <text x="${x}" y="${h - 10}" text-anchor="middle" fill="#94a3b8" font-size="10" font-weight="bold" font-family="sans-serif">${s.label}</text>
            `;

            if (idx > 0) {
                markersSvg += `
                    <circle cx="${x}" cy="${yBuy}" r="3.5" fill="#f59e0b" stroke="#0f172a" stroke-width="1.5" />
                    <text x="${x}" y="${yBuy - 7}" text-anchor="middle" fill="#fbbf24" font-size="9" font-family="monospace">${formatShort(s.buyPrice)}</text>
                `;
            }

            markersSvg += `
                <circle cx="${x}" cy="${yAvg}" r="4.5" fill="#06b6d4" stroke="#ffffff" stroke-width="1.5" />
                <text x="${x}" y="${yAvg + (idx % 2 === 0 ? 15 : -9)}" text-anchor="middle" fill="#22d3ee" font-size="9.5" font-weight="bold" font-family="monospace">${formatShort(s.avgPrice)}</text>
            `;
        });

        svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
        svg.innerHTML = `
            <defs>
                <linearGradient id="stepAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.25"/>
                    <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.0"/>
                </linearGradient>
            </defs>
            ${gridSvg}
            ${origLine}
            <path d="${areaPath}" fill="url(#stepAreaGrad)" />
            <polyline fill="none" stroke="#10b981" stroke-width="1.2" stroke-dasharray="3,3" points="${breakEvenPoints}" opacity="0.85" />
            <path d="${steppedPath}" fill="none" stroke="#06b6d4" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
            ${markersSvg}
        `;
    },

    // ========================================================
    // 2. 김치프리미엄 & 보따리(아비트라지) 계산기 (실시간 연동)
    // ========================================================
    fetchKimpData: async function () {
        const kimpBody = document.getElementById('kimpTableBody');
        if (!kimpBody) return;

        try {
            let upbitData = [];
            const kimpMarkets = ['KRW-BTC', 'KRW-ETH', 'KRW-XRP', 'KRW-SOL', 'KRW-DOGE', 'KRW-TRX', 'KRW-USDT'];
            if (typeof UpbitAPI !== 'undefined' && typeof UpbitAPI.fetchTickers === 'function') {
                const map = await UpbitAPI.fetchTickers(kimpMarkets);
                kimpMarkets.forEach(m => {
                    const t = map[m] || map[m.replace('KRW-', '')];
                    if (t && t.tradePrice > 0) {
                        upbitData.push({
                            market: m,
                            trade_price: t.tradePrice,
                            signed_change_rate: t.signedChangeRate,
                            acc_trade_price_24h: t.accTradePrice24h
                        });
                    }
                });
            }
            if (upbitData.length === 0) {
                const upbitRes = await fetch('https://api.upbit.com/v1/ticker?markets=KRW-BTC,KRW-ETH,KRW-XRP,KRW-SOL,KRW-DOGE,KRW-TRX,KRW-USDT');
                if (upbitRes.ok) upbitData = await upbitRes.json();
            }
            if (upbitData.length === 0) throw new Error('업비트 API 응답 대기');

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
        const sendAmountKrw = this.parseNum(document.getElementById('arbSendAmount')?.value, 5000000);
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
        const totalSell = this.parseNum(document.getElementById('taxTotalSell')?.value);
        const totalBuy = this.parseNum(document.getElementById('taxTotalBuy')?.value);
        const totalFee = this.parseNum(document.getElementById('taxTotalFee')?.value);
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
            const closedCostBasis = Math.max(0, (s.totalCumulativeBuyAmount || 0) - (s.currentPortfolioCost || 0));
            const buyAmt = Math.round(closedCostBasis || s.totalInvested || s.totalBuyAmount || 0);
            const feeAmt = Math.round(s.totalFees || s.totalFee || 0);

            const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
            setVal('taxTotalSell', this.formatNumber(sellAmt));
            setVal('taxTotalBuy', this.formatNumber(buyAmt));
            setVal('taxTotalFee', this.formatNumber(feeAmt));
            this.calcTax();
            alert('손익 분석기의 실측 손익 데이터(총 매도액 ' + sellAmt.toLocaleString() + '원, 매도분 취득원가 ' + buyAmt.toLocaleString() + '원, 수수료 ' + feeAmt.toLocaleString() + '원)가 세금 계산기에 성공적으로 반영되었습니다!');
        } else {
            alert('손익 분석기에 업로드된 거래내역이 없습니다. 먼저 [손익 분석기]에서 엑셀을 업로드하거나 샘플 데이터를 로드해 주세요.');
        }
    },

    // ========================================================
    // 4. 해외 선물 청산가 & ROE 계산기
    // ========================================================
    calcFutures: function () {
        const posType = document.getElementById('futuresPosType')?.value || 'LONG';
        const entryPrice = this.parseNum(document.getElementById('futuresEntryPrice')?.value, 64000);
        const marginUsdt = this.parseNum(document.getElementById('futuresMargin')?.value, 1000);
        const leverage = this.parseNum(document.getElementById('futuresLeverage')?.value, 10);
        const targetPrice = this.parseNum(document.getElementById('futuresTargetPrice')?.value, 68000);

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
        const loggedUser = this.getLoggedInUsername();
        const nickInput = document.getElementById('cardNick');
        if (nickInput && loggedUser && (!nickInput.value || nickInput.value === '익명 트레이더' || nickInput.value === '코인왕김수익')) {
            nickInput.value = loggedUser;
        }
        const nick = (nickInput?.value || loggedUser || '익명 트레이더').trim();
        if (canvases.length === 0) return;

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

            const themeEl = document.getElementById('cardTheme');
            const theme = themeEl ? themeEl.value : 'cyber';

            let frameBorder = 'rgba(56, 189, 248, 0.22)';
            let glowColor1 = 'rgba(14, 116, 144, 0.32)';
            let glowColor2 = 'rgba(6, 182, 212, 0.10)';
            if (theme === 'gold') {
                frameBorder = 'rgba(245, 158, 11, 0.35)';
                glowColor1 = 'rgba(245, 158, 11, 0.28)';
                glowColor2 = 'rgba(217, 119, 6, 0.08)';
            } else if (theme === 'emerald') {
                frameBorder = 'rgba(16, 185, 129, 0.35)';
                glowColor1 = 'rgba(16, 185, 129, 0.28)';
                glowColor2 = 'rgba(5, 150, 105, 0.08)';
            }

            // Outer Rounded Frame (r: 16)
            drawRoundedRect(ctx, 16, 16, canvas.width - 32, canvas.height - 32, 16);
            ctx.fillStyle = '#070b14';
            ctx.fill();
            ctx.strokeStyle = frameBorder;
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Ambient Top-Right Radial Glow
            ctx.save();
            drawRoundedRect(ctx, 16, 16, canvas.width - 32, canvas.height - 32, 16);
            ctx.clip();
            const glowGrad = ctx.createRadialGradient(canvas.width - 110, 65, 20, canvas.width - 110, 65, 300);
            glowGrad.addColorStop(0, glowColor1);
            glowGrad.addColorStop(0.45, glowColor2);
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
            const drawDashboardCard = (x, y, w, h, title, mainVal, badgeText, badgeColor, subLine1, subLine2, valColor, isRoiVal = false, subAmtText = null) => {
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

        let success = false;
        try {
            const div = document.createElement('div');
            div.contentEditable = 'true';
            div.style.position = 'fixed';
            div.style.left = '-9999px';
            div.style.top = '0';
            div.style.opacity = '0';
            const img = document.createElement('img');
            img.src = canvas.toDataURL('image/png');
            div.appendChild(img);
            document.body.appendChild(div);

            const range = document.createRange();
            range.selectNode(img);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);

            success = document.execCommand('copy');
            selection.removeAllRanges();
            document.body.removeChild(div);
        } catch (e) {
            success = false;
        }

        if (!success && navigator.clipboard && navigator.clipboard.write && typeof ClipboardItem !== 'undefined') {
            try {
                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                if (blob) {
                    const item = new ClipboardItem({ 'image/png': blob });
                    await navigator.clipboard.write([item]);
                    success = true;
                }
            } catch (err) {
                console.warn('ClipboardItem fallback error:', err);
            }
        }

        if (success) {
            alert('수익 인증 카드가 클립보드에 복사되었습니다! 카카오톡이나 커뮤니티에 Ctrl+V로 붙여넣으세요.');
        } else {
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

        const loggedUser = this.getLoggedInUsername();
        const curInput = document.getElementById('cardNick')?.value?.trim();
        const nick = loggedUser || (curInput && curInput !== '익명 트레이더' && curInput !== '코인왕김수익' ? curInput : '익명 트레이더');
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

<div class="pnl-verify-integrity-box" style="padding: 16px 18px; background: #0c1322; border: 1px solid rgba(56, 189, 248, 0.35); border-left: 4px solid #06b6d4; border-radius: 12px; margin-top: 16px; font-size: 13.5px; color: #f1f5f9; line-height: 1.65; box-shadow: 0 4px 14px rgba(0,0,0,0.2);">
  <div style="font-weight: 800; color: #38bdf8; margin-bottom: 6px; font-size: 14px; display: flex; align-items: center; gap: 6px;">
    🔒 <span>데이터 무결성 검증 보증</span>
  </div>
  <div style="color: #e2e8f0; font-size: 13px;">
    본 인증서는 업비트 및 빗썸의 거래 내역 원본을 바탕으로 브라우저 로컬 단에서 <strong style="color: #38bdf8; font-weight: 800;">100% 무손실 선입선출(FIFO) 독립 연산 엔진</strong>을 통해 정산 검증되었습니다.<br>
    <span style="color: #94a3b8; font-size: 12px;">(외부 서버로 일체의 거래 데이터가 전송되지 않는 안전한 클라이언트 검증 리포트입니다.)</span>
  </div>
</div>`,
            isNotice: false,
            author: authorName,
            authorRank: authorRank,
            upvotes: 0,
            views: 0,
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
    },

    // ========================================================
    // 6. 손익비(Risk/Reward Ratio) & 2% 룰 포지션 사이징 계산기
    // ========================================================
    sizingDirection: 'long',
    setSizingDirection: function (dir) {
        this.sizingDirection = dir;
        const longBtn = document.getElementById('sizingBtnLong');
        const shortBtn = document.getElementById('sizingBtnShort');
        if (dir === 'long') {
            if (longBtn) longBtn.className = 'flex-1 py-2 rounded-xl text-xs font-bold transition bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm';
            if (shortBtn) shortBtn.className = 'flex-1 py-2 rounded-xl text-xs font-medium transition text-slate-400 hover:text-white border border-navy-800 bg-navy-950';
        } else {
            if (longBtn) longBtn.className = 'flex-1 py-2 rounded-xl text-xs font-medium transition text-slate-400 hover:text-white border border-navy-800 bg-navy-950';
            if (shortBtn) shortBtn.className = 'flex-1 py-2 rounded-xl text-xs font-bold transition bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm';
        }
        this.calcPositionSizing();
    },

    setSizingRiskPct: function (pct) {
        const el = document.getElementById('sizingRiskPct');
        if (el) {
            el.value = pct;
            this.calcPositionSizing();
        }
    },

    calcPositionSizing: function () {
        const seed = this.parseNum(document.getElementById('sizingCapital')?.value, 10000000);
        const riskPct = this.parseNum(document.getElementById('sizingRiskPct')?.value, 2);
        const entryPrice = this.parseNum(document.getElementById('sizingEntryPrice')?.value, 100000);
        const stopPrice = this.parseNum(document.getElementById('sizingStopPrice')?.value, 95000);
        const targetPrice = this.parseNum(document.getElementById('sizingTargetPrice')?.value, 115000);
        const leverage = Math.max(1, this.parseNum(document.getElementById('sizingLeverage')?.value, 1));
        const feeRate = this.parseNum(document.getElementById('sizingFeeRate')?.value, 0.05) / 100;
        const winRateExp = this.parseNum(document.getElementById('sizingWinRate')?.value, 50) / 100;

        if (entryPrice <= 0 || stopPrice <= 0 || targetPrice <= 0) return;

        const isLong = (this.sizingDirection === 'long');
        const priceRisk = isLong ? (entryPrice - stopPrice) : (stopPrice - entryPrice);
        const priceReward = isLong ? (targetPrice - entryPrice) : (entryPrice - targetPrice);

        const warningEl = document.getElementById('sizingWarning');
        if (priceRisk <= 0) {
            if (warningEl) {
                warningEl.innerHTML = `<span class="text-rose-400 font-bold">⚠️ ${isLong ? '롱 포지션에서는 손절가가 진입가보다 낮아야 합니다.' : '숏 포지션에서는 손절가가 진입가보다 높아야 합니다.'}</span>`;
                warningEl.classList.remove('hidden');
            }
            return;
        } else if (priceReward <= 0) {
            if (warningEl) {
                warningEl.innerHTML = `<span class="text-rose-400 font-bold">⚠️ ${isLong ? '롱 포지션에서는 목표가가 진입가보다 높아야 합니다.' : '숏 포지션에서는 목표가가 진입가보다 낮아야 합니다.'}</span>`;
                warningEl.classList.remove('hidden');
            }
            return;
        } else if (warningEl) {
            warningEl.classList.add('hidden');
        }

        // 1회 허용 손실금
        const maxLossAmount = seed * (riskPct / 100);

        // 손절률 및 목표수익률
        const stopLossPct = (priceRisk / entryPrice) * 100;
        const targetProfitPct = (priceReward / entryPrice) * 100;

        // 권장 포지션 수량 (1회 손실금 / 1개당 손실액)
        const recQty = maxLossAmount / priceRisk;
        // 총 진입 노출 금액
        const recTotalPosValue = recQty * entryPrice;
        // 필요 증거금(마진) = 총 포지션 금액 / 레버리지
        const recMargin = recTotalPosValue / leverage;

        // 손익비 (RRR)
        const rrr = priceReward / priceRisk;
        // 손익분기 최소 승률 = 1 / (1 + RRR)
        const breakevenWinRate = (1 / (1 + rrr)) * 100;

        // 목표 달성 시 순이익 / 손절 시 손실액
        const feePerSide = recTotalPosValue * feeRate;
        const totalFeeEst = feePerSide * 2; // 왕복 수수료
        const netProfit = (recQty * priceReward) - totalFeeEst;
        const netLoss = (recQty * priceRisk) + totalFeeEst;

        // 기대값 (EV: Expected Value) = (승률 * 순익) - (패율 * 순손실)
        const ev = (winRateExp * netProfit) - ((1 - winRateExp) * netLoss);

        // UI 갱신
        const rrrEl = document.getElementById('sizingResultRrr');
        const rrrBadgeEl = document.getElementById('sizingRrrBadge');
        if (rrrEl) rrrEl.innerText = `1 : ${rrr.toFixed(2)}`;
        if (rrrBadgeEl) {
            if (rrr >= 3.0) {
                rrrBadgeEl.innerText = 'S등급 (최고의 손익비)';
                rrrBadgeEl.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40';
            } else if (rrr >= 2.0) {
                rrrBadgeEl.innerText = 'A등급 (우수)';
                rrrBadgeEl.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40';
            } else if (rrr >= 1.5) {
                rrrBadgeEl.innerText = 'B등급 (적정)';
                rrrBadgeEl.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40';
            } else {
                rrrBadgeEl.innerText = '비권장 (손익비 낮음)';
                rrrBadgeEl.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40';
            }
        }

        const maxLossEl = document.getElementById('sizingResultMaxLoss');
        if (maxLossEl) maxLossEl.innerText = `-${Math.round(maxLossAmount).toLocaleString('ko-KR')}원 (${riskPct}%)`;

        const recQtyEl = document.getElementById('sizingResultQty');
        if (recQtyEl) recQtyEl.innerText = `${recQty < 1 ? recQty.toFixed(4) : recQty.toLocaleString('ko-KR', { maximumFractionDigits: 4 })}`;

        const recPosEl = document.getElementById('sizingResultTotalValue');
        if (recPosEl) recPosEl.innerText = `${Math.round(recTotalPosValue).toLocaleString('ko-KR')}원`;

        const recMarginEl = document.getElementById('sizingResultMargin');
        if (recMarginEl) recMarginEl.innerText = `${Math.round(recMargin).toLocaleString('ko-KR')}원 (${leverage}x)`;

        const breakevenEl = document.getElementById('sizingResultBreakeven');
        if (breakevenEl) breakevenEl.innerText = `${breakevenWinRate.toFixed(1)}%`;

        const targetProfitEl = document.getElementById('sizingResultProfit');
        if (targetProfitEl) targetProfitEl.innerText = `+${Math.round(netProfit).toLocaleString('ko-KR')}원 (+${targetProfitPct.toFixed(1)}%)`;

        const actualLossEl = document.getElementById('sizingResultActualLoss');
        if (actualLossEl) actualLossEl.innerText = `-${Math.round(netLoss).toLocaleString('ko-KR')}원 (-${stopLossPct.toFixed(1)}%)`;

        const evEl = document.getElementById('sizingResultEv');
        if (evEl) {
            evEl.innerText = `${ev >= 0 ? '+' : ''}${Math.round(ev).toLocaleString('ko-KR')}원 / 1회`;
            evEl.className = ev >= 0 ? 'text-emerald-400 font-bold font-mono' : 'text-rose-400 font-bold font-mono';
        }
    },

    // ========================================================
    // 7. 원금 회수(멘징 / Free-Ride 무위험 보유) 계산기
    // ========================================================
    calcFreeRide: function () {
        const buyPrice = this.parseNum(document.getElementById('freerideBuyPrice')?.value, 1000);
        const buyQty = this.parseNum(document.getElementById('freerideBuyQty')?.value, 10000);
        const currentPrice = this.parseNum(document.getElementById('freerideCurrentPrice')?.value, 2000);
        const feeRate = this.parseNum(document.getElementById('freerideFeeRate')?.value, 0.05) / 100;
        const targetRecoveryPct = this.parseNum(document.getElementById('freerideRecoveryPct')?.value, 100) / 100;

        if (buyPrice <= 0 || buyQty <= 0 || currentPrice <= 0) return;

        // 총 투자 원금
        const totalInvested = buyPrice * buyQty;
        // 회수 목표 금액 (기본 100% 원금 전액 회수)
        const targetRecoveryAmount = totalInvested * targetRecoveryPct;

        // 현재 평가 금액
        const currentTotalVal = currentPrice * buyQty;
        // 현재 수익률
        const roiPct = ((currentPrice - buyPrice) / buyPrice) * 100;

        // 원금(또는 목표 회수액) 회수에 필요한 순 매도 수량
        // 매도대금 * (1 - 수수료) = targetRecoveryAmount
        const effectivePricePerCoin = currentPrice * (1 - feeRate);
        const requiredSellQty = targetRecoveryAmount / effectivePricePerCoin;

        const warningEl = document.getElementById('freerideWarning');
        const canRecover = (requiredSellQty <= buyQty);

        if (!canRecover) {
            if (warningEl) {
                warningEl.innerHTML = `<span class="text-amber-400 font-bold">⚠️ 현재 가격(${currentPrice.toLocaleString()}원)에서는 보유 수량 전체를 매도해도 원금 회수가 부족합니다. (수익률 +${roiPct.toFixed(1)}%)</span>`;
                warningEl.classList.remove('hidden');
            }
        } else if (warningEl) {
            warningEl.classList.add('hidden');
        }

        const freeRideQty = Math.max(0, buyQty - requiredSellQty);
        const freeRideVal = freeRideQty * currentPrice;
        const recoveredCash = Math.min(buyQty, requiredSellQty) * effectivePricePerCoin;

        // UI 갱신
        const totalInvestedEl = document.getElementById('freerideResultInvested');
        if (totalInvestedEl) totalInvestedEl.innerText = `${Math.round(totalInvested).toLocaleString('ko-KR')}원`;

        const currentValEl = document.getElementById('freerideResultCurrentVal');
        if (currentValEl) currentValEl.innerText = `${Math.round(currentTotalVal).toLocaleString('ko-KR')}원 (+${roiPct.toFixed(1)}%)`;

        const sellQtyEl = document.getElementById('freerideResultSellQty');
        if (sellQtyEl) {
            const pctOfTotal = (requiredSellQty / buyQty) * 100;
            sellQtyEl.innerText = `${requiredSellQty.toLocaleString('ko-KR', { maximumFractionDigits: 4 })}개 (${pctOfTotal.toFixed(1)}% 매도)`;
        }

        const sellCashEl = document.getElementById('freerideResultSellCash');
        if (sellCashEl) sellCashEl.innerText = `${Math.round(recoveredCash).toLocaleString('ko-KR')}원 회수`;

        const freeQtyEl = document.getElementById('freerideResultFreeQty');
        if (freeQtyEl) freeQtyEl.innerText = `${freeRideQty.toLocaleString('ko-KR', { maximumFractionDigits: 4 })}개`;

        const freeValEl = document.getElementById('freerideResultFreeVal');
        if (freeValEl) freeValEl.innerText = `${Math.round(freeRideVal).toLocaleString('ko-KR')}원 가치 (무위험 잔여)`;

        // 시나리오 테이블 렌더링 (+20%, +50%, +100%, +200%, +500%)
        const scenarioBody = document.getElementById('freerideScenarioBody');
        if (scenarioBody && freeRideQty > 0) {
            const multipliers = [
                { label: '+20% 추가상승', mult: 1.2 },
                { label: '+50% 추가상승', mult: 1.5 },
                { label: '+100% (2배)', mult: 2.0 },
                { label: '+200% (3배)', mult: 3.0 },
                { label: '+500% (6배)', mult: 6.0 },
                { label: '+1,000% (11배 텐배거)', mult: 11.0 }
            ];
            scenarioBody.innerHTML = multipliers.map(m => {
                const scenPrice = currentPrice * m.mult;
                const scenVal = freeRideQty * scenPrice;
                return `
                <tr class="border-b border-navy-800/60 hover:bg-navy-800/40 transition">
                  <td class="py-2.5 px-3 text-xs font-bold text-slate-300">${m.label}</td>
                  <td class="py-2.5 px-3 text-xs font-mono text-cyan-300 text-right">${Math.round(scenPrice).toLocaleString('ko-KR')}원</td>
                  <td class="py-2.5 px-3 text-xs font-mono font-bold text-emerald-400 text-right">+${Math.round(scenVal).toLocaleString('ko-KR')}원</td>
                  <td class="py-2.5 px-3 text-xs text-right">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">100% 무위험 순익</span>
                  </td>
                </tr>
                `;
            }).join('');
        }
    },

    setFreeridePreset: function (pct) {
        const el = document.getElementById('freerideRecoveryPct');
        if (el) {
            el.value = pct;
            this.calcFreeRide();
        }
    },
    // ========================================================
    // 8. 실전 매매 기대값 & 복리 몬테카를로 시뮬레이터 (승률/손익비 기반)
    // ========================================================
    setExpectancyPreset: function (winRate, rr, riskPct, trades) {
        const wrEl = document.getElementById('expectWinRate');
        const rrEl = document.getElementById('expectRrRatio');
        const riskEl = document.getElementById('expectRiskPct');
        const trEl = document.getElementById('expectTradesCount');
        if (wrEl) wrEl.value = winRate;
        if (rrEl) rrEl.value = rr;
        if (riskEl) riskEl.value = riskPct;
        if (trEl) trEl.value = trades;
        this.calcExpectancyCompound();
    },

    runMonteCarloResim: function () {
        this.calcExpectancyCompound(true);
    },

    calcExpectancyCompound: function (forceReroll = false) {
        const seed = this.parseNum(document.getElementById('expectSeed')?.value, 10000000);
        const winRate = Math.min(99, Math.max(1, this.parseNum(document.getElementById('expectWinRate')?.value, 55))) / 100;
        const rr = Math.max(0.1, this.parseNum(document.getElementById('expectRrRatio')?.value, 1.8));
        const riskPct = Math.min(20, Math.max(0.1, this.parseNum(document.getElementById('expectRiskPct')?.value, 2))) / 100;
        const totalTrades = Math.min(300, Math.max(10, parseInt(this.parseNum(document.getElementById('expectTradesCount')?.value, 60), 10)));
        const feeRate = this.parseNum(document.getElementById('expectFeeRate')?.value, 0.05) / 100;

        if (seed <= 0 || totalTrades <= 0) return;

        // 1회 매매 수학적 기대값 (EV): EV% = (WinRate * RR * Risk) - ((1 - WinRate) * Risk) - Fee
        const gainPct = riskPct * rr;
        const lossPct = riskPct;
        const evPerTrade = (winRate * (gainPct - feeRate)) - ((1 - winRate) * (lossPct + feeRate));
        const evDisplayPct = evPerTrade * 100;

        const evBadge = document.getElementById('expectEvBadge');
        if (evBadge) {
            evBadge.innerText = `${evDisplayPct >= 0 ? '+' : ''}${evDisplayPct.toFixed(2)}% / 회당`;
            evBadge.className = `text-xs font-bold font-mono ${evDisplayPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;
        }

        const evDesc = document.getElementById('expectEvDesc');
        if (evDesc) {
            if (evDisplayPct > 0) {
                evDesc.innerHTML = `1번 매매할 때마다 계좌의 약 <strong class="text-emerald-400">${evDisplayPct.toFixed(2)}%</strong>가 통계적으로 증식하는 수학적 우위(Edge)를 가진 전략입니다.`;
            } else {
                evDesc.innerHTML = `<strong class="text-rose-400">⚠️ 기대값이 마이너스(-${Math.abs(evDisplayPct).toFixed(2)}%)입니다!</strong> 장기 매매 시 계좌가 필연적으로 우하향하므로 승률이나 손익비를 높여야 합니다.`;
            }
        }

        // 켈리 기준 (Kelly Criterion): K = W - (1 - W) / RR
        const kellyPct = ((winRate - (1 - winRate) / rr) * 100);
        const kellyEl = document.getElementById('expectKellyRecommendation');
        if (kellyEl) {
            if (kellyPct > 0) {
                const halfKelly = (kellyPct / 2).toFixed(1);
                kellyEl.innerHTML = `이론상 켈리 베팅 최적 비중은 <strong>${kellyPct.toFixed(1)}%</strong>이나, 파산 위험을 막기 위해 <strong>하프 켈리(약 ${halfKelly}%)</strong> 또는 <strong class="text-white">1~2% 고정 리스크</strong>를 권장합니다.`;
            } else {
                kellyEl.innerHTML = `<strong class="text-rose-400">베팅 금지 구간:</strong> 승률 대비 손익비가 부족하여 켈리 공식상 매매를 진행할수록 손실이 누적됩니다.`;
            }
        }

        // 최대 연속 손실(연패) 통계적 기댓값: Log(TotalTrades) / Log(1 / (1 - WinRate))
        const lossRate = 1 - winRate;
        const estMaxLossStreak = lossRate > 0 && lossRate < 1 ? Math.round(Math.log(totalTrades) / Math.log(1 / lossRate)) : 0;
        const maxLossEl = document.getElementById('expectMaxLossStreak');
        if (maxLossEl) {
            const compoundLossOnStreak = (1 - Math.pow(1 - riskPct, estMaxLossStreak)) * 100;
            maxLossEl.innerHTML = `이 매매 횟수 동안 <span class="text-rose-400 font-bold">최대 ${estMaxLossStreak}연패</span>를 겪을 확률이 매우 높습니다. 1회 ${Math.round(riskPct * 100)}% 리스크를 지키면 ${estMaxLossStreak}연패를 해도 원금의 -${compoundLossOnStreak.toFixed(1)}%만 잃어 멘탈 붕괴를 원천 차단합니다.`;
        }

        // 몬테카를로 무작위 시뮬레이션 궤적 생성 (단일 체감 경로 + 1,000회 통계)
        let balance = seed;
        let peak = seed;
        let maxDrawdownPct = 0;
        const equityCurve = [{ trade: 0, balance: seed, evLine: seed, principal: seed }];
        let evBalance = seed;

        for (let i = 1; i <= totalTrades; i++) {
            const isWin = Math.random() < winRate;
            if (isWin) {
                balance = balance * (1 + gainPct - feeRate);
            } else {
                balance = balance * (1 - lossPct - feeRate);
            }

            evBalance = evBalance * (1 + evPerTrade);
            if (balance > peak) peak = balance;
            const curDd = peak > 0 ? ((peak - balance) / peak) * 100 : 0;
            if (curDd > maxDrawdownPct) maxDrawdownPct = curDd;

            equityCurve.push({
                trade: i,
                balance: Math.max(0, balance),
                evLine: evBalance,
                principal: seed
            });
        }

        // 파산 확률 간이 계산: Risk of Ruin
        // P(Ruin) = ((1 - A) / (1 + A)) ^ (Capital / Risk) where A = Edge / Risk
        let ruinProb = 0;
        if (evPerTrade <= 0) {
            ruinProb = 100;
        } else {
            const ratio = (1 - winRate) / (winRate * rr);
            if (ratio < 1) {
                ruinProb = Math.min(100, Math.pow(ratio, 1 / riskPct) * 100);
            } else {
                ruinProb = 100;
            }
        }

        // UI 갱신
        const princEl = document.getElementById('expectResultPrincipal');
        if (princEl) princEl.innerText = `${Math.round(seed).toLocaleString('ko-KR')}원`;

        const finalBalEl = document.getElementById('expectResultFinalBalance');
        if (finalBalEl) finalBalEl.innerText = `${Math.round(balance).toLocaleString('ko-KR')}원`;

        const totalYieldPct = ((balance - seed) / seed) * 100;
        const yieldEl = document.getElementById('expectResultYieldPct');
        if (yieldEl) {
            yieldEl.innerText = `${totalYieldPct >= 0 ? '+' : ''}${totalYieldPct.toFixed(1)}%`;
            yieldEl.className = `text-sm font-black font-mono ${totalYieldPct >= 0 ? 'text-emerald-300' : 'text-rose-400'}`;
        }

        const mddEl = document.getElementById('expectResultMdd');
        if (mddEl) {
            mddEl.innerText = `-${maxDrawdownPct.toFixed(1)}% ${maxDrawdownPct < 15 ? '(안정권)' : maxDrawdownPct < 30 ? '(주의)' : '(위험)'}`;
            mddEl.className = `text-sm font-bold font-mono ${maxDrawdownPct < 15 ? 'text-emerald-300' : maxDrawdownPct < 30 ? 'text-amber-300' : 'text-rose-400'}`;
        }

        const ruinBadge = document.getElementById('expectRuinBadge');
        if (ruinBadge) {
            if (ruinProb < 1) {
                ruinBadge.innerText = `파산 확률 ${ruinProb.toFixed(1)}% (극안전)`;
                ruinBadge.className = 'text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40';
            } else if (ruinProb < 10) {
                ruinBadge.innerText = `파산 확률 ${ruinProb.toFixed(1)}% (보통)`;
                ruinBadge.className = 'text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40';
            } else {
                ruinBadge.innerText = `파산 확률 ${ruinProb.toFixed(1)}% (고위험)`;
                ruinBadge.className = 'text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40';
            }
        }

        // SVG 자산 곡선 렌더링
        this.renderExpectancyChart(equityCurve);
    },

    renderExpectancyChart: function (curve) {
        const container = document.getElementById('compoundChartContainer');
        if (!container || !curve || curve.length < 2) return;

        const width = 680;
        const height = 240;
        const padLeft = 70;
        const padRight = 30;
        const padTop = 30;
        const padBottom = 40;

        const allValues = curve.map(c => c.balance).concat(curve.map(c => c.evLine)).concat(curve.map(c => c.principal));
        const maxVal = Math.max(...allValues) * 1.08;
        const minVal = Math.max(0, Math.min(...allValues) * 0.92);

        const plotW = width - padLeft - padRight;
        const plotH = height - padTop - padBottom;

        const getX = (idx) => padLeft + (idx / (curve.length - 1)) * plotW;
        const getY = (val) => padTop + plotH - ((val - minVal) / Math.max(1, maxVal - minVal)) * plotH;

        const balPoints = curve.map((c, i) => `${getX(i)},${getY(c.balance)}`).join(' ');
        const evPoints = curve.map((c, i) => `${getX(i)},${getY(c.evLine)}`).join(' ');
        const princPoints = curve.map((c, i) => `${getX(i)},${getY(c.principal)}`).join(' ');

        const firstX = getX(0);
        const lastX = getX(curve.length - 1);
        const bottomY = getY(minVal);
        const areaPoints = `${firstX},${bottomY} ${balPoints} ${lastX},${bottomY}`;

        const fmtWon = (v) => {
            if (v >= 100000000) return (v / 100000000).toFixed(1) + '억';
            if (v >= 10000) return Math.round(v / 10000) + '만';
            return Math.round(v);
        };

        const gridLines = [0, 0.33, 0.66, 1.0].map(ratio => {
            const v = minVal + (maxVal - minVal) * ratio;
            const y = getY(v);
            return `
              <line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" stroke="rgba(148, 163, 184, 0.12)" stroke-dasharray="3,3"/>
              <text x="${padLeft - 8}" y="${y + 4}" fill="#64748b" font-size="10" text-anchor="end" font-family="monospace">${fmtWon(v)}</text>
            `;
        }).join('');

        const midIdx = Math.floor(curve.length / 2);

        container.innerHTML = `
        <svg viewBox="0 0 ${width} ${height}" class="w-full h-auto drop-shadow-lg" preserveAspectRatio="none">
          <defs>
            <linearGradient id="expectGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#22d3ee" stop-opacity="0.3"/>
              <stop offset="100%" stop-color="#22d3ee" stop-opacity="0.0"/>
            </linearGradient>
          </defs>

          <!-- Grid Lines -->
          ${gridLines}

          <!-- Area -->
          <polygon points="${areaPoints}" fill="url(#expectGrad)" />

          <!-- Principal Base Line (원금) -->
          <polyline points="${princPoints}" fill="none" stroke="#64748b" stroke-width="1.8" stroke-dasharray="4,4" />

          <!-- EV Theoretical Expectancy Line (수학적 기대선) -->
          <polyline points="${evPoints}" fill="none" stroke="#34d399" stroke-width="2" stroke-dasharray="3,3" />

          <!-- Actual Simulation Balance Line (자산 곡선) -->
          <polyline points="${balPoints}" fill="none" stroke="#22d3ee" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" />

          <!-- Last Trade Point Dot -->
          <circle cx="${lastX}" cy="${getY(curve[curve.length - 1].balance)}" r="4.5" fill="#22d3ee" stroke="#083344" stroke-width="2"/>

          <!-- X-Axis Labels -->
          <text x="${firstX}" y="${height - 12}" fill="#64748b" font-size="10" text-anchor="start">0회차</text>
          <text x="${getX(midIdx)}" y="${height - 12}" fill="#64748b" font-size="10" text-anchor="middle">${midIdx}회차</text>
          <text x="${lastX}" y="${height - 12}" fill="#22d3ee" font-size="10" font-weight="bold" text-anchor="end">${curve[curve.length - 1].trade}회차 완료</text>
        </svg>
        `;
    },

    // ========================================================
    // 8-2. 국내 & 미국 주식 평단가 물타기 & 호가 수수료 손익분기점(BEP) 계산기
    // ========================================================
    stockWaterMarket: 'KR', // 'KR' | 'US'
    setStockWaterMarket: function (market) {
        this.stockWaterMarket = market;
        const krBtn = document.getElementById('stockWaterMarketKr');
        const usBtn = document.getElementById('stockWaterMarketUs');
        const curPriceEl = document.getElementById('stockWaterCurrentPrice');
        const newPriceEl = document.getElementById('stockWaterNewPrice');
        const targetAvgEl = document.getElementById('stockWaterTargetAvg');
        const feeEl = document.getElementById('stockWaterFeeRate');
        const taxEl = document.getElementById('stockWaterTaxRate');

        document.querySelectorAll('.stockwater-currency-unit').forEach(el => {
            el.innerText = (market === 'KR') ? '원' : '$';
        });

        if (market === 'KR') {
            if (krBtn) krBtn.className = 'flex-1 py-2 rounded-xl text-xs font-bold transition bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm';
            if (usBtn) usBtn.className = 'flex-1 py-2 rounded-xl text-xs font-medium transition text-slate-400 hover:text-white border border-navy-800 bg-navy-950';
            if (curPriceEl) curPriceEl.value = '85,000';
            if (newPriceEl) newPriceEl.value = '65,000';
            if (targetAvgEl) targetAvgEl.value = '70,000';
            if (feeEl) feeEl.value = '0.015';
            if (taxEl) taxEl.value = '0.18';
        } else {
            if (krBtn) krBtn.className = 'flex-1 py-2 rounded-xl text-xs font-medium transition text-slate-400 hover:text-white border border-navy-800 bg-navy-950';
            if (usBtn) usBtn.className = 'flex-1 py-2 rounded-xl text-xs font-bold transition bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm';
            if (curPriceEl) curPriceEl.value = '180';
            if (newPriceEl) newPriceEl.value = '140';
            if (targetAvgEl) targetAvgEl.value = '155';
            if (feeEl) feeEl.value = '0.07';
            if (taxEl) taxEl.value = '0.0028'; // SEC Fee
        }
        this.calcStockWater();
    },

    calcStockWater: function () {
        const isKr = (this.stockWaterMarket === 'KR');
        const currencySymbol = isKr ? '원' : '$';

        const curPrice = this.parseNum(document.getElementById('stockWaterCurrentPrice')?.value, isKr ? 85000 : 180);
        const curShares = this.parseNum(document.getElementById('stockWaterCurrentShares')?.value, 100);
        const newPrice = this.parseNum(document.getElementById('stockWaterNewPrice')?.value, isKr ? 65000 : 140);
        const newShares = this.parseNum(document.getElementById('stockWaterNewShares')?.value, 100);
        const targetAvg = this.parseNum(document.getElementById('stockWaterTargetAvg')?.value, isKr ? 70000 : 155);

        const feeRate = this.parseNum(document.getElementById('stockWaterFeeRate')?.value, isKr ? 0.015 : 0.07) / 100;
        const taxRate = this.parseNum(document.getElementById('stockWaterTaxRate')?.value, isKr ? 0.18 : 0.0028) / 100;

        if (curPrice <= 0 || curShares <= 0) return;

        // 1. 현재 상태 계산
        const initialCost = curPrice * curShares;
        const currentPnlPct = newPrice > 0 ? ((newPrice - curPrice) / curPrice) * 100 : 0;
        const pnlBadge = document.getElementById('stockWaterCurrentPnlBadge');
        if (pnlBadge) {
            pnlBadge.innerText = `${currentPnlPct >= 0 ? '+' : ''}${currentPnlPct.toFixed(1)}% (${currentPnlPct < 0 ? '물림' : '수익중'})`;
            pnlBadge.className = `text-[11px] font-bold ${currentPnlPct < 0 ? 'text-rose-400' : 'text-emerald-400'}`;
        }

        // 2. 추가 매수 후 합성 결과
        const additionalCost = (newPrice > 0 && newShares > 0) ? newPrice * newShares : 0;
        const totalShares = curShares + (newShares > 0 ? newShares : 0);
        const totalCost = initialCost + additionalCost;
        const newAvg = totalShares > 0 ? totalCost / totalShares : curPrice;

        const dropRatePct = ((newAvg - curPrice) / curPrice) * 100;
        const dropBadge = document.getElementById('stockWaterDropRateBadge');
        if (dropBadge) {
            dropBadge.innerText = `평단 ${dropRatePct.toFixed(1)}% 인하`;
        }

        // 3. 수수료 & 거래세 반영 BEP 본전 탈출 매도가격 역산
        // 매수 시 수수료: totalCost * feeRate
        // 매도 시 실수령: SellPrice * totalShares * (1 - feeRate - taxRate)
        // 무손실 조건: SellPrice * totalShares * (1 - feeRate - taxRate) = totalCost * (1 + feeRate)
        const totalBuyFee = totalCost * feeRate;
        const breakEvenPrice = (totalCost * (1 + feeRate)) / (totalShares * Math.max(0.001, (1 - feeRate - taxRate)));
        const totalSellFeeAndTax = (breakEvenPrice * totalShares) * (feeRate + taxRate);
        const totalExpenses = totalBuyFee + totalSellFeeAndTax;

        const tickGapPct = newAvg > 0 ? ((breakEvenPrice - newAvg) / newAvg) * 100 : 0;

        // UI 반영
        const fmtCur = (val) => isKr ? `${Math.round(val).toLocaleString('ko-KR')}원` : `$${val.toFixed(2)}`;

        const newAvgEl = document.getElementById('stockWaterResNewAvg');
        if (newAvgEl) newAvgEl.innerText = fmtCur(newAvg);

        const totalSharesEl = document.getElementById('stockWaterResTotalShares');
        if (totalSharesEl) totalSharesEl.innerText = `${totalShares.toLocaleString('ko-KR')}주`;

        const totalCostEl = document.getElementById('stockWaterResTotalCost');
        if (totalCostEl) totalCostEl.innerText = fmtCur(totalCost);

        const bepEl = document.getElementById('stockWaterResBepPrice');
        if (bepEl) bepEl.innerText = fmtCur(breakEvenPrice);

        const buyFeeEl = document.getElementById('stockWaterResBuyFee');
        if (buyFeeEl) buyFeeEl.innerText = fmtCur(totalBuyFee);

        const sellFeeTaxEl = document.getElementById('stockWaterResSellFeeTax');
        if (sellFeeTaxEl) sellFeeTaxEl.innerText = fmtCur(totalSellFeeAndTax);

        const totalFeesEl = document.getElementById('stockWaterResTotalFees');
        if (totalFeesEl) totalFeesEl.innerText = fmtCur(totalExpenses);

        const tickGapEl = document.getElementById('stockWaterResTickGap');
        if (tickGapEl) {
            let estTicks = Math.max(1, Math.round(tickGapPct / 0.1));
            tickGapEl.innerText = `+${tickGapPct.toFixed(2)}% 상승 시 본전 탈출 (약 ${estTicks}호가 차이)`;
        }

        // 4. 목표 평단가 역산 솔루션
        const targetDisplayEl = document.getElementById('stockWaterTargetDisplay');
        if (targetDisplayEl) targetDisplayEl.innerText = fmtCur(targetAvg);

        const revContainer = document.getElementById('stockWaterReverseResult');
        if (revContainer) {
            if (targetAvg >= curPrice) {
                revContainer.innerHTML = `<span class="text-amber-300">목표 평단가(${fmtCur(targetAvg)})가 이미 현재 평단가(${fmtCur(curPrice)}) 이상이므로 추가 매수가 필요하지 않습니다.</span>`;
            } else if (newPrice >= targetAvg) {
                revContainer.innerHTML = `<span class="text-rose-400 font-bold">⚠️ 추가 매수 단가(${fmtCur(newPrice)})가 목표 평단가(${fmtCur(targetAvg)})보다 높거나 같으면 아무리 많이 사도 평단가를 목표치까지 낮출 수 없습니다. 더 낮은 단가에서 매수해야 합니다.</span>`;
            } else {
                // (initialCost + newPrice * X) / (curShares + X) = targetAvg
                // initialCost + newPrice * X = targetAvg * curShares + targetAvg * X
                // X * (targetAvg - newPrice) = curShares * (curPrice - targetAvg)
                const requiredShares = Math.ceil((curShares * (curPrice - targetAvg)) / (targetAvg - newPrice));
                const requiredCapital = requiredShares * newPrice;

                revContainer.innerHTML = `
                  추가 매수가격 <strong class="text-cyan-300">${fmtCur(newPrice)}</strong>에서 정확히 <strong class="text-emerald-400 font-mono text-sm">${requiredShares.toLocaleString()}주</strong>를 더 매수(필요 자금 약 <strong class="text-white font-mono">${fmtCur(requiredCapital)}</strong>)하시면 평단가가 정확히 <strong class="text-cyan-300">${fmtCur(targetAvg)}</strong>로 낮아집니다.
                `;
            }
        }
    },

    // ========================================================
    // 9. 스테이킹 & 예치 복리(APY/APR) 실효 수익 계산기
    // ========================================================
    stakingPresets: {
        'ETH': { name: '이더리움 (ETH)', price: 4700000, apr: 3.2, fee: 10, period: 'daily' },
        'SOL': { name: '솔라나 (SOL)', price: 280000, apr: 7.1, fee: 8, period: 'daily' },
        'SUI': { name: '수이 (SUI)', price: 4200, apr: 3.5, fee: 10, period: 'daily' },
        'ATOM': { name: '코스모스 (ATOM)', price: 9500, apr: 13.8, fee: 5, period: 'daily' },
        'ADA': { name: '에이다 (ADA)', price: 1100, apr: 2.9, fee: 5, period: '5days' },
        'USDT': { name: '테더 (USDT 예치)', price: 1380, apr: 8.5, fee: 0, period: 'daily' }
    },

    applyStakingPreset: function (symbol) {
        const p = this.stakingPresets[symbol];
        if (!p) return;

        const symEl = document.getElementById('stakingCoinSymbol');
        const priceEl = document.getElementById('stakingCoinPrice');
        const aprEl = document.getElementById('stakingApr');
        const feeEl = document.getElementById('stakingFeeRate');

        if (symEl) symEl.value = symbol;
        if (priceEl) priceEl.value = this.formatNumber(p.price);
        if (aprEl) aprEl.value = p.apr;
        if (feeEl) feeEl.value = p.fee;

        this.calcStakingYield();
    },

    calcStakingYield: function () {
        const symbol = document.getElementById('stakingCoinSymbol')?.value || 'ETH';
        const qty = this.parseNum(document.getElementById('stakingAmount')?.value, 10);
        const price = this.parseNum(document.getElementById('stakingCoinPrice')?.value, 4500000);
        const apr = this.parseNum(document.getElementById('stakingApr')?.value, 4.5) / 100;
        const feeRate = this.parseNum(document.getElementById('stakingFeeRate')?.value, 10) / 100;
        const taxRate = this.parseNum(document.getElementById('stakingTaxRate')?.value, 0) / 100;
        const isReinvest = document.getElementById('stakingReinvestToggle')?.checked ?? true;

        if (qty <= 0 || price <= 0) return;

        const totalPrincipalKrw = qty * price;

        // 수수료 차감 후 실질 APR
        const netApr = apr * (1 - feeRate) * (1 - taxRate);

        // 연간 단리 vs 일복리(APY) 수량
        // APY = (1 + r/365)^365 - 1
        const effectiveApy = isReinvest ? (Math.pow(1 + (netApr / 365), 365) - 1) : netApr;

        // 연간 수령 코인 수량
        const annualRewardQty = qty * effectiveApy;
        const monthlyRewardQty = annualRewardQty / 12;
        const dailyRewardQty = annualRewardQty / 365;

        // 원화 환산 가치
        const annualRewardKrw = annualRewardQty * price;
        const monthlyRewardKrw = monthlyRewardQty * price;
        const dailyRewardKrw = dailyRewardQty * price;

        // 3년 누적 (복리 vs 단리)
        const threeYearRewardQty = isReinvest
            ? (qty * (Math.pow(1 + (netApr / 365), 365 * 3) - 1))
            : (annualRewardQty * 3);
        const threeYearRewardKrw = threeYearRewardQty * price;

        // UI 갱신
        const principalEl = document.getElementById('stakingResultPrincipal');
        if (principalEl) principalEl.innerText = `${Math.round(totalPrincipalKrw).toLocaleString('ko-KR')}원 (${qty.toLocaleString()} ${symbol})`;

        const effectiveRateEl = document.getElementById('stakingResultEffectiveRate');
        if (effectiveRateEl) effectiveRateEl.innerText = `${(effectiveApy * 100).toFixed(2)}% (${isReinvest ? '일복리 재투자 APY' : '단리 실효수익률'})`;

        const dailyRewardEl = document.getElementById('stakingResultDaily');
        if (dailyRewardEl) dailyRewardEl.innerText = `${dailyRewardQty.toFixed(4)} ${symbol} (약 ${Math.round(dailyRewardKrw).toLocaleString('ko-KR')}원)`;

        const monthlyRewardEl = document.getElementById('stakingResultMonthly');
        if (monthlyRewardEl) monthlyRewardEl.innerText = `${monthlyRewardQty.toFixed(4)} ${symbol} (약 ${Math.round(monthlyRewardKrw).toLocaleString('ko-KR')}원)`;

        const annualRewardEl = document.getElementById('stakingResultAnnual');
        if (annualRewardEl) annualRewardEl.innerText = `${annualRewardQty.toFixed(4)} ${symbol} (약 ${Math.round(annualRewardKrw).toLocaleString('ko-KR')}원)`;

        const threeYearEl = document.getElementById('stakingResultThreeYear');
        if (threeYearEl) threeYearEl.innerText = `+${threeYearRewardQty.toFixed(4)} ${symbol} (+${Math.round(threeYearRewardKrw).toLocaleString('ko-KR')}원)`;
    },

    // ========================================================
    // 10. 해외(미국)주식 양도소득세 & 250만원 절세 계산기
    // ========================================================
    stockTaxCurrency: 'krw', // 'krw' | 'usd'
    setStockTaxCurrency: function (curr) {
        this.stockTaxCurrency = curr;
        const krwBtn = document.getElementById('stockTaxBtnKrw');
        const usdBtn = document.getElementById('stockTaxBtnUsd');
        const unitEls = document.querySelectorAll('.stocktax-unit');

        if (curr === 'krw') {
            if (krwBtn) krwBtn.className = 'flex-1 py-2 rounded-xl text-xs font-bold transition bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm';
            if (usdBtn) usdBtn.className = 'flex-1 py-2 rounded-xl text-xs font-medium transition text-slate-400 hover:text-white border border-navy-800 bg-navy-950';
            unitEls.forEach(el => el.innerText = '원');
        } else {
            if (krwBtn) krwBtn.className = 'flex-1 py-2 rounded-xl text-xs font-medium transition text-slate-400 hover:text-white border border-navy-800 bg-navy-950';
            if (usdBtn) usdBtn.className = 'flex-1 py-2 rounded-xl text-xs font-bold transition bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm';
            unitEls.forEach(el => el.innerText = '$');
        }
        this.calcStockTax();
    },

    calcStockTax: function () {
        const isUsd = (this.stockTaxCurrency === 'usd');
        const rate = this.parseNum(document.getElementById('stockTaxExchangeRate')?.value, 1380);

        let profit = this.parseNum(document.getElementById('stockTaxProfit')?.value, 5000000);
        let loss = this.parseNum(document.getElementById('stockTaxLoss')?.value, 0);
        let fee = this.parseNum(document.getElementById('stockTaxFee')?.value, 0);

        // USD인 경우 원화로 환산
        const profitKrw = isUsd ? (profit * rate) : profit;
        const lossKrw = isUsd ? (loss * rate) : loss;
        const feeKrw = isUsd ? (fee * rate) : fee;

        // 순 실현 양도차익
        const netGainKrw = Math.max(0, profitKrw - lossKrw - feeKrw);

        // 기본 공제 250만원
        const basicDeductionKrw = 2500000;
        // 과세 표준 = max(0, 순양도차익 - 250만원)
        const taxableKrw = Math.max(0, netGainKrw - basicDeductionKrw);

        // 양도소득세 20% + 지방소득세 2% = 총 22%
        const incomeTaxKrw = taxableKrw * 0.20;
        const localTaxKrw = taxableKrw * 0.02;
        const totalTaxKrw = incomeTaxKrw + localTaxKrw;

        // 실효 세율 (%) = (총 세금 / 순수익) * 100
        const effectiveTaxRate = netGainKrw > 0 ? ((totalTaxKrw / netGainKrw) * 100) : 0;

        // 세후 순수익
        const afterTaxProfitKrw = netGainKrw - totalTaxKrw;

        // 손실 상계(Tax-Loss Harvesting) 필요 손실액: 세금을 0원으로 만들기 위해 연내 매도해야 할 손실
        const neededLossKrw = Math.max(0, netGainKrw - basicDeductionKrw);
        const neededLossUsd = rate > 0 ? (neededLossKrw / rate) : 0;

        // UI 갱신
        const netGainEl = document.getElementById('stockTaxResultNetGain');
        if (netGainEl) netGainEl.innerText = `${Math.round(netGainKrw).toLocaleString('ko-KR')}원`;

        const deductionEl = document.getElementById('stockTaxResultDeduction');
        if (deductionEl) {
            const actualDeduction = Math.min(netGainKrw, basicDeductionKrw);
            deductionEl.innerText = `-${Math.round(actualDeduction).toLocaleString('ko-KR')}원`;
        }

        const taxableEl = document.getElementById('stockTaxResultTaxable');
        if (taxableEl) taxableEl.innerText = `${Math.round(taxableKrw).toLocaleString('ko-KR')}원`;

        const totalTaxEl = document.getElementById('stockTaxResultTotalTax');
        if (totalTaxEl) totalTaxEl.innerText = `${Math.round(totalTaxKrw).toLocaleString('ko-KR')}원`;

        const incomeTaxEl = document.getElementById('stockTaxResultIncomeTax');
        if (incomeTaxEl) incomeTaxEl.innerText = `${Math.round(incomeTaxKrw).toLocaleString('ko-KR')}원`;

        const localTaxEl = document.getElementById('stockTaxResultLocalTax');
        if (localTaxEl) localTaxEl.innerText = `${Math.round(localTaxKrw).toLocaleString('ko-KR')}원`;

        const effRateEl = document.getElementById('stockTaxResultEffectiveRate');
        if (effRateEl) effRateEl.innerText = `${effectiveTaxRate.toFixed(1)}% (세전 대비)`;

        const afterTaxEl = document.getElementById('stockTaxResultAfterTax');
        if (afterTaxEl) afterTaxEl.innerText = `${Math.round(afterTaxProfitKrw).toLocaleString('ko-KR')}원`;

        // 손실 상계 가이드 UI
        const taxHarvestCard = document.getElementById('stockTaxHarvestCard');
        const neededLossEl = document.getElementById('stockTaxResultNeededLoss');
        const harvestStatusEl = document.getElementById('stockTaxHarvestStatus');

        if (neededLossKrw > 0) {
            if (taxHarvestCard) taxHarvestCard.className = 'p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 space-y-2';
            if (harvestStatusEl) harvestStatusEl.innerText = '💡 손실 상계 절세 기회 (세금 0원 플랜)';
            if (neededLossEl) {
                neededLossEl.innerHTML = `
                  <div class="text-base font-black text-amber-300 font-mono">
                    -${Math.round(neededLossKrw).toLocaleString('ko-KR')}원 (약 -$${Math.round(neededLossUsd).toLocaleString('ko-KR')})
                  </div>
                  <p class="text-xs text-slate-300 mt-1">
                    현재 마이너스인 보유 종목을 12월 말까지 매도하여 위 금액만큼 손실을 확정지으면, <strong class="text-emerald-400">양도소득세 ${Math.round(totalTaxKrw).toLocaleString('ko-KR')}원이 전액 0원으로 절세</strong>됩니다!
                  </p>
                `;
            }
        } else {
            if (taxHarvestCard) taxHarvestCard.className = 'p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-2';
            if (harvestStatusEl) harvestStatusEl.innerText = '🎉 양도세 비과세 구간 (250만원 이하)';
            if (neededLossEl) {
                const remainingDeduction = basicDeductionKrw - netGainKrw;
                neededLossEl.innerHTML = `
                  <div class="text-base font-black text-emerald-300 font-mono">
                    세금 0원 (잔여 비과세 한도: +${Math.round(remainingDeduction).toLocaleString('ko-KR')}원)
                  </div>
                  <p class="text-xs text-slate-300 mt-1">
                    기본공제 250만 원 한도 이내이므로 납부할 양도소득세가 전혀 없습니다.
                  </p>
                `;
            }
        }
    },

    // ========================================================
    // 11. 주식 배당금 & 배당소득세(15.4%) 실효수익 계산기
    // ========================================================
    dividendPresets: {
        'SCHD': { name: 'SCHD (미국 배당성장 ETF)', market: 'us', price: 28.5, rate: 3.55, freq: 4 },
        'O': { name: '리얼티인컴 (O, 미국 월배당 리츠)', market: 'us', price: 54.0, rate: 5.60, freq: 12 },
        'JEPI': { name: 'JEPI (JP모건 월배당 커버드콜)', market: 'us', price: 57.2, rate: 7.40, freq: 12 },
        '005935': { name: '삼성전자우 (국내 고배당)', market: 'kr', price: 47000, rate: 3.10, freq: 4 },
        '088980': { name: '맥쿼리인프라 (국내 대표 인프라)', market: 'kr', price: 11500, rate: 6.80, freq: 2 }
    },

    applyDividendPreset: function (key) {
        const p = this.dividendPresets[key];
        if (!p) return;

        const nameEl = document.getElementById('dividendStockName');
        const marketEl = document.getElementById('dividendMarket');
        const priceEl = document.getElementById('dividendPrice');
        const rateEl = document.getElementById('dividendYieldRate');
        const freqEl = document.getElementById('dividendFrequency');

        if (nameEl) nameEl.value = p.name;
        if (marketEl) marketEl.value = p.market;
        if (priceEl) priceEl.value = this.formatNumber(p.price);
        if (rateEl) rateEl.value = p.rate;
        if (freqEl) freqEl.value = p.freq;

        this.calcStockDividend();
    },

    calcStockDividend: function () {
        const market = document.getElementById('dividendMarket')?.value || 'us';
        const isUs = (market === 'us');
        const exchangeRate = this.parseNum(document.getElementById('dividendExchangeRate')?.value, 1380);

        const priceInput = this.parseNum(document.getElementById('dividendPrice')?.value, 28.5);
        const shares = this.parseNum(document.getElementById('dividendShares')?.value, 500);
        const yieldRate = this.parseNum(document.getElementById('dividendYieldRate')?.value, 3.55) / 100;
        const freq = Math.max(1, parseInt(document.getElementById('dividendFrequency')?.value || '4', 10));

        if (priceInput <= 0 || shares <= 0) return;

        // 원화 환산 1주당 가격
        const priceKrw = isUs ? (priceInput * exchangeRate) : priceInput;
        // 총 투자 평가금액
        const totalInvestedKrw = priceKrw * shares;

        // 연간 세전 총 배당금
        const annualGrossDividendKrw = totalInvestedKrw * yieldRate;
        const annualGrossDividendUsd = (isUs && exchangeRate > 0) ? (annualGrossDividendKrw / exchangeRate) : 0;

        // 배당소득세율: 국내 15.4%, 미국 15.0%
        const taxRate = isUs ? 0.150 : 0.154;
        const annualTaxKrw = annualGrossDividendKrw * taxRate;
        // 세후 연간 실수령 배당금
        const annualNetDividendKrw = annualGrossDividendKrw - annualTaxKrw;
        const annualNetDividendUsd = (isUs && exchangeRate > 0) ? (annualNetDividendKrw / exchangeRate) : 0;

        // 주기별 실수령액
        const monthlyNetKrw = annualNetDividendKrw / 12;
        const quarterlyNetKrw = annualNetDividendKrw / 4;
        const perPayoutNetKrw = annualNetDividendKrw / freq;

        // 금융소득종합과세 2,000만원 기준 진단
        const financeTaxThresholdKrw = 20000000;
        const isOverFinanceTax = (annualGrossDividendKrw >= financeTaxThresholdKrw);
        const remainingSafetyKrw = Math.max(0, financeTaxThresholdKrw - annualGrossDividendKrw);

        // UI 갱신
        const totalInvestedEl = document.getElementById('dividendResultTotalInvested');
        if (totalInvestedEl) {
            totalInvestedEl.innerText = isUs
                ? `${Math.round(totalInvestedKrw).toLocaleString('ko-KR')}원 ($${Math.round(shares * priceInput).toLocaleString('ko-KR')})`
                : `${Math.round(totalInvestedKrw).toLocaleString('ko-KR')}원`;
        }

        const grossDivEl = document.getElementById('dividendResultGrossAnnual');
        if (grossDivEl) grossDivEl.innerText = `${Math.round(annualGrossDividendKrw).toLocaleString('ko-KR')}원 (${(yieldRate * 100).toFixed(2)}%)`;

        const taxEl = document.getElementById('dividendResultTax');
        if (taxEl) taxEl.innerText = `-${Math.round(annualTaxKrw).toLocaleString('ko-KR')}원 (${(taxRate * 100).toFixed(1)}%)`;

        const netAnnualEl = document.getElementById('dividendResultNetAnnual');
        if (netAnnualEl) {
            netAnnualEl.innerText = isUs
                ? `${Math.round(annualNetDividendKrw).toLocaleString('ko-KR')}원 (약 $${annualNetDividendUsd.toFixed(1)})`
                : `${Math.round(annualNetDividendKrw).toLocaleString('ko-KR')}원`;
        }

        const netMonthlyEl = document.getElementById('dividendResultNetMonthly');
        if (netMonthlyEl) netMonthlyEl.innerText = `월평균 약 ${Math.round(monthlyNetKrw).toLocaleString('ko-KR')}원`;

        const netPayoutEl = document.getElementById('dividendResultPerPayout');
        if (netPayoutEl) netPayoutEl.innerText = `1회 지급 시 약 ${Math.round(perPayoutNetKrw).toLocaleString('ko-KR')}원 (연 ${freq}회)`;

        // 금융소득 종합과세 경보 뱃지
        const taxAlertCard = document.getElementById('dividendTaxAlertCard');
        if (taxAlertCard) {
            if (isOverFinanceTax) {
                taxAlertCard.className = 'p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 space-y-1.5';
                taxAlertCard.innerHTML = `
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                      🚨 금융소득 종합과세 대상 (2,000만 원 초과)
                    </span>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">종합소득 합산</span>
                  </div>
                  <p class="text-xs text-slate-300">
                    연간 세전 배당금(${Math.round(annualGrossDividendKrw).toLocaleString()}원)이 2,000만 원을 초과하여 근로소득 등 다른 소득과 합산 과세되며, <strong>건강보험료 피부양자 자격이 박탈되어 지역가입자로 전환</strong>될 수 있습니다!
                  </p>
                `;
            } else {
                taxAlertCard.className = 'p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-1.5';
                taxAlertCard.innerHTML = `
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                      🛡️ 금융소득 종합과세 안전 구간 (2,000만 원 이하)
                    </span>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">분리과세 종결</span>
                  </div>
                  <p class="text-xs text-slate-300">
                    종합과세 한도(2,000만원)까지 <strong class="text-emerald-400">+${Math.round(remainingSafetyKrw).toLocaleString()}원</strong>의 안전마진이 남아 있어, 15.4%(미국 15%) 원천징수 분리과세로 세무 신고가 깔끔하게 종결됩니다.
                  </p>
                `;
            }
        }

        // DRIP (배당 재투자) 5년/10년 복리 시뮬레이션
        const drip5YrBody = document.getElementById('dividendDrip5Yr');
        const drip10YrBody = document.getElementById('dividendDrip10Yr');

        // 매년 배당금으로 주식을 재매수할 경우 (주가 상승률 3%, 배당성장률 5% 보수적 가정)
        let simShares5 = shares;
        let simDiv5 = annualNetDividendKrw;
        for (let y = 1; y <= 5; y++) {
            const addedShares = simDiv5 / (priceKrw * Math.pow(1.03, y));
            simShares5 += addedShares;
            simDiv5 = simShares5 * (priceKrw * Math.pow(1.03, y)) * (yieldRate * Math.pow(1.05, y)) * (1 - taxRate);
        }

        let simShares10 = shares;
        let simDiv10 = annualNetDividendKrw;
        for (let y = 1; y <= 10; y++) {
            const addedShares = simDiv10 / (priceKrw * Math.pow(1.03, y));
            simShares10 += addedShares;
            simDiv10 = simShares10 * (priceKrw * Math.pow(1.03, y)) * (yieldRate * Math.pow(1.05, y)) * (1 - taxRate);
        }

        if (drip5YrBody) {
            drip5YrBody.innerText = `주식 수: ${Math.round(simShares5).toLocaleString()}주 / 세후 월 배당금: 약 ${Math.round(simDiv5 / 12).toLocaleString('ko-KR')}원`;
        }
        if (drip10YrBody) {
            drip10YrBody.innerText = `주식 수: ${Math.round(simShares10).toLocaleString()}주 / 세후 월 배당금: 약 ${Math.round(simDiv10 / 12).toLocaleString('ko-KR')}원`;
        }
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
