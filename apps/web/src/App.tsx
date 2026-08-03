import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { answerNaturalLanguageQuery, generateAIInsights, suggestBestChart } from './aiInsights';

type ColumnType = {
  column: string;
  type: string;
};

type UploadResponse = {
  columns: string[];
  rows: Record<string, string>[];
  allRows: Record<string, string>[];
  stats: {
    totalRows: number;
    totalColumns: number;
    columnTypes: ColumnType[];
  };
  page: number;
  pageSize: number;
  totalPages: number;
  totalRows: number;
};

const App = () => {
  const [file, setFile] = useState<File | null>(null);
  const [allRows, setAllRows] = useState<Record<string, string>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [stats, setStats] = useState<UploadResponse['stats'] | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sortColumn, setSortColumn] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterText, setFilterText] = useState('');
  const [chartScope, setChartScope] = useState<'page' | 'full'>('page');
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area'>('area');
  const [chartX, setChartX] = useState('');
  const [chartY, setChartY] = useState('');
  const [assistantQuery, setAssistantQuery] = useState('');
  const [assistantResponse, setAssistantResponse] = useState('');

  const filteredRows = useMemo(() => {
    const normalizedFilter = filterText.trim().toLowerCase();

    if (!normalizedFilter) {
      return allRows;
    }

    return allRows.filter((row) =>
      Object.values(row).some((value) => value.toLowerCase().includes(normalizedFilter)),
    );
  }, [allRows, filterText]);

  const sortedRows = useMemo(() => {
    const baseRows = [...filteredRows];

    if (!sortColumn) {
      return baseRows;
    }

    return baseRows.sort((a, b) => {
      const left = a[sortColumn] ?? '';
      const right = b[sortColumn] ?? '';
      const comparison = left.localeCompare(right, undefined, { numeric: true });
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredRows, sortColumn, sortDirection]);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return sortedRows.slice(start, end);
  }, [sortedRows, currentPage, pageSize]);

  const effectivePageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));

  const numericColumns = useMemo(
    () => stats?.columnTypes.filter((item) => item.type === 'number').map((item) => item.column) ?? [],
    [stats],
  );

  const categoricalColumns = useMemo(
    () => stats?.columnTypes.filter((item) => item.type === 'string').map((item) => item.column) ?? [],
    [stats],
  );

  const dateColumns = useMemo(
    () => stats?.columnTypes.filter((item) => item.type === 'date').map((item) => item.column) ?? [],
    [stats],
  );

  const preferredNumericColumn = numericColumns[0] ?? columns[1] ?? columns[0] ?? '';
  const preferredCategoryColumn = categoricalColumns[0] ?? columns[0] ?? '';
  const preferredDateColumn = dateColumns[0] ?? columns[0] ?? '';

  const relationshipData = useMemo(() => {
    const scopeRows = chartScope === 'page' ? paginatedRows : sortedRows;

    return scopeRows.slice(0, 12).map((row, index) => ({
      name: `${row[preferredDateColumn] ?? row[preferredCategoryColumn] ?? `Row ${index + 1}`}`,
      value: Number(row[preferredNumericColumn] ?? 0),
      compare: Number(row[numericColumns[1] ?? preferredNumericColumn] ?? 0),
    }));
  }, [paginatedRows, sortedRows, chartScope, preferredDateColumn, preferredCategoryColumn, preferredNumericColumn, numericColumns]);

  const categoryData = useMemo(() => {
    const scopeRows = chartScope === 'page' ? paginatedRows : sortedRows;

    if (!preferredCategoryColumn || !preferredNumericColumn) {
      return [];
    }

    return scopeRows.slice(0, 10).map((row, index) => ({
      name: `${row[preferredCategoryColumn] ?? `Row ${index + 1}`}`,
      value: Number(row[preferredNumericColumn] ?? 0),
    }));
  }, [paginatedRows, sortedRows, chartScope, preferredCategoryColumn, preferredNumericColumn]);

  const trendData = useMemo(() => {
    const scopeRows = chartScope === 'page' ? paginatedRows : sortedRows;

    if (!preferredDateColumn || !preferredNumericColumn) {
      return [];
    }

    return scopeRows.slice(0, 12).map((row, index) => ({
      name: row[preferredDateColumn] ?? `Row ${index + 1}`,
      value: Number(row[preferredNumericColumn] ?? 0),
    }));
  }, [paginatedRows, sortedRows, chartScope, preferredDateColumn, preferredNumericColumn]);

  const chartData = useMemo(() => {
    const scopeRows = chartScope === 'page' ? paginatedRows : sortedRows;

    if (!chartX || !chartY || scopeRows.length === 0) {
      return [];
    }

    return scopeRows.slice(0, 10).map((row, index) => ({
      name: row[chartX] ?? `${index + 1}`,
      [chartY]: Number(row[chartY] ?? 0),
    }));
  }, [paginatedRows, sortedRows, chartScope, chartX, chartY]);

  const insightText = useMemo(() => {
    if (dateColumns.length > 0 && numericColumns.length > 0) {
      return 'AI-style recommendation: trend over time is strongest when using a date column on the X axis and a numeric measure on the Y axis.';
    }

    if (categoricalColumns.length > 0 && numericColumns.length > 0) {
      return 'AI-style recommendation: category-to-measure charts work best for distribution, comparison, and relationship storytelling.';
    }

    return 'AI-style recommendation: select a numeric measure and a category/date field to reveal a stronger pattern.';
  }, [categoricalColumns.length, dateColumns.length, numericColumns.length]);

  const aiInsights = useMemo(() => generateAIInsights(allRows, columns, stats), [allRows, columns, stats]);
  const chartRecommendation = useMemo(() => suggestBestChart(allRows, columns, stats), [allRows, columns, stats]);

  useMemo(() => {
    if (!chartRecommendation) {
      return;
    }

    setChartType(chartRecommendation.chartType);
    setChartX(chartRecommendation.xAxis);
    setChartY(chartRecommendation.yAxis);
  }, [chartRecommendation]);

  const fetchPage = async (page: number, nextPageSize = pageSize) => {
    if (!file) {
      setError('Please select a CSV file first.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `http://localhost:3001/api/upload?page=${page}&pageSize=${nextPageSize}`,
        {
          method: 'POST',
          body: formData,
        },
      );

      const result = (await response.json()) as UploadResponse & { message?: string };

      if (!response.ok) {
        throw new Error(result.message ?? 'Upload failed.');
      }

      setColumns(result.columns);
      setAllRows(result.allRows);
      setStats(result.stats);
      setCurrentPage(result.page);
      setPageSize(result.pageSize);
      setChartX(result.columns[0] ?? '');
      setChartY(result.columns[1] ?? result.columns[0] ?? '');
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    setCurrentPage(1);
    await fetchPage(1, pageSize);
  };

  const handlePageChange = async (page: number) => {
    if (page < 1 || page > effectivePageCount) {
      return;
    }

    setCurrentPage(page);
    await fetchPage(page, pageSize);
  };

  const handleAssistantQuery = () => {
    const response = answerNaturalLanguageQuery(allRows, columns, stats, assistantQuery);
    setAssistantResponse(response);
  };

  const handleSort = (column: string) => {
    if (sortColumn !== column) {
      setSortColumn(column);
      setSortDirection('asc');
      return;
    }

    setSortDirection((previous) => (previous === 'asc' ? 'desc' : 'asc'));
  };

  return (
    <div className="app-shell">
      <header className="hero">
        <h1>CSV Insight Dashboard</h1>
        <p>Upload a CSV file and instantly inspect the data in a table and charts.</p>
      </header>

      <section className="panel upload-panel">
        <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button onClick={handleUpload} disabled={loading}>
          {loading ? 'Uploading...' : 'Upload CSV'}
        </button>
        <label className="field-label">
          Page size
          <select
            value={pageSize}
            onChange={(event) => {
              const nextSize = Number(event.target.value);
              setPageSize(nextSize);
              void fetchPage(1, nextSize);
            }}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </label>
        {error ? <p className="error">{error}</p> : null}
      </section>

      {stats ? (
        <section className="stats-grid">
          <div className="stat-card">
            <span>Total Rows</span>
            <strong>{stats.totalRows}</strong>
          </div>
          <div className="stat-card">
            <span>Total Columns</span>
            <strong>{stats.totalColumns}</strong>
          </div>
          <div className="stat-card">
            <span>Visible Rows</span>
            <strong>{filteredRows.length}</strong>
          </div>
        </section>
      ) : null}

      {stats ? (
        <section className="panel">
          <h2>Detected Column Types</h2>
          <ul className="type-list">
            {stats.columnTypes.map((item) => (
              <li key={item.column}>
                <span>{item.column}</span>
                <strong>{item.type}</strong>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {columns.length > 0 ? (
        <section className="panel">
          <h2>Table Preview</h2>
          <div className="toolbar">
            <label className="field-label">
              Filter value
              <input
                type="text"
                placeholder="Search all columns"
                value={filterText}
                onChange={(event) => {
                  setFilterText(event.target.value);
                  setCurrentPage(1);
                }}
              />
            </label>
          </div>
          <div className="table-meta">
            <span>Page {currentPage} of {effectivePageCount}</span>
            <span>{filteredRows.length} filtered rows</span>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column}>
                      <button className="sort-button" onClick={() => handleSort(column)}>
                        {column}
                        {sortColumn === column ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((row, rowIndex) => (
                  <tr key={`${rowIndex}-${row[columns[0] ?? '']}`}>
                    {columns.map((column) => (
                      <td key={`${rowIndex}-${column}`}>{row[column] ?? ''}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <button onClick={() => void handlePageChange(currentPage - 1)} disabled={currentPage === 1 || loading}>
              Previous
            </button>
            <span>
              Page {currentPage} / {effectivePageCount}
            </span>
            <button
              onClick={() => void handlePageChange(currentPage + 1)}
              disabled={currentPage === effectivePageCount || loading}
            >
              Next
            </button>
          </div>
        </section>
      ) : null}

      {columns.length > 0 ? (
        <section className="panel">
          <h2>AI Assistant</h2>
          <p className="insight-text">
            Ask simple questions and get instant summaries, trend hints, and data-quality guidance.
          </p>
          <div className="assistant-controls">
            <input
              type="text"
              placeholder="Try: summarize the dataset, show trends, or find missing values"
              value={assistantQuery}
              onChange={(event) => setAssistantQuery(event.target.value)}
            />
            <button onClick={handleAssistantQuery}>Ask AI</button>
          </div>
          {assistantResponse ? <div className="assistant-response">{assistantResponse}</div> : null}
          {chartRecommendation ? (
            <div className="assistant-response assistant-highlight">
              <strong>Recommended chart:</strong> {chartRecommendation.chartType.toUpperCase()} —{' '}
              {chartRecommendation.reason}
              <div className="assistant-meta">
                X: {chartRecommendation.xAxis} • Y: {chartRecommendation.yAxis}
              </div>
            </div>
          ) : null}
          <div className="ai-insight-grid">
            {aiInsights.map((insight) => (
              <div className="ai-insight-card" key={insight.title}>
                <h3>{insight.title}</h3>
                <strong>{insight.value}</strong>
                <p>{insight.detail}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {chartData.length > 0 ? (
        <section className="panel chart-panel">
          <h2>Chart Preview</h2>
          <p className="insight-text">{insightText}</p>
          <div className="chart-controls">
            <label className="field-label">
              Scope
              <select value={chartScope} onChange={(event) => setChartScope(event.target.value as 'page' | 'full')}>
                <option value="page">Current page</option>
                <option value="full">Full dataset</option>
              </select>
            </label>
            <label className="field-label">
              Chart type
              <select
                value={chartType}
                onChange={(event) => setChartType(event.target.value as 'bar' | 'line' | 'area')}
              >
                <option value="area">Area</option>
                <option value="bar">Bar</option>
                <option value="line">Line</option>
              </select>
            </label>
            <label className="field-label">
              X axis
              <select value={chartX} onChange={(event) => setChartX(event.target.value)}>
                {columns.map((column) => (
                  <option key={column} value={column}>
                    {column}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Y axis
              <select value={chartY} onChange={(event) => setChartY(event.target.value)}>
                {columns.map((column) => (
                  <option key={column} value={column}>
                    {column}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="chart-grid">
            <div className="chart-card">
              <h3>Trend view</h3>
              <div className="chart-area">
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.08} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="value" stroke="#8b5cf6" fill="url(#trendFill)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart-card">
              <h3>Category view</h3>
              <div className="chart-area">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#22c55e" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart-card chart-card-wide">
              <h3>Relationship view</h3>
              <div className="chart-area">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={relationshipData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="compare" stroke="#22c55e" strokeWidth={3} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart-card chart-card-wide">
              <h3>Selected chart</h3>
              <div className="chart-area">
                <ResponsiveContainer width="100%" height={260}>
                  {chartType === 'bar' ? (
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey={chartY} fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  ) : chartType === 'line' ? (
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey={chartY} stroke="#22c55e" strokeWidth={3} dot={{ r: 3 }} />
                    </LineChart>
                  ) : (
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="selectedFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0.08} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey={chartY} stroke="#22c55e" fill="url(#selectedFill)" strokeWidth={3} />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
};

export default App;
