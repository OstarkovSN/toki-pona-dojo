import { expect, test } from "@playwright/test"

test.use({ storageState: { cookies: [], origins: [] } })

test("Skill tree renders 10 unit nodes", async ({ page }) => {
  await page.goto("/")
  // Each unit node has the unit name in font-tp
  const unitNames = [
    "toki!",
    "ijo",
    "pali",
    "li · e",
    "nasin nimi",
    "pi",
    "la",
    "o!",
    "toki musi",
    "jan sona",
  ]
  for (const name of unitNames) {
    await expect(page.getByText(name, { exact: true })).toBeVisible()
  }
})

test("First unit is marked as current", async ({ page }) => {
  await page.goto("/")
  // Unit 1 should be current — pulsing dot indicator is present
  await expect(page.getByTestId("unit-current")).toBeVisible()
  // And only one unit is current
  await expect(page.getByTestId("unit-current")).toHaveCount(1)
})

test("Greeting text is visible", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByText("o kama sona")).toBeVisible()
  await expect(page.getByText("learn toki pona")).toBeVisible()
})

test("clicking a unit node navigates to its lesson", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByTestId("skill-tree-skeleton")).not.toBeVisible({
    timeout: 10000,
  })

  // Click the first available unit node
  const firstNode = page.locator("[data-testid^='skill-tree-node-']").first()
  await firstNode.click()

  // Should navigate to a learn route
  await page.waitForURL(/\/learn\//, { timeout: 10000 })
  await expect(page.locator("main")).toBeVisible()
})
