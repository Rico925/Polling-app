import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Mix of countries + global topics for variety
const SOURCES = [
  { type: 'country', value: 'gb', code: 'GB' },
  { type: 'country', value: 'in', code: 'IN' },
  { type: 'country', value: 'au', code: 'AU' },
  { type: 'country', value: 'ca', code: 'CA' },
  { type: 'country', value: 'de', code: 'DE' },
  { type: 'country', value: 'fr', code: 'FR' },
  { type: 'country', value: 'jp', code: 'JP' },
  { type: 'country', value: 'br', code: 'BR' },
  { type: 'topic', value: 'africa', code: 'ZA' },
  { type: 'topic', value: 'middle east', code: 'AE' },
  { type: 'topic', value: 'asia pacific', code: 'SG' },
  { type: 'topic', value: 'europe', code: 'DE' },
  { type: 'topic', value: 'latin america', code: 'BR' },
  { type: 'country', value: 'us', code: 'US' },
];

async function fetchArticles(source: { type: string, value: string, code: string }) {
  let url = '';
  if (source.type === 'country') {
    url = `https://newsapi.org/v2/top-headlines?country=${source.value}&pageSize=2&apiKey=${Deno.env.get('NEWS_API_KEY')}`;
  } else {
    url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(source.value)}&pageSize=2&sortBy=publishedAt&apiKey=${Deno.env.get('NEWS_API_KEY')}`;
  }
  const r = await fetch(url);
  const d = await r.json();
  return (d.articles || []).slice(0, 2);
}

async function generatePoll(headline: string) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + Deno.env.get('GROQ_API_KEY'),
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 300,
      messages: [{ role: 'user', content: 'Create a poll from: ' + headline + '. Reply ONLY with JSON: {"question":"?","options":["A","B","C","D"]}' }]
    })
  });
  const d = await r.json();
  if (!d.choices) throw new Error('Groq error: ' + JSON.stringify(d));
  const text = d.choices[0].message.content.trim();
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}') + 1;
  return JSON.parse(text.slice(jsonStart, jsonEnd));
}

Deno.serve(async () => {
  try {
    const results = [];
    const shuffled = SOURCES.sort(() => 0.5 - Math.random()).slice(0, 4);

    for (const source of shuffled) {
      const articles = await fetchArticles(source);
      for (const article of articles) {
        try {
          const poll = await generatePoll(article.title);
          const exp = new Date(Date.now() + 86400000).toISOString();
          const { data: p, error: e } = await supabase
            .from('polls')
            .insert({
              question: poll.question,
              category: 'news',
              country_code: source.code,
              ai_generated: true,
              expires_at: exp
            })
            .select().single();
          if (e) { results.push('Error: ' + e.message); continue; }
          await supabase.from('options').insert(poll.options.map((t: string) => ({ poll_id: p.id, text: t })));
          results.push(`Created [${source.code}]: ` + poll.question);
        } catch (err) {
          results.push('Skip: ' + err.message);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});