# Application Features Documentation

This document provides a comprehensive overview of all features and capabilities available in the 3D Print Management System.

## Table of Contents

1. [Client Management System](#client-management-system)
2. [Quote Creation & Lifecycle Management](#quote-creation--lifecycle-management)
3. [Invoice Generation & Payment Processing](#invoice-generation--payment-processing)
4. [Job Queue & Production Management](#job-queue--production-management)
5. [Printer Fleet Management](#printer-fleet-management)
6. [Material & Product Catalog](#material--product-catalog)
7. [Dashboard & Analytics](#dashboard--analytics)
8. [Activity Logging & Audit Trails](#activity-logging--audit-trails)
9. [File Management & PDF Generation](#file-management--pdf-generation)
10. [Reports & Data Export](#reports--data-export)
11. [Settings & Configuration](#settings--configuration)

---

## Client Management System

### Overview
The client management system provides comprehensive customer relationship management capabilities specifically designed for 3D printing businesses.

### Core Features

#### Client Registration & Profile Management
- **Contact Information**: Store client name, company, email, phone, and ABN
- **Address Management**: Structured address storage with JSON format support
- **Custom Tags**: Flexible tagging system for client categorization
- **Payment Terms**: Client-specific payment terms that override defaults
- **Notes System**: Rich text notes for client history and preferences

#### Client Detail View
- Complete client information display
- Historical quote and invoice summaries
- Activity timeline showing all interactions
- Quick actions for creating quotes and invoices

#### User Interactions
```
Create Client → Fill Details → Save → Automatically appears in dropdowns
Edit Client → Update Information → Save → Changes reflected across system
View Client → See full history → Create quote/invoice → Seamless workflow
```

### Real Examples
- **Architect Client**: Company "Sydney Design Studio", contact "Sarah Chen", payment terms "NET 30", tagged as "Professional"
- **Hobbyist Client**: Individual "John Smith", email contact, payment terms "COD", tagged as "Retail"

---

## Quote Creation & Lifecycle Management

### Overview
The quote system enables professional proposal creation with comprehensive pricing calculations and structured approval workflows.

### Quote Status Workflow
```
DRAFT → PENDING → ACCEPTED/DECLINED → CONVERTED (if accepted)
```

### Core Features

#### Quote Creation & Editing
- **Client Selection**: Choose from existing client database
- **Line Items**: Add products with quantities, descriptions, and pricing
- **Dynamic Pricing**: Support for fixed pricing and calculated pricing based on materials
- **Discount System**: Line-level and document-level discounts (percentage or fixed amount)
- **Tax Calculation**: Automatic tax calculation based on configured rates
- **Shipping Options**: Add shipping costs with custom labels
- **Terms & Notes**: Custom terms and internal/external notes

#### Product Calculator Integration
- **Material-Based Pricing**: Calculate costs based on material consumption
- **Calculator Snapshots**: Store calculation details for audit trails
- **Template Integration**: Link to product templates for consistent pricing

#### Quote Status Management
- **Send Quote**: Mark as PENDING and track send date
- **Accept/Decline**: Client decision tracking with optional notes
- **Expiry Management**: Set and track quote expiration dates
- **Conversion**: Direct conversion to invoices with job creation

#### User Interactions
```
Create Quote → Add Line Items → Calculate Totals → Save as Draft
Review Quote → Send to Client → Track Status → Accept/Decline → Convert to Invoice
```

### Status Definitions
- **DRAFT**: Quote is being prepared, not yet sent
- **PENDING**: Quote sent to client, awaiting decision
- **ACCEPTED**: Client has accepted the quote
- **DECLINED**: Client has declined the quote
- **CONVERTED**: Quote has been converted to an invoice

### Real Examples
- **Custom Miniature Set**: 50 units @ $2.50 each, PLA material, 5% bulk discount, total $118.75
- **Architectural Model**: Fixed price $450, complex assembly, NET 15 terms, shipping $25

---

## Invoice Generation & Payment Processing

### Overview
The invoice system handles billing, payment tracking, and financial management with integrated Stripe payment processing.

### Invoice Status Workflow
```
PENDING → PAID (via payment recording)
PENDING → OVERDUE (based on due date configuration)
PENDING → VOIDED (administrative action)
```

### Core Features

#### Invoice Creation
- **Direct Creation**: Create invoices from scratch
- **Quote Conversion**: Seamlessly convert accepted quotes to invoices
- **Automatic Numbering**: Sequential invoice numbering with customizable prefixes
- **Due Date Calculation**: Automatic due date calculation based on payment terms
- **Balance Tracking**: Real-time balance due calculations

#### Payment Processing
- **Multiple Payment Methods**: Stripe, bank transfer, cash, other
- **Partial Payments**: Support for multiple payments against single invoice
- **Payment History**: Complete payment audit trail
- **Automatic Balance Updates**: Real-time balance calculations

#### Stripe Integration
- **Checkout Sessions**: Generate secure Stripe payment links
- **Webhook Processing**: Automatic payment confirmation via webhooks
- **Session Management**: Track checkout session status and URLs

#### Invoice Lifecycle Management
- **Void Invoices**: Administrative voiding with reason tracking
- **Write-offs**: Handle uncollectable invoices with documentation
- **Overdue Tracking**: Automatic overdue status based on configuration
- **Reminder System**: Track reminder notifications

#### User Interactions
```
Create Invoice → Set Terms → Send to Client → Record Payment → Mark Paid
Quote Accepted → Convert to Invoice → Generate Stripe Link → Client Pays → Auto-update
```

### Payment Method Examples
- **Stripe Payment**: Online card payment with automatic confirmation
- **Bank Transfer**: Manual recording with reference number
- **Cash Payment**: In-person payment with manual recording

---

## Job Queue & Production Management

### Overview
The job board provides a comprehensive production management system with drag-and-drop queue management and real-time status tracking.

### Job Status Workflow
```
QUEUED → PRINTING → COMPLETED
QUEUED → PRINTING → PAUSED → PRINTING → COMPLETED
Any Status → CANCELLED
```

### Core Features

#### Job Creation
- **Automatic Creation**: Jobs created based on configurable policies (on invoice or on payment)
- **Manual Creation**: Direct job creation from invoices
- **Job Details**: Title, description, estimated hours, priority levels
- **Client Linking**: Direct connection to client and invoice

#### Drag-and-Drop Queue Management
- **Printer Assignment**: Drag jobs between printer columns
- **Queue Reordering**: Adjust job priority within printer queues
- **Real-time Updates**: Live collaboration with other users
- **Visual Feedback**: Clear indication of drag states and drop zones

#### Priority System
- **NORMAL**: Standard priority for regular jobs
- **FAST_TRACK**: Higher priority for expedited work
- **URGENT**: Highest priority for critical jobs

#### Status Management
- **Start/Pause/Resume**: Control job execution state
- **Completion Tracking**: Record actual hours and completion details
- **Cancellation**: Handle cancelled jobs with reason tracking
- **Archive System**: Clean up completed/cancelled jobs

#### Job Board Views
- **Active View**: Show queued, printing, and paused jobs
- **Completed Today**: Show jobs completed in current day
- **Archived View**: Show archived jobs
- **All View**: Show all jobs regardless of archive status

#### Bulk Operations
- **Multi-select**: Select multiple jobs for bulk operations
- **Bulk Archive**: Archive multiple completed jobs at once
- **Selection Mode**: Toggle selection interface for bulk operations

#### User Interactions
```
Invoice Paid → Job Auto-created → Assign to Printer → Start Printing → Complete
Drag Job → Drop on Printer → Queue Updates → Start Job → Track Progress
```

### Real Examples
- **Miniature Army**: 24-hour print job, URGENT priority, assigned to Printer A
- **Prototype Parts**: 6-hour job, FAST_TRACK priority, moved from Printer B to Printer C
- **Standard Order**: 4-hour job, NORMAL priority, queued behind higher priority jobs

---

## Printer Fleet Management

### Overview
Comprehensive printer management system for tracking availability, maintenance, and job assignments.

### Printer Status Types
- **ACTIVE**: Printer is operational and can accept jobs
- **MAINTENANCE**: Printer is undergoing maintenance, blocked from new assignments
- **OFFLINE**: Printer is not operational, blocked from assignments

### Core Features

#### Printer Registration
- **Basic Information**: Name, model, build volume specifications
- **Status Management**: Track operational status with automatic job assignment rules
- **Notes System**: Maintenance schedules, spool information, operational notes
- **Creation/Modification**: Full CRUD operations with validation

#### Queue Management Integration
- **Automatic Blocking**: Prevent job assignment to maintenance/offline printers
- **Queue Clearing**: Clear queued jobs when printer status changes
- **Visual Indicators**: Status badges and color coding in job board

#### Maintenance Workflow
- **Status Changes**: Update printer status when maintenance required
- **Job Redistribution**: Clear and redistribute jobs when printer goes offline
- **Maintenance Tracking**: Record maintenance dates and notes

#### User Interactions
```
Add Printer → Set Status Active → Jobs Can Be Assigned
Printer Needs Maintenance → Change Status → Clear Queue → Redistribute Jobs
Maintenance Complete → Change Status Active → Resume Job Assignments
```

### Real Examples
- **Bambu X1 Carbon**: Build volume 256x256x256mm, Status ACTIVE, note "Scheduled maintenance every 500 hours"
- **Prusa i3 MK3S+**: Status MAINTENANCE, note "Nozzle replacement in progress, back online tomorrow"

---

## Material & Product Catalog

### Overview
Comprehensive catalog system for managing materials and product templates with cost tracking and pricing integration.

### Material Management

#### Material Properties
- **Basic Information**: Name, color, category classification
- **Cost Tracking**: Cost per gram for accurate pricing calculations
- **Notes System**: Handling tips, supplier information, storage requirements
- **Category Organization**: Flexible categorization for material types

#### Pricing Integration
- **Calculator Integration**: Materials used in pricing calculations
- **Cost Analysis**: Track average costs and material usage
- **Template Linking**: Materials linked to product templates

### Product Templates

#### Template Features
- **Product Definitions**: Reusable product specifications
- **Pricing Types**: Fixed pricing or calculated pricing based on materials
- **Unit Management**: Flexible unit definitions (pieces, sets, weight)
- **Calculator Configuration**: Material-based pricing calculations
- **Template Reuse**: Use templates across quotes and invoices

#### User Interactions
```
Create Material → Set Cost → Use in Product Template → Apply to Quote Line
Define Template → Configure Calculator → Reuse in Multiple Quotes
```

### Real Examples
- **PLA Material**: Red color, General category, $0.025/gram, note "Standard temperature, easy printing"
- **Miniature Template**: Fixed price $2.50, PLA material, calculated based on 15g average weight

---

## Dashboard & Analytics

### Overview
Comprehensive analytics dashboard providing real-time business insights and performance metrics.

### Key Metrics

#### Revenue Analytics
- **30-Day Revenue**: Current period revenue with comparison to previous period
- **Revenue Trends**: 6-month revenue visualization with sparkline charts
- **Outstanding Balance**: Total amount pending from unpaid invoices
- **Period Comparisons**: Automatic percentage change calculations

#### Pipeline Management
- **Quote Status Breakdown**: Visual breakdown of quotes by status
- **Pending Quotes**: Count of quotes awaiting client decision
- **Conversion Tracking**: Track quote-to-invoice conversion rates

#### Production Metrics
- **Job Queue Status**: Real-time count of queued and active jobs
- **Printer Utilization**: Visual load indicators for each printer
- **Completion Tracking**: Jobs completed today and productivity metrics
- **Estimated Hours**: Total estimated production time in queue

#### Outstanding Invoices
- **Aging Analysis**: Invoices organized by due date
- **Client Breakdown**: Outstanding amounts by client
- **Due Date Tracking**: Visual indicators for overdue items

### Activity Feed

#### Real-time Activity Tracking
- **Infinite Scroll**: Load historical activity with pagination
- **Context Information**: Rich context for each activity entry
- **Time Tracking**: Relative timestamps for recent activities
- **Action Categories**: Categorized activity types for easy filtering

#### Dashboard Customization
- **Time Range Selection**: Today, 7d, 30d, YTD views
- **Auto-refresh**: Real-time data updates every 60 seconds
- **Responsive Design**: Optimized for desktop and mobile viewing

### Real Examples
- **Revenue Trend**: $12,450 this month (+15.2% vs previous), trending upward
- **Queue Status**: 8 jobs queued, 3 printing, 2 printers busy
- **Activity**: "Quote QT-0023 accepted by Sarah Chen 2 hours ago"

---

## Activity Logging & Audit Trails

### Overview
Comprehensive activity logging system that tracks all business operations and provides complete audit trails.

### Activity Categories

#### Client Activities
- **Client Creation**: New client registration
- **Client Updates**: Profile modifications
- **Note Additions**: Client note updates

#### Quote Activities
- **Quote Creation**: New quote generation
- **Quote Updates**: Modifications to existing quotes
- **Status Changes**: Draft → Pending → Accepted/Declined/Converted
- **Quote Sending**: Tracking when quotes are sent to clients
- **Conversions**: Quote to invoice conversion tracking

#### Invoice Activities
- **Invoice Creation**: New invoice generation
- **Payment Recording**: All payment transactions
- **Status Updates**: Paid, voided, write-off tracking
- **Stripe Events**: Payment processing events

#### Job Activities
- **Job Creation**: Automatic and manual job creation
- **Status Changes**: Queue → Printing → Completed workflow
- **Assignment Changes**: Printer assignment modifications
- **Archive Operations**: Job archival and cleanup

#### Printer Activities
- **Status Changes**: Active → Maintenance → Offline transitions
- **Queue Operations**: Queue clearing and job redistribution

### Activity Features

#### Rich Context Information
- **Linked Entities**: Direct connections to clients, quotes, invoices, jobs
- **Metadata Storage**: Additional context in JSON format
- **User Attribution**: Track which user performed actions
- **Timestamp Precision**: Exact timing of all activities

#### Activity Display
- **Dashboard Feed**: Recent activity with infinite scroll
- **Entity Views**: Activity filtered by specific clients/quotes/invoices
- **Search and Filter**: Find specific activities by type or content
- **Export Capabilities**: Activity data available in reports

### Real Examples
- **Quote Activity**: "Quote QT-0023 converted to invoice INV-0045 by system"
- **Payment Activity**: "Payment of $125.50 received via Stripe for invoice INV-0045"
- **Job Activity**: "Job 'Custom miniatures' started printing on Bambu X1"

---

## File Management & PDF Generation

### Overview
Advanced PDF generation system with high-quality document templates and secure file storage.

### PDF Generation

#### Template System
- **Production Template**: Professional, high-quality template for all documents
- **Puppeteer Engine**: Chrome-based PDF rendering for consistent output
- **Quality Optimization**: High DPI rendering with font antialiasing
- **Background Graphics**: Full background and styling support

#### Quote PDFs
- **Professional Layout**: Clean, branded quote presentation
- **Line Item Details**: Complete pricing breakdown
- **Terms Integration**: Payment terms and conditions
- **Branding Elements**: Business information and styling

#### Invoice PDFs
- **Invoice Layout**: Professional invoice format
- **Payment Information**: Due dates, payment terms, amounts
- **Stripe Integration**: QR codes or links for online payment
- **Tax Breakdown**: Detailed tax calculations

### File Storage

#### Attachment System
- **Invoice Attachments**: Upload supporting documents to invoices
- **File Metadata**: Track filename, size, upload date
- **Secure Storage**: Protected file access with authentication
- **Multiple Formats**: Support for various file types

#### Storage Architecture
- **Local Storage**: File system based storage with organized structure
- **Path Management**: Secure path resolution and access controls
- **Cleanup Operations**: Automatic cleanup of temporary files

### User Interactions
```
Generate Quote PDF → Download/View → Send to Client
Upload Invoice Attachment → File Stored → Available for Download
```

### Real Examples
- **Quote PDF**: "QT-0023_Custom_Miniatures.pdf" - 2 pages, professional layout
- **Invoice Attachment**: "Reference_drawings.zip" - 2.3MB, uploaded with invoice

---

## Reports & Data Export

### Overview
Comprehensive reporting system providing detailed business analytics and data export capabilities.

### Export Categories

#### Financial Reports
- **Invoices CSV**: Complete invoice data with amounts, dates, status
- **Payments CSV**: Payment history with methods, amounts, dates
- **AR Aging CSV**: Outstanding invoices grouped by aging buckets (0-30, 31-60, 61-90, 90+ days)

#### Production Reports
- **Jobs CSV**: Production data with printer assignments, hours, completion rates
- **Material Usage CSV**: Material consumption analysis by invoice line items
- **Printer Utilization CSV**: Efficiency metrics per printer with completed jobs and hours

### Report Features

#### Date Range Selection
- **Flexible Ranges**: Custom date ranges with calendar picker
- **Preset Options**: Today, 7 days, 30 days, year-to-date
- **Default Range**: Last 30 days for consistent reporting

#### Export Process
- **Real-time Generation**: Reports generated on-demand
- **CSV Format**: Excel-compatible format for further analysis
- **Automatic Downloads**: Browser-based download with proper filenames
- **Progress Indicators**: Loading states during report generation

#### Data Quality
- **Complete Records**: All relevant fields included in exports
- **Proper Formatting**: Dates, currencies, and numbers properly formatted
- **Header Rows**: Clear column headers for easy analysis

### User Interactions
```
Select Date Range → Choose Report Type → Generate → Download CSV
Open in Excel → Analyze Data → Create Charts/Pivots
```

### Real Examples
- **Invoice Report**: 45 invoices, $23,450 total, 92% collection rate
- **Material Usage**: PLA 2.5kg, PETG 1.2kg, ABS 0.8kg in selected period
- **Printer Utilization**: Bambu X1 85% utilization, Prusa i3 67% utilization

---

## Settings & Configuration

### Overview
Comprehensive configuration system for customizing business operations, automation, and integrations.

### Business Configuration

#### Company Information
- **Business Details**: Name, email, phone, address, ABN
- **Tax Configuration**: Default tax rates for automatic calculations
- **Currency Settings**: Default currency (AUD) for all transactions
- **Bank Details**: Payment information for invoices

#### Document Numbering
- **Quote Prefixes**: Customizable quote number prefixes (default: "QT-")
- **Invoice Prefixes**: Customizable invoice number prefixes (default: "INV-")
- **Sequential Numbering**: Automatic increment with configurable starting points

#### Payment Terms
- **Default Terms**: System-wide default payment terms
- **Custom Terms**: Define custom payment term options
- **Client Overrides**: Client-specific payment terms override defaults
- **Due Date Calculation**: Automatic due date calculation based on terms

### Operational Automation

#### Job Creation Policies
- **ON_PAYMENT**: Jobs created automatically when invoices are paid
- **ON_INVOICE**: Jobs created automatically when invoices are generated

#### Printer Management Automation
- **Auto-detach Completed Jobs**: Automatically remove jobs from printers when completed
- **Archive Completed Jobs**: Automatically archive jobs after configurable days
- **Assignment Prevention**: Block assignments to maintenance/offline printers
- **Concurrency Limits**: Maximum active jobs per printer

#### Invoice Management
- **Overdue Configuration**: Days until invoices are marked overdue
- **Reminder Cadence**: Frequency of payment reminders
- **Email Automation**: Enable/disable automated email sending

### Shipping & Calculator

#### Shipping Options
- **Custom Shipping**: Define shipping methods with labels and costs
- **Client Selection**: Clients can choose from available shipping options
- **Automatic Calculation**: Shipping costs included in total calculations

#### Pricing Calculator
- **Material Integration**: Calculator uses material costs for pricing
- **Configuration Storage**: Calculator settings stored per quote/invoice
- **Template Integration**: Product templates include calculator configurations

### User Interactions
```
Configure Business → Set Payment Terms → Define Shipping → Test Calculator
Update Automation → Enable Job Creation → Set Reminder Cadence → Save Settings
```

### Real Examples
- **Business Setup**: "Sydney 3D Prints", ABN 12345678901, 10% GST, NET 30 default terms
- **Automation**: Auto-create jobs on payment, archive after 7 days, max 1 job per printer
- **Shipping**: Standard $15, Express $25, Local Pickup $0

---

## Integration Features

### Stripe Payment Processing
- **Secure Checkout**: Generate secure payment links for invoices
- **Webhook Integration**: Automatic payment confirmation and invoice updates
- **Multiple Payment Methods**: Credit cards, digital wallets via Stripe
- **Session Management**: Track payment session status and expiry

### Activity Integration
- **Cross-Entity Tracking**: Activities linked across clients, quotes, invoices, jobs
- **Real-time Updates**: Live activity feed with automatic refresh
- **Historical Analysis**: Complete audit trail for compliance and analysis

### Data Consistency
- **Transaction Safety**: Database transactions ensure data consistency
- **Automatic Calculations**: Real-time total calculations across all documents
- **Status Synchronization**: Status changes propagate across related entities

---

This comprehensive feature documentation covers all major capabilities of the 3D Print Management System. Each feature is designed to work seamlessly with others, providing a complete business management solution for 3D printing operations.