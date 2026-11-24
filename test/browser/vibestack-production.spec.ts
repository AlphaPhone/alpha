import { expect, test, type Page } from "@playwright/test";
import { contentSecurityProblems } from "../../scripts/audit-production-bundle.ts";

test.describe.configure({ timeout: 60_000 });

async function openSettings(page: Page) {
  await page.getByRole("region", { name: "Home", exact: true }).getByRole("button", { name: "Settings", exact: true }).click();
  const settings = page.getByRole("main", { name: "Settings", exact: true });
  await expect(settings.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
  return settings;
}

test.beforeEach(async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  await page.route("**/*", (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
});

test("the production preview serves its flag and content policy without a browser speech manifest", async ({ request }) => {
  const flags = await request.get("/build-flags.json");
  expect(flags.ok()).toBe(true);
  expect(await flags.json()).toEqual({ testMocks: false });
  const index = await request.get("/");
  expect(index.ok()).toBe(true);
  expect(contentSecurityProblems(await index.text())).toEqual([]);
  // The preview answers an old speech manifest address with the SPA, never a model manifest.
  const speech = await request.get("/browser-speech/manifest.json");
  expect(speech.headers()["content-type"]).not.toContain("application/json");
});

for (const query of ["mode=mock", "fixture=1&start=inbox", "mode=dev&start=wallet&tools=1", "mode=dev&workflows=agent&start=workflows&theme=dark"]) {
  test(`production ignores development entry parameters ${query}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/?${query}`);
    const settings = await openSettings(page);
    await expect(settings.getByRole("button", { name: /^Account\b/ })).toBeVisible();
    await expect(settings.getByRole("button", { name: "Developer", exact: true })).toHaveCount(0);
    await expect(page.getByText("Device controls", { exact: true })).toHaveCount(0);
    await expect(page.getByText(/mock mode/i)).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test("the owner can save a theme and read it again after restarting the production renderer", async ({ page }) => {
  await page.goto("/");
  const display = async () => {
    const settings = await openSettings(page);
    await settings.getByRole("button", { name: "General", exact: true }).click();
    await settings.getByRole("button", { name: "Display", exact: true }).click();
    return settings.getByRole("radio", { name: "Theme: Dark", exact: true });
  };
  await (await display()).click();
  await expect(page.locator("[data-alpha-screen]")).toHaveClass(/\bdark\b/);
  await page.reload();
  await expect(await display()).toHaveAttribute("aria-checked", "true");
  await expect(page.locator("[data-alpha-screen]")).toHaveClass(/\bdark\b/);
});

test("the delegation landing cleans the address and offers only the app-bound return", async ({ page }) => {
  const state = "A".repeat(43);
  await page.goto(`/delegation-return?state=${state}&code=fixture-code`);
  await expect(page.getByRole("heading", { name: "Return to Alpha Phone" })).toBeVisible();
  await expect(page).toHaveURL(/\/delegation-return#delegation-return$/);
  await expect(page.getByRole("link", { name: "Continue in Alpha Phone" })).toHaveAttribute("href", `alphaphone://cloud-delegation?state=${state}&code=fixture-code`);
  await page.reload();
  await expect(page.getByText(/This page was reopened/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Continue in Alpha Phone" })).toHaveCount(0);

  await page.goto(`/delegation-return?state=${state}&code=fixture-code&redirect=https%3A%2F%2Fexample.test`);
  await expect(page.getByText(/This return link is invalid/)).toBeVisible();
  await expect(page).toHaveURL(/\/delegation-return#delegation-return$/);
  await expect(page.getByRole("link", { name: "Continue in Alpha Phone" })).toHaveCount(0);
});
