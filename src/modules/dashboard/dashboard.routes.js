const { Router } = require("express");
const controller = require("./dashboard.controller");
const { authenticate } = require("../../middleware/auth");

const router = Router();
router.get("/stats", authenticate, controller.stats);

module.exports = router;
