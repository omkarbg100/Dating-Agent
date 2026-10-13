import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import apiRoutes from './routes/api.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Mount API routes
app.use('/api', apiRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'backend' });
});

// Centralized error handling
app.use((err, req, res, next) => {
  console.error('[Backend Server Error]:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// Start server after connecting to database
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`[Backend] Agentic Dating Node.js Backend running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[Backend] Failed to start server:', err);
    process.exit(1);
  }
};

startServer();

export default app;
