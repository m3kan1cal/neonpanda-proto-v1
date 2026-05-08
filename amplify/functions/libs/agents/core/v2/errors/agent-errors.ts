/**
 * Typed errors thrown by the v2 agent framework.
 * Phase 1 — see the agent-upgrade plan §3.1.
 */

export class AgentError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AgentError";
  }
}

export class TimeoutError extends AgentError {
  constructor(toolId: string, timeoutMs: number) {
    super(
      `Tool '${toolId}' exceeded its ${timeoutMs}ms timeout`,
      "tool_timeout",
      { toolId, timeoutMs },
    );
    this.name = "TimeoutError";
  }
}

export class ToolNotFoundError extends AgentError {
  constructor(toolName: string) {
    super(`Tool '${toolName}' is not registered with this agent`, "tool_not_found", {
      toolName,
    });
    this.name = "ToolNotFoundError";
  }
}

export class ConfigError extends AgentError {
  constructor(message: string, details?: unknown) {
    super(message, "agent_config_invalid", details);
    this.name = "ConfigError";
  }
}
