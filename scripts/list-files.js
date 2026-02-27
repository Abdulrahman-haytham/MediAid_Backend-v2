const fs = require('fs').promises;
const path = require('path');

async function listFiles(dir, ignore = ['node_modules', '.git', 'dist']) {
  let results = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (ignore.includes(entry.name)) continue;

      if (entry.isDirectory()) {
        const subFiles = await listFiles(fullPath, ignore);
        results = results.concat(subFiles);
      } else {
        results.push(path.relative(process.cwd(), fullPath));
      }
    }
  } catch (err) {
    console.error(`Error reading ${dir}:`, err);
  }

  return results;
}

(async () => {
  const files = await listFiles(process.cwd());
  const output = files.join('\n');

  console.log(output);
  await fs.writeFile('project_files.txt', output, 'utf8');
  console.log('Saved file list to project_files.txt');
})();
