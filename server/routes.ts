import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/dashboard", async (_req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      const lowStock = await storage.getLowStockProducts();
      res.json({ ...stats, lowStockAlerts: lowStock });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/business", async (_req, res) => {
    try {
      let biz = await storage.getBusiness();
      if (!biz) {
        biz = await storage.updateBusiness({ name: "My Shop", language: "en", currency: "PKR", theme: "light" });
      }
      res.json(biz);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/business", async (req, res) => {
    try {
      const biz = await storage.updateBusiness(req.body);
      res.json(biz);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/categories", async (_req, res) => {
    try {
      const cats = await storage.getCategories();
      res.json(cats);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const cat = await storage.createCategory(req.body);
      res.json(cat);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/categories/:id", async (req, res) => {
    try {
      await storage.deleteCategory(parseInt(req.params.id));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/products", async (_req, res) => {
    try {
      const prods = await storage.getProducts();
      res.json(prods);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/products/low-stock", async (_req, res) => {
    try {
      const prods = await storage.getLowStockProducts();
      res.json(prods);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/products/barcode/:barcode", async (req, res) => {
    try {
      const product = await storage.getProductByBarcode(req.params.barcode);
      if (!product) return res.status(404).json({ message: "Product not found" });
      res.json(product);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(parseInt(req.params.id));
      if (!product) return res.status(404).json({ message: "Product not found" });
      res.json(product);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const product = await storage.createProduct(req.body);
      res.json(product);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.updateProduct(parseInt(req.params.id), req.body);
      res.json(product);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      await storage.deleteProduct(parseInt(req.params.id));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/customers", async (_req, res) => {
    try {
      const custs = await storage.getCustomers();
      res.json(custs);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    try {
      const cust = await storage.getCustomer(parseInt(req.params.id));
      if (!cust) return res.status(404).json({ message: "Customer not found" });
      res.json(cust);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/customers", async (req, res) => {
    try {
      const cust = await storage.createCustomer(req.body);
      res.json(cust);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/customers/:id", async (req, res) => {
    try {
      const cust = await storage.updateCustomer(parseInt(req.params.id), req.body);
      res.json(cust);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/customers/:id", async (req, res) => {
    try {
      await storage.deleteCustomer(parseInt(req.params.id));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/bills", async (_req, res) => {
    try {
      const allBills = await storage.getBills();
      res.json(allBills);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/bills/:id", async (req, res) => {
    try {
      const bill = await storage.getBill(parseInt(req.params.id));
      if (!bill) return res.status(404).json({ message: "Bill not found" });
      const items = await storage.getBillItems(bill.id);
      res.json({ ...bill, items });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/bills", async (req, res) => {
    try {
      const { items, ...billData } = req.body;
      const bill = await storage.createBill(billData, items || []);
      res.json(bill);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/reports", async (req, res) => {
    try {
      const { period } = req.query;
      const now = new Date();
      let start = new Date();

      if (period === "daily") {
        start.setHours(0, 0, 0, 0);
      } else if (period === "weekly") {
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
      } else if (period === "monthly") {
        start.setMonth(now.getMonth() - 1);
        start.setHours(0, 0, 0, 0);
      } else {
        start.setFullYear(2020);
      }

      const stats = await storage.getReportStats(start, now);
      res.json(stats);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  return httpServer;
}
