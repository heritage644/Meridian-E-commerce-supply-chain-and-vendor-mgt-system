const { Router } = require("express");
const controller = require("./warehouses.controller");
const { authenticate, authorize } = require("../../middleware/auth");

const router = Router();
router.use(authenticate, authorize("ADMIN", "WAREHOUSE"));
router.get("/", controller.list);
router.post("/", authorize("ADMIN"), controller.create);

module.exports = router;
