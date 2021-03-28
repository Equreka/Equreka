#!/usr/bin/env node
const fs = require('fs');
const fetch = require('node-fetch');
const FILES = ['categories', 'constants', 'equations', 'formulas', 'units', 'variables'];
const PATH = './static/data/';
const API = 'http://localhost:3000/api/';

console.log(`i [Equreka] Files: ${FILES}`);
console.log(`i [Equreka] Path: "${PATH}"`);
console.log(`i [Equreka] API: ${API}`);
console.time('i [Equreka] Total time');

async function update(type) {
  let response, 
      data,
      apiPath = API + type + '/dump/',
      fileName = type + '.json',
      filePath = PATH + fileName;
  try {
    fs.createWriteStream(filePath);
    response = await fetch(apiPath);
    data = await response.json();
    if(JSON.stringify(data) != 'null') {
      fs.writeFileSync(filePath, JSON.stringify(data));
      return `i [Equreka] ["${filePath}"]: Updated successfully.`;
    } else {
      fs.writeFileSync(filePath, "{}");
      return `i [Equreka] ["${filePath}"]: Updated successfully but is empty.`;
    }
  } catch (err) {
    return `e [Equreka] ${err}`;
  }
}

// Magic
(FILES).map(async (type) => {
  await update(type).then(res => console.log(res));
})

console.timeEnd('i [Equreka] Total time');
