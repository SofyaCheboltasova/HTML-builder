const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const projectDistPath = path.join(__dirname, 'project-dist');
const templateFilePath = path.join(projectDistPath, 'index.html');
const stylesFilePath = path.join(projectDistPath, 'styles.css');
const stylesDirPath = path.join(__dirname, 'styles');

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

function createDir() {
  fs.mkdir(path.join(__dirname, 'project-dist'), { recursive: true }, () => {});
  console.log('project-dist directory updated\n');
}

async function readStyleDirectory() {
  return await fsPromises.readdir(stylesDirPath, {
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

async function mergeStyles() {
  await readStyleDirectory().then((files) => {
    for (let file of files) {
      if (!isCssFile(file)) continue;
      fillBundleFile(file);
    }
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
    createDir();
    mergeStyles();
  });
