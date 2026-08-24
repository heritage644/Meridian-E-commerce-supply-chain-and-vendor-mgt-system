const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../../shared/prisma");
const { AppError } = require("../../shared/errors");
const config = require("../../config");
const { slugify } = require("../../utils/money");

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, vendorId: user.vendorId, warehouseId: user.warehouseId },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    status: user.status,
    vendorId: user.vendorId,
    warehouseId: user.warehouseId,
    vendor: user.vendor
      ? { id: user.vendor.id, companyName: user.vendor.companyName, status: user.vendor.status, slug: user.vendor.slug }
      : null,
    warehouse: user.warehouse
      ? { id: user.warehouse.id, name: user.warehouse.name, code: user.warehouse.code }
      : null,
    createdAt: user.createdAt,
  };
}

async function register({ email, password, fullName, phone, role, companyName, city, state, address, category }) {
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) throw new AppError("An account with this email already exists", 409);

  const allowed = ["CUSTOMER", "VENDOR"];
  const chosenRole = allowed.includes(role) ? role : "CUSTOMER";
  const passwordHash = await bcrypt.hash(password, 10);

  let vendorId = null;
  if (chosenRole === "VENDOR") {
    if (!companyName) throw new AppError("Company name is required for vendor registration");
    const slugBase = slugify(companyName);
    let slug = slugBase;
    let i = 1;
    while (await prisma.vendor.findUnique({ where: { slug } })) {
      slug = `${slugBase}-${i++}`;
    }
    const vendor = await prisma.vendor.create({
      data: {
        companyName,
        slug,
        contactEmail: email.toLowerCase(),
        contactPhone: phone || "",
        address: address || "Address pending",
        city: city || "Lagos",
        state: state || "Lagos",
        category: category || "General",
        description: `${companyName} applied to supply on Meridian.`,
        status: "PENDING",
      },
    });
    vendorId = vendor.id;
  }

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      fullName,
      phone,
      role: chosenRole,
      vendorId,
    },
    include: { vendor: true, warehouse: true },
  });

  return { token: signToken(user), user: publicUser(user) };
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { vendor: true, warehouse: true },
  });
  if (!user) throw new AppError("Invalid email or password", 401);
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new AppError("Invalid email or password", 401);
  if (user.status !== "ACTIVE") throw new AppError("Account is suspended", 403);
  return { token: signToken(user), user: publicUser(user) };
}

async function me(id) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: { vendor: true, warehouse: true },
  });
  if (!user) throw new AppError("User not found", 404);
  return publicUser(user);
}

module.exports = { register, login, me, publicUser, signToken };
