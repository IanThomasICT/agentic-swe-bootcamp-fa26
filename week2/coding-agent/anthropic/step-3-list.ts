// Step 3: List. It decides what to open.
// Run (from week2/coding-agent): bun anthropic/step-3-list.ts
import Anthropic from "@anthropic-ai/sdk";
import * as readline from "node:readline/promises";
import { readdir, readFile } from "node:fs/promises";

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("No ANTHROPIC_API_KEY. Add it to week2/coding-agent/.env. See anthropic/README.md.");
  process.exit(1);
}

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment
const model = "claude-opus-5-5";

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

// A tool: a description the model reads, and a function we run for it.
interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Anthropic.Tool.InputSchema;
  function: (input: any) => Promise<string>;
}

const ReadFileDefinition: ToolDefinition = {
  name: "read_file",
  description:
    "Read the contents of a given relative file path. Use this when you want to see what's inside a file. Do not use this with directory names.",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string", description: "The relative path of a file in the working directory." },
    },
    required: ["path"],
  },
  async function({ path }) {
    return readFile(path, "utf-8");
  },
};

const ListFilesDefinition: ToolDefinition = {
  name: "list_files",
  description:
    "List files and directories at a given path. If no path is provided, lists files in the current directory.",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string", description: "Optional relative path. Defaults to the current directory." },
    },
  },
  async function({ path = "." }) {
    const entries = await readdir(path, { withFileTypes: true });
    return entries.map((e) => (e.isDirectory() ? e.name + "/" : e.name)).join("\n");
  },
};

const tools = [ReadFileDefinition, ListFilesDefinition];

// The menu we send the model with every request.
const anthropicTools: Anthropic.Tool[] = tools.map((t) => ({
  name: t.name,
  description: t.description,
  input_schema: t.inputSchema,
}));

async function callModel(messages: Anthropic.MessageParam[]) {
  return client.messages.create({ model, max_tokens: 16000, messages, tools: anthropicTools });
}

// A reply is a list of content blocks. We only print the text ones.
function textOf(message: Anthropic.Message) {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

async function executeTool(toolUse: Anthropic.ToolUseBlock): Promise<Anthropic.ToolResultBlockParam> {
  const toolDef = tools.find((t) => t.name === toolUse.name);
  if (!toolDef) {
    return { type: "tool_result", tool_use_id: toolUse.id, content: `Unknown tool ${toolUse.name}`, is_error: true };
  }

  try {
    console.log(`  [tool] ${toolUse.name}(${JSON.stringify(toolUse.input)})`);
    const content = await toolDef.function(toolUse.input); // the SDK already parsed the input JSON
    return { type: "tool_result", tool_use_id: toolUse.id, content };
  } catch (err) {
    return { type: "tool_result", tool_use_id: toolUse.id, content: String(err), is_error: true };
  }
}

async function runAgent() {
  const messages: Anthropic.MessageParam[] = []; // the model remembers nothing; this list is its memory
  console.log(`Chat with ${model} (type "exit" to quit)`);

  while (true) {
    const userInput = await rl.question("\nUser: ");
    if (!userInput || userInput === "exit") break;
    const turnStart = messages.length;
    messages.push({ role: "user", content: userInput });

    try {
      // The agent loop: keep calling the model until it stops asking for tools.
      let message = await callModel(messages);
      messages.push({ role: "assistant", content: message.content }); // keep every block, not just the text
      while (message.stop_reason === "tool_use") {
        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const block of message.content) {
          if (block.type === "tool_use") toolResults.push(await executeTool(block));
        }
        messages.push({ role: "user", content: toolResults }); // all results go back in one message
        message = await callModel(messages);
        messages.push({ role: "assistant", content: message.content });
      }
      if (message.stop_reason === "refusal") console.log("\nAgent declined this request.");
      else console.log(`\nAgent: ${textOf(message)}`);
    } catch (err: any) {
      messages.length = turnStart; // drop the half-finished turn so the next request is valid
      console.error(`\nError: ${err.message}`);
    }
  }
  rl.close();
}

runAgent();
