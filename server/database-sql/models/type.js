module.exports = (sequelize, DataTypes) => {
  const Type = sequelize.define('type', {
    id: {
      type         : DataTypes.INTEGER,
      primaryKey   : true,
      autoIncrement: true,
      allowNull    : false
    },
    name: {
      type     : DataTypes.STRING,
      allowNull: false
    }
  });

  return Type;
}