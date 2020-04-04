const express = require('express');
const axios = require('axios').default;

const app = express();
const PORT = 3000;


app.use(express.json());

app.get('/', async (req, res) => {
  axios.get('http://localhost:8083')
  .then(response => {
    res.status(201).send("hello from node\n" + response)
  })
  .catch(err => {
    res.status(201).send("hello from node\n" + "error fetching from java")
  }) 
});

app.listen(PORT);
