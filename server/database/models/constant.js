module.exports = (sequelize, DataTypes) => {
  const Constant = sequelize.define('constant', {
    id: {
      type         : DataTypes.INTEGER,
      primaryKey   : true,
      autoIncrement: true,
      allowNull    : false
    },
    id_category: {
      type      : DataTypes.INTEGER,
      allowNull : false,
    },
    id_unit_main: {
      type     : DataTypes.INTEGER,
      allowNull: false
    },
    id_units: {
      type     : DataTypes.INTEGER,
      allowNull: false
    },
    name: {
      type     : DataTypes.STRING,
      allowNull: false
    },
    slug: {
      type     : DataTypes.STRING,
      allowNull: false
    },
    identifier: {
      type     : DataTypes.STRING,
      allowNull: false
    },
    value: {
      type     : DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.STRING
    },
  });

  return Constant;
}