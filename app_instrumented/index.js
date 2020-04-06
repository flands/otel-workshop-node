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
    axios.get(process.env.JAVA_ENDPOINT)
    .then(response => {
      res.status(201).send("hello from node<br>" + response)
      span.end()
    })
    .catch(err => {
      res.status(201).send("hello from node<br>" + "error fetching from java")
      span.end()
    })
  })
});

app.listen(process.env.SERVER_PORT);
