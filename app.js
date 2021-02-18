const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

const app = express();
//setting up template engine(PUG)
app.set('view engine', 'pug'); //pug templates are called views in express
app.set('views', path.join(__dirname, `views`));
//1.GLOBAL MIDDLEWARES
//serving static files
// app.use(express.static(`${__dirname}/public`));
app.use(express.static(path.join(__dirname, 'public')));
//SET SECURITY HTTP HEADERES
app.use(helmet());
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'", 'https:', 'http:', 'data:', 'ws:'],
      baseUri: ["'self'"],
      fontSrc: ["'self'", 'https:', 'http:', 'data:'],
      scriptSrc: ["'self'", 'https:', 'http:', 'blob:'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https:', 'http:'],
    },
  })
);
//DEVELOPMENT LOGGING
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
//LIMIT REQUESTS FROM SAME AIP
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000, //100 req from same ip per 1 hour limit
  message: 'Too many requests from this IP,please try again in an hour!',
});
app.use('/api', limiter);
//BODY PARSER,READING DATA FROM BODY INTO REQ.BODY
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser()); //cookie parser
app.use(express.urlencoded({ extended: true, limit: '10kb' })); //to parse the data from the html from
//DATA SANITIZATION AGAINST NOSQL QUERY INJECTION
app.use(mongoSanitize());
//DATA SANITIZATION AGAINEST XSS
app.use(xss());
//PREVENT PARAMETER POLLUTION
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price ',
    ],
  })
);
app.use(compression()); //compress all the text send to the client
//TEST MIDDLE WARE
// app.use((req, res, next) => {
//   console.log('hellow from the middleware');
//   next();
// });
app.use((req, res, next) => {
  req.currTime = new Date().toISOString();
  // console.log(req.headers);
  // console.log(req.cookies);
  next();
});
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);
app.all('*', (req, res, next) => {
  // res.status(404).json({
  //   status: 'fail',
  //   message: `cant find ${req.originalUrl} on this server`,
  // });
  //-----------------
  // const err = new Error(`cant find ${req.originalUrl} on this server`);
  // err.status = 'fail';
  // err.statusCode = 404;
  // next(err);
  //-----------------
  next(new AppError(`cant find ${req.originalUrl} on this server`, 404));
});
app.use(globalErrorHandler);
module.exports = app;
