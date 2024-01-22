const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const sourcePath = path.join(__dirname, 'files');
const copyPath = path.join(__dirname, 'files-copy');

function createDir() {
  fs.mkdir(path.join(__dirname, 'files-copy'), { recursive: true }, () => {});
}

function readDir() {
  return fsPromises.readdir(sourcePath, {
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
  const files = await readDir();
  for (const file of files) {
    copyFileContent(file);
  }
}

createDir();
copyDir();
