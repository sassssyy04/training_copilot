const axios = require('axios');

async function extractSteps(manual) {
  const prompt = `
Extract onboarding steps from the manual below.
Return as JSON:
[
  {"step": 1, "instruction": "Click 'Leads'"},
  ...
]
Manual:
"""${manual}"""
  `;

  const res = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a training assistant.' },
        { role: 'user', content: prompt }
      ]
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const json = res.data.choices[0].message.content;
  return JSON.parse(json);
}

module.exports = { extractSteps };
