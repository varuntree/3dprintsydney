# Features and Modules Documentation

## Overview

This document provides a comprehensive guide to all user-facing features and functional modules available in the 3D Print Sydney platform, organized by user persona (Admin and Client).

---

## Table of Contents

1. [Admin Portal Features](#admin-portal-features)
2. [Client Portal Features](#client-portal-features)
3. [Shared Features](#shared-features)
4. [Feature Access Matrix](#feature-access-matrix)
5. [Pricing and Calculation Engine](#pricing-and-calculation-engine)
6. [Automated Workflows](#automated-workflows)

---

## Admin Portal Features

### Dashboard

The Admin Dashboard provides a real-time overview of business operations and key performance indicators.

**Key Metrics and KPIs:**
- 30-day revenue (current and previous period for trend comparison)
- Outstanding balance across all clients
- Pending quotes awaiting client response
- Jobs queued and actively printing
- Visual revenue trend graph showing monthly progression

**Recent Activity Feed:**
- Chronological log of all system actions (invoices, quotes, jobs, clients)
- Activity context linking (invoice numbers, quote references, job titles, client names)
- Expandable activity history with pagination support
- Real-time updates as operations occur

**Quick Actions:**
- Quick navigation to create new invoices, quotes, or jobs
- Fast access to pending tasks and overdue invoices
- Direct links to key management areas

**Analytics and Reporting Overview:**
- Quote status distribution (DRAFT, PENDING, ACCEPTED, DECLINED, CONVERTED)
- Job summary by printer (queued, active jobs per printer)
- Outstanding invoices list with due dates and balances
- Monthly revenue trends visualization

---

### Client Management

Comprehensive client database and relationship management tools.

**Client Creation and Editing:**
- Full client profile creation with business details
- Company name and ABN tracking
- Contact information (email, phone, address)
- Edit existing client records with update history
- Bulk client operations support

**Client Profile Management:**
- Client name and company association
- ABN/Tax identification number storage
- Primary contact email and phone
- Physical address storage (stored as structured JSON)
- Notes field for internal documentation

**Payment Terms Configuration:**
- Default payment terms per client
- COD, 7 days, 14 days, 30 days standard options
- Custom payment term support through settings

**Client Notes and Tags:**
- Rich text notes field for internal communications
- Tagging system for client categorization
- Tags include custom labels for organization and filtering
- Note history preserved with timestamps

**Client Notification Preferences:**
- Toggle job status notifications per client
- Automatic email notifications when job status changes
- Granular control over communication preferences

---

### Quote Management

End-to-end quote creation, modification, and conversion workflow.

**Quote Creation:**
- Manual line item entry with flexible item configuration
- Quick template-based creation using product templates
- Support for both fixed and calculated pricing
- Batch line item creation interface

**Line Item Configuration:**
- Item name and description
- Quantity and unit specification
- Unit price configuration
- Discount types: NONE, PERCENT, FIXED
- Optional discount values
- Calculator breakdown tracking for pricing transparency
- Product template linkage for reusable items

**Quote Editing and Duplication:**
- Full quote editing capabilities
- Quote cloning to create similar quotes quickly
- Modify quote lines, dates, terms, and pricing
- Preserve quotation history

**Quote Sending and Tracking:**
- Send quote to client via email
- Track sent date and client engagement
- Quote status notifications

**Quote Status Management:**
- DRAFT: Initial state, not yet sent to client
- PENDING: Sent to client awaiting response
- ACCEPTED: Client approved, ready for conversion
- DECLINED: Client rejected quote
- CONVERTED: Successfully converted to invoice

**Quote-to-Invoice Conversion:**
- One-click conversion from quote to invoice
- Preserve all quote details in invoice
- Automatic status transition to CONVERTED
- Create corresponding invoice with linked reference
- Maintain audit trail of conversion

**Additional Quote Features:**
- Quote expiry date tracking
- Issue date management
- Tax rate configuration
- Shipping cost and label
- Terms and conditions text
- Custom notes per quote
- PDF generation and download

---

### Invoice Management

Comprehensive invoice creation, tracking, and payment management system.

**Invoice Creation:**
- Create from scratch with manual line items
- Convert directly from quotes
- Import product templates for quick setup
- Bulk invoice creation support

**Invoice Editing and Customization:**
- Full invoice line item editing
- Modify dates, terms, and payment conditions
- Update client assignment
- Adjust pricing and discounts
- Add/remove attachments

**Line Item Management:**
- Item name, description, quantity, unit price
- Discount types per line (NONE, PERCENT, FIXED)
- Unit specification (box, unit, kg, etc.)
- Product template linkage
- Order index for line sequencing
- Calculator breakdown preservation

**Payment Recording:**
- Record multiple payments per invoice
- Payment methods: STRIPE, BANK_TRANSFER, CASH, OTHER
- Payment reference and processor tracking
- Payment timestamp recording
- Stripe transaction ID linkage
- Payment notes for internal tracking
- Automatic balance recalculation

**Invoice Status Tracking:**
- PENDING: Awaiting payment
- PAID: Fully paid with zero balance
- OVERDUE: Past due date and unpaid
- Status transitions trigger activity logs
- Manual status management capabilities

**Invoice Actions:**

*Mark Paid:*
- Manually mark invoice as paid
- Record payment date
- Clear outstanding balance
- Trigger job completion if configured

*Void Invoice:*
- Cancel invoice with void reason documentation
- Preserve void date and reason in audit trail
- Prevent further transactions on voided invoice

*Write-off:*
- Write off outstanding balance
- Track write-off reason
- Record write-off date
- Update client reporting

*Revert Status:*
- Undo paid/overdue status changes
- Return to previous state
- Maintain complete audit history

**Attachment Management:**
- Upload documents and files to invoices
- Support for multiple attachment formats (PDF, images, documents)
- Attachment metadata tracking (filename, size, type)
- Download and manage attachments
- Delete obsolete attachments

**PDF Generation and Download:**
- Professional PDF invoice generation
- Formatted with business details and branding
- Line item breakdown with calculations
- Payment terms and shipping information
- Terms and conditions display
- Client signature lines

**Document References:**
- Invoice numbering with auto-generated sequence
- Unique invoice numbers with configurable prefix
- PO number tracking for client reference
- Quote linkage for conversion traceability

---

### Job Management

Complete print job lifecycle management from creation to completion.

**Job Board/Queue View:**
- Kanban-style board organized by printer and status
- Real-time job queue visualization
- Job status columns: QUEUED, PRE_PROCESSING, IN_QUEUE, PRINTING, PAUSED
- Drag-and-drop job reordering
- Filter jobs by printer and status
- Quick job details accessible from board

**Job Creation:**
- Manual job creation with full details
- Automatic job creation triggered by invoice/payment
- Job title and description
- Client and invoice association
- Optional file attachments

**Job Assignment to Printers:**
- Assign jobs to available printers
- Assignment rules based on printer status
- Prevent assignment to offline/maintenance printers (configurable)
- Re-assign jobs as needed
- Clear queue functionality for printer maintenance

**Job Status Tracking:**
- QUEUED: Waiting in queue
- PRE_PROCESSING: Being prepared for printing
- IN_QUEUE: In active printer queue
- PRINTING: Currently printing
- PAUSED: Printing paused
- PRINTING_COMPLETE: Print finished
- POST_PROCESSING: Post-print work
- PACKAGING: Packaging for shipment
- OUT_FOR_DELIVERY: With courier
- COMPLETED: Delivered to client
- CANCELLED: Job cancelled

**Job Priority Management:**
- NORMAL: Standard priority
- FAST_TRACK: Expedited processing
- URGENT: Highest priority
- Queue position affected by priority levels

**Queue Position Reordering:**
- Drag-and-drop queue reordering
- Bulk reorder jobs between printers
- Reorder entry format: job ID, new position, target printer
- Atomic reorder operation

**Job Archival:**
- Archive completed jobs automatically
- Manual archival with reason documentation
- Archive date tracking
- Completed_by field for operator tracking
- Configurable auto-archive delay (default 7 days)

**Job Details and Tracking:**
- Job title and description
- Estimated hours for planning
- Actual hours tracking
- Start time, pause time, completion time
- Last run started timestamp
- Internal notes field
- Client association for communication

---

### Printer Management

Inventory and status management for 3D printers.

**Printer Configuration:**
- Printer name and model tracking
- Build volume specifications
- Status assignment
- Internal notes and specifications
- Created and updated timestamps

**Printer Status:**
- ACTIVE: Ready for job assignment
- MAINTENANCE: Temporarily unavailable
- OFFLINE: Not available for assignment
- Status transitions logged to activity
- Prevention rules based on status (configurable)

**Printer Assignment Rules:**
- Prevent job assignment to OFFLINE printers
- Prevent job assignment to MAINTENANCE printers
- Override capability for special cases
- Configurable prevention rules

**Maintenance Tracking:**
- Last maintenance date recording
- Maintenance notes documentation
- Maintenance history preservation
- Status change tracking with reason

**Printer Queue Management:**
- View jobs queued for specific printer
- See active job metrics per printer
- Monitor job count and time estimates
- Clear entire printer queue when needed

---

### Material Management

Complete material catalog for 3D printing operations.

**Material Catalog:**
- Comprehensive material inventory
- Material name and description
- Color tracking and categorization
- Category organization (e.g., PLA, PETG, Resin)
- Cost per gram pricing for accurate calculations

**Material Pricing:**
- Cost per gram configuration
- Used in quick order pricing calculations
- Supports material-specific pricing
- Updated pricing for inventory changes

**Material Categories and Colors:**
- Organize materials by type (category field)
- Track available colors
- Support multiple colors per material type
- Filter materials by category in quote/job creation
- Search functionality for quick lookup

---

### Product Templates

Service and product catalog for reusable pricing.

**Service/Product Catalog:**
- Create reusable service offerings
- Product template library
- Template name, description, and unit type
- Template usage tracking

**Template Creation:**
- Add new products/services to system
- Set template name and description
- Define unit of measurement (unit, box, kg, hour, etc.)
- Link optional material for calculated pricing
- Configure pricing type

**Pricing Configuration:**

*FIXED Pricing:*
- Set fixed base price
- Price remains constant regardless of parameters
- Ideal for standard services

*CALCULATED Pricing:*
- Dynamic pricing based on parameters
- Material gram weight calculation
- Hourly rate multiplier
- Quality multiplier adjustments
- Infill multiplier adjustments
- Setup fee inclusion
- Minimum price enforcement

**Template Usage in Quotes/Invoices:**
- Quick selection in line item creation
- Auto-populate name, description, unit, pricing
- Override pricing if needed
- Maintain link to original template

---

### Reporting & Exports

Data export and business intelligence tools.

**Available Reports:**

*Invoices CSV:*
- All invoices within selected date range
- Invoice number, client, total, status
- Issue date and due date
- Balance due information
- CSV format for spreadsheet analysis

*Payments CSV:*
- Payment records for analysis
- Payment date, method, amount
- Invoice linkage
- Processor and reference information

*Jobs CSV:*
- Job creation and completion data
- Job title, status, printer assignment
- Estimated and actual hours
- Priority and completion dates

*AR Aging CSV:*
- Outstanding invoices analysis
- Aging bucket categorization
- Client and invoice details
- Balance due by aging period

*Material Usage CSV:*
- Material consumption tracking
- Sum of invoice items by material
- Quantity and cost analysis
- Usage trends

*Printer Utilization CSV:*
- Printer performance metrics
- Completed jobs per printer
- Hours worked per printer
- Utilization efficiency

**CSV Export Functionality:**
- Date range filtering (Today, 7 days, 30 days, Year, custom)
- Calendar-based date range selection
- Automatic file naming with date stamp
- Download directly to local system
- Real-time generation

**Report Types and Data Included:**
- Financial reports (AR aging, payments)
- Operational reports (jobs, utilization)
- Inventory reports (material usage)
- All reports include full audit trail
- Exported data preserves precision decimals

---

### System Settings

Global configuration and business setup.

**Global Configuration:**
- Single settings record per business
- Centralized configuration management
- All settings accessible to ADMIN role

**Business Settings:**
- Business name (legal entity)
- Business email address
- Business phone number
- Physical address
- ABN/Tax identification number
- Tax rate percentage (0-100%)
- Default currency (e.g., AUD)

**Document Numbering Preferences:**
- Quote prefix customization (default: QT-)
- Invoice prefix customization (default: INV-)
- Auto-incrementing sequence per document type
- Unique number generation per document

**Job Creation Policies:**
- ON_PAYMENT: Create job when payment received
- ON_INVOICE: Create job when invoice issued
- System-wide policy selection
- Automation trigger configuration

**Shipping Regions Configuration:**
- Multiple shipping regions supported
- Default 3 regions: Sydney Metro, Regional, Remote
- Each region includes:
  - Code identifier
  - Display label
  - Applicable states
  - Base shipping amount
  - Optional remote surcharge
  - Optional postcode prefixes for targeting
- Add/edit/delete custom regions

**Payment Terms Configuration:**
- Multiple payment term options
- Default payment terms: COD (0 days), 7 days, 14 days, 30 days
- Custom payment terms support
- Each term includes code, label, and day count
- Default selection for all invoices

**Calculator Configuration:**
- Hourly labor rate
- Setup fee per job
- Minimum price floor
- Quality multipliers (e.g., standard: 1, high: 1.5)
- Infill multipliers (e.g., medium: 1, dense: 1.3)
- Used in CALCULATED pricing templates

**Email Settings:**
- Enable/disable email sending
- Business email configuration
- Email notification triggers

**Operational Automation Toggles:**
- Auto-detach job on completion
- Auto-archive completed jobs after X days
- Prevent assign to offline printers
- Prevent assign to maintenance printers
- Max active printing per printer (default: 1)
- Overdue notification days
- Reminder cadence in days (default: 7)

---

### User Management

Admin user creation and management.

**User Creation:**
- Create new admin users
- Assign user email address
- Set initial password
- Activate/deactivate users

**User Editing:**
- Modify user details
- Reset passwords
- Update user permissions
- Deactivate accounts

**User Role Assignment:**
- ADMIN: Full system access
- CLIENT: Limited portal access
- Role-based access control

---

### Messages/Communication

System-wide messaging between admin and clients.

**Admin-Client Messaging:**
- Send messages within invoices
- Send messages within quotes
- Send direct admin-client messages
- Message notifications
- Full message history preservation
- Timestamp tracking on all messages

---

## Client Portal Features

### Dashboard

Client-specific overview of their account status.

**Invoice Overview:**
- List of all issued invoices
- Status indicators (PENDING, PAID, OVERDUE)
- Total amount and balance due visibility
- Issue date display
- Quick links to invoice details

**Job Status Visibility:**
- View jobs associated with client's invoices
- Real-time job status updates
- Job progress tracking
- Estimated completion information

**Recent Activity:**
- Client-specific activity feed
- Invoice updates and changes
- Job status transitions
- Quote responses and conversions
- Payment confirmations

---

### Invoice Viewing

Client-focused invoice management and payment.

**List of Own Invoices:**
- Paginated invoice list
- Filter by status
- Sort by date or amount
- Search functionality
- Load more pagination (20 per page)

**Invoice Detail View:**
- Complete invoice information
- Line item breakdown with descriptions
- Subtotal, tax, shipping calculation
- Total amount and balance due
- Payment history
- Issue date and due date
- Payment terms display
- Company terms and conditions

**Payment History:**
- Record of all payments received
- Payment date and method
- Payment amount
- Running balance calculation
- Transaction reference numbers

**PDF Download:**
- Professional PDF invoice generation
- Downloadable for records and accounting
- Maintains branding and format
- Print-friendly layout

**Online Payment via Stripe:**
- Secure Stripe payment integration
- Pay invoice directly online
- Multiple payment methods supported
- Real-time balance update
- Payment confirmation email

---

### Job Tracking

Visibility into print job progress.

**View Assigned Jobs:**
- Jobs associated with client's invoices
- Complete job list view
- Expandable job details

**Job Status Updates:**
- Real-time status tracking
- View current job status
- Status transition history
- Timeline of job progress

**Job Notifications:**
- Optional email notifications for status changes
- Configurable per client preference
- Automatic updates when jobs progress

---

### Quick Order (Self-Service)

Revolutionary self-service 3D printing order system.

**3D Model Upload:**
- Support for STL and 3MF file formats
- Single and batch file upload
- Drag-and-drop upload interface
- File browser selection
- Real-time upload progress
- Multiple file handling

**File Orientation:**
- 3D model viewer with interactive controls
- Rotate model using rotation controls
- Set optimal print orientation
- Lock orientation after final positioning
- Three.js-based 3D rendering
- Support for multiple file orientation
- Sequential file orientation workflow
- Skip orientation option available

**Print Configuration:**
- Material selection from available catalog
- Layer height adjustment (e.g., 0.2mm increments)
- Infill percentage (0-100%)
- Quantity specification
- Support generation toggle
- Support pattern selection (Standard, Organic/Tree)
- Support angle threshold configuration
- Advanced per-file settings

**File Preparation:**
- Slicing preparation with slicer integration
- Automatic metric calculation (grams, time)
- Fallback metric estimation when precise calculation unavailable
- Grams weight calculation
- Estimated print time in minutes
- File validation and error reporting
- Batch file preparation

**Instant Pricing:**
- Real-time price calculation
- Item-based pricing aggregation
- Subtotal calculation
- Shipping cost calculation by region
- Tax application if configured
- Total price display
- Pricing updates with setting changes

**Shipping Calculation:**
- Region-based shipping costs
- State and postcode analysis
- Remote surcharge application
- Shipping quote display with region details
- Regional cost comparison

**Checkout and Payment:**
- Complete order summary display
- Delivery address collection
- Name, phone, address fields
- City, state, postcode
- Stripe checkout integration
- Real-time payment processing
- Order confirmation
- Invoice generation on purchase

**Automatic Invoice and Job Creation:**
- Invoice creation on payment completion
- Job creation based on policy (ON_PAYMENT or ON_INVOICE)
- Client linkage for order tracking
- Full audit trail of order creation

---

## Shared Features

### 3D Visualization

Interactive 3D model viewing and manipulation.

**STL File Viewer:**
- Display 3D STL models
- Support for large file sizes
- Efficient rendering

**Three.js-Based 3D Preview:**
- WebGL 3D rendering
- Browser-based, no plugins required
- Smooth performance
- Cross-browser compatibility

**Model Rotation and Zoom Controls:**
- Click and drag rotation on all axes
- Scroll wheel zoom in/out
- Reset to default orientation
- Center model in view
- Specific rotation controls (X, Y, Z axis)
- Degree-based rotation increments
- Model auto-centering

**Used In:**
- Quick order file orientation step
- Invoice/quote file preview (where applicable)
- Job file visualization
- Material understanding before printing

---

### Messaging/Communication

Asynchronous communication system between admin and clients.

**User Messages System:**
- Store and retrieve messages
- Message threading
- Associated with invoices or quotes
- Direct admin-client communication

**Admin-Client Communication:**
- Create messages within document context
- Client notification of new messages
- Full message history
- Preserve all communication

**Message Notifications:**
- Email notifications for new messages
- Optional per user preference
- Real-time in-app notification
- Unread message indicators

---

### Authentication

Secure access control and session management.

**Login/Logout:**
- Email and password authentication
- Secure session management
- Role-based portal routing
- Remember me functionality (optional)

**Password Reset:**
- Email-based password recovery
- Forgot password workflow
- Secure reset token generation
- New password confirmation
- Reset email delivery

**Session Management:**
- Server-side session tracking
- Secure cookie handling
- Session timeout configuration
- Activity tracking
- Multiple concurrent session support
- Clear session on logout

---

## Feature Access Matrix

| Feature | Admin | Client | Notes |
|---------|-------|--------|-------|
| Dashboard | Full | Limited | Admin sees metrics; Client sees invoices |
| Client Management | Full | None | Create/edit clients ADMIN only |
| Quote Creation | Full | None | Quotes ADMIN-created only |
| Quote Viewing | Full | Assigned | Clients see quotes sent to them |
| Invoice Creation | Full | None | ADMIN-created only |
| Invoice Viewing | Full | Own | Clients see their invoices |
| Invoice Editing | Full | None | ADMIN only |
| Payment Recording | Full | Via Stripe | Clients pay via online portal |
| Job Creation | Full | None | Auto or manual ADMIN |
| Job Viewing | Full | Associated | Clients see jobs from their invoices |
| Job Management | Full | None | ADMIN controls status/assignment |
| Printer Management | Full | None | ADMIN only |
| Material Management | Full | Read-only | Clients see available materials in quick order |
| Product Templates | Full | View | Used by ADMIN, visible to clients |
| Quick Order | None | Full | CLIENT-exclusive feature |
| File Upload (STL/3MF) | None | Full | Via quick order |
| Reports & Exports | Full | None | ADMIN only |
| System Settings | Full | None | ADMIN only |
| User Management | Full | None | ADMIN only |
| Messages | Full | Full | Bidirectional communication |
| 3D Viewer | Full | Full | Used in quick order and previews |

---

## Pricing and Calculation Engine

### Line Item Calculation

**Formula:**
```
Line Total = (Quantity × Unit Price) - Discount

Where:
- Discount = 
    PERCENT: (Unit Price × Quantity × Discount Value%) 
    FIXED: Discount Value
    NONE: 0
```

**Example:**
- Quantity: 2
- Unit Price: $100
- Discount Type: PERCENT
- Discount Value: 10%
- Line Total: (2 × 100) - (100 × 2 × 10%) = $200 - $20 = $180

### Document Totals Calculation

**Formula:**
```
Subtotal = Sum of all line totals

Document Discount = 
  PERCENT: (Subtotal × Discount Value%)
  FIXED: Discount Value
  NONE: 0

Subtotal After Discount = Subtotal - Document Discount

Tax = (Subtotal After Discount × Tax Rate%) OR 0 if tax_rate is null

Shipping = Shipping Cost (from settings/region) OR 0 if not applicable

Total = Subtotal After Discount + Tax + Shipping
```

### Discount Types

- **NONE**: No discount applied
- **PERCENT**: Discount as percentage of line/document total
- **FIXED**: Discount as fixed dollar amount

### Tax Calculation

- Tax applied to subtotal after document-level discount
- Tax rate stored as percentage (0-100)
- Configurable per invoice or use settings default
- Can be null for tax-exempt invoices

### Quick Order Pricing Algorithm

**For Each File:**

1. **Base Calculation:**
   - Hours: Estimated print time from slicer (in seconds, converted to hours)
   - Grams: Estimated material weight
   - Material Cost: grams × material.costPerGram

2. **Quality and Infill Adjustments:**
   - Quality Multiplier: from calculator config (default: standard = 1)
   - Infill Multiplier: from calculator config (default: medium = 1)
   - Adjusted Hours: hours × qualityMultiplier × infillMultiplier

3. **Item Price (if using calculator):**
   ```
   Item Price = (Adjusted Hours × hourlyRate + setupFee + Material Cost) × Quantity
   Item Price = max(Item Price, minimumPrice)
   ```

4. **Subtotal Aggregation:**
   - Sum all item prices for all uploaded files
   - Apply any document-level discount if present

5. **Shipping Calculation:**
   - Match state/postcode to shipping region
   - Apply base amount
   - Add remote surcharge if postcode matches remote prefix
   - Shipping = baseAmount + (remoteSurcharge if applicable)

6. **Final Total:**
   ```
   Total = Subtotal + Shipping + (Subtotal × TaxRate% if applicable)
   ```

### Shipping Cost Calculation by Region

**Steps:**
1. Identify client state and postcode
2. Match to shipping region by state membership
3. Apply base amount for matched region
4. If region has remoteSurcharge and postcode prefix matches, add surcharge
5. Return final shipping cost with region label

---

## Automated Workflows

### Quote-to-Invoice Conversion

**Trigger:** Admin selects "Convert to Invoice" on quote detail

**Process:**
1. Load complete quote details and line items
2. Create new invoice with same:
   - Client ID
   - Line items (exact copy)
   - Tax rate
   - Discount structure
   - Shipping cost
   - Terms and conditions
   - Notes
3. Set invoice status to PENDING
4. Set quote status to CONVERTED
5. Link quote and invoice (bidirectional reference)
6. Generate unique invoice number
7. Create activity log entry
8. Redirect user to new invoice

**Result:** Professional invoice created with full quote history preserved

### Payment-Triggered Job Creation

**Trigger:** Payment recorded on invoice and job creation policy = ON_PAYMENT

**Process:**
1. Payment recorded successfully
2. System detects policy setting ON_PAYMENT
3. Check if job already exists for this invoice
4. Create job with:
   - Title from invoice or line item summary
   - Status: PRE_PROCESSING
   - Client ID from invoice
   - Invoice ID
   - Priority: NORMAL (default)
5. Auto-assign to available printer if configured
6. Log job creation activity
7. Notify client if notification preference enabled

**Result:** Job automatically queued for production immediately after payment

### Invoice-Triggered Job Creation

**Trigger:** Invoice created and job creation policy = ON_INVOICE

**Process:**
1. Invoice saved successfully
2. System detects policy setting ON_INVOICE
3. For each significant line item or for entire invoice:
   - Create job record
   - Set status: PRE_PROCESSING
   - Attach invoice reference
4. Assign to printer if available
5. Log creation activity

**Result:** Jobs pre-created when invoice issued, ready for manual refinement

### Job Auto-Archival

**Trigger:** Daily maintenance task or manual trigger

**Process:**
1. Find all COMPLETED or CANCELLED jobs
2. Check completion date vs. auto_archive_completed_jobs_after_days setting
3. For jobs older than threshold:
   - Set archived_at timestamp
   - Set archived_reason: "Auto-archived after X days"
   - Remove from active queue
   - Preserve all job data
4. Update job status and indexes

**Result:** Historical jobs automatically removed from active view after configured period (default 7 days)

### Document Number Auto-Generation

**Trigger:** Invoice or Quote created

**Process:**
1. Determine document type (quote or invoice)
2. Load number_sequences record for type
3. Increment current number
4. Construct document number: prefix + incremented number
   - Example: QT-00001, INV-00042
5. Save updated sequence
6. Assign to document record
7. Ensure uniqueness constraint validation

**Result:** Unique, predictable document numbers with zero manual entry

### Balance Recalculation

**Trigger:** Payment recorded, invoice status changes, or discount modified

**Process:**
1. Recalculate invoice total:
   - Sum line items after discounts
   - Add tax and shipping
2. Load all payments for invoice
3. Sum total payments received
4. Calculate balance_due = total - payments_sum
5. If balance_due <= 0, mark as PAID
6. If balance_due < 0, flag for credit memo
7. Update invoice record
8. Log balance change
9. Trigger overdue recalculation if applicable

**Result:** Accurate balance tracking and invoice status maintenance

### Activity Logging

**Triggered By:**
- Document creation (quotes, invoices)
- Status transitions (quote accepted, invoice paid)
- Amount changes (payment recorded)
- Client actions
- Printer status changes
- Job transitions

**Captured:**
- Action type (CREATE, UPDATE, STATUS_CHANGE, etc.)
- Timestamp (created_at)
- Related entities (quote, invoice, job, client, printer)
- Detailed message
- User context (if available)
- Metadata (JSON field for additional context)

**Result:** Complete audit trail for compliance and troubleshooting

---

## Technical Architecture Notes

### Database Schema
- Supabase PostgreSQL backend
- Normalized schema with relational integrity
- Row-level security policies for multi-role access
- JSON fields for flexible configuration (calculator_config, address, etc.)
- Comprehensive indexing for query performance

### API Integration Points
- RESTful API for all CRUD operations
- Real-time database subscriptions for live updates
- Webhook support for payment processing (Stripe)
- File storage integration (Supabase Storage)
- 3D file processing (slicer integration)

### Frontend Framework
- Next.js React application
- Server-side rendering for performance
- Client-side state management for real-time features
- Server actions for secure backend calls
- TypeScript for type safety

### Authentication & Authorization
- Supabase Auth integration
- Role-based access control (ADMIN vs CLIENT)
- Session-based authentication
- Secure password reset flow
- Protected API routes

---

## Summary

The 3D Print Sydney platform provides a complete end-to-end solution for managing 3D printing operations, from client management and quoting through to production job management and payment tracking. The platform serves two distinct user personas:

- **Admins** have complete system access for business management, configuration, and operational oversight
- **Clients** have self-service capabilities for ordering, tracking, and payment, with the innovative Quick Order feature enabling seamless 3D printing on demand

All features are built on a robust, scalable architecture with comprehensive automation, audit trails, and calculations to support efficient business operations.
