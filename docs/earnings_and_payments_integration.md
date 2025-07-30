# Payments and Earnings Integration Guide

This guide outlines the integration steps for both the Buyer Payments and Worker Earnings pages in the Able AI platform.

## Table of Contents
1. [Overview](#overview)
2. [Common Components](#common-components)
3. [Buyer Payments Page](#buyer-payments-page)
4. [Worker Earnings Page](#worker-earnings-page)
5. [Chart Visualization](#chart-visualization)
6. [QA View Support](#qa-view-support)

## Overview

The platform includes two related but distinct pages for handling financial transactions:
- **Buyer Payments**: For buyers to view and manage their payments to workers
- **Worker Earnings**: For workers to view their earnings from completed gigs

Both pages share similar UI components and styling but serve different user roles and display different data.

## Common Components

### CSS Modules
Both pages use similar CSS modules with role-specific class names:
- `PaymentsPage.module.css` for buyer payments
- `EarningsPage.module.css` for worker earnings

Key shared styles include:
- Dark theme with consistent color variables
- Responsive layouts
- Card-based item displays
- Filter sections
- Chart containers
- Modal components

### Shared Features
- Filter by gig type
- Monthly earnings/payments chart
- QA view support
- Responsive design
- Loading states
- Error handling

## Buyer Payments Page

### API Endpoints

#### 1. Fetch Payments
```typescript
GET /api/payments/buyer
Query Parameters:
- userId: string (from auth token)
- type?: string (optional gig type filter)

Response:
{
  payments: {
    id: string;
    gigType: string;
    gigTitle: string;
    workerName: string;
    date: string;
    amount: number;
    status: 'Paid' | 'Pending';
    gigId: string;
  }[];
}
```

#### 2. Generate Invoice
```typescript
POST /api/payments/invoice
Body:
{
  paymentId: string;
  userId: string;
}

Response:
{
  invoiceUrl: string;
  invoiceNumber: string;
}
```

#### 3. Repeat Gig
```typescript
POST /api/gigs/repeat
Body:
{
  gigId: string;
  userId: string;
}

Response:
{
  newGigId: string;
  status: 'success' | 'error';
}
```

### Required Database Tables

1. **Payments**
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  gig_id UUID REFERENCES gigs(id),
  buyer_id UUID REFERENCES users(id),
  worker_id UUID REFERENCES users(id),
  amount DECIMAL(10,2),
  status VARCHAR(20),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

2. **Invoices**
```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY,
  payment_id UUID REFERENCES payments(id),
  invoice_number VARCHAR(50),
  created_at TIMESTAMP,
  pdf_url TEXT
);
```

## Worker Earnings Page

### API Endpoints

#### 1. Fetch Earnings
```typescript
GET /api/earnings/worker
Query Parameters:
- userId: string (from auth token)
- type?: string (optional gig type filter)

Response:
{
  earnings: {
    id: string;
    gigType: string;
    gigTitle: string;
    buyerName: string;
    date: string;
    amount: number;
    status: 'Cleared' | 'Pending' | 'Processing';
    gigId: string;
  }[];
}
```

### Required Database Tables

1. **Earnings**
```sql
CREATE TABLE earnings (
  id UUID PRIMARY KEY,
  gig_id UUID REFERENCES gigs(id),
  worker_id UUID REFERENCES users(id),
  buyer_id UUID REFERENCES users(id),
  amount DECIMAL(10,2),
  status VARCHAR(20),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## Chart Visualization

Both pages use Recharts for data visualization. The implementation includes:

1. **Installation**
```bash
npm install recharts
```

2. **Component Imports**
```typescript
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
```

3. **Custom Tooltip Component**
```typescript
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className={styles.chartTooltip}>
        <p className={styles.tooltipLabel}>{label}</p>
        <p className={styles.tooltipValue}>£{payload[0].value.toFixed(2)}</p>
      </div>
    );
  }
  return null;
};
```

4. **Chart Implementation**
```typescript
<ResponsiveContainer width="100%" height="100%">
  <BarChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
    <CartesianGrid strokeDasharray="3 3" stroke="#3a3a3a" />
    <XAxis dataKey="name" tick={{ fill: '#a0a0a0', fontSize: 12 }} />
    <YAxis tickFormatter={(value) => `£${value}`} tick={{ fill: '#a0a0a0', fontSize: 12 }} />
    <Tooltip content={<CustomTooltip />} />
    <Bar dataKey="total" fill="var(--success-color)" radius={[4, 4, 0, 0]} />
  </BarChart>
</ResponsiveContainer>
```

5. **Data Processing**
```typescript
const getChartData = (items: Payment[] | Earning[]) => {
  const monthlyTotals: { [key: string]: number } = {};
  items.forEach(item => {
    if (item.status === 'Paid' || item.status === 'Cleared') {
      const month = new Date(item.date).toLocaleString('default', { month: 'short', year: '2-digit' });
      monthlyTotals[month] = (monthlyTotals[month] || 0) + item.amount;
    }
  });
  return Object.entries(monthlyTotals)
    .map(([name, total]) => ({ name, total }))
    .reverse();
};
```

## QA View Support

Both pages support QA view for testing purposes. The implementation includes:

1. **QA Check in Context**
```typescript
const { isQA } = useAppContext();
```

2. **Mock Data for QA**
```typescript
const mockData = {
  payments: [...],
  earnings: [...]
};

// In API calls
if (isQA) {
  return mockData;
}
```

3. **QA Indicator**
```typescript
{isQA && (
  <div className={styles.qaIndicator}>
    QA View - Mock Data
  </div>
)}
```

4. **CSS for QA Indicator**
```css
.qaIndicator {
  background-color: #f59e0b;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  text-align: center;
  font-weight: 600;
}
```

## Implementation Notes

1. **Authentication**
   - Both pages require authentication
   - Role-based access control (buyer/worker)
   - QA view bypass for testing

2. **Error Handling**
   - Loading states
   - Error messages
   - Empty states
   - Network error recovery

3. **Performance**
   - Memoized chart data
   - Pagination for large datasets
   - Optimized re-renders

4. **Accessibility**
   - ARIA labels
   - Keyboard navigation
   - Screen reader support
   - Color contrast compliance

5. **Testing**
   - Unit tests for data processing
   - Integration tests for API calls
   - E2E tests for user flows
   - QA view testing 