const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const styleDirPath = path.join(__dirname, 'styles');
const bundleFilePath = path.join(__dirname, 'project-dist', 'bundle.css');

async function cleanUpBundleFile() {
  await fsPromises
    .truncate(bundleFilePath)
    .then(() => console.log('bundle.css successfully cleaned up\n'));
}

async function readStyleDirectory() {
  return await fsPromises.readdir(styleDirPath, {
    withFileTypes: true,
  });
}

function isCssFile(file) {
  const ext = path.extname(file.name).slice(1);
  return ext === 'css';
}

function fillBundleFile(file) {
  const input = fs.createReadStream(
    path.join(styleDirPath, file.name),
    'utf-8',
  );
  const output = fs.createWriteStream(bundleFilePath, {
    flags: 'a',
    encoding: 'utf-8',
  });

  input.pipe(output);
  console.log(`File ${file.name} merged to bundle.css\n`);
}

function handleStyleFiles() {
  readStyleDirectory().then((files) => {
    for (let file of files) {
      if (!isCssFile(file)) continue;
      fillBundleFile(file);
    }
  });
}

cleanUpBundleFile()
  .finally(() => handleStyleFiles())
  .catch((err) => {
    if (err.code === 'ENOENT') {
      console.log('bundle.css was not found, cleaning skipped\n');
    } else {
      console.err(err);
    }
  });
