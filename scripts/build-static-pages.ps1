# ==============================================================================
# CrytoPnL Static Page & Sitemap Generator (PowerShell)
# Generates static SEO HTML pages for guides, calculators, and forum posts.
# ==============================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Web.Extensions

$rootDir = Split-Path -Parent $PSScriptRoot
Set-Location $rootDir

# 1. Ensure target directories exist
$dirs = @("guides", "calculators", "posts")
foreach ($d in $dirs) {
    $p = Join-Path $rootDir $d
    if (-not (Test-Path $p)) {
        New-Item -ItemType Directory -Path $p -Force | Out-Null
    }
}

# 2. Load template
$tplPath = Join-Path $rootDir "scripts\page-template.html"
$template = [System.IO.File]::ReadAllText($tplPath, [System.Text.Encoding]::UTF8)

# 3. Load JSON data
$jss = New-Object System.Web.Script.Serialization.JavaScriptSerializer
$jss.MaxJsonLength = 50000000

$seoRaw = [System.IO.File]::ReadAllText((Join-Path $rootDir "data\static-seo-articles.json"), [System.Text.Encoding]::UTF8)
$seoData = $jss.DeserializeObject($seoRaw)

$repRaw = [System.IO.File]::ReadAllText((Join-Path $rootDir "data\daily-market-reports.json"), [System.Text.Encoding]::UTF8)
$repData = $jss.DeserializeObject($repRaw)

$sitemapUrls = New-Object System.Collections.Generic.List[PSObject]
$today = (Get-Date).ToString("yyyy-MM-dd")

# Helper function to strip HTML tags for descriptions
function Clean-ArticleContent([string]$html) {
    if ([string]::IsNullOrWhiteSpace($html)) { return "" }
    $c = $html
    # Strip leading empty divs, ps, and brs
    $c = [System.Text.RegularExpressions.Regex]::Replace($c, '^((\s*<div[^>]*>(\s*<br\s*/?>\s*|\s*)*</div>|\s*<p[^>]*>(\s*<br\s*/?>\s*|\s*)*</p>|\s*<br\s*/?>)\s*)+', '')
    # Strip trailing empty divs, ps, and brs
    $c = [System.Text.RegularExpressions.Regex]::Replace($c, '((\s*<div[^>]*>(\s*<br\s*/?>\s*|\s*)*</div>|\s*<p[^>]*>(\s*<br\s*/?>\s*|\s*)*</p>|\s*<br\s*/?>)\s*)+$', '')
    return $c
}
function Strip-HtmlTags([string]$html) {
    if ([string]::IsNullOrWhiteSpace($html)) { return "" }
    $clean = [System.Text.RegularExpressions.Regex]::Replace($html, "<[^>]+>", " ")
    $clean = [System.Text.RegularExpressions.Regex]::Replace($clean, "\s+", " ")
    return $clean.Trim()
}

# Helper function to escape JSON strings
function Escape-JsonString([string]$str) {
    if ([string]::IsNullOrWhiteSpace($str)) { return "" }
    return $str.Replace('\', '\\').Replace('"', '\"').Replace("`n", " ").Replace("`r", "")
}

# Add Home to sitemap
$sitemapUrls.Add([PSCustomObject]@{
    loc = "https://crytopnl.com/"
    lastmod = $today
    changefreq = "daily"
    priority = "1.0"
})

# Add Standalone Legal & Policy pages to sitemap
$legalPages = @("privacy.html", "terms.html", "about.html", "contact.html")
foreach ($lp in $legalPages) {
    $sitemapUrls.Add([PSCustomObject]@{
        loc = "https://crytopnl.com/$lp"
        lastmod = $today
        changefreq = "monthly"
        priority = "0.8"
    })
}

# Related recommendations HTML snippets
$calcRelatedHtml = @'
    <section class="mt-8 pt-6 border-t border-navy-800">
      <h3 class="text-base font-bold text-white mb-4 flex items-center gap-2">
        <i data-lucide="book-open" class="w-4 h-4 text-cyan-400"></i>
        함께 읽으면 좋은 추천 가이드
      </h3>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <a href="https://crytopnl.com/guides/crypto-tax-deduction.html" class="p-4 rounded-2xl bg-navy-900/80 border border-navy-800 hover:border-cyan-500/50 transition flex flex-col justify-between">
          <span class="text-xs text-cyan-400 font-bold mb-1">세무 가이드</span>
          <h4 class="text-xs font-bold text-white line-clamp-2">2026 가상자산 소득세 22% & 기본공제 5,000만원 절세 전략</h4>
          <span class="text-[11px] text-slate-500 mt-2">자세히 보기 &rarr;</span>
        </a>
        <a href="https://crytopnl.com/guides/kimchi-premium-arbitrage.html" class="p-4 rounded-2xl bg-navy-900/80 border border-navy-800 hover:border-cyan-500/50 transition flex flex-col justify-between">
          <span class="text-xs text-cyan-400 font-bold mb-1">차익거래 전략</span>
          <h4 class="text-xs font-bold text-white line-clamp-2">김치프리미엄(김프) 매매 기법과 실전 헤징 가이드</h4>
          <span class="text-[11px] text-slate-500 mt-2">자세히 보기 &rarr;</span>
        </a>
        <a href="https://crytopnl.com/guides/water-drop-break-even.html" class="p-4 rounded-2xl bg-navy-900/80 border border-navy-800 hover:border-cyan-500/50 transition flex flex-col justify-between">
          <span class="text-xs text-cyan-400 font-bold mb-1">매매 전략</span>
          <h4 class="text-xs font-bold text-white line-clamp-2">물타기 & 불타기(DCA) 평단가 탈출 전략 및 분할 매도 원칙</h4>
          <span class="text-[11px] text-slate-500 mt-2">자세히 보기 &rarr;</span>
        </a>
      </div>
    </section>
'@

$guideRelatedHtml = @'
    <section class="mt-8 pt-6 border-t border-navy-800">
      <h3 class="text-base font-bold text-white mb-4 flex items-center gap-2">
        <i data-lucide="calculator" class="w-4 h-4 text-cyan-400"></i>
        직접 계산해보기: 추천 실전 계산기
      </h3>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <a href="https://crytopnl.com/calculators/crypto-tax.html" class="p-4 rounded-2xl bg-navy-900/80 border border-navy-800 hover:border-cyan-500/50 transition flex flex-col justify-between">
          <span class="text-xs text-cyan-400 font-bold mb-1">세무 계산기</span>
          <h4 class="text-xs font-bold text-white line-clamp-2">2026 가상자산 양도소득세 정밀 계산기</h4>
          <span class="text-[11px] text-slate-500 mt-2">계산기 실행 &rarr;</span>
        </a>
        <a href="https://crytopnl.com/calculators/average-down.html" class="p-4 rounded-2xl bg-navy-900/80 border border-navy-800 hover:border-cyan-500/50 transition flex flex-col justify-between">
          <span class="text-xs text-cyan-400 font-bold mb-1">물타기 계산기</span>
          <h4 class="text-xs font-bold text-white line-clamp-2">코인 물타기 & 탈출 평단가 계산기</h4>
          <span class="text-[11px] text-slate-500 mt-2">계산기 실행 &rarr;</span>
        </a>
        <a href="https://crytopnl.com/calculators/liquidation-price.html" class="p-4 rounded-2xl bg-navy-900/80 border border-navy-800 hover:border-cyan-500/50 transition flex flex-col justify-between">
          <span class="text-xs text-cyan-400 font-bold mb-1">선물 청산가</span>
          <h4 class="text-xs font-bold text-white line-clamp-2">코인 선물 레버리지 격리/교차 강제청산가 계산기</h4>
          <span class="text-[11px] text-slate-500 mt-2">계산기 실행 &rarr;</span>
        </a>
      </div>
    </section>
'@

$postRelatedHtml = @'
    <section class="mt-8 pt-6 border-t border-navy-800">
      <h3 class="text-base font-bold text-white mb-4 flex items-center gap-2">
        <i data-lucide="trending-up" class="w-4 h-4 text-cyan-400"></i>
        실전 트레이딩 유용한 도구 & 가이드
      </h3>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <a href="https://crytopnl.com/calculators/kimchi-premium.html" class="p-4 rounded-2xl bg-navy-900/80 border border-navy-800 hover:border-cyan-500/50 transition flex flex-col justify-between">
          <span class="text-xs text-cyan-400 font-bold mb-1">실시간 계산기</span>
          <h4 class="text-xs font-bold text-white line-clamp-2">실시간 김치프리미엄 차익 계산기</h4>
          <span class="text-[11px] text-slate-500 mt-2">계산기 실행 &rarr;</span>
        </a>
        <a href="https://crytopnl.com/guides/trading-fees-slippage.html" class="p-4 rounded-2xl bg-navy-900/80 border border-navy-800 hover:border-cyan-500/50 transition flex flex-col justify-between">
          <span class="text-xs text-cyan-400 font-bold mb-1">주문 분석</span>
          <h4 class="text-xs font-bold text-white line-clamp-2">암호화폐 거래 수수료와 슬리피지 관리 전략</h4>
          <span class="text-[11px] text-slate-500 mt-2">가이드 보기 &rarr;</span>
        </a>
        <a href="https://crytopnl.com/#/forum" class="p-4 rounded-2xl bg-navy-900/80 border border-cyan-500/40 hover:border-cyan-400 transition flex flex-col justify-between">
          <span class="text-xs text-amber-400 font-bold mb-1">실시간 토론</span>
          <h4 class="text-xs font-bold text-white line-clamp-2">투자 포럼에서 다른 투자자들과 관점 공유하기</h4>
          <span class="text-[11px] text-cyan-400 mt-2">포럼 이동 &rarr;</span>
        </a>
      </div>
    </section>
'@

# 4. Generate Calculator Pages
Write-Host "Generating Calculator static pages..."
$calcs = $seoData["calculators"]
foreach ($calc in $calcs) {
    $slug = $calc["slug"]
    $title = $calc["title"]
    $desc = $calc["description"]
    $cat = $calc["category"]
    $canonical = "https://crytopnl.com/calculators/$slug.html"
    $keywords = $calc["keywords"]
    $ctaText = $calc["ctaText"]
    $ctaLink = $calc["ctaLink"]
    $content = $calc["contentHtml"]
    $author = "CrytoPnL 금융공학팀"

    $page = $template
    $page = $page.Replace('__FULL_TITLE__', "$title | CrytoPnL 실전 계산기")
    $page = $page.Replace('__DESCRIPTION__', $desc)
    $page = $page.Replace('__KEYWORDS__', $keywords)
    $page = $page.Replace('__AUTHOR__', $author)
    $page = $page.Replace('__CANONICAL_URL__', $canonical)
    $page = $page.Replace('__ESCAPED_TITLE__', (Escape-JsonString $title))
    $page = $page.Replace('__ESCAPED_DESC__', (Escape-JsonString $desc))
    $page = $page.Replace('__DATE__', $today)
    $page = $page.Replace('__CTA_LINK__', $ctaLink)
    $page = $page.Replace('__CTA_TEXT__', $ctaText)
    $page = $page.Replace('__CATEGORY__', $cat)
    $page = $page.Replace('__TITLE__', $title)
    $page = $page.Replace('__CONTENT_HTML__', (Clean-ArticleContent $content))
    $page = $page.Replace('__RELATED_SECTION__', $calcRelatedHtml)

    $outPath = Join-Path $rootDir "calculators\$slug.html"
    [System.IO.File]::WriteAllText($outPath, $page, [System.Text.Encoding]::UTF8)

    $sitemapUrls.Add([PSCustomObject]@{
        loc = $canonical
        lastmod = $today
        changefreq = "weekly"
        priority = "0.9"
    })
}
Write-Host "Calculators generated: $($calcs.Count)"

# 5. Generate Guide Pages
Write-Host "Generating Guide static pages..."
$guides = $seoData["guides"]
foreach ($g in $guides) {
    $slug = $g["slug"]
    $title = $g["title"]
    $desc = $g["description"]
    $cat = $g["category"]
    $canonical = "https://crytopnl.com/guides/$slug.html"
    $keywords = $g["keywords"]
    $ctaText = $g["ctaText"]
    $ctaLink = $g["ctaLink"]
    $content = $g["contentHtml"]
    $author = "CrytoPnL 퀀트 리서치팀"

    $page = $template
    $page = $page.Replace('__FULL_TITLE__', "$title | CrytoPnL 백서")
    $page = $page.Replace('__DESCRIPTION__', $desc)
    $page = $page.Replace('__KEYWORDS__', $keywords)
    $page = $page.Replace('__AUTHOR__', $author)
    $page = $page.Replace('__CANONICAL_URL__', $canonical)
    $page = $page.Replace('__ESCAPED_TITLE__', (Escape-JsonString $title))
    $page = $page.Replace('__ESCAPED_DESC__', (Escape-JsonString $desc))
    $page = $page.Replace('__DATE__', $today)
    $page = $page.Replace('__CTA_LINK__', $ctaLink)
    $page = $page.Replace('__CTA_TEXT__', $ctaText)
    $page = $page.Replace('__CATEGORY__', $cat)
    $page = $page.Replace('__TITLE__', $title)
    $page = $page.Replace('__CONTENT_HTML__', (Clean-ArticleContent $content))
    $page = $page.Replace('__RELATED_SECTION__', $guideRelatedHtml)

    $outPath = Join-Path $rootDir "guides\$slug.html"
    [System.IO.File]::WriteAllText($outPath, $page, [System.Text.Encoding]::UTF8)

    $sitemapUrls.Add([PSCustomObject]@{
        loc = $canonical
        lastmod = $today
        changefreq = "weekly"
        priority = "0.8"
    })
}
Write-Host "Guides generated: $($guides.Count)"

# 6. Generate Forum Post Pages
Write-Host "Generating Forum Post static pages..."
$reports = $repData["reports"]
foreach ($rep in $reports) {
    $id = $rep["id"]
    $title = $rep["title"]
    $author = if ($rep["author"]) { $rep["author"] } else { "AI 퀀트 애널리스트" }
    $cat = if ($rep["categoryName"]) { $rep["categoryName"] } else { "시장 분석 리포트" }
    $canonical = "https://crytopnl.com/posts/$id.html"
    $keywords = "비트코인 시황, 암호화폐 퀀트 분석, 온체인 데이터, 시장 전망, CrytoPnL, BTC USDT"
    $ctaText = "실시간 지표 & 포럼 참여하기"
    $ctaLink = "https://crytopnl.com/#/forum"
    $content = $rep["content"]

    $plain = Strip-HtmlTags $content
    if ($plain.Length -gt 150) {
        $desc = $plain.Substring(0, 150) + "..."
    } else {
        $desc = "$title - CrytoPnL 실시간 퀀트 분석 및 온체인 마켓 리포트"
    }

    $dateStr = $today
    if ($rep["timestamp"]) {
        try {
            $ts = [int64]$rep["timestamp"]
            if ($ts -gt 1000000000000) {
                $epoch = [DateTimeOffset]::FromUnixTimeMilliseconds($ts)
                $dateStr = $epoch.ToString("yyyy-MM-dd")
            } elseif ($ts -gt 1000000000) {
                $epoch = [DateTimeOffset]::FromUnixTimeSeconds($ts)
                $dateStr = $epoch.ToString("yyyy-MM-dd")
            }
        } catch {}
    } elseif ($rep["time"] -and ($rep["time"] -match '^\d{4}[-.]\d{2}[-.]\d{2}')) {
        $dateStr = ($rep["time"] -replace '\.', '-').Substring(0, 10)
    }

    $page = $template
    $page = $page.Replace('__FULL_TITLE__', "$title | CrytoPnL 포럼")
    $page = $page.Replace('__DESCRIPTION__', $desc)
    $page = $page.Replace('__KEYWORDS__', $keywords)
    $page = $page.Replace('__AUTHOR__', $author)
    $page = $page.Replace('__CANONICAL_URL__', $canonical)
    $page = $page.Replace('__ESCAPED_TITLE__', (Escape-JsonString $title))
    $page = $page.Replace('__ESCAPED_DESC__', (Escape-JsonString $desc))
    $page = $page.Replace('__DATE__', $dateStr)
    $page = $page.Replace('__CTA_LINK__', $ctaLink)
    $page = $page.Replace('__CTA_TEXT__', $ctaText)
    $page = $page.Replace('__CATEGORY__', $cat)
    $page = $page.Replace('__TITLE__', $title)
    $page = $page.Replace('__CONTENT_HTML__', (Clean-ArticleContent $content))
    $page = $page.Replace('__RELATED_SECTION__', $postRelatedHtml)

    $outPath = Join-Path $rootDir "posts\$id.html"
    [System.IO.File]::WriteAllText($outPath, $page, [System.Text.Encoding]::UTF8)

    $sitemapUrls.Add([PSCustomObject]@{
        loc = $canonical
        lastmod = $dateStr
        changefreq = "weekly"
        priority = "0.85"
    })
}
Write-Host "Posts generated: $($reports.Count)"

# 7. Generate sitemap.xml
Write-Host "Generating sitemap.xml with $($sitemapUrls.Count) URLs..."
$xmlLines = New-Object System.Collections.Generic.List[string]
$xmlLines.Add('<?xml version="1.0" encoding="UTF-8"?>')
$xmlLines.Add('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')

foreach ($u in $sitemapUrls) {
    $xmlLines.Add('  <url>')
    $xmlLines.Add("    <loc>$($u.loc)</loc>")
    $xmlLines.Add("    <lastmod>$($u.lastmod)</lastmod>")
    $xmlLines.Add("    <changefreq>$($u.changefreq)</changefreq>")
    $xmlLines.Add("    <priority>$($u.priority)</priority>")
    $xmlLines.Add('  </url>')
}
$xmlLines.Add('</urlset>')

$sitemapPath = Join-Path $rootDir "sitemap.xml"
[System.IO.File]::WriteAllLines($sitemapPath, $xmlLines, [System.Text.Encoding]::UTF8)
Write-Host "Successfully generated sitemap.xml with $($sitemapUrls.Count) entries!"
