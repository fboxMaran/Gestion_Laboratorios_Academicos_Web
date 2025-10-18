const express = require('express');
const DepartmentsController = require('../controllers/departments.controller');

const router = express.Router();
const w = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.post('/', w((req,res,next) => DepartmentsController.create(req,res,next)));
router.get('/',  w((req,res,next) => DepartmentsController.list(req,res,next)));

module.exports = router;
