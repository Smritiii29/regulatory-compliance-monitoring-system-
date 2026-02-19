import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { dashboardAPI } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  FileText, Upload, CheckCircle, Clock, AlertTriangle, Users,
  TrendingUp, BarChart3, ArrowRight, XCircle
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.stats()
      .then(setStats)
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

  if (!stats) return <p className="text-muted-foreground p-6">Failed to load dashboard data.</p>;

  const isAdminOrPrincipal = user?.role === 'admin' || user?.role === 'principal';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {user?.name}</h1>
        <p className="text-muted-foreground capitalize">{user?.role}{user?.department ? ` — ${user.department}` : ''}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="Total Circulars" value={stats.total_circulars} color="text-blue-500" />
        <StatCard icon={Clock} label="Active Circulars" value={stats.active_circulars} color="text-amber-500" />
        <StatCard icon={CheckCircle} label="Approved Submissions" value={stats.approved_submissions} color="text-green-500" />
        <StatCard icon={TrendingUp} label="Compliance Rate" value={`${stats.compliance_rate}%`} color="text-purple-500" />
      </div>

      {/* Additional stat row for admin */}
      {isAdminOrPrincipal && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Upload} label="Pending Reviews" value={stats.pending_submissions} color="text-orange-500" />
          <StatCard icon={XCircle} label="Rejected" value={stats.rejected_submissions} color="text-red-500" />
          <StatCard icon={AlertTriangle} label="Overdue" value={stats.overdue_count} color="text-red-600" />
          <StatCard icon={Users} label="Active Users" value={stats.total_users} color="text-indigo-500" />
        </div>
      )}

      {/* Faculty-specific stats */}
      {user?.role === 'faculty' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard icon={Upload} label="My Submissions" value={stats.my_total_submissions || 0} color="text-blue-500" />
          <StatCard icon={CheckCircle} label="My Approved" value={stats.my_approved || 0} color="text-green-500" />
          <StatCard icon={Clock} label="My Pending" value={stats.my_pending || 0} color="text-amber-500" />
          <StatCard icon={XCircle} label="My Rejected" value={stats.my_rejected || 0} color="text-red-500" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Deadlines */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Upcoming Deadlines</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/circulars')}>
              View All <ArrowRight className="ml-1 w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {stats.upcoming_deadlines?.length > 0 ? (
              <div className="space-y-3">
                {stats.upcoming_deadlines.slice(0, 5).map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.title}</p>
                      <p className="text-xs text-muted-foreground">{c.category}</p>
                    </div>
                    <Badge variant={c.priority === 'high' ? 'destructive' : 'secondary'} className="ml-2 shrink-0">
                      {c.deadline ? new Date(c.deadline).toLocaleDateString() : 'No deadline'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No upcoming deadlines</p>
            )}
          </CardContent>
        </Card>

        {/* Overdue Circulars */}
        {stats.overdue_circulars?.length > 0 && (
          <Card className="border-destructive/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-destructive flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> Overdue Circulars
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.overdue_circulars.slice(0, 5).map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-destructive/5 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.title}</p>
                      <p className="text-xs text-muted-foreground">{c.category}</p>
                    </div>
                    <Badge variant="destructive" className="ml-2 shrink-0">
                      Overdue
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pending Circulars for Faculty */}
        {user?.role === 'faculty' && stats.pending_circulars?.length > 0 && (
          <Card className="border-amber-500/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Action Required</CardTitle>
              <Badge variant="secondary">{stats.pending_circulars.length}</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.pending_circulars.slice(0, 5).map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-500/10 rounded-lg cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-500/20 transition"
                    onClick={() => navigate('/circulars')}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.title}</p>
                      <p className="text-xs text-muted-foreground">{c.category} — {c.deadline ? new Date(c.deadline).toLocaleDateString() : 'No deadline'}</p>
                    </div>
                    <Button size="sm" variant="outline">Submit</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pending Reviews for Admin */}
        {isAdminOrPrincipal && stats.pending_reviews?.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Pending Reviews</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/submissions')}>
                Review All <ArrowRight className="ml-1 w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.pending_reviews.slice(0, 5).map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.user_name}</p>
                      <p className="text-xs text-muted-foreground">{s.circular_title} — {s.user_department}</p>
                    </div>
                    <Badge variant="outline">Pending</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Department Compliance (Admin/Principal) */}
      {isAdminOrPrincipal && stats.department_stats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5" /> Department-wise Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.department_stats.map((d: any) => (
                <div key={d.department} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-sm">{d.department}</p>
                    <Badge variant="secondary">{d.user_count} users</Badge>
                  </div>
                  <Progress value={d.compliance_rate} className="h-2 mb-1" />
                  <p className="text-xs text-muted-foreground">{d.compliance_rate}% compliance — {d.approved_submissions}/{d.total_submissions} approved</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* HOD Department Stats */}
      {user?.role === 'hod' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{user.department} Department Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-secondary/50 rounded-lg">
                <p className="text-2xl font-bold">{stats.department_users || 0}</p>
                <p className="text-xs text-muted-foreground">Faculty Members</p>
              </div>
              <div className="text-center p-4 bg-secondary/50 rounded-lg">
                <p className="text-2xl font-bold">{stats.department_submissions || 0}</p>
                <p className="text-xs text-muted-foreground">Submissions</p>
              </div>
              <div className="text-center p-4 bg-secondary/50 rounded-lg">
                <p className="text-2xl font-bold">{stats.department_approved || 0}</p>
                <p className="text-xs text-muted-foreground">Approved</p>
              </div>
              <div className="text-center p-4 bg-secondary/50 rounded-lg">
                <p className="text-2xl font-bold">{stats.department_compliance || 0}%</p>
                <p className="text-xs text-muted-foreground">Compliance Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Recent Activity</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/activity-log')}>
            View All <ArrowRight className="ml-1 w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {stats.recent_activity?.length > 0 ? (
            <div className="space-y-2">
              {stats.recent_activity.slice(0, 8).map((a: any) => (
                <div key={a.id} className="flex items-start gap-3 p-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{a.user_name}</span>
                    <span className="text-muted-foreground"> — {a.details}</span>
                    <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No recent activity</p>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        {isAdminOrPrincipal && (
          <>
            <Button onClick={() => navigate('/circulars')}>
              <Upload className="w-4 h-4 mr-2" /> Upload Circular
            </Button>
            <Button variant="outline" onClick={() => navigate('/submissions')}>
              <CheckCircle className="w-4 h-4 mr-2" /> Review Submissions
            </Button>
            <Button variant="outline" onClick={() => navigate('/reports')}>
              <BarChart3 className="w-4 h-4 mr-2" /> Generate Report
            </Button>
          </>
        )}
        <Button variant="outline" onClick={() => navigate('/circulars')}>
          <FileText className="w-4 h-4 mr-2" /> View Circulars
        </Button>
        <Button variant="outline" onClick={() => navigate('/chat')}>
          💬 Chat
        </Button>
      </div>
    </div>
  );
};

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-full bg-secondary ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default Dashboard;
