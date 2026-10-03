CREATE DATABASE IF NOT EXISTS oncology_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE oncology_db;

CREATE TABLE IF NOT EXISTS doctors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(160) UNIQUE,
  mobile VARCHAR(40),
  specialty VARCHAR(120),
  designation VARCHAR(160),
  qualifications VARCHAR(180),
  reg_no VARCHAR(80),
  clinic VARCHAR(180),
  address TEXT,
  prescription_title VARCHAR(180),
  prescription_subtitle VARCHAR(220),
  avatar_url MEDIUMTEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_code VARCHAR(20) NOT NULL UNIQUE,
  full_name VARCHAR(120) NOT NULL,
  mobile VARCHAR(40) NOT NULL,
  date_of_birth DATE NULL,
  age INT NULL,
  gender ENUM('Male', 'Female', 'Other') NOT NULL,
  blood_group VARCHAR(5),
  previous_reports TEXT,
  previous_report_files TEXT,
  last_visit DATE NULL,
  total_visits INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS appointments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  appointment_code VARCHAR(20) NOT NULL UNIQUE,
  patient_id INT NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  serial_no INT NOT NULL,
  status ENUM('Confirmed', 'Waiting', 'In Progress', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Confirmed',
  appointment_type VARCHAR(80),
  duration_minutes INT NOT NULL DEFAULT 30,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_appointments_patient
    FOREIGN KEY (patient_id) REFERENCES patients(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS prescription_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  specialty VARCHAR(120),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  used_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS template_sections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  template_id INT NOT NULL,
  section_name VARCHAR(120) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_template_sections_template
    FOREIGN KEY (template_id) REFERENCES prescription_templates(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS prescriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  prescription_code VARCHAR(30) NOT NULL UNIQUE,
  patient_id INT NOT NULL,
  doctor_id INT NULL,
  template_id INT NULL,
  prescription_date DATE NOT NULL,
  chief_complaint TEXT,
  history TEXT,
  examination TEXT,
  diagnosis TEXT,
  treatment_plan TEXT,
  referred_by TEXT,
  advice TEXT,
  investigation TEXT,
  follow_up_date DATE NULL,
  follow_up_interval VARCHAR(80) NULL,
  follow_up_note TEXT NULL,
  referred_to TEXT,
  special_notes TEXT,
  status ENUM('Draft', 'Final') NOT NULL DEFAULT 'Draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_prescriptions_patient
    FOREIGN KEY (patient_id) REFERENCES patients(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_prescriptions_doctor
    FOREIGN KEY (doctor_id) REFERENCES doctors(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_prescriptions_template
    FOREIGN KEY (template_id) REFERENCES prescription_templates(id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS prescription_medicines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  prescription_id INT NOT NULL,
  medicine_name VARCHAR(180) NOT NULL,
  generic_name VARCHAR(180),
  dosage VARCHAR(80),
  meal_timing VARCHAR(80),
  duration VARCHAR(80),
  instructions TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_prescription_medicines_prescription
    FOREIGN KEY (prescription_id) REFERENCES prescriptions(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_code VARCHAR(30) NOT NULL UNIQUE,
  patient_id INT NOT NULL,
  invoice_date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount DECIMAL(10,2) NOT NULL DEFAULT 0,
  paid DECIMAL(10,2) NOT NULL DEFAULT 0,
  due DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(40),
  status ENUM('Paid', 'Partial', 'Unpaid') NOT NULL DEFAULT 'Unpaid',
  service_type VARCHAR(80),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_invoices_patient
    FOREIGN KEY (patient_id) REFERENCES patients(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS app_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(80) NOT NULL UNIQUE,
  setting_value JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS research_projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  description TEXT,
  current_step INT NOT NULL DEFAULT 0,
  status VARCHAR(40) NOT NULL DEFAULT 'Draft',
  metadata JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  identifier VARCHAR(180) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(180) NULL,
  role VARCHAR(60) NOT NULL DEFAULT 'doctor',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auth_otps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  identifier VARCHAR(180) NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  purpose VARCHAR(40) NOT NULL DEFAULT 'login',
  expires_at DATETIME NOT NULL,
  consumed_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS medicines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sku VARCHAR(40) NOT NULL UNIQUE,
  product_name VARCHAR(220) NOT NULL,
  generic_name VARCHAR(700) NULL,
  company VARCHAR(120) NULL,
  form VARCHAR(80) NULL,
  strength VARCHAR(120) NULL,
  source VARCHAR(120) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_medicines_product_name (product_name),
  INDEX idx_medicines_generic_name (generic_name),
  INDEX idx_medicines_sku (sku)
);
