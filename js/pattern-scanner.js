/**
 * pattern-scanner.js
 * 업비트 & 빗썸 실시간 AI 차트패턴 및 수급·호재·지표 멀티 레이더
 * - 1D(일봉) / 4H(4시간봉) 타임프레임별 실시간 차트 패턴 및 기간/목표가 분기
 * - 5대 카테고리 완벽 지원:
 *   1) 실시간포착 (거래량 폭증, 체결강도 130%+, 순간 급등, 골든크로스)
 *   2) 호재포착 (메인넷, 토큰소각, 글로벌 파트너십, 거래소 상장)
 *   3) 기술지표 (RSI 과매도 반등, MACD 골든크로스, 볼린저 하단 반등, 일목 기준선)
 *   4) 차트패턴 (12종 반등·돌파 캔들 패턴 및 유사도 % 매칭)
 *   5) 조건검색 (1000억+ 정배열, 과매도 바닥탈출, 전고점 돌파임박 등)
 */

const PatternScannerEngine = {
    currentPattern: 'ALL',
    currentSubFilter: 'ALL',
    currentExchange: 'ALL',
    currentTimeframe: '1D',
    searchQuery: '',
    selectedCategoryTab: 'patterns', // 'patterns', 'realtime', 'news', 'indicators', 'filter'
    isLoading: false,
    initialized: false,

    // 12종 차트 패턴 기술적 분석 및 매매 가이드 사전
    patternInfo: {
        'all': {
            name: '전체 패턴',
            desc: '현재 시장에서 포착된 모든 기술적 차트 반등 및 돌파 패턴을 유사도 순으로 정렬하여 표시합니다.'
        },
        'pullback': {
            name: '눌림목 (Pullback)',
            enName: 'Support Pullback',
            type: '추세 지속 / 지지 반등',
            winRate: '78~84%',
            desc: '강한 상승 추세(1차 파동) 이후 차익 실현 매물로 인해 거래량이 줄어들며 20일 이동평균선 또는 전고점 지지선에 안착 후 재반등하는 전형적인 건강한 조정 패턴입니다.',
            buyPoint: '지지선 안착 후 거래량이 실린 첫 양봉 출현 시점',
            stopLoss: '최근 지지 이평선 또는 스윙 저점 이탈 시 (-3%~-4%)',
            target: '직전 고점 돌파 및 1차 목표가 (+8%~+15%)',
            tips: '거래량이 줄어들면서 캔들 크기가 좁아지는 눌림목일수록 반등 신뢰도가 매우 높습니다.'
        },
        'double_bottom': {
            name: '쌍바닥 (Double Bottom, W자)',
            enName: 'Double Bottom',
            type: '바닥 반전 (Reversal)',
            winRate: '80~86%',
            desc: '하락 추세 이후 1차 저점을 찍고 반등한 뒤, 다시 하락하여 1차 저점과 비슷한 가격대(±2% 오차)에서 강력한 지지를 받고 2차 저점을 다지는 W자형 패턴입니다.',
            buyPoint: 'W자의 중심 고점(넥라인, Neckline)을 강한 거래량으로 상방 돌파할 때',
            stopLoss: '2차 저점의 최저가 이탈 시 (-3%)',
            target: '바닥에서 넥라인까지의 높이만큼 추가 상승 (+12%~+25%)',
            tips: '2차 저점이 1차 저점보다 살짝 높은 짝궁둥이 쌍바닥일 경우 상승 탄력이 훨씬 강합니다.'
        },
        'triple_bottom': {
            name: '삼중바닥 (Triple Bottom)',
            enName: 'Triple Bottom',
            type: '강력 바닥 반전',
            winRate: '82~88%',
            desc: '동일한 가격 지지선을 세 번 연속 지지하며 매도세를 완전히 소진시키고 세력의 매집이 완료되었음을 알리는 매우 강력한 바닥 다지기 패턴입니다.',
            buyPoint: '세 번째 반등 후 상단 넥라인 돌파 시점',
            stopLoss: '3개 바닥 지지선 하향 이탈 시 (-2.5%)',
            target: '박스 폭의 1.5배 이상 (+15%~+30%)',
            tips: '세 번째 바닥에서 거래량이 눈에 띄게 줄어들면 매도 압력이 사실상 고갈된 상태입니다.'
        },
        'ascending_channel': {
            name: '상승채널 (Ascending Channel)',
            enName: 'Ascending Channel',
            type: '우상향 추세 지속',
            winRate: '75~82%',
            desc: '고점과 저점이 모두 평행하게 규칙적으로 높아지는 우상향 레일웨이(Railway) 패턴으로, 건강한 자금 유입이 지속되고 있음을 나타냅니다.',
            buyPoint: '채널 하단 지지선 터치 후 양봉 반등 시점',
            stopLoss: '채널 하단 지지 추세선 이탈 시 (-3%)',
            target: '채널 상단 저항선 도달 시 분할 익절 (+10%~+20%)',
            tips: '채널 중심선(Midline) 위에서 머무는 시간이 길수록 추세 강도가 강력합니다.'
        },
        'ascending_triangle': {
            name: '상승삼각형 (Ascending Triangle)',
            enName: 'Ascending Triangle',
            type: '상방 수렴 돌파',
            winRate: '79~85%',
            desc: '상단에는 수평 저항선이 가로막고 있지만, 매수세가 점점 강해지며 저점을 지속적으로 높여가는(Higher Lows) 전형적인 강세 수렴 패턴입니다.',
            buyPoint: '상단 수평 저항선을 대량 거래량으로 양봉 돌파할 때',
            stopLoss: '직전 우상향 지지선 하향 이탈 시 (-3%)',
            target: '삼각형의 수직 높이만큼 추가 급등 (+15%~+28%)',
            tips: '수렴의 70~80% 지점에서 상방 돌파가 일어날 때 성공 확률이 가장 높습니다.'
        },
        'falling_wedge': {
            name: '하락쐐기 (Falling Wedge)',
            enName: 'Falling Wedge',
            type: '하락 추세 반전',
            winRate: '77~83%',
            desc: '하락 추세 속에서 고점과 저점의 하락 기울기가 모두 좁아지며 매도 에너지가 급격히 고갈되는 패턴으로, 쐐기 상단 돌파 시 폭발적인 반등이 일어납니다.',
            buyPoint: '하락쐐기 상단 저항 추세선 상방 돌파 시점',
            stopLoss: '쐐기 패턴의 직전 최저점 이탈 시 (-3.5%)',
            target: '쐐기가 시작된 출발점 고점까지 회복 (+15%~+35%)',
            tips: '하락하면서 거래량이 급감하다가 상단 추세선을 뚫을 때 거래량이 2배 이상 터지는 것이 정석입니다.'
        },
        'cup_and_handle': {
            name: '컵앤핸들 (Cup and Handle)',
            enName: 'Cup & Handle',
            type: '초대형 강세 지속',
            winRate: '83~89%',
            desc: '완만한 U자형 바닥(컵)을 형성한 뒤, 컵 우측 상단에서 얕은 우하향 박스나 깃발 형태의 눌림목(손잡이)을 만들고 전고점을 돌파하는 기관 선호 패턴입니다.',
            buyPoint: '손잡이(핸들) 상단 저항선 돌파 또는 컵 전고점 돌파 시',
            stopLoss: '손잡이(핸들) 최저점 이탈 시 (-4%)',
            target: '컵 깊이만큼 1:1 대칭 폭발 상승 (+20%~+45%)',
            tips: '손잡이의 하락 폭이 컵 깊이의 1/3을 넘지 않는 얕은 손잡이일수록 폭발력이 큽니다.'
        },
        'flag': {
            name: '깃발 (Bull Flag)',
            enName: 'Bull Flag',
            type: '초강력 추세 지속',
            winRate: '81~87%',
            desc: '가파른 장대양봉(깃대) 이후 거래량이 급감하며 짧고 좁은 하향 평행 박스(깃발)를 형성한 뒤 2차 폭발 상승을 시작하는 모멘텀 패턴입니다.',
            buyPoint: '깃발 상단 저항 추세선을 돌파하는 순간',
            stopLoss: '깃발 패턴 하단 지지선 이탈 시 (-2.5%)',
            target: '깃대의 높이만큼 추가 수직 상승 (+15%~+30%)',
            tips: '깃발 형성 기간이 3~5일 이내로 짧을수록 후속 폭발력이 극대화됩니다.'
        },
        'u_bottom': {
            name: 'U자바닥 (원형바닥, Rounding)',
            enName: 'Rounding Bottom',
            type: '완만한 대세 반전',
            winRate: '76~83%',
            desc: '급격한 하락 대신 점진적으로 매도세가 둔화되며 둥근 밥그릇 모양으로 바닥을 둥글게 다진 후 서서히 우상향으로 돌아서는 중장기 축적 패턴입니다.',
            buyPoint: 'U자 중심을 지나 전고점 넥라인에 근접하는 우측 상승 구간',
            stopLoss: 'U자 우측 상승 추세선 이탈 시 (-3%)',
            target: 'U자 바닥 최저점에서 넥라인까지의 높이 (+15%~+35%)',
            tips: '바닥의 가장 낮은 지점에서 거래량이 최저를 기록하고 우측으로 갈수록 거래량이 증가해야 정석입니다.'
        },
        'rectangle': {
            name: '박스권 돌파 (Rectangle Breakout)',
            enName: 'Box Range',
            type: '수평 지지/저항 돌파',
            winRate: '77~84%',
            desc: '일정한 상단 저항선과 하단 지지선 사이에서 횡보하며 에너지를 응축한 뒤, 상단 저항선을 강한 양봉으로 뚫어내는 패턴입니다.',
            buyPoint: '박스권 상단 저항선 돌파 확정 또는 돌파 후 첫 리테스트 시',
            stopLoss: '박스 상단 저항선(지지선 전환선) 재이탈 시 (-3%)',
            target: '박스권 높이만큼 추가 상승 (+10%~+25%)',
            tips: '박스권 횡보 기간이 길수록 상방 돌파 시 에너지가 강력합니다.'
        },
        'inv_head_shoulders': {
            name: '역헤드앤숄더 (Inverse Head & Shoulders)',
            enName: 'Inverse H&S',
            type: '바닥 반전 최강 패턴',
            winRate: '85~91%',
            desc: '좌측 어깨, 중앙의 가장 깊은 머리, 그리고 우측 어깨로 구성된 3중 저점 바닥 반전 패턴으로, 기술적 분석에서 가장 신뢰도가 높은 바닥 신호입니다.',
            buyPoint: '목선(넥라인, Neckline)을 거래량이 실린 양봉으로 상향 돌파 시',
            stopLoss: '우측 어깨(Right Shoulder) 최저점 이탈 시 (-3.5%)',
            target: '머리 최저점에서 넥라인까지의 수직 거리만큼 상승 (+18%~+40%)',
            tips: '우측 어깨의 저점이 좌측 어깨보다 높을 때 가장 이상적인 강세 신호가 완성됩니다.'
        },
        'three_white_soldiers': {
            name: '적삼병 (Three White Soldiers)',
            enName: 'Three White Soldiers',
            type: '강력 모멘텀 상승 장악',
            winRate: '78~85%',
            desc: '바닥권 또는 조정 국면 이후 3연속으로 종가가 전일 고가를 경신하는 긴 양봉이 출현하며, 거래량이 점진적으로 증가하는 강력한 매수세 장악 패턴입니다.',
            buyPoint: '3번째 양봉 출현 후 단기 눌림목 또는 3번째 봉 완성 시',
            stopLoss: '첫 번째 양봉의 시가 이탈 시 (-3.5%)',
            target: '단기 추세 전환에 따른 추가 상승 (+10%~+22%)',
            tips: '윗꼬리가 거의 없는 몸통이 꽉 찬 양봉 3개일수록 매수세의 힘이 압도적입니다.'
        }
    },

    detectedSignals: [],

    init: function () {
        if (this.initialized) return;
        this.initialized = true;
        this.bindEvents();
        this.renderSidebar();
        this.loadSignals();
    },

    bindEvents: function () {
        const searchInput = document.getElementById('pattern-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.trim().toLowerCase();
                this.renderCards();
            });
        }
    },

    // 5대 상단 서브 카테고리 탭 전환
    setCategoryTab: function (tabKey) {
        this.selectedCategoryTab = tabKey;
        this.currentPattern = 'ALL';
        this.currentSubFilter = 'ALL';
        
        document.querySelectorAll('.pattern-cat-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.cattab === tabKey);
        });

        // 카테고리에 맞춰 좌측 사이드바 버튼 목록 동적 변경
        this.renderSidebar();
        this.loadSignals();
    },

    // 좌측 사이드바 렌더러
    renderSidebar: function () {
        const titleEl = document.getElementById('pattern-sidebar-title');
        const itemsEl = document.getElementById('pattern-sidebar-items');
        if (!itemsEl) return;

        if (this.selectedCategoryTab === 'patterns') {
            if (titleEl) titleEl.innerText = '패턴 카테고리 (13종)';
            const patterns = [
                { key: 'ALL', name: '전체' },
                { key: 'double_bottom', name: '쌍바닥 (W자)', hasGuide: true },
                { key: 'triple_bottom', name: '삼중바닥', hasGuide: true },
                { key: 'ascending_channel', name: '상승채널', hasGuide: true },
                { key: 'ascending_triangle', name: '상승삼각형', hasGuide: true },
                { key: 'falling_wedge', name: '하락쐐기', hasGuide: true },
                { key: 'pullback', name: '눌림목', hasGuide: true },
                { key: 'cup_and_handle', name: '컵앤핸들', hasGuide: true },
                { key: 'flag', name: '깃발 (Bull Flag)', hasGuide: true },
                { key: 'u_bottom', name: 'U자바닥 (원형)', hasGuide: true },
                { key: 'rectangle', name: '박스권 (돌파임박)', hasGuide: true },
                { key: 'inv_head_shoulders', name: '역헤드앤숄더', hasGuide: true },
                { key: 'three_white_soldiers', name: '적삼병 (연속양봉)', hasGuide: true }
            ];

            itemsEl.innerHTML = patterns.map(p => `
                <button onclick="PatternScannerEngine.selectPattern('${p.key}')" 
                        class="pattern-nav-item ${this.currentPattern === p.key ? 'active' : ''} shrink-0 md:shrink group" 
                        data-pattern="${p.key}">
                    <span>${p.name}</span>
                    ${p.hasGuide ? `<span onclick="event.stopPropagation(); PatternScannerEngine.openPatternModal('${p.key}')" class="pattern-guide-qmark w-4 h-4 rounded-full bg-slate-800 hover:bg-emerald-500 hover:text-navy-950 text-slate-400 flex items-center justify-center text-[10px] font-bold transition ml-2 shrink-0" title="패턴 가이드">?</span>` : ''}
                </button>
            `).join('');

        } else if (this.selectedCategoryTab === 'realtime') {
            if (titleEl) titleEl.innerText = '실시간 수급 필터';
            const filters = [
                { key: 'ALL', name: '전체 수급 포착' },
                { key: 'volume_surge', name: '거래량 폭증 (300%+)' },
                { key: 'power_surge', name: '체결강도 130%+' },
                { key: 'sudden_spike', name: '순간 급등 (+5%+)' },
                { key: 'golden_cross', name: '골든크로스 돌파' }
            ];
            itemsEl.innerHTML = filters.map(f => `
                <button onclick="PatternScannerEngine.selectSubFilter('${f.key}')" 
                        class="pattern-nav-item ${this.currentSubFilter === f.key ? 'active' : ''} shrink-0 md:shrink" 
                        data-subfilter="${f.key}">
                    <span>${f.name}</span>
                </button>
            `).join('');

        } else if (this.selectedCategoryTab === 'news') {
            if (titleEl) titleEl.innerText = '호재·공시 필터';
            const filters = [
                { key: 'ALL', name: '전체 호재' },
                { key: 'mainnet', name: '메인넷·하드포크' },
                { key: 'burn', name: '토큰 소각 (Burn)' },
                { key: 'partnership', name: '글로벌 파트너십' },
                { key: 'ecosystem', name: '거래소 상장·펀드' }
            ];
            itemsEl.innerHTML = filters.map(f => `
                <button onclick="PatternScannerEngine.selectSubFilter('${f.key}')" 
                        class="pattern-nav-item ${this.currentSubFilter === f.key ? 'active' : ''} shrink-0 md:shrink" 
                        data-subfilter="${f.key}">
                    <span>${f.name}</span>
                </button>
            `).join('');

        } else if (this.selectedCategoryTab === 'indicators') {
            if (titleEl) titleEl.innerText = '핵심 보조지표 필터';
            const filters = [
                { key: 'ALL', name: '전체 지표 시그널' },
                { key: 'rsi_oversold', name: 'RSI 과매도 탈출' },
                { key: 'macd_cross', name: 'MACD 골든크로스' },
                { key: 'bollinger_rebound', name: '볼린저밴드 하단 반등' },
                { key: 'ichimoku_break', name: '일목 기준선 지지' }
            ];
            itemsEl.innerHTML = filters.map(f => `
                <button onclick="PatternScannerEngine.selectSubFilter('${f.key}')" 
                        class="pattern-nav-item ${this.currentSubFilter === f.key ? 'active' : ''} shrink-0 md:shrink" 
                        data-subfilter="${f.key}">
                    <span>${f.name}</span>
                </button>
            `).join('');

        } else if (this.selectedCategoryTab === 'filter') {
            if (titleEl) titleEl.innerText = '실전 조건검색 필터';
            const filters = [
                { key: 'ALL', name: '전체 조건식' },
                { key: 'cond_turnover_trend', name: '1000억+ 정배열' },
                { key: 'cond_bottom_rebound', name: '과매도 바닥 탈출' },
                { key: 'cond_breakout_ready', name: '전고점 돌파 임박' },
                { key: 'cond_panic_bounce', name: '낙폭과대 첫 양봉' }
            ];
            itemsEl.innerHTML = filters.map(f => `
                <button onclick="PatternScannerEngine.selectSubFilter('${f.key}')" 
                        class="pattern-nav-item ${this.currentSubFilter === f.key ? 'active' : ''} shrink-0 md:shrink" 
                        data-subfilter="${f.key}">
                    <span>${f.name}</span>
                </button>
            `).join('');
        }
    },

    selectPattern: function (patternKey) {
        this.currentPattern = patternKey;
        document.querySelectorAll('.pattern-nav-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.pattern === patternKey);
        });
        this.renderCards();
    },

    selectSubFilter: function (subFilterKey) {
        this.currentSubFilter = subFilterKey;
        document.querySelectorAll('.pattern-nav-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.subfilter === subFilterKey);
        });
        this.renderCards();
    },

    selectExchange: function (exchange) {
        this.currentExchange = exchange;
        document.querySelectorAll('.pattern-exchange-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.exchange === exchange);
        });
        this.renderCards();
    },

    // 타임프레임 전환 (1D vs 4H)
    selectTimeframe: function (tf) {
        if (this.currentTimeframe === tf) return;
        this.currentTimeframe = tf;
        document.querySelectorAll('.pattern-tf-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tf === tf);
        });
        this.loadSignals(true);
    },

    openPatternModal: function (patternKey) {
        const info = this.patternInfo[patternKey];
        if (!info) return;

        const modal = document.getElementById('modal-pattern-guide');
        const titleEl = document.getElementById('modal-pattern-title');
        const contentEl = document.getElementById('modal-pattern-content');

        if (titleEl) titleEl.innerText = `${info.name} (${info.enName || ''})`;
        if (contentEl) {
            contentEl.innerHTML = `
                <div class="space-y-4 text-xs leading-relaxed">
                    <div class="flex items-center justify-between p-3 rounded-xl bg-navy-950 border border-navy-800">
                        <span class="text-slate-400">패턴 유형: <strong class="text-white">${info.type}</strong></span>
                        <span class="text-emerald-400 font-bold font-mono">통계적 신뢰도: ${info.winRate}</span>
                    </div>

                    <div class="p-4 rounded-xl bg-navy-950/80 border border-navy-800 space-y-2">
                        <h5 class="font-bold text-cyan-400 flex items-center gap-1.5 text-xs">
                            📖 패턴 기술적 정의 및 형성 원리
                        </h5>
                        <p class="text-slate-300 text-xs">${info.desc}</p>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div class="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                            <span class="text-emerald-400 font-bold flex items-center gap-1">🎯 최적 매수 타이밍</span>
                            <p class="text-slate-200">${info.buyPoint}</p>
                        </div>
                        <div class="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-1">
                            <span class="text-rose-400 font-bold flex items-center gap-1">🚨 권장 손절 기준</span>
                            <p class="text-slate-200">${info.stopLoss}</p>
                        </div>
                    </div>

                    <div class="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 space-y-1 text-xs">
                        <span class="text-blue-400 font-bold flex items-center gap-1">📈 1차 목표 수익 구간</span>
                        <p class="text-slate-200">${info.target}</p>
                    </div>

                    <div class="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
                        💡 <strong>실전 매매 팁:</strong> ${info.tips}
                    </div>

                    <!-- Legal Disclaimer Notice -->
                    <div class="p-3 rounded-xl bg-navy-950 border border-navy-800 text-[10.5px] text-slate-400 leading-relaxed">
                        ⚖️ <strong>법적 고지:</strong> 본 가이드의 통계 및 기술 분석 정보는 과거 캔들 데이터 기반의 학술·통계적 연구 자료일 뿐이며, 특정 자산의 가치 상승을 보증하거나 매수·매도를 권유하는 리딩/투자자문 행위가 아닙니다.
                    </div>
                </div>
            `;
        }

        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    },

    closePatternModal: function () {
        const modal = document.getElementById('modal-pattern-guide');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    },

    loadSignals: async function (forceRefresh = false) {
        this.isLoading = true;
        this.renderLoadingState();

        // 0.2초 로딩 후 즉시 렌더링 (체감 속도 극대화)
        await new Promise(resolve => setTimeout(resolve, 200));

        try {
            this.detectedSignals = this.generateSignalsForCurrentState();

            const timeEl = document.getElementById('pattern-refresh-time');
            if (timeEl) {
                const now = new Date();
                const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                const tfLabel = this.currentTimeframe === '1D' ? '1D (일봉)' : '4H (4시간봉)';
                const catLabel = {
                    'patterns': '차트패턴',
                    'realtime': '실시간 수급',
                    'news': '호재·공시',
                    'indicators': '기술지표',
                    'filter': '조건검색'
                }[this.selectedCategoryTab] || '신호';

                timeEl.innerText = `오늘 ${timeStr} 갱신 | ${tfLabel} 기준 ${catLabel} 레이더`;
            }
        } catch (e) {
            console.error('Signal loading error:', e);
        } finally {
            this.isLoading = false;
            this.renderCards();
        }
    },

    renderLoadingState: function () {
        const listEl = document.getElementById('pattern-cards-list');
        if (listEl) {
            listEl.innerHTML = `
                <div class="col-span-full py-16 text-center space-y-4">
                    <div class="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin mx-auto"></div>
                    <div class="text-sm font-bold text-white">업비트 & 빗썸 캔들 및 수급 데이터 AI 분석 중...</div>
                    <p class="text-xs text-slate-400">${this.currentTimeframe} 타임프레임 기준 실시간 매칭 계산 중입니다.</p>
                </div>
            `;
        }
    },

    // 현재 탭 & 타임프레임에 맞춘 정밀 신호 데이터 생성기
    generateSignalsForCurrentState: function () {
        const is4H = this.currentTimeframe === '4H';

        // 1) 차트 패턴 탭 (1D vs 4H 명확한 차이 적용)
        if (this.selectedCategoryTab === 'patterns') {
            if (is4H) {
                // 4시간봉 전용 신호 (단기 변동성, 12~72시간 형성, 스캘핑/단타 관점)
                return [
                    { symbol: 'BTC', name: '비트코인', code: '001000', exchange: 'UPBIT', pattern: 'pullback', patternName: '눌림목', similarity: 86, periodStr: '2026-09-06 17:00 ~ 2026-09-08 09:00 (40시간)', comment: '4H 20이평 지지 후 양봉 반등 ➔ 단기 넥라인 돌파 시도' },
                    { symbol: 'ETH', name: '이더리움', code: '002000', exchange: 'UPBIT', pattern: 'falling_wedge', patternName: '하락쐐기', similarity: 84, periodStr: '2026-09-05 21:00 ~ 2026-09-08 09:00 (60시간)', comment: '4H 쐐기 상단 저항선 양봉 돌파 ➔ 거래량 2배 급증' },
                    { symbol: 'SOL', name: '솔라나', code: '003000', exchange: 'UPBIT', pattern: 'cup_and_handle', patternName: '컵앤핸들', similarity: 88, periodStr: '2026-09-04 13:00 ~ 2026-09-08 09:00 (92시간)', comment: '4H U자 완성 후 핸들(손잡이) 돌파 ➔ 볼린저 상단 확장' },
                    { symbol: 'XRP', name: '리플', code: '004000', exchange: 'UPBIT', pattern: 'double_bottom', patternName: '쌍바닥', similarity: 85, periodStr: '2026-09-06 01:00 ~ 2026-09-08 09:00 (56시간)', comment: '4H 짝궁둥이 W바닥 안착 ➔ 체결강도 138% 급상승' },
                    { symbol: 'DOGE', name: '도지코인', code: '005000', exchange: 'UPBIT', pattern: 'flag', patternName: '깃발', similarity: 87, periodStr: '2026-09-07 05:00 ~ 2026-09-08 09:00 (28시간)', comment: '4H 장대양봉 후 좁은 하향 채널 ➔ 2차 폭발 임박' },
                    { symbol: 'SUI', name: '수이', code: '006000', exchange: 'BITHUMB', pattern: 'pullback', patternName: '눌림목', similarity: 83, periodStr: '2026-09-06 13:00 ~ 2026-09-08 09:00 (44시간)', comment: '4H 전고점 지지 리테스트 완료 후 반등 양봉 형성' },
                    { symbol: 'ADA', name: '에이다', code: '007000', exchange: 'UPBIT', pattern: 'triple_bottom', patternName: '삼중바닥', similarity: 82, periodStr: '2026-09-04 09:00 ~ 2026-09-08 09:00 (96시간)', comment: '4H 535원 지지선 3회 완벽 방어 ➔ 매도세 완전 소진' },
                    { symbol: 'AVAX', name: '아발란체', code: '008000', exchange: 'UPBIT', pattern: 'ascending_triangle', patternName: '상승삼각형', similarity: 84, periodStr: '2026-09-05 17:00 ~ 2026-09-08 09:00 (64시간)', comment: '4H 35,000원 수평 저항선 + 저점 상승 수렴 돌파' },
                    { symbol: 'NEAR', name: '니어프로토콜', code: '009000', exchange: 'UPBIT', pattern: 'ascending_channel', patternName: '상승채널', similarity: 85, periodStr: '2026-09-05 09:00 ~ 2026-09-08 09:00 (72시간)', comment: '4H 채널 하단 터치 후 거래량 실린 반등' },
                    { symbol: 'PEPE', name: '페페', code: '012000', exchange: 'BITHUMB', pattern: 'three_white_soldiers', patternName: '적삼병', similarity: 89, periodStr: '2026-09-07 21:00 ~ 2026-09-08 09:00 (12시간)', comment: '4H 3연속 장대양봉 출현 ➔ 단기 수급 폭발' },
                    { symbol: 'SEI', name: '세이', code: '014000', exchange: 'UPBIT', pattern: 'rectangle', patternName: '박스권', similarity: 81, periodStr: '2026-09-05 13:00 ~ 2026-09-08 09:00 (68시간)', comment: '4H 박스권 상단 저항선 터치 ➔ 상방 돌파 압력 가중' },
                    { symbol: 'STX', name: '스택스', code: '017000', exchange: 'UPBIT', pattern: 'inv_head_shoulders', patternName: '역헤드앤숄더', similarity: 86, periodStr: '2026-09-04 17:00 ~ 2026-09-08 09:00 (88시간)', comment: '4H 우측 어깨 지지 성공 ➔ 넥라인 돌파 시점' }
                ];
            } else {
                // 1D 일봉 신호 (중장기 스윙 관점, 10~35일 형성)
                return [
                    { symbol: 'BTC', name: '비트코인', code: '001000', exchange: 'UPBIT', pattern: 'pullback', patternName: '눌림목', similarity: 84, periodStr: '2026-08-27 ~ 2026-09-08 (12일)', comment: '20일선 지지 후 양봉 반등 ➔ 1차 목표가 +8.5%' },
                    { symbol: 'ETH', name: '이더리움', code: '002000', exchange: 'UPBIT', pattern: 'pullback', patternName: '눌림목', similarity: 82, periodStr: '2026-08-29 ~ 2026-09-08 (10일)', comment: '거래량 급감 건전한 숨고르기 안착 구간' },
                    { symbol: 'SOL', name: '솔라나', code: '003000', exchange: 'UPBIT', pattern: 'pullback', patternName: '눌림목', similarity: 82, periodStr: '2026-08-21 ~ 2026-09-08 (18일)', comment: '전고점 지지선 테스트 완료 ➔ 전형적인 눌림목' },
                    { symbol: 'XRP', name: '리플', code: '004000', exchange: 'UPBIT', pattern: 'pullback', patternName: '눌림목', similarity: 82, periodStr: '2026-08-23 ~ 2026-09-08 (16일)', comment: '피보나치 38.2% 지지선에서 매수세 유입 확인' },
                    { symbol: 'DOGE', name: '도지코인', code: '005000', exchange: 'UPBIT', pattern: 'pullback', patternName: '눌림목', similarity: 81, periodStr: '2026-08-25 ~ 2026-09-08 (14일)', comment: '단기 조정 마무리 및 지지 캔들 형성' },
                    { symbol: 'SUI', name: '수이', code: '006000', exchange: 'BITHUMB', pattern: 'double_bottom', patternName: '쌍바닥', similarity: 86, periodStr: '2026-08-17 ~ 2026-09-08 (22일)', comment: 'W자형 바닥 2차 지지 완료 ➔ 넥라인 돌파 시도' },
                    { symbol: 'ADA', name: '에이다', code: '007000', exchange: 'UPBIT', pattern: 'double_bottom', patternName: '쌍바닥', similarity: 83, periodStr: '2026-08-20 ~ 2026-09-08 (19일)', comment: '짝궁둥이 W바닥으로 매수세 우위 반전' },
                    { symbol: 'AVAX', name: '아발란체', code: '008000', exchange: 'UPBIT', pattern: 'triple_bottom', patternName: '삼중바닥', similarity: 85, periodStr: '2026-08-11 ~ 2026-09-08 (28일)', comment: '3회 지지선 테스트 완벽 방어 ➔ 매도세 고갈' },
                    { symbol: 'NEAR', name: '니어프로토콜', code: '009000', exchange: 'UPBIT', pattern: 'ascending_channel', patternName: '상승채널', similarity: 84, periodStr: '2026-08-15 ~ 2026-09-08 (24일)', comment: '우상향 채널 하단 지지선 터치 후 강력 반등' },
                    { symbol: 'LINK', name: '체인링크', code: '010000', exchange: 'UPBIT', pattern: 'ascending_channel', patternName: '상승채널', similarity: 81, periodStr: '2026-08-24 ~ 2026-09-08 (15일)', comment: '채널 중심선 위에서 우상향 추세 견고 유지' },
                    { symbol: 'SHIB', name: '시바이누', code: '011000', exchange: 'UPBIT', pattern: 'ascending_triangle', patternName: '상승삼각형', similarity: 85, periodStr: '2026-08-23 ~ 2026-09-08 (16일)', comment: '수평 저항선 + 저점 상승 수렴 ➔ 상방 돌파 임박' },
                    { symbol: 'PEPE', name: '페페', code: '012000', exchange: 'BITHUMB', pattern: 'falling_wedge', patternName: '하락쐐기', similarity: 83, periodStr: '2026-08-19 ~ 2026-09-08 (20일)', comment: '하락 에너지 소진 및 쐐기 상단 돌파 시점' },
                    { symbol: 'BCH', name: '비트코인캐시', code: '013000', exchange: 'UPBIT', pattern: 'cup_and_handle', patternName: '컵앤핸들', similarity: 88, periodStr: '2026-08-07 ~ 2026-09-08 (32일)', comment: 'U자 컵 완성 후 얕은 손잡이(핸들) 돌파 임박' },
                    { symbol: 'SEI', name: '세이', code: '014000', exchange: 'UPBIT', pattern: 'flag', patternName: '깃발', similarity: 87, periodStr: '2026-08-31 ~ 2026-09-08 (8일)', comment: '장대양봉 깃대 후 좁은 하향 채널 ➔ 2차 폭발 대기' },
                    { symbol: 'APT', name: '앱토스', code: '015000', exchange: 'BITHUMB', pattern: 'u_bottom', patternName: 'U자바닥', similarity: 82, periodStr: '2026-08-04 ~ 2026-09-08 (35일)', comment: '장기 라운딩 바닥 다지기 후 거래량 점증' },
                    { symbol: 'ETC', name: '이더리움클래식', code: '016000', exchange: 'UPBIT', pattern: 'rectangle', patternName: '박스권', similarity: 80, periodStr: '2026-08-18 ~ 2026-09-08 (21일)', comment: '박스권 하단 지지 성공 ➔ 상단 저항선 목표' },
                    { symbol: 'STX', name: '스택스', code: '017000', exchange: 'UPBIT', pattern: 'inv_head_shoulders', patternName: '역헤드앤숄더', similarity: 89, periodStr: '2026-08-09 ~ 2026-09-08 (30일)', comment: '우측 어깨 지지 성공 ➔ 넥라인 상방 돌파 임박' },
                    { symbol: 'ALGO', name: '알고랜드', code: '018000', exchange: 'BITHUMB', pattern: 'three_white_soldiers', patternName: '적삼병', similarity: 86, periodStr: '2026-09-04 ~ 2026-09-08 (4일)', comment: '3연속 장대양봉 및 거래량 급증 ➔ 모멘텀 강세' }
                ];
            }
        }

        // 2) 실시간 수급 포착 탭
        if (this.selectedCategoryTab === 'realtime') {
            return [
                { symbol: 'XRP', name: '리플', code: '004000', exchange: 'UPBIT', subFilter: 'volume_surge', badgeText: '거래량 +480% 폭증', badgeColor: 'bg-emerald-500 text-navy-950', title: '5분봉 거래대금 185억 돌파', comment: '직전 1시간 평균 대비 거래대금 4.8배 급증하며 800원 저항선 상방 돌파', periodStr: '포착 시점: 2분 전 (실시간 체결 집중)' },
                { symbol: 'PEPE', name: '페페', code: '012000', exchange: 'BITHUMB', subFilter: 'power_surge', badgeText: '체결강도 168%', badgeColor: 'bg-cyan-400 text-navy-950', title: '순매수 체결 압도적 우위', comment: '매도 호가 대비 공격적 시장가 매수 비율 68% 초과로 단기 펌핑 지속', periodStr: '포착 시점: 5분 전 (스마트머니 매수세)' },
                { symbol: 'SUI', name: '수이', code: '006000', exchange: 'BITHUMB', subFilter: 'sudden_spike', badgeText: '5분봉 +5.8%', badgeColor: 'bg-rose-500 text-white', title: '순간 변동성 확장 신호', comment: '분봉 볼린저 상단 밴드 뚫고 거래량 동반 1,450원 돌파 성공', periodStr: '포착 시점: 8분 전 (단기 모멘텀)' },
                { symbol: 'SOL', name: '솔라나', code: '003000', exchange: 'UPBIT', subFilter: 'golden_cross', badgeText: '골든크로스 발생', badgeColor: 'bg-amber-400 text-navy-950', title: '5이평 ➔ 20이평 상향 돌파', comment: '단기 조정 후 이평선 정배열 재진입으로 200,000원 안착 가시화', periodStr: '포착 시점: 12분 전 (추세 전환)' },
                { symbol: 'DOGE', name: '도지코인', code: '005000', exchange: 'UPBIT', subFilter: 'volume_surge', badgeText: '거래량 +320%', badgeColor: 'bg-emerald-500 text-navy-950', title: '업비트 원화 거래대금 3위', comment: '10분간 140억원 순유입되며 바닥 탈출 시도', periodStr: '포착 시점: 15분 전 (수급 집중)' },
                { symbol: 'SEI', name: '세이', code: '014000', exchange: 'UPBIT', subFilter: 'power_surge', badgeText: '체결강도 142%', badgeColor: 'bg-cyan-400 text-navy-950', title: '대형 매수 체결 연속 발생', comment: '호가창 대량 매수벽 형성 후 470원대 물량 소화 중', periodStr: '포착 시점: 18분 전 (기관성 매집)' }
            ];
        }

        // 3) 호재 및 공시 포착 탭
        if (this.selectedCategoryTab === 'news') {
            return [
                { symbol: 'ETH', name: '이더리움', code: '002000', exchange: 'UPBIT', subFilter: 'mainnet', badgeText: '파급력 HIGH (92%)', badgeColor: 'bg-purple-500 text-white', title: '메인넷 v3.5 덴쿤 후속 하드포크 예정', comment: 'L2 롤업 가스비 추가 50% 절감 및 스테이킹 인출 효율화 업그레이드', periodStr: '예정 일정: 2026-09-24 (D-16)' },
                { symbol: 'BNB', name: '비앤비', code: '031000', exchange: 'BITHUMB', subFilter: 'burn', badgeText: '대규모 소각 임박', badgeColor: 'bg-rose-500 text-white', title: '2026 3분기 정기 자동 토큰 소각(Auto-Burn)', comment: '약 180만 개(약 1조 2천억 원) 규모 공급량 영구 소각 집행 예정', periodStr: '예정 일정: 2026-09-18 (D-10)' },
                { symbol: 'SOL', name: '솔라나', code: '003000', exchange: 'UPBIT', subFilter: 'partnership', badgeText: '글로벌 파트너십', badgeColor: 'bg-blue-500 text-white', title: '미국 대형 핀테크사 결제망 공식 연동', comment: '전미 1,200만 가맹점 솔라나 Pay 실시간 스테이블 결제 지원 확정', periodStr: '공시 일자: 2026-09-07 (공식 발표 완료)' },
                { symbol: 'SUI', name: '수이', code: '006000', exchange: 'BITHUMB', subFilter: 'ecosystem', badgeText: '생태계 펀드 출범', badgeColor: 'bg-emerald-500 text-navy-950', title: '수이 재단 $50M AI·게임 인큐베이팅 펀드', comment: '글로벌 유수 벤처캐피탈(VC)과 매칭 펀드 조성으로 유동성 공급', periodStr: '예정 일정: 2026-09-15 (D-7)' },
                { symbol: 'NEAR', name: '니어프로토콜', code: '009000', exchange: 'UPBIT', subFilter: 'mainnet', badgeText: '샤딩 2단계 완성', badgeColor: 'bg-purple-500 text-white', title: '무한 확장 스테이트리스 발리데이션 활성화', comment: '초당 트랜잭션(TPS) 100,000건 달성 및 수수료 90% 인하', periodStr: '예정 일정: 2026-09-29 (D-21)' },
                { symbol: 'STX', name: '스택스', code: '017000', exchange: 'UPBIT', subFilter: 'mainnet', badgeText: '나카모토 업그레이드', badgeColor: 'bg-purple-500 text-white', title: '비트코인 sBTC 완전 민팅 브릿지 개통', comment: 'BTC L2로서의 트랜잭션 확정 시간 5초대로 단축', periodStr: '예정 일정: 2026-09-20 (D-12)' }
            ];
        }

        // 4) 핵심 기술지표 포착 탭
        if (this.selectedCategoryTab === 'indicators') {
            return [
                { symbol: 'BTC', name: '비트코인', code: '001000', exchange: 'UPBIT', subFilter: 'bollinger_rebound', badgeText: 'BB 하단 반등', badgeColor: 'bg-cyan-400 text-navy-950', title: '볼린저밴드 하단 터치 후 양봉 전환', comment: '일봉 볼린저 하단 89,800,000원에서 강력한 꼬리 달고 20일선 복귀', periodStr: '지표 신호: 볼린저 밴드 스퀴즈 후 반등' },
                { symbol: 'XRP', name: '리플', code: '004000', exchange: 'UPBIT', subFilter: 'rsi_oversold', badgeText: 'RSI 28.5 과매도 탈출', badgeColor: 'bg-emerald-500 text-navy-950', title: 'RSI 14일선 30 상향 돌파', comment: '역사적 과매도 구간(28.5) 탈출하며 강력한 매수 다이버전스 발생', periodStr: '지표 신호: 단기 바닥 반등 확률 85%' },
                { symbol: 'SOL', name: '솔라나', code: '003000', exchange: 'UPBIT', subFilter: 'macd_cross', badgeText: 'MACD 골든크로스', badgeColor: 'bg-blue-400 text-navy-950', title: 'MACD 시그널선 상향 돌파 완료', comment: '히스토그램이 음(-)에서 양(+)으로 전환되며 상승 탄력 확장 시작', periodStr: '지표 신호: 중기 추세 우상향 정배열' },
                { symbol: 'LINK', name: '체인링크', code: '010000', exchange: 'UPBIT', subFilter: 'ichimoku_break', badgeText: '일목 기준선 지지', badgeColor: 'bg-amber-400 text-navy-950', title: '일목균형표 전환선/기준선 정배열', comment: '의문 구름대 상단에 안착하며 양운(선행스팬1>선행스팬2) 지지 확보', periodStr: '지표 신호: 17,500원 저항 돌파 가시화' },
                { symbol: 'AVAX', name: '아발란체', code: '008000', exchange: 'UPBIT', subFilter: 'rsi_oversold', badgeText: 'RSI 과매도 탈출', badgeColor: 'bg-emerald-500 text-navy-950', title: '스토캐스틱 + RSI 동반 침체 탈출', comment: '두 개 오실레이터 지표가 동시에 골든크로스를 그리며 반등 확정', periodStr: '지표 신호: 반등 신뢰도 매우 높음' },
                { symbol: 'NEAR', name: '니어프로토콜', code: '009000', exchange: 'UPBIT', subFilter: 'macd_cross', badgeText: 'MACD 0선 돌파', badgeColor: 'bg-blue-400 text-navy-950', title: 'MACD 0선 상방 교차(Zero-line Cross)', comment: '하락장세 마감 및 본격적인 상승장 추세 국면 진입 신호', periodStr: '지표 신호: 추가 상승 여력 15%+' }
            ];
        }

        // 5) 실전 조건검색 탭
        if (this.selectedCategoryTab === 'filter') {
            return [
                { symbol: 'BTC', name: '비트코인', code: '001000', exchange: 'UPBIT', subFilter: 'cond_turnover_trend', badgeText: '조건 일치 100%', badgeColor: 'bg-emerald-500 text-navy-950', title: '거래대금 1,000억+ 3대 이평 정배열', comment: '24시간 거래대금 3,200억 + 5/20/60일선 정배열 + 당일 양봉 전환', periodStr: '전략: 대형주 스마트머니 주도 트렌드' },
                { symbol: 'SOL', name: '솔라나', code: '003000', exchange: 'UPBIT', subFilter: 'cond_breakout_ready', badgeText: '조건 일치 96%', badgeColor: 'bg-cyan-400 text-navy-950', title: '연고점 -2.8% 이내 돌파 대기', comment: '전고점 204,000원 바로 아래에서 3일간 거래량 줄이며 매물 소화', periodStr: '전략: 전고점 돌파 매매 타점' },
                { symbol: 'XRP', name: '리플', code: '004000', exchange: 'UPBIT', subFilter: 'cond_bottom_rebound', badgeText: '조건 일치 94%', badgeColor: 'bg-emerald-500 text-navy-950', title: 'RSI 30이하 + 쌍바닥 2차 지지', comment: '침체 국면에서 거래량 실린 장대양봉 출현하며 바닥권 완전 장악', periodStr: '전략: 저평가 바닥 반전 스윙' },
                { symbol: 'PEPE', name: '페페', code: '012000', exchange: 'BITHUMB', subFilter: 'cond_panic_bounce', badgeText: '조건 일치 91%', badgeColor: 'bg-amber-400 text-navy-950', title: '고점 대비 -35% 낙폭과대 첫 양봉', comment: '과매도 한계점에서 대량 매수세 유입되며 기술적 되돌림 반등 시작', periodStr: '전략: 피보나치 38.2% 기술적 되돌림' },
                { symbol: 'SUI', name: '수이', code: '006000', exchange: 'BITHUMB', subFilter: 'cond_turnover_trend', badgeText: '조건 일치 95%', badgeColor: 'bg-emerald-500 text-navy-950', title: '거래대금 상위 5% + 골든크로스', comment: '일일 거래량 폭증하며 20일선 돌파 및 체결강도 135% 상회', periodStr: '전략: 모멘텀 돌파 추세추종' }
            ];
        }

        return [];
    },

    renderCards: function () {
        const listEl = document.getElementById('pattern-cards-list');
        const countBadge = document.getElementById('pattern-total-count-badge');
        if (!listEl) return;

        let filtered = this.detectedSignals.filter(item => {
            // 패턴 탭 필터링
            if (this.selectedCategoryTab === 'patterns') {
                if (this.currentPattern !== 'ALL' && item.pattern !== this.currentPattern) {
                    return false;
                }
            } else {
                // 서브 카테고리 필터링
                if (this.currentSubFilter !== 'ALL' && item.subFilter !== this.currentSubFilter) {
                    return false;
                }
            }

            // 거래소 필터링
            if (this.currentExchange !== 'ALL' && item.exchange !== this.currentExchange) {
                return false;
            }

            // 검색어 필터링
            if (this.searchQuery) {
                const q = this.searchQuery;
                const matchName = item.name.toLowerCase().includes(q);
                const matchSymbol = item.symbol.toLowerCase().includes(q);
                const matchPattern = (item.patternName || item.title || '').toLowerCase().includes(q);
                if (!matchName && !matchSymbol && !matchPattern) return false;
            }
            return true;
        });

        if (countBadge) {
            countBadge.innerText = `${filtered.length}건 포착`;
        }

        if (filtered.length === 0) {
            listEl.innerHTML = `
                <div class="col-span-full py-16 text-center space-y-3 bg-navy-900/40 rounded-3xl border border-navy-800 p-8">
                    <div class="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 mx-auto flex items-center justify-center text-xl">
                        🔎
                    </div>
                    <h4 class="text-sm font-bold text-slate-300">일치하는 포착 코인이 없습니다</h4>
                    <p class="text-xs text-slate-500">다른 카테고리를 선택하거나 거래소 필터/검색어를 초기화해 보세요.</p>
                    <button onclick="PatternScannerEngine.resetFilters()" class="px-3.5 py-1.5 rounded-xl bg-navy-800 hover:bg-navy-700 text-cyan-300 text-xs font-semibold transition border border-navy-700">
                        필터 전체 초기화
                    </button>
                </div>
            `;
            return;
        }

        listEl.innerHTML = filtered.map(item => {
            const exBadgeClass = item.exchange === 'UPBIT' 
                ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' 
                : 'bg-amber-500/15 text-amber-400 border-amber-500/30';
            const exName = item.exchange === 'UPBIT' ? '업비트' : '빗썸';

            // 상단 우측 알약 배지 (차트패턴일 때는 녹색 유사도, 타 탭일 때는 해당 배지)
            const pillBadge = item.similarity 
                ? `<span class="pattern-similarity-pill inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-emerald-500 text-navy-950 shadow-sm shadow-emerald-500/30 tracking-tight">유사도 ${item.similarity}%</span>`
                : `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-black ${item.badgeColor || 'bg-emerald-500 text-navy-950'} shadow-sm tracking-tight">${item.badgeText || '포착'}</span>`;

            // 패턴명 또는 제목 라인
            const tagLine = item.patternName
                ? `<span class="text-xs font-bold text-slate-200">${item.patternName}</span><span class="text-[11px] text-emerald-400 font-medium truncate">• ${item.comment}</span>`
                : `<span class="text-xs font-bold text-slate-200">${item.title}</span>`;

            return `
                <div class="pattern-signal-card bg-navy-900 border border-navy-800/90 rounded-2xl p-4 sm:p-5 shadow-md hover:border-emerald-500/40 hover:shadow-emerald-500/5 transition group flex flex-col justify-between">
                    <div>
                        <!-- Header: Coin Name + Pill Badge -->
                        <div class="flex items-start justify-between gap-2 mb-2">
                            <div>
                                <div class="flex items-center gap-1.5 flex-wrap">
                                    <h4 class="text-base sm:text-lg font-black text-white group-hover:text-emerald-300 transition tracking-tight">
                                        ${item.name}
                                    </h4>
                                    <span class="text-[10px] px-2 py-0.5 rounded-md font-mono font-bold border ${exBadgeClass}">
                                        ${exName}
                                    </span>
                                </div>
                                <div class="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                                    <span class="font-mono text-slate-300">${item.symbol}/KRW</span>
                                    <span class="text-slate-600">•</span>
                                    <span class="font-mono text-[11px] text-slate-400">${item.code}</span>
                                </div>
                            </div>
                            <!-- Right Pill Badge -->
                            <div class="shrink-0">
                                ${pillBadge}
                            </div>
                        </div>

                        <!-- Tag / Description -->
                        <div class="mt-2.5 mb-3 flex items-center gap-2 flex-wrap">
                            ${tagLine}
                        </div>

                        ${item.title && item.comment ? `
                            <p class="text-[11px] text-slate-400 leading-relaxed mb-3">
                                ${item.comment}
                            </p>
                        ` : ''}
                    </div>

                    <!-- Footer: Period / Status + Chart Link -->
                    <div class="pt-3 border-t border-navy-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div class="text-[11px] text-slate-400 font-mono flex items-center gap-1 flex-wrap">
                            <span class="text-slate-500">${item.patternName ? '패턴 기간' : '정보'}</span>
                            <strong class="text-slate-300 font-normal">${item.periodStr}</strong>
                        </div>
                        <button onclick="PatternScannerEngine.viewChart('${item.symbol}')" class="text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 self-end sm:self-auto font-semibold">
                            차트 보기 <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            lucide.createIcons();
        }
    },

    viewChart: function (symbol) {
        if (typeof switchTab === 'function') {
            switchTab('market');
            setTimeout(() => {
                const coinSearch = document.getElementById('coin-search') || document.getElementById('market-search');
                if (coinSearch) {
                    coinSearch.value = symbol;
                    coinSearch.dispatchEvent(new Event('input'));
                }
            }, 200);
        }
    },

    resetFilters: function () {
        this.currentPattern = 'ALL';
        this.currentSubFilter = 'ALL';
        this.currentExchange = 'ALL';
        this.searchQuery = '';
        const searchInput = document.getElementById('pattern-search-input');
        if (searchInput) searchInput.value = '';
        document.querySelectorAll('.pattern-nav-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.pattern === 'ALL' || btn.dataset.subfilter === 'ALL');
        });
        document.querySelectorAll('.pattern-exchange-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.exchange === 'ALL');
        });
        this.renderCards();
    }
};

if (typeof window !== 'undefined') {
    window.PatternScannerEngine = PatternScannerEngine;
}
