const prisma = require("../../shared/prisma");
const asyncHandler = require("../../utils/asyncHandler");
const { AppError } = require("../../shared/errors");

exports.list = asyncHandler(async (req, res) => {
  const warehouses = await prisma.warehouse.findMany({
    include: {
      _count: { select: { inventory: true, users: true } },
    },
    orderBy: { name: "asc" },
  });
  const withStock = await Promise.all(
    warehouses.map(async (w) => {
      const agg = await prisma.inventory.aggregate({
        where: { warehouseId: w.id },
        _sum: { quantity: true, reserved: true },
      });
      return { ...w, onHand: agg._sum.quantity || 0, reserved: agg._sum.reserved || 0 };
    })
  );
  res.json({ warehouses: withStock });
});

exports.create = asyncHandler(async (req, res) => {
  const { name, code, address, city, state, capacity } = req.body;
  if (!name || !code) throw new AppError("Name and code are required");
  const warehouse = await prisma.warehouse.create({
    data: { name, code: code.toUpperCase(), address: address || "", city: city || "", state: state || "", capacity: Number(capacity) || 10000 },
  });
  res.status(201).json({ warehouse });
});
