const { Router } = require("express");
const controller = require("./inventory.controller");
const { authenticate, authorize } = require("../../middleware/auth");

const router = Router();
router.use(authenticate, authorize("ADMIN", "WAREHOUSE", "VENDOR"));
router.get("/", controller.list);
router.get("/movements", controller.movements);
router.post("/adjust", authorize("ADMIN", "WAREHOUSE"), controller.adjust);

module.exports = router;
