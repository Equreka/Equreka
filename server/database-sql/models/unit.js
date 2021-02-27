module.exports = (sequelize, DataTypes) => {
  const Unit = sequelize.define('unit', {
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
    symbol: {
      type     : DataTypes.STRING,
      allowNull: false
    }
  });

  return Unit;
}