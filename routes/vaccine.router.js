const express = require('express');
const router = express.Router();
const { getAllVaccine } = require('../controllers/vaccine.controller');

router.get('/', getAllVaccine);

module.exports = router;