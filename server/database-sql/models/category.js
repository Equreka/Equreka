module.exports = (sequelize, DataTypes) => {
  const Category = sequelize.define('category', {
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
    }
  });

  return Category;
}