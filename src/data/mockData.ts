export interface Document {
  id: string;
  title: string;
  category: 'approval' | 'regulation' | 'handbook' | 'curriculum' | 'policy' | 'report';
  currentVersion: string;
  status: 'active' | 'archived';
  uploadedBy: string;
  uploadedByRole: string;
  lastUpdated: string;
  department: string;
  description?: string;
  versions: DocumentVersion[];
}

export interface DocumentVersion {
  version: string;
  uploadedAt: string;
  uploadedBy: string;
  notes: string;
  fileSize: string;
}

export interface ComplianceItem {
  id: string;
  department: string;
  item: string;
  status: 'completed' | 'pending' | 'overdue' | 'in-progress';
  dueDate: string;
  submittedDate?: string;
  priority: 'high' | 'medium' | 'low';
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'document' | 'compliance' | 'system' | 'alert';
  isRead: boolean;
  createdAt: string;
  role?: string;
}

export interface DepartmentStats {
  name: string;
  abbreviation: string;
  totalDocuments: number;
  activeDocuments: number;
  archivedDocuments: number;
  complianceScore: number;
  pendingItems: number;
}

export interface ActivityLogEntry {
  id: string;
  action: 'upload' | 'update' | 'archive' | 'view' | 'download';
  documentName: string;
  version: string;
  performedBy: string;
  role: string;
  department: string;
  timestamp: string;
}

// Official Academic Departments
export const academicDepartments = [
  { name: 'Computer Science and Engineering', abbreviation: 'CSE' },
  { name: 'Information Technology', abbreviation: 'IT' },
  { name: 'Electronics and Communication Engineering', abbreviation: 'ECE' },
  { name: 'Electrical and Electronics Engineering', abbreviation: 'EEE' },
  { name: 'Mechanical Engineering', abbreviation: 'MECH' },
  { name: 'Chemical Engineering', abbreviation: 'CHEM' },
  { name: 'Biomedical Engineering', abbreviation: 'BME' },
  { name: 'M.Tech - Computer Science and Engineering', abbreviation: 'M.Tech CSE' },
];

export const documents: Document[] = [
  {
    id: '1',
    title: 'NHERC Approval Letter 2024',
    category: 'approval',
    currentVersion: '2.1',
    status: 'active',
    uploadedBy: 'Dr. Rajesh Kumar',
    uploadedByRole: 'Admin',
    lastUpdated: '2024-01-15',
    department: 'Computer Science and Engineering',
    description: 'Official approval letter from NHERC for academic year 2024-25',
    versions: [
      { version: '2.1', uploadedAt: '2024-01-15', uploadedBy: 'Dr. Rajesh Kumar', notes: 'Updated with corrigendum', fileSize: '2.3 MB' },
      { version: '2.0', uploadedAt: '2024-01-10', uploadedBy: 'Dr. Rajesh Kumar', notes: 'Annual renewal approval', fileSize: '2.1 MB' },
      { version: '1.0', uploadedAt: '2023-01-12', uploadedBy: 'Dr. Sunita Sharma', notes: 'Initial approval document', fileSize: '1.8 MB' },
    ],
  },
  {
    id: '2',
    title: 'NAC Self-Assessment Report',
    category: 'report',
    currentVersion: '1.3',
    status: 'active',
    uploadedBy: 'Dr. Sunita Sharma',
    uploadedByRole: 'Principal',
    lastUpdated: '2024-01-20',
    department: 'Electronics and Communication Engineering',
    description: 'Self-assessment report for NAC accreditation cycle 2024',
    versions: [
      { version: '1.3', uploadedAt: '2024-01-20', uploadedBy: 'Dr. Sunita Sharma', notes: 'Added missing annexures', fileSize: '15.2 MB' },
      { version: '1.2', uploadedAt: '2024-01-18', uploadedBy: 'Dr. Sunita Sharma', notes: 'Updated faculty data', fileSize: '14.8 MB' },
      { version: '1.1', uploadedAt: '2024-01-12', uploadedBy: 'Dr. Amit Patel', notes: 'Department contributions added', fileSize: '12.1 MB' },
      { version: '1.0', uploadedAt: '2024-01-05', uploadedBy: 'Dr. Sunita Sharma', notes: 'Initial draft', fileSize: '8.5 MB' },
    ],
  },
  {
    id: '3',
    title: 'Faculty Handbook 2024-25',
    category: 'handbook',
    currentVersion: '3.0',
    status: 'active',
    uploadedBy: 'Priya Nair',
    uploadedByRole: 'Staff',
    lastUpdated: '2024-02-01',
    department: 'Information Technology',
    description: 'Comprehensive handbook for faculty members',
    versions: [
      { version: '3.0', uploadedAt: '2024-02-01', uploadedBy: 'Priya Nair', notes: 'New academic year edition', fileSize: '5.6 MB' },
      { version: '2.5', uploadedAt: '2023-08-15', uploadedBy: 'Priya Nair', notes: 'Mid-year updates', fileSize: '5.2 MB' },
    ],
  },
  {
    id: '4',
    title: 'B.Tech CSE Curriculum Framework',
    category: 'curriculum',
    currentVersion: '4.2',
    status: 'active',
    uploadedBy: 'Dr. Amit Patel',
    uploadedByRole: 'HOD',
    lastUpdated: '2024-01-25',
    department: 'Computer Science and Engineering',
    description: 'Complete curriculum framework for B.Tech CSE program',
    versions: [
      { version: '4.2', uploadedAt: '2024-01-25', uploadedBy: 'Dr. Amit Patel', notes: 'Added AI/ML electives', fileSize: '3.2 MB' },
      { version: '4.1', uploadedAt: '2023-12-10', uploadedBy: 'Dr. Amit Patel', notes: 'Industry feedback incorporated', fileSize: '3.0 MB' },
      { version: '4.0', uploadedAt: '2023-07-01', uploadedBy: 'Dr. Amit Patel', notes: 'NEP 2020 aligned revision', fileSize: '2.8 MB' },
    ],
  },
  {
    id: '5',
    title: 'Anti-Ragging Policy Document',
    category: 'policy',
    currentVersion: '2.0',
    status: 'active',
    uploadedBy: 'Dr. Rajesh Kumar',
    uploadedByRole: 'Admin',
    lastUpdated: '2023-07-15',
    department: 'Mechanical Engineering',
    description: 'Institutional anti-ragging policy as per UGC guidelines',
    versions: [
      { version: '2.0', uploadedAt: '2023-07-15', uploadedBy: 'Dr. Rajesh Kumar', notes: 'Updated as per latest UGC circular', fileSize: '1.2 MB' },
      { version: '1.0', uploadedAt: '2020-08-01', uploadedBy: 'Dr. Sunita Sharma', notes: 'Initial policy document', fileSize: '0.8 MB' },
    ],
  },
  {
    id: '6',
    title: 'AICTE Extension of Approval 2023',
    category: 'approval',
    currentVersion: '1.0',
    status: 'archived',
    uploadedBy: 'Dr. Rajesh Kumar',
    uploadedByRole: 'Admin',
    lastUpdated: '2023-06-30',
    department: 'Electrical and Electronics Engineering',
    description: 'Legacy AICTE approval document (superseded by NHERC)',
    versions: [
      { version: '1.0', uploadedAt: '2023-06-30', uploadedBy: 'Dr. Rajesh Kumar', notes: 'Final AICTE approval before transition', fileSize: '2.5 MB' },
    ],
  },
];

export const complianceItems: ComplianceItem[] = [
  { id: '1', department: 'Computer Science and Engineering', item: 'Faculty Student Ratio Report', status: 'completed', dueDate: '2024-01-31', submittedDate: '2024-01-28', priority: 'high' },
  { id: '2', department: 'Computer Science and Engineering', item: 'Laboratory Equipment Inventory', status: 'pending', dueDate: '2024-02-15', priority: 'medium' },
  { id: '3', department: 'Mechanical Engineering', item: 'Faculty Qualification Details', status: 'overdue', dueDate: '2024-01-20', priority: 'high' },
  { id: '4', department: 'Information Technology', item: 'Research Publications List', status: 'in-progress', dueDate: '2024-02-10', priority: 'medium' },
  { id: '5', department: 'Electronics and Communication Engineering', item: 'Student Placement Report', status: 'completed', dueDate: '2024-01-25', submittedDate: '2024-01-24', priority: 'high' },
  { id: '6', department: 'Electronics and Communication Engineering', item: 'Industry Collaboration MoUs', status: 'pending', dueDate: '2024-02-20', priority: 'low' },
  { id: '7', department: 'Chemical Engineering', item: 'Safety Compliance Report', status: 'in-progress', dueDate: '2024-02-05', priority: 'high' },
  { id: '8', department: 'Electrical and Electronics Engineering', item: 'Annual Budget Utilization Report', status: 'overdue', dueDate: '2024-01-15', priority: 'high' },
  { id: '9', department: 'Biomedical Engineering', item: 'Infrastructure Audit Report', status: 'pending', dueDate: '2024-02-28', priority: 'medium' },
  { id: '10', department: 'M.Tech - Computer Science and Engineering', item: 'Research Output Summary', status: 'completed', dueDate: '2024-01-10', submittedDate: '2024-01-08', priority: 'high' },
];

export const notifications: Notification[] = [
  { id: '1', title: 'New Document Uploaded', message: 'NAC Self-Assessment Report v1.3 has been uploaded by Dr. Sunita Sharma', type: 'document', isRead: false, createdAt: '2024-01-20T10:30:00', role: 'Principal' },
  { id: '2', title: 'Compliance Deadline Approaching', message: 'Faculty Qualification Details for Mechanical Engineering is due in 2 days', type: 'compliance', isRead: false, createdAt: '2024-01-18T09:00:00', role: 'HOD' },
  { id: '3', title: 'Document Archived', message: 'AICTE Extension of Approval 2023 has been archived for audit reference', type: 'document', isRead: false, createdAt: '2024-01-17T14:45:00', role: 'Admin' },
  { id: '4', title: 'System Maintenance', message: 'Scheduled maintenance on January 25th from 2:00 AM to 4:00 AM IST', type: 'system', isRead: true, createdAt: '2024-01-16T11:00:00' },
  { id: '5', title: 'Overdue Submission Alert', message: 'Annual Budget Utilization Report from EEE department is overdue by 5 days', type: 'alert', isRead: true, createdAt: '2024-01-16T08:00:00', role: 'Admin' },
  { id: '6', title: 'Version Update', message: 'B.Tech CSE Curriculum Framework updated to version 4.2', type: 'document', isRead: true, createdAt: '2024-01-25T16:20:00', role: 'HOD' },
  { id: '7', title: 'Risk Flag Raised', message: 'Faculty shortage detected in Mechanical Engineering department', type: 'alert', isRead: false, createdAt: '2024-01-19T11:15:00', role: 'Admin' },
  { id: '8', title: 'Compliance Completed', message: 'M.Tech CSE Research Output Summary submitted successfully', type: 'compliance', isRead: true, createdAt: '2024-01-08T15:30:00', role: 'Staff' },
];

export const departmentStats: DepartmentStats[] = [
  { name: 'Computer Science and Engineering', abbreviation: 'CSE', totalDocuments: 45, activeDocuments: 42, archivedDocuments: 3, complianceScore: 92, pendingItems: 2 },
  { name: 'Information Technology', abbreviation: 'IT', totalDocuments: 38, activeDocuments: 36, archivedDocuments: 2, complianceScore: 88, pendingItems: 3 },
  { name: 'Electronics and Communication Engineering', abbreviation: 'ECE', totalDocuments: 41, activeDocuments: 40, archivedDocuments: 1, complianceScore: 90, pendingItems: 2 },
  { name: 'Electrical and Electronics Engineering', abbreviation: 'EEE', totalDocuments: 35, activeDocuments: 33, archivedDocuments: 2, complianceScore: 72, pendingItems: 5 },
  { name: 'Mechanical Engineering', abbreviation: 'MECH', totalDocuments: 38, activeDocuments: 35, archivedDocuments: 3, complianceScore: 68, pendingItems: 6 },
  { name: 'Chemical Engineering', abbreviation: 'CHEM', totalDocuments: 32, activeDocuments: 30, archivedDocuments: 2, complianceScore: 85, pendingItems: 3 },
  { name: 'Biomedical Engineering', abbreviation: 'BME', totalDocuments: 28, activeDocuments: 26, archivedDocuments: 2, complianceScore: 82, pendingItems: 4 },
  { name: 'M.Tech - Computer Science and Engineering', abbreviation: 'M.Tech CSE', totalDocuments: 22, activeDocuments: 21, archivedDocuments: 1, complianceScore: 95, pendingItems: 1 },
];

export const activityLog: ActivityLogEntry[] = [
  { id: '1', action: 'upload', documentName: 'NAC Self-Assessment Report', version: '1.3', performedBy: 'Dr. Sunita Sharma', role: 'Principal', department: 'Electronics and Communication Engineering', timestamp: '2024-01-20T10:30:00' },
  { id: '2', action: 'update', documentName: 'B.Tech CSE Curriculum Framework', version: '4.2', performedBy: 'Dr. Amit Patel', role: 'HOD', department: 'Computer Science and Engineering', timestamp: '2024-01-25T16:20:00' },
  { id: '3', action: 'archive', documentName: 'AICTE Extension of Approval 2023', version: '1.0', performedBy: 'Dr. Rajesh Kumar', role: 'Admin', department: 'Electrical and Electronics Engineering', timestamp: '2024-01-17T14:45:00' },
  { id: '4', action: 'download', documentName: 'Faculty Handbook 2024-25', version: '3.0', performedBy: 'Priya Nair', role: 'Staff', department: 'Information Technology', timestamp: '2024-01-22T09:15:00' },
  { id: '5', action: 'view', documentName: 'Anti-Ragging Policy Document', version: '2.0', performedBy: 'Dr. Sunita Sharma', role: 'Principal', department: 'Mechanical Engineering', timestamp: '2024-01-21T11:00:00' },
  { id: '6', action: 'upload', documentName: 'NHERC Approval Letter 2024', version: '2.1', performedBy: 'Dr. Rajesh Kumar', role: 'Admin', department: 'Computer Science and Engineering', timestamp: '2024-01-15T14:30:00' },
  { id: '7', action: 'update', documentName: 'NAC Self-Assessment Report', version: '1.2', performedBy: 'Dr. Sunita Sharma', role: 'Principal', department: 'Electronics and Communication Engineering', timestamp: '2024-01-18T10:00:00' },
  { id: '8', action: 'download', documentName: 'B.Tech CSE Curriculum Framework', version: '4.1', performedBy: 'Staff Member', role: 'Staff', department: 'Computer Science and Engineering', timestamp: '2024-01-16T15:45:00' },
];

export const regulatoryBodies = [
  {
    id: 'nherc',
    name: 'National Higher Education Regulatory Council',
    abbreviation: 'NHERC',
    description: 'The apex regulatory body for higher education in India, replacing AICTE for technical education regulation.',
    status: 'active',
    lastUpdated: '2024-01-15',
    documents: 12,
  },
  {
    id: 'nac',
    name: 'National Accreditation Council',
    abbreviation: 'NAC',
    description: 'The unified accreditation body for higher educational institutions, replacing NAAC and NBA.',
    status: 'active',
    lastUpdated: '2024-01-20',
    documents: 8,
  },
  {
    id: 'ugc',
    name: 'University Grants Commission',
    abbreviation: 'UGC',
    description: 'Statutory body for coordination and maintenance of standards in university education.',
    status: 'active',
    lastUpdated: '2024-01-10',
    documents: 15,
  },
  {
    id: 'aicte',
    name: 'All India Council for Technical Education',
    abbreviation: 'AICTE',
    description: 'Legacy (Reference Only) – Superseded by NHERC. Historical documents maintained for audit and compliance reference.',
    status: 'legacy',
    lastUpdated: '2023-12-31',
    documents: 45,
  },
  {
    id: 'naac',
    name: 'National Assessment and Accreditation Council',
    abbreviation: 'NAAC',
    description: 'Legacy (Reference Only) – Superseded by NAC. Historical documents maintained for audit and compliance reference.',
    status: 'legacy',
    lastUpdated: '2023-12-31',
    documents: 28,
  },
];
