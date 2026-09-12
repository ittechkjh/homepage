/**
 * Government Policy & Welfare Benefits Hub (정부 정책 & 생활 지원 혜택 허브)
 * 2026 대한민국 최신 정부 지원 정책 데이터셋 및 대화형 인터랙티브 검색/진단 엔진
 */

(function (window) {
  'use strict';

  // 1. Policy Database (2026 최신 정부 정책 & 복지 혜택 실전 데이터)
  const POLICY_DATA = [
    // --- 🚗 교통 / 차량 ---
    {
      id: 'traffic-01',
      category: 'traffic',
      categoryName: '🚗 교통/차량',
      title: '다자녀 가구 고속도로 통행료 50% 감면',
      benefitBadge: '통행료 50% 감면',
      target: '2자녀 이상 (최연소 자녀 만 18세 미만) 가구',
      summary: '2자녀 이상 다자녀 가구의 경제적 부담을 완화하기 위해 한국도로공사 고속도로 이용 시 통행료를 50% 정률 감면해 주는 제도입니다.',
      details: [
        '지원 대상: 2자녀 이상 다자녀 가구 (막내 자녀 만 18세 이하)',
        '적용 차량: 가구당 1대의 비영업용 승용차 (배기량 무관) 또는 12인승 이하 승합차',
        '감면 혜택: 재정 고속도로 전 구간 통행료 50% 자동 할인',
        '이용 방식: 사전 하이패스 단말기 전자식 등록 후 전용 하이패스 차로 통과 시 자동 감면'
      ],
      agency: '국토교통부 / 한국도로공사',
      applyUrl: 'https://www.hipass.co.kr',
      applyName: '한국도로공사 하이패스 서비스',
      docs: ['가족관계증명서(상세)', '차량등록증 사본', '하이패스 단말기 정보'],
      tags: ['다자녀', '고속도로', '통행료', '하이패스', '차량', '할인']
    },
    {
      id: 'traffic-02',
      category: 'traffic',
      categoryName: '🚗 교통/차량',
      title: '친환경차(전기·수소차) 고속도로 통행료 50% 할인',
      benefitBadge: '통행료 50% 할인',
      target: '전기자동차 및 수소전기자동차 소유자',
      summary: '탄소중립 및 친환경차 보급 확대를 위해 전기차 및 수소차 전용 하이패스 이용 시 고속도로 통행료를 50% 할인합니다.',
      details: [
        '지원 대상: 친환경차 전용 번호판(파란색) 부착 전기차·수소차',
        '적용 노선: 한국도로공사 및 민자 고속도로 전 노선',
        '할인율: 고속도로 이용료의 50% 즉시 할인',
        '신청 방법: 하이패스 서비스 홈페이지 또는 도로공사 영업소에서 친환경차 단말기 등록'
      ],
      agency: '국토교통부',
      applyUrl: 'https://www.hipass.co.kr',
      applyName: '하이패스 친환경차 등록센터',
      docs: ['자동차등록증', '신분증'],
      tags: ['전기차', '수소차', '고속도로', '통행료', '친환경']
    },
    {
      id: 'traffic-03',
      category: 'traffic',
      categoryName: '🚗 교통/차량',
      title: 'K-패스 (전국 대중교통비 최대 53% 환급)',
      benefitBadge: '최대 53% 사후 환급',
      target: '만 19세 이상 모든 국민 (청년 및 저소득층 우대)',
      summary: '시내버스, 지하철, 광역버스, GTX 등 전국 대중교통을 월 15회 이상 이용 시 최대 60회까지 지출액의 일정 비율을 다음 달 현금 또는 마일리지로 자동 환급합니다.',
      details: [
        '일반인: 교통비의 20% 환급',
        '청년층 (만 19세~34세): 교통비의 30% 환급',
        '저소득층 (기초생활수급/차상위): 교통비의 53% 환급',
        '적용 수단: 전국 시내버스, 지하철, 신분당선, 광역버스, GTX 전 구간'
      ],
      agency: '국토교통부 대도시권광역교통위원회',
      applyUrl: 'https://korea-pass.kr',
      applyName: 'K-패스 공식 누리집',
      docs: ['K-패스 전용 제휴 신용/체크카드 발급 후 앱 등록'],
      tags: ['대중교통', '지하철', '버스', '환급', '청년', '교통비절약']
    },

    // --- 👨‍👩‍👧‍👦 다자녀 / 출산 / 가족 ---
    {
      id: 'family-01',
      category: 'family',
      categoryName: '👨‍👩‍👧‍👦 다자녀/가족',
      title: '다자녀 가구 전기요금 30% 감면 지원',
      benefitBadge: '전기요금 월 최대 1.6만 원 감면',
      target: '세대별 주민등록표상 자녀가 3인 이상인 가구 (또는 가구원 수 5인 이상)',
      summary: '다자녀 가구의 주거비 부담을 덜어주기 위해 한국전력공사에서 주거용 주택용 전기요금을 매월 30% (월 최대 16,000원) 감면해 드립니다.',
      details: [
        '지원 대상: 3자녀 이상 가구 또는 5인 이상 대가구 (자녀 연령 제한 없음)',
        '할인 혜택: 해당 월 전기요금의 30% 감면 (하절기 냉방 기간 추가 한도 적용)',
        '신청 방법: 한전ON 사이트 또는 국번없이 123 전화 신청, 관할 주민센터 방문'
      ],
      agency: '한국전력공사 / 산업통상자원부',
      applyUrl: 'https://online.kepco.co.kr',
      applyName: '한전ON 복지할인 신청',
      docs: ['주민등록등본', '전기요금 고객번호'],
      tags: ['전기세', '공공요금', '다자녀', '한전', '생활비절감']
    },
    {
      id: 'family-02',
      category: 'family',
      categoryName: '👨‍👩‍👧‍👦 다자녀/가족',
      title: '다자녀 가구 도시가스 및 지역난방 요금 감면',
      benefitBadge: '동절기 월 최대 3.6만 원 할인',
      target: '만 18세 미만 자녀 3인 이상 양육 가구',
      summary: '겨울철 난방비 부담 완화를 위해 취사 및 난방용 도시가스 요금과 지역난방 요금을 매월 정액 감면 지원합니다.',
      details: [
        '동절기 (12월~3월): 월 최대 24,000원 ~ 36,000원 감면',
        '기타 월 (4월~11월): 월 최대 6,600원 감면',
        '신청 방법: 정부24 또는 주소지 관할 주민센터 방문 일괄 복지 신청'
      ],
      agency: '산업통상자원부 / 도시가스사',
      applyUrl: 'https://www.gov.kr',
      applyName: '정부24 공공요금 감면 통합신청',
      docs: ['신분증', '도시가스 납부고지서 영수증'],
      tags: ['도시가스', '난방비', '다자녀', '공공요금', '겨울철']
    },
    {
      id: 'family-03',
      category: 'family',
      categoryName: '👨‍👩‍👧‍👦 다자녀/가족',
      title: '첫만남이용권 & 부모급여 지원',
      benefitBadge: '출생 시 최대 300만 원 + 월 100만 원',
      target: '대한민국 국적의 신생아 및 만 0~1세 영아 양육 부모',
      summary: '출산 초기 양육 부담을 덜어주기 위해 출생 축하 바우처와 매월 현금 부모급여를 전액 비과세로 지급합니다.',
      details: [
        '첫만남이용권 바우처: 첫째아 200만 원, 둘째아 이상 300만 원 국민행복카드 지급',
        '부모급여: 만 0세(0~11개월) 매월 100만 원, 만 1세(12~23개월) 매월 50만 원 현금 입금',
        '아동수당: 만 8세 미만 전 아동 매월 10만 원 별도 추가 지급'
      ],
      agency: '보건복지부',
      applyUrl: 'https://www.bokjiro.go.kr',
      applyName: '복지로 임신·출산 급여 신청',
      docs: ['출생신고 완료 후 행복출산 원스톱 서비스로 일괄 신청'],
      tags: ['출산지원금', '부모급여', '첫만남이용권', '아동수당', '육아']
    },
    {
      id: 'family-04',
      category: 'family',
      categoryName: '👨‍👩‍👧‍👦 다자녀/가족',
      title: '다자녀 가구 자동차 취득세 감면/면제',
      benefitBadge: '최대 140만 원 취득세 면제',
      target: '18세 미만 자녀 3명 이상을 양육하는 자 (2자녀 일부 감면 확대)',
      summary: '다자녀 양육 가구가 차량을 신규 취득·등록할 때 발생하는 지방세(취득세)를 최대 140만 원까지 감면 또는 전액 면제합니다.',
      details: [
        '7~10인승 승용차 및 15인승 이하 승합차: 취득세 전액 면제 (140만 원 초과 시 초과분만 납부)',
        '6인승 이하 일반 승용차: 최대 140만 원 한도 내 감면',
        '적용 기간: 차량 등록일로부터 1년 이내 매각/용도변경 금지 조건'
      ],
      agency: '행정안전부 / 관할 지자체 세무과',
      applyUrl: 'https://www.wetax.go.kr',
      applyName: '위택스 지방세 감면 신청',
      docs: ['자동차등록증', '가족관계증명서'],
      tags: ['자동차', '취득세', '지방세', '다자녀', '차량구입']
    },

    // --- 🏠 주거 / 금융 ---
    {
      id: 'housing-01',
      category: 'housing',
      categoryName: '🏠 주거/금융',
      title: '신생아 특례 디딤돌 대출 (주택구입자금 1%대 금리)',
      benefitBadge: '최저 1.6% ~ 3.3% 초저금리',
      target: '대출접수일 기준 2년 내 출산(입양) 무주택 가구 (소득 1.3억 이하)',
      summary: '출산 가구의 내 집 마련을 지원하기 위해 주택도시기금에서 시중은행 대비 파격적으로 낮은 최저 1.6%대 고정/변동금리로 최대 5억 원까지 대출합니다.',
      details: [
        '대상 주택: 주택가격 9억 원 이하, 전용면적 85㎡ 이하',
        '대출 한도: 최대 5억 원 (LTV 70%, 생애최초 80%)',
        '특례 금리: 소득에 따라 연 1.6% ~ 3.3% (5년간 특례 금리 유지, 추가 출산 시 1자녀당 0.2%p 우대 및 5년 연장)'
      ],
      agency: '국토교통부 / 주택도시기금',
      applyUrl: 'https://nhuf.molit.go.kr',
      applyName: '주택도시기금 기금e든든',
      docs: ['출생증명서 또는 가족관계증명서', '소득금액증명원', '부동산 매매계약서'],
      tags: ['신생아대출', '디딤돌', '주택구입', '저금리', '내집마련']
    },
    {
      id: 'housing-02',
      category: 'housing',
      categoryName: '🏠 주거/금융',
      title: '청년 주택드림 청약통장 & 전용 드림대출',
      benefitBadge: '최대 연 4.5% 우대금리 + 2%대 대출 연계',
      target: '만 19세~34세 무주택 청년 (연 소득 5천만 원 이하)',
      summary: '청년의 내 집 마련과 자산 형성을 원스톱으로 지원하기 위해 청약통장에 최고 연 4.5% 금리를 제공하고, 청약 당첨 시 최저 2.2% 전용 저리 대출을 연계합니다.',
      details: [
        '이자율: 가입 기간 2년 이상 시 최대 연 4.5% 우대이자 및 비과세 혜택',
        '납입 한도: 매월 2만 원 ~ 100만 원',
        '연계 대출: 해당 통장으로 청약 당첨 시 분양가 80%까지 최저 2.2% 초저리 대출 지원'
      ],
      agency: '국토교통부',
      applyUrl: 'https://nhuf.molit.go.kr',
      applyName: '시중 수탁은행(국민, 신한, 우리, 하나 등)',
      docs: ['신분증', '소득확인증명서(청년우대형 청약통장용)', '무주택 확약서'],
      tags: ['청약', '청년통장', '우대금리', '분양', '내집마련']
    },
    {
      id: 'housing-03',
      category: 'housing',
      categoryName: '🏠 주거/금융',
      title: '청년 월세 한시 특별지원 (월 20만 원 무상 지원)',
      benefitBadge: '월 최대 20만 원 (최장 12개월)',
      target: '만 19세~34세 부모와 별도 거주 무주택 청년',
      summary: '경제적 자립도가 낮은 무주택 청년의 주거비 부담 경감을 위해 실제 납부하는 임차료(월세)를 매달 최대 20만 원씩 최대 1년간 계좌로 직접 현금 입금합니다.',
      details: [
        '소득 요건: 청년 가구 중위소득 60% 이하 & 원가구 중위소득 100% 이하',
        '재산 요건: 청년 가구 1.22억 원 이하',
        '지원 내용: 실제 납부하는 월세 중 최대 20만 원(연 240만 원) 무상 지원'
      ],
      agency: '국토교통부 / 관할 지자체',
      applyUrl: 'https://www.bokjiro.go.kr',
      applyName: '복지로 청년 월세 지원',
      docs: ['임대차계약서', '월세 이체 영수증(최근 3개월)', '통장 사본'],
      tags: ['청년', '월세지원', '자취', '주거비', '무상지원']
    },

    // --- 💼 청년 / 근로 / 취업 ---
    {
      id: 'work-01',
      category: 'work',
      categoryName: '💼 청년/근로/일자리',
      title: '청년도약계좌 (5년 5,000만 원 목돈 마련)',
      benefitBadge: '정부 기여금 매월 최대 6% + 이자소득 비과세',
      target: '만 19세~34세 청년 (개인소득 7,500만 원 이하 & 가구 중위소득 250% 이하)',
      summary: '청년의 중장기 자산 형성을 돕기 위해 매월 최대 70만 원을 저축하면 정부 기여금을 최대 월 33,000원 매칭 지급하고 이자소득세를 전액 비과세합니다.',
      details: [
        '가입 기간: 5년 (60개월) 만기 적금',
        '정부 혜택: 매월 납입액에 비례해 정부 기여금 매월 추가 적립',
        '최종 수령액: 원금 + 은행 이자 + 정부 기여금 합산 시 최대 약 5,000만 원 형성'
      ],
      agency: '금융위원회 / 서민금융진흥원',
      applyUrl: 'https://www.kinfa.or.kr',
      applyName: '취급 시중은행 모바일 앱',
      docs: ['모바일 은행 앱에서 소득 간편인증으로 즉시 가입'],
      tags: ['목돈마련', '적금', '청년도약계좌', '비과세', '정부기여금']
    },
    {
      id: 'work-02',
      category: 'work',
      categoryName: '💼 청년/근로/일자리',
      title: '근로장려금 & 자녀장려금 현금 지급',
      benefitBadge: '최대 330만 원 현금 지급',
      target: '소득과 재산 요건을 충족하는 일하는 단독·홑벌이·맞벌이 가구',
      summary: '열심히 일하지만 소득이 적어 생활이 어려운 근로자, 사업자 가구에 실질 소득을 지원하기 위해 국세청에서 매년/반기별로 현금을 환급해 주는 제도입니다.',
      details: [
        '근로장려금 최대 지급액: 단독가구 165만 원, 홑벌이 285만 원, 맞벌이 330만 원',
        '자녀장려금: 18세 미만 부양자녀 1인당 최대 100만 원 추가 지급',
        '재산 요건: 가구원 재산 합계액 2억 4천만 원 미만 (부채 차감 안 함)'
      ],
      agency: '국세청',
      applyUrl: 'https://www.hometax.go.kr',
      applyName: '국세청 홈택스 장려금 신청',
      docs: ['국세청 자동 안내 대상자는 ARS 1544-9944 또는 손택스로 1분 신청'],
      tags: ['근로장려금', '자녀장려금', '국세청', '현금지급', '세금환급']
    },
    {
      id: 'work-03',
      category: 'work',
      categoryName: '💼 청년/근로/일자리',
      title: '국민취업지원제도 (구직촉진수당 월 50만 원)',
      benefitBadge: '월 50만 원 x 6개월 (최대 300만 원)',
      target: '만 15세~69세 구직자 및 취업준비생',
      summary: '취업을 원하는 청년 및 구직자에게 1:1 맞춤형 취업지원서비스를 제공하고, 구직활동에 전념할 수 있도록 생계 지원금(구직촉진수당)을 지급합니다.',
      details: [
        'Ⅰ유형: 구직촉진수당 월 50만 원 x 6개월 (부양가족 1인당 월 10만 원 추가 지원)',
        '취업성공수당: 취업 성공 후 근속 시 최대 150만 원 축하금 지급',
        'Ⅱ유형: 취업지원 서비스 및 직업훈련 참여수당 지원'
      ],
      agency: '고용노동부',
      applyUrl: 'https://www.kua.go.kr',
      applyName: '국민취업지원제도 포털',
      docs: ['취업지원신청서', '소득·재산 확인 서류'],
      tags: ['취업지원', '구직수당', '취준생', '청년지원금', '고용노동부']
    },

    // --- 💰 세제 / 소상공인 ---
    {
      id: 'tax-01',
      category: 'tax',
      categoryName: '💰 세제/소상공인',
      title: '연말정산 월세액 세액공제 (최대 17% 세금 환급)',
      benefitBadge: '연 최대 17% (최대 170만 원 공제)',
      target: '총급여 8,000만 원 이하 무주택 근로자',
      summary: '월세를 내고 거주하는 무주택 근로소득자의 연말정산 시 연간 지출한 월세액의 최대 17%를 결정세액에서 직접 차감 환급합니다.',
      details: [
        '총급여 5,500만 원 이하: 연간 월세액(최대 1,000만 원 한도)의 17% 세액공제',
        '총급여 5,500만 원 초과 8,000만 원 이하: 연간 월세액의 15% 세액공제',
        '대상 주택: 국민주택규모(85㎡ 이하) 또는 기준시가 4억 원 이하 주택(오피스텔, 고시원 포함)'
      ],
      agency: '국세청',
      applyUrl: 'https://www.hometax.go.kr',
      applyName: '연말정산 간소화 서비스',
      docs: ['주민등록등본', '임대차계약서 사본', '월세 계좌이체 영수증'],
      tags: ['월세공제', '연말정산', '절세', '세액공제', '근로자']
    },
    {
      id: 'tax-02',
      category: 'tax',
      categoryName: '💰 세제/소상공인',
      title: '소상공인 노란우산공제 (연 최대 500만 원 소득공제)',
      benefitBadge: '연 최대 500만 원 소득공제 + 복리이자',
      target: '소기업·소상공인 대표 및 프리랜서',
      summary: '폐업, 노령 등 생계위협으로부터 생활 안정을 기하고 사업 재기 기회를 제공받을 수 있도록 법으로 보호받는 공제 제도입니다.',
      details: [
        '소득공제: 사업소득 금액에 따라 연간 최대 200만 원 ~ 500만 원 소득공제',
        '자산 보호: 공제금 압류·양도·담보제공 법적 금지로 안전한 퇴직금 마련',
        '복리 이자 및 지자체 가입 장려금(월 1~2만 원 추가 지원)'
      ],
      agency: '중소벤처기업부 / 중소기업중앙회',
      applyUrl: 'https://www.8899.or.kr',
      applyName: '노란우산공제 공식 홈페이지',
      docs: ['사업자등록증', '원천징수이행상황신고서 또는 부가가치세과세표준증명'],
      tags: ['소상공인', '자영업자', '노란우산', '소득공제', '퇴직금']
    }
  ];

  // 2. State & Controller
  let activePolicyList = [...POLICY_DATA];
  let currentFilter = 'all';
  let searchQuery = '';
  let visibleLimit = 18;
  let isFetchingRemote = false;
  let quizFilters = {
    household: 'all',
    age: 'all',
    car: 'all'
  };

  function formatKoreanDateTime(isoStr) {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return '';
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${year}.${month}.${day} ${hours}:${minutes}`;
    } catch (e) {
      return '';
    }
  }

  async function loadRemotePolicies(force = false) {
    if (isFetchingRemote && !force) return;
    isFetchingRemote = true;
    try {
      const res = await fetch('data/policy-data.json?v=' + Date.now());
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.policies) && json.policies.length > 0) {
          const seen = new Set();
          const merged = [];

          // Curated policies first
          for (const item of POLICY_DATA) {
            seen.add(item.id);
            seen.add(item.title);
            merged.push(item);
          }

          // Remote extracted policies from API
          for (const item of json.policies) {
            if (!seen.has(item.id) && !seen.has(item.title)) {
              seen.add(item.id);
              seen.add(item.title);
              merged.push(item);
            }
          }

          activePolicyList = merged;
          renderPolicyGrid();

          const formattedDate = formatKoreanDateTime(json.updatedAt);
          const updatedEl = document.getElementById('policy-last-updated');
          if (updatedEl && formattedDate) {
            updatedEl.innerText = formattedDate;
          }

          const liveBadge = document.getElementById('policy-live-badge');
          if (liveBadge) {
            const timeTag = formattedDate ? `<span class="hidden sm:inline text-emerald-300/80 text-[11px] font-normal ml-1">· 최근 갱신: ${formattedDate}</span>` : '';
            liveBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> <span>정부24 공공데이터 자동 연동 (${activePolicyList.length}건)</span>${timeTag}`;
          }

          if (window.lucide && typeof window.lucide.createIcons === 'function') {
            try { window.lucide.createIcons(); } catch (e) {}
          }
        }
      }
    } catch (e) {
      console.warn('Fallback to local curated policies:', e);
      const updatedEl = document.getElementById('policy-last-updated');
      if (updatedEl) updatedEl.innerText = '로컬 큐레이션';
    } finally {
      isFetchingRemote = false;
    }
  }

  function getFilteredPolicies() {
    return activePolicyList.filter(item => {
      // Category filter
      if (currentFilter !== 'all' && item.category !== currentFilter) {
        return false;
      }

      // Quiz conditional matching
      const targetStr = (item.target || '') + ' ' + (item.summary || '');
      const tagList = item.tags || [];

      if (quizFilters.household === 'children_2plus') {
        const isMulti = tagList.includes('다자녀') || targetStr.includes('다자녀') || targetStr.includes('2자녀') || targetStr.includes('3자녀') || item.category === 'family';
        if (!isMulti) return false;
      } else if (quizFilters.household === 'newborn') {
        const isNewborn = tagList.includes('출산') || targetStr.includes('출산') || targetStr.includes('신생아') || targetStr.includes('영유아') || targetStr.includes('부모급여');
        if (!isNewborn) return false;
      } else if (quizFilters.household === 'single') {
        const isFamilyOnly = (item.category === 'family' || targetStr.includes('다자녀')) && !tagList.includes('청년');
        if (isFamilyOnly) return false;
      }

      if (quizFilters.age === 'youth') {
        const isYouth = item.category === 'youth' || tagList.includes('청년') || targetStr.includes('청년') || targetStr.includes('19세');
        if (!isYouth && item.category === 'youth') return false;
      }

      if (quizFilters.car === 'ev') {
        const isEv = tagList.includes('전기차') || tagList.includes('수소차') || targetStr.includes('전기차') || targetStr.includes('수소차');
        if (item.category === 'traffic' && !isEv && !targetStr.includes('고속도로')) return false;
      } else if (quizFilters.car === 'public_transit') {
        if (item.id === 'traffic-01' || item.id === 'traffic-02' || item.id === 'family-04') {
          return false;
        }
      }

      // Text search
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const inTitle = item.title && item.title.toLowerCase().includes(q);
        const inSummary = item.summary && item.summary.toLowerCase().includes(q);
        const inTags = Array.isArray(item.tags) && item.tags.some(t => t && t.toLowerCase().includes(q));
        const inAgency = item.agency && item.agency.toLowerCase().includes(q);
        const inTarget = item.target && item.target.toLowerCase().includes(q);
        return inTitle || inSummary || inTags || inAgency || inTarget;
      }

      return true;
    });
  }

  function renderPolicyGrid() {
    const container = document.getElementById('policy-cards-grid');
    const countEl = document.getElementById('policy-result-count');
    const loadMoreContainer = document.getElementById('policy-load-more-container');
    const remainingCountEl = document.getElementById('policy-remaining-count');
    if (!container) return;

    const items = getFilteredPolicies();
    if (countEl) countEl.innerText = items.length;

    if (items.length === 0) {
      if (loadMoreContainer) loadMoreContainer.classList.add('hidden');
      container.innerHTML = `
        <div class="col-span-full py-16 text-center bg-navy-900/60 border border-navy-800 rounded-3xl p-8">
          <div class="w-16 h-16 rounded-2xl bg-navy-800/80 border border-navy-700 flex items-center justify-center text-slate-400 text-2xl mx-auto mb-3">
            🔍
          </div>
          <h3 class="text-base font-bold text-slate-200 mb-1">검색 조건에 맞는 정부 정책이 없습니다</h3>
          <p class="text-xs text-slate-400 mb-4">검색어를 줄이시거나 필터 조건을 변경해 보세요.</p>
          <button onclick="PolicyHub.resetFilters()" class="px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-bold transition">
            검색 필터 초기화
          </button>
        </div>
      `;
      return;
    }

    const visibleItems = items.slice(0, visibleLimit);

    if (loadMoreContainer) {
      if (items.length > visibleLimit) {
        loadMoreContainer.classList.remove('hidden');
        if (remainingCountEl) {
          remainingCountEl.innerText = `(남은 ${items.length - visibleLimit}개)`;
        }
      } else {
        loadMoreContainer.classList.add('hidden');
      }
    }

    container.innerHTML = visibleItems.map(item => {
      const badge = item.benefitBadge || '정부 지원';
      const agency = item.agency || '대한민국 정부';
      const categoryName = item.categoryName || '🏛️ 정부정책';

      return `
        <div class="bg-navy-900 border border-navy-800 hover:border-cyan-500/40 rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col justify-between group cursor-pointer relative overflow-hidden" onclick="PolicyHub.openDetailModal('${item.id}')">
          <!-- Top Category & Benefit Badge -->
          <div>
            <div class="flex items-center justify-between gap-2 mb-3">
              <span class="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-navy-950 border border-navy-800 text-slate-300">
                ${categoryName}
              </span>
              <span class="text-[11px] font-black px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono shadow-sm truncate max-w-[140px]">
                ${badge}
              </span>
            </div>

            <!-- Title & Summary -->
            <h3 class="text-base sm:text-lg font-bold text-white group-hover:text-cyan-300 transition line-clamp-1 leading-snug mb-2">
              ${item.title}
            </h3>
            <p class="text-xs text-slate-400 leading-relaxed line-clamp-2 mb-4">
              ${item.summary}
            </p>
          </div>

          <!-- Target Audience Highlight Box -->
          <div class="space-y-3 pt-3 border-t border-navy-800/80">
            <div class="p-2.5 rounded-xl bg-navy-950/70 border border-navy-800/60 text-xs">
              <span class="text-slate-500 font-semibold block text-[10px] uppercase mb-0.5">지원 대상</span>
              <span class="text-slate-200 font-medium line-clamp-1">${item.target}</span>
            </div>

            <div class="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span class="truncate">${agency}</span>
              <span class="text-cyan-400 font-bold group-hover:translate-x-0.5 transition flex items-center gap-1 shrink-0">
                상세보기 <i data-lucide="chevron-right" class="w-3.5 h-3.5 inline"></i>
              </span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  }

  function loadMore() {
    visibleLimit += 18;
    renderPolicyGrid();
  }

  function openDetailModal(policyId) {
    const item = activePolicyList.find(p => p.id === policyId);
    if (!item) return;

    const modal = document.getElementById('modal-policy-detail');
    if (!modal) return;

    const titleEl = document.getElementById('modal-policy-title');
    const badgeEl = document.getElementById('modal-policy-badge');
    const summaryEl = document.getElementById('modal-policy-summary');
    const targetEl = document.getElementById('modal-policy-target');
    const detailsListEl = document.getElementById('modal-policy-details-list');
    const docsListEl = document.getElementById('modal-policy-docs-list');
    const agencyEl = document.getElementById('modal-policy-agency');
    const applyBtn = document.getElementById('modal-policy-apply-btn');

    if (titleEl) titleEl.innerText = item.title;
    if (badgeEl) badgeEl.innerText = item.benefitBadge || '정부 지원';
    if (summaryEl) summaryEl.innerText = item.summary;
    if (targetEl) targetEl.innerText = item.target;
    if (agencyEl) agencyEl.innerText = item.agency || '대한민국 정부';

    if (detailsListEl) {
      const detailsArr = Array.isArray(item.details) && item.details.length > 0 ? item.details : [item.summary];
      detailsListEl.innerHTML = detailsArr.map(d => `
        <li class="flex items-start gap-2 text-xs sm:text-sm text-slate-300">
          <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0"></span>
          <span>${d}</span>
        </li>
      `).join('');
    }

    if (docsListEl) {
      const docsArr = Array.isArray(item.docs) && item.docs.length > 0 ? item.docs : ['신분증', '주민등록등본', '자격확인서류'];
      docsListEl.innerHTML = docsArr.map(doc => `
        <span class="px-2.5 py-1 rounded-lg bg-navy-950 border border-navy-800 text-slate-300 text-xs font-mono">
          📄 ${doc}
        </span>
      `).join('');
    }

    if (applyBtn) {
      applyBtn.href = item.applyUrl || 'https://www.gov.kr';
      applyBtn.innerHTML = `<span>${item.applyName || '정부24 바로가기'}</span> <i data-lucide="external-link" class="w-4 h-4 inline"></i>`;
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  }

  function closeDetailModal() {
    const modal = document.getElementById('modal-policy-detail');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  function filterCategory(cat) {
    currentFilter = cat;
    visibleLimit = 18;
    const buttons = document.querySelectorAll('.policy-cat-btn');
    buttons.forEach(btn => {
      if (btn.dataset.cat === cat) {
        btn.classList.add('active', 'bg-cyan-500/20', 'text-cyan-400', 'border-cyan-500/50', 'font-bold');
        btn.classList.remove('bg-navy-950', 'text-slate-400', 'border-navy-800');
      } else {
        btn.classList.remove('active', 'bg-cyan-500/20', 'text-cyan-400', 'border-cyan-500/50', 'font-bold');
        btn.classList.add('bg-navy-950', 'text-slate-400', 'border-navy-800');
      }
    });
    renderPolicyGrid();
  }

  function handleSearch(val) {
    searchQuery = val || '';
    visibleLimit = 18;
    const clearBtn = document.getElementById('policy-search-clear');
    if (clearBtn) {
      if (searchQuery) clearBtn.classList.remove('hidden');
      else clearBtn.classList.add('hidden');
    }
    renderPolicyGrid();
  }

  function clearSearch() {
    searchQuery = '';
    visibleLimit = 18;
    const input = document.getElementById('policy-search-input');
    if (input) input.value = '';
    const clearBtn = document.getElementById('policy-search-clear');
    if (clearBtn) clearBtn.classList.add('hidden');
    renderPolicyGrid();
  }

  function updateQuizFilter(key, value) {
    quizFilters[key] = value;
    visibleLimit = 18;
    renderPolicyGrid();
  }

  function resetFilters() {
    currentFilter = 'all';
    searchQuery = '';
    visibleLimit = 18;
    quizFilters = { household: 'all', age: 'all', car: 'all' };

    const input = document.getElementById('policy-search-input');
    if (input) input.value = '';

    const quizSelects = document.querySelectorAll('.policy-quiz-select');
    quizSelects.forEach(s => s.value = 'all');

    filterCategory('all');
  }

  // Public Interface
  window.PolicyHub = {
    init: function () {
      renderPolicyGrid();
      loadRemotePolicies();
    },
    refresh: function () {
      loadRemotePolicies(true);
    },
    loadMore,
    filterCategory,
    handleSearch,
    clearSearch,
    updateQuizFilter,
    resetFilters,
    openDetailModal,
    closeDetailModal
  };

})(window);
