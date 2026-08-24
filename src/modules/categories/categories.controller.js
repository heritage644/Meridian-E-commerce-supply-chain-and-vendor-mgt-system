const prisma = require("../../shared/prisma");
const asyncHandler = require("../../utils/asyncHandler");
const { slugify } = require("../../utils/money");

exports.list = asyncHandler(async (req, res) => {
  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });
  res.json({ categories });
});

exports.create = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const category = await prisma.category.create({
    data: { name, description, slug: slugify(name) },
  });
  res.status(201).json({ category });
});
