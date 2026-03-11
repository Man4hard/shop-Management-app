import { db } from "./db";
import { businesses, categories, products, customers, bills, billItems } from "@shared/schema";

export async function seedDatabase() {
  const existingBiz = await db.select().from(businesses).limit(1);
  if (existingBiz.length > 0) return;

  await db.insert(businesses).values({
    name: "Super Store",
    address: "Main Market, Lahore",
    phone: "0300-1234567",
    language: "en",
    currency: "PKR",
    theme: "light",
  });

  const [grocery, beverages, dairy, household] = await Promise.all([
    db.insert(categories).values({ name: "Grocery", nameUrdu: "" }).returning(),
    db.insert(categories).values({ name: "Beverages", nameUrdu: "" }).returning(),
    db.insert(categories).values({ name: "Dairy", nameUrdu: "" }).returning(),
    db.insert(categories).values({ name: "Household", nameUrdu: "" }).returning(),
  ]);

  const productData = [
    { name: "Basmati Rice 5kg", barcode: "8901234560001", categoryId: grocery[0].id, costPrice: "850", salePrice: "1050", stock: 45, lowStockThreshold: 10, unit: "bag" },
    { name: "Cooking Oil 5L", barcode: "8901234560002", categoryId: grocery[0].id, costPrice: "1800", salePrice: "2100", stock: 30, lowStockThreshold: 8, unit: "bottle" },
    { name: "Sugar 1kg", barcode: "8901234560003", categoryId: grocery[0].id, costPrice: "120", salePrice: "150", stock: 80, lowStockThreshold: 15, unit: "kg" },
    { name: "Flour 10kg", barcode: "8901234560004", categoryId: grocery[0].id, costPrice: "900", salePrice: "1100", stock: 25, lowStockThreshold: 10, unit: "bag" },
    { name: "Pepsi 1.5L", barcode: "8901234560005", categoryId: beverages[0].id, costPrice: "120", salePrice: "160", stock: 60, lowStockThreshold: 12, unit: "bottle" },
    { name: "Nestle Water 1.5L", barcode: "8901234560006", categoryId: beverages[0].id, costPrice: "50", salePrice: "70", stock: 100, lowStockThreshold: 20, unit: "bottle" },
    { name: "Fresh Milk 1L", barcode: "8901234560007", categoryId: dairy[0].id, costPrice: "180", salePrice: "220", stock: 3, lowStockThreshold: 5, unit: "pack" },
    { name: "Butter 200g", barcode: "8901234560008", categoryId: dairy[0].id, costPrice: "350", salePrice: "420", stock: 2, lowStockThreshold: 5, unit: "pack" },
    { name: "Dish Soap 500ml", barcode: "8901234560009", categoryId: household[0].id, costPrice: "180", salePrice: "250", stock: 35, lowStockThreshold: 8, unit: "bottle" },
    { name: "Laundry Detergent 1kg", barcode: "8901234560010", categoryId: household[0].id, costPrice: "280", salePrice: "380", stock: 20, lowStockThreshold: 5, unit: "pack" },
  ];

  const insertedProducts = [];
  for (const p of productData) {
    const [prod] = await db.insert(products).values(p).returning();
    insertedProducts.push(prod);
  }

  const customerData = [
    { name: "Ahmed Khan", phone: "0301-5551234", address: "House 45, Block B, Lahore", balance: "2500" },
    { name: "Fatima Bibi", phone: "0312-6667890", address: "Street 12, Model Town", balance: "-350" },
    { name: "Usman Ali", phone: "0333-7778901", address: "Shop 3, Mall Road", balance: "1560" },
    { name: "Ayesha Noor", phone: "0345-8889012", address: "Flat 7, Garden Town", balance: "0" },
    { name: "Hassan Raza", phone: "0300-9990123", address: "Plot 22, DHA Phase 5", balance: "-1200" },
  ];

  for (const c of customerData) {
    await db.insert(customers).values(c);
  }

  const now = new Date();
  for (let i = 0; i < 15; i++) {
    const billDate = new Date(now);
    billDate.setDate(billDate.getDate() - Math.floor(Math.random() * 30));
    billDate.setHours(Math.floor(Math.random() * 12) + 8, Math.floor(Math.random() * 60));

    const numItems = Math.floor(Math.random() * 4) + 1;
    const selectedProducts = [];
    const usedIndices = new Set<number>();
    for (let j = 0; j < numItems; j++) {
      let idx;
      do {
        idx = Math.floor(Math.random() * insertedProducts.length);
      } while (usedIndices.has(idx));
      usedIndices.add(idx);
      const qty = Math.floor(Math.random() * 3) + 1;
      selectedProducts.push({ product: insertedProducts[idx], quantity: qty });
    }

    let subtotal = 0;
    let profit = 0;
    const items = selectedProducts.map((sp) => {
      const total = parseFloat(sp.product.salePrice) * sp.quantity;
      const costTotal = parseFloat(sp.product.costPrice) * sp.quantity;
      subtotal += total;
      profit += total - costTotal;
      return {
        productId: sp.product.id,
        productName: sp.product.name,
        quantity: sp.quantity,
        costPrice: sp.product.costPrice,
        salePrice: sp.product.salePrice,
        total: total.toString(),
      };
    });

    const billNum = `BILL-${String(i + 1).padStart(4, "0")}`;
    const [bill] = await db.insert(bills).values({
      billNumber: billNum,
      customerName: "Walk-in Customer",
      subtotal: subtotal.toString(),
      discount: "0",
      total: subtotal.toString(),
      profit: profit.toString(),
      paymentMethod: "cash",
      status: "completed",
      createdAt: billDate,
    }).returning();

    for (const item of items) {
      await db.insert(billItems).values({ ...item, billId: bill.id });
    }
  }

  console.log("Database seeded successfully!");
}
