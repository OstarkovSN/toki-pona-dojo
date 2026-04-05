import { expect, test } from "@playwright/test"

test.use({ storageState: { cookies: [], origins: [] } })

test("Top nav renders with correct links", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("link", { name: "learn" })).toBeVisible()
  await expect(page.getByRole("link", { name: "dictionary" })).toBeVisible()
  await expect(page.getByRole("link", { name: "grammar" })).toBeVisible()
  await expect(page.getByRole("link", { name: "settings" })).toBeVisible()
})

test("Navigate to dictionary via top nav", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("link", { name: "dictionary" }).click()
  await expect(page).toHaveURL(/\/dictionary/)
  await expect(page.locator("h1")).toContainText("nimi ale")
})

test("Navigate to grammar via top nav", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("link", { name: "grammar" }).click()
  await expect(page).toHaveURL(/\/grammar/)
  await expect(page.locator("h1")).toContainText("nasin toki")
})

test("Home page loads without auth redirect", async ({ page }) => {
  await page.goto("/")
  await expect(page).not.toHaveURL(/\/login/)
  await expect(page.locator("h1")).toContainText("o kama sona")
})

test("Theme toggle works", async ({ page }) => {
  await page.goto("/")
  await page.getByTestId("theme-button").click()
  await page.getByTestId("dark-mode").click()
  await expect(page.locator("html")).toHaveClass(/dark/)
  await page.getByTestId("theme-button").click()
  await page.getByTestId("light-mode").click()
  await expect(page.locator("html")).toHaveClass(/light/)
})

test("Chat panel toggles open and closed", async ({ page }) => {
  await page.goto("/")
  // Chat panel should be hidden initially
  await expect(page.getByTestId("chat-panel")).not.toBeVisible()
  // Click toggle
  await page.getByLabel("Toggle chat panel").click()
  await expect(page.getByTestId("chat-panel")).toBeVisible()
  // Click toggle again to close
  await page.getByLabel("Toggle chat panel").click()
  await expect(page.getByTestId("chat-panel")).not.toBeVisible()
})
