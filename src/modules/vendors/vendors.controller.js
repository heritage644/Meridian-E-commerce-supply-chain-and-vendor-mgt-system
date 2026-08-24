const prisma = require("../../shared/prisma");
const asyncHandler = require("../../utils/asyncHandler");
const { AppError } = require("../../shared/errors");
const { slugify } = require("../../utils/money");

function vendorInclude() {
  return {
    _count: { select: { products: true, purchaseOrders: true, users: true } },
  };
}

exports.list = asyncHandler(async (req, res) => {
  const { status, q } = req.query;
  const where = {};
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { companyName: { contains: q } },
      { city: { contains: q } },
      { category: { contains: q } },
    ];
  }
  if (req.user?.role === "VENDOR") {
    where.id = req.user.vendorId;
  }
  const vendors = await prisma.vendor.findMany({
    where,
    include: vendorInclude(),
    orderBy: { createdAt: "desc" },
  });
  res.json({ vendors });
});

exports.publicList = asyncHandler(async (req, res) => {
  const vendors = await prisma.vendor.findMany({
    where: { status: "APPROVED" },
    select: {
      id: true,
      companyName: true,
      slug: true,
      city: true,
      state: true,
      category: true,
      description: true,
      rating: true,
      leadTimeDays: true,
      onTimeRate: true,
    },
    orderBy: { rating: "desc" },
  });
  res.json({ vendors });
});

exports.getOne = asyncHandler(async (req, res) => {
  const vendor = await prisma.vendor.findFirst({
    where: {
      OR: [{ id: req.params.id }, { slug: req.params.id }],
    },
    include: {
      products: { where: { status: "ACTIVE" }, include: { category: true, inventory: true } },
      _count: { select: { products: true, purchaseOrders: true } },
    },
  });
  if (!vendor) throw new AppError("Vendor not found", 404);
  if (req.user?.role === "VENDOR" && vendor.id !== req.user.vendorId) {
    throw new AppError("Forbidden", 403);
  }
  res.json({ vendor });
});

exports.create = asyncHandler(async (req, res) => {
  const {
    companyName, contactEmail, contactPhone, taxId, address, city, state,
    category, description, leadTimeDays, paymentTerms,
  } = req.body;
  if (!companyName || !contactEmail) throw new AppError("Company name and email are required");
  const slug = slugify(companyName) + "-" + Math.floor(Math.random() * 99);
  const vendor = await prisma.vendor.create({
    data: {
      companyName,
      slug,
      contactEmail,
      contactPhone: contactPhone || "",
      taxId,
      address: address || "",
      city: city || "",
      state: state || "",
      category: category || "General",
      description: description || "",
      leadTimeDays: Number(leadTimeDays) || 7,
      paymentTerms: paymentTerms || "Net 30",
      status: "PENDING",
    },
  });
  res.status(201).json({ vendor });
});

exports.update = asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (req.user.role === "VENDOR" && req.user.vendorId !== id) {
    throw new AppError("Forbidden", 403);
  }
  const allowed = [
    "companyName", "contactEmail", "contactPhone", "taxId", "address", "city",
    "state", "category", "description", "leadTimeDays", "paymentTerms",
  ];
  const data = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) data[key] = req.body[key];
  }
  if (data.leadTimeDays) data.leadTimeDays = Number(data.leadTimeDays);
  const vendor = await prisma.vendor.update({ where: { id }, data });
  res.json({ vendor });
});

exports.setStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!["PENDING", "APPROVED", "SUSPENDED", "REJECTED"].includes(status)) {
    throw new AppError("Invalid vendor status");
  }
  const vendor = await prisma.vendor.update({ where: { id: req.params.id }, data: { status } });
  const users = await prisma.user.findMany({ where: { vendorId: vendor.id } });
  await Promise.all(
    users.map((u) =>
      prisma.notification.create({
        data: {
          userId: u.id,
          title: `Vendor ${status.toLowerCase()}`,
          body: `${vendor.companyName} is now ${status}.`,
          type: status === "APPROVED" ? "SUCCESS" : "ALERT",
        },
      })
    )
  );
  res.json({ vendor });
});
