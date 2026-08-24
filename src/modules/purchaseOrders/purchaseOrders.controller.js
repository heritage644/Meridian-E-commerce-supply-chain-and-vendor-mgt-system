const prisma = require("../../shared/prisma");
const asyncHandler = require("../../utils/asyncHandler");
const { AppError } = require("../../shared/errors");
const { poNumber, trackingNumber } = require("../../utils/money");

const include = {
  vendor: true,
  warehouse: true,
  items: { include: { product: true } },
  shipments: true,
};

exports.list = asyncHandler(async (req, res) => {
  const where = {};
  if (req.user.role === "VENDOR") where.vendorId = req.user.vendorId;
  if (req.query.status) where.status = req.query.status;
  const purchaseOrders = await prisma.purchaseOrder.findMany({
    where,
    include,
    orderBy: { createdAt: "desc" },
  });
  res.json({ purchaseOrders });
});

exports.getOne = asyncHandler(async (req, res) => {
  const po = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id }, include });
  if (!po) throw new AppError("Purchase order not found", 404);
  if (req.user.role === "VENDOR" && po.vendorId !== req.user.vendorId) throw new AppError("Forbidden", 403);
  res.json({ purchaseOrder: po });
});

exports.create = asyncHandler(async (req, res) => {
  const { vendorId, warehouseId, notes, expectedDate, items } = req.body;
  if (!vendorId || !warehouseId || !Array.isArray(items) || items.length === 0) {
    throw new AppError("Vendor, warehouse and at least one item are required");
  }
  const subtotalKobo = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unitCostKobo), 0);
  const po = await prisma.purchaseOrder.create({
    data: {
      poNumber: poNumber(),
      vendorId,
      warehouseId,
      notes,
      expectedDate: expectedDate ? new Date(expectedDate) : null,
      subtotalKobo,
      status: "DRAFT",
      items: {
        create: items.map((i) => ({
          productId: i.productId,
          quantity: Number(i.quantity),
          unitCostKobo: Number(i.unitCostKobo),
        })),
      },
    },
    include,
  });
  res.status(201).json({ purchaseOrder: po });
});

exports.send = asyncHandler(async (req, res) => {
  const po = await prisma.purchaseOrder.update({
    where: { id: req.params.id },
    data: { status: "SENT" },
    include,
  });
  const vendorUsers = await prisma.user.findMany({ where: { vendorId: po.vendorId } });
  await Promise.all(
    vendorUsers.map((u) =>
      prisma.notification.create({
        data: {
          userId: u.id,
          title: "New purchase order",
          body: `${po.poNumber} has been sent for ${po.items.length} SKUs.`,
          type: "INFO",
        },
      })
    )
  );
  res.json({ purchaseOrder: po });
});

exports.acknowledge = asyncHandler(async (req, res) => {
  const existing = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError("Not found", 404);
  if (req.user.role === "VENDOR" && existing.vendorId !== req.user.vendorId) throw new AppError("Forbidden", 403);
  const po = await prisma.purchaseOrder.update({
    where: { id: req.params.id },
    data: { status: "ACKNOWLEDGED" },
    include,
  });
  res.json({ purchaseOrder: po });
});

exports.receive = asyncHandler(async (req, res) => {
  const { receipts } = req.body; // [{ itemId, quantity }]
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: req.params.id },
    include: { items: true },
  });
  if (!po) throw new AppError("Purchase order not found", 404);

  await prisma.$transaction(async (tx) => {
    for (const r of receipts || []) {
      const item = po.items.find((i) => i.id === r.itemId);
      if (!item) continue;
      const qty = Number(r.quantity);
      if (qty <= 0) continue;
      await tx.purchaseOrderItem.update({
        where: { id: item.id },
        data: { receivedQty: item.receivedQty + qty },
      });
      const inv = await tx.inventory.findUnique({
        where: { productId_warehouseId: { productId: item.productId, warehouseId: po.warehouseId } },
      });
      if (inv) {
        await tx.inventory.update({
          where: { id: inv.id },
          data: { quantity: inv.quantity + qty },
        });
        await tx.stockMovement.create({
          data: {
            inventoryId: inv.id,
            type: "IN",
            quantity: qty,
            reason: `PO receipt ${po.poNumber}`,
            reference: po.id,
          },
        });
      }
    }

    const refreshed = await tx.purchaseOrder.findUnique({
      where: { id: po.id },
      include: { items: true },
    });
    const allReceived = refreshed.items.every((i) => i.receivedQty >= i.quantity);
    const anyReceived = refreshed.items.some((i) => i.receivedQty > 0);
    const status = allReceived ? "RECEIVED" : anyReceived ? "PARTIAL" : po.status;
    await tx.purchaseOrder.update({ where: { id: po.id }, data: { status } });
  });

  const updated = await prisma.purchaseOrder.findUnique({ where: { id: po.id }, include });
  res.json({ purchaseOrder: updated });
});

exports.shipInbound = asyncHandler(async (req, res) => {
  const po = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id }, include: { vendor: true, warehouse: true } });
  if (!po) throw new AppError("Not found", 404);
  const shipment = await prisma.shipment.create({
    data: {
      trackingNumber: trackingNumber(),
      type: "INBOUND",
      carrier: req.body.carrier || "Meridian Freight",
      status: "IN_TRANSIT",
      origin: `${po.vendor.city}, ${po.vendor.state}`,
      destination: `${po.warehouse.city}, ${po.warehouse.state}`,
      warehouseId: po.warehouseId,
      purchaseOrderId: po.id,
      eta: req.body.eta ? new Date(req.body.eta) : new Date(Date.now() + 4 * 86400000),
    },
  });
  res.status(201).json({ shipment });
});
