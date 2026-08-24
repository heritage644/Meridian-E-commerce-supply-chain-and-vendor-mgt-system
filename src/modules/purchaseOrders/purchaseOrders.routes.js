const { Router } = require("express");
const controller = require("./purchaseOrders.controller");
const { authenticate, authorize } = require("../../middleware/auth");

const router = Router();
router.use(authenticate);
router.get("/", authorize("ADMIN", "WAREHOUSE", "VENDOR"), controller.list);
router.get("/:id", authorize("ADMIN", "WAREHOUSE", "VENDOR"), controller.getOne);
router.post("/", authorize("ADMIN", "WAREHOUSE"), controller.create);
router.post("/:id/send", authorize("ADMIN", "WAREHOUSE"), controller.send);
router.post("/:id/acknowledge", authorize("ADMIN", "VENDOR"), controller.acknowledge);
router.post("/:id/receive", authorize("ADMIN", "WAREHOUSE"), controller.receive);
router.post("/:id/ship", authorize("ADMIN", "VENDOR"), controller.shipInbound);

module.exports = router;
