// Step 1: A chatbot. It's a loop, but the only thing in it is text.
// Run: bun step-1-chat.ts
const MODEL = "qwen/qwen3.8-27b:free"; // any OpenRouter model that supports tools
const API_KEY = process.env.OPENROUTER_API_KEY;
if (!API_KEY) {
  console.error("Set OPENROUTER_API_KEY first. See README.md.");
  process.exit(1);
}

const messages: any[] = []; // the model remembers nothing; this list is its memory

async function callModel() {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages }),
  });
  const data: any = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? res.statusText);
  return data.choices[0].message;
}

console.log(`Chatting with ${MODEL}. Type "exit" to quit.`);
while (true) {
  const input = prompt("\nYou:");
  if (!input || input === "exit") break;
  messages.push({ role: "user", content: input });

  try {
    const reply = await callModel();
    messages.push(reply);
    console.log(`\nAgent: ${reply.content}`);
  } catch (err: any) {
    console.error(`\nError: ${err.message}`);
  }
}
