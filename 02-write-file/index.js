const { stdin, stdout } = process;
const fs = require('fs');
const path = require('path');
const pathToFile = path.join(__dirname, '02-write-file.txt');
const output = fs.createWriteStream(pathToFile);

function exitProgram(signal) {
  stdout.write(`The program was stopped with signal ${signal}\nBye!\n`);
  output.end();
}

process.on('exit', (signal) => exitProgram(signal));
process.on('SIGINT', () => process.exit(130));

stdout.write('Enter your text:\n');
stdin.on('data', (chunk) => {
  if (chunk.toString().trim() === 'exit') {
    process.exit(0);
  }
  output.write(chunk);
});
