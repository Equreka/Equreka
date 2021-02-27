import models from '../index';
module.exports = (sequelize, DataTypes) => {
  const Entry = sequelize.define('entry', {
    id: {
      type         : DataTypes.INTEGER,
      primaryKey   : true,
      autoIncrement: true,
      allowNull    : false
    },
    name: {
      type     : DataTypes.STRING,
      allowNull: false
    },
    slug: {
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
  });

  return Entry;
}