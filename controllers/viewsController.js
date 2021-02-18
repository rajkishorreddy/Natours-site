const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const User = require('../models/usermodel');
const Booking = require('../models/bookingModel');

exports.getOverview = catchAsync(async (req, res, next) => {
  //1 get all the tour data from the collection
  const tours = await Tour.find();
  //2 we build template
  //3 render that template using tour data from step 1
  res.status(200).render('overview', {
    title: 'All Tours',
    tours,
  });
});
const csp =
  "default-src 'self' https://js.stripe.com/v3/ https://cdnjs.cloudflare.com https://api.mapbox.com; base-uri 'self'; block-all-mixed-content; connect-src 'self' https://js.stripe.com/v3/ https://cdnjs.cloudflare.com/ https://*.mapbox.com/; font-src 'self' https://fonts.google.com/ https: data:;frame-ancestors 'self'; img-src 'self' data:; object-src 'none'; script-src 'self' https://js.stripe.com/v3/ https://cdnjs.cloudflare.com/ https://api.mapbox.com/ blob:; script-src-attr 'none'; style-src 'self' https: 'unsafe-inline'; upgrade-insecure-requests;";

exports.getTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    fields: 'review rating user',
  });
  if (!tour) {
    return next(new AppError(`there is no tour with that name`, 404));
  }
  res
    .status(200) //done this using stackover flow to make it work
    .set('Content-Security-Policy', csp)
    .render('tour', {
      title: `${tour.name} Tour`,
      tour,
    });
});
exports.login = (req, res) => {
  res.status(200).set('Content-Security-Policy', csp).render('login', {
    title: 'Log into your account',
  });
};
exports.getAccount = (req, res) => {
  res.status(200).set('Content-Security-Policy', csp).render('account', {
    title: 'yout account',
  });
};
exports.updateUserData = catchAsync(async (req, res, next) => {
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      name: req.body.name,
      email: req.body.email,
    },
    {
      new: true,
      runValidators: true,
    }
  );
  res.status(200).set('Content-Security-Policy', csp).render('account', {
    title: 'your account',
    user: updatedUser,
  });
});
exports.getMyTours = catchAsync(async (req, res, next) => {
  //find all bookings
  const bookings = await Booking.find({ user: req.user.id });
  //find tours with the retured IDs
  const tourIds = bookings.map((el) => el.tour);
  const tours = await Tour.find({ _id: { $in: tourIds } });
  res.status(200).set('Content-Security-Policy', csp).render('overview', {
    title: 'My Tours',
    tours,
  });
});
