import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {metadata,localLinkErrors,validate,anchors} from './validate.mjs';
const good='---\nname: qa-testing\ndescription: "Run risk-based QA: include boundaries."\nlicense: MIT\n---\n\n# QA\nDo the work.';
test('valid portable metadata and meaningful body',()=>assert.deepEqual(metadata(good).errors,[]));
test('reject malformed, missing, duplicate and unsupported metadata',()=>{
  for(const input of [good.replace('name: qa-testing','name: Bad_Name'),good.replace('description: "Run risk-based QA: include boundaries."','description: ""'),good.replace('license: MIT','name: qa-testing'),good.replace('license: MIT','unknown: value'),good.replace('---\nname','name'),good.replace('description: "Run risk-based QA: include boundaries."','description: [broken')])assert.ok(metadata(input).errors.length);
});
test('reject length overflow and empty instructions',()=>{assert.ok(metadata(good.replace('qa-testing','a'.repeat(65))).errors.length);assert.ok(metadata(good.replace('Run risk-based QA: include boundaries.','x'.repeat(1025))).errors.length);assert.ok(metadata(good.split('\n\n')[0]+'\n').errors.length);});
test('relative, reference, fragment and code links resolve correctly',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'kit-links-'));
  try {
    fs.writeFileSync(path.join(root,'target.md'),'# Good heading\n# Good heading\n');
    const file=path.join(root,'README.md');
    fs.writeFileSync(file,'[inline](target.md#good-heading)\n[ref][a]\n[a]: target.md#good-heading-1\n`[ignore](missing.md)`\n```md\n[ignore](missing.md)\n```\n[external](https://example.org/no-check)');
    assert.deepEqual(localLinkErrors(file,root),[]);
    fs.appendFileSync(file,'\n[bad](missing.md)\n[bad anchor](target.md#absent)\n[escape](../outside.md)\n[undefined][nope]');
    const errors=localLinkErrors(file,root);assert.equal(errors.length,4);assert.ok(errors.some(e=>e.includes('heading')));assert.ok(errors.some(e=>e.includes('escapes')));
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});
test('heading slugs retain inline code names',()=>assert.ok(anchors('# Use `config` now').has('use-config-now')));
test('empty repository detects missing skills and docs',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'kit-empty-'));
  try {const r=validate(root);assert.ok(r.errors.some(e=>e==='missing skill project-discovery'));assert.ok(r.errors.some(e=>e==='missing required document README.md'));}finally{fs.rmSync(root,{recursive:true,force:true});}
});
