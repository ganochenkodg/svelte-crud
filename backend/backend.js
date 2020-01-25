var express = require('express');
var router = express.Router();
var app = express();
var cors = require('cors');
var bodyParser = require('body-parser');
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
    }, function (err) {
    if (err) console.error('Failed to create start book', err);
  });
}
mongoose.connection.on('open', function(){
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

router.get('/mongo/:id', function(req, res, next) {
  Book.findById(req.params.id, function(err, post) {
    if (err) return next(err);
    res.json(post);
  });
});

router.post('/mongo/', function(req, res, next) {
  Book.create(req.body, function(err, post) {
    if (err) return next(err);
    res.json(post);
  });
});

router.put('/mongo/:id', function(req, res, next) {
  Book.findByIdAndUpdate(req.params.id, req.body, function(err, post) {
    if (err) return next(err);
    res.json(post);
  });
});

router.delete('/mongo/:id', function(req, res, next) {
  Book.findByIdAndRemove(req.params.id, req.body, function(err, post) {
    if (err) return next(err);
    res.json(post);
  });
});

app.listen(3000, function() {
  console.log('Books backend running!');
});
