const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

async function getOpenAIResponse(prompt) {
  const gptRes = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a helpful training assistant.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return gptRes.data.choices[0].message.content.trim();
}

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

app.post('/instruction', async (req, res) => {
  const { context, step } = req.body;

  try {
    const prompt = `
You are a training copilot. The user is currently seeing this on screen: "${context}".

Their current onboarding instruction is: "${step}"

Given this, provide a helpful and concise instruction or nudge to help them complete the step.
    `;

    let instruction;
    try {
      console.log('Attempting OpenAI first...');
      instruction = await getOpenAIResponse(prompt);
      console.log('OpenAI response successful');
    } catch (openAIError) {
      console.error('OpenAI failed, falling back to Claude:', openAIError.message);
      try {
        instruction = await getClaudeResponse(prompt);
        console.log('Claude fallback successful');
      } catch (claudeError) {
        console.error('Both OpenAI and Claude failed:', claudeError.message);
        throw new Error('Both AI services failed');
      }
    }

    res.json({ instruction });
  } catch (err) {
    console.error('AI service error:', err.message);
    res.status(500).json({ error: 'AI services failed' });
  }
});

app.get('/', (req, res) => {
  res.send('Training Copilot API is running');
});

const PORT = 4000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
