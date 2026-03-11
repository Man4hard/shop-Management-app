import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, serial, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const businesses = pgTable("businesses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default("My Shop"),
  address: text("address").default(""),
  phone: text("phone").default(""),
  language: text("language").notNull().default("en"),
  currency: text("currency").notNull().default("PKR"),
  theme: text("theme").notNull().default("light"),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameUrdu: text("name_urdu").default(""),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  barcode: text("barcode").default(""),
  categoryId: integer("category_id"),
  costPrice: decimal("cost_price", { precision: 12, scale: 2 }).notNull().default("0"),
  salePrice: decimal("sale_price", { precision: 12, scale: 2 }).notNull().default("0"),
  stock: integer("stock").notNull().default(0),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
  unit: text("unit").default("pcs"),
  imageUrl: text("image_url").default(""),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_products_barcode").on(table.barcode),
  index("idx_products_category").on(table.categoryId),
]);

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").default(""),
  address: text("address").default(""),
  balance: decimal("balance", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bills = pgTable("bills", {
  id: serial("id").primaryKey(),
  billNumber: text("bill_number").notNull(),
  customerId: integer("customer_id"),
  customerName: text("customer_name").default("Walk-in Customer"),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  discount: decimal("discount", { precision: 12, scale: 2 }).notNull().default("0"),
  total: decimal("total", { precision: 12, scale: 2 }).notNull().default("0"),
  profit: decimal("profit", { precision: 12, scale: 2 }).notNull().default("0"),
  paymentMethod: text("payment_method").default("cash"),
  status: text("status").notNull().default("completed"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_bills_created_at").on(table.createdAt),
  index("idx_bills_customer").on(table.customerId),
]);

export const billItems = pgTable("bill_items", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").notNull(),
  productId: integer("product_id").notNull(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  costPrice: decimal("cost_price", { precision: 12, scale: 2 }).notNull(),
  salePrice: decimal("sale_price", { precision: 12, scale: 2 }).notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
}, (table) => [
  index("idx_bill_items_bill").on(table.billId),
]);

export const insertBusinessSchema = createInsertSchema(businesses).omit({ id: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true });
export const insertBillSchema = createInsertSchema(bills).omit({ id: true, createdAt: true });
export const insertBillItemSchema = createInsertSchema(billItems).omit({ id: true });

export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type Business = typeof businesses.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertBill = z.infer<typeof insertBillSchema>;
export type Bill = typeof bills.$inferSelect;
export type InsertBillItem = z.infer<typeof insertBillItemSchema>;
export type BillItem = typeof billItems.$inferSelect;
