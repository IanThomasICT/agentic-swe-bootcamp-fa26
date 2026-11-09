---
name: organize-docs
description: >-
  Clean and organize a project's documentation set: create missing canonical docs,
  keep the README lookup table accurate, roll stale completed design and plan docs
  into canonical docs, and check output against the vision doc. Preserves active
  plans, incomplete work, and open questions. Use when asked to clean up, organize,
  consolidate, audit, or restructure project docs.
---

This checkout is the Week 7 Admin Portal demo. Apply the generic workflow below. The This Repo section describes a different repository and does not apply here.

# Organize Docs

Bring a project's docs back to a small set that answers what the system does now, why, and what is still open. Work from evidence, keep what is live, and leave the index routing to the right file.

Do not run this against a doc set the task did not name.

## 1. Read the Conventions First

1. Read the repo's `AGENTS.md`, `docs/README.md`, and any doc-organization rules.
2. List protected paths. Never rewrite, summarize, consolidate, or remove them. In this repo `docs/knowledge/` is protected.
3. Find the vision pointer: grep `docs/` for "vision", "purpose", and "goal", then read `docs/core.md` and the PRD. Record where the project keeps its vision and do not create a second one.
4. Read the doc types and template in [references/canonical-docs.md](references/canonical-docs.md) when the repo has no house structure.

## 2. Inventory

List every doc with `rg --files docs` (or the repo's doc root) and read `docs/README.md`. For each doc, record:

- the aspect it covers
- whether its work is active, complete, superseded, or reference material
- the last commit and the code or tests it describes (`git log -1 --format='%h %ad %s' -- <path>`)
- incoming links (`rg -n '<path>' docs AGENTS.md`)

Do not treat age as status.

## 3. Establish Status From Evidence

Before asserting that a doc is stale or that work is implemented, read the current code, tests, and config it names. A completed plan is not stale; it is finished. Stale means the doc no longer matches the system or the decision it records.

Classify each doc:

| State | Test | Action |
|---|---|---|
| Active | Work is in progress or gated on an open question | Keep, and keep its plan row |
| Complete, superseded | Its behavior now lives in a canonical doc and nothing links to it for live work | Merge anything unique, then remove |
| Complete, still cited | Finished work whose rationale or open questions are still useful | Roll facts into the canonical doc; keep only if the repo keeps built plans |
| Stale | Contradicts current code or decisions | Update it, or fold the current truth into the canonical doc and remove |
| Reference | Research, transcripts, history, or external material | Leave in place; never consolidate |

Promote implemented facts only. A proposal, TODO, or unmerged branch is not current behavior.

## 4. Create Missing Canonical Docs

One aspect per canonical doc: a subsystem, workflow, or contract. Use the template in the reference. Include only sections with content.

- Purpose: what the aspect is for.
- Current behavior: how it works now, in enough detail to navigate the code.
- Contracts and constraints: invariants, budgets, protected paths, data rules.
- Decisions: current implementation decisions with why.
- Open questions: unresolved intent, with who decides.
- Related code: paths to the files that implement it.

Do not invent behavior, rationale, or decisions. Mark gaps as open questions and ask.

## 5. Consolidate Completed Design and Plan Docs

For each completed design or plan doc:

1. Name the canonical doc that owns the aspect.
2. Move the durable facts: current behavior, decisions and why, constraints, open questions.
3. Keep the rationale that explains a non-obvious choice, even when the prose is long.
4. Drop session history, superseded options, and restatements of code.
5. Repair every incoming link and the README row before removing the source.
6. Remove the doc only when it is fully superseded or fully merged.

Never delete a doc that still holds unresolved questions or unmerged work. If two docs disagree, report the conflict instead of picking a winner.

## 6. Update the README Lookup Table

`docs/README.md` is a router, not a summary. Each row is `| Doc | Description | Related Files |`. Make the description say what the doc answers, not how long it is. Point Related Files at the code or docs a reader needs next. Add rows for new docs, fix renamed paths, remove rows for deleted docs, and verify every path exists.

Keep the index short enough to scan. Do not add a rule to load every doc.

## 7. Check Vision Alignment

Read the vision doc and compare the changed docs and code against it. Report:

- where the output diverges from the stated vision
- which intent is unresolved
- what would resolve it

Do not rewrite the vision to match the implementation, and do not change code silently to match the docs.

## 8. Ask Only What Evidence Cannot Settle

Ask about competing intent, a conflict between the vision and current behavior, or a decision with no recorded owner. Do not ask for permission to make reversible, authorized doc edits.

## 9. Finish

1. Re-read the edited docs for claims the code does not support.
2. Check every README path and every link you touched.
3. Run a spot check: open a fresh session, ask three representative questions (where a behavior is documented, why a decision was made, what is still open), and confirm the index routes to the right files. Report failures, not speed claims.
4. Report what changed, what was removed and why, and what remains open.
5. Commit or publish only when the session or repo workflow authorizes it. Never push or publish to a remote as a default.

## This Repo

- Vision: `docs/core.md` (Vision and Principles) and `docs/design/instructor-harness-prd.md`.
- Canonical docs: `docs/project/`.
- Plans: `docs/plans/`, indexed by `docs/plans/README.md`; built plans stay only when they hold unique rationale.
- Glossary: `docs/glossary.md`; vocabulary only.
- Protected: `docs/knowledge/`.
- Format, template, and sources: [references/canonical-docs.md](references/canonical-docs.md).
