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
require('dotenv').config()

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');

const app = express();

const key = fs.readFileSync('./CAF95086B332E21D93D4955E61C1091B.txt')
const cert = fs.readFileSync('')

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({ secret: "dogs", resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.urlencoded({ extended: false }));
app.use(cors({credentials: true, origin: 'http://localhost:5173'}));


app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

passport.use(
  new LocalStrategy({ usernameField: 'user_email', passwordField: 'user_password' },(user_email, user_password, done) => {
    
    pool.query('SELECT * FROM users WHERE user_email = $1', [user_email], (err, user) => {
      if (err) { 
        return done(err);
      }
      if (user.rows.length === 0) {
        return done(null, false, { message: "Incorrect username" });
      }
      bcrypt.compare(user_password, user.rows[0].user_password, (err, res) => {
        if (res) {
          
          return done(null, user)
        } else {
          
          return done(null, false, { message: "Incorrect password" })
        }
      })
      
    });
  })
);

passport.serializeUser(function(user, done) {
  
  const user_id = user.rows[0].user_id
  done(null, user_id);
});

passport.deserializeUser(function(id, done) {
  
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

app.get('/.well-known/pki-validation/CAF95086B332E21D93D4955E61C1091B.txt', (req,res) => {
  res.sendFile('CAF95086B332E21D93D4955E61C1091B.txt')
})

const port = 3000;

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

module.exports = app;
