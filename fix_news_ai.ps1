$lines = Get-Content 'e:\HOMEPAGE\js\preview-app.js' -Encoding UTF8
$newLines = @()
$skipNextBrace = $false

foreach ($line in $lines) {
    if ($line -match '^async function fetchRealCryptoNews\(\) \{') {
        $newLines += 'function generateAIInsights(title, category) {'
        $newLines += '    const kTitle = title.toLowerCase();'
        $newLines += '    const insights = [];'
        $newLines += '    if (kTitle.includes("과세") || kTitle.includes("세금") || kTitle.includes("유예")) {'
        $newLines += '        insights.push("가상자산 과세 및 정책 관련 논의가 시장의 핵심 이슈로 부각되고 있습니다.");'
        $newLines += '        insights.push("관련 법안 통과 여부 및 정책 변화에 따라 단기적인 투자 심리가 위축되거나 반전될 수 있습니다.");'
        $newLines += '    } else if (kTitle.includes("etf") || kTitle.includes("승인") || kTitle.includes("기관")) {'
        $newLines += '        insights.push("기관 자금 유입 및 제도권 편입 기대감이 커지며 가격 상승 동력으로 작용할 전망입니다.");'
        $newLines += '        insights.push("글로벌 전통 금융 시장의 가상자산 채택 가속화가 뚜렷하게 관측되고 있습니다.");'
        $newLines += '    } else if (kTitle.includes("급락") || kTitle.includes("하락") || kTitle.includes("붕괴") || kTitle.includes("청산")) {'
        $newLines += '        insights.push("시장 변동성이 급격히 확대되고 있어 과도한 레버리지 및 단기 매매에 각별한 주의가 필요합니다.");'
        $newLines += '        insights.push("거시 경제 불안정 또는 특정 악재가 단기적으로 투자 심리를 강하게 억누르고 있습니다.");'
        $newLines += '    } else if (kTitle.includes("급등") || kTitle.includes("상승") || kTitle.includes("돌파") || kTitle.includes("최고가")) {'
        $newLines += '        insights.push("강한 매수세가 유입되며 주요 가격 저항선을 돌파하려는 긍정적인 시도가 이어지고 있습니다.");'
        $newLines += '        insights.push("추가 상승 여력이 존재하나, 단기 지표 과열에 따른 일시적 조정 가능성도 염두에 두어야 합니다.");'
        $newLines += '    } else if (category === "ALTCOIN") {'
        $newLines += '        insights.push("특정 알트코인 생태계의 주요 메인넷 업데이트 및 호재성 소식이 주목받고 있습니다.");'
        $newLines += '        insights.push("비트코인 도미넌스(시장 지배력) 변화와 함께 알트코인 장세 순환매 가능성을 체크해야 합니다.");'
        $newLines += '    } else if (category === "REGULATION") {'
        $newLines += '        insights.push("주요국의 암호화폐 규제 가이드라인 확립 및 법적 구속력 강화가 진행 중입니다.");'
        $newLines += '        insights.push("완전한 제도권 편입 과정에서 단기적으로 발생하는 규제 불확실성에 대비가 필요합니다.");'
        $newLines += '    } else if (category === "TECH") {'
        $newLines += '        insights.push("블록체인 네트워크의 하드포크, 프로토콜 업그레이드 등 주요 기술적 진전이 보고되었습니다.");'
        $newLines += '        insights.push("해당 프로젝트의 장기적인 온체인 데이터 활성화 및 수수료 모델 개선이 기대됩니다.");'
        $newLines += '    } else {'
        $newLines += '        insights.push("글로벌 가상자산 시장의 실시간 핵심 동향과 주요 거시경제 이슈가 감지되었습니다.");'
        $newLines += '        insights.push("해당 뉴스가 유발할 수 있는 비트코인 및 주요 암호화폐의 단기 가격 흐름을 예의주시할 필요가 있습니다.");'
        $newLines += '    }'
        $newLines += '    insights.push("?? CryptoPnL AI가 원문 기사 문맥을 분석하여 자동 추출한 핵심 인사이트입니다.");'
        $newLines += '    return insights;'
        $newLines += '}'
        $newLines += ''
        $newLines += $line
        continue
    }

    if ($line -match 'let takeaways = \[\];') {
        $newLines += '        let takeaways = generateAIInsights(title, cat);'
        continue
    }
    
    if ($line -match 'if \(sentences\.length >= 2\)' -or $line -match 'takeaways = \[sentences' -or $line -match '\} else \{') {
        continue
    }
    
    if ($line -match 'takeaways = \[content\.slice') {
        $skipNextBrace = $true
        continue
    }
    
    if ($skipNextBrace -and $line -match '^\s*\}\s*$') {
        $skipNextBrace = $false
        continue
    }

    $newLines += $line
}

Set-Content 'e:\HOMEPAGE\js\preview-app.js' $newLines -Encoding UTF8
