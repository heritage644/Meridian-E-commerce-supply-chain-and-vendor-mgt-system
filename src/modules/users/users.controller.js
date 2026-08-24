const prisma = require("../../shared/prisma");
const asyncHandler = require("../../utils/asyncHandler");
const { AppError } = require("../../shared/errors");
const { publicUser } = require("../auth/auth.service");

exports.list = asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    include: { vendor: true, warehouse: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ users: users.map(publicUser) });
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!["ACTIVE", "SUSPENDED"].includes(status)) throw new AppError("Invalid status");
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { status },
    include: { vendor: true, warehouse: true },
  });
  res.json({ user: publicUser(user) });
});
