import { db } from "./db";
import { eq, desc, sql, gte, lte, and, inArray } from "drizzle-orm";
import {
  businesses, categories, products, customers, bills, billItems,
  type InsertBusiness, type Business,
  type InsertCategory, type Category,
  type InsertProduct, type Product,
  type InsertCustomer, type Customer,
  type InsertBill, type Bill,
  type InsertBillItem, type BillItem,
} from "@shared/schema";

export interface IStorage {
  getBusiness(): Promise<Business | undefined>;
  updateBusiness(data: Partial<InsertBusiness>): Promise<Business>;

  getCategories(): Promise<Category[]>;
  createCategory(data: InsertCategory): Promise<Category>;
  deleteCategory(id: number): Promise<void>;

  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  getProductByBarcode(barcode: string): Promise<Product | undefined>;
  createProduct(data: InsertProduct): Promise<Product>;
  updateProduct(id: number, data: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: number): Promise<void>;
  getLowStockProducts(): Promise<Product[]>;

  getCustomers(): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  createCustomer(data: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, data: Partial<InsertCustomer>): Promise<Customer>;
  deleteCustomer(id: number): Promise<void>;

  getBills(): Promise<Bill[]>;
  getBill(id: number): Promise<Bill | undefined>;
  createBill(data: InsertBill, items: InsertBillItem[]): Promise<Bill>;
  getBillItems(billId: number): Promise<BillItem[]>;
  getBillsByDateRange(start: Date, end: Date): Promise<Bill[]>;

  getDashboardStats(): Promise<{
    todaySales: number;
    todayProfit: number;
    todayOrders: number;
    totalProfit: number;
  }>;

  getReportStats(start: Date, end: Date): Promise<{
    totalSales: number;
    totalProfit: number;
    totalOrders: number;
    chartData: { date: string; sales: number; profit: number }[];
  }>;
}

export class DatabaseStorage implements IStorage {
  async getBusiness(): Promise<Business | undefined> {
    const [biz] = await db.select().from(businesses).limit(1);
    return biz;
  }

  async updateBusiness(data: Partial<InsertBusiness>): Promise<Business> {
    let biz = await this.getBusiness();
    if (!biz) {
      const [created] = await db.insert(businesses).values(data as InsertBusiness).returning();
      return created;
    }
    const [updated] = await db.update(businesses).set(data).where(eq(businesses.id, biz.id)).returning();
    return updated;
  }

  async getCategories(): Promise<Category[]> {
    return db.select().from(categories);
  }

  async createCategory(data: InsertCategory): Promise<Category> {
    const [cat] = await db.insert(categories).values(data).returning();
    return cat;
  }

  async deleteCategory(id: number): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  async getProducts(): Promise<Product[]> {
    return db.select().from(products).orderBy(desc(products.createdAt));
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async getProductByBarcode(barcode: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.barcode, barcode));
    return product;
  }

  async createProduct(data: InsertProduct): Promise<Product> {
    const [product] = await db.insert(products).values(data).returning();
    return product;
  }

  async updateProduct(id: number, data: Partial<InsertProduct>): Promise<Product> {
    const [product] = await db.update(products).set(data).where(eq(products.id, id)).returning();
    return product;
  }

  async deleteProduct(id: number): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  async getLowStockProducts(): Promise<Product[]> {
    return db.select().from(products).where(
      sql`${products.stock} <= ${products.lowStockThreshold}`
    );
  }

  async getCustomers(): Promise<Customer[]> {
    return db.select().from(customers).orderBy(desc(customers.createdAt));
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }

  async createCustomer(data: InsertCustomer): Promise<Customer> {
    const [customer] = await db.insert(customers).values(data).returning();
    return customer;
  }

  async updateCustomer(id: number, data: Partial<InsertCustomer>): Promise<Customer> {
    const [customer] = await db.update(customers).set(data).where(eq(customers.id, id)).returning();
    return customer;
  }

  async deleteCustomer(id: number): Promise<void> {
    await db.delete(customers).where(eq(customers.id, id));
  }

  async getBills(): Promise<Bill[]> {
    return db.select().from(bills).orderBy(desc(bills.createdAt));
  }

  async getBill(id: number): Promise<Bill | undefined> {
    const [bill] = await db.select().from(bills).where(eq(bills.id, id));
    return bill;
  }

  async createBill(data: InsertBill, items: InsertBillItem[]): Promise<Bill> {
    const result = await db.transaction(async (tx) => {
      if (items.length === 0) {
        const [bill] = await tx.insert(bills).values(data).returning();
        return bill;
      }

      const productIds = items.map((item) => item.productId);
      const stockProducts = await tx
        .select({ id: products.id, stock: products.stock, name: products.name })
        .from(products)
        .where(inArray(products.id, productIds));

      const stockMap = new Map(stockProducts.map((p) => [p.id, p]));

      for (const item of items) {
        const product = stockMap.get(item.productId);
        const qty = item.quantity ?? 1;
        if (!product || product.stock < qty) {
          throw new Error(`Insufficient stock for ${item.productName}. Available: ${product?.stock || 0}`);
        }
      }

      const [bill] = await tx.insert(bills).values(data).returning();

      const itemsWithBillId = items.map((item) => ({ ...item, billId: bill.id }));
      await tx.insert(billItems).values(itemsWithBillId);

      for (const item of items) {
        await tx.update(products)
          .set({ stock: sql`${products.stock} - ${item.quantity}` })
          .where(eq(products.id, item.productId));
      }

      if (data.customerId && data.paymentMethod === "credit") {
        await tx.update(customers)
          .set({ balance: sql`${customers.balance} + ${data.total}` })
          .where(eq(customers.id, data.customerId));
      }

      return bill;
    });

    return result;
  }

  async getBillItems(billId: number): Promise<BillItem[]> {
    return db.select().from(billItems).where(eq(billItems.billId, billId));
  }

  async getBillsByDateRange(start: Date, end: Date): Promise<Bill[]> {
    return db.select().from(bills).where(
      and(gte(bills.createdAt, start), lte(bills.createdAt, end))
    ).orderBy(desc(bills.createdAt));
  }

  async getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayStats] = await db
      .select({
        sales: sql<string>`COALESCE(SUM(${bills.total}::numeric), 0)`,
        profit: sql<string>`COALESCE(SUM(${bills.profit}::numeric), 0)`,
        orders: sql<number>`COUNT(*)::int`,
      })
      .from(bills)
      .where(and(gte(bills.createdAt, today), lte(bills.createdAt, tomorrow)));

    const [allTimeStats] = await db
      .select({
        profit: sql<string>`COALESCE(SUM(${bills.profit}::numeric), 0)`,
      })
      .from(bills);

    return {
      todaySales: parseFloat(todayStats?.sales || "0"),
      todayProfit: parseFloat(todayStats?.profit || "0"),
      todayOrders: todayStats?.orders || 0,
      totalProfit: parseFloat(allTimeStats?.profit || "0"),
    };
  }

  async getReportStats(start: Date, end: Date) {
    const [totals] = await db
      .select({
        totalSales: sql<string>`COALESCE(SUM(${bills.total}::numeric), 0)`,
        totalProfit: sql<string>`COALESCE(SUM(${bills.profit}::numeric), 0)`,
        totalOrders: sql<number>`COUNT(*)::int`,
      })
      .from(bills)
      .where(and(gte(bills.createdAt, start), lte(bills.createdAt, end)));

    const dailyRows = await db
      .select({
        date: sql<string>`TO_CHAR(${bills.createdAt}, 'MM/DD/YYYY')`,
        sales: sql<string>`SUM(${bills.total}::numeric)`,
        profit: sql<string>`SUM(${bills.profit}::numeric)`,
      })
      .from(bills)
      .where(and(gte(bills.createdAt, start), lte(bills.createdAt, end)))
      .groupBy(sql`TO_CHAR(${bills.createdAt}, 'MM/DD/YYYY')`)
      .orderBy(sql`TO_CHAR(${bills.createdAt}, 'MM/DD/YYYY')`);

    return {
      totalSales: parseFloat(totals?.totalSales || "0"),
      totalProfit: parseFloat(totals?.totalProfit || "0"),
      totalOrders: totals?.totalOrders || 0,
      chartData: dailyRows.map((row) => ({
        date: row.date,
        sales: parseFloat(row.sales || "0"),
        profit: parseFloat(row.profit || "0"),
      })),
    };
  }
}

export const storage = new DatabaseStorage();
