/* eslint-disable prettier/prettier */
const mongoose = require('mongoose');
const dotenv = require('dotenv');

process.on('uncaughtException', (err) => {
  console.log('++UNCAUGHT EXCEPTION++..SHUTTING DOWN...');
  console.log(err.name, err.message);
  process.exit(1);
});
dotenv.config({ path: './config.env' });
const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then(() => console.log('DB connection successful'));
// .catch((err) => console.log('database connection failed'));

const port = process.env.PORT || 3000;
//console.log(process.env);
const server = app.listen(port, () => {
  console.log('listening to the server...');
});
process.on('unhandledRejection', (err) => {
  console.log('++UNHANDLED REJECTION++..SHUTTING DOWN...');
  console.log(err.name, err.message);

  server.close(() => {
    process.exit(1);
  }); //1 for uncaught exception
});
