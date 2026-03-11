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
import { Plus, Search, Edit, Trash2, Users, Phone, MapPin } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import type { Customer } from "@shared/schema";

export default function Customers() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", address: "", balance: "0" });

  const { data: customers = [], isLoading } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/customers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setDialogOpen(false);
      resetForm();
      toast({ title: t("customers", "added") });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PATCH", `/api/customers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setDialogOpen(false);
      setEditCustomer(null);
      resetForm();
      toast({ title: t("customers", "updated") });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/customers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: t("customers", "deleted") });
    },
  });

  function resetForm() {
    setForm({ name: "", phone: "", address: "", balance: "0" });
  }

  function openEdit(c: Customer) {
    setEditCustomer(c);
    setForm({ name: c.name, phone: c.phone || "", address: c.address || "", balance: c.balance });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (editCustomer) {
      updateMutation.mutate({ id: editCustomer.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone && c.phone.includes(search))
  );

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <h1 className="text-xl font-bold">{t("customers", "title")}</h1>
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-md" />)}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-24" data-testid="page-customers">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">{t("customers", "title")}</h1>
        <Button
          size="sm"
          onClick={() => { resetForm(); setEditCustomer(null); setDialogOpen(true); }}
          data-testid="button-add-customer"
        >
          <Plus className="w-4 h-4 me-1" /> {t("common", "add")}
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={t("customers", "searchPlaceholder")}
          className="ps-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-testid="input-search-customer"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">{t("customers", "noCustomers")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((customer) => {
            const bal = parseFloat(customer.balance);
            return (
              <Card key={customer.id} data-testid={`card-customer-${customer.id}`}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{customer.name}</p>
                        <Badge variant={bal > 0 ? "default" : bal < 0 ? "destructive" : "secondary"}>
                          Rs {Math.abs(bal).toFixed(0)}
                          {bal > 0 ? ` ${t("customers", "receivable")}` : bal < 0 ? ` ${t("customers", "payable")}` : ""}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        {customer.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {customer.phone}
                          </span>
                        )}
                        {customer.address && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {customer.address}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(customer)} data-testid={`button-edit-customer-${customer.id}`}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => { if (confirm(t("customers", "deleteConfirm"))) deleteMutation.mutate(customer.id); }}
                        data-testid={`button-delete-customer-${customer.id}`}
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
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editCustomer ? t("customers", "editCustomer") : t("customers", "addCustomer")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t("customers", "nameRequired")}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="input-customer-name" />
            </div>
            <div>
              <Label>{t("common", "phone")}</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="input-customer-phone" />
            </div>
            <div>
              <Label>{t("common", "address")}</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} data-testid="input-customer-address" />
            </div>
            <div>
              <Label>{t("customers", "balanceRs")}</Label>
              <Input type="number" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} data-testid="input-customer-balance" />
            </div>
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={!form.name || createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-customer"
            >
              {createMutation.isPending || updateMutation.isPending ? t("common", "saving") : editCustomer ? t("customers", "updateCustomer") : t("customers", "addCustomer")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
