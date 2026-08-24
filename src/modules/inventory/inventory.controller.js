const prisma = require("../../shared/prisma");
const asyncHandler = require("../../utils/asyncHandler");
const { AppError } = require("../../shared/errors");

exports.list = asyncHandler(async (req, res) => {
  const { warehouseId, lowStock } = req.query;
  const where = {};
  if (warehouseId) where.warehouseId = warehouseId;
  if (req.user.role === "WAREHOUSE" && req.user.warehouseId) {
    where.warehouseId = req.user.warehouseId;
  }
  if (req.user.role === "VENDOR") {
    where.product = { vendorId: req.user.vendorId };
  }

  const items = await prisma.inventory.findMany({
    where,
    include: {
      product: { include: { vendor: true, category: true } },
      warehouse: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const mapped = items.map((i) => ({
    ...i,
    available: i.quantity - i.reserved,
    isLow: i.quantity - i.reserved <= i.reorderPoint,
  }));
  const filtered = lowStock === "true" ? mapped.filter((i) => i.isLow) : mapped;
  res.json({ inventory: filtered });
});

exports.adjust = asyncHandler(async (req, res) => {
  const { inventoryId, type, quantity, reason } = req.body;
  const qty = Number(quantity);
  if (!inventoryId || !type || !qty) throw new AppError("inventoryId, type and quantity are required");
  if (!["IN", "OUT", "ADJUST"].includes(type)) throw new AppError("Invalid movement type");

  const result = await prisma.$transaction(async (tx) => {
    const inv = await tx.inventory.findUnique({ where: { id: inventoryId } });
    if (!inv) throw new AppError("Inventory record not found", 404);

    let nextQty = inv.quantity;
    if (type === "IN") nextQty += qty;
    else if (type === "OUT") nextQty -= qty;
    else nextQty = qty;

    if (nextQty < 0) throw new AppError("Insufficient stock for this adjustment");

    const updated = await tx.inventory.update({
      where: { id: inventoryId },
      data: { quantity: nextQty },
      include: { product: true, warehouse: true },
    });

    await tx.stockMovement.create({
      data: {
        inventoryId,
        type,
        quantity: qty,
        reason: reason || "Manual adjustment",
      },
    });
    return updated;
  });

  res.json({ inventory: { ...result, available: result.quantity - result.reserved } });
});

exports.movements = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.inventoryId) where.inventoryId = req.query.inventoryId;
  const movements = await prisma.stockMovement.findMany({
    where,
    include: { inventory: { include: { product: true, warehouse: true } } },
    orderBy: { createdAt: "desc" },
    take: 80,
  });
  res.json({ movements });
});
