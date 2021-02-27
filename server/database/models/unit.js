const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SchemaUnit = new Schema({
  name:        String,
  symbol:      String,
  description: String,
  type:        {
    type:    String,
    default: 'SI'     // 'SI' International System of Units / 'EN' English Units
  }  
});

module.exports = mongoose.model('Unit', SchemaUnit);