const fs = require('fs');

['index.html', 'preview.html'].forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  let html = fs.readFileSync(filePath, 'utf8');

  // Match and remove the orphaned guide fragment before SheetJS script tag
  const orphanPattern = /<button onclick="closeExcelGuideModal\(\)"[\s\S]*?<!-- SheetJS Excel Library -->/;
  
  if (orphanPattern.test(html)) {
    html = html.replace(orphanPattern, '<!-- SheetJS Excel Library -->');
    fs.writeFileSync(filePath, html, 'utf8');
    console.log('SUCCESS: Removed orphaned guide fragment from ' + filePath);
  } else {
    console.warn('Pattern not matched in ' + filePath);
  }
});
