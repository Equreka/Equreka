const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SchemaTerm = new Schema();

module.exports = mongoose.model('Term', SchemaTerm);