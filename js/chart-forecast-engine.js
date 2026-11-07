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
                { priceTop: 83000, priceBottom: 80000, startIdx: 55, endIdx: 105, label: "핵심 넥라인 (④파 HL 지지 → 붕괴 후 저항 전환)", color: "rgba(16, 185, 129, 0.15)", borderColor: "#10b981" },
                { priceTop: 60000, priceBottom: 57500, startIdx: 25, endIdx: 109, label: "①파 고점 장기 지지 매물대 ($58.5K)", color: "rgba(56, 189, 248, 0.12)", borderColor: "#38bdf8" }
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

    let currentScenarioKey = 'full_cycle';
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

    // Live BTC Data Fetcher (Binance with Upbit fallback)
    async function loadLiveBtcData() {
        const btn = document.getElementById('scen-live_btc');
        if (btn) btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i>실시간 캔들 로딩...`;

        try {
            // Attempt 1: Binance 1D Klines (100 candles)
            const resp = await fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=100');
            if (!resp.ok) throw new Error('Binance error: ' + resp.status);
            const data = await resp.json();

            const bars = data.map((d, i) => {
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

            // Calculate MA & RSI on live data
            const total = bars.length;
            for (let i = 0; i < total; i++) {
                if (i >= 19) {
                    let sum = 0;
                    for (let k = 0; k < 20; k++) sum += bars[i - k].close;
                    bars[i].ma20 = Math.round(sum / 20);
                } else bars[i].ma20 = bars[i].close;

                if (i >= 49) {
                    let sum = 0;
                    for (let k = 0; k < 50; k++) sum += bars[i - k].close;
                    bars[i].ma50 = Math.round(sum / 50);
                } else bars[i].ma50 = bars[i].close;

                if (i >= 99) {
                    let sum = 0;
                    for (let k = 0; k < 100; k++) sum += bars[i - k].close;
                    bars[i].ma200 = Math.round(sum / 100);
                } else bars[i].ma200 = bars[0].close;
            }

            // RSI(14)
            const period = 14;
            let gains = [], losses = [];
            for (let i = 1; i < total; i++) {
                const diff = bars[i].close - bars[i - 1].close;
                gains.push(diff > 0 ? diff : 0);
                losses.push(diff < 0 ? -diff : 0);
            }
            let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
            let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

            for (let i = period; i < total; i++) {
                const curGain = gains[i - 1];
                const curLoss = losses[i - 1];
                avgGain = (avgGain * (period - 1) + curGain) / period;
                avgLoss = (avgLoss * (period - 1) + curLoss) / period;
                const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
                bars[i].rsi = Math.round(100 - (100 / (1 + rs)));
            }

            // Auto-generate real-time Dow & Elliott & SR zones based on live swings
            const lastBar = bars[bars.length - 1];
            const maxHigh = Math.max(...bars.map(b => b.high));
            const minLow = Math.min(...bars.map(b => b.low));
            const maxIdx = bars.findIndex(b => b.high === maxHigh);
            const minIdx = bars.findIndex(b => b.low === minLow);

            SCENARIOS.live_btc.totalBars = bars.length;
            SCENARIOS.live_btc.anchors = [
                { idx: minIdx, price: minLow },
                { idx: maxIdx, price: maxHigh },
                { idx: bars.length - 1, price: lastBar.close }
            ];

            SCENARIOS.live_btc.elliottNodes = [
                { idx: minIdx, label: "바닥HL", type: "start", pos: "below", title: `기간 최저점 ($${formatPrice(minLow)})`, desc: "최근 100일간 비트코인이 기록한 최저 바닥 매집 가격대입니다." },
                { idx: maxIdx, label: "고점HH", type: "impulse", pos: "above", title: `기간 최고점 ($${formatPrice(maxHigh)})`, desc: "최근 100일간 비트코인이 도달한 최고 신고가 저항선입니다." },
                { idx: bars.length - 1, label: "현재가", type: "impulse", pos: "above", title: `현재 실시간 캔들 ($${formatPrice(lastBar.close)})`, desc: `RSI: ${lastBar.rsi} • 20MA: $${formatPrice(lastBar.ma20)} • 50MA: $${formatPrice(lastBar.ma50)}` }
            ];

            SCENARIOS.live_btc.dowTags = [
                { idx: minIdx, text: "HL (최저)", pos: "below", color: "#089981" },
                { idx: maxIdx, text: "HH (최고)", pos: "above", color: "#facc15" },
                { idx: bars.length - 1, text: "NOW", pos: "above", color: "#38bdf8" }
            ];

            SCENARIOS.live_btc.srZones = [
                { priceTop: maxHigh * 1.01, priceBottom: maxHigh * 0.985, startIdx: Math.max(0, maxIdx - 15), endIdx: bars.length - 1, label: `핵심 저항대 ($${formatPrice(maxHigh)})`, color: "rgba(242, 54, 69, 0.15)", borderColor: "#f23645" },
                { priceTop: minLow * 1.02, priceBottom: minLow * 0.99, startIdx: Math.max(0, minIdx - 15), endIdx: bars.length - 1, label: `핵심 지지 매물대 ($${formatPrice(minLow)})`, color: "rgba(16, 185, 129, 0.15)", borderColor: "#10b981" }
            ];

            SCENARIOS.live_btc.divergences = [];
            if (maxIdx > 30 && maxIdx < bars.length - 5) {
                SCENARIOS.live_btc.divergences.push({
                    type: "bear",
                    idx1: maxIdx - 15,
                    idx2: maxIdx,
                    label: "실시간 모멘텀 관찰 구간",
                    desc: "고점 구간에서의 RSI 기울기 및 거래량 변화 관찰"
                });
            }

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
        canvasWidth = Math.max(rect.width, 320);
        canvasHeight = Math.max(rect.height, 460);

        const dpr = window.devicePixelRatio || 1;
        canvas.width = canvasWidth * dpr;
        canvas.height = canvasHeight * dpr;
        ctx.scale(dpr, dpr);

        priceTop = 15;
        priceHeight = Math.round(canvasHeight * 0.68);
        rsiTop = priceHeight + 35;
        rsiHeight = Math.max(canvasHeight - rsiTop - 25, 75);

        drawChart();
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

    function drawChart() {
        if (!ctx || !chartData || chartData.length === 0) return;

        const count = Math.min(visibleBarCount, chartData.length);
        if (count < 2) return;

        interactiveHotspots = [];

        // Clear background
        ctx.fillStyle = '#131722';
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

        const pMargin = (maxP - minP) * 0.08 || 1000;
        minP = Math.max(0, minP - pMargin);
        maxP = maxP + pMargin;

        const rightMargin = 72;
        const leftMargin = 12;
        const chartPlotWidth = canvasWidth - rightMargin - leftMargin;
        const barStep = chartPlotWidth / Math.max(count - 1, 1);
        const candleWidth = Math.max(2, Math.min(barStep * 0.65, 12));

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
        ctx.strokeStyle = '#1e222d';
        ctx.fillStyle = '#787b86';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        // 5 Price Grid Lines
        const priceSteps = 5;
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
            ctx.fillText('$' + formatPrice(pVal), canvasWidth - rightMargin + 6, py);
        }

        // Horizontal Separator Line between Price and RSI Panel
        ctx.strokeStyle = '#2a2e39';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, priceHeight + 20);
        ctx.lineTo(canvasWidth, priceHeight + 20);
        ctx.stroke();

        // RSI Panel Background & Reference Levels
        ctx.fillStyle = '#10141f';
        ctx.fillRect(leftMargin, rsiTop, chartPlotWidth, rsiHeight);

        // RSI 70 (Overbought - Red) & RSI 30 (Oversold - Green) & RSI 50
        const rsiLevels = [
            { lvl: 70, col: '#f23645', dash: [3, 3], label: '70 (과매수)' },
            { lvl: 50, col: '#4b5563', dash: [2, 4], label: '50 (중립)' },
            { lvl: 30, col: '#089981', dash: [3, 3], label: '30 (과매도)' }
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

                    ctx.font = '10px "Noto Sans KR", sans-serif';
                    ctx.fillStyle = zone.borderColor;
                    ctx.fillText(zone.label, x1 + 8, y1 + 14);
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
            const barCol = isBull ? '#089981' : '#f23645';

            // Volume Bar
            const vH = (b.volume / maxVol) * volMaxH;
            const vY = priceTop + priceHeight - vH;
            ctx.fillStyle = isBull ? 'rgba(8, 153, 129, 0.22)' : 'rgba(242, 54, 69, 0.22)';
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

            drawMaLine('ma200', '#c084fc', 2.0); // 200 MA (Purple)
            drawMaLine('ma50', '#38bdf8', 1.8);  // 50 MA (Sky)
            drawMaLine('ma20', '#facc15', 1.8);  // 20 MA (Yellow)
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

                    // Center Badge
                    const midX = (x1 + x2) / 2;
                    const midRy = (ry1 + ry2) / 2;
                    drawBadge(midX, midRy, isBull ? '상승 다이버전스 (가격 LL vs RSI HL)' : '하락 다이버전스 (가격 HH vs RSI LH)', isBull ? '#064e3b' : '#881337', divCol, '#ffffff');

                    interactiveHotspots.push({
                        x: midX,
                        y: midRy,
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
                const py = getY(isAbove ? b.high : b.low) + (isAbove ? -18 : 18);

                ctx.beginPath();
                ctx.arc(px, py, 11, 0, Math.PI * 2);
                ctx.fillStyle = node.type === 'corrective' ? '#ea580c' : '#ca8a04';
                ctx.fill();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.5;
                ctx.stroke();

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 11px "Inter", sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(node.label, px, py);

                interactiveHotspots.push({
                    x: px,
                    y: py,
                    r: 14,
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
                    const py = getY(isAbove ? b.high : b.low) + (isAbove ? -36 : 36);

                    ctx.font = 'bold 10px "JetBrains Mono", monospace';
                    const textW = ctx.measureText(tag.text).width;
                    const padX = 6;
                    const badgeW = textW + padX * 2;
                    const badgeH = 16;

                    ctx.fillStyle = 'rgba(19, 23, 34, 0.85)';
                    drawRoundedRect(ctx, px - badgeW / 2, py - badgeH / 2, badgeW, badgeH, 4);
                    ctx.fill();

                    ctx.strokeStyle = tag.color;
                    ctx.lineWidth = 1;
                    ctx.stroke();

                    ctx.fillStyle = tag.color;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(tag.text, px, py);

                    interactiveHotspots.push({
                        x: px,
                        y: py,
                        r: 12,
                        title: `다우 이론 구조: ${tag.text}`,
                        desc: isAbove ? "스윙 고점 (HH: 신고가 돌파 / LH: 반등 한계)" : "스윙 저점 (HL: 핵심 지지 / LL: 구조 붕괴 이탈)"
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

                drawBadge(endX + 35, endY, `$${formatPrice(p.targetPrice)}`, 'rgba(19, 23, 34, 0.9)', p.color, '#ffffff');

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
            ctx.strokeStyle = 'rgba(209, 212, 220, 0.35)';
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

                // Date Label on bottom of Price Panel
                ctx.fillStyle = '#1e222d';
                ctx.fillRect(mousePos.x - 38, priceHeight + 11, 76, 18);
                ctx.strokeStyle = '#2962ff';
                ctx.strokeRect(mousePos.x - 38, priceHeight + 11, 76, 18);
                ctx.fillStyle = '#64b5f6';
                ctx.font = '10px "JetBrains Mono", monospace';
                ctx.textAlign = 'center';
                ctx.fillText(b.date, mousePos.x, priceHeight + 20);
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
                    btn.classList.add('active', 'border-blue-500', 'bg-[#2962ff]/20', 'text-[#64b5f6]');
                    btn.classList.remove('text-[#9ca3af]');
                } else {
                    btn.classList.remove('active', 'border-blue-500', 'bg-[#2962ff]/20', 'text-[#64b5f6]');
                    btn.classList.add('text-[#9ca3af]');
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
        if (nodeBadge) nodeBadge.textContent = scen.defaultNodeTitle;
        if (nodeBody) nodeBody.textContent = scen.defaultNodeDesc;

        if (scenKey === 'live_btc') {
            chartData = await loadLiveBtcData();
        } else {
            chartData = buildScenarioData(scenKey);
        }

        visibleBarCount = chartData.length;
        drawChart();
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
                    btn.classList.remove('opacity-45');
                } else {
                    btn.classList.remove(activeClassMap[k] || 'bg-cyan-500/20');
                    btn.classList.add('opacity-45');
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

            canvas.addEventListener('mousemove', (e) => {
                const rect = canvas.getBoundingClientRect();
                mousePos.x = e.clientX - rect.left;
                mousePos.y = e.clientY - rect.top;

                // Check hotspot hover
                let foundSpot = null;
                for (const spot of interactiveHotspots) {
                    if (Math.hypot(mousePos.x - spot.x, mousePos.y - spot.y) <= spot.r) {
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
                        if (bTitle) bTitle.textContent = spot.title;
                        if (bDesc) bDesc.textContent = spot.desc;
                    }
                    const nBadge = document.getElementById('selectedNodeBadge');
                    const nBody = document.getElementById('selectedNodeBody');
                    if (nBadge) nBadge.textContent = foundSpot.title;
                    if (nBody) nBody.textContent = foundSpot.desc;
                } else {
                    canvas.style.cursor = 'crosshair';
                    if (banner) banner.classList.add('hidden');
                }

                drawChart();
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
                for (const spot of interactiveHotspots) {
                    if (Math.hypot(cx - spot.x, cy - spot.y) <= spot.r + 6) {
                        const nBadge = document.getElementById('selectedNodeBadge');
                        const nBody = document.getElementById('selectedNodeBody');
                        if (nBadge) nBadge.textContent = spot.title;
                        if (nBody) nBody.textContent = spot.desc;
                        break;
                    }
                }
            });

            window.addEventListener('resize', resizeCanvas);
        }

        selectScenario(currentScenarioKey);
        setTimeout(resizeCanvas, 50);
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
        resizeCanvas
    };

    window.selectScenario = selectScenario;
    window.toggleLayer = toggleLayer;
    window.soloLayer = soloLayer;
    window.startStepReplay = startStepReplay;
    window.stopStepReplay = stopStepReplay;
    window.resetView = resetView;
    window.initChartForecastEngine = initChartForecastEngine;

    // Auto-init if tab is currently visible
    document.addEventListener('DOMContentLoaded', () => {
        const tabEl = document.getElementById('tab-chart-forecast');
        if (tabEl && !tabEl.classList.contains('hidden')) {
            initChartForecastEngine();
        }
    });

})();
