const prisma = require("../../shared/prisma");
const asyncHandler = require("../../utils/asyncHandler");

exports.stats = asyncHandler(async (req, res) => {
  const role = req.user.role;

  const [
    vendorCount,
    pendingVendors,
    productCount,
    orderCount,
    openPos,
    lowStock,
    inTransit,
    revenueAgg,
    recentOrders,
    recentPos,
    vendors,
    inventory,
  ] = await Promise.all([
    prisma.vendor.count({ where: { status: "APPROVED" } }),
    prisma.vendor.count({ where: { status: "PENDING" } }),
    prisma.product.count({ where: role === "VENDOR" ? { vendorId: req.user.vendorId } : undefined }),
    prisma.customerOrder.count({
      where: role === "CUSTOMER" ? { customerId: req.user.id } : undefined,
    }),
    prisma.purchaseOrder.count({
      where: {
        status: { in: ["DRAFT", "SENT", "ACKNOWLEDGED", "PARTIAL"] },
        ...(role === "VENDOR" ? { vendorId: req.user.vendorId } : {}),
      },
    }),
    prisma.inventory.findMany({ include: { product: true } }),
    prisma.shipment.count({ where: { status: { in: ["IN_TRANSIT", "OUT_FOR_DELIVERY"] } } }),
    prisma.customerOrder.aggregate({
      _sum: { totalKobo: true },
      where: { paymentStatus: "PAID", status: { not: "CANCELLED" } },
    }),
    prisma.customerOrder.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { customer: { select: { fullName: true } }, items: true },
    }),
    prisma.purchaseOrder.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { vendor: true, items: true },
    }),
    prisma.vendor.findMany({ where: { status: "APPROVED" }, orderBy: { rating: "desc" }, take: 5 }),
    prisma.inventory.findMany({ include: { product: { include: { category: true } }, warehouse: true } }),
  ]);

  const low = inventory.filter((i) => i.quantity - i.reserved <= i.reorderPoint);
  const stockValue = inventory.reduce((s, i) => s + i.quantity * (i.product.costKobo || 0), 0);

  const categoryMap = {};
  for (const i of inventory) {
    const name = i.product.category?.name || "Uncategorised";
    categoryMap[name] = (categoryMap[name] || 0) + i.quantity;
  }

  const ordersByStatus = await prisma.customerOrder.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  res.json({
    kpis: {
      vendors: vendorCount,
      pendingVendors,
      products: productCount,
      orders: orderCount,
      openPurchaseOrders: openPos,
      lowStock: low.length,
      inTransit,
      gmvKobo: revenueAgg._sum.totalKobo || 0,
      stockValueKobo: stockValue,
    },
    recentOrders,
    recentPos,
    topVendors: vendors,
    lowStock: low.slice(0, 8),
    categoryStock: Object.entries(categoryMap).map(([name, quantity]) => ({ name, quantity })),
    ordersByStatus: ordersByStatus.map((o) => ({ status: o.status, count: o._count._all })),
  });
});
