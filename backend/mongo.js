import mongoose from 'mongoose'

const BookSchema = mongoose.Schema({
  title: String,
  author: String,
  description: String,
}, {
  timestamps: true
})
const Book = mongoose.model('Book', BookSchema)

const connectWithRetry = async () => {
  try {
    mongoose.connect('mongodb://mongo/simple-crud')
  } catch(error) {
    console.error('Failed to connect to mongo on startup - retrying in 5 sec', error)
    setTimeout(connectWithRetry, 5000)
  }
}

export const mongoMigration = function() {
  connectWithRetry()
  console.log('Mongo connection succesful')
  mongoose.connection.on('open', function() {
    mongoose.connection.db.dropDatabase()
    try {
      Book.create({
        "title": "MongoDB Recipes",
        "author": "Subhashini Chellappan",
        "description": "With Data Modeling and Query Building Strategies"
      })
    } catch (error) {
      if (error) console.error('Failed to create start book', erro)
    }
  })
}

export const getBooks = async (req, res, next) => {
  try {
    const products = await Book.find()
    res.json(products)
  } catch (error) {
    return next(error)
  }
}

export const getBookById = async (req, res, next) => {
  try {
    const post = await Book.findById(req.params.id)
    res.json(post)
  } catch (error) {
    return next(error)
  }
}

export const postBook = async (req, res, next) => {
  try {
    const post = await Book.create(req.body)
    res.json(post)
  } catch (error) {
    return next(error)
  }
}

export const updateBook = async (req, res, next) => {
  try {
    const post = await Book.findByIdAndUpdate(req.params.id, req.body)
    res.json(post)
  } catch (error) {
    return next(error)
  }
}

export const deleteBook = async (req, res, next) => {
  try {
    const post = await Book.findByIdAndRemove(req.params.id, req.body)
    res.json(post)
  } catch (error) {
    return next(error)
  }
}
