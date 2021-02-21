const Sequelize = require('sequelize');
const { Category } = require('../database');

module.exports = (sequelize, DataTypes) => {
  return sequelize.define('entry', {
    id: {
      type         : DataTypes.INTEGER,
      primaryKey   : true,
      autoIncrement: true,
      allowNull    : false
    },
    id_category: {
      type      : DataTypes.INTEGER,
      allowNull : false,
      references: {
        model: Category,
        key  : 'id'
      }
    },
    id_unit_main: {
      type     : DataTypes.INTEGER,
      allowNull: false
    },
    id_units: {
      type     : DataTypes.INTEGER,
      allowNull: false
    },
    slug: {
      type     : DataTypes.STRING,
      allowNull: false
    },
    name: {
      type     : DataTypes.STRING,
      allowNull: false
    },
    expression: {
      type     : DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.STRING
    }
  })
}