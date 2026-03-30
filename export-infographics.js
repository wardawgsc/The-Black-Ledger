const { chromium } = require('playwright-core');
const path = require('path');

const infographics = [
  'SnareBears_4.2_Infographic.html',
  'SnareBears_4.3_Infographic.html',
  'SnareBears_4.4_Infographic.html',
  'SnareBears_4.5_Infographic.html',
  'SnareBears_4.6_Infographic.html'
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Set viewport wide enough — infographics are 1200px fixed width
  await page.setViewportSize({ width: 1280, height: 900 });

  for (const file of infographics) {
    const filePath = path.resolve(__dirname, 'infographics', file);
    const outPath = path.resolve(__dirname, 'infographics', file.replace('.html', '.png'));

    console.log(`Rendering: ${file}`);
    await page.goto(`file:///${filePath.replace(/\\/g, '/')}`);

    // Wait for Google Fonts to load (or time out gracefully)
    await page.waitForLoadState('networkidle').catch(() => {});
    // Extra settle time for images
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: outPath,
      fullPage: true,
    });

    console.log(`  Saved: ${path.basename(outPath)}`);
  }

  await browser.close();
  console.log('\nAll done!');
})();
