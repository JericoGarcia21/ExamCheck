import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {install,destinations} from './install.mjs';
import {validate} from './validate.mjs';

const sourceRoot=fileURLToPath(new URL('..',import.meta.url));
const bundleEntries=['README.md','LICENSE','AGENTS.md','CLAUDE.md','CONTRIBUTING.md','package.json','bin','scripts','skills','templates','checklists','references','examples','docs','.github','.cursor'];
const begin='<!-- fullstack-ai-engineering-kit:begin -->';
const end='<!-- fullstack-ai-engineering-kit:end -->';
function exists(file) {try{fs.lstatSync(file);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}}
function safeDestination(root,relative) {
  let current=root;
  for(const part of relative.split('/')) {
    current=path.join(current,part);
    if(exists(current)&&fs.lstatSync(current).isSymbolicLink())throw Error(`Refusing symlink destination: ${current}`);
  }
  return current;
}
function instruction(agent) {
  const body=`Read .engineering-kit/references/workflow.md before starting a new project.\nUse .engineering-kit/templates/project-initialization.md for discovery and planning.\nLoad only relevant skills; keep work proportional to project size and risk.\nBefore significant implementation, present requirements, architecture, security/QA\nneeds and a feature plan; wait for necessary decisions unless already delegated.\nPreserve existing behavior and authorization. Record actual tests and evidence gaps.\nDo not deploy or change live infrastructure without user authorization.\nThe .engineering-kit folder is reference material; use this project's own build\nand test commands for product changes.`;
  if(agent==='cursor')return `---\ndescription: Engineering planning and verification workflow\nalwaysApply: true\n---\n\n${body}\n`;
  return `${begin}\n${body}\n${end}\n`;
}
export function initializeWorkspace({agent,target=process.cwd(),dryRun=false,source=sourceRoot}) {
  if(!['portable',...Object.keys(destinations)].includes(agent))throw Error('Choose --agent codex, claude, cursor, opencode, or portable.');
  if(!path.isAbsolute(target)||!fs.existsSync(target)||!fs.statSync(target).isDirectory())throw Error('Target must be an existing project directory.');
  const root=fs.realpathSync(target);
  const actualSource=fs.realpathSync(source);
  // Avoid bundling a source checkout into itself, including symlink aliases.
  if(root===actualSource||root.startsWith(actualSource+path.sep))throw Error('Choose a project outside the toolkit package directory.');
  const result=validate(source,{checkTree:false});
  if(result.errors.length)throw Error('Toolkit source validation failed: '+result.errors.join('; '));
  for(const entry of bundleEntries)if(!fs.existsSync(path.join(source,entry)))throw Error(`Missing package resource: ${entry}`);
  const bundle=safeDestination(root,'.engineering-kit');
  const repairing=exists(bundle);
  if(repairing) {
    if(agent!=='codex')throw Error('Destination .engineering-kit already exists; no files changed.');
    const existing=validate(bundle,{checkTree:false});
    if(existing.errors.length)throw Error('Existing bundle validation failed: '+existing.errors.join('; '));
  }
  const plan=agent==='portable'?[]:install({agent,target:root,source:repairing?bundle:source});
  const rule=agent==='cursor'?'.cursor/rules/fullstack-ai-engineering-kit.mdc':agent==='claude'?'CLAUDE.md':agent==='portable'?null:'AGENTS.md';
  let entryPath=null;let previous='';
  if(rule) {
    entryPath=safeDestination(root,rule);
    if(exists(entryPath)) {
      if(!fs.statSync(entryPath).isFile())throw Error(`Instruction destination is not a file: ${rule}`);
      if(agent==='cursor')throw Error(`Instruction rule already exists: ${rule}`);
      previous=fs.readFileSync(entryPath,'utf8');
      if((previous.includes(begin)||previous.includes(end))&&!(repairing&&previous.includes(begin)&&previous.includes(end)))throw Error(`Existing toolkit instruction block in ${rule}; no files changed.`);
    }
    // Preflight intermediate directories before creating any bundle or skills.
    const parent=path.dirname(entryPath);
    let probe=parent;
    while(probe!==root){if(exists(probe)&&!fs.statSync(probe).isDirectory())throw Error(`Instruction parent is not a directory: ${probe}`);probe=path.dirname(probe);}
  }
  const paths=['.engineering-kit/',...plan.map(p=>path.relative(root,p.to)),...(rule?[rule]:[])];
  if(dryRun)return {agent,target:root,paths};
  // Conflicts are preflighted above. Unexpected IO failures can leave partial
  // files; do not automatically delete or overwrite a user's project on failure.
  if(!repairing) {
  fs.mkdirSync(bundle);
  for(const entry of bundleEntries)fs.cpSync(path.join(source,entry),path.join(bundle,entry),{recursive:true,force:false,errorOnExist:true});
  }
  if(agent!=='portable')install({agent,target:root,source:bundle,write:true,link:agent==='codex'});
  if(entryPath&&!(repairing&&previous.includes(begin)&&previous.includes(end))) {
    fs.mkdirSync(path.dirname(entryPath),{recursive:true});
    const addition=instruction(agent);
    if(previous)fs.appendFileSync(entryPath,`${previous.endsWith('\n')?'':'\n'}\n${addition}`);
    else fs.writeFileSync(entryPath,addition,{flag:exists(entryPath)?'w':'wx'});
  }
  return {agent,target:root,paths};
}
