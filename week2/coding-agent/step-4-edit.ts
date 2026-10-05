// Step 4: Edit, our Write tool. It changes files without asking.
// Run: bun step-4-edit.ts
import OpenAI from "openai";
import * as readline from "node:readline/promises";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

if (!process.env.OPENROUTER_API_KEY) {
  console.error("Set OPENROUTER_API_KEY first. See README.md.");
  process.exit(1);
}

// OpenRouter speaks the OpenAI API, so we use the OpenAI SDK and point it at OpenRouter.
const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});
const model = "nvidia/nemotron-3-super-120b-a12b:free"; // any OpenRouter model that supports tools

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

// A tool: a description the model reads, and a function we run for it.
interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: OpenAI.FunctionParameters;
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

const EditFileDefinition: ToolDefinition = {
  name: "edit_file",
  description:
    "Make edits to a text file. Replaces 'old_str' with 'new_str' in the given file. 'old_str' and 'new_str' MUST be different from each other. If the file doesn't exist and 'old_str' is empty, it will be created.",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string", description: "The path to the file" },
      old_str: { type: "string", description: "Text to search for. Must match exactly." },
      new_str: { type: "string", description: "Text to replace old_str with" },
    },
    required: ["path", "old_str", "new_str"],
  },
  async function({ path, old_str, new_str }) {
    if (!path || old_str === new_str) return "Error: invalid input parameters";
    if (!existsSync(path)) {
      if (old_str !== "") return "Error: file does not exist";
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, new_str);
      return `Created ${path}`;
    }
    const content = await readFile(path, "utf-8");
    if (!content.includes(old_str)) return "Error: old_str not found in file";
    await writeFile(path, content.replace(old_str, () => new_str));
    return "OK";
  },
};

const tools = [ReadFileDefinition, ListFilesDefinition, EditFileDefinition];

// The menu we send the model with every request.
const chatTools: OpenAI.ChatCompletionTool[] = tools.map((t) => ({
  type: "function",
  function: { name: t.name, description: t.description, parameters: t.inputSchema },
}));

async function callModel(messages: OpenAI.ChatCompletionMessageParam[]) {
  const response = await client.chat.completions.create({ model, messages, tools: chatTools });
  return response.choices[0]!.message;
}

async function executeTool(toolCall: OpenAI.ChatCompletionMessageFunctionToolCall): Promise<string> {
  const { name, arguments: args } = toolCall.function;
  const toolDef = tools.find((t) => t.name === name);
  if (!toolDef) return `Error: unknown tool ${name}`;

  try {
    const input = JSON.parse(args || "{}");
    console.log(`  [tool] ${name}(${JSON.stringify(input)})`);
    return await toolDef.function(input);
  } catch (err) {
    return `Error: ${err}`;
  }
}

async function runAgent() {
  const messages: OpenAI.ChatCompletionMessageParam[] = []; // the model remembers nothing; this list is its memory
  console.log(`Chat with ${model} (type "exit" to quit)`);

  while (true) {
    const userInput = await rl.question("\nUser: ");
    if (!userInput || userInput === "exit") break;
    messages.push({ role: "user", content: userInput });

    try {
      // The agent loop: keep calling the model until it stops asking for tools.
      let message = await callModel(messages);
      while (message.tool_calls?.length) {
        messages.push(message);
        for (const toolCall of message.tool_calls) {
          const result = await executeTool(toolCall as OpenAI.ChatCompletionMessageFunctionToolCall);
          messages.push({ role: "tool", tool_call_id: toolCall.id, content: result });
        }
        message = await callModel(messages);
      }
      messages.push(message);
      console.log(`\nAgent: ${message.content}`);
    } catch (err: any) {
      console.error(`\nError: ${err.message}`);
    }
  }
  rl.close();
}

runAgent();
