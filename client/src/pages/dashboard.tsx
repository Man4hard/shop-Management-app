import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingUp, ShoppingCart, AlertTriangle, Package } from "lucide-react";
import type { Product } from "@shared/schema";
import { useOfflineDashboard } from "@/hooks/use-offline";
import { useLanguage } from "@/lib/language-context";

interface DashboardData {
  todaySales: number;
  todayProfit: number;
  todayOrders: number;
  totalProfit: number;
  lowStockAlerts: Product[];
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

function StatCard({ title, value, icon: Icon, color }: { title: string; value: string; icon: any; color: string }) {
  return (
    <Card data-testid={`stat-${title.toLowerCase().replace(/\s/g, "-")}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">{title}</p>
            <p className="text-xl font-bold mt-1 truncate">{value}</p>
          </div>
          <div className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data, isLoading } = useOfflineDashboard() as { data: DashboardData | undefined; isLoading: boolean };
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <h1 className="text-xl font-bold">{t("dashboard", "title")}</h1>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-md" />
          ))}
        </div>
        <Skeleton className="h-40 rounded-md" />
      </div>
    );
  }

  const stats = data || { todaySales: 0, todayProfit: 0, todayOrders: 0, totalProfit: 0, lowStockAlerts: [] };

  return (
    <div className="p-4 space-y-4 pb-24" data-testid="page-dashboard">
      <h1 className="text-xl font-bold">{t("dashboard", "title")}</h1>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          title={t("dashboard", "todaySales")}
          value={`Rs ${formatCurrency(stats.todaySales)}`}
          icon={DollarSign}
          color="bg-emerald-500"
        />
        <StatCard
          title={t("common", "profit")}
          value={`Rs ${formatCurrency(stats.todayProfit)}`}
          icon={TrendingUp}
          color="bg-blue-500"
        />
        <StatCard
          title={t("dashboard", "orders")}
          value={String(stats.todayOrders)}
          icon={ShoppingCart}
          color="bg-orange-500"
        />
        <StatCard
          title={t("dashboard", "totalProfit")}
          value={`Rs ${formatCurrency(stats.totalProfit)}`}
          icon={TrendingUp}
          color="bg-purple-500"
        />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              {t("dashboard", "lowStockAlerts")}
            </h2>
            <Badge variant="secondary" data-testid="badge-low-stock-count">
              {stats.lowStockAlerts.length}
            </Badge>
          </div>
          {stats.lowStockAlerts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t("dashboard", "allWellStocked")}</p>
          ) : (
            <div className="space-y-2">
              {stats.lowStockAlerts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-md bg-accent/50"
                  data-testid={`alert-product-${product.id}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium truncate">{product.name}</span>
                  </div>
                  <Badge variant="destructive" className="shrink-0">
                    {product.stock} {t("dashboard", "left")}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
