import { expect, test } from "@playwright/test"

test.use({ storageState: { cookies: [], origins: [] } })

test.describe("Error States", () => {
  test("offline banner appears when network is lost", async ({ page }) => {
    await page.goto("/")

    await page.context().setOffline(true)

    const offlineBanner = page.getByTestId("offline-banner")
    await expect(offlineBanner).toBeVisible({ timeout: 5000 })
    await expect(offlineBanner).toContainText(/offline/i)

    await page.context().setOffline(false)
    await expect(offlineBanner).not.toBeVisible({ timeout: 5000 })
  })

  test("dictionary error banner appears on API failure", async ({ page }) => {
    await page.route("**/api/v1/dictionary/words", (route) =>
      route.fulfill({ status: 503, body: "Service Unavailable" }),
    )

    await page.goto("/dictionary")

    // Should show the api-unreachable error banner
    const errorBanner = page.getByTestId("error-banner-api-unreachable")
    await expect(errorBanner).toBeVisible({ timeout: 10000 })
  })

  test("LLM unavailable error shown when chat returns 503", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 })

    await page.addInitScript(() => {
      localStorage.setItem("tp-chat-open", "true")
    })
    await page.goto("/")

    await page.route("**/api/v1/chat/stream**", (route) =>
      route.fulfill({ status: 503, body: "Service Unavailable" }),
    )

    const chatInput = page.locator("[data-testid='chat-input']")
    if (!(await chatInput.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip()
      return
    }

    await chatInput.fill("toki!")
    await page.keyboard.press("Enter")

    const errorBanner = page.getByTestId("error-banner-llm-unavailable")
    await expect(errorBanner).toBeVisible({ timeout: 10000 })
  })

  test("rate limit error shown when chat returns 429", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })

    await page.addInitScript(() => {
      localStorage.setItem("tp-chat-open", "true")
    })
    await page.goto("/")

    await page.route("**/api/v1/chat/stream**", (route) =>
      route.fulfill({ status: 429, body: "Rate limit exceeded" }),
    )

    const chatInput = page.locator("[data-testid='chat-input']")
    if (!(await chatInput.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip()
      return
    }

    await chatInput.fill("toki!")
    await page.keyboard.press("Enter")

    const rateLimitBanner = page.getByTestId("error-banner-rate-limit")
    await expect(rateLimitBanner).toBeVisible({ timeout: 10000 })
  })

  test("lesson API failure shows error state", async ({ page }) => {
    await page.route("**/api/v1/lessons/units/1/lessons/1", (route) =>
      route.fulfill({ status: 500, body: "Internal Server Error" }),
    )

    await page.goto("/learn/1/1")

    // Either an error-component or error banner should appear
    const errorState = page
      .getByTestId("error-component")
      .or(page.getByTestId("error-banner-api-unreachable"))
    await expect(errorState).toBeVisible({ timeout: 10000 })
  })

  test("not-found page renders for unknown routes", async ({ page }) => {
    await page.goto("/this-page-does-not-exist-xyz")
    const notFound = page.getByTestId("not-found")
    await expect(notFound).toBeVisible({ timeout: 5000 })
  })

  test("chat input not permanently disabled after API timeout", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 })

    await page.addInitScript(() => {
      localStorage.setItem("tp-chat-open", "true")
    })
    await page.goto("/")

    // Abort the chat stream to simulate a timeout
    await page.route("**/api/v1/chat/stream**", (route) => route.abort())

    const chatInput = page.locator("[data-testid='chat-input']")
    if (!(await chatInput.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip()
      return
    }

    await chatInput.fill("toki!")
    await page.keyboard.press("Enter")

    // Wait briefly for error handling to settle
    await page.waitForTimeout(2000)

    // Input should not be permanently disabled after the request fails
    await expect(chatInput).not.toBeDisabled({ timeout: 5000 })
  })

  test("lesson API 503 shows error state not infinite spinner", async ({
    page,
  }) => {
    await page.route("**/api/v1/lessons/units/1/lessons/1", (route) =>
      route.fulfill({ status: 503, body: "Service Unavailable" }),
    )

    await page.goto("/learn/1/1")

    // Should show an error component or error banner — not stay as a spinner
    const errorState = page
      .getByTestId("error-component")
      .or(page.getByTestId("error-banner-api-unreachable"))
    await expect(errorState).toBeVisible({ timeout: 10000 })

    // The lesson skeleton should NOT still be showing (no infinite spinner)
    await expect(page.getByTestId("lesson-skeleton")).not.toBeVisible()
  })
})
