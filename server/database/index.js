const Sequelize = require('sequelize');
const fs = require('fs');
const path = require('path');
const modelsPath = __dirname + '/models';
const basename = path.basename(__filename) + '/models';
const models = {};

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

// Getting models
fs
  .readdirSync(modelsPath)
  .filter(file => {
    return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js');
  })
  .forEach(file => {
    const model = require(path.join(modelsPath, file))(sequelize, Sequelize.DataTypes)
    models[model.name] = model;
  });

Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

sequelize.sync({ force: false })
  .then(() => {
    console.log('Synced successfully')
  });

global.sequelize = sequelize;

module.exports = models;