const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
require('dotenv').config();
const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post('/generateSteps', async (req, res) => {
  const goal = req.body.goal;

  if (!goal) {
    return res.status(400).json({ error: 'Missing goal in request body' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant who creates clear, step-by-step onboarding instructions.'
        },
        {
          role: 'user',
          content: `I want to: ${goal}. Please break this down into a numbered list of clear onboarding steps.`
        }
      ],
      temperature: 0.7
    });

    const reply = completion.choices[0].message.content;
    const steps = reply
      .split('\n')
      .filter(line => line.match(/^\d+\.\s+/))
      .map(line => line.replace(/^\d+\.\s*/, '').trim());

    res.json({ steps });
  } catch (error) {
    console.error('OpenAI error:', error);
    res.status(500).json({ error: 'Failed to generate steps from OpenAI' });
  }
});

async function getClaudeResponse(prompt) {
  const claudeRes = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: 'claude-3-opus-20240229',
      max_tokens: 1000,
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.7
    },
    {
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      }
    }
  );
  return claudeRes.data.content[0].text.trim();
}

// Endpoint to get screen context using Gemini
app.get('/screen-context', async (req, res) => {
  try {
    const context = await getScreenContext();
    res.json({ context });
  } catch (error) {
    console.error('Error getting screen context:', error);
    res.status(500).json({ error: 'Failed to get screen context' });
  }
});

const { getOnboardingInstruction } = require('./src/gemini-context');

app.post('/instruction', async (req, res) => {
  const { step } = req.body;

  if (!step) {
    return res.status(400).json({ error: 'Missing step' });
  }

  try {
    const instruction = await getOnboardingInstruction(step);
    res.json({ instruction });
  } catch (err) {
    console.error('Gemini error:', err.message);
    res.status(500).json({ error: 'Gemini instruction generation failed' });
  }
});


app.get('/', (req, res) => {
  res.send('Training Copilot API is running');
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
