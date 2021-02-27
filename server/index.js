const express = require('express');
const mongoose = require('mongoose');
const app = express();

// Connection
mongoose.connect('mongodb://localhost/equreka', {useNewUrlParser: true, useUnifiedTopology: true});
const db = mongoose.connection;
db.on('error', console.error.bind(console, '[Mongoose] Connection error:'));
db.once('open', function() {
  console.log('[Mongoose] Connection has been established successfully');
});


// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Index
app.get('/', (req, res) => { res.send('Eureka!'); });

// Routes
const apiRouter = require('./routes');
app.use('/', apiRouter);

// Done
module.exports = app;