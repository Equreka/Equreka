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
  },
  description: String,
});

const Category = mongoose.model('Category', SchemaCategory);
//const cat = new Category();
//cat._id = 1;
//cat.name = 'Mathematics';
//cat.save();

module.exports = Category;