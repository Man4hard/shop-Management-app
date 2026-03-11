import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Printer, Minus, Plus } from "lucide-react";
// @ts-ignore
import JsBarcode from "jsbarcode/bin/JsBarcode";
import type { Product } from "@shared/schema";
import { useLanguage } from "@/lib/language-context";

interface BarcodePrinterProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type LabelSize = "small" | "medium" | "large";

const labelDimensions: Record<LabelSize, { width: number; height: number; barcodeWidth: number; barcodeHeight: number; fontSize: number; priceSize: number }> = {
  small: { width: 180, height: 100, barcodeWidth: 1.2, barcodeHeight: 30, fontSize: 8, priceSize: 10 },
  medium: { width: 250, height: 140, barcodeWidth: 1.5, barcodeHeight: 40, fontSize: 10, priceSize: 13 },
  large: { width: 350, height: 180, barcodeWidth: 2, barcodeHeight: 55, fontSize: 12, priceSize: 16 },
};

export default function BarcodePrinter({ product, open, onOpenChange }: BarcodePrinterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [quantity, setQuantity] = useState(1);
  const [labelSize, setLabelSize] = useState<LabelSize>("medium");
  const [showPrice, setShowPrice] = useState(true);
  const [barcodeGenerated, setBarcodeGenerated] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    if (!open || !product || !product.barcode || !canvasRef.current) {
      setBarcodeGenerated(false);
      return;
    }
    try {
      JsBarcode(canvasRef.current, product.barcode, {
        format: "CODE128",
        width: labelDimensions[labelSize].barcodeWidth,
        height: labelDimensions[labelSize].barcodeHeight,
        displayValue: true,
        fontSize: labelDimensions[labelSize].fontSize,
        margin: 5,
        textMargin: 2,
        background: "#ffffff",
        lineColor: "#000000",
      });
      setBarcodeGenerated(true);
    } catch {
      setBarcodeGenerated(false);
    }
  }, [open, product, labelSize]);

  function handlePrint() {
    if (!product || !canvasRef.current || !barcodeGenerated) return;

    const dim = labelDimensions[labelSize];
    const barcodeDataUrl = canvasRef.current.toDataURL("image/png");

    const printWindow = window.open("", "_blank", "width=600,height=800");
    if (!printWindow) return;

    let labelsHtml = "";
    for (let i = 0; i < quantity; i++) {
      labelsHtml += `
        <div class="label" style="
          width: ${dim.width}px;
          height: ${dim.height}px;
          border: 1px dashed #ccc;
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4px;
          margin: 4px;
          page-break-inside: avoid;
          box-sizing: border-box;
        ">
          <div style="font-size: ${dim.fontSize}px; font-weight: 600; text-align: center; margin-bottom: 2px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${product.name}
          </div>
          <img src="${barcodeDataUrl}" style="max-width: ${dim.width - 16}px; height: auto;" />
          ${showPrice ? `<div style="font-size: ${dim.priceSize}px; font-weight: 700; margin-top: 2px;">Rs ${product.salePrice}</div>` : ""}
        </div>
      `;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Barcode Labels - ${product.name}</title>
        <style>
          @page { margin: 10mm; }
          body {
            margin: 0;
            padding: 10px;
            font-family: Arial, Helvetica, sans-serif;
            display: flex;
            flex-wrap: wrap;
            align-content: flex-start;
          }
          @media print {
            .label { border: none !important; }
          }
        </style>
      </head>
      <body>
        ${labelsHtml}
        <script>
          window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  if (!product) return null;

  const dim = labelDimensions[labelSize];
  const hasBarcode = product.barcode && product.barcode.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" /> {t("barcode", "printBarcode")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm">
            <span className="text-muted-foreground">{t("barcode", "product")}</span>{" "}
            <span className="font-medium">{product.name}</span>
          </div>

          {!hasBarcode ? (
            <div className="text-center py-6 bg-accent/30 rounded-md">
              <p className="text-sm text-muted-foreground">
                {t("barcode", "noBarcode")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("barcode", "addBarcodeFirst")}
              </p>
            </div>
          ) : (
            <>
              <div className="flex justify-center p-4 bg-white rounded-md border">
                <div className="flex flex-col items-center" style={{ width: dim.width, minHeight: dim.height }}>
                  <p className="text-xs font-semibold text-black text-center mb-1 truncate max-w-full">
                    {product.name}
                  </p>
                  <canvas ref={canvasRef} data-testid="canvas-barcode" />
                  {showPrice && (
                    <p className="font-bold text-black mt-1" style={{ fontSize: dim.priceSize }}>
                      Rs {product.salePrice}
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div>
                  <Label>{t("barcode", "labelSize")}</Label>
                  <Select value={labelSize} onValueChange={(v) => setLabelSize(v as LabelSize)}>
                    <SelectTrigger data-testid="select-label-size">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">{t("barcode", "small")}</SelectItem>
                      <SelectItem value="medium">{t("barcode", "medium")}</SelectItem>
                      <SelectItem value="large">{t("barcode", "large")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{t("common", "quantity")}</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      data-testid="button-qty-minus"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <Input
                      type="number"
                      min={1}
                      max={200}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Math.min(200, parseInt(e.target.value) || 1)))}
                      className="text-center w-20"
                      data-testid="input-barcode-qty"
                    />
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={() => setQuantity(Math.min(200, quantity + 1))}
                      data-testid="button-qty-plus"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <Label>{t("barcode", "showPrice")}</Label>
                  <Button
                    size="sm"
                    variant={showPrice ? "default" : "secondary"}
                    onClick={() => setShowPrice(!showPrice)}
                    data-testid="button-toggle-price"
                  >
                    {showPrice ? t("common", "yes") : t("common", "no")}
                  </Button>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={handlePrint}
                disabled={!barcodeGenerated}
                data-testid="button-print-barcode"
              >
                <Printer className="w-4 h-4 me-2" />
                {t("common", "print")} {quantity} {t("barcode", "printLabels")}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
