const express = require('express');
const router = express.Router();
const app = express();
const bodyParser = require('body-parser');
const cors = require('permissive-cors');
const process = require('process');
const GracefulShutdownManager = require('@moebius/http-graceful-shutdown').GracefulShutdownManager;

const postgres = require('./postgres.js');
const redis = require('./redis.js');
const mongo = require('./mongo.js');
const es = require('./es.js');

console.log('Start migrations');
mongo.mongoMigration();
redis.redisMigration();
setTimeout(function() {
  postgres.postgresMigration();
}, 3000);
setTimeout(function() {
  es.esMigration();
}, 30000);

app.use(cors());
app.use(bodyParser.json());

app.use('/books/', router);
router.get('/mongo/', mongo.getBooks);
router.get('/es/', es.getBooks);
router.get('/postgres/', postgres.getBooks);
router.get('/redis/', redis.getBooks);

router.get('/mongo/:id', mongo.getBookById);
router.get('/es/:id', es.getBookById);
router.get('/postgres/:id', postgres.getBookById);
router.get('/redis/:id', redis.getBookById);

router.post('/mongo/', mongo.postBook);
router.post('/es/', es.postBook);
router.post('/postgres/', postgres.postBook);
router.post('/redis/', redis.postBook);

router.put('/mongo/:id', mongo.updateBook);
router.put('/es/:id', es.updateBook);
router.put('/postgres/:id', postgres.updateBook);
router.put('/redis/:id', redis.updateBook);

router.delete('/mongo/:id', mongo.deleteBook);
router.delete('/es/:id', es.deleteBook);
router.delete('/postgres/:id', postgres.deleteBook);
router.delete('/redis/:id', redis.deleteBook);

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
