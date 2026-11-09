# Canonical Docs: Format and Sources

Read when creating or consolidating canonical docs, or when asked why this format. The format below is a practical default, not a measured winner.

## Recommended Format

Markdown, one aspect per canonical doc. Name the file after the aspect, not the project phase. Keep the description in `docs/README.md` short enough to route a reader.

Include only sections that have content. Do not create empty headings for a section the aspect lacks.

```markdown
# <Aspect>

## Purpose

What this aspect is for, in one short paragraph.

## Current Behavior

How it works now. Name the entry points and the paths a reader needs.

## Contracts and Constraints

Invariants, budgets, protected paths, data rules, and anything that breaks if changed.

## Decisions

- **<Decision>.** Why: <reason and alternative rejected>.

## Open Questions

- <Question> (owner: <who decides>).

## Related Code

- `path/to/file.ts`: <what it holds>.
```

## Where Content Belongs

| Content | Home |
|---|---|
| Vision, goal, purpose | Vision doc, one only |
| How an aspect works now | Canonical doc, Current Behavior |
| Why a current implementation decision was made | Canonical doc, Decisions |
| Unresolved intent | Canonical doc, Open Questions |
| Exploration for a change under review | Design doc, scoped to the change |
| Ordered steps not yet built | Plan |
| Project vocabulary | Glossary, vocabulary only |
| Routing to the right doc | README lookup table |
| Research, transcripts, history | References, read-only |

## Rules That Follow From the Sources

- Keep one authoritative place per meaning. Duplication inflates a claim past its real rank and drifts.
- Co-locate a concept's definition, rules, and caveats under one heading. Scattering fragments one meaning.
- Prefer a pointer to a doc over inlining it everywhere. State what the doc holds and when to reach it.
- Completeness matters more than compression. Preserve contracts, constraints, and rationale instead of trimming to a token target.
- Do not claim a speed or token saving from the index. Measure real tasks if a claim is needed.
- A glossary holds terms only. Decisions, behavior, and implementation detail belong in canonical docs.
- Do not add a rule to load every doc, and do not set a hard line or token limit for canonical docs.

## Sources

Recommendation labeled INFERENCE below is ours, adapted from these sources. No source proves this exact format is best.

- Matt Pocock, `writing-for-agents` skill, commit `4ae2317ddb22b046e26455e4f9c9b3aaaf62212d`, MIT: https://github.com/mattpocock/skills/blob/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/productivity/writing-for-agents/SKILL.md
  Supports precise context pointers, always-loaded versus on-demand material, co-location, single source of truth, and pruning. Limit: practitioner guidance, not a measured outcome.
- Matt Pocock, `domain-modeling` skill, same commit, MIT: https://github.com/mattpocock/skills/blob/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/engineering/domain-modeling/SKILL.md
  Supports a glossary of terms only, separate from decisions. Limit: it assumes a root `GLOSSARY.md` and sparse ADRs, a structure this repo does not use.
- Matt Pocock, `domain-modeling` notes, same commit: https://github.com/mattpocock/skills/blob/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/docs/engineering/domain-modeling.md
  Reports weak automatic invocation, glossary bloat, and that the author's usage is not an independent benchmark.
- Matt Pocock, `grill-with-docs` notes, same commit: https://github.com/mattpocock/skills/blob/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/docs/engineering/grill-with-docs.md
  Reports that most decisions land only in the conversation, so a glossary plus sparse ADRs is not full capture. This is why open questions stay in canonical docs.
- Anthropic, "Effective context engineering for AI agents", 2025-09-29: https://www.anthropic.com/research/effective-context-engineering-for-ai-agents
  Supports minimal sufficient high-signal context, just-in-time retrieval, and Markdown headings or XML sections. It states the exact formatting matters less as models improve, so it does not settle a universal format.
- Arman and Molybog, "Compact Documentation for Coding Agents", 2026-09-25: https://arxiv.org/abs/2609.31587
  Finds completeness, not length, drives description fidelity. Compact docs did not improve issue resolution when code was available, across two model families and ten repositories. Keep contracts and constraints rather than compressing hard.
- Gloaguen et al., "Evaluating AGENTS.md", v3 2026-09-29: https://arxiv.org/abs/2602.11988
  Finds context files did not generally improve task success and raised inference cost over 20 percent. Instructions were followed; repository overviews were not helpful. Measure real tasks before claiming a benefit.

## Validation

A format change is working when a fresh session can answer three representative questions and locate the files:

1. Where is this behavior documented?
2. Why was this implementation decision made?
3. What is still open?

Check the answers against the docs and the code. Report misses. Do not assert a speed gain unless it was measured on real tasks.
