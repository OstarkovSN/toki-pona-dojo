import { devices, expect, test } from "@playwright/test"

test.use({ ...devices["Pixel 5"] })

test.describe("Mobile Layout", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("content spans full viewport width on mobile", async ({ page }) => {
    await page.goto("/")
    const main = page.locator("main")
    await expect(main).toBeVisible()

    const mainWidth = await main.evaluate(
      (el) => el.getBoundingClientRect().width,
    )
    const viewportWidth = page.viewportSize()!.width
    expect(mainWidth).toBeGreaterThan(viewportWidth * 0.85)
  })

  test("mobile chat button is visible when chat is closed", async ({
    page,
  }) => {
    // Ensure chat is closed before navigating
    await page.addInitScript(() => {
      localStorage.setItem("tp-chat-open", "false")
    })
    await page.goto("/")
    const chatBtn = page.getByTestId("mobile-chat-button")
    await expect(chatBtn).toBeVisible({ timeout: 5000 })
  })

  test("tapping chat button opens bottom sheet", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("tp-chat-open", "false")
    })
    await page.goto("/")
    const chatBtn = page.getByTestId("mobile-chat-button")
    await expect(chatBtn).toBeVisible({ timeout: 5000 })
    await chatBtn.click({ force: true })

    const chatSheet = page.getByTestId("mobile-chat-sheet")
    await expect(chatSheet).toBeVisible({ timeout: 5000 })
  })

  test("skill tree stacks vertically on mobile", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByTestId("skill-tree-skeleton")).not.toBeVisible({
      timeout: 10000,
    })

    // On mobile, units 1 and 2 should stack vertically
    const node1 = page.locator("[data-testid='skill-tree-node-1']")
    const node2 = page.locator("[data-testid='skill-tree-node-2']")

    if ((await node1.isVisible()) && (await node2.isVisible())) {
      const firstBox = await node1.boundingBox()
      const secondBox = await node2.boundingBox()
      if (firstBox && secondBox) {
        expect(secondBox.y).toBeGreaterThan(firstBox.y)
      }
    }
  })

  test("top nav links are accessible on mobile", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("link", { name: "learn" })).toBeVisible()
    await expect(page.getByRole("link", { name: "dictionary" })).toBeVisible()
  })

  test("dictionary search bar is visible on mobile", async ({ page }) => {
    await page.goto("/dictionary")
    const searchInput = page.locator("[data-testid='dictionary-search']")
    await expect(searchInput).toBeVisible({ timeout: 10000 })
  })
})
