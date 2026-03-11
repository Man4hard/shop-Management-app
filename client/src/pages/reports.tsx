import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, Download, TrendingUp, DollarSign, ShoppingCart } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

interface ReportData {
  totalSales: number;
  totalProfit: number;
  totalOrders: number;
  chartData: { date: string; sales: number; profit: number }[];
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

export default function Reports() {
  const [period, setPeriod] = useState("daily");
  const { t } = useLanguage();

  const { data, isLoading } = useQuery<ReportData>({
    queryKey: [`/api/reports?period=${period}`],
  });

  const periodLabels: Record<string, string> = {
    daily: t("reports", "daily"),
    weekly: t("reports", "weekly"),
    monthly: t("reports", "monthly"),
  };

  function exportCSV() {
    if (!data) return;
    let csv = "Date,Sales,Profit\n";
    data.chartData.forEach((d) => {
      csv += `${d.date},${d.sales},${d.profit}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${period}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <h1 className="text-xl font-bold">{t("reports", "title")}</h1>
        <Skeleton className="h-10 rounded-md" />
        <Skeleton className="h-32 rounded-md" />
        <Skeleton className="h-48 rounded-md" />
      </div>
    );
  }

  const report = data || { totalSales: 0, totalProfit: 0, totalOrders: 0, chartData: [] };
  const maxSale = Math.max(...report.chartData.map((d) => d.sales), 1);

  return (
    <div className="p-4 space-y-4 pb-24" data-testid="page-reports">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <BarChart3 className="w-5 h-5" /> {t("reports", "title")}
        </h1>
        <Button size="sm" variant="secondary" onClick={exportCSV} data-testid="button-export">
          <Download className="w-4 h-4 me-1" /> {t("common", "export")}
        </Button>
      </div>

      <div className="flex gap-2">
        {["daily", "weekly", "monthly"].map((p) => (
          <Button
            key={p}
            size="sm"
            variant={period === p ? "default" : "secondary"}
            onClick={() => setPeriod(p)}
            data-testid={`button-period-${p}`}
          >
            {periodLabels[p]}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Card>
          <CardContent className="p-3 text-center">
            <DollarSign className="w-5 h-5 mx-auto text-emerald-500 mb-1" />
            <p className="text-xs text-muted-foreground">{t("reports", "sales")}</p>
            <p className="text-sm font-bold">Rs {formatCurrency(report.totalSales)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <TrendingUp className="w-5 h-5 mx-auto text-blue-500 mb-1" />
            <p className="text-xs text-muted-foreground">{t("common", "profit")}</p>
            <p className="text-sm font-bold">Rs {formatCurrency(report.totalProfit)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <ShoppingCart className="w-5 h-5 mx-auto text-orange-500 mb-1" />
            <p className="text-xs text-muted-foreground">{t("dashboard", "orders")}</p>
            <p className="text-sm font-bold">{report.totalOrders}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <h2 className="font-semibold text-sm mb-3">{t("reports", "salesVsProfit")}</h2>
          {report.chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t("reports", "noDataPeriod")}</p>
          ) : (
            <div className="space-y-2" dir="ltr">
              {report.chartData.map((d, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground truncate">{d.date}</span>
                    <span className="font-medium shrink-0">Rs {formatCurrency(d.sales)}</span>
                  </div>
                  <div className="flex gap-1 h-4">
                    <div
                      className="bg-emerald-500 rounded-sm h-full transition-all"
                      style={{ width: `${(d.sales / maxSale) * 100}%` }}
                      title={`${t("reports", "sales")}: Rs ${formatCurrency(d.sales)}`}
                    />
                  </div>
                  <div className="flex gap-1 h-3">
                    <div
                      className="bg-blue-500 rounded-sm h-full transition-all"
                      style={{ width: `${(d.profit / maxSale) * 100}%` }}
                      title={`${t("common", "profit")}: Rs ${formatCurrency(d.profit)}`}
                    />
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-2 bg-emerald-500 rounded-sm inline-block" /> {t("reports", "sales")}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-2 bg-blue-500 rounded-sm inline-block" /> {t("common", "profit")}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
