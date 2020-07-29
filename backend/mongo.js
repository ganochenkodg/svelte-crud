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

exports.mongoMigration = function() {
  connectWithRetry();
  console.log('Mongo connection succesful');
  mongoose.connection.on('open', function() {
    mongoose.connection.db.dropDatabase();
    Book.create({
      "title": "MongoDB Recipes",
      "author": "Subhashini Chellappan",
      "description": "With Data Modeling and Query Building Strategies"
    }, function(err) {
      if (err) console.error('Failed to create start book', err);
    });
  });
};

exports.getBooks = async (req, res, next) => {
  await Book.find(function(err, products) {
    if (err) return next(err);
    res.json(products);
  });
};

exports.getBookById = async (req, res, next) => {
  await Book.findById(req.params.id, function(err, post) {
    if (err) return next(err);
    res.json(post);
  });
};

exports.postBook = async (req, res, next) => {
  await Book.create(req.body, function(err, post) {
    if (err) return next(err);
    res.json(post);
  });
}

exports.updateBook = async (req, res, next) => {
  Book.findByIdAndUpdate(req.params.id, req.body, function(err, post) {
    if (err) return next(err);
    res.json(post);
  });
};

exports.deleteBook = async (req, res, next) => {
  Book.findByIdAndRemove(req.params.id, req.body, function(err, post) {
    if (err) return next(err);
    res.json(post);
  });
}
