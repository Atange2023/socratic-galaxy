import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('skills/socratic-business-inquiry');

test('acceptance reference covers five distinct real business inquiry scenarios', async () => {
  const content = await readFile(path.join(root, 'references/acceptance-scenarios.md'), 'utf8');
  for (const scenario of ['模糊战略执行', '纠结关键岗位招聘', '封闭式 AI 投资', '紧急经营决策', '研究就绪问题']) {
    assert.match(content, new RegExp(`## ${scenario}`));
  }
  for (const field of ['用户原话', '首回合应做到', '禁止行为', '推进信号', '目标成果']) {
    assert.equal((content.match(new RegExp(field, 'g')) || []).length, 5);
  }
  assert.match(content, /不得规定模型的固定答案/);
  assert.match(content, /一次只问一个/);
});

test('each acceptance scenario chooses an appropriate path and artifact', async () => {
  const content = await readFile(path.join(root, 'references/acceptance-scenarios.md'), 'utf8');
  assert.match(content, /模糊战略执行[\s\S]*苏格拉底式探寻[\s\S]*研究简报/);
  assert.match(content, /纠结关键岗位招聘[\s\S]*六顶思考帽[\s\S]*决策假设卡/);
  assert.match(content, /封闭式 AI 投资[\s\S]*WHAT[\s\S]*WHY[\s\S]*HOW/);
  assert.match(content, /紧急经营决策[\s\S]*可逆实验[\s\S]*决策假设卡/);
  assert.match(content, /研究就绪问题[\s\S]*研究简报[^\n]*权威文献/);
});

test('Skill interface prompt starts from a real question and asks for one-question guidance', async () => {
  const yaml = await readFile(path.join(root, 'agents/openai.yaml'), 'utf8');
  assert.match(yaml, /真实经营问题/);
  assert.match(yaml, /一次只问一个问题/);
  assert.doesNotMatch(yaml, /演示|示例问题/);
});
