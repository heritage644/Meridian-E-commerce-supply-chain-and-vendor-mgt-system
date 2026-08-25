require("dotenv").config();

module.exports = {
  port: Number(process.env.PORT) || 4000,

  jwtSecret: process.env.JWT_SECRET || "dev-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",

  frontendOrigin:
    process.env.FRONTEND_ORIGIN || "http://localhost:3000",

  backendOrigin:
    process.env.BACKEND_ORIGIN || "http://localhost:4000",

  resendApiKey: process.env.RESEND_API_KEY,

  emailFrom:
    process.env.EMAIL_FROM || "Meridian <onboarding@resend.dev>",

  nodeEnv: process.env.NODE_ENV || "development",
};