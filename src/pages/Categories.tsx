import { useState, useEffect } from 'react';
import { circularsAPI } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BookOpen, Shield, GraduationCap, Wrench, Users, Microscope,
  Briefcase, ClipboardCheck, FileText, Lightbulb, Award, MoreHorizontal
} from 'lucide-react';

const categoryIcons: Record<string, any> = {
  'Regulation Update': Shield,
  'Hackathon Event': Lightbulb,
  'Workshop / Seminar': GraduationCap,
  'Curriculum Update': BookOpen,
  'Infrastructure': Wrench,
  'Faculty Development': Users,
  'Student Activities': Award,
  'Audit & Accreditation': ClipboardCheck,
  'Examination': FileText,
  'Research & Innovation': Microscope,
  'Placement & Internship': Briefcase,
  'Other': MoreHorizontal,
};

const categoryColors: Record<string, string> = {
  'Regulation Update': 'bg-blue-100 text-blue-600',
  'Hackathon Event': 'bg-purple-100 text-purple-600',
  'Workshop / Seminar': 'bg-green-100 text-green-600',
  'Curriculum Update': 'bg-amber-100 text-amber-600',
  'Infrastructure': 'bg-gray-100 text-gray-600',
  'Faculty Development': 'bg-indigo-100 text-indigo-600',
  'Student Activities': 'bg-pink-100 text-pink-600',
  'Audit & Accreditation': 'bg-red-100 text-red-600',
  'Examination': 'bg-teal-100 text-teal-600',
  'Research & Innovation': 'bg-cyan-100 text-cyan-600',
  'Placement & Internship': 'bg-orange-100 text-orange-600',
  'Other': 'bg-gray-100 text-gray-600',
};

const Categories = () => {
  const [summary, setSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    circularsAPI.categorySummary()
      .then(setSummary)
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

  const totalCirculars = summary.reduce((sum, s) => sum + s.total, 0);
  const totalCompleted = summary.reduce((sum, s) => sum + s.completed, 0);
  const overallRate = totalCirculars > 0 ? Math.round(totalCompleted / totalCirculars * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Category Summary</h1>
        <p className="text-muted-foreground">Overview of circulars organized by category</p>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{totalCirculars}</p>
            <p className="text-sm text-muted-foreground">Total Circulars</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-green-600">{totalCompleted}</p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-purple-600">{overallRate}%</p>
            <p className="text-sm text-muted-foreground">Overall Completion</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {summary.map(s => {
          const Icon = categoryIcons[s.category] || MoreHorizontal;
          const colorClass = categoryColors[s.category] || 'bg-gray-100 text-gray-600';
          const completionRate = s.total > 0 ? Math.round(s.completed / s.total * 100) : 0;

          return (
            <Card key={s.category} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-3 rounded-full ${colorClass}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">{s.category}</h3>
                    <p className="text-xs text-muted-foreground">{s.total} circulars</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Completion</span>
                      <span>{completionRate}%</span>
                    </div>
                    <Progress value={completionRate} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Compliance</span>
                      <span>{s.compliance_rate}%</span>
                    </div>
                    <Progress value={s.compliance_rate} className="h-2" />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t">
                    <div>
                      <p className="text-lg font-semibold text-amber-500">{s.active}</p>
                      <p className="text-xs text-muted-foreground">Active</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-green-500">{s.completed}</p>
                      <p className="text-xs text-muted-foreground">Done</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-blue-500">{s.total_submissions}</p>
                      <p className="text-xs text-muted-foreground">Subs</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Categories;
