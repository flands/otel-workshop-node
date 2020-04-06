require('dotenv').config()

const express = require('express');
const axios = require('axios').default;

const app = express();


app.use(express.json());

app.get('/', async (req, res) => {
  axios.get(process.env.JAVA_ENDPOINT)
  .then(response => {
    res.status(201).send("hello from node<br>" + response)
  })
  .catch(err => {
    res.status(201).send("hello from node<br>" + "error fetching from java")
  })
});

app.listen(process.env.SERVER_PORT);
