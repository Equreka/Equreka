module.exports = (sequelize, DataTypes) => {
  const Constant = sequelize.define('constant', {
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
    symbol: {
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