// Invariant tests for the L4 ledger. Pure in-memory (no disk). Run: node coordination/tests.mjs
import * as L from "./ledger.mjs";

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; } else { fail++; console.error("  ✖ " + msg); } }
function throws(code, fn, msg) {
  try { fn(); fail++; console.error(`  ✖ ${msg} (expected ${code}, no throw)`); }
  catch (e) { if (e.code === code) pass++; else { fail++; console.error(`  ✖ ${msg} (got ${e.code||e.message})`); } }
}

// --- atomic checkout / single-assignee / no-retry CONFLICT
{
  const l = L.newLedger();
  const a = L.createTask(l, { title: "A" }, 1000);
  L.checkout(l, a.id, "agent-1", "run-1", {}, 1001);
  ok(l.tasks[a.id].status === "in_progress" && l.tasks[a.id].assignee === "agent-1", "checkout claims task");
  throws("CONFLICT", () => L.checkout(l, a.id, "agent-2", "run-2", {}, 1002), "second agent checkout -> CONFLICT");
  ok(l.tasks[a.id].assignee === "agent-1", "owner unchanged after conflict");
  // idempotent re-checkout by same owner is allowed (resume)
  L.checkout(l, a.id, "agent-1", "run-1", { expectedStatuses: ["in_progress"] }, 1003);
  ok(l.tasks[a.id].executionRunId === "run-1", "owner can resume own task");
}

// --- budget hard-stop
{
  const l = L.newLedger();
  l.budget.cap = 100;
  const a = L.createTask(l, { title: "A" });
  L.recordCost(l, a.id, 100);
  throws("BUDGET", () => L.checkout(l, a.id, "ag", "r"), "checkout at/over cap -> BUDGET");
  ok(l.budget.spent === 100, "spend tracked");
}

// --- circular blocker rejection
{
  const l = L.newLedger();
  const a = L.createTask(l, { title: "A" });
  const b = L.createTask(l, { title: "B" });
  const c = L.createTask(l, { title: "C" });
  L.addBlocker(l, b.id, a.id); // b depends on a
  L.addBlocker(l, c.id, b.id); // c depends on b
  throws("CYCLE", () => L.addBlocker(l, a.id, c.id), "a<-c closes a cycle -> CYCLE");
  throws("CYCLE", () => L.addBlocker(l, a.id, a.id), "self-block -> CYCLE");
}

// --- blocker gating + auto-resume + wake
{
  const l = L.newLedger();
  const a = L.createTask(l, { title: "blocker" });
  const b = L.createTask(l, { title: "dependent" });
  L.addBlocker(l, b.id, a.id);
  ok(l.tasks[b.id].status === "blocked", "dependent goes blocked");
  throws("BLOCKED", () => L.checkout(l, b.id, "ag", "r"), "cannot checkout a blocked task");
  L.complete(l, a.id, 2000);
  ok(l.tasks[b.id].status === "todo", "dependent auto-resumes to todo");
  ok(l.wakes.some((w) => w.taskId === b.id && w.reason === "blockers_resolved"), "blockers_resolved wake queued");
}

// --- parent children-completed wake
{
  const l = L.newLedger();
  const p = L.createTask(l, { title: "parent" });
  const c1 = L.createTask(l, { title: "c1", parent: p.id });
  const c2 = L.createTask(l, { title: "c2", parent: p.id });
  L.complete(l, c1.id, 3000);
  ok(!l.wakes.some((w) => w.taskId === p.id), "no parent wake until all children done");
  L.complete(l, c2.id, 3001);
  ok(l.wakes.some((w) => w.taskId === p.id && w.reason === "children_completed"), "children_completed wake queued");
}

// --- liveness recovery: stale run released + exactly one wake
{
  const l = L.newLedger();
  const a = L.createTask(l, { title: "A" });
  L.checkout(l, a.id, "ag", "run-x", {}, 5000);
  const rec1 = L.livenessScan(l, 1000, 5500); // not stale yet
  ok(rec1.length === 0, "fresh run not recovered");
  const rec2 = L.livenessScan(l, 1000, 7000); // stale
  ok(rec2.includes(a.id), "stale run recovered");
  ok(l.tasks[a.id].status === "todo" && l.tasks[a.id].assignee === null, "recovered task released");
  L.livenessScan(l, 1000, 7001); // idempotent — no duplicate wake
  ok(l.wakes.filter((w) => w.taskId === a.id && w.reason === "run_died").length === 1, "exactly one recovery wake");
}

// --- priority/status ordering for getReady
{
  const l = L.newLedger();
  const t1 = L.createTask(l, { title: "low todo", priority: 5 }, 100);
  const t2 = L.createTask(l, { title: "high todo", priority: 1 }, 101);
  const r = L.createTask(l, { title: "review", priority: 9 }, 102);
  L.checkout(l, r.id, "ag", "rr", {}, 103);
  L.setStatus(l, r.id, "in_review", "ag", 104);
  const ready = L.getReady(l, "ag").map((t) => t.id);
  ok(ready[0] === r.id, "in_review ranks above todo regardless of priority");
  ok(ready.indexOf(t2.id) < ready.indexOf(t1.id), "within todo, higher priority first");
}

// --- typed human-in-the-loop gates: idempotent request + resolve + getReady exclusion
{
  const l = L.newLedger();
  const a = L.createTask(l, { title: "A" }, 100);
  const i1 = L.requestInteraction(l, { taskId: a.id, kind: "request_confirmation", prompt: "Ship it?", idempotencyKey: "ship:A:r1" }, 101);
  const i2 = L.requestInteraction(l, { taskId: a.id, kind: "request_confirmation", prompt: "Ship it?", idempotencyKey: "ship:A:r1" }, 102);
  ok(i1.id === i2.id && l.interactions.length === 1, "duplicate idempotencyKey -> same gate, no dup");
  ok(L.getReady(l, "ag").length === 0, "task with a pending gate is not ready");
  const r = L.resolveInteraction(l, i1.id, "yes", 103);
  ok(r.status === "resolved" && l.wakes.some((w) => w.taskId === a.id && w.reason === "interaction_resolved"), "resolve sets response + queues wake");
  const r2 = L.resolveInteraction(l, i1.id, "no", 104);
  ok(r2.response === "yes", "re-resolve is a no-op (idempotent)");
  ok(L.getReady(l, "ag").length === 1, "task is ready again once the gate resolves");
}

// --- gate goes stale when its target revision is superseded
{
  const l = L.newLedger();
  const a = L.createTask(l, { title: "A" });
  const i = L.requestInteraction(l, { taskId: a.id, kind: "ask_user_questions", prompt: "Which DB?", options: ["pg", "sqlite"], idempotencyKey: "db:A:r1" });
  L.bumpRevision(l, a.id);
  ok(l.interactions.find((x) => x.id === i.id).status === "stale", "bumpRevision marks old-revision gate stale");
  throws("STALE", () => L.resolveInteraction(l, i.id, "pg"), "resolving a stale gate -> STALE");
  ok(L.getReady(l, "ag").length === 1, "stale gate no longer blocks readiness");
}

// --- completion respects terminal states + blocker integrity (review must-fix 1)
{
  const l = L.newLedger();
  const a = L.createTask(l, { title: "A" });
  L.setStatus(l, a.id, "cancelled");
  throws("TRANSITION", () => L.complete(l, a.id), "completing a cancelled task -> TRANSITION");
  ok(l.tasks[a.id].status === "cancelled", "cancelled task not resurrected");
  const b = L.createTask(l, { title: "blocker" });
  const c = L.createTask(l, { title: "dependent" });
  L.addBlocker(l, c.id, b.id);
  throws("TRANSITION", () => L.complete(l, c.id), "completing with unresolved blockers -> TRANSITION");
  L.complete(l, b.id);
  L.complete(l, c.id);
  throws("TRANSITION", () => L.complete(l, c.id), "re-completing a done task -> TRANSITION");
}

// --- budget input validation: NaN must not disable the hard-stop (review must-fix 2)
{
  const l = L.newLedger();
  l.budget.cap = 10;
  const a = L.createTask(l, { title: "A" });
  throws("USAGE", () => L.recordCost(l, a.id, Number(undefined)), "NaN cost -> USAGE");
  throws("USAGE", () => L.recordCost(l, a.id, -5), "negative cost -> USAGE");
  ok(l.budget.spent === 0 && l.tasks[a.id].cost === 0, "rejected cost leaves budget untouched");
  L.recordCost(l, a.id, 10);
  throws("BUDGET", () => L.checkout(l, a.id, "ag", "r"), "hard-stop still enforced after valid spend");
}

// --- checkout refuses a task waiting on a human gate (review must-fix 5)
{
  const l = L.newLedger();
  const blocker = L.createTask(l, { title: "blocker" });
  const t = L.createTask(l, { title: "gated" });
  L.addBlocker(l, t.id, blocker.id);
  L.requestInteraction(l, { taskId: t.id, kind: "ask_user_questions", prompt: "Q?", idempotencyKey: "q:gated:r1" });
  L.complete(l, blocker.id); // the reachable sequence: auto-resume to todo + wake while the gate is pending
  ok(l.tasks[t.id].status === "todo", "dependent resumed while gate still pending");
  throws("BLOCKED", () => L.checkout(l, t.id, "ag", "r"), "checkout with pending gate -> BLOCKED");
  L.resolveInteraction(l, l.interactions[0].id, "answer");
  L.checkout(l, t.id, "ag", "r");
  ok(l.tasks[t.id].status === "in_progress", "checkout succeeds once gate resolved");
}

// --- createTask validates parent before mutating (review nit 10)
{
  const l = L.newLedger();
  throws("USAGE", () => L.createTask(l, { title: "orphan", parent: "T-99" }), "unknown parent -> USAGE");
  ok(Object.keys(l.tasks).length === 0 && l.nextId === 1, "failed create leaves no orphan and no id burn");
}

console.log(`coordination ledger: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
