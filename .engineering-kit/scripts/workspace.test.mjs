import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {initializeWorkspace} from './workspace.mjs';
import {localLinkErrors,filesIn} from './validate.mjs';

const cli=fileURLToPath(new URL('../bin/cli.mjs',import.meta.url));
function temporary(run) {const dir=fs.mkdtempSync(path.join(os.tmpdir(),'engineering-workspace-'));try{run(dir);}finally{fs.rmSync(dir,{recursive:true,force:true});}}
for(const [agent,entry] of [['codex','AGENTS.md'],['claude','CLAUDE.md'],['opencode','AGENTS.md'],['cursor','.cursor/rules/fullstack-ai-engineering-kit.mdc']])test(`${agent}: installs in a non-Node workspace and preserves existing instructions`,()=>temporary(root=>{
  fs.writeFileSync(path.join(root,'app.php'),'<?php echo "hello";');
  const original='# Local instructions\n\nUse our existing tests.\n';
  if(agent!=='cursor')fs.writeFileSync(path.join(root,entry),original);
  const preview=initializeWorkspace({agent,target:root,dryRun:true});assert.ok(preview.paths.includes('.engineering-kit/'));assert.ok(!fs.existsSync(path.join(root,'.engineering-kit')));
  initializeWorkspace({agent,target:root});
  const text=fs.readFileSync(path.join(root,entry),'utf8');if(agent!=='cursor')assert.ok(text.startsWith(original));
  assert.ok(text.includes('.engineering-kit/references/workflow.md'));
  assert.ok(fs.existsSync(path.join(root,'.engineering-kit','templates','project-initialization.md')));
  assert.equal(fs.readFileSync(path.join(root,'app.php'),'utf8'),'<?php echo "hello";');assert.ok(!fs.existsSync(path.join(root,'package.json')));
  const bundle=path.join(root,'.engineering-kit');
  for(const file of filesIn(bundle).filter(f=>f.endsWith('.md')))assert.deepEqual(localLinkErrors(file,bundle),[],file);
  assert.throws(()=>initializeWorkspace({agent,target:root}),/already exists/);
}));
test('portable copies reference bundle without inventing native integration',()=>temporary(root=>{
  initializeWorkspace({agent:'portable',target:root});assert.deepEqual(fs.readdirSync(root),['.engineering-kit']);assert.ok(fs.existsSync(path.join(root,'.engineering-kit','skills','project-discovery','SKILL.md')));
}));
test('skill conflicts are rejected before bundle or instructions are written',()=>temporary(root=>{
  const conflict=path.join(root,'.agents','skills','release-readiness');fs.mkdirSync(conflict,{recursive:true});
  assert.throws(()=>initializeWorkspace({agent:'codex',target:root}),/already exists/);
  assert.ok(!fs.existsSync(path.join(root,'.engineering-kit')));assert.ok(!fs.existsSync(path.join(root,'AGENTS.md')));assert.deepEqual(fs.readdirSync(path.dirname(conflict)),['release-readiness']);
}));
test('instruction conflicts are rejected before copying',()=>temporary(root=>{
  fs.writeFileSync(path.join(root,'AGENTS.md'),'<!-- fullstack-ai-engineering-kit:begin -->');
  assert.throws(()=>initializeWorkspace({agent:'codex',target:root}),/Existing toolkit/);assert.ok(!fs.existsSync(path.join(root,'.engineering-kit')));
}));
test('instruction parent files are rejected before copying',()=>temporary(root=>{
  fs.mkdirSync(path.join(root,'.cursor'));fs.writeFileSync(path.join(root,'.cursor','rules'),'user file');
  assert.throws(()=>initializeWorkspace({agent:'cursor',target:root}),/not a directory/);assert.ok(!fs.existsSync(path.join(root,'.engineering-kit')));
}));
test('directory junction destination cannot redirect writes outside workspace',()=>temporary(root=>temporary(other=>{
  fs.symlinkSync(other,path.join(root,'.agents'),process.platform==='win32'?'junction':'dir');
  assert.throws(()=>initializeWorkspace({agent:'codex',target:root}),/unsafe destination/);assert.deepEqual(fs.readdirSync(other),[]);assert.ok(!fs.existsSync(path.join(root,'.engineering-kit')));
})));
test('CLI defaults target to caller directory, accepts spaces, and rejects mistakes',()=>temporary(root=>{
  const project=path.join(root,'a project');fs.mkdirSync(project);
  const run=(...args)=>spawnSync(process.execPath,[cli,...args],{cwd:project,encoding:'utf8'});
  assert.equal(run('--help').status,0);assert.equal(run('--version').stdout.trim(),'0.1.0');
  assert.equal(run('init').status,1);assert.equal(run('init','--agent','buff').status,1);assert.equal(run('init','--agent','codex','--unknown').status,1);
  assert.equal(run('init','--agent','codex','--dry-run').status,0);assert.deepEqual(fs.readdirSync(project),[]);
  const result=run('init','--agent','codex');assert.equal(result.status,0,result.stderr);assert.ok(fs.existsSync(path.join(project,'AGENTS.md')));
}));

test('Codex repairs a preserved portable bundle using complete linked skill folders',()=>temporary(root=>{
  initializeWorkspace({agent:'portable',target:root});
  const original='# Project rules\nKeep existing behavior.\n';
  fs.writeFileSync(path.join(root,'AGENTS.md'),original);
  const manifest=path.join(root,'.engineering-kit','skills','frontend-design','SKILL.md');
  const before=fs.readFileSync(manifest,'utf8');
  initializeWorkspace({agent:'codex',target:root});
  const linked=path.join(root,'.agents','skills','frontend-design');
  assert.ok(fs.lstatSync(linked).isSymbolicLink());
  assert.equal(fs.realpathSync(linked),fs.realpathSync(path.dirname(manifest)));
  assert.equal(fs.readFileSync(path.join(linked,'SKILL.md'),'utf8'),before);
  assert.ok(fs.readFileSync(path.join(root,'AGENTS.md'),'utf8').startsWith(original));
  for(const file of filesIn(path.join(root,'.engineering-kit','skills')).filter(f=>f.endsWith('.md')))assert.deepEqual(localLinkErrors(file,path.join(root,'.engineering-kit')),[],file);
}));
