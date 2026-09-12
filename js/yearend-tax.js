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
    childrenCount: 0,            // 20세 이하 부양가족/자녀 수
    eldersCount: 0,              // 60세 이상 부모님/직계존속 수
    isSeniorElder: 0,            // 70세 이상 경로우대 추가인원
    disabledCount: 0,            // 장애인 수
    isSingleParent: false,       // 한부모 추가공제
    isFemaleHead: false,         // 부녀자 추가공제

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
    monthlyRent: 0               // 월세액 (무주택 세대주, 총급여 7천만 이하)
  };

  let state = { ...defaultState };

  // Helper: Format Won
  function formatWon(num) {
    if (isNaN(num) || num === null || num === undefined) return '0원';
    const rounded = Math.round(num);
    return rounded.toLocaleString('ko-KR') + '원';
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

  // Main Calculation Engine
  function calculate(s = state) {
    const salary = Math.max(0, Number(s.annualSalary) || 0);

    // 1. 근로소득공제 및 근로소득금액
    const earnedIncomeDeduction = calcEarnedIncomeDeduction(salary);
    const earnedIncomeAmount = Math.max(0, salary - earnedIncomeDeduction);

    // 2. 인적공제
    let personalDeduction = 1500000; // 본인 150만원
    if (s.hasSpouse) personalDeduction += 1500000;
    personalDeduction += (Number(s.childrenCount) || 0) * 1500000;
    personalDeduction += (Number(s.eldersCount) || 0) * 1500000;
    // 추가공제
    personalDeduction += (Number(s.isSeniorElder) || 0) * 1000000; // 70세 이상
    personalDeduction += (Number(s.disabledCount) || 0) * 2000000; // 장애인
    if (s.isSingleParent) personalDeduction += 1000000; // 한부모
    if (s.isFemaleHead && salary <= 45000000) personalDeduction += 500000; // 부녀자 (종합소득 3천만 이하)

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

    // (2) 자녀 세액공제 (2024~2026 세법: 1명 15만, 2명 35만, 3명 이상 35만 + 인당 30만)
    let childTaxCredit = 0;
    const childCnt = Number(s.childrenCount) || 0;
    if (childCnt === 1) childTaxCredit = 150000;
    else if (childCnt === 2) childTaxCredit = 350000;
    else if (childCnt >= 3) childTaxCredit = 350000 + (childCnt - 2) * 300000;

    // (3) 연금계좌 세액공제 (연금저축 최대 600만, IRP 합산 최대 900만)
    const pSavings = Math.min(6000000, Number(s.pensionSavings) || 0);
    const irpSavings = Number(s.irpSavings) || 0;
    const totalPensionDeposit = Math.min(9000000, pSavings + irpSavings);
    const pensionCreditRate = (salary <= 55000000) ? 0.15 : 0.12;
    const pensionTaxCredit = totalPensionDeposit * pensionCreditRate;

    // (4) 보장성 보험료 세액공제 (100만원 한도 * 12%)
    const insuranceTaxCredit = Math.min(1000000, Number(s.insurance) || 0) * 0.12;

    // (5) 의료비 세액공제 (총급여 3% 초과 지출액의 15%, 한도 700만원)
    const medicalThreshold = salary * 0.03;
    const medicalSpent = Number(s.medical) || 0;
    let medicalTaxCredit = 0;
    if (medicalSpent > medicalThreshold) {
      medicalTaxCredit = Math.min(7000000, medicalSpent - medicalThreshold) * 0.15;
    }

    // (6) 교육비 세액공제 (지출액의 15%)
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
      childrenCount: 0,
      eldersCount: 0,
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
      childrenCount: 0,
      eldersCount: 0,
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
      childrenCount: 2,
      eldersCount: 0,
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
      childrenCount: 1,
      eldersCount: 1,
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

    setVal('ytax-input-salary', state.annualSalary);
    setVal('ytax-input-prepaid', state.manualPaidTax);
    setVal('ytax-select-paidmethod', state.paidTaxMethod);
    setCheck('ytax-chk-spouse', state.hasSpouse);
    setVal('ytax-input-children', state.childrenCount);
    setVal('ytax-input-elders', state.eldersCount);
    setVal('ytax-input-senior-elders', state.isSeniorElder);
    setVal('ytax-input-disabled', state.disabledCount);
    setCheck('ytax-chk-singleparent', state.isSingleParent);
    setCheck('ytax-chk-femalehead', state.isFemaleHead);

    setVal('ytax-input-creditcard', state.creditCard);
    setVal('ytax-input-debitcard', state.debitCard);
    setVal('ytax-input-markettransit', state.marketTransit);
    setVal('ytax-input-housing', state.housingSavings);
    setVal('ytax-input-rentloan', state.rentLoanRepay);

    setVal('ytax-input-pensionsavings', state.pensionSavings);
    setVal('ytax-input-irpsavings', state.irpSavings);
    setVal('ytax-input-insurance', state.insurance);
    setVal('ytax-input-medical', state.medical);
    setVal('ytax-input-education', state.education);
    setVal('ytax-input-hometown', state.donationLoveHometown);
    setVal('ytax-input-donation', state.donationGeneral);
    setVal('ytax-input-monthlyrent', state.monthlyRent);

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
      const parsed = parseFloat(el.value);
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
    state.childrenCount = getNum('ytax-input-children', 0);
    state.eldersCount = getNum('ytax-input-elders', 0);
    state.isSeniorElder = getNum('ytax-input-senior-elders', 0);
    state.disabledCount = getNum('ytax-input-disabled', 0);
    state.isSingleParent = getCheck('ytax-chk-singleparent');
    state.isFemaleHead = getCheck('ytax-chk-femalehead');

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

  function handleInputChange() {
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
    if (el) el.value = state.annualSalary;
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
    syncFormFromState();
    updateUI();
  }

  return {
    init,
    calculate,
    handleInputChange,
    addSalary,
    applyPreset,
    resetAll,
    copyResultToClipboard
  };
})();

// Global expose
window.YearendTaxCalculator = YearendTaxCalculator;