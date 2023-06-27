const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs")
const jwt = require('jsonwebtoken')
const cors = require('cors')
const pool = require('./db')
const https = require('https')
const fs = require('fs')
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config()

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const { google_log_in_post } = require('./controllers/usersController');


const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({ secret: "dogs", resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.urlencoded({ extended: false }));
app.use(cors({
  credentials: true,
  origin: [
  'http://localhost:5173',
  'https://rl-mechanics-production.up.railway.app',
  'https://rlmechanics.com'
  ]
}));




app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

//cert file locations on EC2 instance
const key = fs.readFileSync(`${process.env.PRIVATE_KEY_PATH}`)
const cert = fs.readFileSync(`${process.env.CERTIFICATE_CRT_PATH}`)

const cred = {
  key,
  cert
}

const localStrategy = new LocalStrategy({ usernameField: 'user_email', passwordField: 'user_password'}, (user_email, user_password,  done) => {
  pool.query('SELECT * FROM users WHERE user_email = $1', [user_email], (err, user) => {
    if (err) {
      return done(err);
    }
    if (user.rows.length === 0) {
      return done(null, false, { message: "Incorrect username" });
    }
    bcrypt.compare(user_password, user.rows[0].user_password, (err, res) => {
      if (res) {
        return done(null, user);
      } else {
        return done(null, false, { message: "Incorrect password" });
      }
    });
  });
});

// const googleStrategy = new LocalStrategy({usernameField: 'user_email', passwordField: 'user_first_name'}, (user_email, user_first_name,  done) => {
  
//   pool.query('SELECT * FROM users WHERE user_email = $1', [user_email], (err, user) => {
//     if (err) {
//       return done(err);
//     }
//     return done(null, user);
    
//   });
// });

const googleStrategy = new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'http://localhost:5000/auth/google/callback',
    passReqToCallback : true,
    scope: ['email', 'profile']
  },
  (request, accessToken, refreshToken, profile, done) => {
    pool.query('SELECT * FROM users WHERE user_email = $1', [profile._json.email], (err, user) => {
      if (err) {
        return done(err);
      }
      if (user.rows.length === 0) {
        // User doesn't exist in the database, create a new user
        
        const queryText = `
          INSERT INTO users
          ( 
            user_email, 
            user_first_name, 
            user_last_name, 
            user_is_verified
          ) 
          VALUES ($1, $2, $3, $4) 
          RETURNING *`;

        const values = [
          profile._json.email,
          profile._json.given_name,
          profile._json.family_name,
          true
        ];

        pool.query(queryText, values, (error, result) => {
          if (error) {
            return done(error);
          }
          const token = jwt.sign({ user: result }, process.env.JWT_SECRETKEY);
          request.token = token
          return done(null, result);
        });
      } else {
        const token = jwt.sign({ user: user }, process.env.JWT_SECRETKEY);
        request.token = token
        console.log('user', user);
        return done(null, user);
      }
    });
  }
);

passport.use("local", localStrategy);
passport.use("google", googleStrategy);

app.get('/auth/google', passport.authenticate('google', ['email', 'profile']))
app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: `${process.env.CLIENT_DOMAIN}/log-in` }),
  function(req, res) {
    res.cookie('token', req.token, { httpOnly: true });
    res.redirect(`${process.env.CLIENT_DOMAIN}`);
  });


passport.serializeUser(function(user, done) {
  console.log('ser');
  const user_id = user.rows[0].user_id
  done(null, user_id);
});

passport.deserializeUser(function(id, done) {
  console.log('deser');
  pool.query('SELECT * FROM users WHERE user_id = $1', [id], (error, user) => {
    if (error) {
      throw error;
    }
    done(null, user.rows[0]);
  });
});



app.use(function(req, res, next) {
  next(createError(404));
});

app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.json('error');
});


const port = 5000;

app.listen(process.env.PORT || port, () => {
  console.log(`Server is listening on port ${port}`);
});

const httpsServer = https.createServer(cred, app)
httpsServer.listen(8443)

module.exports = app;
