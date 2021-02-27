const mongoose = require('mongoose');
const slug = require('mongoose-slug-generator');
const Schema = mongoose.Schema;

const SchemaConstant = new Schema({
  name:        String,
  slug: { 
    type: String, 
    slug: 'name' 
  },
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