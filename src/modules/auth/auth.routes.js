const { Router } = require("express");
const controller = require("./auth.controller");
const { authenticate } = require("../../middleware/auth");
const router = Router();
router.post("/register", controller.register);
router.post("/login", controller.login);
router.get(
  "/verify-email",
  controller.verifyEmail
);
router.get("/me", authenticate, controller.me);

module.exports = router;
