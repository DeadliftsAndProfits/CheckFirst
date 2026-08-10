import { test, expect } from "@playwright/test";

test.describe("Check First — landing hero (Round 2)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders hero, logo and tabs", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Know before/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Person" })).toBeVisible();
    await expect(page.getByRole("tablist", { name: /what do you want to check/i })).toBeVisible();
  });

  test("Person default shows name, known location and approximate age", async ({ page }) => {
    await expect(page.getByLabel("First name")).toBeVisible();
    await expect(page.getByLabel("Last name")).toBeVisible();
    await expect(page.getByLabel("Known location")).toBeVisible();
    await expect(page.getByLabel("Approximate age")).toBeVisible();
    // Age bands present.
    await expect(page.getByLabel("Approximate age").locator("option", { hasText: "35–44" })).toHaveCount(1);
    // Optional details hidden by default.
    await expect(page.getByLabel("Employer")).toHaveCount(0);
    await page.getByRole("button", { name: /add optional matching details/i }).click();
    await expect(page.getByLabel("Employer")).toBeVisible();
  });

  test("switching tabs replaces the form (visual stability body present)", async ({ page }) => {
    await expect(page.getByLabel("First name")).toBeVisible();
    await page.getByRole("tab", { name: "Phone" }).click();
    await expect(page.getByLabel("First name")).toHaveCount(0);
    await expect(page.getByPlaceholder("0412 345 678").first()).toBeVisible();
    await page.getByRole("tab", { name: "Website" }).click();
    await expect(page.getByLabel(/Website or domain/i)).toBeVisible();
  });

  test("Business default is simplified (name / ABN-ACN / State); suburb+website behind optional", async ({ page }) => {
    await page.getByRole("tab", { name: "Business" }).click();
    await expect(page.getByLabel("Business / company name")).toBeVisible();
    await expect(page.getByLabel("ABN / ACN")).toBeVisible();
    await expect(page.getByLabel("State")).toBeVisible();
    // Suburb removed from the default business form (R3 §13).
    await expect(page.getByLabel("Suburb / city")).toHaveCount(0);
    await expect(page.getByLabel("Website")).toHaveCount(0);
    await page.getByRole("button", { name: /add optional matching details/i }).click();
    await expect(page.getByLabel("Suburb / city")).toBeVisible();
    await expect(page.getByLabel("Website")).toBeVisible();
  });

  test("Phone tab: add, remove, and value persistence", async ({ page }) => {
    await page.getByRole("tab", { name: "Phone" }).click();
    const first = page.getByPlaceholder("0412 345 678").nth(0);
    await first.fill("0412 345 678");
    await page.getByRole("button", { name: /add another/i }).click();
    const second = page.getByPlaceholder("0412 345 678").nth(1);
    await expect(second).toBeVisible();
    await second.fill("07 3111 2222");
    // Remove the second, first value persists.
    await page.getByRole("button", { name: /remove/i }).first().click();
    await expect(page.getByPlaceholder("0412 345 678")).toHaveCount(1);
    await expect(page.getByPlaceholder("0412 345 678").first()).toHaveValue("0412 345 678");
  });

  test("Email tab mirrors the multi-input pattern", async ({ page }) => {
    await page.getByRole("tab", { name: "Email" }).click();
    await page.getByPlaceholder("john@example.com").first().fill("a@example.com");
    await page.getByRole("button", { name: /add another/i }).click();
    await expect(page.getByPlaceholder("john@example.com")).toHaveCount(2);
  });

  test("empty person search is blocked client-side", async ({ page }) => {
    await page.getByRole("button", { name: /^check first$/i }).click();
    await expect(page.getByText(/First name is required/i)).toBeVisible();
    await expect(page).toHaveURL("/");
  });
});

test.describe("Hero → dedicated /search journey (§21)", () => {
  test("Person search hands off, auto-runs, and shows a full-width report", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("First name").fill("John");
    await page.getByLabel("Last name").fill("Smith");
    await page.getByLabel("Known location").fill("Brisbane");
    await page.getByRole("button", { name: /^check first$/i }).click();

    // Navigation occurred; homepage does NOT contain the results.
    await expect(page).toHaveURL(/\/search$/);
    await expect(page.getByRole("heading", { name: "John Smith", level: 1 })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/^Checking$/)).toBeVisible({ timeout: 10_000 });

    // Auto-started: progress or report (no second submit).
    await expect(page.getByRole("heading", { name: "Sources checked" })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/identity confidence/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Demo data").first()).toBeVisible({ timeout: 10_000 });
    // Edit / New controls exist.
    await expect(page.getByRole("button", { name: /edit search/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /new search/i })).toBeVisible();
  });

  test("Website search hands off and runs real checks", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "Website" }).click();
    await page.getByLabel(/Website or domain/i).fill("example.com");
    await page.getByRole("button", { name: /^check first$/i }).click();
    await expect(page).toHaveURL(/\/search$/);
    await expect(page.getByRole("heading", { name: "example.com", level: 1 })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Sources checked" })).toBeVisible({ timeout: 25_000 });
  });

  test("New search stays on /search with a blank advanced form (does NOT go home)", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("First name").fill("Jane");
    await page.getByLabel("Last name").fill("Doe");
    await page.getByRole("button", { name: /^check first$/i }).click();
    await expect(page).toHaveURL(/\/search$/);
    await page.getByRole("heading", { name: "Sources checked" }).waitFor({ timeout: 20_000 });

    await page.getByRole("button", { name: /new search/i }).click();
    // Stays on /search, shows the blank advanced New search form.
    await expect(page).toHaveURL(/\/search$/);
    await expect(page.getByRole("heading", { name: "New search" })).toBeVisible();
    const first = page.getByLabel("First name");
    await expect(first).toBeVisible();
    await expect(first).toHaveValue("");
    // Previous results are cleared.
    await expect(page.getByRole("heading", { name: "Sources checked" })).toHaveCount(0);
  });

  test("Edit search keeps results visible and re-runs on update", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("First name").fill("Sam");
    await page.getByLabel("Last name").fill("Jones");
    await page.getByRole("button", { name: /^check first$/i }).click();
    await expect(page).toHaveURL(/\/search$/);
    await page.getByRole("heading", { name: "Sources checked" }).waitFor({ timeout: 20_000 });
    await page.getByRole("button", { name: /edit search/i }).click();
    // Advanced edit form appears, prefilled; results remain beneath.
    await expect(page.getByRole("heading", { name: "Edit search" })).toBeVisible();
    await expect(page.getByLabel("First name")).toHaveValue("Sam");
    await page.getByRole("button", { name: /update search/i }).click();
    await expect(page.getByRole("heading", { name: "Sources checked" })).toBeVisible({ timeout: 20_000 });
  });
});
