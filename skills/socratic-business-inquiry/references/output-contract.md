# Output contract

Use the same semantic fields in Agent Skill sessions and the future Standalone API. The presentation may differ; field meaning must not.

## Session shape

```json
{
  "schemaVersion": 1,
  "stage": "understand",
  "originalQuestion": "用户原话",
  "understanding": {
    "observations": ["可追溯到用户输入的事实"],
    "assumptions": ["明确标注的暂定解释"],
    "turnState": {
      "label": "本轮工作状态假设",
      "confidence": 0.65,
      "evidenceSpans": ["用户原文短语"]
    }
  },
  "corrections": [],
  "method": null,
  "questionCluster": [],
  "researchQuestion": null,
  "evidence": [],
  "unresolvedItems": [],
  "nextQuestion": null
}
```

## Research question

`researchQuestion` contains:

- `businessWording`: the user's management-language question;
- `academicWording`: relationship or process formulation;
- `independentVariable`, `dependentVariable`, `mediators`, `moderators`;
- `unitOfAnalysis`, `context`, `timeBoundary`;
- `mechanismStatement` and `rivalExplanations`;
- `evidenceStatus`: `unverified`, `partially-supported`, or `supported`;
- `provenanceNodeIds`: source nodes in `questionCluster`.

Do not fabricate a variable merely to fill a field. Use `null` and add an item to `unresolvedItems`.

## Evidence item

Each `evidence` item contains `claim`, `sourceTitle`, `sourceUrl`, `sourceType`, `accessDepth`, `supports`, `limitations`, and `retrievedAt`. Allowed `accessDepth` values are `metadata`, `abstract`, `full-text`, and `user-provided`.

## Human-facing checkpoint

When pausing, deliver:

1. 原始问题;
2. 当前更清楚的版本;
3. 已确认事实与暂定假设;
4. 当前问题簇与主线;
5. 尚未解决的问题;
6. 下一次应从哪个问题继续.

## Final artifacts

- `decision-hypothesis-card`: decision, working hypothesis, signals, risks, reversible experiment and review date;
- `research-brief`: phenomenon, research question, constructs, mechanism, context, rival explanations, evidence table and next research actions;
- `obsidian-note`: YAML frontmatter, question lineage, wiki links, evidence and unresolved tasks.

Always state the engine mode, generation time, unresolved items, and whether literature search was actually performed.
