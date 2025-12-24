import { Product, AttributeDefinition } from "@/types/enrichment";
import { getAttributesForCategory } from "@/lib/fileParser";
import { CheckCircle2, Clock, AlertCircle, Loader2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface ProductTableProps {
  products: Product[];
  attributes: AttributeDefinition[];
}

const statusConfig: Record<
  Product["status"],
  { icon: typeof Clock; color: string; bg: string; label: string; animate?: boolean }
> = {
  pending: { icon: Clock, color: "text-muted-foreground", bg: "bg-muted/50", label: "Pending" },
  processing: { icon: Loader2, color: "text-primary", bg: "bg-primary/10", label: "Processing", animate: true },
  success: { icon: CheckCircle2, color: "text-success", bg: "bg-success/10", label: "Success" },
  partial: { icon: AlertCircle, color: "text-warning", bg: "bg-warning/10", label: "Partial" },
  failed: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Failed" },
};

export function ProductTable({ products, attributes }: ProductTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Get all unique attributes
  const allAttributes = [...new Set(attributes.map((a) => a.attributeName))];

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden animate-fade-in">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="data-cell text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="data-cell text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Manufacturer name
              </th>
              <th className="data-cell text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Manufacturer Part Number
              </th>
              <th className="data-cell text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Category
              </th>
              {allAttributes.slice(0, 4).map((attr) => (
                <th
                  key={attr}
                  className="data-cell text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell"
                >
                  {attr}
                </th>
              ))}
              <th className="data-cell text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products.map((product) => {
              const status = statusConfig[product.status];
              const StatusIcon = status.icon;
              const isExpanded = expandedRow === product.id;
              const categoryAttributes = getAttributesForCategory(product.category, attributes);

              return (
                <>
                  <tr key={product.id} className="hover:bg-muted/20 transition-colors">
                    <td className="data-cell">
                      <span className={`status-badge ${status.bg} ${status.color}`}>
                        <StatusIcon className={`w-3 h-3 ${status.animate ? "animate-spin" : ""}`} />
                        <span className="hidden sm:inline">{status.label}</span>
                      </span>
                    </td>
                    <td className="data-cell font-medium text-foreground">{product.mfr}</td>
                    <td className="data-cell font-mono text-sm">{product.mpn}</td>
                    <td className="data-cell">
                      <span className="px-2 py-1 rounded bg-accent text-accent-foreground text-xs">
                        {product.category}
                      </span>
                    </td>
                    {allAttributes.slice(0, 4).map((attr) => (
                      <td key={attr} className="data-cell text-muted-foreground hidden lg:table-cell">
                        {product.enrichedData?.[attr] || "—"}
                      </td>
                    ))}
                    <td className="data-cell">
                      <button
                        onClick={() => setExpandedRow(isExpanded ? null : product.id)}
                        className="p-1 hover:bg-muted rounded transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${product.id}-expanded`} className="bg-muted/10">
                      <td colSpan={5 + Math.min(4, allAttributes.length)} className="p-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Category Attributes</p>
                            <div className="flex flex-wrap gap-1">
                              {categoryAttributes.map((attr) => (
                                <span key={attr} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded">
                                  {attr}
                                </span>
                              ))}
                            </div>
                          </div>
                          {product.enrichedData && Object.keys(product.enrichedData).length > 0 && (
                            <div className="col-span-2 md:col-span-3">
                              <p className="text-xs text-muted-foreground mb-1">Enriched Values</p>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {Object.entries(product.enrichedData).map(([key, value]) => (
                                  <div key={key} className="bg-card p-2 rounded border border-border">
                                    <p className="text-xs text-muted-foreground">{key}</p>
                                    <p className="text-sm font-mono text-foreground">{value || "—"}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {product.error && (
                            <div className="col-span-2 md:col-span-3">
                              <p className="text-xs text-destructive mb-1">Error</p>
                              <p className="text-sm text-destructive/80">{product.error}</p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {products.length === 0 && (
        <div className="p-12 text-center text-muted-foreground">
          <p>No products loaded yet</p>
        </div>
      )}
    </div>
  );
}
