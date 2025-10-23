# Onboarding & Automation Architecture Plan

## Overview
This document outlines the onboarding improvements and external automation architecture for the SS K.I.N.D. platform.

## External Integration Architecture

### System Components
1. **Circle.so Community** - Gated community platform with paywall
2. **Samcart** - Payment processing and access management
3. **GHL (Go High Level)** - CRM system
4. **n8n** - Workflow automation platform
5. **Hostinger VPS** - Backend server hosting
6. **React Frontend** - Embedded in Circle.so iframe

### Access Flow
```
User Purchase (Samcart)
    ↓
Payment Confirmation
    ↓
GHL CRM (User Record Created/Updated)
    ↓
n8n Automation Trigger
    ↓
Access Token/Session Created
    ↓
Circle.so Grants Access
    ↓
User Accesses App (Iframe)
    ↓
Backend API Validates Token
    ↓
User Authenticated in App
```

### Security Considerations
- **Iframe Embedding**: Proper CORS and CSP headers required
- **Token Validation**: Backend must validate tokens from external auth providers
- **Session Management**: Must work across iframe boundary
- **Webhook Endpoints**: Needed to receive auth events from Samcart/GHL

### Backend API Requirements
1. **Webhook Endpoints** (to be implemented):
   - `/api/webhooks/samcart` - Receive purchase events
   - `/api/webhooks/ghl` - Receive CRM events
   - `/api/webhooks/circle` - Receive access events

2. **Auth Endpoints** (to be implemented):
   - `/api/auth/validate-external-token` - Validate tokens from external providers
   - `/api/auth/provision-user` - Create/update user from external auth

3. **User Provisioning**:
   - Sync with GHL CRM data
   - Handle access grants/revocations
   - Audit trail for access events

## Onboarding Improvements

### 1. Already Receiving Benefits Enhancement

#### Current State
- Simple Yes/No toggle for receiving benefits
- No capture of benefit details
- Not visible in left column summary

#### Required Changes
- **User receiving benefits**: If "Yes" selected
  - Current monthly benefit amount ($)
  - Date of filing (or age at filing)
  - Benefit type (retirement, disability, etc.)
  
- **Spouse receiving benefits**: If "Yes" selected
  - Current monthly benefit amount ($)
  - Date of filing (or age at filing)
  - Benefit type

- **UI Updates**:
  - Show benefit status in left column summary
  - Display amount and filing details
  - Use regular PIA field if not receiving benefits

### 2. Divorce/Widow History Screening

#### Flow
1. User selects relationship status (Single/Married)
2. **New Question**: "Have you *ever* been divorced or widowed?"
   - If Yes → Collect details
   - If No → Continue to next section

#### Divorce History Details
- Number of times divorced
- For each divorce:
  - Length of marriage (years/months)
  - Divorce date
  - Ex-spouse status (alive/deceased)
  
#### Widow History Details
- Number of times widowed
- For each:
  - Length of marriage
  - Date of spouse's death
  - Your age at time of death

#### Info Boxes Required
- **Divorced Benefits Rule**:
  - "To claim benefits on an ex-spouse's record, you must have been married for at least 10 years"
  - "You must be unmarried (or remarried after age 60)"
  - "Your ex-spouse must be entitled to Social Security benefits"

- **Widow/Widower Benefits Rule**:
  - "You can receive survivor benefits as early as age 60 (50 if disabled)"
  - "If you remarry before age 60, you generally cannot receive survivor benefits"
  - "Remarriage after age 60 doesn't affect survivor benefits"
  - "If your ex-spouse is deceased and you were married 10+ years, you may qualify for survivor benefits"

### 3. Settings Page Redesign

#### Match Onboarding Style
- Two-column layout (Your Info | Partner Info)
- Button-style selectors for relationship status and Yes/No questions
- Same visual design language as onboarding
- Pre-populated with existing data

#### Editable Fields
- ✅ Relationship status
- ✅ Partner date of birth
- ✅ Receiving benefits status
- ✅ Benefit amounts and filing dates
- ✅ Divorce/widow history
- ✅ Children information
- ❌ Your date of birth (READ ONLY)

#### Display Format
```
Settings
├── Your Information
│   ├── Date of Birth (Read-only, grayed out)
│   ├── Relationship Status (Editable)
│   ├── Receiving Benefits? (Editable)
│   │   ├── Current Benefit Amount
│   │   └── Filing Date/Age
│   └── Divorce/Widow History (Editable)
│
├── Partner Information
│   ├── Date of Birth (Editable)
│   ├── Receiving Benefits? (Editable)
│   │   ├── Current Benefit Amount
│   │   └── Filing Date/Age
│   └── Relationship Details (Editable)
│
└── Children (Editable)
    └── Add/Remove children
```

## Database Schema Changes

### Profiles Table Updates
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS:
- current_benefit_amount DECIMAL(10,2)
- benefit_filing_date DATE
- benefit_filing_age INTEGER
- benefit_type VARCHAR(50)
- ever_divorced BOOLEAN DEFAULT FALSE
- ever_widowed BOOLEAN DEFAULT FALSE
- divorce_count INTEGER DEFAULT 0
- widow_count INTEGER DEFAULT 0
```

### New Table: Divorce History
```sql
CREATE TABLE divorce_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  ex_spouse_number INTEGER,
  marriage_start_date DATE,
  divorce_date DATE,
  marriage_length_years INTEGER,
  marriage_length_months INTEGER,
  ex_spouse_alive BOOLEAN,
  ex_spouse_date_of_death DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### New Table: Widow History
```sql
CREATE TABLE widow_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  spouse_number INTEGER,
  marriage_start_date DATE,
  spouse_date_of_death DATE,
  user_age_at_death INTEGER,
  marriage_length_years INTEGER,
  marriage_length_months INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Partners Table Updates
```sql
ALTER TABLE partners ADD COLUMN IF NOT EXISTS:
- current_benefit_amount DECIMAL(10,2)
- benefit_filing_date DATE
- benefit_filing_age INTEGER
- benefit_type VARCHAR(50)
```

## Implementation Priority

### Phase 1: Database Schema
1. Create migration for new columns
2. Create divorce_history table
3. Create widow_history table
4. Update API endpoints to handle new fields

### Phase 2: Onboarding Updates
1. Add benefit amount/date fields
2. Add divorce/widow history screening
3. Add info boxes with rules
4. Update left column summary display

### Phase 3: Settings Redesign
1. Rebuild Settings to match onboarding style
2. Make DOB read-only
3. Add all new editable fields
4. Ensure data consistency

### Phase 4: Automation Documentation
1. Document webhook endpoints needed
2. Create integration guide for n8n workflows
3. Add token validation logic
4. Implement user provisioning API

## Notes
- External integrations (Circle, Samcart, GHL, n8n) are not yet finalized
- Backend will need webhook security (signature verification)
- Frontend must handle iframe embedding constraints
- Consider rate limiting for webhook endpoints
- Audit logging recommended for all access grants/revocations

## Status
- **Planning**: Complete
- **Database Schema**: Pending
- **Onboarding Updates**: Pending
- **Settings Redesign**: Pending
- **External Integrations**: Awaiting connection details
