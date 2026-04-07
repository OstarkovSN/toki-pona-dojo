import { expect, test } from "@playwright/test"
import type { GradeResponse, Lesson } from "../src/types/exercises"

const MOCK_LESSON: Lesson = {
  id: "lesson-1",
  unitId: 1,
  lessonIndex: 1,
  title: "basic words",
  exercises: [
    {
      id: "ex-1",
      type: "multi_choice",
      prompt: "What does 'tomo' mean?",
      options: ["house", "person", "food", "water"],
      correctIndex: 0,
      correctFeedback: "tomo means house or building.",
      correctAnswer: "house",
      words: ["tomo"],
    },
    {
      id: "ex-2",
      type: "fill_particle",
      prompt: "Fill in the particle",
      sentence: "jan ___ toki",
      options: ["li", "e", "la", "pi"],
      correctIndex: 0,
      translationHint: "The person speaks.",
      correctFeedback: "li marks the predicate after the subject.",
      correctAnswer: "li",
      words: ["jan", "li", "toki"],
    },
    {
      id: "ex-3",
      type: "match",
      prompt: "Match the toki pona words to their English meanings.",
      pairs: [
        { tokiPona: "telo", english: "water" },
        { tokiPona: "moku", english: "food" },
        { tokiPona: "tomo", english: "house" },
      ],
      words: ["telo", "moku", "tomo"],
    },
    {
      id: "ex-4",
      type: "word_bank",
      prompt: "Translate: 'The water is good.'",
      wordBank: ["telo", "li", "pona", "jan"],
      validAnswers: ["telo li pona"],
      correctAnswer: "telo li pona",
      words: ["telo", "li", "pona"],
    },
    {
      id: "ex-5",
      type: "story",
      prompt: "Read the story and answer the questions.",
      storyText: "jan li moku e kili. ona li pona.",
      translation: "The person eats fruit. They are well.",
      questions: [
        {
          question: "What does the person eat?",
          options: ["water", "fruit", "bread"],
          correctIndex: 1,
        },
      ],
      words: ["jan", "moku", "kili", "pona"],
    },
    {
      id: "ex-6",
      type: "concept_build",
      prompt: "Express 'my house is big' in toki pona.",
      hint: "Use 'mi' for my, 'tomo' for house, 'suli' for big.",
      suggestedAnswer: "tomo mi li suli",
      words: ["tomo", "mi", "suli"],
    },
    {
      id: "ex-7",
      type: "free_compose",
      prompt: "Say 'the big house' in toki pona.",
      words: ["tomo", "suli"],
    },
  ],
}

const MOCK_GRADE_RESPONSE: GradeResponse = {
  correct: true,
  score: 0.8,
  feedback: "Good job! 'tomo suli' is correct.",
  suggestedAnswer: "tomo suli",
}

test.describe("Lesson exercises flow", () => {
  test.beforeEach(async ({ page }) => {
    // Inject a fake access_token so isLoggedIn() returns true and _layout's
    // beforeLoad guard doesn't redirect to /login
    await page.addInitScript(() => {
      localStorage.setItem("access_token", "fake-test-token")
      // Suppress mobile chat panel Sheet overlay that blocks pointer events
      localStorage.setItem("tp-chat-open", "false")
    })

    await page.route("**/api/v1/lessons/units/1/lessons/1", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_LESSON),
      })
    })
    await page.route("**/api/v1/chat/grade", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_GRADE_RESPONSE),
      })
    })
    // Mock /users/me so useAuth doesn't 401 with the fake token
    await page.route("**/api/v1/users/me", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "00000000-0000-0000-0000-000000000001",
          email: "test@example.com",
          is_active: true,
          is_superuser: false,
          full_name: "Test User",
        }),
      })
    })
    // Mock /progress/me so useProgress doesn't 401 with the fake token
    await page.route("**/api/v1/progress/me", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
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
        }),
      })
    })
  })

  test("User story: complete a full lesson with mixed exercise types", async ({
    page,
  }) => {
    await page.goto("/learn/1/1")
    await expect(page.getByText(/exercise 1 of 7/i)).toBeVisible()

    // Exercise 1: MultiChoice — select correct answer "house"
    await expect(page.getByText("What does 'tomo' mean?")).toBeVisible()
    await page.getByRole("button", { name: "house" }).click()
    await expect(page.getByText("pona!")).toBeVisible()
    await page.getByRole("button", { name: "next" }).click()

    // Exercise 2: FillParticle — select correct particle "li"
    await expect(page.getByText(/exercise 2 of 7/i)).toBeVisible()
    await page.getByRole("button", { name: "particle option: li" }).click()
    await expect(page.getByText("pona!")).toBeVisible()
    await page.getByRole("button", { name: "next" }).click()

    // Exercise 3: Match — use aria-labels to match regardless of shuffle order
    await expect(page.getByText(/exercise 3 of 7/i)).toBeVisible()
    await page.getByRole("button", { name: "toki pona: telo" }).click()
    await page.getByRole("button", { name: "english: water" }).click()
    await page.getByRole("button", { name: "toki pona: moku" }).click()
    await page.getByRole("button", { name: "english: food" }).click()
    await page.getByRole("button", { name: "toki pona: tomo" }).click()
    await page.getByRole("button", { name: "english: house" }).click()
    await expect(page.getByText("pona!")).toBeVisible()
    await page.getByRole("button", { name: "next" }).click()

    // Exercise 4: WordBank — tap words to build "telo li pona"
    await expect(page.getByText(/exercise 4 of 7/i)).toBeVisible()
    // Click bank words (spans) by exact text — each word appears once in bank initially
    await page.getByText("telo", { exact: true }).first().click()
    await page.getByText("li", { exact: true }).first().click()
    await page.getByText("pona", { exact: true }).first().click()
    await page.getByRole("button", { name: "check" }).click()
    await expect(page.getByText("pona!")).toBeVisible()
    await page.getByRole("button", { name: "next" }).click()

    // Exercise 5: Story — answer comprehension question
    await expect(page.getByText(/exercise 5 of 7/i)).toBeVisible()
    await expect(
      page.getByText("jan li moku e kili. ona li pona."),
    ).toBeVisible()
    await page.getByRole("button", { name: "fruit" }).click()
    await expect(page.getByText("pona!")).toBeVisible()
    await page.getByRole("button", { name: "next" }).click()

    // Exercise 6: ConceptBuild (LLM-graded)
    await expect(page.getByText(/exercise 6 of 7/i)).toBeVisible()
    await page.getByPlaceholder(/type your answer/i).fill("tomo mi li suli")
    await page.getByRole("button", { name: "check" }).click()
    await expect(page.getByText(/good job/i).first()).toBeVisible()
    await page.getByRole("button", { name: "next" }).click()

    // Exercise 7: FreeCompose (last exercise)
    await expect(page.getByText(/exercise 7 of 7/i)).toBeVisible()
    await page.getByPlaceholder(/type your answer/i).fill("tomo suli")
    await page.getByRole("button", { name: "check" }).click()
    await expect(page.getByText(/good job/i).first()).toBeVisible()
    // Last exercise shows "finish lesson" instead of "next"
    await expect(
      page.getByRole("button", { name: "finish lesson" }),
    ).toBeVisible()
    await page.getByRole("button", { name: "finish lesson" }).click()

    // Lesson Complete screen
    await expect(page.getByText("lesson complete!")).toBeVisible()
    await expect(page.getByText("words practiced")).toBeVisible()
  })

  test("User story: wrong answer shows coral feedback and correct answer", async ({
    page,
  }) => {
    await page.goto("/learn/1/1")
    await expect(page.getByText("What does 'tomo' mean?")).toBeVisible()
    // Select wrong answer
    await page.getByRole("button", { name: "person" }).click()
    await expect(page.getByText("ike...")).toBeVisible()
    // Correct answer is shown
    await expect(
      page.locator("span.font-mono").filter({ hasText: "house" }),
    ).toBeVisible()
  })

  test("word bank chips link to dictionary", async ({ page }) => {
    await page.goto("/learn/1/1")

    // Navigate to exercise 4 (word_bank) — skip exercises 1, 2, 3
    await page.getByRole("button", { name: "house" }).click()
    await page.getByRole("button", { name: "next" }).click()

    await expect(page.getByText(/exercise 2 of 7/i)).toBeVisible()
    await page.getByRole("button", { name: "particle option: li" }).click()
    await page.getByRole("button", { name: "next" }).click()

    await expect(page.getByText(/exercise 3 of 7/i)).toBeVisible()
    await page.getByRole("button", { name: "toki pona: telo" }).click()
    await page.getByRole("button", { name: "english: water" }).click()
    await page.getByRole("button", { name: "toki pona: moku" }).click()
    await page.getByRole("button", { name: "english: food" }).click()
    await page.getByRole("button", { name: "toki pona: tomo" }).click()
    await page.getByRole("button", { name: "english: house" }).click()
    await page.getByRole("button", { name: "next" }).click()

    // Now on exercise 4: word_bank with wordBank: ["telo", "li", "pona", "jan"]
    await expect(page.getByText(/exercise 4 of 7/i)).toBeVisible()

    // WordChip for "telo" should be visible in the word bank
    const chip = page.getByTestId("word-chip-telo")
    await expect(chip).toBeVisible({ timeout: 5000 })

    // The chip should be wrapped in a link pointing to the dictionary
    const href = await chip.evaluate(
      (el) => el.closest("a")?.getAttribute("href") ?? null,
    )
    expect(href).toContain("/dictionary/telo")
  })

  test("User story: LLM grading error shows fallback message", async ({
    page,
  }) => {
    // Override grade route to return error
    await page.route("**/api/v1/chat/grade", (route) => {
      route.fulfill({ status: 500, body: "Internal Server Error" })
    })

    await page.goto("/learn/1/1")

    // Exercise 1: MultiChoice
    await page.getByRole("button", { name: "house" }).click()
    await page.getByRole("button", { name: "next" }).click()

    // Exercise 2: FillParticle
    await expect(page.getByText(/exercise 2 of 7/i)).toBeVisible()
    await page.getByRole("button", { name: "particle option: li" }).click()
    await page.getByRole("button", { name: "next" }).click()

    // Exercise 3: Match
    await expect(page.getByText(/exercise 3 of 7/i)).toBeVisible()
    await page.getByRole("button", { name: "toki pona: telo" }).click()
    await page.getByRole("button", { name: "english: water" }).click()
    await page.getByRole("button", { name: "toki pona: moku" }).click()
    await page.getByRole("button", { name: "english: food" }).click()
    await page.getByRole("button", { name: "toki pona: tomo" }).click()
    await page.getByRole("button", { name: "english: house" }).click()
    await page.getByRole("button", { name: "next" }).click()

    // Exercise 4: WordBank
    await expect(page.getByText(/exercise 4 of 7/i)).toBeVisible()
    await page.getByText("telo", { exact: true }).first().click()
    await page.getByText("li", { exact: true }).first().click()
    await page.getByText("pona", { exact: true }).first().click()
    await page.getByRole("button", { name: "check" }).click()
    await page.getByRole("button", { name: "next" }).click()

    // Exercise 5: Story
    await expect(page.getByText(/exercise 5 of 7/i)).toBeVisible()
    await page.getByRole("button", { name: "fruit" }).click()
    await page.getByRole("button", { name: "next" }).click()

    // Exercise 6: ConceptBuild — grading will fail
    await expect(page.getByText(/exercise 6 of 7/i)).toBeVisible()
    await page.getByPlaceholder(/type your answer/i).fill("tomo mi li suli")
    await page.getByRole("button", { name: "check" }).click()
    await expect(
      page.getByText(/could not reach the grading service/i),
    ).toBeVisible()
  })
})
