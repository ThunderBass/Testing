import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('dist');
let html=await readFile(path.join(root,'index.html'),'utf8');
for(const match of [...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g)]) {
  const script=await readFile(path.join(root,match[1]),'utf8');
  html=html.replace(match[0],()=>`<script type="module">${script.replaceAll('</script','<\\/script')}</script>`);
}
for(const match of [...html.matchAll(/<link\b[^>]*href="([^"]+\.css)"[^>]*>/g)]) {
  const css=await readFile(path.join(root,match[1]),'utf8');
  html=html.replace(match[0],()=>`<style>${css}</style>`);
}
html=html.replace(/<link\b[^>]*rel="modulepreload"[^>]*>/g,'');
const licenseFiles=[['Packt reference repository','src/reference-license.txt'],['DM Sans','node_modules/@fontsource-variable/dm-sans/LICENSE'],['Marked','node_modules/marked/LICENSE.md'],['DOMPurify','node_modules/dompurify/LICENSE']];
const notices=(await Promise.all(licenseFiles.map(async ([name,file])=>name+'\n'+await readFile(file,'utf8')))).join('\n\n');
await writeFile(path.join(root,'THIRD-PARTY-LICENSES.txt'),notices);
const bodyEnd=html.lastIndexOf('</body>');
html=html.slice(0,bodyEnd)+'<script type="text/plain" id="third-party-licenses">'+notices.replaceAll('</script','<\\/script')+'</script>\n'+html.slice(bodyEnd);
await writeFile(path.join(root,'packetwise.html'),html);
console.log(`Standalone site: dist/packetwise.html (${Math.round(Buffer.byteLength(html)/1024)} KB; fonts, styles and questions included)`);
