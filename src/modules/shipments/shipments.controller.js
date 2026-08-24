const prisma = require("../../shared/prisma");
const asyncHandler = require("../../utils/asyncHandler");
const { AppError } = require("../../shared/errors");

exports.list = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.type) where.type = req.query.type;
  if (req.query.status) where.status = req.query.status;
  if (req.user.role === "CUSTOMER") where.order = { customerId: req.user.id };
  if (req.user.role === "VENDOR") {
    where.OR = [
      { purchaseOrder: { vendorId: req.user.vendorId } },
      { order: { items: { some: { product: { vendorId: req.user.vendorId } } } } },
    ];
  }
  const shipments = await prisma.shipment.findMany({
    where,
    include: {
      warehouse: true,
      order: { select: { id: true, orderNumber: true, shippingCity: true } },
      purchaseOrder: { select: { id: true, poNumber: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json({ shipments });
});

exports.track = asyncHandler(async (req, res) => {
  const shipment = await prisma.shipment.findUnique({
    where: { trackingNumber: req.params.tracking },
    include: { order: true, purchaseOrder: true, warehouse: true },
  });
  if (!shipment) throw new AppError("Tracking number not found", 404);
  res.json({ shipment });
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const allowed = ["PREPARING", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "DELAYED"];
  if (!allowed.includes(status)) throw new AppError("Invalid shipment status");
  const data = { status };
  if (status === "DELIVERED") data.deliveredAt = new Date();
  const shipment = await prisma.shipment.update({ where: { id: req.params.id }, data });
  if (shipment.orderId && status === "DELIVERED") {
    await prisma.customerOrder.update({ where: { id: shipment.orderId }, data: { status: "DELIVERED" } });
  }
  res.json({ shipment });
});
