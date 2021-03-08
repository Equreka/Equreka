const db = require('./database')
const cors = require('cors');
const express = require('express');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const app = express();

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
// Sanitize mongo
app.use(mongoSanitize());
// Enable CORS for all requests
app.use(cors());
// Log HTTP requests
app.use(morgan('combined'));

// API Index
app.get('/', (req, res) => { res.send('Eureka!'); });

// Routes
const apiRouter = require('./routes');
app.use('/', apiRouter);

// Done
module.exports = app;