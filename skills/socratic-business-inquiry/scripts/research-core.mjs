// Deterministic research helpers: search brief, concept verification card, Obsidian note.
// No network access, no model calls, no knowledge. They only shape data the host Agent supplies.
// Node.js built-ins only.

const ACCESS_DEPTHS = Object.freeze(['metadata', 'abstract', 'full-text', 'user-provided']);
const QUERY_PURPOSES = Object.freeze(['definition', 'rival', 'measure']);

function now(iso) {
  return iso || new Date().toISOString();
}

function str(value) {
  if (value === undefined) return null;
  return String(value);
}

function toList(value) {
  if (value === undefined || value === null) return null;
  return Array.isArray(value) ? [...value] : [value];
}

/**
 * Build a search plan for a research question or construct. Host executes real search,
 * then records hits via `evidenceSearch`.
 */
export function buildSearchBrief(question, options = {}) {
  const constructs = toList(options.constructs);
  const purpose = options.purpose || 'definition';
  const boundaryNote = str(options.boundaryNote);
  const queries = toList(options.queries) || [
    { text: `${question} 定义 机制`, purpose: 'definition', suggestedAccessDepth: 'full-text' },
  ];
  return {
    question: String(question),
    baselineConstructs: constructs,
    queries,
    expectedSources: toList(options.expectedSources) || ['学术数据库', '权威机构报告', '同业案例'],
    accessDepthPolicy: [...ACCESS_DEPTHS],
    purposesAvailable: [...QUERY_PURPOSES],
    boundaries: boundaryNote ? [boundaryNote] : [],
    createdAt: now(options.createdAt),
    _purposeHint: purpose,
  };
}

/**
 * Shape host-supplied concept verification into a stable card. Missing facets are
 * explicitly null and the card is flagged provisional when no consensus is given.
 */
export function buildConceptVerificationCard(concept, options = {}) {
  const consensus = toList(options.consensus);
  const divergences = toList(options.divergences);
  const relations = options.verifiedRelations === undefined ? null : toList(options.verifiedRelations);
  const rivals = toList(options.rivalExplanations);
  const unresolved = options.unresolved === undefined ? null : toList(options.unresolved);
  return {
    concept: String(concept),
    definitionConsensus: consensus && consensus.length ? consensus : null,
    definitionDivergences: divergences && divergences.length ? divergences : null,
    verifiedConstructRelations: relations,
    rivalExplanations: rivals,
    unresolved,
    provisional: !consensus || consensus.length === 0,
    verifiedAt: now(options.verifiedAt),
  };
}

function materializeFrontmatter(session, options) {
  const lines = ['---'];
  lines.push(`sessionId: "${session.sessionId || ''}"`);
  lines.push(`originalQuestion: "${(session.originalQuestion || '').replace(/"/g, '\\"')}"`);
  lines.push(`engineMode: "${options.engineMode || 'host-agent'}"`);
  lines.push(`generatedAt: "${now(options.createdAt)}"`);
  lines.push(`stage: "${session.stage || ''}"`);
  lines.push('---');
  return lines.join('\n');
}

/**
 * Collapse a session into a single Obsidian-compatible Markdown note.
 */
export function buildObsidianNote(session, options = {}) {
  const frontmatter = materializeFrontmatter(session, options);
  const sections = [frontmatter, '', '# 问题谱系', ''];
  if (Array.isArray(session.questionCluster)) {
    for (const node of session.questionCluster) {
      const label = `${node.id || '?'}: ${node.type || ''}`;
      sections.push(`- [[${node.id || ''}]] ${label} — ${node.text || ''}`);
    }
  } else {
    sections.push('- （暂无问题簇节点）');
  }

  sections.push('', '# 证据', '');
  if (Array.isArray(session.evidence) && session.evidence.length) {
    for (const item of session.evidence) {
      const depth = item.accessDepth || 'user-provided';
      sections.push(`- **${item.claim || '(无主张)'}** — ${item.sourceTitle || ''}（深度：${depth}）`);
    }
  } else {
    sections.push('- （暂无证据）');
  }

  sections.push('', '# 未解决项', '');
  if (Array.isArray(session.unresolvedItems) && session.unresolvedItems.length) {
    for (const item of session.unresolvedItems) sections.push(`- [ ] ${item}`);
  } else {
    sections.push('- 无');
  }

  sections.push('', '# 下一步', '');
  sections.push(session.nextQuestion || '- 待定');

  if (session.latestInsight) {
    sections.push('', '# 当前洞见', '', session.latestInsight);
  }

  return sections.join('\n').trimEnd() + '\n';
}
