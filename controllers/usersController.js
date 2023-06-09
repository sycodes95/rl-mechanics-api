const pool = require('../db')

const passport = require("passport");

const bcrypt = require("bcryptjs")

const jwt = require('jsonwebtoken')

const { check, body, validationResult } = require("express-validator");
const { cookieExpiration } = require('../cookie');

require('dotenv').config()

// exports.verify_token_get = (req,res,next) => {
  
//   const bearerHeader = req.headers['authorization'];
  
//   if(typeof bearerHeader !== 'undefined'){
//     const bearer = bearerHeader.split(' ')
//     const bearerToken = bearer[1];
    
//     jwt.verify(bearerToken, process.env.JWT_SECRETKEY, (err, user)=>{
      
//       if(err) { 
//         return res.status(401).json({error: "Invalid token"});
//       } else {
        
//         res.json({
//           message: 'User authorized',
//           user
//         })
//       }
//     })
//   } else {
//     return res.status(401).json({error: "Invalid token"}); 
//   }
// }

exports.verify_token_get = (req,res,next) => {
  
  const token = req.cookies['token'];
  
  if(token){
    console.log('verify', token);
    jwt.verify(token, process.env.JWT_SECRETKEY, (err, user)=>{
      user = user.user.rows[0]
      delete user.user_password
      if(err) { 
        return res.json({error: "Invalid token"});
      } else {
        
        res.json({
          message: 'User authorized',
          user
        })
      }
    })
  } else {
    return res.json({error: "No Token"}); 
  }
}

exports.register_post = [
  body('user_email').isEmail(),
  check('user_password').exists(),
  check('user_confirm_password')
    .exists()
    .custom((value, { req }) => {
      if(value !== req.body.user_password){
        throw new Error('Passwords don\'t match')
      }
      return true
    }),
    
  (req, res, next) =>{
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json(errors);
    }
    const plainPassword = req.body.user_password
    
    bcrypt.hash(plainPassword, 10, (err, hashedPassword) =>{
      if(err){
        return next(err)
      }
      const queryText = `
        INSERT INTO users
        ( 
          user_password,
          user_email, 
          user_first_name, 
          user_last_name, 
          user_rank,
          user_is_verified, 
          user_is_admin
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7) 
        RETURNING *`;

      const body = req.body;
      const values = [
        hashedPassword, 
        body.user_email, 
        body.user_first_name, 
        body.user_last_name,
        body.user_rank, 
        body.user_is_verified, 
        body.user_is_admin
      ];
      pool.query(queryText, values, (errors, result) => {
        
        if (errors) { 
          return res.json({errors});
        }
        res.json({user: result.rows[0]});
      });
    })
  }
];


exports.log_in_post = (req, res, next) =>{
  console.log(req.body);
  passport.authenticate("local", (errors, user) =>{
    console.log(user);
    if(errors) {
      
      return next(errors)
    }
    if(user.length === 0 || !user){
      return res.json('no user')
    }
    req.logIn(user, (errors) =>{
      if(errors) {
        
        return next(errors)
      }
      
      const token = jwt.sign( {user}, process.env.JWT_SECRETKEY, {expiresIn: '1D'} );

      res.cookie('token', token, { httpOnly: true, maxAge: cookieExpiration });

      //prod : res.cookie('token', token, { httpOnly: true , secure: true, sameSite: 'none'});
      //local : res.cookie('token', token, { httpOnly: true });

      return res.json({ status: 'Logged in' });
    })
  })(req,res,next)
}

exports.log_out_get = (req,res,next) =>{
  req.logout(function (err){
    if(err) {
      return res.json({error: err})
    }

    //prod : res.clearCookie('token', {httpOnly: true, secure: true, sameSite: 'none', path: '/'})
    //local : res.clearCookie('token');

    res.clearCookie('token');
    res.json({logout: 'Log out successful'})
  })
}