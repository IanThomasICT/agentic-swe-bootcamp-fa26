// Step 1: A chatbot. It's a loop, but the only thing in it is text.
// Run: bun step-1-chat.ts
import OpenAI from "openai";
import * as readline from "node:readline/promises";

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

async function callModel(messages: OpenAI.ChatCompletionMessageParam[]) {
  const response = await client.chat.completions.create({ model, messages });
  return response.choices[0]!.message;
}

async function runAgent() {
  const messages: OpenAI.ChatCompletionMessageParam[] = []; // the model remembers nothing; this list is its memory
  console.log(`Chat with ${model} (type "exit" to quit)`);

  while (true) {
    const userInput = await rl.question("\nUser: ");
    if (!userInput || userInput === "exit") break;
    messages.push({ role: "user", content: userInput });

    try {
      const message = await callModel(messages);
      messages.push(message);
      console.log(`\nAgent: ${message.content}`);
    } catch (err: any) {
      console.error(`\nError: ${err.message}`);
    }
  }
  rl.close();
}

runAgent();
