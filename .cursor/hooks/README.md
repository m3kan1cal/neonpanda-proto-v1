# Cursor Hooks Documentation

This project uses [Cursor Hooks](https://cursor.com/docs/agent/hooks) to enhance the AI agent development experience. Hooks automatically run when the AI agent performs certain actions.

## Installed Hooks

### 1. **afterFileEdit** - Lint and Format

**Script:** `.cursor/hooks/lint-and-format.sh`

Automatically runs after the AI agent edits any file:

- **ESLint** auto-fix on `.js` and `.jsx` files
- **Prettier** formatting on `.js`, `.jsx`, `.ts`, `.tsx`, `.json`, `.md`, `.html`, `.css` files

This ensures all AI-generated code is properly formatted and passes linting checks immediately after being written.

### 2. **beforeShellExecution** - Audit and Safety

**Script:** `.cursor/hooks/audit-shell.sh`

Runs before any shell command the AI wants to execute:

- **Logs all commands** to `/tmp/cursor-agent-audit/shell-commands.log`
- **Blocks dangerous commands** like:
  - `rm -rf /` or `rm -rf ~`
  - `git push --force`
  - Disk formatting commands (`mkfs`, `dd`)
  - Other destructive operations

The AI will be prevented from running these commands and will inform you that they were blocked.

### 3. **afterAgentResponse** - Response Logging

**Script:** `.cursor/hooks/log-agent-response.sh`

Logs every AI agent response with timestamps to `/tmp/cursor-agent-audit/agent-responses.log`. Useful for:

- Debugging complex AI interactions
- Understanding what the AI did during long tasks
- Audit trail of AI operations

## Audit Logs Location

All audit logs are stored in `/tmp/cursor-agent-audit/`:

- `shell-commands.log` - All shell commands the AI attempts to run
- `agent-responses.log` - All AI agent responses with timestamps

**View recent shell commands:**

```bash
tail -f /tmp/cursor-agent-audit/shell-commands.log
```

**View agent responses:**

```bash
tail -f /tmp/cursor-agent-audit/agent-responses.log
```

## How to Use

### Activating Hooks

1. **Restart Cursor** after modifying `hooks.json` or hook scripts
2. Hooks will automatically run when the AI agent performs the corresponding actions
3. Check Cursor Settings → Hooks tab to see hook execution status

### Debugging Hooks

- **Settings → Hooks**: Shows configured and executed hooks
- **Output channel**: View hook errors in Cursor's output panel
- Enable logging in hook scripts by uncommenting log lines

### Modifying Hooks

To change hook behavior, edit the scripts in `.cursor/hooks/`:

- `lint-and-format.sh` - Add/remove file types or linters
- `audit-shell.sh` - Add/remove dangerous command patterns
- `log-agent-response.sh` - Change log format or location

**After making changes:**

1. Restart Cursor to reload hooks
2. Test by having the AI agent perform the hooked action

## Configuration

The main configuration is in `.cursor/hooks.json`:

```json
{
  "version": 1,
  "hooks": {
    "afterFileEdit": [{ "command": "./.cursor/hooks/lint-and-format.sh" }],
    "beforeShellExecution": [{ "command": "./.cursor/hooks/audit-shell.sh" }],
    "afterAgentResponse": [
      { "command": "./.cursor/hooks/log-agent-response.sh" }
    ]
  }
}
```

## Available Hook Events

According to the [Cursor Hooks documentation](https://cursor.com/docs/agent/hooks), you can add hooks for:

**Agent (Cmd+K/Agent Chat):**

- `beforeShellExecution` / `afterShellExecution` ✅ Using
- `beforeMCPExecution` / `afterMCPExecution`
- `beforeReadFile` / `afterFileEdit` ✅ Using
- `beforeSubmitPrompt`
- `stop`
- `afterAgentResponse` ✅ Using
- `afterAgentThought`

**Tab (inline completions):**

- `beforeTabFileRead`
- `afterTabFileEdit`

## Troubleshooting

### Hooks not running?

1. Restart Cursor
2. Check that hook scripts are executable: `ls -la .cursor/hooks/`
3. View Cursor Settings → Hooks for status
4. Check Output panel for errors

### Want to temporarily disable hooks?

Rename `hooks.json` to `hooks.json.disabled` and restart Cursor.

### Want to add more dangerous command patterns?

Edit `.cursor/hooks/audit-shell.sh` and add patterns to the `dangerous_patterns` array.

## Team Usage

These hooks are checked into version control and will automatically apply to all team members using this project in Cursor. No additional setup required!

For global (user-level) hooks, place `hooks.json` in `~/.cursor/hooks.json`.
