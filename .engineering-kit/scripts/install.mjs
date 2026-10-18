import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validate,requiredSkills} from './validate.mjs';
export const destinations={codex:'.agents/skills',claude:'.claude/skills',cursor:'.cursor/skills',opencode:'.opencode/skills'};
export function install({agent,target,write=false,link=false,source=fileURLToPath(new URL('..',import.meta.url))}) {
  if(!Object.hasOwn(destinations,agent))throw Error('agent must be codex, claude, cursor, or opencode');
  if(!target||!path.isAbsolute(target))throw Error('target must be an explicit absolute project directory');
  if(!fs.existsSync(target)||!fs.statSync(target).isDirectory())throw Error('target must be an existing project directory');
  const result=validate(source,{checkTree:false});if(result.errors.length)throw Error('source validation failed: '+result.errors.join('; '));
  const actualTarget=fs.realpathSync(target);
  const base=path.join(actualTarget,destinations[agent]);
  // Refuse symlink/reparse destinations so a local install cannot silently leave the target.
  let cursor=actualTarget;
  for(const part of destinations[agent].split('/')) {cursor=path.join(cursor,part);if(fs.existsSync(cursor)&&(fs.lstatSync(cursor).isSymbolicLink()||!fs.statSync(cursor).isDirectory()))throw Error(`unsafe destination component: ${cursor}`);}
  const plan=requiredSkills.map(name=>({from:path.join(source,'skills',name),to:path.join(base,name)}));
  for(const p of plan) {try {fs.lstatSync(p.to);throw Error(`destination already exists: ${p.to}`);}catch(e){if(e.code!=='ENOENT')throw e;}}
  if(write) {
    fs.mkdirSync(base,{recursive:true});
    // Each copy is exclusive; a race or IO failure stops rather than overwriting.
    // Earlier copied skills may remain after IO failure; inspect before retrying.
    for(const p of plan) {
      if(link) fs.symlinkSync(process.platform==='win32'?path.resolve(p.from):path.relative(path.dirname(p.to),p.from),p.to,process.platform==='win32'?'junction':'dir');
      else fs.cpSync(p.from,p.to,{recursive:true,force:false,errorOnExist:true});
    }
  }
  return plan;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const args=process.argv.slice(2);const options={};
    for(let i=0;i<args.length;i++) {if(args[i]==='--write')options.write=true;else if(['--agent','--target'].includes(args[i])&&args[i+1]&&!args[i+1].startsWith('--'))options[args[i].slice(2)]=args[++i];else throw Error('usage: node scripts/install.mjs --agent <agent> --target <absolute-path> [--write]');}
    const plan=install(options);for(const p of plan)console.log(`${options.write?'COPIED':'WOULD COPY'} ${p.to}`);
    console.log(`${options.write?'Installed':'Dry run:'} ${plan.length} skills. Merge workflow instructions manually; see docs/agent-compatibility.md.`);
  }catch(e){console.error(e.message);process.exitCode=1;}
}
