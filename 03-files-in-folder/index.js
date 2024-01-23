const fsPromises = require('fs').promises;
const path = require('path');
const secretFolderPath = path.join(__dirname, 'secret-folder');

async function readDirectory() {
  return await fsPromises.readdir(secretFolderPath, {
    withFileTypes: true,
  });
}

function removeDirectories(content) {
  let files = [];
  for (const elem of content) {
    if (!elem.isDirectory()) {
      files.push(elem);
    }
  }
  return files;
}

function printFileInfo(file) {
  const ext = path.extname(file.name).slice(1);
  const name = file.name.replace(`.${ext}`, '');
  const filePath = path.join(secretFolderPath, file.name);

  fsPromises.stat(filePath).then((stat) => {
    const size = stat.size;
    console.log(`${name} - ${ext} - ${size * 0.001}KB`);
  });
}

readDirectory().then((content) => {
  const files = removeDirectories(content);

  for (const file of files) {
    printFileInfo(file);
  }
});
