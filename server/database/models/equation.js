const mongoose = require('mongoose');
const slug = require('mongoose-slug-generator');
const Schema = mongoose.Schema;

mongoose.plugin(slug);

const SchemaEquation = new Schema({
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

SchemaEquation.index({ name: 'text' });

module.exports = Equation = mongoose.model('Equation', SchemaEquation);