-- KISAKALI SHOPPING MALL: PostgreSQL schema v1 (PostgreSQL 13+). Safe to run more than once.

create table if not exists users (
  id bigserial primary key,
  name varchar(150) not null,
  email varchar(150),
  phone varchar(20) not null unique,
  password_hash text not null,
  role varchar(20) not null default 'customer' check (role in ('customer','vendor','driver','admin')),
  status varchar(20) not null default 'active' check (status in ('active','suspended','deleted')),
  country varchar(60) default 'Tanzania',
  profile_picture_url text,
  failed_attempts int not null default 0,
  locked_until timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists users_email_uq on users (lower(email)) where email is not null;

create table if not exists refresh_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id bigint not null references users(id) on delete cascade,
  token_hash text not null unique,
  user_agent text, ip text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  replaced_by uuid
);
create index if not exists refresh_user_idx on refresh_tokens (user_id);

create table if not exists otp_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id bigint references users(id) on delete cascade,
  phone varchar(20) not null,
  purpose varchar(20) not null check (purpose in ('login','reset')),
  code_hash text not null,
  attempts int not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists otp_phone_idx on otp_challenges (phone, created_at);

create table if not exists audit_logs (
  id bigserial primary key,
  user_id bigint references users(id) on delete set null,
  role varchar(20), action varchar(80) not null, ip text, meta jsonb,
  created_at timestamptz not null default now()
);
create table if not exists app_settings (key text primary key, value jsonb not null, updated_at timestamptz not null default now());

create table if not exists vendors (
  id bigserial primary key,
  user_id bigint not null unique references users(id) on delete cascade,
  shop_name varchar(100) unique not null,
  description text, logo_url text, cover_url text,
  approval_status varchar(20) not null default 'pending' check (approval_status in ('pending','approved','suspended')),
  subscription_plan varchar(30) not null default 'basic',
  payout_details jsonb,
  created_at timestamptz not null default now()
);
create table if not exists drivers (
  id bigserial primary key,
  user_id bigint not null unique references users(id) on delete cascade,
  vehicle_info varchar(100) not null default 'Motorcycle',
  license_number varchar(50),
  verification_status varchar(20) not null default 'pending' check (verification_status in ('pending','verified','suspended')),
  is_online boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists categories (id serial primary key, name varchar(60) not null, slug varchar(60) unique not null);

create table if not exists products (
  id bigserial primary key,
  vendor_id bigint not null references vendors(id) on delete cascade,
  category_id int references categories(id),
  title varchar(200) not null, description text,
  price numeric(12,2) not null check (price >= 0),
  stock_quantity int not null default 0 check (stock_quantity >= 0),
  status varchar(20) not null default 'draft' check (status in ('draft','submitted','approved','published','rejected','archived','suspended')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists products_vendor_idx on products (vendor_id);
create index if not exists products_status_idx on products (status);
create table if not exists product_variants (
  id bigserial primary key, product_id bigint not null references products(id) on delete cascade,
  variant_name varchar(100) not null, price_modifier numeric(12,2) not null default 0
);
create table if not exists media (
  id uuid primary key default gen_random_uuid(),
  vendor_id bigint not null references vendors(id) on delete cascade,
  product_id bigint references products(id) on delete set null,
  type varchar(10) not null check (type in ('image','video')),
  storage_key text not null, thumb_key text, original_name text, mime varchar(60) not null,
  size_bytes bigint not null, width int, height int,
  status varchar(20) not null default 'active' check (status in ('active','reported','suspended')),
  is_main boolean not null default false, sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists media_product_idx on media (product_id);

create table if not exists addresses (
  id bigserial primary key, user_id bigint not null references users(id) on delete cascade,
  recipient_name varchar(150), recipient_phone varchar(20),
  region varchar(80), district varchar(80), street text, instructions text,
  is_default boolean not null default false
);
create table if not exists orders (
  id bigserial primary key,
  order_number varchar(20) unique not null,
  customer_id bigint not null references users(id),
  total_amount numeric(12,2) not null, platform_commission numeric(12,2) not null default 0,
  delivery_fee numeric(12,2) not null default 0,
  payment_status varchar(20) not null default 'Pending' check (payment_status in ('Pending','Verified','Refunded','Failed')),
  payment_method varchar(50),
  shipping_address text not null, recipient_name varchar(150), recipient_phone varchar(20),
  delivery_date date, delivery_time varchar(30),
  is_anonymous_surprise boolean not null default false, hide_prices boolean not null default false,
  inscription_note text,
  fulfillment_milestone varchar(30) not null default 'Pending Payment',
  driver_id bigint references drivers(id),
  created_at timestamptz not null default now()
);
create index if not exists orders_customer_idx on orders (customer_id);
create table if not exists sub_orders (
  id bigserial primary key, order_id bigint not null references orders(id) on delete cascade,
  vendor_id bigint not null references vendors(id), subtotal numeric(12,2) not null,
  status varchar(30) not null default 'New' check (status in ('New','Accepted','Rejected','Preparing','Quality check','Ready','Assigned to Rider','Out for Delivery','Delivered','Cancelled')),
  reject_reason text, prep_minutes int, updated_at timestamptz not null default now()
);
create index if not exists sub_orders_vendor_idx on sub_orders (vendor_id);
create table if not exists order_items (
  id bigserial primary key, order_id bigint not null references orders(id) on delete cascade,
  sub_order_id bigint references sub_orders(id) on delete cascade,
  product_id bigint references products(id), variant_id bigint references product_variants(id),
  vendor_id bigint not null references vendors(id),
  quantity int not null check (quantity > 0), price_at_purchase numeric(12,2) not null,
  customization jsonb
);
create table if not exists payments (
  id bigserial primary key, order_id bigint not null references orders(id),
  provider varchar(30) not null, provider_ref varchar(100) unique,
  amount numeric(12,2) not null,
  status varchar(20) not null default 'Pending' check (status in ('Pending','Processing','Successful','Failed','Cancelled','Refunded')),
  raw_response jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists delivery_proofs (
  id bigserial primary key, order_id bigint not null references orders(id) on delete cascade,
  driver_id bigint not null references drivers(id), pod_image_url text not null,
  delivery_notes text, delivered_at timestamptz not null default now()
);
create table if not exists financial_ledgers (
  id bigserial primary key, order_id bigint references orders(id), vendor_id bigint references vendors(id),
  gross_amount numeric(12,2) not null, commission_cut numeric(12,2) not null, net_vendor_payout numeric(12,2) not null,
  payout_status varchar(20) not null default 'Unpaid' check (payout_status in ('Unpaid','Requested','Paid')),
  recorded_at timestamptz not null default now()
);
create table if not exists wishlists (
  user_id bigint not null references users(id) on delete cascade,
  product_id bigint not null references products(id) on delete cascade,
  created_at timestamptz not null default now(), primary key (user_id, product_id)
);
create table if not exists support_tickets (
  id bigserial primary key, user_id bigint not null references users(id), order_id bigint references orders(id),
  category varchar(40) not null, description text not null,
  status varchar(20) not null default 'Open' check (status in ('Open','Assigned','In Progress','Waiting for Customer','Resolved','Closed')),
  created_at timestamptz not null default now()
);
create table if not exists reviews (
  id bigserial primary key, user_id bigint not null references users(id), order_id bigint not null references orders(id),
  product_rating int check (product_rating between 1 and 5), vendor_rating int check (vendor_rating between 1 and 5),
  delivery_rating int check (delivery_rating between 1 and 5), body text,
  verified_purchase boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists loyalty_transactions (
  id bigserial primary key, user_id bigint not null references users(id) on delete cascade,
  points int not null, reason text not null, created_at timestamptz not null default now()
);
create table if not exists notifications (
  id bigserial primary key, user_id bigint not null references users(id) on delete cascade,
  title varchar(150) not null, body text, read_at timestamptz, created_at timestamptz not null default now()
);
