import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";
import { indexProduct } from "../lib/meilisearch";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "DemoPass123!";
const ADMIN_TOTP_SECRET = "HMZUCEQ5PBMQY7AL";
const SUPPLIER_TOTP_SECRET = "HN5AAXCACBFCA6JA";

async function main() {
  const passwordHash = await argon2.hash(DEMO_PASSWORD, { type: argon2.argon2id });

  await prisma.chatMessage.deleteMany();
  await prisma.productWatch.deleteMany();
  await prisma.product.deleteMany();
  await prisma.order.deleteMany();
  await prisma.escrow.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  await prisma.company.create({
    data: {
      legalName: "Zovi Platform Operations",
      taxId: "PLATFORM0001",
      country: "GR",
      status: "ACTIVE",
      users: {
        create: {
          email: "admin@zovi.test",
          passwordHash,
          role: "SUPER_ADMIN",
          totpSecret: ADMIN_TOTP_SECRET,
          totpEnabled: true,
        },
      },
    },
    include: { users: true },
  });

  const buyerCo = await prisma.company.create({
    data: {
      legalName: "Hellenic Retail Supplies SA",
      taxId: "094123456",
      country: "GR",
      status: "ACTIVE",
      address: "Leoforos Kifisias 100, 15125 Athens",
      activity: "Wholesale of household goods",
      users: {
        create: {
          email: "buyer@zovi.test",
          passwordHash,
          role: "BUYER",
        },
      },
    },
    include: { users: true },
  });

  const supplierCo = await prisma.company.create({
    data: {
      legalName: "Aegean Manufacturing Ltd",
      taxId: "094654321",
      country: "GR",
      status: "ACTIVE",
      address: "25is Martiou 42, 54625 Thessaloniki",
      activity: "Manufacture of furniture",
      users: {
        create: {
          email: "supplier@zovi.test",
          passwordHash,
          role: "SUPPLIER",
          totpSecret: SUPPLIER_TOTP_SECRET,
          totpEnabled: true,
        },
      },
    },
    include: { users: true },
  });

  const buyer = buyerCo.users[0];
  const supplier = supplierCo.users[0];

  const escrow1 = await prisma.escrow.create({
    data: { vivaReference: "VIVA-DEMO-0001", heldCents: 480000 },
  });
  const escrow2 = await prisma.escrow.create({
    data: { vivaReference: "VIVA-DEMO-0002", heldCents: 125000 },
  });

  const orderAwaiting = await prisma.order.create({
    data: {
      buyerId: buyer.id,
      supplierId: supplier.id,
      merchandiseCents: 480000,
      status: "AWAITING_FREIGHT_QUOTE",
      escrowId: escrow1.id,
    },
  });

  const orderQuoted = await prisma.order.create({
    data: {
      buyerId: buyer.id,
      supplierId: supplier.id,
      merchandiseCents: 125000,
      freightCents: 25000,
      status: "FREIGHT_QUOTED",
      escrowId: escrow2.id,
    },
  });

  const escrow3 = await prisma.escrow.create({
    data: { vivaReference: "VIVA-DEMO-0003", heldCents: 92000, releasedCents: 92000 },
  });
  const orderInTransit = await prisma.order.create({
    data: {
      buyerId: buyer.id,
      supplierId: supplier.id,
      merchandiseCents: 90000,
      freightCents: 2000,
      status: "IN_TRANSIT",
      escrowId: escrow3.id,
    },
  });

  await prisma.order.create({
    data: {
      buyerId: buyer.id,
      supplierId: supplier.id,
      merchandiseCents: 34000,
      status: "CANCELLED",
    },
  });

  await prisma.contract.create({
    data: {
      buyerId: buyer.id,
      supplierId: supplier.id,
      feeRateBps: 150,
      status: "PAYMENT_DELINQUENT",
      nextBillingAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.contract.create({
    data: {
      buyerId: buyer.id,
      supplierId: supplier.id,
      feeRateBps: 100,
      status: "ACTIVE",
      nextBillingAt: new Date(Date.now() + 27 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.chatMessage.create({
    data: {
      orderId: orderInTransit.id,
      senderId: buyer.id,
      rawContent: "Hi, can you confirm the delivery window for next week?",
      maskedContent: "Hi, can you confirm the delivery window for next week?",
      flagged: false,
    },
  });

  await prisma.chatMessage.create({
    data: {
      orderId: orderInTransit.id,
      senderId: supplier.id,
      rawContent: "Sure, call me on 6971234567 or email me at sales@aegeanmfg.gr to sort it out directly.",
      maskedContent: "Sure, call me on ********** or email me at ********** to sort it out directly.",
      flagged: true,
    },
  });

  await prisma.chatMessage.create({
    data: {
      orderId: orderQuoted.id,
      senderId: buyer.id,
      rawContent: "My IBAN is GR1601101250000000012300695, please send the invoice there.",
      maskedContent: "My IBAN is **********, please send the invoice there.",
      flagged: true,
    },
  });

  const products = await Promise.all([
    prisma.product.create({
      data: {
        supplierId: supplier.id,
        name: "Industrial Oak Pallet Rack",
        description:
          "Heavy-duty modular pallet racking system, powder-coated steel, rated for 2000kg per level. Suitable for warehouse and cold-storage environments.",
        sku: "AGM-RACK-2000",
        priceCents: 84000,
        stockQty: 120,
        category: "Warehouse Equipment",
      },
    }),
    prisma.product.create({
      data: {
        supplierId: supplier.id,
        name: "CNC Oak Dining Table Frame",
        description:
          "Precision CNC-cut solid oak table frame, kiln-dried, ready for assembly. Wholesale lot pricing available on request.",
        sku: "AGM-TABLE-OAK-01",
        priceCents: 32500,
        stockQty: 45,
        category: "Furniture Components",
      },
    }),
    prisma.product.create({
      data: {
        supplierId: supplier.id,
        name: "Marine-Grade Plywood Sheet 18mm",
        description:
          "BS1088 certified marine-grade plywood, 18mm thickness, 2440x1220mm sheets. Water-resistant WBP glue bonding.",
        sku: "AGM-PLY-18MM",
        priceCents: 5600,
        stockQty: 800,
        category: "Raw Materials",
      },
    }),
    prisma.product.create({
      data: {
        supplierId: supplier.id,
        name: "Stainless Steel Furniture Hinges (Box of 100)",
        description:
          "Corrosion-resistant 316-grade stainless steel concealed hinges, soft-close mechanism. Bulk packaging for manufacturers.",
        sku: "AGM-HINGE-SS316",
        priceCents: 14200,
        stockQty: 0,
        category: "Hardware",
        status: "OUT_OF_STOCK",
      },
    }),
  ]);

  for (const product of products) {
    await indexProduct({
      id: product.id,
      name: product.name,
      description: product.description,
      sku: product.sku,
      category: product.category,
      priceCents: product.priceCents,
      currency: product.currency,
      imageUrl: product.imageUrl,
      status: product.status,
      supplierName: supplierCo.legalName,
    }).catch((error) => {
      console.warn(`Could not index product ${product.sku} in Meilisearch:`, error.message);
    });
  }

  await prisma.productWatch.create({
    data: { userId: buyer.id, productId: products[0].id },
  });

  console.log("Seed complete.");
  console.log(`Admin:    admin@zovi.test / ${DEMO_PASSWORD} (TOTP secret: ${ADMIN_TOTP_SECRET})`);
  console.log(`Buyer:    buyer@zovi.test / ${DEMO_PASSWORD}`);
  console.log(`Supplier: supplier@zovi.test / ${DEMO_PASSWORD} (TOTP secret: ${SUPPLIER_TOTP_SECRET})`);
  console.log({ orderAwaiting: orderAwaiting.id, orderQuoted: orderQuoted.id, orderInTransit: orderInTransit.id });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
