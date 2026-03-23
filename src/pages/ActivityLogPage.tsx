import { useState, useEffect } from 'react';
import { dashboardAPI } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { History, ChevronLeft, ChevronRight } from 'lucide-react';

const ActivityLogPage = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    dashboardAPI.activity(page)
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  const actionColor = (action: string) => {
    if (action.includes('approve')) return 'bg-green-100 text-green-700';
    if (action.includes('reject')) return 'bg-red-100 text-red-700';
    if (action.includes('create') || action.includes('submit') || action.includes('signup')) return 'bg-blue-100 text-blue-700';
    if (action.includes('delete')) return 'bg-red-100 text-red-700';
    if (action.includes('login')) return 'bg-gray-100 text-gray-700';
    return 'bg-secondary text-secondary-foreground';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <History className="w-6 h-6" /> Activity Log
        </h1>
        <p className="text-muted-foreground">Track all system activities and actions</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No activity logs found</CardContent></Card>
      ) : (
        <>
          <div className="space-y-2">
            {logs.map(log => (
              <Card key={log.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium text-sm">{log.user_name}</span>
                        <Badge variant="outline" className="text-xs">{log.user_role}</Badge>
                        <Badge className={`text-xs ${actionColor(log.action)}`}>{log.action}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{log.details}</p>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(log.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-center gap-4">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>
            <span className="text-sm text-muted-foreground">Page {page}</span>
            <Button variant="outline" size="sm" disabled={logs.length < 50} onClick={() => setPage(p => p + 1)}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default ActivityLogPage;
