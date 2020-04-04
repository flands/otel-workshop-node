'use strict';

const tracer = require('./tracer')('node-service');

const express = require('express');
const axios = require('axios').default;

const app = express();
const PORT = 3000;


app.use(express.json());

app.get('/', async (req, res) => {
  const span = tracer.startSpan('fetch-from-java')
  tracer.withSpan(span, () => {
    axios.get('http://localhost:8083')
    .then(response => {
      res.status(201).send("hello from node\n" + response)
      span.end()
    })
    .catch(err => {
      res.status(201).send("hello from node\n" + "error fetching from java")
      span.end()
    }) 
  })
});

app.listen(PORT);
