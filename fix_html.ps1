$files = @('e:\HOMEPAGE\index.html', 'e:\HOMEPAGE\preview.html')
foreach ($file in $files) {
    $html = Get-Content $file -Raw -Encoding UTF8
    
    # Analyzer
    $html = $html -replace '<span class="text-cyan-400 font-bold">44%</span>', '<span id="admin-feat-analyzer-pct" class="text-cyan-400 font-bold">44%</span>'
    $html = $html -replace '<div class="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" style="width: 44%;"></div>', '<div id="admin-feat-analyzer-bar" class="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" style="width: 44%;"></div>'
    
    # Market
    $html = $html -replace '<span class="text-purple-400 font-bold">27%</span>', '<span id="admin-feat-market-pct" class="text-purple-400 font-bold">27%</span>'
    $html = $html -replace '<div class="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" style="width: 27%;"></div>', '<div id="admin-feat-market-bar" class="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" style="width: 27%;"></div>'
    
    # News
    $html = $html -replace '<span class="text-amber-400 font-bold">18%</span>', '<span id="admin-feat-news-pct" class="text-amber-400 font-bold">18%</span>'
    $html = $html -replace '<div class="h-full bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full" style="width: 18%;"></div>', '<div id="admin-feat-news-bar" class="h-full bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full" style="width: 18%;"></div>'
    
    # Community
    $html = $html -replace '<span class="text-emerald-400 font-bold">11%</span>', '<span id="admin-feat-community-pct" class="text-emerald-400 font-bold">11%</span>'
    $html = $html -replace '<div class="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" style="width: 11%;"></div>', '<div id="admin-feat-community-bar" class="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" style="width: 11%;"></div>'

    # Mobile
    $html = $html -replace '<div class="text-xl font-extrabold text-cyan-400">64\.2%</div>', '<div id="admin-dev-mobile-pct" class="text-xl font-extrabold text-cyan-400">64.2%</div>'
    
    # Desktop
    $html = $html -replace '<div class="text-xl font-extrabold text-purple-400">35\.8%</div>', '<div id="admin-dev-desktop-pct" class="text-xl font-extrabold text-purple-400">35.8%</div>'

    Set-Content $file $html -Encoding UTF8
}
