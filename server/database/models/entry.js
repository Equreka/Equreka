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
    type: Schema.Types.ObjectId,
    ref:  'Category'
  },
  subject: {
    type: Schema.Types.ObjectId,
    ref:  'Subject'
  },
  terms: [{
    type: Schema.Types.ObjectId,
    ref: 'Term'
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

//Term.discriminator('Variable', SchemaVariable);
//Term.discriminator('Constant', SchemaConstant);

module.exports = mongoose.model('Enrty', SchemaEntry);