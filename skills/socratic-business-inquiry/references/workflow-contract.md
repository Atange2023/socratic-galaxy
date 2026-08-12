# Workflow contract

Use this state model to preserve continuity across conversations and across the future Standalone application.

| Stage | User sees | Agent does | Exit condition |
| --- | --- | --- | --- |
| `capture` | Original question echoed verbatim | Record wording, context, requested outcome | Non-empty original question |
| `understand` | Facts, provisional interpretation, missing information | Analyze intent, form, clarity, assumptions, state hypothesis and evidence spans | User confirms or corrects the interpretation |
| `method` | One recommended exercise and its value | Choose a method from the actual bottleneck | User accepts or chooses an alternative |
| `explore` | One adaptive question at a time | Update observations, assumptions, branches and evidence gaps | Method reaches a useful insight or user pauses |
| `forge` | Question cluster and candidate research questions | Select mainline; identify constructs, relationships/process and boundaries | User accepts a candidate or requests another pass |
| `evidence` | Search plan, sources and verification depth | Use host tools to verify definitions, relationships and rival explanations | Evidence gaps and unsupported claims are explicit |
| `artifact` | Decision card, research brief or Obsidian note | Serialize provenance, findings, gaps and next actions | Artifact is delivered or saved |

## State invariants

- Keep `originalQuestion` immutable.
- Append corrections with old value, new value, reason and timestamp.
- Mark every AI-generated interpretation as `hypothesis` until the user confirms it.
- Preserve all question nodes. Selecting a mainline changes priority, not existence.
- Link each research construct to the user's business wording.
- Link every evidence claim to a source and an access depth.
- Allow returning to any prior stage without deleting later work; mark affected outputs `needsReview`.

## Stage selection

Resume at the earliest incomplete stage. If the user adds material that invalidates a prior assumption, return to `understand`. If the user asks for sources, enter `evidence` without pretending earlier stages are complete. If the user asks for an output early, create an incomplete artifact with visible unresolved items.

## Question-cluster node types

- `phenomenon`: what appears to be happening;
- `cause`: a candidate explanation;
- `mechanism`: how a cause may create an outcome;
- `boundary`: when, where, for whom, or under what condition;
- `evidence-gap`: what must be observed or sourced;
- `rival`: a plausible competing explanation;
- `decision`: an action choice that depends on the inquiry.

Each node keeps `id`, `type`, `text`, `source`, `status`, `parentIds`, and `confidence`. Use `source: user` for direct user content and `source: agent-hypothesis` for generated interpretations.
