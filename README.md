# Agentic Software Engineering Bootcamp (Fall 2026)

Code and exercises for the Newman University Agentic Software Engineering Bootcamp.

**New here?** This repo is your starting point for every week of class. Clone it once, run the setup script once, and you're ready to go. The main event is [Week 2](week2/coding-agent/), where you build a coding agent — a small AI assistant that can read, list, and edit files on your computer, and run commands with your approval. Later weeks build on that agent, so do the setup before the first class.

## What's in this repo

| Week | What you'll do | Folder |
|------|----------------|--------|
| 2 | Build a coding agent from scratch: an LLM, four tools, and a loop. TypeScript, running on Bun, talking to models through OpenRouter. | [week2/coding-agent](week2/coding-agent/) |
| 3 | Investigate and plan work on a small shared API, using your agent. | [week3](week3/) |
| 4 | Write and test rules (an `AGENTS.md` file) that steer how your agent works on your project. | [week4](week4/) |

Each week's folder has its own README with step-by-step instructions for that week.

## Setup (do this once, before Week 2)

1. **Clone this repo** (or download it as a ZIP from GitHub if you don't have git yet — see the [Week 2 README](week2/coding-agent/) for that route).
2. **Get a free OpenRouter key.** Go to [openrouter.ai/keys](https://openrouter.ai/keys), sign in with Google or GitHub, click **Create Key**, and copy it. OpenRouter is the service we use to reach AI models; the key is a password that lets your code talk to it. Free models have a daily limit, which is fine for class.
3. **Run the setup script** from inside the cloned folder. It checks for git and Bun (and installs them if missing), asks you to paste your key, saves it to `week2/coding-agent/.env`, and installs the agent's packages.

   **Mac, Linux, or Git Bash:**
   ```bash
   bash scripts/setup.sh
   ```

   **Windows (PowerShell or Command Prompt):**
   ```powershell
   .\scripts\setup.bat
   ```

4. **Try the agent:**
   ```bash
   cd week2/coding-agent
   bun main.ts
   ```
   Type `exit` to quit.

To see which free models are available right now, run `bash scripts/list-available-models.sh` or `.\scripts\list-available-models.bat` (add `--all` for every free model). More detail lives in the [Week 2 README](week2/coding-agent/).

## What you need

- [Bun](https://bun.sh/) — a JavaScript runner, like Node but faster. Week 2 onward; the setup script installs it for you.
- A free [OpenRouter](https://openrouter.ai/keys) key — lets your agent talk to AI models. Week 2 onward; sign up and create it yourself (step 2 above).
- [git](https://git-scm.com/downloads) (the setup script installs it) and [gh](https://cli.github.com/) — the GitHub command-line tool, used in later weeks for team repos.
