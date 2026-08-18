import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('skills/socratic-business-inquiry');
async function text(relativePath) {
  return readFile(path.join(root, relativePath), 'utf8');
}

test('method library exposes 雇佣式探寻（JTBD）with the three-question sequence', async () => {
  const methods = await text('references/method-library.md');
  assert.match(methods, /雇佣式探寻/);
  assert.match(methods, /他们会[^\n]*什么时刻/);
  assert.match(methods, /想完成什么|要完成的/);
  assert.match(methods, /如果没有[^\n]*怎么办/);
  assert.match(methods, /只问[^\n]*信息价值最高/);
});

test('conversation protocol gates the three-question path on scene/supply-side cue and stays one-question', async () => {
  const conversation = await text('references/conversation-protocol.md');
  assert.match(conversation, /雇佣|场景|JTBD|他们会在什么时刻/);
  // 开启条件：供给方视角/使用者/顾客/竞品
  assert.match(conversation, /顾客|使用者|利益相关者|竞品/);
  // 仍是"一次只问一个"
  assert.match(conversation, /一次只[^\n]*一个/);
});

test('workflow contract maps the three JTBD facts onto existing question-node types', async () => {
  const workflow = await text('references/workflow-contract.md');
  assert.match(workflow, /雇佣时刻/);
  assert.match(workflow, /替代/);
  // 复用既有节点类型，不新增类型
  assert.match(workflow, /雇佣时刻[\s\S]*boundary/);
  assert.match(workflow, /替代[\s\S]*rival/);
  assert.match(workflow, /雇佣任务[\s\S]*cause|雇佣任务[\s\S]*mechanism/);
});

test('skill exposes the JTBD route from its main flow', async () => {
  const skill = await text('SKILL.md');
  assert.match(skill, /雇佣式探寻|JTBD|场景换位/);
});

test('acceptance scenarios add JTBD (hiring moment, job, substitute) checkpoints', async () => {
  const scenarios = await text('references/acceptance-scenarios.md');
  assert.match(scenarios, /雇佣时刻|什么时刻/);
  assert.match(scenarios, /替代|对手/);
  // 封闭式 AI 投资 / 纠结招聘 至少一个场景含 JTBD
  assert.match(scenarios, /全都要投|全面投入 AI|封闭式 AI 投资/);
});
