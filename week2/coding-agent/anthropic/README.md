# Week 2 Coding Agent: Anthropic SDK version

The same five steps as `../step-N-*.ts`, written with the [Anthropic TypeScript SDK](https://github.com/anthropics/anthropic-sdk-typescript) instead of the OpenAI SDK + OpenRouter. Same tools, same two loops, and the "Try" prompts from `../README.md` work here too.

| Step | File | What it adds |
|---|---|---|
| 1 | `step-1-chat.ts` | A chat loop. Text only. |
| 2 | `step-2-read.ts` | `read_file` + the agent loop. |
| 3 | `step-3-list.ts` | `list_files`. |
| 4 | `step-4-edit.ts` | `edit_file`. |
| 5 | `step-5-bash.ts` | `run_command`, behind a `[y/N]` prompt. |

## Setup

1. Get an API key at [platform.claude.com](https://platform.claude.com/settings/keys). This is a paid API; there are no free models.
2. Add it to `week2/coding-agent/.env`:

   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```

3. Run from `week2/coding-agent` (where `.env` and `node_modules` live):

   ```bash
   bun install
   bun anthropic/step-5-bash.ts
   ```

## What's different from the OpenAI version

| | OpenAI SDK (`../step-N`) | Anthropic SDK (here) |
|---|---|---|
| Call | `client.chat.completions.create` | `client.messages.create` (needs `max_tokens`) |
| Tool schema | `{ type: "function", function: { name, description, parameters } }` | `{ name, description, input_schema }` |
| Reply | `choices[0].message` with `content` string + `tool_calls` | `content` is a list of blocks: `text`, `tool_use`, `thinking` |
| Loop condition | `message.tool_calls?.length` | `stop_reason === "tool_use"` |
| Tool input | JSON string, you `JSON.parse` it | Already parsed: `block.input` |
| Tool results | One `role: "tool"` message per call | One `role: "user"` message holding every `tool_result` block |
| Errors from a tool | Plain text | `tool_result` with `is_error: true` |

Always push the whole `message.content` back into history, not just the text. Claude Opus 5.5 thinks before it answers, and those `thinking` blocks must go back unchanged on the next request.
