/**
 * Crypto Marble (크립토 마블 - 모두의 마블 스타일 보드게임)
 * Pure Client-Side (No Backend Required) Game Engine
 * Features:
 *  - 24-tile board loop (Crypto Coins, Exchanges, Special Events, Tax, SEC Prison, Space Rocket)
 *  - 1P vs AI Bot ('사토시 AI') or 2P Local Pass-and-Play
 *  - Building upgrades (Hold -> Staking Node -> Mining Farm -> Whale HQ Landmark)
 *  - Line Monopoly, Triple Monopoly, & Bankruptcy victory conditions
 *  - Web Audio API pure synthesized sound effects (no external audio assets required)
 *  - Golden Key event card draws with crypto-themed events
 *  - Real-time event log & animated dice roll
 */

(function(window) {
  'use strict';

  // --- 1. Pure Web Audio Synthesizer ---
  class SoundEffects {
    constructor() {
      this.ctx = null;
      this.enabled = localStorage.getItem('crypto_game_sound') !== 'false';
    }

    initCtx() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    toggle() {
      this.enabled = !this.enabled;
      localStorage.setItem('crypto_game_sound', this.enabled ? 'true' : 'false');
      return this.enabled;
    }

    playTone(freq, type, duration, startVol = 0.15) {
      if (!this.enabled) return;
      try {
        this.initCtx();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(startVol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      } catch (e) {}
    }

    diceRoll() {
      if (!this.enabled) return;
      for (let i = 0; i < 4; i++) {
        setTimeout(() => {
          this.playTone(180 + Math.random() * 220, 'triangle', 0.05, 0.1);
        }, i * 60);
      }
    }

    buy() {
      if (!this.enabled) return;
      this.playTone(523.25, 'sine', 0.1, 0.2); // C5
      setTimeout(() => this.playTone(659.25, 'sine', 0.15, 0.2), 80); // E5
      setTimeout(() => this.playTone(783.99, 'sine', 0.25, 0.25), 160); // G5
    }

    toll() {
      if (!this.enabled) return;
      this.playTone(329.63, 'sawtooth', 0.15, 0.18); // E4
      setTimeout(() => this.playTone(261.63, 'sawtooth', 0.25, 0.2), 120); // C4
    }

    jail() {
      if (!this.enabled) return;
      this.playTone(160, 'square', 0.2, 0.25);
      setTimeout(() => this.playTone(130, 'square', 0.35, 0.3), 150);
    }

    rocket() {
      if (!this.enabled) return;
      try {
        this.initCtx();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.4);
      } catch (e) {}
    }

    victory() {
      if (!this.enabled) return;
      const notes = [523, 659, 784, 1046];
      notes.forEach((n, idx) => {
        setTimeout(() => this.playTone(n, 'triangle', 0.3, 0.25), idx * 120);
      });
    }

    goldenKey() {
      if (!this.enabled) return;
      this.playTone(880, 'sine', 0.1, 0.2);
      setTimeout(() => this.playTone(1174.66, 'sine', 0.2, 0.2), 90);
    }
  }

  const sfx = new SoundEffects();

  // --- 2. Board Tiles Definition (24 Tiles Clockwise Loop) ---
  const BOARD_TILES = [
    // Bottom row (0..6)
    { id: 0, type: 'start', name: '출발지 (START)', color: 'gray', price: 0, toll: 0, line: 0, icon: 'flag' },
    { id: 1, type: 'special', name: '업비트 거래소', color: 'emerald', price: 500000, toll: 200000, line: 0, icon: 'building' },
    { id: 2, type: 'coin', name: '도지코인 (DOGE)', color: 'amber', price: 600000, toll: 100000, group: 1, line: 0, symbol: 'DOGE' },
    { id: 3, type: 'event', name: '황금열쇠 ❓', color: 'purple', price: 0, toll: 0, line: 0, icon: 'key' },
    { id: 4, type: 'coin', name: '시바이누 (SHIB)', color: 'amber', price: 800000, toll: 150000, group: 1, line: 0, symbol: 'SHIB' },
    { id: 5, type: 'coin', name: '리플 (XRP)', color: 'cyan', price: 1000000, toll: 200000, group: 2, line: 0, symbol: 'XRP' },
    // Left column (6..12)
    { id: 6, type: 'jail', name: 'SEC 조사국 (감옥)', color: 'rose', price: 0, toll: 0, line: 1, icon: 'shield-alert' },
    { id: 7, type: 'coin', name: '에이다 (ADA)', color: 'cyan', price: 1200000, toll: 250000, group: 2, line: 1, symbol: 'ADA' },
    { id: 8, type: 'event', name: '황금열쇠 ❓', color: 'purple', price: 0, toll: 0, line: 1, icon: 'key' },
    { id: 9, type: 'coin', name: '아발란체 (AVAX)', color: 'indigo', price: 1400000, toll: 300000, group: 3, line: 1, symbol: 'AVAX' },
    { id: 10, type: 'coin', name: '체인링크 (LINK)', color: 'indigo', price: 1600000, toll: 350000, group: 3, line: 1, symbol: 'LINK' },
    { id: 11, type: 'tax', name: '가상자산 과세', color: 'rose', price: 0, toll: 0, line: 1, icon: 'receipt' },
    // Top row (12..18)
    { id: 12, type: 'rest', name: '고래 요트 (휴양지)', color: 'teal', price: 0, toll: 0, line: 2, icon: 'anchor' },
    { id: 13, type: 'coin', name: '니어프로토콜 (NEAR)', color: 'emerald', price: 1800000, toll: 400000, group: 4, line: 2, symbol: 'NEAR' },
    { id: 14, type: 'coin', name: '솔라나 (SOL)', color: 'emerald', price: 2200000, toll: 500000, group: 4, line: 2, symbol: 'SOL' },
    { id: 15, type: 'event', name: '황금열쇠 ❓', color: 'purple', price: 0, toll: 0, line: 2, icon: 'key' },
    { id: 16, type: 'special', name: '바이낸스 거래소', color: 'amber', price: 2600000, toll: 700000, line: 2, icon: 'globe' },
    { id: 17, type: 'coin', name: '이더리움 (ETH)', color: 'blue', price: 3000000, toll: 800000, group: 5, line: 2, symbol: 'ETH' },
    // Right column (18..23)
    { id: 18, type: 'space', name: '화성 직행 우주선', color: 'fuchsia', price: 0, toll: 0, line: 3, icon: 'rocket' },
    { id: 19, type: 'coin', name: '비트코인캐시 (BCH)', color: 'blue', price: 3200000, toll: 850000, group: 5, line: 3, symbol: 'BCH' },
    { id: 20, type: 'event', name: '황금열쇠 ❓', color: 'purple', price: 0, toll: 0, line: 3, icon: 'key' },
    { id: 21, type: 'coin', name: '비트코인 (BTC)', color: 'gold', price: 4000000, toll: 1200000, group: 6, line: 3, symbol: 'BTC' },
    { id: 22, type: 'gamble', name: '선물 롱/숏 찬스', color: 'purple', price: 0, toll: 0, line: 3, icon: 'zap' },
    { id: 23, type: 'airdrop', name: '슈퍼 에어드랍', color: 'cyan', price: 0, toll: 0, line: 3, icon: 'gift' }
  ];

  const LEVEL_NAMES = ['단순 보유', '스테이킹 노드', '채굴 공장', '👑 고래 랜드마크'];
  const TOLL_MULTIPLIERS = [1, 2.5, 4, 8];
  const UPGRADE_COSTS = [0, 0.5, 0.8, 1.2];

  const GOLDEN_KEY_DECK = [
    {
      title: '일론 머스크의 트윗 폭풍! 🚀',
      desc: '일론 머스크가 당신의 포트폴리오를 트윗했습니다! 보유한 모든 자산의 통행료가 다음 1회 동안 2배로 폭등합니다.',
      action: (game, player) => {
        player.buffDoubleToll = true;
        game.log(`📢 [황금열쇠] ${player.name}: 모든 자산 통행료 2배 부스트 획득!`);
      }
    },
    {
      title: '선물 100배 레버리지 롱 청산 📉',
      desc: '갑작스러운 플래시 덤프로 마진콜이 발생했습니다. 증거금 80만 원을 긴급 납부합니다.',
      action: (game, player) => {
        const penalty = Math.min(player.money, 800000);
        player.money -= penalty;
        game.log(`🚨 [황금열쇠] ${player.name}: 긴급 마진콜로 ${game.formatMoney(penalty)} 납부.`);
      }
    },
    {
      title: '바이낸스 런치패드 에어드랍 대박! 🎁',
      desc: '신규 프로젝트 상장 에어드랍에 당첨되었습니다! 즉시 현금 120만 원을 지급받습니다.',
      action: (game, player) => {
        player.money += 1200000;
        game.log(`💰 [황금열쇠] ${player.name}: 런치패드 에어드랍으로 120만 원 수령!`);
      }
    },
    {
      title: 'SEC 긴급 청문회 소환장 🏛️',
      desc: '증권성 코인 심사 대상에 올랐습니다. 즉시 SEC 조사국(감옥)으로 강제 이동됩니다.',
      action: (game, player) => {
        player.position = 6;
        player.jailTurns = 2;
        sfx.jail();
        game.log(`🚨 [황금열쇠] ${player.name}: SEC 조사국(감옥)으로 강제 압송되었습니다!`);
      }
    },
    {
      title: '화성 직행 우주선 발사대 탑승 🛸',
      desc: '스페이스X 우주선에 탑승합니다. 다음 턴에 원하는 칸 어디든 자유롭게 날아갈 수 있습니다!',
      action: (game, player) => {
        player.position = 18;
        player.isSpaceReady = true;
        sfx.rocket();
        game.log(`🛸 [황금열쇠] ${player.name}: 우주정거장으로 순간이동 완료!`);
      }
    },
    {
      title: '기관 자금 ETF 대규모 유입 🏦',
      desc: '비트코인 현물 ETF로 기록적인 순유입이 발생했습니다. 축하 보너스로 300만 원을 받습니다.',
      action: (game, player) => {
        player.money += 3000000;
        game.log(`🏦 [황금열쇠] ${player.name}: ETF 호재 보너스로 300만 원 수령!`);
      }
    },
    {
      title: '고래 지갑의 전송 수수료 면제권 🛡️',
      desc: '다음 1회 상대방 땅에 걸렸을 때 통행료를 100% 면제받는 쉴드를 획득합니다.',
      action: (game, player) => {
        player.shieldCount = (player.shieldCount || 0) + 1;
        game.log(`🛡️ [황금열쇠] ${player.name}: 통행료 1회 면제 쉴드 획득! (보유: ${player.shieldCount}개)`);
      }
    }
  ];

  // --- 3. Main Game Engine ---
  class CryptoMarbleGame {
    constructor() {
      this.mode = 'ai';
      this.speed = 1;
      this.turn = 0;
      this.activePlayerIdx = 0;
      this.isRolling = false;
      this.gameOver = false;
      this.logs = [];

      this.players = [
        {
          id: 0,
          name: '나의 트레이더',
          avatar: '👨‍💻',
          isAI: false,
          color: 'cyan',
          money: 10000000,
          position: 0,
          jailTurns: 0,
          isSpaceReady: false,
          shieldCount: 0,
          buffDoubleToll: false,
          properties: []
        },
        {
          id: 1,
          name: '사토시 AI',
          avatar: '🤖',
          isAI: true,
          color: 'purple',
          money: 10000000,
          position: 0,
          jailTurns: 0,
          isSpaceReady: false,
          shieldCount: 0,
          buffDoubleToll: false,
          properties: []
        }
      ];

      this.ownership = {};
      this.initBoardTiles();
    }

    initBoardTiles() {
      this.ownership = {};
      BOARD_TILES.forEach(t => {
        if (t.type === 'coin' || t.type === 'special') {
          this.ownership[t.id] = null;
        }
      });
    }

    reset(mode = 'ai') {
      this.mode = mode;
      this.turn = 0;
      this.activePlayerIdx = 0;
      this.isRolling = false;
      this.gameOver = false;
      this.logs = [];

      const storedUser = localStorage.getItem('crytopnl_user') || localStorage.getItem('coinhub_user');
      let p1Name = '나의 트레이더';
      if (storedUser) {
        try {
          const u = JSON.parse(storedUser);
          if (u && u.username) p1Name = u.username;
        } catch(e) {}
      }

      this.players[0].name = p1Name;
      this.players[0].money = 10000000;
      this.players[0].position = 0;
      this.players[0].jailTurns = 0;
      this.players[0].isSpaceReady = false;
      this.players[0].shieldCount = 0;
      this.players[0].buffDoubleToll = false;
      this.players[0].properties = [];

      this.players[1].name = mode === 'ai' ? '사토시 AI' : '플레이어 2';
      this.players[1].isAI = mode === 'ai';
      this.players[1].avatar = mode === 'ai' ? '🤖' : '👩‍💼';
      this.players[1].money = 10000000;
      this.players[1].position = 0;
      this.players[1].jailTurns = 0;
      this.players[1].isSpaceReady = false;
      this.players[1].shieldCount = 0;
      this.players[1].buffDoubleToll = false;
      this.players[1].properties = [];

      this.initBoardTiles();
      this.log(`🎮 게임이 시작되었습니다! (${mode === 'ai' ? '1인 vs 사토시 AI' : '2인 로컬 대전'})`);
      this.render();
    }

    formatMoney(val) {
      if (val >= 100000000) {
        return (val / 100000000).toFixed(2) + '억';
      }
      if (val >= 10000) {
        return Math.floor(val / 10000).toLocaleString() + '만 원';
      }
      return (val || 0).toLocaleString() + '원';
    }

    log(msg) {
      const time = new Date().toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      this.logs.unshift({ time, msg });
      if (this.logs.length > 50) this.logs.pop();
      this.renderLogs();
    }

    getActivePlayer() {
      return this.players[this.activePlayerIdx];
    }

    getOpponent() {
      return this.players[1 - this.activePlayerIdx];
    }

    rollDice() {
      if (this.isRolling || this.gameOver) return;
      const player = this.getActivePlayer();

      if (player.isSpaceReady) {
        player.isSpaceReady = false;
        if (player.isAI) {
          this.executeAISpaceTravel();
        } else {
          this.openSpaceTravelModal();
        }
        return;
      }

      if (player.jailTurns > 0) {
        this.handleJailTurn(player);
        return;
      }

      this.isRolling = true;
      sfx.diceRoll();

      const diceContainer = document.getElementById('marble-dice-container');
      if (diceContainer) diceContainer.classList.add('animate-bounce');

      setTimeout(() => {
        if (diceContainer) diceContainer.classList.remove('animate-bounce');
        const d1 = Math.floor(Math.random() * 6) + 1;
        const d2 = Math.floor(Math.random() * 6) + 1;
        const isDouble = (d1 === d2);
        const total = d1 + d2;

        this.updateDiceUI(d1, d2);
        this.log(`🎲 [주사위] ${player.name}: (${d1}, ${d2}) = ${total}칸 이동! ${isDouble ? '🎉 더블!' : ''}`);

        this.movePlayerSteps(player, total, () => {
          this.handleTileLanding(player, isDouble);
        });
      }, 450);
    }

    handleJailTurn(player) {
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      this.updateDiceUI(d1, d2);

      if (d1 === d2) {
        player.jailTurns = 0;
        this.log(`🎉 [SEC 조사국] ${player.name}: 주사위 더블(${d1}, ${d2})로 즉시 석방!`);
        this.movePlayerSteps(player, d1 + d2, () => {
          this.handleTileLanding(player, true);
        });
      } else {
        player.jailTurns--;
        if (player.jailTurns === 0) {
          this.log(`⚖️ [SEC 조사국] ${player.name}: 조사 기간 만료. 다음 턴부터 정상 이동합니다.`);
        } else {
          this.log(`🔒 [SEC 조사국] ${player.name}: 석방 실패 (더블 미달성). 잔여 턴: ${player.jailTurns}턴`);
        }
        this.endTurn(false);
      }
    }

    updateDiceUI(d1, d2) {
      const el1 = document.getElementById('dice-val-1');
      const el2 = document.getElementById('dice-val-2');
      if (el1) el1.innerText = d1;
      if (el2) el2.innerText = d2;
    }

    movePlayerSteps(player, steps, callback) {
      let remaining = steps;
      const stepInterval = setInterval(() => {
        player.position = (player.position + 1) % 24;
        sfx.playTone(380 + player.position * 15, 'triangle', 0.04, 0.08);

        if (player.position === 0) {
          player.money += 3000000;
          sfx.buy();
          this.log(`🏁 [출발지 통과] ${player.name}: 완주 축하금 3,000,000 KRW 수령!`);
        }

        this.renderBoard();
        remaining--;

        if (remaining <= 0) {
          clearInterval(stepInterval);
          setTimeout(() => {
            if (callback) callback();
          }, 200);
        }
      }, 140);
    }

    handleTileLanding(player, isDouble) {
      const tile = BOARD_TILES[player.position];

      if (tile.type === 'start') {
        this.log(`📍 [출발지 도착] ${player.name}: 휴식을 취합니다.`);
        this.endTurn(isDouble);
      } else if (tile.type === 'coin' || tile.type === 'special') {
        this.handlePropertyLanding(player, tile, isDouble);
      } else if (tile.type === 'event') {
        this.handleEventLanding(player, isDouble);
      } else if (tile.type === 'jail') {
        player.jailTurns = 2;
        sfx.jail();
        this.log(`🚨 [SEC 조사국 도착] ${player.name}: 금융 규제 위반 혐의로 2턴간 억류됩니다.`);
        this.endTurn(false);
      } else if (tile.type === 'rest') {
        this.log(`🏖️ [고래의 요트] ${player.name}: 샴페인을 마시며 1턴간 휴양을 즐깁니다.`);
        this.endTurn(isDouble);
      } else if (tile.type === 'space') {
        player.isSpaceReady = true;
        sfx.rocket();
        this.log(`🚀 [화성 직행 우주선] ${player.name}: 발사 준비 완료! 다음 턴에 원하는 칸으로 이동합니다.`);
        this.endTurn(isDouble);
      } else if (tile.type === 'tax') {
        const tax = Math.floor(player.money * 0.1);
        player.money -= tax;
        sfx.toll();
        this.log(`🏛️ [국세청 과세] ${player.name}: 가상자산 양도소득세 10%(${this.formatMoney(tax)}) 원천징수.`);
        this.checkBankruptcy(player);
        this.endTurn(isDouble);
      } else if (tile.type === 'gamble') {
        this.handleGambleLanding(player, isDouble);
      } else if (tile.type === 'airdrop') {
        const bonus = 1500000;
        player.money += bonus;
        sfx.buy();
        this.log(`🎁 [슈퍼 에어드랍] ${player.name}: 신규 프로젝트 토큰 150만 원 수령!`);
        this.endTurn(isDouble);
      } else {
        this.endTurn(isDouble);
      }
    }

    handlePropertyLanding(player, tile, isDouble) {
      const prop = this.ownership[tile.id];
      const opponent = this.getOpponent();

      if (!prop) {
        if (player.isAI) {
          this.executeAIPurchase(player, tile, isDouble);
        } else {
          this.openPurchaseModal(player, tile, isDouble);
        }
        return;
      }

      if (prop.owner === player.id) {
        if (prop.level < 3 && tile.type === 'coin') {
          if (player.isAI) {
            this.executeAIUpgrade(player, tile, isDouble);
          } else {
            this.openUpgradeModal(player, tile, isDouble);
          }
        } else {
          this.log(`🏰 [내 자산 방문] ${player.name}: ${tile.name}에 도착했습니다.`);
          this.endTurn(isDouble);
        }
        return;
      }

      if (prop.owner === opponent.id) {
        let baseToll = tile.toll * TOLL_MULTIPLIERS[prop.level];
        if (opponent.buffDoubleToll) {
          baseToll *= 2;
          opponent.buffDoubleToll = false;
        }

        if (player.shieldCount > 0) {
          player.shieldCount--;
          this.log(`🛡️ [통행료 방어] ${player.name}: 쉴드를 사용하여 통행료 전액 면제!`);
          this.endTurn(isDouble);
          return;
        }

        player.money -= baseToll;
        opponent.money += baseToll;
        sfx.toll();
        this.log(`💸 [통행료 지불] ${player.name} -> ${opponent.name}: ${tile.name} 통행료 ${this.formatMoney(baseToll)} 지불!`);

        if (this.checkBankruptcy(player)) return;

        const takeoverCost = Math.floor(tile.price * (1 + UPGRADE_COSTS[prop.level]) * 2);
        if (prop.level < 3 && player.money >= takeoverCost) {
          if (player.isAI) {
            this.executeAITakeover(player, tile, takeoverCost, isDouble);
          } else {
            this.openTakeoverModal(player, tile, takeoverCost, isDouble);
          }
        } else {
          this.endTurn(isDouble);
        }
      }
    }

    handleEventLanding(player, isDouble) {
      sfx.goldenKey();
      const card = GOLDEN_KEY_DECK[Math.floor(Math.random() * GOLDEN_KEY_DECK.length)];
      this.openEventModal(card, () => {
        card.action(this, player);
        this.checkBankruptcy(player);
        this.endTurn(isDouble);
      });
    }

    handleGambleLanding(player, isDouble) {
      const isWin = Math.random() > 0.45;
      const bet = 500000;
      if (player.money >= bet) {
        if (isWin) {
          player.money += bet;
          sfx.buy();
          this.log(`⚡ [선물 찬스] ${player.name}: 롱 포지션 적중! +500,000 KRW 수익.`);
        } else {
          player.money -= bet;
          sfx.toll();
          this.log(`📉 [선물 찬스] ${player.name}: 변동성으로 손절 -500,000 KRW.`);
        }
      }
      this.checkBankruptcy(player);
      this.endTurn(isDouble);
    }

    endTurn(rollAgain = false) {
      this.isRolling = false;
      this.render();

      if (this.checkMonopoly()) return;

      if (rollAgain && !this.gameOver) {
        this.log(`🎯 [더블 보너스] ${this.getActivePlayer().name}의 연속 턴!`);
        if (this.getActivePlayer().isAI) {
          setTimeout(() => this.rollDice(), 800);
        }
        return;
      }

      this.activePlayerIdx = 1 - this.activePlayerIdx;
      this.turn++;
      this.render();

      if (this.getActivePlayer().isAI && !this.gameOver) {
        setTimeout(() => this.rollDice(), 900);
      }
    }

    checkBankruptcy(player) {
      if (player.money <= 0) {
        this.gameOver = true;
        const winner = this.getOpponent();
        sfx.victory();
        this.log(`💀 [파산] ${player.name}의 잔고가 모두 소진되었습니다! ${winner.name}의 파산 승리!`);
        this.openVictoryModal(winner, '파산 승리 (Bankruptcy Win)', '상대방의 자금을 완전히 소진시키고 크립토 시장을 통일했습니다!');
        return true;
      }
      return false;
    }

    checkMonopoly() {
      // 1. Line Monopoly
      for (let line = 0; line < 4; line++) {
        const lineCoins = BOARD_TILES.filter(t => t.line === line && t.type === 'coin');
        if (lineCoins.length > 0) {
          for (let pIdx = 0; pIdx < 2; pIdx++) {
            const allOwned = lineCoins.every(t => this.ownership[t.id] && this.ownership[t.id].owner === pIdx);
            if (allOwned) {
              this.gameOver = true;
              const winner = this.players[pIdx];
              sfx.victory();
              this.log(`🏆 [라인 독점 승리!] ${winner.name}가 ${line + 1}구역의 모든 코인을 독점했습니다!`);
              this.openVictoryModal(winner, '라인 독점 승리 (Line Monopoly)', `${line + 1}번 라인의 전 종목을 장악하여 시장 독점에 성공했습니다!`);
              return true;
            }
          }
        }
      }

      // 2. Triple Monopoly
      for (let pIdx = 0; pIdx < 2; pIdx++) {
        const groups = [1, 2, 3, 4, 5, 6];
        let ownedGroups = 0;
        groups.forEach(g => {
          const groupCoins = BOARD_TILES.filter(t => t.group === g);
          if (groupCoins.length > 0 && groupCoins.every(t => this.ownership[t.id] && this.ownership[t.id].owner === pIdx)) {
            ownedGroups++;
          }
        });
        if (ownedGroups >= 3) {
          this.gameOver = true;
          const winner = this.players[pIdx];
          sfx.victory();
          this.log(`👑 [트리플 독점 승리!] ${winner.name}가 3개 섹터를 완벽 독점했습니다!`);
          this.openVictoryModal(winner, '트리플 독점 승리 (Triple Monopoly)', '3대 코인 카테고리를 완벽하게 장악하여 암호화폐 거물로 등극했습니다!');
          return true;
        }
      }

      return false;
    }

    executeAIPurchase(ai, tile, isDouble) {
      if (ai.money >= tile.price * 1.4) {
        ai.money -= tile.price;
        this.ownership[tile.id] = { owner: ai.id, level: 0 };
        ai.properties.push(tile.id);
        sfx.buy();
        this.log(`🤖 [AI 매수] ${ai.name}: ${tile.name}을(를) ${this.formatMoney(tile.price)}에 매수했습니다.`);
      } else {
        this.log(`🤖 [AI 패스] ${ai.name}: 현금 유동성 확보를 위해 매수를 보류했습니다.`);
      }
      this.endTurn(isDouble);
    }

    executeAIUpgrade(ai, tile, isDouble) {
      const prop = this.ownership[tile.id];
      const upgradeCost = Math.floor(tile.price * UPGRADE_COSTS[prop.level + 1]);
      if (ai.money >= upgradeCost * 2) {
        ai.money -= upgradeCost;
        prop.level++;
        sfx.buy();
        this.log(`🏗️ [AI 증축] ${ai.name}: ${tile.name}에 '${LEVEL_NAMES[prop.level]}'을(를) 증축했습니다.`);
      }
      this.endTurn(isDouble);
    }

    executeAITakeover(ai, tile, cost, isDouble) {
      if (ai.money >= cost * 2.2) {
        const opponent = this.getOpponent();
        ai.money -= cost;
        opponent.money += cost;
        this.ownership[tile.id].owner = ai.id;
        ai.properties.push(tile.id);
        opponent.properties = opponent.properties.filter(id => id !== tile.id);
        sfx.buy();
        this.log(`🔥 [AI 인수] ${ai.name}: ${opponent.name}의 ${tile.name}을(를) ${this.formatMoney(cost)}에 전격 인수했습니다!`);
      }
      this.endTurn(isDouble);
    }

    executeAISpaceTravel() {
      const targetTile = BOARD_TILES.find(t => (t.type === 'coin' || t.type === 'special') && (!this.ownership[t.id] || this.ownership[t.id].owner === 1)) || BOARD_TILES[21];
      this.players[1].position = targetTile.id;
      sfx.rocket();
      this.log(`🛸 [AI 우주비행] ${this.players[1].name}: ${targetTile.name} 칸으로 직행 비행했습니다!`);
      this.handleTileLanding(this.players[1], false);
    }

    openPurchaseModal(player, tile, isDouble) {
      const modal = document.getElementById('marble-action-modal');
      if (!modal) {
        this.endTurn(isDouble);
        return;
      }
      const titleEl = document.getElementById('modal-action-title');
      const bodyEl = document.getElementById('modal-action-body');
      const confirmBtn = document.getElementById('modal-action-confirm');
      const cancelBtn = document.getElementById('modal-action-cancel');

      if (titleEl) titleEl.innerText = `🪙 ${tile.name} 매수 제안`;
      if (bodyEl) {
        bodyEl.innerHTML = `
          <div class="space-y-3 text-xs sm:text-sm">
            <p class="text-slate-300">비어있는 암호화폐 자산입니다. 매수하여 통행료 수익을 창출하시겠습니까?</p>
            <div class="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-1.5 font-mono">
              <div class="flex justify-between text-slate-400"><span>매수가격</span><span class="text-cyan-400 font-bold">${this.formatMoney(tile.price)}</span></div>
              <div class="flex justify-between text-slate-400"><span>기본 통행료</span><span class="text-emerald-400 font-bold">${this.formatMoney(tile.toll)}</span></div>
              <div class="flex justify-between text-slate-400"><span>현재 잔고</span><span class="text-slate-200">${this.formatMoney(player.money)}</span></div>
            </div>
          </div>
        `;
      }

      confirmBtn.onclick = () => {
        if (player.money >= tile.price) {
          player.money -= tile.price;
          this.ownership[tile.id] = { owner: player.id, level: 0 };
          player.properties.push(tile.id);
          sfx.buy();
          this.log(`🪙 [매수 완료] ${player.name}: ${tile.name}을(를) ${this.formatMoney(tile.price)}에 매수했습니다.`);
        }
        modal.classList.add('hidden');
        this.endTurn(isDouble);
      };

      cancelBtn.onclick = () => {
        modal.classList.add('hidden');
        this.log(`✋ [매수 패스] ${player.name}: ${tile.name} 매수를 건너뛰었습니다.`);
        this.endTurn(isDouble);
      };

      confirmBtn.disabled = player.money < tile.price;
      modal.classList.remove('hidden');
    }

    openUpgradeModal(player, tile, isDouble) {
      const prop = this.ownership[tile.id];
      const nextLevel = prop.level + 1;
      const cost = Math.floor(tile.price * UPGRADE_COSTS[nextLevel]);
      const nextToll = Math.floor(tile.toll * TOLL_MULTIPLIERS[nextLevel]);

      const modal = document.getElementById('marble-action-modal');
      if (!modal) {
        this.endTurn(isDouble);
        return;
      }
      const titleEl = document.getElementById('modal-action-title');
      const bodyEl = document.getElementById('modal-action-body');
      const confirmBtn = document.getElementById('modal-action-confirm');
      const cancelBtn = document.getElementById('modal-action-cancel');

      if (titleEl) titleEl.innerText = `🏗️ ${tile.name} 자산 증축`;
      if (bodyEl) {
        bodyEl.innerHTML = `
          <div class="space-y-3 text-xs sm:text-sm">
            <p class="text-slate-300">보유 중인 자산을 업그레이드하여 통행료를 대폭 상승시키시겠습니까?</p>
            <div class="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-1.5 font-mono">
              <div class="flex justify-between text-slate-400"><span>증축 대상</span><span class="text-purple-400 font-bold">${LEVEL_NAMES[nextLevel]}</span></div>
              <div class="flex justify-between text-slate-400"><span>증축 비용</span><span class="text-cyan-400 font-bold">${this.formatMoney(cost)}</span></div>
              <div class="flex justify-between text-slate-400"><span>증축 후 통행료</span><span class="text-emerald-400 font-bold">${this.formatMoney(nextToll)}</span></div>
              ${nextLevel === 3 ? '<div class="text-amber-400 font-bold text-[11px] mt-1">👑 랜드마크 건설 시 상대방 인수 불가!</div>' : ''}
            </div>
          </div>
        `;
      }

      confirmBtn.onclick = () => {
        if (player.money >= cost) {
          player.money -= cost;
          prop.level = nextLevel;
          sfx.buy();
          this.log(`🏗️ [증축 완료] ${player.name}: ${tile.name}에 '${LEVEL_NAMES[nextLevel]}' 완공!`);
        }
        modal.classList.add('hidden');
        this.endTurn(isDouble);
      };

      cancelBtn.onclick = () => {
        modal.classList.add('hidden');
        this.endTurn(isDouble);
      };

      confirmBtn.disabled = player.money < cost;
      modal.classList.remove('hidden');
    }

    openTakeoverModal(player, tile, cost, isDouble) {
      const modal = document.getElementById('marble-action-modal');
      if (!modal) {
        this.endTurn(isDouble);
        return;
      }
      const titleEl = document.getElementById('modal-action-title');
      const bodyEl = document.getElementById('modal-action-body');
      const confirmBtn = document.getElementById('modal-action-confirm');
      const cancelBtn = document.getElementById('modal-action-cancel');
      const opponent = this.getOpponent();

      if (titleEl) titleEl.innerText = `🔥 ${tile.name} 적대적 인수`;
      if (bodyEl) {
        bodyEl.innerHTML = `
          <div class="space-y-3 text-xs sm:text-sm">
            <p class="text-slate-300">상대방의 자산을 2배 가격으로 적대적 인수(Takeover)하여 내 자산으로 전환할 수 있습니다!</p>
            <div class="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-1.5 font-mono">
              <div class="flex justify-between text-slate-400"><span>인수 비용</span><span class="text-rose-400 font-bold">${this.formatMoney(cost)}</span></div>
              <div class="flex justify-between text-slate-400"><span>현재 잔고</span><span class="text-slate-200">${this.formatMoney(player.money)}</span></div>
            </div>
          </div>
        `;
      }

      confirmBtn.onclick = () => {
        if (player.money >= cost) {
          player.money -= cost;
          opponent.money += cost;
          this.ownership[tile.id].owner = player.id;
          player.properties.push(tile.id);
          opponent.properties = opponent.properties.filter(id => id !== tile.id);
          sfx.buy();
          this.log(`🔥 [적대적 인수 성공] ${player.name}: ${opponent.name}의 ${tile.name}을(를) 전격 인수!`);
        }
        modal.classList.add('hidden');
        this.endTurn(isDouble);
      };

      cancelBtn.onclick = () => {
        modal.classList.add('hidden');
        this.endTurn(isDouble);
      };

      confirmBtn.disabled = player.money < cost;
      modal.classList.remove('hidden');
    }

    openEventModal(card, onComplete) {
      const modal = document.getElementById('marble-event-modal');
      if (!modal) {
        if (onComplete) onComplete();
        return;
      }
      const titleEl = document.getElementById('event-card-title');
      const descEl = document.getElementById('event-card-desc');
      const closeBtn = document.getElementById('event-card-close');

      if (titleEl) titleEl.innerText = card.title;
      if (descEl) descEl.innerText = card.desc;

      closeBtn.onclick = () => {
        modal.classList.add('hidden');
        if (onComplete) onComplete();
      };

      modal.classList.remove('hidden');
    }

    openSpaceTravelModal() {
      alert('🚀 화성 직행 우주선 발동!\n보드판 위의 원하는 타일을 직접 클릭하면 해당 칸으로 즉시 날아갑니다.');
      const tiles = document.querySelectorAll('.marble-tile');
      const handler = (e) => {
        const tileEl = e.currentTarget;
        const targetId = parseInt(tileEl.dataset.tileId, 10);
        if (!isNaN(targetId)) {
          tiles.forEach(t => t.removeEventListener('click', handler));
          this.getActivePlayer().position = targetId;
          sfx.rocket();
          this.log(`🛸 [우주 비행 완료] ${this.getActivePlayer().name}: ${BOARD_TILES[targetId].name} 칸으로 착륙!`);
          this.handleTileLanding(this.getActivePlayer(), false);
        }
      };
      tiles.forEach(t => t.addEventListener('click', handler));
    }

    openVictoryModal(winner, title, desc) {
      const modal = document.getElementById('marble-victory-modal');
      if (!modal) return;
      const titleEl = document.getElementById('victory-title');
      const winnerNameEl = document.getElementById('victory-winner-name');
      const descEl = document.getElementById('victory-desc');

      if (titleEl) titleEl.innerText = `🏆 ${title}`;
      if (winnerNameEl) winnerNameEl.innerText = `${winner.avatar} ${winner.name} 최종 승리!`;
      if (descEl) descEl.innerText = desc;

      modal.classList.remove('hidden');
    }

    render() {
      this.renderPlayerCards();
      this.renderBoard();
      this.renderControls();
    }

    renderPlayerCards() {
      this.players.forEach((p, idx) => {
        const prefix = idx === 0 ? 'p1' : 'p2';
        const nameEl = document.getElementById(`${prefix}-name`);
        const moneyEl = document.getElementById(`${prefix}-money`);
        const assetCountEl = document.getElementById(`${prefix}-assets`);
        const badgeEl = document.getElementById(`${prefix}-turn-badge`);
        const cardEl = document.getElementById(`${prefix}-card`);

        if (nameEl) nameEl.innerText = `${p.avatar} ${p.name}`;
        if (moneyEl) moneyEl.innerText = this.formatMoney(p.money);
        if (assetCountEl) assetCountEl.innerText = `자산 ${p.properties.length}개`;

        const isCurrentTurn = (this.activePlayerIdx === idx && !this.gameOver);
        if (badgeEl) {
          if (isCurrentTurn) {
            badgeEl.classList.remove('hidden');
          } else {
            badgeEl.classList.add('hidden');
          }
        }
        if (cardEl) {
          if (isCurrentTurn) {
            cardEl.classList.add('ring-2', idx === 0 ? 'ring-cyan-400' : 'ring-purple-400');
          } else {
            cardEl.classList.remove('ring-2', 'ring-cyan-400', 'ring-purple-400');
          }
        }
      });
    }

    renderBoard() {
      const grid = document.getElementById('marble-board-grid');
      if (!grid) return;

      const tileCoords = [
        { r: 7, c: 7 }, // 0 START
        { r: 7, c: 6 }, // 1 Upbit
        { r: 7, c: 5 }, // 2 Doge
        { r: 7, c: 4 }, // 3 Key
        { r: 7, c: 3 }, // 4 Shib
        { r: 7, c: 2 }, // 5 Ripple
        { r: 7, c: 1 }, // 6 SEC Jail
        { r: 6, c: 1 }, // 7 Ada
        { r: 5, c: 1 }, // 8 Key
        { r: 4, c: 1 }, // 9 Avax
        { r: 3, c: 1 }, // 10 Link
        { r: 2, c: 1 }, // 11 Tax
        { r: 1, c: 1 }, // 12 Whale Yacht
        { r: 1, c: 2 }, // 13 Near
        { r: 1, c: 3 }, // 14 Solana
        { r: 1, c: 4 }, // 15 Key
        { r: 1, c: 5 }, // 16 Binance
        { r: 1, c: 6 }, // 17 ETH
        { r: 1, c: 7 }, // 18 Rocket Space
        { r: 2, c: 7 }, // 19 BCH
        { r: 3, c: 7 }, // 20 Key
        { r: 4, c: 7 }, // 21 BTC
        { r: 5, c: 7 }, // 22 Gamble
        { r: 6, c: 7 }  // 23 Airdrop
      ];

      let html = '';
      BOARD_TILES.forEach((tile, idx) => {
        const coord = tileCoords[idx];
        const prop = this.ownership[tile.id];
        const hasP1 = (this.players[0].position === idx);
        const hasP2 = (this.players[1].position === idx);

        let ownerBadge = '';
        if (prop) {
          const ownerColor = prop.owner === 0 ? 'bg-cyan-500 text-navy-950 font-bold' : 'bg-purple-500 text-white font-bold';
          ownerBadge = `<div class="absolute top-1 right-1 px-1.5 py-0.2 rounded text-[8px] sm:text-[9px] shadow ${ownerColor}">${prop.level === 3 ? '👑' : ''}Lv.${prop.level}</div>`;
        }

        let playerTokens = '';
        if (hasP1 || hasP2) {
          playerTokens = `
            <div class="absolute inset-x-0 bottom-1 flex items-center justify-center gap-1 z-10">
              ${hasP1 ? '<span class="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-cyan-400 border border-white text-[9px] sm:text-[10px] text-navy-950 font-black flex items-center justify-center shadow-lg transform scale-110 animate-bounce">P1</span>' : ''}
              ${hasP2 ? '<span class="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-purple-500 border border-white text-[9px] sm:text-[10px] text-white font-black flex items-center justify-center shadow-lg transform scale-110 animate-bounce">P2</span>' : ''}
            </div>
          `;
        }

        const isCorner = [0, 6, 12, 18].includes(idx);
        const tileBg = isCorner ? 'bg-navy-850 hover:bg-navy-800' : 'bg-navy-900 hover:bg-navy-850';

        html += `
          <div data-tile-id="${idx}" class="marble-tile relative flex flex-col justify-between p-1 sm:p-2 rounded-lg sm:rounded-xl border border-navy-800/80 cursor-pointer select-none transition-all duration-200 overflow-hidden ${tileBg}" style="grid-row: ${coord.r}; grid-column: ${coord.c};">
            ${ownerBadge}
            <div class="text-[9px] sm:text-[11px] font-bold text-slate-200 truncate leading-tight">${tile.name}</div>
            <div class="text-[8px] sm:text-[10px] font-mono font-semibold text-slate-400">
              ${tile.price ? this.formatMoney(tile.price) : (tile.icon ? `<i data-lucide="${tile.icon}" class="w-3 h-3 inline text-cyan-400"></i>` : '')}
            </div>
            ${playerTokens}
          </div>
        `;
      });

      grid.innerHTML = html;
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    renderControls() {
      const rollBtn = document.getElementById('marble-roll-btn');
      const player = this.getActivePlayer();
      if (rollBtn) {
        if (this.gameOver) {
          rollBtn.disabled = true;
          rollBtn.innerText = '게임 종료';
        } else if (player.isAI) {
          rollBtn.disabled = true;
          rollBtn.innerHTML = '<span class="animate-pulse">🤖 사토시 AI 생각 중...</span>';
        } else {
          rollBtn.disabled = this.isRolling;
          rollBtn.innerHTML = '<i data-lucide="dice-5" class="w-5 h-5 inline mr-1.5"></i> 주사위 굴리기 (Roll)';
        }
      }
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    renderLogs() {
      const container = document.getElementById('marble-event-logs');
      if (!container) return;
      container.innerHTML = this.logs.map(l => `
        <div class="text-xs py-1 border-b border-navy-800/40 text-slate-300">
          <span class="text-slate-500 font-mono text-[10px] mr-1">[${l.time}]</span>
          <span>${l.msg}</span>
        </div>
      `).join('');
    }
  }

  // Expose global instance
  window.CryptoMarble = {
    game: null,
    init: function() {
      if (!this.game) {
        this.game = new CryptoMarbleGame();
      }
      this.game.reset(this.game.mode || 'ai');
      this.bindEvents();
    },
    bindEvents: function() {
      const rollBtn = document.getElementById('marble-roll-btn');
      if (rollBtn) {
        rollBtn.onclick = () => this.game.rollDice();
      }

      const restartBtn = document.getElementById('marble-restart-btn');
      if (restartBtn) {
        restartBtn.onclick = () => {
          if (confirm('게임을 새로 시작하시겠습니까?')) {
            this.game.reset(this.game.mode);
          }
        };
      }

      const modeAiBtn = document.getElementById('mode-ai-btn');
      const mode2pBtn = document.getElementById('mode-2p-btn');
      if (modeAiBtn && mode2pBtn) {
        modeAiBtn.onclick = () => {
          modeAiBtn.classList.add('active', 'bg-purple-600', 'text-white');
          modeAiBtn.classList.remove('text-slate-400');
          mode2pBtn.classList.remove('active', 'bg-purple-600', 'text-white');
          mode2pBtn.classList.add('text-slate-400');
          this.game.reset('ai');
        };
        mode2pBtn.onclick = () => {
          mode2pBtn.classList.add('active', 'bg-purple-600', 'text-white');
          mode2pBtn.classList.remove('text-slate-400');
          modeAiBtn.classList.remove('active', 'bg-purple-600', 'text-white');
          modeAiBtn.classList.add('text-slate-400');
          this.game.reset('2p');
        };
      }

      const soundToggleBtn = document.getElementById('marble-sound-btn');
      if (soundToggleBtn) {
        soundToggleBtn.onclick = () => {
          const on = sfx.toggle();
          soundToggleBtn.innerHTML = on ? '<i data-lucide="volume-2" class="w-4 h-4"></i>' : '<i data-lucide="volume-x" class="w-4 h-4 text-rose-400"></i>';
          if (typeof lucide !== 'undefined') lucide.createIcons();
        };
      }
    }
  };

})(window);
