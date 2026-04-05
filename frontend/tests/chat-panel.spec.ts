import { expect, test } from "@playwright/test"

// Fake user for mocking the /api/v1/users/me endpoint on the settings page
const fakeUser = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "test@example.com",
  full_name: "Test User",
  is_active: true,
  is_superuser: false,
}

test.describe("ChatPanel", () => {
  test.beforeEach(async ({ page }) => {
    // Set up auth state — the app checks localStorage for access_token
    await page.goto("/")
    await page.evaluate(() => {
      localStorage.setItem("access_token", "test-token")
    })
    await page.goto("/")
  })

  test("desktop: chat panel is visible with header and mode selector", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 })

    const chatPanel = page.getByTestId("chat-panel")

    // jan sona header should be visible inside the chat panel
    await expect(chatPanel.getByText("jan sona", { exact: true })).toBeVisible()
    await expect(chatPanel.getByText("ready")).toBeVisible()

    // Mode selector pills
    await expect(
      chatPanel.getByRole("button", { name: "free chat" }),
    ).toBeVisible()
    await expect(
      chatPanel.getByRole("button", { name: "grammar" }),
    ).toBeVisible()
    await expect(
      chatPanel.getByRole("button", { name: "translate" }),
    ).toBeVisible()

    // Empty state message
    await expect(chatPanel.getByText("toki! mi jan sona.")).toBeVisible()
  })

  test("desktop: can type and send a message", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })

    const chatPanel = page.getByTestId("chat-panel")
    const textarea = chatPanel.getByPlaceholder("toki...")
    await textarea.fill("toki! mi wile kama sona")

    // Submit via Enter
    await page.keyboard.press("Enter")

    // User message should appear in the chat panel
    await expect(chatPanel.getByText("toki! mi wile kama sona")).toBeVisible()

    // Textarea should be cleared
    await expect(textarea).toHaveValue("")
  })

  test("desktop: can switch chat modes", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })

    const chatPanel = page.getByTestId("chat-panel")

    // Default is free chat — aria-pressed="true"
    const freeBtn = chatPanel.getByRole("button", { name: "free chat" })
    await expect(freeBtn).toHaveAttribute("aria-pressed", "true")

    // Switch to grammar
    await chatPanel.getByRole("button", { name: "grammar" }).click()
    await expect(
      chatPanel.getByRole("button", { name: "grammar" }),
    ).toHaveAttribute("aria-pressed", "true")
    await expect(freeBtn).toHaveAttribute("aria-pressed", "false")
  })

  test("desktop: can clear chat history", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })

    const chatPanel = page.getByTestId("chat-panel")

    // Send a message first
    const textarea = chatPanel.getByPlaceholder("toki...")
    await textarea.fill("toki")
    await page.keyboard.press("Enter")

    // Message appears
    await expect(chatPanel.getByText("toki")).toBeVisible()

    // Clear button
    await chatPanel.getByTitle("Clear chat").click()

    // Empty state should return
    await expect(chatPanel.getByText("toki! mi jan sona.")).toBeVisible()
  })

  test("desktop: chat panel can be collapsed and expanded", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 })

    // Chat should be open — header visible
    const chatPanel = page.getByTestId("chat-panel")
    await expect(chatPanel.getByTestId("chat-header")).toBeVisible()

    // Close the chat
    await chatPanel.getByTitle("Close chat").click()

    // Panel header no longer visible, toggle button visible
    await expect(page.getByTestId("chat-panel")).not.toBeVisible()
    await expect(page.getByLabel("Open chat")).toBeVisible()

    // Re-open
    await page.getByLabel("Open chat").click()
    await expect(page.getByTestId("chat-panel")).toBeVisible()
  })

  test("mobile: chat opens as bottom sheet", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })

    // Start with chat closed so the floating button is visible
    await page.evaluate(() => {
      localStorage.setItem("tp-chat-open", "false")
    })
    await page.goto("/")

    // Floating button should be visible
    await expect(page.getByLabel("Open chat")).toBeVisible()

    // Open sheet — use force to bypass devtools overlay in dev mode
    await page.getByLabel("Open chat").click({ force: true })

    // Chat content should be visible in sheet
    await expect(page.getByTestId("chat-panel")).toBeVisible()
    await expect(page.getByPlaceholder("toki...")).toBeVisible()
  })

  test("mobile: bottom sheet can be closed", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })

    // Chat defaults to open — sheet should already be showing content
    await expect(page.getByTestId("chat-panel")).toBeVisible()

    // Close via the close button
    await page.getByTitle("Close chat").click()

    // Should show floating button
    await expect(page.getByLabel("Open chat")).toBeVisible()
  })
})

test.describe("ProviderSettings", () => {
  test.beforeEach(async ({ page }) => {
    // Mock the /api/v1/users/me endpoint so the settings page renders
    await page.route("**/api/v1/users/me", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(fakeUser),
      })
    })

    // Set up auth state
    await page.goto("/")
    await page.evaluate(() => {
      localStorage.setItem("access_token", "test-token")
    })
    await page.goto("/settings")
  })

  test("BYOM settings fields are present", async ({ page }) => {
    // Navigate to LLM Provider tab
    await page.getByRole("tab", { name: "LLM Provider" }).click()

    await expect(page.getByLabel("API Base URL")).toBeVisible()
    await expect(page.getByLabel("API Key")).toBeVisible()
    await expect(page.getByLabel("Model Name (optional)")).toBeVisible()
    await expect(page.getByText("Using server default")).toBeVisible()
  })

  test("BYOM settings persist in localStorage", async ({ page }) => {
    await page.getByRole("tab", { name: "LLM Provider" }).click()

    // Fill in config
    await page.getByLabel("API Base URL").fill("https://api.example.com/v1")
    await page.getByLabel("API Key").fill("sk-test-key-12345")
    await page.getByLabel("Model Name (optional)").fill("test-model")

    // Save
    await page.getByRole("button", { name: "Save" }).click()

    // Verify localStorage
    const url = await page.evaluate(() => localStorage.getItem("tp-byom-url"))
    const key = await page.evaluate(() => localStorage.getItem("tp-byom-key"))
    const model = await page.evaluate(() =>
      localStorage.getItem("tp-byom-model"),
    )

    expect(url).toBe("https://api.example.com/v1")
    expect(key).toBe("sk-test-key-12345")
    expect(model).toBe("test-model")
  })

  test("BYOM clear credentials removes localStorage", async ({ page }) => {
    // Pre-set localStorage
    await page.evaluate(() => {
      localStorage.setItem("tp-byom-url", "https://api.example.com/v1")
      localStorage.setItem("tp-byom-key", "sk-test")
      localStorage.setItem("tp-byom-model", "m")
    })

    await page.reload()
    await page.getByRole("tab", { name: "LLM Provider" }).click()

    // Status should show connected
    await expect(page.getByText("Connected to your provider")).toBeVisible()

    // Clear
    await page.getByRole("button", { name: "Clear Credentials" }).click()

    // Status reverts
    await expect(page.getByText("Using server default")).toBeVisible()

    // localStorage cleared
    const url = await page.evaluate(() => localStorage.getItem("tp-byom-url"))
    expect(url).toBeNull()
  })
})
