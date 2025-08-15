# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Repository purpose
- A lightweight, customizable coding CLI that runs in the terminal with an Ink-based TUI, powered by Groq/Cerebras (and wrappers for OpenAI/OpenRouter). The global command is groq.

Essentials
- Language/tooling: TypeScript (ESM), Ink (React for CLI UI)
- Node: >=16
- Entry point: src/core/cli.ts → dist/core/cli.js (published as bin "groq")
- Build output: dist/

Install and build
- Install deps: npm install
- Build once: npm run build
- Build in watch mode: npm run dev
- Link globally to use groq from any directory: npm link
- Run without install (latest published): npx groq-code-cli@latest

Run the CLI
- In this repo after build/link: groq
- Options (from README):
  - -t, --temperature <number>
  - -s, --system <message>
  - -d, --debug (writes debug-agent.log in CWD)
- First run auth: start groq and use /login to set the API key, or set GROQ_API_KEY in env

Testing and linting
- Test runner: AVA (configured in package.json)
  - Run all tests: npx ava
  - Run a single test file: npx ava path/to/test.ts
  - Run by title pattern: npx ava -m "pattern"
- Lint: XO (xo-react config) and Prettier
  - Lint: npx xo
  - Fix (where supported): npx xo --fix
  - Format check: npx prettier . --check
  - Format write: npx prettier . --write

Development tips (commands only)
- Rebuild on change while developing: npm run dev (keep a terminal tab running)
- After changing CLI entry or commands, rebuild and re-link: npm run build && npm link
- For debug traces of model/tool activity: run groq with --debug to capture debug-agent.log and per-request JSON bodies

High-level architecture (big picture)
- CLI bootstrap (src/core/cli.ts)
  - Uses commander to parse flags and prints startup banner
  - Creates Agent with default/selected model and renders the Ink App (src/ui/App.tsx)
- Agent orchestration (src/core/agent.ts)
  - Maintains conversation messages (system/user/assistant/tool)
  - Lazily initializes provider client using utils/local-settings for API key and default model
  - Chat loop calls provider.chat.completions with ALL_TOOL_SCHEMAS; when tool_calls are returned, executes them, appends tool results, and continues until a final assistant message
  - Tool approvals/interruptions and debug logging to debug-agent.log; writes request payloads to debug-request-<n>.json when --debug
- Providers (src/core/provider.ts)
  - Native Groq SDK integration
  - Lightweight wrappers that mimic Groq’s chat.completions interface for Cerebras, OpenAI, and OpenRouter using fetch
- Tools (src/tools)
  - tools.ts exports the TOOL_REGISTRY and executeTool, plus concrete tools:
    - File ops: read_file, create_file, edit_file, delete_file, list_files, search_files (with size/safety checks)
    - Command exec: execute_command (short-running, with timeout)
    - Tasking: create_tasks, update_tasks, plan_tasks, execute_next_task
  - validators.ts enforces read-before-edit and argument validation; agent consults validators for safety
  - tool-schemas.ts defines the structured tool schemas exposed to the model
  - task-planner-tool.ts ties planning/execution tools into TOOL_REGISTRY
- Tasks (src/tasks)
  - task-planner.ts: builds TaskPlan structures for complex requests
  - task-execution-manager.ts: coordinates stepwise task execution and tracks history/progress
- Commands (slash) (src/commands)
  - base.ts defines CommandDefinition and CommandContext
  - index.ts aggregates and dispatches definitions (e.g., /help, /login, /model, /clear, /reasoning, /task) found under src/commands/definitions/
- UI (src/ui)
  - App.tsx is the Ink UI surface bridging user input, agent output, tool activity, and approvals
- Utilities (src/utils)
  - file-ops.ts (write/create/tree display), markdown.ts, constants.ts, errorUtils.ts (API error parsing/retry decisions), local-settings.ts (persist API keys, default model)

Working patterns the code expects
- Build before running locally so dist/core/cli.js exists
- For editing files via tools, the validator requires the file to be read first (read-before-edit safety)
- Use /model to switch provider/model; the agent updates the system message and persists the default model
- GROQ_API_KEY env var is preferred on first use; otherwise /login stores keys via local-settings

CI/automation
- No repo-local scripts for test/lint are defined; use the npx commands above

Notes from README that matter operationally
- Start groq to enter chat; use /login and /model in-session
- The project is intentionally small to encourage extension; add new tools in src/tools and schemas in tool-schemas.ts; add slash commands under src/commands/definitions and export in index.ts

