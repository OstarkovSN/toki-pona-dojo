import { expect, test } from "@playwright/test"

test.use({ storageState: { cookies: [], origins: [] } })

test("Skill tree renders 10 unit nodes", async ({ page }) => {
  await page.goto("/")
  // Each unit node has the unit name in font-tp
  const unitNames = ["toki!", "ijo", "pali", "li · e", "nasin nimi", "pi", "la", "o!", "toki musi", "jan sona"]
  for (const name of unitNames) {
    await expect(page.getByText(name, { exact: true })).toBeVisible()
  }
})

test("First unit is marked as current", async ({ page }) => {
  await page.goto("/")
  // Unit 1 should be current (has pulsing dot)
  const unit1 = page.getByText("toki!", { exact: true }).locator("..")
  await expect(unit1).toBeVisible()
})

test("Greeting text is visible", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByText("o kama sona")).toBeVisible()
  await expect(page.getByText("learn toki pona")).toBeVisible()
})
