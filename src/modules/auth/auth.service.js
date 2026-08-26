const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../../shared/prisma");
const { AppError } = require("../../shared/errors");
const crypto = require("crypto");
const config = require("../../config");
const { slugify } = require("../../utils/money");
const { sendVerificationEmail } = require("../../shared/email");

function signToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role, 
      vendorId: user.vendorId, 
      warehouseId: user.warehouseId 
    },
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

async function register({
  email,
  password,
  fullName,
  phone,
  role,
  companyName,
  city,
  state,
  address,
  category,
}) {
  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing) {
    throw new AppError("An account with this email already exists", 409);
  }

  const allowed = ["CUSTOMER", "VENDOR"];
  const chosenRole = allowed.includes(role) ? role : "CUSTOMER";
  const passwordHash = await bcrypt.hash(password, 10);

  const verificationToken = crypto.randomBytes(32).toString("hex");
  const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // Wrap creation inside an interactive transaction
  const user = await prisma.$transaction(async (tx) => {
    let vendorId = null;

    if (chosenRole === "VENDOR") {
      if (!companyName) {
        throw new AppError("Company name is required for vendor registration", 400);
      }

      const slugBase = slugify(companyName);
      let slug = slugBase;
      let i = 1;

      while (await tx.vendor.findUnique({ where: { slug } })) {
        slug = `${slugBase}-${i++}`;
      }

      const vendor = await tx.vendor.create({
        data: {
          companyName,
          slug,
          contactEmail: normalizedEmail,
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

    return await tx.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        fullName,
        phone,
        role: chosenRole,
        vendorId,
        emailVerified: false,
        verificationToken,
        verificationTokenExpiresAt,
      },
      include: {
        vendor: true,
        warehouse: true,
      },
    });
  });

  // Safe Email Dispatch with Cleanup Rollback
  try {
    await sendVerificationEmail({
      email: user.email,
      fullName: user.fullName,
      verificationToken,
    });
  } catch (emailError) {
    // If sending fails (e.g., Resend sandbox limit), rollback created user & vendor records
    await prisma.user.delete({ where: { id: user.id } });
    if (user.vendorId) {
      await prisma.vendor.delete({ where: { id: user.vendorId } });
    }

    console.error("Resend Email Error:", emailError.message);
    throw new AppError(
      "Failed to send verification email. " +
        (process.env.NODE_ENV !== "production"
          ? "Resend sandbox only allows sending to registered developer email."
          : "Please try again later."),
      500
    );
  }

  return {
    message: "Account created successfully.Please check your email to verify your account.",
  };
}

async function verifyEmail(token) {
  if (!token) {
    throw new AppError("Verification token is required", 400);
  }

  const user = await prisma.user.findFirst({
    where: { verificationToken: token },
  });

  if (!user) {
    throw new AppError("Invalid verification link", 400);
  }

  if (
    !user.verificationTokenExpiresAt ||
    new Date(user.verificationTokenExpiresAt).getTime() < Date.now()
  ) {
    throw new AppError("Verification link has expired", 400);
  }

  // Update record directly
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpiresAt: null,
    },
    include: {
      vendor: true,
      warehouse: true,
    },
  });

  return {
    message: "Email verified successfully",
    user: publicUser(updatedUser),
  };
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { vendor: true, warehouse: true },
  });
  
  if (!user) throw new AppError("Invalid email or password", 401);

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new AppError("Invalid email or password", 401);

  if (!user.emailVerified) {
    throw new AppError("Please verify your email before logging in", 403);
  }

  if (user.status !== "ACTIVE") {
    throw new AppError("Account is suspended", 403);
  }

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

module.exports = { register, login, me, verifyEmail, publicUser, signToken };