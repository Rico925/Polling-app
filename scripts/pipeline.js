require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
  const r = await fetch("https://newsapi.org/v2/top-headlines?country=us&pageSize=3&apiKey=" + process.env.NEWS_API_KEY);
  const d = await r.json();
  if (!d.articles) { console.log("News error:", d); return; }
  for (const a of d.articles.slice(0, 3)) {
    const gr = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + process.env.GROQ_API_KEY },
      body: JSON.stringify({ model: "llama-3.3-70b-versatile", max_tokens: 300, messages: [{ role: "user", content: "Create a poll from: " + a.title + '. Reply ONLY with JSON: {"question":"?","options":["A","B","C","D"]}' }] })
    });
    const gd = await gr.json();
    if (!gd.choices) { console.log("Groq error:", gd); continue; }
    const text = gd.choices[0].message.content.trim();
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}') + 1;
    const poll = JSON.parse(text.slice(jsonStart, jsonEnd));
    const exp = new Date(Date.now() + 86400000).toISOString();
    const { data: p, error: e } = await supabase.from("polls").insert({ question: poll.question, category: "news", country_code: "US", ai_generated: true, expires_at: exp }).select().single();
    if (e) { console.log("Insert error:", e.message); continue; }
    await supabase.from("options").insert(poll.options.map(t => ({ poll_id: p.id, text: t })));
    console.log("Created:", poll.question);
  }
  console.log("Done!");
}
main();