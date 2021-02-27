const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SchemaConstant = new Schema({
  name:        String,
  symbol:      String,
  description: String,
  category:    [{ 
    type: Schema.Types.ObjectId,
    ref:  'Category'
  }],
  values: [{
    value: Number,
    unit: [{
      type: Schema.Types.ObjectId,
      ref:  'Unit'
    }]
  }]
});

module.exports = mongoose.model('Constant', SchemaConstant);