import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  BookOpen,
  Download,
  ExternalLink,
  FileText,
  Info,
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Shield,
} from 'lucide-react';
import { regulatoryBodies } from '@/data/mockData';
import regulatoryImage from '@/assets/regulatory-frameworks.png';

const regulatoryDocuments = [
  {
    id: '1',
    title: 'NHERC Guidelines for Technical Institutions 2024',
    body: 'NHERC',
    year: '2024',
    type: 'Guidelines',
    pages: 156,
  },
  {
    id: '2',
    title: 'NAC Accreditation Manual - Self Study Report Format',
    body: 'NAC',
    year: '2024',
    type: 'Manual',
    pages: 89,
  },
  {
    id: '3',
    title: 'Quality Assurance Framework for Higher Education',
    body: 'NHERC',
    year: '2024',
    type: 'Framework',
    pages: 124,
  },
  {
    id: '4',
    title: 'NAC Assessment Criteria and Weightages',
    body: 'NAC',
    year: '2024',
    type: 'Criteria',
    pages: 45,
  },
  {
    id: '5',
    title: 'Faculty Qualification Requirements - Consolidated',
    body: 'NHERC',
    year: '2024',
    type: 'Requirements',
    pages: 32,
  },
];

const keyChanges = [
  {
    title: 'Unified Regulatory Framework',
    description: 'NHERC replaces AICTE as the single regulatory body for all technical education.',
    impact: 'high',
  },
  {
    title: 'Integrated Accreditation',
    description: 'NAC combines NAAC and NBA functions for unified quality assessment.',
    impact: 'high',
  },
  {
    title: 'Outcome-Based Assessment',
    description: 'Greater emphasis on learning outcomes and graduate attributes.',
    impact: 'medium',
  },
  {
    title: 'Digital Documentation',
    description: 'All submissions now require digital documentation with version control.',
    impact: 'medium',
  },
  {
    title: 'Continuous Monitoring',
    description: 'Annual compliance reporting replacing periodic inspections.',
    impact: 'low',
  },
];

const Regulatory = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Two-Column Hero Layout */}
      <div className="relative rounded-xl overflow-hidden shadow-lg bg-card border">
        <div className="grid md:grid-cols-2 gap-0">
          {/* Left Column - Title and Description */}
          <div className="p-8 flex flex-col justify-center bg-gradient-to-br from-primary/5 to-transparent">
            <h1 className="text-3xl font-bold text-foreground mb-3">Regulatory Frameworks</h1>
            <p className="text-muted-foreground leading-relaxed">
              Indian Engineering, Accreditation & Governance guidelines for higher educational institutions. 
              View current NHERC and NAC regulations alongside legacy documentation for audit reference.
            </p>
            <div className="flex items-center gap-4 mt-4">
              <Badge variant="success" className="text-sm">NHERC Active</Badge>
              <Badge variant="success" className="text-sm">NAC Active</Badge>
            </div>
          </div>
          {/* Right Column - Contextual Image */}
          <div className="relative h-64 md:h-auto">
            <img 
              src={regulatoryImage} 
              alt="Regulatory Frameworks in Higher Education" 
              className="w-full h-full object-cover opacity-85"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-card/50" />
          </div>
        </div>
      </div>

      {/* Regulatory Bodies */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {regulatoryBodies.map((body) => (
          <Card
            key={body.id}
            className={`shadow-card transition-all hover:shadow-md hover:scale-[1.01] ${
              body.status === 'legacy' ? 'opacity-75' : ''
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all ${
                    body.status === 'active' 
                      ? 'bg-primary/10' 
                      : 'bg-muted'
                  }`}>
                    <Building2 className={`w-6 h-6 ${
                      body.status === 'active' ? 'text-primary' : 'text-muted-foreground'
                    }`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{body.abbreviation}</CardTitle>
                    <Badge variant={body.status === 'active' ? 'success' : 'secondary'}>
                      {body.status === 'active' ? 'Active Regulator' : 'Legacy (Reference Only)'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm font-medium">{body.name}</p>
              <p className="text-sm text-muted-foreground">{body.description}</p>
              <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
                <span>{body.documents} documents</span>
                <span>Updated: {new Date(body.lastUpdated).toLocaleDateString('en-IN')}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Governance Transition Notice */}
      <Card className="shadow-card border-info/30 bg-info/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Info className="w-6 h-6 text-info flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-foreground">Regulatory Transition Notice</h3>
              <p className="text-sm text-muted-foreground mt-1">
                As per Government of India guidelines, technical education regulation has transitioned from 
                AICTE to NHERC, and accreditation from NAAC/NBA to NAC. Legacy documents are preserved 
                for audit and compliance reference only.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Content */}
      <Tabs defaultValue="documents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="documents">
            <FileText className="w-4 h-4 mr-2" />
            Documents & Guidelines
          </TabsTrigger>
          <TabsTrigger value="changes">
            <Info className="w-4 h-4 mr-2" />
            Key Changes
          </TabsTrigger>
          <TabsTrigger value="annexures">
            <BookOpen className="w-4 h-4 mr-2" />
            Reference Handbooks
          </TabsTrigger>
        </TabsList>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Regulatory Documents</CardTitle>
              <CardDescription>
                Official guidelines, manuals, and requirement documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {regulatoryDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-secondary/30 transition-all hover:shadow-md"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{doc.title}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <Badge variant={doc.body === 'NHERC' || doc.body === 'NAC' ? 'success' : 'secondary'}>
                            {doc.body}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {doc.type} • {doc.pages} pages
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{doc.year}</Badge>
                      <Button variant="outline" size="sm" className="transition-all hover:scale-105">
                        <Download className="w-4 h-4 mr-1" />
                        PDF
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Key Changes Tab */}
        <TabsContent value="changes">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                What Changed from Previous Regulatory Framework
              </CardTitle>
              <CardDescription>
                Summary of key changes from AICTE/NAAC/NBA to NHERC/NAC framework
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {keyChanges.map((change, index) => (
                  <Tooltip key={index}>
                    <TooltipTrigger asChild>
                      <div
                        className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-secondary/30 transition-all cursor-help hover:shadow-md"
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          change.impact === 'high'
                            ? 'bg-destructive/10'
                            : change.impact === 'medium'
                            ? 'bg-warning/10'
                            : 'bg-info/10'
                        }`}>
                          {change.impact === 'high' ? (
                            <AlertTriangle className="w-5 h-5 text-destructive" />
                          ) : change.impact === 'medium' ? (
                            <Clock className="w-5 h-5 text-warning" />
                          ) : (
                            <Info className="w-5 h-5 text-info" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{change.title}</p>
                            <Badge
                              variant={
                                change.impact === 'high'
                                  ? 'destructive'
                                  : change.impact === 'medium'
                                  ? 'warning'
                                  : 'info'
                              }
                              className="text-xs"
                            >
                              {change.impact} impact
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {change.description}
                          </p>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p>This change requires institutions to update their compliance processes accordingly.</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reference Handbooks Tab */}
        <TabsContent value="annexures">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Reference Handbooks & Annexures</CardTitle>
              <CardDescription>
                Supplementary materials and detailed annexures for accreditation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { title: 'Self-Study Report Handbook', desc: 'Complete guide for preparing SSR as per NAC requirements', icon: BookOpen },
                  { title: 'Data Collection Templates', desc: 'Standardized templates for department-wise data submission', icon: FileText },
                  { title: 'Compliance Checklist', desc: 'Comprehensive checklist for NHERC compliance requirements', icon: CheckCircle2 },
                  { title: 'Assessment Criteria Details', desc: 'Detailed criteria and weightages for NAC assessment', icon: FileText },
                ].map((item) => (
                  <div key={item.title} className="p-4 rounded-lg border bg-card hover:bg-secondary/30 transition-all hover:shadow-md">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                        <item.icon className="w-5 h-5 text-accent" />
                      </div>
                      <h3 className="font-medium">{item.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{item.desc}</p>
                    <Button variant="outline" size="sm" className="w-full transition-all hover:scale-[1.02]">
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground py-4">
        <p className="flex items-center justify-center gap-2">
          <Shield className="w-4 h-4" />
          Regulatory documents are read-only • Contact Compliance Cell for queries
        </p>
      </div>
    </div>
  );
};

export default Regulatory;
