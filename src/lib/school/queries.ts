import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import type {
  ApiProvider,
  AppAccount,
  AppRole,
  BulkImportResult,
  CampusData,
  Category,
  DashboardData,
  Dormitory,
  IdentifierKind,
  InventoryItem,
  Invoice,
  InvoiceLine,
  RemoteProduct,
  SchoolClass,
  SchoolSettings,
  StaffMember,
  StaffRole,
  StockMovement,
  Stream,
  Student,
} from "./types";

function num(v: unknown) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
function str(v: unknown) {
  return v == null ? null : String(v);
}

function mapStudent(r: Record<string, unknown>): Student {
  const className = String(r.class_name ?? "");
  const streamName = String(r.stream_name ?? "");
  return {
    admissionNo: String(r.admission_no),
    firstName: String(r.first_name),
    lastName: String(r.last_name),
    gender: String(r.gender),
    dateOfBirth: r.date_of_birth ? String(r.date_of_birth).slice(0, 10) : null,
    streamId: num(r.stream_id),
    className,
    streamName,
    classLabel: className && streamName ? `${className} ${streamName}` : className,
    dormitoryId: r.dormitory_id == null ? null : num(r.dormitory_id),
    dormitoryName: str(r.dormitory_name),
    blockName: str(r.block_name),
    guardianName: str(r.guardian_name),
    guardianPhone: str(r.guardian_phone),
    status: String(r.status) as Student["status"],
    enrolledAt: String(r.enrolled_at).slice(0, 10),
    notes: str(r.notes),
  };
}

function mapStaff(r: Record<string, unknown>): StaffMember {
  return {
    identifier: String(r.identifier),
    identifierKind: String(r.identifier_kind) as IdentifierKind,
    tscNo: str(r.tsc_no),
    idNo: str(r.id_no),
    firstName: String(r.first_name),
    lastName: String(r.last_name),
    roleType: String(r.role_type) as StaffRole,
    jobTitle: String(r.job_title),
    department: String(r.department),
    phone: str(r.phone),
    status: String(r.status) as StaffMember["status"],
    hiredAt: String(r.hired_at).slice(0, 10),
    notes: str(r.notes),
  };
}

function mapItem(r: Record<string, unknown>): InventoryItem {
  return {
    id: num(r.id),
    sku: String(r.sku),
    name: String(r.name),
    categoryId: num(r.category_id),
    categoryName: String(r.category_name ?? ""),
    unit: String(r.unit),
    quantityOnHand: num(r.quantity_on_hand),
    reorderLevel: num(r.reorder_level),
    unitCost: num(r.unit_cost),
    location: String(r.location),
    description: str(r.description),
    isActive: Boolean(r.is_active),
    externalId: str(r.external_id),
  };
}

function mapMovement(r: Record<string, unknown>): StockMovement {
  return {
    id: num(r.id),
    itemId: num(r.item_id),
    itemName: String(r.item_name ?? ""),
    sku: String(r.sku ?? ""),
    movementType: String(r.movement_type) as StockMovement["movementType"],
    quantity: num(r.quantity),
    unitCost: num(r.unit_cost),
    personType: str(r.person_type),
    personId: str(r.person_id),
    personName: str(r.person_name),
    notes: str(r.notes),
    createdAt: String(r.created_at),
    actorUserId: str(r.actor_user_id),
  };
}

function mapAccount(r: Record<string, unknown>): AppAccount {
  return {
    userId: String(r.user_id),
    email: str(r.email),
    displayName: str(r.display_name),
    role: String(r.role ?? "storekeeper") as AppRole,
    staffIdentifier: str(r.staff_identifier),
    staffName: str(r.staff_name),
    lastSeenAt: String(r.last_seen_at),
  };
}

const STUDENT_SELECT = `
  select st.admission_no, st.first_name, st.last_name, st.gender, st.date_of_birth,
         st.stream_id, st.dormitory_id, st.guardian_name, st.guardian_phone,
         st.status, st.enrolled_at, st.notes,
         c.name as class_name, sm.name as stream_name,
         d.name as dormitory_name, b.name as block_name
  from students st
  join streams sm on sm.id = st.stream_id
  join classes c on c.id = sm.class_id
  left join dormitories d on d.id = st.dormitory_id
  left join blocks b on b.id = d.block_id
`;

const ITEM_SELECT = `
  select i.*, c.name as category_name
  from inventory_items i
  join inventory_categories c on c.id = i.category_id
`;

const MOVEMENT_SELECT = `
  select m.id, m.item_id, m.movement_type, m.quantity, m.unit_cost,
         m.person_type, m.person_id, m.person_name, m.notes, m.created_at, m.actor_user_id,
         i.name as item_name, i.sku
  from stock_movements m
  join inventory_items i on i.id = m.item_id
`;

const ACCOUNT_SELECT = `
  select a.user_id, a.email, a.display_name, a.role, a.staff_identifier, a.last_seen_at,
         case when s.identifier is null then null else s.first_name || ' ' || s.last_name end as staff_name
  from app_users a
  left join staff s on s.identifier = a.staff_identifier
`;

function mapInvoice(r: Record<string, unknown>, lines: Record<string, unknown>[]): Invoice {
  const mappedLines: InvoiceLine[] = lines.map((l) => ({
    id: num(l.id),
    itemId: l.item_id == null ? null : num(l.item_id),
    description: String(l.description),
    quantity: num(l.quantity),
    unitPrice: num(l.unit_price),
  }));
  return {
    id: num(r.id),
    invoiceNo: String(r.invoice_no),
    kind: String(r.kind) as Invoice["kind"],
    partyType: String(r.party_type),
    partyId: str(r.party_id),
    partyName: String(r.party_name),
    status: String(r.status) as Invoice["status"],
    issuedAt: String(r.issued_at).slice(0, 10),
    dueAt: r.due_at ? String(r.due_at).slice(0, 10) : null,
    notes: str(r.notes),
    externalId: str(r.external_id),
    total: mappedLines.reduce((s, l) => s + l.quantity * l.unitPrice, 0),
    lines: mappedLines,
  };
}

async function loadInvoice(sql: Awaited<ReturnType<typeof getSql>>, id: number) {
  const rows = await sql.query<Record<string, unknown>>(`select * from invoices where id = $1`, [id]);
  if (!rows[0]) return null;
  const lines = await sql.query<Record<string, unknown>>(
    `select * from invoice_lines where invoice_id = $1 order by id`,
    [id],
  );
  return mapInvoice(rows[0], lines);
}

async function nextInvoiceNo(sql: Awaited<ReturnType<typeof getSql>>) {
  const settings = await sql.query<{ invoice_prefix: string }>(
    `select invoice_prefix from school_settings where id = 1`,
  );
  const prefix = settings[0]?.invoice_prefix ?? "INV";
  const year = new Date().getFullYear();
  const rows = await sql.query<{ c: number }>(
    `select count(*)::int as c from invoices where invoice_no like $1`,
    [`${prefix}-${year}-%`],
  );
  return `${prefix}-${year}-${String((rows[0]?.c ?? 0) + 1).padStart(4, "0")}`;
}

async function ensureAppUser(userId: string) {
  const sql = await getSql();
  const identity = await sql.query<{ email: string | null; name: string | null }>(
    `select email, name from "user" where id = $1`,
    [userId],
  );
  const email = identity[0]?.email ?? null;
  const displayName = identity[0]?.name ?? (email ? email.split("@")[0] : null);
  await sql.query(
    `insert into app_users (user_id, email, display_name, last_seen_at)
     values ($1, $2, $3, now())
     on conflict (user_id) do update set
       email = coalesce(excluded.email, app_users.email),
       display_name = coalesce(excluded.display_name, app_users.display_name),
       last_seen_at = now()`,
    [userId, email, displayName],
  );
  const rows = await sql.query<Record<string, unknown>>(`${ACCOUNT_SELECT} where a.user_id = $1`, [userId]);
  return rows[0] ? mapAccount(rows[0]) : null;
}

export const emptyCampus: CampusData = { classes: [], streams: [], blocks: [], dormitories: [] };

export const emptyDashboard: DashboardData = {
  students: 0,
  staff: 0,
  teachers: 0,
  items: 0,
  lowStock: 0,
  stockValue: 0,
  openInvoices: 0,
  openInvoiceTotal: 0,
  byCategory: [],
  recentMovements: [],
  lowStockItems: [],
};

export const emptySettings: SchoolSettings = {
  schoolName: "Arden School",
  campus: "Ridge Campus",
  currency: "KES",
  invoicePrefix: "INV",
  apiProvider: "local",
  apiBaseUrl: null,
  lastSyncAt: null,
  lastSyncNote: null,
};

export const touchSession = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    return ensureAppUser(context.userId);
  });

export const listAppUsers = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ensureAppUser(context.userId);
    const sql = await getSql();
    const rows = await sql.query<Record<string, unknown>>(`${ACCOUNT_SELECT} order by a.last_seen_at desc`);
    return rows.map(mapAccount);
  });

export const linkStaffIdentity = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ staffIdentifier: z.string().min(1).max(24) }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureAppUser(context.userId);
    const staff = await sql.query<{ identifier: string }>(`select identifier from staff where identifier = $1`, [
      data.staffIdentifier.trim(),
    ]);
    if (!staff[0]) throw new Error("No staff record matches that TSC or ID number");
    await sql.query(`update app_users set staff_identifier = $1, last_seen_at = now() where user_id = $2`, [
      staff[0].identifier,
      context.userId,
    ]);
    const rows = await sql.query<Record<string, unknown>>(`${ACCOUNT_SELECT} where a.user_id = $1`, [context.userId]);
    return mapAccount(rows[0]);
  });

export const getCampus = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async (): Promise<CampusData> => {
    const sql = await getSql();
    const classes = await sql.query<Record<string, unknown>>(
      `select id, name, sort_order from classes order by sort_order`,
    );
    const streams = await sql.query<Record<string, unknown>>(
      `select s.id, s.class_id, s.name, c.name as class_name
       from streams s join classes c on c.id = s.class_id
       order by c.sort_order, s.name`,
    );
    const blocks = await sql.query<Record<string, unknown>>(
      `select id, name, gender from blocks order by name`,
    );
    const dorms = await sql.query<Record<string, unknown>>(
      `select d.id, d.block_id, d.name, d.capacity, b.name as block_name,
              (select count(*)::int from students st where st.dormitory_id = d.id and st.status = 'active') as occupied
       from dormitories d join blocks b on b.id = d.block_id
       order by b.name, d.name`,
    );
    return {
      classes: classes.map((r) => ({ id: num(r.id), name: String(r.name), sortOrder: num(r.sort_order) })) as SchoolClass[],
      streams: streams.map((r) => ({
        id: num(r.id),
        classId: num(r.class_id),
        className: String(r.class_name),
        name: String(r.name),
      })) as Stream[],
      blocks: blocks.map((r) => ({ id: num(r.id), name: String(r.name), gender: String(r.gender) })),
      dormitories: dorms.map((r) => ({
        id: num(r.id),
        blockId: num(r.block_id),
        blockName: String(r.block_name),
        name: String(r.name),
        capacity: num(r.capacity),
        occupied: num(r.occupied),
      })) as Dormitory[],
    };
  });

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<DashboardData> => {
    await ensureAppUser(context.userId);
    const sql = await getSql();
    const [students] = await sql.query<{ c: number }>(`select count(*)::int as c from students where status = 'active'`);
    const [staff] = await sql.query<{ c: number }>(`select count(*)::int as c from staff where status = 'active'`);
    const [teachers] = await sql.query<{ c: number }>(
      `select count(*)::int as c from staff where status = 'active' and role_type = 'teacher'`,
    );
    const [items] = await sql.query<{ c: number }>(`select count(*)::int as c from inventory_items where is_active = true`);
    const [low] = await sql.query<{ c: number }>(
      `select count(*)::int as c from inventory_items where is_active = true and quantity_on_hand <= reorder_level`,
    );
    const [value] = await sql.query<{ v: number }>(
      `select coalesce(sum(quantity_on_hand * unit_cost), 0)::float8 as v from inventory_items where is_active = true`,
    );
    const [open] = await sql.query<{ c: number; t: number }>(
      `select count(distinct i.id)::int as c,
              coalesce(sum(l.quantity * l.unit_price), 0)::float8 as t
       from invoices i
       left join invoice_lines l on l.invoice_id = i.id
       where i.status in ('draft', 'issued')`,
    );
    const byCategory = await sql.query<{ name: string; quantity: number; value: number }>(
      `select c.name,
              coalesce(sum(i.quantity_on_hand), 0)::int as quantity,
              coalesce(sum(i.quantity_on_hand * i.unit_cost), 0)::float8 as value
       from inventory_categories c
       left join inventory_items i on i.category_id = c.id and i.is_active = true
       group by c.name order by value desc`,
    );
    const recent = await sql.query<Record<string, unknown>>(`${MOVEMENT_SELECT} order by m.created_at desc limit 8`);
    const lowItems = await sql.query<Record<string, unknown>>(
      `${ITEM_SELECT} where i.is_active = true and i.quantity_on_hand <= i.reorder_level order by i.quantity_on_hand asc, i.name`,
    );
    return {
      students: num(students?.c),
      staff: num(staff?.c),
      teachers: num(teachers?.c),
      items: num(items?.c),
      lowStock: num(low?.c),
      stockValue: num(value?.v),
      openInvoices: num(open?.c),
      openInvoiceTotal: num(open?.t),
      byCategory: byCategory.map((r) => ({ name: r.name, quantity: num(r.quantity), value: num(r.value) })),
      recentMovements: recent.map(mapMovement),
      lowStockItems: lowItems.map(mapItem),
    };
  });

export const listStudents = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const sql = await getSql();
    const rows = await sql.query<Record<string, unknown>>(
      `${STUDENT_SELECT} order by c.sort_order, sm.name, st.last_name, st.first_name`,
    );
    return rows.map(mapStudent);
  });

export const listStaff = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const sql = await getSql();
    const rows = await sql.query<Record<string, unknown>>(
      `select * from staff order by role_type, department, last_name`,
    );
    return rows.map(mapStaff);
  });

export const listCategories = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const sql = await getSql();
    const rows = await sql.query<Category>(`select id, name, slug from inventory_categories order by name`);
    return rows.map((r) => ({ id: num(r.id), name: r.name, slug: r.slug }));
  });

export const listItems = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const sql = await getSql();
    const rows = await sql.query<Record<string, unknown>>(`${ITEM_SELECT} order by c.name, i.name`);
    return rows.map(mapItem);
  });

export const listMovements = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const sql = await getSql();
    const rows = await sql.query<Record<string, unknown>>(`${MOVEMENT_SELECT} order by m.created_at desc limit 80`);
    return rows.map(mapMovement);
  });

export const listInvoices = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const sql = await getSql();
    const invs = await sql.query<Record<string, unknown>>(`select * from invoices order by issued_at desc, id desc`);
    const lines = await sql.query<Record<string, unknown>>(`select * from invoice_lines order by id`);
    return invs.map((inv) => mapInvoice(inv, lines.filter((l) => num(l.invoice_id) === num(inv.id))));
  });

export const getSettings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async (): Promise<SchoolSettings> => {
    const sql = await getSql();
    const rows = await sql.query<Record<string, unknown>>(`select * from school_settings where id = 1`);
    const r = rows[0] ?? {};
    return {
      schoolName: String(r.school_name ?? "Arden School"),
      campus: String(r.campus ?? "Ridge Campus"),
      currency: String(r.currency ?? "KES"),
      invoicePrefix: String(r.invoice_prefix ?? "INV"),
      apiProvider: String(r.api_provider ?? "local") as ApiProvider,
      apiBaseUrl: str(r.api_base_url),
      lastSyncAt: str(r.last_sync_at),
      lastSyncNote: str(r.last_sync_note),
    };
  });

export const registerStudent = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      admissionNo: z.string().min(2).max(24),
      firstName: z.string().min(1).max(80),
      lastName: z.string().min(1).max(80),
      gender: z.string().min(1).max(24),
      dateOfBirth: z.string().optional(),
      streamId: z.number(),
      dormitoryId: z.number().optional(),
      guardianName: z.string().max(80).optional(),
      guardianPhone: z.string().max(40).optional(),
      notes: z.string().max(400).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const sql = await getSql();
    const admissionNo = data.admissionNo.trim();
    const existing = await sql.query<{ admission_no: string }>(
      `select admission_no from students where admission_no = $1`,
      [admissionNo],
    );
    if (existing[0]) throw new Error(`Admission number ${admissionNo} is already on the register`);
    await sql.query(
      `insert into students
        (admission_no, first_name, last_name, gender, date_of_birth, stream_id, dormitory_id, guardian_name, guardian_phone, notes)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        admissionNo,
        data.firstName.trim(),
        data.lastName.trim(),
        data.gender,
        data.dateOfBirth || null,
        data.streamId,
        data.dormitoryId ?? null,
        data.guardianName?.trim() || null,
        data.guardianPhone?.trim() || null,
        data.notes?.trim() || null,
      ],
    );
    const created = await sql.query<Record<string, unknown>>(
      `${STUDENT_SELECT} where st.admission_no = $1`,
      [admissionNo],
    );
    return mapStudent(created[0]);
  });

export const updateStudentStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ admissionNo: z.string(), status: z.enum(["active", "on_leave", "alumni", "inactive"]) }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql.query(`update students set status = $1 where admission_no = $2`, [data.status, data.admissionNo]);
    return { ok: true };
  });

export const registerStaff = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      roleType: z.enum(["teacher", "non_teaching"]),
      tscNo: z.string().max(24).optional(),
      idNo: z.string().max(24).optional(),
      firstName: z.string().min(1).max(80),
      lastName: z.string().min(1).max(80),
      jobTitle: z.string().min(1).max(80),
      department: z.string().min(1).max(80),
      phone: z.string().max(40).optional(),
      notes: z.string().max(400).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const sql = await getSql();
    const tscNo = data.tscNo?.trim() || null;
    const idNo = data.idNo?.trim() || null;
    if (data.roleType === "teacher") {
      if (!tscNo) throw new Error("Teachers must have a TSC number");
    } else if (!idNo) {
      throw new Error("Non-teaching staff must have a national ID number");
    }
    const identifier = data.roleType === "teacher" ? tscNo! : idNo!;
    const kind: IdentifierKind = data.roleType === "teacher" ? "tsc_no" : "id_no";
    const dup = await sql.query<{ identifier: string }>(
      `select identifier from staff where identifier = $1 or tsc_no = $2 or id_no = $3`,
      [identifier, tscNo, idNo],
    );
    if (dup[0]) throw new Error("That TSC or ID number is already on the staff register");
    await sql.query(
      `insert into staff (identifier, identifier_kind, tsc_no, id_no, first_name, last_name, role_type, job_title, department, phone, notes)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        identifier,
        kind,
        tscNo,
        idNo,
        data.firstName.trim(),
        data.lastName.trim(),
        data.roleType,
        data.jobTitle.trim(),
        data.department.trim(),
        data.phone?.trim() || null,
        data.notes?.trim() || null,
      ],
    );
    const rows = await sql.query<Record<string, unknown>>(`select * from staff where identifier = $1`, [identifier]);
    return mapStaff(rows[0]);
  });

export const updateStaffStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ identifier: z.string(), status: z.enum(["active", "on_leave", "alumni", "inactive"]) }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql.query(`update staff set status = $1 where identifier = $2`, [data.status, data.identifier]);
    return { ok: true };
  });

export const addStream = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ classId: z.number(), name: z.string().min(1).max(24) }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql.query(`insert into streams (class_id, name) values ($1, $2)`, [data.classId, data.name.trim().toUpperCase()]);
    return { ok: true };
  });

export const addDormitory = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ blockId: z.number(), name: z.string().min(1).max(40), capacity: z.number().int().min(1) }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql.query(`insert into dormitories (block_id, name, capacity) values ($1,$2,$3)`, [
      data.blockId,
      data.name.trim(),
      data.capacity,
    ]);
    return { ok: true };
  });

export const createItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      sku: z.string().min(2).max(40),
      name: z.string().min(1).max(120),
      categoryId: z.number(),
      unit: z.string().min(1).max(24),
      quantityOnHand: z.number().int().min(0),
      reorderLevel: z.number().int().min(0),
      unitCost: z.number().min(0),
      location: z.string().min(1).max(80),
      description: z.string().max(400).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const rows = await sql.query<{ id: number }>(
      `insert into inventory_items
        (sku, name, category_id, unit, quantity_on_hand, reorder_level, unit_cost, location, description)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`,
      [
        data.sku.trim().toUpperCase(),
        data.name.trim(),
        data.categoryId,
        data.unit.trim(),
        data.quantityOnHand,
        data.reorderLevel,
        data.unitCost,
        data.location.trim(),
        data.description?.trim() || null,
      ],
    );
    if (data.quantityOnHand > 0) {
      await sql.query(
        `insert into stock_movements (item_id, movement_type, quantity, unit_cost, notes, actor_user_id)
         values ($1, 'receive', $2, $3, 'Opening balance', $4)`,
        [num(rows[0].id), data.quantityOnHand, data.unitCost, context.userId],
      );
    }
    return { id: num(rows[0].id) };
  });

export const recordMovement = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      itemId: z.number(),
      movementType: z.enum(["receive", "issue", "adjust", "return"]),
      quantity: z.number().int().min(1),
      personType: z.enum(["student", "staff", "supplier"]).optional(),
      personId: z.string().max(40).optional(),
      personName: z.string().max(120).optional(),
      notes: z.string().max(400).optional(),
      charge: z.boolean().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const items = await sql.query<Record<string, unknown>>(`select * from inventory_items where id = $1`, [data.itemId]);
    const item = items[0];
    if (!item) throw new Error("Item not found");
    const onHand = num(item.quantity_on_hand);
    let next = onHand;
    if (data.movementType === "issue") {
      if (onHand < data.quantity) throw new Error("Not enough stock on hand");
      next = onHand - data.quantity;
    } else if (data.movementType === "receive" || data.movementType === "return") {
      next = onHand + data.quantity;
    } else {
      next = data.quantity;
    }
    const moveQty = data.movementType === "adjust" ? Math.abs(next - onHand) : data.quantity;
    await sql.query(`update inventory_items set quantity_on_hand = $1, updated_at = now() where id = $2`, [
      next,
      data.itemId,
    ]);
    await sql.query(
      `insert into stock_movements
        (item_id, movement_type, quantity, unit_cost, person_type, person_id, person_name, notes, actor_user_id)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        data.itemId,
        data.movementType,
        moveQty || data.quantity,
        num(item.unit_cost),
        data.personType ?? null,
        data.personId ?? null,
        data.personName?.trim() || null,
        data.notes?.trim() || null,
        context.userId,
      ],
    );
    let invoice: Invoice | null = null;
    if (data.charge && data.movementType === "issue") {
      const invoiceNo = await nextInvoiceNo(sql);
      const invRows = await sql.query<Record<string, unknown>>(
        `insert into invoices (invoice_no, kind, party_type, party_id, party_name, status, issued_at, due_at, notes)
         values ($1, 'issue_charge', $2, $3, $4, 'issued', current_date, current_date + 14, $5)
         returning *`,
        [
          invoiceNo,
          data.personType ?? "student",
          data.personId ?? null,
          data.personName?.trim() || "Campus charge",
          data.notes?.trim() || "Issued from stores",
        ],
      );
      await sql.query(
        `insert into invoice_lines (invoice_id, item_id, description, quantity, unit_price)
         values ($1,$2,$3,$4,$5)`,
        [num(invRows[0].id), data.itemId, String(item.name), data.quantity, num(item.unit_cost)],
      );
      invoice = await loadInvoice(sql, num(invRows[0].id));
    }
    return { ok: true, quantityOnHand: next, invoice };
  });

export const createInvoice = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      kind: z.enum(["purchase", "issue_charge"]),
      partyType: z.enum(["student", "staff", "supplier"]),
      partyId: z.string().max(40).optional(),
      partyName: z.string().min(1).max(120),
      notes: z.string().max(400).optional(),
      receiveStock: z.boolean().optional(),
      lines: z
        .array(z.object({ itemId: z.number(), quantity: z.number().int().min(1), unitPrice: z.number().min(0) }))
        .min(1),
    }),
  )
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const invoiceNo = await nextInvoiceNo(sql);
    const invRows = await sql.query<Record<string, unknown>>(
      `insert into invoices (invoice_no, kind, party_type, party_id, party_name, status, issued_at, due_at, notes)
       values ($1,$2,$3,$4,$5,'issued', current_date, current_date + 14, $6)
       returning *`,
      [invoiceNo, data.kind, data.partyType, data.partyId ?? null, data.partyName.trim(), data.notes?.trim() || null],
    );
    const invoiceId = num(invRows[0].id);
    for (const line of data.lines) {
      const items = await sql.query<Record<string, unknown>>(`select * from inventory_items where id = $1`, [line.itemId]);
      const item = items[0];
      if (!item) continue;
      await sql.query(
        `insert into invoice_lines (invoice_id, item_id, description, quantity, unit_price) values ($1,$2,$3,$4,$5)`,
        [invoiceId, line.itemId, String(item.name), line.quantity, line.unitPrice],
      );
      if (data.kind === "purchase" && data.receiveStock) {
        await sql.query(
          `update inventory_items set quantity_on_hand = quantity_on_hand + $1, unit_cost = $2, updated_at = now() where id = $3`,
          [line.quantity, line.unitPrice, line.itemId],
        );
        await sql.query(
          `insert into stock_movements (item_id, movement_type, quantity, unit_cost, person_type, person_name, notes, actor_user_id)
           values ($1, 'receive', $2, $3, 'supplier', $4, $5, $6)`,
          [line.itemId, line.quantity, line.unitPrice, data.partyName.trim(), `Received on ${invoiceNo}`, context.userId],
        );
      }
    }
    const invoice = await loadInvoice(sql, invoiceId);
    if (!invoice) throw new Error("Invoice not created");
    return invoice;
  });

export const setInvoiceStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.number(), status: z.enum(["draft", "issued", "paid", "void"]) }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql.query(`update invoices set status = $1 where id = $2`, [data.status, data.id]);
    return { ok: true };
  });

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      schoolName: z.string().min(1).max(80),
      campus: z.string().min(1).max(80),
      currency: z.string().min(3).max(8),
      invoicePrefix: z.string().min(2).max(8),
      apiProvider: z.enum(["local", "invoice_ninja", "generic_rest"]),
      apiBaseUrl: z.string().max(200).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql.query(
      `update school_settings
       set school_name = $1, campus = $2, currency = $3, invoice_prefix = $4, api_provider = $5, api_base_url = $6
       where id = 1`,
      [
        data.schoolName.trim(),
        data.campus.trim(),
        data.currency.trim().toUpperCase(),
        data.invoicePrefix.trim().toUpperCase(),
        data.apiProvider,
        data.apiBaseUrl?.trim() || null,
      ],
    );
    return { ok: true };
  });

const SAMPLE_REMOTE: RemoteProduct[] = [
  { externalId: "ninja-1001", sku: "NIN-LAB-PIP", name: "Pasteur pipettes (box of 100)", quantity: 18, unitCost: 640, notes: "Pulled from invoicing catalog" },
  { externalId: "ninja-1002", sku: "NIN-ICT-HDMI", name: "HDMI cable 2m", quantity: 22, unitCost: 480, notes: "Pulled from invoicing catalog" },
  { externalId: "ninja-1003", sku: "NIN-STA-A3", name: "A3 drawing paper (ream)", quantity: 15, unitCost: 890, notes: "Pulled from invoicing catalog" },
  { externalId: "ninja-1004", sku: "NIN-SPT-WHIS", name: "Referee whistle", quantity: 10, unitCost: 250, notes: "Pulled from invoicing catalog" },
];

function ninjaHeaders(token: string) {
  return {
    "X-API-TOKEN": token,
    "X-Requested-With": "XMLHttpRequest",
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

async function fetchRemoteProducts(provider: ApiProvider, baseUrl: string, token: string): Promise<RemoteProduct[]> {
  const root = baseUrl.replace(/\/$/, "");
  if (provider === "invoice_ninja") {
    const res = await fetch(`${root}/api/v1/products?per_page=50`, { headers: ninjaHeaders(token) });
    if (!res.ok) throw new Error(`Invoice Ninja responded ${res.status}`);
    const body = (await res.json()) as {
      data?: Array<{ id?: string; product_key?: string; notes?: string; cost?: string | number; quantity?: string | number }>;
    };
    return (body.data ?? []).map((p, i) => ({
      externalId: String(p.id ?? `ninja-${i}`),
      sku: String(p.product_key || `NIN-${i + 1}`),
      name: String(p.notes || p.product_key || "Untitled product"),
      quantity: num(p.quantity),
      unitCost: num(p.cost),
      notes: "Imported from Invoice Ninja",
    }));
  }
  const res = await fetch(`${root}/inventory/items`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Inventory API responded ${res.status}`);
  const body = (await res.json()) as {
    items?: Array<{ id?: string; sku?: string; name?: string; quantity?: number; unit_cost?: number }>;
  };
  return (body.items ?? []).map((p, i) => ({
    externalId: String(p.id ?? `ext-${i}`),
    sku: String(p.sku ?? `SKU-${i}`),
    name: String(p.name ?? "Untitled"),
    quantity: num(p.quantity),
    unitCost: num(p.unit_cost),
    notes: "Imported from inventory API",
  }));
}

export const previewRemoteCatalog = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      provider: z.enum(["local", "invoice_ninja", "generic_rest"]),
      baseUrl: z.string().max(200).optional(),
      token: z.string().max(400).optional(),
      useSample: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    if (data.useSample || data.provider === "local" || !data.token || !data.baseUrl) {
      return { products: SAMPLE_REMOTE, source: "sample" };
    }
    return { products: await fetchRemoteProducts(data.provider, data.baseUrl, data.token), source: data.provider };
  });

export const importRemoteCatalog = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      provider: z.enum(["local", "invoice_ninja", "generic_rest"]),
      baseUrl: z.string().max(200).optional(),
      token: z.string().max(400).optional(),
      useSample: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const sql = await getSql();
    const preview =
      data.useSample || data.provider === "local" || !data.token || !data.baseUrl
        ? { products: SAMPLE_REMOTE, source: "sample" }
        : { products: await fetchRemoteProducts(data.provider, data.baseUrl, data.token), source: data.provider };
    const cats = await sql.query<{ id: number; slug: string }>(`select id, slug from inventory_categories`);
    const fallback = cats.find((c) => c.slug === "stationery")?.id ?? cats[0]?.id;
    if (!fallback) throw new Error("No inventory category available");
    let created = 0;
    let updated = 0;
    for (const p of preview.products) {
      const existing = await sql.query<{ id: number }>(
        `select id from inventory_items where sku = $1 or external_id = $2`,
        [p.sku, p.externalId],
      );
      if (existing[0]) {
        await sql.query(
          `update inventory_items set name = $1, quantity_on_hand = $2, unit_cost = $3, external_id = $4, updated_at = now() where id = $5`,
          [p.name, p.quantity, p.unitCost, p.externalId, existing[0].id],
        );
        updated += 1;
      } else {
        await sql.query(
          `insert into inventory_items (sku, name, category_id, unit, quantity_on_hand, reorder_level, unit_cost, location, description, external_id)
           values ($1,$2,$3,'pcs',$4,4,$5,'Imported store',$6,$7)`,
          [p.sku, p.name, fallback, p.quantity, p.unitCost, p.notes, p.externalId],
        );
        created += 1;
      }
    }
    const note = `Imported ${preview.products.length} products (${created} new, ${updated} updated) from ${preview.source === "sample" ? "sample Invoice Ninja catalog" : preview.source}`;
    await sql.query(
      `update school_settings set api_provider = $1, api_base_url = $2, last_sync_at = now(), last_sync_note = $3 where id = 1`,
      [data.provider, data.baseUrl?.trim() || null, note],
    );
    return { created, updated, total: preview.products.length, note };
  });

export const pushInvoiceToApi = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      invoiceId: z.number(),
      provider: z.enum(["invoice_ninja", "generic_rest"]),
      baseUrl: z.string().min(8).max(200),
      token: z.string().min(4).max(400),
    }),
  )
  .handler(async ({ data }) => {
    const sql = await getSql();
    const invoice = await loadInvoice(sql, data.invoiceId);
    if (!invoice) throw new Error("Invoice not found");
    const root = data.baseUrl.replace(/\/$/, "");
    if (data.provider === "invoice_ninja") {
      const res = await fetch(`${root}/api/v1/invoices`, {
        method: "POST",
        headers: ninjaHeaders(data.token),
        body: JSON.stringify({
          date: invoice.issuedAt,
          due_date: invoice.dueAt,
          public_notes: invoice.notes,
          line_items: invoice.lines.map((l) => ({
            product_key: l.description,
            notes: l.description,
            cost: l.unitPrice,
            quantity: l.quantity,
          })),
        }),
      });
      if (!res.ok) throw new Error(`Invoice Ninja responded ${res.status}`);
      const body = (await res.json()) as { data?: { id?: string } };
      const externalId = body.data?.id ? String(body.data.id) : null;
      if (externalId) await sql.query(`update invoices set external_id = $1 where id = $2`, [externalId, invoice.id]);
      return { ok: true, externalId };
    }
    const res = await fetch(`${root}/invoices`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${data.token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        number: invoice.invoiceNo,
        kind: invoice.kind,
        party: invoice.partyName,
        status: invoice.status,
        lines: invoice.lines,
        total: invoice.total,
      }),
    });
    if (!res.ok) throw new Error(`Inventory API responded ${res.status}`);
    return { ok: true, externalId: null as string | null };
  });

const studentExcelRow = z.object({
  row: z.number(),
  admissionNo: z.string().min(2).max(24),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  gender: z.string().min(1).max(24),
  dateOfBirth: z.string().optional(),
  className: z.string().min(1).max(40),
  streamName: z.string().min(1).max(24),
  dormitoryName: z.string().max(40).optional(),
  blockName: z.string().max(40).optional(),
  guardianName: z.string().max(80).optional(),
  guardianPhone: z.string().max(40).optional(),
  status: z.string().max(24).optional(),
  notes: z.string().max(400).optional(),
});

const staffExcelRow = z.object({
  row: z.number(),
  roleType: z.enum(["teacher", "non_teaching"]),
  tscNo: z.string().max(24).optional(),
  idNo: z.string().max(24).optional(),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  jobTitle: z.string().min(1).max(80),
  department: z.string().min(1).max(80),
  phone: z.string().max(40).optional(),
  status: z.string().max(24).optional(),
  notes: z.string().max(400).optional(),
});

const itemExcelRow = z.object({
  row: z.number(),
  sku: z.string().min(2).max(40),
  name: z.string().min(1).max(120),
  category: z.string().min(1).max(80),
  unit: z.string().min(1).max(24),
  quantityOnHand: z.number().int().min(0),
  reorderLevel: z.number().int().min(0),
  unitCost: z.number().min(0),
  location: z.string().min(1).max(80),
  description: z.string().max(400).optional(),
});

export const bulkImportExcel = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      students: z.array(studentExcelRow).max(500),
      staff: z.array(staffExcelRow).max(500),
      items: z.array(itemExcelRow).max(500),
    }),
  )
  .handler(async ({ data, context }): Promise<BulkImportResult> => {
    const sql = await getSql();
    const result: BulkImportResult = {
      studentsCreated: 0,
      studentsUpdated: 0,
      staffCreated: 0,
      staffUpdated: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      errors: [],
    };

    const streams = await sql.query<{ id: number; class_name: string; stream_name: string }>(
      `select s.id, c.name as class_name, s.name as stream_name
       from streams s join classes c on c.id = s.class_id`,
    );
    const streamMap = new Map(
      streams.map((s) => [`${s.class_name.toLowerCase()}|${s.stream_name.toLowerCase()}`, num(s.id)]),
    );
    const dorms = await sql.query<{ id: number; name: string; block_name: string }>(
      `select d.id, d.name, b.name as block_name
       from dormitories d join blocks b on b.id = d.block_id`,
    );
    const dormByName = new Map(dorms.map((d) => [d.name.toLowerCase(), num(d.id)]));
    const dormByBlock = new Map(
      dorms.map((d) => [`${d.block_name.toLowerCase()}|${d.name.toLowerCase()}`, num(d.id)]),
    );
    const cats = await sql.query<{ id: number; name: string; slug: string }>(
      `select id, name, slug from inventory_categories`,
    );
    const catMap = new Map(cats.map((c) => [c.name.toLowerCase(), num(c.id)]));
    const fallbackCat = cats.find((c) => c.slug === "stationery")?.id ?? cats[0]?.id;

    const personStatus = (value?: string) => {
      const s = (value ?? "active").toLowerCase();
      return ["active", "on_leave", "alumni", "inactive"].includes(s) ? s : "active";
    };

    for (const row of data.students) {
      const streamId = streamMap.get(`${row.className.trim().toLowerCase()}|${row.streamName.trim().toLowerCase()}`);
      if (!streamId) {
        result.errors.push({
          kind: "student",
          row: row.row,
          message: `No stream ${row.className} ${row.streamName}`,
        });
        continue;
      }
      let dormId: number | null = null;
      if (row.dormitoryName) {
        const keyed = row.blockName
          ? dormByBlock.get(`${row.blockName.trim().toLowerCase()}|${row.dormitoryName.trim().toLowerCase()}`)
          : undefined;
        dormId = keyed ?? dormByName.get(row.dormitoryName.trim().toLowerCase()) ?? null;
        if (dormId == null) {
          result.errors.push({
            kind: "student",
            row: row.row,
            message: `No dormitory named ${row.dormitoryName}`,
          });
          continue;
        }
      }
      const existing = await sql.query<{ admission_no: string }>(
        `select admission_no from students where admission_no = $1`,
        [row.admissionNo.trim()],
      );
      if (existing[0]) {
        await sql.query(
          `update students set first_name=$1, last_name=$2, gender=$3, date_of_birth=$4, stream_id=$5,
            dormitory_id=$6, guardian_name=$7, guardian_phone=$8, status=$9, notes=$10
           where admission_no=$11`,
          [
            row.firstName.trim(),
            row.lastName.trim(),
            row.gender,
            row.dateOfBirth || null,
            streamId,
            dormId,
            row.guardianName?.trim() || null,
            row.guardianPhone?.trim() || null,
            personStatus(row.status),
            row.notes?.trim() || null,
            row.admissionNo.trim(),
          ],
        );
        result.studentsUpdated += 1;
      } else {
        await sql.query(
          `insert into students
            (admission_no, first_name, last_name, gender, date_of_birth, stream_id, dormitory_id,
             guardian_name, guardian_phone, status, notes)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [
            row.admissionNo.trim(),
            row.firstName.trim(),
            row.lastName.trim(),
            row.gender,
            row.dateOfBirth || null,
            streamId,
            dormId,
            row.guardianName?.trim() || null,
            row.guardianPhone?.trim() || null,
            personStatus(row.status),
            row.notes?.trim() || null,
          ],
        );
        result.studentsCreated += 1;
      }
    }

    for (const row of data.staff) {
      const tscNo = row.roleType === "teacher" ? row.tscNo?.trim() || null : null;
      const idNo = row.roleType === "non_teaching" ? row.idNo?.trim() || null : null;
      const identifier = row.roleType === "teacher" ? tscNo : idNo;
      if (!identifier) {
        result.errors.push({
          kind: "staff",
          row: row.row,
          message: row.roleType === "teacher" ? "Missing TSC number" : "Missing ID number",
        });
        continue;
      }
      const kind: IdentifierKind = row.roleType === "teacher" ? "tsc_no" : "id_no";
      const existing = await sql.query<{ identifier: string }>(
        `select identifier from staff where identifier = $1 or tsc_no = $2 or id_no = $3`,
        [identifier, tscNo, idNo],
      );
      if (existing[0]) {
        await sql.query(
          `update staff set first_name=$1, last_name=$2, job_title=$3, department=$4, phone=$5, status=$6, notes=$7
           where identifier=$8`,
          [
            row.firstName.trim(),
            row.lastName.trim(),
            row.jobTitle.trim(),
            row.department.trim(),
            row.phone?.trim() || null,
            personStatus(row.status),
            row.notes?.trim() || null,
            existing[0].identifier,
          ],
        );
        result.staffUpdated += 1;
      } else {
        await sql.query(
          `insert into staff
            (identifier, identifier_kind, tsc_no, id_no, first_name, last_name, role_type, job_title, department, phone, status, notes)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [
            identifier,
            kind,
            tscNo,
            idNo,
            row.firstName.trim(),
            row.lastName.trim(),
            row.roleType,
            row.jobTitle.trim(),
            row.department.trim(),
            row.phone?.trim() || null,
            personStatus(row.status),
            row.notes?.trim() || null,
          ],
        );
        result.staffCreated += 1;
      }
    }

    for (const row of data.items) {
      const categoryId = catMap.get(row.category.trim().toLowerCase()) ?? (fallbackCat ? num(fallbackCat) : null);
      if (!categoryId) {
        result.errors.push({ kind: "item", row: row.row, message: "No inventory category available" });
        continue;
      }
      const sku = row.sku.trim().toUpperCase();
      const existing = await sql.query<{ id: number; quantity_on_hand: number }>(
        `select id, quantity_on_hand from inventory_items where sku = $1`,
        [sku],
      );
      if (existing[0]) {
        await sql.query(
          `update inventory_items
           set name=$1, category_id=$2, unit=$3, quantity_on_hand=$4, reorder_level=$5, unit_cost=$6,
               location=$7, description=$8, updated_at=now()
           where id=$9`,
          [
            row.name.trim(),
            categoryId,
            row.unit.trim(),
            row.quantityOnHand,
            row.reorderLevel,
            row.unitCost,
            row.location.trim(),
            row.description?.trim() || null,
            existing[0].id,
          ],
        );
        const prev = num(existing[0].quantity_on_hand);
        if (prev !== row.quantityOnHand) {
          await sql.query(
            `insert into stock_movements (item_id, movement_type, quantity, unit_cost, notes, actor_user_id)
             values ($1, 'adjust', $2, $3, 'Excel bulk import', $4)`,
            [existing[0].id, Math.abs(row.quantityOnHand - prev), row.unitCost, context.userId],
          );
        }
        result.itemsUpdated += 1;
      } else {
        const inserted = await sql.query<{ id: number }>(
          `insert into inventory_items
            (sku, name, category_id, unit, quantity_on_hand, reorder_level, unit_cost, location, description)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`,
          [
            sku,
            row.name.trim(),
            categoryId,
            row.unit.trim(),
            row.quantityOnHand,
            row.reorderLevel,
            row.unitCost,
            row.location.trim(),
            row.description?.trim() || null,
          ],
        );
        if (row.quantityOnHand > 0) {
          await sql.query(
            `insert into stock_movements (item_id, movement_type, quantity, unit_cost, notes, actor_user_id)
             values ($1, 'receive', $2, $3, 'Excel bulk import', $4)`,
            [num(inserted[0].id), row.quantityOnHand, row.unitCost, context.userId],
          );
        }
        result.itemsCreated += 1;
      }
    }

    return result;
  });
