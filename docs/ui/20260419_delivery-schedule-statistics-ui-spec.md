# UI Spec: Delivery Schedule Statistics
**Ngày:** 2026-04-19
**BA Doc:** docs/ba/20260419_delivery-schedule-statistics-analysis.md
**Feature:** Thống kê Lịch đi hàng (ngay trong trang /vehicle-data/delivery-schedule)

---

## 1. User Journey

### Happy Path
```
User vào /vehicle-data/delivery-schedule
  → Trang load với filter mặc định (30 ngày gần nhất)
  → Statistics section hiển thị: metric cards + chart + breakdown table
  → User click [Tháng này] → filter auto set → stats refresh
  → User click [Xem] ở breakdown table → scroll xuống main table, filter theo ngày đó
```

### Alternative: Custom Range
```
User nhập From Date + To Date thủ công → click [Tìm kiếm]
  → Stats + main table đều refresh theo range mới
```

### Error Path
```
API fail → metric cards hiển thị "--", chart hiển thị error state + [Thử lại]
fromDate > toDate → inline error "Từ ngày phải <= Đến ngày"
```

---

## 2. Screen Inventory

### Screen: DeliverySchedulePage (cập nhật)
**Route:** `/vehicle-data/delivery-schedule`
**File:** `frontend/src/pages/admin/vehicle-data/DeliverySchedulePage.tsx`

#### Layout

```
┌─────────────────────────────────────────────────────────┐
│ Header: "Lịch đi hàng"              [Upload Excel]      │
├─────────────────────────────────────────────────────────┤
│ Card: Filters                                           │
│  Quick: [Tuần này] [Tháng này] [Quý này] [Năm nay]     │
│  From: [date input]  To: [date input]  Search: [input]  │
│                                              [Tìm kiếm] │
├─────────────────────────────────────────────────────────┤
│ Statistics Section (chỉ hiển thị khi có from_date+to_date)│
│  ┌─────────────────┐  ┌─────────────────┐               │
│  │ 📅 Số ngày có   │  │ 🚚 Tổng số chuyến│               │
│  │ chuyến          │  │                 │               │
│  │   15            │  │    127          │               │
│  └─────────────────┘  └─────────────────┘               │
│                                                         │
│  Card: Biểu đồ số chuyến theo ngày                     │
│  [Bar Chart - recharts BarChart, responsive]            │
│                                                         │
│  Card: Chi tiết theo ngày                              │
│  [Table: Ngày | Số chuyến | Xem]                       │
├─────────────────────────────────────────────────────────┤
│ Card: Danh sách chi tiết (existing table)              │
│ [DeliveryScheduleTable - existing]                      │
│ [Pagination - existing]                                 │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Component Checklist

### 3.1 QuickFilterButtons (NEW)
**File:** `frontend/src/components/delivery-schedule/QuickFilterButtons.tsx`

**Props:**
```typescript
interface Props {
  activeFilter: 'week' | 'month' | 'quarter' | 'year' | 'custom';
  onFilterChange: (fromDate: string, toDate: string, type: 'week' | 'month' | 'quarter' | 'year') => void;
}
```

**States:**
- default: 4 buttons, none active
- active: button có `bg-neutral-900 text-white` (dark: `bg-neutral-100 text-neutral-900`)
- hover: `hover:bg-neutral-100 dark:hover:bg-neutral-700`

**Buttons:**
| Label | Key | Logic |
|-------|-----|-------|
| Tuần này | week | from = Mon of current week, to = today |
| Tháng này | month | from = 01/currentMonth, to = today |
| Quý này | quarter | from = start of Q, to = today |
| Năm nay | year | from = 01/01/currentYear, to = today |

**Quarter logic (BR-005):**
- Q1: 01/01 - 31/03
- Q2: 01/04 - 30/06
- Q3: 01/07 - 30/09
- Q4: 01/10 - 31/12
- End: min(today, end of quarter)

---

### 3.2 DeliveryStatisticsSummary (NEW)
**File:** `frontend/src/components/delivery-schedule/DeliveryStatisticsSummary.tsx`

**Props:**
```typescript
interface Props {
  totalDays: number;
  totalTrips: number;
  isLoading: boolean;
}
```

**States:**
- loading: skeleton cards (animate-pulse, 2 cards)
- data: hiển thị số, format locale (1,234)
- dark mode: support đầy đủ

**Layout:**
- 2 metric cards ngang (grid-cols-2)
- Mobile: grid-cols-1 stack vertically

**Card design:**
```
┌────────────────────────────────┐
│ 📅 Số ngày có chuyến           │
│                                │
│ 15                             │
│ ngày trong khoảng thời gian    │
└────────────────────────────────┘
```
- Icon: Calendar (ngày), Truck (chuyến)
- Value: text-3xl font-bold
- Sub: text-sm text-neutral-500

---

### 3.3 DeliveryStatisticsChart (NEW)
**File:** `frontend/src/components/delivery-schedule/DeliveryStatisticsChart.tsx`

**Props:**
```typescript
interface ChartDataPoint {
  label: string;   // DD/MM or MM/YYYY
  value: number;   // tripCount
  ngay?: string;   // full date for tooltip
}

interface Props {
  data: ChartDataPoint[];
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
}
```

**States:**
- loading: skeleton rectangle (animate-pulse, h-64)
- empty: message "Không có dữ liệu trong khoảng thời gian này" centered
- error: message + [Thử lại] button
- data: recharts `<BarChart>` responsive

**Chart config:**
- Library: recharts (`BarChart`, `Bar`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `ResponsiveContainer`)
- Bar color: `#525252` (neutral-600), dark: `#a3a3a3` (neutral-400)
- Tooltip: Ngày: {ngay}, Số chuyến: {value}
- Height: 280px
- ResponsiveContainer width: 100%
- X axis: tick font size 11, no duplicates
- Y axis: integer only (allowDecimals=false)

---

### 3.4 DeliveryDailyBreakdownTable (NEW)
**File:** `frontend/src/components/delivery-schedule/DeliveryDailyBreakdownTable.tsx`

**Props:**
```typescript
interface DailyBreakdown {
  ngay: string;        // YYYY-MM-DD
  tripCount: number;
}

interface Props {
  data: DailyBreakdown[];
  isLoading: boolean;
  onViewDay?: (date: string) => void;  // scroll + filter main table
}
```

**States:**
- loading: skeleton rows (3 rows animate-pulse)
- empty: "Không có dữ liệu"
- data: table rows, sorted by ngay ASC

**Columns:**
| Column | Width | Format |
|--------|-------|--------|
| Ngày | 40% | DD/MM/YYYY (dayjs format) |
| Số chuyến | 30% | number, text-center |
| Thao tác | 30% | Button [Xem] variant="ghost" size="sm" |

**Max visible rows:** 100 (nếu > 100 → show "và X ngày khác...")

---

### 3.5 Update DeliveryScheduleFilters (MODIFY)
**File:** `frontend/src/components/delivery-schedule/DeliveryScheduleFilters.tsx`

**Thêm vào:** QuickFilterButtons ở trên row filter inputs
**Khi quick filter click:** setFromDate + setToDate + clear search + gọi onFiltersChange ngay (không cần click Tìm kiếm)
**Active state:** truyền `activeFilter` prop xuống QuickFilterButtons

---

### 3.6 Update DeliverySchedulePage (MODIFY)
**File:** `frontend/src/pages/admin/vehicle-data/DeliverySchedulePage.tsx`

**Thêm:**
1. `useQuery` cho statistics: `['delivery-schedules-stats', fromDate, toDate]`
2. Statistics section (sau Filters card, trước Table card)
3. `onViewDay` handler: setFilters với from_date=to_date=clickedDate + scroll to table ref

**Ref:** `mainTableRef = useRef<HTMLDivElement>(null)` → gắn vào Card bao ngoài table

---

## 4. Validation UX

| Lỗi | Hiển thị | Vị trí |
|-----|----------|--------|
| fromDate > toDate | Inline text màu đỏ | Dưới filter row |
| toDate > today | Inline text màu đỏ | Dưới filter row |
| API error (stats) | Error state trong chart + [Thử lại] | Chart card |
| API error (list) | Hiển thị toast đỏ | Top-right toast |

---

## 5. i18n Keys

### vi.json — thêm vào section `"deliverySchedule"`:
```json
{
  "deliverySchedule": {
    "statistics": {
      "title": "Thống kê",
      "totalDays": "Số ngày có chuyến",
      "totalDaysSub": "ngày trong khoảng thời gian",
      "totalTrips": "Tổng số chuyến",
      "totalTripsSub": "chuyến trong khoảng thời gian",
      "chartTitle": "Biểu đồ số chuyến theo ngày",
      "breakdownTitle": "Chi tiết theo ngày",
      "noData": "Không có dữ liệu trong khoảng thời gian này",
      "loadError": "Không tải được thống kê",
      "retry": "Thử lại",
      "viewDay": "Xem",
      "colDate": "Ngày",
      "colTrips": "Số chuyến",
      "colActions": "Thao tác",
      "tooltipDate": "Ngày",
      "tooltipTrips": "Số chuyến"
    },
    "quickFilter": {
      "week": "Tuần này",
      "month": "Tháng này",
      "quarter": "Quý này",
      "year": "Năm nay"
    }
  }
}
```

### en.json — thêm tương ứng:
```json
{
  "deliverySchedule": {
    "statistics": {
      "title": "Statistics",
      "totalDays": "Days with Trips",
      "totalDaysSub": "days in date range",
      "totalTrips": "Total Trips",
      "totalTripsSub": "trips in date range",
      "chartTitle": "Trips per Day",
      "breakdownTitle": "Daily Breakdown",
      "noData": "No data in selected date range",
      "loadError": "Failed to load statistics",
      "retry": "Retry",
      "viewDay": "View",
      "colDate": "Date",
      "colTrips": "Trips",
      "colActions": "Actions",
      "tooltipDate": "Date",
      "tooltipTrips": "Trips"
    },
    "quickFilter": {
      "week": "This Week",
      "month": "This Month",
      "quarter": "This Quarter",
      "year": "This Year"
    }
  }
}
```

---

## 6. Web Design Guidelines Check

- ✅ Loading state: skeleton cho tất cả components
- ✅ Empty state: message rõ ràng + CTA
- ✅ Error state: message + Retry button
- ✅ Dark mode: tất cả class có `dark:` variant
- ✅ Responsive: mobile stack vertically
- ✅ No hardcoded text: dùng i18n keys
- ✅ Accessible: contrast ratio, keyboard navigable
- ✅ Action buttons: không destructive (chỉ "Xem"), không cần confirm dialog

---

**End of UI Spec**
