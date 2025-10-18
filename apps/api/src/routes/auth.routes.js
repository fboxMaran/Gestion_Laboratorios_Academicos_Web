const express = require('express');
const AuthController = require('../controllers/auth.controller');
const router = express.Router();
const w = (fn) => (req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);

router.post('/register', w((req,res,next)=>AuthController.register(req,res,next)));
router.post('/login',    w((req,res,next)=>AuthController.login(req,res,next)));

module.exports = router;