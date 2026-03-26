const express = require('express');
const router = express.Router();
const { register, commonStudents, suspend, retrieveForNotifications } = require('../controllers/apiController');

router.post('/register', register);
router.get('/commonstudents', commonStudents);
router.post('/suspend', suspend);
router.post('/retrievefornotifications', retrieveForNotifications);

module.exports = router;