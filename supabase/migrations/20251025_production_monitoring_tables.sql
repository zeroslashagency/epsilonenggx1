-- =====================================================
-- PRODUCTION & MONITORING MODULE TABLES
-- Created: 2025-10-25
-- Purpose: Support Production and Monitoring features
-- =====================================================

-- =====================================================
-- PRODUCTION MODULE TABLES
-- =====================================================

-- Production Orders Table
CREATE TABLE IF NOT EXISTS production_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date DATE NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Machines Table
CREATE TABLE IF NOT EXISTS machines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'idle' CHECK (status IN ('running', 'idle', 'maintenance', 'offline')),
  efficiency INTEGER DEFAULT 0 CHECK (efficiency >= 0 AND efficiency <= 100),
  current_order_id UUID REFERENCES production_orders(id) ON DELETE SET NULL,
  last_maintenance DATE,
  next_maintenance DATE,
  location VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Production Personnel Table
CREATE TABLE IF NOT EXISTS production_personnel (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(100) NOT NULL,
  shift VARCHAR(20) NOT NULL CHECK (shift IN ('morning', 'afternoon', 'night')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'on_leave', 'absent')),
  assigned_machine_id UUID REFERENCES machines(id) ON DELETE SET NULL,
  efficiency_score INTEGER DEFAULT 0 CHECK (efficiency_score >= 0 AND efficiency_score <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Production Tasks Table
CREATE TABLE IF NOT EXISTS production_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  order_id UUID REFERENCES production_orders(id) ON DELETE CASCADE,
  assigned_to_id UUID REFERENCES production_personnel(id) ON DELETE SET NULL,
  machine_id UUID REFERENCES machines(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked')),
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  due_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- MONITORING MODULE TABLES
-- =====================================================

-- System Alerts Table
CREATE TABLE IF NOT EXISTS system_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  source VARCHAR(255) NOT NULL,
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quality Checks Table
CREATE TABLE IF NOT EXISTS quality_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES production_orders(id) ON DELETE CASCADE,
  product VARCHAR(255) NOT NULL,
  inspector_id UUID REFERENCES production_personnel(id) ON DELETE SET NULL,
  inspector_name VARCHAR(255) NOT NULL,
  result VARCHAR(20) NOT NULL CHECK (result IN ('passed', 'failed', 'pending')),
  defects INTEGER DEFAULT 0 CHECK (defects >= 0),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Maintenance Records Table
CREATE TABLE IF NOT EXISTS maintenance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id UUID REFERENCES machines(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('scheduled', 'preventive', 'corrective')),
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('completed', 'in_progress', 'scheduled', 'overdue')),
  technician_id UUID REFERENCES production_personnel(id) ON DELETE SET NULL,
  technician_name VARCHAR(255) NOT NULL,
  scheduled_date DATE NOT NULL,
  completed_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Production Orders Indexes
CREATE INDEX idx_production_orders_status ON production_orders(status);
CREATE INDEX idx_production_orders_priority ON production_orders(priority);
CREATE INDEX idx_production_orders_due_date ON production_orders(due_date);
CREATE INDEX idx_production_orders_created_at ON production_orders(created_at DESC);

-- Machines Indexes
CREATE INDEX idx_machines_status ON machines(status);
CREATE INDEX idx_machines_type ON machines(type);
CREATE INDEX idx_machines_current_order ON machines(current_order_id);

-- Production Personnel Indexes
CREATE INDEX idx_production_personnel_status ON production_personnel(status);
CREATE INDEX idx_production_personnel_shift ON production_personnel(shift);
CREATE INDEX idx_production_personnel_assigned_machine ON production_personnel(assigned_machine_id);

-- Production Tasks Indexes
CREATE INDEX idx_production_tasks_status ON production_tasks(status);
CREATE INDEX idx_production_tasks_priority ON production_tasks(priority);
CREATE INDEX idx_production_tasks_order ON production_tasks(order_id);
CREATE INDEX idx_production_tasks_assigned_to ON production_tasks(assigned_to_id);

-- System Alerts Indexes
CREATE INDEX idx_system_alerts_severity ON system_alerts(severity);
CREATE INDEX idx_system_alerts_acknowledged ON system_alerts(acknowledged);
CREATE INDEX idx_system_alerts_created_at ON system_alerts(created_at DESC);

-- Quality Checks Indexes
CREATE INDEX idx_quality_checks_result ON quality_checks(result);
CREATE INDEX idx_quality_checks_order ON quality_checks(order_id);
CREATE INDEX idx_quality_checks_created_at ON quality_checks(created_at DESC);

-- Maintenance Records Indexes
CREATE INDEX idx_maintenance_records_status ON maintenance_records(status);
CREATE INDEX idx_maintenance_records_type ON maintenance_records(type);
CREATE INDEX idx_maintenance_records_machine ON maintenance_records(machine_id);
CREATE INDEX idx_maintenance_records_scheduled_date ON maintenance_records(scheduled_date);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;

-- Production Orders Policies
CREATE POLICY "Users can view production orders" ON production_orders
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users with operate_machine can manage orders" ON production_orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_permissions up
      JOIN permissions p ON up.permission_id = p.id
      WHERE up.user_id = auth.uid() AND p.code = 'operate_machine'
    )
  );

-- Machines Policies
CREATE POLICY "Users can view machines" ON machines
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users with operate_machine can manage machines" ON machines
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_permissions up
      JOIN permissions p ON up.permission_id = p.id
      WHERE up.user_id = auth.uid() AND p.code = 'operate_machine'
    )
  );

-- Production Personnel Policies
CREATE POLICY "Users can view personnel" ON production_personnel
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users with manage_users can manage personnel" ON production_personnel
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_permissions up
      JOIN permissions p ON up.permission_id = p.id
      WHERE up.user_id = auth.uid() AND p.code = 'manage_users'
    )
  );

-- Production Tasks Policies
CREATE POLICY "Users can view tasks" ON production_tasks
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users with operate_machine can manage tasks" ON production_tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_permissions up
      JOIN permissions p ON up.permission_id = p.id
      WHERE up.user_id = auth.uid() AND p.code = 'operate_machine'
    )
  );

-- System Alerts Policies
CREATE POLICY "Users can view alerts" ON system_alerts
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can acknowledge alerts" ON system_alerts
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Quality Checks Policies
CREATE POLICY "Users can view quality checks" ON quality_checks
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users with operate_machine can manage quality checks" ON quality_checks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_permissions up
      JOIN permissions p ON up.permission_id = p.id
      WHERE up.user_id = auth.uid() AND p.code = 'operate_machine'
    )
  );

-- Maintenance Records Policies
CREATE POLICY "Users can view maintenance records" ON maintenance_records
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users with operate_machine can manage maintenance" ON maintenance_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_permissions up
      JOIN permissions p ON up.permission_id = p.id
      WHERE up.user_id = auth.uid() AND p.code = 'operate_machine'
    )
  );

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_production_orders_updated_at BEFORE UPDATE ON production_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_machines_updated_at BEFORE UPDATE ON machines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_production_personnel_updated_at BEFORE UPDATE ON production_personnel
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_production_tasks_updated_at BEFORE UPDATE ON production_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quality_checks_updated_at BEFORE UPDATE ON quality_checks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_records_updated_at BEFORE UPDATE ON maintenance_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SAMPLE DATA (OPTIONAL - FOR TESTING)
-- =====================================================

-- Insert sample production orders
INSERT INTO production_orders (order_number, customer_name, product_name, quantity, status, priority, due_date) VALUES
  ('ORD-001', 'Acme Corp', 'Widget A', 1000, 'in_progress', 'high', '2025-11-01'),
  ('ORD-002', 'TechCo Ltd', 'Widget B', 500, 'pending', 'medium', '2025-11-15'),
  ('ORD-003', 'Global Industries', 'Widget C', 750, 'pending', 'low', '2025-11-30');

-- Insert sample machines
INSERT INTO machines (machine_id, name, type, status, efficiency, last_maintenance, next_maintenance) VALUES
  ('MCH-001', 'CNC Machine 1', 'CNC', 'running', 92, '2025-10-01', '2025-11-01'),
  ('MCH-002', 'Lathe Machine 1', 'Lathe', 'idle', 85, '2025-09-15', '2025-10-30'),
  ('MCH-003', 'Milling Machine 1', 'Milling', 'maintenance', 0, '2025-10-25', '2025-11-25');

-- Insert sample personnel
INSERT INTO production_personnel (employee_id, name, role, shift, status, efficiency_score) VALUES
  ('EMP-001', 'John Doe', 'Machine Operator', 'morning', 'active', 95),
  ('EMP-002', 'Jane Smith', 'Quality Inspector', 'afternoon', 'active', 88),
  ('EMP-003', 'Mike Johnson', 'Maintenance Technician', 'morning', 'active', 90);

-- Insert sample tasks
INSERT INTO production_tasks (task_id, title, order_id, status, priority, progress, due_date) VALUES
  ('TSK-001', 'Machine Setup for ORD-001', (SELECT id FROM production_orders WHERE order_number = 'ORD-001'), 'in_progress', 'high', 65, '2025-10-26'),
  ('TSK-002', 'Quality Check - Widget A', (SELECT id FROM production_orders WHERE order_number = 'ORD-001'), 'pending', 'medium', 0, '2025-10-27');

-- Insert sample alerts
INSERT INTO system_alerts (title, message, severity, source) VALUES
  ('Machine MCH-003 Down', 'CNC Machine 3 has stopped unexpectedly. Maintenance required.', 'critical', 'MCH-003'),
  ('Low Material Stock', 'Raw material inventory below threshold for Widget A production.', 'warning', 'Inventory System'),
  ('Scheduled Maintenance Due', 'MCH-002 scheduled maintenance is due in 2 days.', 'info', 'Maintenance System');

-- Insert sample quality checks
INSERT INTO quality_checks (order_id, product, inspector_name, result, defects) VALUES
  ((SELECT id FROM production_orders WHERE order_number = 'ORD-001'), 'Widget A', 'Jane Smith', 'passed', 0),
  ((SELECT id FROM production_orders WHERE order_number = 'ORD-002'), 'Widget B', 'John Doe', 'failed', 3),
  ((SELECT id FROM production_orders WHERE order_number = 'ORD-003'), 'Widget C', 'Jane Smith', 'pending', 0);

-- Insert sample maintenance records
INSERT INTO maintenance_records (machine_id, type, status, technician_name, scheduled_date, completed_date, notes) VALUES
  ((SELECT id FROM machines WHERE machine_id = 'MCH-001'), 'scheduled', 'completed', 'Mike Johnson', '2025-10-20', '2025-10-20', 'Regular maintenance completed successfully'),
  ((SELECT id FROM machines WHERE machine_id = 'MCH-002'), 'preventive', 'scheduled', 'Sarah Williams', '2025-10-30', NULL, 'Scheduled preventive maintenance'),
  ((SELECT id FROM machines WHERE machine_id = 'MCH-003'), 'corrective', 'in_progress', 'Mike Johnson', '2025-10-25', NULL, 'Emergency repair - motor failure');

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE production_orders IS 'Stores production orders with customer and product information';
COMMENT ON TABLE machines IS 'Tracks manufacturing machines and their status';
COMMENT ON TABLE production_personnel IS 'Manages production floor staff';
COMMENT ON TABLE production_tasks IS 'Tracks individual production tasks';
COMMENT ON TABLE system_alerts IS 'System-wide alerts and notifications';
COMMENT ON TABLE quality_checks IS 'Quality control inspection records';
COMMENT ON TABLE maintenance_records IS 'Machine maintenance history and schedule';
