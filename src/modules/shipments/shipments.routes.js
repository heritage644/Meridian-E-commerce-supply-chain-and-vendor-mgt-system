const { Router } = require("express");
const controller = require("./shipments.controller");
const { authenticate, authorize } = require("../../middleware/auth");

const router = Router();
router.get("/track/:tracking", controller.track);
router.get("/", authenticate, controller.list);
router.patch("/:id/status", authenticate, authorize("ADMIN", "WAREHOUSE"), controller.updateStatus);

module.exports = router;
