-- FleetWise AI - Supabase Database Schema
-- Run this in Supabase SQL Editor: https://dphydlneamkkmraxjuxi.supabase.co

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================
-- CORE TABLES
-- ====================

-- Companies/Organizations
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    labor_rate DECIMAL(10,2) DEFAULT 125.00,
    shop_code TEXT,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'technician' CHECK (role IN ('company_admin', 'service_advisor', 'technician', 'supervisor')),
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trucks/Vehicles
CREATE TABLE IF NOT EXISTS trucks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    customer_name TEXT,
    
    -- Identity
    truck_number TEXT,
    unit_id TEXT,
    vin TEXT,
    year INTEGER,
    make TEXT,
    model TEXT,
    license_plate TEXT,
    is_lease BOOLEAN DEFAULT false,
    shop_code TEXT,
    
    -- Technical specs (stored as JSONB for flexibility)
    engine JSONB DEFAULT '{}'::jsonb,
    transmission JSONB DEFAULT '{}'::jsonb,
    drivetrain JSONB DEFAULT '{}'::jsonb,
    emissions JSONB DEFAULT '{}'::jsonb,
    electronics JSONB DEFAULT '{}'::jsonb,
    braking JSONB DEFAULT '{}'::jsonb,
    electrical JSONB DEFAULT '{}'::jsonb,
    fuel_system JSONB DEFAULT '{}'::jsonb,
    cooling JSONB DEFAULT '{}'::jsonb,
    maintenance JSONB DEFAULT '{}'::jsonb,
    
    -- Additional fields
    notes TEXT,
    shop_notes TEXT,
    data_completeness INTEGER DEFAULT 0,
    health_score INTEGER DEFAULT 0,
    
    created_by TEXT,
    updated_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects/Work Orders
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    truck_id UUID REFERENCES trucks(id) ON DELETE CASCADE,
    project_number TEXT,
    
    -- Work order details
    customer_complaint TEXT,
    fault_codes JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'waiting_for_parts', 'delayed', 'ready_pending_confirmation', 'completed', 'closed')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
    
    -- Assignments
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_to_name TEXT,
    
    -- Diagnostics
    diagnostic_notes TEXT,
    diagnostic_summary TEXT,
    ai_diagnostic JSONB DEFAULT '{}'::jsonb,
    captured_data JSONB DEFAULT '{}'::jsonb,
    
    -- Dates
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    
    created_by TEXT,
    updated_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Estimates
CREATE TABLE IF NOT EXISTS estimates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    truck_id UUID REFERENCES trucks(id) ON DELETE CASCADE,
    estimate_number TEXT NOT NULL,
    
    -- Customer details
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    
    -- Truck details
    truck_info JSONB DEFAULT '{}'::jsonb,
    
    -- Estimate items
    parts JSONB DEFAULT '[]'::jsonb,
    labor_items JSONB DEFAULT '[]'::jsonb,
    
    -- Totals
    parts_total DECIMAL(10,2) DEFAULT 0,
    labor_total DECIMAL(10,2) DEFAULT 0,
    estimated_total DECIMAL(10,2) DEFAULT 0,
    
    -- Status
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'declined')),
    valid_until DATE,
    notes TEXT,
    
    -- Metadata
    created_via TEXT DEFAULT 'project',
    sent_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    invoice_number TEXT NOT NULL,
    
    -- Items
    parts JSONB DEFAULT '[]'::jsonb,
    labor_items JSONB DEFAULT '[]'::jsonb,
    
    -- Totals
    subtotal DECIMAL(10,2) DEFAULT 0,
    tax DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) DEFAULT 0,
    
    -- Status
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    due_date DATE,
    paid_date DATE,
    notes TEXT,
    
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Parts Catalog
CREATE TABLE IF NOT EXISTS parts_catalog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    
    part_number TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    manufacturer TEXT,
    
    -- Pricing
    cost DECIMAL(10,2) DEFAULT 0,
    price DECIMAL(10,2) DEFAULT 0,
    markup_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- Inventory
    quantity_on_hand INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 0,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================
-- PHASE 22 TABLES (Shop Floor Operations)
-- ====================

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    
    title TEXT NOT NULL,
    description TEXT,
    task_type TEXT CHECK (task_type IN ('repair', 'inspection', 'diagnostic', 'pm', 'emergency')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
    status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'blocked', 'completed', 'reviewed')),
    
    -- Assignment
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Task details
    checklist JSONB DEFAULT '[]'::jsonb,
    blocking_reason TEXT,
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2),
    
    -- Dates
    due_date TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Comments
CREATE TABLE IF NOT EXISTS task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_name TEXT,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team Messages
CREATE TABLE IF NOT EXISTS team_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    
    from_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    from_user_name TEXT,
    to_user_name TEXT,
    
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safety Checklists
CREATE TABLE IF NOT EXISTS safety_checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    
    performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    performed_by_name TEXT,
    
    equipment_condition TEXT CHECK (equipment_condition IN ('good', 'fair', 'needs_attention')),
    hazards_identified JSONB DEFAULT '[]'::jsonb,
    ppe_verified BOOLEAN DEFAULT false,
    emergency_equipment_checked BOOLEAN DEFAULT false,
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shift Handoffs
CREATE TABLE IF NOT EXISTS shift_handoffs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    
    shift_type TEXT CHECK (shift_type IN ('morning', 'afternoon', 'night')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by_name TEXT,
    
    -- Handoff details
    active_projects JSONB DEFAULT '[]'::jsonb,
    completed_tasks JSONB DEFAULT '[]'::jsonb,
    pending_tasks JSONB DEFAULT '[]'::jsonb,
    blocked_tasks JSONB DEFAULT '[]'::jsonb,
    safety_incidents JSONB DEFAULT '[]'::jsonb,
    equipment_issues JSONB DEFAULT '[]'::jsonb,
    parts_needed JSONB DEFAULT '[]'::jsonb,
    
    priority_notes TEXT,
    next_shift_instructions TEXT,
    
    acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Time Tracking
CREATE TABLE IF NOT EXISTS time_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    clock_in TIMESTAMPTZ NOT NULL,
    clock_out TIMESTAMPTZ,
    duration_minutes INTEGER,
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Equipment Checkout
CREATE TABLE IF NOT EXISTS equipment_checkout (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    
    equipment_name TEXT NOT NULL,
    equipment_id TEXT,
    checked_out_by UUID REFERENCES users(id) ON DELETE SET NULL,
    checked_out_by_name TEXT,
    
    checkout_time TIMESTAMPTZ NOT NULL,
    expected_return TIMESTAMPTZ,
    actual_return TIMESTAMPTZ,
    
    condition_out TEXT CHECK (condition_out IN ('good', 'fair', 'damaged')),
    condition_in TEXT CHECK (condition_in IN ('good', 'fair', 'damaged')),
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quality Checks
CREATE TABLE IF NOT EXISTS quality_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    
    performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    performed_by_name TEXT,
    
    checklist JSONB DEFAULT '[]'::jsonb,
    passed BOOLEAN DEFAULT true,
    issues_found TEXT,
    corrective_actions TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================
-- AI & KNOWLEDGE BASE TABLES
-- ====================

-- Knowledge Base (approved entries)
CREATE TABLE IF NOT EXISTS knowledge_base (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT,
    tags TEXT[],
    
    source TEXT,
    submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    usage_count INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Knowledge Submissions (pending approval)
CREATE TABLE IF NOT EXISTS knowledge_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT,
    tags TEXT[],
    
    submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    
    reviewer_notes TEXT,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Diagnostic Sessions (AI Chat)
CREATE TABLE IF NOT EXISTS diagnostic_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    
    messages JSONB DEFAULT '[]'::jsonb,
    captured_data JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Work Order Summaries
CREATE TABLE IF NOT EXISTS work_order_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    
    summary_text TEXT NOT NULL,
    summary_markdown TEXT,
    
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Warranty Analyses
CREATE TABLE IF NOT EXISTS warranty_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    
    has_warranty_opportunity BOOLEAN DEFAULT false,
    opportunities JSONB DEFAULT '[]'::jsonb,
    next_steps JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================
-- INDEXES for Performance
-- ====================

CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

CREATE INDEX IF NOT EXISTS idx_trucks_company ON trucks(company_id);
CREATE INDEX IF NOT EXISTS idx_trucks_customer ON trucks(customer_id);
CREATE INDEX IF NOT EXISTS idx_trucks_vin ON trucks(vin);

CREATE INDEX IF NOT EXISTS idx_projects_company ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_truck ON projects(truck_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_assigned ON projects(assigned_to);

CREATE INDEX IF NOT EXISTS idx_estimates_company ON estimates(company_id);
CREATE INDEX IF NOT EXISTS idx_estimates_project ON estimates(project_id);

CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project ON invoices(project_id);

CREATE INDEX IF NOT EXISTS idx_tasks_company ON tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

CREATE INDEX IF NOT EXISTS idx_knowledge_base_company ON knowledge_base(company_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_submissions_company ON knowledge_submissions(company_id);

-- ====================
-- ROW LEVEL SECURITY (RLS)
-- ====================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_checkout ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranty_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow authenticated users to access their company's data)
-- Companies
CREATE POLICY "Users can view their company" ON companies FOR SELECT TO authenticated USING (
    id IN (SELECT company_id FROM users WHERE id = auth.uid())
);

CREATE POLICY "Users can update their company" ON companies FOR UPDATE TO authenticated USING (
    id IN (SELECT company_id FROM users WHERE id = auth.uid())
);

-- Users
CREATE POLICY "Users can view users in their company" ON users FOR SELECT TO authenticated USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
);

-- Customers
CREATE POLICY "Users can manage customers in their company" ON customers FOR ALL TO authenticated USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
);

-- Trucks
CREATE POLICY "Users can manage trucks in their company" ON trucks FOR ALL TO authenticated USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
);

-- Projects
CREATE POLICY "Users can manage projects in their company" ON projects FOR ALL TO authenticated USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
);

-- Apply similar policies for all other tables
-- (You can add more specific policies based on roles later)

-- ====================
-- TRIGGERS for updated_at
-- ====================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trucks_updated_at BEFORE UPDATE ON trucks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_estimates_updated_at BEFORE UPDATE ON estimates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parts_catalog_updated_at BEFORE UPDATE ON parts_catalog FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================
-- DONE! Schema Created
-- ====================

-- Verify tables created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
