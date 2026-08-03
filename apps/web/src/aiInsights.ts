export type ColumnTypeSummary = {
  column: string;
  type: string;
};

export type DatasetStats = {
  totalRows: number;
  totalColumns: number;
  columnTypes: ColumnTypeSummary[];
};

export type InsightCard = {
  title: string;
  value: string;
  detail: string;
};

export type ChartRecommendation = {
  chartType: 'bar' | 'line' | 'area';
  reason: string;
  xAxis: string;
  yAxis: string;
};

const collectNumericValues = (rows: Record<string, string>[], column: string) =>
  rows
    .map((row) => Number(row[column] ?? ''))
    .filter((value) => !Number.isNaN(value));

const collectMissingCount = (rows: Record<string, string>[]) =>
  rows.reduce((total, row) => total + Object.values(row).filter((value) => value.trim() === '').length, 0);

export const suggestBestChart = (
  rows: Record<string, string>[],
  columns: string[],
  stats: DatasetStats | null,
): ChartRecommendation | null => {
  if (!stats || rows.length === 0) {
    return null;
  }

  const numericColumns = stats.columnTypes.filter((item) => item.type === 'number').map((item) => item.column);
  const categoricalColumns = stats.columnTypes.filter((item) => item.type === 'string').map((item) => item.column);
  const dateColumns = stats.columnTypes.filter((item) => item.type === 'date').map((item) => item.column);

  if (dateColumns.length > 0 && numericColumns.length > 0) {
    return {
      chartType: 'line',
      reason: 'A date column paired with a numeric measure is best shown as a line chart to highlight change over time.',
      xAxis: dateColumns[0],
      yAxis: numericColumns[0],
    };
  }

  if (categoricalColumns.length > 0 && numericColumns.length > 0) {
    return {
      chartType: 'bar',
      reason: 'A categorical field with a numeric measure is best shown as a bar chart for easy comparison.',
      xAxis: categoricalColumns[0],
      yAxis: numericColumns[0],
    };
  }

  if (numericColumns.length > 1) {
    return {
      chartType: 'area',
      reason: 'Two numeric columns work well in an area view when you want to compare magnitude and shape.',
      xAxis: columns[0] ?? '',
      yAxis: numericColumns[0],
    };
  }

  return null;
};

export const generateAIInsights = (
  rows: Record<string, string>[],
  columns: string[],
  stats: DatasetStats | null,
): InsightCard[] => {
  if (!stats || rows.length === 0) {
    return [];
  }

  const insights: InsightCard[] = [];
  const numericColumns = stats.columnTypes.filter((item) => item.type === 'number').map((item) => item.column);
  const categoricalColumns = stats.columnTypes.filter((item) => item.type === 'string').map((item) => item.column);
  const dateColumns = stats.columnTypes.filter((item) => item.type === 'date').map((item) => item.column);

  insights.push({
    title: 'Dataset snapshot',
    value: `${stats.totalRows} rows`,
    detail: `${stats.totalColumns} columns are ready for conversational analysis.`,
  });

  if (numericColumns.length > 0) {
    const measureColumn = numericColumns[0];
    const values = collectNumericValues(rows, measureColumn);

    if (values.length > 0) {
      const average = values.reduce((sum, value) => sum + value, 0) / values.length;
      const max = Math.max(...values);
      const min = Math.min(...values);

      insights.push({
        title: `${measureColumn} at a glance`,
        value: `Avg ${average.toFixed(1)}`,
        detail: `Range ${min} → ${max} across the current dataset.`,
      });
    }
  }

  if (categoricalColumns.length > 0) {
    const categoryColumn = categoricalColumns[0];
    const counts = rows.reduce<Record<string, number>>((accumulator, row) => {
      const value = row[categoryColumn] ?? 'Unknown';
      accumulator[value] = (accumulator[value] ?? 0) + 1;
      return accumulator;
    }, {});

    const topEntry = Object.entries(counts).sort((left, right) => right[1] - left[1])[0];

    if (topEntry) {
      insights.push({
        title: `Most common ${categoryColumn}`,
        value: topEntry[0],
        detail: `Appears ${topEntry[1]} times in the current slice.`,
      });
    }
  }

  if (dateColumns.length > 0 && numericColumns.length > 0) {
    const dateColumn = dateColumns[0];
    const measureColumn = numericColumns[0];
    const numericValues = rows
      .map((row) => ({
        date: row[dateColumn] ?? '',
        value: Number(row[measureColumn] ?? 0),
      }))
      .filter((item) => item.date !== '' && !Number.isNaN(item.value));

    if (numericValues.length > 1) {
      const first = numericValues[0].value;
      const latest = numericValues[numericValues.length - 1].value;
      const direction = latest > first ? 'upward' : latest < first ? 'downward' : 'steady';

      insights.push({
        title: 'Trend signal',
        value: `${direction} trend`,
        detail: `The latest point is ${latest} compared with ${first} at the start.`,
      });
    }
  }

  if (columns.length > 0) {
    const missingCount = collectMissingCount(rows);

    if (missingCount > 0) {
      insights.push({
        title: 'Data quality check',
        value: `${missingCount} blank cells`,
        detail: 'Missing values are worth reviewing before acting on the results.',
      });
    }
  }

  return insights.slice(0, 4);
};

export const answerNaturalLanguageQuery = (
  rows: Record<string, string>[],
  columns: string[],
  stats: DatasetStats | null,
  query: string,
): string => {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return 'Ask a question such as “show me a summary” or “what is the top category?”';
  }

  if (rows.length === 0 || !stats) {
    return 'Upload a CSV first so I can answer questions about it.';
  }

  const numericColumns = stats.columnTypes.filter((item) => item.type === 'number').map((item) => item.column);
  const categoricalColumns = stats.columnTypes.filter((item) => item.type === 'string').map((item) => item.column);
  const dateColumns = stats.columnTypes.filter((item) => item.type === 'date').map((item) => item.column);

  if (normalized.includes('summary') || normalized.includes('overview')) {
    return `This dataset contains ${rows.length} rows and ${columns.length} columns. The strongest numeric focus is ${numericColumns[0] ?? 'not available'}, while ${categoricalColumns[0] ?? 'the first column'} helps frame the story.`;
  }

  if (normalized.includes('chart') || normalized.includes('visual') || normalized.includes('recommend')) {
    const recommendation = suggestBestChart(rows, columns, stats);

    if (!recommendation) {
      return 'I can suggest a chart once the dataset has a clear numeric or time-based pattern to highlight.';
    }

    return `Recommended chart: ${recommendation.chartType.toUpperCase()} — ${recommendation.reason}`;
  }

  if (normalized.includes('top') || normalized.includes('highest') || normalized.includes('largest') || normalized.includes('best')) {
    const measureColumn = numericColumns[0];
    const groupColumn = categoricalColumns[0] ?? columns[0] ?? 'row';

    if (!measureColumn) {
      return 'I need at least one numeric column to identify a top value.';
    }

    const topRecord = rows.reduce<
      { label: string; value: number } | null
    >((best, row) => {
      const value = Number(row[measureColumn] ?? 0);
      if (Number.isNaN(value)) {
        return best;
      }

      if (!best || value > best.value) {
        return {
          label: row[groupColumn] ?? 'Unknown',
          value,
        };
      }

      return best;
    }, null);

    if (!topRecord) {
      return 'I could not find a useful numeric value to rank.';
    }

    return `The highest ${measureColumn} value is ${topRecord.value} for ${topRecord.label}.`;
  }

  if (normalized.includes('trend') || normalized.includes('change') || normalized.includes('over time')) {
    const dateColumn = dateColumns[0];
    const measureColumn = numericColumns[0];

    if (!dateColumn || !measureColumn) {
      return 'A date column and a numeric column are needed for a trend view.';
    }

    const values = rows
      .map((row) => ({
        date: row[dateColumn] ?? '',
        value: Number(row[measureColumn] ?? 0),
      }))
      .filter((item) => item.date !== '' && !Number.isNaN(item.value));

    if (values.length < 2) {
      return 'There is not enough data to describe a meaningful trend.';
    }

    const first = values[0].value;
    const latest = values[values.length - 1].value;
    const direction = latest > first ? 'increasing' : latest < first ? 'decreasing' : 'steady';

    return `The ${measureColumn} pattern is ${direction} from ${first} to ${latest} across the recorded timeline.`;
  }

  if (normalized.includes('missing') || normalized.includes('blank') || normalized.includes('null')) {
    const missingCount = collectMissingCount(rows);
    return `There are ${missingCount} blank cells in the current dataset.`;
  }

  if (normalized.includes('outlier') || normalized.includes('unusual')) {
    const measureColumn = numericColumns[0];

    if (!measureColumn) {
      return 'I need a numeric column to flag unusual values.';
    }

    const values = collectNumericValues(rows, measureColumn);
    if (values.length === 0) {
      return 'There are no numeric values to inspect for outliers.';
    }

    const max = Math.max(...values);
    const min = Math.min(...values);
    return `The most extreme values in ${measureColumn} are ${min} and ${max}, which may deserve a closer look.`;
  }

  return 'I can help with summaries, top values, trends, missing values, and outliers. Try asking for one of those directly.';
};
