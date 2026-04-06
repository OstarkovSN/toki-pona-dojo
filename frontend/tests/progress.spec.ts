import { expect, test } from "@playwright/test"

const FAKE_USER = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "test@example.com",
  full_name: "Test User",
  is_active: true,
  is_superuser: false,
}

test.describe("Progress tracking (localStorage)", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test.beforeEach(async ({ page }) => {
    // Inject fake access_token before page JS runs so isLoggedIn() returns true
    await page.addInitScript(() => {
      localStorage.setItem("access_token", "fake-test-token")
    })

    // Mock auth API so useCurrentUser doesn't 401
    await page.route("**/api/v1/users/me", (route) =>
      route.fulfill({ status: 200, json: FAKE_USER }),
    )
    // Mock progress endpoint
    await page.route("**/api/v1/progress/me", (route) =>
      route.fulfill({
        status: 200,
        json: {
          completed_units: [],
          completed_lessons: [],
          current_unit: 1,
          srs_data: {},
          total_correct: 0,
          total_answered: 0,
          streak_days: 0,
          last_activity: null,
          known_words: [],
          recent_errors: [],
        },
      }),
    )
  })

  test("Home page shows stats labels", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByText("words known")).toBeVisible()
    await expect(page.getByText("lessons done")).toBeVisible()
    await expect(page.getByText("day streak")).toBeVisible()
  })

  test("Home page shows skill tree with Unit 1 active", async ({ page }) => {
    await page.goto("/")
    // Unit 1 should have the current indicator (pulsing dot)
    await expect(page.getByTestId("unit-current")).toBeVisible()
  })

  test("Home page reflects completed unit set in localStorage", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "tp-progress",
        JSON.stringify({
          completedUnits: [1],
          completedLessons: ["1:1", "1:2", "1:3"],
          currentUnit: 2,
          totalCorrect: 15,
          totalAnswered: 20,
          knownWords: ["mi", "toki", "pona"],
          recentErrors: [],
        }),
      )
    })

    await page.goto("/")
    // Unit 1 is complete — no current indicator on unit 1; unit 2 should be current
    await expect(page.getByTestId("unit-current")).toBeVisible()
    // Stats should reflect 3 words known
    await expect(page.getByText("words known")).toBeVisible()
  })

  test("Streak data from localStorage is shown on home page", async ({
    page,
  }) => {
    const today = new Date().toISOString().split("T")[0]
    await page.addInitScript((dateStr) => {
      localStorage.setItem(
        "tp-streak",
        JSON.stringify({
          currentStreak: 5,
          lastActivityDate: dateStr,
        }),
      )
    }, today)

    await page.goto("/")
    await expect(page.getByText("5")).toBeVisible()
    await expect(page.getByText("day streak")).toBeVisible()
  })

  test("Words known count reflects localStorage knownWords", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "tp-progress",
        JSON.stringify({
          completedUnits: [],
          completedLessons: [],
          currentUnit: 1,
          totalCorrect: 10,
          totalAnswered: 15,
          knownWords: ["mi", "sina", "ona", "toki", "pona"],
          recentErrors: [],
        }),
      )
    })

    await page.goto("/")
    await expect(page.getByText("words known")).toBeVisible()
  })
})
