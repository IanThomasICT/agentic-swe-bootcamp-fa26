# Week 2: Build a Coding Agent

A coding agent is an LLM, a few tools, and a loop. We build one together in class, one step at a time, in `main.ts`. Each `step-N` file is the complete agent up to that step, so you can run any step on its own.

| Step | File | What it adds | Try |
|---|---|---|---|
| 1 | `step-1-chat.ts` | A chat loop. Text only. | "What files are in this folder?" |
| 2 | `step-2-read.ts` | `read_file` + the agent loop. Now it's an agent. | "What's in RESEARCH.md?" |
| 3 | `step-3-list.ts` | `list_files`. It decides what to open. | "What files are here? Summarize each one." |
| 4 | `step-4-edit.ts` | `edit_file`. It changes files without asking. | "Create fizzbuzz.ts that prints FizzBuzz from 1 to 20." |
| 5 | `step-5-bash.ts` | `run_command`, behind a `[y/N]` prompt. | "Run fizzbuzz.ts with bun. If anything is wrong, fix it." |
| + | `advanced-agent.ts` | The full Spring 2026 agent: streaming, a spinner, colored output, `<think>` display, and `AGENTS.md` as the system prompt (read, list, and edit tools; no `run_command`). | "Read AGENTS.md and follow it." |

`step-5-bash.ts` is the finished agent: about 170 lines, 4 tools, 2 loops. It uses the [OpenAI SDK](https://github.com/openai/openai-node) pointed at OpenRouter, since OpenRouter speaks the OpenAI API.

## Setup

First, get a free OpenRouter key: go to [openrouter.ai/keys](https://openrouter.ai/keys), sign in with Google or GitHub, click **Create Key**, and copy it.

Then clone the repo and run setup. It checks for git and Bun (installs them if missing), asks for your key, saves it to `week2/coding-agent/.env`, and runs `bun install`.

**Mac / Linux / Git Bash:**

```bash
git clone https://github.com/IanThomasICT/agentic-swe-bootcamp-fa26.git
cd agentic-swe-bootcamp-fa26
bash scripts/setup.sh
```

**Windows (PowerShell or Command Prompt):**

```powershell
git clone https://github.com/IanThomasICT/agentic-swe-bootcamp-fa26.git
cd agentic-swe-bootcamp-fa26
.\scripts\setup.bat
```

No git yet? Download the repo as a ZIP from GitHub (**Code** > **Download ZIP**), unzip it, and run setup from that folder. On Windows you can double-click `scripts\setup.bat`.

`.env` is in `.gitignore`. **Never commit a key to git.**

## Run

Everything runs from `week2/coding-agent`, where your `.env` lives:

```bash
cd week2/coding-agent
bun main.ts
```

Build your agent in `main.ts`, one step at a time; its sections show where each step's code goes. Behind? Run the step's finished file instead, for example `bun step-2-read.ts`. Type `exit` to quit.

To ask the agent about your team's `RESEARCH.md`, copy it into `week2/coding-agent` first. The agent works on the folder you run it from.

## Free models

We use free OpenRouter models (IDs end in `:free`). Things to know:

- **Daily limit:** 50 requests per day and 20 per minute. Every trip around the agent loop is one request.
- **Your data:** free models may use your prompts and files for training. Don't point the agent at anything confidential.
- **Models come and go.** If you get an error about the model, run this from the repo root to list the free models that support tools, then change `model` at the top of the file:

  ```bash
  bash scripts/list-available-models.sh        # Mac, Linux, Git Bash
  .\scripts\list-available-models.bat          # Windows
  ```

  Add `--all` to see every free model. Backup that worked on Oct 5: `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`.

On Windows, `run_command` runs in `cmd.exe`, so ask for Windows commands (`dir`, not `ls`).

## Go further

- Add a `search_files` tool that finds a word across files. Does the agent use it instead of reading everything?
- Load an `AGENTS.md` file as a system message at startup. What changes?
- Delete a tool's `description`. Does the agent still use it correctly?
- [How to Build an Agent](https://ampcode.com/notes/how-to-build-an-agent), the article this build is based on, walks through the same agent in Go.
