require('dotenv').config();

const Pool = require('pg').Pool;

const env = process.env

const pool = new Pool({
  user: env.PGUSER,
  password: env.PGPW,
  host: env.PGHOST,
  port: env.PGPORT,
  database: env.PGDATABASE
})

module.exports = pool;  