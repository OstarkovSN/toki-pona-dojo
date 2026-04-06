import { expect, test } from "@playwright/test"

test.describe("Exercises", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await expect(page.getByTestId("skill-tree-skeleton")).not.toBeVisible({
      timeout: 10000,
    })
    const firstUnit = page.locator("[data-testid^='skill-tree-node-']").first()
    await firstUnit.click()
    await page.waitForURL(/\/learn\//, { timeout: 10000 })
    await expect(page.getByTestId("lesson-skeleton")).not.toBeVisible({
      timeout: 10000,
    })
  })

  test("displays exercise with input area", async ({ page }) => {
    const exerciseArea = page.locator("[data-testid='exercise-area']")
    await expect(exerciseArea).toBeVisible({ timeout: 10000 })

    const hasInput =
      (await page.locator("[data-testid='exercise-input']").count()) > 0 ||
      (await page.locator("[data-testid='word-bank']").count()) > 0 ||
      (await page.locator("[data-testid^='choice-']").count()) > 0

    expect(hasInput).toBeTruthy()
  })

  test("submitting an answer triggers feedback or grading", async ({ page }) => {
    const exerciseArea = page.locator("[data-testid='exercise-area']")
    await expect(exerciseArea).toBeVisible({ timeout: 10000 })

    const textInput = page.locator("[data-testid='exercise-input']")
    const wordBank = page.locator("[data-testid='word-bank']")
    const choice = page.locator("[data-testid^='choice-']").first()

    if (await textInput.isVisible()) {
      await textInput.fill("toki")
    } else if (await wordBank.isVisible()) {
      const firstWord = wordBank.locator("button").first()
      if (await firstWord.isVisible()) await firstWord.click()
    } else if (await choice.isVisible()) {
      await choice.click()
    }

    const submitBtn = page.getByTestId("submit-answer")
    if (await submitBtn.isVisible()) {
      await submitBtn.click()
    }

    await expect(
      page
        .getByTestId("grading-spinner")
        .or(page.locator("[data-testid='exercise-feedback']"))
    ).toBeVisible({ timeout: 35000 })
  })
})
