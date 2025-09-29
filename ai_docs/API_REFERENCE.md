# 3D Print Sydney API Reference

## Table of Contents

1. [API Overview & Authentication](#api-overview--authentication)
2. [Error Handling & Response Formats](#error-handling--response-formats)
3. [Client Management Endpoints](#client-management-endpoints)
4. [Quote Management Endpoints](#quote-management-endpoints)
5. [Invoice Management Endpoints](#invoice-management-endpoints)
6. [Job Management Endpoints](#job-management-endpoints)
7. [Printer Management Endpoints](#printer-management-endpoints)
8. [Material & Product Endpoints](#material--product-endpoints)
9. [Dashboard & Analytics Endpoints](#dashboard--analytics-endpoints)
10. [File Upload & PDF Endpoints](#file-upload--pdf-endpoints)
11. [Export & Maintenance Endpoints](#export--maintenance-endpoints)
12. [Data Models & Validation Schemas](#data-models--validation-schemas)

---

## API Overview & Authentication

### Base URL
```
https://your-domain.com/api
```

### Authentication
This API currently does not implement authentication middleware. All endpoints are publicly accessible. In a production environment, you should implement proper authentication and authorization.

### Request/Response Format
- **Content-Type**: `application/json` (except for file uploads and PDF downloads)
- **Response Format**: All responses follow a consistent format

---

## Error Handling & Response Formats

### Success Response Format
```json
{
  "data": {
    // Response data here
  }
}
```

### Error Response Format
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {
      // Optional additional error details
    }
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 422 | Request payload validation failed |
| `INVALID_ID` | 400 | Invalid resource ID provided |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `INVALID_FILE` | 400 | File upload missing or invalid |
| `FILE_TOO_LARGE` | 413 | File exceeds size limit |
| `UNSUPPORTED_TYPE` | 415 | Unsupported file type |
| `PDF_ERROR` | 500 | PDF generation failed |

---

## Client Management Endpoints

### List Clients
```http
GET /api/clients
```

**Query Parameters:**
- `q` (string, optional): Search query for client name/company
- `limit` (number, optional): Maximum number of results
- `offset` (number, optional): Number of results to skip
- `sort` (string, optional): Sort field (`name`, `createdAt`)
- `order` (string, optional): Sort order (`asc`, `desc`)

**Response:**
```json
{
  "data": {
    "clients": [
      {
        "id": 1,
        "name": "John Doe",
        "company": "Acme Corp",
        "abn": "12345678901",
        "email": "john@acme.com",
        "phone": "+61234567890",
        "address": "123 Business St, Sydney NSW 2000",
        "tags": ["VIP", "Regular"],
        "paymentTerms": "Net 30",
        "notes": "Preferred customer",
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "total": 1,
    "limit": 50,
    "offset": 0
  }
}
```

### Create Client
```http
POST /api/clients
```

**Request Body:**
```json
{
  "name": "Jane Smith",
  "company": "Tech Solutions",
  "abn": "98765432109",
  "email": "jane@techsolutions.com",
  "phone": "+61987654321",
  "address": "456 Tech Ave, Melbourne VIC 3000",
  "paymentTerms": "Net 14",
  "notes": "New customer",
  "tags": ["Tech", "Startup"]
}
```

**Response:**
```json
{
  "data": {
    "id": 2,
    "name": "Jane Smith",
    // ... full client object
  }
}
```

### Get Client
```http
GET /api/clients/{id}
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "name": "John Doe",
    // ... full client object with related data
  }
}
```

### Update Client
```http
PUT /api/clients/{id}
```

**Request Body:** Same as Create Client

### Delete Client
```http
DELETE /api/clients/{id}
```

### Add Client Note
```http
POST /api/clients/{id}/notes
```

**Request Body:**
```json
{
  "body": "Customer called to discuss new project requirements"
}
```

---

## Quote Management Endpoints

### List Quotes
```http
GET /api/quotes
```

**Query Parameters:**
- `q` (string, optional): Search query
- `status` (array, optional): Filter by status (`DRAFT`, `PENDING`, `ACCEPTED`, `DECLINED`, `CONVERTED`)
- `limit` (number, optional): Maximum number of results
- `offset` (number, optional): Number of results to skip
- `sort` (string, optional): Sort field (`issueDate`, `createdAt`, `number`)
- `order` (string, optional): Sort order (`asc`, `desc`)

**Response:**
```json
{
  "data": {
    "quotes": [
      {
        "id": 1,
        "number": "QT-001",
        "clientId": 1,
        "client": {
          "id": 1,
          "name": "John Doe",
          "company": "Acme Corp"
        },
        "status": "PENDING",
        "issueDate": "2024-01-15T00:00:00Z",
        "expiryDate": "2024-02-15T00:00:00Z",
        "subtotal": 500.00,
        "taxTotal": 50.00,
        "total": 550.00,
        "items": [
          {
            "id": 1,
            "name": "Custom 3D Print",
            "description": "Complex mechanical part",
            "quantity": 2,
            "unit": "piece",
            "unitPrice": 250.00,
            "total": 500.00
          }
        ]
      }
    ],
    "total": 1
  }
}
```

### Create Quote
```http
POST /api/quotes
```

**Request Body:**
```json
{
  "clientId": 1,
  "issueDate": "2024-01-15",
  "expiryDate": "2024-02-15",
  "taxRate": 10,
  "discountType": "NONE",
  "shippingCost": 15.00,
  "shippingLabel": "Standard Shipping",
  "notes": "Rush order available",
  "terms": "Standard terms and conditions",
  "lines": [
    {
      "productTemplateId": 1,
      "name": "Custom 3D Print",
      "description": "Complex mechanical part",
      "quantity": 2,
      "unit": "piece",
      "unitPrice": 250.00,
      "discountType": "NONE",
      "calculatorBreakdown": {
        "material": "PLA",
        "hours": 4.5
      }
    }
  ]
}
```

### Get Quote
```http
GET /api/quotes/{id}
```

### Update Quote
```http
PUT /api/quotes/{id}
```

### Delete Quote
```http
DELETE /api/quotes/{id}
```

### Update Quote Status
```http
PUT /api/quotes/{id}/status
```

**Request Body:**
```json
{
  "status": "ACCEPTED"
}
```

### Convert Quote to Invoice
```http
POST /api/quotes/{id}/convert
```

**Response:**
```json
{
  "data": {
    "id": 5,
    "number": "INV-003",
    "sourceQuoteId": 1,
    // ... full invoice object
  }
}
```

### Duplicate Quote
```http
POST /api/quotes/{id}/duplicate
```

### Send Quote
```http
POST /api/quotes/{id}/send
```

### Download Quote PDF
```http
GET /api/quotes/{id}/pdf?style=classic
```

**Query Parameters:**
- `style` (string, optional): PDF style template (default: "classic")

**Response:** PDF file download

---

## Invoice Management Endpoints

### List Invoices
```http
GET /api/invoices
```

**Query Parameters:**
- `q` (string, optional): Search query
- `status` (array, optional): Filter by status (`PENDING`, `PAID`, `OVERDUE`)
- `limit` (number, optional): Maximum number of results
- `offset` (number, optional): Number of results to skip
- `sort` (string, optional): Sort field (`issueDate`, `dueDate`, `createdAt`, `number`)
- `order` (string, optional): Sort order (`asc`, `desc`)

### Create Invoice
```http
POST /api/invoices
```

**Request Body:**
```json
{
  "clientId": 1,
  "issueDate": "2024-01-15",
  "dueDate": "2024-02-15",
  "taxRate": 10,
  "discountType": "NONE",
  "shippingCost": 15.00,
  "shippingLabel": "Express Shipping",
  "notes": "Payment due within 30 days",
  "terms": "Standard payment terms",
  "lines": [
    {
      "name": "3D Printed Part",
      "description": "Custom mechanical component",
      "quantity": 1,
      "unit": "piece",
      "unitPrice": 150.00
    }
  ]
}
```

### Get Invoice
```http
GET /api/invoices/{id}
```

### Update Invoice
```http
PUT /api/invoices/{id}
```

### Delete Invoice
```http
DELETE /api/invoices/{id}
```

### Mark Invoice as Paid
```http
POST /api/invoices/{id}/mark-paid
```

### Mark Invoice as Unpaid
```http
POST /api/invoices/{id}/mark-unpaid
```

### Revert Invoice
```http
POST /api/invoices/{id}/revert
```

### Add Payment
```http
POST /api/invoices/{id}/payments
```

**Request Body:**
```json
{
  "amount": 550.00,
  "method": "BANK_TRANSFER",
  "reference": "TXN123456",
  "processor": "Bank",
  "notes": "Payment received via bank transfer",
  "paidAt": "2024-01-20T14:30:00Z"
}
```

### Update Payment
```http
PUT /api/invoices/{id}/payments/{paymentId}
```

### Delete Payment
```http
DELETE /api/invoices/{id}/payments/{paymentId}
```

### Upload Invoice Attachment
```http
POST /api/invoices/{id}/attachments
```

**Content-Type:** `multipart/form-data`

**Form Data:**
- `file`: File to upload (max 200MB)

**Allowed File Types:**
- `application/pdf`
- `image/png`
- `image/jpeg`
- `image/webp`
- `text/plain`
- `application/zip`

### Delete Invoice Attachment
```http
DELETE /api/invoices/{id}/attachments/{attachmentId}
```

### Download Invoice PDF
```http
GET /api/invoices/{id}/pdf?style=classic
```

---

## Job Management Endpoints

### Get Job Board
```http
GET /api/jobs
```

**Query Parameters:**
- `archived` (boolean, optional): Include archived jobs
- `status` (array, optional): Filter by status (`QUEUED`, `PRINTING`, `PAUSED`, `COMPLETED`, `CANCELLED`)
- `completedWindow` (string, optional): Filter completed jobs (`today`)

**Response:**
```json
{
  "data": {
    "printers": [
      {
        "id": 1,
        "name": "Printer A",
        "status": "ACTIVE",
        "jobs": [
          {
            "id": 1,
            "title": "Custom Part Print",
            "description": "Complex mechanical component",
            "status": "PRINTING",
            "priority": "NORMAL",
            "queuePosition": 0,
            "estimatedHours": 4.5,
            "actualHours": null,
            "startedAt": "2024-01-15T09:00:00Z",
            "client": {
              "id": 1,
              "name": "John Doe"
            },
            "invoice": {
              "id": 1,
              "number": "INV-001"
            }
          }
        ]
      }
    ],
    "unassigned": []
  }
}
```

### Get Job
```http
GET /api/jobs/{id}
```

### Update Job
```http
PUT /api/jobs/{id}
```

**Request Body:**
```json
{
  "title": "Updated Job Title",
  "description": "Updated description",
  "priority": "URGENT",
  "printerId": 2,
  "estimatedHours": 6.0,
  "notes": "Priority changed due to client request"
}
```

### Update Job Status
```http
PUT /api/jobs/{id}/status
```

**Request Body:**
```json
{
  "status": "COMPLETED",
  "note": "Job completed successfully, high quality output"
}
```

### Archive Job
```http
POST /api/jobs/{id}/archive
```

### Get Archived Jobs
```http
GET /api/jobs/archive
```

### Reorder Jobs
```http
PUT /api/jobs/reorder
```

**Request Body:**
```json
[
  {
    "id": 1,
    "queuePosition": 0,
    "printerId": 1
  },
  {
    "id": 2,
    "queuePosition": 1,
    "printerId": 1
  }
]
```

---

## Printer Management Endpoints

### List Printers
```http
GET /api/printers
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Ultimaker S3",
      "model": "S3",
      "buildVolume": "230 × 190 × 200 mm",
      "status": "ACTIVE",
      "notes": "Recently serviced",
      "lastMaintenanceAt": "2024-01-10T00:00:00Z",
      "maintenanceNote": "Routine maintenance completed",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-10T00:00:00Z"
    }
  ]
}
```

### Create Printer
```http
POST /api/printers
```

**Request Body:**
```json
{
  "name": "Prusa MK4",
  "model": "MK4",
  "buildVolume": "250 × 210 × 220 mm",
  "status": "ACTIVE",
  "notes": "New printer setup"
}
```

### Get Printer
```http
GET /api/printers/{id}
```

### Update Printer
```http
PUT /api/printers/{id}
```

### Delete Printer
```http
DELETE /api/printers/{id}
```

---

## Material & Product Endpoints

### List Materials
```http
GET /api/materials
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "PLA White",
      "color": "White",
      "category": "PLA",
      "costPerGram": 0.025,
      "notes": "High quality PLA filament",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Create Material
```http
POST /api/materials
```

**Request Body:**
```json
{
  "name": "PETG Clear",
  "color": "Clear",
  "category": "PETG",
  "costPerGram": 0.035,
  "notes": "Transparent PETG for clear parts"
}
```

### Get Material
```http
GET /api/materials/{id}
```

### Update Material
```http
PUT /api/materials/{id}
```

### Delete Material
```http
DELETE /api/materials/{id}
```

### List Product Templates
```http
GET /api/product-templates
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Standard Print",
      "description": "Standard quality 3D print",
      "unit": "piece",
      "pricingType": "CALCULATED",
      "basePrice": null,
      "calculatorConfig": {
        "baseHours": 1,
        "materialGrams": 50,
        "quality": "standard",
        "infill": "medium"
      },
      "materialId": 1,
      "material": {
        "id": 1,
        "name": "PLA White"
      }
    }
  ]
}
```

### Create Product Template
```http
POST /api/product-templates
```

**Request Body:**
```json
{
  "name": "Premium Print",
  "description": "High quality 3D print with fine details",
  "unit": "piece",
  "pricingType": "CALCULATED",
  "calculatorConfig": {
    "baseHours": 2,
    "materialGrams": 75,
    "quality": "high",
    "infill": "high"
  },
  "materialId": 1
}
```

### Get Product Template
```http
GET /api/product-templates/{id}
```

### Update Product Template
```http
PUT /api/product-templates/{id}
```

### Delete Product Template
```http
DELETE /api/product-templates/{id}
```

---

## Dashboard & Analytics Endpoints

### Get Dashboard Snapshot
```http
GET /api/dashboard
```

**Query Parameters:**
- `range` (string, optional): Time range (`today`, `7d`, `30d`, `ytd`)
- `from` (string, optional): Start date (ISO format)
- `to` (string, optional): End date (ISO format)
- `actLimit` (number, optional): Activity limit (default: 12)
- `actOffset` (number, optional): Activity offset (default: 0)

**Response:**
```json
{
  "data": {
    "metrics": {
      "totalRevenue": 15420.50,
      "pendingInvoices": 3450.00,
      "activeJobs": 7,
      "completedJobs": 23
    },
    "revenueChart": [
      { "date": "2024-01-01", "amount": 1200.00 },
      { "date": "2024-01-02", "amount": 850.00 }
    ],
    "jobStatusChart": [
      { "status": "COMPLETED", "count": 23 },
      { "status": "PRINTING", "count": 4 },
      { "status": "QUEUED", "count": 3 }
    ],
    "topClients": [
      {
        "id": 1,
        "name": "John Doe",
        "company": "Acme Corp",
        "totalRevenue": 5420.50,
        "jobCount": 12
      }
    ]
  }
}
```

### Get Recent Activity
```http
GET /api/dashboard/activity
```

**Query Parameters:**
- `limit` (number, optional): Maximum results (default: 12)
- `offset` (number, optional): Results offset (default: 0)

**Response:**
```json
{
  "data": {
    "activities": [
      {
        "id": 1,
        "action": "invoice.created",
        "message": "Invoice INV-003 created for John Doe",
        "createdAt": "2024-01-15T10:30:00Z",
        "metadata": {
          "invoiceId": 3,
          "clientId": 1
        }
      }
    ],
    "total": 45
  }
}
```

---

## File Upload & PDF Endpoints

### Download PDF Documents
Quote PDFs and Invoice PDFs can be downloaded using:

```http
GET /api/quotes/{id}/pdf?style={style}
GET /api/invoices/{id}/pdf?style={style}
```

Available styles may include: `classic`, `modern`, `minimal`, etc.

### File Upload
File uploads are supported for invoice attachments:

```http
POST /api/invoices/{id}/attachments
```

**File Constraints:**
- Maximum size: 200MB
- Allowed types: PDF, PNG, JPEG, WebP, Plain Text, ZIP

### File Management
```http
GET /api/attachments/{id}          # Download attachment
DELETE /api/attachments/{id}       # Delete attachment
```

---

## Export & Maintenance Endpoints

### Export Data

#### Export Invoices
```http
GET /api/export/invoices?from={date}&to={date}
```

**Response:** CSV file download

#### Export Payments
```http
GET /api/export/payments?from={date}&to={date}
```

**Response:** CSV file download

#### Export Jobs
```http
GET /api/export/jobs?from={date}&to={date}
```

**Response:** CSV file download

### System Maintenance

#### Run Maintenance
```http
POST /api/maintenance/run
```

Performs system maintenance tasks like archiving old jobs, cleanup, etc.

### Settings Management

#### Get Settings
```http
GET /api/settings
```

**Response:**
```json
{
  "data": {
    "businessName": "3D Print Sydney",
    "businessEmail": "info@3dprintsydney.com",
    "businessPhone": "+61234567890",
    "businessAddress": "123 Print St, Sydney NSW 2000",
    "abn": "12345678901",
    "taxRate": 10,
    "numberingQuotePrefix": "QT-",
    "numberingInvoicePrefix": "INV-",
    "defaultPaymentTerms": "COD",
    "defaultCurrency": "AUD",
    "jobCreationPolicy": "ON_PAYMENT"
  }
}
```

#### Update Settings
```http
PUT /api/settings
```

---

## Data Models & Validation Schemas

### Client Model
```typescript
interface Client {
  id: number;
  name: string;              // Required, min 1 char
  company?: string;          // Optional
  abn?: string;             // Optional
  email?: string;           // Optional, must be valid email
  phone?: string;           // Optional
  address?: string;         // Optional
  tags?: string[];          // Optional array
  paymentTerms?: string;    // Optional
  notes?: string;           // Optional
  createdAt: Date;
  updatedAt: Date;
}
```

### Quote Model
```typescript
interface Quote {
  id: number;
  number: string;                    // Auto-generated
  clientId: number;                  // Required
  status: QuoteStatus;               // DRAFT|PENDING|ACCEPTED|DECLINED|CONVERTED
  issueDate: Date;
  expiryDate?: Date;
  taxRate?: number;                  // 0-100
  discountType: DiscountType;        // NONE|PERCENT|FIXED
  discountValue?: number;            // >= 0
  shippingCost?: number;             // >= 0
  shippingLabel?: string;
  subtotal: number;
  taxTotal: number;
  total: number;
  notes?: string;
  terms?: string;
  lines: QuoteItem[];                // Min 1 item required
  createdAt: Date;
  updatedAt: Date;
}
```

### Quote Item Model
```typescript
interface QuoteItem {
  id: number;
  quoteId: number;
  productTemplateId?: number;
  name: string;                      // Required, min 1 char
  description?: string;
  quantity: number;                  // Min 0.01
  unit?: string;
  unitPrice: number;                 // Min 0
  discountType: DiscountType;        // NONE|PERCENT|FIXED
  discountValue?: number;            // Min 0
  total: number;
  orderIndex: number;
  calculatorBreakdown?: object;
}
```

### Invoice Model
```typescript
interface Invoice {
  id: number;
  number: string;                    // Auto-generated
  clientId: number;                  // Required
  sourceQuoteId?: number;            // When converted from quote
  status: InvoiceStatus;             // PENDING|PAID|OVERDUE
  issueDate: Date;
  dueDate?: Date;
  taxRate?: number;                  // 0-100
  discountType: DiscountType;        // NONE|PERCENT|FIXED
  discountValue?: number;            // >= 0
  shippingCost?: number;             // >= 0
  shippingLabel?: string;
  subtotal: number;
  taxTotal: number;
  total: number;
  balanceDue: number;
  notes?: string;
  terms?: string;
  lines: InvoiceItem[];              // Min 1 item required
  payments: Payment[];
  attachments: Attachment[];
  createdAt: Date;
  updatedAt: Date;
}
```

### Job Model
```typescript
interface Job {
  id: number;
  invoiceId: number;                 // Required
  clientId: number;                  // Required
  printerId?: number;                // Optional
  title: string;                     // Required, 1-120 chars
  description?: string;              // Max 2000 chars
  status: JobStatus;                 // QUEUED|PRINTING|PAUSED|COMPLETED|CANCELLED
  priority: JobPriority;             // NORMAL|FAST_TRACK|URGENT
  queuePosition: number;
  estimatedHours?: number;           // 0-1000
  actualHours?: number;
  startedAt?: Date;
  completedAt?: Date;
  notes?: string;                    // Max 2000 chars
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Printer Model
```typescript
interface Printer {
  id: number;
  name: string;                      // Required, min 1 char
  model?: string;
  buildVolume?: string;
  status: PrinterStatus;             // ACTIVE|MAINTENANCE|OFFLINE
  notes?: string;
  lastMaintenanceAt?: Date;
  maintenanceNote?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Material Model
```typescript
interface Material {
  id: number;
  name: string;                      // Required, min 1 char
  color?: string;
  category?: string;
  costPerGram: number;               // Required, min 0
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Product Template Model
```typescript
interface ProductTemplate {
  id: number;
  name: string;                      // Required, min 1 char
  description?: string;
  unit: string;                      // Required, min 1 char, default "unit"
  pricingType: PricingType;          // FIXED|CALCULATED
  basePrice?: number;                // Min 0, required if FIXED pricing
  calculatorConfig?: {               // Required if CALCULATED pricing
    baseHours: number;               // Min 0, default 1
    materialGrams: number;           // Min 0, default 0
    quality: string;                 // Default "standard"
    infill: string;                  // Default "medium"
  };
  materialId?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Payment Model
```typescript
interface Payment {
  id: number;
  invoiceId: number;                 // Required
  method: PaymentMethod;             // STRIPE|BANK_TRANSFER|CASH|OTHER
  amount: number;                    // Required, min 0.01
  currency: string;                  // Default "AUD"
  reference?: string;
  processor?: string;
  processorId?: string;
  notes?: string;
  paidAt: Date;                      // Required
  metadata?: object;
  createdAt: Date;
  updatedAt: Date;
}
```

### Validation Rules Summary

- **String fields**: Most optional strings accept empty strings
- **Numeric fields**: Amounts and prices must be >= 0, quantities must be > 0
- **Arrays**: Quote/Invoice lines require at least 1 item
- **Dates**: Accept ISO date strings, automatically parsed
- **Enums**: Must match exact values from schema definitions
- **Files**: Max 200MB, limited file types for attachments
- **IDs**: Must be positive integers when provided

---

## Rate Limiting & Performance

Currently no rate limiting is implemented. For production use, consider:
- Implementing rate limiting per IP/user
- Adding request caching for read operations
- Implementing pagination for large datasets
- Adding database connection pooling

## Security Considerations

- No authentication currently implemented
- All endpoints are publicly accessible
- File uploads accept specific MIME types but additional validation recommended
- SQL injection protection via Prisma ORM
- Input validation via Zod schemas

For production deployment, implement:
- JWT or session-based authentication
- Role-based access control (RBAC)
- API key authentication for external integrations
- Request signing for sensitive operations
- HTTPS enforcement
- CORS configuration