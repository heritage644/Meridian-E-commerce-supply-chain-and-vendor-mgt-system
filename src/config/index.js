require("dotenv").config();

module.exports = {
  port: Number(process.env.PORT) || 4000,
  jwtSecret: process.env.JWT_SECRET || "dev-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:3000",
  nodeEnv: process.env.NODE_ENV || "development",
};
