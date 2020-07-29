const redis = require('redis');
const client = redis.createClient(6379, 'redis');

exports.redisMigration = async function redisMigration() {
  client.on('connect', () => {
    console.log('Connected to Redis')
  })
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

exports.getBooks = async (req, res) => {
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
};

exports.getBookById = async (req, res) => {
  await client.hgetall(req.params.id, (err, obj) => {
    obj._id = req.params.id;
    res.send(obj);
  });
};

exports.postBook = async (req, res, next) => {
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
};

exports.updateBook = async (req, res, next) => {
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
};

exports.deleteBook = async (req, res) => {
  await client.del(req.params.id, (err, reply) => {
    console.log(reply);
    res.send('User deleted successfully');
  })
};
