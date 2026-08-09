import { test, expect } from "@playwright/test";

test.describe("Check First — landing & search", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders the hero and interactive search card", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Know before/i })).toBeVisible();
    await expect(page.getByRole("tablist", { name: /what do you want to check/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Person" })).toBeVisible();
    await expect(page.getByRole("button", { name: /check first/i }).first()).toBeVisible();
  });

  test("switching tabs replaces the form fields", async ({ page }) => {
    // Person shows first/last name.
    await expect(page.getByLabel("First name")).toBeVisible();
    // Switch to Phone — name fields disappear, phone field appears.
    await page.getByRole("tab", { name: "Phone" }).click();
    await expect(page.getByLabel("First name")).toHaveCount(0);
    await expect(page.getByLabel("Phone number")).toBeVisible();
    // Switch to Website.
    await page.getByRole("tab", { name: "Website" }).click();
    await expect(page.getByLabel(/Website or domain/i)).toBeVisible();
  });

  test("person optional details expander reveals more fields", async ({ page }) => {
    await expect(page.getByLabel("Employer")).toHaveCount(0);
    await page.getByRole("button", { name: /add optional matching details/i }).click();
    await expect(page.getByLabel("Employer")).toBeVisible();
    await expect(page.getByLabel("Suburb / city")).toBeVisible();
  });

  test("client validation blocks an empty person search", async ({ page }) => {
    await page.getByRole("button", { name: /^check first$/i }).click();
    await expect(page.getByText(/First name is required/i)).toBeVisible();
  });

  test("runs a person search and shows live progress then a report", async ({ page }) => {
    await page.getByLabel("First name").fill("John");
    await page.getByLabel("Last name").fill("Smith");
    await page.getByRole("button", { name: /add optional matching details/i }).click();
    await page.getByLabel("Suburb / city").fill("Brisbane");
    await page.getByLabel("Employer").fill("ABC Plumbing");

    await page.getByRole("button", { name: /^check first$/i }).click();

    // The search transitions into the live experience and then a report. The
    // offline demo can resolve sub-second, so accept either the transient
    // "Searching…" state or the finished report.
    await expect(page.getByText(/Searching public sources|Sources checked/i).first()).toBeVisible({ timeout: 10_000 });

    // Report resolves.
    await expect(page.getByRole("heading", { name: "Sources checked" })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/identity confidence/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Demo data").first()).toBeVisible({ timeout: 10_000 });
    // Honest source states are shown.
    await expect(page.getByText(/Not configured/i).first()).toBeVisible({ timeout: 10_000 });

    // New search resets back to the form.
    await page.getByRole("button", { name: /new search/i }).click();
    await expect(page.getByLabel("First name")).toBeVisible();
  });

  test("website search validates a bad domain", async ({ page }) => {
    await page.getByRole("tab", { name: "Website" }).click();
    await page.getByLabel(/Website or domain/i).fill("not a domain");
    await page.getByRole("button", { name: /^check first$/i }).click();
    // Either client or server rejects it; an error message should surface.
    await expect(page.getByText(/valid|required|fix/i).first()).toBeVisible({ timeout: 15_000 });
  });
});
