export type PersonStatus = "active" | "on_leave" | "alumni" | "inactive";
export type StaffRole = "teacher" | "non_teaching";
export type IdentifierKind = "tsc_no" | "id_no";
export type MovementType = "receive" | "issue" | "adjust" | "return";
export type InvoiceKind = "purchase" | "issue_charge";
export type InvoiceStatus = "draft" | "issued" | "paid" | "void";
export type ApiProvider = "local" | "invoice_ninja" | "generic_rest";
export type AppRole = "admin" | "storekeeper" | "teacher" | "viewer";

export type SchoolClass = { id: number; name: string; sortOrder: number };
export type Stream = { id: number; classId: number; className: string; name: string };
export type Block = { id: number; name: string; gender: string };
export type Dormitory = {
  id: number;
  blockId: number;
  blockName: string;
  name: string;
  capacity: number;
  occupied: number;
};

export type Student = {
  admissionNo: string;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string | null;
  streamId: number;
  className: string;
  streamName: string;
  classLabel: string;
  dormitoryId: number | null;
  dormitoryName: string | null;
  blockName: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  status: PersonStatus;
  enrolledAt: string;
  notes: string | null;
};

export type StaffMember = {
  identifier: string;
  identifierKind: IdentifierKind;
  tscNo: string | null;
  idNo: string | null;
  firstName: string;
  lastName: string;
  roleType: StaffRole;
  jobTitle: string;
  department: string;
  phone: string | null;
  status: PersonStatus;
  hiredAt: string;
  notes: string | null;
};

export type Category = { id: number; name: string; slug: string };

export type InventoryItem = {
  id: number;
  sku: string;
  name: string;
  categoryId: number;
  categoryName: string;
  unit: string;
  quantityOnHand: number;
  reorderLevel: number;
  unitCost: number;
  location: string;
  description: string | null;
  isActive: boolean;
  externalId: string | null;
};

export type StockMovement = {
  id: number;
  itemId: number;
  itemName: string;
  sku: string;
  movementType: MovementType;
  quantity: number;
  unitCost: number;
  personType: string | null;
  personId: string | null;
  personName: string | null;
  notes: string | null;
  createdAt: string;
  actorUserId: string | null;
};

export type InvoiceLine = {
  id: number;
  itemId: number | null;
  description: string;
  quantity: number;
  unitPrice: number;
};

export type Invoice = {
  id: number;
  invoiceNo: string;
  kind: InvoiceKind;
  partyType: string;
  partyId: string | null;
  partyName: string;
  status: InvoiceStatus;
  issuedAt: string;
  dueAt: string | null;
  notes: string | null;
  externalId: string | null;
  total: number;
  lines: InvoiceLine[];
};

export type SchoolSettings = {
  schoolName: string;
  campus: string;
  currency: string;
  invoicePrefix: string;
  apiProvider: ApiProvider;
  apiBaseUrl: string | null;
  lastSyncAt: string | null;
  lastSyncNote: string | null;
};

export type DashboardData = {
  students: number;
  staff: number;
  teachers: number;
  items: number;
  lowStock: number;
  stockValue: number;
  openInvoices: number;
  openInvoiceTotal: number;
  byCategory: { name: string; quantity: number; value: number }[];
  recentMovements: StockMovement[];
  lowStockItems: InventoryItem[];
};

export type RemoteProduct = {
  externalId: string;
  sku: string;
  name: string;
  quantity: number;
  unitCost: number;
  notes: string;
};

export type CampusData = {
  classes: SchoolClass[];
  streams: Stream[];
  blocks: Block[];
  dormitories: Dormitory[];
};

export type AppAccount = {
  userId: string;
  email: string | null;
  displayName: string | null;
  role: AppRole;
  staffIdentifier: string | null;
  staffName: string | null;
  lastSeenAt: string;
};

export type BulkImportResult = {
  studentsCreated: number;
  studentsUpdated: number;
  staffCreated: number;
  staffUpdated: number;
  itemsCreated: number;
  itemsUpdated: number;
  errors: { kind: string; row: number; message: string }[];
};
