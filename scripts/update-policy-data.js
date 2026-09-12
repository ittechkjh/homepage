/**
 * Government Policy & Benefits Automated Extraction & Refinement Pipeline
 * Runs in Node.js (GitHub Actions or local environment)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.DATA_GO_KR_API_KEY || 'G7N6elMlYOmqsOnctk%2B0X1Dpyz1ajBFF82gcH8Sl%2FgRDD5Jb4gangmAU2KZgmWSerzjtZqEQLlAxay4dFH3IPw%3D%3D';
const MAX_PAGES = parseInt(process.env.MAX_PAGES || '20', 10);

const scriptDir = __dirname;
const rootDir = path.resolve(scriptDir, '..');
const configFile = path.join(scriptDir, 'policy-filter-config.json');
const outputDir = path.join(rootDir, 'data');
const outputFile = path.join(outputDir, 'policy-data.json');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));

// Curated Top 2026 Core Policies (Always Guaranteed High-Priority)
const CURATED_POLICIES = [
  {
    id: 'traffic-curated-01',
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
    id: 'traffic-curated-02',
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
    id: 'traffic-curated-03',
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
  {
    id: 'utility-curated-01',
    category: 'utility',
    categoryName: '💡 공공요금 감면',
    title: '다자녀 가구 전기요금 30% 감면',
    benefitBadge: '전기요금 월 최대 16,000원 감면',
    target: '자녀 3인 이상 또는 손 3인 이상 가구 (자녀 2인 이상 시범확대 지자체 포함)',
    summary: '다자녀 가구의 주거 복지 증진을 위해 한국전력공사에서 주택용 전기요금을 매월 30% 정률 감면합니다.',
    details: [
      '지원 내용: 주택용 전기요금 월 청구금액의 30% 감면 (월 최대 16,000원 한도)',
      '여름철(6~8월) 우대: 냉방기기 가동 지원을 위해 월 최대 20,800원까지 할인 한도 확대',
      '신청 방법: 한전ON(online.kepco.co.kr), 고객센터(국번없이 123), 또는 주민센터 방문 신청',
      '아파트 거주자: 관리사무소에 다자녀 전기요금 할인 신청서 제출 시 관리비 고지서에서 차감'
    ],
    agency: '산업통상자원부 / 한국전력공사',
    applyUrl: 'https://online.kepco.co.kr',
    applyName: '한전ON 사이버지점',
    docs: ['전기요금 영수증(고객번호 확인용)', '주민등록등본'],
    tags: ['전기요금', '다자녀', '공공요금', '할인', '한전']
  },
  {
    id: 'utility-curated-02',
    category: 'utility',
    categoryName: '💡 공공요금 감면',
    title: '다자녀 가구 도시가스 요금 감면',
    benefitBadge: '도시가스 요금 동절기 감면',
    target: '주민등록표상 세대주와의 관계가 자 3인 이상 또는 손 3인 이상인 가구',
    summary: '동절기 난방비 부담 완화를 위해 각 지역 도시가스 회사에서 취사 및 난방용 가스요금을 경감해 주는 제도입니다.',
    details: [
      '감면 내용: 동절기(12월~3월) 월 최대 18,000원, 기타 계절 월 3,300원 요금 차감',
      '적용 용도: 주택용(개별난방 및 취사) 도시가스',
      '신청 기한: 연중 상시 신청 가능 (신청일 익월 고지서부터 자동 감면 반영)',
      '신청 기관: 관할 지역 도시가스 공급사 또는 주소지 읍면동 주민센터'
    ],
    agency: '산업통상자원부 / 한국가스공사',
    applyUrl: 'https://www.gov.kr',
    applyName: '정부24 도시가스 감면신청',
    docs: ['도시가스 납부고지서', '주민등록등본'],
    tags: ['도시가스', '다자녀', '난방비', '공공요금', '가스요금']
  },
  {
    id: 'housing-curated-01',
    category: 'housing',
    categoryName: '🏠 주거/부동산/금융',
    title: '신생아 특례 디딤돌 대출 (주택구입자금)',
    benefitBadge: '최저 연 1.6%~3.3% 초저금리',
    target: '대출신청일 기준 2년 내 출산(입양)한 무주택 세대주',
    summary: '출산 가구의 주거 안정을 위해 시중금리보다 파격적으로 저렴한 연 1.6%~3.3% 고정·변동금리로 최대 5억 원까지 주택 구입 자금을 대출해 드립니다.',
    details: [
      '대출 한도: 최대 5억 원 (LTV 일반 70%, 생애최초 80% 적용, DSR 미적용)',
      '대상 주택: 주거전용면적 85㎡ 이하 (읍·면 100㎡ 이하), 평가액 9억 원 이하 주택',
      '소득 조건: 부부합산 연소득 1.3억 원 이하 (2026년 기준 2억 원 완화 기준 확인 필요)',
      '우대 금리: 추가 출산 시 1자녀당 연 0.2%p 금리 인하 및 특례기간 5년 연장'
    ],
    agency: '국토교통부 / 주택도시보증공사(HUG)',
    applyUrl: 'https://nhuf.molit.go.kr',
    applyName: '주택도시기금 기금e든든',
    docs: ['출생증명서 또는 가족관계증명서', '소득증빙서류', '매매계약서 사본'],
    tags: ['신생아', '특례대출', '디딤돌', '주택구입', '저금리', '출산혜택', '부동산']
  }
];

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error(`Status ${res.statusCode}: ${res.statusMessage}`));
      }
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('timeout', () => {
      req.destroy(new Error('Request timed out after 15s'));
    });
    req.on('error', reject);
  });
}

async function run() {
  console.log('Starting Government Policy Extraction Pipeline...');
  console.log(`Config loaded with ${config.categories.length} categories.`);

  const seenIds = new Set();
  const seenTitles = new Set();
  const policyList = [];

  // 1. Add curated policies first
  for (const cp of CURATED_POLICIES) {
    seenIds.add(cp.id);
    seenTitles.add(cp.title);
    policyList.push(cp);
  }

  // 2. Fetch from Gov24 API
  const f = config.fields;
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `https://api.odcloud.kr/api/gov24/v3/serviceList?page=${page}&perPage=100&serviceKey=${API_KEY}`;
    try {
      const resp = await fetchJson(url);
      const items = resp.data || [];
      if (items.length === 0) {
        console.log(`Page ${page} is empty. Done.`);
        break;
      }
      console.log(`Page ${page}: received ${items.length} items.`);

      for (const item of items) {
        const svcId = String(item[f.id] || '');
        const svcName = String(item[f.name] || '');
        if (!svcId || !svcName) continue;
        if (seenIds.has(svcId) || seenTitles.has(svcName)) continue;

        const pSummary = String(item[f.summary] || '');
        const pTarget = String(item[f.target] || '');
        const pContent = String(item[f.content] || '');
        const pCat = String(item[f.category] || '');
        const pType = String(item[f.type] || '');
        const pAgency = String(item[f.agency] || '');
        const pUrl = String(item[f.url] || '');

        const searchBlob = `${svcName} ${pSummary} ${pTarget} ${pContent} ${pCat}`.toLowerCase();

        let matchedCat = null;
        let matchedKw = null;

        for (const cat of config.categories) {
          for (const kw of cat.keywords) {
            if (searchBlob.includes(kw.toLowerCase())) {
              matchedCat = cat;
              matchedKw = kw;
              break;
            }
          }
          if (matchedCat) break;
        }

        if (matchedCat) {
          seenIds.add(svcId);
          seenTitles.add(svcName);

          const badge = pType ? `${pType}` : matchedCat.defaultBadge;

          const details = [];
          if (pContent) {
            const lines = pContent.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
            for (const l of lines) {
              const clean = l.replace(/^[\s\-\*\•\d\.\)\:\○]+/, '').trim();
              if (clean.length > 5 && details.length < 4) {
                details.push(clean);
              }
            }
          }
          if (details.length === 0 && pSummary) {
            details.push(pSummary);
          }

          policyList.push({
            id: `gov-${svcId}`,
            category: matchedCat.id,
            categoryName: matchedCat.name,
            title: svcName,
            benefitBadge: badge,
            target: pTarget ? pTarget.trim() : config.defaults.defaultTarget,
            summary: pSummary ? pSummary.trim() : svcName,
            details: details,
            agency: pAgency || '대한민국 정부',
            applyUrl: pUrl || 'https://www.gov.kr',
            applyName: config.defaults.applyName,
            docs: config.defaults.docs,
            tags: [matchedKw, matchedCat.id, '정부지원']
          });
        }
      }
    } catch (err) {
      console.warn(`Error on page ${page}:`, err.message);
      break;
    }
  }

  console.log(`Total refined policies: ${policyList.length}`);

  const outputData = {
    updatedAt: new Date().toISOString(),
    source: config.defaults.source,
    totalCount: policyList.length,
    policies: policyList
  };

  fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2), 'utf8');
  console.log(`Generated ${outputFile} successfully!`);
}

run().catch(console.error);
