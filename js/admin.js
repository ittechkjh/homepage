/**
 * admin.js
 * 코인허브(CoinHub) 통합 관리자 센터 엔진
 * - 일일 방문자 수 및 트래픽 분석 (DAU, WAU, PV, 실시간 접속자)
 * - 회원 계정 및 권한 관리 (ADMIN, PRO, USER, 계정 정지, 거래내역 관리)
 * - 커뮤니티 포럼 & 실시간 채팅 모니터링 및 제어
 * - 시스템 스토리지 진단 및 전체 데이터 백업/복원
 */

const AdminAnalytics = {
    STORAGE_KEY: 'coinhub_admin_analytics',

    init: function () {
        this.recordVisit();
    },

    getAnalyticsData: function () {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (raw) {
                return JSON.parse(raw);
            }
        } catch (e) {}

        // 초기 기본 14일 방문자 통계 생성
        return this.generateSeedAnalytics();
    },

    generateSeedAnalytics: function () {
        const history = [];
        const today = new Date();
        const baseDailyVisitors = [
            1120, 1250, 1180, 1340, 1420, 1290, 1380,
            1450, 1510, 1480, 1620, 1580, 1690, 1780
        ];

        for (let i = 13; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().slice(0, 10);
            const visitors = baseDailyVisitors[13 - i] + Math.floor(Math.random() * 80 - 40);
            const pageviews = Math.round(visitors * (3.8 + Math.random() * 0.8));

            history.push({
                date: dateStr,
                visitors: visitors,
                pageviews: pageviews
            });
        }

        const data = {
            totalVisitorsAllTime: 48920,
            totalPageviewsAllTime: 186450,
            history: history,
            devices: { mobile: 64, desktop: 36 },
            browsers: { chrome: 66, safari: 21, samsung: 8, edge: 5 },
            features: { analyzer: 44, market: 27, news: 18, community: 11 }
        };

        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        } catch (e) {}

        return data;
    },

    recordVisit: function () {
        try {
            const data = this.getAnalyticsData();
            const todayStr = new Date().toISOString().slice(0, 10);
            let todayEntry = data.history.find(h => h.date === todayStr);

            if (!todayEntry) {
                todayEntry = { date: todayStr, visitors: 1, pageviews: 1 };
                data.history.push(todayEntry);
                if (data.history.length > 30) data.history.shift();
            } else {
                todayEntry.visitors += 1;
                todayEntry.pageviews += Math.floor(Math.random() * 3 + 1);
            }

            data.totalVisitorsAllTime += 1;
            data.totalPageviewsAllTime += 2;

            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        } catch (e) {}
    },

    getTodayStats: function () {
        const data = this.getAnalyticsData();
        const todayStr = new Date().toISOString().slice(0, 10);
        const today = data.history.find(h => h.date === todayStr) || { visitors: 1780, pageviews: 6840 };
        const yesterday = data.history[data.history.length - 2] || { visitors: 1690, pageviews: 6420 };

        const weeklyVisitors = data.history.slice(-7).reduce((sum, h) => sum + h.visitors, 0);
        const monthlyVisitors = data.history.reduce((sum, h) => sum + h.visitors, 0);

        const growthRate = yesterday.visitors > 0 
            ? (((today.visitors - yesterday.visitors) / yesterday.visitors) * 100).toFixed(1)
            : '+5.4';

        // 실시간 접속자 시뮬레이션 (38 ~ 56명 사이 유동)
        const liveUsers = Math.floor(42 + Math.sin(Date.now() / 60000) * 12 + Math.random() * 5);

        return {
            todayVisitors: today.visitors,
            todayPageviews: today.pageviews,
            yesterdayVisitors: yesterday.visitors,
            growthRate: (growthRate >= 0 ? '+' : '') + growthRate + '%',
            weeklyVisitors,
            monthlyVisitors,
            liveUsers,
            totalVisitorsAllTime: data.totalVisitorsAllTime,
            totalPageviewsAllTime: data.totalPageviewsAllTime,
            history: data.history,
            devices: data.devices,
            browsers: data.browsers,
            features: data.features
        };
    }
};

const AdminUserManager = {
    STORAGE_KEY: 'coinhub_registered_users',

    getUsers: function () {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed;
                }
            }
        } catch (e) {}

        return this.generateSeedUsers();
    },

    generateSeedUsers: function () {
        const users = [
            {
                id: 'usr_admin',
                username: 'admin',
                email: 'admin@coinhub.kr',
                role: 'ADMIN',
                status: 'ACTIVE',
                joinedDate: '2025.10.15',
                lastLogin: '방금 전 (온라인)',
                reputation: 9999,
                tradesCount: 14850,
                memo: '최고 관리자 계정'
            },
            {
                id: 'usr_sunggong',
                username: '성공',
                email: 'sunggong@naver.com',
                role: 'ADMIN',
                status: 'ACTIVE',
                joinedDate: '2026.01.10',
                lastLogin: '방금 전 (온라인)',
                reputation: 150,
                tradesCount: 14930,
                memo: '운영자 계정'
            },
            {
                id: 'usr_satoshi',
                username: 'Satoshi_Fan',
                email: 'satoshi_btc@gmail.com',
                role: 'PRO',
                status: 'ACTIVE',
                joinedDate: '2026.02.04',
                lastLogin: '10분 전',
                reputation: 420,
                tradesCount: 840,
                memo: '비트코인 장기 홀더'
            },
            {
                id: 'usr_whale',
                username: 'CryptoWhale',
                email: 'whale99@protonmail.com',
                role: 'PRO',
                status: 'ACTIVE',
                joinedDate: '2026.03.18',
                lastLogin: '25분 전',
                reputation: 890,
                tradesCount: 3210,
                memo: '대형 고래 트레이더'
            },
            {
                id: 'usr_solana',
                username: 'SolanaKing',
                email: 'sol_king@daum.net',
                role: 'USER',
                status: 'ACTIVE',
                joinedDate: '2026.05.22',
                lastLogin: '1시간 전',
                reputation: 95,
                tradesCount: 120,
                memo: '솔라나 생태계 유저'
            },
            {
                id: 'usr_peace',
                username: 'PeacefulTrader',
                email: 'peace_trade@kakao.com',
                role: 'USER',
                status: 'ACTIVE',
                joinedDate: '2026.06.30',
                lastLogin: '3시간 전',
                reputation: 210,
                tradesCount: 450,
                memo: '분할매수 트레이더'
            },
            {
                id: 'usr_spammer',
                username: 'CoinSpammer99',
                email: 'spam_bot@tempmail.com',
                role: 'USER',
                status: 'SUSPENDED',
                joinedDate: '2026.08.20',
                lastLogin: '3일 전',
                reputation: -50,
                tradesCount: 0,
                memo: '리딩방 홍보성 스팸 계정 (정지됨)'
            }
        ];

        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(users));
        } catch (e) {}

        return users;
    },

    saveUsers: function (users) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(users));
        } catch (e) {}
    },

    updateUserRole: function (username, newRole) {
        const users = this.getUsers();
        const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
        if (user) {
            user.role = newRole;
            this.saveUsers(users);
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
            return true;
        } catch (e) {
            return false;
        }
    },

    deleteUser: function (username) {
        let users = this.getUsers();
        users = users.filter(u => u.username.toLowerCase() !== username.toLowerCase());
        this.saveUsers(users);
        this.resetUserData(username);
        return true;
    },

    addUser: function (newUser) {
        const users = this.getUsers();
        if (users.some(u => u.username.toLowerCase() === newUser.username.toLowerCase())) {
            return { success: false, message: '이미 존재하는 사용자명입니다.' };
        }

        users.unshift({
            id: 'usr_' + Date.now(),
            username: newUser.username.trim(),
            email: newUser.email.trim(),
            role: newUser.role || 'USER',
            status: 'ACTIVE',
            joinedDate: new Date().toISOString().slice(0, 10).replace(/-/g, '.'),
            lastLogin: '신규 등록',
            reputation: newUser.role === 'ADMIN' ? 9999 : (newUser.role === 'PRO' ? 150 : 50),
            tradesCount: 0,
            memo: newUser.memo || '관리자 수동 등록'
        });

        this.saveUsers(users);
        return { success: true };
    }
};

const AdminApp = {
    activeSubTab: 'analytics',
    userSearchQuery: '',
    userRoleFilter: 'ALL',
    userStatusFilter: 'ALL',

    init: function () {
        AdminAnalytics.init();
        this.bindEvents();
        this.checkAdminStatus();
    },

    checkAdminStatus: function () {
        const u = (function() { try { return JSON.parse(localStorage.getItem('coinhub_user')); } catch(e){ return null; } })();
        const isAdmin = u && (u.role === 'ADMIN' || u.username === 'admin' || u.username === '성공');
        
        // Show/hide admin navigation buttons
        const adminNavBtn = document.getElementById('nav-admin');
        const adminMNavBtn = document.getElementById('m-nav-admin');
        if (adminNavBtn) adminNavBtn.style.display = 'flex'; // Always accessible or highlighted for admin
        if (adminMNavBtn) adminMNavBtn.style.display = 'flex';

        return isAdmin;
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
        } else if (tabId === 'moderation') {
            this.renderModeration();
        } else if (tabId === 'system') {
            this.renderSystemHealth();
        }
    },

    renderAll: function () {
        this.renderAnalytics();
        this.renderUsers();
        this.renderModeration();
        this.renderSystemHealth();
    },

    renderAnalytics: function () {
        const stats = AdminAnalytics.getTodayStats();

        // 1. KPI Cards
        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
        setVal('admin-today-visitors', stats.todayVisitors.toLocaleString() + '명');
        setVal('admin-today-growth', stats.growthRate + ' vs 어제 (' + stats.yesterdayVisitors.toLocaleString() + '명)');
        setVal('admin-live-users', stats.liveUsers + '명 (실시간 동시접속)');
        setVal('admin-weekly-visitors', stats.weeklyVisitors.toLocaleString() + '명');
        setVal('admin-total-pageviews', stats.totalPageviewsAllTime.toLocaleString() + ' PV');

        // 2. Daily Visitor Bar Chart (14 days)
        const chartContainer = document.getElementById('admin-visitor-chart');
        if (chartContainer) {
            const maxVal = Math.max(...stats.history.map(h => h.visitors), 2000);
            chartContainer.innerHTML = stats.history.map(h => {
                const heightPct = Math.round((h.visitors / maxVal) * 100);
                const shortDate = h.date.slice(5);
                return `
                  <div class="flex flex-col items-center flex-1 h-full justify-end group relative">
                    <div class="absolute -top-7 bg-navy-950 text-cyan-400 text-[10px] font-bold px-2 py-0.5 rounded border border-navy-700 opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-10">
                      ${h.visitors.toLocaleString()}명 (${h.pageviews.toLocaleString()} PV)
                    </div>
                    <div class="w-full max-w-[28px] bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t-md hover:brightness-125 transition-all shadow-md shadow-cyan-500/20" style="height: ${heightPct}%;"></div>
                    <span class="text-[9px] text-slate-400 mt-2 font-mono">${shortDate}</span>
                  </div>
                `;
            }).join('');
        }
    },

    renderUsers: function () {
        const users = AdminUserManager.getUsers();
        const tbody = document.getElementById('admin-users-table-body');
        if (!tbody) return;

        let filtered = users.filter(u => {
            const matchQuery = !this.userSearchQuery || 
                u.username.toLowerCase().includes(this.userSearchQuery) || 
                u.email.toLowerCase().includes(this.userSearchQuery);
            const matchRole = this.userRoleFilter === 'ALL' || u.role === this.userRoleFilter;
            const matchStatus = this.userStatusFilter === 'ALL' || u.status === this.userStatusFilter;
            return matchQuery && matchRole && matchStatus;
        });

        const totalUserCountEl = document.getElementById('admin-total-users-count');
        if (totalUserCountEl) totalUserCountEl.innerText = users.length + '명 등록됨';

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-slate-400 text-xs">일치하는 사용자 계정이 없습니다.</td></tr>';
            return;
        }

        tbody.innerHTML = filtered.map(u => {
            const roleBadge = u.role === 'ADMIN' 
                ? '<span class="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30 text-[10px] font-bold">👑 ADMIN</span>'
                : (u.role === 'PRO' 
                    ? '<span class="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[10px] font-bold">⚡ PRO</span>'
                    : '<span class="px-2 py-0.5 rounded bg-slate-700 text-slate-300 text-[10px]">USER</span>');

            const statusBadge = u.status === 'ACTIVE'
                ? '<span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">● 정상 활동</span>'
                : '<span class="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold">⛔ 활동 정지</span>';

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
                <td class="py-3 px-4 font-mono font-semibold text-right text-cyan-400">${(u.tradesCount || 0).toLocaleString()}건</td>
                <td class="py-3 px-4 text-slate-400 text-[11px]">${u.lastLogin}</td>
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
    },

    renderModeration: function () {
        // Chat messages preview
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

        // Forum posts preview
        const forumContainer = document.getElementById('admin-forum-preview');
        if (forumContainer) {
            let posts = [];
            try { posts = JSON.parse(localStorage.getItem('coinhub_forum_posts') || '[]'); } catch(e){}
            forumContainer.innerHTML = posts.map((p, idx) => `
              <div class="flex items-center justify-between p-2.5 rounded-xl bg-navy-950 border border-navy-800 text-xs">
                <div class="flex items-center gap-2 truncate">
                  <span class="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-[10px]">${p.category}</span>
                  <span class="font-semibold text-white truncate">${escapeHtml(p.title)}</span>
                  <span class="text-slate-500 text-[10px]">by ${escapeHtml(p.author)}</span>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                  <button onclick="AdminApp.deleteForumPost(${p.id})" class="text-slate-400 hover:text-rose-400 text-xs px-2 py-1 bg-navy-900 rounded border border-navy-700">삭제</button>
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
            const bytes = (k.length + val.length) * 2;
            totalStorageBytes += bytes;
            keysList.push({ key: k, sizeKB: (bytes / 1024).toFixed(1) });
        }

        const totalKBel = document.getElementById('admin-storage-used');
        if (totalKBel) totalKBel.innerText = (totalStorageBytes / 1024).toFixed(1) + ' KB 사용 중 (총 5MB 중)';

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
            AdminUserManager.deleteUser(username);
            this.renderUsers();
            alert(`${username}님 계정이 삭제되었습니다.`);
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
            let posts = [];
            try { posts = JSON.parse(localStorage.getItem('coinhub_forum_posts') || '[]'); } catch(e){}
            posts = posts.filter(p => p.id !== postId);
            localStorage.setItem('coinhub_forum_posts', JSON.stringify(posts));
            if (typeof renderForumPosts === 'function') renderForumPosts();
            this.renderModeration();
            alert('게시글이 삭제되었습니다.');
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
        a.download = 'coinhub_full_backup_' + new Date().toISOString().slice(0,10) + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    },

    openAddUserModal: function () {
        const username = prompt('등록할 신규 사용자 ID:');
        if (!username || !username.trim()) return;
        const email = prompt('사용자 이메일 주소:', username.trim() + '@coinhub.kr');
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
        const searchInput = document.getElementById('admin-user-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.userSearchQuery = e.target.value.trim().toLowerCase();
                this.renderUsers();
            });
        }

        const roleFilter = document.getElementById('admin-user-role-filter');
        if (roleFilter) {
            roleFilter.addEventListener('change', (e) => {
                this.userRoleFilter = e.target.value;
                this.renderUsers();
            });
        }
    }
};

// Global Attach
if (typeof window !== 'undefined') {
    window.AdminAnalytics = AdminAnalytics;
    window.AdminUserManager = AdminUserManager;
    window.AdminApp = AdminApp;
}
