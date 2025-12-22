import { EnrichmentStats, Product } from '@/types/enrichment';
import { CheckCircle2, Clock, AlertCircle, Loader2, XCircle } from 'lucide-react';

interface StatsBarProps {
  stats: EnrichmentStats;
}

export function StatsBar({ stats }: StatsBarProps) {
  const items = [
    { label: 'Total', value: stats.total, icon: null, color: 'text-foreground' },
    { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-muted-foreground' },
    { label: 'Processing', value: stats.processing, icon: Loader2, color: 'text-primary', animate: true },
    { label: 'Success', value: stats.success, icon: CheckCircle2, color: 'text-success' },
    { label: 'Partial', value: stats.partial, icon: AlertCircle, color: 'text-warning' },
    { label: 'Failed', value: stats.failed, icon: XCircle, color: 'text-destructive' },
  ];

  const progressPercent = stats.total > 0 
    ? ((stats.success + stats.partial + stats.failed) / stats.total) * 100 
    : 0;

  return (
    <div className="bg-card border border-border rounded-lg p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Enrichment Progress</h3>
        <span className="text-sm font-mono text-primary">{progressPercent.toFixed(0)}%</span>
      </div>
      
      <div className="h-2 bg-muted rounded-full overflow-hidden mb-4">
        <div 
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {items.map((item) => (
          <div key={item.label} className="text-center p-2 rounded-lg bg-muted/30">
            <div className={`text-2xl font-bold font-mono ${item.color}`}>
              {item.value}
            </div>
            <div className="flex items-center justify-center gap-1 mt-1">
              {item.icon && (
                <item.icon className={`w-3 h-3 ${item.color} ${item.animate ? 'animate-spin' : ''}`} />
              )}
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
