import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { dashboardAPI } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Shield, Award, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

const Accreditation = () => {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.accreditation()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return <p className="text-muted-foreground p-6">Access denied or failed to load.</p>;

  const readinessColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="w-6 h-6" /> Accreditation Readiness
        </h1>
        <p className="text-muted-foreground">Track compliance against regulatory body requirements</p>
      </div>

      {/* Overall Readiness */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <p className={`text-5xl font-bold ${readinessColor(data.overall_readiness)}`}>
                {data.overall_readiness}%
              </p>
              <p className="text-sm text-muted-foreground mt-1">Overall Readiness Score</p>
            </div>
            <div className="w-32">
              <Progress value={data.overall_readiness} className="h-4" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-regulation cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.regulations?.map((r: any) => (
          <Card key={r.regulation_type} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  {r.regulation_type}
                </span>
                <Badge variant={r.readiness_score >= 80 ? 'default' : r.readiness_score >= 50 ? 'secondary' : 'destructive'}>
                  {r.readiness_score}%
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={r.readiness_score} className="h-3 mb-4" />

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <p className="text-xl font-bold">{r.total_circulars}</p>
                  <p className="text-xs text-muted-foreground">Circulars</p>
                </div>
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <p className="text-xl font-bold text-green-600">{r.completed}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <p className="text-xl font-bold text-amber-600">{r.active}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <p className="text-xl font-bold text-blue-600">{r.approved_submissions}/{r.total_submissions}</p>
                  <p className="text-xs text-muted-foreground">Submissions</p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                {r.readiness_score >= 80 ? (
                  <><CheckCircle className="w-4 h-4 text-green-500" /><span className="text-xs text-green-600">On track for accreditation</span></>
                ) : r.readiness_score >= 50 ? (
                  <><AlertTriangle className="w-4 h-4 text-amber-500" /><span className="text-xs text-amber-600">Needs attention</span></>
                ) : (
                  <><AlertTriangle className="w-4 h-4 text-red-500" /><span className="text-xs text-red-600">Critical — action required</span></>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Accreditation;
