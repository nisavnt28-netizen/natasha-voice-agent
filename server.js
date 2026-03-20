const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ===== CONFIGURATION =====
const OPENROUTER_API_KEY = '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'; // Apni OpenRouter key daalo
const AGENT_NAME = 'Natasha';
const TWILIO_NUMBER = '+13185589435';
const BASE_URL = 'https://natasha-voice-agent-production.up.railway.app';
// =========================

// Health check
app.get('/', (req, res) => {
  res.send('✅ Natasha Voice Agent chal raha hai!');
});

// Jab call aaye — 7 second baad receive karo
app.post('/incoming', (req, res) => {
  console.log('📞 Nayi call aayi!');

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="7"/>
  <Redirect method="POST">${BASE_URL}/voice</Redirect>
</Response>`;

  res.type('text/xml');
  res.send(twiml);
});

// Main voice route — Natasha baat karegi
app.post('/voice', async (req, res) => {
  const userSpeech = req.body.SpeechResult || '';

  console.log('🎤 User bola:', userSpeech);

  let responseText;

  if (!userSpeech) {
    responseText = `Hi, main ${AGENT_NAME} hoon. Boliye, aapki kya help kar sakta hoon?`;
  } else {
    responseText = await getAIResponse(userSpeech);
  }

  console.log('🤖 Natasha bolegi:', responseText);

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="hi-IN" voice="Polly.Aditi">${escapeXML(responseText)}</Say>
  <Gather 
    input="speech" 
    action="${BASE_URL}/voice"
    method="POST"
    language="hi-IN" 
    speechTimeout="3"
    timeout="10">
  </Gather>
  <Say language="hi-IN" voice="Polly.Aditi">Koi jawab nahi mila. Dhanyawad. Call band ho rahi hai.</Say>
</Response>`;

  res.type('text/xml');
  res.send(twiml);
});

// Natasha khud call karegi — browser mein open karo
app.get('/call-me', async (req, res) => {
  const accountSid = process.env.TWILIO_SID;
  const authToken = process.env.TWILIO_TOKEN;
  const toNumber = req.query.to;

  if (!toNumber) {
    return res.send('❌ Number daalo! Example: /call-me?to=+91XXXXXXXXXX');
  }

  console.log('📲 Natasha call kar rahi hai:', toNumber);

  try {
    await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
      new URLSearchParams({
        To: toNumber,
        From: TWILIO_NUMBER,
        Url: `${BASE_URL}/voice`
      }),
      {
        auth: {
          username: accountSid,
          password: authToken
        }
      }
    );

    res.send(`✅ Natasha aapko call kar rahi hai ${toNumber} pe! Thodi der mein phone aayega.`);
  } catch (error) {
    console.error('❌ Call error:', error.response?.data || error.message);
    res.send('❌ Error: ' + JSON.stringify(error.response?.data || error.message));
  }
});

// OpenRouter se AI response
async function getAIResponse(userMessage) {
  try {
    console.log('🧠 OpenRouter se pooch raha hoon...');

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'google/gemini-flash-1.5',
        messages: [
          {
            role: 'system',
            content: `Aap ${AGENT_NAME} ho — ek helpful aur friendly Hindi voice assistant ho.
Yeh rules follow karo:
1. Sirf Hindi mein baat karo
2. Short jawab do — maximum 2-3 sentences
3. Simple aur clear language use karo
4. Professional aur polite raho
5. Agar samajh na aaye toh dobara poochho
6. Emojis mat use karo — yeh voice call hai`
          },
          {
            role: 'user',
            content: userMessage
          }
        ],
        max_tokens: 200
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://natasha-agent.com',
          'X-Title': 'Natasha Voice Agent'
        }
      }
    );

    const reply = response.data.choices[0].message.content;
    console.log('✅ AI response:', reply);
    return reply;

  } catch (error) {
    console.error('❌ OpenRouter error:', error.response?.data || error.message);
    return 'Maafi chahta hoon, abhi kuch technical samasya hai. Thodi der mein dobara call karein.';
  }
}

// XML special characters safe karo
function escapeXML(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🎙️ Natasha server port ${PORT} pe chal raha hai`);
});
