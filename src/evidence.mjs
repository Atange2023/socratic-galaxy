const DEMO_SOURCES = Object.freeze([
  {
    id: 'aom_canvas_2024', title: 'The Management Research Canvas', authors: ['Academy of Management Journal'], year: 2024,
    doiOrUrl: 'https://journals.aom.org/doi/10.5465/amj.2024.4005', sourceType: 'peer-reviewed journal', accessDepth: 'fulltext',
    relation: '研究问题需要明确理论构念、关系与解释机制，并可采用方差、过程或类型等形式。', verificationStatus: 'curated', demoDisclosure: true,
  },
  {
    id: 'aom_theory_cases_2015', title: 'Theory Building from Cases', authors: ['Academy of Management Review'], year: 2015,
    doiOrUrl: 'https://journals.aom.org/doi/10.5465/amr.2015.0094', sourceType: 'peer-reviewed journal', accessDepth: 'abstract',
    relation: '理论问题需要说明 What、How、Why 以及适用的 Who、Where、When。', verificationStatus: 'needs-fulltext-review', demoDisclosure: true,
  },
  {
    id: 'openalex_api', title: 'OpenAlex API Introduction', authors: ['OpenAlex'], year: 2026,
    doiOrUrl: 'https://developers.openalex.org/api-reference/introduction', sourceType: 'official documentation', accessDepth: 'fulltext',
    relation: '可用于后续连接作品、作者、来源、机构和主题等学术图谱实体。', verificationStatus: 'curated', demoDisclosure: true,
  },
  {
    id: 'crossref_rest', title: 'Crossref REST API', authors: ['Crossref'], year: 2026,
    doiOrUrl: 'https://support.crossref.org/hc/en-us/articles/214320426-REST-API', sourceType: 'official documentation', accessDepth: 'metadata',
    relation: '可用于 DOI 与出版元数据核验，不代表已读取论文正文。', verificationStatus: 'metadata-only', demoDisclosure: true,
  },
]);

export function buildDemoSearchPlan(model) {
  const names = model.constructs.map((item) => item.name);
  return {
    mode: 'curated-demo',
    disclosure: '当前展示预置可核验来源，非实时全网检索结果。',
    queries: {
      zh: [`${names.join(' 与 ')} 管理研究`, '战略清晰度 跨部门目标一致性 销售绩效'],
      en: ['strategic clarity goal alignment sales performance', 'management research constructs mechanisms boundary conditions'],
    },
    sources: ['AOM', 'OpenAlex', 'Crossref'],
  };
}

export function searchDemoEvidence(plan) {
  return { plan, sources: DEMO_SOURCES.map((item) => ({ ...item })), searchedAt: new Date().toISOString(), mode: 'curated-demo' };
}

export function attachEvidence(state, claim, source) {
  if (!source) throw new Error('证据来源不存在。');
  if (claim.kind === 'quotation' && source.accessDepth === 'metadata') {
    throw new Error('仅有元数据，未读取摘要或全文，不能核验原文引用。');
  }
  return {
    ...state,
    claims: [...(state.claims ?? []), {
      ...claim,
      sourceId: source.id,
      sourceUrl: source.doiOrUrl,
      accessDepth: source.accessDepth,
      verificationStatus: source.accessDepth === 'metadata' ? 'needs-review' : 'verified',
    }],
  };
}

export function noResultsMessage(query) {
  return `当前检索词“${query}”未检索到足够结果。可以放宽年份、拆分构念或补充同义词；这不代表相关研究不存在。`;
}
