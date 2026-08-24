const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

function daysAgo(n) {
  return new Date(Date.now() - n * 86400000);
}

async function main() {
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

  const categories = await Promise.all(
    [
      ["Electronics", "electronics", "Phones, accessories and computing"],
      ["Fashion & Textiles", "fashion-textiles", "Apparel, fabrics and footwear"],
      ["Home & Living", "home-living", "Furniture, kitchen and household"],
      ["Beauty & Personal Care", "beauty", "Cosmetics and personal care"],
      ["Food & Grocery", "food-grocery", "Packaged foods and staples"],
      ["Health", "health", "OTC wellness and first aid"],
    ].map(([name, slug, description]) => prisma.category.create({ data: { name, slug, description } }))
  );
  const cat = Object.fromEntries(categories.map((c) => [c.slug, c]));

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

  const vendorsData = [
    {
      companyName: "Apex Electronics Ltd",
      slug: "apex-electronics",
      contactEmail: "vendor@meridian.ng",
      contactPhone: "+2348031110001",
      taxId: "TIN-APX-8821",
      address: "Plot 12, Computer Village Extension",
      city: "Ikeja",
      state: "Lagos",
      category: "Electronics",
      description: "National distributor of consumer electronics, power accessories and computing peripherals.",
      leadTimeDays: 5,
      paymentTerms: "Net 21",
      status: "APPROVED",
      rating: 4.7,
      onTimeRate: 94,
      fulfillmentRate: 97,
      defectRate: 1.2,
    },
    {
      companyName: "Igbo-Ukwu Textiles",
      slug: "igbo-ukwu-textiles",
      contactEmail: "hello@igboukwutextiles.ng",
      contactPhone: "+2348032220002",
      taxId: "TIN-IGB-4410",
      address: "Main Market Annex",
      city: "Onitsha",
      state: "Anambra",
      category: "Fashion & Textiles",
      description: "Ankara, brocade and ready-to-wear sourced from Aba and Onitsha manufacturing clusters.",
      leadTimeDays: 8,
      paymentTerms: "Net 30",
      status: "APPROVED",
      rating: 4.5,
      onTimeRate: 88,
      fulfillmentRate: 93,
      defectRate: 2.1,
    },
    {
      companyName: "Savannah Grains Co-op",
      slug: "savannah-grains",
      contactEmail: "trade@savannahgrains.ng",
      contactPhone: "+2348033330003",
      taxId: "TIN-SVG-1904",
      address: "Dawanau Grain Market",
      city: "Kano",
      state: "Kano",
      category: "Food & Grocery",
      description: "Aggregates rice, beans, millet and packaged staples from northern cooperatives.",
      leadTimeDays: 10,
      paymentTerms: "Net 14",
      status: "APPROVED",
      rating: 4.3,
      onTimeRate: 81,
      fulfillmentRate: 90,
      defectRate: 3.4,
    },
    {
      companyName: "Nkem Beauty Labs",
      slug: "nkem-beauty",
      contactEmail: "orders@nkembeauty.ng",
      contactPhone: "+2348034440004",
      taxId: "TIN-NKM-7732",
      address: "Awka Industrial Cluster",
      city: "Awka",
      state: "Anambra",
      category: "Beauty & Personal Care",
      description: "Shea, black soap and modern personal-care SKUs manufactured in Awka.",
      leadTimeDays: 6,
      paymentTerms: "Net 30",
      status: "APPROVED",
      rating: 4.8,
      onTimeRate: 96,
      fulfillmentRate: 98,
      defectRate: 0.8,
    },
    {
      companyName: "Delta HomeWorks",
      slug: "delta-homeworks",
      contactEmail: "sales@deltahome.ng",
      contactPhone: "+2348035550005",
      taxId: "TIN-DHW-2201",
      address: "Sapele Road",
      city: "Benin City",
      state: "Edo",
      category: "Home & Living",
      description: "Kitchenware, storage and small furniture for urban households.",
      leadTimeDays: 12,
      paymentTerms: "Net 45",
      status: "PENDING",
      rating: 0,
      onTimeRate: 0,
      fulfillmentRate: 0,
      defectRate: 0,
    },
  ];

  const vendors = [];
  for (const v of vendorsData) vendors.push(await prisma.vendor.create({ data: v }));
  const vMap = Object.fromEntries(vendors.map((v) => [v.slug, v]));

  const admin = await prisma.user.create({
    data: {
      email: "admin@meridian.ng",
      passwordHash,
      fullName: "Adaeze Okonkwo",
      phone: "+2348010000001",
      role: "ADMIN",
    },
  });
  const vendorUser = await prisma.user.create({
    data: {
      email: "vendor@meridian.ng",
      passwordHash,
      fullName: "Chinedu Apex",
      phone: "+2348010000002",
      role: "VENDOR",
      vendorId: vMap["apex-electronics"].id,
    },
  });
  const warehouseUser = await prisma.user.create({
    data: {
      email: "warehouse@meridian.ng",
      passwordHash,
      fullName: "Halima Bello",
      phone: "+2348010000003",
      role: "WAREHOUSE",
      warehouseId: warehouses[0].id,
    },
  });
  const customer = await prisma.user.create({
    data: {
      email: "customer@meridian.ng",
      passwordHash,
      fullName: "Ifeanyi Nwosu",
      phone: "+2348010000004",
      role: "CUSTOMER",
    },
  });
  await prisma.user.create({
    data: {
      email: "nkem@meridian.ng",
      passwordHash,
      fullName: "Nkemdilim Eze",
      phone: "+2348010000005",
      role: "VENDOR",
      vendorId: vMap["nkem-beauty"].id,
    },
  });

  const productsSpec = [
    ["APX-CHG-20", "20W GaN Fast Charger", "electronics", "apex-electronics", 1250000, 780000, "A compact GaN wall charger with dual USB-C ports.", 0.18],
    ["APX-BUD-01", "AeroBuds Wireless Earbuds", "electronics", "apex-electronics", 2850000, 1700000, "Noise-isolating earbuds with 28-hour case life.", 0.12],
    ["APX-PWR-10", "10,000mAh Power Bank", "electronics", "apex-electronics", 980000, 540000, "Slim power bank with 22.5W output.", 0.28],
    ["APX-CBL-C", "USB-C Braided Cable 2m", "electronics", "apex-electronics", 320000, 140000, "Nylon-braided cable, 60W PD.", 0.08],
    ["IGB-ANK-06", "Ankara Six-Yard Bundle", "fashion-textiles", "igbo-ukwu-textiles", 1450000, 720000, "Premium wax print, six yards, mixed seasonal motifs.", 0.6],
    ["IGB-SHT-01", "Senator Native Set", "fashion-textiles", "igbo-ukwu-textiles", 3200000, 1800000, "Tailored two-piece senator set, sizes M–XXL.", 0.7],
    ["IGB-BAG-02", "Aba Leather Tote", "fashion-textiles", "igbo-ukwu-textiles", 2100000, 950000, "Hand-finished tote from Aba leather cluster.", 0.9],
    ["SVG-RCE-25", "Ofada Rice 25kg", "food-grocery", "savannah-grains", 4200000, 3100000, "Local ofada rice, mill-cleaned, 25kg sack.", 25],
    ["SVG-BNS-10", "Honey Beans 10kg", "food-grocery", "savannah-grains", 1850000, 1200000, "Oloyin beans, 10kg retail sack.", 10],
    ["SVG-OIL-5", "Red Palm Oil 5L", "food-grocery", "savannah-grains", 980000, 610000, "Unrefined red palm oil in food-grade jerry.", 5],
    ["NKM-SOAP-12", "Black Soap Bar 12-Pack", "beauty", "nkem-beauty", 540000, 240000, "Traditional black soap with shea, unscented.", 0.9],
    ["NKM-SHEA-500", "Whipped Shea Butter 500ml", "beauty", "nkem-beauty", 720000, 310000, "Unrefined shea whipped with vitamin E.", 0.52],
    ["NKM-OIL-100", "Castor Growth Oil 100ml", "beauty", "nkem-beauty", 380000, 150000, "Cold-pressed castor oil for hair and brows.", 0.12],
    ["NKM-LOT-250", "Cocoa Body Lotion 250ml", "beauty", "nkem-beauty", 450000, 190000, "Everyday lotion with cocoa and shea.", 0.28],
    ["DHW-BIN-40", "40L Kitchen Bin", "home-living", "delta-homeworks", 890000, 420000, "Pedal bin with soft-close lid.", 2.4],
  ];

  const products = [];
  for (const [sku, name, catSlug, vendorSlug, priceKobo, costKobo, description, weightKg] of productsSpec) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + sku.toLowerCase();
    const p = await prisma.product.create({
      data: {
        sku,
        name,
        slug,
        description,
        priceKobo,
        costKobo,
        weightKg,
        imageHint: name,
        status: vendorSlug === "delta-homeworks" ? "DRAFT" : "ACTIVE",
        vendorId: vMap[vendorSlug].id,
        categoryId: cat[catSlug].id,
      },
    });
    products.push(p);
  }

  const stockPlan = {
    "APX-CHG-20": [180, 90, 40],
    "APX-BUD-01": [60, 25, 18],
    "APX-PWR-10": [140, 70, 35],
    "APX-CBL-C": [400, 220, 90],
    "IGB-ANK-06": [55, 210, 20],
    "IGB-SHT-01": [30, 80, 12],
    "IGB-BAG-02": [18, 45, 8],
    "SVG-RCE-25": [90, 40, 70],
    "SVG-BNS-10": [120, 50, 85],
    "SVG-OIL-5": [75, 30, 40],
    "NKM-SOAP-12": [200, 160, 50],
    "NKM-SHEA-500": [110, 95, 28],
    "NKM-OIL-100": [160, 140, 40],
    "NKM-LOT-250": [90, 80, 22],
    "DHW-BIN-40": [0, 0, 0],
  };

  for (const p of products) {
    const qtys = stockPlan[p.sku] || [10, 10, 10];
    for (let i = 0; i < warehouses.length; i++) {
      const inv = await prisma.inventory.create({
        data: {
          productId: p.id,
          warehouseId: warehouses[i].id,
          quantity: qtys[i],
          reserved: i === 0 && qtys[i] > 20 ? 4 : 0,
          reorderPoint: p.weightKg > 5 ? 15 : 25,
          reorderQty: p.weightKg > 5 ? 40 : 80,
        },
      });
      if (qtys[i] > 0) {
        await prisma.stockMovement.create({
          data: {
            inventoryId: inv.id,
            type: "IN",
            quantity: qtys[i],
            reason: "Opening balance",
          },
        });
      }
    }
  }

  const charger = products.find((p) => p.sku === "APX-CHG-20");
  const buds = products.find((p) => p.sku === "APX-BUD-01");
  const shea = products.find((p) => p.sku === "NKM-SHEA-500");
  const rice = products.find((p) => p.sku === "SVG-RCE-25");
  const ankara = products.find((p) => p.sku === "IGB-ANK-06");

  const po1 = await prisma.purchaseOrder.create({
    data: {
      poNumber: "PO-2026-1042",
      vendorId: vMap["apex-electronics"].id,
      warehouseId: warehouses[0].id,
      status: "SENT",
      notes: "Restock ahead of weekend promo.",
      expectedDate: new Date(Date.now() + 5 * 86400000),
      subtotalKobo: 50 * 780000 + 40 * 1700000,
      items: {
        create: [
          { productId: charger.id, quantity: 50, unitCostKobo: 780000 },
          { productId: buds.id, quantity: 40, unitCostKobo: 1700000 },
        ],
      },
      createdAt: daysAgo(2),
    },
  });

  await prisma.purchaseOrder.create({
    data: {
      poNumber: "PO-2026-1038",
      vendorId: vMap["nkem-beauty"].id,
      warehouseId: warehouses[1].id,
      status: "RECEIVED",
      notes: "Monthly beauty replenishment.",
      expectedDate: daysAgo(3),
      subtotalKobo: 80 * 310000,
      items: {
        create: [{ productId: shea.id, quantity: 80, receivedQty: 80, unitCostKobo: 310000 }],
      },
      createdAt: daysAgo(10),
    },
  });

  await prisma.purchaseOrder.create({
    data: {
      poNumber: "PO-2026-1048",
      vendorId: vMap["savannah-grains"].id,
      warehouseId: warehouses[2].id,
      status: "ACKNOWLEDGED",
      notes: "Abuja depot dry goods.",
      expectedDate: new Date(Date.now() + 8 * 86400000),
      subtotalKobo: 30 * 3100000,
      items: {
        create: [{ productId: rice.id, quantity: 30, unitCostKobo: 3100000 }],
      },
      createdAt: daysAgo(1),
    },
  });

  const order1 = await prisma.customerOrder.create({
    data: {
      orderNumber: "ORD-2026-55102",
      customerId: customer.id,
      status: "PROCESSING",
      paymentStatus: "PAID",
      shippingName: "Ifeanyi Nwosu",
      shippingPhone: "+2348010000004",
      shippingAddress: "14 Zik Avenue",
      shippingCity: "Awka",
      shippingState: "Anambra",
      subtotalKobo: 1250000 + 720000,
      shippingKobo: 250000,
      totalKobo: 2220000,
      items: {
        create: [
          { productId: charger.id, quantity: 1, unitPriceKobo: 1250000 },
          { productId: shea.id, quantity: 1, unitPriceKobo: 720000 },
        ],
      },
      createdAt: daysAgo(1),
    },
  });

  await prisma.customerOrder.create({
    data: {
      orderNumber: "ORD-2026-54881",
      customerId: customer.id,
      status: "DELIVERED",
      paymentStatus: "PAID",
      shippingName: "Ifeanyi Nwosu",
      shippingPhone: "+2348010000004",
      shippingAddress: "14 Zik Avenue",
      shippingCity: "Awka",
      shippingState: "Anambra",
      subtotalKobo: 1450000,
      shippingKobo: 250000,
      totalKobo: 1700000,
      items: {
        create: [{ productId: ankara.id, quantity: 1, unitPriceKobo: 1450000 }],
      },
      createdAt: daysAgo(12),
    },
  });

  await prisma.customerOrder.create({
    data: {
      orderNumber: "ORD-2026-55210",
      customerId: customer.id,
      status: "PENDING",
      paymentStatus: "PAID",
      shippingName: "Ifeanyi Nwosu",
      shippingPhone: "+2348010000004",
      shippingAddress: "14 Zik Avenue",
      shippingCity: "Awka",
      shippingState: "Anambra",
      subtotalKobo: 2850000,
      shippingKobo: 250000,
      totalKobo: 3100000,
      items: {
        create: [{ productId: buds.id, quantity: 1, unitPriceKobo: 2850000 }],
      },
    },
  });

  await prisma.shipment.create({
    data: {
      trackingNumber: "MRD-7K2Q9A",
      type: "OUTBOUND",
      carrier: "GIG Logistics",
      status: "IN_TRANSIT",
      origin: "Lagos, Lagos",
      destination: "Awka, Anambra",
      warehouseId: warehouses[0].id,
      orderId: order1.id,
      eta: new Date(Date.now() + 2 * 86400000),
    },
  });

  await prisma.shipment.create({
    data: {
      trackingNumber: "MRD-INB1042",
      type: "INBOUND",
      carrier: "Meridian Freight",
      status: "IN_TRANSIT",
      origin: "Ikeja, Lagos",
      destination: "Lagos, Lagos",
      warehouseId: warehouses[0].id,
      purchaseOrderId: po1.id,
      eta: new Date(Date.now() + 4 * 86400000),
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: admin.id,
        title: "Vendor awaiting review",
        body: "Delta HomeWorks applied to join the supply network.",
        type: "ALERT",
      },
      {
        userId: vendorUser.id,
        title: "Purchase order PO-2026-1042",
        body: "Lagos Fulfilment Centre requested 90 units across 2 SKUs.",
        type: "INFO",
      },
      {
        userId: warehouseUser.id,
        title: "Low stock: AeroBuds",
        body: "Abuja depot is below reorder point for APX-BUD-01.",
        type: "ALERT",
      },
      {
        userId: customer.id,
        title: "Order ORD-2026-55102 is processing",
        body: "Your charger and shea butter are being packed in Lagos.",
        type: "SUCCESS",
      },
    ],
  });

  console.log("Seeded Meridian demo data.");
  console.log("Accounts (password: Password123!):");
  console.log("  admin@meridian.ng       ADMIN");
  console.log("  vendor@meridian.ng      VENDOR (Apex Electronics)");
  console.log("  warehouse@meridian.ng   WAREHOUSE (Lagos FC)");
  console.log("  customer@meridian.ng    CUSTOMER");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
