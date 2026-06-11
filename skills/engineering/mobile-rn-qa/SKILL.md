---
name: mobile-rn-qa
description: QA a React Native Android build on a physical device — Maestro flows for E2E, rn-devtools for Metro console/network logs, native-devtools for ADB screenshots/taps/UI inspection — with every claim backed by device evidence. Use when verifying an RN change on real hardware (functional pass, UX review, log inspection) and those MCP servers plus adb and a connected device are available. Not for web UI testing (chrome-devtools/playwright), unit/Jest tests (tdd), or iOS.
license: MIT
---

# mobile-rn-qa — device-verified RN QA

Every claim about app behavior must be backed by device evidence — a screenshot, a log line,
or a Maestro assertion. Reading the source and declaring "it works" is not QA. (Generalized from
a project-proven original; project-specific app paths and business rules belong in the app repo,
not here.)

## Preflight (always first)

1. **MCPs loaded?** ToolSearch for `maestro`, `rn-devtools`, `native-devtools` tools. If absent,
   stop and tell the user how to add them, then restart the session. Maestro's MCP server ships
   inside the Maestro CLI itself: `claude mcp add maestro -- maestro mcp` (do NOT `npx maestro-mcp`
   — that npm name is an unrelated placeholder). The others: `claude mcp add rn-devtools -- npx -y
   react-native-ai-debugger` and `claude mcp add native-devtools -- npx -y native-devtools-mcp`.
2. **Device + CLI:** `adb devices` (exactly one entry in state `device`), `maestro --version`.
   Zero or multiple devices → stop and report; never guess which device you own.
3. **Metro:** rn-devtools needs a running Metro debug build. On a release build, skip the
   log/state steps and say so in the report — don't fake them.

Preflight failures are findings, not blockers to route around: report exactly what is missing
and the fix, then stop.

## Tool routing

| Need | Use |
|---|---|
| Repeatable E2E flow, assertions, navigation | Maestro MCP (flows live in the app repo's `.maestro/`) |
| Console/network logs, component & state inspection | rn-devtools MCP (via Metro) |
| Screenshot, tap, type, UI hierarchy / OCR on device | native-devtools MCP (via ADB) |

Anything you'd run twice becomes a Maestro flow; native-devtools is for ad-hoc poking and
evidence capture; rn-devtools correlates UI symptoms with JS errors and API calls.

## Working loop

1. Exercise the target flow (Maestro, or manually via native-devtools).
2. Capture evidence at each checkpoint: screenshot + the relevant log slice.
3. Judge against the expectation (PRD / task / backend contract). UX review covers touch-target
   size, spacing, and loading/error/empty states — not just the happy path.
4. Report each finding: severity, repro steps, evidence reference, suspected layer
   (JS / native / backend), and which expectation it violates. Findings you cannot evidence
   do not go in the report.

## Example

❌ "Tapped Start; the status updated correctly." (no evidence)

✅ "Tapped Start (screenshot 03); row shows EN_ROUTE (screenshot 04); network log 14:02:11 shows
   `PATCH /appointments/…/status → 200`. Matches PRD A1-2."

## Why this works

Persistent Maestro flows belong in the app repo's `.maestro/` directory, named after the flow
under test, so they accumulate into a regression suite instead of dying with the session.
Evidence-cited findings make the QA verdict falsifiable — the reader can check every claim.
Run this as the device gate inside `dev-loop` after a mobile change lands its unit-level slices.
