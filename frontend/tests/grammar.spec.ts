import { expect, test } from "@playwright/test"

test.use({ storageState: { cookies: [], origins: [] } })

test("Grammar index renders section links", async ({ page }) => {
  await page.goto("/grammar")
  await expect(page.getByText("Modifiers")).toBeVisible()
  await expect(page.getByText("Particles")).toBeVisible()
})

test("Navigate to modifiers page", async ({ page }) => {
  await page.goto("/grammar")
  await page.getByText("Modifiers").click()
  await expect(page).toHaveURL(/\/grammar\/modifiers/)
  await expect(page.getByText("nasin nimi")).toBeVisible()
})

test("Navigate to particles page", async ({ page }) => {
  await page.goto("/grammar")
  await page.getByText("Particles").click()
  await expect(page).toHaveURL(/\/grammar\/particles/)
  await expect(page.getByText("nimi lili")).toBeVisible()
})

test("Modifiers page renders chain visualizer", async ({ page }) => {
  await page.goto("/grammar/modifiers")
  // Fallback data should render GrammarChain components
  await expect(page.getByText("tomo")).toBeVisible()
  await expect(page.getByText("telo")).toBeVisible()
})

test("Modifiers page has interactive quiz", async ({ page }) => {
  await page.goto("/grammar/modifiers")
  await expect(page.getByText("quiz")).toBeVisible()
  // Click a quiz answer
  const firstOption = page.getByText("big bathroom").first()
  await firstOption.click()
  // Should show feedback
  await expect(page.getByText(/pona|not quite/).first()).toBeVisible()
})

test("Particles page renders all five particles", async ({ page }) => {
  await page.goto("/grammar/particles")
  for (const particle of ["li", "e", "la", "pi", "o"]) {
    await expect(
      page.getByText(particle, { exact: true }).first(),
    ).toBeVisible()
  }
})

test("Particles page shows common mistakes callouts", async ({ page }) => {
  await page.goto("/grammar/particles")
  await expect(page.getByText("common mistakes").first()).toBeVisible()
})

test("particles page direct navigation renders content", async ({ page }) => {
  await page.goto("/grammar/particles")
  await expect(page).toHaveURL(/\/grammar\/particles/)
  await expect(page.locator("main")).toBeVisible()
  // Particles page should show toki pona particles
  for (const particle of ["li", "e", "la", "pi"]) {
    await expect(page.getByText(particle, { exact: true }).first()).toBeVisible(
      { timeout: 8000 },
    )
  }
})

test("modifiers page direct navigation renders content", async ({ page }) => {
  await page.goto("/grammar/modifiers")
  await expect(page).toHaveURL(/\/grammar\/modifiers/)
  await expect(page.locator("main")).toBeVisible()
  // Modifiers page should show examples with tomo, telo
  await expect(page.getByText("tomo").first()).toBeVisible({ timeout: 8000 })
})
