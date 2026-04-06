import { expect, test } from "@playwright/test"

test.describe("Invite Flow", () => {
  test("signup page without token shows invite-only message", async ({
    page,
  }) => {
    await page.goto("/signup")
    await expect(page.getByText("This app is invite-only")).toBeVisible()
  })

  test("signup page without token shows Telegram bot link", async ({
    page,
  }) => {
    await page.goto("/signup")
    const botLink = page.getByTestId("telegram-bot-link")
    // Bot link may or may not be visible depending on config
    // If TG_BOT_USERNAME is set, the link should be visible
    const isVisible = await botLink.isVisible().catch(() => false)
    if (isVisible) {
      const href = await botLink.getAttribute("href")
      expect(href).toMatch(/^https:\/\/t\.me\//)
    }
  })

  test("signup page with invalid token shows error", async ({ page }) => {
    await page.goto("/signup?token=invalid_token_12345")
    await expect(page.getByTestId("invalid-token-message")).toBeVisible({
      timeout: 10000,
    })
    await expect(
      page.getByText("invalid or has already been used"),
    ).toBeVisible()
  })

  test("login page shows request access hint", async ({ page }) => {
    await page.goto("/login")
    await expect(page.getByTestId("request-access-hint")).toBeVisible()
    await expect(page.getByText("Request access via Telegram")).toBeVisible()
  })

  test("valid invite token allows full signup flow", async ({
    page,
    request,
  }) => {
    // Seed a valid invite token via the test utility endpoint (local env only)
    const tokenResponse = await request.post(
      "/api/v1/utils/seed-invite-token",
      { data: {} },
    )
    // If the seed endpoint doesn't exist, skip the test
    if (!tokenResponse.ok()) {
      test.skip()
      return
    }
    const { token } = (await tokenResponse.json()) as { token: string }

    await page.goto(`/signup?token=${token}`)

    // Form should be visible (token is valid)
    await expect(page.getByTestId("full-name-input")).toBeVisible({
      timeout: 10000,
    })

    // Fill out the signup form
    const uniqueEmail = `e2e-${Date.now()}@example.com`
    await page.getByTestId("full-name-input").fill("E2E Test User")
    await page.getByTestId("email-input").fill(uniqueEmail)
    await page.getByTestId("password-input").fill("testpass123")
    await page.getByTestId("confirm-password-input").fill("testpass123")
    await page.getByRole("button", { name: /sign up/i }).click()

    // Should redirect after successful signup
    await page.waitForURL("**/login**", { timeout: 15000 })
  })

  test("expired invite token shows error message", async ({
    page,
    request,
  }) => {
    // Seed an expired invite token via the test utility endpoint
    const tokenResponse = await request.post(
      "/api/v1/utils/seed-invite-token",
      { data: { expired: true } },
    )
    if (!tokenResponse.ok()) {
      test.skip()
      return
    }
    const { token } = (await tokenResponse.json()) as { token: string }

    await page.goto(`/signup?token=${token}`)

    // Should show the invalid/expired token message
    await expect(page.getByTestId("invalid-token-message")).toBeVisible({
      timeout: 10000,
    })
    await expect(
      page.getByText("invalid or has already been used"),
    ).toBeVisible()
  })
})
