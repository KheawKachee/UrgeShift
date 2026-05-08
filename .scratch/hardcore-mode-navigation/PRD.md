## Problem Statement

UrgeShift currently behaves like a set of separate prototype pages instead of one coherent product flow. Navigation is scattered inside individual screens, the core privacy-first urge session is mixed with emerging persistent features, and there is no dedicated surface for hardcore users who want ongoing structure such as self-check-ins and progress tracking. The user wants one tab-bar-driven experience, a separate Hardcore Mode path that still avoids backend identity, and a progress surface that can serve both end users and hackathon judges.

## Solution

Add a shared MVP tab bar with five destinations: `Shift`, `ภูติ`, `Preview`, `Plans`, and `Progress`. Keep the core UrgeShift urge-interruption flow privacy-first and session-light, while introducing Hardcore Mode as an opt-in, device-local layer with a Local Name, Scheduled Check-In, Progress Board, and collapsible MVP Metrics. Use one local event model to power both user-facing progress and judge-facing demo metrics without requiring a backend account.

## User Stories

1. As a user in an urge moment, I want every page to feel like one app, so that I do not feel like I am jumping between disconnected demos.
2. As a user in an active urge session, I want the tab bar to remain visible but guarded, so that I stay oriented without accidentally abandoning the session.
3. As a user who skips onboarding, I want `Shift` to remain useful without any persistent setup, so that the core product still works at the highest-friction moment.
4. As a user who wants a support persona, I want a `ภูติ` tab for the Background Quiz, so that I can shape how the app helps me later.
5. As a user who completed the quiz, I want `Preview` to show my `ภูติประจำตัว` and near-term Better Self Preview states, so that I can visualize a believable next step.
6. As a user who found something helpful, I want `Plans` to hold printable saved plans, so that I can reuse what helped without needing an account.
7. As a hardcore user, I want to choose a Local Name on my device, so that the app can address me personally without collecting backend identity.
8. As a hardcore user, I want a short Scheduled Check-In, so that I can build a repeatable rhythm outside urge moments.
9. As a hardcore user, I want my Progress Board to show simple supportive signals, so that I can see consistency without shame-heavy language.
10. As a user who follows a saved plan, I want that action to count toward progress, so that the persistent layer reflects real usage rather than passive storage.
11. As a demo viewer, I want `Progress` to include collapsible MVP Metrics, so that I can understand engagement quality and loop completion without seeing backend dashboards.
12. As a judge, I want the app to show a coherent local-only data story, so that the privacy posture and the metrics story do not contradict each other.
13. As a future backend developer, I want the local event model to be structured, so that later server-side analytics or LLM context wiring can map cleanly from current behavior.
14. As a developer, I want the shared navigation and Hardcore Mode state to be centralized, so that new routes do not recreate page-specific navigation logic.

## Implementation Decisions

- Introduce a shared tab bar component used across the current top-level routes. The tab bar is the primary product navigation and replaces page-specific backlink clusters.
- Preserve the glossary split between core UrgeShift and Hardcore Mode. `Shift` remains privacy-first and useful without persistent setup.
- Add a device-local Hardcore Mode store with two responsibilities: a Local Name/profile record and an append-only event log for progress and demo metrics.
- Use one derived metrics layer on top of local events. The same event stream powers both Progress Board and collapsible MVP Metrics, but the two surfaces present different readouts.
- Represent Scheduled Check-In as a three-step, structured self-check-in with support preference and tiny-goal selection. It is user-controlled and explicitly not passive sensing.
- Keep the existing quiz result in session storage, but allow Progress to read the current `ภูติ` result opportunistically for personalization when available.
- Treat plan follow-through as an explicit user action from `Plans`, not an inference.
- Soft-lock non-`Shift` tab navigation during an active urge session by intercepting navigation and requiring a user confirmation to exit the session.
- Reuse current shell patterns and visual language rather than introducing a second design system for Hardcore Mode.

## Testing Decisions

- Good tests should verify user-visible behavior and state transitions, not implementation details or CSS internals.
- Test the local Hardcore Mode store as a deep module: reading/writing Local Name, recording events, deriving progress counts, and deriving MVP Metrics.
- Test Scheduled Check-In behavior as a stateful user flow: answering the three questions, saving a completion, and reflecting the update in Progress.
- Test active-session tab locking as navigation behavior: blocked routes require confirmation while `Shift` remains available.
- Test Plans integration behavior: marking plan follow-through updates Progress and persists locally.
- There is little existing automated test prior art in this repo, so focused module tests and narrow route interaction tests are preferred over broad snapshot coverage.

## Out of Scope

- Backend identity, sync, or cloud persistence
- Public social leaderboard or competitive ranking
- Passive sensing, autonomous mood inference, or unsolicited AI-generated check-ins
- Push notifications or real OS-level scheduling
- Clinical scoring, relapse prediction, or treatment claims
- Multi-user sharing beyond current printable/exportable artifacts

## Further Notes

- `Progress` should feel supportive first and analytical second.
- `MVP Metrics` must stay clearly secondary in the UI, even though they share the same local event model.
- `fairy` should not re-enter the canonical product language; the UI term remains `ภูติ`, shorthand for `ภูติประจำตัว`.
