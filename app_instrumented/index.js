require('dotenv').config()

'use strict';

const tracer = require('./tracer')('node-service');

const express = require('express');
const axios = require('axios').default;

const app = express();


app.use(express.json());

app.get('/', async (req, res) => {
  const span = tracer.startSpan('fetch-from-java')
  tracer.withSpan(span, () => {
    axios.get('http://' + process.env.REQUEST_HOST + ':' + process.env.REQUEST_PORT)
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

app.listen(process.env.SERVER_PORT);
