// Your coding agent. Build it here, one step at a time.
// Add each step's code to the section it belongs in.
// Stuck or behind? step-N-*.ts holds the finished code for every step.
// Run: bun main.ts

// ---- Config ----------------------------------------------------------------
// Step 1: import the OpenAI SDK and readline, check for OPENROUTER_API_KEY,
//         create the client (pointed at OpenRouter), pick a model, create rl.


// ---- Tools -----------------------------------------------------------------
// Step 2: the ToolDefinition interface, read_file, the tools list,
//         chatTools (the menu we send the model), and executeTool.
// Step 3: list_files
// Step 4: edit_file
// Step 5: run_command (asks before it runs)


// ---- Main Loop -------------------------------------------------------------
// Step 1: callModel, and runAgent's chat loop (read input, call the model, print the reply).
// Step 2: send chatTools with every request, and add the agent loop inside the chat loop:
//         keep calling the model while it asks for tools.

