# Functional Specification

## Goal

Create an application that lets users upload CSV data and instantly explore it using a table and charts.

## User Personas

### Analyst
- uploads data from spreadsheets
- wants quick visual summaries

### Business User
- wants simple charts without complex BI tools

### Developer / Portfolio Builder
- wants an application that demonstrates frontend, backend, and analytics capabilities

## Functional Requirements

### Upload
- User can upload a CSV file.
- System accepts one file at a time for MVP.
- System validates file format and displays a friendly error for invalid input.

### Data Parsing
- Parse CSV into records.
- Detect column names.
- Infer data types such as number, string, and date.

### Table View
- Render all rows in a paginated table.
- Support column sorting.
- Support global search.
- Support per-column filtering.

### Chart View
- Automatically select 3 to 5 chart suggestions based on the dataset.
- Render charts for numeric, date, and categorical columns.
- Allow manual chart selection.

### Statistics View
- Display summary metrics such as row count, missing values, numeric ranges, and distribution hints.

### Save / Persist
- Allow user to save chart and filter settings.
- Persist dashboard metadata if desired.

## Non-Functional Requirements

- Should work for CSVs with 30+ columns.
- Should remain responsive on large datasets.
- Should degrade gracefully for heavy CSVs.
- Should be easy to run locally.

## Success Criteria

A successful MVP should let a user:

1. Upload a CSV.
2. See a table.
3. Apply filters and sort.
4. Produce meaningful chart visualizations.
5. Save or share the dashboard configuration.
