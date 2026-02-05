import { test, expect } from "@playwright/test";

test.describe("Learn Section", () => {
  test("should load learn index page", async ({ page }) => {
    await page.goto("/learn");
    await expect(page).toHaveTitle(/learn/i);
  });

  test("should display article list", async ({ page }) => {
    await page.goto("/learn");

    // Check for main heading
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();

    // Check if articles are displayed (if any exist)
    const articles = page.locator(".card");
    const count = await articles.count();

    if (count > 0) {
      await expect(articles.first()).toBeVisible();
    }
  });

  test("should navigate to article detail", async ({ page }) => {
    await page.goto("/learn");

    // Find first article link
    const articleLinks = page.locator('a[href^="/learn/"]');
    const count = await articleLinks.count();

    if (count > 0) {
      const firstLink = articleLinks.first();
      await firstLink.click();

      // Should navigate to article detail page
      await expect(page).toHaveURL(/\/learn\/.+/);

      // Should have article content
      const content = page.locator("body");
      await expect(content).toBeVisible();
    }
  });

  test("should have navigation back to home", async ({ page }) => {
    await page.goto("/learn");

    const homeLink = page.locator('a[href="/"]');
    await expect(homeLink).toBeVisible();

    await homeLink.click();
    await expect(page).toHaveURL("/");
  });

  test("should handle non-existent article", async ({ page }) => {
    const response = await page.goto("/learn/nonexistent-article-12345");
    expect(response?.status()).toBe(404);
  });
});
