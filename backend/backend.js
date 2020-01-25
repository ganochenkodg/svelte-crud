var express = require('express');
var router = express.Router();
var app = express();
var cors = require('cors');
var bodyParser = require('body-parser');

const postgres = require('./postgres.js')

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
}

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
}
mongoose.connection.on('open', function() {
  mongoMigration();
})


app.use(cors());
app.use(bodyParser.json());
app.use('/books/', router);

router.get('/mongo/', function(req, res, next) {
  Book.find(function(err, products) {
    if (err) return next(err);
    res.json(products);
  });
});

router.get('/postgres/', async (req, res) => {
  const { rows } = await postgres.query('SELECT * FROM books;');
  res.send(rows);
})

router.get('/mongo/:id', function(req, res, next) {
  Book.findById(req.params.id, function(err, post) {
    if (err) return next(err);
    res.json(post);
  });
});

router.get('/postgres/:id', async (req, res) => {
  const { rows } = await postgres.query('SELECT * FROM books WHERE _id = $1;', [req.params.id]);
  res.send(rows[0]);
})

router.post('/mongo/', function(req, res, next) {
  Book.create(req.body, function(err, post) {
    if (err) return next(err);
    res.json(post);
  });
});

router.post('/postgres/', async (req, res) => {
  const { title, author, description } = req.body;
  const { rows } = await postgres.query('INSERT INTO books(title, author, description) VALUES($1, $2, $3);', [title, author, description]);
  res.json(rows);
});

router.put('/mongo/:id', function(req, res, next) {
  Book.findByIdAndUpdate(req.params.id, req.body, function(err, post) {
    if (err) return next(err);
    res.json(post);
  });
});

router.put('/postgres/:id', async (req, res) => {
  const { title, author, description } = req.body;
  const { rows } = await postgres.query('UPDATE books SET title = $1, author = $2, description = $3 WHERE _id = $4;', [title, author, description, req.params.id]);
  res.json(rows);
});

router.delete('/mongo/:id', function(req, res, next) {
  Book.findByIdAndRemove(req.params.id, req.body, function(err, post) {
    if (err) return next(err);
    res.json(post);
  });
});

router.delete('/postgres/:id', async (req, res) => {
  const { rows } = await postgres.query('DELETE FROM books WHERE _id = $1;', [req.params.id]);
  res.json(rows);
});

app.listen(3000, function() {
  console.log('Books backend running!');
});
