# Boonty Mini-Game

## Start of every session (mandatory)

Before doing anything else in a new session, read, in this order:
1. `STATUS.md`: current phase, what's waiting on Laury, blockers, next actions.
2. `docs/PROGRESS.md`: history of milestones and playtest feedback.

Then resume from the "Next" / "Waiting on Laury" sections. Read other docs (`docs/GAME_DESIGN.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`) only as the task needs them.
At the end of a session with meaningful changes, update `STATUS.md` and `docs/PROGRESS.md` before stopping.

## Mission

build one of these very addictive game we see on ads on social media, most of them though are just a very small moment of the reayl game. It could be inspired by those with shooting and going through doors to upgrade, where oyu either add characters to go with you  or you add weapongs and power. Or you could go for a very cute and addictive game with a cute character.  It has to be polished, genuinely fun 2d game, very nice in graphics and addictive.

## Chosen game: Boonty Blaster (approved by Laury, 24 Sep 2026)

A Mob Control-style game in portrait 2D. Hold to fire a stream of mini Boonty hedgehogs from a cannon and drag to aim. Minis multiply through gates (×2, ×3, +10), stop waves of enemies, and knock down the enemy castle. A level lasts 45–90 s and ends in a clear win or loss. Full design: `docs/GAME_DESIGN.md`. Concept mockups: `docs/concepts/`.

## Brand

- Mascot: a white fluffy hedgehog (3D renders, many poses). Source: Laury's Google Drive "character" folders (White / purple / blue / Yellow). Only the few poses we need are copied into `public/assets/`.
- Palette: Lavender 500 `#6173EB` (primary), Lavender 100 `#DADFFF`, Lavender 900 `#3817AF`, Yellow 100 `#FFF0B5`, Yellow 200 `#FEE580`, Yellow 500 `#F1BE00`, Blue 500 `#4DC0FF`, Orange 500 `#FF7A63`, Orange 900 `#FF4A18`, Black 900 `#171C3B`, White `#FFF9F9`.
- Font: Delight (freeware, commercial use OK, files may not be modified or redistributed on their own). Logo: "Boonty" wordmark + round icon (SVGs in the Drive media kit).
- Company: boonty.io, loyalty rewards at the payment terminal. Tone: energetic, simple, rewarding.

Priorities:

FUN > CLARITY > POLISH > FEATURES

Keep the game simple.

The game must:
- launch reliably,
- be understandable within ~10 seconds,
- have a strong single core mechanic,
- support short replayable sessions,
- feel responsive,
- have coherent Boonty branding,
- remain technically simple.

## Commands

Run:
`npm run dev`

Build:
`npm run build`

Test:
`npm test`

Lint:
`npm run lint`

## Development rules

- Inspect before editing.
- Do not speculate about code you have not read.
- Prefer simple solutions.
- Avoid unnecessary abstractions.
- Do not add features without a clear gameplay benefit.
- Do not create unnecessary dependencies.
- Do not repeatedly read the entire repository.
- Run relevant tests after changes.
- Run the game after meaningful gameplay changes.
- Never report completion without verification.

## Agent usage

Use subagents for genuinely independent specialist work.

Good uses:
- game design review
- UX/game-feel review
- QA
- independent debugging
- final review

Do not spawn agents for trivial edits.

Prefer one focused reviewer over multiple redundant reviewers.

## Persistent state

Maintain:

- `docs/PROJECT.md`
- `docs/GAME_DESIGN.md`
- `docs/ARCHITECTURE.md`
- `docs/PROGRESS.md`
- `docs/DECISIONS.md`

Keep them concise.

## Git

Use git checkpoints for meaningful milestones.

Never:
- force push
- reset destructive work
- delete unfamiliar files
- overwrite unrelated user work.

## Core principle

Make the existing game better before making it bigger

## Autonomous Orchestration

The Lead Claude instance is the project's ORCHESTRATOR.

The orchestrator is responsible for continuously moving the project toward the objective defined in this file.

It should not wait for the user to specify every next task.

The default development loop is:

DESIGN
→ DELEGATE
→ IMPLEMENT
→ BUILD
→ PLAYTEST
→ REVIEW
→ FIX
→ IMPROVE
→ TEST
→ REPEAT

Continue this loop autonomously whenever the next step is clear.

Do not add features merely to remain active. Prefer improving the existing game over increasing its scope.

### Agent delegation

Use specialist agents when their independent expertise provides meaningful value.

Agents may work in parallel when their tasks are genuinely independent.

Never parallelize agents that modify the same files or systems in conflicting ways.

The orchestrator remains responsible for:
- prioritization,
- integration,
- architectural decisions,
- deciding which agent recommendations to implement,
- final verification.

Agents should return concise findings and recommendations.

### Transparency

Maintain `/STATUS.md` as the project's live development dashboard.

Update it after every meaningful milestone.

STATUS.md must show:

- overall project phase,
- current objective,
- orchestrator status,
- active agents,
- parallel tasks,
- completed work,
- current work,
- next actions,
- tests,
- blockers,
- latest milestone.

Do not log trivial operations.

### Persistent artifacts

Important work must be preserved in the repository.

Use:

- `docs/GAME_DESIGN.md` for game design
- `docs/ARCHITECTURE.md` for technical architecture
- `docs/PROGRESS.md` for development progress
- `docs/DECISIONS.md` for important decisions
- `/STATUS.md` for current live status

Create additional documentation only when it provides lasting value.

### Progress reporting

At every meaningful milestone, update STATUS.md using:

## Status
Phase:
Objective:
Orchestrator:
Active agents:

## Parallel work
- Agent:
  Task:
  Status:

## Completed
- ...

## Current
- ...

## Tests
- ...

## Issues / Blockers
- ...

## Next
- ...

Do not stop simply because one delegated task has finished.

After integrating a completed task, evaluate the next highest-value action and continue.

### Human intervention

Do not ask the user for confirmation for normal implementation or design decisions that can reasonably be inferred from the project requirements.

Ask the user only when:
- an important product decision genuinely cannot be inferred,
- a destructive action is required,
- external credentials or services are required,
- or a significant ambiguity materially changes the game.

Otherwise continue autonomously.

### Milestones
- M1: Playable prototype of Boonty Blaster: aim and fire, gates, enemy waves, enemy castle, win/lose, a short level sequence, instant restart / next level, Boonty palette and hedgehog art
- M2: Game feel: juice, sound, feedback, difficulty curve (after Laury's playtest)
- M3: Meta and brand polish: coins, a few upgrades, title/win screens with mascot art
- M4: Shareable build: deployable, runs well on mobile browsers

After each milestone: checkpoint, update STATUS.md, request Laury's playtest, then STOP until Laury responds.
### Playtesting
- Automated playtest = scripted simulation of game logic + a Playwright run that loads the game, plays a few inputs and takes screenshots.
- Real playtest = Laury. When a build is worth playing, add it to "Waiting on Laury" in STATUS.md with the command to run it and 2–3 specific things to check.
- Never describe the game as "fun" or "feels good" without Laury's feedback.

### Completion

The project should continue iterating until it reaches a meaningful milestone or a genuine blocker.

When a milestone is reached:
- verify the build,
- run relevant tests,
- playtest,
- update documentation,
- update STATUS.md,
- create a git checkpoint.

Then determine whether another high-value improvement remains.
.
