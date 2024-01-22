const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const sourcePath = path.join(__dirname, 'files');
const copyPath = path.join(__dirname, 'files-copy');

async function isDirExists(path) {
  try {
    await fsPromises.stat(path);
    return true;
  } catch {
    return false;
  }
}

async function cleanUpDir() {
  const ifExists = await isDirExists(copyPath);
  if (!ifExists) return;

  const files = await readDir(copyPath);
  for (const file of files) {
    const fpath = path.join(file.path, file.name);
    fs.unlink(fpath, () => {
      console.log(`Old ${file.name} deleted\n`);
    });
  }
}

async function createDir() {
  fs.mkdir(path.join(__dirname, 'files-copy'), { recursive: true }, () => {});
}

function readDir(path) {
  return fsPromises.readdir(path, {
    withFileTypes: true,
  });
}

function copyFileContent(file) {
  const input = fs.createReadStream(path.join(sourcePath, file.name), 'utf-8');
  const output = fs.createWriteStream(path.join(copyPath, file.name), 'utf-8');

  input.pipe(output);
  console.log(`File ${file.name} copied to files-copy\n`);
}

async function copyDir() {
  const files = await readDir(sourcePath);
  for (const file of files) {
    copyFileContent(file);
  }
}

async function startCopy() {
  await cleanUpDir();
  await createDir();
  await copyDir();
}

startCopy();
