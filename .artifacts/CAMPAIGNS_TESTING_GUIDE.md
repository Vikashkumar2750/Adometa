# 🧪 CAMPAIGNS TESTING GUIDE
**Date**: 2026-02-10 23:24 IST  
**Status**: Ready for Testing

---

## 🎯 SETUP INSTRUCTIONS

### Step 1: Run Database Migration

**Option A: Using psql (Recommended)**
```bash
# Navigate to backend directory
cd c:\Users\Wall\Desktop\adometa.techaasvik.in\backend

# Run the migration SQL file
psql -U postgres -d whatsapp_saas -f migrations/002_campaigns.sql
```

**Option B: Using pgAdmin**
1. Open pgAdmin
2. Connect to your database
3. Open Query Tool
4. Copy contents of `backend/migrations/002_campaigns.sql`
5. Execute the query

**Option C: Using DBeaver/DataGrip**
1. Open your SQL client
2. Connect to the database
3. Open and execute `backend/migrations/002_campaigns.sql`

### Step 2: Verify Table Creation

```sql
-- Check if campaigns table exists
SELECT * FROM information_schema.tables 
WHERE table_name = 'campaigns';

-- Check table structure
\d campaigns

-- Verify indexes
SELECT indexname FROM pg_indexes 
WHERE tablename = 'campaigns';
```

---

## 🔌 API TESTING

### Using Thunder Client / Postman

#### 1. Create a Campaign

**Request**:
```http
POST http://localhost:5000/campaigns
Content-Type: application/json

{
  "name": "Summer Sale 2024",
  "description": "Promotional campaign for summer sale",
  "templateId": "template-1",
  "segmentId": "segment-1",
  "scheduledAt": "2024-02-15T10:00:00Z"
}
```

**Expected Response** (201 Created):
```json
{
  "id": "uuid-here",
  "name": "Summer Sale 2024",
  "description": "Promotional campaign for summer sale",
  "templateId": "template-1",
  "segmentId": "segment-1",
  "status": "scheduled",
  "scheduledAt": "2024-02-15T10:00:00.000Z",
  "totalRecipients": 0,
  "sentCount": 0,
  "deliveredCount": 0,
  "readCount": 0,
  "failedCount": 0,
  "createdAt": "2024-02-10T17:54:00.000Z",
  "updatedAt": "2024-02-10T17:54:00.000Z"
}
```

#### 2. List All Campaigns

**Request**:
```http
GET http://localhost:5000/campaigns?page=1&limit=10
```

#### 3. Get Campaign by ID

**Request**:
```http
GET http://localhost:5000/campaigns/{campaign-id}
```

#### 4. Start Campaign

**Request**:
```http
POST http://localhost:5000/campaigns/{campaign-id}/start
```

#### 5. Get Statistics

**Request**:
```http
GET http://localhost:5000/campaigns/statistics
```

---

## ✅ TESTING CHECKLIST

### Backend API:
- [ ] Database migration executed successfully
- [ ] campaigns table created with all fields
- [ ] POST /campaigns - Create campaign
- [ ] GET /campaigns - List campaigns
- [ ] GET /campaigns/:id - Get campaign
- [ ] PATCH /campaigns/:id - Update campaign
- [ ] DELETE /campaigns/:id - Delete campaign
- [ ] POST /campaigns/:id/start - Start campaign
- [ ] POST /campaigns/:id/pause - Pause campaign
- [ ] GET /campaigns/statistics - Get stats

### Frontend:
- [ ] Campaigns list loads data from API
- [ ] Create campaign wizard works
- [ ] Campaign detail page loads
- [ ] Start/pause buttons work
- [ ] Statistics display correctly

---

**Status**: 🟢 Ready for Testing!  
**Last Updated**: 2026-02-10 23:24 IST

**LET'S TEST THE CAMPAIGNS MODULE! 🚀**
