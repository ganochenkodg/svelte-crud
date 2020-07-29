const { Pool } = require('pg');
const pool = new Pool({
  user: "node",
  host: "postgres",
  database: "books",
  password: "password",
  port: "5432",
  connectionTimeoutMillis: 5000,
});

exports.postgresMigration = async function createTable() {
  let newTableSql = `CREATE TABLE IF NOT EXISTS books (
  _id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255) NOT NULL,
  description VARCHAR(255) NOT NULL);
  TRUNCATE TABLE books;
  INSERT INTO books(title, author, description) VALUES
  ('PostgreSQL 11', 'Simon Riggs', 'Administration cookbook')`;
  await pool.connect((err, client, release) => {
    client.query(newTableSql, (err, res) => {
      if (err) console.log("CREATE TABLE ->", err);
      if (res) console.log("Postgres succesfully migrated");
    });
  });
};

exports.getBooks = async (req, res) => {
  const {
    rows
  } = await pool.query('SELECT * FROM books;');
  res.send(rows);
};

exports.getBookById = async (req, res) => {
  const {
    rows
  } = await pool.query('SELECT * FROM books WHERE _id = $1;', [req.params.id]);
  res.send(rows[0]);
};

exports.postBook = async (req, res) => {
  const {
    title,
    author,
    description
  } = req.body;
  const {
    rows
  } = await pool.query('INSERT INTO books(title, author, description) VALUES($1, $2, $3);', [title, author, description]);
  res.json(rows);
};

exports.updateBook = async (req, res) => {
  const {
    title,
    author,
    description
  } = req.body;
  const {
    rows
  } = await pool.query('UPDATE books SET title = $1, author = $2, description = $3 WHERE _id = $4;', [title, author, description, req.params.id]);
  res.json(rows);
};

exports.deleteBook = async (req, res) => {
  const {
    rows
  } = await pool.query('DELETE FROM books WHERE _id = $1;', [req.params.id]);
  res.json(rows);
};
