import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {install,destinations} from './install.mjs';
import {localLinkErrors,requiredSkills} from './validate.mjs';
for(const agent of Object.keys(destinations))test(`${agent}: dry run, complete portable copy, no overwrite`,()=>{
  const target=fs.mkdtempSync(path.join(os.tmpdir(),'kit-install-'));
  try {
    const preview=install({agent,target});assert.equal(preview.length,17);assert.deepEqual(fs.readdirSync(target),[]);
    install({agent,target,write:true});
    for(const name of requiredSkills){const dir=path.join(target,destinations[agent],name);assert.ok(fs.existsSync(path.join(dir,'references','guide.md')));assert.deepEqual(localLinkErrors(path.join(dir,'SKILL.md'),target),[]);}
    const marker=path.join(target,destinations[agent],'project-discovery','SKILL.md');const before=fs.readFileSync(marker,'utf8');
    assert.throws(()=>install({agent,target,write:true}),/already exists/);assert.equal(fs.readFileSync(marker,'utf8'),before);
  }finally{fs.rmSync(target,{recursive:true,force:true});}
});
test('reject invalid agent and non-absolute or missing target',()=>{
  assert.throws(()=>install({agent:'buff',target:os.tmpdir()}),/agent must/);
  assert.throws(()=>install({agent:'codex',target:'relative'}),/absolute/);
  assert.throws(()=>install({agent:'codex',target:path.join(os.tmpdir(),'kit-missing-'+crypto.randomUUID())}),/existing/);
});
test('a conflict prevents partial writes for earlier skills',()=>{
  const target=fs.mkdtempSync(path.join(os.tmpdir(),'kit-conflict-'));
  try {const base=path.join(target,'.agents','skills');fs.mkdirSync(path.join(base,'release-readiness'),{recursive:true});assert.throws(()=>install({agent:'codex',target,write:true}),/already exists/);assert.deepEqual(fs.readdirSync(base),['release-readiness']);}finally{fs.rmSync(target,{recursive:true,force:true});}
});
