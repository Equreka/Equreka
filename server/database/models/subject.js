const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SchemaSubject = new Schema({
  _id:         Number,
  name:        String,
  description: String,
});

const Subject = mongoose.model('Subject', SchemaSubject);

module.exports = Subject