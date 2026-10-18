import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export function makeTree(root) {
  const lines=[path.basename(root)+'/'];
  function walk(dir,prefix) {
    const entries=fs.readdirSync(dir,{withFileTypes:true}).filter(d=>!['.git','node_modules','.validation-tmp','.engineering-kit','.agents'].includes(d.name)&&!d.name.endsWith('.tgz')).sort((a,b)=>a.name.localeCompare(b.name,'en'));
    entries.forEach((d,i)=>{const last=i===entries.length-1;lines.push(prefix+(last?'└── ':'├── ')+d.name+(d.isDirectory()?'/':''));if(d.isDirectory())walk(path.join(dir,d.name),prefix+(last?'    ':'│   '));});
  }
  walk(root,'');return lines.join('\n')+'\n';
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const root=fileURLToPath(new URL('..',import.meta.url));
  if(process.argv.includes('--write')) {const output=path.join(root,'docs','repository-tree.txt');if(!fs.existsSync(output))fs.writeFileSync(output,'');fs.writeFileSync(output,makeTree(root));}
  process.stdout.write(makeTree(root));
}
