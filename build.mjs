import {mkdir, copyFile, cp} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url));
const out=path.join(root,'dist');
await mkdir(out,{recursive:true});
for(const file of ['index.html','styles.css','app.js','site-config.js','firebase-service.js','photo-compression.js']) await copyFile(path.join(root,file),path.join(out,file));
await cp(path.join(root,'assets'),path.join(out,'assets'),{recursive:true});
console.log('Static website built in dist/');
