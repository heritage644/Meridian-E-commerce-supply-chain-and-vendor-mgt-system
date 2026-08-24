const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { notFound, errorHandler } = require("./shared/errors");

const authRoutes = require("./modules/auth/auth.routes");
const usersRoutes = require("./modules/users/users.routes");
const vendorsRoutes = require("./modules/vendors/vendors.routes");
const categoriesRoutes = require("./modules/categories/categories.routes");
const productsRoutes = require("./modules/products/products.routes");
const warehousesRoutes = require("./modules/warehouses/warehouses.routes");
const inventoryRoutes = require("./modules/inventory/inventory.routes");
const poRoutes = require("./modules/purchaseOrders/purchaseOrders.routes");
const ordersRoutes = require("./modules/orders/orders.routes");
const shipmentsRoutes = require("./modules/shipments/shipments.routes");
const dashboardRoutes = require("./modules/dashboard/dashboard.routes");
const notificationsRoutes = require("./modules/notifications/notifications.routes");

function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
  app.use(
    rateLimit({
      windowMs: 60_000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.get("/api/health", (req, res) => {
    res.json({ ok: true, service: "meridian-api", time: new Date().toISOString() });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/users", usersRoutes);
  app.use("/api/vendors", vendorsRoutes);
  app.use("/api/categories", categoriesRoutes);
  app.use("/api/products", productsRoutes);
  app.use("/api/warehouses", warehousesRoutes);
  app.use("/api/inventory", inventoryRoutes);
  app.use("/api/purchase-orders", poRoutes);
  app.use("/api/orders", ordersRoutes);
  app.use("/api/shipments", shipmentsRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/notifications", notificationsRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
