import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  History,
  Download,
  Loader2,
  Filter,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  FileSpreadsheet,
} from 'lucide-react';
import { format, isAfter, isBefore, startOfDay, endOfDay, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { exportToExcel } from '@/lib/fileParser';
import type { AttributeDefinition, Product } from '@/types/enrichment';

interface EnrichmentRun {
  id: string;
  file_name: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  total_count: number;
  success_count: number;
  failed_count: number;
  attributes: AttributeDefinition[];
}

interface EnrichmentItem {
  id: string;
  product_id: string;
  mfr: string | null;
  mpn: string | null;
  category: string | null;
  status: string;
  data: Record<string, string> | null;
  error: string | null;
}

export default function EnrichmentHistory() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [runs, setRuns] = useState<EnrichmentRun[]>([]);
  const [filteredRuns, setFilteredRuns] = useState<EnrichmentRun[]>([]);
  const [isLoadingRuns, setIsLoadingRuns] = useState(true);
  const [downloadingRunId, setDownloadingRunId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Fetch all runs
  useEffect(() => {
    const fetchRuns = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('user_enrichment_data')
          .select('id, file_name, status, created_at, completed_at, total_count, success_count, failed_count, attributes')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;

        setRuns(
          (data || []).map((run) => ({
            ...run,
            attributes: run.attributes as unknown as AttributeDefinition[],
          }))
        );
      } catch (error) {
        console.error('Error fetching runs:', error);
        toast.error('Failed to load enrichment history');
      } finally {
        setIsLoadingRuns(false);
      }
    };

    if (user) {
      fetchRuns();
    }
  }, [user]);

  // Filter runs by date range
  useEffect(() => {
    if (!runs.length) {
      setFilteredRuns([]);
      return;
    }

    let filtered = [...runs];

    if (dateFrom) {
      const fromDate = startOfDay(parseISO(dateFrom));
      filtered = filtered.filter(
        (run) =>
          isAfter(new Date(run.created_at), fromDate) ||
          format(new Date(run.created_at), 'yyyy-MM-dd') === dateFrom
      );
    }

    if (dateTo) {
      const toDate = endOfDay(parseISO(dateTo));
      filtered = filtered.filter(
        (run) =>
          isBefore(new Date(run.created_at), toDate) ||
          format(new Date(run.created_at), 'yyyy-MM-dd') === dateTo
      );
    }

    setFilteredRuns(filtered);
  }, [runs, dateFrom, dateTo]);

  const clearDateFilters = () => {
    setDateFrom('');
    setDateTo('');
  };

  const downloadRunResults = useCallback(async (run: EnrichmentRun) => {
    setDownloadingRunId(run.id);

    try {
      // Fetch all items for this run
      const all: EnrichmentItem[] = [];
      const pageSize = 1000;

      for (let from = 0; ; from += pageSize) {
        const { data, error } = await supabase
          .from('enrichment_run_items')
          .select('id, product_id, mfr, mpn, category, status, data, error')
          .eq('run_id', run.id)
          .order('created_at', { ascending: true })
          .range(from, from + pageSize - 1);

        if (error) {
          console.error('Error fetching items:', error);
          throw new Error('Failed to fetch run items');
        }

        if (!data || data.length === 0) break;
        all.push(
          ...data.map((item) => ({
            ...item,
            data: item.data as Record<string, string> | null,
          }))
        );
        if (data.length < pageSize) break;
      }

      if (all.length === 0) {
        toast.error('No results to download');
        return;
      }

      // Convert to products format
      const enrichedProducts: Product[] = all.map((item) => ({
        id: item.product_id,
        mfr: item.mfr || '',
        mpn: item.mpn || '',
        category: item.category || '',
        status: item.status as Product['status'],
        enrichedData: item.data || undefined,
        error: item.error || undefined,
      }));

      const blob = exportToExcel(enrichedProducts, run.attributes);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${run.file_name}_results.xlsx`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success('Results downloaded successfully');
    } catch (error) {
      console.error('Error downloading results:', error);
      toast.error('Failed to download results');
    } finally {
      setDownloadingRunId(null);
    }
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="default" className="bg-success/20 text-success border-success/30">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case 'processing':
        return (
          <Badge variant="secondary" className="bg-primary/20 text-primary">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Processing
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="secondary">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelled
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const displayRuns = dateFrom || dateTo ? filteredRuns : runs;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <History className="w-8 h-8 text-primary" />
              Enrichment History
            </h1>
            <p className="text-muted-foreground mt-1">
              View and download results from past enrichment runs
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/')}>
            <ChevronRight className="w-4 h-4 rotate-180" />
            Back to Enrichment
          </Button>
        </div>

        {/* Date Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filter by Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="dateFrom" className="text-sm">
                  From
                </Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="dateTo" className="text-sm">
                  To
                </Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-40"
                />
              </div>
              {(dateFrom || dateTo) && (
                <Button variant="ghost" size="sm" onClick={clearDateFilters}>
                  Clear Filters
                </Button>
              )}
              {(dateFrom || dateTo) && (
                <span className="text-sm text-muted-foreground">
                  Showing {filteredRuns.length} of {runs.length} runs
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Runs List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Enrichment Runs
            </CardTitle>
            <CardDescription>
              Click Download to export results to Excel
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingRuns ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : displayRuns.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {dateFrom || dateTo
                  ? 'No runs found for the selected date range.'
                  : 'No enrichment runs yet. Start your first enrichment on the home page.'}
              </div>
            ) : (
              <div className="space-y-3">
                {displayRuns.map((run) => (
                  <div
                    key={run.id}
                    className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-foreground">{run.file_name}</h3>
                        {getStatusBadge(run.status)}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(run.created_at), 'MMM dd, yyyy HH:mm')}
                        </span>
                        <span>
                          Total: <strong className="text-foreground">{run.total_count}</strong>
                        </span>
                        <span className="text-success">
                          Success: <strong>{run.success_count}</strong>
                        </span>
                        <span className="text-destructive">
                          Failed: <strong>{run.failed_count}</strong>
                        </span>
                        {run.completed_at && (
                          <span>
                            Completed: {format(new Date(run.completed_at), 'HH:mm')}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadRunResults(run)}
                      disabled={
                        downloadingRunId === run.id ||
                        run.status === 'pending' ||
                        run.status === 'processing'
                      }
                    >
                      {downloadingRunId === run.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      <span className="ml-2">Download</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
