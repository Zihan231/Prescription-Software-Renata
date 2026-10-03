Design a complete, modern, responsive web-based Prescription Management System for doctors, clinics, and small hospitals. Use the uploaded reference images as inspiration for the structure, workflow, settings, data tables, prescription layout, appointment calendar, and overall medical SaaS interface.

Project name: Oncology Prescription
Tagline: Smart Prescription & Patient Management
Keep the logo and brand name editable so they can be replaced later.

DESIGN STYLE

Create a clean, professional, trustworthy medical SaaS dashboard.

Visual direction:
- White and very light grey backgrounds
- Primary medical blue: #2563EB
- Secondary cyan blue: #0EA5E9
- Success green: #16A34A
- Warning orange: #F59E0B
- Error red: #EF4444
- Dark text: #111827
- Secondary text: #6B7280
- Border colour: #E5E7EB
- Soft blue selected-menu background
- Subtle shadows and thin borders
- Rounded corners between 8px and 14px
- Spacious but data-focused layout
- Avoid excessive gradients and decorative illustrations

Typography:
- Use Inter for English
- Use Noto Sans Bengali for Bangla content
- Support both English and Bangla prescriptions
- Clear heading, body, label, caption, and table-text hierarchy

Use:
- 8px spacing system
- Auto Layout throughout
- Responsive constraints
- Reusable components and variants
- Lucide or Material outline icons
- Accessible contrast and readable form labels

PRIMARY DESKTOP FRAME

Create the main version at 1440px desktop width.

Also create:
- Tablet version at 1024px
- Mobile-friendly patient and appointment views at 390px
- A4 print-ready prescription frame

GLOBAL APPLICATION LAYOUT

Top navigation bar:
- Hamburger menu
- RxCare logo
- Current clinic or chamber name
- Subscription or trial-status pill in the centre
- Upgrade button
- Notification icon
- Doctor profile avatar with dropdown

Collapsible left sidebar:
- Dashboard
- Appointments
- Patients
- Create Prescription
- Prescription History
- Templates
- Billing
- Reports
- Research Projects
- Tutorial
- Settings
- Logout

Add a floating “Support” button at the bottom-left corner.

CREATE THE FOLLOWING SCREENS

1. LOGIN AND ACCOUNT ACCESS

Create:
- Doctor login screen
- Email or mobile number input
- Password field
- Remember me
- Forgot password
- Sign-in button
- Create account option
- Clinic logo and medical illustration
- OTP verification screen
- Reset password screen

2. MAIN DASHBOARD

Create a dashboard containing:

Top summary cards:
- Total Patients
- Prescriptions Created
- Today’s Appointments
- Pending Appointments

Charts and analytics:
- Patient gender distribution donut chart
- Patient statistics line chart
- Monthly prescription report
- New versus returning patients
- Revenue or billing summary

Appointments section:
- Today’s appointment table
- Patient name
- Mobile number
- Age
- Gender
- Appointment time
- Serial number
- Status
- Action menu

Quick actions:
- Add Patient
- Create Prescription
- Book Appointment
- View Reports

Include realistic empty states for accounts that have no data.

3. PATIENT MANAGEMENT

Create a “My Patients” page with:

Header:
- Page title
- Total patient badge
- Search by patient name, mobile number, or patient ID
- Add New Patient button

Patient table columns:
- Patient ID
- Patient Name
- Mobile Number
- Age
- Gender
- Blood Group
- Last Visit
- Total Visits
- Action

Actions:
- View Profile
- Prescription History
- Prescribe Now
- Edit
- Archive

Use coloured pill buttons:
- Blue for prescription history
- Green for prescribe now

Add sorting, filters, pagination, empty state, loading state, and no-search-result state.

4. ADD OR EDIT PATIENT MODAL

Create a large modal with multiple tabs:

Tabs:
- Basic Information
- Additional Information
- Emergency Contact
- Medical History

Basic information fields:
- Patient name
- Mobile number
- Alternative mobile number
- Gender
- Date of birth
- Automatically calculated age
- Blood group
- Marital status
- Occupation
- National ID
- Address
- District
- Area

Medical history fields:
- Allergies
- Chronic diseases
- Previous surgeries
- Current medications
- Family history
- Pregnancy status
- Smoking status
- Special notes

Buttons:
- Cancel
- Save Patient
- Save and Create Prescription

Show required-field indicators, validation messages, dropdown states, and success confirmation.

5. PATIENT PROFILE

Create a detailed patient profile screen containing:

Patient summary card:
- Patient photo or initials
- Patient ID
- Name
- Mobile number
- Age
- Gender
- Blood group
- Address
- Last visit
- Total visits

Tabs:
- Overview
- Prescriptions
- Appointments
- Medical History
- Investigation Reports
- Billing

Add:
- Add appointment
- Create prescription
- Edit patient
- Download patient history

6. CREATE PRESCRIPTION SCREEN

Create the most important screen of the application.

Patient and doctor header:
- Clinic logo
- Doctor name
- Qualification
- Specialisation
- Registration number
- Chamber address
- Patient ID barcode
- Prescription ID barcode
- Patient name
- Age
- Gender
- Visit number
- Date

Main prescription workspace:
- A4-style prescription preview in the centre
- Left-side clinical shortcut buttons
- Right-side treatment shortcut buttons
- Sticky save and print actions

Left-side shortcut buttons:
- Chief Complaint
- History
- Negative History
- Gynae and Obstetric History
- On Examination
- Previous Examination
- Local Examination
- Diagnosis
- Treatment Plan
- Referred By
- Paediatric Calculator
- Breast Examination

Right-side shortcut buttons:
- Rx Items
- Advice
- Special Notes
- Investigation
- Follow Up
- Referred To

Use a two-column prescription layout separated by an optional vertical line.

Left prescription column:
- Chief complaints
- History of present illness
- Past medical history
- Drug history
- Allergy history
- On examination
- Vital signs
- Diagnosis

Right prescription column:
- Rx
- Medicine list
- Advice
- Investigations
- Follow-up
- Referral
- Special notes

Allow sections to be expanded, collapsed, reordered, enabled, or disabled.

7. MEDICINE ENTRY COMPONENT

Create a detailed medicine-entry card with:

Fields:
- Brand name
- Generic name
- Medicine form
- Strength
- Route
- Dosage
- Morning
- Noon
- Night
- Before or after meal
- Duration value
- Duration unit
- Quantity
- Special instruction

Features:
- Medicine autocomplete dropdown
- Recently used medicines
- Favourite medicines
- Saved medicine templates
- Add another medicine
- Duplicate medicine
- Delete medicine
- Drag to reorder

Support Bangla and English dosage instructions.

Example:
Tab. Paracetamol 500 mg
1 + 1 + 1, after meal, for 5 days

Use a clear Rx symbol and numbered medicine list.

8. CLINICAL DATA ENTRY MODALS

Create reusable modals or side drawers for:
- Chief Complaint
- History
- On Examination
- Diagnosis
- Advice
- Investigation
- Follow Up
- Referral
- Special Notes

Each should support:
- Searchable predefined items
- Recently used items
- Favourite items
- Free-text input
- Rich-text editor
- Add multiple items
- Reorder items
- Save as template

9. PRESCRIPTION PREVIEW AND PRINT

Create an A4 prescription preview with:

Header:
- Clinic logo
- Doctor details
- Patient ID and prescription ID barcodes

Patient information row:
- Name
- Age
- Gender
- Visit number
- Patient ID
- Date

Body:
- Two-column prescription layout
- Optional vertical divider
- English and Bangla text
- Clear section headings
- Medicine list
- Advice and follow-up details

Footer:
- Doctor signature
- Chamber address
- Contact number
- QR code
- Page number
- Disclaimer

Actions:
- Print
- Download PDF
- Share via WhatsApp
- Send by SMS
- Send by email
- Save as draft
- Finalise prescription

10. PRESCRIPTION HISTORY

Create a searchable prescription-history page.

Filters:
- Patient
- Date range
- Diagnosis
- Medicine
- Doctor
- Status

Table columns:
- Prescription ID
- Patient name
- Date
- Diagnosis
- Medicines
- Status
- Action

Actions:
- View
- Print
- Download
- Duplicate
- Edit
- Share

11. APPOINTMENT MANAGEMENT

Create an appointment management page inspired by the provided reference.

Left-side management panel:
- Appointment SMS toggle
- Pick a specific date
- Available-from date
- Available-until date
- Select off days
- Appointment duration
- Start time
- End time
- Maximum patients per day
- Save and Cancel buttons
- Share Appointment QR button

Right-side calendar:
- Monthly calendar
- Today button
- Previous and next month buttons
- Available dates
- Unavailable dates
- Selected date
- Holiday and off-day styles
- Appointment-count indicators

12. APPOINTMENT QR MODAL

Create a centred modal containing:
- Doctor photo
- Doctor name
- Qualification or speciality
- “Scan the QR to book an appointment”
- Large branded QR code
- Powered by RxCare
- Download button
- Share button
- Red circular close button

13. ALL APPOINTMENTS PAGE

Create:
- Search for patients
- Date filter
- Share Appointment QR
- Join Meeting
- View All Patients
- Add New Appointment
- Refresh button

Table columns:
- Patient name
- Mobile number
- Age
- Gender
- Status
- Serial number
- Patient ID
- Appointment time
- Action

Create status pills:
- Confirmed
- Waiting
- Completed
- Cancelled
- No Show

14. PRESCRIPTION TEMPLATES

Create a template-management page where doctors can:
- Create speciality-based templates
- Search templates
- Duplicate templates
- Edit templates
- Set a default template
- Archive templates

Template examples:
- General Physician
- Medicine
- Orthopaedic
- Paediatric
- Gynaecology
- Custom

15. SETTINGS MODAL

Design a large settings modal with a left navigation menu.

Settings menu:
- Page Settings
- Side Buttons Visibility Settings
- Print Settings
- Prescription Settings
- Billing Settings
- Prescription Order Settings

Use a white modal, dimmed background, red circular close button, Cancel button, and primary Save Changes button.

16. PAGE SETTINGS

Create sub-navigation:
- Header
- Body
- Signature
- Footer

Header settings:
- Show clinic logo
- Show doctor information
- Show patient barcode
- Show prescription barcode
- Show patient details
- Upload logo
- Clinic address
- Contact information

Body settings:
- Section title font size slider
- Section subtitle font size slider
- Content font size slider
- Vertical divider toggle
- Left-column width percentage
- Live prescription preview

Signature settings:
- Show signature
- Upload digital signature
- Signature alignment
- Signature size
- Signature label

Footer settings:
- Show footer
- Footer text
- Contact details
- Page number
- QR code
- Disclaimer

17. SIDE BUTTON VISIBILITY SETTINGS

Create:
- Preset cards for Default, Orthopaedic, Medicine, General Physician, and Custom
- Left-side button toggles
- Right-side button toggles
- Expandable button categories
- Live prescription-screen preview

Use active blue toggles and inactive grey toggles.

18. PRESCRIPTION ORDER SETTINGS

Create a drag-and-drop prescription order manager.

Display:
- Prescription preview header
- Left Column custom order
- Right Column custom order

Each item should include:
- Drag handle
- Order number
- Section title
- Enabled state

Allow users to drag items vertically and between the left and right columns.

19. PRINT SETTINGS

Include:
- Print body only
- Page size
- A4 and A5 options
- Portrait or landscape
- Top, bottom, left, and right margins
- Header spacing
- Footer spacing
- Print watermark
- Background graphics
- Number of prescription copies
- Live print preview

20. PRESCRIPTION SETTINGS

Include toggles for:
- Show generic name
- Show brand name
- Show medicine form
- Show strength
- Show duration
- Show meal instructions
- Show quantity
- Show advice
- Show follow-up date
- Show investigation
- Automatic serial numbering
- Automatic patient ID
- Automatic prescription ID
- Bangla instruction support

21. BILLING SETTINGS AND BILLING MANAGEMENT

Billing settings:
- Enable billing
- Consultation fee
- Follow-up fee
- Currency
- Tax percentage
- Discount option
- Payment method
- Invoice footer text

Billing management page:
- Total amount
- Total payments
- Outstanding amount
- Date filter
- Patient search
- Payment-status filter

Table:
- Invoice ID
- Patient
- Date
- Amount
- Discount
- Paid
- Due
- Payment method
- Status
- Action

Include empty-state design.

22. REPORTS

Create a reports dashboard containing:
- Total patients
- Total prescriptions
- Total appointments
- Revenue
- New patients
- Returning patients
- Common diagnoses
- Frequently prescribed medicines
- Gender distribution
- Age distribution
- Prescription volume chart

Filters:
- Today
- This week
- This month
- Custom date range

Actions:
- Export PDF
- Export Excel
- Print report

23. OPTIONAL RESEARCH PROJECT MODULE

Create a clinical research-project builder using a vertical multi-step wizard.

Steps:
- Project Name
- Event Schedule
- Investigator Roles
- Questionnaire
- Milestones
- Notifications
- Tasks
- Collaborators
- Dashboard

Project Name:
- Project title
- Description

Event Schedule:
- Event title
- Description
- Date and time
- Add multiple events

Investigator Roles:
- Role name
- Description
- Duration
- Provider
- Multiple investigator entries

Questionnaire:
- Questionnaire name
- Add questions
- Question type
- Required toggle

Milestones:
- Milestone name
- Description
- Start date
- End date
- Linked investigators
- Linked tasks
- Linked questionnaires

Notifications:
- Notification title
- Message
- Rich-text editor
- Recipient
- Schedule

Tasks:
- Task title
- Description
- Deadline
- Responsible collaborator

Collaborators:
- Owner
- Invited collaborators
- Email
- Role
- Permission

Dashboard configuration:
- Enable or disable dashboard widgets
- General project status
- Total milestones
- Total tasks
- Collaborators
- Notifications
- Reports

24. TUTORIAL PAGE

Create:
- Back to Dashboard link
- Tutorial video section
- Large video player
- Step-by-Step Guide card
- Quick Start card
- Best Practices card
- Blue call-to-action section
- Return to Dashboard button

COMPONENT LIBRARY

Create reusable components for:
- Primary, secondary, danger, success, and text buttons
- Icon buttons
- Input fields
- Search inputs
- Select dropdowns
- Date pickers
- Checkboxes
- Radio buttons
- Toggle switches
- Tabs
- Pills and status badges
- Cards
- Data tables
- Pagination
- Empty states
- Tooltips
- Toast notifications
- Confirmation dialogs
- Modals
- Side drawers
- Calendar cells
- Prescription sections
- Medicine rows
- Charts
- QR cards

Create component variants for:
- Default
- Hover
- Focused
- Filled
- Disabled
- Error
- Success
- Loading

PROTOTYPE FLOW

Connect the main prototype interactions:

Login → Dashboard

Dashboard → Add Patient → Save Patient → Create Prescription

Patients → Patient Profile → Prescribe Now

Create Prescription → Add Medicine → Add Advice → Preview → Finalise → Print

Dashboard → Appointment Management → Share QR → QR Modal

Settings → Page Settings → Change font size → Live preview → Save Changes

Settings → Prescription Order → Drag sections → Save Changes

Dashboard → Reports → Export Report

Dashboard → Research Projects → Create Project Wizard → Project Dashboard

UX REQUIREMENTS

- Keep important actions visible without unnecessary scrolling
- Use confirmation dialogs before deleting or finalising
- Show success toast after saving
- Clearly separate draft and final prescriptions
- Use sticky action bars in long forms
- Include helpful empty states and onboarding messages
- Make all tables sortable
- Add search and filters wherever necessary
- Ensure keyboard-friendly form navigation
- Make the interface suitable for doctors who may not be highly technical
- Maintain a professional, clean, efficient, and trustworthy healthcare appearance
- Do not create an overly colourful or playful interface
- Organise all screens, components, styles, and prototype flows neatly in the Figma file