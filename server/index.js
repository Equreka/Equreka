const db = require('./database')
const cors = require('cors');
const express = require('express');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const app = express();
const apiRouter = require('./routes');
const args = process.argv;
const build = args[2] || 'development';

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

// Running server standalone
if(build == 'test') {
  app.get('/api/', (req, res) => { res.send('Eureka!'); });
  app.use('/api/', apiRouter);
  app.listen(3000, () => {
    console.log('i [Express] Running server standalone')
  });
}
// Running server with Nuxt
else {
  app.get('/', (req, res) => { res.send('Eureka!'); });
  app.use('/', apiRouter);
  console.log('i [Express] Running server with nuxt')
}

// Done
module.exports = app;