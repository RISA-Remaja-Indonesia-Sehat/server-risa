const express = require('express');
const router = express.Router();
const { getAllLabs } = require('../controllers/labs.controller');

router.get('/', getAllLabs);

module.exports = router;