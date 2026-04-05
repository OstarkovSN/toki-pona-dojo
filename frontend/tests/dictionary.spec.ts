import { expect, test } from "@playwright/test"

test.use({ storageState: { cookies: [], origins: [] } })

test("Dictionary page renders search and filters", async ({ page }) => {
  await page.goto("/dictionary")
  await expect(page.getByTestId("dictionary-search")).toBeVisible()
  await expect(page.getByTestId("pos-filter-all")).toBeVisible()
  await expect(page.getByTestId("pos-filter-noun")).toBeVisible()
  await expect(page.getByTestId("pos-filter-verb")).toBeVisible()
  await expect(page.getByTestId("pos-filter-particle")).toBeVisible()
})

test("Dictionary search input is functional", async ({ page }) => {
  await page.goto("/dictionary")
  const searchInput = page.getByTestId("dictionary-search")
  await searchInput.fill("jan")
  await expect(searchInput).toHaveValue("jan")
})

test("POS filter pills are toggleable", async ({ page }) => {
  await page.goto("/dictionary")
  const nounFilter = page.getByTestId("pos-filter-noun")
  // Initially not pressed
  await expect(nounFilter).toHaveAttribute("aria-pressed", "false")
  await nounFilter.click()
  // After clicking, noun filter is active
  await expect(nounFilter).toHaveAttribute("aria-pressed", "true")
  // "all" filter is no longer active
  await expect(page.getByTestId("pos-filter-all")).toHaveAttribute("aria-pressed", "false")
})

test("Set filter pills are toggleable", async ({ page }) => {
  await page.goto("/dictionary")
  const puFilter = page.getByTestId("set-filter-pu")
  // Initially not pressed
  await expect(puFilter).toHaveAttribute("aria-pressed", "false")
  await puFilter.click()
  // After clicking, pu filter is active
  await expect(puFilter).toHaveAttribute("aria-pressed", "true")
  // "all" set filter is no longer active
  await expect(page.getByTestId("set-filter-all")).toHaveAttribute("aria-pressed", "false")
})
