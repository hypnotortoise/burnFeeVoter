var express = require('express');
var cors = require('cors');
var axios = require('axios');

axios.defaults.baseURL = "https://api.cryptowat.ch";

var app = express();
app.use(cors());

app.get("/*", (req, res) => {
  axios.get(req.url)
  .then(
    (resp) => { res.json(resp.data); },
    (err) => { if (err.response) { res.json(err.response) } }
  )
  .catch(function (error) {
    res.json(error);
  });
});

var server = app.listen(process.env.PORT || 9000, function() {
    console.log('Listening on port %d', server.address().port)
});
