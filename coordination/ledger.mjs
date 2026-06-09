// L4 coordination ledger — the substrate for multi-agent work.
// Every invariant the spec marks "enforce in code, not prose" (premortem #3) lives here.
// Dependency-free. Pure-ish: functions mutate the passed ledger L; the caller persists.
//
// Invariants enforced:
//   - Atomic single-assignee checkout (compare-and-set on status+assignee) -> CONFLICT, never retry.
//   - Budget hard-stop: no new work once spent >= cap.
//   - Circular blocker edges rejected at creation.
//   - Blocker DAG: a task with unfinished blockers is `blocked`; completing the last blocker
//     auto-resumes dependents and queues exactly one wake. Same for parent on all-children-done.
//   - Liveness: an in_progress task whose run went stale is released + gets exactly one recovery wake.

import { mkdirSync, readFileSync, writeFileSync, existsSync, rmdirSync, statSync } from "node:fs";
import { join } from "node:path";

export const DIR = process.env.MIXTURE_COORD_DIR || join(process.cwd(), ".mixture", "coordination");
const STORE = join(DIR, "ledger.json");

export const STATUS = ["todo", "in_progress", "in_review", "blocked", "done", "cancelled"];
const TRANSITIONS = {
  todo: ["in_progress", "blocked", "cancelled"],
  in_progress: ["in_review", "done", "todo", "blocked", "cancelled"],
  in_review: ["in_progress", "done", "cancelled"],
  blocked: ["todo", "in_progress", "cancelled"],
  done: [],
  cancelled: [],
};
// Lower rank = picked first. Mirrors the spec's strict priority: in_progress > in_review > todo.
const STATUS_RANK = { in_progress: 0, in_review: 1, todo: 2 };

export class LedgerError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

export function newLedger() {
  return { version: 1, nextId: 1, nextIid: 1, budget: { cap: null, spent: 0 }, tasks: {}, wakes: [], interactions: [] };
}

export function load() {
  if (!existsSync(STORE)) return newLedger();
  let L;
  try { L = JSON.parse(readFileSync(STORE, "utf8")); }
  catch { return newLedger(); }
  // normalize older ledgers so new fields are always present
  L.wakes ||= []; L.interactions ||= []; L.nextIid ||= 1;
  return L;
}

export function save(L) {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(STORE, JSON.stringify(L, null, 2) + "\n");
  return L;
}

// Cross-process mutex so concurrent agents' read-modify-write can't lose updates.
// mkdir is atomic; a stale lock (crashed holder) is reclaimed after staleMs.
function sleepSync(ms) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); }
export function withLock(fn, { timeoutMs = 5000, staleMs = 15000 } = {}) {
  const lock = join(DIR, ".lock");
  mkdirSync(DIR, { recursive: true });
  const start = Date.now();
  for (;;) {
    try { mkdirSync(lock); break; }
    catch (e) {
      if (e.code !== "EEXIST") throw e;
      try { if (Date.now() - statSync(lock).mtimeMs > staleMs) { rmdirSync(lock); continue; } } catch { /* race: retry */ }
      if (Date.now() - start > timeoutMs) throw new LedgerError("LOCK", "ledger busy — try again");
      sleepSync(25);
    }
  }
  try { return fn(); } finally { try { rmdirSync(lock); } catch { /* already gone */ } }
}

export function createTask(L, { title, priority = 1, parent = null, status = "todo" }, now = Date.now()) {
  if (!title) throw new LedgerError("USAGE", "task needs a title");
  // Validate BEFORE mutating: a throw must leave no orphan task and burn no id.
  if (parent && !L.tasks[parent]) throw new LedgerError("USAGE", `parent ${parent} not found`);
  const id = `T-${L.nextId++}`;
  const task = {
    id, title, status, priority, parent,
    assignee: null, blockedBy: [], revision: 1,
    checkoutRunId: null, executionRunId: null, lastHeartbeatTs: null,
    cost: 0, createdTs: now, updatedTs: now,
  };
  L.tasks[id] = task;
  return task;
}

export function get(L, id) {
  const t = L.tasks[id];
  if (!t) throw new LedgerError("USAGE", `task ${id} not found`);
  return t;
}

const childrenOf = (L, id) => Object.values(L.tasks).filter((t) => t.parent === id);
const blockersUnresolved = (L, t) =>
  t.blockedBy.some((bid) => { const b = L.tasks[bid]; return b && b.status !== "done" && b.status !== "cancelled"; });

// Queue a wake, deduped by (taskId, reason) so liveness/auto-resume stay idempotent.
function queueWake(L, taskId, reason, now) {
  if (L.wakes.some((w) => w.taskId === taskId && w.reason === reason)) return false;
  L.wakes.push({ taskId, reason, ts: now });
  return true;
}

// --- Atomic checkout: the optimistic lock. Compare-and-set, single owner, never retry on CONFLICT.
export function checkout(L, id, agent, runId, { expectedStatuses = ["todo", "in_review"] } = {}, now = Date.now()) {
  if (!agent || !runId) throw new LedgerError("USAGE", "checkout needs agent and runId");
  if (L.budget.cap != null && L.budget.spent >= L.budget.cap)
    throw new LedgerError("BUDGET", `budget exhausted (${L.budget.spent}/${L.budget.cap}) — no new work`);
  const t = get(L, id);
  if (t.assignee && t.assignee !== agent && t.status === "in_progress")
    throw new LedgerError("CONFLICT", `${id} owned by ${t.assignee} — do not retry`);
  // Blocker guard before the status guard: BLOCKED is the precise, actionable signal for a
  // task that's waiting on dependencies (its status is "blocked", which no expected set includes).
  if (blockersUnresolved(L, t))
    throw new LedgerError("BLOCKED", `${id} has unresolved blockers`);
  // Human-gate guard here (not only in getReady): the blockers_resolved wake path can hand a
  // gated task straight to checkout, and dispatching it would moot the pending question.
  if (hasPendingInteraction(L, id))
    throw new LedgerError("BLOCKED", `${id} is waiting on a human gate — resolve its interaction first`);
  if (!expectedStatuses.includes(t.status))
    throw new LedgerError("CONFLICT", `${id} is ${t.status}, expected one of [${expectedStatuses}] — do not retry`);
  t.status = "in_progress";
  t.assignee = agent;
  t.checkoutRunId = runId;
  t.executionRunId = runId;
  t.lastHeartbeatTs = now;
  t.updatedTs = now;
  return t;
}

export function heartbeat(L, id, runId, now = Date.now()) {
  const t = get(L, id);
  if (t.executionRunId !== runId)
    throw new LedgerError("CONFLICT", `${id} run is ${t.executionRunId}, not ${runId}`);
  t.lastHeartbeatTs = now;
  return t;
}

export function recordCost(L, id, amount, now = Date.now()) {
  // NaN poisons spent forever (NaN >= cap is always false), silently killing the hard-stop.
  if (!Number.isFinite(amount) || amount < 0)
    throw new LedgerError("USAGE", `cost amount must be a non-negative number (got ${amount})`);
  const t = get(L, id);
  t.cost += amount;
  L.budget.spent += amount;
  t.updatedTs = now;
  return L.budget;
}

export function setStatus(L, id, to, agent, now = Date.now()) {
  const t = get(L, id);
  if (!STATUS.includes(to)) throw new LedgerError("USAGE", `bad status ${to}`);
  if (!TRANSITIONS[t.status].includes(to))
    throw new LedgerError("TRANSITION", `cannot move ${id} from ${t.status} to ${to}`);
  if (to === "done") return complete(L, id, now);
  t.status = to;
  t.updatedTs = now;
  if (to === "todo" || to === "cancelled") { t.assignee = null; t.executionRunId = null; }
  return t;
}

// --- Completion + blocker-DAG auto-resume.
export function complete(L, id, now = Date.now()) {
  const t = get(L, id);
  // Guard here, not only in setStatus: the CLI `done` command calls complete() directly.
  // Terminal states stay terminal, and a task with unresolved blockers cannot be done.
  if (t.status === "done" || t.status === "cancelled")
    throw new LedgerError("TRANSITION", `cannot complete ${id}: ${t.status} is terminal`);
  if (blockersUnresolved(L, t))
    throw new LedgerError("TRANSITION", `cannot complete ${id} with unresolved blockers`);
  t.status = "done";
  t.assignee = null;
  t.executionRunId = null;
  t.updatedTs = now;
  const resumed = [];
  // dependents whose last blocker just cleared
  for (const dep of Object.values(L.tasks)) {
    if (dep.blockedBy.includes(id) && dep.status === "blocked" && !blockersUnresolved(L, dep)) {
      dep.status = "todo";
      dep.updatedTs = now;
      queueWake(L, dep.id, "blockers_resolved", now);
      resumed.push(dep.id);
    }
  }
  // parent whose children are all done
  if (t.parent) {
    const kids = childrenOf(L, t.parent);
    if (kids.length && kids.every((k) => k.status === "done"))
      queueWake(L, t.parent, "children_completed", now);
  }
  return { task: t, resumed };
}

// --- Blocker edges with cycle rejection.
export function addBlocker(L, id, blockerId, now = Date.now()) {
  if (id === blockerId) throw new LedgerError("CYCLE", "a task cannot block itself");
  const t = get(L, id);
  get(L, blockerId);
  // Adding "id depends-on blockerId" is a cycle if blockerId can already reach id via blockedBy.
  const seen = new Set();
  const reaches = (from, target) => {
    if (from === target) return true;
    if (seen.has(from)) return false;
    seen.add(from);
    return (L.tasks[from]?.blockedBy || []).some((b) => reaches(b, target));
  };
  if (reaches(blockerId, id)) throw new LedgerError("CYCLE", `${id} <- ${blockerId} would create a cycle`);
  if (!t.blockedBy.includes(blockerId)) t.blockedBy.push(blockerId);
  if (blockersUnresolved(L, t) && (t.status === "todo" || t.status === "in_review")) {
    t.status = "blocked";
    t.updatedTs = now;
  }
  return t;
}

// --- Liveness: release stale in_progress runs and queue exactly one recovery wake each.
export function livenessScan(L, ttlMs, now = Date.now()) {
  const recovered = [];
  for (const t of Object.values(L.tasks)) {
    if (t.status === "in_progress" && t.lastHeartbeatTs != null && now - t.lastHeartbeatTs > ttlMs) {
      t.status = "todo";
      t.assignee = null;
      t.executionRunId = null;
      t.updatedTs = now;
      queueWake(L, t.id, "run_died", now);
      recovered.push(t.id);
    }
  }
  return recovered;
}

// --- Work selection: strict status priority, skip blocked/done, then priority then age.
export function getReady(L, agent = null) {
  return Object.values(L.tasks)
    .filter((t) => {
      if (hasPendingInteraction(L, t.id)) return false; // waiting on a human gate
      if (t.status === "in_progress") return agent && t.assignee === agent; // resume own work
      if (t.status === "in_review" || t.status === "todo") return !blockersUnresolved(L, t);
      return false;
    })
    .sort((a, b) =>
      (STATUS_RANK[a.status] - STATUS_RANK[b.status]) ||
      (a.priority - b.priority) ||
      (a.createdTs - b.createdTs));
}

export function takeWake(L) {
  return L.wakes.shift() || null;
}

// --- Typed human-in-the-loop gates (paperclip pattern): structured, idempotent, revision-bound.
const KINDS = ["request_confirmation", "request_checkbox_confirmation", "ask_user_questions", "suggest_tasks"];

// Idempotent by idempotencyKey: requesting the same gate twice returns the same interaction, never a
// duplicate (so a resumed/retried agent can't spam the user). Bound to the task's current revision.
export function requestInteraction(L, { taskId, kind, prompt, options = [], idempotencyKey, targetRevision = null }, now = Date.now()) {
  L.interactions ||= []; L.nextIid ||= 1;
  if (!KINDS.includes(kind)) throw new LedgerError("USAGE", `bad interaction kind "${kind}"`);
  if (!idempotencyKey) throw new LedgerError("USAGE", "interaction needs an idempotencyKey");
  const t = get(L, taskId);
  const existing = L.interactions.find((i) => i.idempotencyKey === idempotencyKey && i.status !== "stale");
  if (existing) return existing; // idempotent: no duplicate gate
  const it = {
    id: `I-${L.nextIid++}`, taskId, kind, prompt, options, idempotencyKey,
    targetRevision: targetRevision ?? t.revision ?? 1,
    status: "pending", response: null, createdTs: now, resolvedTs: null,
  };
  L.interactions.push(it);
  return it;
}

// Idempotent resolve: re-resolving a resolved gate is a no-op; resolving a stale one is rejected.
export function resolveInteraction(L, id, response, now = Date.now()) {
  L.interactions ||= [];
  const it = L.interactions.find((i) => i.id === id);
  if (!it) throw new LedgerError("USAGE", `interaction ${id} not found`);
  if (it.status === "resolved") return it;
  if (it.status === "stale") throw new LedgerError("STALE", `interaction ${id} is stale (target was revised) — re-ask`);
  it.status = "resolved"; it.response = response; it.resolvedTs = now;
  queueWake(L, it.taskId, "interaction_resolved", now); // continuation policy: wake the assignee
  return it;
}

export function pendingInteractions(L, taskId = null) {
  return (L.interactions || []).filter((i) => i.status === "pending" && (!taskId || i.taskId === taskId));
}
export const hasPendingInteraction = (L, taskId) => pendingInteractions(L, taskId).length > 0;

// Bumping a task's revision supersedes pending gates bound to the old revision (stale_target):
// a resumed agent won't act on answers to a question about an outdated plan.
export function bumpRevision(L, taskId, now = Date.now()) {
  const t = get(L, taskId);
  t.revision = (t.revision || 1) + 1;
  t.updatedTs = now;
  for (const i of (L.interactions || [])) {
    if (i.taskId === taskId && i.status === "pending" && i.targetRevision < t.revision) i.status = "stale";
  }
  return t;
}
