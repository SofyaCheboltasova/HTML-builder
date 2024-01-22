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

async function getAllFiles(source) {
  const subDirs = await readDirectory(source);
  const files = await Promise.all(
    subDirs.map((subDir) => {
      const elemPath = path.join(source, subDir.name);
      return subDir.isDirectory() ? getAllFiles(elemPath) : elemPath;
    }),
  );
  return files.flat();
}

async function cleanUpFiles(source) {
  const files = await getAllFiles(source);

  await Promise.allSettled(
    files.map((file) => {
      return fsPromises.truncate(file);
    }),
  ).then(() => console.log('All files cleaned up\n'));
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

function writeFile(source, dest, file) {
  const input = fs.createReadStream(path.join(source, file.name), 'utf-8');
  const output = fs.createWriteStream(dest, {
    flags: 'a',
    encoding: 'utf-8',
  });

  input.pipe(output);
  console.log(`File ${file.name} merged to bundle.css\n`);
}

async function mergeStyles(source, dest) {
  const files = await readDirectory(source);
  for (let file of files) {
    if (!hasExt(file, 'css')) continue;
    writeFile(source, dest, file);
  }
}

function copyFileContent(destinationPath, file) {
  const ext = path.extname(file.name).slice(1);
  const encoding = ext === 'jpg' ? null : 'utf-8';

  const input = fs.createReadStream(path.join(file.path, file.name), {
    encoding: encoding,
  });
  const output = fs.createWriteStream(path.join(destinationPath, file.name), {
    flags: 'a',
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

cleanUpFiles(projectDirPath).then(() => {
  createDir(__dirname, 'project-dist');
  createDir(projectDirPath, 'assets');
  copyDir(assetsDirPath, projectAssetsDirPath);
  mergeStyles(stylesDirPath, stylesFilePath);
  replaceTags();
});
