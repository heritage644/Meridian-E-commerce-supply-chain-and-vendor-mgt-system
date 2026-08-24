const prisma = require("../../shared/prisma");
const asyncHandler = require("../../utils/asyncHandler");
const { AppError } = require("../../shared/errors");
const { slugify } = require("../../utils/money");

const productInclude = {
  vendor: { select: { id: true, companyName: true, slug: true, status: true, city: true } },
  category: true,
  inventory: { include: { warehouse: true } },
};

exports.list = asyncHandler(async (req, res) => {
  const { q, categoryId, vendorId, status } = req.query;
  const where = {};
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { sku: { contains: q } },
      { description: { contains: q } },
    ];
  }
  if (categoryId) where.categoryId = categoryId;
  if (vendorId) where.vendorId = vendorId;
  if (status) where.status = status;
  if (req.user?.role === "VENDOR") where.vendorId = req.user.vendorId;

  const products = await prisma.product.findMany({
    where,
    include: productInclude,
    orderBy: { createdAt: "desc" },
  });
  res.json({ products });
});

exports.publicList = asyncHandler(async (req, res) => {
  const { q, category, vendor } = req.query;
  const where = { status: "ACTIVE", vendor: { status: "APPROVED" } };
  if (q) {
    where.OR = [{ name: { contains: q } }, { description: { contains: q } }];
  }
  if (category) where.category = { slug: category };
  if (vendor) where.vendor = { slug: vendor, status: "APPROVED" };

  const products = await prisma.product.findMany({
    where,
    include: {
      vendor: { select: { companyName: true, slug: true, city: true, rating: true } },
      category: true,
      inventory: true,
    },
    orderBy: { name: "asc" },
  });
  res.json({ products });
});

exports.getOne = asyncHandler(async (req, res) => {
  const product = await prisma.product.findFirst({
    where: { OR: [{ id: req.params.id }, { slug: req.params.id }, { sku: req.params.id }] },
    include: productInclude,
  });
  if (!product) throw new AppError("Product not found", 404);
  res.json({ product });
});

exports.create = asyncHandler(async (req, res) => {
  const {
    name, description, sku, priceKobo, costKobo, unit, weightKg,
    imageHint, categoryId, vendorId, reorderPoint, reorderQty, warehouseStocks,
  } = req.body;
  if (!name || !sku || !categoryId) throw new AppError("Name, SKU and category are required");

  let ownerVendorId = vendorId;
  if (req.user.role === "VENDOR") ownerVendorId = req.user.vendorId;
  if (!ownerVendorId) throw new AppError("Vendor is required");

  const slug = slugify(name) + "-" + sku.toLowerCase();
  const product = await prisma.product.create({
    data: {
      name,
      slug,
      sku,
      description: description || "",
      priceKobo: Number(priceKobo) || 0,
      costKobo: Number(costKobo) || 0,
      unit: unit || "pcs",
      weightKg: Number(weightKg) || 0.5,
      imageHint: imageHint || name,
      categoryId,
      vendorId: ownerVendorId,
      status: "ACTIVE",
    },
    include: productInclude,
  });

  const warehouses = await prisma.warehouse.findMany();
  const stocks = Array.isArray(warehouseStocks) ? warehouseStocks : [];
  for (const wh of warehouses) {
    const match = stocks.find((s) => s.warehouseId === wh.id);
    await prisma.inventory.create({
      data: {
        productId: product.id,
        warehouseId: wh.id,
        quantity: match ? Number(match.quantity) : 0,
        reorderPoint: Number(reorderPoint) || 20,
        reorderQty: Number(reorderQty) || 50,
      },
    });
  }

  const full = await prisma.product.findUnique({ where: { id: product.id }, include: productInclude });
  res.status(201).json({ product: full });
});

exports.update = asyncHandler(async (req, res) => {
  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError("Product not found", 404);
  if (req.user.role === "VENDOR" && existing.vendorId !== req.user.vendorId) {
    throw new AppError("Forbidden", 403);
  }
  const fields = ["name", "description", "priceKobo", "costKobo", "unit", "weightKg", "imageHint", "status", "categoryId"];
  const data = {};
  for (const f of fields) {
    if (req.body[f] !== undefined) data[f] = req.body[f];
  }
  if (data.priceKobo) data.priceKobo = Number(data.priceKobo);
  if (data.costKobo) data.costKobo = Number(data.costKobo);
  if (data.weightKg) data.weightKg = Number(data.weightKg);
  const product = await prisma.product.update({
    where: { id: req.params.id },
    data,
    include: productInclude,
  });
  res.json({ product });
});
