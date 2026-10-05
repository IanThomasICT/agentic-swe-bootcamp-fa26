// Step 1: A chatbot. It's a loop, but the only thing in it is text.
// Run (from week2/coding-agent): bun anthropic/step-1-chat.ts
import Anthropic from "@anthropic-ai/sdk";
import * as readline from "node:readline/promises";

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("No ANTHROPIC_API_KEY. Add it to week2/coding-agent/.env. See anthropic/README.md.");
  process.exit(1);
}

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment
const model = "claude-opus-5-5";

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

async function callModel(messages: Anthropic.MessageParam[]) {
  return client.messages.create({ model, max_tokens: 16000, messages });
}

// A reply is a list of content blocks. We only print the text ones.
function textOf(message: Anthropic.Message) {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

async function runAgent() {
  const messages: Anthropic.MessageParam[] = []; // the model remembers nothing; this list is its memory
  console.log(`Chat with ${model} (type "exit" to quit)`);

  while (true) {
    const userInput = await rl.question("\nUser: ");
    if (!userInput || userInput === "exit") break;
    messages.push({ role: "user", content: userInput });

    try {
      const message = await callModel(messages);
      messages.push({ role: "assistant", content: message.content }); // keep every block, not just the text
      if (message.stop_reason === "refusal") console.log("\nAgent declined this request.");
      else console.log(`\nAgent: ${textOf(message)}`);
    } catch (err: any) {
      console.error(`\nError: ${err.message}`);
    }
  }
  rl.close();
}

runAgent();
