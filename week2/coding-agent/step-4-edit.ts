// Step 4: Edit. It changes files on your machine without asking.
// Run: bun step-4-edit.ts
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

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
  {
    name: "edit_file",
    description:
      "Make edits to a text file. Replaces 'old_str' with 'new_str' in the given file. 'old_str' and 'new_str' MUST be different from each other. If the file doesn't exist and 'old_str' is empty, it will be created.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "The path to the file" },
        old_str: { type: "string", description: "Text to search for. Must match exactly." },
        new_str: { type: "string", description: "Text to replace old_str with" },
      },
      required: ["path", "old_str", "new_str"],
    },
    run: ({ path, old_str, new_str }: { path: string; old_str: string; new_str: string }) => {
      if (!existsSync(path) && old_str === "") {
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, new_str);
        return `Created ${path}`;
      }
      const content = readFileSync(path, "utf8");
      if (!content.includes(old_str)) return "Error: old_str not found in file";
      writeFileSync(path, content.replace(old_str, () => new_str));
      return "OK";
    },
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
