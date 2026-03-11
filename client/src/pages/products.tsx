import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Edit, Trash2, Package, AlertTriangle, Barcode } from "lucide-react";
import BarcodePrinter from "@/components/barcode-printer";
import { useLanguage } from "@/lib/language-context";
import type { Product, Category } from "@shared/schema";

export default function Products() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [barcodeProduct, setBarcodeProduct] = useState<Product | null>(null);
  const [barcodeDialogOpen, setBarcodeDialogOpen] = useState(false);

  const [form, setForm] = useState({
    name: "", barcode: "", categoryId: "", costPrice: "", salePrice: "",
    stock: "", lowStockThreshold: "5", unit: "pcs",
  });

  const { data: products = [], isLoading } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["/api/categories"] });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/products", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setDialogOpen(false);
      resetForm();
      toast({ title: t("products", "added") });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PATCH", `/api/products/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setDialogOpen(false);
      setEditProduct(null);
      resetForm();
      toast({ title: t("products", "updated") });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: t("products", "deleted") });
    },
  });

  function resetForm() {
    setForm({ name: "", barcode: "", categoryId: "", costPrice: "", salePrice: "", stock: "", lowStockThreshold: "5", unit: "pcs" });
  }

  function openEdit(p: Product) {
    setEditProduct(p);
    setForm({
      name: p.name,
      barcode: p.barcode || "",
      categoryId: p.categoryId ? String(p.categoryId) : "",
      costPrice: p.costPrice,
      salePrice: p.salePrice,
      stock: String(p.stock),
      lowStockThreshold: String(p.lowStockThreshold),
      unit: p.unit || "pcs",
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    const payload = {
      name: form.name,
      barcode: form.barcode || undefined,
      categoryId: form.categoryId ? parseInt(form.categoryId) : undefined,
      costPrice: form.costPrice,
      salePrice: form.salePrice,
      stock: parseInt(form.stock) || 0,
      lowStockThreshold: parseInt(form.lowStockThreshold) || 5,
      unit: form.unit,
    };
    if (editProduct) {
      updateMutation.mutate({ id: editProduct.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode && p.barcode.includes(search))
  );

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-bold">{t("products", "title")}</h1>
        </div>
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-md" />)}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-24" data-testid="page-products">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">{t("products", "title")}</h1>
        <Button
          size="sm"
          onClick={() => { resetForm(); setEditProduct(null); setDialogOpen(true); }}
          data-testid="button-add-product"
        >
          <Plus className="w-4 h-4 me-1" /> {t("common", "add")}
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={t("products", "searchPlaceholder")}
          className="ps-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-testid="input-search-product"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">{t("products", "noProducts")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((product) => {
            const isLow = product.stock <= product.lowStockThreshold;
            return (
              <Card key={product.id} data-testid={`card-product-${product.id}`}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{product.name}</p>
                        {isLow && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                            <AlertTriangle className="w-3 h-3 me-0.5" /> {t("common", "low")}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span>{t("common", "cost")}: Rs {product.costPrice}</span>
                        <span className="font-medium text-foreground">{t("common", "sale")}: Rs {product.salePrice}</span>
                        <span>{t("common", "stock")}: {product.stock}</span>
                      </div>
                      {product.barcode && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{product.barcode}</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => { setBarcodeProduct(product); setBarcodeDialogOpen(true); }}
                        data-testid={`button-barcode-product-${product.id}`}
                      >
                        <Barcode className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(product)} data-testid={`button-edit-product-${product.id}`}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(t("products", "deleteConfirm"))) deleteMutation.mutate(product.id);
                        }}
                        data-testid={`button-delete-product-${product.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editProduct ? t("products", "editProduct") : t("products", "addProduct")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t("products", "productName")}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="input-product-name" />
            </div>
            <div>
              <Label>{t("products", "barcode")}</Label>
              <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder={t("products", "scanOrType")} data-testid="input-product-barcode" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("products", "costPrice")}</Label>
                <Input type="number" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} data-testid="input-cost-price" />
              </div>
              <div>
                <Label>{t("products", "salePrice")}</Label>
                <Input type="number" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} data-testid="input-sale-price" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("products", "stockQty")}</Label>
                <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} data-testid="input-stock" />
              </div>
              <div>
                <Label>{t("products", "lowStockAlert")}</Label>
                <Input type="number" value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })} data-testid="input-low-stock" />
              </div>
            </div>
            <div>
              <Label>{t("products", "unit")}</Label>
              <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder={t("products", "unitPlaceholder")} data-testid="input-unit" />
            </div>
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={!form.name || !form.salePrice || createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-product"
            >
              {createMutation.isPending || updateMutation.isPending ? t("common", "saving") : editProduct ? t("products", "updateProduct") : t("products", "addProduct")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BarcodePrinter
        product={barcodeProduct}
        open={barcodeDialogOpen}
        onOpenChange={setBarcodeDialogOpen}
      />
    </div>
  );
}
