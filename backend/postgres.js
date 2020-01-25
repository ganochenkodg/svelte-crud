const { Pool } = require('pg')
const pool = new Pool({
  user: "node",
  host: "postgres",
  database: "books",
  password: "password",
  port: "5432"
});

module.exports = {
  query: (text, params) => pool.query(text, params),
}
