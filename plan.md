# toki pona dojo — Implementation Plan

> This is the current implementation roadmap. The original monolithic spec has been archived at
> [`docs/superpowers/global_plan_v1_archived.md`](docs/superpowers/global_plan_v1_archived.md).
> Each phase has a **design spec** and an **implementation plan** in `docs/superpowers/`.

---

## Phases

| # | Phase | Description | Spec | Plan |
|---|-------|-------------|------|------|
| 1 | **Clean Slate** | Remove Items demo code, rebrand to "toki pona dojo", leave a clean app with only auth/users | [spec](docs/superpowers/specs/2026-04-05-phase-01-clean-slate-design.md) | [plan](docs/superpowers/plans/2026-04-05-phase-01-clean-slate.md) |
| 1.5 | **Test Coverage** | Find all test gaps in the current backend, write tests to reach 100% line coverage | — | [plan](docs/superpowers/plans/2026-04-05-phase-015-test-coverage.md) |
| 2 | **Data Layer** | Extract toki pona content into structured JSON, add UserProgress model, serve dictionary/lessons via read-only API | [spec](docs/superpowers/specs/2026-04-05-phase-02-data-layer-design.md) | [plan](docs/superpowers/plans/2026-04-05-phase-02-data-layer.md) |
| 3 | **LLM Integration** | LLM-powered chat streaming and exercise grading endpoints with rate limiting for anonymous users | [spec](docs/superpowers/specs/2026-04-05-phase-03-llm-integration-design.md) | [plan](docs/superpowers/plans/2026-04-05-phase-03-llm-integration.md) |
| 4 | **LangFuse Observability** | Self-hosted LangFuse v3 with all LLM calls traced; graceful degradation when unavailable | [spec](docs/superpowers/specs/2026-04-05-phase-04-langfuse-observability-design.md) | [plan](docs/superpowers/plans/2026-04-05-phase-04-langfuse-observability.md) |
| 4.5.1 | **Test Gaps Search** | 1. Dispatch an agent to find all test gaps in the current backend<br>2.Dispatch an agent to use writing-plans skill to write the plan for the section 4.5.2 that will close those gaps<br>3. Add it to [this file](plan.md) | — | — |
| 4.5.2 | **Test Coverage** | Fill the test gaps that were found | — | [plan](docs/superpowers/plans/2026-04-05-phase-045-test-coverage.md) |
| 5 | **Frontend — Structure** | Zen-themed UI replacing the template dashboard: skill tree, dictionary, grammar pages | [spec](docs/superpowers/specs/2026-04-05-phase-05-frontend-structure-design.md) | [plan](docs/superpowers/plans/2026-04-05-phase-05-frontend-structure.md) |
| 6 | **Frontend — Exercises** | Lesson view with 7 interactive exercise types, immediate feedback, LLM-graded free-form | [spec](docs/superpowers/specs/2026-04-05-phase-06-frontend-exercises-design.md) | [plan](docs/superpowers/plans/2026-04-05-phase-06-frontend-exercises.md) |
| 7 | **Frontend — Chat** | Always-on chat sidebar with jan sona tutor, streaming, BYOM direct calls, route-aware context | [spec](docs/superpowers/specs/2026-04-05-phase-07-frontend-chat-design.md) | [plan](docs/superpowers/plans/2026-04-05-phase-07-frontend-chat.md) |
| 8 | **Progress & Persistence** | localStorage for anonymous users, server sync for auth'd users, SM-2 spaced repetition, streak tracking | [spec](docs/superpowers/specs/2026-04-05-phase-08-progress-persistence-design.md) | [plan](docs/superpowers/plans/2026-04-05-phase-08-progress-persistence.md) |
| 9 | **Security** | CrowdSec + Traefik bouncer for automatic DDoS protection and malicious IP blocking | [spec](docs/superpowers/specs/2026-04-05-phase-09-security-design.md) | [plan](docs/superpowers/plans/2026-04-05-phase-09-security.md) |
| 10 | **Polish** | Mobile responsiveness, dark mode, loading/error states, comprehensive E2E tests | [spec](docs/superpowers/specs/2026-04-05-phase-10-polish-design.md) | [plan](docs/superpowers/plans/2026-04-05-phase-10-polish.md) |

---

## Workflow per Phase

### Development pipeline
Follow the pipeline defined in global CLAUDE.md for each of the plans:
Invoke superpowers:subagent-driven-development and execute the plan.
**Learnings lifecycle (orchestrator responsibilities):**
Each task's agent chain (implementer → spec reviewer → code reviewer → fixers) writes learnings to `.claude/learnings-{task-name-slug}.md`. Your job:
- **Before dispatching** each subagent, include in the prompt: `"Record learnings to .claude/learnings-{task-name-slug}.md using the surfacing-subagent-learnings skill."`
- **After each task chain completes** (all reviews pass, task marked done): dispatch the `learnings-curator` agent with the scratch file path. It curates entries into the right CLAUDE.md files and deletes the scratch file.
- **After all tasks complete**, glob `.claude/learnings-*.md` — if any remain, dispatch `learnings-curator` for each before finishing the branch.


### Branch & implementation
- Each phase is implemented on its own branch, **created from `master`**:
  ```
  git checkout master && git checkout -b phase-01-clean-slate
  ```

### Finishing the branch
- When implementation is complete, invoke the **`superpowers:finishing-a-development-branch`** skill.
- At step 3 of the skill, choose **option 2: Push and create a Pull Request**.

### PR review loop
After the PR is created, open a task `<feature-name>-review-pr` and repeat the following until the reviewer subagent approves:

1. Invoke **`/pr-review-toolkit:review-pr`** to review the PR (use subagents where possible).
   Force reviewers to dump learnings using the **`surfacing-subagent-learnings`** skill.
2. Invoke a subagent with the **`receiving-code-review`** skill to apply the fixes.
   Force the subagent to dump learnings using the **`surfacing-subagent-learnings`** skill.

### Wrap-up
After the reviewer approves:

1. Dispatch a **`learnings-curator`** subagent to curate all `learnings-*.md` scratch files into the right `CLAUDE.md` files.
2. **Merge the PR.**
3. Dispatch a subagent to **review the next phase's plan** for consistency with the current project state and the subagent to apply any needed fixes to the plan before starting.
4. Only then, proceed with the next phase.
