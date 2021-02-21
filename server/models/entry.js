const Sequelize = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  return sequelize.define('entry', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    id_category: {
      type: DataTypes.INTEGER,
    },
    id_unit_main: {
      type: DataTypes.INTEGER,
    },
    id_units: {
      type: DataTypes.INTEGER,
    },
    slug: {
      type: DataTypes.STRING
    },
    name: {
      type: DataTypes.STRING
    },
    expression: {
      type: DataTypes.STRING
    },
    description: {
      type: DataTypes.STRING
    }
  })
}