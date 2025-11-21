import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool, types } = pkg;

types.setTypeParser(1700, (value) => {
  return value === null ? null : parseFloat(value);
});

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

export { pool };