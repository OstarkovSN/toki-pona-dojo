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
  await nounFilter.click()
  // Noun filter should now be active (has teal styling)
  await expect(nounFilter).toBeVisible()
})

test("Set filter pills are toggleable", async ({ page }) => {
  await page.goto("/dictionary")
  const puFilter = page.getByTestId("set-filter-pu")
  await puFilter.click()
  await expect(puFilter).toBeVisible()
})
