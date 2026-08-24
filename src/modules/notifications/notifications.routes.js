const { Router } = require("express");
const controller = require("./notifications.controller");
const { authenticate } = require("../../middleware/auth");

const router = Router();
router.use(authenticate);
router.get("/", controller.list);
router.post("/read", controller.markRead);

module.exports = router;
