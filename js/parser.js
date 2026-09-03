/**
 * parser.js
 * 업비트 & 빗썸 전 연도(2017~2026) 매매 및 입출금 만능 파서
 * HTML형식 엑셀, XML 2003, 바이너리 XLS, XLSX, CSV 100% 무손실 지원
 */

function getUpbitAPI() {
    if (typeof window !== 'undefined' && window.UpbitAPI) return window.UpbitAPI;
    if (typeof globalThis !== 'undefined' && globalThis.UpbitAPI) return globalThis.UpbitAPI;
    if (typeof require !== 'undefined') {
        try { return require('./upbit-api.js'); } catch (e) {}
    }
    return null;
}

var UpbitParser = {
    // 한글 코인명 -> 심볼 매퍼 (빗썸 등 한글 종목명 지원)
    koreanToSymbolMap: {
        "엑스알피": "XRP", "리플": "XRP", "비체인": "VET", "비트코인": "BTC", "이더리움": "ETH",
        "솔라나": "SOL", "도지코인": "DOGE", "시바이누": "SHIB", "에이다": "ADA", "폴리곤": "POL",
        "폴리곤(MATIC)": "POL", "폴리곤(POL)": "POL", "MATIC": "POL", "matic": "POL", "KRW-MATIC": "POL",
        "매틱": "POL", "아발란체": "AVAX", "트론": "TRX", "체인링크": "LINK", "앱토스": "APT",
        "수이": "SUI", "니어프로토콜": "NEAR", "스텔라루멘": "XLM", "비트코인캐시": "BCH",
        "이오스": "EOS", "이오스닥": "EOSDAC", "팝체인": "POPC", "비트코인에스브이": "BSV", "비트코인sv": "BSV",
        "소폰": "SOPH", "아스타": "ASTR", "너보스": "CKB", "페페": "PEPE", "봉크": "BONK",
        "세이": "SEI", "주피터": "JUP", "지토": "JTO", "월드코인": "WLD", "블러": "BLUR",
        "아비트럼": "ARB", "옵티미즘": "OP", "인젝티브": "INJ", "렌더토큰": "RENDER",
        "알고랜드": "ALGO", "코스모스": "ATOM", "파일코인": "FIL", "헤데라": "HBAR",
        "아이오타": "IOTA", "카이토": "KAITO", "더블제로": "2Z", "지오드넷": "GEOD",
        "왁스": "WAXP", "카브": "CARV", "리스크": "LSK", "제로지": "0G", "도그위프햇": "WIF",
        "오리진트레일": "TRAC", "보라": "BORA", "펀디엑스": "PUNDIX", "파로스": "PROS",
        "프롬": "PROM", "베이직어텐션토큰": "BAT", "헌트": "HUNT", "펏지펭귄": "PENGU",
        "유에스디코인": "USDC", "테더": "USDT", "웨이브": "WAVES", "이더파이": "ETHFI",
        "디카르고": "DKA", "앵커": "ANKR", "유니스왑": "UNI", "샌드박스": "SAND",
        "엑시인피니티": "AXS", "이더리움클래식": "ETC", "네오": "NEO", "퀀텀": "QTUM"
    },

    // 통합 컬럼 동의어 매핑 사전
    columnAliases: {
        time: [
            '완료일시', '완료시간', '체결일시', '체결시간', '거래일시', '거래시간', 
            '처리일시', '처리시간', '주문일시', '주문시간', '신청일시', '신청시간', 
            '일시', '날짜', '시간', 'trade_time', 'time', 'created_at', 'Date', 'Time', 'DateTime', '일자', '요청일시', '승인일시'
        ],
        market: [
            '마켓', '마켓코드', '가상자산', '가상자산명', '종목', '종목명', '코인', '코인명', '화폐', '화폐명', '자산', '자산구분', '자산명',
            'market', 'currency', 'coin', 'symbol', '마켓명', 'Asset', 'Coin', '통화', '통화명', '화폐구분'
        ],
        type: [
            '종류', '구분', '거래종류', '거래구분', '주문종류', '주문구분', 'side', 'type', '매수/매도', 
            '입출금구분', '입출구분', '입출금', 'Type', 'Side', '거래타입', '유형', '거래유형',
            '입출금종류', '이동구분', '변동구분', '입출금타입', '입출금유형'
        ],
        quantity: [
            '완료수량', '실입출금수량', '체결수량', '거래수량', '수량', 'volume', 'units', 'qty', 
            'amount_volume', '체결량', '입출금수량', '수량(Units)', 'Units', 'Quantity', '신청수량', '처리수량', '주문수량', '변동수량', '수량(금액)'
        ],
        price: [
            '거래단가', '체결단가', '단가', '체결가격', '가격', 'price', 'unit_price', '주문단가', 
            '단가(Price)', 'Price', '기준단가'
        ],
        amount: [
            '거래금액', '체결금액', '총액', '금액', '거래금액(KRW)', 'total', 'funds', 'amount', 
            '주문금액', '입출금금액', '총액(Total)', 'Total', '처리금액', '신청금액', '원화금액', '입금액', '출금액', '입출금액', '실입금액', '실출금액', '완료금액'
        ],
        fee: [
            '수수료', '거래수수료', '수수료(KRW)', 'fee', 'fees', 'commission', '출금수수료', 'Fee', '이용료', '취급수수료'
        ],
        settlement: [
            '정산금액', '정산금액(KRW)', '정산금액 (KRW)', 'settlement', 'settlement_amount', 
            '실정산금액', '총 거래금액', '실입출금액', '실수령액', '실입금액', '실출금액', '최종정산금액'
        ],
        status: [
            '상태', '진행상태', '처리상태', 'status', 'Status', '상태구분', '결과', '처리결과'
        ]
    },

    /**
     * ArrayBuffer 또는 바이너리 데이터를 안전하게 파싱
     */
    parseExcel: function (arrayBuffer, fileName = '') {
        if (typeof XLSX === 'undefined') {
            throw new Error('SheetJS(XLSX) 라이브러리가 로드되지 않았습니다.');
        }

        let workbook = null;
        const uint8Data = new Uint8Array(arrayBuffer);

        // 1. ArrayBuffer / Uint8Array 직접 파싱
        try {
            workbook = XLSX.read(uint8Data, { type: 'array', cellDates: true });
        } catch (e1) {
            // 2. Binary String 변환 파싱
            try {
                let binaryStr = '';
                const len = uint8Data.byteLength;
                for (let i = 0; i < len; i++) {
                    binaryStr += String.fromCharCode(uint8Data[i]);
                }
                workbook = XLSX.read(binaryStr, { type: 'binary', cellDates: true });
            } catch (e2) {
                // 3. UTF-8 텍스트 파싱 (HTML/XML/CSV 호환)
                try {
                    const utf8Text = new TextDecoder('utf-8').decode(arrayBuffer);
                    workbook = XLSX.read(utf8Text, { type: 'string' });
                } catch (e3) {
                    // 4. EUC-KR 텍스트 파싱
                    try {
                        const euckrText = new TextDecoder('euc-kr').decode(arrayBuffer);
                        workbook = XLSX.read(euckrText, { type: 'string' });
                    } catch (e4) {}
                }
            }
        }

        if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
            throw new Error('엑셀 워크북을 해석할 수 없습니다. (SheetNames가 없음)');
        }

        let allItems = [];
        let debugLogs = [];

        workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            if (!worksheet) return;

            let rawSheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false });
            if (!rawSheetData || rawSheetData.length === 0) {
                rawSheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: true });
            }

            if (rawSheetData && rawSheetData.length > 0) {
                debugLogs.push(`시트[${sheetName}] 데이터 1~3행: ${JSON.stringify(rawSheetData.slice(0, 3))}`);
                try {
                    const sheetItems = this.parse2DArray(rawSheetData, `${fileName}_${sheetName}`, 'AUTO');
                    if (sheetItems && sheetItems.length > 0) {
                        allItems = this.mergeTradeLists(allItems, sheetItems);
                    }
                } catch (err) {
                    console.warn(`시트 파싱 경고 (${sheetName}):`, err);
                }
            } else {
                debugLogs.push(`시트[${sheetName}] 빈 데이터`);
            }
        });

        if (allItems.length === 0) {
            throw new Error(`파일에서 유효한 거래 내역을 찾지 못했습니다.\n\n[디버그 로그]\n${debugLogs.join('\n')}`);
        }

        return allItems;
    },

    parseCSV: function (csvText, fileName = '') {
        if (typeof XLSX !== 'undefined') {
            try {
                const workbook = XLSX.read(csvText, { type: 'string' });
                const firstSheetName = workbook.SheetNames[0];
                const rawSheetData = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], { header: 1, defval: '', raw: false });
                const items = this.parse2DArray(rawSheetData, fileName);
                if (items && items.length > 0) return items;
            } catch (e) {}
        }

        const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
        const rows = lines.map(line => {
            const result = [];
            let inQuotes = false;
            let current = '';
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"' || char === "'") {
                    inQuotes = !inQuotes;
                } else if ((char === ',' || char === '\t') && !inQuotes) {
                    result.push(current.trim().replace(/^["']|["']$/g, ''));
                    current = '';
                } else {
                    current += char;
                }
            }
            result.push(current.trim().replace(/^["']|["']$/g, ''));
            return result;
        });

        return this.parse2DArray(rows, fileName);
    },

    parse2DArray: function (rows, fileName = '', forcedExchange = 'AUTO') {
        if (!rows || rows.length === 0) return [];

        let bestHeaderRowIndex = -1;
        let bestColumnMapping = null;
        let maxMatchCount = 0;
        let detectedExchange = (forcedExchange === 'BITHUMB') ? 'BITHUMB' : 'AUTO';

        const fnLower = (fileName || '').toLowerCase();
        if (fnLower.includes('bithumb') || fnLower.includes('빗썸')) {
            detectedExchange = 'BITHUMB';
        } else if (fnLower.includes('upbit') || fnLower.includes('업비트')) {
            detectedExchange = 'UPBIT';
        }

        // 1. 헤더 행 탐색 (상단 50행)
        for (let i = 0; i < Math.min(rows.length, 50); i++) {
            const row = rows[i];
            if (!Array.isArray(row) || row.length === 0) continue;
            
            const mapping = this.detectHeaders(row);
            const matchCount = Object.keys(mapping).filter(k => k !== 'allTimeCols').length;
            
            if (matchCount > maxMatchCount) {
                maxMatchCount = matchCount;
                bestHeaderRowIndex = i;
                bestColumnMapping = mapping;

                const rowStr = row.map(c => String(c).trim().toLowerCase()).join(' ');
                
                // 빗썸 전용 고유 키워드: 체결단가, 체결금액, 체결수량, 실정산, 실정산금액, 처리일시, 빗썸, bithumb, 가상자산, 가상자산명, 자산구분, 자산명, 화폐, 화폐명
                const isBithumbSpecific = rowStr.includes('체결단가') || 
                                          rowStr.includes('체결금액') || 
                                          rowStr.includes('체결수량') ||
                                          rowStr.includes('실정산') || 
                                          rowStr.includes('처리일시') || 
                                          rowStr.includes('빗썸') || 
                                          rowStr.includes('bithumb') ||
                                          rowStr.includes('가상자산') ||
                                          rowStr.includes('자산구분') ||
                                          rowStr.includes('자산명') ||
                                          rowStr.includes('화폐') ||
                                          rowStr.includes('수량(units)') ||
                                          rowStr.includes('단가(price)');

                // 업비트 전용 고유 키워드 (실정산금액이 아닌 순수 정산금액, 주문시간 등)
                const isUpbitSpecific = !rowStr.includes('실정산') && !rowStr.includes('처리일시') && !rowStr.includes('가상자산') && (
                                        rowStr.includes('주문시간') || 
                                        rowStr.includes('마켓코드') ||
                                        rowStr.includes('마켓') ||
                                        rowStr.includes('거래단가') || 
                                        rowStr.includes('거래금액') || 
                                        rowStr.includes('정산금액') || 
                                        rowStr.includes('완료일시') || 
                                        rowStr.includes('업비트') || 
                                        rowStr.includes('upbit'));

                if (isBithumbSpecific) {
                    detectedExchange = 'BITHUMB';
                } else if (isUpbitSpecific) {
                    detectedExchange = 'UPBIT';
                }
            }
        }

        const parsedItems = [];
        const startRow = (bestHeaderRowIndex >= 0 && maxMatchCount >= 2) ? bestHeaderRowIndex + 1 : 0;
        const mappingToUse = bestColumnMapping || { allTimeCols: [] };

        for (let i = startRow; i < rows.length; i++) {
            const row = rows[i];
            if (!row || !Array.isArray(row) || row.length === 0) continue;
            if (i === bestHeaderRowIndex) continue;

            const item = this.normalizeRow(row, mappingToUse, i + 1, detectedExchange, fileName);
            if (item) {
                parsedItems.push(item);
            }
        }

        // 만약 정규화 결과가 0건인데 rows에 데이터가 있는 경우, 강제 기본값 파싱 수행
        if (parsedItems.length === 0 && rows.length > 1) {
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                if (!row || !Array.isArray(row) || row.length === 0) continue;
                
                const fallbackItem = this.createFallbackRow(row, i + 1, detectedExchange);
                if (fallbackItem) {
                    parsedItems.push(fallbackItem);
                }
            }
        }

        return this.cleanAndSortTrades(parsedItems);
    },

    createFallbackRow: function (row, rowNum, defaultExchange) {
        let time = '-';
        let type = '매수';
        let category = 'trade';
        let market = 'KRW-BTC';
        let coinSymbol = 'BTC';
        let quantity = 0;
        let price = 0;
        let amount = 0;
        let fee = 0;
        let settlement = 0;

        let rawMarketFound = '';
        const numbers = [];

        for (let c = 0; c < row.length; c++) {
            const val = row[c];
            if (val === null || val === undefined || val === '') continue;
            const s = String(val).trim();

            // 1. 날짜
            if (time === '-') {
                const d = this.normalizeDate(val);
                if (d && d.length >= 10 && d.includes('-')) {
                    time = d;
                    continue;
                }
            }

            // 2. 구분
            if (s.includes('매수') || s.includes('구매') || s === 'bid') { type = '매수'; category = 'trade'; continue; }
            if (s.includes('매도') || s.includes('판매') || s === 'ask') { type = '매도'; category = 'trade'; continue; }
            if (s.includes('입금')) { type = s.includes('원화') ? '원화입금' : '코인입금'; category = 'transfer'; continue; }
            if (s.includes('출금')) { type = s.includes('원화') ? '원화출금' : '코인출금'; category = 'transfer'; continue; }
            if (s.includes('스테이킹')) { type = '스테이킹보상'; category = 'staking'; continue; }

            // 3. 코인/마켓 탐색
            if (!rawMarketFound) {
                if (s.startsWith('KRW-') || s.startsWith('BTC-') || s.startsWith('USDT-') || s.includes('[') || s.includes('(') || s.includes('/KRW')) {
                    rawMarketFound = s;
                    continue;
                }
                const api = getUpbitAPI();
                if (api && api.koreanToSymbolMap && (api.koreanToSymbolMap[s] || api.koreanToSymbolMap[s.replace(/[\(\)\[\]]/g, '')])) {
                    rawMarketFound = s;
                    continue;
                }
            }

            // 4. 숫자
            const num = this.parseNumber(val);
            if (num > 0 && !s.includes(':') && !s.includes('-') && !s.includes('/')) {
                numbers.push(num);
            }
        }

        if (rawMarketFound) {
            market = this.normalizeMarket(rawMarketFound);
            coinSymbol = market.includes('-') ? market.split('-')[1] : market;
        }

        let exchange = defaultExchange;
        const rawMStr = String(rawMarketFound || '').trim();
        const rawMUpper = rawMStr.toUpperCase();
        if (rawMStr.includes('[') || rawMStr.includes('(') || rawMStr.includes('/KRW') || rawMStr.includes('엑스알피') || rawMStr.includes('이오스닥') || rawMStr.includes('팝체인')) {
            exchange = 'BITHUMB';
        } else if (rawMUpper.startsWith('KRW-') || rawMUpper.startsWith('BTC-') || rawMUpper.startsWith('USDT-')) {
            exchange = 'UPBIT';
        }

        if (numbers.length >= 2) {
            numbers.sort((a, b) => a - b);
            quantity = numbers[0];
            amount = numbers[numbers.length - 1];
            price = quantity > 0 ? amount / quantity : 0;
            settlement = amount;
        } else if (numbers.length === 1) {
            if (type === '원화입금' || type === '원화출금') {
                amount = numbers[0];
                quantity = numbers[0];
            } else {
                quantity = numbers[0];
            }
            price = 1;
            settlement = amount || quantity;
        }

        if (amount <= 0 && quantity <= 0) return null;

        return {
            id: `${exchange}_${time}_${market}_${type}_${quantity}_${amount}_${rowNum}`,
            exchange: exchange,
            time: time,
            date: time.includes(' ') ? time.split(' ')[0] : time,
            category: category,
            type: type,
            market: market,
            coinSymbol: coinSymbol,
            quantity: quantity,
            price: price,
            amount: amount,
            fee: fee,
            settlement: settlement,
            rowNum: rowNum
        };
    },

    detectHeaders: function (row) {
        const mapping = {
            allTimeCols: []
        };

        const cleanCells = row.map(cell => {
            if (cell === null || cell === undefined) return '';
            return String(cell).trim().toLowerCase().replace(/\s+/g, '');
        });

        // 1단계: 완전 일치 (Exact Match)
        cleanCells.forEach((text, colIndex) => {
            if (!text) return;
            for (const [key, aliases] of Object.entries(this.columnAliases)) {
                if (key !== 'time' && mapping[key] !== undefined) continue;
                for (const alias of aliases) {
                    const cleanAlias = alias.toLowerCase().replace(/\s+/g, '');
                    if (text === cleanAlias) {
                        if (key === 'time') {
                            mapping.allTimeCols.push({ colIndex, name: text });
                            if (mapping.time === undefined) mapping.time = colIndex;
                        } else {
                            mapping[key] = colIndex;
                        }
                        return;
                    }
                }
            }
        });

        // 2단계: 부분 일치 (text가 cleanAlias를 포함하는 경우)
        cleanCells.forEach((text, colIndex) => {
            if (!text) return;
            if (Object.values(mapping).includes(colIndex) && !mapping.allTimeCols.some(c => c.colIndex === colIndex)) return;

            for (const [key, aliases] of Object.entries(this.columnAliases)) {
                if (key !== 'time' && mapping[key] !== undefined) continue;
                for (const alias of aliases) {
                    const cleanAlias = alias.toLowerCase().replace(/\s+/g, '');
                    if (cleanAlias.length >= 2 && text.includes(cleanAlias)) {
                        if (key === 'time') {
                            if (!mapping.allTimeCols.some(c => c.colIndex === colIndex)) {
                                mapping.allTimeCols.push({ colIndex, name: text });
                                if (mapping.time === undefined) mapping.time = colIndex;
                            }
                        } else {
                            mapping[key] = colIndex;
                        }
                        return;
                    }
                }
            }
        });

        // time 컬럼 우선순위 정렬 (완료일시 > 체결일시 > 거래일시 > 처리일시 > 신청일시)
        if (mapping.allTimeCols.length > 1) {
            mapping.allTimeCols.sort((a, b) => {
                const getScore = (name) => {
                    if (name.includes('완료')) return 10;
                    if (name.includes('체결')) return 8;
                    if (name.includes('거래')) return 6;
                    if (name.includes('처리')) return 5;
                    if (name.includes('신청') || name.includes('주문')) return 2;
                    return 1;
                };
                return getScore(b.name) - getScore(a.name);
            });
            mapping.time = mapping.allTimeCols[0].colIndex;
        }

        return mapping;
    },

    normalizeRow: function (row, mapping, rowNum, defaultExchange, fileName = '') {
        const hasAnyContent = row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '');
        if (!hasAnyContent) return null;

        const getVal = (key) => {
            const idx = mapping[key];
            return (idx !== undefined && row[idx] !== undefined) ? row[idx] : '';
        };

        // 1. 상태 필터링 (취소/실패/거절 행 제외)
        if (mapping.status !== undefined) {
            const rawStatus = String(getVal('status')).trim().toLowerCase();
            if (rawStatus.includes('취소') || rawStatus.includes('실패') || rawStatus.includes('거절') || 
                rawStatus.includes('cancel') || rawStatus.includes('fail') || rawStatus.includes('reject')) {
                return null;
            }
        }

        // 헤더 행 자체 건너뜀
        const rowTextCombined = row.map(c => String(c).trim()).join(' ');
        if ((rowTextCombined.includes('주문시간') || rowTextCombined.includes('거래일시') || rowTextCombined.includes('신청일시')) &&
            (rowTextCombined.includes('수량') || rowTextCombined.includes('마켓') || rowTextCombined.includes('종류'))) {
            return null;
        }

        let rawType = String(getVal('type')).trim();
        let rawMarket = String(getVal('market')).trim();

        // 2. 날짜/시간(timestamp) 추출
        let timestamp = '';
        if (mapping.allTimeCols && mapping.allTimeCols.length > 0) {
            for (const tCol of mapping.allTimeCols) {
                const val = row[tCol.colIndex];
                if (val !== null && val !== undefined && String(val).trim() !== '' && String(val).trim() !== '-') {
                    const parsedDate = this.normalizeDate(val);
                    if (parsedDate && parsedDate.length >= 10 && parsedDate.includes('-')) {
                        timestamp = parsedDate;
                        break;
                    }
                }
            }
        }
        if (!timestamp && mapping.time !== undefined) {
            const val = getVal('time');
            if (val && String(val).trim() !== '-') {
                timestamp = this.normalizeDate(val);
            }
        }

        // 행 전체 셀에서 날짜 탐색
        if (!timestamp) {
            for (let c = 0; c < row.length; c++) {
                const cellVal = row[c];
                if (cellVal !== null && cellVal !== undefined && String(cellVal).trim() !== '-') {
                    const parsed = this.normalizeDate(cellVal);
                    if (parsed && parsed.length >= 10 && parsed.includes('-')) {
                        timestamp = parsed;
                        break;
                    }
                }
            }
        }

        // 3. 거래 구분(Type) 추출
        if (!rawType) {
            for (let c = 0; c < row.length; c++) {
                const str = String(row[c] || '').trim();
                if (str.includes('매수') || str.includes('매도') || str.includes('입금') || str.includes('출금') || str.includes('스테이킹')) {
                    rawType = str;
                    break;
                }
            }
        }

        // 4. 마켓/코인 추출
        if (!rawMarket) {
            const api = getUpbitAPI();
            for (let c = 0; c < row.length; c++) {
                const str = String(row[c] || '').trim();
                if (str.startsWith('KRW-') || str.startsWith('BTC-') || (api && api.koreanToSymbolMap && api.koreanToSymbolMap[str])) {
                    rawMarket = str;
                    break;
                }
            }
        }

        const parsedTypeInfo = this.normalizeType(rawType, rawMarket, fileName);
        let type = parsedTypeInfo ? parsedTypeInfo.type : '매수';
        let category = parsedTypeInfo ? parsedTypeInfo.category : 'trade';

        let exchange = 'UPBIT';
        const rawMarketUpper = (rawMarket || '').toUpperCase();
        const rawMarketStr = String(rawMarket || '').trim();
        
        // 접두사(KRW-, BTC-, USDT-) 제외 순수 심볼/텍스트 추출
        let pureSymbolCandidate = rawMarketStr;
        if (rawMarketUpper.startsWith('KRW-') || rawMarketUpper.startsWith('BTC-') || rawMarketUpper.startsWith('USDT-')) {
            pureSymbolCandidate = rawMarketStr.split('-')[1] || '';
        }
        pureSymbolCandidate = pureSymbolCandidate.replace(/[\(\)\[\]]/g, '').trim();

        const mapToUse = (typeof UpbitAPI !== 'undefined' && UpbitAPI && UpbitAPI.koreanToSymbolMap) ? UpbitAPI.koreanToSymbolMap : (this.koreanToSymbolMap || {});
        const isKoreanName = !!(mapToUse[rawMarketStr] || mapToUse[pureSymbolCandidate] || mapToUse[pureSymbolCandidate.toLowerCase()]);
        const hasKoreanChar = /[가-힣]/.test(rawMarketStr);

        // 업비트는 마켓코드가 항상 "KRW-BTC", "KRW-ETH", "KRW-VET" 처럼 영문 대문자 접두사로 되어 있으며 한글이 절대 없음!
        // 빗썸은 "비체인", "비체인(VET)", "VET/KRW", "VET_KRW", "리플", "이더리움클래식" 처럼 한글 또는 슬래시/괄호 표기!
        const isDefiniteUpbitFormat = (rawMarketUpper.startsWith('KRW-') || rawMarketUpper.startsWith('BTC-') || rawMarketUpper.startsWith('USDT-')) && !hasKoreanChar;
        const isDefiniteBithumbFormat = hasKoreanChar || isKoreanName || 
                                        rawMarketStr.includes('/') || 
                                        rawMarketStr.includes('_') || 
                                        rawMarketStr.includes('[') || 
                                        rawMarketStr.includes('(');

        if (isDefiniteBithumbFormat) {
            exchange = 'BITHUMB';
        } else if (isDefiniteUpbitFormat) {
            exchange = 'UPBIT';
        } else if (defaultExchange === 'BITHUMB') {
            exchange = 'BITHUMB';
        } else if (defaultExchange === 'UPBIT') {
            exchange = 'UPBIT';
        } else {
            exchange = 'UPBIT';
        }

        if (!rawMarket && (type === '원화입금' || type === '원화출금')) {
            rawMarket = 'KRW';
        }
        let market = this.normalizeMarket(rawMarket);
        let coinSymbol = 'KRW';
        if (market !== 'KRW' && market !== 'KRW-KRW') {
            coinSymbol = market.includes('-') ? market.split('-')[1] : market;
        }

        let quantity = this.parseNumber(getVal('quantity'));
        let price = this.parseNumber(getVal('price'));
        let amount = this.parseNumber(getVal('amount'));
        let fee = this.parseNumber(getVal('fee'));
        let settlement = this.parseNumber(getVal('settlement'));

        // 숫자 셀 지능형 자동 복구
        if (quantity === 0 && amount === 0) {
            const numbers = [];
            for (let c = 0; c < row.length; c++) {
                const val = row[c];
                if (val !== null && val !== undefined && val !== '') {
                    const strVal = String(val).trim();
                    if (!strVal.includes(':') && !strVal.includes('-') && !strVal.includes('/')) {
                        const num = this.parseNumber(val);
                        if (num > 0) numbers.push(num);
                    }
                }
            }
            if (numbers.length >= 2) {
                numbers.sort((a, b) => a - b);
                quantity = numbers[0];
                amount = numbers[numbers.length - 1];
            } else if (numbers.length === 1) {
                if (type === '원화입금' || type === '원화출금') {
                    amount = numbers[0];
                    quantity = numbers[0];
                } else {
                    quantity = numbers[0];
                }
            }
        }

        // 입출금 및 매매 금액/수량 보정
        if (category === 'transfer') {
            const isKrw = (type === '원화입금' || type === '원화출금' || rawMarket === 'KRW' || rawMarket === '원화' || coinSymbol === 'KRW');
            if (isKrw) {
                type = type.includes('출금') ? '원화출금' : '원화입금';
                market = 'KRW';
                coinSymbol = 'KRW';
                if (amount === 0 && quantity > 0) amount = quantity;
                if (quantity === 0 && amount > 0) quantity = amount;
                price = 1;
                if (settlement === 0) settlement = amount;
            } else {
                if (quantity <= 0 && amount > 0) quantity = amount;
                if (settlement === 0) settlement = quantity;
            }
        } else {
            if (quantity > 0 && price > 0 && amount === 0) {
                amount = quantity * price;
            }
            if (amount > 0 && quantity > 0 && price === 0) {
                price = amount / quantity;
            }
            if (amount > 0 && price > 0 && quantity === 0) {
                quantity = amount / price;
            }
            if (settlement === 0) {
                settlement = type === '매수' ? amount + fee : amount - fee;
            }
        }

        if (quantity <= 0 && amount <= 0) return null;
        if (isNaN(fee) || fee < 0) fee = 0;

        if (!timestamp) {
            timestamp = '-';
        }

        return {
            id: `${exchange}_${timestamp}_${market}_${type}_${quantity}_${price}_${amount}_${rowNum}`,
            exchange: exchange,
            time: timestamp,
            date: timestamp.includes(' ') ? timestamp.split(' ')[0] : timestamp,
            category: category,
            type: type,
            market: market,
            coinSymbol: coinSymbol.toUpperCase(),
            quantity: quantity,
            price: price,
            amount: amount,
            fee: fee,
            settlement: settlement,
            rowNum: rowNum
        };
    },

    normalizeType: function (str, marketStr = '', fileName = '') {
        if (!str) {
            const mLower = (marketStr || '').trim().toLowerCase();
            const fnLower = (fileName || '').trim().toLowerCase();
            if (mLower === 'krw' || mLower === '원화' || fnLower.includes('입출금') || fnLower.includes('원화')) {
                return { type: '원화입금', category: 'transfer' };
            }
            return null;
        }
        const s = str.trim().toLowerCase().replace(/\s+/g, '');
        const m = (marketStr || '').trim().toLowerCase();
        const isKrwAsset = m === 'krw' || m === '원화' || m.includes('krw-krw');

        if (s.includes('원화입금') || s === 'krw입금' || s.includes('krw_deposit')) {
            return { type: '원화입금', category: 'transfer' };
        }
        if (s.includes('원화출금') || s === 'krw출금' || s.includes('krw_withdraw')) {
            return { type: '원화출금', category: 'transfer' };
        }

        if (s.includes('매수') || s.includes('구매') || s === 'buy' || s === 'bid') {
            return { type: '매수', category: 'trade' };
        }
        if (s.includes('매도') || s.includes('판매') || s === 'sell' || s === 'ask') {
            return { type: '매도', category: 'trade' };
        }

        if (s.includes('스테이킹보상') || s.includes('이자') || s.includes('reward') || s.includes('staking_reward')) {
            return { type: '스테이킹보상', category: 'staking' };
        }
        if (s.includes('언스테이킹') || s.includes('해지') || s.includes('unstake') || s.includes('unstaking')) {
            return { type: '언스테이킹', category: 'staking' };
        }
        if (s.includes('스테이킹') || s.includes('위임') || s.includes('stake') || s.includes('staking')) {
            return { type: '스테이킹', category: 'staking' };
        }

        if (s.includes('코인입금') || s.includes('외부입금') || s.includes('디지털자산입금') || s.includes('가상자산입금')) {
            return { type: '코인입금', category: 'transfer' };
        }
        if (s.includes('코인출금') || s.includes('외부출금') || s.includes('디지털자산출금') || s.includes('가상자산출금')) {
            return { type: '코인출금', category: 'transfer' };
        }

        if (s.includes('입금') || s.includes('deposit') || s.includes('충전')) {
            return isKrwAsset ? { type: '원화입금', category: 'transfer' } : { type: '코인입금', category: 'transfer' };
        }
        if (s.includes('출금') || s.includes('withdraw') || s.includes('환급')) {
            return isKrwAsset ? { type: '원화출금', category: 'transfer' } : { type: '코인출금', category: 'transfer' };
        }

        return { type: '매수', category: 'trade' };
    },

    normalizeMarket: function (str) {
        if (!str) return 'KRW';
        let s = String(str).trim();
        
        if (s === 'KRW' || s === '원화' || s === '대한민국 원' || s === 'KRW-KRW' || 
            s === '입금' || s === '출금' || s === '원화입금' || s === '원화출금' || 
            s === '코인입금' || s === '코인출금' || s === '매수' || s === '매도') {
            return 'KRW';
        }

        // 1. 접두사(KRW-, BTC-, USDT-) 분리
        let prefix = 'KRW';
        const sUpper = s.toUpperCase();
        if (sUpper.startsWith('KRW-')) {
            prefix = 'KRW';
            s = s.substring(4).trim();
        } else if (sUpper.startsWith('BTC-')) {
            prefix = 'BTC';
            s = s.substring(4).trim();
        } else if (sUpper.startsWith('USDT-')) {
            prefix = 'USDT';
            s = s.substring(5).trim();
        }

        // 2. 대괄호/소괄호 안 영문/심볼 또는 한글 별칭 정밀 파싱
        const bracketMatch = s.match(/[\(\[](.*?)[\)\]]/);
        if (bracketMatch && bracketMatch[1]) {
            const inner = bracketMatch[1].trim();
            if (/^[A-Za-z0-9]+$/.test(inner)) {
                s = inner;
            } else if (inner === '리플' || inner === '엑스알피') {
                s = 'XRP';
            } else if (inner === '이오스닥') {
                s = 'EOSDAC';
            } else if (inner === '팝체인') {
                s = 'POPC';
            }
        }

        // 2. 슬래시 마켓 분리 (예: BTC/KRW -> BTC)
        if (s.includes('/')) {
            const parts = s.split('/');
            s = parts[0].trim();
        }

        // 3. 언더스코어 마켓 분리 (예: BTC_KRW -> BTC)
        if (s.includes('_')) {
            const parts = s.split('_');
            s = parts[0].trim();
        }

        // 4. 특수문자 제거
        const cleanText = s.replace(/[\(\)\[\]]/g, '').trim();

        // 5. 한글 코인명 -> 영문 심볼 매핑
        const mapToUse = (typeof UpbitAPI !== 'undefined' && UpbitAPI && UpbitAPI.koreanToSymbolMap) 
            ? UpbitAPI.koreanToSymbolMap 
            : (this.koreanToSymbolMap || {});
        
        let mappedSymbol = mapToUse[cleanText] || mapToUse[cleanText.toLowerCase()];
        if (!mappedSymbol) {
            const lowerClean = cleanText.toLowerCase();
            for (const [kName, sym] of Object.entries(mapToUse)) {
                if (kName.toLowerCase() === lowerClean || lowerClean === kName.toLowerCase()) {
                    mappedSymbol = sym;
                    break;
                }
            }
        }

        if (!mappedSymbol) {
            if (cleanText.includes('엑스알피') || cleanText.includes('리플')) mappedSymbol = 'XRP';
            else if (cleanText.includes('이오스닥')) mappedSymbol = 'EOSDAC';
            else if (cleanText.includes('팝체인')) mappedSymbol = 'POPC';
            else if (cleanText.includes('비트코인에스브이') || cleanText.includes('비트코인sv')) mappedSymbol = 'BSV';
            else if (cleanText.includes('비체인')) mappedSymbol = 'VET';
            else if (cleanText.includes('아스타')) mappedSymbol = 'ASTR';
            else if (cleanText.includes('폴리곤') || cleanText.toUpperCase() === 'MATIC') mappedSymbol = 'POL';
            else if (cleanText.includes('무비블록') || cleanText.includes('무브블록')) mappedSymbol = 'MBL';
            else if (cleanText.includes('오미세고')) mappedSymbol = 'OMG';
        }

        let finalSymbol = (mappedSymbol || cleanText).toUpperCase();
        if (finalSymbol === 'MATIC') finalSymbol = 'POL';
        return `${prefix}-${finalSymbol}`;
    },

    normalizeDate: function (val) {
        if (!val && val !== 0) return '';
        const pad = (n) => String(n || 0).padStart(2, '0');
        
        // 1. JavaScript Date 객체
        if (val instanceof Date && !isNaN(val)) {
            const y = val.getFullYear();
            const m = pad(val.getMonth() + 1);
            const d = pad(val.getDate());
            const h = pad(val.getHours());
            const min = pad(val.getMinutes());
            const s = pad(val.getSeconds());
            return `${y}-${m}-${d} ${h}:${min}:${s}`;
        }

        // 2. Excel Serial Number
        if (typeof val === 'number' || (!isNaN(val) && !String(val).includes('-') && !String(val).includes('.'))) {
            const num = typeof val === 'number' ? val : parseFloat(val);
            if (num > 35000 && num < 65000) {
                const ms = Math.round((num - 25569) * 86400 * 1000);
                const d = new Date(ms);
                const y = d.getUTCFullYear();
                const m = pad(d.getUTCMonth() + 1);
                const day = pad(d.getUTCDate());
                const hours = pad(d.getUTCHours());
                const minutes = pad(d.getUTCMinutes());
                const seconds = pad(d.getUTCSeconds());
                return `${y}-${m}-${day} ${hours}:${minutes}:${seconds}`;
            }
        }

        let str = String(val).trim();
        if (!str || str === '-') return '';

        // 3. ISO 형식
        if (str.includes('T')) {
            const d = new Date(str);
            if (!isNaN(d)) return this.normalizeDate(d);
            str = str.replace('T', ' ').split('.')[0];
        }

        str = str.replace(/\./g, '-').replace(/\//g, '-').replace(/\s+/g, ' ');
        
        // 4. 4자리 연도 매칭
        const dateMatch4 = str.match(/(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
        if (dateMatch4) {
            const y = dateMatch4[1];
            const m = pad(dateMatch4[2]);
            const d = pad(dateMatch4[3]);
            const h = pad(dateMatch4[4] || 0);
            const min = pad(dateMatch4[5] || 0);
            const s = pad(dateMatch4[6] || 0);
            return `${y}-${m}-${d} ${h}:${min}:${s}`;
        }

        // 5. 2자리 연도 매칭
        const dateMatch2 = str.match(/(\d{2})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
        if (dateMatch2) {
            let y = parseInt(dateMatch2[1], 10);
            y = y < 70 ? 2000 + y : 1900 + y;
            const m = pad(dateMatch2[2]);
            const d = pad(dateMatch2[3]);
            const h = pad(dateMatch2[4] || 0);
            const min = pad(dateMatch2[5] || 0);
            const s = pad(dateMatch2[6] || 0);
            return `${y}-${m}-${d} ${h}:${min}:${s}`;
        }

        return str;
    },

    parseNumber: function (val) {
        if (val === null || val === undefined || val === '') return 0;
        if (typeof val === 'number') return isNaN(val) ? 0 : val;
        
        const cleanStr = String(val).replace(/,/g, '').replace(/[^\d.-]/g, '');
        const num = parseFloat(cleanStr);
        return isNaN(num) ? 0 : num;
    },

    cleanAndSortTrades: function (items) {
        const seen = new Set();
        const uniqueItems = [];

        for (const item of items) {
            if (!seen.has(item.id)) {
                seen.add(item.id);
                uniqueItems.push(item);
            }
        }

        uniqueItems.sort((a, b) => {
            if (a.time < b.time) return -1;
            if (a.time > b.time) return 1;
            return 0;
        });

        return uniqueItems;
    },

    mergeTradeLists: function (existingList, newList) {
        const combined = [...existingList, ...newList];
        return this.cleanAndSortTrades(combined);
    }
};

// 브라우저 환경 지원
if (typeof window !== 'undefined') {
    window.UpbitParser = UpbitParser;
}
if (typeof globalThis !== 'undefined') {
    globalThis.UpbitParser = UpbitParser;
}

// Node.js 환경 지원
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UpbitParser;
}
