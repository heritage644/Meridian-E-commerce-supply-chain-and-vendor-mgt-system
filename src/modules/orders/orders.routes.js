const { Router } = require("express");
const controller = require("./orders.controller");
const { authenticate, authorize } = require("../../middleware/auth");

const router = Router();
router.use(authenticate);
router.get("/", controller.list);
router.get("/:id", controller.getOne);
router.post("/", authorize("CUSTOMER", "ADMIN"), controller.create);
router.patch("/:id/status", authorize("ADMIN", "WAREHOUSE"), controller.updateStatus);
router.post("/:id/ship", authorize("ADMIN", "WAREHOUSE"), controller.ship);

module.exports = router;
