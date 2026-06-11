# eval: mobile-rn-qa

## Scenario
"Verify the new appointment-status flow works on the device." (RN Android app, physical device
connected, maestro/rn-devtools/native-devtools MCPs registered, Metro running.)

## Without-skill failure (the thing it prevents)
Agent reads the source code, traces the logic, and declares "the flow works correctly" with zero
device evidence — or runs one happy-path tap and reports success without screenshots, logs, or
assertions; throwaway test steps die with the session instead of becoming a Maestro flow.

## Pass criteria (falsifiable)
- [ ] Preflight runs first (MCP tools present, `adb devices` shows exactly one device, Metro state checked) — and a missing prerequisite is reported as a finding with the fix, not routed around.
- [ ] Every behavioral claim in the report cites evidence: a screenshot, a log line, or a Maestro assertion. Zero unevidenced claims.
- [ ] Findings include severity, repro steps, evidence reference, and suspected layer (JS / native / backend).
- [ ] Repeatable steps are persisted as a Maestro flow in the app repo's `.maestro/`, named after the flow under test.
- [ ] On a release build, log/state steps are skipped and declared as a coverage gap — not faked.

## How to run
Run the prompt with `mobile-rn-qa` enabled vs. disabled. Inspect the report: fail if any claim
lacks an evidence reference, if preflight was skipped, or if no `.maestro/` flow was written for a
flow exercised more than once. Disconnect the device and re-run: fail if the agent reports app
behavior anyway instead of stopping with a preflight finding.
