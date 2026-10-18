#!/usr/bin/env node
import path from 'node:path';
import fs from 'node:fs';
import {initializeWorkspace} from '../scripts/workspace.mjs';

const help=`fullstack-ai-engineering-kit

Usage:
  fullstack-ai-engineering-kit init --agent <codex|claude|cursor|opencode|portable>

Options:
  --target <path>   Project directory (defaults to the current working directory)
  --dry-run         Preview without changing any files
  --help            Show this help
  --version         Show package version

Works in existing directories for any stack; no project package.json is needed.
init writes files unless --dry-run is supplied. Existing skills and kit bundles
are never overwritten. Codex can repair a bundle missing its discovery folders.
Existing agent instructions are preserved and extended.
portable provides files for manual use without claiming native agent support.
`;
try {
  const args=process.argv.slice(2);
  if(!args.length||args.includes('--help')||args.includes('-h'))console.log(help);
  else if(args.length===1&&args[0]==='--version')console.log(JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8')).version);
  else {
    if(args.shift()!=='init')throw Error('Unknown command. Use --help for usage.');
    const options={target:process.cwd(),dryRun:false};const seen=new Set();
    for(let i=0;i<args.length;i++) {
      const arg=args[i];
      if(seen.has(arg))throw Error(`Duplicate option: ${arg}`);seen.add(arg);
      if(arg==='--dry-run')options.dryRun=true;
      else if(['--agent','--target'].includes(arg)&&args[i+1]&&!args[i+1].startsWith('--'))options[arg.slice(2)]=args[++i];
      else throw Error(`Unknown or incomplete option: ${arg}`);
    }
    options.target=path.resolve(options.target);
    const result=initializeWorkspace(options);
    console.log(`${options.dryRun?'Preview':'Installed'}: ${result.agent} in ${result.target}`);
    for(const item of result.paths)console.log(`  ${item}`);
    if(options.dryRun)console.log('No files changed. Remove --dry-run to install.');
    else {
      console.log('Templates, checklists, and all skills: .engineering-kit/');
      if(result.agent==='codex')console.log('Discovery: .agents/skills/ (linked to .engineering-kit/skills/).');
      console.log(result.agent==='portable'?'Provide .engineering-kit/docs/portable-master-instructions.md to your agent. Native discovery is unverified.':'Reload your coding agent and verify that project-discovery is available.');
      console.log('Start: Follow .engineering-kit/templates/project-initialization.md to plan my project before implementation.');
    }
  }
}catch(error){console.error(`Error: ${error.message}`);process.exitCode=1;}
