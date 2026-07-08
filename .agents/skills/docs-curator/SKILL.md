---
name: docs-curator
description: Use this skill after an AI agent or developer finishes multiple features, refactors, architecture changes, bug fixes, or experiments and the user wants the work distilled into SinoMedia docs without random writing. Trigger on requests like "đúc kết vào docs", "cập nhật source of truth", "ghi lại tiến độ", "đừng viết docs lung tung", "tổng kết những gì AI khác vừa làm", "update project status/roadmap/agent notes", or when a session produced many changes that need structured project memory.
---

# Docs Curator

Use this skill to turn a messy batch of completed work into disciplined SinoMedia documentation.

## Mandatory First Reads

Read these before editing docs:

1. `.agents/rules/docs.md`
2. `docs/README.md`
3. `docs/project-status.md`
4. `docs/roadmap.md`
5. `docs/agent-handbook.md`
6. `docs/architecture/architecture.md`
7. `docs/decisions.md`

Then say: **"Đã đọc docs rồi."**

## Goal

Create project memory, not prose decoration.

Docs updates must answer:

- What changed?
- What is now Done / Partial / Draft / Planned / Deprecated?
- What is the current direction?
- What must future agents not misunderstand?
- What evidence supports the update?
- What remains unknown or needs verification?

## Inputs To Inspect

Use the smallest sufficient set:

- User message or handoff notes.
- `git status --short`.
- `git diff --stat`.
- Relevant changed files only.
- Existing docs source of truth.
- GitNexus `detect_changes()` if a commit/pre-commit review is involved.

Do not rewrite docs from memory if the changed files are available.

## Routing Rules

Update the right document. Do not scatter the same paragraph everywhere.

| Change type | Primary doc |
|---|---|
| Feature/page progress, working vs not working | `docs/project-status.md` |
| Direction, phase order, future worker/service strategy | `docs/roadmap.md` |
| Rules, traps, constraints for future AI agents | `docs/agent-handbook.md` |
| Stable architecture boundary or ADR-level decision | `docs/architecture/architecture.md` and/or a focused architecture doc |
| Historical decision with context/options/tradeoff | `docs/decisions.md` |
| Specific subsystem deep dive | `docs/architecture/<topic>.md` |
| Packaging/runtime note | `desktop-app/README.md` or relevant subsystem README |

Create a new docs file only when:

- the concept is stable enough to become a named source of truth;
- it does not fit cleanly in an existing document;
- `docs/README.md` is updated to link it.

## Status Labels

Use these meanings exactly:

- `Done`: code/flow exists and is connected to the intended architecture.
- `Partial`: useful code/UI exists but lacks verification, persistence, mutation, hardening, or end-to-end proof.
- `Draft`: mainly design, UI shell, local state, hard-code, experiment, or unverified idea.
- `Planned`: direction agreed, implementation not present.
- `Deprecated`: must not be used for new work.
- `Optional`: available but not part of the default path.

Do not mark something `Done` just because a route/file/component exists.

## Writing Rules

- Be factual, compact, and specific.
- Prefer tables/checklists for status docs.
- Name exact routes, services, workers, tables, commands, or files.
- Separate **current implementation** from **future direction**.
- Include constraints and known gaps.
- Preserve existing doc structure and voice.
- Use Vietnamese unless the target file is already English-only.
- Do not add marketing copy, motivational filler, or broad theory.
- Do not duplicate the same decision in many files; cross-link instead.

## Forbidden

- Do not invent completed functionality.
- Do not hide uncertainty.
- Do not write “works” without saying what evidence proves it.
- Do not create new docs folders/files casually.
- Do not paste long session transcripts into docs.
- Do not convert temporary experiments into architecture decisions.
- Do not overwrite unrelated user changes.
- Do not remove legacy notes unless they are clearly superseded; prefer adding a dated warning at the top.

## Workflow

1. **Collect evidence**
   - Read source docs.
   - Inspect `git status --short` and `git diff --stat`.
   - Read only changed files relevant to the user request.

2. **Classify the batch**
   - List changed areas: dashboard, crawler, desktop, Supabase, docs, tests.
   - Classify each as Done / Partial / Draft / Planned / Deprecated / Optional.
   - Identify user-facing routes and operational flows affected.

3. **Choose docs targets**
   - Pick the smallest set of docs.
   - Explain briefly why each file needs an update.

4. **Patch docs**
   - Update status tables first.
   - Update roadmap only if direction/priority changed.
   - Update agent handbook only if a future-agent trap or rule changed.
   - Add ADR/deep-dive only for stable architecture choices.

5. **Sanity check**
   - Search for contradictory old claims.
   - Ensure new docs link from `docs/README.md` if a new source doc was added.
   - Run `git diff --stat` for the docs touched.
   - If committing, run GitNexus `detect_changes()`.

6. **Final report**
   - Say which docs were updated.
   - Summarize the new source-of-truth changes.
   - Mention unresolved uncertainties.
   - Mention tests/checks not run.

## Decision Template

When recording an architecture decision, use:

```markdown
## YYYY-MM-DD — Short Decision Title [initiative: optional-name]

- **Context:** Why this decision exists.
- **Options considered:**
  - A: ...
  - B: ...
- **Decision:** What is now the rule.
- **Trade-off:** What gets worse or remains open.
- **Revisit trigger:** When to reconsider.
```

## Status Entry Template

```markdown
| Area/Route/Capability | Status | Evidence | Notes / next step |
|---|---|---|---|
| `/dash/example` | Partial | Reads via `example.service`; mutation button is local-only | Connect server action and add smoke test |
```

If the existing table does not have an `Evidence` column, keep the existing schema and write evidence inside `Ghi chú`.

## Final Answer Shape

Keep it short:

```markdown
Đã cập nhật docs theo skill `docs-curator`.

- Updated: ...
- Source of truth changed: ...
- Still unknown: ...
- Checks: ...
```
