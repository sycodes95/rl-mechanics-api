const express = require('express');
const router = express.Router();
const users_controller = require('../controllers/usersController')

router.post('/sign-up-post', users_controller.sign_up_post)

router.post('/log-in-post', users_controller.log_in_post)

router.get('/log_out_get', users_controller.log_out_get)

module.exports = router;
