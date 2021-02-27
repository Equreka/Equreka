const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SchemaCategory = new Schema({
  name:        String,
  description: String,
});

module.exports = mongoose.model('Category', SchemaCategory);