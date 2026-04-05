import { test, expect } from "@playwright/test";

test.describe("ChatPanel", () => {
  test.beforeEach(async ({ page }) => {
    // Set up auth state before navigating — the app checks localStorage
    // for access_token to determine login status (see useAuth.ts).
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("access_token", "test-token");
    });
    await page.goto("/");
  });

  test("desktop: chat panel is visible with header and mode selector", async ({
    page,
  }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    // jan sona header should be visible
    await expect(page.getByText("jan sona")).toBeVisible();
    await expect(page.getByText("ready")).toBeVisible();

    // Mode selector pills
    await expect(page.getByRole("button", { name: "free chat" })).toBeVisible();
    await expect(page.getByRole("button", { name: "grammar" })).toBeVisible();
    await expect(page.getByRole("button", { name: "translate" })).toBeVisible();

    // Empty state message
    await expect(page.getByText("toki! mi jan sona.")).toBeVisible();
  });

  test("desktop: can type and send a message", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    const textarea = page.getByPlaceholder("toki...");
    await textarea.fill("toki! mi wile kama sona");

    // Send button should be enabled
    const sendButton = page.locator("button[type='submit']");
    await sendButton.click();

    // User message should appear
    await expect(page.getByText("toki! mi wile kama sona")).toBeVisible();

    // Textarea should be cleared
    await expect(textarea).toHaveValue("");
  });

  test("desktop: can switch chat modes", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    // Default is free chat — aria-pressed="true"
    const freeBtn = page.getByRole("button", { name: "free chat" });
    await expect(freeBtn).toHaveAttribute("aria-pressed", "true");

    // Switch to grammar
    await page.getByRole("button", { name: "grammar" }).click();
    await expect(
      page.getByRole("button", { name: "grammar" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(freeBtn).toHaveAttribute("aria-pressed", "false");
  });

  test("desktop: can clear chat history", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    // Send a message first
    const textarea = page.getByPlaceholder("toki...");
    await textarea.fill("toki");
    await page.keyboard.press("Enter");

    // Message appears
    await expect(page.getByText("toki")).toBeVisible();

    // Clear button
    await page.getByTitle("Clear chat").click();

    // Empty state should return
    await expect(page.getByText("toki! mi jan sona.")).toBeVisible();
  });

  test("desktop: chat panel can be collapsed and expanded", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    // Chat should be open by default
    await expect(page.getByText("jan sona")).toBeVisible();

    // Close the chat
    await page.getByTitle("Close chat").click();

    // Header should be hidden, toggle button visible
    await expect(page.getByText("jan sona")).not.toBeVisible();
    await expect(page.getByLabel("Open chat")).toBeVisible();

    // Re-open
    await page.getByLabel("Open chat").click();
    await expect(page.getByText("jan sona")).toBeVisible();
  });

  test("mobile: chat opens as bottom sheet", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });

    // Floating button should be visible
    await expect(page.getByLabel("Open chat")).toBeVisible();

    // Open sheet
    await page.getByLabel("Open chat").click();

    // Chat content should be visible in sheet
    await expect(page.getByText("jan sona")).toBeVisible();
    await expect(page.getByPlaceholder("toki...")).toBeVisible();
  });

  test("mobile: bottom sheet can be closed", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    // Open
    await page.getByLabel("Open chat").click();
    await expect(page.getByText("jan sona")).toBeVisible();

    // Close via the close button
    await page.getByTitle("Close chat").click();

    // Should return to floating button
    await expect(page.getByLabel("Open chat")).toBeVisible();
  });
});

test.describe("ProviderSettings", () => {
  test.beforeEach(async ({ page }) => {
    // Set up auth state — settings page requires login
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("access_token", "test-token");
    });
    await page.goto("/settings");
  });

  test("BYOM settings fields are present", async ({ page }) => {
    // Navigate to LLM Provider tab
    await page.getByRole("tab", { name: "LLM Provider" }).click();

    await expect(page.getByLabel("API Base URL")).toBeVisible();
    await expect(page.getByLabel("API Key")).toBeVisible();
    await expect(page.getByLabel("Model Name (optional)")).toBeVisible();
    await expect(page.getByText("Using server default")).toBeVisible();
  });

  test("BYOM settings persist in localStorage", async ({ page }) => {
    await page.getByRole("tab", { name: "LLM Provider" }).click();

    // Fill in config
    await page.getByLabel("API Base URL").fill("https://api.example.com/v1");
    await page.getByLabel("API Key").fill("sk-test-key-12345");
    await page.getByLabel("Model Name (optional)").fill("test-model");

    // Save
    await page.getByRole("button", { name: "Save" }).click();

    // Verify localStorage
    const url = await page.evaluate(() => localStorage.getItem("tp-byom-url"));
    const key = await page.evaluate(() => localStorage.getItem("tp-byom-key"));
    const model = await page.evaluate(() =>
      localStorage.getItem("tp-byom-model"),
    );

    expect(url).toBe("https://api.example.com/v1");
    expect(key).toBe("sk-test-key-12345");
    expect(model).toBe("test-model");
  });

  test("BYOM clear credentials removes localStorage", async ({ page }) => {
    // Pre-set localStorage
    await page.evaluate(() => {
      localStorage.setItem("tp-byom-url", "https://api.example.com/v1");
      localStorage.setItem("tp-byom-key", "sk-test");
      localStorage.setItem("tp-byom-model", "m");
    });

    await page.reload();
    await page.getByRole("tab", { name: "LLM Provider" }).click();

    // Status should show connected
    await expect(page.getByText("Connected to your provider")).toBeVisible();

    // Clear
    await page.getByRole("button", { name: "Clear Credentials" }).click();

    // Status reverts
    await expect(page.getByText("Using server default")).toBeVisible();

    // localStorage cleared
    const url = await page.evaluate(() => localStorage.getItem("tp-byom-url"));
    expect(url).toBeNull();
  });
});
