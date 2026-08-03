import test from 'node:test';
import assert from 'node:assert/strict';
import { suggestBestChart } from './aiInsights.ts';

test('suggests a line chart for date-plus-numeric data', () => {
  const recommendation = suggestBestChart(
    [{ date: '2024-01-01', sales: '120' }],
    ['date', 'sales'],
    {
      totalRows: 1,
      totalColumns: 2,
      columnTypes: [
        { column: 'date', type: 'date' },
        { column: 'sales', type: 'number' },
      ],
    },
  );

  assert.ok(recommendation);
  assert.equal(recommendation.chartType, 'line');
  assert.equal(recommendation.xAxis, 'date');
  assert.equal(recommendation.yAxis, 'sales');
});
