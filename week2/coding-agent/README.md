# Week 2: Build a Coding Agent

A coding agent is an LLM, a few tools, and a loop. We build one together in class, one step at a time. Each file is the complete agent up to that step, so you can run any step on its own.

| Step | File | What it adds | Try |
|---|---|---|---|
| 1 | `step-1-chat.ts` | A chat loop. Text only. | "What files are in this folder?" |
| 2 | `step-2-read.ts` | `read_file` + the agent loop. Now it's an agent. | "What's in RESEARCH.md?" |
| 3 | `step-3-list.ts` | `list_files`. It decides what to open. | "What files are here? Summarize each one." |
| 4 | `step-4-edit.ts` | `edit_file`. It changes files without asking. | "Create fizzbuzz.ts that prints FizzBuzz from 1 to 20." |
| 5 | `step-5-bash.ts` | `run_command`, behind a `[y/N]` prompt. | "Run fizzbuzz.ts with bun. If anything is wrong, fix it." |

`step-5-bash.ts` is the finished agent: about 135 lines, 4 tools, 2 loops.

## Setup

### 1. Install Bun

**Mac / Linux / Git Bash:**

```bash
curl -fsSL https://bun.sh/install | bash
```

**Windows (PowerShell):**

```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

Open a new terminal, then verify: `bun --version`

### 2. Get an OpenRouter key

1. Go to [openrouter.ai/keys](https://openrouter.ai/keys) and sign in with Google or GitHub.
2. Click **Create Key** and copy it.

### 3. Set the key in your terminal

**Mac / Linux / Git Bash:**

```bash
export OPENROUTER_API_KEY="sk-or-v1-..."
```

**Windows (PowerShell):**

```powershell
$env:OPENROUTER_API_KEY = "sk-or-v1-..."
```

The key lasts for this terminal only. Open a new terminal, set it again. **Never commit a key to git.**

## Run

```bash
git clone https://github.com/IanThomasICT/agentic-swe-bootcamp-fa26.git
cd agentic-swe-bootcamp-fa26/week2/coding-agent
bun step-1-chat.ts
```

Type `exit` to quit.

The agent works on the folder you run it from. To point it at your team's `RESEARCH.md`, run it from that folder:

```bash
cd path/to/your-team-folder
bun path/to/agentic-swe-bootcamp-fa26/week2/coding-agent/step-2-read.ts
```

## Free models

We use free OpenRouter models (IDs end in `:free`). Things to know:

- **Daily limit:** 50 requests per day and 20 per minute. Every trip around the agent loop is one request.
- **Your data:** free models may use your prompts and files for training. Don't point the agent at anything confidential.
- **Models come and go.** If you get an error about the model, pick another free model with tool support at [openrouter.ai/models](https://openrouter.ai/models?max_price=0&supported_parameters=tools) and change `MODEL` at the top of the file.

On Windows, `run_command` runs in `cmd.exe`, so ask for Windows commands (`dir`, not `ls`).

## Go further

- Add a `search_files` tool that finds a word across files. Does the agent use it instead of reading everything?
- Load an `AGENTS.md` file as a system message at startup. What changes?
- Delete a tool's `description`. Does the agent still use it correctly?
- [How to Build an Agent](https://ampcode.com/notes/how-to-build-an-agent), the article this build is based on, walks through the same agent in Go.
