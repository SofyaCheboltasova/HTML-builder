const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const projectDirPath = path.join(__dirname, 'project-dist');
const projectAssetsDirPath = path.join(projectDirPath, 'assets');
const templateFilePath = path.join(projectDirPath, 'index.html');
const stylesFilePath = path.join(projectDirPath, 'styles.css');
const stylesDirPath = path.join(__dirname, 'styles');
const assetsDirPath = path.join(__dirname, 'assets');

async function cleanUpFiles() {
  await Promise.allSettled([
    fsPromises
      .truncate(templateFilePath)
      .then(() => console.log('index.html cleaned up\n')),
    fsPromises
      .truncate(stylesFilePath)
      .then(() => console.log('styles.css cleaned up\n')),
  ]).then(([err1, err2]) => {
    throw { err1: err1.reason, err2: err2.reason };
  });
}

function createDir(sourceDir, name) {
  const dirPath = path.join(sourceDir, name);
  fs.mkdir(dirPath, { recursive: true }, () => {});
  console.log(`${name} directory created\n`);

  return dirPath;
}

async function readDirectory(path) {
  return await fsPromises.readdir(path, {
    withFileTypes: true,
  });
}

function isCssFile(file) {
  const ext = path.extname(file.name).slice(1);
  return ext === 'css';
}

function fillBundleFile(file) {
  const input = fs.createReadStream(
    path.join(stylesDirPath, file.name),
    'utf-8',
  );
  const output = fs.createWriteStream(stylesFilePath, {
    flags: 'a',
    encoding: 'utf-8',
  });

  input.pipe(output);
  console.log(`File ${file.name} merged to bundle.css\n`);
}

function mergeStyles() {
  readDirectory(stylesDirPath).then((files) => {
    for (let file of files) {
      if (!isCssFile(file)) continue;
      fillBundleFile(file);
    }
  });
}

function copyFileContent(destinationPath, file) {
  const input = fs.createReadStream(path.join(file.path, file.name), 'utf-8');
  const output = fs.createWriteStream(
    path.join(destinationPath, file.name),
    'utf-8',
  );

  input.pipe(output);
}

function copyDir(sourcePath, destinationPath) {
  readDirectory(sourcePath)
    .then((files) => {
      for (const file of files) {
        if (file.isDirectory()) {
          const newSourcePath = path.join(file.path, file.name);
          const newDestPath = createDir(destinationPath, file.name);
          copyDir(newSourcePath, newDestPath);
        } else {
          copyFileContent(destinationPath, file);
        }
      }
    })
    .catch((err) => {
      console.log(err);
    });
}

cleanUpFiles()
  .catch(({ err1, err2 }) => {
    if (err1 && err1.code === 'ENOENT') {
      console.log('index.html cleaning skipped\n');
    }
    if (err2 && err2.code === 'ENOENT') {
      console.log('styles.css cleaning skipped\n');
    }
  })
  .finally(() => {
    createDir(__dirname, 'project-dist');
    createDir(projectDirPath, 'assets');
    copyDir(assetsDirPath, projectAssetsDirPath);
    mergeStyles();
  });
