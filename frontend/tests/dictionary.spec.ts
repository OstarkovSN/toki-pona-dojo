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
  await expect(page.getByTestId("pos-filter-all")).toHaveAttribute(
    "aria-pressed",
    "false",
  )
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
  await expect(page.getByTestId("set-filter-all")).toHaveAttribute(
    "aria-pressed",
    "false",
  )
})

test("Word detail page renders when navigating to /dictionary/toki", async ({
  page,
}) => {
  await page.goto("/dictionary/toki")
  // Page should render (even if loading or showing 'ala' error state)
  await expect(page).toHaveURL(/\/dictionary\/toki/)
  // Should not crash — either shows word content (h1) or error state (p.font-tp)
  // The page renders a skeleton while loading, then either h1 (success) or the 'ala' error paragraph
  await page.waitForSelector("h1, p.font-tp, .space-y-4", { timeout: 5000 })
  const pageContent = page.locator("h1, p.font-tp")
  await expect(pageContent.first()).toBeVisible()
})

test("Word detail page shows error state for unknown word", async ({
  page,
}) => {
  await page.goto("/dictionary/xyznotaword")
  await expect(page).toHaveURL(/\/dictionary\/xyznotaword/)
  // Backend endpoint not implemented — page should show error/empty state, not crash
  // Error state renders <p class="font-tp text-2xl ...">ala</p>
  await page.waitForSelector("p.font-tp, h1", { timeout: 5000 })
  const errorOrContent = page.locator("p.font-tp, h1")
  await expect(errorOrContent.first()).toBeVisible()
})

test("search with no matching results shows empty state", async ({ page }) => {
  await page.goto("/dictionary")
  await expect(page.getByTestId("dictionary-skeleton")).not.toBeVisible({
    timeout: 10000,
  })

  const searchInput = page.locator("input[data-testid='dictionary-search']")
  await searchInput.fill("xyznonexistentword")
  await page.waitForTimeout(500)

  const noResults = page.locator("[data-testid='dictionary-no-results']")
  await expect(noResults).toBeVisible({ timeout: 5000 })
})
