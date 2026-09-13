/**
 * CrytoPnL Static Page & Sitemap Generator (Node.js)
 * Designed for automated execution in GitHub Actions workflows.
 * Reads:
 *   - scripts/page-template.html
 *   - data/static-seo-articles.json
 *   - data/daily-market-reports.json
 *   - Firestore REST API (live user forum posts)
 * Generates:
 *   - calculators/*.html
 *   - guides/*.html
 *   - posts/*.html
 *   - sitemap.xml
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const templatePath = path.join(rootDir, 'scripts', 'page-template.html');
const seoArticlesPath = path.join(rootDir, 'data', 'static-seo-articles.json');
const reportsPath = path.join(rootDir, 'data', 'daily-market-reports.json');
const sitemapPath = path.join(rootDir, 'sitemap.xml');

// Ensure output directories
['calculators', 'guides', 'posts'].forEach(dir => {
  const p = path.join(rootDir, dir);
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
  }
});

function readJsonSafely(filePath, defaultValue = {}) {
  try {
    if (!fs.existsSync(filePath)) return defaultValue;
    const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '').trim();
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`[build-static-pages] Warning parsing ${filePath}:`, e.message);
    return defaultValue;
  }
}

const template = fs.readFileSync(templatePath, 'utf8');
const seoData = readJsonSafely(seoArticlesPath, {});
const repData = readJsonSafely(reportsPath, { reports: [] });

const today = new Date().toISOString().split('T')[0];
const sitemapUrls = [];

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function escapeJson(str) {
  if (!str) return '';
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ').replace(/\r/g, '');
}

// Add Root
sitemapUrls.push({
  loc: 'https://crytopnl.com/',
  lastmod: today,
  changefreq: 'daily',
  priority: '1.0'
});

// Add Standalone Legal & Policy pages
const legalPages = ['privacy.html', 'terms.html', 'about.html', 'contact.html'];
legalPages.forEach(lp => {
  sitemapUrls.push({
    loc: `https://crytopnl.com/${lp}`,
    lastmod: today,
    changefreq: 'monthly',
    priority: '0.8'
  });
});

const calcRelatedHtml = `
    <section class="related-section-border mt-8 pt-6 border-t border-navy-800">
      <h3 class="related-title text-base font-bold text-white mb-4 flex items-center gap-2">
        <i data-lucide="book-open" class="w-4 h-4 text-cyan-400"></i>
        함께 읽으면 좋은 추천 가이드
      </h3>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <a href="https://crytopnl.com/guides/crypto-tax-deduction.html" class="related-card p-4 rounded-2xl bg-navy-900/80 border border-navy-800 hover:border-cyan-500/50 transition flex flex-col justify-between">
          <span class="text-xs text-cyan-400 font-bold mb-1">세무 가이드</span>
          <h4 class="text-xs font-bold text-white line-clamp-2">2026 가상자산 소득세 22% & 기본공제 5,000만원 절세 전략</h4>
          <span class="text-[11px] text-slate-500 mt-2">자세히 보기 &rarr;</span>
        </a>
        <a href="https://crytopnl.com/guides/kimchi-premium-arbitrage.html" class="related-card p-4 rounded-2xl bg-navy-900/80 border border-navy-800 hover:border-cyan-500/50 transition flex flex-col justify-between">
          <span class="text-xs text-cyan-400 font-bold mb-1">차익거래 전략</span>
          <h4 class="text-xs font-bold text-white line-clamp-2">김치프리미엄(김프) 매매 기법과 실전 헤징 가이드</h4>
          <span class="text-[11px] text-slate-500 mt-2">자세히 보기 &rarr;</span>
        </a>
        <a href="https://crytopnl.com/guides/water-drop-break-even.html" class="related-card p-4 rounded-2xl bg-navy-900/80 border border-navy-800 hover:border-cyan-500/50 transition flex flex-col justify-between">
          <span class="text-xs text-cyan-400 font-bold mb-1">매매 전략</span>
          <h4 class="text-xs font-bold text-white line-clamp-2">물타기 & 불타기(DCA) 평단가 탈출 전략 및 분할 매도 원칙</h4>
          <span class="text-[11px] text-slate-500 mt-2">자세히 보기 &rarr;</span>
        </a>
      </div>
    </section>
`;

const guideRelatedHtml = `
    <section class="related-section-border mt-8 pt-6 border-t border-navy-800">
      <h3 class="related-title text-base font-bold text-white mb-4 flex items-center gap-2">
        <i data-lucide="calculator" class="w-4 h-4 text-cyan-400"></i>
        직접 계산해보기: 추천 실전 계산기
      </h3>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <a href="https://crytopnl.com/calculators/crypto-tax.html" class="related-card p-4 rounded-2xl bg-navy-900/80 border border-navy-800 hover:border-cyan-500/50 transition flex flex-col justify-between">
          <span class="text-xs text-cyan-400 font-bold mb-1">세무 계산기</span>
          <h4 class="text-xs font-bold text-white line-clamp-2">2026 가상자산 양도소득세 정밀 계산기</h4>
          <span class="text-[11px] text-slate-500 mt-2">계산기 실행 &rarr;</span>
        </a>
        <a href="https://crytopnl.com/calculators/average-down.html" class="related-card p-4 rounded-2xl bg-navy-900/80 border border-navy-800 hover:border-cyan-500/50 transition flex flex-col justify-between">
          <span class="text-xs text-cyan-400 font-bold mb-1">물타기 계산기</span>
          <h4 class="text-xs font-bold text-white line-clamp-2">코인 물타기 & 탈출 평단가 계산기</h4>
          <span class="text-[11px] text-slate-500 mt-2">계산기 실행 &rarr;</span>
        </a>
        <a href="https://crytopnl.com/calculators/liquidation-price.html" class="related-card p-4 rounded-2xl bg-navy-900/80 border border-navy-800 hover:border-cyan-500/50 transition flex flex-col justify-between">
          <span class="text-xs text-cyan-400 font-bold mb-1">선물 청산가</span>
          <h4 class="text-xs font-bold text-white line-clamp-2">코인 선물 레버리지 격리/교차 강제청산가 계산기</h4>
          <span class="text-[11px] text-slate-500 mt-2">계산기 실행 &rarr;</span>
        </a>
      </div>
    </section>
`;

const postRelatedHtml = `
    <section class="related-section-border mt-8 pt-6 border-t border-navy-800">
      <h3 class="related-title text-base font-bold text-white mb-4 flex items-center gap-2">
        <i data-lucide="trending-up" class="w-4 h-4 text-cyan-400"></i>
        실전 트레이딩 유용한 도구 & 가이드
      </h3>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <a href="https://crytopnl.com/calculators/kimchi-premium.html" class="related-card p-4 rounded-2xl bg-navy-900/80 border border-navy-800 hover:border-cyan-500/50 transition flex flex-col justify-between">
          <span class="text-xs text-cyan-400 font-bold mb-1">실시간 계산기</span>
          <h4 class="text-xs font-bold text-white line-clamp-2">실시간 김치프리미엄 차익 계산기</h4>
          <span class="text-[11px] text-slate-500 mt-2">계산기 실행 &rarr;</span>
        </a>
        <a href="https://crytopnl.com/guides/trading-fees-slippage.html" class="related-card p-4 rounded-2xl bg-navy-900/80 border border-navy-800 hover:border-cyan-500/50 transition flex flex-col justify-between">
          <span class="text-xs text-cyan-400 font-bold mb-1">주문 분석</span>
          <h4 class="text-xs font-bold text-white line-clamp-2">암호화폐 거래 수수료와 슬리피지 관리 전략</h4>
          <span class="text-[11px] text-slate-500 mt-2">가이드 보기 &rarr;</span>
        </a>
        <a href="https://crytopnl.com/#/forum" class="related-card p-4 rounded-2xl bg-navy-900/80 border border-cyan-500/40 hover:border-cyan-400 transition flex flex-col justify-between">
          <span class="text-xs text-amber-400 font-bold mb-1">실시간 토론</span>
          <h4 class="text-xs font-bold text-white line-clamp-2">투자 포럼에서 다른 투자자들과 관점 공유하기</h4>
          <span class="text-[11px] text-cyan-400 mt-2">포럼 이동 &rarr;</span>
        </a>
      </div>
    </section>
`;

function renderPage(tpl, params) {
  return tpl
    .replace(/__FULL_TITLE__/g, params.fullTitle)
    .replace(/__DESCRIPTION__/g, params.desc)
    .replace(/__KEYWORDS__/g, params.keywords)
    .replace(/__AUTHOR__/g, params.author)
    .replace(/__CANONICAL_URL__/g, params.canonical)
    .replace(/__ESCAPED_TITLE__/g, escapeJson(params.title))
    .replace(/__ESCAPED_DESC__/g, escapeJson(params.desc))
    .replace(/__DATE__/g, params.date)
    .replace(/__CTA_LINK__/g, params.ctaLink)
    .replace(/__CTA_TEXT__/g, params.ctaText)
    .replace(/__CATEGORY__/g, params.category)
    .replace(/__TITLE__/g, params.title)
    .replace(/__CONTENT_HTML__/g, params.contentHtml)
    .replace(/__RELATED_SECTION__/g, params.relatedHtml);
}

async function fetchFirestorePosts() {
  try {
    const url = 'https://firestore.googleapis.com/v1/projects/homepage-437c0/databases/(default)/documents/forum_posts?pageSize=100';
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.documents) return [];
    return data.documents.map(doc => {
      const id = doc.name.split('/').pop();
      const f = doc.fields || {};
      const ts = f.timestamp?.integerValue ? parseInt(f.timestamp.integerValue) : parseInt(id) || Date.now();
      return {
        id,
        category: f.category?.stringValue || 'general',
        categoryName: f.categoryName?.stringValue || (f.isNotice?.booleanValue ? '📢 공지사항' : '💬 자유 토론'),
        title: f.title?.stringValue || '포럼 게시글',
        author: f.author?.stringValue || 'CrytoPnL 회원',
        authorRank: f.authorRank?.stringValue || 'Member',
        timestamp: ts,
        time: f.time?.stringValue || new Date(ts).toISOString().replace('T', ' ').substring(0, 16),
        views: f.views?.integerValue ? parseInt(f.views.integerValue) : 150,
        upvotes: f.upvotes?.integerValue ? parseInt(f.upvotes.integerValue) : 10,
        isNotice: f.isNotice?.booleanValue || false,
        content: f.content?.stringValue || '',
        comments: []
      };
    });
  } catch (e) {
    console.warn('[build-static-pages] Firestore live fetch skipped:', e.message);
    return [];
  }
}

async function main() {
  // 1. Calculators
  (seoData.calculators || []).forEach(calc => {
    const canonical = `https://crytopnl.com/calculators/${calc.slug}.html`;
    const html = renderPage(template, {
      fullTitle: `${calc.title} | CrytoPnL 실전 계산기`,
      desc: calc.description,
      keywords: calc.keywords,
      author: 'CrytoPnL 금융공학팀',
      canonical,
      title: calc.title,
      date: today,
      ctaLink: calc.ctaLink,
      ctaText: calc.ctaText,
      category: calc.category,
      contentHtml: calc.contentHtml,
      relatedHtml: calcRelatedHtml
    });
    fs.writeFileSync(path.join(rootDir, 'calculators', `${calc.slug}.html`), html, 'utf8');
    sitemapUrls.push({
      loc: canonical,
      lastmod: today,
      changefreq: 'weekly',
      priority: '0.9'
    });
  });
  console.log(`Calculators generated: ${(seoData.calculators || []).length}`);

  // 2. Guides
  (seoData.guides || []).forEach(guide => {
    const canonical = `https://crytopnl.com/guides/${guide.slug}.html`;
    const html = renderPage(template, {
      fullTitle: `${guide.title} | CrytoPnL 백서`,
      desc: guide.description,
      keywords: guide.keywords,
      author: 'CrytoPnL 퀀트 리서치팀',
      canonical,
      title: guide.title,
      date: today,
      ctaLink: guide.ctaLink,
      ctaText: guide.ctaText,
      category: guide.category,
      contentHtml: guide.contentHtml,
      relatedHtml: guideRelatedHtml
    });
    fs.writeFileSync(path.join(rootDir, 'guides', `${guide.slug}.html`), html, 'utf8');
    sitemapUrls.push({
      loc: canonical,
      lastmod: today,
      changefreq: 'weekly',
      priority: '0.8'
    });
  });
  console.log(`Guides generated: ${(seoData.guides || []).length}`);

  // 3. Forum Posts (Merge local reports with Firestore live posts)
  const existingReports = repData.reports || [];
  const fsPosts = await fetchFirestorePosts();
  
  const postMap = new Map();
  // Firestore posts first
  fsPosts.forEach(p => postMap.set(String(p.id), p));
  // Existing reports
  existingReports.forEach(r => {
    const id = String(r.id);
    if (!postMap.has(id)) {
      postMap.set(id, r);
    }
  });

  const mergedReports = Array.from(postMap.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  mergedReports.forEach(rep => {
    const canonical = `https://crytopnl.com/posts/${rep.id}.html`;
    const plain = stripHtml(rep.content || '');
    const desc = plain.length > 150 ? plain.substring(0, 150) + '...' : `${rep.title} - CrytoPnL 실시간 퀀트 분석 및 온체인 마켓 리포트`;
    
    let dateStr = today;
    if (rep.timestamp && typeof rep.timestamp === 'number') {
      const ts = rep.timestamp > 1000000000000 ? rep.timestamp : rep.timestamp * 1000;
      try {
        dateStr = new Date(ts).toISOString().split('T')[0];
      } catch(e) {}
    } else if (rep.time && /^\d{4}[-.]\d{2}[-.]\d{2}/.test(rep.time)) {
      dateStr = rep.time.substring(0, 10).replace(/\./g, '-');
    }

    const html = renderPage(template, {
      fullTitle: `${rep.title} | CrytoPnL 포럼`,
      desc,
      keywords: '비트코인 시황, 암호화폐 퀀트 분석, 온체인 데이터, 시장 전망, CrytoPnL, BTC USDT',
      author: rep.author || 'AI 퀀트 애널리스트',
      canonical,
      title: rep.title,
      date: dateStr,
      ctaLink: 'https://crytopnl.com/#/forum',
      ctaText: '실시간 지표 & 포럼 참여하기',
      category: rep.categoryName || '시장 분석 리포트',
      contentHtml: rep.content || '',
      relatedHtml: postRelatedHtml
    });
    fs.writeFileSync(path.join(rootDir, 'posts', `${rep.id}.html`), html, 'utf8');

    // Also ensure base date-only alias exists (e.g. report-20260913.html, perspective-20260913.html)
    const baseDateMatch = String(rep.id).match(/^((?:report|perspective)-\d{8})-\d{4}$/);
    if (baseDateMatch) {
      const baseFile = path.join(rootDir, 'posts', `${baseDateMatch[1]}.html`);
      if (!fs.existsSync(baseFile)) {
        fs.writeFileSync(baseFile, html, 'utf8');
      }
    }

    sitemapUrls.push({
      loc: canonical,
      lastmod: dateStr,
      changefreq: 'weekly',
      priority: '0.85'
    });
  });
  console.log(`Posts generated: ${mergedReports.length}`);

  // 4. Sitemap.xml
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...sitemapUrls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`),
    '</urlset>'
  ].join('\n');

  fs.writeFileSync(sitemapPath, xml, 'utf8');
  console.log(`sitemap.xml generated with ${sitemapUrls.length} URLs`);
}

main().catch(err => {
  console.error('[build-static-pages] Execution failed:', err);
  process.exit(1);
});
