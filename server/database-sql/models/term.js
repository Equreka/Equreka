module.exports = (sequelize, DataTypes) => {
  const Term = sequelize.define('term', {
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

  return Term;
}