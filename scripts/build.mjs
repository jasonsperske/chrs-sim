import { copyFile, cp, mkdir, rm } from 'node:fs/promises';
await rm('dist', {recursive:true, force:true});
await mkdir('dist');
for (const path of ['index.html', 'src', 'public']) await cp(path, `dist/${path}`, {recursive:true});
// Static hosts such as GitHub Pages serve 404.html for any path without a
// file, so deep links like /radio/<id> load the app, which reads the path.
await copyFile('dist/index.html', 'dist/404.html');
console.log('Static site built in dist/');
