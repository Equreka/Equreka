const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SchemaVariable = new Schema({
  name:        String,
  symbol:      String,
  description: String,
  category:    [{ 
    type: Schema.Types.ObjectId,
    ref:  'Category'
  }],
  unit: [{
    type: Schema.Types.ObjectId,
    ref:  'Unit'
  }]
});

module.exports = mongoose.model('Variable', SchemaVariable);