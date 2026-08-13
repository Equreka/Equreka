# 0001 — Record architecture decisions

Date: 2026-08-13 · Status: accepted

## Context

Equreka v2 is a ground-up rebuild whose design was produced through exploration of the legacy app, three parallel design tracks, and an eight-pillar adversarial review. Decisions and their evidence evaporate unless recorded where the code lives.

## Decision

Architecture decisions are recorded as ADRs in `docs/architecture/decisions/`, numbered sequentially, in the format: Context → Decision → Consequences. A superseded ADR is never edited; a new one supersedes it.

## Consequences

Contributors can trace why a constraint exists before proposing to remove it. Reviews link to ADRs instead of relitigating settled questions.
