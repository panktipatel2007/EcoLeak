import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { getGeminiInsights, EmptyQuestionError } from './src/lib/services/gemini-service.ts';
import { parseFactoryText, calculateEmissionsFromRecords, EmissionsResult } from './src/lib/emissions.ts';

const app = express();
const PORT = 3000;

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.text({ type: ['text/csv', 'text/plain'], limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  const hasKey = Boolean(
    process.env.GEMINI_API_KEY ||
    process.env.API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY
  );
  res.json({ status: 'ok', hasGeminiKey: hasKey });
});

// Calculate emissions handler
function handleCalculateEmissions(req: Request, res: Response) {
  try {
    let csvText = '';
    let preferredUnit: 'tCO2e' | 'kgCO2e' = 'tCO2e';

    if (typeof req.body === 'string') {
      csvText = req.body;
    } else if (typeof req.body === 'object' && req.body !== null) {
      csvText = req.body.content || req.body.data || req.body.csv || req.body.text || '';
      if (req.body.preferred_unit === 'kgCO2e' || req.body.preferred_unit === 'tCO2e') {
        preferredUnit = req.body.preferred_unit;
      } else if (req.body.unit === 'kgCO2e' || req.body.unit === 'tCO2e') {
        preferredUnit = req.body.unit;
      }
    }

    if (!csvText || csvText.trim().length === 0) {
      res.status(400).json({
        error: 'Empty or missing CSV data. Provide CSV file or JSON with "content" field.',
        total_emissions: 0,
        unit: preferredUnit,
        breakdown: [],
        top_leak: {
          name: 'None',
          percentage: 0,
          severity: 'LOW',
          explanation: 'No emission sources detected in empty input.',
        },
        pareto: {
          sources_to_80_percent: 0,
          pareto_percentage: 0,
        },
      });
      return;
    }

    const { records, warnings } = parseFactoryText(csvText);
    const result: EmissionsResult = calculateEmissionsFromRecords(records, preferredUnit);
    if (warnings.length > 0) {
      result.warnings = warnings;
    }

    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to calculate emissions',
      details: error?.message || String(error),
    });
  }
}

app.post('/calculate-emissions', handleCalculateEmissions);
app.post('/api/calculate-emissions', handleCalculateEmissions);

app.get('/calculate-emissions', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    endpoint: '/calculate-emissions',
    method: 'POST',
    description: 'EcoLeak Real Emission Hotspot & Leak Detection API',
    supported_content_types: ['application/json', 'text/csv', 'text/plain'],
  });
});

// Gemini AI Insights handler
async function handleAiInsights(req: Request, res: Response) {
  try {
    const body = req.body || {};
    const question = typeof body.question === 'string' ? body.question.trim() : '';

    if (!question) {
      res.status(400).json({ error: 'A non-empty question is required.' });
      return;
    }

    const analysis: Partial<EmissionsResult> = body.analysis || {
      total_emissions: body.total_emissions ?? 0,
      unit: body.unit ?? 'tCO2e',
      breakdown: body.breakdown ?? [],
      top_leak: body.top_leak,
      pareto: body.pareto,
    };

    const insights = await getGeminiInsights(question, analysis);
    res.status(200).json(insights);
  } catch (error: any) {
    if (error instanceof EmptyQuestionError) {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error('AI insights route error:', error?.message || error);
    res.status(500).json({ error: 'Failed to process AI insights.' });
  }
}

app.post('/ai/insights', handleAiInsights);
app.post('/api/ai/insights', handleAiInsights);

app.get('/ai/insights', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    endpoint: '/ai/insights',
    method: 'POST',
    description: 'EcoLeak Gemini AI Insights: Interprets deterministic audit calculations.',
  });
});

// Vite middleware or static serving
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EcoLeak server running at http://0.0.0.0:${PORT}`);
  });
}

start();
