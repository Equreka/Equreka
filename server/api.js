const express = require('express');
const app = express();
const apiRouter = require('./routes');
const models = require('./database');

app.model = (model) => models[model];

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/', apiRouter);

app.all('/getJSON', (req, res) => {
  res.json({ data: 'data' })
})

app.get('/', (req, res) => {
  res.send('Eureka!');
})

module.exports = app;