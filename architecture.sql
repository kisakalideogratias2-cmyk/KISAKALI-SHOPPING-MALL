u-- =====================================================================
-- PostgreSQL Relational Schema Blueprint for KISAKALI SHOPPING MALL
-- Multi-Vendor Ecosystem, Tanzanian Mobile Money & Surprise Delivery Engine
-- =====================================================================

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL, -- e.g., 0634172673 (Tanzania format)
    password_hash TEXT NOT NULL,
    role VARCHAR(30) DEFAULT 'customer', -- 'customer', 'vendor', 'driver', 'admin'
    profile_picture_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vendors (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    shop_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    logo_url TEXT,
    subscription_status VARCHAR(50) DEFAULT 'active', -- 'free', 'premium_monthly', 'featured_sponsor'
    payout_details JSONB, -- Stores M-Pesa wallets, Tigo Pesa, CRDB/NMB accounts
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE drivers (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    vehicle_info VARCHAR(100) NOT NULL, -- e.g., 'Motorcycle - Morogoro Plate T456ABC'
    license_number VARCHAR(50) NOT NULL,
    verification_status VARCHAR(30) DEFAULT 'pending', -- 'pending', 'verified', 'suspended'
    current_location VARCHAR(100) DEFAULT 'Ifakara'
);

CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL, -- 'Cakes & Pastries', 'Flower Bouquets', 'Surprise Boxes', 'ZENVO Fashion', 'Electronics'
    slug VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    vendor_id INT REFERENCES vendors(id) ON DELETE CASCADE,
    category_id INT REFERENCES categories(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(12, 2) NOT NULL,
    stock_quantity INT DEFAULT 0,
    images TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_variants (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    variant_name VARCHAR(100) NOT NULL, -- e.g., '1.5kg Medium Tier', 'Size: Large'
    price_modifier DECIMAL(12, 2) DEFAULT 0.00
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES users(id),
    total_amount DECIMAL(12, 2) NOT NULL,
    platform_commission DECIMAL(12, 2) NOT NULL,
    delivery_fee DECIMAL(12, 2) NOT NULL,
    payment_status VARCHAR(30) DEFAULT 'Pending', -- 'Pending', 'Verified', 'Refunded'
    payment_method VARCHAR(50) NOT NULL, -- 'Vodacom M-Pesa', 'Tigo Pesa', 'Airtel Money', 'CRDB Bank'
    shipping_address TEXT NOT NULL,
    is_anonymous_surprise BOOLEAN DEFAULT FALSE,
    inscription_note TEXT,
    fulfillment_milestone VARCHAR(50) DEFAULT 'Preparing/Baking', -- 'Preparing', 'Arranging', 'Assigned to Rider', 'Out for Delivery', 'Delivered'
    driver_id INT REFERENCES drivers(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id),
    variant_id INT REFERENCES product_variants(id),
    vendor_id INT REFERENCES vendors(id),
    quantity INT NOT NULL,
    price_at_purchase DECIMAL(12, 2) NOT NULL
);

CREATE TABLE delivery_proofs (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    driver_id INT REFERENCES drivers(id),
    pod_image_url TEXT NOT NULL,
    delivery_notes TEXT,
    delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE financial_ledgers (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id),
    vendor_id INT REFERENCES vendors(id),
    gross_amount DECIMAL(12, 2) NOT NULL,
    commission_cut DECIMAL(12, 2) NOT NULL,
    net_vendor_payout DECIMAL(12, 2) NOT NULL,
    payout_status VARCHAR(30) DEFAULT 'Unpaid',
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- =====================================================================
-- APPENDED: paste at the very bottom of architecture.sql
-- (First delete the stray "u" at the very start of line 1 of that file.)
-- =====================================================================

-- Constraints on existing tables
ALTER TABLE users ADD CONSTRAINT users_phone_unique UNIQUE (phone);
ALTER TABLE users ADD CONSTRAINT users_role_chk CHECK (role IN ('customer','vendor','driver','admin'));
ALTER TABLE vendors ADD COLUMN approval_status VARCHAR(20) DEFAULT 'pending'
    CHECK (approval_status IN ('pending','approved','suspended'));
ALTER TABLE drivers ADD CONSTRAINT drivers_verif_chk CHECK (verification_status IN ('pending','verified','suspended'));

-- Recipient + delivery fields on orders (needed for surprise gifts)
ALTER TABLE orders ADD COLUMN order_number VARCHAR(20) UNIQUE;
ALTER TABLE orders ADD COLUMN recipient_name VARCHAR(150);
ALTER TABLE orders ADD COLUMN recipient_phone VARCHAR(20);
ALTER TABLE orders ADD COLUMN delivery_date DATE;
ALTER TABLE orders ADD COLUMN delivery_time VARCHAR(30);
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_chk
    CHECK (payment_status IN ('Pending','Verified','Refunded','Failed'));
ALTER TABLE orders ADD CONSTRAINT orders_milestone_chk
    CHECK (fulfillment_milestone IN ('Preparing/Baking','Preparing','Arranging','Assigned to Rider','Out for Delivery','Delivered'));

-- One sub-order per vendor per order (each vendor has its own status)
CREATE TABLE sub_orders (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    vendor_id INT NOT NULL REFERENCES vendors(id),
    subtotal DECIMAL(12,2) NOT NULL,
    status VARCHAR(30) DEFAULT 'Preparing'
        CHECK (status IN ('Preparing','Arranging','Ready','Assigned to Rider','Out for Delivery','Delivered','Cancelled')),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE order_items ADD COLUMN sub_order_id INT REFERENCES sub_orders(id) ON DELETE CASCADE;

CREATE TABLE addresses (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label VARCHAR(50),
    address_text TEXT NOT NULL,
    area VARCHAR(100),
    is_default BOOLEAN DEFAULT FALSE
);

CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(id),
    provider VARCHAR(50) NOT NULL,          -- 'Vodacom M-Pesa', 'Tigo Pesa', ...
    payer_phone VARCHAR(20),
    provider_reference VARCHAR(100) UNIQUE, -- transaction ID from the provider
    amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending','Verified','Failed','Refunded')),
    verified_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vendor_wallets (
    vendor_id INT PRIMARY KEY REFERENCES vendors(id) ON DELETE CASCADE,
    available_balance DECIMAL(12,2) DEFAULT 0 CHECK (available_balance >= 0),
    pending_balance DECIMAL(12,2) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payout_requests (
    id SERIAL PRIMARY KEY,
    vendor_id INT NOT NULL REFERENCES vendors(id),
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    status VARCHAR(20) DEFAULT 'Requested' CHECK (status IN ('Requested','Approved','Paid','Rejected')),
    payment_reference VARCHAR(100),
    processed_by INT REFERENCES users(id),
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

CREATE TABLE refunds (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(id),
    payment_id INT REFERENCES payments(id),
    amount DECIMAL(12,2) NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'Requested' CHECK (status IN ('Requested','Approved','Paid','Rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id),
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (product_id, user_id)
);

CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    body TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE coupons (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) UNIQUE NOT NULL,
    discount_percent INT CHECK (discount_percent BETWEEN 1 AND 100),
    discount_amount DECIMAL(12,2),
    expires_at TIMESTAMP,
    max_uses INT,
    used_count INT DEFAULT 0
);

CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes on foreign keys / lookups
CREATE INDEX idx_vendors_user ON vendors(user_id);
CREATE INDEX idx_products_vendor ON products(vendor_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_driver ON orders(driver_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_sub_orders_order ON sub_orders(order_id);
CREATE INDEX idx_sub_orders_vendor ON sub_orders(vendor_id);
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_ledgers_vendor ON financial_ledgers(vendor_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
