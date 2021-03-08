const mongoose = require('mongoose');
const slug = require('mongoose-slug-generator');
const Schema = mongoose.Schema;

mongoose.plugin(slug);

const SchemaFormula = new Schema({
  name: {
    type: String,
    alias: 'title'
  },
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
    unit: {
      type: Schema.Types.ObjectId,
      ref:  'Unit'
    }
  }],
  references: [{
    description: String,
    bibcode:     String,
    doi:         String,
    link:        String
  }]
});

SchemaFormula.index({ name: 'text' });

module.exports = Formula = mongoose.model('Formula', SchemaFormula);