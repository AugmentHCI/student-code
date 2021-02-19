const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const PORT = process.env.port || 8080;
const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, '/views'))

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '/public')));

app.get('*', async (_, res) => {
  res.render('./index');
});

app.listen(PORT, async () => {
  console.log(`Express running on port ${PORT}`);
});