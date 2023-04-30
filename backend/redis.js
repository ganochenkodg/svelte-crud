import { createClient } from 'redis'
const client = createClient({
  socket: {
      host: 'redis',
      port: 6379
  }
})
await client.connect()

export const redisMigration = async function redisMigration() {
  client.on('connect', () => {
    console.log('Connected to Redis')
  })
  
  await client.hSet('1', {
    title: 'The Little Redis Book',
    author: 'Karl Seguin',
    description: 'The Little Redis Book is a free book introducing Redis.',
  })
}

export const getBooks = async (req, res) => {
  const keys = await client.keys('*')

  if (!keys.length) return res.send([])

  const books = await Promise.all(keys.map(async _id => {
    const obj = await client.hGetAll(_id)
    return { _id, ...obj }
  }))

  res.send(books)
}

export const getBookById = async (req, res) => {
  const book = await client.hGetAll(req.params.id)

  res.send(book)
}

export const postBook = async (req, res, next) => {
  const {
    title,
    author,
    description,
  } = req.body
  const id = new Date().getTime()
  
  await client.hSet(`${id}`, {
    title,
    author,
    description,
  })

  res.send('Book added succesfully.')
}

export const updateBook = async (req, res, next) => {
  const {
    title,
    author,
    description,
  } = req.body
  await client.hSet(`${req.params.id}`, {
    title,
    author,
    description
  })

  res.send('Updated succesfully')
}

export const deleteBook = async (req, res) => {
  await client.del(req.params.id)
  
  res.send('Book deleted successfully.')
}
