require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

const { MongoClient } = require('mongodb');
const dns = require('dns')
const urlparser = require('url')
const client = new MongoClient(process.env.MONGO_URI)
const db = client.db("urlshortner")
const urls = db.collection("urls")

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json())
app.use(express.urlencoded({extended: true}))

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.post('/api/shorturl', async (req, res) => {
  const inputUrl = req.body.url;

  // 1. Must be http or https
  if (!/^https?:\/\//i.test(inputUrl)) {
    return res.json({ error: 'invalid url' });
  }

  let hostname;
  try {
    hostname = new URL(inputUrl).hostname;
  } catch {
    return res.json({ error: 'invalid url' });
  }

  // 2. DNS check
  dns.lookup(hostname, async (err) => {
    if (err) {
      return res.json({ error: 'invalid url' });
    }

    const count = await urls.countDocuments({});
    const doc = {
      original_url: inputUrl,
      short_url: count + 1
    };

    await urls.insertOne(doc);

    res.json({
      original_url: inputUrl,
      short_url: doc.short_url
    });
  });
});


app.get('/api/shorturl/:short_url', async (req, res) => {
  const doc = await urls.findOne({ short_url: +req.params.short_url });

  if (!doc) {
    return res.json({ error: 'invalid url' });
  }

  res.redirect(doc.original_url);
});


app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
