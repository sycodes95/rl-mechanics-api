const express = require('express');
const router = express.Router();
// const multer = require('multer');
// const upload = multer({ dest: 'uploads/' });

const mechanics_controller = require('../controllers/mechanicsController')

router.post('/mechanics-post', mechanics_controller.mechanics_post)

router.get('/mechanics-get', mechanics_controller.mechanics_get)

router.get('/mechanics-count-get', mechanics_controller.mechanics_count_get)

router.get('/mechanic-details-get', mechanics_controller.mechanic_details_get)

router.delete('/mechanics-delete', mechanics_controller.mechanics_delete)

router.patch('/mechanics-patch', mechanics_controller.mechanics_patch)

router.get('/mechanics-urls-get', mechanics_controller.mechanics_urls_get)

module.exports = router;
 