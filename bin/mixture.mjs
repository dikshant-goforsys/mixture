#!/usr/bin/env node
// Mixture installer CLI. Brings the framework into a consumer project.
//   npx mixture install [--profile dev] [--target .] [--global] [--link]
//                       [--with-memory] [--with-coordination] [--force] [--dry-run]
//   npx mixture list | doctor | guide | help
//
// Consumer layout (NOT the repo's authoring layout):
//   <target>/.claude/skills/<skill>/      installed skills (copied, or symlinked with --link)
//   <target>/.mixture/framework/memory/   memory-persistence runtime (with --with-memory)
//   <target>/.mixture/framework/coordination/  L4 ledger runtime (with --with-coordination)
//   <target>/.mixture/how-to-use.md       the guide
// Dependency-free (Node >=18 built-ins only).

import { fileURLToPath } from "node:url";
import { dirname, join, basename, resolve } from "node:path";
import { existsSync, mkdirSync, cpSync, symlinkSync, rmSync, readFileSync, writeFileSync, copyFileSync, lstatSync } from "node:fs";
import { homedir } from "node:os";

const PKG_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const cmd = argv[0] && !argv[0].startsWith("-") ? argv[0] : "help";
const has = (f) => argv.includes(f);
const opt = (f, d) => { const i = argv.indexOf(f); return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith("-") ? argv[i + 1] : d; };

const log = (s) => console.log("  " + s);
const warn = (s) => console.warn("  ! " + s);
const die = (s) => { console.error("✖ " + s); process.exit(1); };

const loadProfiles = () => JSON.parse(readFileSync(join(PKG_ROOT, "manifests/install-profiles.json"), "utf8")).profiles;

function placeSkill(src, dest, { link, force, dry }) {
  const name = basename(dest);
  if (existsSync(dest)) {
    if (!force) { warn(`skill "${name}" already present — skipped (use --force to overwrite)`); return; }
    if (!dry) rmSync(dest, { recursive: true, force: true });
  }
  if (dry) { log(`would ${link ? "link" : "copy"} skill ${name}`); return; }
  mkdirSync(dirname(dest), { recursive: true });
  if (link) symlinkSync(src, dest);
  else cpSync(src, dest, { recursive: true });
  log(`${link ? "linked" : "copied"} skill ${name}`);
}

function copyDir(src, dest, { dry, force }) {
  if (!existsSync(src)) { warn(`missing ${src} — skipped`); return; }
  if (existsSync(dest) && !force) { warn(`${dest} exists — skipped (use --force)`); return; }
  if (dry) { log(`would copy ${basename(src)} -> ${dest}`); return; }
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(src, dest, { recursive: true });
  log(`copied ${basename(src)} runtime -> ${dest.replace(process.cwd() + "/", "")}`);
}

function wireMemoryHooks(target, { dry, backend = "json" }) {
  const settingsPath = join(target, ".claude/settings.json");
  let settings = {};
  if (existsSync(settingsPath)) {
    try { settings = JSON.parse(readFileSync(settingsPath, "utf8")); }
    catch { warn(".claude/settings.json is invalid JSON — skipping hook wiring"); return; }
  }
  settings.hooks ||= {};
  const env = backend === "sqlite" ? "MIXTURE_MEMORY_BACKEND=sqlite " : "";
  const add = (event, command) => {
    settings.hooks[event] ||= [];
    if (JSON.stringify(settings.hooks[event]).includes(command)) return false; // idempotent
    settings.hooks[event].push({ hooks: [{ type: "command", command }] });
    return true;
  };
  const added = [
    add("SessionStart", `${env}node .mixture/framework/memory/load.mjs`),
    add("PreCompact", `${env}node .mixture/framework/memory/save.mjs`),
    add("SessionEnd", `${env}node .mixture/framework/memory/clean.mjs`),
  ].filter(Boolean).length;
  if (dry) { log(`would wire ${added} memory hook(s) into .claude/settings.json`); return; }
  mkdirSync(dirname(settingsPath), { recursive: true });
  if (existsSync(settingsPath)) copyFileSync(settingsPath, settingsPath + ".bak");
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
  log(`wired ${added} memory hook(s) into .claude/settings.json${added ? " (backup: settings.json.bak)" : ""}`);
}

function install() {
  const profiles = loadProfiles();
  const profileName = opt("--profile", "dev");
  const profile = profiles[profileName];
  if (!profile) die(`unknown profile "${profileName}". options: ${Object.keys(profiles).join(", ")}`);

  const target = resolve(opt("--target", process.cwd()));
  const link = has("--link"), force = has("--force"), dry = has("--dry-run");
  const global = has("--global");
  const skillsDest = global ? join(homedir(), ".claude/skills") : join(target, ".claude/skills");

  const skillPaths = [...profile.skills];
  const withCoord = has("--with-coordination");
  if (withCoord && !skillPaths.includes("skills/coordination/coordination-protocol"))
    skillPaths.push("skills/coordination/coordination-protocol");

  console.log(`\nMixture install · profile "${profileName}"${dry ? " (dry run)" : ""}`);
  console.log(`  skills -> ${global ? "~/.claude/skills (global)" : ".claude/skills"}  ·  ${link ? "symlink" : "copy"}\n`);

  if (!dry) mkdirSync(skillsDest, { recursive: true });
  for (const sp of skillPaths) {
    const src = join(PKG_ROOT, sp);
    if (!existsSync(src)) { warn(`skip missing skill ${sp}`); continue; }
    placeSkill(src, join(skillsDest, basename(sp)), { link, force, dry });
  }

  if (has("--with-memory")) {
    const backend = opt("--memory-backend", "json").toLowerCase();
    if (!["json", "sqlite"].includes(backend)) die(`--memory-backend must be "json" or "sqlite" (got "${backend}")`);
    copyDir(join(PKG_ROOT, "hooks/memory-persistence"), join(target, ".mixture/framework/memory"), { dry, force });
    wireMemoryHooks(target, { dry, backend });
    if (backend === "sqlite") log("memory backend: sqlite (consumer needs Node >=22; zero extra deps)");
  }
  if (withCoord) {
    copyDir(join(PKG_ROOT, "coordination"), join(target, ".mixture/framework/coordination"), { dry, force });
    log("L4 ready: node .mixture/framework/coordination/cli.mjs create --title \"…\"  (set MIXTURE_COORD_DIR)");
  }
  if (!dry) {
    mkdirSync(join(target, ".mixture"), { recursive: true });
    copyFileSync(join(PKG_ROOT, "how-to-use.md"), join(target, ".mixture/how-to-use.md"));
  }
  log("guide -> .mixture/how-to-use.md");

  console.log(`\n✓ Done. Restart Claude Code (or /reload-skills) so it picks up the new skills.`);
  console.log(`  Skills are auto-invoked by their description; try a coding task and the kernel engages.\n`);
}

function list() {
  const profiles = loadProfiles();
  console.log("\nMixture install profiles:\n");
  for (const [name, p] of Object.entries(profiles)) {
    console.log(`  ${name.padEnd(13)} ${p.description}`);
    for (const s of p.skills) console.log(`  ${" ".repeat(13)}  · ${basename(s)}`);
    console.log("");
  }
  console.log("  install: npx mixture install --profile <name> [--with-memory] [--with-coordination]\n");
}

function doctor() {
  const target = resolve(opt("--target", process.cwd()));
  const global = has("--global");
  const skillsDest = global ? join(homedir(), ".claude/skills") : join(target, ".claude/skills");
  console.log(`\nMixture doctor · ${skillsDest}\n`);
  if (!existsSync(skillsDest)) die(`no skills dir at ${skillsDest} — run \`npx mixture install\` first`);
  const profiles = loadProfiles();
  let installed = 0;
  const known = new Set(Object.values(profiles).flatMap((p) => p.skills.map((s) => basename(s))));
  for (const name of known) {
    const at = join(skillsDest, name);
    const ok = existsSync(at) && existsSync(join(at, "SKILL.md"));
    if (ok) installed++;
    console.log(`  ${ok ? "✓" : "·"} ${name}${ok && lstatSync(at).isSymbolicLink() ? " (linked)" : ""}`);
  }
  const mem = existsSync(join(target, ".mixture/framework/memory/load.mjs"));
  const coord = existsSync(join(target, ".mixture/framework/coordination/cli.mjs"));
  console.log(`\n  ${installed} skill(s) installed · memory: ${mem ? "yes" : "no"} · coordination: ${coord ? "yes" : "no"}\n`);
}

function guide() {
  const p = join(PKG_ROOT, "how-to-use.md");
  if (has("--print")) { process.stdout.write(readFileSync(p, "utf8")); return; }
  console.log(`\nMixture guide: ${p}\n  print it: npx mixture guide --print\n`);
}

function help() {
  console.log(`
Mixture — a layered skills + agents framework for Claude Code

Usage:
  npx mixture install [options]   install skills (and optionally runtimes) into a project
  npx mixture list                show install profiles and their skills
  npx mixture doctor              check what's installed in a project
  npx mixture guide [--print]     locate or print how-to-use.md

install options:
  --profile <name>      minimal | dev (default) | authoring | coordination | full
  --target <dir>        project to install into (default: current dir)
  --global              install skills into ~/.claude/skills (all projects)
  --link                symlink skills instead of copying (for local dev clones)
  --with-memory         install the session-memory runtime + wire its hooks
  --memory-backend <b>  json (default) or sqlite (zero-dep, needs Node >=22 on the consumer)
  --with-coordination   install the L4 task-ledger runtime + the coordination-protocol skill
  --force               overwrite skills/runtimes that already exist
  --dry-run             print actions, change nothing

Examples:
  npx mixture install --profile dev
  npx mixture install --profile full --with-memory --with-coordination
  npx mixture install --global --link        # for hacking on a cloned repo
`);
}

try {
  const fn = { install, list, doctor, guide, help }[cmd];
  if (fn) fn(); else help();
} catch (e) {
  die(e.message);
}
