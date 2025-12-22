import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SelectorMapping } from '@/types/training';
import { Trash2, Image, Link, FileText, File } from 'lucide-react';

interface SelectorListProps {
  selectors: SelectorMapping[];
  onRemove: (id: string) => void;
}

const typeIcons = {
  image: Image,
  link: Link,
  text: FileText,
  datasheet: File,
};

const typeColors = {
  image: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  link: 'bg-green-500/20 text-green-400 border-green-500/30',
  text: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  datasheet: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

export function SelectorList({ selectors, onRemove }: SelectorListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Captured Selectors ({selectors.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {selectors.map((selector) => {
            const Icon = typeIcons[selector.type];
            return (
              <div
                key={selector.id}
                className="flex items-start justify-between p-3 rounded-lg bg-muted/50 border border-border"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`p-2 rounded-md ${typeColors[selector.type]}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-foreground">
                        {selector.columnName}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {selector.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {selector.cssSelector || selector.xpath}
                    </p>
                    {selector.previewValue && (
                      <p className="text-xs text-accent-foreground mt-1 truncate">
                        Preview: {selector.previewValue}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(selector.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
