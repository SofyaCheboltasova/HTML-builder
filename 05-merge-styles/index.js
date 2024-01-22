const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const styleDirPath = path.join(__dirname, 'styles');
const bundleDirPath = path.join(__dirname, 'project-dist');

async function cleanUpBundleFile() {
  const bundleFilePath = path.join(bundleDirPath, 'bundle.css');
  await fsPromises
    .truncate(bundleFilePath)
    .then(() => console.log('bundle.css successfully cleaned up\n'));
}

async function readStyleDirectory() {
  return await fsPromises.readdir(styleDirPath, {
    withFileTypes: true,
  });
}

function hasExt(file, ext) {
  const fileExt = path.extname(file.name).slice(1);
  return ext === fileExt;
}

function writeFile(paths) {
  const { source, dest } = paths;
  const input = fs.createReadStream(source, 'utf-8');
  const output = fs.createWriteStream(dest, {
    flags: 'a',
    encoding: 'utf-8',
  });
  input.pipe(output);
}

function getPathsObject(sourcePath, destPath, sourceFile, destFile) {
  return {
    source: path.join(sourcePath, sourceFile),
    dest: path.join(destPath, destFile),
  };
}

function handleStyleFiles() {
  readStyleDirectory().then((files) => {
    for (let file of files) {
      if (!hasExt(file, 'css')) continue;
      const paths = getPathsObject(
        styleDirPath,
        bundleDirPath,
        file.name,
        'bundle.css',
      );
      writeFile(paths);
      console.log(`File ${file.name} merged to bundle.css\n`);
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
