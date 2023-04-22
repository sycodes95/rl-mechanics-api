const express = require('express');
const router = express.Router();
const mechanics_controller = require('../controllers/mechanicsController')

router.post('/mechanics-post', mechanics_controller.mechanics_post)
router.get('/mechanics-get', mechanics_controller.mechanics_get)
router.delete('/mechanics-delete', mechanics_controller.mechanics_delete)

module.exports = router;
 