const express = require('express');
const db = require('./database')
const app = express();
const mongoSanitize = require('express-mongo-sanitize');

// Databes
db.on('error', function() { 
  console.error.bind(console, 'e [Mongoose] Connection error:')
});
db.once('open', function() {
  console.log('i [Mongoose] Connection has been established successfully');
});


// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize());

// API Index
app.get('/', (req, res) => { res.send('Eureka!'); });

// Routes
const apiRouter = require('./routes');
app.use('/', apiRouter);

// Done
module.exports = app;