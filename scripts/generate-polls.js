require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const NEWS_API_KEY = process.env.NEWS_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fetchNews(country = 'us') {
  const url = `https://newsapi.org/v2/top-headlines?country=${country}&pageSize=5&apiKey=${NEWS_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.articles || [];
}

async function generatePollFromHeadline(headline) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Based on this news headline, create a poll question with exactly 4 short answer options.

Headline: "${headline}"

Respond ONLY with valid JSON in this exact format, no other text:
{
  "question": "your poll question here?",
  "options": ["Option 1", "Option 2", "Option 3", "Option 4"]
}`
      }]
    })
  });

  const data = await response.json();
  console.log('AI response:', JSON.stringify(data).slice(0, 300));
  const text = data.choices[0].message.content.trim();
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

async function insertPoll(poll, countryCode = 'US') {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { data: pollData, error: pollError } = await supabase
    .from('polls')
    .insert({
      question: poll.question,
      category: 'news',
      country_code: countryCode,
      ai_generated: true,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (pollError) { console.log('Poll insert error:', pollError); return; }

  const options = poll.options.map((text) => ({
    poll_id: pollData.id,
    text,
  }));

  const { error: optionsError } = await supabase.from('options').insert(options);
  if (optionsError) console.log('Options insert error:', optionsError);
  else console.log(`Poll created: "${poll.question}"`);
}

async function main() {
  console.log('Fetching trending news...');
  const articles = await fetchNews('us');

  if (!articles.length) {
    console.log('No articles found.');
    return;
  }

  for (const article of articles.slice(0, 3)) {
    try {
      console.log(`Processing: ${article.title}`);
      const poll = await generatePollFromHeadline(article.title);
      await insertPoll(poll, 'US');
    } catch (err) {
      console.log('Error processing article:', err.message);
    }
  }

  console.log('Done! Check your Supabase polls table.');
}

main();