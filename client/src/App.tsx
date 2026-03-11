import { lazy, Suspense } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { OfflineBanner, OfflineIndicator } from "@/components/offline-indicator";
import { LanguageProvider, useLanguage } from "@/lib/language-context";
import { OfflineContext, useOfflineProviderValue } from "@/hooks/use-offline";
import { Skeleton } from "@/components/ui/skeleton";
import Billing from "@/pages/billing";
import { Home, Package, LayoutDashboard, Users, BarChart3, Settings as SettingsIcon } from "lucide-react";

const Dashboard = lazy(() => import("@/pages/dashboard"));
const Products = lazy(() => import("@/pages/products"));
const Customers = lazy(() => import("@/pages/customers"));
const Reports = lazy(() => import("@/pages/reports"));
const Settings = lazy(() => import("@/pages/settings"));
const NotFound = lazy(() => import("@/pages/not-found"));

const navItems = [
  { path: "/", labelKey: "pos", icon: Home },
  { path: "/products", labelKey: "products", icon: Package },
  { path: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  { path: "/customers", labelKey: "customers", icon: Users },
  { path: "/reports", labelKey: "reports", icon: BarChart3 },
  { path: "/settings", labelKey: "settings", icon: SettingsIcon },
];

function PageLoader() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-20 rounded-md" />
      <Skeleton className="h-20 rounded-md" />
      <Skeleton className="h-20 rounded-md" />
    </div>
  );
}

function BottomNav() {
  const [location, setLocation] = useLocation();
  const { t } = useLanguage();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t z-50 safe-area-bottom print:hidden" data-testid="nav-bottom">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const label = t("nav", item.labelKey);
          return (
            <button
              key={item.path}
              onClick={() => setLocation(item.path)}
              className={`flex flex-col items-center gap-0.5 py-2 px-1 min-w-0 flex-1 transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
              data-testid={`nav-${item.labelKey}`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : ""}`} />
              <span className="text-[10px] font-medium truncate">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Billing} />
        <Route path="/products" component={Products} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/customers" component={Customers} />
        <Route path="/reports" component={Reports} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function AppContent() {
  const [location] = useLocation();
  const isHome = location === "/";

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-background relative">
      {!isHome && (
        <header className="sticky top-0 z-40 bg-primary text-primary-foreground px-4 py-3 print:hidden">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold tracking-tight" data-testid="text-app-title">TAYYAB</h1>
            <OfflineIndicator />
          </div>
        </header>
      )}
      <OfflineBanner />
      <main className="overflow-y-auto">
        <Router />
      </main>
      <BottomNav />
    </div>
  );
}

function OfflineWrapper({ children }: { children: React.ReactNode }) {
  const offlineValue = useOfflineProviderValue(queryClient);
  return (
    <OfflineContext.Provider value={offlineValue}>
      {children}
    </OfflineContext.Provider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <OfflineWrapper>
          <LanguageProvider>
            <AppContent />
            <Toaster />
          </LanguageProvider>
        </OfflineWrapper>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
