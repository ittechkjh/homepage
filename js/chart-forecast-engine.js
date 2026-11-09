/**
 * CrytoPnL - BTC/USDT 실전 차트 작도 & AI 기술적 분석 시뮬레이터 & 향후 전망 예측 엔진
 * - 다우 이론 (HH/HL 구조)
 * - 엘리엇 파동 (1~5파 충격 + A-B-C 조정)
 * - 이동평균선 (20·50·200일선 골든/데드크로스)
 * - RSI 다이버전스 (일반 상승/하락 다이버전스)
 * - 핵심 지지/저항 매물대 및 넥라인
 * - 실시간 BTC/USDT 일봉 연동 및 AI 3단계 향후 전망 예측 궤적 (상승/중립/하락 시나리오)
 */

(function () {
    // ============================================================================
    // 1. SCENARIOS DATASETS (HISTORICAL + REAL-TIME FORECAST)
    // ============================================================================

    const SCENARIOS = {
        live_btc: {
            title: "BTC/USDT 1D • 실시간 비트코인 일봉 & AI 향후 전망 예측",
            eraTag: "⚡ 실시간 AI 예측",
            subtitle: "현재 실제 바이낸스/업비트 비트코인 일봉 데이터를 분석하여 실시간 다우 구조, 이평선 정/역배열, RSI 다이버전스 및 향후 3대 시나리오 궤적을 예측합니다.",
            defaultNodeTitle: "현재 비트코인 실시간 차트 & AI 향후 시나리오",
            defaultNodeDesc: "실시간 비트코인 캔들을 기반으로 20/50/200 이평선 지지력과 RSI 모멘텀을 결합한 3가지 예측 경로(돌파 랠리 / 박스권 지지 / 리스크 이탈)를 캔버스에 점선으로 투영합니다.",
            isLive: true,
            totalBars: 100,
            anchors: [],
            elliottNodes: [],
            dowTags: [],
            divergences: [],
            srZones: [],
            forecastPathways: [
                {
                    id: "bull",
                    name: "시나리오 A (상승 돌파 랠리)",
                    color: "#089981",
                    targetDesc: "직전 고점 돌파 시 피보나치 1.618 확장 타겟 도달",
                    prob: "45%"
                },
                {
                    id: "neutral",
                    name: "시나리오 B (박스권 횡보 지지)",
                    color: "#facc15",
                    targetDesc: "20일선 및 50일선 지지 기반 수렴 후 방향성 탐색",
                    prob: "35%"
                },
                {
                    id: "bear",
                    name: "시나리오 C (넥라인 이탈 조정)",
                    color: "#f23645",
                    targetDesc: "핵심 지지선 붕괴 시 하단 200일선/매물대 리스크 관리",
                    prob: "20%"
                }
            ]
        },

        full_cycle: {
            title: "BTC/USDT 1D • 표준 풀 사이클 (상승 5파 + 다이버전스 + ABC 조정)",
            eraTag: "실전 종합 교본",
            subtitle: "바닥 매집(상승 다이버전스) → 골든크로스 → 엘리엇 충격파(1~5파) 및 다우 HH/HL → 5파 고점 하락 다이버전스 → 넥라인 이탈(BOS) 및 A-B-C 조정까지 한눈에 익히는 종합 차트입니다.",
            defaultNodeTitle: "⑤파 고점 ($108,500) + RSI 하락 다이버전스",
            defaultNodeDesc: "가격은 ③파 고점($96,000)을 넘어 $108,500로 신고가(HH)를 경신했지만, 하단 RSI(14)는 84에서 69로 낮아진 '하락 다이버전스'가 완성되었습니다. 직후 20일선과 ④파 저점(HL 넥라인)이 무너지며 A-B-C 하락 파동이 시작됩니다.",
            totalBars: 110,
            anchors: [
                { idx: 0, price: 48000, rsi: 42 },
                { idx: 6, price: 41500, rsi: 24 },
                { idx: 12, price: 45200, rsi: 44 },
                { idx: 18, price: 39200, rsi: 33 },
                { idx: 30, price: 58500, rsi: 68 },
                { idx: 40, price: 49200, rsi: 46 },
                { idx: 60, price: 96000, rsi: 85 },
                { idx: 70, price: 81500, rsi: 52 },
                { idx: 82, price: 108500, rsi: 68 },
                { idx: 91, price: 76000, rsi: 32 },
                { idx: 98, price: 89500, rsi: 53 },
                { idx: 109, price: 64500, rsi: 27 }
            ],
            elliottNodes: [
                { idx: 18, label: "0", type: "start", pos: "below", title: "파동 시작점 (바닥 상승 다이버전스)", desc: "가격은 $41.5K → $39.2K로 저점을 낮췄으나(LL), RSI는 24 → 33으로 저점을 높인 상승 다이버전스 바닥입니다." },
                { idx: 30, label: "①", type: "impulse", pos: "above", title: "엘리엇 ①파 고점 ($58,500)", desc: "추세 전환의 첫 충격파입니다. 20일선이 50일선을 돌파하며 매수세가 유입됩니다." },
                { idx: 40, label: "②", type: "impulse", pos: "below", title: "엘리엇 ②파 눌림목 ($49,200 • HL)", desc: "①파 상승분의 약 0.52 피보나치 되돌림 구간입니다. ①파 시작점($39.2K)을 깨지 않고 첫 다우 HL(Higher Low)을 형성합니다." },
                { idx: 60, label: "③", type: "impulse", pos: "above", title: "엘리엇 ③파 대폭발 ($96,000 • HH)", desc: "거래량이 가장 크게 터지고 20일·50일·200일선이 완전 정배열되는 가장 길고 강한 상승 파동입니다. RSI가 85까지 과열됩니다." },
                { idx: 70, label: "④", type: "impulse", pos: "below", title: "엘리엇 ④파 조정 ($81,500 • 핵심 HL)", desc: "50일 이동평균선 부근에서 지지를 받으며, ①파 고점($58.5K)을 침범하지 않는 건전한 조정입니다. 이 저점이 추후 핵심 '넥라인'이 됩니다." },
                { idx: 82, label: "⑤", type: "impulse", pos: "above", title: "엘리엇 ⑤파 천장 ($108,500 • 하락 다이버전스)", desc: "가격은 신고가를 달성했으나 매수 모멘텀이 약해져 RSI 고점이 ③파(85)보다 낮은 68에 그칩니다. 전형적인 고점 매도 시그널입니다." },
                { idx: 91, label: "A", type: "corrective", pos: "below", title: "조정 A파 ($76,000 • 추세 이탈 BOS)", desc: "직전 다우 상승 구조의 핵심 지지선인 ④파 저점($81.5K)을 강하게 하향 돌파하며 시장 구조가 하락 전환(BOS/CHoCH)되었습니다." },
                { idx: 98, label: "B", type: "corrective", pos: "above", title: "조정 B파 기술적 반등 ($89,500 • LH)", desc: "하락장에 속은 개인들의 추격 매수가 들어오지만 이전 고점($108.5K)을 넘지 못하고 고점을 낮추는(LH) 데드캣 바운스입니다." },
                { idx: 109, label: "C", type: "corrective", pos: "below", title: "조정 C파 투매 완료 ($64,500 • LL)", desc: "장기 200일 이동평균선 및 과거 매물대까지 하락하며 A-B-C 3파 조정을 마무리하는 구간입니다." }
            ],
            dowTags: [
                { idx: 6, text: "L", pos: "below", color: "#94a3b8" },
                { idx: 18, text: "LL (바닥)", pos: "below", color: "#38bdf8" },
                { idx: 30, text: "HH", pos: "above", color: "#089981" },
                { idx: 40, text: "HL", pos: "below", color: "#089981" },
                { idx: 60, text: "HH", pos: "above", color: "#089981" },
                { idx: 70, text: "HL (핵심지지)", pos: "below", color: "#089981" },
                { idx: 82, text: "HH (최고점)", pos: "above", color: "#facc15" },
                { idx: 91, text: "LL (구조이탈)", pos: "below", color: "#f23645" },
                { idx: 98, text: "LH (반등한계)", pos: "above", color: "#f23645" },
                { idx: 109, text: "LL", pos: "below", color: "#f23645" }
            ],
            divergences: [
                {
                    type: "bull",
                    idx1: 6,
                    idx2: 18,
                    label: "상승 다이버전스 (가격 LL vs RSI HL)",
                    desc: "캔들 저점은 낮아졌지만 RSI 저점은 높아진 강력한 바닥 반전 신호"
                },
                {
                    type: "bear",
                    idx1: 60,
                    idx2: 82,
                    label: "하락 다이버전스 (가격 HH vs RSI LH)",
                    desc: "③파~$96K에서 ⑤파~$108.5K로 가격은 상승했으나 RSI는 85→68로 하락한 대세 천장 신호"
                }
            ],
            srZones: [
                { priceTop: 83000, priceBottom: 80000, startIdx: 55, endIdx: 105, label: "핵심 넥라인 (④파 HL 지지 → 붕괴 후 저항 전환)", shortLabel: "핵심 넥라인 ($83K)", color: "rgba(16, 185, 129, 0.15)", borderColor: "#10b981" },
                { priceTop: 60000, priceBottom: 57500, startIdx: 25, endIdx: 109, label: "①파 고점 장기 지지 매물대 ($58.5K)", shortLabel: "장기 지지대 ($58.5K)", color: "rgba(56, 189, 248, 0.12)", borderColor: "#38bdf8" }
            ]
        },

        top_2021: {
            title: "BTC/USDT 1D • 2021년 4월($64.8K) & 11월($69K) 이중천장 하락 다이버전스",
            eraTag: "역사적 고점 사례 (2021)",
            subtitle: "비트코인 역사상 가장 유명한 일봉/주봉 하락 다이버전스 사례입니다. 4월 $64.8K 고점 이후 11월 $69K로 신고가를 깼지만, RSI가 현저히 낮아지며 대세 하락장(-77%)이 시작되었습니다.",
            defaultNodeTitle: "2021년 11월 $69,000 신고가 함정 (Bearish Divergence)",
            defaultNodeDesc: "대중과 뉴스는 $100K 간다고 열광했지만, 차트 작도상으로는 ③파($64.8K) 대비 ⑤파($69K)의 RSI 고점이 크게 낮아진 교과서적인 하락 다이버전스였습니다. 이후 $58K 넥라인이 무너지며 장기 하락장이 확정되었습니다.",
            totalBars: 105,
            anchors: [
                { idx: 0, price: 32000, rsi: 48 },
                { idx: 15, price: 64800, rsi: 86 },
                { idx: 35, price: 29800, rsi: 26 },
                { idx: 48, price: 52900, rsi: 74 },
                { idx: 58, price: 40500, rsi: 42 },
                { idx: 75, price: 69000, rsi: 65 },
                { idx: 88, price: 55800, rsi: 34 },
                { idx: 95, price: 59000, rsi: 46 },
                { idx: 104, price: 35000, rsi: 22 }
            ],
            elliottNodes: [
                { idx: 15, label: "③/A", type: "impulse", pos: "above", title: "2021년 4월 1차 고점 ($64,800)", desc: "코인베이스 상장 당일 터진 고점입니다. RSI가 86까지 치솟은 극도의 과열 구간이었습니다." },
                { idx: 35, label: "여름바닥", type: "start", pos: "below", title: "중국 채굴 금지 투매 바닥 ($29,800)", desc: "일봉 200일선 아래로 무너졌으나 $30K 부근에서 삼중 바닥을 다지고 V자 반등을 시작합니다." },
                { idx: 75, label: "⑤(천장)", type: "impulse", pos: "above", title: "2021년 11월 역사적 최고점 ($69,000)", desc: "가격은 4월 고점을 뚫고 $69,000에 도달했으나, RSI는 86에서 65로 급락한 '치명적 하락 다이버전스' 완성!" },
                { idx: 88, label: "넥라인붕괴", type: "corrective", pos: "below", title: "상승 추세 이탈 지점 ($55,800)", desc: "직전 스윙 저점이자 50일선이 깨지며 헤드앤숄더 패턴의 넥라인이 완전히 무너졌습니다." },
                { idx: 104, label: "하락장확정", type: "corrective", pos: "below", title: "FTX/금리인상 대세 하락 진입 ($35,000)", desc: "200일선 데드크로스와 함께 $15K까지 이어지는 기나긴 크립토 윈터의 서막이 열렸습니다." }
            ],
            dowTags: [
                { idx: 15, text: "HH (1차)", pos: "above", color: "#facc15" },
                { idx: 35, text: "HL (여름)", pos: "below", color: "#38bdf8" },
                { idx: 58, text: "HL", pos: "below", color: "#089981" },
                { idx: 75, text: "HH ($69K)", pos: "above", color: "#facc15" },
                { idx: 88, text: "LL (구조붕괴)", pos: "below", color: "#f23645" },
                { idx: 95, text: "LH (데드캣)", pos: "above", color: "#f23645" }
            ],
            divergences: [
                {
                    type: "bear",
                    idx1: 15,
                    idx2: 75,
                    label: "2021년 대세 하락 다이버전스 (4월 $64.8K vs 11월 $69K)",
                    desc: "고점은 높아졌으나($64.8K→$69K) RSI는 86→65로 하락하여 하락장 대폭락을 예고한 전설적인 다이버전스"
                }
            ],
            srZones: [
                { priceTop: 60000, priceBottom: 58000, startIdx: 45, endIdx: 98, label: "핵심 지지/저항 넥라인 ($58,000 ~ $60,000)", color: "rgba(242, 54, 69, 0.15)", borderColor: "#f23645" },
                { priceTop: 31000, priceBottom: 29000, startIdx: 25, endIdx: 50, label: "2021 여름 다중 바닥 매물대 ($30K)", color: "rgba(16, 185, 129, 0.15)", borderColor: "#10b981" }
            ]
        },

        bottom_2023: {
            title: "BTC/USDT 1D • 2022~23년 $15.5K 대바닥 (상승 다이버전스 + 골든크로스)",
            eraTag: "역사적 바닥 사례 (2023)",
            subtitle: "FTX 파산 직후 모두가 $10K 이하를 외칠 때, 일봉상 강력한 '상승 다이버전스'와 20-50일선 '골든크로스'로 500% 대세 상승장이 시작된 바닥 매집 교본입니다.",
            defaultNodeTitle: "FTX 사태 $15,500 바닥 + 트리플 상승 다이버전스",
            defaultNodeDesc: "루나 사태($17.5K)에 이어 FTX 파산으로 $15.5K까지 신저가(LL)를 찍었으나, RSI는 오히려 연속 상승(HL)하는 트리플 상승 다이버전스를 형성했습니다. 200일선 돌파와 함께 대세 상승장이 출범했습니다.",
            totalBars: 100,
            anchors: [
                { idx: 0, price: 21500, rsi: 45 },
                { idx: 12, price: 17500, rsi: 21 },
                { idx: 22, price: 18200, rsi: 38 },
                { idx: 32, price: 15500, rsi: 32 },
                { idx: 45, price: 21000, rsi: 88 },
                { idx: 60, price: 24000, rsi: 82 },
                { idx: 72, price: 19800, rsi: 38 },
                { idx: 88, price: 28500, rsi: 78 },
                { idx: 99, price: 31000, rsi: 72 }
            ],
            elliottNodes: [
                { idx: 12, label: "바닥1", type: "start", pos: "below", title: "1차 공포 저점 ($17,500)", desc: "루나/셀시우스 사태 이후 패닉셀 저점입니다. 극단적 과매도 상태(RSI 21)를 기록했습니다." },
                { idx: 32, label: "진바닥", type: "start", pos: "below", title: "FTX 파산 최종 바닥 ($15,500 • 상승다이버)", desc: "가격은 $15.5K로 더 내려갔지만 RSI는 32로 올라가며 매도세 소진을 확인한 역대급 매수 타점입니다." },
                { idx: 45, label: "골든크로스", type: "impulse", pos: "above", title: "20일선 & 50일선 골든크로스 ($21,000)", desc: "거래량이 터지며 14일 연속 양봉을 기록, 약세장 하락 추세선을 완전히 상향 돌파했습니다." },
                { idx: 72, label: "SVB눌림", type: "impulse", pos: "below", title: "실리콘밸리은행(SVB) 사태 눌림목 ($19,800)", desc: "200일선 부근까지 기습 눌림목을 줬으나 완벽하게 지지받고 2차 폭등으로 이어졌습니다." },
                { idx: 99, label: "상승확정", type: "impulse", pos: "above", title: "$31K 안착 및 1차 사이클 완성", desc: "이후 2024년 ETF 승인과 반감기를 거치며 $100K 랠리로 이어지는 발판이 완성되었습니다." }
            ],
            dowTags: [
                { idx: 12, text: "L", pos: "below", color: "#94a3b8" },
                { idx: 32, text: "LL (진바닥)", pos: "below", color: "#089981" },
                { idx: 45, text: "HH (전환BOS)", pos: "above", color: "#089981" },
                { idx: 72, text: "HL (200MA지지)", pos: "below", color: "#089981" },
                { idx: 88, text: "HH", pos: "above", color: "#089981" }
            ],
            divergences: [
                {
                    type: "bull",
                    idx1: 12,
                    idx2: 32,
                    label: "2022~23년 역사적 바닥 상승 다이버전스",
                    desc: "캔들은 $17.5K→$15.5K로 신저가를 갱신했으나 RSI는 21→32로 급상승한 세력의 바닥 매집 신호"
                }
            ],
            srZones: [
                { priceTop: 18500, priceBottom: 16000, startIdx: 5, endIdx: 40, label: "역대급 바닥 매집 구간 ($15.5K ~ $18.5K)", color: "rgba(16, 185, 129, 0.18)", borderColor: "#10b981" },
                { priceTop: 25200, priceBottom: 24500, startIdx: 45, endIdx: 85, label: "강력한 저항선 돌파 후 지지 전환 ($25K)", color: "rgba(56, 189, 248, 0.15)", borderColor: "#38bdf8" }
            ]
        },

        etf_2024: {
            title: "BTC/USDT 1D • 2024~25년 비트코인 현물 ETF 대세 상승장 (이평선 정배열 지지)",
            eraTag: "최근 대세장 사례 (2024~25)",
            subtitle: "비트코인 현물 ETF 출시 이후 기관 자금이 유입되며 20일선과 50일선을 계단식으로 밟고 $100,000을 돌파한 정석적인 다우 상승 트렌드입니다.",
            defaultNodeTitle: "20일·50일선 계단식 지지와 다우 상승 지속 (HH+HL)",
            defaultNodeDesc: "상승장에서는 복잡한 지표보다 다우 이론의 '저점 높임(HL)'과 20일선(노란선)의 눌림목 지지만 확인해도 훌륭한 추세 추종 수익을 낼 수 있음을 보여주는 대표 사례입니다.",
            totalBars: 110,
            anchors: [
                { idx: 0, price: 42000, rsi: 52 },
                { idx: 15, price: 38500, rsi: 35 },
                { idx: 35, price: 53000, rsi: 82 },
                { idx: 50, price: 73700, rsi: 89 },
                { idx: 68, price: 56500, rsi: 36 },
                { idx: 80, price: 68000, rsi: 65 },
                { idx: 90, price: 53500, rsi: 32 },
                { idx: 100, price: 89000, rsi: 84 },
                { idx: 109, price: 108000, rsi: 76 }
            ],
            elliottNodes: [
                { idx: 15, label: "ETF승인눌림", type: "start", pos: "below", title: "ETF 출시 직후 단기 차익 실현 바닥 ($38,500)", desc: "뉴스에 팔아라(Sell the news) 물량을 기관이 흡수하고 본격적인 ETF 랠리를 시작한 분기점입니다." },
                { idx: 50, label: "1차신고가", type: "impulse", pos: "above", title: "2024년 3월 조기 신고가 경신 ($73,700)", desc: "반감기 이전에 역사상 처음으로 최고가를 경신하며 일봉 RSI가 89까지 폭발했습니다." },
                { idx: 68, label: "여름조정HL", type: "impulse", pos: "below", title: "지루한 여름 박스권 저점 ($56,500)", desc: "독일 정부 매도, 마운트곡스 상환 등 악재를 소화하며 200일선 부근에서 방어에 성공했습니다." },
                { idx: 100, label: "미대선폭발", type: "impulse", pos: "above", title: "미국 대선 이후 20일선 타고 $89K 돌파", desc: "이동평균선이 완벽한 정배열(20>50>200)을 이루며 저항 없이 숏스퀴즈가 발생했습니다." },
                { idx: 109, label: "$100K달성", type: "impulse", pos: "above", title: "역사적인 $100,000 돌파 및 신고가 랠리", desc: "디지털 금으로서의 지위가 확고해지며 글로벌 기관들의 핵심 자산으로 편입되었습니다." }
            ],
            dowTags: [
                { idx: 15, text: "HL", pos: "below", color: "#089981" },
                { idx: 50, text: "HH ($73.7K)", pos: "above", color: "#089981" },
                { idx: 68, text: "HL", pos: "below", color: "#089981" },
                { idx: 90, text: "HL (방어)", pos: "below", color: "#089981" },
                { idx: 100, text: "HH", pos: "above", color: "#089981" },
                { idx: 109, text: "HH ($108K)", pos: "above", color: "#facc15" }
            ],
            divergences: [
                {
                    type: "bull",
                    idx1: 68,
                    idx2: 90,
                    label: "여름 박스권 탈출 상승 다이버전스",
                    desc: "지루한 횡보장 끝에 가격 저점은 지지되고 RSI 저점은 상승하며 대세 폭등 준비 완료"
                }
            ],
            srZones: [
                { priceTop: 74000, priceBottom: 72000, startIdx: 45, endIdx: 95, label: "역사적 전고점 돌파 후 지지 전환대 ($73.7K)", color: "rgba(16, 185, 129, 0.15)", borderColor: "#10b981" },
                { priceTop: 60000, priceBottom: 58000, startIdx: 55, endIdx: 95, label: "강력한 기관 평단가 지지 매물대 ($60K)", color: "rgba(56, 189, 248, 0.15)", borderColor: "#38bdf8" }
            ]
        }
    };

    // ============================================================================
    // 2. STATE & ENGINE VARIABLES
    // ============================================================================

    let currentScenarioKey = 'live_btc';
    let chartData = [];
    let visibleBarCount = 0;
    let replayInterval = null;

    const layers = {
        dow: true,
        elliott: true,
        ma: true,
        div: true,
        sr: true,
        forecast: true
    };

    let activeSolo = 'all';

    let canvas = null;
    let ctx = null;
    let canvasWidth = 0;
    let canvasHeight = 0;

    let priceTop = 0;
    let priceHeight = 0;
    let rsiTop = 0;
    let rsiHeight = 0;

    const mousePos = { x: -1, y: -1 };
    let interactiveHotspots = [];

    // ============================================================================
    // 3. CANDLESTICK GENERATOR & MOVING AVERAGES & RSI
    // ============================================================================

    function seededNoise(seed) {
        const x = Math.sin(seed * 9999.123) * 10000;
        return x - Math.floor(x);
    }

    function buildScenarioData(scenKey) {
        const scen = SCENARIOS[scenKey];
        if (!scen) return [];

        const total = scen.totalBars;
        const anchors = scen.anchors;
        const bars = [];

        // Base date: anchor to current local date
        const now = new Date();
        const baseDate = new Date(now.getTime() - total * 24 * 60 * 60 * 1000);

        for (let i = 0; i < total; i++) {
            let leftAnchor = anchors[0];
            let rightAnchor = anchors[anchors.length - 1];

            for (let a = 0; a < anchors.length - 1; a++) {
                if (i >= anchors[a].idx && i <= anchors[a + 1].idx) {
                    leftAnchor = anchors[a];
                    rightAnchor = anchors[a + 1];
                    break;
                }
            }

            const range = (rightAnchor.idx - leftAnchor.idx) || 1;
            const progress = (i - leftAnchor.idx) / range;
            const smoothP = 0.5 - 0.5 * Math.cos(progress * Math.PI);

            const interpPrice = leftAnchor.price + (rightAnchor.price - leftAnchor.price) * smoothP;
            const noise = (seededNoise(i + 13) - 0.5) * (interpPrice * 0.035);
            const close = Math.round(interpPrice + noise);

            const prevClose = i > 0 ? bars[i - 1].close : close * 0.99;
            const open = Math.round(prevClose * (1 + (seededNoise(i + 71) - 0.49) * 0.012));
            const high = Math.round(Math.max(open, close) * (1 + seededNoise(i + 89) * 0.022));
            const low = Math.round(Math.min(open, close) * (1 - seededNoise(i + 43) * 0.022));
            const volume = Math.round(15000 + seededNoise(i + 22) * 45000 + (Math.abs(close - open) / close) * 200000);

            const bDate = new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000);
            const dateStr = `${bDate.getFullYear()}-${String(bDate.getMonth() + 1).padStart(2, '0')}-${String(bDate.getDate()).padStart(2, '0')}`;

            bars.push({
                idx: i,
                date: dateStr,
                open,
                high,
                low,
                close,
                volume,
                ma20: null,
                ma50: null,
                ma200: null,
                rsi: 50
            });
        }

        // Calculate MA20, MA50, MA200
        for (let i = 0; i < total; i++) {
            // MA 20
            if (i >= 19) {
                let sum = 0;
                for (let k = 0; k < 20; k++) sum += bars[i - k].close;
                bars[i].ma20 = Math.round(sum / 20);
            } else {
                bars[i].ma20 = bars[i].close;
            }

            // MA 50
            if (i >= 49) {
                let sum = 0;
                for (let k = 0; k < 50; k++) sum += bars[i - k].close;
                bars[i].ma50 = Math.round(sum / 50);
            } else {
                bars[i].ma50 = Math.round(bars[0].close * 0.96 + (bars[i].close - bars[0].close) * 0.5);
            }

            // MA 200
            if (i >= 199) {
                let sum = 0;
                for (let k = 0; k < 200; k++) sum += bars[i - k].close;
                bars[i].ma200 = Math.round(sum / 200);
            } else {
                bars[i].ma200 = Math.round(bars[0].close * 0.88 + (i / total) * (bars[total - 1].close * 0.2));
            }
        }

        // Calculate RSI(14)
        const period = 14;
        let gains = [];
        let losses = [];
        for (let i = 1; i < total; i++) {
            const diff = bars[i].close - bars[i - 1].close;
            gains.push(diff > 0 ? diff : 0);
            losses.push(diff < 0 ? -diff : 0);
        }

        let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
        let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

        for (let i = 0; i < total; i++) {
            if (i < period) {
                bars[i].rsi = 50;
            } else if (i === period) {
                const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
                bars[i].rsi = Math.round(100 - (100 / (1 + rs)));
            } else {
                const curGain = gains[i - 1];
                const curLoss = losses[i - 1];
                avgGain = (avgGain * (period - 1) + curGain) / period;
                avgLoss = (avgLoss * (period - 1) + curLoss) / period;
                const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
                bars[i].rsi = Math.round(100 - (100 / (1 + rs)));
            }

            // Blend with manual anchors if defined
            for (const anc of anchors) {
                if (anc.rsi !== undefined && Math.abs(anc.idx - i) <= 2) {
                    const weight = 1 - Math.abs(anc.idx - i) * 0.25;
                    bars[i].rsi = Math.round(bars[i].rsi * (1 - weight) + anc.rsi * weight);
                }
            }
        }

        return bars;
    }

    // Live BTC Data Fetcher (Binance 350-day dataset for continuous 200MA & ZigZag technical analysis)
    async function loadLiveBtcData() {
        const btn = document.getElementById('scen-live_btc');
        if (btn) btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i>실시간 캔들 분석 중...`;

        try {
            // Fetch 350 bars from Binance to calculate authentic 200MA/50MA/20MA for all visible bars
            const resp = await fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=350');
            if (!resp.ok) throw new Error('Binance error: ' + resp.status);
            const data = await resp.json();

            const rawBars = data.map((d, i) => {
                const open = parseFloat(d[1]);
                const high = parseFloat(d[2]);
                const low = parseFloat(d[3]);
                const close = parseFloat(d[4]);
                const volume = parseFloat(d[5]);
                const dateObj = new Date(d[0]);
                const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
                return {
                    idx: i,
                    date: dateStr,
                    open,
                    high,
                    low,
                    close,
                    volume,
                    ma20: null,
                    ma50: null,
                    ma200: null,
                    rsi: 50
                };
            });

            // Accurate moving averages across all 350 bars
            const totalRaw = rawBars.length;
            for (let i = 0; i < totalRaw; i++) {
                if (i >= 19) {
                    let sum = 0;
                    for (let k = 0; k < 20; k++) sum += rawBars[i - k].close;
                    rawBars[i].ma20 = Math.round(sum / 20);
                } else rawBars[i].ma20 = rawBars[i].close;

                if (i >= 49) {
                    let sum = 0;
                    for (let k = 0; k < 50; k++) sum += rawBars[i - k].close;
                    rawBars[i].ma50 = Math.round(sum / 50);
                } else rawBars[i].ma50 = rawBars[i].close;

                if (i >= 199) {
                    let sum = 0;
                    for (let k = 0; k < 200; k++) sum += rawBars[i - k].close;
                    rawBars[i].ma200 = Math.round(sum / 200);
                }
            }

            // RSI(14) calculation with Wilder's smoothing
            const period = 14;
            let gains = [], losses = [];
            for (let i = 1; i < totalRaw; i++) {
                const diff = rawBars[i].close - rawBars[i - 1].close;
                gains.push(diff > 0 ? diff : 0);
                losses.push(diff < 0 ? -diff : 0);
            }
            let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
            let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

            for (let i = period; i < totalRaw; i++) {
                const curGain = gains[i - 1];
                const curLoss = losses[i - 1];
                avgGain = (avgGain * (period - 1) + curGain) / period;
                avgLoss = (avgLoss * (period - 1) + curLoss) / period;
                const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
                rawBars[i].rsi = Math.round(100 - (100 / (1 + rs)));
            }

            // Slice the latest 100 daily candles for display
            const bars = rawBars.slice(-100);
            bars.forEach((b, i) => b.idx = i);

            const lastBar = bars[bars.length - 1];
            const maxHigh = Math.max(...bars.map(b => b.high));
            const minLow = Math.min(...bars.map(b => b.low));
            const maxIdx = bars.findIndex(b => b.high === maxHigh);
            const minIdx = bars.findIndex(b => b.low === minLow);

            // ZigZag Extremum Detection (Window 4)
            const w = 4;
            const rawExtrema = [];
            for (let i = w; i < bars.length - w; i++) {
                const hSlice = bars.slice(i - w, i + w + 1).map(b => b.high);
                const lSlice = bars.slice(i - w, i + w + 1).map(b => b.low);
                if (bars[i].high === Math.max(...hSlice)) rawExtrema.push({ idx: i, type: 'high', price: bars[i].high, rsi: bars[i].rsi });
                if (bars[i].low === Math.min(...lSlice)) rawExtrema.push({ idx: i, type: 'low', price: bars[i].low, rsi: bars[i].rsi });
            }
            if (!rawExtrema.some(e => e.idx === minIdx)) rawExtrema.push({ idx: minIdx, type: 'low', price: minLow, rsi: bars[minIdx].rsi });
            if (!rawExtrema.some(e => e.idx === maxIdx)) rawExtrema.push({ idx: maxIdx, type: 'high', price: maxHigh, rsi: bars[maxIdx].rsi });
            rawExtrema.sort((a, b) => a.idx - b.idx);

            // Filter into clean alternating swing pivots (>= 5% swing threshold & min 4 bars separation)
            const swings = [];
            for (const p of rawExtrema) {
                if (swings.length === 0) { swings.push(p); continue; }
                const last = swings[swings.length - 1];
                if (last.type === p.type) {
                    if (p.type === 'high' && p.price > last.price) swings[swings.length - 1] = p;
                    else if (p.type === 'low' && p.price < last.price) swings[swings.length - 1] = p;
                } else {
                    const pct = Math.abs(p.price - last.price) / last.price;
                    if (pct >= 0.05 && (p.idx - last.idx >= 4)) swings.push(p);
                }
            }

            // 1. Generate Dow Theory Structure Tags
            const dowTags = [];
            let prevHigh = null;
            let prevLow = null;
            for (const s of swings) {
                if (s.type === 'high') {
                    let txt = 'HH';
                    let col = '#089981';
                    if (!prevHigh) {
                        txt = 'H';
                    } else if (s.price >= prevHigh.price) {
                        txt = (s.price === maxHigh) ? 'HH (최고)' : 'HH';
                        col = '#facc15';
                    } else {
                        txt = 'LH (반등한계)';
                        col = '#ea580c';
                    }
                    dowTags.push({ idx: s.idx, text: txt, pos: 'above', color: col });
                    prevHigh = s;
                } else {
                    let txt = 'HL';
                    let col = '#089981';
                    if (!prevLow) {
                        txt = 'L';
                    } else if (s.price >= prevLow.price) {
                        txt = (s.price === minLow) ? 'HL (바닥)' : 'HL (핵심지지)';
                        col = '#089981';
                    } else {
                        txt = (s.price === minLow) ? 'LL (바닥)' : 'LL (구조이탈)';
                        col = '#f23645';
                    }
                    dowTags.push({ idx: s.idx, text: txt, pos: 'below', color: col });
                    prevLow = s;
                }
            }
            dowTags.push({ idx: bars.length - 1, text: 'NOW', pos: 'above', color: '#38bdf8' });

            // 2. Generate Elliott Wave Sequence (0, ①, ②, ③, ④, ⑤, A, B, C, NOW)
            const elliottLabels = ['0', '①', '②', '③', '④', '⑤', 'A', 'B', 'C'];
            const elliottNodes = [];
            const anchors = [];

            swings.forEach((s, i) => {
                anchors.push({ idx: s.idx, price: s.price });
                const lbl = i < elliottLabels.length ? elliottLabels[i] : (s.type === 'high' ? 'H' : 'L');
                const isImpulse = ['①', '②', '③', '④', '⑤'].includes(lbl);
                const isCorrective = ['A', 'B', 'C'].includes(lbl);
                const nodeType = lbl === '0' ? 'start' : (isCorrective ? 'corrective' : 'impulse');

                let title = `스윙 ${s.type === 'high' ? '고점' : '저점'} ($${formatPrice(s.price)})`;
                let desc = `RSI: ${s.rsi} • 캔들 일자: ${bars[s.idx].date}`;
                if (lbl === '0') {
                    title = `파동 시작점 바닥 ($${formatPrice(s.price)})`;
                    desc = `최근 100일간 형성된 최저 바닥 매집 가격대입니다.`;
                } else if (lbl === '①') {
                    title = `엘리엇 ①파 1차 충격파 ($${formatPrice(s.price)})`;
                    desc = `바닥 반등 이후 첫 번째 상승 충격 파동입니다.`;
                } else if (lbl === '②') {
                    title = `엘리엇 ②파 건전한 눌림목 ($${formatPrice(s.price)})`;
                    desc = `①파 상승분의 되돌림 구간이며 첫 다우 Higher Low(HL)를 형성합니다.`;
                } else if (lbl === '③') {
                    title = `엘리엇 ③파 대세 돌파 ($${formatPrice(s.price)})`;
                    desc = `직전 고점을 돌파하며 거래량이 실린 가장 강한 상승 충격파입니다.`;
                } else if (lbl === '④') {
                    title = `엘리엇 ④파 스윙 지지 ($${formatPrice(s.price)})`;
                    desc = `중기 이동평균선 부근에서 지지받은 핵심 넥라인 저점입니다.`;
                } else if (lbl === '⑤') {
                    title = `엘리엇 ⑤파 고점 ($${formatPrice(s.price)})`;
                    desc = `상승 파동의 정점 부근으로 모멘텀 둔화와 분할 매도 구간입니다.`;
                } else if (lbl === 'A') {
                    title = `조정 A파 넥라인 이탈 ($${formatPrice(s.price)})`;
                    desc = `핵심 지지선이 붕괴되며 하락 전환(BOS)이 확인된 구간입니다.`;
                } else if (lbl === 'B') {
                    title = `조정 B파 기술적 반등 ($${formatPrice(s.price)})`;
                    desc = `이전 고점을 넘지 못하고 고점을 낮추는(LH) 되돌림 반등입니다.`;
                } else if (lbl === 'C') {
                    title = `조정 C파 지지 테스트 ($${formatPrice(s.price)})`;
                    desc = `하단 주요 지지 매물대 및 200일선 테스트 구간입니다.`;
                }

                elliottNodes.push({
                    idx: s.idx,
                    label: lbl,
                    type: nodeType,
                    pos: s.type === 'high' ? 'above' : 'below',
                    title,
                    desc
                });
            });

            // Append Current Real-Time Candle Node
            anchors.push({ idx: bars.length - 1, price: lastBar.close });
            elliottNodes.push({
                idx: bars.length - 1,
                label: 'NOW',
                type: 'impulse',
                pos: 'above',
                title: `현재 실시간 캔들 ($${formatPrice(lastBar.close)})`,
                desc: `RSI: ${lastBar.rsi} • 20MA: $${formatPrice(lastBar.ma20)} • 50MA: $${formatPrice(lastBar.ma50)} • 200MA: $${formatPrice(lastBar.ma200)}`
            });

            // 3. Generate Multiple Support & Resistance Zones (4 Institutional Zones)
            const midLowPivots = swings.filter(s => s.type === 'low' && s.price > minLow * 1.15 && s.price < maxHigh * 0.98);
            const necklinePrice = midLowPivots.length > 0 ? midLowPivots[0].price : (minLow + maxHigh) * 0.5;

            const recentLowPivots = swings.filter(s => s.type === 'low' && s.idx >= bars.length - 25);
            const recentLowPrice = recentLowPivots.length > 0 ? recentLowPivots[recentLowPivots.length - 1].price : (lastBar.low * 0.98);

            const srZones = [
                {
                    priceTop: maxHigh * 1.01,
                    priceBottom: maxHigh * 0.985,
                    startIdx: Math.max(0, maxIdx - 15),
                    endIdx: bars.length - 1,
                    label: `핵심 저항대 ($${formatPrice(maxHigh)})`,
                    shortLabel: `저항대 ($${Math.round(maxHigh / 1000)}K)`,
                    color: "rgba(242, 54, 69, 0.15)",
                    borderColor: "#f23645"
                },
                {
                    priceTop: necklinePrice * 1.012,
                    priceBottom: necklinePrice * 0.988,
                    startIdx: 20,
                    endIdx: bars.length - 1,
                    label: `핵심 넥라인 지지/저항 ($${formatPrice(necklinePrice)})`,
                    shortLabel: `넥라인 ($${Math.round(necklinePrice / 1000)}K)`,
                    color: "rgba(16, 185, 129, 0.15)",
                    borderColor: "#10b981"
                },
                {
                    priceTop: recentLowPrice * 1.01,
                    priceBottom: recentLowPrice * 0.988,
                    startIdx: Math.max(0, bars.length - 30),
                    endIdx: bars.length - 1,
                    label: `단기 스윙 지지대 ($${formatPrice(recentLowPrice)})`,
                    shortLabel: `단기 지지 ($${Math.round(recentLowPrice / 1000)}K)`,
                    color: "rgba(56, 189, 248, 0.15)",
                    borderColor: "#38bdf8"
                },
                {
                    priceTop: minLow * 1.02,
                    priceBottom: minLow * 0.99,
                    startIdx: Math.max(0, minIdx - 10),
                    endIdx: bars.length - 1,
                    label: `장기 바닥 매물대 ($${formatPrice(minLow)})`,
                    shortLabel: `바닥 매물대 ($${Math.round(minLow / 1000)}K)`,
                    color: "rgba(16, 185, 129, 0.15)",
                    borderColor: "#10b981"
                }
            ];

            // 4. Scan RSI Divergences
            const divergences = [];
            const highPivots = swings.filter(s => s.type === 'high');
            for (let i = 1; i < highPivots.length; i++) {
                const prevH = highPivots[i - 1];
                const curH = highPivots[i];
                if (curH.price >= prevH.price * 0.98 && curH.rsi <= prevH.rsi - 5) {
                    divergences.push({
                        type: "bear",
                        idx1: prevH.idx,
                        idx2: curH.idx,
                        label: `하락 다이버전스 (고점 $${formatPrice(curH.price)} vs RSI ${curH.rsi})`,
                        desc: `가격은 고점을 높이거나 유지했으나 RSI는 ${prevH.rsi}에서 ${curH.rsi}로 하락하여 상승 동력이 소진된 약세 다이버전스입니다.`
                    });
                    break;
                }
            }

            const lowPivots = swings.filter(s => s.type === 'low');
            for (let i = 1; i < lowPivots.length; i++) {
                const prevL = lowPivots[i - 1];
                const curL = lowPivots[i];
                if (curL.price <= prevL.price * 1.02 && curL.rsi >= prevL.rsi + 5) {
                    divergences.push({
                        type: "bull",
                        idx1: prevL.idx,
                        idx2: curL.idx,
                        label: `상승 다이버전스 (저점 $${formatPrice(curL.price)} vs RSI ${curL.rsi})`,
                        desc: `가격은 저점을 낮추거나 테스트했으나 RSI는 ${prevL.rsi}에서 ${curL.rsi}로 상승하여 반등 모멘텀이 축적된 강세 다이버전스입니다.`
                    });
                    break;
                }
            }

            // Fallback observation zone if no strict divergence is found
            if (divergences.length === 0 && maxIdx > 20 && maxIdx < bars.length - 5) {
                divergences.push({
                    type: "bear",
                    idx1: Math.max(0, maxIdx - 15),
                    idx2: maxIdx,
                    label: `신고가 모멘텀 둔화 관찰 구간 ($${formatPrice(maxHigh)})`,
                    desc: `최고점 도달 시점의 RSI 과열 해소 및 거래량 변화 관찰 구간입니다.`
                });
            }

            // 5. Update Scenario State
            SCENARIOS.live_btc.totalBars = bars.length;
            SCENARIOS.live_btc.anchors = anchors;
            SCENARIOS.live_btc.elliottNodes = elliottNodes;
            SCENARIOS.live_btc.dowTags = dowTags;
            SCENARIOS.live_btc.srZones = srZones;
            SCENARIOS.live_btc.divergences = divergences;

            // Dynamic Commentary & Targets with Actionable Dow & Elliott Perspective
            const highSwings = swings.filter(s => s.type === 'high');
            const lowSwings = swings.filter(s => s.type === 'low');
            const lastHighSwing = highSwings.length > 0 ? highSwings[highSwings.length - 1] : null;
            const lastLowSwing = lowSwings.length > 0 ? lowSwings[lowSwings.length - 1] : null;

            const breakoutPrice = Math.round(lastHighSwing ? lastHighSwing.price : (lastBar.ma50 ? Math.max(lastBar.ma50, lastBar.close * 1.05) : lastBar.close * 1.08));
            const immediateSupport = Math.round(lastLowSwing ? lastLowSwing.price : lastBar.close * 0.97);
            const dangerPrice = Math.round(lastBar.ma200 ? lastBar.ma200 : immediateSupport * 0.98);
            const deepDownside = Math.round(minLow * 1.04);

            const trendBadge = lastBar.close > breakoutPrice ? "상승 돌파 진행" : (lastBar.close < dangerPrice ? "대세 하락 경보" : "단기 조정/수렴");
            const ma20Str = lastBar.ma20 ? formatPrice(lastBar.ma20) : '-';
            const ma50Str = lastBar.ma50 ? formatPrice(lastBar.ma50) : '-';
            const ma200Str = lastBar.ma200 ? formatPrice(lastBar.ma200) : '-';
            const maStatus = lastBar.close > (lastBar.ma20 || 0) ? "20일선 안착 단기 반등" : "20일선 하회 단기 저항";
            const rsiVal = lastBar.rsi !== undefined ? lastBar.rsi : 50;
            const rsiBadge = rsiVal <= 35 ? "과매도 반등 변곡" : (rsiVal >= 65 ? "과매수 과열 경계" : "중립 모멘텀 수렴");
            const divText = divergences.length > 0 ? divergences[0].desc : `일봉 RSI가 30 부근에서 가격 저점을 테스트 후 반등할 때 쌍바닥 '상승 다이버전스' 매수 타점이 형성됩니다.`;

            SCENARIOS.live_btc.defaultNodeTitle = `실시간 BTC $${formatPrice(lastBar.close)} • 5대 핵심 지표 종합 진단`;
            SCENARIOS.live_btc.defaultNodeDesc = `
<div class="space-y-2 text-left">
  <!-- 1. 다우 이론 -->
  <div class="forecast-dow-card p-2.5 rounded-xl bg-[#141b2b] border border-sky-500/30">
    <div class="font-bold text-sky-300 text-xs flex items-center justify-between mb-1">
      <span class="flex items-center gap-1.5"><i class="fa-solid fa-chart-line text-sky-400"></i>1. 다우 이론 (Dow Theory) 추세 판단</span>
      <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-500/40">${trendBadge}</span>
    </div>
    <div class="text-[11px] text-slate-200 leading-relaxed font-medium">
      현재 일봉은 최고점($${formatPrice(maxHigh)}) 이후 고점(LH)과 저점을 낮추는 <b>단기 하락/조정 파동</b> 내에 있습니다.<br/>
      • <b class="text-emerald-400">상방 돌파 호재:</b> 직전 반등 고점인 <b>$${formatPrice(breakoutPrice)}</b> 상방 돌파 시 하락 다우 구조가 종료되고 본격적인 숏스퀴즈 및 강세 랠리로 전환됩니다.<br/>
      • <b class="text-rose-400">하방 이탈 위험:</b> 단기 지지선 <b>$${formatPrice(immediateSupport)}</b> 및 200일선 <b>$${formatPrice(dangerPrice)}</b> 밑으로 하락 시 하락 추세가 가속화되며 $${formatPrice(deepDownside)} 부근까지 추가 급락 위험이 매우 커집니다.
    </div>
  </div>

  <!-- 2. 엘리엇 파동 -->
  <div class="forecast-elliott-card p-2.5 rounded-xl bg-[#141b2b] border border-amber-500/30">
    <div class="font-bold text-amber-300 text-xs flex items-center justify-between mb-1">
      <span class="flex items-center gap-1.5"><i class="fa-solid fa-water text-amber-400"></i>2. 엘리엇 파동 (Elliott Wave) 관점</span>
      <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/40">C파 저점 테스트</span>
    </div>
    <div class="text-[11px] text-slate-200 leading-relaxed font-medium">
      상승 5파동 완성 후 진행되는 <b>A-B-C 조정 국면에서 마지막 C파의 바닥 지지력을 테스트</b>하는 변곡점입니다.<br/>
      • <b class="text-emerald-400">반등 지지선:</b> 200일선($${formatPrice(dangerPrice)}) 지지에 성공할 경우 C파 조정 종결 후 <b>신규 상승 1파 개시</b>가 유력합니다.<br/>
      • <b class="text-rose-400">연장 하락 리스크:</b> $${formatPrice(dangerPrice)} 붕괴 시 C파가 연장 파동(Extended Wave)으로 변모하여 $${formatPrice(deepDownside)} 매물대까지 급락할 수 있어 분할 매수 및 손절 기준선으로 삼아야 합니다.
    </div>
  </div>

  <!-- 3. 이동평균선 배열 -->
  <div class="forecast-ma-card p-2.5 rounded-xl bg-[#141b2b] border border-purple-500/30">
    <div class="font-bold text-purple-300 text-xs flex items-center justify-between mb-1">
      <span class="flex items-center gap-1.5"><i class="fa-solid fa-bars-staggered text-purple-400"></i>3. 다중 이동평균선 (20·50·200MA)</span>
      <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/40">${maStatus}</span>
    </div>
    <div class="text-[11px] text-slate-200 leading-relaxed font-medium">
      • <b class="text-amber-400">20일선 ($${ma20Str} • 단기 생명선):</b> 캔들이 20일선 아래에 위치해 단기 저항으로 작용합니다. 일봉 종가로 20일선 안착 시 단기 랠리 전환 탄력이 붙습니다.<br/>
      • <b class="text-sky-400">50일선 ($${ma50Str} • 중기 방어선):</b> 직전 고점($${formatPrice(breakoutPrice)})과 맞물린 중기 저항선으로, 이 선을 돌파해야 중기 추세가 반전됩니다.<br/>
      • <b class="text-purple-400">200일선 ($${ma200Str} • 장기 대세선):</b> 기관 매매의 기준이 되는 최후의 보루입니다. 200일선 위에서는 대세 상승 사이클이 유효합니다.
    </div>
  </div>

  <!-- 4. RSI 모멘텀 & 다이버전스 -->
  <div class="forecast-rsi-card p-2.5 rounded-xl bg-[#141b2b] border border-emerald-500/30">
    <div class="font-bold text-emerald-300 text-xs flex items-center justify-between mb-1">
      <span class="flex items-center gap-1.5"><i class="fa-solid fa-wave-square text-emerald-400"></i>4. RSI(14) 모멘텀 & 다이버전스</span>
      <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40">RSI ${rsiVal} (${rsiBadge})</span>
    </div>
    <div class="text-[11px] text-slate-200 leading-relaxed font-medium">
      ${divText}<br/>
      • <b class="text-emerald-400">실전 매수 타점:</b> 일봉 RSI가 30 과매도 구간에서 저점을 다진 후 50 중립선을 상향 돌파할 때가 가장 손익비 높은 추세 추종 매수 타점입니다.
    </div>
  </div>

  <!-- 5. 핵심 매물대 -->
  <div class="forecast-sr-card p-2.5 rounded-xl bg-[#141b2b] border border-cyan-500/30">
    <div class="font-bold text-cyan-300 text-xs flex items-center justify-between mb-1">
      <span class="flex items-center gap-1.5"><i class="fa-solid fa-layer-group text-cyan-400"></i>5. 핵심 매물대(S/R) & 실전 전략</span>
      <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40">매물대 구간</span>
    </div>
    <div class="text-[11px] text-slate-200 leading-relaxed font-medium">
      • <b class="text-rose-400">상단 핵심 저항대 ($${formatPrice(maxHigh)}):</b> 전고점 매도 압력이 집중된 차익 실현 구간입니다.<br/>
      • <b class="text-amber-400">중심 넥라인 지지대 ($${formatPrice(necklinePrice)}):</b> 돌파 시 지지로 전환되는 핵심 분기점입니다.<br/>
      • <b class="text-emerald-400">장기 바닥 매물대 ($${formatPrice(minLow)}):</b> 시장 최후의 매집 지지 구간입니다.
    </div>
  </div>
</div>`;

            const diagContainer = document.getElementById('forecastDiagnosisCardsContainer');
            if (diagContainer) {
                diagContainer.innerHTML = SCENARIOS.live_btc.defaultNodeDesc;
            }

            const targetBull = Math.round(breakoutPrice * 1.08);
            const targetNeutral = Math.round(lastBar.close * 1.01);
            const targetBear = Math.round(dangerPrice * 0.92);
            SCENARIOS.live_btc.forecastPathways = [
                {
                    id: "bull",
                    name: "시나리오 A: 강세 돌파 랠리 (45%)",
                    color: "#089981",
                    targetPrice: targetBull,
                    targetDesc: `직전 저항($${formatPrice(breakoutPrice)}) 돌파 시 20일선 지지 기반 목표가 $${formatPrice(targetBull)} 도달 타진`,
                    prob: "45%"
                },
                {
                    id: "neutral",
                    name: "시나리오 B: 박스권 수렴 지지 (35%)",
                    color: "#facc15",
                    targetPrice: targetNeutral,
                    targetDesc: `20일선($${formatPrice(lastBar.ma20 || 0)}) 및 50일선($${formatPrice(lastBar.ma50 || 0)}) 사이 횡보 수렴 후 방향성 결정`,
                    prob: "35%"
                },
                {
                    id: "bear",
                    name: "시나리오 C: 리스크 지지 이탈 (20%)",
                    color: "#f23645",
                    targetPrice: targetBear,
                    targetDesc: `200일선($${formatPrice(dangerPrice)}) 붕괴 시 C파 연장 하락 및 하단 지지대($${formatPrice(deepDownside)}) 테스트`,
                    prob: "20%"
                }
            ];

            // Update DOM Elements for live_btc
            updateTriggerLevelsDOM(breakoutPrice, immediateSupport, lastBar.ma20 || breakoutPrice, dangerPrice);
            updateScenarioCardsDOM(SCENARIOS.live_btc.forecastPathways, targetBull, immediateSupport, lastBar.ma20 || breakoutPrice, dangerPrice, deepDownside);

            return bars;
        } catch (err) {
            console.warn('Failed to fetch live Binance BTC data, falling back to simulation:', err);
            // Fallback simulation
            const fallbackScen = JSON.parse(JSON.stringify(SCENARIOS.etf_2024));
            return buildScenarioData('etf_2024');
        } finally {
            if (btn) btn.innerHTML = `<i class="fa-solid fa-bolt mr-1 text-cyan-400"></i>⚡ 실시간 비트코인 일봉 & AI 향후 전망`;
        }
    }

    // ============================================================================
    // 4. CANVAS RENDERING ENGINE
    // ============================================================================

    function resizeCanvas() {
        if (!canvas) {
            canvas = document.getElementById('tvCanvas');
            if (!canvas) return;
            ctx = canvas.getContext('2d');
        }

        const wrapper = document.getElementById('canvasWrapper');
        if (!wrapper) return;

        const rect = wrapper.getBoundingClientRect();
        canvasWidth = Math.max(rect.width, 300);
        
        // Mobile-responsive canvas height
        const isMobile = window.innerWidth < 640;
        const defaultHeight = isMobile ? 390 : (window.innerWidth < 1024 ? 440 : 590);
        canvasHeight = rect.height > 100 ? rect.height : defaultHeight;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = canvasWidth * dpr;
        canvas.height = canvasHeight * dpr;
        ctx.scale(dpr, dpr);

        const isSmallScreen = canvasWidth < 540;
        priceTop = isSmallScreen ? 14 : 16;
        priceHeight = Math.round((canvasHeight - priceTop) * (isSmallScreen ? 0.70 : 0.68));
        rsiTop = priceTop + priceHeight + (isSmallScreen ? 18 : 28);
        rsiHeight = Math.max(canvasHeight - rsiTop - (isSmallScreen ? 14 : 20), isSmallScreen ? 50 : 70);

        drawChart();
    }

    function updateTriggerLevelsDOM(breakoutPrice, rangeLow, rangeHigh, dangerPrice) {
        const elBreakout = document.getElementById('level-breakout');
        const elRange = document.getElementById('level-range');
        const elDanger = document.getElementById('level-danger');
        if (elBreakout) elBreakout.textContent = `$${formatPrice(breakoutPrice)}`;
        if (elRange) elRange.textContent = `$${Math.round(rangeLow / 1000)}K~$${Math.round(rangeHigh / 1000)}K`;
        if (elDanger) elDanger.textContent = `$${formatPrice(dangerPrice)}`;
    }

    function updateScenarioCardsDOM(pathways, targetBull, rangeLow, rangeHigh, dangerPrice, deepDownside) {
        if (!pathways || pathways.length < 3) return;
        const scenCardTargetA = document.getElementById('scen-card-target-a');
        const scenCardDescA = document.getElementById('scen-card-desc-a');
        const scenCardTargetB = document.getElementById('scen-card-target-b');
        const scenCardDescB = document.getElementById('scen-card-desc-b');
        const scenCardTargetC = document.getElementById('scen-card-target-c');
        const scenCardDescC = document.getElementById('scen-card-desc-c');

        if (scenCardTargetA) scenCardTargetA.textContent = `$${formatPrice(targetBull)}`;
        if (scenCardDescA) scenCardDescA.textContent = pathways[0].targetDesc;

        if (scenCardTargetB) scenCardTargetB.textContent = `$${Math.round(rangeLow / 1000)}K~$${Math.round(rangeHigh / 1000)}K`;
        if (scenCardDescB) scenCardDescB.textContent = pathways[1].targetDesc;

        if (scenCardTargetC) scenCardTargetC.textContent = `$${formatPrice(dangerPrice)}`;
        if (scenCardDescC) scenCardDescC.textContent = pathways[2].targetDesc;
    }

    function formatPrice(val) {
        if (val === null || val === undefined || isNaN(val)) return '-';
        return Math.round(val).toLocaleString('en-US');
    }

    function drawRoundedRect(ctx, x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    function isLightTheme() {
        return document.documentElement.classList.contains('theme-light') || !document.documentElement.classList.contains('dark');
    }

    function drawChart() {
        if (!ctx || !chartData || chartData.length === 0) return;

        const count = Math.min(visibleBarCount, chartData.length);
        if (count < 2) return;

        interactiveHotspots = [];

        const isLight = isLightTheme();
        const colors = {
            bg: isLight ? '#ffffff' : '#131722',
            grid: isLight ? '#f1f5f9' : '#2a2e39',
            separator: isLight ? '#e2e8f0' : '#2a2e39',
            axisText: isLight ? '#475569' : '#e2e8f0',
            rsiBg: isLight ? '#f8fafc' : '#10141f',
            rsiNeutral: isLight ? '#94a3b8' : '#4b5563',
            crosshair: isLight ? 'rgba(71, 85, 105, 0.4)' : 'rgba(209, 212, 220, 0.35)',
            dateBadgeBg: isLight ? '#ffffff' : '#1e222d',
            dateBadgeBorder: isLight ? '#3b82f6' : '#2962ff',
            dateBadgeText: isLight ? '#1d4ed8' : '#64b5f6',
            badgeBg: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(19, 23, 34, 0.9)',
            tagBg: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(19, 23, 34, 0.85)',
            ma20: isLight ? '#d97706' : '#facc15',
            ma50: isLight ? '#0284c7' : '#38bdf8',
            ma200: isLight ? '#9333ea' : '#c084fc',
            candleUp: isLight ? '#059669' : '#089981',
            candleDown: isLight ? '#e11d48' : '#f23645',
            volUp: isLight ? 'rgba(5, 150, 105, 0.28)' : 'rgba(8, 153, 129, 0.22)',
            volDown: isLight ? 'rgba(225, 29, 72, 0.28)' : 'rgba(242, 54, 69, 0.22)'
        };

        // Clear background
        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Find min and max price across visible bars
        let minP = Infinity;
        let maxP = -Infinity;
        for (let i = 0; i < count; i++) {
            const b = chartData[i];
            if (b.low < minP) minP = b.low;
            if (b.high > maxP) maxP = b.high;
            if (layers.ma && b.ma200 && b.ma200 < minP) minP = b.ma200;
        }

        const isSmallScreen = canvasWidth < 540;
        const topMarginRatio = isSmallScreen ? 0.20 : 0.12;
        const bottomMarginRatio = isSmallScreen ? 0.10 : 0.08;
        const pRange = maxP - minP || 1000;
        minP = Math.max(0, minP - pRange * bottomMarginRatio);
        maxP = maxP + pRange * topMarginRatio;

        const rightMargin = isSmallScreen ? 48 : 72;
        const leftMargin = isSmallScreen ? 6 : 12;
        const chartPlotWidth = canvasWidth - rightMargin - leftMargin;
        const barStep = chartPlotWidth / Math.max(count - 1, 1);
        const candleWidth = Math.max(1.8, Math.min(barStep * 0.65, isSmallScreen ? 8 : 12));

        function getX(idx) {
            return leftMargin + idx * barStep;
        }

        function getY(price) {
            return priceTop + priceHeight - ((price - minP) / (maxP - minP)) * priceHeight;
        }

        function getRsiY(rsiVal) {
            return rsiTop + rsiHeight - (rsiVal / 100) * rsiHeight;
        }

        // ==========================================
        // Grid Lines & Price Scale Axis
        // ==========================================
        ctx.lineWidth = 1;
        ctx.strokeStyle = colors.grid;
        ctx.fillStyle = colors.axisText;
        ctx.font = isSmallScreen ? 'bold 9px "JetBrains Mono", monospace' : 'bold 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        // 5 Price Grid Lines
        const priceSteps = isSmallScreen ? 4 : 5;
        for (let i = 0; i <= priceSteps; i++) {
            const pVal = minP + (maxP - minP) * (i / priceSteps);
            const py = getY(pVal);

            ctx.beginPath();
            ctx.setLineDash([2, 4]);
            ctx.moveTo(leftMargin, py);
            ctx.lineTo(canvasWidth - rightMargin, py);
            ctx.stroke();

            // Right Price Scale
            ctx.setLineDash([]);
            const formatted = isSmallScreen && pVal >= 1000 ? '$' + Math.round(pVal / 1000) + 'K' : '$' + formatPrice(pVal);
            ctx.fillText(formatted, canvasWidth - rightMargin + 4, py);
        }

        // ==========================================
        // Website Watermark & Branding (cryptopnl.com)
        // ==========================================
        // 1. High-Contrast Center Background Watermark (Bold & Clearly Visible)
        ctx.save();
        ctx.font = isSmallScreen ? 'bold 22px "Inter", "Segoe UI", sans-serif' : 'bold 34px "Inter", "Segoe UI", sans-serif';
        ctx.fillStyle = isLight ? 'rgba(15, 23, 42, 0.09)' : 'rgba(255, 255, 255, 0.08)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const centerWatermarkY = priceTop + priceHeight * 0.38;
        ctx.fillText('CryptoPnL • cryptopnl.com', leftMargin + chartPlotWidth / 2, centerWatermarkY);

        ctx.font = isSmallScreen ? 'bold 10px "Inter", sans-serif' : 'bold 12px "Inter", sans-serif';
        ctx.fillStyle = isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.07)';
        ctx.fillText('실시간 AI 비트코인 차트 분석 & 시나리오 예측', leftMargin + chartPlotWidth / 2, centerWatermarkY + (isSmallScreen ? 18 : 26));
        ctx.restore();

        // Horizontal Separator Line between Price and RSI Panel
        ctx.strokeStyle = colors.separator;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, priceHeight + (isSmallScreen ? 14 : 20));
        ctx.lineTo(canvasWidth, priceHeight + (isSmallScreen ? 14 : 20));
        ctx.stroke();

        // RSI Panel Background & Reference Levels
        ctx.fillStyle = colors.rsiBg;
        ctx.fillRect(leftMargin, rsiTop, chartPlotWidth, rsiHeight);

        // RSI 70 (Overbought - Red) & RSI 30 (Oversold - Green) & RSI 50
        const rsiLevels = [
            { lvl: 70, col: isLight ? '#e11d48' : '#f23645', dash: [3, 3], label: isSmallScreen ? '70' : '70 (과매수)' },
            { lvl: 50, col: colors.rsiNeutral, dash: [2, 4], label: isSmallScreen ? '50' : '50 (중립)' },
            { lvl: 30, col: isLight ? '#059669' : '#089981', dash: [3, 3], label: isSmallScreen ? '30' : '30 (과매도)' }
        ];

        rsiLevels.forEach(item => {
            const ry = getRsiY(item.lvl);
            ctx.strokeStyle = item.col;
            ctx.setLineDash(item.dash);
            ctx.beginPath();
            ctx.moveTo(leftMargin, ry);
            ctx.lineTo(canvasWidth - rightMargin, ry);
            ctx.stroke();

            ctx.fillStyle = item.col;
            ctx.fillText(item.label, canvasWidth - rightMargin + 6, ry);
        });
        ctx.setLineDash([]);

        // ==========================================
        // Support & Resistance Zones
        // ==========================================
        const currentScen = SCENARIOS[currentScenarioKey];
        if (layers.sr && currentScen && currentScen.srZones) {
            currentScen.srZones.forEach(zone => {
                if (zone.startIdx < count) {
                    const zEnd = Math.min(zone.endIdx, count - 1);
                    const x1 = getX(zone.startIdx);
                    const x2 = getX(zEnd);
                    const y1 = getY(zone.priceTop);
                    const y2 = getY(zone.priceBottom);

                    ctx.fillStyle = zone.color;
                    ctx.fillRect(x1, y1, x2 - x1, y2 - y1);

                    ctx.strokeStyle = zone.borderColor;
                    ctx.lineWidth = 1;
                    ctx.setLineDash([4, 4]);
                    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
                    ctx.setLineDash([]);

                    const labelText = isSmallScreen && zone.shortLabel ? zone.shortLabel : zone.label;
                    ctx.font = isSmallScreen ? 'bold 9px "Noto Sans KR", sans-serif' : '10px "Noto Sans KR", sans-serif';
                    const textW = ctx.measureText(labelText).width;
                    const pillX = x1 + 6;
                    const pillY = y1 + (isSmallScreen ? 2 : 3);
                    const pillH = isSmallScreen ? 14 : 16;

                    // High-contrast badge background to prevent overlapping candle wicks/bodies
                    ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.94)' : 'rgba(15, 23, 42, 0.92)';
                    ctx.fillRect(pillX - 2, pillY - 1, textW + 6, pillH);
                    ctx.strokeStyle = zone.borderColor;
                    ctx.lineWidth = 0.8;
                    ctx.strokeRect(pillX - 2, pillY - 1, textW + 6, pillH);

                    ctx.fillStyle = zone.borderColor;
                    ctx.textBaseline = 'top';
                    ctx.textAlign = 'left';
                    ctx.fillText(labelText, pillX + 1, pillY + 1);
                }
            });
        }

        // ==========================================
        // Candlesticks & Volumes
        // ==========================================
        const maxVol = Math.max(...chartData.slice(0, count).map(b => b.volume || 1));
        const volMaxH = priceHeight * 0.16;

        for (let i = 0; i < count; i++) {
            const b = chartData[i];
            const x = getX(i);
            const isBull = b.close >= b.open;
            const barCol = isBull ? colors.candleUp : colors.candleDown;

            // Volume Bar
            const vH = (b.volume / maxVol) * volMaxH;
            const vY = priceTop + priceHeight - vH;
            ctx.fillStyle = isBull ? colors.volUp : colors.volDown;
            ctx.fillRect(x - candleWidth * 0.4, vY, candleWidth * 0.8, vH);

            // Candle Wick (High-Low)
            ctx.strokeStyle = barCol;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(x, getY(b.high));
            ctx.lineTo(x, getY(b.low));
            ctx.stroke();

            // Candle Body (Open-Close)
            const yOpen = getY(b.open);
            const yClose = getY(b.close);
            const bodyY = Math.min(yOpen, yClose);
            const bodyH = Math.max(Math.abs(yOpen - yClose), 1.5);

            ctx.fillStyle = barCol;
            ctx.fillRect(x - candleWidth / 2, bodyY, candleWidth, bodyH);
        }

        // ==========================================
        // Moving Averages (20, 50, 200)
        // ==========================================
        if (layers.ma) {
            function drawMaLine(key, color, width) {
                ctx.strokeStyle = color;
                ctx.lineWidth = width;
                ctx.beginPath();
                let started = false;
                for (let i = 0; i < count; i++) {
                    const val = chartData[i][key];
                    if (val !== null && val !== undefined) {
                        const x = getX(i);
                        const y = getY(val);
                        if (!started) {
                            ctx.moveTo(x, y);
                            started = true;
                        } else {
                            ctx.lineTo(x, y);
                        }
                    }
                }
                ctx.stroke();
            }

            drawMaLine('ma200', colors.ma200, 2.0); // 200 MA
            drawMaLine('ma50', colors.ma50, 1.8);   // 50 MA
            drawMaLine('ma20', colors.ma20, 1.8);   // 20 MA
        }

        // ==========================================
        // RSI Line
        // ==========================================
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        let rsiStarted = false;
        for (let i = 0; i < count; i++) {
            const x = getX(i);
            const ry = getRsiY(chartData[i].rsi);
            if (!rsiStarted) {
                ctx.moveTo(x, ry);
                rsiStarted = true;
            } else {
                ctx.lineTo(x, ry);
            }
        }
        ctx.stroke();

        // ==========================================
        // Divergence Lines (Candle + RSI)
        // ==========================================
        if (layers.div && currentScen && currentScen.divergences) {
            currentScen.divergences.forEach(div => {
                if (div.idx1 < count && div.idx2 < count) {
                    const x1 = getX(div.idx1);
                    const x2 = getX(div.idx2);
                    const b1 = chartData[div.idx1];
                    const b2 = chartData[div.idx2];

                    const isBull = div.type === 'bull';
                    const divCol = isBull ? '#10b981' : '#f43f5e';

                    // Price Chart Line
                    const py1 = getY(isBull ? b1.low : b1.high);
                    const py2 = getY(isBull ? b2.low : b2.high);

                    ctx.strokeStyle = divCol;
                    ctx.lineWidth = 2.5;
                    ctx.setLineDash([4, 3]);
                    ctx.beginPath();
                    ctx.moveTo(x1, py1);
                    ctx.lineTo(x2, py2);
                    ctx.stroke();

                    // RSI Panel Line
                    const ry1 = getRsiY(b1.rsi);
                    const ry2 = getRsiY(b2.rsi);

                    ctx.beginPath();
                    ctx.moveTo(x1, ry1);
                    ctx.lineTo(x2, ry2);
                    ctx.stroke();
                    ctx.setLineDash([]);

                    // Center Badge (Offset from the RSI line to prevent collision)
                    const midX = (x1 + x2) / 2;
                    const rawMidRy = (ry1 + ry2) / 2;
                    const badgeRy = isBull
                        ? Math.min(rsiTop + rsiHeight - 9, rawMidRy + (isSmallScreen ? 11 : 13))
                        : Math.max(rsiTop + 9, rawMidRy - (isSmallScreen ? 11 : 13));
                    const divBadgeBg = isLight ? (isBull ? '#ecfdf5' : '#fff1f2') : (isBull ? '#064e3b' : '#881337');
                    const divBadgeText = isLight ? (isBull ? '#065f46' : '#9f1239') : '#ffffff';
                    const divLabelText = isBull
                        ? (isSmallScreen ? '▲ 상승 다이버' : '상승 다이버전스 (가격 LL vs RSI HL)')
                        : (isSmallScreen ? '▼ 하락 다이버' : '하락 다이버전스 (가격 HH vs RSI LH)');
                    drawBadge(midX, badgeRy, divLabelText, divBadgeBg, divCol, divBadgeText);

                    interactiveHotspots.push({
                        x: midX,
                        y: badgeRy,
                        r: 18,
                        title: div.label,
                        desc: div.desc
                    });
                }
            });
        }

        // ==========================================
        // Elliott Wave Lines & Badges
        // ==========================================
        if (layers.elliott && currentScen && currentScen.elliottNodes) {
            const eNodes = currentScen.elliottNodes.filter(n => n.idx < count);

            if (eNodes.length >= 2) {
                ctx.strokeStyle = 'rgba(250, 204, 21, 0.7)';
                ctx.lineWidth = 2;
                ctx.setLineDash([3, 2]);
                ctx.beginPath();
                for (let k = 0; k < eNodes.length; k++) {
                    const n = eNodes[k];
                    const b = chartData[n.idx];
                    const px = getX(n.idx);
                    const py = getY(n.pos === 'above' ? b.high : b.low);
                    if (k === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.stroke();
                ctx.setLineDash([]);
            }

            eNodes.forEach(node => {
                const b = chartData[node.idx];
                const px = getX(node.idx);
                const isAbove = node.pos === 'above';
                const nodeRadius = isSmallScreen ? 9.5 : 11;
                const nodeOffset = isSmallScreen ? (isAbove ? -14 : 14) : (isAbove ? -18 : 18);
                const py = getY(isAbove ? b.high : b.low) + nodeOffset;

                ctx.beginPath();
                ctx.arc(px, py, nodeRadius, 0, Math.PI * 2);
                ctx.fillStyle = node.type === 'corrective' ? '#ea580c' : '#ca8a04';
                ctx.fill();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.5;
                ctx.stroke();

                ctx.fillStyle = '#ffffff';
                ctx.font = isSmallScreen ? 'bold 9px "Inter", sans-serif' : 'bold 11px "Inter", sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(node.label, px, py);

                interactiveHotspots.push({
                    x: px,
                    y: py,
                    r: nodeRadius + 3,
                    title: node.title,
                    desc: node.desc
                });
            });
        }

        // ==========================================
        // Dow Theory High/Low (HH, HL, LH, LL) Tags
        // ==========================================
        if (layers.dow && currentScen && currentScen.dowTags) {
            currentScen.dowTags.forEach(tag => {
                if (tag.idx < count) {
                    const b = chartData[tag.idx];
                    const px = getX(tag.idx);
                    const isAbove = tag.pos === 'above';

                    // 같은 인덱스 또는 인접 인덱스(±2)에 엘리엇 노드가 켜져 있는 경우, 다우 태그를 엘리엇 뱃지 바깥쪽으로 확실하게 분리
                    const hasElliottNearby = layers.elliott && currentScen.elliottNodes && currentScen.elliottNodes.some(n => Math.abs(n.idx - tag.idx) <= 2 && n.idx < count);
                    const dowOffset = hasElliottNearby
                        ? (isSmallScreen ? (isAbove ? -35 : 35) : (isAbove ? -42 : 42))
                        : (isSmallScreen ? (isAbove ? -18 : 18) : (isAbove ? -24 : 24));
                    const py = getY(isAbove ? b.high : b.low) + dowOffset;

                    const tagTextToRender = isSmallScreen ? tag.text.split(' ')[0] : tag.text;
                    ctx.font = isSmallScreen ? 'bold 9px "JetBrains Mono", monospace' : 'bold 10px "JetBrains Mono", monospace';
                    const textW = ctx.measureText(tagTextToRender).width;
                    const padX = isSmallScreen ? 4 : 6;
                    const badgeW = textW + padX * 2;
                    const badgeH = isSmallScreen ? 14 : 16;

                    ctx.fillStyle = colors.tagBg;
                    drawRoundedRect(ctx, px - badgeW / 2, py - badgeH / 2, badgeW, badgeH, 4);
                    ctx.fill();

                    ctx.strokeStyle = tag.color;
                    ctx.lineWidth = 1;
                    ctx.stroke();

                    ctx.fillStyle = tag.color;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(tagTextToRender, px, py);

                    let spotTitle = `다우 이론 구조: ${tag.text}`;
                    let spotDesc = isAbove ? "스윙 고점 (HH: 신고가 돌파 / LH: 반등 한계)" : "스윙 저점 (HL: 핵심 지지 / LL: 구조 붕괴 이탈)";

                    if (tag.text === 'NOW') {
                        spotTitle = currentScen.defaultNodeTitle || "현재 비트코인 실시간 차트 & AI 향후 시나리오";
                        spotDesc = currentScen.defaultNodeDesc;
                    } else if (tag.text.includes('LH')) {
                        spotTitle = `스윙 고점 저항 (LH • 반등한계)`;
                        spotDesc = `이전 고점을 넘지 못하고 꺾인 저항 고점입니다. 다우 이론상 이 가격대를 상방 돌파해야 단기 하락 추세가 무효화되고 상승 전환됩니다.`;
                    } else if (tag.text.includes('HL')) {
                        spotTitle = `스윙 저점 지지 (HL • 핵심지지)`;
                        spotDesc = `이전 저점보다 높은 가격에서 형성된 지지 저점입니다. 다우 이론상 이 넥라인이 지켜져야 상승 추세가 유지됩니다.`;
                    } else if (tag.text.includes('LL')) {
                        spotTitle = `구조 붕괴 저점 (LL • 이탈주의)`;
                        spotDesc = `직전 저점을 하향 돌파(BOS)하며 발생한 저점입니다. 다우 이론상 하락 추세 지속 신호이므로 하단 200일선 지지 확인이 필수입니다.`;
                    } else if (tag.text.includes('HH')) {
                        spotTitle = `신고가 돌파 고점 (HH • 과열주의)`;
                        spotDesc = `직전 고점을 상회한 신고가 고점입니다. 하단 RSI 다이버전스 발생 여부를 확인하여 분할 익절 타점을 잡아야 합니다.`;
                    }

                    interactiveHotspots.push({
                        x: px,
                        y: py,
                        r: 12,
                        title: spotTitle,
                        desc: spotDesc
                    });
                }
            });
        }

        // ==========================================
        // AI Future Forecast Pathways (For Live / Prediction Mode)
        // ==========================================
        if (layers.forecast && currentScen && currentScen.forecastPathways && count >= chartData.length - 1) {
            const lastBar = chartData[count - 1];
            const startX = getX(count - 1);
            const startY = getY(lastBar.close);

            const pathways = [
                {
                    name: "시나리오 A: 강세 돌파 랠리",
                    color: "#089981",
                    targetPrice: lastBar.close * 1.15,
                    offsets: [0.03, 0.08, 0.15]
                },
                {
                    name: "시나리오 B: 박스권 수렴 지지",
                    color: "#facc15",
                    targetPrice: lastBar.close * 1.02,
                    offsets: [-0.02, 0.04, 0.02]
                },
                {
                    name: "시나리오 C: 리스크 지지 이탈",
                    color: "#f23645",
                    targetPrice: lastBar.close * 0.88,
                    offsets: [-0.04, -0.07, -0.12]
                }
            ];

            pathways.forEach(p => {
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 4]);
                ctx.beginPath();
                ctx.moveTo(startX, startY);

                const stepW = 45;
                p.offsets.forEach((off, idx) => {
                    const px = startX + (idx + 1) * stepW;
                    const py = getY(lastBar.close * (1 + off));
                    ctx.lineTo(px, py);
                });
                ctx.stroke();
                ctx.setLineDash([]);

                // Target Endpoint Flag
                const endX = startX + 3 * stepW;
                const endY = getY(p.targetPrice);

                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(endX, endY, 5, 0, Math.PI * 2);
                ctx.fill();

                drawBadge(endX + 35, endY, `$${formatPrice(p.targetPrice)}`, colors.badgeBg, p.color, isLight ? '#0f172a' : '#ffffff');

                interactiveHotspots.push({
                    x: endX,
                    y: endY,
                    r: 15,
                    title: p.name,
                    desc: `예상 목표가: $${formatPrice(p.targetPrice)} • 주요 지지/저항 및 거래량 확인 필요`
                });
            });
        }

        // ==========================================
        // Interactive Mouse Crosshair & Legend
        // ==========================================
        if (mousePos.x >= leftMargin && mousePos.x <= canvasWidth - rightMargin && mousePos.y >= priceTop && mousePos.y <= canvasHeight - 20) {
            // Vertical Crosshair Line
            ctx.strokeStyle = colors.crosshair;
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);

            ctx.beginPath();
            ctx.moveTo(mousePos.x, priceTop);
            ctx.lineTo(mousePos.x, canvasHeight - 20);
            ctx.stroke();

            // Horizontal Crosshair Line (Price or RSI)
            ctx.beginPath();
            ctx.moveTo(leftMargin, mousePos.y);
            ctx.lineTo(canvasWidth - rightMargin, mousePos.y);
            ctx.stroke();
            ctx.setLineDash([]);

            // Find closest bar index to mouse
            const hoverIdx = Math.round((mousePos.x - leftMargin) / barStep);
            if (hoverIdx >= 0 && hoverIdx < count) {
                const b = chartData[hoverIdx];
                updateTopLegend(b);

                // Date Label on bottom of Price Panel (Clamped within visible canvas)
                const dateBadgeW = 76;
                const dateBadgeX = Math.max(leftMargin, Math.min(canvasWidth - rightMargin - dateBadgeW, mousePos.x - dateBadgeW / 2));
                ctx.fillStyle = colors.dateBadgeBg;
                ctx.fillRect(dateBadgeX, priceHeight + 11, dateBadgeW, 18);
                ctx.strokeStyle = colors.dateBadgeBorder;
                ctx.strokeRect(dateBadgeX, priceHeight + 11, dateBadgeW, 18);
                ctx.fillStyle = colors.dateBadgeText;
                ctx.font = '10px "JetBrains Mono", monospace';
                ctx.textAlign = 'center';
                ctx.fillText(b.date, dateBadgeX + dateBadgeW / 2, priceHeight + 20);
            }

            // Price or RSI Label on Right Scale
            if (mousePos.y <= priceHeight + 10) {
                const pVal = maxP - ((mousePos.y - priceTop) / priceHeight) * (maxP - minP);
                ctx.fillStyle = '#2962ff';
                ctx.fillRect(canvasWidth - rightMargin, mousePos.y - 9, rightMargin - 4, 18);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 10px "JetBrains Mono", monospace';
                ctx.textAlign = 'left';
                ctx.fillText('$' + formatPrice(pVal), canvasWidth - rightMargin + 4, mousePos.y);
            } else if (mousePos.y >= rsiTop && mousePos.y <= rsiTop + rsiHeight) {
                const rVal = Math.round(100 - ((mousePos.y - rsiTop) / rsiHeight) * 100);
                ctx.fillStyle = '#f43f5e';
                ctx.fillRect(canvasWidth - rightMargin, mousePos.y - 9, rightMargin - 4, 18);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 10px "JetBrains Mono", monospace';
                ctx.textAlign = 'left';
                ctx.fillText(String(rVal), canvasWidth - rightMargin + 8, mousePos.y);
            }
        } else {
            // Default top legend to last bar
            updateTopLegend(chartData[count - 1]);
        }
    }

    function drawBadge(x, y, text, bg, border, textCol) {
        ctx.font = 'bold 10px "Noto Sans KR", sans-serif';
        const w = ctx.measureText(text).width + 12;
        const h = 18;
        ctx.fillStyle = bg;
        drawRoundedRect(ctx, x - w / 2, y - h / 2, w, h, 4);
        ctx.fill();

        ctx.strokeStyle = border;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = textCol;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, y);
    }

    function updateTopLegend(bar) {
        if (!bar) return;
        const ohlcEl = document.getElementById('ohlcDisplay');
        if (ohlcEl) {
            const isBull = bar.close >= bar.open;
            const col = isBull ? '#089981' : '#f23645';
            ohlcEl.innerHTML = `시: <b style="color:${col}">$${formatPrice(bar.open)}</b> 고: <b style="color:${col}">$${formatPrice(bar.high)}</b> 저: <b style="color:${col}">$${formatPrice(bar.low)}</b> 종: <b style="color:${col}">$${formatPrice(bar.close)}</b>`;
        }

        const m20El = document.getElementById('ma20Val');
        const m50El = document.getElementById('ma50Val');
        const m200El = document.getElementById('ma200Val');
        const rsiEl = document.getElementById('rsiVal');

        if (m20El) m20El.textContent = bar.ma20 ? '$' + formatPrice(bar.ma20) : '-';
        if (m50El) m50El.textContent = bar.ma50 ? '$' + formatPrice(bar.ma50) : '-';
        if (m200El) m200El.textContent = bar.ma200 ? '$' + formatPrice(bar.ma200) : '-';
        if (rsiEl) rsiEl.textContent = bar.rsi !== undefined ? String(bar.rsi) : '-';
    }

    // ============================================================================
    // 5. INTERACTIVE SCENARIO & CONTROLS HANDLERS
    // ============================================================================

    async function selectScenario(scenKey) {
        stopStepReplay();
        currentScenarioKey = scenKey;

        // Button active toggle
        const scenButtons = ['live_btc', 'full_cycle', 'top_2021', 'bottom_2023', 'etf_2024'];
        scenButtons.forEach(key => {
            const btn = document.getElementById(`scen-${key}`);
            if (btn) {
                if (key === scenKey) {
                    btn.classList.add('active', 'border-blue-500', 'bg-[#2962ff]/25', 'text-white', 'shadow-md', 'shadow-blue-500/20');
                    btn.classList.remove('text-slate-300', 'text-[#9ca3af]');
                } else {
                    btn.classList.remove('active', 'border-blue-500', 'bg-[#2962ff]/25', 'text-white', 'shadow-md', 'shadow-blue-500/20');
                    btn.classList.add('text-slate-300');
                }
            }
        });

        const scen = SCENARIOS[scenKey];
        if (!scen) return;

        // Update right sidebar copy
        const eraTag = document.getElementById('guideEraTag');
        const mainTitle = document.getElementById('guideMainTitle');
        const subTitle = document.getElementById('guideMainSubtitle');
        const nodeBadge = document.getElementById('selectedNodeBadge');
        const nodeBody = document.getElementById('selectedNodeBody');

        if (eraTag) eraTag.textContent = scen.eraTag;
        if (mainTitle) mainTitle.textContent = scen.title;
        if (subTitle) subTitle.textContent = scen.subtitle;

        const liveDiagSection = document.getElementById('forecast-live-diagnosis-section');

        if (scenKey === 'live_btc') {
            if (liveDiagSection) liveDiagSection.classList.remove('hidden');
            if (nodeBadge) nodeBadge.textContent = "실시간 타점 해설";
            if (nodeBody) nodeBody.innerHTML = "차트 위의 파동 번호(①~⑤), HH/HL 태그, 다이버전스를 터치하면 해당 타점의 실전 매매 근거가 여기에 표시됩니다.";

            chartData = await loadLiveBtcData();
            startLiveBtcAutoRefresh();
        } else {
            if (liveDiagSection) liveDiagSection.classList.add('hidden');
            if (nodeBadge) nodeBadge.textContent = scen.defaultNodeTitle;
            if (nodeBody) nodeBody.innerHTML = scen.defaultNodeDesc;

            chartData = buildScenarioData(scenKey);
            if (scenKey === 'full_cycle') {
                updateTriggerLevelsDOM(108500, 81500, 89500, 76000);
                updateScenarioCardsDOM([
                    { targetDesc: "⑤파 고점 돌파 시 피보나치 확장 신규 목표 타진" },
                    { targetDesc: "④파 넥라인 지지 및 B파 데드캣 바운스 수렴" },
                    { targetDesc: "④파 넥라인 붕괴 시 C파 투매($64,500) 하락" }
                ], 108500, 81500, 89500, 76000, 64500);
            } else if (scenKey === 'top_2021') {
                updateTriggerLevelsDOM(69000, 60000, 65000, 58000);
                updateScenarioCardsDOM([
                    { targetDesc: "신고가 $69K 돌파 시 대세 상승 랠리 지속" },
                    { targetDesc: "20일선 및 50일선 사이 고점 박스권 수렴" },
                    { targetDesc: "직전 스윙 저점 붕괴 시 중장기 하락장 진입" }
                ], 69000, 60000, 65000, 58000, 42000);
            } else if (scenKey === 'bottom_2023') {
                updateTriggerLevelsDOM(25000, 16000, 18000, 15500);
                updateScenarioCardsDOM([
                    { targetDesc: "상승 다이버전스 확인 후 20일선 상방 돌파 랠리" },
                    { targetDesc: "장기 바닥 매물대($16K~$18K) 횡보 매집" },
                    { targetDesc: "신저가 이탈 시 추가 침체 리스크 발생" }
                ], 25000, 16000, 18000, 15500, 13000);
            } else if (scenKey === 'etf_2024') {
                updateTriggerLevelsDOM(73700, 62000, 68000, 59000);
                updateScenarioCardsDOM([
                    { targetDesc: "ETF 승인 모멘텀으로 전고점($73.7K) 돌파" },
                    { targetDesc: "기관 매집 박스권($62K~$68K) 수렴 횡보" },
                    { targetDesc: "핵심 넥라인($59K) 이탈 시 단기 변동성 확대" }
                ], 73700, 62000, 68000, 59000, 52000);
            }
        }

        visibleBarCount = chartData.length;
        drawChart();
        updateChartTimestamp();
    }

    let liveBtcRefreshTimer = null;
    function startLiveBtcAutoRefresh() {
        if (liveBtcRefreshTimer) clearInterval(liveBtcRefreshTimer);
        liveBtcRefreshTimer = setInterval(async () => {
            if (currentScenarioKey === 'live_btc') {
                const tabEl = document.getElementById('tab-chart-forecast');
                if (tabEl && !tabEl.classList.contains('hidden')) {
                    chartData = await loadLiveBtcData();
                    visibleBarCount = chartData.length;
                    drawChart();
                    updateChartTimestamp();
                }
            }
        }, 60000); // 60초 주기 자동 갱신
    }

    function updateChartTimestamp() {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} KST`;
        const shortTimeStr = `${pad(now.getHours())}:${pad(now.getMinutes())} KST`;

        const topBadgeTime = document.getElementById('chartUpdatedTime');
        const sidebarTime = document.getElementById('sidebarUpdatedTimeText');

        if (topBadgeTime) topBadgeTime.textContent = shortTimeStr;
        if (sidebarTime) sidebarTime.textContent = timeStr;
    }

    function showChartForecastToast(msg) {
        let toast = document.getElementById('chartForecastToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'chartForecastToast';
            toast.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-slate-900/95 text-white text-xs sm:text-sm font-semibold border border-cyan-500/50 shadow-2xl backdrop-blur-md flex items-center gap-2 transition-all duration-300 pointer-events-none opacity-0 translate-y-3';
            document.body.appendChild(toast);
        }
        toast.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-400"></i> <span>${msg}</span>`;
        toast.classList.remove('opacity-0', 'translate-y-3');
        toast.classList.add('opacity-100', 'translate-y-0');

        setTimeout(() => {
            toast.classList.remove('opacity-100', 'translate-y-0');
            toast.classList.add('opacity-0', 'translate-y-3');
        }, 2800);
    }

    function copyForecastForBlog() {
        const scen = SCENARIOS[currentScenarioKey] || SCENARIOS.full_cycle;
        const mainTitle = document.getElementById('guideMainTitle')?.textContent?.trim() || scen.title;
        const subTitle = document.getElementById('guideMainSubtitle')?.textContent?.trim() || scen.subtitle;
        const nodeBadge = document.getElementById('selectedNodeBadge')?.textContent?.trim() || scen.defaultNodeTitle;
        const nodeBodyEl = document.getElementById('selectedNodeBody');

        const bPrice = document.getElementById('level-breakout')?.textContent?.trim() || '$81,200';
        const rPrice = document.getElementById('level-range')?.textContent?.trim() || '$74,500 ~ $78,700';
        const dPrice = document.getElementById('level-danger')?.textContent?.trim() || '$73,200';

        const scenA = document.getElementById('scen-card-desc-a')?.textContent?.trim() || '직전 저항 돌파 시 목표가 타진';
        const scenB = document.getElementById('scen-card-desc-b')?.textContent?.trim() || '20·50일선 사이 횡보 매집';
        const scenC = document.getElementById('scen-card-desc-c')?.textContent?.trim() || '200일선 붕괴 시 하단 장기 지지 테스트';

        const scenTargetA = document.getElementById('scen-card-target-a')?.textContent?.trim() || '$87,692';
        const scenTargetB = document.getElementById('scen-card-target-b')?.textContent?.trim() || '$76K~$79K';
        const scenTargetC = document.getElementById('scen-card-target-c')?.textContent?.trim() || '$73,207';

        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())} KST`;

        // -------------------------------------------------------------
        // Helper: Convert Tailwind Classes to Inline Styles for Naver
        // -------------------------------------------------------------
        const convertClassesToInline = (html) => {
            return html
                .replace(/class="[^"]*text-emerald-400[^"]*"/g, 'style="color: #059669; font-weight: bold;"')
                .replace(/class="[^"]*text-rose-400[^"]*"/g, 'style="color: #dc2626; font-weight: bold;"')
                .replace(/class="[^"]*text-amber-400[^"]*"/g, 'style="color: #d97706; font-weight: bold;"')
                .replace(/class="[^"]*text-sky-400[^"]*"/g, 'style="color: #0284c7; font-weight: bold;"')
                .replace(/class="[^"]*text-purple-400[^"]*"/g, 'style="color: #7c3aed; font-weight: bold;"')
                .replace(/class="[^"]*text-cyan-400[^"]*"/g, 'style="color: #0891b2; font-weight: bold;"');
        };

        // -------------------------------------------------------------
        // Diagnosis Cards Extraction (Live 5 Core Indicators)
        // -------------------------------------------------------------
        const diagCardsContainer = document.getElementById('forecastDiagnosisCardsContainer');
        const sourceHtmlForCards = (diagCardsContainer && diagCardsContainer.innerHTML.trim().length > 10)
            ? diagCardsContainer.innerHTML
            : (SCENARIOS.live_btc && SCENARIOS.live_btc.defaultNodeDesc ? SCENARIOS.live_btc.defaultNodeDesc : '');

        let formattedDiagnosisHtml = '';
        let plainDiagnosisText = '';

        if (sourceHtmlForCards) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = sourceHtmlForCards;

            const rawCards = [
                { sel: '.forecast-dow-card', title: '1. 다우 이론 (Dow Theory) 추세 판단', border: '#0284c7', bg: '#f0f9ff', titleColor: '#0369a1', badgeBg: '#0284c7' },
                { sel: '.forecast-elliott-card', title: '2. 엘리엇 파동 (Elliott Wave) 관점', border: '#d97706', bg: '#fffbeb', titleColor: '#b45309', badgeBg: '#d97706' },
                { sel: '.forecast-ma-card', title: '3. 다중 이동평균선 (20·50·200MA)', border: '#7c3aed', bg: '#faf5ff', titleColor: '#6d28d9', badgeBg: '#7c3aed' },
                { sel: '.forecast-rsi-card', title: '4. RSI(14) 모멘텀 & 다이버전스', border: '#059669', bg: '#ecfdf5', titleColor: '#047857', badgeBg: '#059669' },
                { sel: '.forecast-sr-card', title: '5. 핵심 매물대(S/R) & 실전 전략', border: '#0891b2', bg: '#ecfeff', titleColor: '#0e7490', badgeBg: '#0891b2' }
            ];

            rawCards.forEach(item => {
                const cardEl = tempDiv.querySelector(item.sel);
                if (cardEl) {
                    const badgeText = cardEl.querySelector('.font-bold span:last-child')?.textContent?.trim() || '';
                    const descEl = cardEl.querySelector('.text-\\[11px\\], div:last-child');
                    const descHtml = descEl ? convertClassesToInline(descEl.innerHTML) : '';
                    const descCleanText = descEl ? descEl.textContent.replace(/\n\s*\n/g, '\n').trim() : '';

                    plainDiagnosisText += `[${item.title} - ${badgeText}]\n${descCleanText}\n\n`;

                    formattedDiagnosisHtml += `
                    <div style="background-color: ${item.bg}; border: 1px solid #e2e8f0; border-left: 5px solid ${item.border}; border-radius: 6px; padding: 10px 12px; margin-bottom: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif;">
                      <div style="font-weight: bold; font-size: 13px; color: ${item.titleColor}; margin-bottom: 4px;">
                        ${item.title} ${badgeText ? `<span style="font-size: 11px; font-weight: bold; background-color: ${item.badgeBg}; color: #ffffff; padding: 2px 8px; border-radius: 10px; margin-left: 6px;">${badgeText}</span>` : ''}
                      </div>
                      <div style="font-size: 12px; color: #334155; line-height: 1.5;">
                        ${descHtml}
                      </div>
                    </div>`;
                }
            });
        }

        // Focused spot description if user clicked on a specific marker
        let focusedSpotHtml = '';
        let focusedSpotPlain = '';
        const currentSpotDesc = nodeBodyEl ? nodeBodyEl.textContent.replace(/\n\s*\n/g, '\n').trim() : '';
        const isDefaultPlaceholder = currentSpotDesc.includes('차트 위의 파동 번호') || currentSpotDesc.includes('터치하면 해당 타점');
        if (!isDefaultPlaceholder && currentSpotDesc) {
            focusedSpotPlain = `■ 현재 선택된 차트 타점 해설: [${nodeBadge}]\n${currentSpotDesc}\n\n`;
            focusedSpotHtml = `
            <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-left: 5px solid #16a34a; border-radius: 6px; padding: 10px 12px; margin-bottom: 8px;">
              <div style="font-weight: bold; font-size: 13px; color: #15803d; margin-bottom: 4px;">
                🎯 현재 선택된 차트 타점 해설
                <span style="background-color: #16a34a; color: #ffffff; font-size: 11px; font-weight: bold; padding: 2px 8px; border-radius: 10px; margin-left: 6px;">${nodeBadge}</span>
              </div>
              <div style="font-size: 12px; color: #166534; line-height: 1.5;">
                ${convertClassesToInline(nodeBodyEl.innerHTML)}
              </div>
            </div>`;
        }

        // -------------------------------------------------------------
        // 1. Plain Text Version (Exhaustive & Complete)
        // -------------------------------------------------------------
        let plainText = `[BTC/USDT 비트코인 기술적 분석 & AI 시장 전망]\n`;
        plainText += `기준 일시: ${dateStr} (일봉 1D 기준)\n\n`;
        plainText += `■ 핵심 분석 테마: ${mainTitle}\n`;
        plainText += `"${subTitle}"\n\n`;
        plainText += `■ 실전 핵심 매매 기준선 (Trigger Levels)\n`;
        plainText += `• 🟢 상방 돌파 호재선: ${bPrice} (상방 돌파 시 하락 다우 구조 종결 및 강세 랠리 전환)\n`;
        plainText += `• 🟡 단기 수렴 박스권: ${rPrice} (20·50MA 수렴 횡보 및 매집 구간)\n`;
        plainText += `• 🔴 하방 위험 경보선: ${dPrice} (200일선 이탈 시 급락 위험 및 리스크 관리 기준)\n\n`;
        if (focusedSpotPlain) plainText += focusedSpotPlain;
        plainText += `■ 실시간 5대 핵심 기술적 지표 종합 진단\n${plainDiagnosisText}`;
        plainText += `■ AI 기술적 분석 3대 향후 전망 시나리오\n`;
        plainText += `1. 시나리오 A: 강세 돌파 랠리 (45%) [목표: ${scenTargetA}]\n   - ${scenA}\n`;
        plainText += `2. 시나리오 B: 박스권 수렴 지지 (35%) [목표: ${scenTargetB}]\n   - ${scenB}\n`;
        plainText += `3. 시나리오 C: 리스크 지지 이탈 (20%) [위험: ${scenTargetC}]\n   - ${scenC}\n\n`;
        plainText += `■ 4대 이론 마스터 교본\n`;
        plainText += `1. 다우 이론 (Dow Theory)\n`;
        plainText += `   - 상승 추세: 고점(HH)+저점(HL) 연속. 직전 HL 지지 시 매수.\n`;
        plainText += `   - 추세 전환 (BOS): HL 넥라인 하향 돌파 후 반등 고점(LH) 하락 확정.\n`;
        plainText += `2. 엘리엇 파동 (5파 상승 · 3파 조정)\n`;
        plainText += `   - ①파: 바닥권 매집 후 첫 충격파 반등.\n`;
        plainText += `   - ②파: 0.5~0.618 눌림목. ①파 시점 이탈 금지.\n`;
        plainText += `   - ③파: 1.618배 이상 거래량 폭발 대세 상승.\n`;
        plainText += `   - ④파: 0.382 부근 복합 횡보 조정.\n`;
        plainText += `   - ⑤파: RSI 하락 다이버전스 동반 후 A-B-C 조정.\n`;
        plainText += `3. 일봉 RSI 다이버전스\n`;
        plainText += `   - 하락 다이버전스 (천장 신호): 캔들 고점 상승(HH) vs RSI 고점 하락(LH)\n`;
        plainText += `   - 상승 다이버전스 (바닥 반전): 캔들 저점 하락(LL) vs RSI 저점 상승(HL)\n`;
        plainText += `4. 3대 이동평균선 (20·50·200MA)\n`;
        plainText += `   - 20일선: 단기 생명선 (상승 시 눌림목 지지)\n`;
        plainText += `   - 50일선: 중기 스윙 지지선 (④파 방어선)\n`;
        plainText += `   - 200일선: 강세/약세장 분기선 (골든크로스)\n\n`;
        plainText += `■ 실전 매매 3단계 체크리스트\n`;
        plainText += `1. 구조 확인: 200일선 위에서 HH·HL 상승 구조인가?\n`;
        plainText += `2. 위치 파악: 과열된 ⑤파 끝자락인가, 손익비 좋은 ②·④파인가?\n`;
        plainText += `3. 방아쇠 당기기: 다이버전스 출현 및 20일선 돌파/이탈 확인\n\n`;
        plainText += `출처: CryptoPnL 비트코인 실전 차트 작도 & AI 예측 (https://cryptopnl.com)`;

        // -------------------------------------------------------------
        // 2. Rich HTML Version (For Naver Blog SmartEditor - Zero Clutter)
        // -------------------------------------------------------------
        const richHtml = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif; max-width: 760px; margin: 0 auto; color: #1e293b; line-height: 1.5;">

  <!-- Header Box: Solid Pastel Background & High Contrast Dark Text -->
  <div style="background-color: #f0f9ff; border: 1.5px solid #0284c7; border-radius: 10px; padding: 14px 16px; margin-bottom: 10px;">
    <div style="margin-bottom: 8px;">
      <span style="background-color: #0284c7; color: #ffffff; font-size: 11px; font-weight: bold; padding: 3px 10px; border-radius: 12px; display: inline-block;">
        ⚡ BTC/USDT 일봉 분석 & AI 시장 전망
      </span>
      <span style="background-color: #0f172a; color: #38bdf8; font-size: 11px; font-weight: bold; padding: 2px 8px; border-radius: 12px; display: inline-block; border: 1px solid #38bdf8; margin-left: 4px;">
        🌐 cryptopnl.com
      </span>
    </div>
    <div style="margin: 0 0 6px 0; font-size: 18px; font-weight: 900; color: #0f172a; line-height: 1.3;">
      ${mainTitle}
    </div>
    <div style="margin: 0 0 8px 0; font-size: 13px; color: #334155; line-height: 1.4; font-weight: 500;">
      "${subTitle}"
    </div>
    <div style="border-top: 1px solid #bae6fd; padding-top: 6px; font-size: 11px; color: #0284c7; font-weight: bold;">
      📅 분석 기준: <span style="color: #0f172a;">${dateStr}</span> (일봉 1D 기준) | 공식 출처: <span style="color: #0369a1;">cryptopnl.com</span>
    </div>
  </div>

  <!-- Trigger Levels: Single Clean Table (No nested tables) -->
  <div style="margin-bottom: 10px;">
    <div style="font-size: 14px; font-weight: bold; color: #0f172a; margin-bottom: 6px;">
      🎯 실전 핵심 매매 기준선 (Trigger Levels)
    </div>
    <table border="0" cellpadding="8" cellspacing="4" style="width: 100%; border-collapse: separate; margin: 0;">
      <tr>
        <td style="width: 33%; background-color: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; text-align: center; vertical-align: top;">
          <div style="font-size: 11px; font-weight: bold; color: #047857;">🟢 상방 돌파 호재</div>
          <div style="font-size: 18px; font-weight: 900; color: #065f46; margin: 3px 0; font-family: monospace;">${bPrice}</div>
          <div style="font-size: 11px; color: #047857; line-height: 1.3;">돌파 시 하락 다우 종결<br>숏스퀴즈 강세 랠리</div>
        </td>
        <td style="width: 33%; background-color: #fffbeb; border: 1px solid #f59e0b; border-radius: 8px; text-align: center; vertical-align: top;">
          <div style="font-size: 11px; font-weight: bold; color: #b45309;">🟡 단기 수렴 박스</div>
          <div style="font-size: 18px; font-weight: 900; color: #92400e; margin: 3px 0; font-family: monospace;">${rPrice}</div>
          <div style="font-size: 11px; color: #b45309; line-height: 1.3;">20·50MA 수렴 횡보<br>스윙 매집 구간</div>
        </td>
        <td style="width: 33%; background-color: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; text-align: center; vertical-align: top;">
          <div style="font-size: 11px; font-weight: bold; color: #b91c1c;">🔴 하방 위험 경보</div>
          <div style="font-size: 18px; font-weight: 900; color: #991b1b; margin: 3px 0; font-family: monospace;">${dPrice}</div>
          <div style="font-size: 11px; color: #b91c1c; line-height: 1.3;">200일선 이탈 시 급락<br>리스크 관리 기준</div>
        </td>
      </tr>
    </table>
  </div>

  ${focusedSpotHtml}

  <!-- 5 Indicators Comprehensive Diagnosis -->
  <div style="margin-bottom: 10px;">
    <div style="font-size: 14px; font-weight: bold; color: #0f172a; margin-bottom: 6px;">
      📊 실시간 5대 핵심 기술적 지표 종합 진단
    </div>
    ${formattedDiagnosisHtml}
  </div>

  <!-- AI Scenarios (Zero nested tables) -->
  <div style="margin-bottom: 10px;">
    <div style="font-size: 14px; font-weight: bold; color: #0f172a; margin-bottom: 6px;">
      🚀 AI 기술적 분석 3대 향후 전망 시나리오
    </div>
    <!-- Scenario A -->
    <div style="background-color: #ecfdf5; border-left: 5px solid #059669; border-top: 1px solid #a7f3d0; border-right: 1px solid #a7f3d0; border-bottom: 1px solid #a7f3d0; border-radius: 6px; padding: 8px 12px; margin-bottom: 6px;">
      <div style="font-size: 13px; font-weight: bold; color: #047857; margin-bottom: 3px;">
        시나리오 A: 강세 돌파 랠리 (45%)
        <span style="background-color: #059669; color: #ffffff; font-size: 11px; font-weight: bold; padding: 2px 8px; border-radius: 10px; margin-left: 6px;">🎯 목표가 ${scenTargetA}</span>
      </div>
      <div style="font-size: 12px; color: #065f46; line-height: 1.4;">${scenA}</div>
    </div>
    <!-- Scenario B -->
    <div style="background-color: #fffbeb; border-left: 5px solid #d97706; border-top: 1px solid #fde68a; border-right: 1px solid #fde68a; border-bottom: 1px solid #fde68a; border-radius: 6px; padding: 8px 12px; margin-bottom: 6px;">
      <div style="font-size: 13px; font-weight: bold; color: #b45309; margin-bottom: 3px;">
        시나리오 B: 박스권 수렴 지지 (35%)
        <span style="background-color: #d97706; color: #ffffff; font-size: 11px; font-weight: bold; padding: 2px 8px; border-radius: 10px; margin-left: 6px;">🎯 목표가 ${scenTargetB}</span>
      </div>
      <div style="font-size: 12px; color: #92400e; line-height: 1.4;">${scenB}</div>
    </div>
    <!-- Scenario C -->
    <div style="background-color: #fef2f2; border-left: 5px solid #dc2626; border-top: 1px solid #fecaca; border-right: 1px solid #fecaca; border-bottom: 1px solid #fecaca; border-radius: 6px; padding: 8px 12px; margin-bottom: 6px;">
      <div style="font-size: 13px; font-weight: bold; color: #b91c1c; margin-bottom: 3px;">
        시나리오 C: 리스크 지지 이탈 (20%)
        <span style="background-color: #dc2626; color: #ffffff; font-size: 11px; font-weight: bold; padding: 2px 8px; border-radius: 10px; margin-left: 6px;">⚠️ 위험선 ${scenTargetC}</span>
      </div>
      <div style="font-size: 12px; color: #991b1b; line-height: 1.4;">${scenC}</div>
    </div>
  </div>

  <!-- 4 Core Theories Educational Guide (Zero nested tables) -->
  <div style="margin-bottom: 10px;">
    <div style="font-size: 14px; font-weight: bold; color: #0f172a; margin-bottom: 6px;">
      📚 4대 실전 이론 마스터 교본
    </div>
    <!-- 1. 다우 이론 -->
    <div style="background-color: #f0f9ff; border-left: 5px solid #0284c7; border-top: 1px solid #bae6fd; border-right: 1px solid #bae6fd; border-bottom: 1px solid #bae6fd; border-radius: 6px; padding: 8px 12px; margin-bottom: 6px;">
      <div style="font-weight: bold; font-size: 13px; color: #0369a1; margin-bottom: 3px;">
        1. 다우 이론 (Dow Theory) 추세 판단 기준
      </div>
      <div style="font-size: 12px; color: #334155; line-height: 1.5;">
        일봉의 스윙 고점과 저점을 이어 시장 추세 구조를 정의합니다.<br>
        • <b>상승 추세:</b> 고점(HH)+저점(HL) 연속 형성. 직전 HL 지지 시 매수 타점.<br>
        • <b>추세 전환(BOS):</b> 직전 HL 넥라인 하향 이탈 후 반등 고점(LH)에서 하락 확정.
      </div>
    </div>
    <!-- 2. 엘리엇 파동 -->
    <div style="background-color: #fffbeb; border-left: 5px solid #d97706; border-top: 1px solid #fde68a; border-right: 1px solid #fde68a; border-bottom: 1px solid #fde68a; border-radius: 6px; padding: 8px 12px; margin-bottom: 6px;">
      <div style="font-weight: bold; font-size: 13px; color: #b45309; margin-bottom: 3px;">
        2. 엘리엇 파동 (5파 상승 · 3파 조정)
      </div>
      <div style="font-size: 12px; color: #334155; line-height: 1.5;">
        • <b>①파:</b> 바닥권 매집 후 첫 충격파 반등 | <b>②파:</b> 0.5~0.618 눌림목<br>
        • <b>③파:</b> 1.618배 이상 거래량 폭발 대세 상승 | <b>④파:</b> 0.382 부근 횡보 조정<br>
        • <b>⑤파:</b> RSI 하락 다이버전스 동반 후 A-B-C 조정 국면 진입
      </div>
    </div>
    <!-- 3. RSI 다이버전스 -->
    <div style="background-color: #fdf2f8; border-left: 5px solid #db2777; border-top: 1px solid #fbcfe8; border-right: 1px solid #fbcfe8; border-bottom: 1px solid #fbcfe8; border-radius: 6px; padding: 8px 12px; margin-bottom: 6px;">
      <div style="font-weight: bold; font-size: 13px; color: #be185d; margin-bottom: 3px;">
        3. 일봉 RSI 다이버전스 (추세 반전 신호)
      </div>
      <div style="font-size: 12px; color: #334155; line-height: 1.5;">
        • <b>📉 하락 다이버전스 (천장 신호):</b> 캔들 고점 상승(HH) vs RSI 고점 하락(LH) → 분할 매도<br>
        • <b>📈 상승 다이버전스 (바닥 반전):</b> 캔들 저점 하락(LL) vs RSI 저점 상승(HL) → 분할 매수
      </div>
    </div>
    <!-- 4. 이동평균선 -->
    <div style="background-color: #faf5ff; border-left: 5px solid #7c3aed; border-top: 1px solid #f3e8ff; border-right: 1px solid #f3e8ff; border-bottom: 1px solid #f3e8ff; border-radius: 6px; padding: 8px 12px; margin-bottom: 6px;">
      <div style="font-weight: bold; font-size: 13px; color: #6d28d9; margin-bottom: 3px;">
        4. 3대 이동평균선 (20·50·200MA) 역할
      </div>
      <div style="font-size: 12px; color: #334155; line-height: 1.5;">
        • <b>20일선:</b> 단기 생명선 (상승 시 눌림목 지지선)<br>
        • <b>50일선:</b> 중기 스윙 지지선 (④파 넥라인 방어선)<br>
        • <b>200일선:</b> 강세장/약세장 분기선 (골든크로스 / 데드크로스)
      </div>
    </div>
  </div>

  <!-- Checklist Box -->
  <div style="background-color: #f8fafc; border: 1.5px solid #0284c7; border-radius: 8px; padding: 10px 14px; margin-bottom: 10px;">
    <div style="font-weight: bold; font-size: 13px; color: #0284c7; margin-bottom: 4px;">
      📋 실전 매매 3단계 체크리스트
    </div>
    <div style="font-size: 12px; color: #1e293b; line-height: 1.6;">
      1. <b>구조 확인:</b> 200일선 위에서 HH·HL 상승 다우 구조 유지 중인가?<br>
      2. <b>위치 파악:</b> 과열된 ⑤파 끝자락인가, 손익비 우수한 ②·④파 눌림목인가?<br>
      3. <b>트리거 확인:</b> RSI 다이버전스 확인 및 20일선 상/하향 돌파 시 진입/탈출
    </div>
  </div>

  <!-- Promotion Button -->
  <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 12px; text-align: center;">
    <div style="font-size: 13px; font-weight: bold; color: #0369a1; margin-bottom: 4px;">
      🌐 실시간 비트코인 일봉 차트 & AI 향후 전망 보러가기
    </div>
    <div style="font-size: 11px; color: #475569; margin-bottom: 8px;">
      다우 이론, 엘리엇 파동 5파, 20·50·200MA, RSI 다이버전스를 실시간 인터랙티브 차트에서 직접 확인하세요!
    </div>
    <a href="https://cryptopnl.com" target="_blank" style="display: inline-block; background-color: #0284c7; color: #ffffff; font-weight: bold; font-size: 12px; padding: 6px 18px; border-radius: 16px; text-decoration: none;">
      👉 cryptopnl.com 바로가기
    </a>
  </div>

</div>`;

        // -------------------------------------------------------------
        // 3. Robust Clipboard Copy Execution (Rich HTML + Plain Fallback)
        // -------------------------------------------------------------
        const doRichCopyFallback = (html, text) => {
            const listener = (e) => {
                e.clipboardData.setData('text/html', html);
                e.clipboardData.setData('text/plain', text);
                e.preventDefault();
            };
            document.addEventListener('copy', listener);
            try {
                const successful = document.execCommand('copy');
                document.removeEventListener('copy', listener);
                if (successful) {
                    showChartForecastToast('🎨 네이버 블로그 전체 서식(모든 내용+색상)이 복사되었습니다! Ctrl+V로 붙여넣으세요.');
                    return;
                }
            } catch (e) {
                document.removeEventListener('copy', listener);
            }

            // Final fallback to pure plain text textarea
            const tempTa = document.createElement('textarea');
            tempTa.value = text;
            tempTa.style.position = 'fixed';
            tempTa.style.left = '-9999px';
            document.body.appendChild(tempTa);
            tempTa.select();
            try {
                document.execCommand('copy');
                showChartForecastToast('📋 전체 분석 글이 복사되었습니다! (텍스트 전용)');
            } catch (err) {
                alert('복사에 실패했습니다. 브라우저 설정을 확인해주세요.');
            }
            document.body.removeChild(tempTa);
        };

        if (navigator.clipboard && window.ClipboardItem && navigator.clipboard.write) {
            const htmlBlob = new Blob([richHtml], { type: 'text/html' });
            const textBlob = new Blob([plainText], { type: 'text/plain' });
            navigator.clipboard.write([
                new ClipboardItem({
                    'text/html': htmlBlob,
                    'text/plain': textBlob
                })
            ]).then(() => {
                showChartForecastToast('🎨 네이버 블로그 전체 서식(모든 내용+색상)이 복사되었습니다! Ctrl+V로 붙여넣으세요.');
            }).catch(() => {
                doRichCopyFallback(richHtml, plainText);
            });
        } else {
            doRichCopyFallback(richHtml, plainText);
        }
    }

    function toggleLayer(layerKey) {
        layers[layerKey] = !layers[layerKey];
        syncLayerButtons();
        drawChart();
    }

    function soloLayer(target) {
        activeSolo = target;
        if (target === 'all') {
            Object.keys(layers).forEach(k => layers[k] = true);
        } else {
            Object.keys(layers).forEach(k => layers[k] = (k === target));
        }
        syncLayerButtons();
        drawChart();
    }

    function syncLayerButtons() {
        const activeClassMap = {
            dow: 'active-dow',
            elliott: 'active-elliott',
            ma: 'active-ma',
            div: 'active-div',
            sr: 'active-sr',
            forecast: 'active-forecast'
        };

        Object.keys(layers).forEach(k => {
            const btn = document.getElementById(`layer-${k}`);
            if (btn) {
                if (layers[k]) {
                    btn.classList.add(activeClassMap[k] || 'bg-cyan-500/20');
                    btn.classList.remove('opacity-60', 'text-slate-300');
                } else {
                    btn.classList.remove(activeClassMap[k] || 'bg-cyan-500/20');
                    btn.classList.add('opacity-60', 'text-slate-300');
                }
            }
        });
    }

    function startStepReplay() {
        if (replayInterval) {
            stopStepReplay();
            return;
        }

        visibleBarCount = 12;
        const btn = document.getElementById('replayBtn');
        if (btn) {
            btn.innerHTML = `<i class="fa-solid fa-pause mr-1"></i><span>재생 일시정지</span>`;
            btn.classList.replace('bg-[#2962ff]', 'bg-amber-600');
        }

        replayInterval = setInterval(() => {
            if (visibleBarCount < chartData.length) {
                visibleBarCount += 1;
                drawChart();
            } else {
                stopStepReplay();
            }
        }, 65);
    }

    function stopStepReplay() {
        if (replayInterval) {
            clearInterval(replayInterval);
            replayInterval = null;
        }
        const btn = document.getElementById('replayBtn');
        if (btn) {
            btn.innerHTML = `<i class="fa-solid fa-play mr-1"></i><span>캔들·작도 단계별 재생</span>`;
            btn.classList.replace('bg-amber-600', 'bg-[#2962ff]');
        }
    }

    function resetView() {
        stopStepReplay();
        visibleBarCount = chartData.length;
        soloLayer('all');
    }

    // ============================================================================
    // 6. INITIALIZATION & BINDINGS
    // ============================================================================

    function initChartForecastEngine() {
        canvas = document.getElementById('tvCanvas');
        if (!canvas) return;
        ctx = canvas.getContext('2d');

        // Mouse & Touch bindings (Avoid duplicate event listeners)
        if (!canvas._engineInitialized) {
            canvas._engineInitialized = true;

            function handlePointerMove(clientX, clientY) {
                const rect = canvas.getBoundingClientRect();
                mousePos.x = clientX - rect.left;
                mousePos.y = clientY - rect.top;

                // Check hotspot hover
                let foundSpot = null;
                for (const spot of interactiveHotspots) {
                    if (Math.hypot(mousePos.x - spot.x, mousePos.y - spot.y) <= spot.r + 10) {
                        foundSpot = spot;
                        break;
                    }
                }

                const banner = document.getElementById('hoverAnnotationBanner');
                if (foundSpot) {
                    canvas.style.cursor = 'pointer';
                    if (banner) {
                        banner.classList.remove('hidden');
                        const bTitle = document.getElementById('bannerTitle');
                        const bDesc = document.getElementById('bannerDesc');
                        if (bTitle) bTitle.textContent = foundSpot.title;
                        if (bDesc) bDesc.textContent = foundSpot.desc;
                    }
                    const nBadge = document.getElementById('selectedNodeBadge');
                    const nBody = document.getElementById('selectedNodeBody');
                    if (nBadge) nBadge.textContent = foundSpot.title;
                    if (nBody) nBody.innerHTML = foundSpot.desc;
                } else {
                    canvas.style.cursor = 'crosshair';
                    if (banner) banner.classList.add('hidden');
                }

                drawChart();
            }

            canvas.addEventListener('mousemove', (e) => {
                handlePointerMove(e.clientX, e.clientY);
            });

            // Touch events for mobile devices
            canvas.addEventListener('touchstart', (e) => {
                if (e.touches && e.touches.length > 0) {
                    handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
                }
            }, { passive: true });

            canvas.addEventListener('touchmove', (e) => {
                if (e.touches && e.touches.length > 0) {
                    handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
                }
            }, { passive: true });

            canvas.addEventListener('touchend', () => {
                setTimeout(() => {
                    const banner = document.getElementById('hoverAnnotationBanner');
                    if (banner) banner.classList.add('hidden');
                }, 3000);
            });

            canvas.addEventListener('mouseleave', () => {
                mousePos.x = -1;
                mousePos.y = -1;
                const banner = document.getElementById('hoverAnnotationBanner');
                if (banner) banner.classList.add('hidden');
                drawChart();
            });

            canvas.addEventListener('click', (e) => {
                const rect = canvas.getBoundingClientRect();
                const cx = e.clientX - rect.left;
                const cy = e.clientY - rect.top;
                let clickedSpot = null;
                for (const spot of interactiveHotspots) {
                    if (Math.hypot(cx - spot.x, cy - spot.y) <= spot.r + 10) {
                        clickedSpot = spot;
                        break;
                    }
                }
                const nBadge = document.getElementById('selectedNodeBadge');
                const nBody = document.getElementById('selectedNodeBody');
                if (clickedSpot) {
                    if (nBadge) nBadge.textContent = clickedSpot.title;
                    if (nBody) nBody.innerHTML = clickedSpot.desc;
                } else {
                    if (currentScenarioKey === 'live_btc') {
                        if (nBadge) nBadge.textContent = "실시간 타점 해설";
                        if (nBody) nBody.innerHTML = "차트 위의 파동 번호(①~⑤), HH/HL 태그, 다이버전스를 터치하면 해당 타점의 실전 매매 근거가 여기에 표시됩니다.";
                    } else {
                        const scen = SCENARIOS[currentScenarioKey];
                        if (scen) {
                            if (nBadge) nBadge.textContent = scen.defaultNodeTitle;
                            if (nBody) nBody.innerHTML = scen.defaultNodeDesc;
                        }
                    }
                }
            });

            window.addEventListener('resize', resizeCanvas);

            // Re-render chart on theme changes (Light / Dark)
            window.addEventListener('themeChanged', () => {
                requestAnimationFrame(drawChart);
            });

            try {
                const themeObserver = new MutationObserver((mutations) => {
                    for (const m of mutations) {
                        if (m.attributeName === 'class') {
                            requestAnimationFrame(drawChart);
                            break;
                        }
                    }
                });
                themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
            } catch (e) {}
        }

        updateChartTimestamp();
        if (!window._chartClockTimer) {
            window._chartClockTimer = setInterval(updateChartTimestamp, 1000);
        }

        selectScenario(currentScenarioKey);
        setTimeout(resizeCanvas, 50);
    }

    // Mobile SubTab Switcher (Summary / Theory / Checklist)
    function switchForecastSubTab(tabKey) {
        const tabs = ['summary', 'theory', 'checklist'];
        tabs.forEach(t => {
            const btn = document.getElementById(`subtab-btn-${t}`);
            const panel = document.getElementById(`forecast-panel-${t}`);
            if (t === tabKey) {
                if (btn) {
                    btn.classList.add('bg-cyan-500/20', 'text-cyan-300', 'border-cyan-400/50');
                    btn.classList.remove('text-slate-400', 'border-transparent');
                }
                if (panel) {
                    panel.classList.remove('hidden');
                    panel.classList.add('block');
                }
            } else {
                if (btn) {
                    btn.classList.remove('bg-cyan-500/20', 'text-cyan-300', 'border-cyan-400/50');
                    btn.classList.add('text-slate-400', 'border-transparent');
                }
                if (panel) {
                    panel.classList.remove('block');
                    panel.classList.add('hidden');
                }
            }
        });
    }

    // Expose global methods
    window.ChartForecastEngine = {
        init: initChartForecastEngine,
        selectScenario,
        toggleLayer,
        soloLayer,
        startStepReplay,
        stopStepReplay,
        resetView,
        resizeCanvas,
        copyForecastForBlog
    };

    window.selectScenario = selectScenario;
    window.toggleLayer = toggleLayer;
    window.soloLayer = soloLayer;
    window.startStepReplay = startStepReplay;
    window.stopStepReplay = stopStepReplay;
    window.resetView = resetView;
    window.initChartForecastEngine = initChartForecastEngine;
    window.switchForecastSubTab = switchForecastSubTab;
    window.renderChartForecastTheme = drawChart;
    window.copyForecastForBlog = copyForecastForBlog;

    // Auto-init if tab is currently visible
    document.addEventListener('DOMContentLoaded', () => {
        const tabEl = document.getElementById('tab-chart-forecast');
        if (tabEl && !tabEl.classList.contains('hidden')) {
            initChartForecastEngine();
        }
    });

})();
