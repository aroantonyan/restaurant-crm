const { chromium } = require('playwright');

const REPO = 'aroantonyan/restaurantcrm';

(async () => {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 300,
    executablePath: '/Applications/Arc.app/Contents/MacOS/Arc',
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('\n=== Step 1: GitHub Login ===');
  await page.goto('https://github.com/login');
  console.log('Log in to GitHub, then the script will continue automatically...');
  await page.waitForURL('https://github.com/**', { waitUntil: 'networkidle', timeout: 120_000 });
  // Wait until we're past the login page
  await page.waitForFunction(() => !location.pathname.startsWith('/login') && !location.pathname.startsWith('/session'), { timeout: 120_000 });
  console.log('Logged in.');

  console.log('\n=== Step 2: Install Claude GitHub App ===');
  await page.goto('https://github.com/apps/claude/installations/new');
  console.log('Select your account / repository and click Install. Waiting...');
  // Wait until redirected away from the installations page (install complete)
  await page.waitForFunction(
    () => !location.pathname.includes('/installations/new') && !location.pathname.includes('/installations/select_target'),
    { timeout: 300_000 }
  );
  console.log('App installed.');

  console.log('\n=== Step 3: Add ANTHROPIC_API_KEY secret ===');
  await page.goto(`https://github.com/${REPO}/settings/secrets/actions/new`);
  console.log(`Opened secrets page for ${REPO}.`);
  console.log('Fill in Name = ANTHROPIC_API_KEY and paste your key, then click Add secret.');
  await page.waitForURL(`https://github.com/${REPO}/settings/secrets/actions`, { timeout: 300_000 });
  console.log('Secret saved.');

  console.log('\n=== Step 4: Create workflow file ===');
  // Fetch the example workflow content
  const wfPage = await context.newPage();
  await wfPage.goto('https://raw.githubusercontent.com/anthropics/claude-code-action/main/examples/claude.yml');
  const workflowContent = await wfPage.locator('body').innerText();
  await wfPage.close();

  const fs = require('fs');
  const path = require('path');
  const workflowDir = path.join(__dirname, 'src', '.github', 'workflows');
  fs.mkdirSync(workflowDir, { recursive: true });
  fs.writeFileSync(path.join(workflowDir, 'claude.yml'), workflowContent);
  console.log(`Workflow written to src/.github/workflows/claude.yml`);

  console.log('\nAll done! Commit and push .github/workflows/claude.yml to finish setup.');
  await browser.close();
})();
