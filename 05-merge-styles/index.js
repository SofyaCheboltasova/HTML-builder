const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const styleDirPath = path.join(__dirname, 'styles');
const bundleDirPath = path.join(__dirname, 'project-dist');
const bundleName = 'bundle.css';

async function cleanUpFile(path) {
  await fsPromises.truncate(path);
  console.log(`${bundleName} successfully cleaned up\n`);
}

async function readDir(path) {
  return await fsPromises.readdir(path, {
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

async function handleStyleFiles() {
  const files = await readDir(styleDirPath);

  for (const file of files) {
    if (!hasExt(file, 'css')) continue;
    const paths = getPathsObject(
      styleDirPath,
      bundleDirPath,
      file.name,
      bundleName,
    );

    writeFile(paths);
    console.log(`File ${file.name} merged to bundle.css\n`);
  }
}

const bundleFilePath = path.join(bundleDirPath, bundleName);

async function startMerge() {
  try {
    await cleanUpFile(bundleFilePath);
  } catch (err) {
    err.code === 'ENOENT'
      ? console.log('File was not found. Cleaning skipped\n')
      : console.err(err);
  } finally {
    await handleStyleFiles();
  }
}

startMerge();
