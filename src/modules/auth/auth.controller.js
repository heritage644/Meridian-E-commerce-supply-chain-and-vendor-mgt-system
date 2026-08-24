const { z } = require("zod");
const service = require("./auth.service");
const asyncHandler = require("../../utils/asyncHandler");
const { AppError } = require("../../shared/errors");

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  phone: z.string().optional(),
  role: z.enum(["CUSTOMER", "VENDOR"]).optional(),
  companyName: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  address: z.string().optional(),
  category: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

exports.register = asyncHandler(async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError("Invalid registration data", 422, parsed.error.flatten());
  const result = await service.register(parsed.data);
  res.status(201).json(result);
});

exports.login = asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError("Invalid login data", 422, parsed.error.flatten());
  const result = await service.login(parsed.data);
  res.json(result);
});

exports.me = asyncHandler(async (req, res) => {
  const user = await service.me(req.user.id);
  res.json({ user });
});
