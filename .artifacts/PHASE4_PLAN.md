# 🚀 CONTINUATION PLAN: Phase 4 - Contacts Module
**Date**: 2026-02-10 00:07 IST  
**Current Progress**: 42% Platform Complete  
**Next Phase**: Contacts Module (4-5 hours)

---

## 📊 CURRENT STATUS

### ✅ Completed (42%):
- **Phase 1**: Security Hardening (100%)
- **Phase 2**: WhatsApp Integration (100%)
- **Phase 3**: Client Dashboard (100%)

### 🎯 Next Up (Phase 4):
**Contacts Module** - Complete contact management system

---

## 🎯 PHASE 4: CONTACTS MODULE

### Overview:
Build a complete contact management system for tenants to manage their WhatsApp contacts, including import/export, segmentation, and custom fields.

### Time Estimate: 4-5 hours

---

## 📋 TASK BREAKDOWN

### Task 4.1: Contact Entity & Repository (1 hour)

**Backend Files to Create**:
1. `backend/src/contacts/entities/contact.entity.ts`
   - Contact schema with fields
   - Tenant relationship
   - Timestamps

2. `backend/src/contacts/repositories/contact.repository.ts`
   - Extends BaseTenantRepository
   - Custom query methods
   - Bulk operations

3. `backend/src/contacts/dto/contact.dto.ts`
   - CreateContactDto
   - UpdateContactDto
   - ContactResponseDto
   - BulkImportDto

**Features**:
- ✅ Phone number (required, unique per tenant)
- ✅ Name (first + last)
- ✅ Email (optional)
- ✅ Tags (array)
- ✅ Custom fields (JSON)
- ✅ Status (active, blocked, unsubscribed)
- ✅ Tenant isolation
- ✅ Soft delete support

---

### Task 4.2: Contact CRUD Operations (1.5 hours)

**Backend Files to Create**:
1. `backend/src/contacts/contacts.service.ts`
   - Create contact
   - Update contact
   - Delete contact
   - Get contact by ID
   - List contacts (paginated)
   - Search contacts
   - Bulk import from CSV
   - Bulk export to CSV

2. `backend/src/contacts/contacts.controller.ts`
   - POST /api/contacts - Create
   - GET /api/contacts - List (paginated)
   - GET /api/contacts/:id - Get one
   - PATCH /api/contacts/:id - Update
   - DELETE /api/contacts/:id - Delete
   - POST /api/contacts/import - Bulk import
   - GET /api/contacts/export - Bulk export
   - GET /api/contacts/search - Search

3. `backend/src/contacts/contacts.module.ts`
   - Module configuration
   - Import TypeORM
   - Export service

**Features**:
- ✅ Full CRUD operations
- ✅ Pagination (limit, offset)
- ✅ Sorting (by name, created date, etc.)
- ✅ Filtering (by tags, status)
- ✅ Search (by name, phone, email)
- ✅ CSV import/export
- ✅ Validation
- ✅ Error handling

---

### Task 4.3: Contact Segmentation (1 hour)

**Backend Files to Create**:
1. `backend/src/contacts/entities/segment.entity.ts`
   - Segment schema
   - Filter rules (JSON)
   - Tenant relationship

2. `backend/src/contacts/dto/segment.dto.ts`
   - CreateSegmentDto
   - UpdateSegmentDto
   - SegmentResponseDto

3. Update `contacts.service.ts`:
   - Create segment
   - Update segment
   - Delete segment
   - Get segment contacts
   - Dynamic filtering

4. Update `contacts.controller.ts`:
   - POST /api/contacts/segments - Create
   - GET /api/contacts/segments - List
   - GET /api/contacts/segments/:id - Get one
   - PATCH /api/contacts/segments/:id - Update
   - DELETE /api/contacts/segments/:id - Delete
   - GET /api/contacts/segments/:id/contacts - Get contacts

**Features**:
- ✅ Create segments with filter rules
- ✅ Dynamic contact filtering
- ✅ Multiple filter conditions (AND/OR)
- ✅ Filter by tags, status, custom fields
- ✅ Real-time contact count
- ✅ Segment preview

---

### Task 4.4: Frontend Contact UI (1.5 hours)

**Frontend Files to Create**:
1. `frontend/src/lib/contacts-service.ts`
   - API calls for contacts
   - Import/export functions

2. `frontend/src/app/dashboard/contacts/page.tsx`
   - Contact list view
   - Search and filters
   - Pagination
   - Import/export buttons
   - Create contact button

3. `frontend/src/app/dashboard/contacts/[id]/page.tsx`
   - Contact detail view
   - Edit contact form
   - Contact history
   - Delete button

4. `frontend/src/app/dashboard/contacts/new/page.tsx`
   - Create contact form
   - Validation
   - Submit handler

5. `frontend/src/components/contact-table.tsx`
   - Table component
   - Sortable columns
   - Row actions (edit, delete)
   - Bulk selection

6. `frontend/src/components/contact-form.tsx`
   - Reusable form component
   - Field validation
   - Tag input
   - Custom fields

7. `frontend/src/components/import-contacts-modal.tsx`
   - CSV upload
   - Field mapping
   - Preview
   - Import progress

**Features**:
- ✅ Beautiful contact list with table
- ✅ Search and filter UI
- ✅ Pagination controls
- ✅ Create/edit contact forms
- ✅ CSV import modal
- ✅ CSV export button
- ✅ Contact detail page
- ✅ Tag management
- ✅ Bulk actions

---

## 🎨 DESIGN MOCKUP

### Contact List Page:
```
┌─────────────────────────────────────────────────────────┐
│  Contacts                                    [+ New]     │
├─────────────────────────────────────────────────────────┤
│  [Search...] [Filter ▼] [Tags ▼]  [Import] [Export]    │
├─────────────────────────────────────────────────────────┤
│  ☐  Name          Phone         Email        Tags       │
│  ☐  John Doe      +1234567890   john@...     VIP        │
│  ☐  Jane Smith    +0987654321   jane@...     Lead       │
│  ☐  Bob Johnson   +1122334455   bob@...      Customer   │
├─────────────────────────────────────────────────────────┤
│  Showing 1-10 of 234            [< 1 2 3 4 5 >]         │
└─────────────────────────────────────────────────────────┘
```

### Contact Detail Page:
```
┌─────────────────────────────────────────────────────────┐
│  ← Back to Contacts                        [Edit] [Del] │
├─────────────────────────────────────────────────────────┤
│  John Doe                                                │
│  +1234567890 • john@example.com                         │
│  Tags: VIP, Customer                                     │
├─────────────────────────────────────────────────────────┤
│  Custom Fields:                                          │
│  Company: Acme Inc                                       │
│  Birthday: 1990-01-01                                    │
├─────────────────────────────────────────────────────────┤
│  Recent Activity:                                        │
│  • Message sent - 2 hours ago                           │
│  • Added to segment "VIP Customers" - 1 day ago         │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 DATABASE SCHEMA

### contacts table:
```sql
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    phone_number VARCHAR(20) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    tags TEXT[],
    custom_fields JSONB,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,
    UNIQUE(tenant_id, phone_number)
);

CREATE INDEX idx_contacts_tenant ON contacts(tenant_id);
CREATE INDEX idx_contacts_phone ON contacts(phone_number);
CREATE INDEX idx_contacts_status ON contacts(status);
CREATE INDEX idx_contacts_tags ON contacts USING GIN(tags);
```

### segments table:
```sql
CREATE TABLE contact_segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    filter_rules JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_segments_tenant ON contact_segments(tenant_id);
```

---

## 🧪 TESTING CHECKLIST

### Backend:
- [ ] Create contact
- [ ] Update contact
- [ ] Delete contact
- [ ] List contacts (paginated)
- [ ] Search contacts
- [ ] Import CSV
- [ ] Export CSV
- [ ] Create segment
- [ ] Get segment contacts
- [ ] Tenant isolation

### Frontend:
- [ ] Contact list displays
- [ ] Search works
- [ ] Filters work
- [ ] Pagination works
- [ ] Create contact form
- [ ] Edit contact form
- [ ] Delete contact
- [ ] Import CSV modal
- [ ] Export CSV
- [ ] Contact detail page

---

## 📈 EXPECTED PROGRESS

**After Phase 4**:
- Platform: **52%** complete (up from 42%)
- Backend: **75%** complete
- Frontend: **75%** complete

**Remaining Phases**:
- Phase 5: Super Admin Dashboard (6-8 hours)
- Phase 6: Campaigns Module (8-10 hours)
- Phase 7: Analytics & Reports (6-8 hours)
- Phase 8: Settings & Configuration (4-5 hours)

---

## 🎯 SUCCESS CRITERIA

Phase 4 is complete when:
- ✅ Contacts can be created, edited, deleted
- ✅ Contact list with search and filters
- ✅ CSV import/export working
- ✅ Segments can be created
- ✅ Segment filtering works
- ✅ Beautiful UI for all contact pages
- ✅ Zero compilation errors
- ✅ All tests passing

---

## 💡 IMPLEMENTATION NOTES

### CSV Import Format:
```csv
phone_number,first_name,last_name,email,tags
+1234567890,John,Doe,john@example.com,"VIP,Customer"
+0987654321,Jane,Smith,jane@example.com,"Lead"
```

### Segment Filter Rules (JSON):
```json
{
  "operator": "AND",
  "conditions": [
    { "field": "tags", "operator": "contains", "value": "VIP" },
    { "field": "status", "operator": "equals", "value": "active" }
  ]
}
```

### API Response Format:
```json
{
  "data": [...],
  "meta": {
    "total": 234,
    "page": 1,
    "limit": 10,
    "totalPages": 24
  }
}
```

---

## 🚀 READY TO START?

**Phase 4 will give tenants**:
- ✅ Complete contact management
- ✅ Import contacts from CSV
- ✅ Export contacts to CSV
- ✅ Create segments for targeting
- ✅ Search and filter contacts
- ✅ Tag management
- ✅ Custom fields

**This is essential for WhatsApp campaigns!**

---

**Status**: 🟢 Ready to Start Phase 4  
**Estimated Time**: 4-5 hours  
**Next File**: `backend/src/contacts/entities/contact.entity.ts`

**Let's build the Contacts Module! 🚀**
