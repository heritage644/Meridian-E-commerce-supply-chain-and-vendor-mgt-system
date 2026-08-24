function koboToNaira(kobo) {
  return Math.round(kobo) / 100;
}

function formatNaira(kobo) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(koboToNaira(kobo));
}

function poNumber() {
  const n = Math.floor(Math.random() * 9000) + 1000;
  return `PO-${new Date().getFullYear()}-${n}`;
}

function orderNumber() {
  const n = Math.floor(Math.random() * 90000) + 10000;
  return `ORD-${new Date().getFullYear()}-${n}`;
}

function trackingNumber() {
  const n = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `MRD-${n}`;
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

module.exports = { koboToNaira, formatNaira, poNumber, orderNumber, trackingNumber, slugify };
