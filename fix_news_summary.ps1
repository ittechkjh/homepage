$lines = Get-Content 'e:\HOMEPAGE\js\preview-app.js' -Encoding UTF8
$newLines = @()
$inFunc = $false

foreach ($line in $lines) {
    if ($line -match '^async function fetchRealCryptoNews\(\) \{') {
        $inFunc = $true
        
        # Add the new function lines
        $newLines += 'async function fetchRealCryptoNews() {'
        $newLines += '  try {'
        $newLines += '    const urls = ['
        $newLines += '      "https://news.google.com/rss/search?q=비트코인+OR+암호화폐+시장&hl=ko&gl=KR&ceid=KR:ko",'
        $newLines += '      "https://news.google.com/rss/search?q=알트코인+OR+이더리움+OR+솔라나+OR+리플+OR+도지코인&hl=ko&gl=KR&ceid=KR:ko",'
        $newLines += '      "https://news.google.com/rss/search?q=암호화폐+규제+OR+SEC+OR+비트코인+과세+OR+가상자산법&hl=ko&gl=KR&ceid=KR:ko",'
        $newLines += '      "https://news.google.com/rss/search?q=블록체인+기술+OR+웹3+OR+디파이+OR+메인넷&hl=ko&gl=KR&ceid=KR:ko"'
        $newLines += '    ];'
        $newLines += '    const fetchPromises = urls.map(async (url, idx) => {'
        $newLines += '      const apiUrl = "https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(url);'
        $newLines += '      try {'
        $newLines += '        const controller = new AbortController();'
        $newLines += '        const timeoutId = setTimeout(() => controller.abort(), 3500);'
        $newLines += '        const res = await fetch(apiUrl, { signal: controller.signal });'
        $newLines += '        clearTimeout(timeoutId);'
        $newLines += '        if (res.ok) {'
        $newLines += '          const data = await res.json();'
        $newLines += '          return { idx, items: (data && data.items) ? data.items.slice(0, 5) : [] };'
        $newLines += '        }'
        $newLines += '      } catch (e) {}'
        $newLines += '      return { idx, items: [] };'
        $newLines += '    });'
        $newLines += '    const results = await Promise.all(fetchPromises);'
        $newLines += '    let combined = [];'
        $newLines += '    const catMap = ["MARKET", "ALTCOIN", "REGULATION", "TECH"];'
        $newLines += '    const catNameMap = ["비트코인/시장", "알트코인", "규제/정책", "기술/DeFi"];'
        $newLines += '    let idCounter = 1000;'
        $newLines += '    results.forEach(res => {'
        $newLines += '      const cat = catMap[res.idx];'
        $newLines += '      const catName = catNameMap[res.idx];'
        $newLines += '      res.items.forEach((item, innerIdx) => {'
        $newLines += '        const title = item.title ? item.title.replace(/<[^>]+>/g, "").trim() : "가상자산 실시간 속보";'
        $newLines += '        let sourceName = item.author || "주요 매체";'
        $newLines += '        if (title.includes(" - ")) {'
        $newLines += '          const parts = title.split(" - ");'
        $newLines += '          if (parts.length > 1) sourceName = parts[parts.length - 1].trim();'
        $newLines += '        }'
        $newLines += '        let content = item.description ? item.description.replace(/<[^>]+>/g, "") : title;'
        $newLines += '        let sentences = content.split(/[.!?]/).map(s => s.trim()).filter(s => s.length > 10);'
        $newLines += '        let takeaways = [];'
        $newLines += '        if (sentences.length >= 2) {'
        $newLines += '           takeaways = [sentences[0] + "...", sentences[1] + "..."];'
        $newLines += '        } else {'
        $newLines += '           takeaways = [content.slice(0, 50) + "...", "자세한 내용은 원문을 확인하세요."];'
        $newLines += '        }'
        $newLines += '        combined.push({'
        $newLines += '          id: idCounter++,'
        $newLines += '          category: cat,'
        $newLines += '          categoryName: catName,'
        $newLines += '          badge: innerIdx === 0 ? "HOT" : "LIVE",'
        $newLines += '          title: title,'
        $newLines += '          content: content.slice(0, 180) + "...",'
        $newLines += '          source: sourceName,'
        $newLines += '          link: item.link || "#",'
        $newLines += '          time: innerIdx === 0 ? "방금 전" : (innerIdx * 10) + "분 전",'
        $newLines += '          timestamp: Date.now() - (innerIdx * 10 * 60 * 1000),'
        $newLines += '          takeaways: takeaways'
        $newLines += '        });'
        $newLines += '      });'
        $newLines += '    });'
        $newLines += '    combined.sort((a, b) => b.timestamp - a.timestamp);'
        $newLines += '    if (combined.length > 0) return combined;'
        $newLines += '  } catch (err) {}'
        $newLines += '  return MULTI_SOURCE_NEWS_POOL;'
        $newLines += '}'
        
        continue
    }

    if ($inFunc) {
        if ($line -match '^window\.fetchRealCryptoNews = fetchRealCryptoNews;') {
            $inFunc = $false
            $newLines += $line
        }
        continue
    }
    
    if ($line -match 'const takeawaysEl = document.getElementById\(''modal-news-takeaways''\);') {
        $newLines += $line
        $newLines += "  const linkEl = document.getElementById('modal-news-original-link');"
        continue
    }
    
    if ($line -match 'if \(contentEl\) contentEl.innerText = item.content;') {
        $newLines += $line
        $newLines += "  if (linkEl) linkEl.href = item.link || '#';"
        continue
    }

    $newLines += $line
}

Set-Content 'e:\HOMEPAGE\js\preview-app.js' $newLines -Encoding UTF8
