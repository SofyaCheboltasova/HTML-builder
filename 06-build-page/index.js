const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const projectDirPath = path.join(__dirname, 'project-dist');
const projectAssetsDirPath = path.join(projectDirPath, 'assets');
const projectHtmlFilePath = path.join(projectDirPath, 'index.html');
const stylesFilePath = path.join(projectDirPath, 'style.css');
const stylesDirPath = path.join(__dirname, 'styles');
const componentsDirPath = path.join(__dirname, 'components');
const assetsDirPath = path.join(__dirname, 'assets');

async function cleanUpFiles() {
  await Promise.allSettled([
    fsPromises
      .truncate(projectHtmlFilePath)
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

function readDirectory(path) {
  return fsPromises.readdir(path, {
    withFileTypes: true,
  });
}

function hasExt(file, ext) {
  const fileExt = path.extname(file.name).slice(1);
  return ext === fileExt;
}

function writeFile(file) {
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
  const files = await readDirectory(stylesDirPath);
  for (let file of files) {
    if (!hasExt(file, 'css')) continue;
    writeFile(file);
  }
}

function copyFileContent(destinationPath, file) {
  const ext = path.extname(file.name).slice(1);
  const encoding = ext === 'jpg' ? null : 'utf-8';

  const input = fs.createReadStream(path.join(file.path, file.name), {
    encoding: encoding,
  });
  const output = fs.createWriteStream(path.join(destinationPath, file.name), {
    encoding: encoding,
  });

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

function replaceTags() {
  readDirectory(componentsDirPath).then((files) => {
    const input = fs.createReadStream(
      path.join(__dirname, 'template.html'),
      'utf-8',
    );

    const output = fs.createWriteStream(projectHtmlFilePath, 'utf-8');
    let outputContent = '';

    const tagsForChange = [];
    for (const file of files) {
      if (hasExt(file, 'html')) {
        const tagName = file.name.replace('.html', '');
        const tagStream = fs.createReadStream(
          path.join(componentsDirPath, file.name),
          'utf-8',
        );
        tagsForChange.push({ name: tagName, stream: tagStream, content: '' });
      }
    }

    for (const tag of tagsForChange) {
      tag.stream.on('data', (chunk) => {
        tag.content += chunk.toString();
      });

      tag.stream.on('end', () => {
        console.log(`Read ${tag.name}.html\n`);
      });
    }
    const lastTag = tagsForChange[tagsForChange.length - 1];
    lastTag.stream.on('end', () => {
      input.on('data', (chunk) => {
        let data = chunk.toString();
        let newContent = '';

        for (const tag of tagsForChange) {
          if (data.includes(tag.name)) {
            newContent = data.replace(`{{${tag.name}}}`, tag.content);
            data = newContent;
          }
          console.log(`Replaced {{${tag.name}}}\n`);
        }
        outputContent += newContent;
      });

      input.on('end', () => {
        output.write(outputContent);
      });
      input.on('end', () => {
        console.log('index.html filled\n');
      });
    });
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
    replaceTags();
  });
