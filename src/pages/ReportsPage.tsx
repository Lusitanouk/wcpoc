import { FileText, Download } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ReportsPage() {
  return (
    <div>
      <h1 className="text-xl font-bold mb-6">Reports</h1>
      <div className="grid grid-cols-2 gap-4 max-w-2xl">
        {['Screening Summary', 'Case Audit Report', 'Match Resolution Report', 'OGS Status Report'].map(r => (
          <Card key={r}>
            <CardContent className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">{r}</span>
              </div>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                <Download className="h-3 w-3" /> Export
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-6">
        Report exports are simulated in this prototype. In production, reports would be generated and downloaded as CSV/PDF.
      </p>
    </div>
  );
}
