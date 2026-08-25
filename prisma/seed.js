const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  // Wipe all existing records cleanly in order of relations
  await prisma.notification.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.customerOrder.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.category.deleteMany();

  const passwordHash = await bcrypt.hash("Password123!", 10);

  // 1. Base Categories (Required for frontend product creation)
  const categories = await Promise.all(
    [
      ["Electronics", "electronics", "Phones, accessories and computing"],
      ["Fashion & Textiles", "fashion-textiles", "Apparel, fabrics and footwear"],
      ["Home & Living", "home-living", "Furniture, kitchen and household"],
      ["Beauty & Personal Care", "beauty", "Cosmetics and personal care"],
      ["Food & Grocery", "food-grocery", "Packaged foods and staples"],
      ["Health", "health", "OTC wellness and first aid"],
    ].map(([name, slug, description]) =>
      prisma.category.create({ data: { name, slug, description } })
    )
  );

  // 2. Warehouses
  const warehouses = await Promise.all([
    prisma.warehouse.create({
      data: {
        name: "Lagos Fulfilment Centre",
        code: "LOS-01",
        address: "18 Warehouse Road, Apapa",
        city: "Lagos",
        state: "Lagos",
        capacity: 25000,
      },
    }),
    prisma.warehouse.create({
      data: {
        name: "Onitsha Distribution Hub",
        code: "ONI-01",
        address: "Bridge Head Industrial Layout",
        city: "Onitsha",
        state: "Anambra",
        capacity: 16000,
      },
    }),
    prisma.warehouse.create({
      data: {
        name: "Abuja Regional Depot",
        code: "ABV-01",
        address: "Idu Industrial Area",
        city: "Abuja",
        state: "FCT",
        capacity: 12000,
      },
    }),
  ]);

  // 3. System Accounts (Admin & Warehouse Manager)
  const admin = await prisma.user.create({
    data: {
      email: "heritage@connec.ng",
      passwordHash,
      fullName: "Heritage Okechukwu",
      phone: "+2349058480421",
      role: "ADMIN",
    },
  });

  const warehouseUser = await prisma.user.create({
    data: {
      email: "charles@connec.ng",
      passwordHash,
      fullName: "Charles Obijulu",
      phone: "+2348010000003",
      role: "WAREHOUSE",
      warehouseId: warehouses[0].id,
    },
  });

  // 4. Initial System Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: admin.id,
        title: "System ready",
        body: "Database reset complete. Ready to onboard vendors and create products.",
        type: "INFO",
      },
      {
        userId: warehouseUser.id,
        title: "Lagos FC active",
        body: "Warehouse initialized and ready to receive stock.",
        type: "INFO",
      },
    ],
  });

 
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });