/**
 * exporter.js
 * 분석 결과 엑셀(.xlsx) / CSV 내보내기 및 전문 인쇄 & PDF 보고서 모듈
 * (업비트 & 빗썸 매매 손익, 입출금, 세무 및 포트폴리오 정밀 분석)
 */

const Exporter = {
    formatKRW: function (num) {
        if (num === undefined || num === null || isNaN(num)) return '0원';
        return Math.round(num).toLocaleString('ko-KR') + '원';
    },

    formatNumber: function (num, digits = 2) {
        if (num === undefined || num === null || isNaN(num)) return '0';
        return Number(num).toLocaleString('ko-KR', { maximumFractionDigits: digits });
    },

    exportExcelReport: function (reportData) {
        if (!reportData) {
            alert('내보낼 분석 데이터가 없습니다.');
            return;
        }
        if (typeof XLSX === 'undefined') {
            alert('SheetJS(XLSX) 라이브러리를 불러올 수 없습니다.');
            return;
        }

        const wb = XLSX.utils.book_new();

        // 1. 코인별 손익 요약 시트
        const coinRows = [
            ['업비트 & 빗썸 코인별 손익, 잔고 및 포트폴리오 분석 보고서'],
            [
                `생성일시: ${new Date().toLocaleString('ko-KR')}`, 
                `계산방식: ${reportData.method === 'fifo' ? '선입선출법 (FIFO)' : '이동평균법 (Moving Avg)'}`,
                `거래소 필터: ${reportData.exchange === 'ALL' ? '전체 통합 (업비트 + 빗썸)' : reportData.exchange}`
            ],
            [],
            [
                '거래소', '코인명', '마켓코드', '총 매수금액(원)', '총 매도금액(원)', '총 수수료(원)', 
                '실현손익(원)', '실현수익률(%)', '늘린 코인수량(환산)', '수량증가율(%)', 
                '보유 잔여수량', '매수 평단가(원)', '보유 원금(원)', 
                '실시간 현재가(원)', '평가금액(원)', '평가손익(원)', '평가수익률(%)', 
                '매수횟수', '매도횟수', '익절횟수', '손절횟수', '승률(%)'
            ]
        ];

        const coins = reportData.coinSummaries || [];
        coins.forEach(c => {
            const exchangeName = c.exchange || 'UPBIT';
            const kName = c.koreanName || (typeof UpbitAPI !== 'undefined' ? UpbitAPI.getKoreanName(c.market) : c.coinSymbol);

            coinRows.push([
                exchangeName,
                kName,
                c.market,
                Math.round(c.totalBuyAmount),
                Math.round(c.totalSellAmount),
                Math.round(c.totalFee),
                Math.round(c.realizedProfit),
                Number(c.realizedRoi.toFixed(2)),
                Number((c.gainedCoinQty || 0).toFixed(6)),
                Number((c.gainedCoinRoi || 0).toFixed(2)),
                c.holdingQty,
                Math.round(c.avgBuyPrice),
                Math.round(c.holdingCost),
                Math.round(c.currentPrice || 0),
                Math.round(c.currentValue || 0),
                Math.round(c.unrealizedProfit || 0),
                Number((c.unrealizedRoi || 0).toFixed(2)),
                c.totalBuyCount,
                c.totalSellCount,
                c.winTrades,
                c.lossTrades,
                Number(c.winRate.toFixed(1))
            ]);
        });

        const s = reportData.summary || {};
        coinRows.push([]);
        coinRows.push([
            '【 전체 합계 】',
            '-',
            '-',
            Math.round(s.totalCumulativeBuyAmount || s.totalInvested || 0),
            Math.round(s.totalCumulativeSellAmount || s.totalSold || 0),
            Math.round(s.totalFees || 0),
            Math.round(s.totalRealizedProfit || 0),
            Number((s.totalRealizedRoi || 0).toFixed(2)),
            '-',
            '-',
            '-',
            '-',
            Math.round(s.currentPortfolioCost || 0),
            '-',
            Math.round(reportData.totalCurrentValue || 0),
            Math.round(reportData.totalUnrealizedProfit || 0),
            '-',
            s.totalBuyTrades || 0,
            s.totalSellTrades || 0,
            s.totalWinTrades || 0,
            s.totalLossTrades || 0,
            Number((s.totalWinRate || 0).toFixed(1))
        ]);

        const wsCoin = XLSX.utils.aoa_to_sheet(coinRows);
        XLSX.utils.book_append_sheet(wb, wsCoin, '코인별_손익요약');

        // 2. 월별 손익 통계 시트
        const monthRows = [
            ['월별 거래 및 손익 통계'],
            [],
            ['년월', '실현손익(원)', '매수대금(원)', '매도대금(원)', '총 거래대금(원)', '총 수수료(원)', '거래횟수', '익절건수', '손절건수', '승률(%)']
        ];

        (reportData.monthlyStats || []).forEach(m => {
            monthRows.push([
                m.period,
                Math.round(m.realizedProfit),
                Math.round(m.buyVolume),
                Math.round(m.sellVolume),
                Math.round(m.totalVolume),
                Math.round(m.totalFees),
                m.tradesCount,
                m.winCount,
                m.lossCount,
                Number((m.winRate || 0).toFixed(1))
            ]);
        });

        const wsMonth = XLSX.utils.aoa_to_sheet(monthRows);
        XLSX.utils.book_append_sheet(wb, wsMonth, '월별_통계');

        // 3. 입출금 내역 시트
        if (reportData.transfers && reportData.transfers.items && reportData.transfers.items.length > 0) {
            const transferRows = [
                ['원화 및 가상자산 입출금 내역'],
                [
                    `총 원화 입금: ${Math.round(reportData.transfers.totalKrwDeposit || 0).toLocaleString()}원`,
                    `총 원화 출금: ${Math.round(reportData.transfers.totalKrwWithdraw || 0).toLocaleString()}원`,
                    `순 투입 원금: ${Math.round(reportData.transfers.netKrwDeposit || 0).toLocaleString()}원`
                ],
                [],
                ['거래소', '일시', '구분', '자산/마켓', '코인심볼', '수량/금액', '단가', '수수료', '정산금액']
            ];

            reportData.transfers.items.forEach(t => {
                transferRows.push([
                    t.exchange || 'UPBIT',
                    t.time,
                    t.type,
                    t.market,
                    t.coinSymbol,
                    t.quantity,
                    t.price,
                    t.fee,
                    t.settlement
                ]);
            });

            const wsTransfers = XLSX.utils.aoa_to_sheet(transferRows);
            XLSX.utils.book_append_sheet(wb, wsTransfers, '입출금_내역');
        }

        // 4. 상세 거래 내역 시트
        const tradeRows = [
            [
                '거래소', '체결일시', '마켓', '코인', '거래종류', '거래수량', 
                '거래단가(원)', '거래금액(원)', '수수료(원)', '정산금액(원)', 
                '매칭원가(원)', '실현손익(원)', '수익률(%)'
            ]
        ];

        (reportData.trades || []).forEach(t => {
            tradeRows.push([
                t.exchange || 'UPBIT',
                t.time,
                t.market,
                t.coinSymbol,
                t.type,
                t.quantity,
                Math.round(t.price),
                Math.round(t.amount),
                Math.round(t.fee),
                Math.round(t.settlement),
                t.type === '매도' ? Math.round(t.costBasis || 0) : '-',
                t.type === '매도' ? Math.round(t.realizedProfit || 0) : '-',
                t.type === '매도' ? Number((t.realizedRoi || 0).toFixed(2)) : '-'
            ]);
        });

        const wsTrades = XLSX.utils.aoa_to_sheet(tradeRows);
        XLSX.utils.book_append_sheet(wb, wsTrades, '상세_매매내역');

        const now = new Date();
        const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
        const fileName = `가상자산_손익및입출금_종합보고서_${dateStr}.xlsx`;
        XLSX.writeFile(wb, fileName);
    },

    exportCSV: function (trades) {
        if (!trades || trades.length === 0) {
            alert('내보낼 거래 내역이 없습니다.');
            return;
        }

        const headers = ['거래소', '체결일시', '마켓', '코인', '거래종류', '거래수량', '거래단가', '거래금액', '수수료', '정산금액', '실현손익', '수익률(%)'];
        const csvLines = [headers.join(',')];

        trades.forEach(t => {
            const profit = t.type === '매도' ? Math.round(t.realizedProfit || 0) : '';
            const roi = t.type === '매도' ? Number(t.realizedRoi || 0).toFixed(2) : '';

            const row = [
                `"${t.exchange || 'UPBIT'}"`,
                `"${t.time || ''}"`,
                `"${t.market || ''}"`,
                `"${t.coinSymbol || ''}"`,
                `"${t.type || ''}"`,
                t.quantity || 0,
                t.price || 0,
                t.amount || 0,
                t.fee || 0,
                t.settlement || 0,
                profit,
                roi
            ];
            csvLines.push(row.join(','));
        });

        const csvContent = '\uFEFF' + csvLines.join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `가상자산_전체거래내역_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    /**
     * 고품질 분석 보고서 인쇄 및 PDF 출력
     */
    printReport: function (reportData) {
        if (!reportData || !reportData.summary) {
            alert('인쇄할 분석 데이터가 없습니다. 상단에서 엑셀 파일을 먼저 업로드해 주세요.');
            return;
        }

        const s = reportData.summary;
        const coins = reportData.coinSummaries || [];
        const monthly = reportData.monthlyStats || [];
        const transfers = reportData.transfers || { totalKrwDeposit: 0, totalKrwWithdraw: 0, netKrwDeposit: 0 };
        const u = (function() { try { return JSON.parse(localStorage.getItem('coinhub_user')); } catch(e){ return null; } })();
        const userName = u && u.username ? u.username : '회원';
        const now = new Date();
        const dateStr = now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        const calcMethodName = reportData.method === 'fifo' ? '선입선출법 (FIFO)' : '이동평균법 (Moving Average)';

        // 거래소별 통계 집계
        const upbitCoins = coins.filter(c => c.exchange === 'UPBIT');
        const bithumbCoins = coins.filter(c => c.exchange === 'BITHUMB');

        const upbitRealized = upbitCoins.reduce((sum, c) => sum + (c.realizedProfit || 0), 0);
        const bithumbRealized = bithumbCoins.reduce((sum, c) => sum + (c.realizedProfit || 0), 0);

        const upbitBuyVol = upbitCoins.reduce((sum, c) => sum + (c.totalBuyAmount || 0), 0);
        const bithumbBuyVol = bithumbCoins.reduce((sum, c) => sum + (c.totalBuyAmount || 0), 0);

        const upbitFees = upbitCoins.reduce((sum, c) => sum + (c.totalFee || 0), 0);
        const bithumbFees = bithumbCoins.reduce((sum, c) => sum + (c.totalFee || 0), 0);

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('팝업 차단이 설정되어 있어 인쇄 창을 열 수 없습니다. 팝업 차단을 해제해 주세요.');
            return;
        }

        const htmlContent = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>CoinHub 가상자산 포트폴리오 및 손익 분석 보고서 - ${userName}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 12mm 12mm 12mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Pretendard", "Noto Sans KR", "Segoe UI", Roboto, sans-serif;
    }
    body {
      background: #ffffff;
      color: #1e293b;
      font-size: 11px;
      line-height: 1.5;
      padding: 10px;
    }
    .report-header {
      border-bottom: 2px solid #0284c7;
      padding-bottom: 12px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .report-title-group h1 {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .report-title-group p {
      font-size: 11px;
      color: #64748b;
      margin-top: 3px;
    }
    .report-meta-table {
      font-size: 10px;
      color: #475569;
      text-align: right;
    }
    .report-meta-table td {
      padding: 1px 4px;
    }
    .section-title {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      margin: 16px 0 8px 0;
      display: flex;
      align-items: center;
      gap: 6px;
      border-left: 3px solid #0284c7;
      padding-left: 8px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 14px;
    }
    .kpi-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px;
    }
    .kpi-label {
      font-size: 10px;
      color: #64748b;
      font-weight: 600;
      margin-bottom: 2px;
    }
    .kpi-value {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
    }
    .kpi-sub {
      font-size: 10px;
      font-weight: 600;
      margin-top: 2px;
    }
    .profit-red { color: #dc2626; }
    .profit-blue { color: #2563eb; }
    .text-muted { color: #64748b; }
    
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      margin-bottom: 12px;
    }
    table.data-table th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      text-align: left;
      padding: 6px 8px;
      border: 1px solid #cbd5e1;
      white-space: nowrap;
    }
    table.data-table td {
      padding: 5px 8px;
      border: 1px solid #e2e8f0;
      color: #1e293b;
    }
    table.data-table tr:nth-child(even) td {
      background: #f8fafc;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-bold { font-weight: 700; }
    
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 700;
    }
    .badge-upbit { background: #dbeafe; color: #1e40af; }
    .badge-bithumb { background: #ffedd5; color: #9a3412; }
    
    .exchange-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 14px;
    }
    .exchange-box {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 10px;
      background: #ffffff;
    }
    .exchange-box-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 700;
      margin-bottom: 6px;
      border-bottom: 1px dashed #e2e8f0;
      padding-bottom: 4px;
    }

    .footer-note {
      margin-top: 24px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      font-size: 9px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
    }
    .no-print-bar {
      background: #0f172a;
      color: #ffffff;
      padding: 10px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-radius: 8px;
      margin-bottom: 16px;
    }
    .btn-print-action {
      background: #0284c7;
      color: #ffffff;
      border: none;
      padding: 6px 16px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 12px;
      cursor: pointer;
    }
    @media print {
      .no-print-bar { display: none !important; }
      body { padding: 0; }
    }
  </style>
</head>
<body>

  <div class="no-print-bar">
    <div>
      <strong>CoinHub 금융 & 세무 분석 보고서 미리보기</strong>
      <span style="font-size: 11px; opacity: 0.8; margin-left: 8px;">(PDF로 저장하려면 대상 프린터를 'PDF로 저장'으로 선택하세요)</span>
    </div>
    <button class="btn-print-action" onclick="window.print()">🖨️ 인쇄 / PDF 저장하기</button>
  </div>

  <div class="report-header">
    <div class="report-title-group">
      <h1>가상자산 종합 거래내역 & 손익 분석 보고서</h1>
      <p>CoinHub Crypto Portfolio Financial & Tax Statement</p>
    </div>
    <table class="report-meta-table">
      <tr><td><strong>투자자 계정:</strong></td><td>${userName}</td></tr>
      <tr><td><strong>발행일시:</strong></td><td>${dateStr}</td></tr>
      <tr><td><strong>산출방식:</strong></td><td>${calcMethodName}</td></tr>
      <tr><td><strong>분석대상:</strong></td><td>업비트 & 빗썸 가상자산 거래내역</td></tr>
    </table>
  </div>

  <!-- 1. 핵심 성과 지표 (KPI) -->
  <div class="section-title">1. 핵심 손익 및 포트폴리오 성과 요약</div>
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">누적 실현손익 (순이익)</div>
      <div class="kpi-value ${s.totalRealizedProfit >= 0 ? 'profit-red' : 'profit-blue'}">${s.totalRealizedProfit >= 0 ? '+' : ''}${Math.round(s.totalRealizedProfit || 0).toLocaleString()}원</div>
      <div class="kpi-sub ${s.totalRealizedRoi >= 0 ? 'profit-red' : 'profit-blue'}">수익률 ${(s.totalRealizedRoi || 0) >= 0 ? '+' : ''}${Number(s.totalRealizedRoi || 0).toFixed(2)}%</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">실시간 평가손익 (미실현)</div>
      <div class="kpi-value ${(reportData.totalUnrealizedProfit || 0) >= 0 ? 'profit-red' : 'profit-blue'}">${(reportData.totalUnrealizedProfit || 0) >= 0 ? '+' : ''}${Math.round(reportData.totalUnrealizedProfit || 0).toLocaleString()}원</div>
      <div class="kpi-sub text-muted">보유평가액: ${Math.round(reportData.totalCurrentValue || 0).toLocaleString()}원</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">현재 보유 코인 매수원금</div>
      <div class="kpi-value">${Math.round(s.currentPortfolioCost || 0).toLocaleString()}원</div>
      <div class="kpi-sub text-muted">보유 종목수: ${s.holdingCoinsCount || 0}개 코인</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">트레이딩 승률 및 수수료</div>
      <div class="kpi-value">${Number(s.totalWinRate || 0).toFixed(1)}% <span style="font-size: 11px; font-weight: normal; color: #64748b;">(${s.totalWinTrades || 0}승 ${s.totalLossTrades || 0}패)</span></div>
      <div class="kpi-sub text-muted">총 수수료: ${Math.round(s.totalFees || 0).toLocaleString()}원</div>
    </div>
  </div>

  <!-- 2. 거래소별 비중 요약 -->
  <div class="section-title">2. 거래소별 거래 비중 및 실적 요약</div>
  <div class="exchange-grid">
    <div class="exchange-box">
      <div class="exchange-box-header">
        <span class="badge badge-upbit">업비트 (UPBIT)</span>
        <span>거래종목 ${upbitCoins.length}개</span>
      </div>
      <table style="width: 100%; font-size: 10px;">
        <tr><td>총 매수대금:</td><td class="text-right font-bold">${Math.round(upbitBuyVol).toLocaleString()}원</td></tr>
        <tr><td>실현손익:</td><td class="text-right font-bold ${upbitRealized >= 0 ? 'profit-red' : 'profit-blue'}">${upbitRealized >= 0 ? '+' : ''}${Math.round(upbitRealized).toLocaleString()}원</td></tr>
        <tr><td>지급 수수료:</td><td class="text-right text-muted">${Math.round(upbitFees).toLocaleString()}원</td></tr>
      </table>
    </div>

    <div class="exchange-box">
      <div class="exchange-box-header">
        <span class="badge badge-bithumb">빗썸 (BITHUMB)</span>
        <span>거래종목 ${bithumbCoins.length}개</span>
      </div>
      <table style="width: 100%; font-size: 10px;">
        <tr><td>총 매수대금:</td><td class="text-right font-bold">${Math.round(bithumbBuyVol).toLocaleString()}원</td></tr>
        <tr><td>실현손익:</td><td class="text-right font-bold ${bithumbRealized >= 0 ? 'profit-red' : 'profit-blue'}">${bithumbRealized >= 0 ? '+' : ''}${Math.round(bithumbRealized).toLocaleString()}원</td></tr>
        <tr><td>지급 수수료:</td><td class="text-right text-muted">${Math.round(bithumbFees).toLocaleString()}원</td></tr>
      </table>
    </div>
  </div>

  <!-- 3. 코인별 손익 및 잔고 명세서 -->
  <div class="section-title">3. 코인별 손익, 평단가 및 잔고 명세서</div>
  <table class="data-table">
    <thead>
      <tr>
        <th>거래소</th>
        <th>코인명</th>
        <th>마켓</th>
        <th class="text-right">실현손익</th>
        <th class="text-right">수익률</th>
        <th class="text-right">보유수량</th>
        <th class="text-right">매수평단가</th>
        <th class="text-right">보유원금</th>
        <th class="text-right">총 매수액</th>
        <th class="text-right">총 매도액</th>
        <th class="text-right">수수료</th>
        <th class="text-center">승률</th>
      </tr>
    </thead>
    <tbody>
      ${coins.map(c => {
        const kName = c.koreanName || (typeof UpbitAPI !== 'undefined' ? UpbitAPI.getKoreanName(c.market) : c.coinSymbol);
        const isBithumb = c.exchange === 'BITHUMB';
        const pClass = (c.realizedProfit || 0) >= 0 ? 'profit-red' : 'profit-blue';
        return `<tr>
          <td><span class="badge ${isBithumb ? 'badge-bithumb' : 'badge-upbit'}">${c.exchange || 'UPBIT'}</span></td>
          <td class="font-bold">${kName} <span style="font-size: 9px; color: #64748b;">(${c.coinSymbol})</span></td>
          <td>${c.market}</td>
          <td class="text-right font-bold ${pClass}">${(c.realizedProfit || 0) >= 0 ? '+' : ''}${Math.round(c.realizedProfit || 0).toLocaleString()}원</td>
          <td class="text-right ${pClass}">${(c.realizedRoi || 0) >= 0 ? '+' : ''}${Number(c.realizedRoi || 0).toFixed(2)}%</td>
          <td class="text-right">${c.holdingQty > 0 ? Number(c.holdingQty).toLocaleString(undefined, { maximumFractionDigits: 6 }) : '-'}</td>
          <td class="text-right">${c.avgBuyPrice > 0 ? Math.round(c.avgBuyPrice).toLocaleString() + '원' : '-'}</td>
          <td class="text-right font-bold">${c.holdingCost > 0 ? Math.round(c.holdingCost).toLocaleString() + '원' : '-'}</td>
          <td class="text-right">${Math.round(c.totalBuyAmount || 0).toLocaleString()}원</td>
          <td class="text-right">${Math.round(c.totalSellAmount || 0).toLocaleString()}원</td>
          <td class="text-right text-muted">${Math.round(c.totalFee || 0).toLocaleString()}원</td>
          <td class="text-center">${Number(c.winRate || 0).toFixed(0)}% (${c.winTrades}승 ${c.lossTrades}패)</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>

  <!-- 4. 월별 손익 및 거래 실적 -->
  ${monthly.length > 0 ? `
  <div class="section-title">4. 월별 매매 실적 및 손익 통계</div>
  <table class="data-table">
    <thead>
      <tr>
        <th>거래 년월</th>
        <th class="text-right">실현손익</th>
        <th class="text-right">매수대금</th>
        <th class="text-right">매도대금</th>
        <th class="text-right">총 거래대금</th>
        <th class="text-right">수수료</th>
        <th class="text-center">거래횟수</th>
        <th class="text-center">승 / 패</th>
        <th class="text-center">승률</th>
      </tr>
    </thead>
    <tbody>
      ${monthly.map(m => {
        const pClass = (m.realizedProfit || 0) >= 0 ? 'profit-red' : 'profit-blue';
        return `<tr>
          <td class="font-bold">${m.period}</td>
          <td class="text-right font-bold ${pClass}">${(m.realizedProfit || 0) >= 0 ? '+' : ''}${Math.round(m.realizedProfit || 0).toLocaleString()}원</td>
          <td class="text-right">${Math.round(m.buyVolume || 0).toLocaleString()}원</td>
          <td class="text-right">${Math.round(m.sellVolume || 0).toLocaleString()}원</td>
          <td class="text-right">${Math.round(m.totalVolume || 0).toLocaleString()}원</td>
          <td class="text-right text-muted">${Math.round(m.totalFees || 0).toLocaleString()}원</td>
          <td class="text-center">${m.tradesCount}건</td>
          <td class="text-center">${m.winCount}승 ${m.lossCount}패</td>
          <td class="text-center font-bold">${Number(m.winRate || 0).toFixed(1)}%</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>
  ` : ''}

  <!-- 5. 원화 입출금 및 현금흐름 요약 -->
  <div class="section-title">5. 원화 및 가상자산 입출금 현금흐름 요약</div>
  <table class="data-table" style="width: 100%;">
    <tr>
      <th style="width: 25%;">총 원화 입금액</th>
      <td style="width: 25%;" class="font-bold text-right">${Math.round(transfers.totalKrwDeposit || 0).toLocaleString()}원</td>
      <th style="width: 25%;">총 원화 출금액</th>
      <td style="width: 25%;" class="font-bold text-right">${Math.round(transfers.totalKrwWithdraw || 0).toLocaleString()}원</td>
    </tr>
    <tr>
      <th>순 투입 원금 (입금 - 출금)</th>
      <td class="font-bold text-right ${(transfers.netKrwDeposit || 0) >= 0 ? 'profit-blue' : 'profit-red'}">${Math.round(transfers.netKrwDeposit || 0).toLocaleString()}원</td>
      <th>입출금 총 건수</th>
      <td class="text-right text-muted">${transfers.totalTransferCount || (transfers.items ? transfers.items.length : 0)}건</td>
    </tr>
  </table>

  <div class="footer-note">
    <span>CoinHub Cryptocurrency Analytical Platform • 본 보고서는 거래소 원본 체결 내역을 바탕으로 산출되었습니다.</span>
    <span>Page 1 / 1</span>
  </div>

  <script>
    window.onload = function() {
      // 자동 인쇄 창 호출은 필요 시 사용 가능
    };
  </script>
</body>
</html>`;

        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Exporter;
}

if (typeof window !== "undefined") { window.Exporter = Exporter; }
if (typeof globalThis !== "undefined") { globalThis.Exporter = Exporter; }
