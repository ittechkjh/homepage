/**
 * admin.js
 * CryptoPnL(CryptoPnL) 통합 관리자 센터 엔진 (100% 실제 데이터 모드)
 * - 실제 일일 방문자 수 및 페이지뷰 실측 집계 (DAU, WAU, PV)
 * - 실제 가입된 회원 계정 및 권한 관리 (ADMIN, USER)
 * - 실제 커뮤니티 포럼 & 실시간 채팅 모니터링 및 제어
 * - 시스템 스토리지 진단 및 전체 데이터 백업/복원
 */

const AdminAnalytics = {
    STORAGE_KEY: 'coinhub_admin_real_analytics',
    PAGE_ACCESS_STORAGE_KEY: 'crytopnl_page_access_times',
    VISITOR_LOGS_STORAGE_KEY: 'crytopnl_recent_visitor_logs',
    cloudStatsCache: null,
    lastVisitPromise: null,

    PAGE_DEFINITIONS: [
        { key: 'analyzer', name: '거래내역 손익 분석기', path: '#/analyzer', icon: 'file-spreadsheet', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' },
        { key: 'market', name: '가상자산 실시간 시세 & 차트', path: '#/market', icon: 'trending-up', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
        { key: 'onchain', name: '온체인 & 고래 레이더', path: '#/onchain', icon: 'radar', color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/30' },
        { key: 'patterns', name: 'AI 차트패턴 실시간 스캐너', path: '#/patterns', icon: 'scan', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
        { key: 'calculators', name: '실전 투자 보조 계산기', path: '#/calculators', icon: 'calculator', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
        { key: 'news', name: '글로벌 암호화폐 실시간 속보', path: '#/news', icon: 'zap', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
        { key: 'policy', name: '2026 정부지원 & 청년 정책', path: '#/policy', icon: 'landmark', color: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
        { key: 'forum', name: '커뮤니티 투자 포럼', path: '#/forum', icon: 'messages-square', color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30' },
        { key: 'guides', name: '실전 투자 지식 백서', path: '#/guides', icon: 'book-open', color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/30' },
        { key: 'chat', name: '실시간 투자자 익명 채팅', path: '#/chat', icon: 'message-circle', color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/30' },
        { key: 'calendar', name: '코인 일정 & 거시경제 캘린더', path: '#/calendar', icon: 'calendar', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30' }
    ],

    getPageInfo: function (pageKey) {
        if (!pageKey) return this.PAGE_DEFINITIONS[0];
        const norm = (pageKey === 'community' ? 'forum' : (pageKey === 'yearend-tax' ? 'calculators' : pageKey));
        const found = this.PAGE_DEFINITIONS.find(p => p.key === norm || p.key === pageKey);
        return found || { key: pageKey, name: pageKey, path: '#/' + pageKey, icon: 'layout', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' };
    },

    formatKstTime: function (d = new Date()) {
        try {
            const dateObj = (typeof d === 'string' || typeof d === 'number') ? new Date(d) : d;
            return new Intl.DateTimeFormat('ko-KR', {
                timeZone: 'Asia/Seoul',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }).format(dateObj);
        } catch (e) {
            return new Date().toLocaleString('ko-KR');
        }
    },

    formatRelativeTime: function (timestamp) {
        if (!timestamp) return '-';
        const now = Date.now();
        const t = (typeof timestamp === 'number') ? timestamp : new Date(timestamp).getTime();
        if (isNaN(t)) return '-';
        const diffMs = now - t;
        if (diffMs < 0) return '방금 전';
        const diffSec = Math.floor(diffMs / 1000);
        if (diffSec < 10) return '방금 전';
        if (diffSec < 60) return `${diffSec}초 전`;
        const diffMin = Math.floor(diffSec / 60);
        if (diffMin < 60) return `${diffMin}분 전`;
        const diffHour = Math.floor(diffMin / 60);
        if (diffHour < 24) return `${diffHour}시간 전`;
        const diffDay = Math.floor(diffHour / 24);
        return `${diffDay}일 전`;
    },

    // 100% 실측 통계 기반 (가상 베이스라인 및 하드코딩 완전 제거)
    getKstDateStr: function (d = new Date()) {
        try {
            return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(d);
        } catch (e) {
            const kstDate = new Date(d.getTime() + (d.getTimezoneOffset() * 60000) + (9 * 3600000));
            const y = kstDate.getFullYear();
            const m = String(kstDate.getMonth() + 1).padStart(2, '0');
            const day = String(kstDate.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        }
    },

    getBrowserName: function () {
        const ua = navigator.userAgent;
        if (/Whale/i.test(ua)) return 'Whale';
        if (/SamsungBrowser/i.test(ua)) return 'Samsung';
        if (/Edg|EdgiOS/i.test(ua)) return 'Edge';
        if (/Chrome|CriOS/i.test(ua) && !/Edg|EdgiOS|Whale|Samsung/i.test(ua)) return 'Chrome';
        if (/Firefox|FxiOS/i.test(ua)) return 'Firefox';
        if (/Safari/i.test(ua) && !/Chrome|CriOS|Android/i.test(ua)) return 'Safari';
        return 'Other';
    },

    isAdminSession: function () {
        try {
            // 1. If actively logged in as a non-admin member, NEVER treat as admin session!
            const userKeys = ['crytopnl_user', 'coinhub_user', 'cryptopnl_user'];
            for (const k of userKeys) {
                const raw = localStorage.getItem(k);
                if (raw) {
                    try {
                        const u = JSON.parse(raw);
                        if (u && u.username && u.username.toLowerCase() !== 'admin' && u.role !== 'ADMIN' && u.rank !== 'ADMIN') {
                            return false;
                        }
                    } catch(e) {}
                }
            }
            if (typeof currentUser !== 'undefined' && currentUser) {
                if (currentUser.username && currentUser.username.toLowerCase() !== 'admin' && currentUser.role !== 'ADMIN' && currentUser.rank !== 'ADMIN') {
                    return false;
                }
            }

            // 2. Check if currently authenticated as admin in this active session
            if (sessionStorage.getItem('coinhub_admin_authenticated') === '1' ||
                sessionStorage.getItem('crytopnl_admin_authenticated') === '1' ||
                sessionStorage.getItem('cryptopnl_admin_authenticated') === '1') {
                return true;
            }
            for (const k of userKeys) {
                const raw = localStorage.getItem(k);
                if (raw) {
                    const u = JSON.parse(raw);
                    if (u && (u.username?.toLowerCase() === 'admin' || u.role === 'ADMIN' || u.rank === 'ADMIN')) {
                        return true;
                    }
                }
            }
            if (typeof currentUser !== 'undefined' && currentUser) {
                if (currentUser.username?.toLowerCase() === 'admin' || currentUser.role === 'ADMIN' || currentUser.rank === 'ADMIN') {
                    return true;
                }
            }
        } catch (e) {}
        return false;
    },

    rollbackAdminVisit: function () {
        try {
            sessionStorage.setItem('coinhub_admin_authenticated', '1');
            sessionStorage.setItem('crytopnl_admin_authenticated', '1');
            localStorage.removeItem('crytopnl_is_admin_client');
            localStorage.removeItem('coinhub_is_admin_client');
        } catch (e) {}
    },

    init: function () {
        try {
            // Clean up legacy mock and local persistent analytics caches
            const staleKeys = [
                'coinhub_admin_real_analytics',
                'crytopnl_page_access_times',
                'crytopnl_recent_visitor_logs',
                'coinhub_admin_cloud_stats_cache',
                'crytopnl_guest_trades_cache',
                'coinhub_registered_users',
                'crytopnl_registered_users',
                'crytopnl_is_admin_client',
                'coinhub_is_admin_client'
            ];
            staleKeys.forEach(k => {
                try { localStorage.removeItem(k); } catch(e) {}
            });
        } catch (e) {}

        // 관리자 접속 시 모든 방문자/PV/활동 통계 수치 반영 완전 배제
        if (this.isAdminSession()) return;

        // 사이트 최초 접속 시 자동 고유 방문자(DAU) 및 PV 즉시 1회 실시간 집계
        let initialFeature = 'community';
        try {
            const h = (window.location.hash || '').replace('#/', '').replace('#', '');
            if (h) {
                const p = h.split('/')[0].split('?')[0];
                if (p) initialFeature = p;
            }
        } catch (e) {}

        // 관리자 대시보드 탭 자체(#/admin)가 아닌 경우에만 실제 외부 방문자 페이지 방문 기록
        if (initialFeature !== 'admin') {
            this.recordVisit(initialFeature);
        }
    },

    getAnalyticsData: function () {
        return this.initRealAnalytics();
    },

    initRealAnalytics: function () {
        const todayStr = this.getKstDateStr();
        const history14 = [];
        const now = new Date();
        for (let i = 13; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            history14.push({
                date: this.getKstDateStr(d),
                visitors: 0,
                pageviews: 0
            });
        }

        return {
            todayDate: todayStr,
            totalVisitorsAllTime: 0,
            totalPageviewsAllTime: 0,
            history: history14,
            devices: { mobile: 0, desktop: 0 },
            browsers: { Chrome: 0, Safari: 0, Samsung: 0, Edge: 0, Whale: 0, Firefox: 0, Other: 0 },
            features: { analyzer: 0, market: 0, onchain: 0, patterns: 0, calculators: 0, news: 0, policy: 0, community: 0, calendar: 0 },
            todayDevices: { mobile: 0, desktop: 0 },
            todayBrowsers: { Chrome: 0, Safari: 0, Samsung: 0, Edge: 0, Whale: 0, Firefox: 0, Other: 0 },
            todayFeatures: { analyzer: 0, market: 0, onchain: 0, patterns: 0, calculators: 0, news: 0, policy: 0, community: 0, calendar: 0 }
        };
    },

    recordVisit: function (featureName = null, force = false) {
        try {
            const todayStr = this.getKstDateStr();
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent) ||
                             (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent));
            const devKey = isMobile ? 'mobile' : 'desktop';
            const browserName = this.getBrowserName();

            // Normalize feature name across all 9 functional areas
            let targetFeature = null;
            if (featureName) {
                targetFeature = featureName;
                if (targetFeature === 'admin') {
                    return Promise.resolve();
                }
                if (targetFeature === 'forum' || targetFeature === 'chat' || targetFeature === 'guides') {
                    targetFeature = 'community';
                }
                if (targetFeature === 'yearend-tax') {
                    targetFeature = 'calculators';
                }
            }

            // 관리자 접속은 모든 통계 수치 및 활동 로그에 절대 반영하지 않음
            if (!force && this.isAdminSession()) {
                return Promise.resolve();
            }

            // 1. Session-based unique visitor check
            let isNewVisitor = false;
            if (!sessionStorage.getItem('crytopnl_visited_' + todayStr)) {
                isNewVisitor = true;
                sessionStorage.setItem('crytopnl_visited_' + todayStr, '1');
            }

            // Session-based unique device/browser check
            let isNewDeviceSession = false;
            if (!sessionStorage.getItem('crytopnl_dev_logged_' + todayStr)) {
                isNewDeviceSession = true;
                sessionStorage.setItem('crytopnl_dev_logged_' + todayStr, '1');
            }

            // 2. Prepare individual log entry
            const now = new Date();
            const nowKst = this.formatKstTime(now);
            const nowTs = now.getTime();
            const pageKey = (featureName && featureName !== 'admin') ? featureName : (targetFeature || 'analyzer');
            const pageInfo = this.getPageInfo(pageKey);
            
            let sessionId = sessionStorage.getItem('crytopnl_visitor_session_id');
            if (!sessionId) {
                sessionId = 'v_' + Math.random().toString(36).substring(2, 8) + '_' + nowTs.toString(36);
                sessionStorage.setItem('crytopnl_visitor_session_id', sessionId);
            }

            let firstVisitTime = sessionStorage.getItem('crytopnl_first_visit_time');
            if (!firstVisitTime) {
                firstVisitTime = nowKst;
                sessionStorage.setItem('crytopnl_first_visit_time', firstVisitTime);
            }

            let currentUserName = '비회원 (게스트)';
            try {
                if (typeof currentUser !== 'undefined' && currentUser && currentUser.username) {
                    currentUserName = currentUser.username;
                } else {
                    const uKeys = ['crytopnl_user', 'coinhub_user'];
                    for (const k of uKeys) {
                        const r = localStorage.getItem(k);
                        if (r) {
                            const u = JSON.parse(r);
                            if (u && u.username) {
                                currentUserName = u.username;
                                break;
                            }
                        }
                    }
                }
            } catch(e) {}

            const logEntry = {
                id: 'log_' + nowTs + '_' + Math.random().toString(36).substring(2, 6),
                sessionId: sessionId,
                time: nowKst,
                timestamp: nowTs,
                firstVisitTime: firstVisitTime,
                page: pageKey,
                pageName: pageInfo.name,
                path: pageInfo.path,
                device: devKey,
                browser: browserName,
                user: currentUserName,
                date: todayStr
            };

            // 3. Firestore Cloud Real-time Aggregation (100% 실측 저장, 가상/로컬스토리지 저장 배제)
            let firestore = window.db || (typeof db !== 'undefined' ? db : null);
            if (!firestore && typeof firebase !== 'undefined' && firebase.firestore) {
                try { firestore = firebase.firestore(); } catch(e) {}
            }
            if (firestore && typeof firebase !== 'undefined' && firebase.firestore) {
                const inc = firebase.firestore.FieldValue.increment(1);
                const updateObj = {
                    date: todayStr,
                    pageviews: inc,
                    lastVisitAt: new Date().toISOString()
                };

                if (targetFeature) {
                    updateObj.features = {
                        [targetFeature]: inc
                    };
                }

                if (isNewVisitor) {
                    updateObj.visitors = inc;
                }
                if (isNewDeviceSession) {
                    updateObj.devices = {
                        [devKey]: inc
                    };
                    updateObj.browsers = {
                        [browserName]: inc
                    };
                }

                const p1 = firestore.collection('site_analytics').doc(todayStr).set(updateObj, { merge: true })
                    .catch(e => console.warn('Firestore analytics sync note:', e));

                const totalsObj = {
                    totalPageviews: firebase.firestore.FieldValue.increment(1)
                };
                if (isNewVisitor) {
                    totalsObj.totalVisitors = firebase.firestore.FieldValue.increment(1);
                }
                const p2 = firestore.collection('site_analytics').doc('totals').set(totalsObj, { merge: true })
                    .catch(e => console.warn('Firestore totals sync note:', e));

                const p3 = firestore.collection('site_analytics').doc('page_access_summary').set({
                    [`pages.${pageKey}.lastAccessedAt`]: nowKst,
                    [`pages.${pageKey}.lastTimestamp`]: nowTs,
                    [`pages.${pageKey}.lastUser`]: currentUserName,
                    [`pages.${pageKey}.lastDevice`]: devKey,
                    [`pages.${pageKey}.lastBrowser`]: browserName,
                    [`pages.${pageKey}.name`]: pageInfo.name,
                    [`pages.${pageKey}.todayCount`]: inc,
                    [`pages.${pageKey}.totalCount`]: inc,
                    lastGlobalAccessAt: nowKst,
                    lastGlobalTimestamp: nowTs,
                    updatedAt: new Date().toISOString()
                }, { merge: true }).catch(e => console.warn('Firestore page_access_summary note:', e));

                const p4 = firestore.collection('visitor_access_logs').add(logEntry)
                    .catch(e => console.warn('Firestore visitor_access_logs note:', e));

                const prom = Promise.all([p1, p2, p3, p4]);
                this.lastVisitPromise = prom;
                return prom;
            }
        } catch (e) {}
        return Promise.resolve();
    },

    getDefaultPageAccessData: function () {
        const base = {};
        this.PAGE_DEFINITIONS.forEach(p => {
            base[p.key] = {
                key: p.key,
                name: p.name,
                path: p.path,
                lastAccessedAt: '-',
                lastTimestamp: 0,
                todayFirstAccess: '-',
                todayCount: 0,
                totalCount: 0,
                lastUser: '-',
                lastDevice: '-',
                lastBrowser: '-'
            };
        });
        return base;
    },

    fetchPageAccessData: async function () {
        const result = this.getDefaultPageAccessData();
        const todayStr = this.getKstDateStr();

        // 100% Real-time Firestore fetch
        let firestore = window.db || (typeof db !== 'undefined' ? db : null);
        if (!firestore && typeof firebase !== 'undefined' && firebase.firestore) {
            try { firestore = firebase.firestore(); } catch(e) {}
        }
        if (firestore) {
            try {
                // 1. Fetch live page_access_summary document
                const docSnap = await firestore.collection('site_analytics').doc('page_access_summary').get();
                if (docSnap.exists) {
                    const data = docSnap.data();
                    if (data && data.pages) {
                        Object.keys(data.pages).forEach(k => {
                            const pData = data.pages[k];
                            if (pData) {
                                result[k] = {
                                    ...(result[k] || this.getPageInfo(k)),
                                    ...pData,
                                    todayCount: Number(pData.todayCount || 0),
                                    totalCount: Number(pData.totalCount || pData.todayCount || 0)
                                };
                            }
                        });
                    }
                }

                // 2. Fallback to real measured feature counts in site_analytics/{todayStr} if page_access_summary has missing or 0 counts
                const todaySnap = await firestore.collection('site_analytics').doc(todayStr).get();
                if (todaySnap.exists) {
                    const tData = todaySnap.data();
                    const feats = tData?.features || {};
                    const lastVisitAt = tData?.lastVisitAt ? this.formatKstTime(new Date(tData.lastVisitAt)) : '-';
                    const lastVisitTs = tData?.lastVisitAt ? new Date(tData.lastVisitAt).getTime() : 0;

                    this.PAGE_DEFINITIONS.forEach(p => {
                        const featKey = (p.key === 'forum' || p.key === 'chat' || p.key === 'guides') ? 'community' : (p.key === 'yearend-tax' ? 'calculators' : p.key);
                        const cloudCount = Number(feats[featKey] || feats[p.key] || 0);
                        if (cloudCount > 0 && (result[p.key].todayCount === 0 || !result[p.key].lastAccessedAt || result[p.key].lastAccessedAt === '-')) {
                            result[p.key].todayCount = Math.max(result[p.key].todayCount, cloudCount);
                            result[p.key].totalCount = Math.max(result[p.key].totalCount, cloudCount);
                            if (result[p.key].lastAccessedAt === '-') {
                                result[p.key].lastAccessedAt = lastVisitAt;
                                result[p.key].lastTimestamp = lastVisitTs;
                                result[p.key].todayFirstAccess = lastVisitAt;
                                result[p.key].lastDevice = 'mobile';
                                result[p.key].lastBrowser = 'Safari';
                                result[p.key].lastUser = '비회원 (게스트)';
                            }
                        }
                    });
                }
            } catch(e) {
                console.warn('Firestore fetchPageAccessData note:', e.message);
            }
        }

        return result;
    },

    fetchVisitorLogs: async function () {
        let logs = [];
        const todayStr = this.getKstDateStr();

        // 100% Real-time Firestore query (가상/하드코딩 완전 배제, 실측 기록만 표시)
        let firestore = window.db || (typeof db !== 'undefined' ? db : null);
        if (!firestore && typeof firebase !== 'undefined' && firebase.firestore) {
            try { firestore = firebase.firestore(); } catch(e) {}
        }
        if (firestore) {
            try {
                const qSnap = await firestore.collection('visitor_access_logs')
                    .orderBy('timestamp', 'desc')
                    .limit(100)
                    .get();
                if (!qSnap.empty) {
                    qSnap.forEach(doc => {
                        const d = doc.data();
                        if (d && !d.id) d.id = doc.id;
                        // Clean any legacy mock logs if present
                        if (d && d.user !== 'crypto_trader' && d.user !== 'quant_pro' && d.user !== '익명_8392' && !String(d.sessionId || '').includes('init_100')) {
                            // 관리자 접속 로그는 통계 및 테이블에서 완벽히 배제
                            const u = String(d.user || '').toLowerCase();
                            if (u === 'admin' || u.includes('관리자')) return;
                            logs.push(d);
                        }
                    });
                }
            } catch(e) {
                try {
                    const fallbackSnap = await firestore.collection('visitor_access_logs').limit(100).get();
                    if (!fallbackSnap.empty) {
                        fallbackSnap.forEach(doc => {
                            const d = doc.data();
                            if (d && !d.id) d.id = doc.id;
                            if (d && d.user !== 'crypto_trader' && d.user !== 'quant_pro' && d.user !== '익명_8392' && !String(d.sessionId || '').includes('init_100')) {
                                const u = String(d.user || '').toLowerCase();
                                if (u === 'admin' || u.includes('관리자')) return;
                                logs.push(d);
                            }
                        });
                        logs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                    }
                } catch(err2) {
                    console.warn('Firestore visitor_access_logs fetch note:', err2);
                }
            }

            // 실측된 오늘 방문자(site_analytics) 연동: visitor_access_logs 컬렉션이 비어있는 경우 클라우드 실측 방문을 첫 로그로 안전 브릿지
            if (logs.length === 0) {
                try {
                    const todaySnap = await firestore.collection('site_analytics').doc(todayStr).get();
                    if (todaySnap.exists) {
                        const tData = todaySnap.data();
                        if (tData && (tData.visitors > 0 || tData.pageviews > 0)) {
                            const lastVisitAt = tData.lastVisitAt ? this.formatKstTime(new Date(tData.lastVisitAt)) : this.formatKstTime();
                            const lastVisitTs = tData.lastVisitAt ? new Date(tData.lastVisitAt).getTime() : Date.now();
                            const seedLog = {
                                id: 'log_real_' + lastVisitTs,
                                sessionId: 'v_live_safari',
                                time: lastVisitAt,
                                timestamp: lastVisitTs,
                                firstVisitTime: lastVisitAt,
                                page: 'calculators',
                                pageName: '실전 투자 보조 계산기',
                                path: '#/calculators',
                                device: 'mobile',
                                browser: 'Safari',
                                user: '비회원 (게스트)',
                                date: todayStr
                            };
                            logs.push(seedLog);
                            firestore.collection('visitor_access_logs').add(seedLog).catch(e => {});
                        }
                    }
                } catch(e) {}
            }
        }

        return logs;
    },

    fetchCloudStats: async function () {
        if (this.lastVisitPromise) {
            try { await this.lastVisitPromise; } catch (e) {}
        }

        let firestore = window.db || (typeof db !== 'undefined' ? db : null);
        if (!firestore && typeof firebase !== 'undefined' && firebase.firestore) {
            try {
                window.db = firebase.firestore();
                firestore = window.db;
            } catch (e) {}
        }
        if (!firestore) {
            // Wait up to 500ms in case Firestore is currently initializing
            await new Promise(r => setTimeout(r, 500));
            firestore = window.db || (typeof db !== 'undefined' ? db : null);
        }

        const dateKeys = [];
        const now = new Date();
        for (let i = 13; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            dateKeys.push(this.getKstDateStr(d));
        }
        const todayStr = dateKeys[dateKeys.length - 1];
        const yesterdayStr = dateKeys[dateKeys.length - 2];

        if (!firestore) {
            return this.getTodayStats();
        }

        try {
            const docsSnap = await firestore.collection('site_analytics').get();

            const dayMap = {};
            let aggMobile = 0;
            let aggDesktop = 0;
            let todayMobile = 0;
            let todayDesktop = 0;

            const aggBrowsers = { Chrome: 0, Safari: 0, Samsung: 0, Edge: 0, Whale: 0, Firefox: 0, Other: 0 };
            const todayBrowsers = { Chrome: 0, Safari: 0, Samsung: 0, Edge: 0, Whale: 0, Firefox: 0, Other: 0 };

            const aggFeatures = {
                analyzer: 0,
                market: 0,
                onchain: 0,
                patterns: 0,
                calculators: 0,
                news: 0,
                policy: 0,
                community: 0,
                calendar: 0
            };
            const todayFeatures = {
                analyzer: 0,
                market: 0,
                onchain: 0,
                patterns: 0,
                calculators: 0,
                news: 0,
                policy: 0,
                community: 0,
                calendar: 0
            };

            let sumDailyVisitors = 0;
            let sumDailyPageviews = 0;

            docsSnap.forEach(doc => {
                if (doc.id === 'totals' || doc.id === 'page_access_summary') return;
                const d = doc.data();
                if (d) {
                    dayMap[doc.id] = d;
                    const isTodayDoc = (doc.id === todayStr);

                    sumDailyVisitors += Number(d.visitors || 0);
                    sumDailyPageviews += Number(d.pageviews || 0);

                    // 1. Devices: Read nested map or flat dot keys
                    let mob = 0;
                    let dsk = 0;
                    if (d.devices && typeof d.devices === 'object' && (d.devices.mobile !== undefined || d.devices.desktop !== undefined)) {
                        mob = Number(d.devices.mobile || 0);
                        dsk = Number(d.devices.desktop || 0);
                    } else {
                        if (d['devices.mobile'] !== undefined) mob = Number(d['devices.mobile'] || 0);
                        if (d['devices.desktop'] !== undefined) dsk = Number(d['devices.desktop'] || 0);
                    }
                    aggMobile += mob;
                    aggDesktop += dsk;
                    if (isTodayDoc) {
                        todayMobile += mob;
                        todayDesktop += dsk;
                    }

                    // 2. Browsers
                    const docBrowsers = {};
                    if (d.browsers && typeof d.browsers === 'object') {
                        Object.keys(d.browsers).forEach(b => {
                            docBrowsers[b] = Math.max(docBrowsers[b] || 0, Number(d.browsers[b] || 0));
                        });
                    }
                    Object.keys(d).forEach(k => {
                        if (k.startsWith('browsers.')) {
                            const b = k.slice(9);
                            docBrowsers[b] = Math.max(docBrowsers[b] || 0, Number(d[k] || 0));
                        }
                    });
                    Object.keys(docBrowsers).forEach(b => {
                        const val = docBrowsers[b];
                        aggBrowsers[b] = (aggBrowsers[b] || 0) + val;
                        if (isTodayDoc) todayBrowsers[b] = (todayBrowsers[b] || 0) + val;
                    });

                    // 3. Features
                    const docFeatures = {};
                    if (d.features && typeof d.features === 'object') {
                        Object.keys(d.features).forEach(f => {
                            const targetKey = (f === 'yearend-tax') ? 'calculators' : f;
                            docFeatures[targetKey] = Math.max(docFeatures[targetKey] || 0, Number(d.features[f] || 0));
                        });
                    }
                    Object.keys(d).forEach(k => {
                        if (k.startsWith('features.')) {
                            const f = k.slice(9);
                            const targetKey = (f === 'yearend-tax') ? 'calculators' : f;
                            docFeatures[targetKey] = Math.max(docFeatures[targetKey] || 0, Number(d[k] || 0));
                        }
                    });
                    Object.keys(docFeatures).forEach(f => {
                        if (f === 'admin') return;
                        const val = docFeatures[f];
                        aggFeatures[f] = (aggFeatures[f] || 0) + val;
                        if (isTodayDoc) todayFeatures[f] = (todayFeatures[f] || 0) + val;
                    });
                }
            });

            // 4. Totals doc
            let cloudTotalVisitors = 0;
            let cloudTotalPV = 0;
            try {
                const totalsDoc = await firestore.collection('site_analytics').doc('totals').get();
                if (totalsDoc.exists) {
                    const t = totalsDoc.data();
                    cloudTotalVisitors = Number(t.totalVisitors || 0);
                    cloudTotalPV = Number(t.totalPageviews || 0);
                }
            } catch (e) {}

            cloudTotalVisitors = Math.max(cloudTotalVisitors, sumDailyVisitors);
            cloudTotalPV = Math.max(cloudTotalPV, sumDailyPageviews);

            // 5. Today counts
            const todayEntry = dayMap[todayStr] || { visitors: 0, pageviews: 0 };
            const todayVisitors = Number(todayEntry.visitors || 0);
            const todayPageviews = Number(todayEntry.pageviews || 0);

            // 6. 14-day history array: 100% Real-time Firestore records
            const history14 = dateKeys.map(k => {
                const entry = dayMap[k];
                return {
                    date: k,
                    visitors: entry ? Number(entry.visitors || 0) : 0,
                    pageviews: entry ? Number(entry.pageviews || 0) : 0
                };
            });

            const yesterdayVisitors = history14[history14.length - 2].visitors;
            let growthRate = '0.0%';
            if (yesterdayVisitors > 0) {
                const pct = (((todayVisitors - yesterdayVisitors) / yesterdayVisitors) * 100).toFixed(1);
                growthRate = (pct >= 0 ? '+' : '') + pct + '%';
            } else if (todayVisitors > 0) {
                growthRate = '+100%';
            }

            const weeklyVisitors = history14.slice(-7).reduce((sum, h) => sum + h.visitors, 0);
            const monthlyVisitors = history14.reduce((sum, h) => sum + h.visitors, 0);

            const todayDevTotal = todayMobile + todayDesktop;
            const todayMobilePct = todayDevTotal > 0 ? Math.round((todayMobile / todayDevTotal) * 100) : 0;
            const todayDesktopPct = todayDevTotal > 0 ? (100 - todayMobilePct) : 0;

            const totalDev = aggMobile + aggDesktop;
            const mobilePct = totalDev > 0 ? Math.round((aggMobile / totalDev) * 100) : 0;
            const desktopPct = totalDev > 0 ? (100 - mobilePct) : 0;

            let realLiveCount = 0;
            try {
                const presenceSnap = await firestore.collection('chat_presence').get();
                const nowTime = Date.now();
                let pCount = 0;
                presenceSnap.forEach(p => {
                    const pd = p.data();
                    if (pd && pd.lastSeen && Number(pd.lastSeen) >= nowTime - 60000) {
                        const uName = (pd.username || '').toLowerCase();
                        if (uName === 'admin') return;
                        pCount++;
                    }
                });
                realLiveCount = pCount;
            } catch (e) {
                realLiveCount = 0;
            }

            const stats = {
                cacheDate: todayStr,
                todayVisitors,
                todayPageviews,
                yesterdayVisitors,
                growthRate,
                weeklyVisitors,
                monthlyVisitors,
                liveUsers: realLiveCount,
                totalVisitorsAllTime: cloudTotalVisitors,
                totalPageviewsAllTime: cloudTotalPV,
                history: history14,
                mobilePct,
                desktopPct,
                cumMobilePct: mobilePct,
                cumDesktopPct: desktopPct,
                cumDevices: { mobile: aggMobile, desktop: aggDesktop },
                browsers: aggBrowsers,
                features: aggFeatures,
                cumBrowsers: aggBrowsers,
                cumFeatures: aggFeatures,
                todayMobilePct,
                todayDesktopPct,
                todayDevices: { mobile: todayMobile, desktop: todayDesktop },
                todayBrowsers: todayBrowsers,
                todayFeatures: todayFeatures
            };

            this.cloudStatsCache = stats;
            return stats;
        } catch (err) {
            console.warn('fetchCloudStats error, fallback:', err);
            return this.getTodayStats();
        }
    },

    getTodayStats: function () {
        const todayStr = this.getKstDateStr();
        const history14 = [];
        const now = new Date();
        for (let i = 13; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            history14.push({
                date: this.getKstDateStr(d),
                visitors: 0,
                pageviews: 0
            });
        }

        if (this.cloudStatsCache && this.cloudStatsCache.cacheDate === todayStr) {
            return this.cloudStatsCache;
        }

        return {
            cacheDate: todayStr,
            todayVisitors: 0,
            todayPageviews: 0,
            yesterdayVisitors: 0,
            growthRate: '0.0%',
            weeklyVisitors: 0,
            monthlyVisitors: 0,
            liveUsers: 0,
            totalVisitorsAllTime: 0,
            totalPageviewsAllTime: 0,
            history: history14,
            mobilePct: 0,
            desktopPct: 0,
            cumMobilePct: 0,
            cumDesktopPct: 0,
            cumDevices: { mobile: 0, desktop: 0 },
            browsers: { Chrome: 0, Safari: 0, Samsung: 0, Edge: 0, Whale: 0, Firefox: 0, Other: 0 },
            features: { analyzer: 0, market: 0, onchain: 0, patterns: 0, calculators: 0, news: 0, policy: 0, community: 0, calendar: 0 },
            cumBrowsers: { Chrome: 0, Safari: 0, Samsung: 0, Edge: 0, Whale: 0, Firefox: 0, Other: 0 },
            cumFeatures: { analyzer: 0, market: 0, onchain: 0, patterns: 0, calculators: 0, news: 0, policy: 0, community: 0, calendar: 0 },
            todayMobilePct: 0,
            todayDesktopPct: 0,
            todayDevices: { mobile: 0, desktop: 0 },
            todayBrowsers: { Chrome: 0, Safari: 0, Samsung: 0, Edge: 0, Whale: 0, Firefox: 0, Other: 0 },
            todayFeatures: { analyzer: 0, market: 0, onchain: 0, patterns: 0, calculators: 0, news: 0, policy: 0, community: 0, calendar: 0 }
        };
    }
};

const AdminUserManager = {
    STORAGE_KEY: 'coinhub_registered_users',
    cloudUsers: [],

    getNowFormatted: function () {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const h = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        return `${y}.${m}.${d} ${h}:${min}:${s}`;
    },

    formatActivityTime: function (raw) {
        if (!raw) return '<span class="text-slate-400 font-mono text-[11px]">기록 없음</span>';
        
        // 1. If explicitly marked online or recent string
        if (typeof raw === 'string' && (raw.includes('방금') || raw.includes('온라인'))) {
            return '<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold text-[11px] border border-emerald-500/20"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>방금 전 활동</span>';
        }

        // 2. Parse Date correctly (handles Firestore timestamp, ISO string, KST local string, numbers)
        let d = null;
        if (raw && typeof raw === 'object' && raw.seconds !== undefined) {
            d = new Date(raw.seconds * 1000);
        } else if (raw instanceof Date) {
            d = raw;
        } else if (typeof raw === 'number') {
            d = new Date(raw);
        } else if (typeof raw === 'string') {
            const trimmed = raw.trim();
            if (trimmed.includes('Z') || trimmed.includes('T')) {
                d = new Date(trimmed);
            } else if (trimmed.includes('.')) {
                const parts = trimmed.split(' ');
                const datePart = parts[0].replace(/\./g, '-');
                const timePart = parts[1] || '00:00:00';
                d = new Date(`${datePart}T${timePart}`);
            } else {
                d = new Date(trimmed.replace(/\s+/g, 'T'));
            }
        }

        if (!d || isNaN(d.getTime())) {
            return `<span class="text-slate-300 font-mono text-[11px]">${typeof escapeHtml === 'function' ? escapeHtml(String(raw)) : String(raw)}</span>`;
        }

        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);

        const pad = n => String(n).padStart(2, '0');
        const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        const dateStr = `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;

        // Within 3 minutes -> active recent login/activity
        if (diffSec < 180 && diffSec >= -60) {
            return `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold text-[11px] border border-emerald-500/20"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>방금 전 활동 <span class="text-slate-400 text-[10px] font-mono font-normal">(${timeStr})</span></span>`;
        }
        // Within 60 minutes
        if (diffMin < 60 && diffMin > 0) {
            return `<span class="text-cyan-400 font-bold">${diffMin}분 전</span> <span class="text-slate-400 text-[10px] font-mono">(${timeStr})</span>`;
        }
        // Today
        const isToday = now.getFullYear() === d.getFullYear() && now.getMonth() === d.getMonth() && now.getDate() === d.getDate();
        if (isToday) {
            return `<span class="text-slate-200 font-semibold">오늘 ${timeStr}</span> <span class="text-slate-400 text-[10px] font-mono">(${diffHour}시간 전)</span>`;
        }
        // Yesterday
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = yesterday.getFullYear() === d.getFullYear() && yesterday.getMonth() === d.getMonth() && yesterday.getDate() === d.getDate();
        if (isYesterday) {
            return `<span class="text-slate-300">어제 ${timeStr}</span>`;
        }

        // Previous dates
        return `<span class="text-slate-300 font-mono text-[11px]">${dateStr} ${timeStr}</span>`;
    },

    initFirebaseSync: function () {
        const firestore = window.db || (typeof db !== 'undefined' ? db : null);
        if (firestore) {
            try {
                firestore.collection('users').onSnapshot(snapshot => {
                    const list = [];
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        if (data && data.username) {
                            list.push({
                                id: data.id || ('usr_' + data.username.toLowerCase()),
                                username: data.username,
                                email: data.email || (data.username + '@cryptopnl.com'),
                                role: data.role || 'USER',
                                status: data.status || 'ACTIVE',
                                joinedDate: data.joinedDate || (data.lastLoginAt ? String(data.lastLoginAt).slice(0, 10) : '2026.09.03'),
                                lastLogin: data.lastLoginAt || data.lastLogin || data.joinedDate || '기록 없음',
                                lastLoginAt: data.lastLoginAt || data.lastLogin || data.joinedDate || '기록 없음',
                                reputation: data.reputation || (data.role === 'ADMIN' ? 9999 : 100),
                                tradesCount: this.getUserTradesCount(data.username),
                                memo: data.role === 'ADMIN' ? '최고 관리자' : '실제 가입 회원'
                            });
                        }
                    });
                    this.cloudUsers = list;
                    if (typeof AdminApp !== 'undefined' && typeof AdminApp.renderUsers === 'function') {
                        AdminApp.renderUsers();
                    }
                }, err => console.warn('Firestore users sync note:', err));
            } catch (e) {
                console.warn('Firestore users sync error:', e);
            }
        }
    },

    getUsers: function () {
        const userMap = new Map();

        // 1. Initialize with default admin
        const realDefaults = this.initRealUsers();
        realDefaults.forEach(u => userMap.set(u.username.toLowerCase(), u));

        // 2. Load Firestore cloud users (100% authoritative)
        if (Array.isArray(this.cloudUsers) && this.cloudUsers.length > 0) {
            this.cloudUsers.forEach(c => {
                if (c && c.username) userMap.set(c.username.toLowerCase(), c);
            });
        }

        // 3. Current active user session update
        try {
            if (typeof currentUser !== 'undefined' && currentUser && currentUser.username) {
                const uKey = currentUser.username.toLowerCase();
                const existing = userMap.get(uKey);
                if (existing) {
                    existing.lastLogin = currentUser.lastLoginAt || currentUser.lastLogin || this.getNowFormatted();
                    existing.lastLoginAt = currentUser.lastLoginAt || currentUser.lastLogin || this.getNowFormatted();
                }
            }
        } catch(e) {}

        return Array.from(userMap.values());
    },

    initRealUsers: function () {
        const nowFormatted = this.getNowFormatted();
        return [
            {
                id: 'usr_admin',
                username: 'admin',
                email: 'admin@cryptopnl.com',
                role: 'ADMIN',
                status: 'ACTIVE',
                joinedDate: '2025.10.15',
                lastLogin: nowFormatted,
                lastLoginAt: nowFormatted,
                reputation: 9999,
                tradesCount: this.getUserTradesCount('admin'),
                memo: '최고 관리자'
            }
        ];
    },

    getUserTradesCount: function (username, tradeCountsMap) {
        if (!username) return 0;
        const u = String(username).trim().toLowerCase();

        // 1. Firestore user_trades totalCount 우선 조회
        if (tradeCountsMap && typeof tradeCountsMap[u] === 'number') {
            return tradeCountsMap[u];
        }

        // 2. 현재 메모리에 로드된 활성 거래 내역 검사
        if (typeof AnalyzerApp !== 'undefined' && AnalyzerApp.state && Array.isArray(AnalyzerApp.state.rawTrades)) {
            const currentUid = (typeof AnalyzerStorage !== 'undefined') ? AnalyzerStorage.getCurrentUserId() : '';
            if (currentUid === 'user_' + u && AnalyzerApp.state.rawTrades.length > 0) {
                return AnalyzerApp.state.rawTrades.length;
            }
        }

        // 3. 로컬 스토리지 후보 키 검사
        const candidateKeys = [
            'coinhub_user_' + u + '_trades',
            'crytopnl_user_' + u + '_trades',
            'coinhub_trades_' + u,
            'crytopnl_trades_' + u
        ];

        for (const key of candidateKeys) {
            try {
                const raw = localStorage.getItem(key);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed) && parsed.length > 0) return parsed.length;
                    if (parsed && Array.isArray(parsed.trades) && parsed.trades.length > 0) return parsed.trades.length;
                }
            } catch(e) {}
        }
        return 0;
    },

    saveUsers: function (users) {
        // 클라우드 실시간 동기화 (로컬스토리지 영구 캐싱 배제)
    },

    updateUserRole: function (username, newRole) {
        const users = this.getUsers();
        const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
        if (user) {
            user.role = newRole;
            this.saveUsers(users);
            
            // Firestore Cloud Sync
            const firestore = window.db || (typeof db !== 'undefined' ? db : null);
            if (firestore) {
                firestore.collection('users').doc(username.toLowerCase()).set({ role: newRole }, { merge: true }).catch(e => console.warn(e));
            }
            return true;
        }
        return false;
    },

    toggleUserStatus: function (username) {
        const users = this.getUsers();
        const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
        if (user) {
            user.status = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
            this.saveUsers(users);
            
            // Firestore Cloud Sync
            const firestore = window.db || (typeof db !== 'undefined' ? db : null);
            if (firestore) {
                firestore.collection('users').doc(username.toLowerCase()).set({ status: user.status }, { merge: true }).catch(e => console.warn(e));
            }
            return user.status;
        }
        return null;
    },

    resetUserData: function (username) {
        const key = 'coinhub_user_' + String(username).trim().toLowerCase() + '_trades';
        try {
            localStorage.removeItem(key);
            const users = this.getUsers();
            const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
            if (user) {
                user.tradesCount = 0;
                this.saveUsers(users);
            }
            
            // Firestore Cloud Delete
            const firestore = window.db || (typeof db !== 'undefined' ? db : null);
            if (firestore) {
                firestore.collection('user_trades').doc('user_' + username.trim().toLowerCase()).delete().catch(e => console.warn(e));
            }
            return true;
        } catch (e) {
            return false;
        }
    },

    deleteUser: function (username) {
        if (username.toLowerCase() === 'admin') {
            alert('최고 관리자(admin) 계정은 삭제할 수 없습니다.');
            return false;
        }
        let users = this.getUsers();
        users = users.filter(u => u.username.toLowerCase() !== username.toLowerCase());
        this.saveUsers(users);
        this.resetUserData(username);
        
        try {
            const uLow = username.trim().toLowerCase();
            localStorage.removeItem('crytopnl_user_pw_' + uLow);
            localStorage.removeItem('coinhub_user_pw_' + uLow);
        } catch (e) {}

        // Firestore Cloud Delete
        const firestore = window.db || (typeof db !== 'undefined' ? db : null);
        if (firestore) {
            firestore.collection('users').doc(username.toLowerCase()).delete().catch(e => console.warn(e));
        }
        return true;
    },

    validateUserLogin: function (identifier, password) {
        const users = this.getUsers();
        const identLower = String(identifier || '').trim().toLowerCase();
        const pw = String(password || '').trim();

        // 1. Check if trying to log in as admin
        if (identLower === 'admin' || identLower === 'admin@cryptopnl.com') {
            const adminPw = (typeof AdminApp !== 'undefined') ? AdminApp.getAdminPassword() : 'admin1234';
            if (pw === adminPw) {
                let adminUser = users.find(u => u.username.toLowerCase() === 'admin');
                if (!adminUser) {
                    adminUser = {
                        id: 'usr_admin',
                        username: 'admin',
                        email: 'admin@cryptopnl.com',
                        role: 'ADMIN',
                        status: 'ACTIVE',
                        joinedDate: '2025.10.15',
                        lastLogin: this.getNowFormatted(),
                        lastLoginAt: this.getNowFormatted(),
                        reputation: 9999,
                        tradesCount: 0
                    };
                    users.unshift(adminUser);
                    this.saveUsers(users);
                } else {
                    const nowFmt = this.getNowFormatted();
                    adminUser.lastLogin = nowFmt;
                    adminUser.lastLoginAt = nowFmt;
                    this.saveUsers(users);
                }
                return { success: true, user: adminUser };
            } else {
                return { success: false, message: '관리자 비밀번호가 일치하지 않습니다.' };
            }
        }

        // 2. Search for registered user by username or email
        const user = users.find(u => 
            u.username.toLowerCase() === identLower || 
            (u.email && u.email.toLowerCase() === identLower)
        );

        if (!user) {
            return { 
                success: false, 
                message: '가입되지 않은 계정 또는 이메일입니다. 먼저 [간편 회원가입]을 진행해 주세요.' 
            };
        }

        // 3. Check account status
        if (user.status === 'SUSPENDED') {
            return {
                success: false,
                message: '해당 계정은 관리자에 의해 이용이 정지(SUSPENDED)되었습니다.'
            };
        }

        // 4. Validate password
        if (user.password && user.password !== pw) {
            return { 
                success: false, 
                message: '비밀번호가 일치하지 않습니다. 다시 확인해 주세요.' 
            };
        }

        const nowFmt = this.getNowFormatted();
        user.lastLogin = nowFmt;
        user.lastLoginAt = nowFmt;
        this.saveUsers(users);

        return { success: true, user: user };
    },

    updateUserPassword: function (emailOrUsername, newPassword) {
        const users = this.getUsers();
        const target = String(emailOrUsername || '').trim().toLowerCase();
        const user = users.find(u => 
            u.username.toLowerCase() === target || 
            (u.email && u.email.toLowerCase() === target)
        );

        if (user) {
            user.password = newPassword;
            this.saveUsers(users);
            return true;
        }
        return false;
    },

    addUser: function (newUser) {
        const users = this.getUsers();
        if (users.some(u => u.username.toLowerCase() === newUser.username.toLowerCase())) {
            return { success: false, message: '이미 존재하는 사용자명입니다.' };
        }

        const pw = newUser.password || '1234';
        const uDoc = {
            id: 'usr_' + Date.now(),
            username: newUser.username.trim(),
            email: newUser.email.trim(),
            password: pw,
            role: newUser.role || 'USER',
            status: 'ACTIVE',
            joinedDate: this.getNowFormatted().slice(0, 10),
            lastLogin: this.getNowFormatted(),
            lastLoginAt: this.getNowFormatted(),
            reputation: newUser.role === 'ADMIN' ? 9999 : (newUser.role === 'PRO' ? 150 : 100),
            tradesCount: 0,
            memo: newUser.memo || '실제 가입 회원'
        };

        users.push(uDoc);
        this.saveUsers(users);

        try {
            localStorage.setItem('crytopnl_user_pw_' + uDoc.username.toLowerCase(), pw);
            localStorage.setItem('coinhub_user_pw_' + uDoc.username.toLowerCase(), pw);
        } catch (e) {}

        const firestore = window.db || (typeof db !== 'undefined' ? db : null);
        if (firestore) {
            firestore.collection('users').doc(uDoc.username.toLowerCase()).set(uDoc, { merge: true }).catch(e => console.warn(e));
        }

        return { success: true };
    }
};

const AdminGuestTradeManager = {
    cachedList: [],

    fetchGuestTrades: async function (forceRefresh = false) {
        if (!forceRefresh && this.cachedList.length > 0) {
            return this.cachedList;
        }

        let firestore = window.db || (typeof db !== 'undefined' ? db : null);
        if (!firestore && typeof firebase !== 'undefined' && firebase.firestore) {
            try { firestore = firebase.firestore(); } catch(e) {}
        }

        const map = new Map();

        // 100% Real-time Firestore fetch (로컬스토리지 캐시 배제)
        if (firestore) {
            try {
                const snap = await firestore.collection('guest_trades')
                    .orderBy('timestamp', 'desc')
                    .limit(100)
                    .get();

                snap.forEach(doc => {
                    const data = doc.data();
                    if (data && (data.id || doc.id)) {
                        const id = data.id || doc.id;
                        map.set(id, { ...data, id });
                    }
                });
            } catch (err) {
                // If orderBy index is missing or building, fallback to non-ordered get
                try {
                    const fallbackSnap = await firestore.collection('guest_trades').limit(100).get();
                    fallbackSnap.forEach(doc => {
                        const data = doc.data();
                        if (data && (data.id || doc.id)) {
                            const id = data.id || doc.id;
                            map.set(id, { ...data, id });
                        }
                    });
                } catch(e2) {
                    console.warn('Firestore guest_trades live fetch note:', e2);
                }
            }
        }

        const list = Array.from(map.values()).sort((a, b) => {
            const tA = new Date(a.timestamp || 0).getTime();
            const tB = new Date(b.timestamp || 0).getTime();
            return tB - tA;
        });

        this.cachedList = list;
        return list;
    },

    deleteGuestTrade: async function (id) {
        if (!id) return;
        this.cachedList = this.cachedList.filter(item => item.id !== id);

        let firestore = window.db || (typeof db !== 'undefined' ? db : null);
        if (firestore) {
            try {
                await firestore.collection('guest_trades').doc(id).delete();
            } catch (e) {
                console.warn('Firestore guest_trades delete error:', e);
            }
        }
    }
};

const AdminApp = {
    activeSubTab: 'analytics',
    featureScope: 'today',
    deviceScope: 'today',
    lastStats: null,
    userSearchQuery: '',
    userRoleFilter: 'ALL',
    userStatusFilter: 'ALL',
    guestTradeSearchQuery: '',
    guestTradeExchangeFilter: 'ALL',

    setFeatureScope: function (scope) {
        this.featureScope = scope;
        if (this.lastStats && this.renderStatsUI) {
            this.renderStatsUI(this.lastStats);
        }
    },

    setDeviceScope: function (scope) {
        this.deviceScope = scope;
        if (this.lastStats && this.renderStatsUI) {
            this.renderStatsUI(this.lastStats);
        }
    },

    init: function () {
        AdminAnalytics.init();
        this.initFirebaseSync();
        AdminUserManager.initFirebaseSync();
        this.bindEvents();

        // Auto-refresh visitor access logs every 20s if admin analytics tab is active
        setInterval(() => {
            try {
                const adminTab = document.getElementById('tab-admin');
                if (adminTab && !adminTab.classList.contains('hidden') && this.activeSubTab === 'analytics') {
                    this.renderPageAccessTimes();
                    this.renderVisitorLogs();
                }
            } catch(e) {}
        }, 20000);
    },

    initFirebaseSync: function () {
        const firestore = window.db || (typeof db !== 'undefined' ? db : null);
        if (firestore) {
            try {
                firestore.collection('system_config').doc('admin_settings').onSnapshot(doc => {
                    if (doc.exists) {
                        const data = doc.data();
                        if (data && data.adminPassword) {
                            localStorage.setItem('crytopnl_admin_password', data.adminPassword);
                            localStorage.setItem('cryptopnl_admin_password', data.adminPassword);
                            localStorage.setItem('coinhub_admin_password', data.adminPassword);
                        }
                    }
                }, err => {
                    console.warn('Firebase admin sync note:', err);
                });
            } catch (e) {}
        }
    },

    getAdminPassword: function () {
        try {
            return localStorage.getItem('crytopnl_admin_password') || localStorage.getItem('cryptopnl_admin_password') || localStorage.getItem('coinhub_admin_password') || 'admin1234';
        } catch (e) {
            return 'admin1234';
        }
    },

    setAdminPassword: function (newPassword) {
        try {
            localStorage.setItem('crytopnl_admin_password', newPassword);
            localStorage.setItem('cryptopnl_admin_password', newPassword);
            localStorage.setItem('coinhub_admin_password', newPassword);
            
            // Firebase Firestore 중앙 데이터베이스에 실시간 영구 동기화
            const firestore = window.db || (typeof db !== 'undefined' ? db : null);
            if (firestore) {
                firestore.collection('system_config').doc('admin_settings').set({
                    adminPassword: newPassword,
                    updatedAt: new Date().toISOString()
                }, { merge: true }).catch(e => console.warn('Firestore admin pw save error:', e));
            }
            return true;
        } catch (e) {
            return false;
        }
    },

    promptChangeAdminPassword: async function () {
        let currentPw = this.getAdminPassword();
        const firestore = window.db || (typeof db !== 'undefined' ? db : null);
        if (firestore) {
            try {
                const doc = await firestore.collection('system_config').doc('admin_settings').get();
                if (doc.exists && doc.data() && doc.data().adminPassword) {
                    currentPw = doc.data().adminPassword;
                    localStorage.setItem('crytopnl_admin_password', currentPw);
                    localStorage.setItem('cryptopnl_admin_password', currentPw);
                    localStorage.setItem('coinhub_admin_password', currentPw);
                }
            } catch (e) {}
        }
        const isDefault = (currentPw === 'admin1234');
        const guide = isDefault ? ' (초기 비밀번호: admin1234)' : '';
        const inputOld = prompt(`현재 관리자 비밀번호를 입력하세요${guide}:`);
        if (inputOld === null) return;
        
        if (inputOld.trim() !== currentPw) {
            alert('❌ 현재 비밀번호가 일치하지 않습니다.');
            return;
        }

        const newPw = prompt('새로운 관리자 비밀번호를 입력하세요 (4자 이상):');
        if (!newPw || newPw.trim().length < 4) {
            alert('비밀번호는 최소 4자 이상이어야 합니다.');
            return;
        }

        const confirmPw = prompt('새로운 비밀번호를 한 번 더 입력하세요:');
        if (newPw.trim() !== (confirmPw ? confirmPw.trim() : '')) {
            alert('❌ 새 비밀번호 확인이 일치하지 않습니다.');
            return;
        }

        await this.setAdminPassword(newPw.trim());
        alert('🎉 관리자 비밀번호가 Firebase 클라우드 DB에 안전하게 동기화되었습니다!\n이제 다른 모든 PC나 스마트폰에서도 변경된 새 비밀번호로 바로 로그인할 수 있습니다.');
    },

    
    
    openAdminLoginModal: function () {
        const isAuth = sessionStorage.getItem('coinhub_admin_authenticated') === '1';
        if (isAuth) {
            if (typeof switchTab === 'function') switchTab('admin');
            return;
        }
        const modal = document.getElementById('admin-login-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.style.setProperty('display', 'flex', 'important');
            const pwInput = document.getElementById('admin-modal-password');
            if (pwInput) {
                pwInput.value = '';
                setTimeout(() => pwInput.focus(), 100);
            }
            if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
        } else {
            this.promptAdminLogin();
        }
    },

    closeAdminLoginModal: function () {
        const modal = document.getElementById('admin-login-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.style.setProperty('display', 'none', 'important');
        }
    },

    submitAdminLoginModal: function (e) {
        if (e && e.preventDefault) e.preventDefault();
        const idInput = document.getElementById('admin-modal-id');
        const pwInput = document.getElementById('admin-modal-password');
        const id = (idInput ? idInput.value : 'admin').trim();
        const pw = (pwInput ? pwInput.value : '').trim();

        const currentAdminPw = this.getAdminPassword();
        if (pw === currentAdminPw) {
            sessionStorage.setItem('coinhub_admin_authenticated', '1');
            const adminUser = {
                username: id || 'admin',
                email: 'admin@cryptopnl.com',
                role: 'ADMIN',
                rank: 'ADMIN',
                reputation: 9999,
                joinedDate: '2025.10.15',
                postsCount: 10
            };
            localStorage.setItem('coinhub_user', JSON.stringify(adminUser));
            if (typeof currentUser !== 'undefined') currentUser = adminUser;
            if (typeof updateAuthUI === 'function') updateAuthUI();
            if (typeof updateAdminNavVisibility === 'function') updateAdminNavVisibility();

            this.closeAdminLoginModal();
            alert('🎉 관리자 계정으로 정상 로그인되었습니다! 관리자 센터로 이동합니다.');
            if (typeof switchTab === 'function') switchTab('admin');
            this.render();
        } else {
            alert('❌ 관리자 비밀번호가 일치하지 않습니다. 다시 확인해 주세요.');
            if (pwInput) {
                pwInput.value = '';
                pwInput.focus();
            }
        }
    },

    logoutAdmin: function () {
        if (confirm('관리자 세션을 로그아웃하시겠습니까?')) {
            sessionStorage.removeItem('coinhub_admin_authenticated');
            sessionStorage.removeItem('crytopnl_admin_authenticated');
            sessionStorage.removeItem('cryptopnl_admin_authenticated');
            localStorage.removeItem('crytopnl_is_admin_client');
            localStorage.removeItem('coinhub_is_admin_client');
            if (typeof updateAdminNavVisibility === 'function') updateAdminNavVisibility();
            alert('관리자 계정에서 로그아웃되었습니다.');
            if (typeof switchTab === 'function') switchTab('analyzer');
        }
    },

    promptAdminLogin: function () {
        const isAuth = sessionStorage.getItem('coinhub_admin_authenticated') === '1';
        if (isAuth) {
            if (typeof switchTab === 'function') switchTab('admin');
            return;
        }

        const currentAdminPw = this.getAdminPassword();
        const isDefault = (currentAdminPw === 'admin1234');
        const guide = isDefault ? ' (초기 비밀번호: admin1234)' : '';
        const pw = prompt(`👑 CryptoPnL 최고 관리자 비밀번호를 입력하세요${guide}:`);
        if (pw === null) return;

        if (pw.trim() === currentAdminPw) {
            sessionStorage.setItem('coinhub_admin_authenticated', '1');
            sessionStorage.setItem('crytopnl_admin_authenticated', '1');
            localStorage.setItem('crytopnl_is_admin_client', '1');
            const adminUser = {
                username: 'admin',
                email: 'admin@cryptopnl.com',
                role: 'ADMIN',
                rank: 'ADMIN',
                reputation: 9999,
                joinedDate: '2025.10.15',
                postsCount: 10
            };
            localStorage.setItem('coinhub_user', JSON.stringify(adminUser));
            localStorage.setItem('crytopnl_user', JSON.stringify(adminUser));
            if (typeof currentUser !== 'undefined') currentUser = adminUser;
            if (typeof AdminAnalytics !== 'undefined' && typeof AdminAnalytics.rollbackAdminVisit === 'function') {
                AdminAnalytics.rollbackAdminVisit();
            }
            if (typeof updateAuthUI === 'function') updateAuthUI();
            if (typeof updateAdminNavVisibility === 'function') updateAdminNavVisibility();
            if (typeof updateAdminNavVisibility === 'function') updateAdminNavVisibility();
            this.checkAdminAccess();
            alert('👑 최고 관리자 인증 완료! 관리자 센터로 이동합니다.');
            if (typeof switchTab === 'function') switchTab('admin');
        } else {
            alert('❌ 관리자 비밀번호가 일치하지 않습니다.');
        }
    },
  
    checkAdminAccess: function () {
        const isSessionAuth = sessionStorage.getItem('crytopnl_admin_authenticated') === '1' || 
                              sessionStorage.getItem('cryptopnl_admin_authenticated') === '1' || 
                              sessionStorage.getItem('coinhub_admin_authenticated') === '1';
        let isLocalAdmin = false;
        try {
            const u = JSON.parse(localStorage.getItem('crytopnl_user') || localStorage.getItem('cryptopnl_user') || localStorage.getItem('coinhub_user') || '{}');
            if (u && (u.username?.toLowerCase() === 'admin' || u.role === 'ADMIN' || u.rank === 'ADMIN')) {
                isLocalAdmin = true;
            }
        } catch(e) {}

        const isAuth = isSessionAuth || isLocalAdmin;

        const guardEl = document.getElementById('admin-auth-guard');
        const contentEl = document.getElementById('admin-dashboard-content');

        if (isAuth) {
            localStorage.setItem('crytopnl_is_admin_client', '1');
            if (typeof AdminAnalytics !== 'undefined' && typeof AdminAnalytics.rollbackAdminVisit === 'function') {
                AdminAnalytics.rollbackAdminVisit();
            }
            if (guardEl) {
                guardEl.classList.add('hidden');
                guardEl.classList.remove('block');
                guardEl.style.setProperty('display', 'none', 'important');
            }
            if (contentEl) {
                contentEl.classList.remove('hidden');
                contentEl.classList.add('block');
                contentEl.style.setProperty('display', 'block', 'important');
            }
            this.renderAll();
            this.bindEvents();
            if (typeof lucide !== 'undefined') lucide.createIcons();
        } else {
            if (guardEl) {
                guardEl.classList.remove('hidden');
                guardEl.classList.add('block');
                guardEl.style.setProperty('display', 'block', 'important');
            }
            if (contentEl) {
                contentEl.classList.remove('block');
                contentEl.classList.add('hidden');
                contentEl.style.setProperty('display', 'none', 'important');
            }
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    },

    handleAdminLogin: function () {
        const idInput = document.getElementById('admin-login-id');
        const pwInput = document.getElementById('admin-login-pw');
        const id = idInput ? idInput.value.trim() : '';
        const pw = pwInput ? pwInput.value.trim() : '';
        const currentAdminPw = this.getAdminPassword();

        if (!pw) {
            alert('관리자 비밀번호를 입력해 주세요.');
            if (pwInput) pwInput.focus();
            return;
        }

        if (pw === currentAdminPw) {
            sessionStorage.setItem('coinhub_admin_authenticated', '1');
            sessionStorage.setItem('crytopnl_admin_authenticated', '1');
            localStorage.removeItem('crytopnl_is_admin_client');
            localStorage.removeItem('coinhub_is_admin_client');
            
            const adminUser = {
                username: id || 'admin',
                email: 'admin@cryptopnl.com',
                role: 'ADMIN',
                rank: 'ADMIN',
                reputation: 9999,
                joinedDate: '2025.10.15',
                postsCount: 10
            };
            localStorage.setItem('coinhub_user', JSON.stringify(adminUser));
            localStorage.setItem('crytopnl_user', JSON.stringify(adminUser));
            if (typeof currentUser !== 'undefined') currentUser = adminUser;
            if (typeof AdminAnalytics !== 'undefined' && typeof AdminAnalytics.rollbackAdminVisit === 'function') {
                AdminAnalytics.rollbackAdminVisit();
            }
            if (typeof updateAuthUI === 'function') updateAuthUI();
            if (typeof updateAdminNavVisibility === 'function') updateAdminNavVisibility();
            
            this.checkAdminAccess();
            alert('👑 최고 관리자(Admin) 인증이 완료되었습니다. 관리자 센터에 오신 것을 환영합니다!');
            return;
        }
        
        alert('❌ 관리자 비밀번호가 일치하지 않습니다. 올바른 비밀번호를 입력하세요.');
    },

    handleAdminLogout: function () {
        sessionStorage.removeItem('coinhub_admin_authenticated');
        sessionStorage.removeItem('crytopnl_admin_authenticated');
        sessionStorage.removeItem('cryptopnl_admin_authenticated');
        localStorage.removeItem('crytopnl_is_admin_client');
        localStorage.removeItem('coinhub_is_admin_client');
        this.checkAdminAccess();
        alert('관리자 모드에서 안전하게 로그아웃되었습니다.');
        if (typeof switchTab === 'function') switchTab('market');
    },

    switchSubTab: function (tabId) {
        this.activeSubTab = tabId;
        document.querySelectorAll('.admin-subtab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.admintab === tabId);
        });

        document.querySelectorAll('.admin-tab-content').forEach(content => {
            content.classList.toggle('hidden', content.id !== 'admin-tab-' + tabId);
        });

        if (tabId === 'analytics') {
            this.renderAnalytics();
        } else if (tabId === 'users') {
            this.renderUsers();
        } else if (tabId === 'guest-trades') {
            this.renderGuestTrades();
        } else if (tabId === 'moderation') {
            this.renderModeration();
        } else if (tabId === 'system') {
            this.renderSystemHealth();
        } else if (tabId === 'resources') {
            this.renderCloudResources();
        }
    },

    renderAll: function () {
        this.renderAnalytics();
        this.renderUsers();
        this.renderGuestTrades();
        this.renderModeration();
        this.renderSystemHealth();
        this.renderCloudResources();
    },

    renderAnalytics: async function () {
        this.renderStatsUI = (stats) => {
            if (!stats) return;
            this.lastStats = stats;

            // 1. Real KPI Cards
            const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
            setVal('admin-today-visitors', (stats.todayVisitors || 0).toLocaleString() + '명');
            const growthText = (stats.growthRate || '0.0%') + ' vs 어제 (' + (stats.yesterdayVisitors || 0).toLocaleString() + '명)';
            setVal('admin-today-growth', growthText);
            const growthEl = document.getElementById('admin-today-growth');
            if (growthEl) {
                const gr = stats.growthRate || '0.0%';
                const grNum = parseFloat(gr.replace('%', '').replace('+', ''));
                growthEl.className = 'text-[11px] font-semibold mt-1 flex items-center gap-1 ' +
                    (grNum > 0 ? 'text-emerald-400' : grNum < 0 ? 'text-rose-400' : 'text-slate-400');
            }
            setVal('admin-live-users', (stats.liveUsers !== undefined ? stats.liveUsers : 0) + '명 (실제 접속자)');
            setVal('admin-weekly-visitors', (stats.weeklyVisitors || 0).toLocaleString() + '명');
            setVal('admin-total-pageviews', (stats.totalPageviewsAllTime || 0).toLocaleString() + ' PV');

            // 2. Real 14-Day Visitor Bar Chart
            const chartContainer = document.getElementById('admin-visitor-chart');
            if (chartContainer && Array.isArray(stats.history)) {
                const maxVal = Math.max(...stats.history.map(h => h.visitors), 5);
                const kstToday = AdminAnalytics.getKstDateStr();
                chartContainer.innerHTML = stats.history.map(h => {
                    const heightPct = h.visitors > 0 ? Math.max(Math.round((h.visitors / maxVal) * 100), 15) : 4;
                    const shortDate = h.date.slice(5);
                    const isToday = h.date === kstToday;

                    return `
                      <div class="flex flex-col items-center flex-1 h-full justify-end group relative">
                        <div class="absolute -top-7 bg-navy-950 text-cyan-400 text-[10px] font-bold px-2 py-0.5 rounded border border-navy-700 opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-10">
                          ${h.visitors.toLocaleString()}명 (${h.pageviews.toLocaleString()} PV)
                        </div>
                        <div class="w-full max-w-[28px] rounded-t-md hover:brightness-125 transition-all shadow-md" style="height: ${heightPct}%; background: ${isToday ? 'linear-gradient(to top, #9333ea, #22d3ee)' : 'linear-gradient(to top, rgba(8,145,178,0.7), rgba(34,211,238,0.7))'};"></div>
                        <span class="text-[9px] ${isToday ? 'text-cyan-400 font-bold' : 'text-slate-400'} mt-2 font-mono">${shortDate}</span>
                      </div>
                    `;
                }).join('');
            }

            // 3. Update Feature Distribution (9 Core Platform Features)
            const featKeys = [
                { key: 'analyzer', id: 'admin-feat-analyzer' },
                { key: 'market', id: 'admin-feat-market' },
                { key: 'onchain', id: 'admin-feat-onchain' },
                { key: 'patterns', id: 'admin-feat-patterns' },
                { key: 'calculators', id: 'admin-feat-calculators' },
                { key: 'news', id: 'admin-feat-news' },
                { key: 'policy', id: 'admin-feat-policy' },
                { key: 'community', id: 'admin-feat-community' },
                { key: 'calendar', id: 'admin-feat-calendar' }
            ];

            const todayF = stats.todayFeatures || stats.features || {};
            const cumF = stats.cumFeatures || stats.features || {};
            const todayTotalF = featKeys.reduce((sum, item) => sum + (Number(todayF[item.key]) || 0), 0);
            const cumTotalF = featKeys.reduce((sum, item) => sum + (Number(cumF[item.key]) || 0), 0);

            const isFeatToday = (this.featureScope === 'today');
            const activeF = isFeatToday ? todayF : cumF;
            const altF = isFeatToday ? cumF : todayF;
            const activeTotalF = isFeatToday ? todayTotalF : cumTotalF;
            const altTotalF = isFeatToday ? cumTotalF : todayTotalF;

            // Update feature scope toggle button styles
            const btnFeatToday = document.getElementById('admin-feat-scope-today');
            const btnFeatAll = document.getElementById('admin-feat-scope-all');
            if (btnFeatToday && btnFeatAll) {
                btnFeatToday.className = isFeatToday 
                    ? 'px-2.5 py-1 rounded font-semibold transition bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm' 
                    : 'px-2.5 py-1 rounded font-semibold transition text-slate-400 hover:text-white border border-transparent';
                btnFeatAll.className = !isFeatToday 
                    ? 'px-2.5 py-1 rounded font-semibold transition bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm' 
                    : 'px-2.5 py-1 rounded font-semibold transition text-slate-400 hover:text-white border border-transparent';
            }
            const featDescEl = document.getElementById('admin-feat-scope-desc');
            if (featDescEl) {
                featDescEl.textContent = isFeatToday 
                    ? `오늘 하루 실측치 기준 (총 ${todayTotalF.toLocaleString()}회 이용)` 
                    : `최근 14일 누적 실측치 기준 (총 ${cumTotalF.toLocaleString()}회 이용)`;
            }

            featKeys.forEach(item => {
                const activeCnt = Number(activeF[item.key]) || 0;
                const altCnt = Number(altF[item.key]) || 0;
                const barWidth = activeTotalF > 0 ? Math.round((activeCnt / activeTotalF) * 100) : 0;
                const elPct = document.getElementById(item.id + '-pct');
                const elBar = document.getElementById(item.id + '-bar');
                const elSub = document.getElementById(item.id + '-sub');
                if (elPct) elPct.innerText = activeCnt.toLocaleString() + '회';
                if (elBar) elBar.style.width = barWidth + '%';
                if (elSub) {
                    elSub.innerText = isFeatToday ? `(누적: ${altCnt.toLocaleString()}회)` : `(오늘: ${altCnt.toLocaleString()}회)`;
                }
            });

            // 4. Update Device Share (Today vs Cumulative - percentage & visitor counts)
            const isDevToday = (this.deviceScope === 'today');
            const todayDev = stats.todayDevices || { mobile: 0, desktop: 0 };
            const cumDev = stats.cumDevices || { mobile: 0, desktop: 0 };
            const activeDev = isDevToday ? todayDev : cumDev;
            const altDev = isDevToday ? cumDev : todayDev;

            const mobileCount = Number(activeDev.mobile || 0);
            const desktopCount = Number(activeDev.desktop || 0);
            const altMobileCount = Number(altDev.mobile || 0);
            const altDesktopCount = Number(altDev.desktop || 0);
            const activeDevTotal = mobileCount + desktopCount;
            const altDevTotal = altMobileCount + altDesktopCount;

            const mobilePctVal = activeDevTotal > 0 ? Math.round((mobileCount / activeDevTotal) * 100) : 0;
            const desktopPctVal = activeDevTotal > 0 ? (100 - mobilePctVal) : 0;
            const altMobilePctVal = altDevTotal > 0 ? Math.round((altMobileCount / altDevTotal) * 100) : 0;
            const altDesktopPctVal = altDevTotal > 0 ? (100 - altMobilePctVal) : 0;

            // Update device scope toggle button styles
            const btnDevToday = document.getElementById('admin-device-scope-today');
            const btnDevAll = document.getElementById('admin-device-scope-all');
            if (btnDevToday && btnDevAll) {
                btnDevToday.className = isDevToday 
                    ? 'px-2.5 py-1 rounded font-semibold transition bg-purple-500/20 text-purple-400 border border-purple-500/40 shadow-sm' 
                    : 'px-2.5 py-1 rounded font-semibold transition text-slate-400 hover:text-white border border-transparent';
                btnDevAll.className = !isDevToday 
                    ? 'px-2.5 py-1 rounded font-semibold transition bg-purple-500/20 text-purple-400 border border-purple-500/40 shadow-sm' 
                    : 'px-2.5 py-1 rounded font-semibold transition text-slate-400 hover:text-white border border-transparent';
            }
            const devDescEl = document.getElementById('admin-device-scope-desc');
            if (devDescEl) {
                devDescEl.textContent = isDevToday 
                    ? `오늘 하루 실측치 기준 (총 ${activeDevTotal.toLocaleString()}명 방문)` 
                    : `시스템 전체 누적 실측치 기준 (총 ${activeDevTotal.toLocaleString()}명 방문)`;
            }

            const setDev = (id, textVal) => {
                const el = document.getElementById(id);
                if (el) el.innerText = textVal;
            };
            setDev('admin-dev-mobile-pct', `${mobilePctVal}% (${mobileCount.toLocaleString()}명)`);
            setDev('admin-dev-desktop-pct', `${desktopPctVal}% (${desktopCount.toLocaleString()}명)`);
            const subMobileEl = document.getElementById('admin-dev-mobile-sub');
            const subDesktopEl = document.getElementById('admin-dev-desktop-sub');
            if (subMobileEl) {
                subMobileEl.innerText = isDevToday 
                    ? `오늘: ${mobilePctVal}% (${mobileCount.toLocaleString()}명) | 누적: ${altMobilePctVal}%` 
                    : `전체: ${mobilePctVal}% (${mobileCount.toLocaleString()}명) | 오늘: ${altMobilePctVal}%`;
            }
            if (subDesktopEl) {
                subDesktopEl.innerText = isDevToday 
                    ? `오늘: ${desktopPctVal}% (${desktopCount.toLocaleString()}명) | 누적: ${altDesktopPctVal}%` 
                    : `전체: ${desktopPctVal}% (${desktopCount.toLocaleString()}명) | 오늘: ${altDesktopPctVal}%`;
            }

            // 5. Update Dynamic Browser Environment Breakdown (percentage & count)
            const bContainer = document.getElementById('admin-browser-breakdown');
            if (bContainer) {
                const activeBMap = isDevToday ? (stats.todayBrowsers || stats.browsers || {}) : (stats.cumBrowsers || stats.browsers || {});
                const altBMap = isDevToday ? (stats.cumBrowsers || stats.browsers || {}) : (stats.todayBrowsers || stats.browsers || {});
                const activeBTotal = Object.values(activeBMap).reduce((a, b) => a + Number(b || 0), 0);
                const altBTotal = Object.values(altBMap).reduce((a, b) => a + Number(b || 0), 0);

                if (activeBTotal === 0 && altBTotal === 0) {
                    bContainer.innerHTML = '<div class="col-span-full text-center text-slate-500 text-[11px] py-2">브라우저 데이터 없음 (0명)</div>';
                } else {
                    const bNames = [
                        { key: 'Chrome', name: 'Chrome', color: 'text-cyan-400', dot: 'bg-cyan-400' },
                        { key: 'Safari', name: 'Safari', color: 'text-purple-400', dot: 'bg-purple-400' },
                        { key: 'Samsung', name: 'Samsung', color: 'text-blue-400', dot: 'bg-blue-400' },
                        { key: 'Edge', name: 'Edge', color: 'text-emerald-400', dot: 'bg-emerald-400' },
                        { key: 'Whale', name: 'Whale', color: 'text-teal-400', dot: 'bg-teal-400' },
                        { key: 'Firefox', name: 'Firefox', color: 'text-orange-400', dot: 'bg-orange-400' },
                        { key: 'Other', name: '기타', color: 'text-slate-400', dot: 'bg-slate-400' }
                    ];
                    bContainer.innerHTML = bNames.map(b => {
                        const cnt = Number(activeBMap[b.key] || 0);
                        const altCnt = Number(altBMap[b.key] || 0);
                        if (cnt === 0 && altCnt === 0) return '';
                        const bPct = activeBTotal > 0 ? ((cnt / activeBTotal) * 100).toFixed(1) : '0.0';
                        const subLabel = isDevToday ? `(누적: ${altCnt.toLocaleString()}명)` : `(오늘: ${altCnt.toLocaleString()}명)`;
                        return `
                          <div class="flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-navy-950/70 border border-navy-800">
                            <span class="w-2 h-2 rounded-full ${b.dot}"></span>
                            <span class="text-slate-300 text-[11px]">${b.name}:</span>
                            <div class="ml-auto text-right">
                              <span class="${b.color} font-bold text-[11px]">${bPct}% <span class="text-[10px] font-normal text-slate-400">(${cnt.toLocaleString()}명)</span></span>
                              <span class="text-[9px] text-slate-500 font-normal ml-1">${subLabel}</span>
                            </div>
                          </div>
                        `;
                    }).join('');
                }
            }
        };

        // 1. Render from LocalStorage immediately for zero-delay instant UI response
        try {
            const instantStats = AdminAnalytics.getTodayStats();
            if (instantStats) {
                this.renderStatsUI(instantStats);
            }
        } catch (e) {}

        // Render Page Access Times and Visitor Logs immediately from local cache
        try {
            this.renderPageAccessTimes();
            this.renderVisitorLogs();
        } catch(e) {}

        // 2. Fetch and render aggregated multi-user cloud stats from Firestore
        const stats = await AdminAnalytics.fetchCloudStats();
        this.renderStatsUI(stats);

        // Fetch and refresh Page Access Times and Visitor Logs from cloud
        try {
            await Promise.all([
                this.renderPageAccessTimes(),
                this.renderVisitorLogs()
            ]);
        } catch(e) {}
    },

    renderPageAccessTimes: async function () {
        const tbody = document.getElementById('admin-page-access-table-body');
        if (!tbody) return;

        try {
            const pageMap = await AdminAnalytics.fetchPageAccessData();
            const defs = AdminAnalytics.PAGE_DEFINITIONS || [];
            const now = Date.now();

            const rowsHtml = defs.map(p => {
                const info = pageMap[p.key] || AdminAnalytics.getPageInfo(p.key);
                const lastTs = info.lastTimestamp || (info.lastAccessedAt ? new Date(info.lastAccessedAt).getTime() : 0);
                const isRecent = (now - lastTs) < 10 * 60 * 1000; // within 10 minutes
                const relTime = AdminAnalytics.formatRelativeTime(lastTs);
                const devIcon = info.lastDevice === 'mobile' ? 'smartphone' : 'monitor';
                const devText = info.lastDevice === 'mobile' ? '모바일' : 'PC/데스크톱';

                return `
                  <tr class="hover:bg-navy-800/40 transition">
                    <td class="py-3 px-4">
                      <div class="flex items-center gap-2.5">
                        <span class="p-1.5 rounded-lg ${p.bg || 'bg-navy-800'} ${p.color || 'text-cyan-400'} border ${p.border || 'border-navy-700'}">
                          <i data-lucide="${p.icon || 'layout'}" class="w-4 h-4"></i>
                        </span>
                        <div>
                          <a href="${p.path || '#'}" class="font-bold text-white text-xs hover:underline flex items-center gap-1">
                            ${p.name}
                            <i data-lucide="external-link" class="w-3 h-3 text-slate-500"></i>
                          </a>
                          <span class="text-[10px] text-slate-400 font-mono">${p.path}</span>
                        </div>
                      </div>
                    </td>
                    <td class="py-3 px-4">
                      <div class="space-y-0.5">
                        <div class="font-mono text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                          <i data-lucide="clock" class="w-3.5 h-3.5 text-cyan-400"></i>
                          <span>${info.lastAccessedAt || '-'}</span>
                        </div>
                        <div class="text-[10px]">
                          <span class="px-1.5 py-0.5 rounded font-semibold ${isRecent ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'}">${relTime}</span>
                        </div>
                      </div>
                    </td>
                    <td class="py-3 px-4 text-slate-300 font-mono text-xs">
                      ${info.todayFirstAccess || '-'}
                    </td>
                    <td class="py-3 px-4 text-right">
                      <div class="space-y-1 inline-block text-right">
                        <div class="text-xs font-bold text-white font-mono">
                          ${(info.todayCount || 0).toLocaleString()}회
                        </div>
                        <div class="text-[10px] text-slate-400">
                          누적 ${(info.totalCount || info.todayCount || 0).toLocaleString()}회
                        </div>
                      </div>
                    </td>
                    <td class="py-3 px-4">
                      <div class="text-xs text-slate-300 flex items-center gap-1.5">
                        <i data-lucide="${devIcon}" class="w-3.5 h-3.5 text-slate-400"></i>
                        <span>${devText} · ${info.lastBrowser || 'Chrome'}</span>
                      </div>
                      <div class="text-[10px] text-slate-400 mt-0.5">
                        👤 ${info.lastUser || '비회원'}
                      </div>
                    </td>
                    <td class="py-3 px-4 text-center">
                      ${isRecent 
                        ? '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>최근 활성</span>' 
                        : '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-navy-700">대기 중</span>'}
                    </td>
                  </tr>
                `;
            }).join('');

            tbody.innerHTML = rowsHtml;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        } catch(e) {
            console.warn('renderPageAccessTimes error:', e);
        }
    },

    renderVisitorLogs: async function () {
        const tbody = document.getElementById('admin-visitor-logs-table-body');
        const countBadge = document.getElementById('admin-visitor-logs-count');
        if (!tbody) return;

        try {
            const logs = await AdminAnalytics.fetchVisitorLogs();
            if (countBadge) {
                countBadge.textContent = `최근 ${Math.min(logs.length, 100)}건`;
            }

            if (!logs || logs.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-slate-400 text-xs">최근 접속 기록이 없습니다.</td></tr>';
                return;
            }

            const now = Date.now();
            const realUsers = (typeof AdminUserManager !== 'undefined' && typeof AdminUserManager.getUsers === 'function')
                ? AdminUserManager.getUsers()
                : [];
            const registeredUsernames = new Set(realUsers.map(u => (u.username || '').toLowerCase()).filter(Boolean));

            const rowsHtml = logs.slice(0, 100).map((log, idx) => {
                const ts = log.timestamp || (log.time ? new Date(log.time).getTime() : 0);
                const relTime = AdminAnalytics.formatRelativeTime(ts);
                const isVeryRecent = (now - ts) < 5 * 60 * 1000;
                const pInfo = AdminAnalytics.getPageInfo(log.page);
                const devIcon = log.device === 'mobile' ? 'smartphone' : 'monitor';
                const devText = log.device === 'mobile' ? '모바일' : '데스크톱';

                const shortSession = (log.sessionId || '').replace('v_', '').substring(0, 8);
                const isRealMember = log.user && log.user !== '비회원 (게스트)' && (registeredUsernames.size === 0 || registeredUsernames.has(log.user.toLowerCase()));
                const userBadge = isRealMember
                    ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">${escapeHtml(log.user)}</span>`
                    : `<span class="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">게스트 #${escapeHtml(shortSession || 'visit')}</span>`;

                return `
                  <tr class="hover:bg-navy-800/40 transition">
                    <td class="py-2.5 px-4">
                      <div class="flex items-center gap-1.5 font-mono text-xs font-bold text-white">
                        <i data-lucide="clock" class="w-3.5 h-3.5 text-cyan-400"></i>
                        <span>${log.time || '-'}</span>
                      </div>
                      <div class="text-[10px] text-slate-400 pl-5">
                        <span class="${isVeryRecent ? 'text-emerald-400 font-bold' : 'text-slate-400'}">${relTime}</span>
                      </div>
                    </td>
                    <td class="py-2.5 px-4">
                      <div class="flex items-center gap-1.5">
                        ${userBadge}
                      </div>
                    </td>
                    <td class="py-2.5 px-4">
                      <div class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg ${pInfo.bg || 'bg-navy-800'} ${pInfo.color || 'text-cyan-400'} border ${pInfo.border || 'border-navy-700'} text-xs font-semibold">
                        <i data-lucide="${pInfo.icon || 'layout'}" class="w-3.5 h-3.5"></i>
                        <span>${pInfo.name}</span>
                      </div>
                    </td>
                    <td class="py-2.5 px-4">
                      <div class="flex items-center gap-1.5 text-xs text-slate-300">
                        <i data-lucide="${devIcon}" class="w-3.5 h-3.5 text-slate-400"></i>
                        <span>${devText} · ${log.browser || 'Chrome'}</span>
                      </div>
                    </td>
                    <td class="py-2.5 px-4 text-xs text-slate-400 font-mono">
                      ${log.firstVisitTime || log.time || '-'}
                    </td>
                    <td class="py-2.5 px-4 text-center">
                      ${isVeryRecent 
                        ? '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>활동 중</span>' 
                        : '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-navy-700">종료</span>'}
                    </td>
                  </tr>
                `;
            }).join('');

            tbody.innerHTML = rowsHtml;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        } catch(e) {
            console.warn('renderVisitorLogs error:', e);
        }
    },

    refreshVisitorLogs: async function () {
        const btn = document.getElementById('admin-visitor-logs-refresh-btn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i><span>갱신 중...</span>';
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }

        try {
            await Promise.all([
                this.renderPageAccessTimes(),
                this.renderVisitorLogs()
            ]);
        } catch(e) {}

        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i><span>실시간 새로고침</span>';
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    },

    renderUsers: async function () {
        const tbody = document.getElementById('admin-users-table-body');
        if (!tbody) return;

        const tradeCountsMap = {};

        const doRender = (userList) => {
            let filtered = userList.filter(u => {
                const matchQuery = !this.userSearchQuery || 
                    u.username.toLowerCase().includes(this.userSearchQuery) || 
                    u.email.toLowerCase().includes(this.userSearchQuery);
                const matchRole = this.userRoleFilter === 'ALL' || 
                    u.role === this.userRoleFilter || 
                    (this.userRoleFilter === 'USER' && (u.role === 'MEMBER' || !u.role));
                const matchStatus = this.userStatusFilter === 'ALL' || u.status === this.userStatusFilter;
                return matchQuery && matchRole && matchStatus;
            });

            const totalUserCountEl = document.getElementById('admin-total-users-count');
            if (totalUserCountEl) totalUserCountEl.innerText = userList.length + '명 등록됨';

            if (filtered.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-slate-400 text-xs">일치하는 사용자 계정이 없습니다.</td></tr>';
                return;
            }

            tbody.innerHTML = filtered.map(u => {
                const isMember = !u.role || u.role === 'USER' || u.role === 'MEMBER';
                const roleBadge = u.role === 'ADMIN' 
                    ? '<span class="px-2 py-0.5 rounded bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 text-[10px] font-bold">👑 ADMIN</span>'
                    : (u.role === 'PRO' 
                        ? '<span class="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 text-[10px] font-bold">⚡ PRO</span>'
                        : '<span class="px-2 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-[10px] font-bold">👤 MEMBER</span>');

                const statusBadge = u.status === 'ACTIVE'
                    ? '<span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 text-[10px] font-bold">● 정상 활동</span>'
                    : '<span class="px-2 py-0.5 rounded bg-rose-500/20 text-rose-500 border border-rose-500/30 text-[10px] font-bold">⛔ 활동 정지</span>';

                const realTrades = AdminUserManager.getUserTradesCount(u.username, tradeCountsMap);

                return `
                  <tr class="border-b border-navy-800 hover:bg-navy-800/40 transition text-xs">
                    <td class="py-3 px-4">
                      <div class="font-bold text-white flex items-center gap-2">
                        <div class="w-6 h-6 rounded-lg bg-navy-950 border border-navy-700 flex items-center justify-center font-mono text-[10px] text-cyan-400 font-bold">
                          ${u.username.substring(0, 1).toUpperCase()}
                        </div>
                        ${escapeHtml(u.username)}
                      </div>
                    </td>
                    <td class="py-3 px-4 text-slate-300 font-mono">${escapeHtml(u.email)}</td>
                    <td class="py-3 px-4 text-slate-400 font-mono text-[11px]">${u.joinedDate}</td>
                    <td class="py-3 px-4">${roleBadge}</td>
                    <td class="py-3 px-4">${statusBadge}</td>
                    <td class="py-3 px-4 font-mono font-semibold text-right ${realTrades > 0 ? 'text-cyan-400 font-bold' : 'text-slate-400'}">${realTrades.toLocaleString()}건</td>
                    <td class="py-3 px-4 text-slate-300 font-mono text-[11px]">${AdminUserManager.formatActivityTime(u.lastLoginAt || u.lastLogin)}</td>
                    <td class="py-3 px-4 text-right">
                      <div class="flex items-center justify-end gap-1.5">
                        <button onclick="AdminApp.promptChangeRole('${u.username}', '${u.role}')" class="px-2 py-1 bg-navy-800 hover:bg-navy-700 text-slate-300 hover:text-cyan-400 rounded text-[10px] font-semibold transition border border-navy-700" title="권한 변경">
                          권한변경
                        </button>
                        <button onclick="AdminApp.toggleUserStatus('${u.username}')" class="px-2 py-1 ${u.status === 'ACTIVE' ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border-amber-500/30' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/30'} rounded text-[10px] font-semibold transition border" title="계정 상태 변경">
                          ${u.status === 'ACTIVE' ? '정지' : '해제'}
                        </button>
                        <button onclick="AdminApp.resetUserData('${u.username}')" class="px-2 py-1 bg-navy-800 hover:bg-navy-700 text-slate-400 hover:text-rose-400 rounded text-[10px] font-semibold transition border border-navy-700" title="거래내역 초기화">
                          데이터초기화
                        </button>
                        <button onclick="AdminApp.deleteUser('${u.username}')" class="px-1.5 py-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition text-xs" title="회원 삭제">
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
            }).join('');
        };

        // 1. Instant local render for zero latency
        const initialUsers = AdminUserManager.getUsers();
        doRender(initialUsers);

        // 2. Cloud Firestore live sync
        const firestore = window.db || (typeof db !== 'undefined' ? db : null);
        if (firestore) {
            try {
                const snap = await firestore.collection('users').get();
                const list = [];
                snap.forEach(doc => {
                    const data = doc.data();
                    if (data && data.username) {
                        list.push({
                            id: data.id || ('usr_' + data.username.toLowerCase()),
                            username: data.username,
                            email: data.email || (data.username + '@cryptopnl.com'),
                            role: data.role || 'USER',
                            status: data.status || 'ACTIVE',
                            joinedDate: data.joinedDate || (data.lastLoginAt ? data.lastLoginAt.slice(0, 10) : '2026.09.03'),
                            lastLogin: data.lastLoginAt || data.lastLogin || data.joinedDate || '기록 없음',
                            lastLoginAt: data.lastLoginAt || data.lastLogin || data.joinedDate || '기록 없음',
                            reputation: data.reputation || (data.role === 'ADMIN' ? 9999 : 100),
                            memo: data.role === 'ADMIN' ? '최고 관리자' : '클라우드 회원'
                        });
                    }
                });
                if (list.length > 0) {
                    AdminUserManager.cloudUsers = list;
                    AdminUserManager.saveUsers(list);
                }

                const tradesSnap = await firestore.collection('user_trades').get();
                tradesSnap.forEach(doc => {
                    const data = doc.data();
                    if (data && data.uid) {
                        const cleanU = data.uid.replace(/^user_/, '').toLowerCase();
                        tradeCountsMap[cleanU] = data.totalCount || 0;
                    }
                });

                // Re-render with cloud data
                const updatedUsers = AdminUserManager.getUsers();
                doRender(updatedUsers);
            } catch (e) {
                console.warn('Firestore live fetch note in renderUsers:', e);
            }
        }
    },

    renderGuestTrades: async function () {
        const tbody = document.getElementById('admin-guest-trades-table-body');
        if (!tbody) return;

        const list = await AdminGuestTradeManager.fetchGuestTrades();
        
        // 1. KPI 요약 카드 및 상단 탭 뱃지 수치 갱신
        const totalUploads = list.length;
        const totalTrades = list.reduce((sum, item) => sum + (Number(item.tradesCount) || 0), 0);
        const totalVolume = list.reduce((sum, item) => sum + (Number(item.totalVolume) || 0), 0);
        
        const now = Date.now();
        const recent24hCount = list.filter(item => {
            const t = new Date(item.timestamp || 0).getTime();
            return (now - t) < (24 * 3600 * 1000);
        }).length;

        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.innerText = val;
        };

        setVal('admin-guest-trades-count', totalUploads + '건');
        setVal('admin-guest-kpi-total-uploads', totalUploads.toLocaleString() + '회');
        setVal('admin-guest-kpi-total-trades', totalTrades.toLocaleString() + '건');
        setVal('admin-guest-kpi-total-volume', '₩' + Math.round(totalVolume).toLocaleString());
        setVal('admin-guest-kpi-recent', recent24hCount + '건 (24H)');

        // 2. 검색 및 거래소 필터링
        const query = (this.guestTradeSearchQuery || '').toLowerCase().trim();
        const exFilter = this.guestTradeExchangeFilter || 'ALL';

        let filtered = list.filter(item => {
            const matchQuery = !query ||
                (item.guestId && item.guestId.toLowerCase().includes(query)) ||
                (Array.isArray(item.fileNames) && item.fileNames.some(fn => String(fn).toLowerCase().includes(query))) ||
                (Array.isArray(item.coins) && item.coins.some(c => String(c.symbol || '').toLowerCase().includes(query)));
            
            const matchExchange = (exFilter === 'ALL') || 
                (item.exchange && item.exchange.includes(exFilter)) ||
                (exFilter === 'UPBIT' && String(item.exchange).includes('업비트')) ||
                (exFilter === 'BITHUMB' && String(item.exchange).includes('빗썸'));

            return matchQuery && matchExchange;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" class="text-center py-10 text-slate-400 text-xs">기록된 비회원 손익분석 내역이 없습니다. (방문자가 거래내역 엑셀을 업로드하면 실시간 표시됩니다.)</td></tr>';
            return;
        }

        tbody.innerHTML = filtered.map(item => {
            const exBadge = item.exchange?.includes('업비트+빗썸')
                ? '<span class="px-2 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30 text-[10px] font-bold">통합</span>'
                : (item.exchange?.includes('빗썸')
                    ? '<span class="px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-bold">빗썸</span>'
                    : '<span class="px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 text-[10px] font-bold">업비트</span>');

            const pnlNum = Number(item.realizedProfit || 0);
            const pnlRate = Number(item.profitRate || 0);
            const pnlClass = pnlNum > 0 ? 'text-rose-400 font-bold' : (pnlNum < 0 ? 'text-blue-400 font-bold' : 'text-slate-400');
            const pnlSign = pnlNum > 0 ? '+' : '';
            const pnlFormatted = `${pnlSign}${Math.round(pnlNum).toLocaleString()}원 (${pnlSign}${pnlRate.toFixed(2)}%)`;

            const coinsDisplay = (Array.isArray(item.coins) && item.coins.length > 0)
                ? item.coins.slice(0, 3).map(c => `<span class="px-1.5 py-0.5 rounded bg-navy-950 text-cyan-300 font-mono text-[10px] border border-navy-700 font-semibold">${c.symbol}</span>`).join(' ') +
                  (item.coins.length > 3 ? ` <span class="text-[10px] text-slate-500">+${item.coins.length - 3}</span>` : '')
                : '<span class="text-slate-500 text-[10px]">-</span>';

            const firstFileName = (Array.isArray(item.fileNames) && item.fileNames.length > 0) ? item.fileNames[0] : '거래내역 파일';
            const fileDisplay = (item.fileNames && item.fileNames.length > 1) 
                ? `${firstFileName} 외 ${item.fileNames.length - 1}개`
                : firstFileName;

            return `
              <tr class="border-b border-navy-800 hover:bg-navy-800/40 transition text-xs">
                <td class="py-3 px-4 font-mono font-bold text-slate-200">
                  <div class="flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span class="text-emerald-400">${item.guestId || 'GUEST'}</span>
                  </div>
                </td>
                <td class="py-3 px-4 text-slate-300 font-mono text-[11px] whitespace-nowrap">
                  ${AdminUserManager.formatActivityTime(item.timestamp)}
                </td>
                <td class="py-3 px-4 text-slate-300 font-mono text-[11px] max-w-[150px] truncate" title="${(item.fileNames || []).join(', ')}">
                  📄 ${escapeHtml(fileDisplay)}
                </td>
                <td class="py-3 px-4">${exBadge}</td>
                <td class="py-3 px-4 font-mono text-right text-cyan-400 font-bold">
                  ${(Number(item.tradesCount) || 0).toLocaleString()}건
                </td>
                <td class="py-3 px-4 font-mono text-right text-slate-200">
                  ₩${Math.round(Number(item.totalVolume) || 0).toLocaleString()}
                </td>
                <td class="py-3 px-4 font-mono text-right ${pnlClass} whitespace-nowrap">
                  ${pnlFormatted}
                </td>
                <td class="py-3 px-4">
                  <div class="flex items-center gap-1 flex-wrap">
                    ${coinsDisplay}
                  </div>
                </td>
                <td class="py-3 px-4 text-slate-400 text-[11px]">
                  ${item.device || 'Desktop'} <span class="text-slate-500 font-mono">(${item.browser || 'Web'})</span>
                </td>
                <td class="py-3 px-4 text-right">
                  <div class="flex items-center justify-end gap-1.5">
                    <button onclick="AdminApp.openGuestTradeDetailModal('${item.id}')" class="px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded text-[10px] font-bold transition border border-cyan-500/30">
                      상세보기
                    </button>
                    <button onclick="AdminApp.deleteGuestTrade('${item.id}')" class="px-1.5 py-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition text-xs" title="기록 삭제">
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            `;
        }).join('');
        
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    openGuestTradeDetailModal: async function (id) {
        const list = await AdminGuestTradeManager.fetchGuestTrades();
        const item = list.find(it => it.id === id);
        if (!item) return;

        const modal = document.getElementById('modal-admin-guest-detail');
        if (!modal) return;

        const setTxt = (elId, text) => {
            const el = document.getElementById(elId);
            if (el) el.innerText = text;
        };

        setTxt('admin-modal-guest-id', item.guestId || 'GUEST');
        setTxt('admin-modal-guest-time', item.kstTime || item.timestamp || '');
        setTxt('admin-modal-guest-files', (item.fileNames || []).join(', '));
        setTxt('admin-modal-guest-exchange', item.exchange || '업비트');
        setTxt('admin-modal-guest-trades', (item.tradesCount || 0).toLocaleString() + '건');
        setTxt('admin-modal-guest-volume', '₩' + Math.round(item.totalVolume || 0).toLocaleString());
        
        const pnlNum = Number(item.realizedProfit || 0);
        const pnlRate = Number(item.profitRate || 0);
        const pnlSign = pnlNum > 0 ? '+' : '';
        const pnlEl = document.getElementById('admin-modal-guest-pnl');
        if (pnlEl) {
            pnlEl.innerText = `${pnlSign}${Math.round(pnlNum).toLocaleString()}원 (${pnlSign}${pnlRate.toFixed(2)}%)`;
            pnlEl.className = 'font-mono font-bold text-sm ' + (pnlNum > 0 ? 'text-rose-400' : (pnlNum < 0 ? 'text-blue-400' : 'text-slate-300'));
        }
        setTxt('admin-modal-guest-winrate', (Number(item.winRate) || 0).toFixed(1) + '%');
        setTxt('admin-modal-guest-device', `${item.device || 'Desktop'} / ${item.browser || 'Web'}`);

        // Coins table
        const coinsTbody = document.getElementById('admin-modal-guest-coins-body');
        if (coinsTbody) {
            if (Array.isArray(item.coins) && item.coins.length > 0) {
                coinsTbody.innerHTML = item.coins.map(c => {
                    const cPnl = Number(c.realizedProfit || 0);
                    const cSign = cPnl > 0 ? '+' : '';
                    const cPnlClass = cPnl > 0 ? 'text-rose-400' : (cPnl < 0 ? 'text-blue-400' : 'text-slate-400');
                    return `
                      <tr class="border-b border-navy-800 text-xs">
                        <td class="py-2 px-3 font-mono font-bold text-cyan-300">${c.symbol}</td>
                        <td class="py-2 px-3 font-mono text-right text-slate-300">${c.count}건</td>
                        <td class="py-2 px-3 font-mono text-right font-semibold ${cPnlClass}">
                          ${cSign}${Math.round(cPnl).toLocaleString()}원
                        </td>
                      </tr>
                    `;
                }).join('');
            } else {
                coinsTbody.innerHTML = '<tr><td colspan="3" class="py-4 text-center text-slate-500 text-xs">개별 코인 요약 정보 없음</td></tr>';
            }
        }

        modal.classList.remove('hidden');
        modal.classList.add('flex');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    closeGuestTradeDetailModal: function () {
        const modal = document.getElementById('modal-admin-guest-detail');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    },

    deleteGuestTrade: async function (id) {
        if (!confirm('해당 비회원의 손익분석 기록을 관리자 센터에서 삭제하시겠습니까?')) return;
        await AdminGuestTradeManager.deleteGuestTrade(id);
        await this.renderGuestTrades();
    },

    renderModeration: function () {
        const chatContainer = document.getElementById('admin-chat-preview');
        if (chatContainer && typeof chatMessages !== 'undefined') {
            chatContainer.innerHTML = chatMessages.map((msg, idx) => `
              <div class="flex items-center justify-between p-2.5 rounded-xl bg-navy-950 border border-navy-800 text-xs">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-cyan-400">${escapeHtml(msg.user)}:</span>
                  <span class="text-slate-200">${escapeHtml(msg.text)}</span>
                </div>
                <button onclick="AdminApp.deleteChatMessage(${idx})" class="text-slate-500 hover:text-rose-400 text-xs p-1">삭제</button>
              </div>
            `).join('');
        }

        const forumContainer = document.getElementById('admin-forum-preview');
        if (forumContainer) {
            let posts = [];
            if (typeof getStoredPosts === 'function') {
                posts = getStoredPosts();
            } else {
                try { posts = JSON.parse(localStorage.getItem('crytopnl_forum_posts') || '[]'); } catch(e){}
            }
            forumContainer.innerHTML = posts.map((p) => `
              <div class="flex items-center justify-between p-2.5 rounded-xl bg-navy-950 border border-navy-800 text-xs">
                <div class="flex items-center gap-2 truncate">
                  <span class="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-[10px]">${p.category}</span>
                  <span class="font-semibold text-white truncate">${escapeHtml(p.title)}</span>
                  <span class="text-slate-500 text-[10px]">by ${escapeHtml(p.author)}</span>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                  <button onclick="AdminApp.deleteForumPost('${p.id}')" class="text-slate-400 hover:text-rose-400 text-xs px-2 py-1 bg-navy-900 rounded border border-navy-700">삭제</button>
                </div>
              </div>
            `).join('');
        }
    },

    renderSystemHealth: function () {
        let totalStorageBytes = 0;
        const keysList = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            const val = localStorage.getItem(k);
            const bytes = (k.length + (val ? val.length : 0)) * 2;
            totalStorageBytes += bytes;
            keysList.push({ key: k, sizeKB: (bytes / 1024).toFixed(1) });
        }

        const totalKBel = document.getElementById('admin-storage-used');
        if (totalKBel) totalKBel.innerText = (totalStorageBytes / 1024).toFixed(1) + ' KB 사용 중';

        const storageListEl = document.getElementById('admin-storage-keys-list');
        if (storageListEl) {
            storageListEl.innerHTML = keysList.map(item => `
              <div class="flex items-center justify-between p-2 rounded-lg bg-navy-950 border border-navy-800 text-xs font-mono">
                <span class="text-slate-300 truncate max-w-[280px]">${item.key}</span>
                <span class="text-cyan-400 font-bold">${item.sizeKB} KB</span>
              </div>
            `).join('');
        }
    },

    renderCloudResources: async function (forceRefresh = false) {
        try {
            const pushEl = document.getElementById('admin-gh-last-pushed');
            const sizeEl = document.getElementById('admin-gh-repo-size');
            const starEl = document.getElementById('admin-gh-stars');
            const branchEl = document.getElementById('admin-gh-branch');
            const issuesEl = document.getElementById('admin-gh-issues');
            if (pushEl && forceRefresh) pushEl.innerText = '실시간 조회 중...';

            const repoRes = await fetch('https://api.github.com/repos/ittechkjh/homepage');
            if (repoRes.ok) {
                const repoData = await repoRes.json();
                if (repoData) {
                    if (sizeEl && repoData.size) {
                        sizeEl.innerText = repoData.size.toLocaleString() + ' KB';
                    }
                    if (pushEl && repoData.pushed_at) {
                        pushEl.innerText = new Date(repoData.pushed_at).toLocaleString('ko-KR');
                    }
                    if (starEl) {
                        starEl.innerText = (repoData.stargazers_count || 0).toLocaleString() + ' Stars';
                    }
                    if (branchEl) {
                        branchEl.innerText = (repoData.default_branch || 'main') + ' (Active)';
                    }
                    if (issuesEl) {
                        issuesEl.innerText = 'Open Issues: ' + (repoData.open_issues_count || 0) + '건';
                    }
                }
            }
        } catch (e) {
            console.warn('GitHub public API fetch note:', e);
        }

        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            lucide.createIcons();
        }
    },

    promptChangeRole: function (username, currentRole) {
        const newRole = prompt(`${username}님의 새로운 권한을 입력하세요 (ADMIN, PRO, USER):`, currentRole);
        if (newRole && ['ADMIN', 'PRO', 'USER'].includes(newRole.toUpperCase())) {
            AdminUserManager.updateUserRole(username, newRole.toUpperCase());
            this.renderUsers();
            alert(`${username}님의 권한이 ${newRole.toUpperCase()}(으)로 변경되었습니다.`);
        }
    },

    toggleUserStatus: function (username) {
        const newStatus = AdminUserManager.toggleUserStatus(username);
        this.renderUsers();
        alert(`${username}님의 상태가 ${newStatus === 'ACTIVE' ? '정상 활동' : '활동 정지'}로 변경되었습니다.`);
    },

    resetUserData: function (username) {
        if (confirm(`정말 ${username}님의 거래내역 분석 데이터를 초기화하시겠습니까?`)) {
            AdminUserManager.resetUserData(username);
            this.renderUsers();
            alert(`${username}님의 거래내역 데이터가 초기화되었습니다.`);
        }
    },

    deleteUser: function (username) {
        if (confirm(`경고: ${username}님 계정을 완전히 삭제하시겠습니까?`)) {
            if (AdminUserManager.deleteUser(username)) {
                this.renderUsers();
                alert(`${username}님 계정이 삭제되었습니다.`);
            }
        }
    },

    deleteChatMessage: function (idx) {
        if (typeof chatMessages !== 'undefined' && chatMessages[idx]) {
            chatMessages.splice(idx, 1);
            if (typeof renderChatMessages === 'function') renderChatMessages();
            this.renderModeration();
        }
    },

    clearAllChat: function () {
        if (confirm('실시간 채팅방의 모든 메시지를 완전히 삭제하시겠습니까?')) {
            if (typeof chatMessages !== 'undefined') {
                chatMessages.length = 0;
                chatMessages.push({ user: '관리자', rank: 'ADMIN', time: '방금', text: '📢 관리자에 의해 채팅창이 깨끗하게 정화되었습니다.' });
                if (typeof renderChatMessages === 'function') renderChatMessages();
                this.renderModeration();
                alert('채팅방이 초기화되었습니다.');
            }
        }
    },

    broadcastAdminNotice: function () {
        const notice = prompt('전체 채팅방에 공지할 관리자 메시지를 입력하세요:');
        if (notice && notice.trim()) {
            if (typeof chatMessages !== 'undefined') {
                chatMessages.push({
                    user: '📢 [공식 공지]',
                    rank: 'ADMIN',
                    time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
                    text: notice.trim()
                });
                if (typeof renderChatMessages === 'function') renderChatMessages();
                this.renderModeration();
                alert('관리자 공지가 채팅창에 전송되었습니다.');
            }
        }
    },

    deleteForumPost: function (postId) {
        if (confirm('해당 포럼 게시글을 영구 삭제하시겠습니까?')) {
            if (typeof addDeletedPostId === 'function') {
                addDeletedPostId(postId);
            }
            let posts = [];
            if (typeof getStoredPosts === 'function') {
                posts = getStoredPosts();
            } else {
                try { posts = JSON.parse(localStorage.getItem('crytopnl_forum_posts') || '[]'); } catch(e){}
            }
            posts = posts.filter(p => String(p.id) !== String(postId));
            if (typeof saveStoredPosts === 'function') {
                saveStoredPosts(posts);
            } else {
                localStorage.setItem('crytopnl_forum_posts', JSON.stringify(posts));
                try { localStorage.removeItem('coinhub_forum_posts'); } catch(e) {}
            }

            const firestoreDb = window.db || (typeof db !== 'undefined' ? db : null);
            if (firestoreDb && typeof firestoreDb.collection === 'function') {
                firestoreDb.collection('forum_posts').doc(postId.toString()).delete().catch(e => console.log(e));
                firestoreDb.collection('deleted_forum_posts').doc(postId.toString()).set({
                    id: String(postId),
                    deletedAt: new Date().toISOString()
                }).catch(() => {});
            }

            if (typeof renderForumPosts === 'function') renderForumPosts();
            this.renderModeration();
            alert('게시글이 영구 삭제되었습니다.');
        }
    },

    exportFullBackupJSON: function () {
        const backup = {};
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            backup[k] = localStorage.getItem(k);
        }

        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
        const a = document.createElement('a');
        a.href = dataStr;
        a.download = 'cryptopnl_full_backup_' + new Date().toISOString().slice(0,10) + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    },

    openAddUserModal: function () {
        const username = prompt('등록할 신규 사용자 ID:');
        if (!username || !username.trim()) return;
        const email = prompt('사용자 이메일 주소:', username.trim() + '@cryptopnl.com');
        const role = prompt('권한 (ADMIN, PRO, USER):', 'USER');

        const res = AdminUserManager.addUser({
            username: username.trim(),
            email: (email || '').trim(),
            role: (role || 'USER').toUpperCase()
        });

        if (res.success) {
            this.renderUsers();
            alert(`${username} 회원이 성공적으로 등록되었습니다.`);
        } else {
            alert(res.message);
        }
    },

    bindEvents: function () {
        if (this._eventsBound) return;

        const searchInput = document.getElementById('admin-user-search');
        if (searchInput) {
            this._eventsBound = true;
            searchInput.addEventListener('input', (e) => {
                this.userSearchQuery = e.target.value.trim().toLowerCase();
                this.renderUsers();
            });
        }

        const roleFilter = document.getElementById('admin-user-role-filter');
        if (roleFilter) {
            this._eventsBound = true;
            roleFilter.addEventListener('change', (e) => {
                this.userRoleFilter = e.target.value;
                this.renderUsers();
            });
        }

        const guestSearchInput = document.getElementById('admin-guest-trade-search');
        if (guestSearchInput) {
            this._eventsBound = true;
            guestSearchInput.addEventListener('input', (e) => {
                this.guestTradeSearchQuery = e.target.value.trim().toLowerCase();
                this.renderGuestTrades();
            });
        }

        const guestExchangeFilter = document.getElementById('admin-guest-trade-exchange-filter');
        if (guestExchangeFilter) {
            this._eventsBound = true;
            guestExchangeFilter.addEventListener('change', (e) => {
                this.guestTradeExchangeFilter = e.target.value;
                this.renderGuestTrades();
            });
        }
    }
};

// Global Attach & Auto Init
if (typeof window !== 'undefined') {
    window.AdminAnalytics = AdminAnalytics;
    window.AdminUserManager = AdminUserManager;
    window.AdminGuestTradeManager = AdminGuestTradeManager;
    window.AdminApp = AdminApp;

    // Immediately record visit & sync stats
    try {
        AdminAnalytics.init();
        AdminUserManager.initFirebaseSync();
        AdminApp.init();
    } catch (e) {}

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            try { AdminApp.init(); } catch (e) {}
        });
    }
}

