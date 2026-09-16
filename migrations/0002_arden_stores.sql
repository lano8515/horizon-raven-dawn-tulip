-- Arden Stores — campus inventory, people, and invoicing
-- People keys: students.admission_no, staff.tsc_no (teachers), staff.id_no (non-teaching)

create table if not exists school_settings (
  id integer primary key default 1,
  school_name text not null default 'Arden School',
  campus text not null default 'Ridge Campus',
  currency text not null default 'KES',
  invoice_prefix text not null default 'INV',
  api_provider text not null default 'local',
  api_base_url text,
  last_sync_at timestamptz,
  last_sync_note text
);

insert into school_settings (id) select 1
where not exists (select 1 from school_settings where id = 1);

create table if not exists classes (
  id serial primary key,
  name text not null unique,
  sort_order integer not null default 0
);

create table if not exists streams (
  id serial primary key,
  class_id integer not null references classes(id),
  name text not null,
  unique (class_id, name)
);

create table if not exists blocks (
  id serial primary key,
  name text not null unique,
  gender text not null default 'mixed'
);

create table if not exists dormitories (
  id serial primary key,
  block_id integer not null references blocks(id),
  name text not null,
  capacity integer not null default 40,
  unique (block_id, name)
);

create table if not exists students (
  admission_no text primary key,
  first_name text not null,
  last_name text not null,
  gender text not null default 'unspecified',
  date_of_birth date,
  stream_id integer not null references streams(id),
  dormitory_id integer references dormitories(id),
  guardian_name text,
  guardian_phone text,
  status text not null default 'active',
  enrolled_at date not null default current_date,
  notes text
);

create table if not exists staff (
  identifier text primary key,
  identifier_kind text not null check (identifier_kind in ('tsc_no', 'id_no')),
  tsc_no text unique,
  id_no text unique,
  first_name text not null,
  last_name text not null,
  role_type text not null check (role_type in ('teacher', 'non_teaching')),
  job_title text not null,
  department text not null,
  phone text,
  status text not null default 'active',
  hired_at date not null default current_date,
  notes text,
  constraint staff_teacher_tsc check (
    role_type <> 'teacher' or (tsc_no is not null and identifier_kind = 'tsc_no' and identifier = tsc_no)
  ),
  constraint staff_support_id check (
    role_type <> 'non_teaching' or (id_no is not null and identifier_kind = 'id_no' and identifier = id_no)
  )
);

create table if not exists inventory_categories (
  id serial primary key,
  name text not null unique,
  slug text not null unique
);

create table if not exists inventory_items (
  id serial primary key,
  sku text not null unique,
  name text not null,
  category_id integer not null references inventory_categories(id),
  unit text not null default 'pcs',
  quantity_on_hand integer not null default 0,
  reorder_level integer not null default 5,
  unit_cost double precision not null default 0,
  location text not null default 'Main store',
  description text,
  is_active boolean not null default true,
  external_id text,
  updated_at timestamptz not null default now()
);

create table if not exists stock_movements (
  id serial primary key,
  item_id integer not null references inventory_items(id),
  movement_type text not null,
  quantity integer not null,
  unit_cost double precision not null default 0,
  person_type text,
  person_id text,
  person_name text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists invoices (
  id serial primary key,
  invoice_no text not null unique,
  kind text not null,
  party_type text not null,
  party_id text,
  party_name text not null,
  status text not null default 'issued',
  issued_at date not null default current_date,
  due_at date,
  notes text,
  external_id text,
  created_at timestamptz not null default now()
);

create table if not exists invoice_lines (
  id serial primary key,
  invoice_id integer not null references invoices(id) on delete cascade,
  item_id integer references inventory_items(id),
  description text not null,
  quantity integer not null,
  unit_price double precision not null
);

create index if not exists students_stream_idx on students (stream_id);
create index if not exists students_dorm_idx on students (dormitory_id);
create index if not exists students_status_idx on students (status);
create index if not exists staff_role_idx on staff (role_type);
create index if not exists items_category_idx on inventory_items (category_id);
create index if not exists movements_item_idx on stock_movements (item_id);
create index if not exists movements_created_idx on stock_movements (created_at desc);

-- Academic: each class is split into streams
insert into classes (name, sort_order)
select v.name, v.sort_order from (values
  ('Form 1', 1), ('Form 2', 2), ('Form 3', 3), ('Form 4', 4)
) as v(name, sort_order)
where not exists (select 1 from classes);

insert into streams (class_id, name)
select c.id, s.name
from classes c
cross join (values ('A'), ('B'), ('C')) as s(name)
where not exists (select 1 from streams);

-- Boarding: blocks house several dormitories
insert into blocks (name, gender)
select v.name, v.gender from (values
  ('Cedar', 'boys'),
  ('Olive', 'girls'),
  ('Baobab', 'boys'),
  ('Jacaranda', 'girls')
) as v(name, gender)
where not exists (select 1 from blocks);

insert into dormitories (block_id, name, capacity)
select b.id, v.dname, v.cap
from (values
  ('Cedar', 'Cedar 1', 48),
  ('Cedar', 'Cedar 2', 48),
  ('Cedar', 'Cedar 3', 40),
  ('Olive', 'Olive 1', 44),
  ('Olive', 'Olive 2', 44),
  ('Baobab', 'Baobab 1', 40),
  ('Baobab', 'Baobab 2', 40),
  ('Jacaranda', 'Jacaranda 1', 44),
  ('Jacaranda', 'Jacaranda 2', 40)
) as v(bname, dname, cap)
join blocks b on b.name = v.bname
where not exists (select 1 from dormitories);

insert into inventory_categories (name, slug)
select v.name, v.slug from (values
  ('Textbooks', 'textbooks'),
  ('Stationery', 'stationery'),
  ('Uniforms', 'uniforms'),
  ('Laboratory', 'laboratory'),
  ('Sports', 'sports'),
  ('Furniture', 'furniture'),
  ('ICT', 'ict'),
  ('Cleaning', 'cleaning'),
  ('Kitchen', 'kitchen')
) as v(name, slug)
where not exists (select 1 from inventory_categories);

-- Students: admission_no is the primary key (number/year)
insert into students (admission_no, first_name, last_name, gender, date_of_birth, stream_id, dormitory_id, guardian_name, guardian_phone, status, enrolled_at)
select v.adm, v.fn, v.ln, v.g, v.dob, s.id, d.id, v.guard, v.phone, v.status, v.enrolled
from (values
  ('142/2024', 'Amina', 'Wanjiku', 'female', '2012-03-18'::date, 'Form 2', 'A', 'Jacaranda 1', 'Grace Wanjiku', '0712 441 008', 'active', '2024-01-15'::date),
  ('148/2024', 'Kwame', 'Ochieng', 'male', '2011-11-02'::date, 'Form 3', 'B', 'Baobab 1', 'Peter Ochieng', '0721 883 441', 'active', '2024-01-15'::date),
  ('201/2025', 'Zuri', 'Mutiso', 'female', '2013-07-22'::date, 'Form 1', 'A', 'Olive 1', 'Helen Mutiso', '0703 229 118', 'active', '2025-01-13'::date),
  ('088/2023', 'Daniel', 'Kariuki', 'male', '2010-05-09'::date, 'Form 4', 'A', 'Cedar 1', 'James Kariuki', '0722 109 334', 'active', '2023-01-16'::date),
  ('214/2025', 'Imani', 'Njoroge', 'female', '2013-01-30'::date, 'Form 1', 'B', 'Jacaranda 2', 'Ruth Njoroge', '0718 552 090', 'active', '2025-01-13'::date),
  ('160/2024', 'Omar', 'Hassan', 'male', '2012-09-14'::date, 'Form 2', 'B', 'Cedar 2', 'Fatuma Hassan', '0740 661 225', 'active', '2024-01-15'::date),
  ('094/2023', 'Lila', 'Achieng', 'female', '2010-12-05'::date, 'Form 4', 'B', 'Olive 2', 'Mary Achieng', '0711 334 870', 'active', '2023-01-16'::date),
  ('220/2025', 'Brian', 'Otieno', 'male', '2013-04-11'::date, 'Form 1', 'A', 'Baobab 2', 'Samuel Otieno', '0726 448 119', 'active', '2025-01-13'::date),
  ('155/2024', 'Nyawira', 'Kamau', 'female', '2012-06-27'::date, 'Form 2', 'A', 'Olive 1', 'Jane Kamau', '0702 991 443', 'active', '2024-01-15'::date),
  ('071/2023', 'Farah', 'Abdullahi', 'female', '2010-08-19'::date, 'Form 4', 'A', 'Jacaranda 1', 'Halima Abdullahi', '0714 220 667', 'active', '2023-01-16'::date),
  ('231/2025', 'Tumo', 'Kipchoge', 'male', '2013-02-08'::date, 'Form 1', 'C', 'Cedar 3', 'David Kipchoge', '0729 118 004', 'active', '2025-01-13'::date),
  ('172/2024', 'Safiya', 'Mwangi', 'female', '2012-10-03'::date, 'Form 2', 'C', 'Jacaranda 2', 'Anne Mwangi', '0716 773 221', 'active', '2024-01-15'::date),
  ('044/2022', 'Eliud', 'Ndegwa', 'male', '2009-09-21'::date, 'Form 4', 'A', 'Cedar 1', 'Paul Ndegwa', '0720 445 881', 'alumni', '2022-01-17'::date),
  ('240/2025', 'Achieng', 'Odhiambo', 'female', '2013-11-16'::date, 'Form 1', 'B', 'Olive 2', 'Esther Odhiambo', '0708 334 552', 'active', '2025-01-13'::date),
  ('181/2024', 'Jabari', 'Were', 'male', '2012-01-25'::date, 'Form 2', 'A', 'Baobab 1', 'Michael Were', '0713 990 118', 'active', '2024-01-15'::date),
  ('108/2023', 'Makena', 'Gitonga', 'female', '2011-03-07'::date, 'Form 3', 'A', 'Jacaranda 1', 'Lucy Gitonga', '0724 661 009', 'active', '2023-01-16'::date),
  ('248/2025', 'Noah', 'Cheruiyot', 'male', '2013-08-02'::date, 'Form 1', 'C', 'Cedar 2', 'Joseph Cheruiyot', '0701 228 773', 'active', '2025-01-13'::date),
  ('190/2024', 'Rehema', 'Said', 'female', '2012-12-12'::date, 'Form 2', 'B', 'Olive 1', 'Asha Said', '0741 552 330', 'active', '2024-01-15'::date),
  ('115/2023', 'Victor', 'Barasa', 'male', '2011-06-29'::date, 'Form 3', 'C', 'Cedar 1', 'Alice Barasa', '0719 447 662', 'on_leave', '2023-01-16'::date),
  ('255/2025', 'Wambui', 'Kinyua', 'female', '2013-05-14'::date, 'Form 1', 'A', 'Jacaranda 2', 'Catherine Kinyua', '0728 119 440', 'active', '2025-01-13'::date)
) as v(adm, fn, ln, g, dob, cname, sname, dname, guard, phone, status, enrolled)
join classes c on c.name = v.cname
join streams s on s.class_id = c.id and s.name = v.sname
join dormitories d on d.name = v.dname
where not exists (select 1 from students);

-- Teachers keyed by TSC no.; non-teaching keyed by national ID no.
insert into staff (identifier, identifier_kind, tsc_no, id_no, first_name, last_name, role_type, job_title, department, phone, status, hired_at)
select * from (values
  ('458221', 'tsc_no', '458221', null, 'Margaret', 'Njeri', 'teacher', 'Head of Mathematics', 'Mathematics', '0711 220 118', 'active', '2016-02-01'::date),
  ('501883', 'tsc_no', '501883', null, 'Joseph', 'Okello', 'teacher', 'Physics teacher', 'Sciences', '0722 881 334', 'active', '2018-08-20'::date),
  ('476019', 'tsc_no', '476019', null, 'Aisha', 'Mohammed', 'teacher', 'English teacher', 'Languages', '0703 441 229', 'active', '2019-01-07'::date),
  ('412774', 'tsc_no', '412774', null, 'Patrick', 'Mwenda', 'teacher', 'History teacher', 'Humanities', '0718 662 001', 'active', '2015-05-12'::date),
  ('533108', 'tsc_no', '533108', null, 'Helen', 'Chebet', 'teacher', 'Biology teacher', 'Sciences', '0726 119 883', 'active', '2020-09-01'::date),
  ('548662', 'tsc_no', '548662', null, 'Samuel', 'Kimani', 'teacher', 'ICT teacher', 'ICT', '0714 338 220', 'active', '2021-01-11'::date),
  ('429551', 'tsc_no', '429551', null, 'Rose', 'Atieno', 'teacher', 'PE teacher', 'Sports', '0702 994 117', 'active', '2017-04-03'::date),
  ('28411902', 'id_no', null, '28411902', 'David', 'Wekesa', 'non_teaching', 'Bursar', 'Administration', '0720 551 448', 'active', '2014-03-18'::date),
  ('30188241', 'id_no', null, '30188241', 'Faith', 'Muthoni', 'non_teaching', 'Librarian', 'Library', '0716 229 770', 'active', '2018-02-12'::date),
  ('22764018', 'id_no', null, '22764018', 'Peter', 'Onyango', 'non_teaching', 'Storekeeper', 'Estates', '0729 118 663', 'active', '2013-11-04'::date),
  ('31844025', 'id_no', null, '31844025', 'Jane', 'Akinyi', 'non_teaching', 'School nurse', 'Health', '0708 441 225', 'active', '2019-06-24'::date),
  ('19877310', 'id_no', null, '19877310', 'Moses', 'Kiptoo', 'non_teaching', 'Head cook', 'Kitchen', '0712 773 009', 'active', '2012-01-09'::date),
  ('34911862', 'id_no', null, '34911862', 'Lucy', 'Wambua', 'non_teaching', 'Front office', 'Administration', '0724 330 118', 'active', '2022-08-01'::date),
  ('17662044', 'id_no', null, '17662044', 'George', 'Mutua', 'non_teaching', 'Groundsman', 'Estates', '0719 662 441', 'active', '2011-05-16'::date)
) as v
where not exists (select 1 from staff);

insert into inventory_items (sku, name, category_id, unit, quantity_on_hand, reorder_level, unit_cost, location, description)
select v.sku, v.name, c.id, v.unit, v.qty, v.reorder, v.cost, v.loc, v.descr
from (values
  ('TXT-MATH-F1', 'Mathematics Form 1', 'Textbooks', 'pcs', 42, 15, 850, 'Library store', 'Approved KICD course book'),
  ('TXT-MATH-F3', 'Mathematics Form 3', 'Textbooks', 'pcs', 18, 12, 980, 'Library store', 'Approved KICD course book'),
  ('TXT-ENG-F2', 'English Form 2', 'Textbooks', 'pcs', 36, 12, 720, 'Library store', 'Anthology and composition'),
  ('TXT-BIO-F4', 'Biology Form 4', 'Textbooks', 'pcs', 9, 10, 1100, 'Library store', 'Revision edition'),
  ('TXT-CHEM-F3', 'Chemistry Form 3', 'Textbooks', 'pcs', 22, 10, 1050, 'Library store', 'With practicals supplement'),
  ('STA-EXB-A4', 'A4 exercise books (pack of 10)', 'Stationery', 'pack', 84, 20, 450, 'Main store', '96-page ruled'),
  ('STA-PEN-BLU', 'Blue ballpoint pens (box)', 'Stationery', 'box', 31, 8, 280, 'Main store', '50 pens per box'),
  ('STA-CHL-WHT', 'Whiteboard chalk / markers', 'Stationery', 'set', 14, 6, 620, 'Main store', 'Assorted classroom pack'),
  ('UNI-BLZ-M', 'School blazer — medium', 'Uniforms', 'pcs', 11, 8, 4200, 'Uniform cupboard', 'Forest green with gold piping'),
  ('UNI-BLZ-L', 'School blazer — large', 'Uniforms', 'pcs', 6, 6, 4200, 'Uniform cupboard', 'Forest green with gold piping'),
  ('UNI-TIE-01', 'House tie', 'Uniforms', 'pcs', 48, 20, 450, 'Uniform cupboard', 'Four house colours'),
  ('UNI-SKT-28', 'Skirt — size 28', 'Uniforms', 'pcs', 7, 8, 1800, 'Uniform cupboard', 'Grey tartan'),
  ('LAB-BUN-012', 'Bunsen burners', 'Laboratory', 'pcs', 16, 8, 1450, 'Science block', 'Natural gas'),
  ('LAB-GLS-250', '250ml beakers', 'Laboratory', 'pcs', 40, 20, 180, 'Science block', 'Borosilicate'),
  ('LAB-GLV-M', 'Lab gloves (pair)', 'Laboratory', 'pair', 3, 12, 90, 'Science block', 'Nitrile medium'),
  ('SPT-FBL-05', 'Football size 5', 'Sports', 'pcs', 8, 4, 2200, 'PE store', 'FIFA-quality match ball'),
  ('SPT-NETB-01', 'Netball', 'Sports', 'pcs', 5, 3, 1900, 'PE store', 'Match grade'),
  ('SPT-CONE-20', 'Training cones (set of 20)', 'Sports', 'set', 2, 2, 1600, 'PE store', 'Orange'),
  ('FUR-DSK-STD', 'Student desk', 'Furniture', 'pcs', 24, 10, 7800, 'Works yard', 'Hardwood top, steel frame'),
  ('FUR-CHR-STD', 'Classroom chair', 'Furniture', 'pcs', 19, 10, 3400, 'Works yard', 'Stackable'),
  ('ICT-CHR-01', 'Chromebook', 'ICT', 'pcs', 12, 6, 28500, 'ICT lab', 'Managed fleet'),
  ('ICT-MSE-01', 'USB mouse', 'ICT', 'pcs', 4, 8, 650, 'ICT lab', 'Wired'),
  ('CLN-DET-5L', 'Floor detergent 5L', 'Cleaning', 'jerrycan', 9, 4, 780, 'Estates store', 'Industrial'),
  ('CLN-BKT-01', 'Mop bucket', 'Cleaning', 'pcs', 6, 3, 950, 'Estates store', 'Wringer'),
  ('KIT-RCE-25', 'Rice 25kg', 'Kitchen', 'bag', 7, 4, 4200, 'Kitchen store', 'Grade 1'),
  ('KIT-OIL-20', 'Cooking oil 20L', 'Kitchen', 'jerrycan', 2, 3, 5100, 'Kitchen store', 'Vegetable')
) as v(sku, name, cat, unit, qty, reorder, cost, loc, descr)
join inventory_categories c on c.name = v.cat
where not exists (select 1 from inventory_items);

insert into stock_movements (item_id, movement_type, quantity, unit_cost, person_type, person_id, person_name, notes, created_at)
select i.id, v.mtype, v.qty, i.unit_cost, v.ptype, v.pid, v.pname, v.notes, v.at
from (values
  ('STA-EXB-A4', 'receive', 40, 'supplier', null, 'Nairobi Paper Co.', 'Term 2 restock', now() - interval '18 days'),
  ('UNI-BLZ-M', 'issue', 1, 'student', '142/2024', 'Amina Wanjiku', 'Replacement blazer', now() - interval '12 days'),
  ('TXT-BIO-F4', 'issue', 1, 'student', '088/2023', 'Daniel Kariuki', 'Issued for KCSE prep', now() - interval '10 days'),
  ('ICT-CHR-01', 'issue', 1, 'staff', '548662', 'Samuel Kimani', 'Staff device', now() - interval '9 days'),
  ('LAB-GLV-M', 'issue', 6, 'staff', '533108', 'Helen Chebet', 'Practical week', now() - interval '7 days'),
  ('SPT-FBL-05', 'issue', 2, 'staff', '429551', 'Rose Atieno', 'Inter-house match', now() - interval '6 days'),
  ('KIT-RCE-25', 'receive', 10, 'supplier', null, 'Rift Grain Ltd', 'Kitchen delivery', now() - interval '5 days'),
  ('UNI-TIE-01', 'issue', 1, 'student', '201/2025', 'Zuri Mutiso', 'New Form 1 kit', now() - interval '4 days'),
  ('STA-PEN-BLU', 'issue', 2, 'staff', '476019', 'Aisha Mohammed', 'Exam hall', now() - interval '3 days'),
  ('CLN-DET-5L', 'issue', 1, 'staff', '22764018', 'Peter Onyango', 'Halls weekend clean', now() - interval '2 days'),
  ('TXT-MATH-F3', 'issue', 1, 'student', '148/2024', 'Kwame Ochieng', 'Replacement copy', now() - interval '1 day')
) as v(sku, mtype, qty, ptype, pid, pname, notes, at)
join inventory_items i on i.sku = v.sku
where not exists (select 1 from stock_movements);

insert into invoices (invoice_no, kind, party_type, party_id, party_name, status, issued_at, due_at, notes)
select * from (values
  ('INV-2026-0001', 'purchase', 'supplier', null, 'Nairobi Paper Co.', 'paid', '2026-08-14'::date, '2026-08-28'::date, 'Term 2 stationery'),
  ('INV-2026-0002', 'purchase', 'supplier', null, 'Rift Grain Ltd', 'issued', '2026-08-27'::date, '2026-09-10'::date, 'Kitchen stores'),
  ('INV-2026-0003', 'issue_charge', 'student', '142/2024', 'Amina Wanjiku', 'issued', '2026-08-20'::date, '2026-09-05'::date, 'Uniform replacement'),
  ('INV-2026-0004', 'issue_charge', 'student', '201/2025', 'Zuri Mutiso', 'paid', '2026-08-28'::date, '2026-09-11'::date, 'Form 1 starter kit'),
  ('INV-2026-0005', 'purchase', 'supplier', null, 'Lab Equip EA', 'draft', '2026-08-30'::date, '2026-09-20'::date, 'Nitrile gloves restock')
) as v
where not exists (select 1 from invoices);

insert into invoice_lines (invoice_id, item_id, description, quantity, unit_price)
select inv.id, it.id, v.descr, v.qty, v.price
from (values
  ('INV-2026-0001', 'STA-EXB-A4', 'A4 exercise books (pack of 10)', 40, 450),
  ('INV-2026-0001', 'STA-PEN-BLU', 'Blue ballpoint pens (box)', 12, 280),
  ('INV-2026-0002', 'KIT-RCE-25', 'Rice 25kg', 10, 4200),
  ('INV-2026-0002', 'KIT-OIL-20', 'Cooking oil 20L', 4, 5100),
  ('INV-2026-0003', 'UNI-BLZ-M', 'School blazer — medium', 1, 4200),
  ('INV-2026-0004', 'UNI-TIE-01', 'House tie', 1, 450),
  ('INV-2026-0005', 'LAB-GLV-M', 'Lab gloves (pair)', 24, 90)
) as v(invno, sku, descr, qty, price)
join invoices inv on inv.invoice_no = v.invno
join inventory_items it on it.sku = v.sku
where not exists (select 1 from invoice_lines);
