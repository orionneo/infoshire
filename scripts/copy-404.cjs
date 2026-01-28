const fs = require('node:fs/promises');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const source = path.join(rootDir, 'public', '404.html');
const targetDir = path.join(rootDir, 'dist');
const target = path.join(targetDir, '404.html');

const copy404 = async () => {
  await fs.mkdir(targetDir, { recursive: true });
  await fs.copyFile(source, target);
  console.log('Copied public/404.html to dist/404.html');
};

copy404().catch((error) => {
  console.error('Failed to copy 404.html', error);
  process.exitCode = 1;
});
