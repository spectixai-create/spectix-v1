#!/usr/bin/env node

import { spawnSync } from 'child_process';
import { createHash } from 'crypto';
import {
  access,
  mkdir,
  readFile,
  readdir,
  unlink,
  writeFile,
} from 'fs/promises';
import path from 'path';
import process from 'process';

const SCRIPT_DIR = path
  .dirname(new URL(import.meta.url).pathname)
  .replace(/^\/([A-Za-z]:)/, '$1');
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const RUNTIME_DIR = path.join(REPO_ROOT, '.openclaw-local');
const QUEUES = ['inbox', 'active', 'outbox', 'archive', 'logs'];
const STATE_FILE = path.join(RUNTIME_DIR, 'state.json');
const TASKS_INDEX_FILE = path.join(RUNTIME_DIR, 'tasks.json');
const DUMMY_ID = 'DUMMY-OPENCLAW-001';
const DUMMY_ALLOWED_FILE = 'docs/agents/dummy-output.md';
const FORMAL_STATUSES = new Set([
  'idea',
  'ceo_intent_ready',
  'architect_review',
  'pm_spec_ready',
  'ceo_dev_approved',
  'in_dev',
  'dev_done',
  'qa_review',
  'qa_failed',
  'qa_approved',
  'code_review',
  'ceo_final_review',
  'ready_to_merge',
  'done',
  'blocked',
]);

const ALLOWED_TRANSITIONS = new Map([
  ['idea', new Set(['ceo_intent_ready', 'blocked'])],
  [
    'ceo_intent_ready',
    new Set(['pm_spec_ready', 'architect_review', 'blocked']),
  ],
  ['architect_review', new Set(['pm_spec_ready', 'blocked'])],
  ['pm_spec_ready', new Set(['ceo_dev_approved', 'blocked'])],
  ['ceo_dev_approved', new Set(['in_dev', 'dev_done', 'blocked'])],
  ['in_dev', new Set(['dev_done', 'blocked'])],
  ['dev_done', new Set(['qa_review', 'qa_approved', 'blocked'])],
  ['qa_review', new Set(['qa_approved', 'qa_failed', 'blocked'])],
  ['qa_failed', new Set(['in_dev', 'blocked'])],
  ['qa_approved', new Set(['ceo_final_review', 'done', 'blocked'])],
  ['code_review', new Set(['pm_spec_ready', 'qa_review', 'in_dev', 'blocked'])],
  ['ceo_final_review', new Set(['ready_to_merge', 'done', 'blocked'])],
  ['ready_to_merge', new Set(['done', 'blocked'])],
  [
    'blocked',
    new Set(['ceo_intent_ready', 'pm_spec_ready', 'ceo_dev_approved']),
  ],
]);

const FORBIDDEN_ALLOWED_FILE_PATTERNS = [
  /(^|\/)\.env($|[./])/,
  /(^|\/)\.env\.local$/,
  /^supabase(\/|$)/,
  /(^|\/)migrations(\/|$)/,
  /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb)$/,
  /^app(\/|$)/,
  /^pages(\/|$)/,
  /^src\/app(\/|$)/,
  /^inngest(\/|$)/,
  /^lib(\/|$)/,
  /(^|\/)api(\/|$)/,
  /^\.vercel(\/|$)/,
  /^vercel\.json$/,
  /^Dockerfile$/,
  /(^|\/)(auth|billing|pricing)(\/|$)/,
];

const DEFAULT_FORBIDDEN_AREAS = [
  'app code',
  'db',
  'auth',
  'billing',
  'pricing',
  'secrets',
  'env',
  'deployment',
];

function now() {
  return new Date().toISOString();
}

function normalizeRepoPath(value) {
  return value.replace(/\\/g, '/').replace(/^\/+/, '');
}

function queueDir(queue) {
  return path.join(RUNTIME_DIR, queue);
}

function taskPath(queue, id) {
  return path.join(queueDir(queue), `${id}.json`);
}

function promptPath(name) {
  return path.join(queueDir('outbox'), name);
}

function repoPath(relativePath) {
  return path.join(REPO_ROOT, relativePath);
}

function runGitNameOnly(args) {
  const result = spawnSync('git', args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
  });

  if (result.error) {
    fail(`Git inspection failed: ${result.error.message}`);
  }
  if (result.status !== 0) {
    fail(`Git inspection failed: git ${args.join(' ')}`, {
      stderr: result.stderr.trim(),
    });
  }

  return result.stdout
    .split(/\r?\n/)
    .map((entry) => normalizeRepoPath(entry.trim()))
    .filter(Boolean);
}

function getGitChangedFiles() {
  const files = [
    ...runGitNameOnly(['diff', '--name-only']),
    ...runGitNameOnly(['diff', '--cached', '--name-only']),
    ...runGitNameOnly(['ls-files', '--others', '--exclude-standard']),
  ];

  return [...new Set(files)].sort();
}

function unauthorizedChangedFiles(changedFiles, allowedFiles) {
  const allowed = new Set(allowedFiles.map(normalizeRepoPath));
  return changedFiles.filter((file) => !allowed.has(file));
}

function fail(message, details = undefined) {
  const error = new Error(message);
  error.details = details;
  throw error;
}

function stableHash(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  const content = await readFile(filePath, 'utf8');
  return JSON.parse(content.replace(/^\uFEFF/, ''));
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function ensureRuntime() {
  await mkdir(RUNTIME_DIR, { recursive: true });
  for (const queue of QUEUES) {
    await mkdir(queueDir(queue), { recursive: true });
  }

  if (!(await exists(STATE_FILE))) {
    await writeJson(STATE_FILE, {
      version: 1,
      mode: 'local-dispatcher',
      cronEnabled: false,
      autoMerge: false,
      autoDeploy: false,
      channelsEnabled: false,
      lastRunAt: null,
    });
  }

  if (!(await exists(TASKS_INDEX_FILE))) {
    await writeJson(TASKS_INDEX_FILE, { version: 1, tasks: [] });
  }
}

async function loadState() {
  await ensureRuntime();
  const state = await readJson(STATE_FILE);
  const safeState = {
    version: 1,
    mode: 'local-dispatcher',
    cronEnabled: false,
    autoMerge: false,
    autoDeploy: false,
    channelsEnabled: false,
    lastRunAt: state.lastRunAt ?? null,
  };
  await writeJson(STATE_FILE, safeState);
  return safeState;
}

async function touchLastRun() {
  const state = await loadState();
  state.lastRunAt = now();
  await writeJson(STATE_FILE, state);
}

async function readTaskFrom(queue, id) {
  const filePath = taskPath(queue, id);
  if (!(await exists(filePath))) {
    return null;
  }
  return { queue, filePath, task: await readJson(filePath) };
}

async function findTask(id) {
  for (const queue of ['inbox', 'active', 'archive']) {
    const found = await readTaskFrom(queue, id);
    if (found) {
      return found;
    }
  }
  return null;
}

async function listTasks() {
  await ensureRuntime();
  const tasks = [];
  for (const queue of ['inbox', 'active', 'archive']) {
    const names = await safeReaddir(queueDir(queue));
    for (const name of names.filter((entry) => entry.endsWith('.json'))) {
      const filePath = path.join(queueDir(queue), name);
      tasks.push({ queue, filePath, task: await readJson(filePath) });
    }
  }
  return tasks;
}

async function safeReaddir(dir) {
  try {
    return await readdir(dir);
  } catch {
    return [];
  }
}

async function countEntries(dir) {
  return (await safeReaddir(dir)).length;
}

async function syncTasksIndex() {
  const tasks = await listTasks();
  await writeJson(TASKS_INDEX_FILE, {
    version: 1,
    tasks: tasks.map(({ queue, task }) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      queue,
      updatedAt: task.updatedAt,
    })),
  });
}

function validateStatus(status) {
  if (!FORMAL_STATUSES.has(status)) {
    fail(`Unsupported task status: ${status}`);
  }
}

function validateTransition(task, nextStatus) {
  validateStatus(task.status);
  validateStatus(nextStatus);
  const allowed = ALLOWED_TRANSITIONS.get(task.status);
  if (!allowed?.has(nextStatus)) {
    fail(`Forbidden status jump: ${task.status} -> ${nextStatus}`);
  }
}

function validateAllowedFiles(task) {
  if (!Array.isArray(task.allowedFiles) || task.allowedFiles.length === 0) {
    fail(`Task ${task.id} has no allowedFiles`);
  }

  for (const file of task.allowedFiles) {
    const normalized = normalizeRepoPath(file);
    if (normalized !== file) {
      fail(`Task ${task.id} has non-normalized allowed file path: ${file}`);
    }
    if (path.isAbsolute(file) || normalized.includes('..')) {
      fail(`Task ${task.id} has unsafe allowed file path: ${file}`);
    }
    if (
      FORBIDDEN_ALLOWED_FILE_PATTERNS.some((pattern) =>
        pattern.test(normalized),
      )
    ) {
      fail(`Task ${task.id} allows a forbidden file area: ${file}`);
    }
  }
}

function validateDummyTask(task) {
  if (task.id !== DUMMY_ID || task.type !== 'dummy_docs_only') {
    fail('This command only supports DUMMY-OPENCLAW-001');
  }
  validateAllowedFiles(task);
  if (
    task.allowedFiles.length !== 1 ||
    task.allowedFiles[0] !== DUMMY_ALLOWED_FILE
  ) {
    fail(`Dummy task may only allow ${DUMMY_ALLOWED_FILE}`);
  }
}

function addHistory(task, event) {
  task.history.push({
    at: now(),
    actor: 'local-dispatcher',
    ...event,
  });
  task.updatedAt = now();
}

async function writeTask(queue, task) {
  validateStatus(task.status);
  validateAllowedFiles(task);
  await writeJson(taskPath(queue, task.id), task);
  await syncTasksIndex();
}

async function moveTask(found, targetQueue, task = found.task) {
  await writeTask(targetQueue, task);
  if (found.queue !== targetQueue && (await exists(found.filePath))) {
    await unlink(found.filePath);
  }
  await syncTasksIndex();
}

async function setStatus(found, nextStatus, event, targetQueue = found.queue) {
  const task = found.task;
  validateTransition(task, nextStatus);
  const previousStatus = task.status;
  task.status = nextStatus;
  addHistory(task, { ...event, from: previousStatus, to: nextStatus });
  await moveTask(found, targetQueue, task);
  return task;
}

function createDummyTask() {
  const timestamp = now();
  return {
    id: DUMMY_ID,
    title: 'Dummy docs-only routing test',
    type: 'dummy_docs_only',
    risk: 'low',
    status: 'ceo_intent_ready',
    createdAt: timestamp,
    updatedAt: timestamp,
    source: 'local',
    allowedFiles: [DUMMY_ALLOWED_FILE],
    forbiddenAreas: DEFAULT_FORBIDDEN_AREAS,
    workflow: ['ceo', 'pm', 'ceo_approval', 'codex', 'qa', 'ceo_final'],
    history: [
      {
        at: timestamp,
        actor: 'local-dispatcher',
        event: 'created',
        to: 'ceo_intent_ready',
        note: 'Local dummy task created for docs-only dispatcher validation.',
      },
    ],
    payload: {
      ceoIntent:
        'Verify the local dispatcher can route a harmless docs-only dummy task without external channels.',
      pmSpec: null,
      codexPrompt: null,
      codexResult: null,
      qaReport: null,
      ceoFinalDecision: null,
      dispatcherWrites: [],
    },
  };
}

async function commandInit() {
  await ensureRuntime();
  await loadState();
  await syncTasksIndex();
  await touchLastRun();
  printJson({
    ok: true,
    runtimeDir: path.relative(REPO_ROOT, RUNTIME_DIR),
    queues: QUEUES,
    stateFile: path.relative(REPO_ROOT, STATE_FILE),
    tasksFile: path.relative(REPO_ROOT, TASKS_INDEX_FILE),
  });
}

async function commandStatus() {
  const state = await loadState();
  const tasks = await listTasks();
  const byStatus = {};
  for (const status of FORMAL_STATUSES) {
    byStatus[status] = 0;
  }
  for (const { task } of tasks) {
    byStatus[task.status] = (byStatus[task.status] ?? 0) + 1;
  }

  printJson({
    state,
    taskCount: tasks.length,
    byStatus,
    queues: {
      inbox: await countEntries(queueDir('inbox')),
      active: await countEntries(queueDir('active')),
      outbox: await countEntries(queueDir('outbox')),
      archive: await countEntries(queueDir('archive')),
    },
    forbiddenAutomationFlags: {
      cronEnabled: state.cronEnabled,
      autoMerge: state.autoMerge,
      autoDeploy: state.autoDeploy,
      channelsEnabled: state.channelsEnabled,
    },
  });
}

async function commandCreateDummy() {
  await loadState();
  const existing = await findTask(DUMMY_ID);
  if (existing) {
    printJson({
      ok: true,
      created: false,
      reason: 'task already exists',
      queue: existing.queue,
      task: summarizeTask(existing.task),
    });
    return;
  }

  const task = createDummyTask();
  validateDummyTask(task);
  await writeTask('inbox', task);
  await touchLastRun();
  printJson({
    ok: true,
    created: true,
    queue: 'inbox',
    task: summarizeTask(task),
  });
}

async function commandDispatch() {
  await loadState();
  const tasks = (await listTasks()).filter(({ queue }) => queue !== 'archive');
  if (tasks.length === 0) {
    printJson({ ok: true, processed: false, reason: 'no active tasks' });
    return;
  }

  const found = tasks.find(({ task }) => task.id === DUMMY_ID) ?? tasks[0];
  const { task } = found;
  validateDummyTask(task);

  if (task.status !== 'ceo_intent_ready') {
    printJson({
      ok: true,
      processed: false,
      reason: `no dispatch action for status ${task.status}`,
      task: summarizeTask(task),
    });
    return;
  }

  const pmPrompt = [
    `# PM Prompt: ${task.id}`,
    '',
    'Prepare a tiny docs-only spec for the local dummy routing test.',
    '',
    `Allowed file: ${DUMMY_ALLOWED_FILE}`,
    'Forbidden: app code, DB, auth, billing, pricing, secrets, env, deployment.',
    '',
  ].join('\n');
  await writeFile(promptPath(`${task.id}-pm-prompt.md`), pmPrompt, 'utf8');

  task.payload.pmSpec = {
    summary: 'Create or update docs/agents/dummy-output.md only.',
    acceptanceCriteria: [
      'Task ID is present.',
      'Output states this is a dummy local dispatcher run.',
      'Output confirms no app code, secrets, env, or deployment settings were touched.',
    ],
    allowedFiles: [DUMMY_ALLOWED_FILE],
  };

  await setStatus(
    found,
    'pm_spec_ready',
    {
      event: 'dispatched_to_pm',
      note: 'PM prompt and deterministic dummy PM spec were produced.',
      files: [path.relative(REPO_ROOT, promptPath(`${task.id}-pm-prompt.md`))],
    },
    'active',
  );
  await touchLastRun();
  printJson({ ok: true, processed: true, task: summarizeTask(task) });
}

async function commandApproveDev(id) {
  const found = await requireTask(id);
  const { task } = found;
  validateDummyTask(task);
  if (task.status !== 'pm_spec_ready') {
    fail(
      `Task ${id} must be pm_spec_ready before approve-dev; got ${task.status}`,
    );
  }
  if (!task.payload.pmSpec) {
    fail(`Task ${id} cannot be approved without PM spec`);
  }

  const codexPrompt = [
    `# Codex Prompt: ${task.id}`,
    '',
    'CEO development approval granted for the docs-only dummy task.',
    '',
    `Allowed file: ${DUMMY_ALLOWED_FILE}`,
    'Write the dummy dispatcher output only. Do not touch app code or secrets.',
    '',
  ].join('\n');
  await writeFile(
    promptPath(`${task.id}-codex-prompt.md`),
    codexPrompt,
    'utf8',
  );
  task.payload.codexPrompt = codexPrompt;

  await setStatus(found, 'ceo_dev_approved', {
    event: 'ceo_dev_approved',
    note: 'CEO approval simulated locally after PM spec.',
    files: [path.relative(REPO_ROOT, promptPath(`${task.id}-codex-prompt.md`))],
  });
  await touchLastRun();
  printJson({ ok: true, task: summarizeTask(task) });
}

async function commandRunCodexDummy(id) {
  const found = await requireTask(id);
  const { task } = found;
  validateDummyTask(task);
  if (task.status !== 'ceo_dev_approved') {
    fail(
      `Task ${id} must be ceo_dev_approved before run-codex-dummy; got ${task.status}`,
    );
  }

  const timestamp = now();
  const output = [
    '# Dummy OpenClaw Routing Output',
    '',
    `Task ID: ${task.id}`,
    `Generated at: ${timestamp}`,
    '',
    'This is a dummy local dispatcher output for the Spectix agent workflow.',
    '',
    'Safety confirmation: no app code, secrets, env vars, deployment settings, DB schema, auth, billing, or pricing files were touched.',
    '',
  ].join('\n');

  const outputPath = repoPath(DUMMY_ALLOWED_FILE);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, output, 'utf8');

  task.payload.codexResult = {
    status: 'dev_done',
    filesTouched: [DUMMY_ALLOWED_FILE],
    outputSha256: stableHash(output),
    completedAt: timestamp,
  };
  task.payload.dispatcherWrites.push(DUMMY_ALLOWED_FILE);

  await setStatus(found, 'dev_done', {
    event: 'codex_dummy_done',
    note: 'Dummy Codex simulation wrote the only allowed repo file.',
    files: [DUMMY_ALLOWED_FILE],
  });
  await touchLastRun();
  printJson({ ok: true, task: summarizeTask(task), file: DUMMY_ALLOWED_FILE });
}

async function commandQa(id) {
  const found = await requireTask(id);
  const { task } = found;
  validateDummyTask(task);
  if (task.status !== 'dev_done') {
    fail(`Task ${id} must be dev_done before QA; got ${task.status}`);
  }
  if (!(await exists(repoPath(DUMMY_ALLOWED_FILE)))) {
    fail(`${DUMMY_ALLOWED_FILE} does not exist`);
  }
  const touched = task.payload.codexResult?.filesTouched ?? [];
  if (touched.length !== 1 || touched[0] !== DUMMY_ALLOWED_FILE) {
    fail(`QA expected only ${DUMMY_ALLOWED_FILE}; got ${touched.join(', ')}`);
  }
  const changedFiles = getGitChangedFiles();
  const unauthorized = unauthorizedChangedFiles(
    changedFiles,
    task.allowedFiles,
  );
  if (unauthorized.length > 0) {
    fail('QA found unauthorized changed files', {
      allowedFiles: task.allowedFiles,
      changedFiles,
      unauthorized,
    });
  }

  const qaReport = [
    `# QA Report: ${task.id}`,
    '',
    `Status: qa_approved`,
    `Reviewed file: ${DUMMY_ALLOWED_FILE}`,
    '',
    'The local dispatcher ledger shows only the dummy docs output was written by the Codex simulation.',
    '',
  ].join('\n');
  await writeFile(promptPath(`${task.id}-qa-report.md`), qaReport, 'utf8');
  task.payload.qaReport = {
    status: 'qa_approved',
    reviewedFiles: [DUMMY_ALLOWED_FILE],
    note: 'Dispatcher ledger confirms only the dummy docs output was written by the Codex simulation.',
  };

  await setStatus(found, 'qa_approved', {
    event: 'qa_approved',
    note: 'QA simulation approved the dummy docs-only output.',
    files: [path.relative(REPO_ROOT, promptPath(`${task.id}-qa-report.md`))],
  });
  await touchLastRun();
  printJson({ ok: true, task: summarizeTask(task) });
}

async function commandFinalApprove(id) {
  const found = await requireTask(id);
  const { task } = found;
  validateDummyTask(task);
  if (task.status !== 'qa_approved') {
    fail(
      `Task ${id} must be qa_approved before final approval; got ${task.status}`,
    );
  }

  task.payload.ceoFinalDecision = {
    status: 'done',
    approvedAt: now(),
    note: 'CEO final approval simulated for local dummy flow only. No merge or deploy action allowed.',
  };

  await setStatus(
    found,
    'done',
    {
      event: 'ceo_final_approved',
      note: 'Dummy flow completed and archived locally. No merge or deploy was attempted.',
    },
    'archive',
  );
  await touchLastRun();
  printJson({ ok: true, archived: true, task: summarizeTask(task) });
}

async function commandShow(id) {
  const found = await requireTask(id);
  printJson({ queue: found.queue, task: found.task });
}

async function commandAudit() {
  const state = await loadState();
  const tasks = await listTasks();
  const findings = [];
  const changedFiles = getGitChangedFiles();

  if (state.cronEnabled) findings.push('cronEnabled must remain false');
  if (state.autoMerge) findings.push('autoMerge must remain false');
  if (state.autoDeploy) findings.push('autoDeploy must remain false');
  if (state.channelsEnabled) findings.push('channelsEnabled must remain false');

  for (const { task } of tasks) {
    try {
      validateStatus(task.status);
      validateAllowedFiles(task);
      if (task.id === DUMMY_ID) validateDummyTask(task);
      validateHistory(task);
    } catch (error) {
      findings.push(`${task.id}: ${error.message}`);
    }
  }

  const activeDummy = tasks.find(
    ({ task, queue }) => task.id === DUMMY_ID && queue !== 'archive',
  )?.task;
  const archivedDummy = tasks.find(
    ({ task, queue }) => task.id === DUMMY_ID && queue === 'archive',
  )?.task;
  const diffContextTask = activeDummy ?? archivedDummy;

  if (activeDummy?.payload?.codexResult) {
    const files = activeDummy.payload.codexResult.filesTouched ?? [];
    if (files.length !== 1 || files[0] !== DUMMY_ALLOWED_FILE) {
      findings.push(
        `active dummy Codex result must only touch ${DUMMY_ALLOWED_FILE}`,
      );
    }
  }

  if (changedFiles.length > 0 && diffContextTask) {
    const unauthorized = unauthorizedChangedFiles(
      changedFiles,
      diffContextTask.allowedFiles,
    );
    if (unauthorized.length > 0) {
      findings.push(
        `git changed files outside ${diffContextTask.id} allowedFiles: ${unauthorized.join(', ')}`,
      );
    }
  } else if (changedFiles.length > 0) {
    findings.push(
      `git changed files exist without an active or archived task context: ${changedFiles.join(', ')}`,
    );
  }

  printJson({
    ok: findings.length === 0,
    findings,
    changedFiles,
    checked: {
      tasks: tasks.length,
      cronEnabled: state.cronEnabled,
      autoMerge: state.autoMerge,
      autoDeploy: state.autoDeploy,
      channelsEnabled: state.channelsEnabled,
    },
  });

  if (findings.length > 0) {
    process.exitCode = 1;
  }
}

function validateHistory(task) {
  for (const event of task.history ?? []) {
    if (event.from && event.to) {
      const allowed = ALLOWED_TRANSITIONS.get(event.from);
      if (!allowed?.has(event.to)) {
        fail(
          `history contains forbidden status jump ${event.from} -> ${event.to}`,
        );
      }
    }
  }
}

async function requireTask(id) {
  await loadState();
  const found = await findTask(id);
  if (!found) {
    fail(`Task not found: ${id}`);
  }
  return found;
}

function summarizeTask(task) {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    type: task.type,
    updatedAt: task.updatedAt,
    allowedFiles: task.allowedFiles,
  };
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function usage() {
  process.stdout
    .write(`Usage: node scripts/openclaw-local-dispatcher.mjs <command> [task-id]

Commands:
  init
  status
  create-dummy
  dispatch
  approve-dev <task-id>
  run-codex-dummy <task-id>
  qa <task-id>
  final-approve <task-id>
  show <task-id>
  audit
`);
}

async function main() {
  const [command, id] = process.argv.slice(2);

  switch (command) {
    case 'init':
      await commandInit();
      break;
    case 'status':
      await commandStatus();
      break;
    case 'create-dummy':
      await commandCreateDummy();
      break;
    case 'dispatch':
      await commandDispatch();
      break;
    case 'approve-dev':
      await commandApproveDev(id ?? DUMMY_ID);
      break;
    case 'run-codex-dummy':
      await commandRunCodexDummy(id ?? DUMMY_ID);
      break;
    case 'qa':
      await commandQa(id ?? DUMMY_ID);
      break;
    case 'final-approve':
      await commandFinalApprove(id ?? DUMMY_ID);
      break;
    case 'show':
      await commandShow(id ?? DUMMY_ID);
      break;
    case 'audit':
      await commandAudit();
      break;
    case undefined:
    case '-h':
    case '--help':
      usage();
      break;
    default:
      usage();
      fail(`Unknown command: ${command}`);
  }
}

main().catch((error) => {
  process.stderr.write(`Error: ${error.message}\n`);
  if (error.details) {
    process.stderr.write(`${JSON.stringify(error.details, null, 2)}\n`);
  }
  process.exitCode = 1;
});
