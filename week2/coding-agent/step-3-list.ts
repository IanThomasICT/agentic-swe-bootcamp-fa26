// Step 3: List. It decides which files to open.
// Run: bun step-3-list.ts
import { readdirSync, readFileSync } from "node:fs";

const MODEL = "qwen/qwen3.8-27b:free"; // any OpenRouter model that supports tools
const API_KEY = process.env.OPENROUTER_API_KEY;
if (!API_KEY) {
  console.error("Set OPENROUTER_API_KEY first. See README.md.");
  process.exit(1);
}

// The tools: a description the model reads, and a function we run for it.
const tools = [
  {
    name: "read_file",
    description:
      "Read the contents of a given relative file path. Use this when you want to see what's inside a file. Do not use this with directory names.",
    parameters: {
      type: "object",
      properties: { path: { type: "string", description: "The relative path of a file in the working directory." } },
      required: ["path"],
    },
    run: ({ path }: { path: string }) => readFileSync(path, "utf8"),
  },
  {
    name: "list_files",
    description: "List files and directories at a given path. If no path is provided, lists files in the current directory.",
    parameters: {
      type: "object",
      properties: { path: { type: "string", description: "Optional relative path. Defaults to the current directory." } },
    },
    run: ({ path = "." }: { path?: string }) =>
      readdirSync(path, { withFileTypes: true })
        .map((entry) => entry.name + (entry.isDirectory() ? "/" : ""))
        .join("\n"),
  },
];

const messages: any[] = []; // the model remembers nothing; this list is its memory

async function callModel() {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages,
      tools: tools.map(({ name, description, parameters }) => ({ type: "function", function: { name, description, parameters } })),
    }),
  });
  const data: any = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? res.statusText);
  return data.choices[0].message;
}

function runTool(name: string, args: any): string {
  const tool: any = tools.find((t) => t.name === name);
  if (!tool) return `Error: unknown tool ${name}`;
  try {
    return tool.run(args);
  } catch (err: any) {
    return `Error: ${err.message}`;
  }
}

console.log(`Chatting with ${MODEL}. Type "exit" to quit.`);
while (true) {
  const input = prompt("\nYou:");
  if (!input || input === "exit") break;
  messages.push({ role: "user", content: input });

  try {
    // The agent loop: keep going until the model stops asking for tools.
    while (true) {
      const reply = await callModel();
      messages.push(reply);
      if (!reply.tool_calls?.length) {
        console.log(`\nAgent: ${reply.content}`);
        break;
      }
      for (const call of reply.tool_calls) {
        const args = JSON.parse(call.function.arguments || "{}");
        console.log(`  [tool] ${call.function.name}(${JSON.stringify(args)})`);
        messages.push({ role: "tool", tool_call_id: call.id, content: runTool(call.function.name, args) });
      }
    }
  } catch (err: any) {
    console.error(`\nError: ${err.message}`);
  }
}
