const { chromium } = require("playwright");

const EMAIL = "rishiraj.pal.work@gmail.com";
const PASSWORD = "Rishi@276";

async function runOnce() {
  const browser = await chromium.launch({
    headless: false,
    args: ["--ignore-certificate-errors"]
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // ...existing code...
    console.log("Opening login page...");
    await page.goto("https://www.naukri.com/nlogin/login", {
      timeout: 60000,
      ignoreHTTPSErrors: true
    });

    await page.fill("#usernameField", EMAIL);
    await page.fill("#passwordField", PASSWORD);
    await Promise.all([
      page.waitForNavigation({ timeout: 30000 }),
      page.click("button[type='submit']")
    ]);

    console.log("Login submitted, waiting for dashboard...");
    await page.waitForSelector("div#header", { timeout: 20000 }).catch(() => {
      console.log("Dashboard header not found, maybe opened in new tab.");
    });

    let profilePage = page;
    const pages = context.pages();
    if (pages.length > 1) {
      profilePage = pages[pages.length - 1];
      console.log("Found new tab for dashboard, switching...");
    }

    console.log("Navigating to Profile page...");
    await profilePage.goto("https://www.naukri.com/mnjuser/profile", {
      timeout: 60000,
      waitUntil: "domcontentloaded",
      ignoreHTTPSErrors: true
    });
    await profilePage.waitForURL(/mnjuser\/profile(?:\?.*)?$/i, { timeout: 30000 });

    console.log("Redirecting to modalOpen URL...");
    await profilePage.goto("https://www.naukri.com/mnjuser/profile?action=modalOpen", {
      timeout: 60000,
      waitUntil: "domcontentloaded",
      ignoreHTTPSErrors: true
    });
    await profilePage.waitForURL(/mnjuser\/profile\?action=modalOpen/i, { timeout: 30000 });

    console.log("Locating Edit icon (editOneTheme)...");
    const editIcon = profilePage.locator("em.icon.edit").filter({ hasText: /editOneTheme/i });

    let clicked = false;
    try {
      await editIcon.first().waitFor({ state: "visible", timeout: 7000 });
      await editIcon.first().scrollIntoViewIfNeeded();
      await editIcon.first().click({ timeout: 5000 });
      clicked = true;
      console.log("Clicked edit icon via filtered locator.");
    } catch {}

    if (!clicked) {
      const textNode = profilePage.getByText(/editOneTheme/i).first();
      try {
        await textNode.waitFor({ state: "visible", timeout: 5000 });
        const siblingIcon = textNode.locator("xpath=preceding-sibling::em[contains(@class,'icon')][contains(@class,'edit')] | following-sibling::em[contains(@class,'icon')][contains(@class,'edit')]").first();
        await siblingIcon.scrollIntoViewIfNeeded();
        await siblingIcon.click({ timeout: 5000 });
        clicked = true;
        console.log("Clicked edit icon via text sibling.");
      } catch {}
    }

    if (!clicked) {
      const genericEditIcon = profilePage.locator("em.icon.edit").first();
      try {
        await genericEditIcon.waitFor({ state: "visible", timeout: 5000 });
        await genericEditIcon.scrollIntoViewIfNeeded();
        await genericEditIcon.click({ timeout: 5000 });
        clicked = true;
        console.log("Clicked generic first edit icon.");
      } catch {}
    }

    if (!clicked) {
      for (const frame of profilePage.frames()) {
        const frameIcon = frame.locator("em.icon.edit").filter({ hasText: /editOneTheme/i }).first();
        if (await frameIcon.count()) {
          try {
            await frameIcon.waitFor({ state: "visible", timeout: 5000 });
            await frameIcon.scrollIntoViewIfNeeded();
            await frameIcon.click({ timeout: 5000 });
            clicked = true;
            console.log("Clicked edit icon inside iframe.");
            break;
          } catch {}
        }
      }
    }

    if (!clicked) {
      try {
        await editIcon.first().click({ timeout: 3000, force: true });
        clicked = true;
        console.log("Force-clicked edit icon.");
      } catch {
        const htmlSnippets = await profilePage.locator("em.icon.edit").evaluateAll(nodes => nodes.map(n => n.outerHTML));
        console.log("Edit icons found (outerHTML):", htmlSnippets);
        throw new Error("Edit icon (editOneTheme) not clickable.");
      }
    }

    await profilePage.waitForSelector("#saveBasicDetailsBtn", { timeout: 15000 }).catch(() => {});
    await profilePage.waitForTimeout(500);

    console.log("Clicking Save...");
    const saveBtn = profilePage.locator("#saveBasicDetailsBtn");
    await saveBtn.waitFor({ state: "visible", timeout: 10000 });
    await saveBtn.scrollIntoViewIfNeeded();
    await profilePage.waitForFunction(
      el => !el.hasAttribute("disabled") && !el.classList.contains("disabled"),
      saveBtn,
      { timeout: 10000 }
    ).catch(() => {});
    try {
      await saveBtn.click({ timeout: 8000 });
    } catch {
      await saveBtn.click({ timeout: 8000, force: true });
    }

    console.log("✅ Profile updated successfully!");
  } catch (error) {
    console.error("❌ ERROR:", error);
  } finally {
    await browser.close();
  }
}

// Run immediately, then every hour
(async () => {
  await runOnce();
  setInterval(async () => {
    try {
      await runOnce();
    } catch (e) {
      console.error("Run failed:", e);
    }
  }, 60 * 60 * 1000); // 1 hour
})();