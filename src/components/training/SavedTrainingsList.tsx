import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTraining } from '@/hooks/useTraining';
import { ManufacturerTraining } from '@/types/training';
import { Trash2, ExternalLink, Settings, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SavedTrainingsListProps {
  onSelect?: (training: ManufacturerTraining) => void;
}

export function SavedTrainingsList({ onSelect }: SavedTrainingsListProps) {
  const { trainings, isLoading, fetchTrainings, deleteTraining } = useTraining();

  useEffect(() => {
    fetchTrainings();
  }, [fetchTrainings]);

  if (isLoading && trainings.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading trainings...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (trainings.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            No trainings saved yet. Use Training Mode to create your first one.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          Saved Trainings
        </CardTitle>
        <CardDescription>
          Reusable extraction rules for manufacturer product pages
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {trainings.map((training) => (
            <div
              key={training.id}
              className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border hover:border-primary/30 transition-colors cursor-pointer"
              onClick={() => onSelect?.(training)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-foreground capitalize">
                    {training.manufacturer}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {training.selectors.length} selectors
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {training.test_url}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Updated {formatDistanceToNow(new Date(training.updated_at), { addSuffix: true })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(training.test_url, '_blank');
                  }}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTraining(training.id);
                  }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
