/**
 * exporter.js
 * 분석 결과 엑셀(.xlsx) / CSV 내보내기 및 인쇄 모듈
 * (업비트 & 빗썸 매매 손익, 입출금, 스테이킹, 코인 수량 증감 포함)
 */

const Exporter = {
    exportExcelReport: function (reportData) {
        if (typeof XLSX === 'undefined') {
            alert('SheetJS(XLSX) 라이브러리를 불러올 수 없습니다.');
            return;
        }

        const wb = XLSX.utils.book_new();

        // 1. 코인별 손익 요약 시트
        const coinRows = [
            ['업비트 & 빗썸 코인별 손익, 잔고 및 수량 증감 분석 보고서'],
            [
                `생성일시: ${new Date().toLocaleString()}`, 
                `계산방식: ${reportData.method === 'fifo' ? '선입선출법 (FIFO)' : '이동평균법'}`,
                `거래소: ${reportData.exchange === 'ALL' ? '전체 통합' : reportData.exchange}`
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

        reportData.coinSummaries.forEach(c => {
            coinRows.push([
                c.exchange || 'UPBIT',
                c.koreanName || c.coinSymbol,
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

        const s = reportData.summary;
        coinRows.push([]);
        coinRows.push([
            '【 전체 합계 】',
            '-',
            '-',
            Math.round(s.totalCumulativeBuyAmount || s.totalInvested),
            Math.round(s.totalCumulativeSellAmount || s.totalSold),
            Math.round(s.totalFees),
            Math.round(s.totalRealizedProfit),
            Number(s.totalRealizedRoi.toFixed(2)),
            '-',
            '-',
            '-',
            '-',
            Math.round(s.currentPortfolioCost),
            '-',
            Math.round(reportData.totalCurrentValue || 0),
            Math.round(reportData.totalUnrealizedProfit || 0),
            '-',
            s.totalBuyTrades,
            s.totalSellTrades,
            s.totalWinTrades,
            s.totalLossTrades,
            Number(s.totalWinRate.toFixed(1))
        ]);

        const wsCoin = XLSX.utils.aoa_to_sheet(coinRows);
        XLSX.utils.book_append_sheet(wb, wsCoin, '코인별_손익요약');

        // 2. 월별 손익 통계 시트
        const monthRows = [
            ['월별 거래 및 손익 통계'],
            [],
            ['년월', '실현손익(원)', '매수대금(원)', '매도대금(원)', '총 거래대금(원)', '총 수수료(원)', '거래횟수', '익절건수', '손절건수', '승률(%)']
        ];

        reportData.monthlyStats.forEach(m => {
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
                Number(m.winRate.toFixed(1))
            ]);
        });

        const wsMonth = XLSX.utils.aoa_to_sheet(monthRows);
        XLSX.utils.book_append_sheet(wb, wsMonth, '월별_통계');

        // 3. 입출금 내역 시트
        if (reportData.transfers && reportData.transfers.items && reportData.transfers.items.length > 0) {
            const transferRows = [
                ['원화 및 가상자산 입출금 내역'],
                [
                    `총 원화 입금: ${Math.round(reportData.transfers.totalKrwDeposit).toLocaleString()}원`,
                    `총 원화 출금: ${Math.round(reportData.transfers.totalKrwWithdraw).toLocaleString()}원`,
                    `순 투입 원금: ${Math.round(reportData.transfers.netKrwDeposit).toLocaleString()}원`
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

        // 4. 스테이킹 현황 시트
        if (reportData.staking && reportData.staking.records && reportData.staking.records.length > 0) {
            const stakingRows = [
                ['스테이킹 자산 현황 및 보상 집계'],
                [],
                ['거래소', '코인명', '심볼', '스테이킹 수량', '현재 평가금액(원)', '연이율(APY %)', '누적 보상수량', '누적 보상금액(원)', '보상수령 횟수']
            ];

            reportData.staking.records.forEach(st => {
                stakingRows.push([
                    st.exchange || 'UPBIT',
                    st.koreanName || st.coinSymbol,
                    st.coinSymbol,
                    st.currentStakedQty,
                    Math.round(st.currentValue || 0),
                    st.apy || '-',
                    st.totalRewardQty,
                    Math.round(st.totalRewardKrw),
                    st.rewardCount
                ]);
            });

            const wsStaking = XLSX.utils.aoa_to_sheet(stakingRows);
            XLSX.utils.book_append_sheet(wb, wsStaking, '스테이킹_현황');
        }

        // 5. 상세 거래 내역 시트
        const tradeRows = [
            [
                '거래소', '체결일시', '마켓', '코인', '거래종류', '거래수량', 
                '거래단가(원)', '거래금액(원)', '수수료(원)', '정산금액(원)', 
                '매칭원가(원)', '실현손익(원)', '수익률(%)'
            ]
        ];

        reportData.trades.forEach(t => {
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
        const fileName = `가상자산_손익및입출금_분석보고서_${dateStr}.xlsx`;
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
            const roi = t.type === '매도' ? (t.realizedRoi || 0).toFixed(2) : '';

            const row = [
                `"${t.exchange || 'UPBIT'}"`,
                `"${t.time}"`,
                `"${t.market}"`,
                `"${t.coinSymbol}"`,
                `"${t.type}"`,
                t.quantity,
                t.price,
                t.amount,
                t.fee,
                t.settlement,
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
        link.download = `가상자산_정제거래내역_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    printReport: function () {
        window.print();
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Exporter;
}
