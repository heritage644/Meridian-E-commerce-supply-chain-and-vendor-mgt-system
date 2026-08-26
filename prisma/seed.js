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
      email: "okjohn644+admin@gmail.com",
      passwordHash,
      fullName: "Heritage Okechukwu",
      phone: "+2349058480421",
      role: "ADMIN",
    },
  });

  const warehouseUser = await prisma.user.create({
    data: {
      email: "okjohn644+warehouse@gmail.com",
      passwordHash,
      fullName: "Charles Obijulu",
      phone: "+2348010000003",
      role: "WAREHOUSE",
      warehouseId: warehouses[0].id,
    },
  });
  
const vendors = await Promise.all([
  prisma.vendor.create({
    data: {
      companyName: "Tech Distributors NG",
      slug: "tech-distributors-ng",
      contactEmail: "sales@techdistributors.ng",
      contactPhone: "+2348012345678",
      address: "12 Computer Village Road",
      city: "Ikeja",
      state: "Lagos",
      country: "Nigeria",
      category: "Electronics",
      description:
        "Wholesale supplier of electronics, computers and technology accessories.",
      leadTimeDays: 5,
      paymentTerms: "Net 30",
      status: "APPROVED",
      rating: 4.7,
      onTimeRate: 96.5,
      fulfillmentRate: 98.2,
      defectRate: 1.1,
    },
  }),

  prisma.vendor.create({
    data: {
      companyName: "Lagos Office Supplies Ltd",
      slug: "lagos-office-supplies",
      contactEmail: "orders@lagosoffice.ng",
      contactPhone: "+2348023456789",
      address: "45 Industrial Avenue",
      city: "Ikeja",
      state: "Lagos",
      country: "Nigeria",
      category: "Office Supplies",
      description:
        "Supplier of office equipment, stationery and workplace essentials.",
      leadTimeDays: 4,
      paymentTerms: "Net 30",
      status: "APPROVED",
      rating: 4.5,
      onTimeRate: 94.8,
      fulfillmentRate: 97.1,
      defectRate: 1.5,
    },
  }),

  prisma.vendor.create({
    data: {
      companyName: "HomePlus Distributors",
      slug: "homeplus-distributors",
      contactEmail: "sales@homeplus.ng",
      contactPhone: "+2348034567890",
      address: "18 Commerce Street",
      city: "Lekki",
      state: "Lagos",
      country: "Nigeria",
      category: "Home & Living",
      description:
        "Wholesale distributor of furniture, appliances and household products.",
      leadTimeDays: 7,
      paymentTerms: "Net 30",
      status: "APPROVED",
      rating: 4.4,
      onTimeRate: 92.3,
      fulfillmentRate: 95.8,
      defectRate: 2.0,
    },
  }),
]);

const products = [
  {
    sku: "TECH-LAP-001",
    name: "HP 15 Intel Core i5 Laptop",
    slug: "hp-15-intel-core-i5-laptop",
    description:
      "HP 15-inch laptop with Intel Core i5 processor, 8GB RAM and 512GB SSD.",
    priceKobo: 65000000,
    costKobo: 56000000,
    unit: "pcs",
    weightKg: 1.69,
    imageHint: "hp 15 laptop",
    vendorId: vendors[0].id,
    categoryId: categories[0].id,
    quantity: 35,
    reorderPoint: 10,
    reorderQty: 20,
  },

  {
    sku: "TECH-LAP-002",
    name: "Lenovo ThinkPad E14",
    slug: "lenovo-thinkpad-e14",
    description:
      "Lenovo ThinkPad E14 business laptop with Intel Core i5 processor, 16GB RAM and 512GB SSD.",
    priceKobo: 82000000,
    costKobo: 72000000,
    unit: "pcs",
    weightKg: 1.64,
    imageHint: "lenovo thinkpad e14",
    vendorId: vendors[0].id,
    categoryId: categories[0].id,
    quantity: 22,
    reorderPoint: 8,
    reorderQty: 15,
  },

  {
    sku: "TECH-MON-001",
    name: "Dell 24 Inch LED Monitor",
    slug: "dell-24-inch-led-monitor",
    description:
      "24-inch Full HD LED monitor with HDMI and DisplayPort connectivity.",
    priceKobo: 28500000,
    costKobo: 23500000,
    unit: "pcs",
    weightKg: 4.2,
    imageHint: "dell 24 inch monitor",
    vendorId: vendors[0].id,
    categoryId: categories[0].id,
    quantity: 48,
    reorderPoint: 12,
    reorderQty: 25,
  },

  {
    sku: "TECH-KBD-001",
    name: "Wireless Keyboard and Mouse Combo",
    slug: "wireless-keyboard-mouse-combo",
    description:
      "Wireless keyboard and mouse combination suitable for desktops and laptops.",
    priceKobo: 4500000,
    costKobo: 3200000,
    unit: "sets",
    weightKg: 0.65,
    imageHint: "wireless keyboard mouse",
    vendorId: vendors[0].id,
    categoryId: categories[0].id,
    quantity: 120,
    reorderPoint: 30,
    reorderQty: 80,
  },

  {
    sku: "MOB-CHG-001",
    name: "20W USB-C Fast Charger",
    slug: "20w-usb-c-fast-charger",
    description:
      "Compact 20W USB-C fast charging adapter for compatible smartphones and devices.",
    priceKobo: 650000,
    costKobo: 420000,
    unit: "pcs",
    weightKg: 0.12,
    imageHint: "usb c fast charger",
    vendorId: vendors[0].id,
    categoryId: categories[0].id,
    quantity: 350,
    reorderPoint: 75,
    reorderQty: 200,
  },

  {
    sku: "MOB-CBL-001",
    name: "USB-C Charging Cable",
    slug: "usb-c-charging-cable",
    description:
      "Durable USB-C charging and data cable with reinforced connectors.",
    priceKobo: 450000,
    costKobo: 280000,
    unit: "pcs",
    weightKg: 0.08,
    imageHint: "usb c cable",
    vendorId: vendors[0].id,
    categoryId: categories[0].id,
    quantity: 500,
    reorderPoint: 100,
    reorderQty: 300,
  },

  {
    sku: "HOME-CHR-001",
    name: "Ergonomic Office Chair",
    slug: "ergonomic-office-chair",
    description:
      "Adjustable ergonomic office chair with lumbar support and padded armrests.",
    priceKobo: 9500000,
    costKobo: 7200000,
    unit: "pcs",
    weightKg: 12.5,
    imageHint: "ergonomic office chair",
    vendorId: vendors[2].id,
    categoryId: categories[2].id,
    quantity: 42,
    reorderPoint: 10,
    reorderQty: 25,
  },

  {
    sku: "HOME-DSK-001",
    name: "Modern Office Desk",
    slug: "modern-office-desk",
    description:
      "Spacious modern office desk suitable for professional and home office environments.",
    priceKobo: 12500000,
    costKobo: 9500000,
    unit: "pcs",
    weightKg: 28,
    imageHint: "modern office desk",
    vendorId: vendors[2].id,
    categoryId: categories[2].id,
    quantity: 25,
    reorderPoint: 6,
    reorderQty: 15,
  },

  {
    sku: "OFF-PRN-001",
    name: "HP LaserJet Pro Printer",
    slug: "hp-laserjet-pro-printer",
    description:
      "Compact monochrome laser printer designed for small offices and businesses.",
    priceKobo: 18500000,
    costKobo: 15000000,
    unit: "pcs",
    weightKg: 7.5,
    imageHint: "hp laserjet printer",
    vendorId: vendors[1].id,
    categoryId: categories[0].id,
    quantity: 18,
    reorderPoint: 5,
    reorderQty: 10,
  },

  {
    sku: "FOOD-PPR-001",
    name: "A4 Copier Paper 500 Sheets",
    slug: "a4-copier-paper-500-sheets",
    description:
      "Premium quality A4 copier paper suitable for printers, copiers and office documents.",
    priceKobo: 650000,
    costKobo: 480000,
    unit: "reams",
    weightKg: 2.5,
    imageHint: "a4 copier paper",
    vendorId: vendors[1].id,
    categoryId: categories[0].id,
    quantity: 600,
    reorderPoint: 100,
    reorderQty: 300,
  },

  {
    sku: "HOME-MIC-001",
    name: "Microwave Oven 25L",
    slug: "microwave-oven-25l",
    description:
      "25-litre microwave oven with multiple cooking modes and adjustable power levels.",
    priceKobo: 7800000,
    costKobo: 6200000,
    unit: "pcs",
    weightKg: 13.5,
    imageHint: "25l microwave oven",
    vendorId: vendors[2].id,
    categoryId: categories[2].id,
    quantity: 30,
    reorderPoint: 8,
    reorderQty: 15,
  },

  {
    sku: "HOME-BLD-001",
    name: "Electric Blender 1.5L",
    slug: "electric-blender-1-5l",
    description:
      "1.5-litre electric blender with stainless steel blades and multiple speed settings.",
    priceKobo: 3800000,
    costKobo: 2800000,
    unit: "pcs",
    weightKg: 2.4,
    imageHint: "electric blender",
    vendorId: vendors[2].id,
    categoryId: categories[2].id,
    quantity: 65,
    reorderPoint: 15,
    reorderQty: 40,
  },
];

console.log(`Created ${vendors.length} vendors`);
// 6. Products + Inventory

for (const productData of products) {
  const product = await prisma.product.create({
    data: {
      sku: productData.sku,
      name: productData.name,
      slug: productData.slug,
      description: productData.description,
      priceKobo: productData.priceKobo,
      costKobo: productData.costKobo,
      unit: productData.unit,
      weightKg: productData.weightKg,
      imageHint: productData.imageHint,
      status: "ACTIVE",
      vendorId: productData.vendorId,
      categoryId: productData.categoryId,
    },
  });

  await prisma.inventory.create({
    data: {
      productId: product.id,
      warehouseId: warehouses[0].id,
      quantity: productData.quantity,
      reserved: 0,
      reorderPoint: productData.reorderPoint,
      reorderQty: productData.reorderQty,
    },
  });
}

console.log(`Created ${products.length} products`);

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