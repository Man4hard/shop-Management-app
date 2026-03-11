import { useState, useRef, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Minus, Trash2, Search, ShoppingCart, Printer, Receipt,
  ScanBarcode, Check, X, CreditCard, Banknote, Smartphone,
  Clock, MapPin, Phone, Store, WifiOff, Camera,
} from "lucide-react";
import type { Product, Customer } from "@shared/schema";
import shopBanner from "@assets/shop-banner.png";
import { useOfflineProducts, useOfflineCustomers, useOfflineContext } from "@/hooks/use-offline";
import { createBillOffline } from "@/lib/syncService";
import { useLanguage } from "@/lib/language-context";

const CameraScanner = lazy(() => import("@/components/camera-scanner"));

interface CartItem {
  productId: number;
  productName: string;
  quantity: number;
  costPrice: string;
  salePrice: string;
  total: string;
  stock: number;
}

function LiveClock({ lang }: { lang: string }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const hours = time.getHours();
  const ampm = hours >= 12 ? (lang === "ur" ? "شام" : "PM") : (lang === "ur" ? "صبح" : "AM");
  const h12 = hours % 12 || 12;
  const locale = lang === "ur" ? "ur-PK" : "en-US";
  return (
    <div className="text-center" data-testid="text-live-clock">
      <div className="text-6xl font-bold tracking-tight text-white drop-shadow-2xl">
        {h12}:{time.getMinutes().toString().padStart(2, "0")}
        <span className="text-3xl ms-1 font-medium opacity-80">{ampm}</span>
      </div>
      <div className="text-white/70 text-sm mt-1 font-medium">
        {time.toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
      </div>
    </div>
  );
}

export default function Billing() {
  const { toast } = useToast();
  const { lang, t } = useLanguage();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState("0");
  const [customerId, setCustomerId] = useState<string>("walk-in");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastBill, setLastBill] = useState<any>(null);
  const [receiptItems, setReceiptItems] = useState<CartItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [lastAdded, setLastAdded] = useState<string>("");
  const [lastAddedPrice, setLastAddedPrice] = useState<string>("");
  const [showCamera, setShowCamera] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const scanBuffer = useRef("");
  const scanTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemsEndRef = useRef<HTMLDivElement>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { isOnline, pendingCount, refreshCount } = useOfflineContext();
  const isIdle = cart.length === 0 && !search && !showCheckout && !showReceipt;

  const { data: products = [] } = useOfflineProducts();
  const { data: customers = [] } = useOfflineCustomers();

  const pendingBillRef = useRef<any>(null);

  const filtered = useMemo(() => {
    if (!search) return [];
    const lowerSearch = search.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerSearch) ||
        (p.barcode && p.barcode.includes(search))
    );
  }, [search, products]);

  const cartTotals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + parseFloat(item.total), 0);
    const discountAmount = Math.min(parseFloat(discount) || 0, subtotal);
    const total = subtotal - discountAmount;
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const profit = cart.reduce(
      (sum, item) => sum + (parseFloat(item.salePrice) - parseFloat(item.costPrice)) * item.quantity,
      0
    ) - discountAmount;
    return { subtotal, discountAmount, total, totalItems, profit };
  }, [cart, discount]);

  const { subtotal, discountAmount, total, totalItems, profit } = cartTotals;

  const customerOptions = useMemo(() =>
    customers.map((c) => ({ id: String(c.id), name: c.name })),
    [customers]
  );

  const createBillMutation = useMutation({
    mutationFn: (data: any) => {
      pendingBillRef.current = data;
      return apiRequest("POST", "/api/bills", data);
    },
    onSuccess: async (res) => {
      pendingBillRef.current = null;
      const bill = await res.json();
      setLastBill(bill);
      setReceiptItems([...cart]);
      setShowReceipt(true);
      setShowCheckout(false);
      setCart([]);
      setDiscount("0");
      setCustomerId("walk-in");
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      toast({ title: t("pos", "saleCompleted") });
    },
    onError: async () => {
      const billData = pendingBillRef.current;
      if (billData) {
        try {
          await createBillOffline(billData);
          setLastBill({ ...billData, createdAt: new Date().toISOString() });
          setReceiptItems([...cart]);
          setShowReceipt(true);
          setShowCheckout(false);
          setCart([]);
          setDiscount("0");
          setCustomerId("walk-in");
          refreshCount();
          toast({ title: t("pos", "saleSavedOffline"), description: t("pos", "willSyncBack") });
        } catch {
          toast({ title: t("pos", "failedToSave"), variant: "destructive" });
        }
        pendingBillRef.current = null;
      }
    },
  });

  function addProductToCart(product: Product) {
    const inCart = cart.find((item) => item.productId === product.id)?.quantity || 0;
    if (inCart >= product.stock) {
      toast({ title: t("pos", "outOfStock"), description: `${product.name} ${t("pos", "noMoreStock")}`, variant: "destructive" });
      return;
    }
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total: (parseFloat(item.salePrice) * (item.quantity + 1)).toString(),
              }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          costPrice: product.costPrice,
          salePrice: product.salePrice,
          total: product.salePrice,
          stock: product.stock,
        },
      ];
    });
    setLastAdded(product.name);
    setLastAddedPrice(product.salePrice);
    setTimeout(() => { setLastAdded(""); setLastAddedPrice(""); }, 3000);
    setSearch("");
    searchRef.current?.focus();
    setTimeout(() => itemsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  const findProductByBarcode = useCallback((barcode: string) => {
    const found = products.find((p) => p.barcode === barcode.trim());
    if (found) {
      addProductToCart(found);
    } else {
      toast({ title: t("pos", "productNotFound"), description: `${t("pos", "barcode")}: ${barcode}`, variant: "destructive" });
    }
  }, [products, cart, toast]);

  const handleCameraScan = useCallback((barcode: string) => {
    setShowCamera(false);
    const found = products.find((p) => p.barcode === barcode.trim());
    if (found) {
      addProductToCart(found);
      toast({ title: `${t("scanner", "scanned")}: ${found.name}`, description: `Rs ${found.salePrice}` });
    } else {
      toast({ title: t("pos", "productNotFound"), description: `${t("pos", "barcode")}: ${barcode}`, variant: "destructive" });
    }
  }, [products, toast, t]);

  useEffect(() => {
    if (showCheckout || showReceipt) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "F2") {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if (isTyping) return;

      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        scanBuffer.current += e.key;
        if (scanTimeout.current) clearTimeout(scanTimeout.current);
        scanTimeout.current = setTimeout(() => {
          if (scanBuffer.current.length >= 4) {
            findProductByBarcode(scanBuffer.current);
          }
          scanBuffer.current = "";
        }, 100);
      }
      if (e.key === "Enter" && scanBuffer.current.length >= 4) {
        if (scanTimeout.current) clearTimeout(scanTimeout.current);
        findProductByBarcode(scanBuffer.current);
        scanBuffer.current = "";
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [findProductByBarcode, showCheckout, showReceipt]);

  function handleSearchInput(value: string) {
    setSearch(value);
    const trimmed = value.trim();
    if (trimmed.length >= 4) {
      const found = products.find((p) => p.barcode === trimmed);
      if (found) {
        addProductToCart(found);
        return;
      }
    }
  }

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      const trimmed = search.trim();
      if (trimmed.length >= 4) {
        const found = products.find((p) => p.barcode === trimmed);
        if (found) {
          addProductToCart(found);
          return;
        }
      }
      if (filtered.length === 1) {
        addProductToCart(filtered[0]);
      }
    }
  }

  function updateQuantity(productId: number, delta: number) {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId !== productId) return item;
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          if (delta > 0 && newQty > item.stock) {
            toast({ title: t("pos", "stockLimitReached"), variant: "destructive" });
            return item;
          }
          return { ...item, quantity: newQty, total: (parseFloat(item.salePrice) * newQty).toString() };
        })
        .filter(Boolean) as CartItem[]
    );
  }

  function removeFromCart(productId: number) {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  }

  async function handleCheckout() {
    if (cart.length === 0) {
      toast({ title: t("pos", "cartEmpty"), variant: "destructive" });
      return;
    }
    const billNumber = `BILL-${Date.now().toString().slice(-8)}`;
    const isWalkIn = !customerId || customerId === "walk-in";
    const billData = {
      billNumber,
      customerId: isWalkIn ? undefined : parseInt(customerId),
      customerName: isWalkIn
        ? t("checkout", "walkInCustomer")
        : customers.find((c) => c.id === parseInt(customerId))?.name || t("checkout", "walkInCustomer"),
      subtotal: subtotal.toString(),
      discount: discountAmount.toString(),
      total: total.toString(),
      profit: profit.toString(),
      paymentMethod,
      status: "completed",
      items: cart.map(({ stock, ...rest }) => rest),
    };

    if (isOnline) {
      createBillMutation.mutate(billData);
    } else {
      try {
        await createBillOffline(billData);
        setLastBill({ ...billData, createdAt: new Date().toISOString() });
        setReceiptItems([...cart]);
        setShowReceipt(true);
        setShowCheckout(false);
        setCart([]);
        setDiscount("0");
        setCustomerId("walk-in");
        refreshCount();
        toast({ title: t("pos", "saleSavedOffline"), description: t("pos", "willSyncOnline") });
      } catch {
        toast({ title: t("pos", "failedToSaveShort"), variant: "destructive" });
      }
    }
  }

  function handlePrint() {
    window.print();
  }

  const cameraOverlay = showCamera ? (
    <Suspense fallback={null}>
      <CameraScanner
        onScan={handleCameraScan}
        onClose={() => setShowCamera(false)}
      />
    </Suspense>
  ) : null;

  if (showReceipt && lastBill) {
    return (
      <div className="pb-24" data-testid="page-receipt">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Receipt className="w-5 h-5" /> {t("receipt", "title")}
            </h1>
            <Button size="sm" variant="secondary" onClick={() => setShowReceipt(false)} data-testid="button-new-bill">
              {t("receipt", "newSale")}
            </Button>
          </div>
          <Card id="receipt-content">
            <CardContent className="p-4 space-y-3">
              <div className="text-center">
                <h2 className="font-bold text-lg">TAYYAB</h2>
                <p className="text-xs text-muted-foreground">Jhang</p>
                <p className="text-xs text-muted-foreground">{lastBill.billNumber}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(lastBill.createdAt || Date.now()).toLocaleString()}
                </p>
              </div>
              <Separator />
              <div className="space-y-1">
                {receiptItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{item.productName} x{item.quantity}</span>
                    <span className="shrink-0">Rs {parseFloat(item.total).toFixed(0)}</span>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="space-y-1 text-sm">
                <div className="flex justify-between gap-2">
                  <span>{t("common", "subtotal")}</span>
                  <span>Rs {parseFloat(lastBill.subtotal).toFixed(0)}</span>
                </div>
                {parseFloat(lastBill.discount) > 0 && (
                  <div className="flex justify-between gap-2 text-destructive">
                    <span>{t("common", "discount")}</span>
                    <span>-Rs {parseFloat(lastBill.discount).toFixed(0)}</span>
                  </div>
                )}
                <div className="flex justify-between gap-2 font-bold text-base">
                  <span>{t("common", "total")}</span>
                  <span>Rs {parseFloat(lastBill.total).toFixed(0)}</span>
                </div>
              </div>
              <Separator />
              <p className="text-xs text-center text-muted-foreground">{t("receipt", "thankYou")}</p>
            </CardContent>
          </Card>
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={handlePrint} data-testid="button-print-bill">
              <Printer className="w-4 h-4 me-2" /> {t("common", "print")}
            </Button>
            <Button variant="secondary" onClick={() => setShowReceipt(false)} data-testid="button-back-billing">
              <ShoppingCart className="w-4 h-4 me-2" /> {t("receipt", "newSale")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (showCheckout) {
    return (
      <div className="pb-24" data-testid="page-checkout">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-xl font-bold">{t("checkout", "title")}</h1>
            <Button size="sm" variant="ghost" onClick={() => setShowCheckout(false)} data-testid="button-back-to-pos">
              <X className="w-4 h-4 me-1" /> {t("common", "back")}
            </Button>
          </div>

          <Card>
            <CardContent className="p-3">
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">{t("checkout", "orderSummary")}</h3>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.productId} className="flex justify-between text-sm">
                    <span className="truncate">{item.productName} x{item.quantity}</span>
                    <span className="shrink-0 font-medium">Rs {parseFloat(item.total).toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("checkout", "customer")}</label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger data-testid="select-customer">
                    <SelectValue placeholder={t("checkout", "walkIn")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walk-in">{t("checkout", "walkInCustomer")}</SelectItem>
                    {customerOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">{t("checkout", "paymentMethod")}</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: "cash", label: t("checkout", "cash"), icon: Banknote },
                    { value: "card", label: t("checkout", "card"), icon: CreditCard },
                    { value: "upi", label: t("checkout", "upi"), icon: Smartphone },
                    { value: "credit", label: t("checkout", "credit"), icon: Receipt },
                  ].map((method) => (
                    <button
                      key={method.value}
                      onClick={() => setPaymentMethod(method.value)}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border-2 transition-all ${
                        paymentMethod === method.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-muted-foreground/30"
                      }`}
                      data-testid={`button-pay-${method.value}`}
                    >
                      <method.icon className="w-5 h-5" />
                      <span className="text-[10px] font-medium">{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("checkout", "discountRs")}</label>
                <Input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  data-testid="input-discount"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("common", "subtotal")} ({totalItems} {t("common", "items")})</span>
                <span>Rs {subtotal.toFixed(0)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-destructive">
                  <span>{t("common", "discount")}</span>
                  <span>-Rs {discountAmount.toFixed(0)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-2xl pt-1">
                <span>{t("common", "total")}</span>
                <span data-testid="text-checkout-total">Rs {total.toFixed(0)}</span>
              </div>
            </CardContent>
          </Card>

          <Button
            className="w-full h-14 text-lg font-bold"
            onClick={handleCheckout}
            disabled={createBillMutation.isPending}
            data-testid="button-confirm-checkout"
          >
            <Check className="w-5 h-5 me-2" />
            {createBillMutation.isPending ? t("common", "processing") : `${t("common", "pay")} Rs ${total.toFixed(0)}`}
          </Button>
        </div>
      </div>
    );
  }

  if (isIdle) {
    return (
      <div
        className="fixed inset-0 z-30 flex flex-col"
        data-testid="page-screensaver"
        onClick={() => searchRef.current?.focus()}
      >
        <div className="relative flex-1 flex flex-col">
          <img
            src={shopBanner}
            alt="Shop"
            className="absolute inset-0 w-full h-full object-cover"
            data-testid="img-screensaver-bg"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/70" />

          <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
            <div className="mb-8">
              <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4 border border-white/30">
                <Store className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-white text-center drop-shadow-2xl tracking-tight" data-testid="text-screensaver-name">
                TAYYAB
              </h1>
              <p className="text-white/60 text-center text-sm mt-1 tracking-wide">
                {t("screensaver", "tagline")}
              </p>
            </div>

            <LiveClock lang={lang} />

            <div className="mt-8 flex items-center gap-4 text-white/50 text-xs">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Jhang
              </span>
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" /> 0343-6937400
              </span>
            </div>

            {!isOnline && (
              <div className="mt-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white/60 text-xs" data-testid="screensaver-offline">
                <WifiOff className="w-3 h-3" />
                <span>{t("screensaver", "offlineMode")}</span>
                {pendingCount > 0 && <span>({pendingCount} {t("screensaver", "pending")})</span>}
              </div>
            )}
          </div>

          <div className="relative z-10 px-6 pb-20">
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/20">
              <ScanBarcode className="w-6 h-6 text-white/70 shrink-0 animate-pulse" />
              <div className="flex-1">
                <Input
                  ref={searchRef}
                  placeholder={t("screensaver", "scanToStart")}
                  className="border-0 bg-transparent text-white placeholder:text-white/40 text-base h-auto p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  value={search}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  data-testid="input-search-billing"
                />
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setShowCamera(true); }}
                className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 active:bg-white/30 transition-colors"
                data-testid="button-camera-screensaver"
              >
                <Camera className="w-5 h-5 text-white" />
              </button>
            </div>
            <p className="text-center text-white/40 text-xs mt-3">
              {t("screensaver", "scanOrSearch")}
            </p>
            {cameraOverlay}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24" data-testid="page-billing">
      <div className="bg-primary text-primary-foreground px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5" />
            <h1 className="font-bold" data-testid="text-shop-name">TAYYAB</h1>
          </div>
          <Badge className="bg-primary-foreground/20 text-primary-foreground border-0" data-testid="badge-cart-count">
            {totalItems} {t("common", "items")} | Rs {subtotal.toFixed(0)}
          </Badge>
        </div>
      </div>

      <div className="px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <ScanBarcode className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              ref={searchRef}
              placeholder={t("pos", "scanOrSearch")}
              className="ps-11 h-11 text-base rounded-xl shadow-sm border-2 bg-background"
              value={search}
              onChange={(e) => handleSearchInput(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              autoFocus
              data-testid="input-search-pos"
            />
            {search && (
              <button
                className="absolute end-3 top-1/2 -translate-y-1/2"
                onClick={() => { setSearch(""); searchRef.current?.focus(); }}
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <Button
            variant="secondary"
            className="h-11 w-11 rounded-xl shrink-0 p-0"
            onClick={() => setShowCamera(true)}
            data-testid="button-camera-pos"
          >
            <Camera className="w-5 h-5" />
          </Button>
        </div>

        {search && filtered.length > 0 && (
          <Card className="mt-2 shadow-lg border-2 absolute left-3 right-3 z-20">
            <CardContent className="p-1 max-h-56 overflow-y-auto">
              {filtered.slice(0, 8).map((product) => (
                <button
                  key={product.id}
                  className="w-full flex items-center justify-between gap-2 p-3 rounded-lg hover:bg-accent text-left transition-colors active:bg-accent/70"
                  onClick={() => addProductToCart(product)}
                  data-testid={`button-select-product-${product.id}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("common", "stock")}: {product.stock} {product.unit || "pcs"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-primary">Rs {product.salePrice}</p>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {lastAdded && (
        <div className="mx-3 mb-2 p-3 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-2 duration-200" data-testid="toast-added">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
              <Check className="w-4 h-4 text-green-600" />
            </div>
            <span className="text-sm text-green-700 dark:text-green-400 font-semibold truncate">
              {lastAdded}
            </span>
          </div>
          <span className="text-sm font-bold text-green-700 dark:text-green-400 shrink-0">
            Rs {lastAddedPrice}
          </span>
        </div>
      )}

      <div className="px-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {t("common", "items")} ({totalItems})
          </h2>
          <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setCart([])} data-testid="button-clear-cart">
            <Trash2 className="w-3 h-3 me-1" /> {t("common", "clear")}
          </Button>
        </div>

        <div className="max-h-[calc(100vh-320px)] overflow-y-auto space-y-2">
          {cart.map((item) => (
            <div
              key={item.productId}
              className="rounded-xl border bg-card shadow-sm p-3"
              data-testid={`cart-item-${item.productId}`}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{item.productName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Rs {item.salePrice} {t("common", "perUnit")}</p>
                </div>
                <span className="text-lg font-bold shrink-0" data-testid={`text-item-total-${item.productId}`}>
                  Rs {parseFloat(item.total).toFixed(0)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant={item.quantity === 1 ? "destructive" : "secondary"}
                  className="h-12 w-12 rounded-xl shrink-0"
                  onClick={() => updateQuantity(item.productId, -1)}
                  data-testid={`button-cart-minus-${item.productId}`}
                >
                  {item.quantity === 1 ? <Trash2 className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
                </Button>
                <div className="flex-1 text-center">
                  <span className="text-3xl font-bold" data-testid={`text-qty-${item.productId}`}>
                    {item.quantity}
                  </span>
                </div>
                <Button
                  variant="secondary"
                  className="h-12 w-12 rounded-xl shrink-0"
                  onClick={() => updateQuantity(item.productId, 1)}
                  disabled={item.quantity >= item.stock}
                  data-testid={`button-cart-plus-${item.productId}`}
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </div>
            </div>
          ))}
          <div ref={itemsEndRef} />
        </div>
      </div>

      {cameraOverlay}

      {cart.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-40 safe-area-bottom" data-testid="bar-total">
          <div className="max-w-lg mx-auto px-3 pb-2">
            <button
              className="w-full flex items-center justify-between bg-primary text-primary-foreground rounded-xl px-4 py-4 shadow-xl active:scale-[0.98] transition-transform"
              onClick={() => setShowCheckout(true)}
              data-testid="button-checkout"
            >
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                <span className="font-semibold">{totalItems} {t("common", "items")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold">Rs {subtotal.toFixed(0)}</span>
                <div className="bg-primary-foreground/20 rounded-lg px-3 py-1.5">
                  <span className="text-xs font-bold">{t("common", "pay")}</span>
                </div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
