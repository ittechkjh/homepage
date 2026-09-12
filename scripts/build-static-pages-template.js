/**
 * Static SEO & AdSense Content Page Generator
 * Generates standalone static HTML pages for:
 * 1. 13 Crypto & Yearend Tax Knowledge Guides (in /guides)
 * 2. 5 Calculator Mathematical & Usage Guides (in /calculators)
 * 3. All Daily Market Reports & Perspective Posts from data/daily-market-reports.json (in /posts)
 * 4. Regenerates sitemap.xml listing all canonical pages
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
const guidesDir = path.join(rootDir, 'guides');
const calcsDir = path.join(rootDir, 'calculators');
const postsDir = path.join(rootDir, 'posts');
const sitemapFile = path.join(rootDir, 'sitemap.xml');
const reportsFile = path.join(dataDir, 'daily-market-reports.json');

// Ensure output directories exist
[guidesDir, calcsDir, postsDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Common Page Template
function renderPage({
  title,
  metaTitle,
  description,
  keywords,
  canonicalUrl,
  category,
  date,
  author = 'CrytoPnL 리서치팀',
  contentHtml,
  ctaText = 'CrytoPnL 실전 앱 바로가기',
  ctaLink = 'https://crytopnl.com/',
  relatedItems = []
}) {
  const fullTitle = metaTitle || `${title} | CrytoPnL`;
  const formattedDate = date || '2026-09-13';

  const relatedHtml = relatedItems.map(item => `
    <a href="${item.url}" class="group p-4 bg-navy-950/80 hover:bg-navy-900 border border-navy-800 hover:border-cyan-500/40 rounded-2xl transition flex flex-col justify-between">
      <div class="space-y-1.5">
        <span class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">${item.badge || '가이드'}</span>
        <h4 class="text-sm font-bold text-white group-hover:text-cyan-300 transition line-clamp-2">${item.title}</h4>
      </div>
      <span class="text-[11px] text-slate-400 mt-3 flex items-center gap-1">읽어보기 <i data-lucide="arrow-right" class="w-3 h-3"></i></span>
    </a>
  `).join('\n');

  return `<!DOCTYPE html>
<html lang="ko" class="theme-light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${fullTitle}</title>
  <meta name="description" content="${description}">
  <meta name="keywords" content="${keywords}">
  <meta name="author" content="${author}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${canonicalUrl}">

  <!-- Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:title" content="${fullTitle}">
  <meta property="og:description" content="${description}">
  <meta property="og:site_name" content="CrytoPnL">
  <meta property="og:locale" content="ko_KR">

  <!-- Twitter Card -->
  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:url" content="${canonicalUrl}">
  <meta property="twitter:title" content="${fullTitle}">
  <meta property="twitter:description" content="${description}">

  <!-- Google AdSense -->
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8506585033551011" crossorigin="anonymous"></script>

  <!-- Schema.org JSON-LD -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "${title.replace(/"/g, '\\"')}",
    "description": "${description.replace(/"/g, '\\"')}",
    "author": {
      "@type": "Organization",
      "name": "CrytoPnL"
    },
    "publisher": {
      "@type": "Organization",
      "name": "CrytoPnL",
      "url": "https://crytopnl.com/"
    },
    "datePublished": "${formattedDate}",
    "dateModified": "${formattedDate}",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "${canonicalUrl}"
    }
  }
  </script>

  <!-- Tailwind & Lucide -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            navy: {
              800: '#1e293b',
              900: '#0f172a',
              950: '#070c18'
            }
          }
        }
      }
    }
  </script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    body { background-color: #050811; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
    .prose-content p { margin-bottom: 1.15rem; line-height: 1.85; font-size: 0.975rem; color: #cbd5e1; }
    .prose-content h2 { font-size: 1.35rem; font-weight: 800; color: #ffffff; margin-top: 2rem; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem; }
    .prose-content h3 { font-size: 1.15rem; font-weight: 700; color: #38bdf8; margin-top: 1.5rem; margin-bottom: 0.5rem; }
    .prose-content ul, .prose-content ol { margin-left: 1.25rem; margin-bottom: 1.25rem; }
    .prose-content li { margin-bottom: 0.4rem; line-height: 1.7; color: #cbd5e1; font-size: 0.95rem; }
    .prose-content strong { color: #f8fafc; }
  </style>
</head>
<body class="min-h-screen flex flex-col">

  <!-- Header -->
  <header class="sticky top-0 z-50 bg-navy-950/90 backdrop-blur-md border-b border-navy-800">
    <div class="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
      <a href="https://crytopnl.com/" class="flex items-center gap-2 text-white font-extrabold text-lg tracking-tight">
        <span class="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-xs text-white font-black">CP</span>
        <span>CrytoPnL <span class="text-cyan-400 font-mono text-xs">PRO</span></span>
      </a>
      <div class="hidden sm:flex items-center gap-4 text-xs font-semibold text-slate-300">
        <a href="https://crytopnl.com/#/calculators" class="hover:text-cyan-400 transition">⚡ 실전 계산기</a>
        <a href="https://crytopnl.com/#/analyzer" class="hover:text-cyan-400 transition">📊 엑셀 손익분석</a>
        <a href="https://crytopnl.com/#/forum" class="hover:text-cyan-400 transition">💬 투자 포럼</a>
        <a href="https://crytopnl.com/#/guides" class="text-cyan-400">📚 지식 백서</a>
      </div>
      <a href="${ctaLink}" class="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-navy-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition flex items-center gap-1">
        <span>${ctaText}</span>
        <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
      </a>
    </div>
  </header>

  <!-- Breadcrumbs -->
  <div class="max-w-5xl mx-auto px-4 py-3 w-full text-xs text-slate-400 flex items-center gap-2 border-b border-navy-800/40">
    <a href="https://crytopnl.com/" class="hover:text-white transition">홈</a>
    <span>/</span>
    <span class="text-cyan-400 font-medium">${category}</span>
  </div>

  <!-- Main Container -->
  <main class="max-w-4xl mx-auto px-4 py-8 flex-1 w-full space-y-6">

    <!-- Top Article Header -->
    <div class="space-y-3 pb-6 border-b border-navy-800">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xs font-bold">${category}</span>
        <span class="text-xs text-slate-400 flex items-center gap-1 font-mono"><i data-lucide="calendar" class="w-3 h-3"></i> ${formattedDate}</span>
        <span class="text-xs text-slate-400 flex items-center gap-1"><i data-lucide="user" class="w-3 h-3"></i> ${author}</span>
      </div>
      <h1 class="text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight">${title}</h1>
      <p class="text-sm text-slate-300 leading-relaxed font-medium">${description}</p>
    </div>

    <!-- AdSense Slot 1: Top Banner -->
    <div class="my-4">
      <ins class="adsbygoogle block"
           style="display:block"
           data-ad-client="ca-pub-8506585033551011"
           data-ad-slot="auto"
           data-ad-format="auto"
           data-full-width-responsive="true"></ins>
      <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
    </div>

    <!-- Article Content -->
    <article class="prose-content bg-navy-900/60 border border-navy-800 rounded-3xl p-6 sm:p-8 shadow-xl">
      ${contentHtml}
    </article>

    <!-- AdSense Slot 2: Bottom In-Article -->
    <div class="my-6">
      <ins class="adsbygoogle block"
           style="display:block; text-align:center;"
           data-ad-layout="in-article"
           data-ad-format="fluid"
           data-ad-client="ca-pub-8506585033551011"
           data-ad-slot="auto"></ins>
      <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
    </div>

    <!-- Interactive CTA Card -->
    <div class="p-6 rounded-3xl bg-gradient-to-r from-cyan-950/60 via-navy-900 to-indigo-950/60 border border-cyan-500/30 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
      <div class="space-y-1 text-center sm:text-left">
        <h3 class="text-lg font-black text-white">직접 내 자산으로 테스트해 보세요</h3>
        <p class="text-xs text-slate-300">서버 전송 0%! 브라우저 안에서 1초 만에 완료되는 안전한 로컬 분석기</p>
      </div>
      <a href="${ctaLink}" class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-navy-950 font-black text-xs shadow-xl shadow-cyan-500/20 transition shrink-0 flex items-center gap-1.5">
        <span>${ctaText}</span>
        <i data-lucide="arrow-right" class="w-4 h-4"></i>
      </a>
    </div>

    <!-- Related Articles Grid -->
    ${relatedItems.length > 0 ? `
    <div class="pt-6 border-t border-navy-800 space-y-4">
      <h3 class="text-base font-bold text-white flex items-center gap-2">
        <i data-lucide="compass" class="w-4 h-4 text-cyan-400"></i>
        <span>함께 읽으면 좋은 추천 가이드 & 리포트</span>
      </h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        ${relatedHtml}
      </div>
    </div>
    ` : ''}

  </main>

  <!-- Footer -->
  <footer class="bg-navy-950 border-t border-navy-800 py-8 text-xs text-slate-500 mt-auto">
    <div class="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
      <div class="space-y-1">
        <div class="font-bold text-slate-400">CrytoPnL — 대한민국 1등 가상자산 퀀트 &amp; 회계 분석 플랫폼</div>
        <p class="text-[11px] text-slate-500">본 사이트에서 제공하는 모든 시뮬레이션 및 데이터는 참고용이며, 투자 권유나 세무 대행이 아닙니다.</p>
      </div>
      <div class="flex items-center gap-3 text-slate-400 text-xs">
        <a href="https://crytopnl.com/#/legal?tab=privacy" class="hover:text-white transition">개인정보처리방침</a>
        <span>•</span>
        <a href="https://crytopnl.com/#/legal?tab=terms" class="hover:text-white transition">이용약관</a>
        <span>•</span>
        <a href="https://crytopnl.com/#/legal?tab=about" class="hover:text-white transition">사이트 소개</a>
      </div>
    </div>
    <div class="text-center text-[10px] text-slate-600 mt-4">
      © 2026 CrytoPnL. All rights reserved.
    </div>
  </footer>

  <script>
    if (typeof lucide !== 'undefined') lucide.createIcons();
  </script>
</body>
</html>`;
}

module.exports = {
  renderPage,
  rootDir,
  dataDir,
  guidesDir,
  calcsDir,
  postsDir,
  sitemapFile,
  reportsFile
};
