const express = require('express');
const {check,body,query} = require('express-validator/check');
const validator = require('../util/validation');

const router = express.Router();
//importing controllers
const demoController = require('../controllers/demo');

router.get('/', demoController.examGet);
router.post('/', validator.examValidation, demoController.examPost);

module.exports = router;