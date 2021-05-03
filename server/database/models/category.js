const mongoose = require('mongoose');
const slug = require('mongoose-slug-generator');
const Schema = mongoose.Schema;

mongoose.plugin(slug);

const SchemaCategory = new Schema({
  _id:         Number,
  name:        String,
  slug: { 
    type: String, 
    slug: 'name' 
  }
});

const Category = mongoose.model('Category', SchemaCategory);

module.exports = Category;