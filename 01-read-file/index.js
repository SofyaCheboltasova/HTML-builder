const fs = require('fs');
const path = require('path');
const pathToFile = path.join(__dirname, 'text.txt');
const stream = fs.createReadStream(pathToFile, 'utf-8');

let data = '';
stream.on('data', (chunk) => (data += chunk));
stream.on('end', () => console.log(data));
stream.on('error', (err) => console.log(err.message));
