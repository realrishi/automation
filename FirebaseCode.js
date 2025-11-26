const functions = require("firebase-functions");
const { chromium } = require("playwright-chromium"); // smaller than full playwright

async function runOnce() {
  const EMAIL = functions.config().naukri.email;
  const PASSWORD = functions.config().naukri.password;

  const browser = await chromium.launch({
    headless: true,
    args: ["--ignore-certificate-errors","--no-sandbox","--disable-dev-shm-usage"]
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log("Opening login page...");
    await page.goto("https://www.naukri.com/nlogin/login", { timeout: 60000 });

    await page.fill("#usernameField", EMAIL);
    await page.fill("#passwordField", PASSWORD);
    await Promise.all([
      page.waitForNavigation({ timeout: 30000 }).catch(()=>{}),
      page.click("button[type='submit']")
    ]);

    await page.waitForSelector("div#header", { timeout: 15000 }).catch(()=>{});

    let profilePage = page;
    const pages = context.pages();
    if (pages.length > 1) profilePage = pages[pages.length - 1];

    await profilePage.goto("https://www.naukri.com/mnjuser/profile", {
      timeout: 60000,
      waitUntil: "domcontentloaded"
    });
    await profilePage.waitForURL(/mnjuser\/profile/i, { timeout: 30000 }).catch(()=>{});

    await profilePage.goto("https://www.naukri.com/mnjuser/profile?action=modalOpen", {
      timeout: 60000,
      waitUntil: "domcontentloaded"
    });
    await profilePage.waitForURL(/action=modalOpen/i, { timeout: 30000 }).catch(()=>{});

    const editIcon = profilePage.locator("em.icon.edit").first();
    if (await editIcon.count()) {
      await editIcon.click({ timeout: 5000 }).catch(async () => {
        await editIcon.click({ force: true });
      });
    }

    const saveBtn = profilePage.locator("#saveBasicDetailsBtn");
    if (await saveBtn.count()) {
      await saveBtn.waitFor({ state: "visible", timeout: 8000 }).catch(()=>{});
      await saveBtn.click({ timeout: 5000 }).catch(async () => {
        await saveBtn.click({ force: true });
      });
    }

    console.log("✅ Done");
  } catch (e) {
    console.error("❌ ERROR:", e);
    throw e;
  } finally {
    await browser.close();
  }
}

// HTTP trigger (manual or Cloud Scheduler HTTP)
exports.naukriAutomation = functions
  .runWith({ timeoutSeconds: 300, memory: "1GB" })
  .https.onRequest(async (_req, res) => {
    try {
      await runOnce();
      res.send("OK");
    } catch (e) {
      res.status(500).send("FAIL");
    }
  });

// Scheduled (automatic)
exports.naukriAutomationScheduled = functions
  .runWith({ timeoutSeconds: 300, memory: "1GB" })
  .pubsub.schedule("every 24 hours") // change to "every 60 minutes" if needed
  .timeZone("Asia/Kolkata")
  .onRun(async () => {
    await runOnce();
  });