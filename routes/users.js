const express = require('express');
const router = express.Router();
const users_controller = require('../controllers/usersController')

router.post('/register-post', users_controller.register_post)

router.post('/log-in-post', users_controller.log_in_post)

router.post('/google-log-in-post', users_controller.google_log_in_post)

router.get('/log-out-get', users_controller.log_out_get)

router.get('/verify-token-get', users_controller.verify_token_get)

module.exports = router;
