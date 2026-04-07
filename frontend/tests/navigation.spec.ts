import { expect, test } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  // Inject fake token so isLoggedIn() returns true in [no-auth] project.
  // In [chromium]/[mobile-chrome] the storageState already has real auth,
  // so addInitScript is a no-op (harmless duplicate).
  // Note: page.route mocks below run for ALL projects — intentional, since
  // navigation tests don't exercise user-specific data.
  await page.addInitScript(() => {
    localStorage.setItem("access_token", "fake-test-token")
    // Suppress mobile chat panel Sheet overlay that blocks pointer events
    localStorage.setItem("tp-chat-open", "false")
  })
  // Mock /users/me so useAuth doesn't 401 with the fake token
  await page.route("**/api/v1/users/me", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "00000000-0000-0000-0000-000000000001",
        email: "test@example.com",
        is_active: true,
        is_superuser: false,
        full_name: "Test User",
      }),
    })
  })
  // Mock /progress/me so useProgress doesn't 401 with the fake token
  await page.route("**/api/v1/progress/me", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        completed_units: [],
        completed_lessons: [],
        current_unit: 1,
        srs_data: {},
        total_correct: 0,
        total_answered: 0,
        streak_days: 0,
        last_activity: null,
        known_words: [],
        recent_errors: [],
      }),
    })
  })
})

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

test("TopNav dictionary link is visible on grammar page", async ({ page }) => {
  await page.goto("/grammar")
  await expect(page.getByRole("link", { name: "dictionary" })).toBeVisible({
    timeout: 5000,
  })
})

test("TopNav dictionary link navigates from grammar page", async ({ page }) => {
  await page.goto("/grammar")
  await page.getByRole("link", { name: "dictionary" }).click()
  await expect(page).toHaveURL(/\/dictionary$/, { timeout: 5000 })
  await expect(page.locator("h1")).toBeVisible({ timeout: 5000 })
})

test("TopNav dictionary link is visible on a lesson page", async ({ page }) => {
  await page.goto("/learn/1/1")
  await expect(page.getByRole("link", { name: "dictionary" })).toBeVisible({
    timeout: 5000,
  })
})
