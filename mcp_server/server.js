const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { extractSteps } = require('./utils/parseManual');

require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const SESSION_FILE = './storage/sessions.json';

// Load or create session store
let sessions = {};
console.log('Loading sessions from:', SESSION_FILE);
if (fs.existsSync(SESSION_FILE)) {
  const fileContent = fs.readFileSync(SESSION_FILE);
  console.log('Raw file content:', fileContent.toString());
  sessions = JSON.parse(fileContent);
  console.log('Loaded sessions:', sessions);
} else {
  console.log('No sessions file found at:', SESSION_FILE);
}

// Save session store
function saveSessions() {
  console.log('Saving sessions:', sessions);
  fs.writeFileSync(SESSION_FILE, JSON.stringify(sessions, null, 2));
}

// Upload manual and extract steps
app.post('/mcp/upload', async (req, res) => {
  const { sessionId, manual } = req.body;
  console.log('Upload request received for session:', sessionId);
  if (!manual || !sessionId) return res.status(400).send('Missing data');

  const steps = await extractSteps(manual);
  sessions[sessionId] = { steps, progress: 0 };
  saveSessions();
  res.json({ steps });
});

// Get current step
app.get('/mcp/context/:sessionId', (req, res) => {
  const sessionId = req.params.sessionId;
  console.log('Context request received for session:', sessionId);
  console.log('Available sessions:', sessions);
  
  const session = sessions[sessionId];
  if (!session) {
    console.log('Session not found:', sessionId);
    return res.status(404).send('Session not found');
  }

  const step = session.steps[session.progress] || null;
  console.log('Returning step:', step, 'for progress:', session.progress);
  res.json({ currentStep: step, progress: session.progress });
});

// Update progress
app.post('/mcp/progress', (req, res) => {
  const { sessionId, success } = req.body;
  console.log('Progress update received for session:', sessionId, 'success:', success);
  
  if (!sessionId || typeof success !== 'boolean') return res.status(400).send('Invalid payload');

  if (sessions[sessionId]) {
    if (success) sessions[sessionId].progress++;
    saveSessions();
    res.sendStatus(200);
  } else {
    res.status(404).send('Session not found');
  }
});

const PORT = 4001;
app.listen(PORT, () => console.log(`🧠 MCP server running at http://localhost:${PORT}`));
app.get('/', (req, res) => {
    res.send('🧠 MCP Server is running. Use POST /mcp/upload to submit onboarding manuals.');
});
  