const express = require('express');
const router = express.Router();
const mechanics_controller = require('../controllers/mechanicsController')

router.post('/mechanics-post', mechanics_controller.mechanics_post)

module.exports = router;
 