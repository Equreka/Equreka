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
  let response, data;
  let apiPath = API + type;
  let filePath = PATH + type;
  try {
    fs.createWriteStream(`${filePath}.json`);
    response = await fetch(`${apiPath}/dump`);
    data = await response.json();
    console.time(type);
    if(JSON.stringify(data) != 'null') {
      fs.writeFileSync(`${filePath}.json`, JSON.stringify(data));
      console.timeEnd(type);
      return `i [Equreka] ["${filePath}.json"]: Updated successfully.`;
    } else {
      fs.writeFileSync(`${filePath}.json`, "{}");
      console.timeEnd(type);
      return `i [Equreka] ["${filePath}.json"]: Updated successfully but is empty.`;
    }
  } catch (err) {
    console.timeEnd(type);
    return `e [Equreka] ${err}`;
  }
}

(FILES).map(async (type) => {
  await update(type).then(res => console.log(res));
})

console.timeEnd('i [Equreka] Total time');
