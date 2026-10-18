import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {makeTree} from './tree.mjs';

export const requiredSkills = ['project-discovery','requirements-engineering','system-architecture','frontend-design','frontend-engineering','backend-api-engineering','database-engineering','fullstack-development','security-engineering','code-audit','qa-testing','debugging','accessibility-review','performance-optimization','devops-deployment','documentation','release-readiness'];
export const requiredDocs = ['README.md','LICENSE','CONTRIBUTING.md','AGENTS.md','CLAUDE.md','.cursor/rules/engineering-kit.mdc','.github/workflows/validate.yml','references/workflow.md','references/sources.md','references/deployment-targets.md','docs/agent-compatibility.md','docs/portable-master-instructions.md','docs/skill-catalog.md','docs/license.md','docs/validation.md','docs/validation-results.md','docs/repository-tree.txt','examples/agent-evaluation.md','examples/club-booking/README.md','examples/club-booking/requirements.md','examples/club-booking/architecture.md','examples/club-booking/database-design.md','examples/club-booking/api-contract.md','examples/club-booking/implementation-plan.md','examples/club-booking/readiness.md','checklists/security.md','checklists/frontend-ux.md','checklists/release-readiness.md',...['project-initialization','project-brief','requirements','acceptance-criteria','architecture','database-design','api-contract','implementation-plan','design-brief','threat-model','qa-test-plan','code-audit-report','debugging-report','accessibility-report','performance-report','deployment-checklist','release-readiness','documentation-plan'].map(n=>`templates/${n}.md`)];
export function filesIn(root) {
  return fs.readdirSync(root,{withFileTypes:true}).filter(d=>!['.git','node_modules','.validation-tmp','.engineering-kit','.agents'].includes(d.name)).flatMap(d=>d.isDirectory()?filesIn(path.join(root,d.name)):[path.join(root,d.name)]);
}
export function metadata(text) {
  const errors=[]; const values={};
  const front=text.replace(/^\uFEFF/,'').match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if(!front) return {values,errors:['missing or malformed YAML frontmatter']};
  for(const line of front[1].split(/\r?\n/)) {
    if(!line.trim() || line.trim().startsWith('#')) continue;
    const m=line.match(/^([a-z-]+):\s*(.*?)\s*$/);
    if(!m) { errors.push('unsupported metadata line'); continue; }
    const [,key,raw]=m;
    if(!['name','description','license'].includes(key)) errors.push(`unsupported field ${key}`);
    if(Object.hasOwn(values,key)) errors.push(`duplicate field ${key}`);
    try {
      if(raw.startsWith('"')) values[key]=JSON.parse(raw);
      else if(raw.startsWith("'")) {
        if(!raw.endsWith("'")) throw Error();
        values[key]=raw.slice(1,-1).replace(/''/g,"'");
      } else {
        if(!raw || /[:\[\]{}#\n]/.test(raw) || /^[>|&*!]/.test(raw)) throw Error();
        values[key]=raw;
      }
      if(typeof values[key]!=='string') throw Error();
    } catch {errors.push(`invalid scalar ${key}`);}
  }
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.name??'') || (values.name??'').length>64) errors.push('invalid skill name');
  if(!values.description?.trim() || values.description.length>1024) errors.push('description must contain 1-1024 characters');
  if(!text.slice(front[0].length).trim()) errors.push('empty instruction body');
  return {values,errors};
}
function withoutFences(text) {
  let fence=null;
  return text.split(/\r?\n/).map(line=>{
    const m=line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if(m) { if(!fence) fence=m[1]; else if(m[1][0]===fence[0]&&m[1].length>=fence.length) fence=null; return ''; }
    return fence?'':line;
  }).join('\n');
}
function slug(text) {
  return text.toLowerCase().replace(/<[^>]*>/g,'').replace(/[^\p{L}\p{N}_\-\s]/gu,'').trim().replace(/\s/g,'-');
}
export function anchors(text) {
  const ids=new Set();const counts=new Map();
  for(const m of withoutFences(text).matchAll(/^ {0,3}#{1,6}\s+(.+?)(?:\s+#+)?\s*$/gm)) {
    const s=slug(m[1]);const n=counts.get(s)??0; counts.set(s,n+1); ids.add(n?`${s}-${n}`:s);
  }
  return ids;
}
export function localLinkErrors(file,root) {
  const errors=[];const original=fs.readFileSync(file,'utf8');
  const text=withoutFences(original).replace(/(`+)[\s\S]*?\1/g,'');
  const refs=new Map();
  for(const m of text.matchAll(/^\s{0,3}\[([^\]]+)\]:\s*(?:<([^>]+)>|(\S+))/gm)) refs.set(m[1].trim().toLowerCase(),m[2]??m[3]);
  const targets=[];
  for(const m of text.matchAll(/!?\[[^\]\n]*\]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+["'][^\n]*?["'])?\s*\)/g)) targets.push(m[1]??m[2]);
  for(const m of text.matchAll(/!?\[([^\]\n]+)\]\[([^\]\n]*)\]/g)) {
    const key=(m[2]||m[1]).trim().toLowerCase();
    if(refs.has(key)) targets.push(refs.get(key));else errors.push(`undefined reference ${key}`);
  }
  // Shortcut references are checked only when their label has a definition.
  for(const m of text.matchAll(/(?<!!)\[([^\]\n]+)\](?![(:\[])/g)) {const key=m[1].trim().toLowerCase();if(refs.has(key))targets.push(refs.get(key));}
  for(const raw of new Set(targets)) {
    if(/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(raw)) continue;
    try {
      const [name,fragment]=raw.split('#');
      const target=name?(name.startsWith('/')?path.resolve(root,'.'+decodeURIComponent(name)):path.resolve(path.dirname(file),decodeURIComponent(name.split('?')[0]))):file;
      const relative=path.relative(root,target);
      if(relative.startsWith('..'+path.sep)||relative==='..'||path.isAbsolute(relative)) {errors.push(`link escapes repository: ${raw}`);continue;}
      if(!fs.existsSync(target)) {errors.push(`missing target ${raw}`);continue;}
      if(fragment && /\.md$/i.test(target)&& !anchors(fs.readFileSync(target,'utf8')).has(decodeURIComponent(fragment))) errors.push(`missing heading ${raw}`);
    } catch {errors.push(`invalid link ${raw}`);}
  }
  return errors;
}
export function validate(root,{checkTree=true}={}) {
  const errors=[];let skillCount=0;let markdownCount=0;
  if(!fs.existsSync(root)||!fs.statSync(root).isDirectory()) return {errors:['root is not a directory'],skillCount,markdownCount};
  for(const file of requiredDocs) if(!fs.existsSync(path.join(root,file)))errors.push(`missing required document ${file}`);
  for(const file of ['package.json','bin/cli.mjs','scripts/workspace.mjs','docs/package-installation.md'])if(!fs.existsSync(path.join(root,file)))errors.push(`missing package resource ${file}`);
  for(const name of requiredSkills) if(!fs.existsSync(path.join(root,'skills',name,'SKILL.md')))errors.push(`missing skill ${name}`);
  for(const file of filesIn(root)) {
    const rel=path.relative(root,file);
    if(path.basename(file)==='SKILL.md') {
      skillCount++;
      const {values,errors:issues}=metadata(fs.readFileSync(file,'utf8'));
      if(values.name!==path.basename(path.dirname(file))) issues.push('name does not match directory');
      if(!fs.existsSync(path.join(path.dirname(file),'references','guide.md')))issues.push('missing local skill guide');
      errors.push(...issues.map(s=>`${rel}: ${s}`));
    }
    if(/\.md$/i.test(file)) {markdownCount++;errors.push(...localLinkErrors(file,root).map(s=>`${rel}: ${s}`));}
  }
  const tree=path.join(root,'docs','repository-tree.txt');
  if(checkTree&&fs.existsSync(tree)&&fs.readFileSync(tree,'utf8')!==makeTree(root))errors.push('repository tree is stale: run node scripts/tree.mjs --write');
  return {errors,skillCount,markdownCount};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const root=path.resolve(process.argv[2]??fileURLToPath(new URL('..',import.meta.url)));
  const result=validate(root);
  for(const e of result.errors)console.error(`FAIL ${e}`);
  console.log(`${result.errors.length?'FAIL':'PASS'}: ${result.skillCount} skills, ${result.markdownCount} Markdown files, ${result.errors.length} errors`);
  process.exitCode=result.errors.length?1:0;
}
