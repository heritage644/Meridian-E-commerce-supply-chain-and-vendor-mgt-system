const { Router } = require("express");
const controller = require("./products.controller");
const { authenticate, authorize } = require("../../middleware/auth");

const router = Router();
router.get("/public", controller.publicList);
router.get("/public/:id", controller.getOne);
router.get("/", authenticate, authorize("ADMIN", "WAREHOUSE", "VENDOR"), controller.list);
router.get("/:id", authenticate, authorize("ADMIN", "WAREHOUSE", "VENDOR"), controller.getOne);
router.post("/", authenticate, authorize("ADMIN", "VENDOR"), controller.create);
router.patch("/:id", authenticate, authorize("ADMIN", "VENDOR"), controller.update);

module.exports = router;
