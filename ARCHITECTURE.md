# Architecture Blueprint

## 1. Overview

This application is a CSV analytics dashboard that allows users to upload wide datasets, inspect them in table form, filter and sort them, and render visual summaries in charts.

## 2. System Components

### Frontend
The frontend is responsible for:

- CSV upload
- rendering the dataset in a table
- filtering and sorting controls
- chart rendering
- UI for dashboard configuration

### Backend
The backend is responsible for:

- file upload handling
- parsing CSV into structured records
- column type inference
- aggregations and statistics
- optional persistence of saved view metadata

### AI Layer
The AI layer can be optional and is responsible for:

- recommending visualization types
- summarizing trends and dataset anomalies
- interpreting user-selected insights

## 3. High-Level Architecture

```text
Client Browser
  ├── Upload CSV
  ├── Table View
  ├── Filter / Sort
  └── Chart Dashboard
        │
        ▼
API Server
  ├── Parse CSV
  ├── Detect Columns
  ├── Build Aggregations
  └── Save Dashboard Config (optional)
        │
        ▼
Database / Storage
  ├── Saved dashboard metadata
  ├── User preferences
  └── Temporary upload records
```

## 4. Data Flow

1. User uploads a CSV file.
2. Backend validates and parses the file.
3. Server infers column categories.
4. Frontend renders table and statistics.
5. User chooses filters and chart types.
6. Dashboard computes chart-ready summaries.
7. Optional AI service provides recommendation or explanation.

## 5. Recommended Modules

### Frontend Modules
- UploadPanel
- DataTable
- FilterBar
- ChartPanel
- StatisticsPanel
- SaveViewModal

### Backend Modules
- CSVParserService
- ColumnInferenceService
- AggregateService
- ViewStorageService
- AuthService (optional)

### AI Modules
- ChartRecommendationEngine
- InsightSummaryEngine
- AnomalyDetectionService

## 6. Database Design (Optional)

### Core Tables
- users
- saved_dashboards
- dashboard_views
- uploaded_files

### Key Fields
- id
- user_id
- filename
- file_size
- created_at
- chart_config_json
- filter_config_json

## 7. Technical Considerations

- Use server-side pagination for large CSVs.
- Keep the initial MVP simple and stateless when possible.
- Prefer a relational database if you want structured saved dashboards.
- Use a document database if the CSV schema varies heavily.

## 8. MVP Scope

Build the first version around these essentials:

- upload CSV
- parse preview
- render table
- support sorting/search/filter
- auto-create 3 to 5 charts
- display simple statistics

## 9. Future Scale-Up

Once the MVP is stable, add:

- multi-user login
- cloud storage
- advanced AI interpretation
- schedule-based report generation
- sharing and collaboration
