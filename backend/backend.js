var express = require('express');
var router = express.Router();
var app = express();
var bodyParser = require('body-parser');
const cors = require('permissive-cors');
const process = require('process');
const GracefulShutdownManager = require('@moebius/http-graceful-shutdown').GracefulShutdownManager;

const postgres = require('./postgres.js');
const redis = require('redis');
const client = redis.createClient(6379, 'redis');
const elasticsearch = require('elasticsearch');
const esclient = new elasticsearch.Client({
  host: 'elasticsearch:9200',
  log: 'trace',
});

esclient.ping({
  requestTimeout: 30000,
}, function(error) {
  if (error) {
    console.error('es cluster is down!');
  } else {
    console.log('Connected to ElasticSearch');
  }
});

async function esMigration() {
  await esclient.index({
    index: 'books',
    type: 'book',
    id: '1',
    body: {
      title: 'Elasticsearch: The Definitive Guide',
      author: 'Clinton Gormley',
      description: 'A Distributed Real-Time Search and Analytics Engine'
    },
    refresh: true
  });
}

esMigration();

client.on('connect', () => {
  console.log('Connected to Redis')
})

async function redisMigration() {
  client.hmset(1, [
    'title', 'The Little Redis Book',
    'author', 'Karl Seguin',
    'description', 'The Little Redis Book is a free book introducing Redis.'
  ], (err, reply) => {
    if (err) {
      console.log(err);
    }
    console.log(reply);
  });
};

redisMigration();

async function createTable() {
  let newTableSql = `CREATE TABLE IF NOT EXISTS books (
  _id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255) NOT NULL,
  description VARCHAR(255) NOT NULL);
  TRUNCATE TABLE books;
  INSERT INTO books(title, author, description) VALUES
  ('PostgreSQL 11', 'Simon Riggs', 'Administration cookbook')`;
  await postgres.query(newTableSql, (err, res) => {
    if (err) console.log("CREATE TABLE ->", err);
    if (res) console.log("Postgres succesfully migrated");
  });
};

createTable();

var mongoose = require('mongoose');
var BookSchema = mongoose.Schema({
  title: String,
  author: String,
  description: String,
}, {
  timestamps: true
});
var Book = mongoose.model('Book', BookSchema);

var connectWithRetry = function() {
  return mongoose.connect('mongodb://mongo/simple-crud', function(err) {
    if (err) {
      console.error('Failed to connect to mongo on startup - retrying in 5 sec', err);
      setTimeout(connectWithRetry, 5000);
    }
  });
};
connectWithRetry();
console.log('Mongo connection succesful');

var mongoMigration = function() {
  mongoose.connection.db.dropDatabase();
  Book.create({
    "title": "MongoDB Recipes",
    "author": "Subhashini Chellappan",
    "description": "With Data Modeling and Query Building Strategies"
  }, function(err) {
    if (err) console.error('Failed to create start book', err);
  });
};

mongoose.connection.on('open', function() {
  mongoMigration();
});

app.use(cors());
app.use(bodyParser.json());
app.use('/books/', router);

router.get('/mongo/', async (req, res, next) => {
  await Book.find(function(err, products) {
    if (err) return next(err);
    res.json(products);
  });
});

router.get('/es/', async (req, res, next) => {
  let return_dataset = [];
  await esclient.search({
    q: '*'
  }).then(function(body) {
    var hits = body.hits.hits;
    hits.forEach((l) => {
      temp_data = {
        '_id': l._id,
        'title': l._source.title,
        'author': l._source.author,
        'description': l._source.description
      }
      return_dataset.push(temp_data)
    });
    res.json(return_dataset);
  }, function(error) {
    console.trace(error.message);
  });
});

router.get('/postgres/', async (req, res) => {
  const {
    rows
  } = await postgres.query('SELECT * FROM books;');
  res.send(rows);
});

router.get('/redis/', async (req, res) => {
  let return_dataset = [];
  await client.keys('*', (err, id) => {
    let multi = client.multi();
    let keys = Object.keys(id);
    let i = 0;
    if (keys.length == 0) {
      res.send(return_dataset);
    }
    keys.forEach((l) => {
      client.hgetall(id[l], (e, o) => {
        i++;
        if (e) {
          console.log(e)
        } else {
          var temp_data = {
            '_id': id[l],
            'title': o.title,
            'author': o.author,
            'description': o.description
          }
          return_dataset.push(temp_data)
        }
        if (i == keys.length) {
          res.send(return_dataset);
        };
      });
    });
  });
});

router.get('/mongo/:id', async (req, res, next) => {
  await Book.findById(req.params.id, function(err, post) {
    if (err) return next(err);
    res.json(post);
  });
});

router.get('/es/:id', async (req, res, next) => {
  await esclient.get({
    index: 'books',
    type: 'book',
    id: req.params.id
  }).then(function(body) {
    var temp_data = {
      '_id': body._id,
      'title': body._source.title,
      'author': body._source.author,
      'description': body._source.description
    };
    res.json(temp_data);
  }, function(error) {
    console.trace(error.message);
  });
});

router.get('/postgres/:id', async (req, res) => {
  const {
    rows
  } = await postgres.query('SELECT * FROM books WHERE _id = $1;', [req.params.id]);
  res.send(rows[0]);
});

router.get('/redis/:id', async (req, res) => {
  await client.hgetall(req.params.id, (err, obj) => {
    obj._id = req.params.id;
    res.send(obj);
  });
});

router.post('/mongo/', async (req, res, next) => {
  await Book.create(req.body, function(err, post) {
    if (err) return next(err);
    res.json(post);
  });
});

router.post('/es/', async (req, res, next) => {
  const {
    title,
    author,
    description
  } = req.body;
  let id = new Date().getTime();
  await esclient.index({
    index: 'books',
    type: 'book',
    id: id,
    body: {
      title: title,
      author: author,
      description: description
    },
    refresh: true
  }, function(err, resp, status) {
    console.log(resp);
    res.send('Success');
  });
});

router.post('/postgres/', async (req, res) => {
  const {
    title,
    author,
    description
  } = req.body;
  const {
    rows
  } = await postgres.query('INSERT INTO books(title, author, description) VALUES($1, $2, $3);', [title, author, description]);
  res.json(rows);
});

router.post('/redis/', async (req, res, next) => {
  const {
    title,
    author,
    description
  } = req.body;
  let id = new Date().getTime();
  await client.hmset(id, [
    'title', title,
    'author', author,
    'description', description
  ], (err, reply) => {
    res.send('Add succesfully');
  });
});

router.put('/mongo/:id', async (req, res, next) => {
  Book.findByIdAndUpdate(req.params.id, req.body, function(err, post) {
    if (err) return next(err);
    res.json(post);
  });
});

router.put('/es/:id', async (req, res, next) => {
  const {
    title,
    author,
    description
  } = req.body;
  await esclient.update({
    index: 'books',
    type: 'book',
    id: req.params.id,
    body: {
      doc: {
        title: title,
        author: author,
        description: description
      }
    },
    refresh: true
  }, function(err, resp, status) {
    res.send('Success');
  });
});

router.put('/postgres/:id', async (req, res) => {
  const {
    title,
    author,
    description
  } = req.body;
  const {
    rows
  } = await postgres.query('UPDATE books SET title = $1, author = $2, description = $3 WHERE _id = $4;', [title, author, description, req.params.id]);
  res.json(rows);
});

router.put('/redis/:id', async (req, res, next) => {
  const {
    title,
    author,
    description
  } = req.body;
  await client.hmset(req.params.id, [
    'title', title,
    'author', author,
    'description', description
  ], (err, reply) => {
    res.send('Updated succesfully');
  });
});

router.delete('/mongo/:id', async (req, res, next) => {
  Book.findByIdAndRemove(req.params.id, req.body, function(err, post) {
    if (err) return next(err);
    res.json(post);
  });
});

router.delete('/es/:id', async (req, res, next) => {
  await esclient.delete({
    index: 'books',
    type: 'book',
    id: req.params.id,
    refresh: true
  }, function(err, resp, status) {
    console.log(resp);
    res.send('Success');
  });
});

router.delete('/postgres/:id', async (req, res) => {
  const {
    rows
  } = await postgres.query('DELETE FROM books WHERE _id = $1;', [req.params.id]);
  res.json(rows);
});

router.delete('/redis/:id', async (req, res) => {
  await client.del(req.params.id, (err, reply) => {
    console.log(reply);
    res.send('User deleted successfully');
  })
});

const server = app.listen(3000, function() {
  console.log('Books backend running!');
});

const shutdownManager = new GracefulShutdownManager(server);
process.on('SIGINT', function onSigint() {
  app.shutdown();
});

process.on('SIGTERM', function onSigterm() {
  app.shutdown();
});

app.shutdown = function() {
  shutdownManager.terminate(() => {
    console.log('Server is gracefully terminated.');
  });
};
