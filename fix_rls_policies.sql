-- Fix RLS policies to allow service_role full access
-- Run this in Supabase SQL Editor

-- Allow service_role to bypass RLS (service role should have full access)
-- Add permissive policies for service_role

-- Companies
CREATE POLICY "Service role full access to companies" ON companies FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Users  
CREATE POLICY "Service role full access to users" ON users FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Customers
CREATE POLICY "Service role full access to customers" ON customers FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Trucks
CREATE POLICY "Service role full access to trucks" ON trucks FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Projects
CREATE POLICY "Service role full access to projects" ON projects FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Estimates
CREATE POLICY "Service role full access to estimates" ON estimates FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Invoices
CREATE POLICY "Service role full access to invoices" ON invoices FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Parts Catalog
CREATE POLICY "Service role full access to parts_catalog" ON parts_catalog FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Tasks
CREATE POLICY "Service role full access to tasks" ON tasks FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Task Comments
CREATE POLICY "Service role full access to task_comments" ON task_comments FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Team Messages
CREATE POLICY "Service role full access to team_messages" ON team_messages FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Safety Checklists
CREATE POLICY "Service role full access to safety_checklists" ON safety_checklists FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Shift Handoffs
CREATE POLICY "Service role full access to shift_handoffs" ON shift_handoffs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Time Tracking
CREATE POLICY "Service role full access to time_tracking" ON time_tracking FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Equipment Checkout
CREATE POLICY "Service role full access to equipment_checkout" ON equipment_checkout FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Quality Checks
CREATE POLICY "Service role full access to quality_checks" ON quality_checks FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Knowledge Base
CREATE POLICY "Service role full access to knowledge_base" ON knowledge_base FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Knowledge Submissions
CREATE POLICY "Service role full access to knowledge_submissions" ON knowledge_submissions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Diagnostic Sessions
CREATE POLICY "Service role full access to diagnostic_sessions" ON diagnostic_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Work Order Summaries
CREATE POLICY "Service role full access to work_order_summaries" ON work_order_summaries FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Warranty Analyses
CREATE POLICY "Service role full access to warranty_analyses" ON warranty_analyses FOR ALL TO service_role USING (true) WITH CHECK (true);
