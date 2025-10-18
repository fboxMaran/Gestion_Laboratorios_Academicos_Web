// apps/api/src/routes/inventory.routes.js
const express = require('express');
const InventoryController = require('../controllers/inventory.controller');

const router = express.Router();
const w = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Consumibles
router.get('/consumables',     w((req,res,next) => InventoryController.listConsumables(req,res,next)));
router.post('/consumables/:id/movements', w((req,res,next) => InventoryController.moveConsumable(req,res,next)));

// Equipos fijos: cambio de estado (INFO movement)
router.put('/resources-fixed/:id/status', w((req,res,next) => InventoryController.updateFixedStatus(req,res,next)));

// Listado de movimientos (filtros opcionales)
router.get('/movements', w((req,res,next) => InventoryController.listMovements(req,res,next)));

module.exports = router;
