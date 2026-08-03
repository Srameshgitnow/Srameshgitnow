import express, { type Request, type Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import { parse } from 'csv-parse/sync';

const app = express();
const port = 3001;
const DEFAULT_PAGE_SIZE = 25;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

app.use(cors());
app.use(express.json());

const inferColumnType = (values: string[]) => {
  const numericValues = values.filter((value) => value !== '' && !Number.isNaN(Number(value)));
  const dateValues = values.filter((value) => !Number.isNaN(Date.parse(value)));

  if (numericValues.length === values.length) return 'number';
  if (dateValues.length === values.length) return 'date';
  return 'string';
};

const buildStats = (rows: Record<string, string>[]) => {
  const columns = rows.length ? Object.keys(rows[0]) : [];
  const columnTypes = columns.map((column) => {
    const values = rows.map((row) => row[column] ?? '').filter((value) => value !== '');
    return {
      column,
      type: inferColumnType(values),
    };
  });

  return {
    totalRows: rows.length,
    totalColumns: columns.length,
    columnTypes,
  };
};

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.post('/api/upload', upload.single('file'), (req: Request, res: Response) => {
  const file = req.file;
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? DEFAULT_PAGE_SIZE);
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : DEFAULT_PAGE_SIZE;

  if (!file) {
    return res.status(400).json({ message: 'A CSV file is required.' });
  }

  const content = file.buffer.toString('utf8');

  try {
    const rows = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[];

    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    const stats = buildStats(rows);
    const totalRows = rows.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / safePageSize));
    const normalizedPage = Math.min(safePage, totalPages);
    const startIndex = (normalizedPage - 1) * safePageSize;
    const endIndex = startIndex + safePageSize;

    return res.json({
      columns,
      rows: rows.slice(startIndex, endIndex),
      allRows: rows,
      stats,
      page: normalizedPage,
      pageSize: safePageSize,
      totalRows,
      totalPages,
      message: 'CSV parsed successfully',
    });
  } catch (error) {
    return res.status(400).json({
      message: 'Unable to parse the uploaded CSV file.',
      details: error instanceof Error ? error.message : 'Unknown parsing error',
    });
  }
});

app.listen(port, () => {
  console.log(`CSV API listening on http://localhost:${port}`);
});
