/**
 * 2026 대한민국 근로소득 연말정산 정밀 모의계산기 & 절세 시뮬레이터
 * YearendTaxCalculator (Client-Side 100% Local Encryption)
 * 
 * - 2025/2026 대한민국 소득세법 및 조세특례제한법 최신 개정세법 완전 반영
 * - 근로소득공제, 인적공제, 연금보험료공제, 특별소득공제(건강/장기요양/고용/주택청약/전세자금)
 * - 신용카드/체크카드/현금영수증/전통시장/대중교통 소득공제 (총급여 25% 초과분)
 * - 8단계 종합소득세 누진세율 (6% ~ 45%)
 * - 근로소득세액공제, 자녀세액공제, 연금계좌세액공제(연금저축/IRP), 특별세액공제(보험/의료/교육/기부/월세)
 * - 13월의 월급 환급액/추가납부액 및 실효세율 정밀 산출
 * - IRP/연금저축 추가 절세 시뮬레이션 및 맞춤형 가이드
 */

const YearendTaxCalculator = (function() {
  'use strict';

  // State
  const defaultState = {
    // 1. 소득 정보
    annualSalary: 50000000,      // 총급여액 (원)
    nonTaxableIncome: 2400000,   // 비과세소득 (식대 등)
    paidTaxMethod: 'auto',       // 'auto' (표준 100% 원천징수 추정) 또는 'manual'
    manualPaidTax: 2500000,      // 직접 입력 기납부세액 (소득세+지방소득세)

    // 2. 인적 공제
    hasSpouse: false,            // 배우자 공제 (연소득 100만 이하)
    childrenYouthCount: 0,       // 청소년/초중고 자녀 (만 8세~20세: 기본공제 150만 + 자녀세액공제 + 교육비 300만 한도)
    childrenInfantCount: 0,      // 미취학 아동 (만 7세 이하: 기본공제 150만 + 미취학 교육비 300만 한도)
    childrenAdultCount: 0,       // 성인 자녀 (만 20세 초과: 기본공제 제외, 대학생 교육비 900만 + 카드합산 가능)
    childrenCount: 0,            // (하위호환용 미성년 자녀 수)
    eldersCount: 0,              // 60세~69세 부모님/직계존속 수 (1인당 150만 소득공제)
    isSeniorElder: 0,            // 70세 이상 경로우대 어르신 수 (1인당 250만 + 의료비 한도 무제한)
    disabledCount: 0,            // 장애인 부양가족 수 (1인당 350만 + 나이제한 없음 + 의료비/특수교육비 무제한)
    isSingleParent: false,       // 한부모 추가공제
    isFemaleHead: false,         // 부녀자 추가공제
    coupleDepYouth: 0,           // 맞벌이 탭: 청소년 자녀 수
    coupleDepInfant: 0,          // 맞벌이 탭: 미취학 아동 수
    coupleDepAdult: 0,           // 맞벌이 탭: 성인 자녀 수
    coupleDepElderNormal: 0,     // 맞벌이 탭: 60~69세 부모님 수
    coupleDepElderSenior: 0,     // 맞벌이 탭: 70세 이상 경로우대 노인 수
    coupleDepDisabled: 0,        // 맞벌이 탭: 장애인 부양가족 수

    // 3. 소득공제 (카드 및 주택)
    creditCard: 12000000,        // 신용카드 사용액
    debitCard: 8000000,          // 체크카드/현금영수증 사용액
    marketTransit: 1000000,      // 전통시장 / 대중교통 사용액
    housingSavings: 1200000,     // 주택청약종합저축 납입액 (무주택 세대주)
    rentLoanRepay: 0,            // 전세자금대출 원리금 상환액

    // 4. 세액공제
    pensionSavings: 3000000,     // 연금저축 납입액 (최대 600만)
    irpSavings: 3000000,         // IRP 퇴직연금 납입액 (합산 최대 900만)
    insurance: 1000000,          // 보장성 보험료 (한도 100만)
    medical: 1500000,            // 일반 의료비 지출액 (총급여 3% 초과분)
    education: 0,                // 교육비 지출액
    donationLoveHometown: 100000,// 고향사랑기부금 (10만원 100% 환급)
    donationGeneral: 0,          // 일반 기부금
    monthlyRent: 0,              // 월세액 (무주택 세대주, 총급여 7천만 이하)

    // 5. 맞벌이 부부 비교 & 전략
    currentSubTab: 'calculator', // 'calculator' | 'couple' | 'cards'
    coupleMode: false,           // 맞벌이 활성화
    spouseSalary: 42000000,      // 배우자 총급여액 (원)
    spousePrepaidTax: 1650000,   // 배우자 기납부세액 (원)
    familyExpenseTotal: 28000000,// 부부 합산 연간 소비 규모 (원)
    familyMedicalTotal: 1800000, // 부부 합산 연간 의료비 지출 (원)

    // 6. 소득구간별 카드 vs 현금 가이드
    guideSalary: 50000000        // 황금소비 가이드 기준 연봉 (원)
  };

  let state = { ...defaultState };

  // Helper: Format Won
  function formatWon(num) {
    if (isNaN(num) || num === null || num === undefined) return '0원';
    const rounded = Math.round(num);
    return rounded.toLocaleString('ko-KR') + '원';
  }

  // Helper: Format Comma
  function formatComma(num) {
    if (isNaN(num) || num === null || num === undefined) return '0';
    const rounded = Math.round(num);
    return rounded.toLocaleString('ko-KR');
  }

  // Real-time Comma Formatter for input elements (preserves cursor)
  function formatInputWithCommas(input) {
    if (!input) return;
    const oldVal = input.value || '';
    const cursor = input.selectionStart ?? oldVal.length;
    const digitsBefore = (oldVal.slice(0, cursor).match(/\d/g) || []).length;

    const raw = oldVal.replace(/[^0-9]/g, '');
    if (!raw) {
      input.value = '';
      return;
    }
    const num = parseInt(raw, 10);
    const formatted = num.toLocaleString('ko-KR');
    input.value = formatted;

    let newCursor = formatted.length;
    let digitsCount = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (/\d/.test(formatted[i])) digitsCount++;
      if (digitsCount === digitsBefore) {
        newCursor = i + 1;
        break;
      }
    }
    try {
      input.setSelectionRange(newCursor, newCursor);
    } catch(e) {}
  }

  // 1. 근로소득공제 계산 (소득세법 제47조)
  function calcEarnedIncomeDeduction(salary) {
    if (salary <= 0) return 0;
    let deduction = 0;
    if (salary <= 5000000) {
      deduction = salary * 0.70;
    } else if (salary <= 15000000) {
      deduction = 3500000 + (salary - 5000000) * 0.40;
    } else if (salary <= 45000000) {
      deduction = 7500000 + (salary - 15000000) * 0.15;
    } else if (salary <= 100000000) {
      deduction = 12000000 + (salary - 45000000) * 0.05;
    } else {
      deduction = 14750000 + (salary - 100000000) * 0.02;
    }
    return Math.min(20000000, deduction);
  }

  // 2. 종합소득세 기본세율 계산 (8단계 초과누진세율, 소득세법 제55조)
  function calcBaseTax(taxBase) {
    if (taxBase <= 0) return 0;
    if (taxBase <= 14000000) {
      return taxBase * 0.06;
    } else if (taxBase <= 50000000) {
      return taxBase * 0.15 - 1260000;
    } else if (taxBase <= 88000000) {
      return taxBase * 0.24 - 5760000;
    } else if (taxBase <= 150000000) {
      return taxBase * 0.35 - 15440000;
    } else if (taxBase <= 300000000) {
      return taxBase * 0.38 - 19940000;
    } else if (taxBase <= 500000000) {
      return taxBase * 0.40 - 25940000;
    } else if (taxBase <= 1000000000) {
      return taxBase * 0.42 - 35940000;
    } else {
      return taxBase * 0.45 - 65940000;
    }
  }

  // 3. 근로소득 세액공제 계산 (소득세법 제59조)
  function calcEarnedIncomeTaxCredit(calculatedTax, salary) {
    if (calculatedTax <= 0) return 0;
    let credit = 0;
    if (calculatedTax <= 1300000) {
      credit = calculatedTax * 0.55;
    } else {
      credit = 715000 + (calculatedTax - 1300000) * 0.30;
    }

    // 한도 계산
    let limit = 740000;
    if (salary > 33000000 && salary <= 70000000) {
      limit = Math.max(660000, 740000 - (salary - 33000000) * 0.008);
    } else if (salary > 70000000) {
      limit = Math.max(500000, 660000 - (salary - 70000000) * 0.50);
    }
    return Math.min(credit, limit);
  }

  // 4. 신용카드 등 소득공제 계산 (조세특례제한법 제126조의2)
  function calcCardDeduction(salary, creditCard, debitCard, marketTransit) {
    const threshold = salary * 0.25; // 총급여의 25%
    const totalSpent = creditCard + debitCard + marketTransit;
    if (totalSpent <= threshold) return 0;

    let remainingThreshold = threshold;

    // 1) 신용카드 사용분에서 최저사용금액 우선 차감
    let creditDeductible = 0;
    if (creditCard >= remainingThreshold) {
      creditDeductible = (creditCard - remainingThreshold) * 0.15;
      remainingThreshold = 0;
    } else {
      remainingThreshold -= creditCard;
    }

    // 2) 체크카드/현금영수증 차감
    let debitDeductible = 0;
    if (debitCard >= remainingThreshold) {
      debitDeductible = (debitCard - remainingThreshold) * 0.30;
      remainingThreshold = 0;
    } else {
      remainingThreshold -= debitCard;
    }

    // 3) 전통시장/대중교통 (40% 공제, 2024~2026 정책 한시 적용)
    let marketDeductible = 0;
    if (marketTransit >= remainingThreshold) {
      marketDeductible = (marketTransit - remainingThreshold) * 0.40;
      remainingThreshold = 0;
    }

    let calculatedDeduction = creditDeductible + debitDeductible + marketDeductible;

    // 기본 한도 (급여 기준)
    let basicLimit = 3000000;
    if (salary > 70000000 && salary <= 120000000) {
      basicLimit = 2500000;
    } else if (salary > 120000000) {
      basicLimit = 2000000;
    }

    // 전통시장/대중교통 추가 한도 100만원
    const totalLimit = basicLimit + Math.min(1000000, marketDeductible);
    return Math.min(totalLimit, calculatedDeduction);
  }

  // 5. 종합소득세 과세표준 구간별 한계세율(Marginal Tax Rate)
  function getMarginalTaxRate(taxBase) {
    if (taxBase <= 14000000) return { rate: 6, fullRate: 6.6, label: '6% (지방세 포함 6.6%)' };
    if (taxBase <= 50000000) return { rate: 15, fullRate: 16.5, label: '15% (지방세 포함 16.5%)' };
    if (taxBase <= 88000000) return { rate: 24, fullRate: 26.4, label: '24% (지방세 포함 26.4%)' };
    if (taxBase <= 150000000) return { rate: 35, fullRate: 38.5, label: '35% (지방세 포함 38.5%)' };
    if (taxBase <= 300000000) return { rate: 38, fullRate: 41.8, label: '38% (지방세 포함 41.8%)' };
    if (taxBase <= 500000000) return { rate: 40, fullRate: 44.0, label: '40% (지방세 포함 44.0%)' };
    if (taxBase <= 1000000000) return { rate: 42, fullRate: 46.2, label: '42% (지방세 포함 46.2%)' };
    return { rate: 45, fullRate: 49.5, label: '45% (지방세 포함 49.5%)' };
  }

  // 6. 맞벌이 부부 비교 및 절세 분석 로직
  function analyzeCouple(pSalary, sSalary, familyExpense, familyMedical, depOptions = {}) {
    const pEarnedDeduct = calcEarnedIncomeDeduction(pSalary);
    const sEarnedDeduct = calcEarnedIncomeDeduction(sSalary);

    const pTaxBase = Math.max(0, pSalary - pEarnedDeduct - 1500000 - Math.min(pSalary * 0.085, 6000000));
    const sTaxBase = Math.max(0, sSalary - sEarnedDeduct - 1500000 - Math.min(sSalary * 0.085, 6000000));

    const pRate = getMarginalTaxRate(pTaxBase);
    const sRate = getMarginalTaxRate(sTaxBase);

    const isPrimaryHigher = pSalary >= sSalary;
    const higherName = isPrimaryHigher ? '본인' : '배우자';
    const lowerName = isPrimaryHigher ? '배우자' : '본인';
    const higherSalary = Math.max(pSalary, sSalary);
    const lowerSalary = Math.min(pSalary, sSalary);
    const higherTaxBase = Math.max(pTaxBase, sTaxBase);
    const lowerTaxBase = Math.min(pTaxBase, sTaxBase);
    const higherRate = isPrimaryHigher ? pRate : sRate;
    const lowerRate = isPrimaryHigher ? sRate : pRate;
    const rateDiff = higherRate.rate - lowerRate.rate;

    // 25% 카드 문턱
    const pHurdle = pSalary * 0.25;
    const sHurdle = sSalary * 0.25;
    const higherHurdle = higherSalary * 0.25;
    const lowerHurdle = lowerSalary * 0.25;

    // 3% 의료비 문턱
    const pMedHurdle = pSalary * 0.03;
    const sMedHurdle = sSalary * 0.03;
    const higherMedHurdle = higherSalary * 0.03;
    const lowerMedHurdle = lowerSalary * 0.03;

    // 카드 한도
    const getCardLimit = (sal) => {
      if (sal <= 70000000) return 3000000;
      if (sal <= 120000000) return 2500000;
      return 2000000;
    };
    const higherCardLimit = getCardLimit(higherSalary);
    const lowerCardLimit = getCardLimit(lowerSalary);

    // 카드 소비 배분 전략
    let cardStrategy = {};
    const higherCheckNeeded = Math.round(higherCardLimit / 0.3);
    const higherOptimumTotal = higherHurdle + higherCheckNeeded;
    const lowerCheckNeeded = Math.round(lowerCardLimit / 0.3);
    const lowerOptimumTotal = lowerHurdle + lowerCheckNeeded;

    let flowHtml = '';

    if (familyExpense < lowerHurdle) {
      cardStrategy = {
        target: '신용카드 혜택 중심',
        headline: '부부 합산 소비가 적어 양쪽 모두 25% 문턱을 넘지 못합니다.',
        badge: '소비 미달',
        badgeColor: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
        detail: `부부 합산 연간 소비(${formatWon(familyExpense)})가 소득이 낮은 ${lowerName}의 25% 문턱(${formatWon(lowerHurdle)})에도 미달합니다. 세법상 카드 소득공제는 0원이므로 무리한 지출 대신 마일리지·캐시백 혜택이 가장 큰 신용카드를 집중 사용하세요.`,
        step1Title: '1단계: 신용카드 혜택 집중 결제',
        step1: `• 💳 부부 합산 소비가 누구의 25% 문턱에도 미치지 못하므로, 공제율 대신 <strong>항공 마일리지나 캐시백 혜택이 가장 좋은 신용카드</strong>를 집중 결제하세요.`,
        step2Title: '2단계: 카드 외 다른 절세 금융상품 활용',
        step2: `• 💡 카드 공제는 0원이므로, <strong>연금저축/IRP(최대 16.5% 세액공제)</strong> 또는 주택청약종합저축으로 절세 혜택을 챙기시는 것을 적극 추천합니다.`
      };

      flowHtml = `
        <div class="space-y-2">
          <div class="flex items-center justify-between text-xs font-bold text-amber-300">
            <span class="flex items-center gap-1.5">
              <i data-lucide="git-merge" class="w-4 h-4 text-amber-400"></i>
              <span>[총 소비 흐름] 25% 문턱 미달 구간</span>
            </span>
            <span class="text-[10px] text-slate-400 font-normal">카드사 포인트/마일리지 집중</span>
          </div>
          <div class="p-2.5 bg-navy-900/90 rounded-xl border border-navy-800 text-[11px] text-slate-300 font-mono flex flex-wrap items-center justify-between gap-1">
            <span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">0원</span>
            <span class="text-slate-400 text-[10px] sm:text-[11px]">── [혜택 신용카드 결제] ──▶</span>
            <span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">${formatWon(familyExpense)}</span>
            <span class="text-slate-400 text-[10px] sm:text-[11px]">── [25% 문턱 ${formatWon(lowerHurdle)} 미달] ──▶</span>
            <span class="px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-bold">공제 0원 (카드혜택 집중)</span>
          </div>
        </div>
      `;
    } else if (familyExpense < higherHurdle) {
      cardStrategy = {
        target: `${lowerName} 명의 카드 집중 사용`,
        headline: `소득이 낮은 ${lowerName} 명의 카드로 몰아야 공제를 챙깁니다!`,
        badge: `${lowerName} 몰아주기 추천`,
        badgeColor: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
        detail: `부부 합산 소비(${formatWon(familyExpense)})가 고소득자인 ${higherName}의 25% 문턱(${formatWon(higherHurdle)})에는 못 미치지만, ${lowerName}의 문턱(${formatWon(lowerHurdle)})은 넉넉히 넘깁니다. 고소득자 카드로 긁으면 공제액이 0원이 되므로, 반드시 ${lowerName} 명의 카드로 집중 결제하세요!`,
        step1Title: `1단계: ${lowerName} 신용카드 결제 구간`,
        step1: `• 💳 <strong>0원 ~ ${formatWon(lowerHurdle)}</strong> (총급여 25%까지): 공제율이 0%이므로 카드사 포인트/마일리지 혜택 챙기기`,
        step2Title: `2단계: ${lowerName} 체크카드·현금영수증 집중 구간`,
        step2: `• 💵 <strong>${formatWon(lowerHurdle)} 초과분</strong>: 30% 공제율이 적용되는 체크카드/현금영수증으로 결제하여 소득공제 혜택 극대화`
      };

      flowHtml = `
        <div class="space-y-2.5">
          <div class="flex items-center justify-between text-xs font-bold text-amber-300">
            <span class="flex items-center gap-1.5">
              <i data-lucide="git-merge" class="w-4 h-4 text-amber-400"></i>
              <span>[총 소비 흐름] 문턱 낮은 ${lowerName} 명의 집중</span>
            </span>
            <span class="text-[10px] text-emerald-300 font-bold">${lowerName} 몰아주기</span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div class="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <div class="flex justify-between items-center text-[11px] font-bold text-amber-400 mb-1">
                <span>1단계: 0원 ~ ${formatWon(lowerHurdle)}</span>
                <span class="px-1.5 py-0.2 bg-amber-500/20 rounded text-[10px]">공제 0%</span>
              </div>
              <div class="font-bold text-white text-xs">${lowerName} 신용카드</div>
              <p class="text-[10px] text-slate-300 mt-0.5 leading-snug">총급여 25% 문턱까지 포인트·마일리지 챙기기</p>
            </div>
            <div class="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <div class="flex justify-between items-center text-[11px] font-bold text-emerald-400 mb-1">
                <span>2단계: ${formatWon(lowerHurdle)} 초과분</span>
                <span class="px-1.5 py-0.2 bg-emerald-500/20 rounded text-[10px]">공제 30%</span>
              </div>
              <div class="font-bold text-white text-xs">${lowerName} 체크카드 / 현금영수증</div>
              <p class="text-[10px] text-slate-300 mt-0.5 leading-snug">30% 높은 공제율로 공제한도(${formatWon(lowerCardLimit)}) 채우기</p>
            </div>
          </div>
          <div class="p-2.5 bg-navy-900/90 rounded-xl border border-navy-800 text-[11px] text-slate-300 font-mono flex flex-wrap items-center justify-between gap-1 overflow-x-auto">
            <span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">0원</span>
            <span class="text-slate-400 text-[10px] sm:text-[11px]">── [${lowerName} 신용] ──▶</span>
            <span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">${formatWon(lowerHurdle)}</span>
            <span class="text-slate-400 text-[10px] sm:text-[11px]">── [${lowerName} 체크 30%] ──▶</span>
            <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">${formatWon(Math.min(familyExpense, lowerOptimumTotal))}</span>
            <span class="text-slate-400 text-[10px] sm:text-[11px]">── [소득공제 달성] ──▶</span>
            <span class="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold">절세 완료</span>
          </div>
        </div>
      `;
    } else {
      if (familyExpense <= higherOptimumTotal) {
        cardStrategy = {
          target: `${higherName} 명의 카드 집중 사용`,
          headline: `세율이 높은 ${higherName} 명의 카드로 결제하여 세율 차익(${higherRate.rate}%)을 극대화하세요!`,
          badge: `${higherName} 집중 추천`,
          badgeColor: 'bg-teal-500/10 border-teal-500/30 text-teal-300',
          detail: `${higherName}의 한계세율(${higherRate.label})이 ${lowerName}(${lowerRate.label})보다 ${rateDiff}%p 더 높아, 동일한 카드 공제를 받아도 환급액이 훨씬 큽니다.`,
          step1Title: `1단계: ${higherName} 신용카드 결제 구간`,
          step1: `• 💳 <strong>0원 ~ ${formatWon(higherHurdle)}</strong> (총급여 25%까지): 공제율이 0%이므로 카드사 포인트/마일리지 혜택 100% 챙기기`,
          step2Title: `2단계: ${higherName} 체크카드·현금영수증 집중 구간`,
          step2: `• 💵 <strong>${formatWon(higherHurdle)} 초과분</strong>: 30% 공제율이 적용되는 체크카드/현금영수증으로 결제하여 소득공제 한도(${formatWon(higherCardLimit)}) 전액 달성`
        };

        flowHtml = `
          <div class="space-y-2.5">
            <div class="flex items-center justify-between text-xs font-bold text-amber-300">
              <span class="flex items-center gap-1.5">
                <i data-lucide="git-merge" class="w-4 h-4 text-amber-400"></i>
                <span>[총 소비 흐름] 고세율 ${higherName} 명의 카드 집중</span>
              </span>
              <span class="text-[10px] text-teal-300 font-bold">세율 차익 극대화</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div class="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <div class="flex justify-between items-center text-[11px] font-bold text-amber-400 mb-1">
                  <span>1단계: 0원 ~ ${formatWon(higherHurdle)}</span>
                  <span class="px-1.5 py-0.2 bg-amber-500/20 rounded text-[10px]">공제 0%</span>
                </div>
                <div class="font-bold text-white text-xs">${higherName} 신용카드</div>
                <p class="text-[10px] text-slate-300 mt-0.5 leading-snug">총급여 25% 문턱까지 포인트·마일리지 챙기기</p>
              </div>
              <div class="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <div class="flex justify-between items-center text-[11px] font-bold text-emerald-400 mb-1">
                  <span>2단계: ${formatWon(higherHurdle)} ~ ${formatWon(higherOptimumTotal)}</span>
                  <span class="px-1.5 py-0.2 bg-emerald-500/20 rounded text-[10px]">공제 30%</span>
                </div>
                <div class="font-bold text-white text-xs">${higherName} 체크카드 / 현금영수증</div>
                <p class="text-[10px] text-slate-300 mt-0.5 leading-snug">+${formatWon(higherCheckNeeded)} 결제로 한도(${formatWon(higherCardLimit)}) 꽉 채우기</p>
              </div>
            </div>
            <div class="p-2.5 bg-navy-900/90 rounded-xl border border-navy-800 text-[11px] text-slate-300 font-mono flex flex-wrap items-center justify-between gap-1 overflow-x-auto">
              <span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">0원</span>
              <span class="text-slate-400 text-[10px] sm:text-[11px]">── [${higherName} 신용카드] ──▶</span>
              <span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">${formatWon(higherHurdle)}</span>
              <span class="text-slate-400 text-[10px] sm:text-[11px]">── [${higherName} 체크카드] ──▶</span>
              <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">${formatWon(higherOptimumTotal)}</span>
              <span class="text-slate-400 text-[10px] sm:text-[11px]">── [한도 초과 시] ──▶</span>
              <span class="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">${lowerName} 카드 전환</span>
            </div>
          </div>
        `;
      } else {
        const overflow = familyExpense - higherOptimumTotal;
        const lowerHurdle = lowerSalary * 0.25;
        cardStrategy = {
          target: `1차 ${higherName} 한도 달성 후 ➡️ 2차 ${lowerName} 바톤 터치`,
          headline: `${higherName} 공제한도를 먼저 채운 뒤, 남은 소비는 ${lowerName} 명의로 전환하세요!`,
          badge: '부부 릴레이 분배 추천',
          badgeColor: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
          detail: `${higherName}(세율 ${higherRate.rate}%)이 카드 소득공제 한도(${formatWon(higherCardLimit)})를 모두 채운 뒤 발생하는 초과 소비(${formatWon(overflow)})는 더 이상 소득공제 대상이 아닙니다. 따라서 바톤을 넘겨 ${lowerName}(세율 ${lowerRate.rate}%) 명의 카드로 전환 결제해야 부부 합산 절세액이 극대화됩니다.`,
          step1Title: `1차: ${higherName} 명의 카드로 공제한도 100% 꽉 채우기 (총 ${formatWon(higherOptimumTotal)})`,
          step1: `• 💳 <strong>신용카드 0원 ~ ${formatWon(higherHurdle)}</strong>: 총급여 25%까지는 공제율 0% 구간이므로 포인트/마일리지 챙기기<br>• 💵 <strong>체크카드/현금 +${formatWon(higherCheckNeeded)}</strong>: 25% 초과분은 30% 공제율 체크카드로 결제하여 소득공제 한도(${formatWon(higherCardLimit)}) 100% 전액 달성 (총 ${formatWon(higherOptimumTotal)})`,
          step2Title: `2차: 남은 소비(${formatWon(overflow)})는 ${lowerName} 카드로 바톤 터치!`,
          step2: `• 💡 ${higherName}의 한도가 끝났으므로 이제부터는 <strong>${lowerName} 명의 카드</strong>로 결제해야 추가 공제를 받습니다.<br>• 💳 ${lowerName} 신용카드로 <strong>${formatWon(lowerHurdle)}</strong>(총급여 25%)까지 사용 후, 초과 지출은 ${lowerName} 체크카드로 결제하세요.`
        };

        flowHtml = `
          <div class="space-y-2.5">
            <div class="flex items-center justify-between text-xs font-bold text-amber-300">
              <span class="flex items-center gap-1.5">
                <i data-lucide="git-merge" class="w-4 h-4 text-amber-400"></i>
                <span>[총 소비 흐름도] ${higherName} 한도 달성 후 ➡️ ${lowerName} 바톤 터치</span>
              </span>
              <span class="text-[10px] text-emerald-300 font-bold">부부 릴레이 분배</span>
            </div>

            <!-- 3 Milestone Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div class="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col justify-between">
                <div>
                  <div class="flex justify-between items-center text-[11px] font-bold text-amber-400 mb-1">
                    <span>1구간: 0원 ~ ${formatWon(higherHurdle)}</span>
                    <span class="px-1.5 py-0.2 bg-amber-500/20 rounded text-[10px]">공제 0%</span>
                  </div>
                  <div class="font-bold text-white text-xs">${higherName} 신용카드</div>
                </div>
                <p class="text-[10px] text-slate-300 mt-1 leading-snug">총급여 25% 문턱까지 포인트·마일리지 챙기기</p>
              </div>

              <div class="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col justify-between">
                <div>
                  <div class="flex justify-between items-center text-[11px] font-bold text-emerald-400 mb-1">
                    <span>2구간: ${formatWon(higherHurdle)} ~ ${formatWon(higherOptimumTotal)}</span>
                    <span class="px-1.5 py-0.2 bg-emerald-500/20 rounded text-[10px]">공제 30%</span>
                  </div>
                  <div class="font-bold text-white text-xs">${higherName} 체크카드</div>
                </div>
                <p class="text-[10px] text-slate-300 mt-1 leading-snug">+${formatWon(higherCheckNeeded)} 결제로 한도(${formatWon(higherCardLimit)}) 100% 채움</p>
              </div>

              <div class="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex flex-col justify-between">
                <div>
                  <div class="flex justify-between items-center text-[11px] font-bold text-cyan-400 mb-1">
                    <span>3구간: ${formatWon(higherOptimumTotal)} 초과~</span>
                    <span class="px-1.5 py-0.2 bg-cyan-500/20 rounded text-[10px]">바톤 터치!</span>
                  </div>
                  <div class="font-bold text-white text-xs">${lowerName} 카드로 전환</div>
                </div>
                <p class="text-[10px] text-slate-300 mt-1 leading-snug">${higherName} 한도 소진 후 남은 지출은 ${lowerName} 명의 결제</p>
              </div>
            </div>

            <!-- Linear Timeline Flow Bar -->
            <div class="p-2.5 bg-navy-900/90 rounded-xl border border-navy-800 text-[11px] text-slate-300 font-mono flex flex-wrap items-center justify-between gap-1 overflow-x-auto">
              <span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">0원</span>
              <span class="text-slate-400 text-[10px] sm:text-[11px]">── [${higherName} 신용카드] ──▶</span>
              <span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">${formatWon(higherHurdle)}</span>
              <span class="text-slate-400 text-[10px] sm:text-[11px]">── [${higherName} 체크카드] ──▶</span>
              <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">${formatWon(higherOptimumTotal)}</span>
              <span class="text-slate-400 text-[10px] sm:text-[11px]">── [${lowerName} 카드로 전환!] ──▶</span>
              <span class="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">그 이후</span>
            </div>
          </div>
        `;
      }
    }
    cardStrategy.flowHtml = flowHtml;

    // 의료비 몰아주기 판정
    let medicalAdvice = {};
    if (familyMedical <= lowerMedHurdle) {
      medicalAdvice = {
        winner: '공제 미달',
        title: '의료비 세액공제 문턱(3%) 미달',
        badge: '공제 불가',
        badgeColor: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
        desc: `부부 합산 의료비(${formatWon(familyMedical)})가 부부 중 낮은 문턱(${formatWon(lowerMedHurdle)}) 이하이므로 의료비 세액공제(3% 초과분 15%)를 받을 수 없습니다.`
      };
    } else if (familyMedical <= higherMedHurdle) {
      const lowerExcess = familyMedical - lowerMedHurdle;
      const lowerSavings = Math.round(lowerExcess * 0.15 * 1.1);
      medicalAdvice = {
        winner: lowerName,
        title: `의료비 역발상: 3% 문턱이 낮은 ${lowerName}에게 몰아주기!`,
        badge: `${lowerName} 몰아주기 압승`,
        badgeColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
        desc: `고소득자(${higherName})의 3% 문턱(${formatWon(higherMedHurdle)})에는 미달하여 공제 0원이지만, 소득이 낮은 ${lowerName}(3% 문턱 ${formatWon(lowerMedHurdle)})에게 몰아주면 초과분(${formatWon(lowerExcess)})의 16.5%인 약 ${formatWon(lowerSavings)}을 세액공제로 환급받습니다!`
      };
    } else {
      const lowerExcess = familyMedical - lowerMedHurdle;
      const higherExcess = familyMedical - higherMedHurdle;
      const benefitDiff = Math.round((lowerExcess - higherExcess) * 0.15 * 1.1);
      medicalAdvice = {
        winner: lowerName,
        title: `의료비는 세액공제(15% 정률)이므로 문턱 낮은 ${lowerName}에게 유리!`,
        badge: `${lowerName} 추천 (+${formatWon(benefitDiff)} 유리)`,
        badgeColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
        desc: `의료비 세액공제는 세율과 상관없이 초과분의 16.5%(지방세 포함)를 깎아줍니다. 따라서 3% 문턱이 ${formatWon(higherMedHurdle - lowerMedHurdle)} 더 낮은 ${lowerName}에게 몰아줄 때 약 ${formatWon(benefitDiff)}을 더 환급받습니다!`
      };
    }

    // 7. 부양가족 인적공제 상세 분석 (자녀/노인/장애인/성인자녀)
    const youthCnt = Number(depOptions.coupleDepYouth ?? state.coupleDepYouth ?? state.childrenYouthCount) || 0;
    const infantCnt = Number(depOptions.coupleDepInfant ?? state.coupleDepInfant ?? state.childrenInfantCount) || 0;
    const adultCnt = Number(depOptions.coupleDepAdult ?? state.coupleDepAdult ?? state.childrenAdultCount) || 0;
    const elderNormalCnt = Number(depOptions.coupleDepElderNormal ?? state.coupleDepElderNormal ?? state.eldersCount) || 0;
    const elderSeniorCnt = Number(depOptions.coupleDepElderSenior ?? state.coupleDepElderSenior ?? state.isSeniorElder) || 0;
    const disabledCnt = Number(depOptions.coupleDepDisabled ?? state.coupleDepDisabled ?? state.disabledCount) || 0;

    const standardDepCount = youthCnt + infantCnt + elderNormalCnt;
    const totalEligibleDep = standardDepCount + elderSeniorCnt + disabledCnt;
    const totalDepDeduction = (standardDepCount * 1500000) + (elderSeniorCnt * 2500000) + (disabledCnt * 3500000);

    let childCreditTotal = 0;
    if (youthCnt === 1) childCreditTotal = 150000;
    else if (youthCnt === 2) childCreditTotal = 350000;
    else if (youthCnt >= 3) childCreditTotal = 350000 + (youthCnt - 2) * 300000;

    const rateDiffPercent = Math.max(0, higherRate.fullRate - lowerRate.fullRate);
    const totalExtraTaxSaved = Math.round(totalDepDeduction * (rateDiffPercent / 100));

    let dependentAdvice = {};
    if (rateDiff > 0) {
      const extraPerNormal = Math.round(1500000 * (rateDiffPercent / 100));
      const extraPerSenior = Math.round(2500000 * (rateDiffPercent / 100));
      const extraPerDisabled = Math.round(3500000 * (rateDiffPercent / 100));

      let familySummaryText = '';
      if (totalEligibleDep > 0) {
        familySummaryText = `현재 부양가족(${totalEligibleDep}명)을 ${higherName}에게 배정하면 ${lowerName} 대비 총 <strong>약 ${formatWon(totalExtraTaxSaved)}</strong>의 세금을 추가 환급받습니다.`;
      } else {
        familySummaryText = `일반 부양가족 1인당 +${formatWon(extraPerNormal)}, 70세 이상 어르신 1인당 +${formatWon(extraPerSenior)}, 장애인 1인당 +${formatWon(extraPerDisabled)}을 더 돌려받습니다.`;
      }

      dependentAdvice = {
        winner: higherName,
        title: `부양가족(자녀/부모님)은 무조건 세율 높은 ${higherName}에게 배정!`,
        badge: `${higherName} 배정 추천 (+${formatWon(totalExtraTaxSaved || extraPerNormal)})`,
        badgeColor: 'bg-teal-500/10 text-teal-300 border-teal-500/30',
        desc: `기본 인적공제는 소득공제이므로 한계세율이 높은 쪽에 넣어야 환급액이 극대화됩니다. ${higherName}(세율 ${higherRate.fullRate}%)이 ${lowerName}(세율 ${lowerRate.fullRate}%)보다 세율이 ${rateDiff}%p 높아 ${familySummaryText}`,
        extraPerNormal,
        extraPerSenior,
        extraPerDisabled,
        totalExtraTaxSaved,
        totalEligibleDep,
        youthCnt,
        infantCnt,
        adultCnt,
        elderSeniorCnt,
        disabledCnt,
        childCreditTotal
      };
    } else {
      dependentAdvice = {
        winner: '동일 (양쪽 무관)',
        title: '부부의 소득세율 구간이 동일합니다.',
        badge: '양쪽 동일',
        badgeColor: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
        desc: '두 분 모두 동일한 과세표준 세율 구간에 속해 있어 부양가족을 어느 쪽에 배정하셔도 절세 효과가 같습니다. 결정세액이 남아있는 쪽에 배분하세요.',
        extraPerNormal: 0,
        extraPerSenior: 0,
        extraPerDisabled: 0,
        totalExtraTaxSaved: 0,
        totalEligibleDep,
        youthCnt,
        infantCnt,
        adultCnt,
        elderSeniorCnt,
        disabledCnt,
        childCreditTotal
      };
    }

    return {
      isPrimaryHigher,
      higherName,
      lowerName,
      higherSalary,
      lowerSalary,
      higherTaxBase,
      lowerTaxBase,
      higherRate,
      lowerRate,
      rateDiff,
      pHurdle,
      sHurdle,
      higherHurdle,
      lowerHurdle,
      pMedHurdle,
      sMedHurdle,
      cardStrategy,
      medicalAdvice,
      dependentAdvice
    };
  }

  // 7. 소득구간별 현금 vs 카드 황금비율 계산
  function calcCardGoldenRatio(salary) {
    const hurdle = salary * 0.25; // 25% 문턱
    let limit = 3000000;
    if (salary > 70000000 && salary <= 120000000) limit = 2500000;
    else if (salary > 120000000) limit = 2000000;

    // 체크카드/현금영수증(30%)으로 한도를 채우는 데 필요한 추가 소비액
    const checkCardNeeded = Math.round(limit / 0.30);
    // 한도 달성을 위한 총 최적 소비액
    const totalOptimum = hurdle + checkCardNeeded;

    const earnedDeduct = calcEarnedIncomeDeduction(salary);
    const estTaxBase = Math.max(0, salary - earnedDeduct - 1500000 - salary * 0.08);
    const marginalRate = getMarginalTaxRate(estTaxBase);
    const maxTaxSaved = Math.round(limit * (marginalRate.fullRate / 100));

    return {
      salary,
      hurdle,
      limit,
      checkCardNeeded,
      totalOptimum,
      marginalRate,
      maxTaxSaved
    };
  }

  // Main Calculation Engine
  function calculate(s = state) {
    const salary = Math.max(0, Number(s.annualSalary) || 0);

    // 1. 근로소득공제 및 근로소득금액
    const earnedIncomeDeduction = calcEarnedIncomeDeduction(salary);
    const earnedIncomeAmount = Math.max(0, salary - earnedIncomeDeduction);

    // 2. 인적공제
    let personalDeduction = 1500000; // 본인 150만원
    if (s.hasSpouse) personalDeduction += 1500000;

    // 자녀 인적공제: 청소년(만 8세~20세) + 미취학(만 7세 이하)
    // * 주의: 만 20세 초과 성인 자녀는 소득세법상 기본인적공제 대상에서 제외됨! (단, 대학교육비/카드 공제는 가능)
    const youthCnt = Number(s.childrenYouthCount) || 0;
    const infantCnt = Number(s.childrenInfantCount) || 0;
    const legacyChildCnt = Number(s.childrenCount) || 0;
    const minorChildCnt = (youthCnt + infantCnt > 0) ? (youthCnt + infantCnt) : legacyChildCnt;
    personalDeduction += minorChildCnt * 1500000;

    // 60세~69세 부모님/직계존속 (1인당 150만원 소득공제)
    const elderNormalCnt = Number(s.eldersCount) || 0;
    personalDeduction += elderNormalCnt * 1500000;

    // 70세 이상 경로우대 노인 (기본공제 150만 + 경로우대 추가 100만 = 1인당 총 250만원 소득공제)
    const elderSeniorCnt = Number(s.isSeniorElder) || 0;
    personalDeduction += elderSeniorCnt * 2500000;

    // 장애인 부양가족 (기본공제 150만 + 장애인 추가 200만 = 1인당 총 350만원, 나이제한 면제)
    const disabledCnt = Number(s.disabledCount) || 0;
    personalDeduction += disabledCnt * 3500000;

    if (s.isSingleParent) personalDeduction += 1000000; // 한부모 (100만원)
    if (s.isFemaleHead && salary <= 45000000) personalDeduction += 500000; // 부녀자 (50만원, 종합소득 3천만 이하)

    // 3. 연금보험료 공제 (국민연금 4.5% 추정, 월 상한 590만원 반영)
    const nationalPension = Math.min(3186000, salary * 0.045);

    // 4. 특별소득공제 (건강보험 3.545% + 고용보험 0.9% 추정)
    const healthInsurance = salary * 0.04004; // 건강보험 + 장기요양보험 합산 추정 (약 4%)
    const employmentInsurance = salary * 0.009; // 고용보험 0.9%
    const publicInsuranceDeduction = healthInsurance + employmentInsurance;

    // 주택마련저축 (청약저축 납입액의 40%, 최대 300만원 한도 -> 최대 120만원)
    let housingSavingsDeduction = 0;
    if (salary <= 70000000) {
      housingSavingsDeduction = Math.min(Number(s.housingSavings) || 0, 3000000) * 0.40;
    }
    // 전세자금대출 상환액 (40% 공제, 청약과 합산 400만원 한도)
    const rentLoanDeduction = Math.min(Number(s.rentLoanRepay) || 0, 10000000) * 0.40;
    const housingTotalDeduction = Math.min(4000000, housingSavingsDeduction + rentLoanDeduction);

    // 신용카드 등 소득공제
    const cardDeduction = calcCardDeduction(
      salary,
      Number(s.creditCard) || 0,
      Number(s.debitCard) || 0,
      Number(s.marketTransit) || 0
    );

    // 총 소득공제 합계
    const totalIncomeDeductions = personalDeduction + nationalPension + publicInsuranceDeduction + housingTotalDeduction + cardDeduction;

    // 5. 과세표준
    const taxBase = Math.max(0, earnedIncomeAmount - totalIncomeDeductions);

    // 6. 산출세액
    const calculatedTax = calcBaseTax(taxBase);

    // 7. 세액공제
    // (1) 근로소득 세액공제
    const earnedIncomeTaxCredit = calcEarnedIncomeTaxCredit(calculatedTax, salary);

    // (2) 자녀 세액공제 (2024~2026 개정세법: 만 8세 이상 초중고/청소년 자녀에게 적용)
    // 1명 15만, 2명 35만, 3명 이상 35만 + (n - 2) * 30만
    const eligibleChildForCredit = (youthCnt > 0) ? youthCnt : (legacyChildCnt > 0 ? legacyChildCnt : 0);
    let childTaxCredit = 0;
    if (eligibleChildForCredit === 1) childTaxCredit = 150000;
    else if (eligibleChildForCredit === 2) childTaxCredit = 350000;
    else if (eligibleChildForCredit >= 3) childTaxCredit = 350000 + (eligibleChildForCredit - 2) * 300000;

    // (3) 연금계좌 세액공제 (연금저축 최대 600만, IRP 합산 최대 900만)
    const pSavings = Math.min(6000000, Number(s.pensionSavings) || 0);
    const irpSavings = Number(s.irpSavings) || 0;
    const totalPensionDeposit = Math.min(9000000, pSavings + irpSavings);
    const pensionCreditRate = (salary <= 55000000) ? 0.15 : 0.12;
    const pensionTaxCredit = totalPensionDeposit * pensionCreditRate;

    // (4) 보장성 보험료 세액공제 (100만원 한도 * 12%)
    const insuranceTaxCredit = Math.min(1000000, Number(s.insurance) || 0) * 0.12;

    // (5) 의료비 세액공제 (총급여 3% 초과 지출액의 15%)
    // * 세법 특례: 본인, 65세 이상 어르신(elderSeniorCnt > 0), 장애인(disabledCnt > 0) 의료비는 700만원 한도 없이 무제한 전액 공제!
    const medicalThreshold = salary * 0.03;
    const medicalSpent = Number(s.medical) || 0;
    let medicalTaxCredit = 0;
    if (medicalSpent > medicalThreshold) {
      const medicalExcess = medicalSpent - medicalThreshold;
      const hasUnlimitedMedical = (elderSeniorCnt > 0 || disabledCnt > 0);
      const deductibleMedical = hasUnlimitedMedical ? medicalExcess : Math.min(7000000, medicalExcess);
      medicalTaxCredit = deductibleMedical * 0.15;
    }

    // (6) 교육비 세액공제 (지출액의 15%)
    // - 취학전/초중고 자녀 1인당 300만원 한도, 대학생(성인 자녀) 1인당 900만원 한도, 본인/장애인 전액 무제한
    const educationTaxCredit = (Number(s.education) || 0) * 0.15;

    // (7) 기부금 세액공제 (고향사랑기부금 10만원 전액 100/110 환급 + 일반 15%)
    const loveHometown = Math.min(100000, Number(s.donationLoveHometown) || 0);
    const hometownCredit = loveHometown * (100 / 110);
    const generalDonationCredit = (Number(s.donationGeneral) || 0) * 0.15;
    const donationTaxCredit = hometownCredit + generalDonationCredit;

    // (8) 월세액 세액공제 (총급여 7,000만원 이하 무주택 세대주 연 최대 1,000만원의 15%~17%)
    let monthlyRentTaxCredit = 0;
    if (salary <= 70000000 && Number(s.monthlyRent) > 0) {
      const rentRate = (salary <= 55000000) ? 0.17 : 0.15;
      monthlyRentTaxCredit = Math.min(10000000, Number(s.monthlyRent)) * rentRate;
    }

    // 특별세액공제 합계
    const totalSpecialTaxCredits = insuranceTaxCredit + medicalTaxCredit + educationTaxCredit + donationTaxCredit + monthlyRentTaxCredit;

    // 표준세액공제(13만원)와 특별공제 비교
    let finalSpecialCredit = totalSpecialTaxCredits;
    let isStandardCreditApplied = false;
    if (totalSpecialTaxCredits < 130000 && housingTotalDeduction === 0) {
      finalSpecialCredit = 130000;
      isStandardCreditApplied = true;
    }

    // 총 세액공제 합계
    const totalTaxCredits = earnedIncomeTaxCredit + childTaxCredit + pensionTaxCredit + finalSpecialCredit;

    // 8. 결정세액 (소득세)
    const finalIncomeTax = Math.max(0, calculatedTax - totalTaxCredits);
    // 지방소득세 (10%)
    const finalLocalTax = Math.round(finalIncomeTax * 0.10);
    // 총 결정세액
    const totalFinalTax = finalIncomeTax + finalLocalTax;

    // 9. 기납부세액 (원천징수세액)
    let prePaidTax = 0;
    if (s.paidTaxMethod === 'manual') {
      prePaidTax = Number(s.manualPaidTax) || 0;
    } else {
      // 표준 100% 원천징수 간이세액표 기반 추정 (기본 소득세율의 통상 90~105% 수준)
      const estimatedAnnualTax = calcBaseTax(Math.max(0, salary - calcEarnedIncomeDeduction(salary) - 3000000)) * 1.1;
      prePaidTax = Math.max(0, Math.round(estimatedAnnualTax));
    }

    // 10. 최종 차감징수세액 (음수: 환급, 양수: 추가납부)
    const diffTax = totalFinalTax - prePaidTax;
    const isRefund = diffTax <= 0;
    const refundOrPayAmount = Math.abs(diffTax);

    // 11. 실효세율 (%)
    const effectiveTaxRate = salary > 0 ? ((totalFinalTax / salary) * 100).toFixed(2) : '0.00';

    // 12. 추가 절세 시뮬레이션 (IRP/연금저축 미납입 잔여한도 활용 시 추가 환급액)
    const currentPensionTotal = Math.min(9000000, pSavings + irpSavings);
    const pensionRoomLeft = Math.max(0, 9000000 - currentPensionTotal);
    const extraPensionPotentialRefund = Math.round(pensionRoomLeft * pensionCreditRate * 1.1); // 지방세 10% 포함

    return {
      salary,
      earnedIncomeDeduction,
      earnedIncomeAmount,
      personalDeduction,
      nationalPension,
      publicInsuranceDeduction,
      housingTotalDeduction,
      cardDeduction,
      totalIncomeDeductions,
      taxBase,
      calculatedTax,
      earnedIncomeTaxCredit,
      childTaxCredit,
      pensionTaxCredit,
      insuranceTaxCredit,
      medicalTaxCredit,
      educationTaxCredit,
      donationTaxCredit,
      monthlyRentTaxCredit,
      totalSpecialTaxCredits,
      isStandardCreditApplied,
      totalTaxCredits,
      finalIncomeTax,
      finalLocalTax,
      totalFinalTax,
      prePaidTax,
      diffTax,
      isRefund,
      refundOrPayAmount,
      effectiveTaxRate,
      pensionRoomLeft,
      extraPensionPotentialRefund,
      pensionCreditRate
    };
  }

  // Presets
  const presets = {
    junior: {
      name: '사회초년생 (3,500만원)',
      annualSalary: 35000000,
      hasSpouse: false,
      childrenYouthCount: 0,
      childrenInfantCount: 0,
      childrenAdultCount: 0,
      childrenCount: 0,
      eldersCount: 0,
      isSeniorElder: 0,
      disabledCount: 0,
      creditCard: 8000000,
      debitCard: 5000000,
      marketTransit: 600000,
      housingSavings: 1200000,
      pensionSavings: 1000000,
      irpSavings: 0,
      insurance: 600000,
      medical: 500000,
      monthlyRent: 4800000 // 월 40만원 월세
    },
    senior: {
      name: '대리·과장급 1인가구 (5,500만원)',
      annualSalary: 55000000,
      hasSpouse: false,
      childrenYouthCount: 0,
      childrenInfantCount: 0,
      childrenAdultCount: 0,
      childrenCount: 0,
      eldersCount: 0,
      isSeniorElder: 0,
      disabledCount: 0,
      creditCard: 14000000,
      debitCard: 9000000,
      marketTransit: 1200000,
      housingSavings: 2400000,
      pensionSavings: 4000000,
      irpSavings: 2000000,
      insurance: 1000000,
      medical: 1200000,
      monthlyRent: 0
    },
    family: {
      name: '외벌이 4인가구 (7,000만원)',
      annualSalary: 70000000,
      hasSpouse: true,
      childrenYouthCount: 1,
      childrenInfantCount: 1,
      childrenAdultCount: 0,
      childrenCount: 2,
      eldersCount: 0,
      isSeniorElder: 0,
      disabledCount: 0,
      creditCard: 18000000,
      debitCard: 12000000,
      marketTransit: 1500000,
      housingSavings: 2400000,
      pensionSavings: 6000000,
      irpSavings: 3000000,
      insurance: 1200000,
      medical: 3500000,
      monthlyRent: 0
    },
    dualHigh: {
      name: '고소득 맞벌이 (1억원)',
      annualSalary: 100000000,
      hasSpouse: true,
      childrenYouthCount: 1,
      childrenInfantCount: 0,
      childrenAdultCount: 0,
      childrenCount: 1,
      eldersCount: 0,
      isSeniorElder: 1, // 70세 이상 경로우대 부모님
      disabledCount: 0,
      creditCard: 26000000,
      debitCard: 15000000,
      marketTransit: 2000000,
      housingSavings: 0,
      pensionSavings: 6000000,
      irpSavings: 3000000,
      insurance: 1500000,
      medical: 4000000,
      monthlyRent: 0
    }
  };

  // UI Renderer
  function updateUI() {
    const res = calculate(state);

    // 1. Result Highlights
    const resultCardEl = document.getElementById('ytax-result-card');
    const resultBadgeEl = document.getElementById('ytax-result-badge');
    const resultTitleEl = document.getElementById('ytax-result-title');
    const resultAmountEl = document.getElementById('ytax-result-amount');
    const resultSubdescEl = document.getElementById('ytax-result-subdesc');

    if (resultCardEl && resultAmountEl) {
      if (res.isRefund) {
        resultCardEl.className = 'p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-emerald-950/80 via-navy-900 to-navy-950 border border-emerald-500/40 shadow-2xl relative overflow-hidden animate-in';
        if (resultBadgeEl) {
          resultBadgeEl.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold';
          resultBadgeEl.innerHTML = '<i data-lucide="sparkles" class="w-3.5 h-3.5"></i> 🎉 13월의 월급 환급 대상';
        }
        if (resultTitleEl) resultTitleEl.innerText = '예상 환급액 (돌려받는 세금)';
        resultAmountEl.className = 'text-3xl sm:text-5xl font-black text-emerald-400 tracking-tight font-mono';
        resultAmountEl.innerText = `+${formatWon(res.refundOrPayAmount)}`;
        if (resultSubdescEl) {
          resultSubdescEl.innerHTML = `매월 미리 납부한 기납부세액이 최종 결정세액보다 많아 <strong class="text-emerald-300">${formatWon(res.refundOrPayAmount)}</strong>을 연말정산 시 통장으로 환급받습니다!`;
        }
      } else {
        resultCardEl.className = 'p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-rose-950/80 via-navy-900 to-navy-950 border border-rose-500/40 shadow-2xl relative overflow-hidden animate-in';
        if (resultBadgeEl) {
          resultBadgeEl.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold';
          resultBadgeEl.innerHTML = '<i data-lucide="alert-circle" class="w-3.5 h-3.5"></i> ⚠️ 추가 납부 대상';
        }
        if (resultTitleEl) resultTitleEl.innerText = '예상 추가 납부세액 (토해내는 세금)';
        resultAmountEl.className = 'text-3xl sm:text-5xl font-black text-rose-400 tracking-tight font-mono';
        resultAmountEl.innerText = `-${formatWon(res.refundOrPayAmount)}`;
        if (resultSubdescEl) {
          resultSubdescEl.innerHTML = `최종 결정세액이 기납부세액보다 커서 <strong class="text-rose-300">${formatWon(res.refundOrPayAmount)}</strong>의 세금을 추가로 납부해야 합니다. 하단 IRP/연금저축 절세 팁을 확인해 보세요.`;
        }
      }
    }

    // Key Stats Grid
    const setInner = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.innerText = val;
    };
    setInner('ytax-stat-salary', formatWon(res.salary));
    setInner('ytax-stat-taxbase', formatWon(res.taxBase));
    setInner('ytax-stat-finaltax', formatWon(res.totalFinalTax));
    setInner('ytax-stat-prepaid', formatWon(res.prePaidTax));
    setInner('ytax-stat-rate', `${res.effectiveTaxRate}%`);

    // Detailed Breakdown Table
    setInner('ytax-dt-salary', formatWon(res.salary));
    setInner('ytax-dt-earned-deduct', `- ${formatWon(res.earnedIncomeDeduction)}`);
    setInner('ytax-dt-earned-amt', formatWon(res.earnedIncomeAmount));
    setInner('ytax-dt-personal-deduct', `- ${formatWon(res.personalDeduction)}`);
    setInner('ytax-dt-pension-deduct', `- ${formatWon(res.nationalPension)}`);
    setInner('ytax-dt-insurance-deduct', `- ${formatWon(res.publicInsuranceDeduction)}`);
    setInner('ytax-dt-housing-deduct', `- ${formatWon(res.housingTotalDeduction)}`);
    setInner('ytax-dt-card-deduct', `- ${formatWon(res.cardDeduction)}`);
    setInner('ytax-dt-total-income-deduct', `- ${formatWon(res.totalIncomeDeductions)}`);
    setInner('ytax-dt-taxbase', formatWon(res.taxBase));
    setInner('ytax-dt-calc-tax', formatWon(res.calculatedTax));
    setInner('ytax-dt-earned-credit', `- ${formatWon(res.earnedIncomeTaxCredit)}`);
    setInner('ytax-dt-child-credit', `- ${formatWon(res.childTaxCredit)}`);
    setInner('ytax-dt-pension-credit', `- ${formatWon(res.pensionTaxCredit)}`);
    setInner('ytax-dt-special-credit', `- ${formatWon(res.totalSpecialTaxCredits)}`);
    setInner('ytax-dt-total-credit', `- ${formatWon(res.totalTaxCredits)}`);
    setInner('ytax-dt-final-income-tax', formatWon(res.finalIncomeTax));
    setInner('ytax-dt-final-local-tax', formatWon(res.finalLocalTax));
    setInner('ytax-dt-total-final-tax', formatWon(res.totalFinalTax));
    setInner('ytax-dt-prepaid-tax', formatWon(res.prePaidTax));
    
    const dtResultEl = document.getElementById('ytax-dt-diff-tax');
    if (dtResultEl) {
      if (res.isRefund) {
        dtResultEl.className = 'text-right font-black text-emerald-400 font-mono';
        dtResultEl.innerText = `환급 +${formatWon(res.refundOrPayAmount)}`;
      } else {
        dtResultEl.className = 'text-right font-black text-rose-400 font-mono';
        dtResultEl.innerText = `납부 -${formatWon(res.refundOrPayAmount)}`;
      }
    }

    // Optimization Banner
    const pensionTipAmountEl = document.getElementById('ytax-tip-pension-amount');
    const pensionTipRefundEl = document.getElementById('ytax-tip-pension-refund');
    if (pensionTipAmountEl && pensionTipRefundEl) {
      pensionTipAmountEl.innerText = formatWon(res.pensionRoomLeft);
      pensionTipRefundEl.innerText = `+${formatWon(res.extraPensionPotentialRefund)}`;
    }

    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      try { lucide.createIcons(); } catch(e) {}
    }
  }

  // SubTab Switcher (1. 모의계산 / 2. 맞벌이 절세 / 3. 황금소비 공식)
  function switchSubTab(subTabKey) {
    state.currentSubTab = subTabKey;

    const views = {
      calculator: document.getElementById('ytax-view-calculator'),
      couple: document.getElementById('ytax-view-couple'),
      cards: document.getElementById('ytax-view-cards')
    };

    Object.keys(views).forEach(k => {
      const v = views[k];
      const btn = document.getElementById(`ytax-subtab-btn-${k}`);
      if (v) {
        if (k === subTabKey) {
          v.classList.remove('hidden');
        } else {
          v.classList.add('hidden');
        }
      }
      if (btn) {
        if (k === subTabKey) {
          btn.className = 'ytax-subtab-btn flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500/20 to-emerald-500/20 text-teal-300 border border-teal-500/40 shadow-md cursor-pointer';
        } else {
          btn.className = 'ytax-subtab-btn flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-2 text-slate-400 hover:text-white hover:bg-navy-800/60 border border-transparent cursor-pointer';
        }
      }
    });

    if (subTabKey === 'couple') renderCoupleUI();
    if (subTabKey === 'cards') renderGoldenRatioUI();
    if (subTabKey === 'calculator') updateUI();

    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      try { lucide.createIcons(); } catch(e) {}
    }
  }

  // Couple UI Renderer
  function renderCoupleUI() {
    const pSalary = Math.max(0, Number(state.annualSalary) || 0);
    const sSalary = Math.max(0, Number(state.spouseSalary) || 0);
    const familyExpense = Math.max(0, Number(state.familyExpenseTotal) || 0);
    const familyMedical = Math.max(0, Number(state.familyMedicalTotal) || 0);

    const depOptions = {
      coupleDepYouth: state.coupleDepYouth,
      coupleDepInfant: state.coupleDepInfant,
      coupleDepAdult: state.coupleDepAdult,
      coupleDepElderNormal: state.coupleDepElderNormal,
      coupleDepElderSenior: state.coupleDepElderSenior,
      coupleDepDisabled: state.coupleDepDisabled
    };

    const advice = analyzeCouple(pSalary, sSalary, familyExpense, familyMedical, depOptions);

    const setInner = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.innerText = val;
    };
    const setHtml = (id, html) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = html;
    };

    setInner('ytax-couple-p-salary-disp', formatWon(pSalary));
    setInner('ytax-couple-s-salary-disp', formatWon(sSalary));
    setInner('ytax-couple-p-rate-disp', advice.isPrimaryHigher ? advice.higherRate.label : advice.lowerRate.label);
    setInner('ytax-couple-s-rate-disp', advice.isPrimaryHigher ? advice.lowerRate.label : advice.higherRate.label);
    setInner('ytax-couple-p-hurdle-disp', formatWon(advice.pHurdle));
    setInner('ytax-couple-s-hurdle-disp', formatWon(advice.sHurdle));
    setInner('ytax-couple-p-med-disp', formatWon(advice.pMedHurdle));
    setInner('ytax-couple-s-med-disp', formatWon(advice.sMedHurdle));

    // Winner Summary
    setInner('ytax-couple-winner-name', `${advice.higherName} (세율 ${advice.higherRate.rate}%)`);
    setInner('ytax-couple-rate-diff', advice.rateDiff > 0 ? `+${advice.rateDiff}%p 세율차이` : '동일세율');

    // Card Advice
    setInner('ytax-couple-card-target', advice.cardStrategy.target);
    const cardBadgeEl = document.getElementById('ytax-couple-card-badge');
    if (cardBadgeEl) {
      cardBadgeEl.className = `px-2.5 py-1 rounded-full text-xs font-bold border ${advice.cardStrategy.badgeColor}`;
      cardBadgeEl.innerText = advice.cardStrategy.badge;
    }
    setInner('ytax-couple-card-headline', advice.cardStrategy.headline);
    setInner('ytax-couple-card-detail', advice.cardStrategy.detail);
    setHtml('ytax-couple-card-flow', advice.cardStrategy.flowHtml);
    setInner('ytax-couple-card-step1-title', advice.cardStrategy.step1Title || '1단계: 신용카드 결제 구간');
    setHtml('ytax-couple-card-step1', advice.cardStrategy.step1);
    setInner('ytax-couple-card-step2-title', advice.cardStrategy.step2Title || '2단계: 체크카드·현금영수증 집중 구간');
    setHtml('ytax-couple-card-step2', advice.cardStrategy.step2);

    // Medical Advice
    setInner('ytax-couple-med-winner', advice.medicalAdvice.winner);
    const medBadgeEl = document.getElementById('ytax-couple-med-badge');
    if (medBadgeEl) {
      medBadgeEl.className = `px-2.5 py-1 rounded-full text-xs font-bold border ${advice.medicalAdvice.badgeColor}`;
      medBadgeEl.innerText = advice.medicalAdvice.badge;
    }
    setInner('ytax-couple-med-title', advice.medicalAdvice.title);
    setInner('ytax-couple-med-desc', advice.medicalAdvice.desc);

    // Dependent Advice
    setInner('ytax-couple-dep-winner', advice.dependentAdvice.winner);
    const depBadgeEl = document.getElementById('ytax-couple-dep-badge');
    if (depBadgeEl) {
      depBadgeEl.className = `px-2.5 py-1 rounded-full text-xs font-bold border ${advice.dependentAdvice.badgeColor}`;
      depBadgeEl.innerText = advice.dependentAdvice.badge;
    }
    setInner('ytax-couple-dep-title', advice.dependentAdvice.title);
    const depDescEl = document.getElementById('ytax-couple-dep-desc');
    if (depDescEl) {
      depDescEl.innerHTML = advice.dependentAdvice.desc;
    }

    // Dependent Detailed Breakdown
    const depBreakdownEl = document.getElementById('ytax-couple-dep-breakdown');
    if (depBreakdownEl) {
      let breakdownHtml = `
        <div class="mt-3 p-3.5 bg-navy-950/80 rounded-2xl border border-navy-800 space-y-2 text-xs">
          <div class="font-bold text-white flex items-center justify-between border-b border-navy-800 pb-2">
            <span>부양가족 구성별 배정 가이드</span>
            <span class="text-teal-400 font-mono text-[11px]">${advice.higherName} 배정 시 유리</span>
          </div>
          <div class="space-y-1.5 text-slate-300 text-[11px]">
            <div class="flex justify-between items-center py-0.5">
              <span>• 청소년·미취학 자녀 (인당 150만):</span>
              <strong class="font-mono text-white">${advice.rateDiff > 0 ? `인당 +${formatWon(advice.dependentAdvice.extraPerNormal)} 유리` : '동일'}</strong>
            </div>
            <div class="flex justify-between items-center py-0.5">
              <span>• 70세 이상 경로우대 노인 (인당 250만):</span>
              <strong class="font-mono text-amber-300">${advice.rateDiff > 0 ? `인당 +${formatWon(advice.dependentAdvice.extraPerSenior)} 유리 (의료비 무제한)` : '동일'}</strong>
            </div>
            <div class="flex justify-between items-center py-0.5">
              <span>• 장애인 부양가족 (인당 350만):</span>
              <strong class="font-mono text-emerald-300">${advice.rateDiff > 0 ? `인당 +${formatWon(advice.dependentAdvice.extraPerDisabled)} 유리 (나이 무관)` : '동일'}</strong>
            </div>
            <div class="pt-1 border-t border-navy-800/80 text-[10px] text-slate-400">
              ⚠️ <strong class="text-amber-300">성인 자녀(만 20세 초과)</strong>는 기본공제 대상에서 제외됩니다. 단, 대학교 등록금 교육비(900만 한도 15%) 및 자녀 명의 카드 사용액은 부모 중 결정세액이 남아있는 쪽에 배정하여 공제받으실 수 있습니다.
            </div>
          </div>
        </div>
      `;
      depBreakdownEl.innerHTML = breakdownHtml;
    }

    // Live Calculation Metrics Binding in Couple Tab
    const elderNormalCount = Number(state.coupleDepElderNormal) || 0;
    const depDeductTotal = (advice.dependentAdvice.youthCnt + advice.dependentAdvice.infantCnt + elderNormalCount) * 1500000 
      + (advice.dependentAdvice.elderSeniorCnt * 2500000) 
      + (advice.dependentAdvice.disabledCnt * 3500000);
    const childCreditTotal = advice.dependentAdvice.childCreditTotal || 0;
    const hasUnlimitedMedical = (advice.dependentAdvice.elderSeniorCnt > 0 || advice.dependentAdvice.disabledCnt > 0);
    const medLimitText = hasUnlimitedMedical ? '무제한 전액 공제' : '연 700만원 한도';
    const benefitDiff = advice.dependentAdvice.totalExtraTaxSaved || 0;

    setInner('ytax-couple-calc-dep-deduct', formatWon(depDeductTotal));
    setInner('ytax-couple-calc-child-credit', formatWon(childCreditTotal));
    setInner('ytax-couple-calc-med-limit', medLimitText);
    setInner('ytax-couple-calc-benefit-diff', `+${formatWon(benefitDiff)}`);

    const calcNoteEl = document.getElementById('ytax-couple-calc-note');
    if (calcNoteEl) {
      if (advice.dependentAdvice.adultCnt > 0) {
        calcNoteEl.innerHTML = `<span>⚠️ <strong class="text-amber-300">성인 자녀(${advice.dependentAdvice.adultCnt}명)</strong>는 기본공제(0원)에서 제외되었습니다. 대학교 등록금(최대 900만 한도 15%)은 결정세액이 큰 쪽에 배정하세요.</span>`;
      } else if (hasUnlimitedMedical) {
        calcNoteEl.innerHTML = `<span>🎉 70세 이상 어르신 또는 장애인이 포함되어 <strong>의료비 700만원 한도가 전액 무제한 해제</strong>되었습니다!</span>`;
      } else if (benefitDiff > 0) {
        calcNoteEl.innerHTML = `<span>💡 부양가족을 <strong>${advice.higherName}</strong>에게 몰아줄 때 ${advice.lowerName} 대비 <strong>+${formatWon(benefitDiff)}</strong>의 절세 환급금이 발생합니다.</span>`;
      } else {
        calcNoteEl.innerHTML = `<span>💡 자녀 및 부양가족 수를 변경하시면 공제액과 최적 부부 배정 결과가 즉시 재계산됩니다.</span>`;
      }
    }

    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      try { lucide.createIcons(); } catch(e) {}
    }
  }

  // Golden Ratio UI Renderer
  function renderGoldenRatioUI() {
    const salary = Math.max(0, Number(state.guideSalary) || 50000000);
    const gr = calcCardGoldenRatio(salary);

    const setInner = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.innerText = val;
    };

    setInner('ytax-gr-salary-disp', formatWon(gr.salary));
    setInner('ytax-gr-step1-range', `0원 ~ ${formatWon(gr.hurdle)}`);
    setInner('ytax-gr-step2-range', `${formatWon(gr.hurdle)} ~ ${formatWon(gr.totalOptimum)}`);
    setInner('ytax-gr-step3-range', `${formatWon(gr.totalOptimum)} 초과`);

    setInner('ytax-gr-hurdle-won', formatWon(gr.hurdle));
    setInner('ytax-gr-check-needed', formatWon(gr.checkCardNeeded));
    setInner('ytax-gr-limit-won', formatWon(gr.limit));
    setInner('ytax-gr-total-optimum', formatWon(gr.totalOptimum));
    setInner('ytax-gr-rate-disp', gr.marginalRate.label);
    setInner('ytax-gr-saved-won', `최대 약 ${formatWon(gr.maxTaxSaved)} 절세`);
  }

  function handleCoupleInputChange(el) {
    if (el && el.classList && el.classList.contains('ytax-money-input')) {
      formatInputWithCommas(el);
    }

    const getNum = (id, fallback = 0) => {
      const element = document.getElementById(id);
      if (!element) return fallback;
      const raw = (element.value || '').toString().replace(/[^0-9]/g, '');
      if (raw === '') return fallback;
      const parsed = parseInt(raw, 10);
      return isNaN(parsed) ? fallback : parsed;
    };

    state.annualSalary = getNum('ytax-couple-input-salary', 0);
    state.spouseSalary = getNum('ytax-couple-input-spouse-salary', 0);
    state.familyExpenseTotal = getNum('ytax-couple-input-expense', 0);
    state.familyMedicalTotal = getNum('ytax-couple-input-medical', 0);

    state.coupleDepYouth = getNum('ytax-couple-input-dep-youth', 0);
    state.coupleDepInfant = getNum('ytax-couple-input-dep-infant', 0);
    state.coupleDepAdult = getNum('ytax-couple-input-dep-adult', 0);
    state.coupleDepElderNormal = getNum('ytax-couple-input-dep-elder-normal', 0);
    state.coupleDepElderSenior = getNum('ytax-couple-input-dep-elder-senior', 0);
    state.coupleDepDisabled = getNum('ytax-couple-input-dep-disabled', 0);

    // Two-way sync to Main Calculator state
    state.childrenYouthCount = state.coupleDepYouth;
    state.childrenInfantCount = state.coupleDepInfant;
    state.childrenAdultCount = state.coupleDepAdult;
    state.childrenCount = state.childrenYouthCount + state.childrenInfantCount;
    state.eldersCount = state.coupleDepElderNormal;
    state.isSeniorElder = state.coupleDepElderSenior;
    state.disabledCount = state.coupleDepDisabled;

    // Sync input values to Main Calculator DOM elements as well
    const setVal = (id, val) => {
      const inputEl = document.getElementById(id);
      if (inputEl) inputEl.value = val;
    };
    setVal('ytax-input-salary', formatComma(state.annualSalary));
    setVal('ytax-input-children-youth', state.childrenYouthCount);
    setVal('ytax-input-children-infant', state.childrenInfantCount);
    setVal('ytax-input-children-adult', state.childrenAdultCount);
    setVal('ytax-input-elders', state.eldersCount);
    setVal('ytax-input-senior-elders', state.isSeniorElder);
    setVal('ytax-input-disabled', state.disabledCount);

    renderCoupleUI();
  }

  function addCoupleSalary(target, amount) {
    if (target === 'primary') {
      const cur = Number(state.annualSalary) || 0;
      state.annualSalary = Math.max(0, cur + amount);
      const el = document.getElementById('ytax-couple-input-salary');
      if (el) el.value = formatComma(state.annualSalary);
      const mainEl = document.getElementById('ytax-input-salary');
      if (mainEl) mainEl.value = formatComma(state.annualSalary);
    } else {
      const cur = Number(state.spouseSalary) || 0;
      state.spouseSalary = Math.max(0, cur + amount);
      const el = document.getElementById('ytax-couple-input-spouse-salary');
      if (el) el.value = formatComma(state.spouseSalary);
    }
    renderCoupleUI();
  }

  function addCoupleExpense(amount) {
    const cur = Number(state.familyExpenseTotal) || 0;
    state.familyExpenseTotal = Math.max(0, cur + amount);
    const el = document.getElementById('ytax-couple-input-expense');
    if (el) el.value = formatComma(state.familyExpenseTotal);
    renderCoupleUI();
  }

  function setGoldenRatioSalary(amount) {
    state.guideSalary = amount;
    const inp = document.getElementById('ytax-gr-input-salary');
    if (inp) inp.value = formatComma(amount);

    // Visual button active toggle
    document.querySelectorAll('.ytax-gr-sal-btn').forEach(btn => {
      if (Number(btn.dataset.sal) === amount) {
        btn.className = 'ytax-gr-sal-btn px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold transition shadow-sm';
      } else {
        btn.className = 'ytax-gr-sal-btn px-3 py-1.5 rounded-xl bg-navy-950 hover:bg-navy-800 text-slate-400 hover:text-slate-200 border border-navy-800 text-xs font-medium transition';
      }
    });

    renderGoldenRatioUI();
  }

  function handleGoldenRatioChange(el) {
    if (el && el.classList && el.classList.contains('ytax-money-input')) {
      formatInputWithCommas(el);
    }
    const inp = document.getElementById('ytax-gr-input-salary');
    if (inp) {
      const raw = (inp.value || '').toString().replace(/[^0-9]/g, '');
      const val = parseInt(raw, 10) || 0;
      state.guideSalary = val;
      renderGoldenRatioUI();
    }
  }

  function copyCoupleAdviceToClipboard() {
    const pSalary = Math.max(0, Number(state.annualSalary) || 0);
    const sSalary = Math.max(0, Number(state.spouseSalary) || 0);
    const familyExpense = Math.max(0, Number(state.familyExpenseTotal) || 0);
    const familyMedical = Math.max(0, Number(state.familyMedicalTotal) || 0);
    const depOptions = {
      coupleDepYouth: state.coupleDepYouth,
      coupleDepInfant: state.coupleDepInfant,
      coupleDepAdult: state.coupleDepAdult,
      coupleDepElderNormal: state.coupleDepElderNormal,
      coupleDepElderSenior: state.coupleDepElderSenior,
      coupleDepDisabled: state.coupleDepDisabled
    };
    const advice = analyzeCouple(pSalary, sSalary, familyExpense, familyMedical, depOptions);

    const text = `[👫 2026 맞벌이 부부 연말정산 절세 & 카드 소비 진단 결과 - CrytoPnL]
• 본인 총급여: ${formatWon(pSalary)} (세율 ${advice.isPrimaryHigher ? advice.higherRate.rate : advice.lowerRate.rate}%)
• 배우자 총급여: ${formatWon(sSalary)} (세율 ${advice.isPrimaryHigher ? advice.lowerRate.rate : advice.higherRate.rate}%)
• 부부 세율차이: ${advice.rateDiff}%p (${advice.higherName} 세율 우위)
---------------------------------
💳 [누구 카드로 써야 할까?]
• 추천: ${advice.cardStrategy.target}
• 전략: ${advice.cardStrategy.headline}
• 1단계: ${advice.cardStrategy.step1}
• 2단계: ${advice.cardStrategy.step2}
---------------------------------
🏥 [의료비 세액공제 3% 전략]
• ${advice.medicalAdvice.title}
• ${advice.medicalAdvice.desc}
---------------------------------
👶 [부양가족/자녀 인적공제 배정]
• ${advice.dependentAdvice.title}
• ${advice.dependentAdvice.desc}
---------------------------------
🎁 [고향사랑기부금 부부 더블 혜택]
• 부부 각자 10만원씩 기부 시 총 20만원 100% 환급 + 답례품 6만원 수령 (순이익 6만원!)
---------------------------------
출처: CrytoPnL 연말정산기 (https://crytopnl.com/#/yearend-tax)`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        alert('📋 맞벌이 부부 절세 진단 결과가 클립보드에 복사되었습니다!\n배우자에게 카카오톡으로 공유해 보세요.');
      }).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  // 맞벌이 절세 진단서 고해상도 이미지 생성 & 다운로드/공유
  let isSavingCoupleImage = false;
  function saveCoupleReportAsImage() {
    if (isSavingCoupleImage) return;
    isSavingCoupleImage = true;
    const pSalary = Math.max(0, Number(state.annualSalary) || 0);
    const sSalary = Math.max(0, Number(state.spouseSalary) || 0);
    const familyExpense = Math.max(0, Number(state.familyExpenseTotal) || 0);
    const familyMedical = Math.max(0, Number(state.familyMedicalTotal) || 0);
    const depOptions = {
      coupleDepYouth: state.coupleDepYouth,
      coupleDepInfant: state.coupleDepInfant,
      coupleDepAdult: state.coupleDepAdult,
      coupleDepElderNormal: state.coupleDepElderNormal,
      coupleDepElderSenior: state.coupleDepElderSenior,
      coupleDepDisabled: state.coupleDepDisabled
    };
    const advice = analyzeCouple(pSalary, sSalary, familyExpense, familyMedical, depOptions);

    const canvas = document.createElement('canvas');
    const scale = 2;
    const w = 840;
    const h = 1080;
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    const drawRoundRect = (x, y, width, height, radius, fill, stroke) => {
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, width, height, radius);
      } else {
        ctx.rect(x, y, width, height);
      }
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
    };

    // 1. 배경 그래디언트
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#060b18');
    bgGrad.addColorStop(0.5, '#0b132b');
    bgGrad.addColorStop(1, '#060a17');
    drawRoundRect(0, 0, w, h, 28, bgGrad, '#1e293b');

    // 2. 상단 헤더
    drawRoundRect(36, 36, 160, 26, 13, 'rgba(236, 72, 153, 0.15)', 'rgba(236, 72, 153, 0.4)');
    ctx.font = 'bold 11px Pretendard, -apple-system, sans-serif';
    ctx.fillStyle = '#f472b6';
    ctx.fillText('Dual-Income AI Report', 48, 53);

    const today = new Date();
    const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
    ctx.font = '11px Pretendard, -apple-system, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'right';
    ctx.fillText(`진단 일시: ${dateStr}`, w - 36, 53);
    ctx.textAlign = 'left';

    ctx.font = 'bold 24px Pretendard, -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('맞벌이 부부 연말정산 최적 절세 진단서', 36, 92);

    ctx.font = '12px Pretendard, -apple-system, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('CryptoPnL 스마트 연말정산 AI가 분석한 맞벌이 부부 최적 카드 & 인적공제 배분 가이드', 36, 114);

    // 3. Section 1: 부부 소득 및 세율 비교
    drawRoundRect(36, 135, w - 72, 135, 18, 'rgba(15, 23, 42, 0.8)', '#1e293b');
    ctx.font = 'bold 13px Pretendard, -apple-system, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('1. 부부 소득 및 적용세율 비교', 54, 160);

    // Primary box
    drawRoundRect(54, 172, 355, 82, 12, 'rgba(13, 148, 136, 0.12)', 'rgba(20, 184, 166, 0.35)');
    ctx.font = 'bold 12px Pretendard, -apple-system, sans-serif';
    ctx.fillStyle = '#2dd4bf';
    ctx.fillText(`본인: 연봉 ${formatWon(pSalary)}`, 68, 194);
    ctx.font = 'bold 16px Pretendard, -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`세율 ${advice.isPrimaryHigher ? advice.higherRate.label : advice.lowerRate.label}`, 68, 220);
    ctx.font = '11px Pretendard, -apple-system, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`카드 25% 문턱: ${formatWon(advice.pHurdle)}`, 68, 240);

    // Spouse box
    drawRoundRect(429, 172, 355, 82, 12, 'rgba(236, 72, 153, 0.12)', 'rgba(244, 114, 182, 0.35)');
    ctx.font = 'bold 12px Pretendard, -apple-system, sans-serif';
    ctx.fillStyle = '#f472b6';
    ctx.fillText(`배우자: 연봉 ${formatWon(sSalary)}`, 443, 194);
    ctx.font = 'bold 16px Pretendard, -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`세율 ${advice.isPrimaryHigher ? advice.lowerRate.label : advice.higherRate.label}`, 443, 220);
    ctx.font = '11px Pretendard, -apple-system, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`카드 25% 문턱: ${formatWon(advice.sHurdle)}`, 443, 240);

    // 4. Section 2: 핵심 솔루션 - 누구 카드로 소비해야 할까?
    drawRoundRect(36, 288, w - 72, 320, 20, 'rgba(120, 53, 15, 0.15)', 'rgba(245, 158, 11, 0.4)');
    drawRoundRect(54, 306, 120, 24, 12, 'rgba(245, 158, 11, 0.2)', 'rgba(245, 158, 11, 0.5)');
    ctx.font = 'bold 11px Pretendard, -apple-system, sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('핵심 절세 로드맵', 66, 322);

    ctx.font = 'bold 16px Pretendard, -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('2. 💳 누구 카드로 얼마를 소비해야 할까?', 185, 324);

    ctx.font = 'bold 14px Pretendard, -apple-system, sans-serif';
    ctx.fillStyle = '#fcd34d';
    ctx.fillText(advice.cardStrategy.headline.slice(0, 48), 54, 355);

    ctx.font = '11px Pretendard, -apple-system, sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(`부부 합산 카드 지출: ${formatWon(familyExpense)} | 추천 전략: ${advice.cardStrategy.target}`, 54, 375);

    // Visual Timeline Bar (Flowline)
    drawRoundRect(54, 390, w - 108, 42, 10, '#0f172a', '#334155');
    ctx.font = 'bold 11px monospace, Pretendard, sans-serif';
    ctx.fillStyle = '#38bdf8';
    let flowText = `0원 ── [${advice.higherName} 신용] ──▶ ${formatWon(advice.higherHurdle)} ── [${advice.higherName} 체크] ──▶ ${formatWon(advice.higherHurdle + Math.round(advice.higherCardLimit / 0.3))} ── [${advice.lowerName} 전환] ──▶ 그 이후`;
    if (familyExpense < advice.lowerHurdle) {
      flowText = `0원 ── [혜택 신용카드] ──▶ ${formatWon(familyExpense)} ── [25% 문턱 미달] ──▶ 공제 0원 (카드사 혜택 집중)`;
    } else if (familyExpense < advice.higherHurdle) {
      flowText = `0원 ── [${advice.lowerName} 신용] ──▶ ${formatWon(advice.lowerHurdle)} ── [${advice.lowerName} 체크 30%] ──▶ 한도 달성 ──▶ 절세 완료`;
    }
    ctx.fillText(flowText, 66, 415);

    // Step 1
    drawRoundRect(54, 444, w - 108, 70, 12, 'rgba(15, 23, 42, 0.9)', '#1e293b');
    drawRoundRect(68, 456, 22, 22, 11, 'rgba(245, 158, 11, 0.25)');
    ctx.font = 'bold 11px Pretendard, -apple-system, sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('1', 76, 471);
    ctx.font = 'bold 13px Pretendard, -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(advice.cardStrategy.step1Title || '1단계: 신용카드 결제 구간', 100, 472);
    ctx.font = '11px Pretendard, -apple-system, sans-serif';
    ctx.fillStyle = '#cbd5e1';
    const s1Text = (advice.cardStrategy.step1 || '').replace(/<[^>]*>/g, '').replace(/•/g, '').trim();
    ctx.fillText(s1Text.slice(0, 80), 100, 495);

    // Step 2
    drawRoundRect(54, 524, w - 108, 70, 12, 'rgba(15, 23, 42, 0.9)', '#1e293b');
    drawRoundRect(68, 536, 22, 22, 11, 'rgba(16, 185, 129, 0.25)');
    ctx.font = 'bold 11px Pretendard, -apple-system, sans-serif';
    ctx.fillStyle = '#34d399';
    ctx.fillText('2', 76, 551);
    ctx.font = 'bold 13px Pretendard, -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(advice.cardStrategy.step2Title || '2단계: 체크카드·현금영수증 집중 구간', 100, 552);
    ctx.font = '11px Pretendard, -apple-system, sans-serif';
    ctx.fillStyle = '#cbd5e1';
    const s2Text = (advice.cardStrategy.step2 || '').replace(/<[^>]*>/g, '').replace(/•/g, '').trim();
    ctx.fillText(s2Text.slice(0, 80), 100, 575);

    // 5. Section 3: 의료비 & 부양가족
    // Left: Medical
    drawRoundRect(36, 626, 365, 210, 18, 'rgba(15, 23, 42, 0.8)', 'rgba(99, 102, 241, 0.35)');
    ctx.font = 'bold 13px Pretendard, -apple-system, sans-serif';
    ctx.fillStyle = '#818cf8';
    ctx.fillText('3. 🏥 의료비 세액공제 (3% 역발상)', 54, 652);
    ctx.font = 'bold 13px Pretendard, -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(advice.medicalAdvice.title.slice(0, 26), 54, 678);
    ctx.font = '11px Pretendard, -apple-system, sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(`부부 합산 의료비: ${formatWon(familyMedical)}`, 54, 704);
    ctx.fillText(`• 본인 3% 문턱: ${formatWon(advice.pMedHurdle)}`, 54, 724);
    ctx.fillText(`• 배우자 3% 문턱: ${formatWon(advice.sMedHurdle)}`, 54, 744);
    ctx.font = 'bold 11px Pretendard, -apple-system, sans-serif';
    ctx.fillStyle = '#a5b4fc';
    ctx.fillText(`👉 ${advice.medicalAdvice.winner} 명의 결제 시 환급액 극대화!`, 54, 774);

    // Right: Dependents
    drawRoundRect(419, 626, 385, 210, 18, 'rgba(15, 23, 42, 0.8)', 'rgba(20, 184, 166, 0.35)');
    ctx.font = 'bold 13px Pretendard, -apple-system, sans-serif';
    ctx.fillStyle = '#2dd4bf';
    ctx.fillText('4. 👶 자녀 및 부양가족 인적공제 배정', 437, 652);
    ctx.font = 'bold 13px Pretendard, -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${advice.dependentAdvice.winner} 배정 강력 추천`, 437, 678);
    ctx.font = '11px Pretendard, -apple-system, sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(`• 청소년/미취학 자녀: 1인당 150만원 소득공제`, 437, 704);
    ctx.fillText(`• 70세 이상 경로우대: 1인당 250만원 + 의료비 무제한`, 437, 724);
    ctx.fillText(`• 장애인 부양가족: 1인당 350만원 + 의료비 무제한`, 437, 744);
    ctx.font = 'bold 11px Pretendard, -apple-system, sans-serif';
    ctx.fillStyle = '#5eead4';
    ctx.fillText(`👉 고세율자 배정 시 ${advice.rateDiff > 0 ? `+${advice.rateDiff}%p 세율 이득` : '절세 극대화'}!`, 437, 774);

    // 6. Section 4: Double Benefits
    drawRoundRect(36, 854, w - 72, 106, 16, 'rgba(16, 185, 129, 0.1)', 'rgba(16, 185, 129, 0.3)');
    ctx.font = 'bold 12px Pretendard, -apple-system, sans-serif';
    ctx.fillStyle = '#34d399';
    ctx.fillText('💡 고향사랑기부금 & 연금계좌 부부 더블 혜택', 54, 878);
    ctx.font = '11px Pretendard, -apple-system, sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('• 고향사랑기부금: 부부 각각 10만원씩 총 20만원 기부 시 20만원 전액 환급 + 6만원 답례품 순이익!', 54, 903);
    ctx.fillText('• 연금저축/IRP: 총급여 5,500만원 이하 배우자 계좌에 먼저 납입 시 16.5% 우대 공제율 적용!', 54, 926);

    // 7. Footer
    ctx.font = '11px Pretendard, -apple-system, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.fillText('CryptoPnL 연말정산 최적화 센터 • https://cryptopnl.com/#/yearend-tax', w / 2, 995);
    ctx.font = '10px Pretendard, -apple-system, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('※ 본 진단 결과는 세법 기준 추정치이며 실제 환급액은 회사 정산 내역에 따라 달라질 수 있습니다.', w / 2, 1018);
    ctx.textAlign = 'left';

    // Export Canvas to PNG Blob & File
    canvas.toBlob(async (blob) => {
      try {
        if (!blob) {
          alert('이미지 생성에 실패했습니다.');
          return;
        }

        const filename = `CryptoPnL_맞벌이절세진단서_${dateStr}.png`;

        // 1. Download file automatically
        const link = document.createElement('a');
        link.download = filename;
        link.href = URL.createObjectURL(blob);
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1500);

        // 2. Try copying image directly to clipboard
        // (카카오톡 PC에서 ClipboardItem image/png 사용 시 PNG + CF_DIB 중복 등록으로 2장이 붙여넣어지는 현상 방지:
        // DOM selection copy를 우선 시도하여 CF_DIB + HTML 단일 이미지 형식으로 전송)
        let clipboardSuccess = false;
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

          clipboardSuccess = document.execCommand('copy');
          selection.removeAllRanges();
          document.body.removeChild(div);
        } catch (e) {
          clipboardSuccess = false;
        }

        if (!clipboardSuccess && navigator.clipboard && navigator.clipboard.write && typeof ClipboardItem !== 'undefined') {
          try {
            const item = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([item]);
            clipboardSuccess = true;
          } catch (e) {
            console.warn('Clipboard write failed:', e);
          }
        }

        // 3. Try Mobile Web Share API if available
        if (navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: 'image/png' })] })) {
          try {
            await navigator.share({
              title: '맞벌이 부부 연말정산 최적 절세 진단서',
              text: `[CryptoPnL] 맞벌이 부부 연말정산 절세 진단서입니다.`,
              files: [new File([blob], filename, { type: 'image/png' })]
            });
            return;
          } catch (e) {
            // Fallback to alert below
          }
        }

        if (clipboardSuccess) {
          alert('🎉 맞벌이 절세 진단서 이미지가 저장되었습니다!\n\n클립보드에도 이미지가 복사되었으니, 카카오톡 채팅방에 바로 [붙여넣기(Ctrl+V)]하시면 1장의 이미지가 깔끔하게 전송됩니다.');
        } else {
          alert('🎉 맞벌이 절세 진단서 이미지가 다운로드되었습니다!\n\n다운로드된 이미지를 카카오톡으로 공유해 보세요.');
        }
      } finally {
        setTimeout(() => { isSavingCoupleImage = false; }, 800);
      }
    }, 'image/png');
  }

  function copyGoldenRatioToClipboard() {
    const salary = Math.max(0, Number(state.guideSalary) || 50000000);
    const gr = calcCardGoldenRatio(salary);

    const text = `[💳 연봉 ${formatWon(salary)} 신용카드 vs 현금/체크카드 황금 소비 공식 - CrytoPnL]
1️⃣ [0원 ~ ${formatWon(gr.hurdle)} (총급여 25%)]
   👉 무조건 신용카드 사용! (공제 0% 구간, 카드사 마일리지·할인 극대화)
2️⃣ [${formatWon(gr.hurdle)} ~ ${formatWon(gr.totalOptimum)}]
   👉 체크카드/현금영수증 집중 결제! (공제율 30%로 한도 ${formatWon(gr.limit)} 전액 달성)
3️⃣ [${formatWon(gr.totalOptimum)} 초과분]
   👉 전통시장/대중교통(40~80%) 또는 다시 혜택 좋은 신용카드 결제!
★ 예상 최대 절세 효과: 약 ${formatWon(gr.maxTaxSaved)}
출처: CrytoPnL 연말정산 팁 (https://crytopnl.com/#/yearend-tax)`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        alert('📋 연봉별 황금 소비 공식이 클립보드에 복사되었습니다!');
      }).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  // Load Form from State
  function syncFormFromState() {
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    };
    const setCheck = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.checked = Boolean(val);
    };

    setVal('ytax-input-salary', formatComma(state.annualSalary));
    setVal('ytax-input-prepaid', formatComma(state.manualPaidTax));
    setVal('ytax-select-paidmethod', state.paidTaxMethod);
    setCheck('ytax-chk-spouse', state.hasSpouse);
    setVal('ytax-input-children-youth', state.childrenYouthCount);
    setVal('ytax-input-children-infant', state.childrenInfantCount);
    setVal('ytax-input-children-adult', state.childrenAdultCount);
    setVal('ytax-input-children', state.childrenCount || (state.childrenYouthCount + state.childrenInfantCount));
    setVal('ytax-input-elders', state.eldersCount);
    setVal('ytax-input-senior-elders', state.isSeniorElder);
    setVal('ytax-input-disabled', state.disabledCount);
    setCheck('ytax-chk-singleparent', state.isSingleParent);
    setCheck('ytax-chk-femalehead', state.isFemaleHead);

    // Couple Tab Inputs
    setVal('ytax-couple-input-salary', formatComma(state.annualSalary));
    setVal('ytax-couple-input-spouse-salary', formatComma(state.spouseSalary));
    setVal('ytax-couple-input-expense', formatComma(state.familyExpenseTotal));
    setVal('ytax-couple-input-medical', formatComma(state.familyMedicalTotal));
    setVal('ytax-couple-input-dep-youth', state.coupleDepYouth || state.childrenYouthCount);
    setVal('ytax-couple-input-dep-infant', state.coupleDepInfant || state.childrenInfantCount);
    setVal('ytax-couple-input-dep-adult', state.coupleDepAdult || state.childrenAdultCount);
    setVal('ytax-couple-input-dep-elder-normal', state.coupleDepElderNormal || state.eldersCount);
    setVal('ytax-couple-input-dep-elder-senior', state.coupleDepElderSenior || state.isSeniorElder);
    setVal('ytax-couple-input-dep-disabled', state.coupleDepDisabled || state.disabledCount);

    setVal('ytax-input-creditcard', formatComma(state.creditCard));
    setVal('ytax-input-debitcard', formatComma(state.debitCard));
    setVal('ytax-input-markettransit', formatComma(state.marketTransit));
    setVal('ytax-input-housing', formatComma(state.housingSavings));
    setVal('ytax-input-rentloan', formatComma(state.rentLoanRepay));

    setVal('ytax-input-pensionsavings', formatComma(state.pensionSavings));
    setVal('ytax-input-irpsavings', formatComma(state.irpSavings));
    setVal('ytax-input-insurance', formatComma(state.insurance));
    setVal('ytax-input-medical', formatComma(state.medical));
    setVal('ytax-input-education', formatComma(state.education));
    setVal('ytax-input-hometown', formatComma(state.donationLoveHometown));
    setVal('ytax-input-donation', formatComma(state.donationGeneral));
    setVal('ytax-input-monthlyrent', formatComma(state.monthlyRent));
    setVal('ytax-gr-input-salary', formatComma(state.guideSalary));

    // Toggle manual prepaid tax input container visibility
    const manualPrepaidBox = document.getElementById('ytax-manual-prepaid-box');
    if (manualPrepaidBox) {
      if (state.paidTaxMethod === 'manual') manualPrepaidBox.classList.remove('hidden');
      else manualPrepaidBox.classList.add('hidden');
    }
  }

  // Read Form to State
  function syncStateFromForm() {
    const getNum = (id, fallback = 0) => {
      const el = document.getElementById(id);
      if (!el) return fallback;
      const raw = (el.value || '').toString().replace(/[^0-9]/g, '');
      if (raw === '') return fallback;
      const parsed = parseInt(raw, 10);
      return isNaN(parsed) ? fallback : parsed;
    };
    const getCheck = (id) => {
      const el = document.getElementById(id);
      return el ? el.checked : false;
    };
    const getVal = (id) => {
      const el = document.getElementById(id);
      return el ? el.value : '';
    };

    state.annualSalary = getNum('ytax-input-salary', 50000000);
    state.paidTaxMethod = getVal('ytax-select-paidmethod') || 'auto';
    state.manualPaidTax = getNum('ytax-input-prepaid', 2500000);
    state.hasSpouse = getCheck('ytax-chk-spouse');
    
    // 세분화 자녀 및 직계존속
    state.childrenYouthCount = getNum('ytax-input-children-youth', 0);
    state.childrenInfantCount = getNum('ytax-input-children-infant', 0);
    state.childrenAdultCount = getNum('ytax-input-children-adult', 0);
    state.childrenCount = state.childrenYouthCount + state.childrenInfantCount;
    state.eldersCount = getNum('ytax-input-elders', 0);
    state.isSeniorElder = getNum('ytax-input-senior-elders', 0);
    state.disabledCount = getNum('ytax-input-disabled', 0);
    state.isSingleParent = getCheck('ytax-chk-singleparent');
    state.isFemaleHead = getCheck('ytax-chk-femalehead');

    // Two-way sync to Couple Tab state & DOM
    state.coupleDepYouth = state.childrenYouthCount;
    state.coupleDepInfant = state.childrenInfantCount;
    state.coupleDepAdult = state.childrenAdultCount;
    state.coupleDepElderNormal = state.eldersCount;
    state.coupleDepElderSenior = state.isSeniorElder;
    state.coupleDepDisabled = state.disabledCount;

    const setCoupleVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    };
    setCoupleVal('ytax-couple-input-salary', formatComma(state.annualSalary));
    setCoupleVal('ytax-couple-input-dep-youth', state.coupleDepYouth);
    setCoupleVal('ytax-couple-input-dep-infant', state.coupleDepInfant);
    setCoupleVal('ytax-couple-input-dep-adult', state.coupleDepAdult);
    setCoupleVal('ytax-couple-input-dep-elder-normal', state.coupleDepElderNormal);
    setCoupleVal('ytax-couple-input-dep-elder-senior', state.coupleDepElderSenior);
    setCoupleVal('ytax-couple-input-dep-disabled', state.coupleDepDisabled);

    state.creditCard = getNum('ytax-input-creditcard', 0);
    state.debitCard = getNum('ytax-input-debitcard', 0);
    state.marketTransit = getNum('ytax-input-markettransit', 0);
    state.housingSavings = getNum('ytax-input-housing', 0);
    state.rentLoanRepay = getNum('ytax-input-rentloan', 0);

    state.pensionSavings = getNum('ytax-input-pensionsavings', 0);
    state.irpSavings = getNum('ytax-input-irpsavings', 0);
    state.insurance = getNum('ytax-input-insurance', 0);
    state.medical = getNum('ytax-input-medical', 0);
    state.education = getNum('ytax-input-education', 0);
    state.donationLoveHometown = getNum('ytax-input-hometown', 0);
    state.donationGeneral = getNum('ytax-input-donation', 0);
    state.monthlyRent = getNum('ytax-input-monthlyrent', 0);
  }

  function handleInputChange(el) {
    if (el && el.classList && el.classList.contains('ytax-money-input')) {
      formatInputWithCommas(el);
    }
    syncStateFromForm();
    const manualPrepaidBox = document.getElementById('ytax-manual-prepaid-box');
    if (manualPrepaidBox) {
      if (state.paidTaxMethod === 'manual') manualPrepaidBox.classList.remove('hidden');
      else manualPrepaidBox.classList.add('hidden');
    }
    updateUI();
  }

  function addSalary(amount) {
    const cur = Number(state.annualSalary) || 0;
    state.annualSalary = Math.max(0, cur + amount);
    const el = document.getElementById('ytax-input-salary');
    if (el) el.value = formatComma(state.annualSalary);
    const coupleEl = document.getElementById('ytax-couple-input-salary');
    if (coupleEl) coupleEl.value = formatComma(state.annualSalary);
    updateUI();
  }

  function applyPreset(key) {
    if (!presets[key]) return;
    state = { ...defaultState, ...presets[key] };
    syncFormFromState();
    updateUI();

    // Visual feedback on preset buttons
    document.querySelectorAll('.ytax-preset-btn').forEach(btn => {
      if (btn.dataset.preset === key) {
        btn.className = 'ytax-preset-btn px-3 py-1.5 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/40 text-xs font-bold transition shadow-sm';
      } else {
        btn.className = 'ytax-preset-btn px-3 py-1.5 rounded-xl bg-navy-950 hover:bg-navy-800 text-slate-400 hover:text-slate-200 border border-navy-800 text-xs font-medium transition';
      }
    });
  }

  function resetAll() {
    state = { ...defaultState };
    syncFormFromState();
    updateUI();
  }

  function copyResultToClipboard() {
    const res = calculate(state);
    const text = `[2026 대한민국 연말정산 모의계산 결과 - CrytoPnL]
• 총급여액: ${formatWon(res.salary)}
• 근로소득공제: -${formatWon(res.earnedIncomeDeduction)}
• 과세표준: ${formatWon(res.taxBase)}
• 산출세액: ${formatWon(res.calculatedTax)}
• 세액공제 합계: -${formatWon(res.totalTaxCredits)}
• 최종 결정세액(소득세+지방세): ${formatWon(res.totalFinalTax)}
• 기납부세액: ${formatWon(res.prePaidTax)}
---------------------------------
★ 최종 예상 결과: ${res.isRefund ? `환급 +${formatWon(res.refundOrPayAmount)} (13월의 월급)` : `추가납부 -${formatWon(res.refundOrPayAmount)}`}
★ 실효세율: ${res.effectiveTaxRate}%
• 연금저축/IRP 추가 납입 시 잠재 환급금: 최대 +${formatWon(res.extraPensionPotentialRefund)}
---------------------------------
출처: CrytoPnL 연말정산기 (https://crytopnl.com/#/yearend-tax)`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        alert('📋 연말정산 시뮬레이션 결과가 클립보드에 복사되었습니다!\n카카오톡이나 메모장에 바로 붙여넣으실 수 있습니다.');
      }).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      alert('📋 연말정산 시뮬레이션 결과가 클립보드에 복사되었습니다!');
    } catch (e) {
      alert('복사에 실패했습니다. 화면의 결과를 직접 캡처해 주세요.');
    }
    document.body.removeChild(ta);
  }

  // Init
  let isInitialized = false;
  function init() {
    if (isInitialized) {
      updateUI();
      return;
    }
    isInitialized = true;

    // Attach real-time comma formatting listener to all money inputs
    document.addEventListener('input', (e) => {
      if (e.target && e.target.classList && e.target.classList.contains('ytax-money-input')) {
        formatInputWithCommas(e.target);
      }
    });

    syncFormFromState();
    updateUI();
  }

  return {
    init,
    calculate,
    analyzeCouple,
    calcCardGoldenRatio,
    switchSubTab,
    handleInputChange,
    handleCoupleInputChange,
    handleGoldenRatioChange,
    setGoldenRatioSalary,
    addSalary,
    addCoupleSalary,
    addCoupleExpense,
    applyPreset,
    resetAll,
    copyResultToClipboard,
    copyCoupleAdviceToClipboard,
    saveCoupleReportAsImage,
    copyGoldenRatioToClipboard
  };
})();

// Global expose
window.YearendTaxCalculator = YearendTaxCalculator;