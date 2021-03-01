const mongoose = require('mongoose');
const slug = require('mongoose-slug-generator');
const Schema = mongoose.Schema;

mongoose.plugin(slug);

const SchemaVariable = new Schema({
  name:        String,
  slug: { 
    type: String, 
    slug: 'name' 
  },
  symbol:      String,
  description: String,
  category: { 
    type: Schema.Types.ObjectId,
    ref:  'Category'
  },
  unit: {
    type: Schema.Types.ObjectId,
    ref:  'Unit'
  }
});

module.exports = Variable = mongoose.model('Variable', SchemaVariable);