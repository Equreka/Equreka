const Sequelize = require('sequelize');

const
  DB_HOST = 'localhost',
  DB_DATA = 'equreka',
  DB_USER = 'root',
  DB_PASS = '';

const sequelize = new Sequelize(DB_DATA, DB_USER, DB_PASS, {
  host   : DB_HOST,
  dialect: 'mysql'
});

// Connection to DB
sequelize.authenticate()
  .then(() => {
    console.log('Connection has been established successfully');
  })
  .catch((error) => {
    console.log('Unable to connect to the database:', error);
  });  

// Models
const modelEntry = require('../models/entry');
const Entry = modelEntry(sequelize, Sequelize);

const modelCategory = require('../models/category');
const Category = modelCategory(sequelize, Sequelize);

const modelConstant = require('../models/constant');
const Constant = modelConstant(sequelize, Sequelize);

//Entry.belongsTo(Category);
//Constant.belongsTo(Category);

sequelize.sync({ force: false })
  .then(() => {
    console.log('Tables synced')
  });

global.sequelize = sequelize;

module.exports = {
  sequelize,
  Category,
  Constant,
  Entry
}