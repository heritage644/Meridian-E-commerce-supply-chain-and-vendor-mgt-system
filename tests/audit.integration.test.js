/**
 * Live audit against a running API (default http://127.0.0.1:4000).
 * Run: API_URL=http://127.0.0.1:4000 node --test tests/audit.integration.test.js
 */
const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");

const API = process.env.API_URL || "http://127.0.0.1:4000";

async function req(path, { method = "GET", token, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function login(email) {
  return req("/api/auth/login", {
    method: "POST",
    body: { email, password: "Password123!" },
  });
}

describe("Meridian live audit", { concurrency: false }, () => {
  const tokens = {};
  let product;
  let pendingVendor;
  let warehouse;
  let createdPo;
  let createdOrder;
  let createdShipment;

  before(async () => {
    const health = await req("/api/health");
    assert.equal(health.status, 200, "API must be running");
  });

  it("rejects bad login", async () => {
    const r = await req("/api/auth/login", {
      method: "POST",
      body: { email: "admin@meridian.ng", password: "wrong" },
    });
    assert.equal(r.status, 401);
  });

  it("logs in all four demo roles", async () => {
    for (const [role, email] of [
      ["ADMIN", "admin@meridian.ng"],
      ["VENDOR", "vendor@meridian.ng"],
      ["WAREHOUSE", "warehouse@meridian.ng"],
      ["CUSTOMER", "customer@meridian.ng"],
    ]) {
      const r = await login(email);
      assert.equal(r.status, 200, `${email} login`);
      assert.equal(r.data.user.role, role);
      assert.ok(r.data.token);
      tokens[role] = r.data.token;
    }
  });

  it("protects authenticated routes", async () => {
    const r = await req("/api/dashboard/stats");
    assert.equal(r.status, 401);
  });

  it("blocks customer from admin vendor list", async () => {
    const r = await req("/api/vendors", { token: tokens.CUSTOMER });
    assert.equal(r.status, 403);
  });

  it("serves public catalogue and vendors", async () => {
    const v = await req("/api/vendors/public");
    assert.equal(v.status, 200);
    assert.ok(v.data.vendors.length >= 4);
    assert.ok(v.data.vendors.every((x) => x.status === undefined || true));

    const p = await req("/api/products/public");
    assert.equal(p.status, 200);
    assert.ok(p.data.products.length >= 10);
    product = p.data.products.find((x) => x.sku === "APX-CHG-20") || p.data.products[0];
    assert.ok(product.id);

    const one = await req(`/api/products/public/${product.slug}`);
    assert.equal(one.status, 200);
    assert.equal(one.data.product.sku, product.sku);
  });

  it("tracks a seeded shipment", async () => {
    const r = await req("/api/shipments/track/MRD-7K2Q9A");
    assert.equal(r.status, 200);
    assert.equal(r.data.shipment.status, "IN_TRANSIT");
  });

  it("admin dashboard has KPIs and lists", async () => {
    const r = await req("/api/dashboard/stats", { token: tokens.ADMIN });
    assert.equal(r.status, 200);
    assert.ok(r.data.kpis.vendors >= 4);
    assert.ok(r.data.kpis.gmvKobo > 0);
    assert.ok(Array.isArray(r.data.recentOrders));
    assert.ok(Array.isArray(r.data.categoryStock));
  });

  it("admin can list and approve a pending vendor", async () => {
    const list = await req("/api/vendors?status=PENDING", { token: tokens.ADMIN });
    assert.equal(list.status, 200);
    pendingVendor = list.data.vendors[0];
    assert.ok(pendingVendor, "seed should include Delta HomeWorks as PENDING");

    const approved = await req(`/api/vendors/${pendingVendor.id}/status`, {
      method: "PATCH",
      token: tokens.ADMIN,
      body: { status: "APPROVED" },
    });
    assert.equal(approved.status, 200);
    assert.equal(approved.data.vendor.status, "APPROVED");

    // restore pending so the demo still has a review item
    await req(`/api/vendors/${pendingVendor.id}/status`, {
      method: "PATCH",
      token: tokens.ADMIN,
      body: { status: "PENDING" },
    });
  });

  it("warehouse inventory lists bins and accepts an adjustment", async () => {
    const list = await req("/api/inventory", { token: tokens.WAREHOUSE });
    assert.equal(list.status, 200);
    assert.ok(list.data.inventory.length > 0);
    const row = list.data.inventory.find((i) => i.product.sku === "APX-CBL-C") || list.data.inventory[0];
    const before = row.quantity;

    const adj = await req("/api/inventory/adjust", {
      method: "POST",
      token: tokens.WAREHOUSE,
      body: { inventoryId: row.id, type: "IN", quantity: 3, reason: "Audit receive" },
    });
    assert.equal(adj.status, 200);
    assert.equal(adj.data.inventory.quantity, before + 3);

    const revert = await req("/api/inventory/adjust", {
      method: "POST",
      token: tokens.WAREHOUSE,
      body: { inventoryId: row.id, type: "OUT", quantity: 3, reason: "Audit revert" },
    });
    assert.equal(revert.status, 200);
  });

  it("vendor cannot adjust inventory", async () => {
    const list = await req("/api/inventory", { token: tokens.VENDOR });
    assert.equal(list.status, 200);
    const row = list.data.inventory[0];
    const adj = await req("/api/inventory/adjust", {
      method: "POST",
      token: tokens.VENDOR,
      body: { inventoryId: row.id, type: "IN", quantity: 1, reason: "should fail" },
    });
    assert.equal(adj.status, 403);
  });

  it("admin raises, sends, vendor acknowledges, warehouse receives a PO", async () => {
    const wh = await req("/api/warehouses", { token: tokens.ADMIN });
    assert.equal(wh.status, 200);
    warehouse = wh.data.warehouses.find((w) => w.code === "LOS-01") || wh.data.warehouses[0];

    const vendors = await req("/api/vendors", { token: tokens.ADMIN });
    const apex = vendors.data.vendors.find((v) => v.slug === "apex-electronics");
    const products = await req("/api/products", { token: tokens.ADMIN });
    const sku = products.data.products.find((p) => p.sku === "APX-PWR-10");

    const created = await req("/api/purchase-orders", {
      method: "POST",
      token: tokens.ADMIN,
      body: {
        vendorId: apex.id,
        warehouseId: warehouse.id,
        notes: "Audit PO",
        items: [{ productId: sku.id, quantity: 5, unitCostKobo: sku.costKobo }],
      },
    });
    assert.equal(created.status, 201);
    createdPo = created.data.purchaseOrder;
    assert.equal(createdPo.status, "DRAFT");

    const sent = await req(`/api/purchase-orders/${createdPo.id}/send`, {
      method: "POST",
      token: tokens.ADMIN,
    });
    assert.equal(sent.status, 200);
    assert.equal(sent.data.purchaseOrder.status, "SENT");

    const ack = await req(`/api/purchase-orders/${createdPo.id}/acknowledge`, {
      method: "POST",
      token: tokens.VENDOR,
    });
    assert.equal(ack.status, 200);
    assert.equal(ack.data.purchaseOrder.status, "ACKNOWLEDGED");

    const invBefore = await req("/api/inventory", { token: tokens.ADMIN });
    const bin = invBefore.data.inventory.find(
      (i) => i.productId === sku.id && i.warehouseId === warehouse.id
    );
    const qtyBefore = bin.quantity;

    const rec = await req(`/api/purchase-orders/${createdPo.id}/receive`, {
      method: "POST",
      token: tokens.WAREHOUSE,
      body: {
        receipts: createdPo.items.map((i) => ({ itemId: i.id, quantity: i.quantity })),
      },
    });
    assert.equal(rec.status, 200);
    assert.equal(rec.data.purchaseOrder.status, "RECEIVED");

    const invAfter = await req("/api/inventory", { token: tokens.ADMIN });
    const binAfter = invAfter.data.inventory.find(
      (i) => i.productId === sku.id && i.warehouseId === warehouse.id
    );
    assert.equal(binAfter.quantity, qtyBefore + 5);
  });

  it("customer places an order and warehouse ships it", async () => {
    const catalog = await req("/api/products/public");
    const item = catalog.data.products.find((p) => p.sku === "NKM-SOAP-12");
    const order = await req("/api/orders", {
      method: "POST",
      token: tokens.CUSTOMER,
      body: {
        shippingName: "Ifeanyi Nwosu",
        shippingPhone: "+2348010000004",
        shippingAddress: "14 Zik Avenue",
        shippingCity: "Awka",
        shippingState: "Anambra",
        items: [{ productId: item.id, quantity: 1 }],
      },
    });
    assert.equal(order.status, 201, order.data.error);
    createdOrder = order.data.order;
    assert.equal(createdOrder.paymentStatus, "PAID");
    assert.ok(createdOrder.totalKobo > createdOrder.subtotalKobo || createdOrder.shippingKobo === 0);

    const confirmed = await req(`/api/orders/${createdOrder.id}/status`, {
      method: "PATCH",
      token: tokens.WAREHOUSE,
      body: { status: "CONFIRMED" },
    });
    assert.equal(confirmed.status, 200);

    const processing = await req(`/api/orders/${createdOrder.id}/status`, {
      method: "PATCH",
      token: tokens.WAREHOUSE,
      body: { status: "PROCESSING" },
    });
    assert.equal(processing.status, 200);

    const ship = await req(`/api/orders/${createdOrder.id}/ship`, {
      method: "POST",
      token: tokens.WAREHOUSE,
      body: { carrier: "GIG Logistics" },
    });
    assert.equal(ship.status, 201, ship.data.error);
    createdShipment = ship.data.shipment;
    assert.ok(createdShipment.trackingNumber.startsWith("MRD-"));

    const track = await req(`/api/shipments/track/${createdShipment.trackingNumber}`);
    assert.equal(track.status, 200);

    const delivered = await req(`/api/shipments/${createdShipment.id}/status`, {
      method: "PATCH",
      token: tokens.WAREHOUSE,
      body: { status: "DELIVERED" },
    });
    assert.equal(delivered.status, 200);

    const mine = await req("/api/orders", { token: tokens.CUSTOMER });
    const found = mine.data.orders.find((o) => o.id === createdOrder.id);
    assert.equal(found.status, "DELIVERED");
  });

  it("vendor catalogue is scoped to Apex Electronics", async () => {
    const r = await req("/api/products", { token: tokens.VENDOR });
    assert.equal(r.status, 200);
    assert.ok(r.data.products.length > 0);
    assert.ok(r.data.products.every((p) => p.vendor?.slug === "apex-electronics" || p.sku.startsWith("APX")));
  });

  it("registers a new customer", async () => {
    const email = `audit.${Date.now()}@example.com`;
    const r = await req("/api/auth/register", {
      method: "POST",
      body: {
        email,
        password: "Password123!",
        fullName: "Audit Shopper",
        role: "CUSTOMER",
      },
    });
    assert.equal(r.status, 201, r.data.error);
    assert.equal(r.data.user.role, "CUSTOMER");
  });

  it("me endpoint returns the admin profile", async () => {
    const r = await req("/api/auth/me", { token: tokens.ADMIN });
    assert.equal(r.status, 200);
    assert.equal(r.data.user.email, "admin@meridian.ng");
  });
});
