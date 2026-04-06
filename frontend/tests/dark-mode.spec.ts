import { expect, test } from "@playwright/test"

test.describe("Dark Mode", () => {
  test("theme toggle button is visible", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByTestId("theme-button")).toBeVisible()
  })

  test("can switch to dark mode", async ({ page }) => {
    await page.goto("/")
    await page.getByTestId("theme-button").click()
    const darkOption = page.getByTestId("dark-mode")
    await expect(darkOption).toBeVisible()
    await darkOption.click()

    const isDark = await page.evaluate(() =>
      document.documentElement.classList.contains("dark")
    )
    expect(isDark).toBeTruthy()
  })

  test("can switch back to light mode", async ({ page }) => {
    await page.goto("/")
    await page.getByTestId("theme-button").click()
    await page.getByTestId("dark-mode").click()

    await page.getByTestId("theme-button").click()
    await page.getByTestId("light-mode").click()

    const isDark = await page.evaluate(() =>
      document.documentElement.classList.contains("dark")
    )
    expect(isDark).toBeFalsy()
  })

  test("dark mode persists after reload", async ({ page }) => {
    await page.goto("/")
    await page.getByTestId("theme-button").click()
    await page.getByTestId("dark-mode").click()

    await page.reload()

    const isDark = await page.evaluate(() =>
      document.documentElement.classList.contains("dark")
    )
    expect(isDark).toBeTruthy()
  })

  test("dark mode changes background color", async ({ page }) => {
    await page.goto("/")

    const lightBg = await page.evaluate(() =>
      getComputedStyle(document.body).backgroundColor
    )

    await page.getByTestId("theme-button").click()
    await page.getByTestId("dark-mode").click()
    await page.waitForTimeout(300)

    const darkBg = await page.evaluate(() =>
      getComputedStyle(document.body).backgroundColor
    )

    expect(lightBg).not.toBe(darkBg)
  })
})
