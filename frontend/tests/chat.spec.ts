import { expect, test } from "@playwright/test"

test.describe("Chat Panel (Desktop)", () => {
  test.use({ viewport: { width: 1280, height: 720 } })

  test("chat panel is visible on desktop", async ({ page }) => {
    await page.goto("/")
    const chatPanel = page.locator("[data-testid='chat-panel']")
    await expect(chatPanel).toBeVisible({ timeout: 5000 })
  })

  test("can type and send a message", async ({ page }) => {
    await page.goto("/")
    const chatInput = page.locator("[data-testid='chat-input']")
    await expect(chatInput).toBeVisible({ timeout: 5000 })

    await chatInput.fill("toki pona li pona!")
    await chatInput.press("Enter")

    const userMessage = page.locator("[data-testid='chat-message-user']").last()
    await expect(userMessage).toContainText("toki pona", { timeout: 5000 })
  })

  test("bot responds to message", async ({ page }) => {
    await page.goto("/")
    const chatInput = page.locator("[data-testid='chat-input']")
    await chatInput.fill("What does 'pona' mean?")
    await chatInput.press("Enter")

    const botMessage = page.locator("[data-testid='chat-message-bot']").last()
    await expect(botMessage).toBeVisible({ timeout: 30000 })
    const text = await botMessage.textContent()
    expect(text!.length).toBeGreaterThan(0)
  })

  test("chat preserves message history", async ({ page }) => {
    await page.goto("/")
    const chatInput = page.locator("[data-testid='chat-input']")
    await chatInput.fill("nimi 'toki' li seme?")
    await chatInput.press("Enter")

    await expect(
      page.locator("[data-testid='chat-message-bot']").last(),
    ).toBeVisible({ timeout: 30000 })

    await chatInput.fill("pona!")
    await chatInput.press("Enter")

    const allUserMessages = page.locator("[data-testid='chat-message-user']")
    expect(await allUserMessages.count()).toBeGreaterThanOrEqual(2)
  })
})
