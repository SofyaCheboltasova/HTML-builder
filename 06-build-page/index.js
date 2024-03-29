const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');

const projectDirPath = path.join(__dirname, 'project-dist');
const projectAssetsDirPath = path.join(projectDirPath, 'assets');
const projectHtmlFilePath = path.join(projectDirPath, 'index.html');
const stylesDirPath = path.join(__dirname, 'styles');
const componentsDirPath = path.join(__dirname, 'components');
const assetsDirPath = path.join(__dirname, 'assets');
const templateFilePath = path.join(__dirname, 'template.html');

async function getAllFiles(source) {
  const subDirs = await readDir(source);
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
  );
  console.log('All files cleaned up\n');
}

function createDir(source, name) {
  const dirPath = path.join(source, name);
  fs.mkdir(dirPath, { recursive: true }, () => {
    console.log(`${name} directory created\n`);
  });
  return dirPath;
}

function readDir(path) {
  return fsPromises.readdir(path, {
    withFileTypes: true,
  });
}

async function copyDir(source, dest) {
  const files = await readDir(source);

  for (const file of files) {
    const fname = file.name;
    const fpath = file.path;

    if (file.isDirectory()) {
      const newSourcePath = path.join(fpath, fname);
      const newDestPath = createDir(dest, fname);
      copyDir(newSourcePath, newDestPath);
    } else {
      const paths = getPathsObject(source, dest, fname, fname);
      writeFile(paths);
    }
  }
}

function hasExt(file, ext) {
  const fileExt = path.extname(file.name).slice(1);
  return ext === fileExt;
}

function writeFile(paths) {
  const { source, dest } = paths;

  const ext = path.extname(source).slice(1);
  const encoding = ext === 'jpg' ? null : 'utf-8';

  const input = fs.createReadStream(source, {
    encoding: encoding,
  });
  const output = fs.createWriteStream(dest, {
    flags: 'a',
    encoding: encoding,
  });

  input.pipe(output);
}

function getPathsObject(sourcePath, destPath, sourceFile, destFile) {
  return {
    source: path.join(sourcePath, sourceFile),
    dest: path.join(destPath, destFile),
  };
}

async function mergeStyles(source, dest) {
  const files = await readDir(source);

  for (const file of files) {
    if (!hasExt(file, 'css')) continue;

    const paths = getPathsObject(source, dest, file.name, 'style.css');
    writeFile(paths);
  }
}

function setTagData(fname) {
  const tagName = fname.replace('.html', '');
  const tagStream = fs.createReadStream(
    path.join(componentsDirPath, fname),
    'utf-8',
  );
  return { name: tagName, stream: tagStream, content: '' };
}

function readTagContent(tag) {
  tag.stream.on('data', (chunk) => {
    tag.content += chunk.toString();
  });
}

function replaceTags(chunk, tagsForChange) {
  let newContent = '';

  for (const tag of tagsForChange) {
    if (chunk.includes(tag.name)) {
      newContent = chunk.replace(`{{${tag.name}}}`, tag.content);
      chunk = newContent;
    }
    console.log(`Replaced {{${tag.name}}}\n`);
  }
  return chunk;
}

async function handleHtmlFile(source, dest) {
  const input = fs.createReadStream(source, 'utf-8');
  const output = fs.createWriteStream(dest, 'utf-8');
  const tagsForChange = [];

  const files = await readDir(componentsDirPath);
  for (const file of files) {
    if (hasExt(file, 'html')) {
      const tagData = setTagData(file.name);
      tagsForChange.push(tagData);
    }
  }

  for (const tag of tagsForChange) {
    readTagContent(tag);
  }

  const lastTag = tagsForChange[tagsForChange.length - 1];
  lastTag.stream.on('end', () => {
    let resultContent = '';

    input.on('data', (chunk) => {
      resultContent += replaceTags(chunk.toString(), tagsForChange);
    });

    input.on('end', () => {
      output.write(resultContent);
      console.log('index.html filled\n');
    });
  });
}

async function startBuld() {
  try {
    await cleanUpFiles(projectDirPath);
  } catch {
    console.log('Nothing to clean\n');
  } finally {
    createDir(__dirname, 'project-dist');
    createDir(projectDirPath, 'assets');
    await copyDir(assetsDirPath, projectAssetsDirPath);
    await mergeStyles(stylesDirPath, projectDirPath);
    await handleHtmlFile(templateFilePath, projectHtmlFilePath);
  }
}

startBuld();
