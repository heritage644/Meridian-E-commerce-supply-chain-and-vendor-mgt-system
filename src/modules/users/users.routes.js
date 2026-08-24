const { Router } = require("express");
const controller = require("./users.controller");
const { authenticate, authorize } = require("../../middleware/auth");

const router = Router();
router.use(authenticate, authorize("ADMIN"));
router.get("/", controller.list);
router.patch("/:id/status", controller.updateStatus);

module.exports = router;
