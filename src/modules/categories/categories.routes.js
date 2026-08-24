const { Router } = require("express");
const controller = require("./categories.controller");
const { authenticate, authorize } = require("../../middleware/auth");

const router = Router();
router.get("/", controller.list);
router.post("/", authenticate, authorize("ADMIN"), controller.create);

module.exports = router;
