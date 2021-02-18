const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const catchAsync = require('../utils/catchAsync');
const User = require('../models/usermodel');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  res.cookie('jwt', token, cookieOptions);
  user.password = undefined; //remove the password from the output
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};
exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role,
  });
  const url = `${req.protocol}://${req.get('host')}/me`;
  //console.log(url);
  await new Email(newUser, url).sendWelcome();
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  //check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please proveide email and password!', 400));
  }
  //check if user exists and password is correct
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect Email or Password', 401));
  }
  //if everything is ok ,send the jsonweb token to the client
  createSendToken(user, 200, res);
});
exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};
exports.protect = catchAsync(async (req, res, next) => {
  //1.Getting the token and check if it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  // console.log(token);
  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to ger access', 401)
    );
  }
  // 2.verifiction  token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  // console.log(decoded);
  // //3.Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser)
    return next(
      new AppError('The user belonging to the token does no longer exist', 401)
    );
  //4.Check if user change password afrer the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password ! Please log in again'),
      401
    );
  }
  //if it passes all the above stages then it is protected and we will allow it to protected route
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    //roles is an arr here ['admin','lead-guide']
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action '),
        403
      );
    }
    next();
  };
};

exports.forgotPassword = async (req, res, next) => {
  //1.Get user based on Posted email

  const user = await User.findOne({ email: req.body.email });
  // console.log(user);
  if (!user) {
    return next(new AppError('There is no user with that email address', 404));
  }

  //2.generate the random token
  const resetToken = user.createPasswordResetToken();

  await user.save({ validateBeforeSave: false }); //saving the document as we inserted new field that passwordResetExpires

  //3.send it back to users email

  // const message = `Forgot Your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didnt forget yout password ,please ignore this email`;
  try {
    // await sendEmail({
    //   email: user.email,
    //   subject: 'Your password reset token ,only valid for 10 min',
    //   message,
    // });
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;
    await new Email(user, resetURL).sendPasswordReset();
    res.status(200).json({
      status: 'success',
      message: 'Token sent to email',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    // console.log(err);
    return next(
      new AppError('there was an error sending the email .Try again later', 500)
    );
  }
};
exports.resetPassword = async (req, res, next) => {
  //1.get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  //2.if token has not expired ,and there is user ,set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  // console.log(req.body.password, req.body.passwordConfirm);
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetExpires = undefined;
  user.passwordResetToken = undefined;
  await user.save();
  //3.Update the changedpasswordat property for the user
  //4.log the user in send jwt
  createSendToken(user, 200, res);
};

exports.updatePassword = catchAsync(async (req, res, next) => {
  //1.Get the user from the collection
  const user = await User.findById(req.user.id).select('+password');
  //2.check if the Posted current password is currect
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong', 401));
  }
  //3.if so ,updatePassword
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  //4.log user in ,send JWT
  createSendToken(user, 201, res);
});
//only for renderd pages ,no errors
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    // console.log(token);
    // 2.verifiction  token
    try {
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );
      // //3.Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) return next();

      //4.Check if user change password afrer the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }
      //there is a logged in user if it reaches here
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};
