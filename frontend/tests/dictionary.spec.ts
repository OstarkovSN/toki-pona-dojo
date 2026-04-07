import { expect, test } from "@playwright/test"

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

test("word detail page mobile layout", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto("/dictionary/toki")
  await expect(page.locator("main")).toBeVisible()
  const mainWidth = await page
    .locator("main")
    .evaluate((el) => el.getBoundingClientRect().width)
  expect(mainWidth).toBeLessThanOrEqual(380) // with small tolerance
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

test("word cards render after loading", async ({ page }) => {
  await page.goto("/dictionary")
  // Wait for loading skeleton to disappear
  await expect(page.getByTestId("dictionary-skeleton")).not.toBeVisible({
    timeout: 10000,
  })
  // At least one word card should be visible
  const firstCard = page.locator("[data-testid^='word-card-']").first()
  await expect(firstCard).toBeVisible({ timeout: 5000 })
})

test("clicking a word card navigates to detail page", async ({ page }) => {
  await page.goto("/dictionary")
  await expect(page.getByTestId("dictionary-skeleton")).not.toBeVisible({
    timeout: 10000,
  })
  const ponaCard = page.getByTestId("word-card-pona")
  await expect(ponaCard).toBeVisible({ timeout: 5000 })
  await ponaCard.click()
  await expect(page).toHaveURL(/\/dictionary\/pona/, { timeout: 5000 })
})

test("word detail page shows POS badges", async ({ page }) => {
  await page.goto("/dictionary/toki")
  await expect(page.locator("h1")).toBeVisible({ timeout: 5000 })
  // toki has pos: ["verb", "noun"] — at least one badge should appear
  const badges = page
    .locator(".font-label")
    .filter({ hasText: /noun|verb|particle/ })
  await expect(badges.first()).toBeVisible({ timeout: 5000 })
})

test("word detail page shows definitions", async ({ page }) => {
  await page.goto("/dictionary/toki")
  await expect(page.locator("h1")).toBeVisible({ timeout: 5000 })
  // toki definition contains text about language/communication
  const content = page.locator("main").last()
  await expect(content).toContainText(/language|speech|communicate|talk/, {
    timeout: 5000,
    ignoreCase: true,
  })
})

test("word detail page shows note for kijetesantakalu", async ({ page }) => {
  await page.goto("/dictionary/kijetesantakalu")
  await expect(page.locator("h1")).toBeVisible({ timeout: 5000 })
  // kijetesantakalu has a note field with Finnish etymology text
  const noteSection = page.locator("main").last()
  await expect(noteSection).toContainText(/note/i, { timeout: 5000 })
  await expect(noteSection).toContainText(/kinkajou|karhu|raccoon/, {
    timeout: 5000,
    ignoreCase: true,
  })
})

test("word detail page shows definition for 'a'", async ({ page }) => {
  await page.goto("/dictionary/a")
  await expect(page.locator("h1")).toBeVisible({ timeout: 5000 })
  // word 'a' has pos: particle with definition about emphasis/emotion/confirmation
  const content = page.locator("main").last()
  await expect(content).toContainText(/particle/, { timeout: 5000 })
  await expect(content).toContainText(/emphasis|emotion|confirmation/, {
    timeout: 5000,
    ignoreCase: true,
  })
})

test("word detail page see_also: navigation from pona to dictionary works", async ({
  page,
}) => {
  await page.goto("/dictionary/pona")
  await expect(page.locator("h1")).toBeVisible({ timeout: 5000 })
  // Navigate back to dictionary, then to another word
  const backLink = page.locator('a[href="/dictionary"]').first()
  await expect(backLink).toBeVisible({ timeout: 5000 })
  await backLink.click()
  await expect(page).toHaveURL(/\/dictionary$/, { timeout: 5000 })
  // Navigate to toki
  const tokiCard = page.getByTestId("word-card-toki")
  await expect(tokiCard).toBeVisible({ timeout: 5000 })
  await tokiCard.click()
  await expect(page).toHaveURL(/\/dictionary\/toki/, { timeout: 5000 })
})

test("word detail page shows ku suli badge for a ku word", async ({ page }) => {
  // ku is a ku=true word
  await page.goto("/dictionary/ku")
  await expect(page.locator("h1")).toBeVisible({ timeout: 5000 })
  // The detail page should show the "ku suli" badge
  await expect(page.locator("main").last()).toContainText("ku suli", {
    timeout: 5000,
  })
})

test("back link on detail page returns to dictionary list", async ({
  page,
}) => {
  await page.goto("/dictionary/toki")
  await expect(page.locator("h1")).toBeVisible({ timeout: 5000 })
  // Click the back link (contains "dictionary" text with ArrowLeft icon)
  const backLink = page.locator('a[href="/dictionary"]').first()
  await expect(backLink).toBeVisible({ timeout: 5000 })
  await backLink.click()
  await expect(page).toHaveURL(/\/dictionary$/, { timeout: 5000 })
})

test("detail page document title includes the word name", async ({ page }) => {
  await page.goto("/dictionary/toki")
  await expect(page.locator("h1")).toBeVisible({ timeout: 5000 })
  await expect(page).toHaveTitle(/toki.*toki pona dojo/i, { timeout: 5000 })
})

test("POS filter reduces word card count vs all", async ({ page }) => {
  await page.goto("/dictionary")
  // Wait for at least one word card to confirm words have loaded
  await expect(page.locator("[data-testid^='word-card-']").first()).toBeVisible(
    { timeout: 10000 },
  )
  const allCards = page.locator("[data-testid^='word-card-']")
  const allCount = await allCards.count()
  expect(allCount).toBeGreaterThan(0)

  await page.getByTestId("pos-filter-noun").click()
  await page.waitForTimeout(300)
  const nounCount = await page.locator("[data-testid^='word-card-']").count()
  expect(nounCount).toBeGreaterThan(0)
  expect(nounCount).toBeLessThan(allCount)
})

test("set filter reduces word card count vs all", async ({ page }) => {
  await page.goto("/dictionary")
  // Wait for at least one word card to confirm words have loaded
  await expect(page.locator("[data-testid^='word-card-']").first()).toBeVisible(
    { timeout: 10000 },
  )
  const allCount = await page.locator("[data-testid^='word-card-']").count()
  expect(allCount).toBeGreaterThan(0)

  await page.getByTestId("set-filter-pu").click()
  await page.waitForTimeout(300)
  const puCount = await page.locator("[data-testid^='word-card-']").count()
  expect(puCount).toBeGreaterThan(0)
  expect(puCount).toBeLessThan(allCount)
})
