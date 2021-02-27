const fs         = require('fs');
const path       = require('path');
const env        = process.env.NODE_ENV || 'development';
const config     = require('../config.json')[env];
const Sequelize  = require('sequelize');
const modelsPath = __dirname + '/models';
const basename   = path.basename(__filename) + '/models';
const models     = {};

// Data
//const
//  DB_HOST = 'localhost',
//  DB_DATA = 'equreka',
//  DB_USER = 'root',
//  DB_PASS = '';
//
// Sequelize init
//const sequelize = new Sequelize(DB_DATA, DB_USER, DB_PASS, {
//  host   : DB_HOST,
//  dialect: 'mysql'
//});

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

// Connection to DB
sequelize.authenticate()
  .then(() => {
    console.log('[Sequelize]: Connection has been established successfully');
  })
  .catch((error) => {
    console.log('[Sequelize]: Unable to connect to the database:', error);
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

// Associations
// Entry
models.entry.belongsTo(models.category);
// Category
models.category.hasMany(models.entry)


// Sync
sequelize.sync({ 
  force: true
}).then(() => {
    console.log('[Sequelize]: Synced successfully')
  });

global.sequelize = sequelize;

module.exports = models;