const jwt = require("jsonwebtoken");
const prisma = require("../shared/prisma");
const { AppError } = require("../shared/errors");

function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next(new AppError("Authentication required", 401));

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    next(new AppError("Invalid or expired token", 401));
  }
}

function optionalAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next();
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    /* ignore */
  }
  next();
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new AppError("Authentication required", 401));
    if (!roles.includes(req.user.role)) {
      return next(new AppError("You do not have permission for this action", 403));
    }
    next();
  };
}

async function attachUser(req, res, next) {
  if (!req.user?.id) return next();
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { vendor: true, warehouse: true },
  });
  if (!user || user.status !== "ACTIVE") {
    return next(new AppError("Account is inactive", 403));
  }
  req.account = user;
  next();
}

module.exports = { authenticate, optionalAuth, authorize, attachUser };
