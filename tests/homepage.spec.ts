import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("should load homepage successfully", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/neural-coding/i);
  });

  test("should have navigation links", async ({ page }) => {
    await page.goto("/");

    const homeLink = page.locator('a[href="/"]');
    const playgroundLink = page.locator('a[href="/playground/"]');
    const learnLink = page.locator('a[href="/learn"]');
    const apiLink = page.locator('a[href="/api/"]');

    await expect(homeLink).toBeVisible();
    await expect(playgroundLink).toBeVisible();
    await expect(learnLink).toBeVisible();
    await expect(apiLink).toBeVisible();
  });

  test("should have main heading", async ({ page }) => {
    await page.goto("/");
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();
  });

  test("should be responsive", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
  });
});
