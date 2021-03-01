const mongoose = require('mongoose');

// Connection
mongoose.connect('mongodb://localhost/equreka', {
  useNewUrlParser: true, 
  useUnifiedTopology: true,
  autoIndex: false
});

// Check connection
const db = mongoose.connection;

module.exports = db;