const prisma = require("../../shared/prisma");
const asyncHandler = require("../../utils/asyncHandler");
const { AppError } = require("../../shared/errors");
const { orderNumber, trackingNumber } = require("../../utils/money");

const include = {
  customer: { select: { id: true, fullName: true, email: true, phone: true } },
  items: { include: { product: { include: { vendor: true } } } },
  shipments: true,
};

exports.list = asyncHandler(async (req, res) => {
  const where = {};
  if (req.user.role === "CUSTOMER") where.customerId = req.user.id;
  if (req.user.role === "VENDOR") {
    where.items = { some: { product: { vendorId: req.user.vendorId } } };
  }
  if (req.query.status) where.status = req.query.status;
  const orders = await prisma.customerOrder.findMany({
    where,
    include,
    orderBy: { createdAt: "desc" },
  });
  res.json({ orders });
});

exports.getOne = asyncHandler(async (req, res) => {
  const order = await prisma.customerOrder.findUnique({ where: { id: req.params.id }, include });
  if (!order) throw new AppError("Order not found", 404);
  if (req.user.role === "CUSTOMER" && order.customerId !== req.user.id) throw new AppError("Forbidden", 403);
  res.json({ order });
});

exports.create = asyncHandler(async (req, res) => {
  const { items, shippingName, shippingPhone, shippingAddress, shippingCity, shippingState, notes } = req.body;
  if (!Array.isArray(items) || items.length === 0) throw new AppError("Cart is empty");
  if (!shippingAddress || !shippingCity) throw new AppError("Shipping address is required");

  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } }, include: { inventory: true } });
  if (products.length !== productIds.length) throw new AppError("One or more products are invalid");

  const lineItems = items.map((i) => {
    const p = products.find((x) => x.id === i.productId);
    const qty = Number(i.quantity);
    const available = p.inventory.reduce((s, inv) => s + (inv.quantity - inv.reserved), 0);
    if (available < qty) throw new AppError(`Insufficient stock for ${p.name}`);
    return { product: p, quantity: qty, unitPriceKobo: p.priceKobo };
  });

  const subtotalKobo = lineItems.reduce((s, i) => s + i.quantity * i.unitPriceKobo, 0);
  const shippingKobo = subtotalKobo > 15000000 ? 0 : 250000;
  const totalKobo = subtotalKobo + shippingKobo;

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.customerOrder.create({
      data: {
        orderNumber: orderNumber(),
        customerId: req.user.id,
        shippingName: shippingName || req.user.email,
        shippingPhone: shippingPhone || "",
        shippingAddress,
        shippingCity,
        shippingState: shippingState || "",
        notes,
        subtotalKobo,
        shippingKobo,
        totalKobo,
        status: "PENDING",
        paymentStatus: "PAID",
        items: {
          create: lineItems.map((i) => ({
            productId: i.product.id,
            quantity: i.quantity,
            unitPriceKobo: i.unitPriceKobo,
          })),
        },
      },
      include,
    });

    for (const i of lineItems) {
      let remaining = i.quantity;
      const lots = [...i.product.inventory].sort((a, b) => b.quantity - a.quantity);
      for (const lot of lots) {
        if (remaining <= 0) break;
        const take = Math.min(remaining, lot.quantity - lot.reserved);
        if (take <= 0) continue;
        await tx.inventory.update({
          where: { id: lot.id },
          data: { reserved: lot.reserved + take },
        });
        await tx.stockMovement.create({
          data: {
            inventoryId: lot.id,
            type: "RESERVE",
            quantity: take,
            reason: `Reserve for ${created.orderNumber}`,
            reference: created.id,
          },
        });
        remaining -= take;
      }
    }
    return created;
  });

  res.status(201).json({ order });
});

async function consumeReservedStock(tx, orderId) {
  const existing = await tx.customerOrder.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: { include: { inventory: true } } } } },
  });
  if (!existing || existing.status === "SHIPPED" || existing.status === "DELIVERED") return;
  for (const item of existing.items) {
    let remaining = item.quantity;
    for (const lot of item.product.inventory) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, lot.reserved);
      if (take <= 0) continue;
      await tx.inventory.update({
        where: { id: lot.id },
        data: { reserved: lot.reserved - take, quantity: lot.quantity - take },
      });
      await tx.stockMovement.create({
        data: {
          inventoryId: lot.id,
          type: "OUT",
          quantity: take,
          reason: `Fulfilled ${existing.orderNumber}`,
          reference: existing.id,
        },
      });
      remaining -= take;
    }
  }
}

exports.updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const allowed = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];
  if (!allowed.includes(status)) throw new AppError("Invalid order status");

  const existing = await prisma.customerOrder.findUnique({
    where: { id: req.params.id },
    include: { items: { include: { product: { include: { inventory: true } } } } },
  });
  if (!existing) throw new AppError("Order not found", 404);

  if (status === "CANCELLED" && existing.status !== "CANCELLED") {
    await prisma.$transaction(async (tx) => {
      for (const item of existing.items) {
        let remaining = item.quantity;
        for (const lot of item.product.inventory) {
          if (remaining <= 0) break;
          const release = Math.min(remaining, lot.reserved);
          if (release <= 0) continue;
          await tx.inventory.update({
            where: { id: lot.id },
            data: { reserved: lot.reserved - release },
          });
          remaining -= release;
        }
      }
      await tx.customerOrder.update({ where: { id: existing.id }, data: { status: "CANCELLED" } });
    });
  } else if (status === "SHIPPED" || status === "DELIVERED") {
    await prisma.$transaction(async (tx) => {
      await consumeReservedStock(tx, existing.id);
      await tx.customerOrder.update({ where: { id: existing.id }, data: { status } });
    });
  } else {
    await prisma.customerOrder.update({ where: { id: existing.id }, data: { status } });
  }

  const order = await prisma.customerOrder.findUnique({ where: { id: existing.id }, include });
  await prisma.notification.create({
    data: {
      userId: order.customerId,
      title: `Order ${order.orderNumber} ${status.toLowerCase()}`,
      body: `Your order is now ${status.replace("_", " ").toLowerCase()}.`,
      type: status === "CANCELLED" ? "ALERT" : "SUCCESS",
    },
  });
  res.json({ order });
});

exports.ship = asyncHandler(async (req, res) => {
  const order = await prisma.customerOrder.findUnique({
    where: { id: req.params.id },
    include: { items: true },
  });
  if (!order) throw new AppError("Order not found", 404);
  const warehouse = await prisma.warehouse.findFirst();

  const shipment = await prisma.$transaction(async (tx) => {
    await consumeReservedStock(tx, order.id);
    const created = await tx.shipment.create({
      data: {
        trackingNumber: trackingNumber(),
        type: "OUTBOUND",
        carrier: req.body.carrier || "GIG Logistics",
        status: "IN_TRANSIT",
        origin: warehouse ? `${warehouse.city}, ${warehouse.state}` : "Lagos, Lagos",
        destination: `${order.shippingCity}, ${order.shippingState}`,
        warehouseId: warehouse?.id,
        orderId: order.id,
        eta: new Date(Date.now() + 3 * 86400000),
      },
    });
    await tx.customerOrder.update({ where: { id: order.id }, data: { status: "SHIPPED" } });
    return created;
  });

  res.status(201).json({ shipment });
});
