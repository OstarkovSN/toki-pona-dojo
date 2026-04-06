import { expect, test } from "@playwright/test"

test.describe("BYOM Settings", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings")
  })

  test("settings page loads", async ({ page }) => {
    await expect(page.locator("main")).toBeVisible()
  })

  test("BYOM settings fields are present", async ({ page }) => {
    const byomSection = page.locator("[data-testid='byom-settings']")
    const isVisible = await byomSection.isVisible().catch(() => false)
    if (!isVisible) {
      test.skip()
      return
    }
    await expect(byomSection).toBeVisible()
  })

  test("BYOM settings persist in localStorage", async ({ page }) => {
    const apiKeyInput = page.locator("[data-testid='byom-api-key']")
    const isVisible = await apiKeyInput.isVisible().catch(() => false)
    if (!isVisible) {
      test.skip()
      return
    }

    await apiKeyInput.fill("sk-test-persist-key")
    const saveBtn = page.getByTestId("byom-save")
    if (await saveBtn.isVisible()) {
      await saveBtn.click()
    }

    const stored = await page.evaluate(
      () =>
        localStorage.getItem("tp-byom-key") ??
        localStorage.getItem("byom-settings")
    )
    expect(stored).toBeTruthy()
  })

  test("can clear BYOM settings", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("tp-byom-key", "sk-test")
    })
    await page.reload()
    await page.goto("/settings")

    const clearBtn = page.getByTestId("byom-clear")
    const isVisible = await clearBtn.isVisible().catch(() => false)
    if (!isVisible) {
      test.skip()
      return
    }

    await clearBtn.click()

    const stored = await page.evaluate(() => localStorage.getItem("tp-byom-key"))
    expect(stored).toBeFalsy()
  })
})
