# Fleetwise AI - Complete Project Overview

## Executive Summary

**Fleetwise AI** is a comprehensive fleet diagnostic and repair management system designed for heavy-duty truck service shops. It combines traditional fleet management features with AI-powered diagnostic assistance, creating an intelligent workflow system for technicians, supervisors, and office managers.

**Status:** Production-Ready MVP+ (~75% complete)
**Architecture:** FastAPI (Python) Backend + React Frontend + Supabase PostgreSQL Database
**Key Innovation:** Conversational AI diagnostic agent that guides technicians through repairs step-by-step

---

## System Architecture

### Technology Stack

**Backend:**
- **Framework:** FastAPI (Python)
- **Database:** Supabase (PostgreSQL) - migrated from MongoDB
- **Authentication:** Supabase Auth (JWT tokens)
- **AI/LLM:** OpenAI GPT-5.1, GPT-5.1-Reasoning, o2-mini via emergentintegrations
- **Voice:** OpenAI Whisper (STT), OpenAI TTS (disabled)
- **Web Search:** Perplexity API integration
- **PDF Processing:** PyPDF2
- **Other:** httpx, asyncio, bcrypt

**Frontend:**
- **Framework:** React 19.0
- **Routing:** React Router v7
- **UI Library:** Radix UI components + Tailwind CSS
- **State Management:** React Context (AuthContext)
- **HTTP Client:** Axios
- **Charts:** Recharts
- **Forms:** React Hook Form + Zod validation

**Database:**
- **Provider:** Supabase (PostgreSQL)
- **Features:** Row Level Security (RLS), JSONB for flexible schemas
- **Migration:** Complete migration from MongoDB using wrapper pattern

---

## Core Database Schema

### Primary Tables

1. **companies** - Multi-tenant company/organization data
2. **users** - User profiles linked to Supabase Auth
3. **customers** - Customer/client information
4. **trucks** - Comprehensive vehicle profiles with JSONB for technical specs
5. **projects** - Work orders/repair orders
6. **estimates** - Pre-approval pricing documents
7. **invoices** - Billing documents
8. **parts_catalog** - Inventory management
9. **tasks** - Shop floor task management (Phase 22)
10. **knowledge_base** - Curated shop knowledge/tribal knowledge
11. **diagnostic_sessions** - AI chat session data
12. **work_order_summaries** - Generated summaries
13. **warranty_analyses** - Warranty recovery opportunities

### Key Relationships

```
companies (1) ──→ (many) users
companies (1) ──→ (many) trucks
companies (1) ──→ (many) customers
companies (1) ──→ (many) projects
trucks (1) ──→ (many) projects
customers (1) ──→ (many) trucks
projects (1) ──→ (1) estimates (optional)
projects (1) ──→ (1) invoices (optional)
```

---

## Authentication & Authorization

### Authentication Flow

1. **Registration:** Public registration creates company + Supabase Auth user + user profile
2. **Login:** Supabase Auth sign-in returns JWT token
3. **Token Validation:** Backend validates JWT with Supabase on each request
4. **User Context:** Token contains user_id, company_id, role

### Role-Based Access Control (RBAC)

**Roles:**
- `master_admin` - Full system access, all companies
- `company_admin` - Full access to their company
- `office_manager` - Office operations, estimates, invoices
- `shop_supervisor` - Shop floor management, diagnostics
- `technician` - Read access, can create/update projects, diagnostics

**Permission Matrix:** Defined in `Permission` class with resource/action granularity

### Security Features

- Row Level Security (RLS) in Supabase
- Company-level data isolation
- Audit logging for unauthorized access attempts
- JWT token expiration (480 minutes default)
- Password hashing with bcrypt

---

## Backend API Structure

### API Router: `/api`

**176+ Endpoints** organized by domain:

#### Authentication (`/auth`)
- `POST /auth/register` - Public registration
- `POST /auth/login` - User login
- `GET /auth/me` - Current user info

#### Companies (`/companies`)
- CRUD operations for company management

#### Trucks (`/trucks`)
- `POST /trucks` - Create truck with comprehensive specs
- `GET /trucks` - List trucks (filtered by company)
- `GET /trucks/{id}` - Get truck details
- `PUT /trucks/{id}` - Update truck
- `DELETE /trucks/{id}` - Delete truck
- `POST /trucks/bulk-import` - CSV bulk import
- `POST /trucks/enrich-import` - AI-powered data enrichment

#### Projects/Work Orders (`/projects`, `/work-orders`)
- `POST /projects` - Create work order
- `GET /projects` - List work orders
- `GET /projects/{id}` - Get work order details
- `POST /projects/{id}/parts` - Add parts to work order
- `POST /projects/{id}/labor` - Add labor to work order
- `POST /work-orders/upload-pdf` - Extract data from PDF
- `POST /work-orders/{id}/complete` - Complete work order

#### Diagnostics (`/diagnostics`)
- `POST /diagnostics/generate` - Generate AI diagnostic steps
- `POST /diagnostics/save-notes` - Save technician notes

#### Conversational Diagnostics (`/diagnostics/chat`)
- `POST /diagnostics/chat/start` - Start conversational session
- `POST /diagnostics/chat/message` - Send message to AI agent
- `GET /diagnostics/chat/{session_id}` - Get session state

#### Estimates (`/estimates`)
- `POST /estimates` - Create estimate
- `GET /estimates` - List estimates
- `POST /estimates/{id}/send` - Send to customer
- `POST /estimates/{id}/approve` - Approve estimate

#### Invoices (`/invoices`)
- `POST /invoices` - Create invoice
- `GET /invoices` - List invoices
- `POST /invoices/{id}/send` - Send invoice
- `POST /invoices/{id}/mark-paid` - Mark as paid

#### Parts (`/parts`)
- CRUD operations for parts catalog
- `POST /parts/{id}/adjust-inventory` - Inventory adjustments

#### Preventive Maintenance (`/pm`)
- Templates: CRUD for PM templates
- Schedules: Create, list, complete PM schedules
- `GET /pm/schedules/upcoming` - Upcoming PMs
- `GET /pm/schedules/overdue` - Overdue PMs

#### Warranty (`/warranty`)
- `POST /warranty/analyze` - AI warranty opportunity analysis
- `GET /warranty/list` - List warranty opportunities
- `POST /warranty/claims` - Create warranty claim
- `GET /warranty/auto-detect` - Auto-detect warranty opportunities

#### Knowledge Base (`/knowledge-base`)
- CRUD for knowledge articles
- `POST /knowledge-base/{id}/vote` - Vote on article
- `GET /knowledge-base/search/fault-code/{code}` - Search by fault code

#### Voice (`/voice`)
- `POST /voice/transcribe` - Speech-to-text (Whisper)
- `POST /voice/speak` - Text-to-speech (disabled)
- `POST /voice/diagnostic-answer` - Voice Q&A

#### Summaries (`/summary`)
- `POST /summary/generate` - Generate work order summary
- `POST /summary/generate-pdf/{id}` - Generate PDF summary

#### Shop Floor Operations (Phase 22)
- Tasks: Task management system
- Safety: Safety checklists and incidents
- Shift Handoff: Shift transition management
- Time Tracking: Clock in/out
- Equipment Checkout: Tool/equipment tracking
- Quality Checks: Quality assurance
- Team Messages: Internal messaging

---

## AI Diagnostic System

### Conversational Diagnostic Agent

**Core Component:** `conversational_diagnostic_agent.py`

**How It Works:**

1. **Session Initialization:**
   - Creates `DiagnosticSession` with project context
   - Fetches truck profile, repair history, approved knowledge base entries
   - Builds comprehensive context for AI

2. **Conversational Flow:**
   - Technician sends messages (text or voice)
   - AI responds with step-by-step guidance
   - Auto-captures readings, parts, actions from conversation
   - Validates measurements against specs
   - Transitions phases: initial → diagnosis → repair → verification

3. **AI Models Used:**
   - **Primary:** GPT-5.1 (conversational guidance)
   - **Validation:** GPT-5.1-Reasoning (critical validations)
   - **Extraction:** o2-mini (data extraction from messages)

4. **Knowledge Integration:**
   - Fetches approved knowledge base entries for company
   - Injects "tribal knowledge" into AI context
   - References shop-specific proven fixes

5. **Data Capture:**
   - Automatically extracts voltage, pressure, temperature readings
   - Identifies part numbers mentioned
   - Tracks completed steps
   - Captures photos and analyzes them

### Traditional Diagnostic Generation

**Endpoint:** `POST /diagnostics/generate`

**Process:**
1. Retrieves truck context and repair history
2. Performs web research on fault codes (Perplexity API)
3. Generates structured diagnostic steps using GPT-5.1
4. Returns step-by-step procedure with:
   - Detailed instructions
   - Expected results
   - Tools required
   - Safety notes
   - Reference links

**Fallback:** If AI service fails, returns basic diagnostic template

---

## Frontend Architecture

### Page Structure (65+ Pages)

**Authentication:**
- `Login.js` - User login

**Dashboards:**
- `Dashboard.js` - Main admin dashboard (role-based routing)
- `SupervisorDashboard.js` - Shop supervisor view
- `TechnicianMobile.js` - Mobile-optimized technician interface
- `ShopDashboard.js` - Shop operations dashboard
- `OfficePipelineKanban.js` - Office pipeline Kanban board

**Truck Management:**
- `TruckList.js` - List all trucks
- `TruckCreate.js` - Create/edit truck
- `TruckDetail.js` - Comprehensive truck profile
- `TruckBulkImport.js` - CSV bulk import
- `EnrichImportEnhanced.js` - AI-powered data enrichment

**Work Orders:**
- `ProjectList.js` - List work orders
- `ProjectCreate.js` - Create work order
- `ProjectDetail.js` - Work order details with diagnostics
- `WorkOrderBoard.js` - Kanban board view
- `WorkOrderUpload.js` - PDF upload and extraction
- `WorkOrderReview.js` - Review completed work orders
- `WorkOrderCompletions.js` - List completed work orders

**Customers:**
- `CustomerList.js` - List customers
- `CustomerCreate.js` - Create/edit customer
- `CustomerDetail.js` - Customer profile with trucks/invoices

**Estimates:**
- `EstimateList.js` - List estimates
- `EstimateCreate.js` - Create estimate from project
- `EstimateCreateStandalone.js` - Create standalone estimate
- `EstimateDetail.js` - Estimate details with approval workflow

**Invoices:**
- `InvoiceList.js` - List invoices
- `InvoiceCreate.js` - Create invoice from project
- `InvoiceDetail.js` - Invoice details

**Parts:**
- `PartsCatalog.js` - Parts inventory management
- `PartsQueue.js` - Parts request queue

**Preventive Maintenance:**
- `PMDashboard.js` - PM overview
- `PMTemplates.js` - PM template management

**Warranty:**
- `WarrantyDashboard.js` - Warranty opportunities
- `WarrantyClaimsList.js` - Warranty claims list
- `WarrantyClaimCreate.js` - Create warranty claim

**Reports:**
- `Reports.js` - Report selection
- `RevenueReport.js` - Revenue analytics
- `WorkOrderStatusReport.js` - Work order status report
- `FleetHealthReport.js` - Fleet health metrics
- `CustomerValueReport.js` - Customer lifetime value

**Knowledge Base:**
- `KnowledgeBase.js` - Browse knowledge articles
- `KnowledgeSubmit.js` - Submit knowledge entry
- `KnowledgeCuratorQueue.js` - Curate submissions

**Shop Operations:**
- `SafetyManagement.js` - Safety checklists and incidents
- `ShopOperations.js` - Shop operations overview
- `InventoryManagement.js` - Inventory tracking
- `Calendar.js` - Calendar view
- `ShiftHandoff.js` - Shift handoff management
- `TeamMessages.js` - Team messaging
- `NonBillableTime.js` - Time tracking

**Settings:**
- `Settings.js` - Company settings
- `TeamManagement.js` - Team member management
- `ActivityFeed.js` - System activity feed

### Key Components (29 Components)

**Navigation & UI:**
- `Navigation.js` - Main navigation with dropdowns
- `GlobalSearch.js` - Universal search across entities
- `NotificationCenter.js` - Real-time notifications
- `KeyboardShortcuts.js` - 25+ keyboard shortcuts
- `AlertsWidget.js` - Smart alerts widget

**Diagnostics:**
- `DiagnosticChatInterface.js` - Conversational AI interface
- `DiagnosticContextPanel.js` - Context panel
- `VoiceInput.js` - Voice input component

**Work Order:**
- `PartSelectorModal.js` - Add parts to work order
- `LaborEntryModal.js` - Add labor to work order
- `PartsRequestModal.js` - Request parts
- `EditableExtraction.js` - Edit PDF-extracted data

**Trucks:**
- `TruckActivityTimeline.js` - Visual repair history
- `TruckHealthBadge.js` - Health score display
- `VINScanner.js` - VIN barcode scanner

**Utilities:**
- `AdvancedFilterPanel.js` - Advanced filtering
- `ExportActions.js` - Export to PDF/CSV/JSON
- `BatchOperations.js` - Bulk operations
- `QuickActionsPanel.js` - Quick action buttons
- `RoleGuard.js` - Route protection by role
- `ErrorBoundary.js` - Error handling

**UI Kit:** 30+ Radix UI components in `components/ui/`

---

## Key Features

### 1. AI-Powered Diagnostics

**Conversational Agent:**
- Step-by-step guidance like a senior technician
- Validates readings in real-time
- Auto-captures data from conversation
- References shop knowledge base
- Photo analysis capabilities

**Traditional Diagnostics:**
- Structured step-by-step procedures
- Web research integration (TSBs, forums, manuals)
- Fault code interpretation
- Estimated time and difficulty

### 2. Work Order Management

**Lifecycle:**
- Draft → In Progress → Waiting for Parts → Ready → Completed → Closed
- Status tracking with timestamps
- Assignment to technicians
- Priority levels (urgent, high, normal, low)

**PDF Import:**
- Upload work order PDF
- AI extracts: VIN, complaint, fault codes, customer info
- Auto-creates truck if not exists
- Creates work order from extraction

**Parts & Labor:**
- Add parts from catalog
- Track labor hours and rates
- Auto-calculate totals
- Generate estimates and invoices

### 3. Truck Profiles

**Comprehensive Data:**
- Identity: VIN, year, make, model, truck number
- Engine: Manufacturer, model, serial, specs
- Transmission: Type, model, ratios
- Emissions: DPF, SCR, DEF systems
- Electronics: ECM, TCM, ABS systems
- Maintenance: Mileage, service history, PM schedule

**Health Scoring:**
- Calculated based on repair frequency
- Visual health badge
- Activity timeline showing all repairs

**Data Enrichment:**
- AI-powered enrichment from minimal input
- VIN decode integration (NHTSA API)
- Bulk import from CSV/AS400

### 4. Customer Management

**Features:**
- Full CRUD operations
- Links to trucks, work orders, invoices
- Revenue tracking per customer
- Customer lifetime value calculations

### 5. Estimates & Invoices

**Estimates:**
- Create from work order or standalone
- Status: Draft → Sent → Approved/Declined
- Auto-calculate from parts and labor
- Send to customer for approval

**Invoices:**
- Convert approved estimate to invoice
- Or create directly from work order
- Status: Draft → Sent → Paid
- Export to CSV/PDF

### 6. Preventive Maintenance

**Templates:**
- Reusable PM templates
- Define tasks, intervals (miles/hours/days)
- Estimated labor and parts cost

**Schedules:**
- Assign templates to trucks
- Track upcoming and overdue PMs
- Complete PM and create work order

### 7. Warranty Recovery

**AI Analysis:**
- Analyzes work order for warranty opportunities
- Identifies manufacturer warranty coverage
- Estimates recovery amount
- Suggests next steps

**Claims Management:**
- Create warranty claims
- Track claim status
- Generate claim PDFs
- Auto-detect opportunities

### 8. Knowledge Base

**Tribal Knowledge:**
- Technicians submit knowledge entries
- Curators approve/reject
- AI references approved knowledge in diagnostics
- Searchable by fault code, category, tags
- Usage tracking

### 9. Shop Floor Operations (Phase 22)

**Task Management:**
- Create tasks from work orders
- Assign to technicians
- Track status: Assigned → In Progress → Completed → Reviewed
- Comments and collaboration

**Safety:**
- Safety checklists
- Incident reporting
- PPE verification

**Shift Handoff:**
- Document active projects
- Note equipment issues
- Priority instructions for next shift

**Time Tracking:**
- Clock in/out for tasks
- Track billable vs non-billable time
- Generate time reports

### 10. Reporting & Analytics

**Reports:**
- Revenue reports (by date range, customer, truck)
- Work order status reports
- Fleet health reports
- Customer value reports

**Dashboard Metrics:**
- Total trucks, work orders, invoices
- In-progress vs completed
- Unpaid invoices value
- Upcoming/overdue PMs
- Low stock parts alerts

---

## Data Flow Examples

### Creating a Work Order from PDF

1. User uploads PDF to `/work-orders/upload-pdf`
2. Backend extracts text using PyPDF2
3. AI (o2-mini) extracts structured data (VIN, complaint, codes)
4. Frontend displays extracted data in `EditableExtraction` component
5. User confirms/edits data
6. Backend checks if truck exists (by VIN)
7. If not, creates truck with VIN decode data
8. Creates work order with extracted data
9. Redirects to work order detail page

### Starting AI Diagnostic

1. User clicks "Start AI Diagnostic" on work order
2. Frontend calls `POST /diagnostics/chat/start`
3. Backend:
   - Creates `DiagnosticSession`
   - Fetches truck profile and repair history
   - Fetches approved knowledge base entries
   - Builds context for AI
   - Sends initial prompt to GPT-5.1
4. Returns session_id and initial message
5. Frontend displays `DiagnosticChatInterface`
6. User sends messages → Backend processes with AI → Returns response
7. AI auto-captures readings, parts, actions
8. Session state saved to `diagnostic_sessions` table

### Generating Work Order Summary

1. User clicks "Generate Summary" on completed work order
2. Frontend calls `POST /summary/generate`
3. Backend:
   - Retrieves work order, truck, parts, labor
   - Retrieves diagnostic session data
   - Sends to GPT-5.1 with Complaint/Cause/Correction format
4. Returns formatted summary
5. Can generate PDF using `POST /summary/generate-pdf/{id}`

---

## Error Handling & Resilience

### AI Service Failures

**Retry Logic:**
- Exponential backoff (3 retries)
- Timeout handling (15 seconds)
- Handles 502, 503, 429 errors
- Budget exceeded detection

**Fallbacks:**
- `get_fallback_diagnostic()` - Basic diagnostic steps
- `get_fallback_summary()` - Simple summary template
- `get_fallback_warranty()` - Basic warranty info

### Database Wrapper

**MongoDB → Supabase Migration:**
- `db_wrapper.py` provides MongoDB-compatible interface
- Routes all calls to Supabase
- Converts MongoDB operators to Supabase queries
- Allows gradual migration without rewriting code

---

## Environment Variables

**Backend (.env):**
```
SUPABASE_URL=https://...
SUPABASE_SERVICE_KEY=...
SUPABASE_ANON_KEY=...
JWT_SECRET_KEY=...
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=480
EMERGENT_LLM_KEY=... (or OPENAI_API_KEY)
PERPLEXITY_API_KEY=...
NHTSA_API_BASE_URL=https://vpic.nhtsa.dot.gov/api
```

**Frontend (.env):**
```
REACT_APP_BACKEND_URL=http://localhost:8000
REACT_APP_SUPABASE_URL=https://...
REACT_APP_SUPABASE_ANON_KEY=...
```

---

## Development Workflow

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install (or yarn install)
npm start (or yarn start)
```

### Database

- Supabase dashboard: https://dphydlneamkkmraxjuxi.supabase.co
- Run `supabase_schema.sql` in SQL Editor
- Configure RLS policies

---

## Testing

**Test Files:**
- `comprehensive_backend_test.py` - Full backend test suite
- `ai_features_test.py` - AI feature testing
- `fallback_test.py` - Fallback mechanism testing
- Various focused test files for specific features

---

## Future Roadmap

**Phase 11-15 (In Progress):**
- Advanced analytics with charts
- Enhanced warranty recovery engine
- Work order summary builder with Google Docs
- Full bidirectional voice agent
- Data import tools (AS/400, Excel)

**Phase 16-20 (Planned):**
- Telematics integration
- Predictive maintenance AI
- Multi-shop management
- Smart dispatching
- DOT compliance suite

---

## Key Design Decisions

1. **Supabase over MongoDB:** Better relational structure, RLS, real-time capabilities
2. **Conversational AI:** More natural than structured steps, captures context
3. **Knowledge Base Integration:** Leverages shop-specific expertise
4. **Multi-tenant:** Company-level isolation for security
5. **Role-based Access:** Granular permissions for different user types
6. **Progressive Enhancement:** Works without AI (fallbacks), enhanced with AI

---

## Code Quality

- **Type Safety:** Pydantic models for request/response validation
- **Error Handling:** Comprehensive try/catch with logging
- **Logging:** Structured logging throughout
- **Documentation:** Docstrings on major functions
- **Security:** RLS, JWT validation, company isolation
- **Performance:** Async/await, parallel API calls, efficient queries

---

## Conclusion

Fleetwise AI is a sophisticated fleet management system that combines traditional shop management with cutting-edge AI assistance. The conversational diagnostic agent is the crown jewel, providing technicians with expert guidance while automatically capturing all diagnostic data. The system is production-ready for core features and continues to evolve with advanced analytics and integrations.

**Total Lines of Code:** ~50,000+ lines
**API Endpoints:** 176+
**Frontend Pages:** 65+
**Components:** 29+
**Database Tables:** 20+

