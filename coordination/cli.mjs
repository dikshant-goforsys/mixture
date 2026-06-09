#!/usr/bin/env node
// CLI over the L4 ledger. Distinct exit codes make invariants machine-detectable so the
// coordination-protocol skill can obey "never retry a CONFLICT" without parsing prose:
//   0 ok | 2 usage | 6 cycle | 7 budget | 8 blocked | 9 conflict
//
// Commands:
//   create --title T [--priority N] [--parent ID]
//   list | ready [--agent A]
//   block --id ID --by ID
//   checkout --id ID --agent A --run R [--expect todo,in_review]
//   heartbeat --id ID --run R
//   cost --id ID --amount N
//   status --id ID --to STATUS [--agent A]
//   done --id ID
//   budget [--set N]
//   scan [--ttl-ms N]
//   tick --agent A --run R [--ttl-ms N]     # one heartbeat: recover + pick + atomic checkout + dispatch

import * as L from "./ledger.mjs";

const CODE = { USAGE: 2, LOCK: 3, STALE: 5, CYCLE: 6, BUDGET: 7, BLOCKED: 8, CONFLICT: 9, TRANSITION: 2 };
const argv = process.argv.slice(2);
const cmd = argv[0];
const flag = (n, d) => { const i = argv.indexOf(n); return i !== -1 && i + 1 < argv.length ? argv[i + 1] : d; };
const out = (o) => process.stdout.write(JSON.stringify(o, null, 2) + "\n");

function run() {
  // Every command runs under the cross-process lock so concurrent agents serialize their
  // read-modify-write — the atomic-checkout guarantee holds across processes, not just in-process.
  return L.withLock(() => {
  const l = L.load();
  switch (cmd) {
    case "create": {
      const t = L.createTask(l, { title: flag("--title"), priority: Number(flag("--priority", 1)), parent: flag("--parent", null) });
      L.save(l); return out({ created: t.id, title: t.title });
    }
    case "list": return out(Object.values(l.tasks).map(brief));
    case "ready": return out(L.getReady(l, flag("--agent", null)).map(brief));
    case "block": {
      L.addBlocker(l, flag("--id"), flag("--by")); L.save(l);
      return out({ ok: true, ...brief(L.get(l, flag("--id"))) });
    }
    case "checkout": {
      const expect = flag("--expect") ? flag("--expect").split(",") : undefined;
      const t = L.checkout(l, flag("--id"), flag("--agent"), flag("--run"), expect ? { expectedStatuses: expect } : {});
      L.save(l); return out({ checkedOut: t.id, assignee: t.assignee, run: t.executionRunId });
    }
    case "heartbeat": { L.heartbeat(l, flag("--id"), flag("--run")); L.save(l); return out({ ok: true }); }
    case "cost": { const b = L.recordCost(l, flag("--id"), Number(flag("--amount"))); L.save(l); return out({ budget: b }); }
    case "status": { const t = L.setStatus(l, flag("--id"), flag("--to"), flag("--agent", null)); L.save(l); return out(brief(t.task || t)); }
    case "done": { const r = L.complete(l, flag("--id")); L.save(l); return out({ done: r.task.id, resumed: r.resumed, wakes: l.wakes }); }
    case "budget": {
      if (argv.includes("--set")) l.budget.cap = Number(flag("--set"));
      L.save(l); return out({ budget: l.budget });
    }
    case "scan": {
      const rec = L.livenessScan(l, Number(flag("--ttl-ms", 600000))); L.save(l);
      return out({ recovered: rec, wakes: l.wakes });
    }
    case "tick": return tick(l);
    case "ask": {
      const it = L.requestInteraction(l, {
        taskId: flag("--id"), kind: flag("--kind", "request_confirmation"), prompt: flag("--prompt"),
        options: flag("--options") ? flag("--options").split(",") : [], idempotencyKey: flag("--key"),
      });
      L.save(l); return out({ interaction: it.id, kind: it.kind, status: it.status, targetRevision: it.targetRevision });
    }
    case "resolve": { const it = L.resolveInteraction(l, flag("--iid"), flag("--response")); L.save(l); return out({ resolved: it.id, response: it.response, wakes: l.wakes }); }
    case "interactions": return out(L.pendingInteractions(l, flag("--id", null)));
    case "revise": { const t = L.bumpRevision(l, flag("--id")); L.save(l); return out({ id: t.id, revision: t.revision }); }
    default:
      console.error("unknown command. see header for usage.");
      process.exit(CODE.USAGE);
  }
  });
}

// One heartbeat: budget gate -> liveness recovery -> scoped wake or top ready -> atomic checkout -> dispatch.
function tick(l) {
  const agent = flag("--agent"), run = flag("--run");
  if (!agent || !run) { console.error("tick needs --agent and --run"); process.exit(CODE.USAGE); }
  if (l.budget.cap != null && l.budget.spent >= l.budget.cap) { L.save(l); return out({ budget_exhausted: true, budget: l.budget }); }
  const recovered = L.livenessScan(l, Number(flag("--ttl-ms", 600000)));
  // scoped-wake fast path: prefer a queued wake whose task is workable
  let targetId = null, reason = "picked";
  for (let i = 0; i < l.wakes.length; i++) {
    const w = l.wakes[i]; const t = l.tasks[w.taskId];
    if (t && (t.status === "todo" || t.status === "in_review")) { targetId = w.taskId; reason = w.reason; l.wakes.splice(i, 1); break; }
  }
  if (!targetId) { const top = L.getReady(l, agent)[0]; targetId = top?.id || null; }
  if (!targetId) { L.save(l); return out({ idle: true, recovered }); }
  const t = L.checkout(l, targetId, agent, run); // may throw CONFLICT(9)/BUDGET(7)/BLOCKED(8) — caller does NOT retry the same task
  L.save(l);
  return out({ assigned: t.id, title: t.title, reason, run, recovered });
}

const brief = (t) => ({ id: t.id, status: t.status, title: t.title, assignee: t.assignee, priority: t.priority, blockedBy: t.blockedBy });

try { run(); }
catch (e) {
  console.error(`✖ ${e.code || "ERR"}: ${e.message}`);
  process.exit(CODE[e.code] ?? 1);
}
