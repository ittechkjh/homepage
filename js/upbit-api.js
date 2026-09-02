/**
 * upbit-api.js
 * 업비트 & 빗썸 Public API 및 전체 300+ 코인 마켓 매퍼
 */

const UpbitAPI = {
    koreanToSymbolMap: {
    "엑스알피": "XRP",
    "리플": "XRP",
    "이오스닥": "EOSDAC",
    "팝체인": "POPC",
    "비트코인에스브이": "BSV",
    "비트코인sv": "BSV",
    "소폰": "SOPH",
    "아스타": "ASTR",
    "너보스": "CKB",
    "비트코인": "BTC",
    "이더리움": "ETH",
    "솔라나": "SOL",
    "폴리곤": "POL",
    "매틱": "POL",
    "에이다": "ADA",

    "지오드넷": "GEOD",
    "왁스": "WAXP",
    "카브": "CARV",
    "리스크": "LSK",
    "제로지": "0G",
    "도그위프햇": "WIF",
    "오리진트레일": "TRAC",
    "보라": "BORA",
    "펀디엑스": "PUNDIX",
    "파로스": "PROS",
    "월드리버티파이낸셜유에스디": "USD1",
    "프롬": "PROM",
    "베이직어텐션토큰": "BAT",
    "헌트": "HUNT",
    "펏지펭귄": "PENGU",
    "파일코인": "FIL",
    "빔": "BEAM",
    "메타다오": "META2",
    "두들즈": "DOOD",
    "웨이브": "WAVES",
    "유에스디코인": "USDC",
    "무브먼트": "MOVE",
    "트리하우스": "TREE",
    "유에스디이": "USDE",
    "글로벌달러": "USDG",
    "휴미디파이": "WET",
    "테더": "USDT",
    "유에스디에스": "USDS",
    "더블제로": "2Z",
    "체인바운티": "BOUNTY",
    "카이토": "KAITO",
    "라이브피어": "LPT",
    "인터폴드": "FOLD",
    "블라스트": "BLAST",
    "이더파이": "ETHFI",
    "디카르고": "DKA",
    "앵커": "ANKR",
    "알고랜드": "ALGO",
    "시바이누": "SHIB",
    "스퀴드": "QUID",
    "유니스왑": "UNI",
    "바이오프로토콜": "BIO",
    "월드리버티파이낸셜": "WLFI",
    "슈퍼폼": "UP2",
    "토카막네트워크": "TOKAMAK",
    "스카이프로토콜": "SKY",
    "사이버": "CYBER",
    "시커": "SKR",
    "도지코인": "DOGE",
    "월드코인": "WLD",
    "페페": "PEPE",
    "헤데라": "HBAR",
    "카미노파이낸스": "KMNO",
    "비트코인캐시": "BCH",
    "뉴턴프로토콜": "NEWT",
    "세이": "SEI",
    "봉크": "BONK",
    "저스트": "JST",
    "에이브": "AAVE",
    "지토": "JTO",
    "주피터": "JUP",
    "베니스토큰": "VVV",
    "젠신": "AI",
    "파이버스": "PIEVERSE",
    "알트레이어": "ALT",
    "비쓰리": "B3",
    "솔레이어": "LAYER",
    "트론": "TRX",
    "파워렛저": "POWR",
    "오일러": "EUL",
    "코스모스": "ATOM",
    "아캄": "ARKM",
    "커브": "CRV",
    "크로노스": "CRO",
    "넥스페이스": "NXPC",
    "볼타": "A",
    "오피셜트럼프": "TRUMP",
    "신퓨처스": "F",
    "그래비티": "G",
    "셀로": "CELO",
    "에어로드롬파이낸스": "AERO",
    "크레딧코인": "CTC",
    "애니메코인": "ANIME",
    "앱토스": "APT",
    "모카네트워크": "MOCA",
    "에이피아이쓰리": "API3",
    "아하토큰": "AHT",
    "멀티버스엑스": "EGLD",
    "플루언트": "BLEND",
    "칼데라": "ERA",
    "폴리스웜": "NCT",
    "팔콘파이낸스": "FF",
    "플룸": "PLUME",
    "에스프레소": "ESP",
    "캔톤": "CC",
    "네오": "NEO",
    "이더리움클래식": "ETC",
    "아이오타": "IOTA",
    "아이오에스티": "IOST",
    "아카시네트워크": "AKT",
    "카우프로토콜": "COW",
    "버추얼프로토콜": "VIRTUAL",
    "리플유에스디": "RLUSD",
    "이더리움": "ETH",
    "아이큐": "IQ",
    "니어프로토콜": "NEAR",
    "레이븐코인": "RVN",
    "펄": "PRL",
    "어드벤처골드": "AGLD",
    "스페이스아이디": "ID",
    "아이오넷": "IO",
    "인피닛": "IN",
    "만트라": "MANTRA",
    "월러스": "WAL",
    "펜들": "PENDLE",
    "블러": "BLUR",
    "에이더블유이": "AWE",
    "쎄타토큰": "THETA",
    "엑셀라": "AXL",
    "히포프로토콜": "HP",
    "샌드박스": "SAND",
    "월렛커넥트": "WCT",
    "일드길드게임즈": "YGG",
    "엑시인피니티": "AXS",
    "아더": "ARDR",
    "매직에덴": "ME",
    "인튜이션": "TRUST",
    "소닉SVM": "SONIC",
    "아비트럼": "ARB",
    "폴리곤에코시스템토큰": "POL",
    "시빅": "CVC",
    "쓰레스홀드": "T",
    "아르키움": "ARX",
    "웜홀": "W",
    "아크": "ARK",
    "아반티스": "AVNT",
    "오원익스체인지": "O",
    "라그랑주": "LA",
    "하이퍼레인": "HYPER",
    "에이셔": "ATH",
    "라이터": "LIT",
    "타이코": "TAIKO",
    "리": "RE",
    "아발란체": "AVAX",
    "테더골드": "XAUT",
    "클리어풀": "CPOOL",
    "캡": "CAP",
    "이뮤터블엑스": "IMX",
    "시아코인": "SC",
    "인젝티브": "INJ",
    "엠블": "MVL",
    "하이브": "HIVE",
    "코박토큰": "CBK",
    "스텔라루멘": "XLM",
    "옵티미즘": "OP",
    "세이프": "SAFE",
    "골렘": "GLM",
    "슈퍼버스": "SUPER",
    "리네아": "LINEA",
    "데이터네트워크": "DATA",
    "커널다오": "KERNEL",
    "포켓네트워크": "POKT",
    "센티언트": "SENT",
    "바운드리스": "ZKC",
    "카이버네트워크": "KNC",
    "지케이패스": "ZKP",
    "바운스토큰": "AUCTION",
    "오덜리": "ORDER",
    "피르마체인": "FCT2",
    "메탈": "MTL",
    "비체인": "VET",
    "비트텐서": "TAO",
    "퀀텀": "QTUM",
    "썬더코어": "TT",
    "체인링크": "LINK",
    "엑스알피(리플)": "XRP",
    "칠리즈": "CHZ",
    "아스타": "ASTR",
    "지케이싱크": "ZK",
    "스토리지": "STORJ",
    "에테나": "ENA",
    "디센트럴랜드": "MANA",
    "오픈렛저": "OPEN",
    "피스네트워크": "PYTH",
    "이더리움네임서비스": "ENS",
    "더그래프": "GRT",
    "펌프펀": "PUMP",
    "테조스": "XTZ",
    "너보스": "CKB",
    "카바": "KAVA",
    "토시": "TOSHI",
    "롬바드": "BARD",
    "레이어제로": "ZRO",
    "레이디움": "RAY",
    "온도파이낸스": "ONDO",
    "제로엑스": "ZRX",
    "스테픈": "GMT",
    "쎄타퓨엘": "TFUEL",
    "센트리퓨즈": "CFG",
    "아즈텍": "AZTEC",
    "콘플럭스": "CFX",
    "플라즈마": "XPL",
    "자마": "ZAMA",
    "마스크네트워크": "MASK",
    "이유알코인": "EURC",
    "컴파운드": "COMP",
    "제타체인": "ZETA",
    "레드스톤": "RED",
    "셀레스티아": "TIA",
    "에이다": "ADA",
    "엘프": "ELF",
    "쑨": "SOON",
    "스팀": "STEEM",
    "헤이엘사": "ELSA",
    "스파크": "SPK",
    "소폰": "SOPH",
    "에스피엑스6900": "SPX",
    "메디블록": "MED",
    "1인치네트워크": "1INCH",
    "카타나": "KAT",
    "캣인어독스월드": "MEW",
    "오브스": "ORBS",
    "렌더토큰": "RENDER",
    "오르카": "ORCA",
    "베라체인": "BERA",
    "사인": "SIGN",
    "댑오에스": "DOS",
    "솔스티스": "SLX",
    "바나": "VANA",
    "폴카닷": "DOT",
    "디피니티브": "EDGE",
    "메테오라": "MET2",
    "무비블록": "MBL",
    "플루이드": "FLUID",
    "빅타임": "BIGTIME",
    "스테이터스네트워크토큰": "SNT",
    "솔라나": "SOL",
    "쿼크체인": "QKC",
    "디라이브": "DRV",
    "메타디움": "META",
    "아이리스": "IRYS",
    "사하라에이아이": "SAHARA",
    "밀크": "MLK",
    "비토르토큰": "VTHO",
    "카이트": "KITE",
    "미나": "MINA",
    "모멘텀": "MMT",
    "유에스디에이아이": "CHIP",
    "조라": "ZORA",
    "오닉스코인": "XCN",
    "가스": "GAS",
    "메가이더": "MEGA",
    "맨틀": "MNT",
    "모스코인": "MOC",
    "무뎅": "MOODENG",
    "이캐시": "XEC",
    "모나드": "MON",
    "모포": "MORPHO",
    "질리카": "ZIL",
    "게임빌드": "GAME2",
    "스택스": "STX",
    "플록": "FLOCK",
    "블록스트리트": "BSB",
    "서싱트": "PROVE",
    "비트코인에스브이": "BSV",
    "수이": "SUI",
    "메이플파이낸스": "SYRUP",
    "비트코인": "BTC",
    "바빌론": "BABY",
    "홀로월드에이아이": "HOLO",
    "미라네트워크": "MIRA",
    "썬": "SUN",
    "제로베이스": "ZBT",
    "온톨로지가스": "ONG",
    "비트토렌트": "BTT",
    "엔소": "ENSO",
    "문버드": "BIRB",
    "온톨로지": "ONT",
    "솜니아": "SOMI",
    "그래비티토큰": "GRVT",
    "딥북": "DEEP",
    "디파이앱": "HOME",
    "저트라": "STRAX",
    "인터넷컴퓨터": "ICP",
    "오픈그라디언트": "OPG",
    "브레비스": "BREV",
    "아이콘": "ICX",
    "폴리매쉬": "POLYX",
    "마스크": "MASK",
    "리플": "XRP",
    "스타크넷": "STRK",
    "플로키": "FLOKI",
    "플로우": "FLOW",
    "이오스": "EOS",
    "엔진코인": "ENJ",
    "1인치": "1INCH",
    "메이커": "MKR",
    "오픈캠퍼스": "EDU",
    "폴리곤": "POL",
    "폴리곤(POL)": "POL",
    "매틱": "POL",
    "대한민국 원": "KRW",
    "원화": "KRW"
},
    knownKoreanNames: {
    "GEOD": "지오드넷",
    "WAXP": "왁스",
    "CARV": "카브",
    "LSK": "리스크",
    "0G": "제로지",
    "WIF": "도그위프햇",
    "TRAC": "오리진트레일",
    "BORA": "보라",
    "PUNDIX": "펀디엑스",
    "PROS": "파로스",
    "USD1": "월드리버티파이낸셜유에스디",
    "PROM": "프롬",
    "BAT": "베이직어텐션토큰",
    "HUNT": "헌트",
    "PENGU": "펏지펭귄",
    "FIL": "파일코인",
    "BEAM": "빔",
    "META2": "메타다오",
    "DOOD": "두들즈",
    "WAVES": "웨이브",
    "USDC": "유에스디코인",
    "MOVE": "무브먼트",
    "TREE": "트리하우스",
    "USDE": "유에스디이",
    "USDG": "글로벌달러",
    "WET": "휴미디파이",
    "USDT": "테더",
    "USDS": "유에스디에스",
    "2Z": "더블제로",
    "BOUNTY": "체인바운티",
    "KAITO": "카이토",
    "LPT": "라이브피어",
    "FOLD": "인터폴드",
    "BLAST": "블라스트",
    "ETHFI": "이더파이",
    "DKA": "디카르고",
    "ANKR": "앵커",
    "ALGO": "알고랜드",
    "SHIB": "시바이누",
    "QUID": "스퀴드",
    "UNI": "유니스왑",
    "BIO": "바이오프로토콜",
    "WLFI": "월드리버티파이낸셜",
    "UP2": "슈퍼폼",
    "TOKAMAK": "토카막네트워크",
    "SKY": "스카이프로토콜",
    "CYBER": "사이버",
    "SKR": "시커",
    "DOGE": "도지코인",
    "WLD": "월드코인",
    "PEPE": "페페",
    "HBAR": "헤데라",
    "KMNO": "카미노파이낸스",
    "BCH": "비트코인캐시",
    "NEWT": "뉴턴프로토콜",
    "SEI": "세이",
    "BONK": "봉크",
    "JST": "저스트",
    "AAVE": "에이브",
    "JTO": "지토",
    "JUP": "주피터",
    "VVV": "베니스토큰",
    "AI": "젠신",
    "PIEVERSE": "파이버스",
    "ALT": "알트레이어",
    "B3": "비쓰리",
    "LAYER": "솔레이어",
    "TRX": "트론",
    "POWR": "파워렛저",
    "EUL": "오일러",
    "ATOM": "코스모스",
    "ARKM": "아캄",
    "CRV": "커브",
    "CRO": "크로노스",
    "NXPC": "넥스페이스",
    "A": "볼타",
    "TRUMP": "오피셜트럼프",
    "F": "신퓨처스",
    "G": "그래비티",
    "CELO": "셀로",
    "AERO": "에어로드롬파이낸스",
    "CTC": "크레딧코인",
    "ANIME": "애니메코인",
    "APT": "앱토스",
    "MOCA": "모카네트워크",
    "API3": "에이피아이쓰리",
    "AHT": "아하토큰",
    "EGLD": "멀티버스엑스",
    "BLEND": "플루언트",
    "ERA": "칼데라",
    "NCT": "폴리스웜",
    "FF": "팔콘파이낸스",
    "PLUME": "플룸",
    "ESP": "에스프레소",
    "CC": "캔톤",
    "NEO": "네오",
    "ETC": "이더리움클래식",
    "IOTA": "아이오타",
    "IOST": "아이오에스티",
    "AKT": "아카시네트워크",
    "COW": "카우프로토콜",
    "VIRTUAL": "버추얼프로토콜",
    "RLUSD": "리플유에스디",
    "ETH": "이더리움",
    "IQ": "아이큐",
    "NEAR": "니어프로토콜",
    "RVN": "레이븐코인",
    "PRL": "펄",
    "AGLD": "어드벤처골드",
    "ID": "스페이스아이디",
    "IO": "아이오넷",
    "IN": "인피닛",
    "MANTRA": "만트라",
    "WAL": "월러스",
    "PENDLE": "펜들",
    "BLUR": "블러",
    "AWE": "에이더블유이",
    "THETA": "쎄타토큰",
    "AXL": "엑셀라",
    "HP": "히포프로토콜",
    "SAND": "샌드박스",
    "WCT": "월렛커넥트",
    "YGG": "일드길드게임즈",
    "AXS": "엑시인피니티",
    "ARDR": "아더",
    "ME": "매직에덴",
    "TRUST": "인튜이션",
    "SONIC": "소닉SVM",
    "ARB": "아비트럼",
    "POL": "폴리곤에코시스템토큰",
    "CVC": "시빅",
    "T": "쓰레스홀드",
    "ARX": "아르키움",
    "W": "웜홀",
    "ARK": "아크",
    "AVNT": "아반티스",
    "O": "오원익스체인지",
    "LA": "라그랑주",
    "HYPER": "하이퍼레인",
    "ATH": "에이셔",
    "LIT": "라이터",
    "TAIKO": "타이코",
    "RE": "리",
    "AVAX": "아발란체",
    "XAUT": "테더골드",
    "CPOOL": "클리어풀",
    "CAP": "캡",
    "IMX": "이뮤터블엑스",
    "SC": "시아코인",
    "INJ": "인젝티브",
    "MVL": "엠블",
    "HIVE": "하이브",
    "CBK": "코박토큰",
    "XLM": "스텔라루멘",
    "OP": "옵티미즘",
    "SAFE": "세이프",
    "GLM": "골렘",
    "SUPER": "슈퍼버스",
    "LINEA": "리네아",
    "DATA": "데이터네트워크",
    "KERNEL": "커널다오",
    "POKT": "포켓네트워크",
    "SENT": "센티언트",
    "ZKC": "바운드리스",
    "KNC": "카이버네트워크",
    "ZKP": "지케이패스",
    "AUCTION": "바운스토큰",
    "ORDER": "오덜리",
    "FCT2": "피르마체인",
    "MTL": "메탈",
    "VET": "비체인",
    "TAO": "비트텐서",
    "QTUM": "퀀텀",
    "TT": "썬더코어",
    "LINK": "체인링크",
    "XRP": "엑스알피(리플)",
    "CHZ": "칠리즈",
    "ASTR": "아스타",
    "ZK": "지케이싱크",
    "STORJ": "스토리지",
    "ENA": "에테나",
    "MANA": "디센트럴랜드",
    "OPEN": "오픈렛저",
    "PYTH": "피스네트워크",
    "ENS": "이더리움네임서비스",
    "GRT": "더그래프",
    "PUMP": "펌프펀",
    "XTZ": "테조스",
    "CKB": "너보스",
    "KAVA": "카바",
    "TOSHI": "토시",
    "BARD": "롬바드",
    "ZRO": "레이어제로",
    "RAY": "레이디움",
    "ONDO": "온도파이낸스",
    "ZRX": "제로엑스",
    "GMT": "스테픈",
    "TFUEL": "쎄타퓨엘",
    "CFG": "센트리퓨즈",
    "AZTEC": "아즈텍",
    "CFX": "콘플럭스",
    "XPL": "플라즈마",
    "ZAMA": "자마",
    "MASK": "마스크네트워크",
    "EURC": "이유알코인",
    "COMP": "컴파운드",
    "ZETA": "제타체인",
    "RED": "레드스톤",
    "TIA": "셀레스티아",
    "ADA": "에이다",
    "ELF": "엘프",
    "SOON": "쑨",
    "STEEM": "스팀",
    "ELSA": "헤이엘사",
    "SPK": "스파크",
    "SOPH": "소폰",
    "SPX": "에스피엑스6900",
    "MED": "메디블록",
    "1INCH": "1인치네트워크",
    "KAT": "카타나",
    "MEW": "캣인어독스월드",
    "ORBS": "오브스",
    "RENDER": "렌더토큰",
    "ORCA": "오르카",
    "BERA": "베라체인",
    "SIGN": "사인",
    "DOS": "댑오에스",
    "SLX": "솔스티스",
    "VANA": "바나",
    "DOT": "폴카닷",
    "EDGE": "디피니티브",
    "MET2": "메테오라",
    "MBL": "무비블록",
    "FLUID": "플루이드",
    "BIGTIME": "빅타임",
    "SNT": "스테이터스네트워크토큰",
    "SOL": "솔라나",
    "QKC": "쿼크체인",
    "DRV": "디라이브",
    "META": "메타디움",
    "IRYS": "아이리스",
    "SAHARA": "사하라에이아이",
    "MLK": "밀크",
    "VTHO": "비토르토큰",
    "KITE": "카이트",
    "MINA": "미나",
    "MMT": "모멘텀",
    "CHIP": "유에스디에이아이",
    "ZORA": "조라",
    "XCN": "오닉스코인",
    "GAS": "가스",
    "MEGA": "메가이더",
    "MNT": "맨틀",
    "MOC": "모스코인",
    "MOODENG": "무뎅",
    "XEC": "이캐시",
    "MON": "모나드",
    "MORPHO": "모포",
    "ZIL": "질리카",
    "GAME2": "게임빌드",
    "STX": "스택스",
    "FLOCK": "플록",
    "BSB": "블록스트리트",
    "PROVE": "서싱트",
    "BSV": "비트코인에스브이",
    "SUI": "수이",
    "SYRUP": "메이플파이낸스",
    "BTC": "비트코인",
    "BABY": "바빌론",
    "HOLO": "홀로월드에이아이",
    "MIRA": "미라네트워크",
    "SUN": "썬",
    "ZBT": "제로베이스",
    "ONG": "온톨로지가스",
    "BTT": "비트토렌트",
    "ENSO": "엔소",
    "BIRB": "문버드",
    "ONT": "온톨로지",
    "SOMI": "솜니아",
    "GRVT": "그래비티토큰",
    "DEEP": "딥북",
    "HOME": "디파이앱",
    "STRAX": "저트라",
    "ICP": "인터넷컴퓨터",
    "OPG": "오픈그라디언트",
    "BREV": "브레비스",
    "ICX": "아이콘",
    "POLYX": "폴리매쉬",
    "STRK": "스타크넷",
    "FLOKI": "플로키",
    "FLOW": "플로우",
    "EOS": "이오스",
    "ENJ": "엔진코인",
    "MKR": "메이커",
    "EDU": "오픈캠퍼스",
    "KRW": "대한민국 원"
},
    marketInfoMap: {},
    isMarketInfoLoaded: false,

    initMarketInfo: async function () {
        if (this.isMarketInfoLoaded) return;
        try {
            const res = await fetch('https://api.upbit.com/v1/market/all?isDetails=false');
            if (res.ok) {
                const data = await res.json();
                data.forEach(item => {
                    this.marketInfoMap[item.market] = {
                        koreanName: item.korean_name,
                        englishName: item.english_name,
                        market: item.market
                    };
                    const symbol = item.market.split('-')[1];
                    if (symbol) {
                        this.koreanToSymbolMap[item.korean_name] = symbol;
                        this.knownKoreanNames[symbol] = item.korean_name;
                    }
                });
                this.isMarketInfoLoaded = true;
            }
        } catch (err) {
            console.warn('업비트 마켓 정보 원격 로드 실패 (내장 사전 사용)');
        }
    },

    getStandardMarketInfo: function (input) {
        if (!input) return { symbol: '', market: '' };
        let str = String(input).trim();

        // Handle exchange prefix e.g. UPBIT:::KRW-BTC or BITHUMB:::ETH
        if (str.includes(':::')) {
            str = str.split(':::')[1].trim();
        }

        if (str === 'KRW' || str === '원화' || str === '대한민국 원') {
            return { symbol: 'KRW', market: 'KRW-KRW' };
        }

        const match = str.match(/\((.*?)\)/);
        if (match && match[1]) {
            str = match[1].trim();
        }

        if (str.includes('/')) {
            str = str.split('/')[0].trim();
        }

        if (str.startsWith('KRW-') || str.startsWith('BTC-') || str.startsWith('USDT-')) {
            const parts = str.split('-');
            const symbolCandidate = parts[1];
            if (this.koreanToSymbolMap[symbolCandidate]) {
                const sym = this.koreanToSymbolMap[symbolCandidate];
                return { symbol: sym, market: 'KRW-' + sym };
            }
            return { symbol: symbolCandidate.toUpperCase(), market: str.toUpperCase() };
        }

        if (this.koreanToSymbolMap[str]) {
            const sym = this.koreanToSymbolMap[str];
            return { symbol: sym, market: 'KRW-' + sym };
        }

        const upper = str.toUpperCase();
        return { symbol: upper, market: 'KRW-' + upper };
    },

    getKoreanName: function (marketOrSymbol) {
        if (!marketOrSymbol) return '';
        const { symbol, market } = this.getStandardMarketInfo(marketOrSymbol);
        if (symbol === 'KRW') return '대한민국 원';
        if (this.marketInfoMap[market]) return this.marketInfoMap[market].koreanName;
        if (this.knownKoreanNames[symbol]) return this.knownKoreanNames[symbol];
        return symbol;
    },

    fetchTickers: async function (markets) {
        if (!markets || markets.length === 0) return {};

        await this.initMarketInfo();

        const krwMarkets = markets
            .map(m => this.getStandardMarketInfo(m).market)
            .filter(m => m && m !== 'KRW-KRW' && m !== 'KRW')
            .filter((v, i, a) => a.indexOf(v) === i);

        if (krwMarkets.length === 0) return {};

        const tickerMap = {};

        // Filter for markets that exist in Upbit to avoid 404 on delisted coins
        const validUpbitMarkets = krwMarkets.filter(m => this.marketInfoMap[m]);
        const queryList = validUpbitMarkets.length > 0 ? validUpbitMarkets : krwMarkets;

        // 1. Fetch Upbit Tickers in Chunks of 50 (to prevent 400 Bad Request / URL overflow)
        const chunkSize = 50;
        for (let i = 0; i < queryList.length; i += chunkSize) {
            const chunk = queryList.slice(i, i + chunkSize);
            try {
                const marketParam = chunk.join(',');
                const res = await fetch('https://api.upbit.com/v1/ticker?markets=' + encodeURIComponent(marketParam));
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        data.forEach(item => {
                            const entry = {
                                tradePrice: item.trade_price,
                                signedChangeRate: item.signed_change_rate,
                                accTradeVolume24h: item.acc_trade_volume_24h,
                                timestamp: item.timestamp
                            };
                            tickerMap[item.market] = entry;
                            const sym = item.market.includes('-') ? item.market.split('-')[1] : item.market;
                            tickerMap[sym] = entry;
                            tickerMap['UPBIT:::' + item.market] = entry;
                            tickerMap['BITHUMB:::' + item.market] = entry;
                        });
                    }
                }
            } catch (err) {
                console.warn('업비트 시세 청크 조회 실패:', err);
            }
        }

        // 2. Bithumb Ticker Fallback for any missing coins
        try {
            const bRes = await fetch('https://api.bithumb.com/public/ticker/ALL_KRW');
            if (bRes.ok) {
                const bData = await bRes.json();
                if (bData && bData.status === '0000' && bData.data) {
                    for (const [sym, info] of Object.entries(bData.data)) {
                        if (sym === 'date' || typeof info !== 'object') continue;
                        const closingPrice = parseFloat(info.closing_price) || 0;
                        const fluctRate = (parseFloat(info.fluctate_rate_24H) || 0) / 100;
                        if (closingPrice > 0) {
                            const entry = {
                                tradePrice: closingPrice,
                                signedChangeRate: fluctRate,
                                accTradeVolume24h: parseFloat(info.acc_trade_value_24H) || 0,
                                timestamp: Date.now()
                            };
                            const mkt = 'KRW-' + sym;
                            if (!tickerMap[mkt]) {
                                tickerMap[mkt] = entry;
                                tickerMap[sym] = entry;
                                tickerMap['BITHUMB:::' + mkt] = entry;
                                tickerMap['UPBIT:::' + mkt] = entry;
                            }
                        }
                    }
                }
            }
        } catch (bErr) {
            // Bithumb fallback silent catch
        }

        return tickerMap;
    },

    fetchCandles: async function (marketOrSymbol, candleType = 'days', count = 200, to = '') {
        const { symbol, market } = this.getStandardMarketInfo(marketOrSymbol);
        if (!symbol || symbol === 'KRW') return [];

        let url = 'https://api.upbit.com/v1/candles/' + candleType + '?market=' + encodeURIComponent(market) + '&count=' + count;
        if (to) {
            let toParam = to.includes(' ') ? to.replace(' ', 'T') + '+09:00' : to;
            url += '&to=' + encodeURIComponent(toParam);
        }

        try {
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    return data.reverse().map(c => ({
                        time: c.candle_date_time_kst.replace('T', ' '),
                        date: c.candle_date_time_kst.split('T')[0],
                        open: c.opening_price,
                        high: c.high_price,
                        low: c.low_price,
                        close: c.trade_price,
                        volume: c.candle_acc_trade_volume,
                        price: c.trade_price,
                        timestamp: new Date(c.candle_date_time_kst).getTime()
                    }));
                }
            }
        } catch (err) {
            console.warn('업비트 캔들 API 실패 (' + market + '), 빗썸 API로 폴백 시도');
        }

        try {
            let bithumbInterval = '24h';
            if (candleType === 'minutes/1') bithumbInterval = '1m';
            else if (candleType === 'minutes/3') bithumbInterval = '3m';
            else if (candleType === 'minutes/5') bithumbInterval = '5m';
            else if (candleType === 'minutes/10') bithumbInterval = '10m';
            else if (candleType === 'minutes/30') bithumbInterval = '30m';
            else if (candleType === 'minutes/60') bithumbInterval = '1h';
            else if (candleType === 'minutes/240') bithumbInterval = '6h';

            const bRes = await fetch('https://api.bithumb.com/public/candlestick/' + encodeURIComponent(symbol) + '_KRW/' + bithumbInterval);
            if (bRes.ok) {
                const bData = await bRes.json();
                if (bData && bData.status === '0000' && Array.isArray(bData.data)) {
                    return bData.data.slice(-count).map(row => {
                        const d = new Date(Number(row[0]));
                        const timeStr = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0') + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0') + ':00';
                        return {
                            time: timeStr,
                            date: timeStr.split(' ')[0],
                            open: parseFloat(row[1]),
                            close: parseFloat(row[2]),
                            high: parseFloat(row[3]),
                            low: parseFloat(row[4]),
                            volume: parseFloat(row[5]),
                            price: parseFloat(row[2]),
                            timestamp: Number(row[0])
                        };
                    });
                }
            }
        } catch (err) {}

        return [];
    },

    enrichCoinSummariesWithTickers: function (coinSummaries, tickerMap) {
        let totalCurrentValue = 0;
        let totalUnrealizedProfit = 0;

        coinSummaries.forEach(coin => {
            const { market, symbol } = this.getStandardMarketInfo(coin.market || coin.coinSymbol);
            const ticker = tickerMap[market] || tickerMap[symbol] || (coin.market ? tickerMap[coin.market] : null) || (coin.coinSymbol ? tickerMap[coin.coinSymbol] : null);

            coin.koreanName = this.getKoreanName(market || coin.market || coin.coinSymbol);

            if (ticker && coin.holdingQty > 1e-8) {
                coin.currentPrice = ticker.tradePrice;
                coin.currentValue = coin.holdingQty * ticker.tradePrice;
                coin.unrealizedProfit = coin.currentValue - coin.holdingCost;
                coin.unrealizedRoi = coin.holdingCost > 0 ? (coin.unrealizedProfit / coin.holdingCost) * 100 : 0;
                coin.change24h = ticker.signedChangeRate * 100;
                totalCurrentValue += coin.currentValue;
                totalUnrealizedProfit += coin.unrealizedProfit;
            } else if (ticker) {
                coin.currentPrice = ticker.tradePrice;
                coin.currentValue = 0;
                coin.unrealizedProfit = 0;
                coin.unrealizedRoi = 0;
                coin.change24h = ticker.signedChangeRate * 100;
            } else {
                coin.currentPrice = coin.currentPrice || 0;
                coin.currentValue = coin.currentValue || (coin.holdingQty * coin.avgBuyPrice);
                coin.unrealizedProfit = coin.unrealizedProfit || 0;
                coin.unrealizedRoi = coin.unrealizedRoi || 0;
                coin.change24h = 0;
            }

            if (coin.currentPrice > 0) {
                coin.gainedCoinQty = coin.realizedProfit / coin.currentPrice;
                coin.gainedCoinRoi = coin.totalBuyQty > 0 ? (coin.gainedCoinQty / coin.totalBuyQty) * 100 : 0;
            }
        });

        return { coinSummaries, totalCurrentValue, totalUnrealizedProfit };
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = UpbitAPI;
}
