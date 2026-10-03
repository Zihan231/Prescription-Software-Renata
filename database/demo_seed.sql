USE oncology_db;

START TRANSACTION;

INSERT INTO doctors
  (full_name, email, mobile, specialty, designation, qualifications, reg_no, clinic, address, prescription_title, prescription_subtitle)
VALUES
  ('Dr. Farhana Rahman', 'demo.oncologist@example.test', '+880 1711-000000', 'Oncologist', 'Consultant, Medical Oncology', 'MBBS, FCPS (Oncology)', 'DEMO-BMDC-10452', 'Renata Cancer Care', 'Dhaka, Bangladesh', 'Oncology Prescription', 'Smart Prescription & Patient Management')
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name), specialty=VALUES(specialty), designation=VALUES(designation), qualifications=VALUES(qualifications), clinic=VALUES(clinic);

INSERT INTO patients
  (patient_code, full_name, mobile, date_of_birth, age, gender, blood_group, previous_reports, last_visit, total_visits)
VALUES
  ('DEMO-PT-001', 'Amina Begum', '+880 1712-100001', '1974-03-18', 52, 'Female', 'B+', 'Biopsy report and CT chest reviewed.', CURDATE(), 4),
  ('DEMO-PT-002', 'Kamal Hossain', '+880 1712-100002', '1961-11-02', 64, 'Male', 'A+', 'Previous chemotherapy summary available.', CURDATE(), 7),
  ('DEMO-PT-003', 'Nusrat Jahan', '+880 1712-100003', '1988-07-21', 37, 'Female', 'O+', 'Ultrasound and CBC attached.', DATE_SUB(CURDATE(), INTERVAL 3 DAY), 2),
  ('DEMO-PT-004', 'Shafiq Ahmed', '+880 1712-100004', '1956-09-12', 69, 'Male', 'AB+', 'PET-CT reviewed during last visit.', DATE_SUB(CURDATE(), INTERVAL 8 DAY), 5),
  ('DEMO-PT-005', 'Rina Sultana', '+880 1712-100005', '1993-01-30', 33, 'Female', 'A-', 'Newly registered patient.', CURDATE(), 1)
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name), mobile=VALUES(mobile), age=VALUES(age), gender=VALUES(gender), blood_group=VALUES(blood_group), previous_reports=VALUES(previous_reports), last_visit=VALUES(last_visit), total_visits=VALUES(total_visits);

INSERT INTO appointments
  (appointment_code, patient_id, appointment_date, appointment_time, serial_no, status, appointment_type, duration_minutes, notes)
VALUES
  ('DEMO-APT-001', (SELECT id FROM patients WHERE patient_code='DEMO-PT-001'), CURDATE(), '09:00:00', 1, 'Completed', 'Chemotherapy Review', 30, 'Review CBC before next cycle.'),
  ('DEMO-APT-002', (SELECT id FROM patients WHERE patient_code='DEMO-PT-002'), CURDATE(), '10:00:00', 2, 'In Progress', 'Follow-up', 30, 'Assess treatment response.'),
  ('DEMO-APT-003', (SELECT id FROM patients WHERE patient_code='DEMO-PT-003'), CURDATE(), '11:15:00', 3, 'Waiting', 'Consultation', 45, 'First oncology consultation.'),
  ('DEMO-APT-004', (SELECT id FROM patients WHERE patient_code='DEMO-PT-005'), CURDATE(), '14:30:00', 4, 'Confirmed', 'New Patient', 45, 'Bring pathology documents.'),
  ('DEMO-APT-005', (SELECT id FROM patients WHERE patient_code='DEMO-PT-004'), DATE_ADD(CURDATE(), INTERVAL 1 DAY), '10:30:00', 1, 'Confirmed', 'Follow-up', 30, 'Review PET-CT findings.')
ON DUPLICATE KEY UPDATE appointment_date=VALUES(appointment_date), appointment_time=VALUES(appointment_time), serial_no=VALUES(serial_no), status=VALUES(status), appointment_type=VALUES(appointment_type), notes=VALUES(notes);

INSERT INTO prescriptions
  (prescription_code, patient_id, doctor_id, prescription_date, chief_complaint, history, examination, diagnosis, treatment_plan, advice, investigation, follow_up_date, special_notes, status)
VALUES
  ('DEMO-RX-001', (SELECT id FROM patients WHERE patient_code='DEMO-PT-001'), (SELECT id FROM doctors WHERE email='demo.oncologist@example.test'), CURDATE(), 'Fatigue and nausea after chemotherapy', 'Breast carcinoma, receiving adjuvant chemotherapy', 'Vitals stable; mild dehydration', 'Breast carcinoma - post chemotherapy review', 'Supportive care and continue planned cycle', 'Maintain hydration and take medicines as directed.', 'CBC\nSerum creatinine\nLiver function test', DATE_ADD(CURDATE(), INTERVAL 14 DAY), 'Demo prescription for UI testing.', 'Final'),
  ('DEMO-RX-002', (SELECT id FROM patients WHERE patient_code='DEMO-PT-002'), (SELECT id FROM doctors WHERE email='demo.oncologist@example.test'), DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'Reduced appetite and weight loss', 'Known lung carcinoma', 'ECOG performance status 1', 'Non-small cell lung carcinoma', 'Continue oral therapy; nutritional support', 'Small frequent meals and adequate fluids.', 'CBC\nChest CT', DATE_ADD(CURDATE(), INTERVAL 21 DAY), '', 'Final'),
  ('DEMO-RX-003', (SELECT id FROM patients WHERE patient_code='DEMO-PT-003'), (SELECT id FROM doctors WHERE email='demo.oncologist@example.test'), DATE_SUB(CURDATE(), INTERVAL 5 DAY), 'Abdominal discomfort', 'Ovarian mass under evaluation', 'Mild lower abdominal tenderness', 'Ovarian neoplasm - evaluation ongoing', 'Complete staging investigations', 'Return early if pain worsens.', 'CA-125\nCT abdomen and pelvis', DATE_ADD(CURDATE(), INTERVAL 7 DAY), 'Awaiting pathology.', 'Draft')
ON DUPLICATE KEY UPDATE prescription_date=VALUES(prescription_date), diagnosis=VALUES(diagnosis), treatment_plan=VALUES(treatment_plan), advice=VALUES(advice), investigation=VALUES(investigation), follow_up_date=VALUES(follow_up_date), status=VALUES(status);

UPDATE prescriptions SET follow_up_interval='2 weeks', follow_up_note='Bring CBC and liver function reports.' WHERE prescription_code='DEMO-RX-001';
UPDATE prescriptions SET follow_up_interval='3 weeks', follow_up_note='Bring the latest chest CT.' WHERE prescription_code='DEMO-RX-002';
UPDATE prescriptions SET follow_up_interval='1 week', follow_up_note='Review pathology and staging results.' WHERE prescription_code='DEMO-RX-003';

DELETE pm FROM prescription_medicines pm JOIN prescriptions p ON p.id=pm.prescription_id
WHERE p.prescription_code IN ('DEMO-RX-001','DEMO-RX-002','DEMO-RX-003');

INSERT INTO prescription_medicines
  (prescription_id, medicine_name, generic_name, dosage, meal_timing, duration, instructions, sort_order)
VALUES
  ((SELECT id FROM prescriptions WHERE prescription_code='DEMO-RX-001'), 'Ondansetron 8 mg', 'Ondansetron', '1 tablet twice daily', 'Before meal', '3 days', 'For nausea', 0),
  ((SELECT id FROM prescriptions WHERE prescription_code='DEMO-RX-001'), 'Omeprazole 20 mg', 'Omeprazole', '1 capsule daily', 'Before breakfast', '14 days', '', 1),
  ((SELECT id FROM prescriptions WHERE prescription_code='DEMO-RX-002'), 'Megestrol 160 mg', 'Megestrol acetate', '1 tablet daily', 'After meal', '30 days', 'For appetite support', 0),
  ((SELECT id FROM prescriptions WHERE prescription_code='DEMO-RX-003'), 'Paracetamol 500 mg', 'Paracetamol', '1 tablet as needed', 'After meal', '5 days', 'Maximum 3 tablets daily', 0);

INSERT INTO invoices
  (invoice_code, patient_id, invoice_date, amount, discount, paid, due, payment_method, status, service_type, notes)
VALUES
  ('DEMO-INV-001', (SELECT id FROM patients WHERE patient_code='DEMO-PT-001'), CURDATE(), 3500, 500, 3000, 0, 'Card', 'Paid', 'Chemotherapy Review', 'Demo paid invoice.'),
  ('DEMO-INV-002', (SELECT id FROM patients WHERE patient_code='DEMO-PT-002'), DATE_SUB(CURDATE(), INTERVAL 2 DAY), 5000, 0, 3000, 2000, 'Cash', 'Partial', 'Consultation', 'Balance due at next visit.'),
  ('DEMO-INV-003', (SELECT id FROM patients WHERE patient_code='DEMO-PT-003'), DATE_SUB(CURDATE(), INTERVAL 5 DAY), 2200, 200, 0, 2000, 'Cash', 'Unpaid', 'Diagnostic Review', 'Demo unpaid invoice.')
ON DUPLICATE KEY UPDATE invoice_date=VALUES(invoice_date), amount=VALUES(amount), discount=VALUES(discount), paid=VALUES(paid), due=VALUES(due), payment_method=VALUES(payment_method), status=VALUES(status), service_type=VALUES(service_type);

INSERT INTO prescription_templates (name, description, specialty, is_default, used_count)
SELECT 'Demo Oncology Follow-up', 'Standard oncology follow-up with treatment response and toxicity review.', 'Oncology', 1, 12
WHERE NOT EXISTS (SELECT 1 FROM prescription_templates WHERE name='Demo Oncology Follow-up');

INSERT INTO template_sections (template_id, section_name, sort_order)
SELECT t.id, s.section_name, s.sort_order
FROM prescription_templates t
JOIN (
  SELECT 'Chief Complaint' section_name, 0 sort_order UNION ALL SELECT 'History', 1 UNION ALL
  SELECT 'On Examination', 2 UNION ALL SELECT 'Diagnosis', 3 UNION ALL SELECT 'Treatment Plan', 4 UNION ALL
  SELECT 'Rx / Medicines', 5 UNION ALL SELECT 'Advice', 6 UNION ALL SELECT 'Investigation', 7 UNION ALL
  SELECT 'Follow Up', 8 UNION ALL SELECT 'Special Notes', 9
) s
WHERE t.name='Demo Oncology Follow-up'
  AND NOT EXISTS (SELECT 1 FROM template_sections ts WHERE ts.template_id=t.id AND ts.section_name=s.section_name);

INSERT INTO research_projects (title, description, current_step, status, metadata)
SELECT 'Demo: Breast Cancer Follow-up Outcomes', 'Sample research workflow for testing project tracking and analytics.', 2, 'In Progress', '{"cohortSize":48,"site":"Demo Clinic"}'
WHERE NOT EXISTS (SELECT 1 FROM research_projects WHERE title='Demo: Breast Cancer Follow-up Outcomes');

COMMIT;
