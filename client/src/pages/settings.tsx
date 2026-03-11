import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Store, MapPin, Phone, Save } from "lucide-react";
import { useState, useEffect } from "react";
import type { Business } from "@shared/schema";
import { useLanguage } from "@/lib/language-context";

export default function Settings() {
  const { toast } = useToast();
  const { t, setLang } = useLanguage();
  const { data: business, isLoading } = useQuery<Business>({ queryKey: ["/api/business"] });

  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    language: "en",
    currency: "PKR",
    theme: "light",
  });

  useEffect(() => {
    if (business) {
      setForm({
        name: business.name,
        address: business.address || "",
        phone: business.phone || "",
        language: business.language,
        currency: business.currency,
        theme: business.theme,
      });
    }
  }, [business]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", "/api/business", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business"] });
      toast({ title: t("settings", "saved") });
    },
  });

  function handleSave() {
    updateMutation.mutate(form);
  }

  function toggleTheme() {
    const newTheme = form.theme === "light" ? "dark" : "light";
    setForm({ ...form, theme: newTheme });
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  }

  function handleLanguageChange(value: string) {
    setForm({ ...form, language: value });
    setLang(value as "en" | "ur");
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <h1 className="text-xl font-bold">{t("settings", "title")}</h1>
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-md" />)}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-24" data-testid="page-settings">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <SettingsIcon className="w-5 h-5" /> {t("settings", "title")}
      </h1>

      <Card>
        <CardContent className="p-4 space-y-4">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Store className="w-4 h-4" /> {t("settings", "businessInfo")}
          </h2>
          <div>
            <Label className="flex items-center gap-1">
              <Store className="w-3 h-3" /> {t("settings", "businessName")}
            </Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              data-testid="input-business-name"
            />
          </div>
          <div>
            <Label className="flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {t("common", "address")}
            </Label>
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              data-testid="input-business-address"
            />
          </div>
          <div>
            <Label className="flex items-center gap-1">
              <Phone className="w-3 h-3" /> {t("common", "phone")}
            </Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              data-testid="input-business-phone"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-4">
          <h2 className="font-semibold text-sm">{t("settings", "preferences")}</h2>

          <div>
            <Label>{t("settings", "language")}</Label>
            <div className="flex gap-2 mt-1">
              {[
                { value: "en", label: "English" },
                { value: "ur", label: "Urdu" },
              ].map((lang) => (
                <Button
                  key={lang.value}
                  size="sm"
                  variant={form.language === lang.value ? "default" : "secondary"}
                  onClick={() => handleLanguageChange(lang.value)}
                  data-testid={`button-lang-${lang.value}`}
                >
                  {lang.label}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label>{t("settings", "currency")}</Label>
            <div className="flex gap-2 mt-1">
              {[
                { value: "PKR", label: "PKR" },
                { value: "USD", label: "USD" },
                { value: "INR", label: "INR" },
              ].map((curr) => (
                <Button
                  key={curr.value}
                  size="sm"
                  variant={form.currency === curr.value ? "default" : "secondary"}
                  onClick={() => setForm({ ...form, currency: curr.value })}
                  data-testid={`button-currency-${curr.value}`}
                >
                  {curr.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <Label>{t("settings", "darkTheme")}</Label>
            <Switch
              checked={form.theme === "dark"}
              onCheckedChange={toggleTheme}
              data-testid="switch-theme"
            />
          </div>
        </CardContent>
      </Card>

      <Button
        className="w-full"
        onClick={handleSave}
        disabled={updateMutation.isPending}
        data-testid="button-save-settings"
      >
        <Save className="w-4 h-4 me-2" />
        {updateMutation.isPending ? t("common", "saving") : t("settings", "saveSettings")}
      </Button>
    </div>
  );
}
