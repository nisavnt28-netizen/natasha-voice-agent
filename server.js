const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ===== APNI DETAILS YAHAN DAALO =====
const OPENROUTER_API_KEY = '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';
const YOUR_NAME = 'Natasha'; // Agent ka naam
// =====================================

// Main voice route — jab call aaye
app.post('/voice', async (req, res) => {
  const userSpeech = req.body.SpeechResult || '';
  const callStatus = req.body.CallStatus || '';

  console.log('User bola:', userSpeech);

  let responseText;

  if (!userSpeech) {
    // Pehli baar — greeting
    responseText = `Hi, main ${YOUR_NAME} hoon. Boliye, aapki kya help kar sakta hoon?`;
  } else {
    // AI se response lo
    responseText = await getAIResponse(userSpeech);
  }

  // TwiML response — Twilio ko batao kya bolna hai
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="hi-IN" voice="Polly.Aditi">${escapeXML(responseText)}</Say>
  <Gather 
    input="speech" 
    action="/voice" 
    language="hi-IN" 
    speechTimeout="3"
    timeout="10">
  </Gather>
  <Say language="hi-IN" voice="Polly.Aditi">Koi jawab nahi mila. Call band ho rahi hai. Dhanyawad.</Say>
</Response>`;

  res.type('text/xml');
  res.send(twiml);
});

// Jab call pehli baar aaye — 7 second baad receive karo
app.post('/incoming', (req, res) => {
  console.log('Nayi call aayi!');
  
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="7"/>
  <Redirect>/voice</Redirect>
</Response>`;

  res.type('text/xml');
  res.send(twiml);
});

// Health check
app.get('/', (req, res) => {
  res.send('✅ Natasha Voice Agent chal raha hai!');
});

// OpenRouter se AI response
async function getAIResponse(userMessage) {
  try {
    console.log('OpenRouter se pooch raha hoon...');
    
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'google/gemini-flash-1.5',
        messages: [
          {
            role: 'system',
            content: `Aap Natasha ho — ek helpful aur friendly Hindi voice assistant ho.
Yeh rules follow karo:
1. Sirf Hindi mein baat karo
2. Short jawab do — maximum 2-3 sentences
3. Simple language use karo
4. Professional aur polite raho
5. Agar samajh na aaye toh dobara poochho
6. Emojis mat use karo (yeh voice call hai)`
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

    const aiReply = response.data.choices[0].message.content;
    console.log('AI bola:', aiReply);
    return aiReply;

  } catch (error) {
    console.error('OpenRouter error:', error.response?.data || error.message);
    return 'Maafi chahta hoon, abhi kuch technical samasya hai. Thodi der mein dobara call karein.';
  }
}

// XML special characters ko safe karo
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
