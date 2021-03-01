const mongoose = require('mongoose');
const slug = require('mongoose-slug-generator');
const Schema = mongoose.Schema;

mongoose.plugin(slug);

const SchemaEntry = new Schema({
  name: String,
  slug: { 
    type: String, 
    slug: 'name' 
  },
  expression: String,
  description: String,
  category: { 
    type: Number,
    ref:  'Category'
  },
  subject: {
    type: Schema.Types.ObjectId,
    ref:  'Subject'
  },
  variables: [{
    variable: {
      type: Schema.Types.ObjectId,
      ref:  'Variable'
    }
  }],
  constants: [{
    constant: {
      type: Schema.Types.ObjectId,
      ref:  'Constant'
    }
  }],
  units: [{
    type: Schema.Types.ObjectId,
    ref:  'Unit'
  }],
  references: [{
    description: String,
    bibcode:     String,
    doi:         String,
    link:        String
  }]
});

SchemaEntry.index({ name: 'text'});

module.exports = Entry = mongoose.model('Entry', SchemaEntry);