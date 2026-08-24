const { Router } = require("express");
const controller = require("./vendors.controller");
const { authenticate, authorize, optionalAuth } = require("../../middleware/auth");

const router = Router();
router.get("/public", controller.publicList);
router.get("/public/:id", controller.getOne);
router.get("/", authenticate, authorize("ADMIN", "WAREHOUSE", "VENDOR"), controller.list);
router.get("/:id", authenticate, authorize("ADMIN", "WAREHOUSE", "VENDOR"), controller.getOne);
router.post("/", authenticate, authorize("ADMIN"), controller.create);
router.patch("/:id", authenticate, authorize("ADMIN", "VENDOR"), controller.update);
router.patch("/:id/status", authenticate, authorize("ADMIN"), controller.setStatus);

module.exports = router;
