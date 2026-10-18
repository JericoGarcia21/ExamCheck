// Run via npm run test:package so npm_execpath identifies npm on every OS.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'engineering-package-'));
function run(command,args,cwd=root) {
  const result=spawnSync(command,args,{cwd,encoding:'utf8',env:{...process.env,npm_config_cache:path.join(temp,'cache')}});
  if(result.error)throw result.error;
  assert.equal(result.status,0,result.stderr||result.stdout);return result.stdout;
}
try {
  if(!process.env.npm_execpath)throw Error('Run this check using npm run test:package.');
  const npm=(args,cwd)=>run(process.execPath,[process.env.npm_execpath,...args],cwd);
  const packed=JSON.parse(npm(['pack','--ignore-scripts','--json','--pack-destination',temp]));
  const artifact=path.join(temp,packed[0].filename);
  const consumer=path.join(temp,'consumer');fs.mkdirSync(consumer);
  npm(['install','--prefix',consumer,'--ignore-scripts','--no-audit','--no-fund','--offline',artifact]);
  const installed=path.join(consumer,'node_modules','fullstack-ai-engineering-kit');
  assert.ok(fs.existsSync(path.join(consumer,'node_modules','.bin',process.platform==='win32'?'fullstack-ai-engineering-kit.cmd':'fullstack-ai-engineering-kit')));
  for(const agent of ['codex','claude','cursor','opencode','portable']) {
    const workspace=path.join(temp,`workspace ${agent}`);fs.mkdirSync(workspace);
    // npm exec resolves the installed bin. GitHub fetch and registry publishing
    // are intentionally outside this offline artifact test.
    const output=npm(['exec','--offline','--prefix',consumer,'--','fullstack-ai-engineering-kit','init','--agent',agent,'--target',workspace],consumer);
    assert.ok(output.includes('Installed: '+agent));
    assert.ok(fs.existsSync(path.join(workspace,'.engineering-kit','templates','project-initialization.md')));
  }
  console.log('PASS: npm pack, offline tarball install, executable resolution, and 5 workspace modes.');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
