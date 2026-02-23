#!/usr/bin/env npx ts-node --esm
/**
 * Standalone Agent Chatbot
 *
 * A self-contained TypeScript implementation of the AI agent pattern used throughout
 * the neonpanda-proto-v1 backend. Includes weather and tides tool collection as a
 * demonstration of the ReAct (Reason → Act → Reflect) loop with external API calls.
 *
 * Usage:
 *   npx ts-node --esm scripts/agent-chatbot.ts
 *   # or with tsx:
 *   npx tsx scripts/agent-chatbot.ts
 *
 * Required environment variables:
 *   AWS_REGION            - AWS region for Bedrock (default: us-west-2)
 *   AWS_ACCESS_KEY_ID     - AWS credentials
 *   AWS_SECRET_ACCESS_KEY - AWS credentials
 *   AWS_SESSION_TOKEN     - AWS session token (if using temporary credentials)
 *
 * Optional environment variables:
 *   OPEN_METEO_BASE_URL   - Override Open-Meteo base URL (default: https://api.open-meteo.com)
 *   STORMGLASS_API_KEY    - StormGlass API key for enhanced tide data
 *
 * Models used:
 *   claude-haiku-4.5 (us.anthropic.claude-haiku-4-5-20251001-v1:0)
 *   Matches the EXECUTOR_MODEL_FULL used in our backend agents.
 *
 * Architecture notes:
 *   - Mirrors core/agent.ts Agent<TContext> base class pattern
 *   - Tool execution loop: Reason → Tool Use → Reflect → Repeat
 *   - Sequential tool execution (same as base Agent, not streaming)
 *   - Conversation history maintained across turns
 *   - All Bedrock types inlined (no external dependencies beyond AWS SDK)
 */

import readline from "node:readline";
import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";

// ─────────────────────────────────────────────────────────────────────────────
// Constants — mirrors MODEL_IDS and TEMPERATURE_PRESETS from api-helpers.ts
// ─────────────────────────────────────────────────────────────────────────────

const MODEL_ID = "us.anthropic.claude-haiku-4-5-20251001-v1:0";
const MAX_TOKENS = 32768;
const TEMPERATURE = 0.7;
const MAX_ITERATIONS = 20;
const AGENT_CALL_TIMEOUT_MS = 180_000;

// ─────────────────────────────────────────────────────────────────────────────
// Types — mirrors agents/core/types.ts
// ─────────────────────────────────────────────────────────────────────────────

/** Base agent context shared across all tools */
interface AgentContext {
  userId: string;
  [key: string]: any;
}

/** Tool definition — Claude uses description + inputSchema to decide when/how to call */
interface Tool<TContext extends AgentContext = AgentContext> {
  id: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: any, context: TContext) => Promise<any>;
}

/** Agent configuration */
interface AgentConfig<TContext extends AgentContext = AgentContext> {
  systemPrompt: string;
  tools: Tool<TContext>[];
  modelId?: string;
  context: TContext;
}

/** Bedrock Converse API message format */
interface AgentMessage {
  role: "user" | "assistant";
  content: any;
}

/** Bedrock ConverseCommand response shape (relevant subset) */
interface BedrockResponse {
  stopReason:
    | "tool_use"
    | "end_turn"
    | "max_tokens"
    | "stop_sequence"
    | "content_filtered";
  output: {
    message: {
      role: "assistant";
      content: any[];
    };
  };
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens?: number;
  };
}

/** Tool use block embedded in Bedrock assistant content */
interface ToolUseBlock {
  toolUse: {
    toolUseId: string;
    name: string;
    input: any;
  };
}

/** Bedrock tool configuration sent in toolConfig */
interface BedrockToolConfig {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bedrock Client — mirrors bedrockClient in api-helpers.ts
// ─────────────────────────────────────────────────────────────────────────────

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION ?? "us-west-2",
});

// ─────────────────────────────────────────────────────────────────────────────
// Logging — lightweight replacement for the structured logger in logger.ts
// ─────────────────────────────────────────────────────────────────────────────

const log = {
  info: (msg: string, meta?: Record<string, unknown>) => {
    const suffix = meta ? ` ${JSON.stringify(meta)}` : "";
    process.stderr.write(`[INFO] ${msg}${suffix}\n`);
  },
  warn: (msg: string, meta?: Record<string, unknown>) => {
    const suffix = meta ? ` ${JSON.stringify(meta)}` : "";
    process.stderr.write(`[WARN] ${msg}${suffix}\n`);
  },
  error: (msg: string, meta?: Record<string, unknown>) => {
    const suffix = meta ? ` ${JSON.stringify(meta)}` : "";
    process.stderr.write(`[ERROR] ${msg}${suffix}\n`);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Core Bedrock API helper — mirrors callBedrockApiForAgent in api-helpers.ts
// ─────────────────────────────────────────────────────────────────────────────

async function callBedrockApiForAgent(
  systemPrompt: string,
  messages: AgentMessage[],
  tools: BedrockToolConfig[],
  modelId: string = MODEL_ID,
): Promise<BedrockResponse> {
  const toolSpecs = tools.map((t) => ({
    toolSpec: {
      name: t.name,
      description: t.description,
      inputSchema: { json: t.inputSchema },
    },
  }));

  const command = new ConverseCommand({
    modelId,
    messages: messages as any,
    system: [{ text: systemPrompt }],
    toolConfig: { tools: toolSpecs as any },
    inferenceConfig: {
      maxTokens: MAX_TOKENS,
      temperature: TEMPERATURE,
    },
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AGENT_CALL_TIMEOUT_MS);

  let response: any;
  try {
    response = await bedrockClient.send(command, {
      abortSignal: controller.signal,
    });
  } catch (error: any) {
    if (error.name === "AbortError") {
      throw new Error(
        `Bedrock agent API call timed out after ${AGENT_CALL_TIMEOUT_MS / 1000}s`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  return response as BedrockResponse;
}

// ─────────────────────────────────────────────────────────────────────────────
// Base Agent class — mirrors agents/core/agent.ts Agent<TContext>
// ─────────────────────────────────────────────────────────────────────────────

class Agent<TContext extends AgentContext = AgentContext> {
  protected config: AgentConfig<TContext>;
  private conversationHistory: AgentMessage[] = [];

  constructor(config: AgentConfig<TContext>) {
    this.config = { modelId: MODEL_ID, ...config };
  }

  /**
   * Main conversation entry point.
   * Runs the ReAct tool loop until Claude provides a final text response.
   * Mirrors Agent.converse() from agents/core/agent.ts.
   */
  async converse(userMessage: string): Promise<string> {
    log.info("🤖 Agent conversation started");

    this.conversationHistory.push({
      role: "user",
      content: [{ text: userMessage }],
    });

    let finalResponse = "";
    let iterationCount = 0;

    while (iterationCount < MAX_ITERATIONS) {
      iterationCount++;
      log.info(`🔄 Agent iteration ${iterationCount}`);

      const response = await this.invokeModel();

      switch (response.stopReason) {
        case "tool_use":
          log.info("🔧 Claude decided to use tools");
          await this.handleToolUse(response);
          break; // continue loop — Claude will reflect on tool results

        case "end_turn":
          log.info("✅ Claude provided final response");
          finalResponse = this.extractText(response);
          this.conversationHistory.push({
            role: "assistant",
            content: response.output.message.content,
          });
          return finalResponse;

        case "max_tokens":
          log.warn("⚠️ Response hit max tokens limit");
          return this.extractText(response) || "Response exceeded token limit.";

        case "stop_sequence":
          log.info("🛑 Response stopped at stop sequence");
          finalResponse = this.extractText(response);
          this.conversationHistory.push({
            role: "assistant",
            content: response.output.message.content,
          });
          return finalResponse;

        case "content_filtered":
          log.warn("⚠️ Response was content filtered");
          return "Response was filtered due to content policy.";

        default:
          log.warn(`⚠️ Unknown stop reason: ${(response as any).stopReason}`);
          return finalResponse || "Unexpected stop reason.";
      }
    }

    log.warn(`⚠️ Agent hit max iterations (${MAX_ITERATIONS})`);
    return finalResponse || "Agent exceeded maximum iterations.";
  }

  /**
   * Invoke Bedrock with current history + tools.
   * Mirrors Agent.invokeModel() from agents/core/agent.ts.
   */
  private async invokeModel(): Promise<BedrockResponse> {
    log.info("🤖 Invoking model", {
      messageCount: this.conversationHistory.length,
      toolCount: this.config.tools.length,
    });

    const tools: BedrockToolConfig[] = this.config.tools.map((t) => ({
      name: t.id,
      description: t.description,
      inputSchema: t.inputSchema,
    }));

    const startTime = Date.now();
    const response = await callBedrockApiForAgent(
      this.config.systemPrompt,
      this.conversationHistory,
      tools,
      this.config.modelId ?? MODEL_ID,
    );
    const duration = Date.now() - startTime;

    log.info("📊 Bedrock response received", {
      stopReason: response.stopReason,
      duration: `${duration}ms`,
      inputTokens: response.usage?.inputTokens,
      outputTokens: response.usage?.outputTokens,
    });

    return response;
  }

  /**
   * Execute all tools Claude requested and feed results back into history.
   * Mirrors Agent.handleToolUse() from agents/core/agent.ts.
   */
  protected async handleToolUse(response: BedrockResponse): Promise<void> {
    const contentBlocks = response.output?.message?.content ?? [];
    const toolUses = contentBlocks.filter(
      (block: any): block is ToolUseBlock => !!block.toolUse,
    );

    log.info(`🔧 Executing ${toolUses.length} tool(s)`);

    // Add Claude's assistant message (including toolUse blocks) to history
    this.conversationHistory.push({
      role: "assistant",
      content: contentBlocks,
    });

    const toolResults: any[] = [];

    for (const block of toolUses) {
      const toolUse = block.toolUse;
      const tool = this.config.tools.find((t) => t.id === toolUse.name);

      if (!tool) {
        log.warn(`⚠️ Tool not found: ${toolUse.name}`);
        toolResults.push({
          toolResult: {
            toolUseId: toolUse.toolUseId,
            content: [{ json: { error: `Tool '${toolUse.name}' not found` } }],
            status: "error",
          },
        });
        continue;
      }

      log.info(`⚙️ [TOOL_START] ${tool.id}`);
      const startTime = Date.now();

      try {
        const result = await tool.execute(toolUse.input, this.config.context);
        const duration = Date.now() - startTime;
        log.info(`✅ [TOOL_SUCCESS] ${tool.id}`, { duration: `${duration}ms` });

        toolResults.push({
          toolResult: {
            toolUseId: toolUse.toolUseId,
            content: [{ json: result }],
            status: "success",
          },
        });
      } catch (error: any) {
        const duration = Date.now() - startTime;
        log.error(`❌ [TOOL_ERROR] ${tool.id}`, {
          error: error?.message,
          duration: `${duration}ms`,
        });

        toolResults.push({
          toolResult: {
            toolUseId: toolUse.toolUseId,
            content: [
              { json: { error: error?.message ?? "Tool execution failed" } },
            ],
            status: "error",
          },
        });
      }
    }

    // Add all tool results back as a user message — Claude will reason over them
    this.conversationHistory.push({
      role: "user",
      content: toolResults,
    });

    log.info("📥 Tool results added to conversation history");
  }

  /** Extract plain text from a Bedrock response */
  private extractText(response: BedrockResponse): string {
    const blocks = response.output?.message?.content ?? [];
    return blocks
      .filter((b: any) => b.text)
      .map((b: any) => b.text)
      .join("\n");
  }

  /** Return full conversation history (useful for debugging) */
  getConversationHistory(): AgentMessage[] {
    return this.conversationHistory;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Weather & Tides Tool Collection
//
// Uses free, no-auth-required APIs:
//   • Open-Meteo  (https://api.open-meteo.com) — weather forecasts
//   • NOAA Tides  (https://tidesandcurrents.noaa.gov/api) — US tide predictions
//   • Open-Meteo Marine API — wave/tide heights globally
//
// Geocoding (lat/lon lookup from city names):
//   • Open-Meteo Geocoding API (https://geocoding-api.open-meteo.com) — free, no key
// ─────────────────────────────────────────────────────────────────────────────

/** Resolve a place name to lat/lon using Open-Meteo's free geocoding API */
async function geocodePlace(
  placeName: string,
): Promise<{ lat: number; lon: number; displayName: string } | null> {
  const url =
    `https://geocoding-api.open-meteo.com/v1/search` +
    `?name=${encodeURIComponent(placeName)}&count=1&language=en&format=json`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const data: any = await res.json();
  const result = data?.results?.[0];
  if (!result) return null;

  return {
    lat: result.latitude,
    lon: result.longitude,
    displayName: [result.name, result.admin1, result.country]
      .filter(Boolean)
      .join(", "),
  };
}

// ── Tool: get_current_weather ─────────────────────────────────────────────────

const getCurrentWeatherTool: Tool = {
  id: "get_current_weather",
  description: `
Get the current weather conditions and short-term forecast for any location worldwide.

Use this tool whenever the user asks about:
- Current weather (temperature, wind, humidity, conditions)
- Today's weather or "what's it like outside"
- Short-term forecast (next few hours to 7 days)
- Weather in a specific city, region, or country

The tool accepts a place name (city, town, region, country) and returns:
- Current temperature in Celsius and Fahrenheit
- Weather condition description (clear, cloudy, rain, snow, etc.)
- Wind speed and direction
- Humidity percentage
- 3-day high/low forecast

Resolves place names to coordinates automatically using geocoding.
No API key required.
  `.trim(),
  inputSchema: {
    type: "object",
    properties: {
      location: {
        type: "string",
        description:
          'City, town, or region name. Examples: "San Francisco", "London", "Tokyo", "Sydney, Australia"',
      },
      units: {
        type: "string",
        enum: ["celsius", "fahrenheit"],
        description: 'Temperature units. Defaults to "celsius".',
      },
    },
    required: ["location"],
  },
  async execute(input: { location: string; units?: string }) {
    const { location, units = "celsius" } = input;

    log.info(`🌤️ Fetching weather for: ${location}`);

    const geo = await geocodePlace(location);
    if (!geo) {
      return {
        error: true,
        message: `Could not find location: "${location}". Try a more specific place name.`,
      };
    }

    const { lat, lon, displayName } = geo;
    const tempUnit = units === "fahrenheit" ? "fahrenheit" : "celsius";
    const windUnit = "kmh";

    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,` +
      `weather_code,wind_speed_10m,wind_direction_10m,precipitation` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum` +
      `&temperature_unit=${tempUnit}` +
      `&wind_speed_unit=${windUnit}` +
      `&forecast_days=4` +
      `&timezone=auto`;

    const res = await fetch(url);
    if (!res.ok) {
      return {
        error: true,
        message: `Weather API returned HTTP ${res.status} for ${displayName}`,
      };
    }

    const data: any = await res.json();
    const current = data.current;
    const daily = data.daily;

    // WMO weather code → human description
    const condition = wmoCodeToDescription(current.weather_code);
    const unitLabel = tempUnit === "fahrenheit" ? "°F" : "°C";

    const forecast = (daily.time as string[]).slice(1, 4).map((date, i) => ({
      date,
      condition: wmoCodeToDescription(daily.weather_code[i + 1]),
      high: `${daily.temperature_2m_max[i + 1]}${unitLabel}`,
      low: `${daily.temperature_2m_min[i + 1]}${unitLabel}`,
      precipitation: `${daily.precipitation_sum[i + 1]}mm`,
    }));

    return {
      location: displayName,
      coordinates: { lat, lon },
      current: {
        temperature: `${current.temperature_2m}${unitLabel}`,
        feelsLike: `${current.apparent_temperature}${unitLabel}`,
        condition,
        humidity: `${current.relative_humidity_2m}%`,
        windSpeed: `${current.wind_speed_10m} km/h`,
        windDirection: degreesToCardinal(current.wind_direction_10m),
        precipitation: `${current.precipitation}mm`,
      },
      forecast,
    };
  },
};

// ── Tool: get_weather_forecast ────────────────────────────────────────────────

const getWeatherForecastTool: Tool = {
  id: "get_weather_forecast",
  description: `
Get a detailed multi-day weather forecast for any location worldwide.

Use this tool when the user asks about:
- Weather for a specific future date range (e.g., "this weekend", "next week")
- Planning activities around weather (hiking, travel, events)
- Hourly breakdown of conditions for a day
- Precipitation probability and amounts
- UV index, sunrise/sunset times

Returns up to 16 days of daily forecasts with hourly resolution for the first 2 days.
No API key required.
  `.trim(),
  inputSchema: {
    type: "object",
    properties: {
      location: {
        type: "string",
        description: 'City or region name. E.g., "Paris", "Miami Beach, FL"',
      },
      days: {
        type: "number",
        description: "Number of forecast days (1–16). Defaults to 7.",
      },
      units: {
        type: "string",
        enum: ["celsius", "fahrenheit"],
        description: 'Temperature units. Defaults to "celsius".',
      },
    },
    required: ["location"],
  },
  async execute(input: { location: string; days?: number; units?: string }) {
    const { location, days = 7, units = "celsius" } = input;
    const forecastDays = Math.min(Math.max(days, 1), 16);

    log.info(`📅 Fetching ${forecastDays}-day forecast for: ${location}`);

    const geo = await geocodePlace(location);
    if (!geo) {
      return {
        error: true,
        message: `Could not find location: "${location}".`,
      };
    }

    const { lat, lon, displayName } = geo;
    const tempUnit = units === "fahrenheit" ? "fahrenheit" : "celsius";

    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lon}` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,` +
      `precipitation_sum,precipitation_probability_max,` +
      `wind_speed_10m_max,uv_index_max,sunrise,sunset` +
      `&temperature_unit=${tempUnit}` +
      `&wind_speed_unit=kmh` +
      `&forecast_days=${forecastDays}` +
      `&timezone=auto`;

    const res = await fetch(url);
    if (!res.ok) {
      return {
        error: true,
        message: `Forecast API returned HTTP ${res.status} for ${displayName}`,
      };
    }

    const data: any = await res.json();
    const daily = data.daily;
    const unitLabel = tempUnit === "fahrenheit" ? "°F" : "°C";

    const forecast = (daily.time as string[]).map((date, i) => ({
      date,
      condition: wmoCodeToDescription(daily.weather_code[i]),
      high: `${daily.temperature_2m_max[i]}${unitLabel}`,
      low: `${daily.temperature_2m_min[i]}${unitLabel}`,
      precipitationTotal: `${daily.precipitation_sum[i]}mm`,
      precipitationChance: `${daily.precipitation_probability_max[i]}%`,
      maxWind: `${daily.wind_speed_10m_max[i]} km/h`,
      uvIndex: daily.uv_index_max[i],
      sunrise: daily.sunrise[i],
      sunset: daily.sunset[i],
    }));

    return {
      location: displayName,
      coordinates: { lat, lon },
      forecastDays,
      forecast,
    };
  },
};

// ── Tool: get_tide_predictions ────────────────────────────────────────────────

const getTidePredictionsTool: Tool = {
  id: "get_tide_predictions",
  description: `
Get tide predictions (high and low tide times and heights) for a coastal location.

Use this tool when the user asks about:
- High tide / low tide times for today or upcoming days
- Best times for surfing, fishing, beachcombing, or boating
- Tidal range for a coastal area
- Whether the tide is coming in or going out

For US locations, uses NOAA Tides and Currents API (highly accurate, official data).
For international locations, uses Open-Meteo Marine API (wave/sea level data).

The tool accepts a coastal place name and date range.
No API key required for NOAA or Open-Meteo data.
  `.trim(),
  inputSchema: {
    type: "object",
    properties: {
      location: {
        type: "string",
        description:
          'Coastal city or station name. For NOAA US stations, use city names near NOAA stations (e.g., "San Francisco", "Boston", "Miami", "Seattle"). For international locations use any coastal city.',
      },
      days: {
        type: "number",
        description: "Number of days of tide data (1–7). Defaults to 2.",
      },
      date: {
        type: "string",
        description:
          'Start date in YYYY-MM-DD format. Defaults to today (UTC). E.g., "2025-08-15"',
      },
    },
    required: ["location"],
  },
  async execute(input: { location: string; days?: number; date?: string }) {
    const { location, days = 2 } = input;
    const tideDays = Math.min(Math.max(days, 1), 7);

    log.info(`🌊 Fetching tide predictions for: ${location}`);

    // Try NOAA first (US stations) — falls back to Open-Meteo Marine for global coverage
    const noaaResult = await fetchNoaaTides(location, tideDays, input.date);
    if (noaaResult) {
      return noaaResult;
    }

    // Fallback: Open-Meteo Marine API (global sea level / swell data)
    return await fetchOpenMeteoMarine(location, tideDays);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// NOAA Tides Implementation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Look up the nearest NOAA tide station for a US coastal city.
 * Uses the NOAA Metadata API to find stations by name.
 */
async function findNoaaStation(
  locationName: string,
): Promise<{ stationId: string; stationName: string } | null> {
  try {
    // Search NOAA stations list — filter by name
    const url =
      `https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json` +
      `?type=waterlevels`;

    const res = await fetch(url);
    if (!res.ok) return null;

    const data: any = await res.json();
    const stations: any[] = data?.stations ?? [];

    // Case-insensitive partial match on station name
    const normalized = locationName.toLowerCase();
    const match = stations.find(
      (s: any) =>
        s.name?.toLowerCase().includes(normalized) ||
        s.state?.toLowerCase().includes(normalized),
    );

    if (!match) return null;
    return { stationId: match.id, stationName: match.name };
  } catch {
    return null;
  }
}

async function fetchNoaaTides(
  location: string,
  days: number,
  startDate?: string,
): Promise<Record<string, unknown> | null> {
  try {
    const station = await findNoaaStation(location);
    if (!station) return null;

    const start = startDate
      ? startDate.replace(/-/g, "")
      : formatDateYYYYMMDD(new Date());
    const endDateObj = new Date(
      startDate ?? new Date().toISOString().slice(0, 10),
    );
    endDateObj.setDate(endDateObj.getDate() + days - 1);
    const end = formatDateYYYYMMDD(endDateObj);

    const url =
      `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter` +
      `?product=predictions&application=agent_chatbot` +
      `&begin_date=${start}&end_date=${end}` +
      `&station=${station.stationId}` +
      `&datum=MLLW&time_zone=lst_ldt&interval=hilo&units=english&format=json`;

    const res = await fetch(url);
    if (!res.ok) return null;

    const data: any = await res.json();
    const predictions: any[] = data?.predictions ?? [];

    if (!predictions.length) return null;

    const tides = predictions.map((p: any) => ({
      datetime: p.t,
      type: p.type === "H" ? "High" : "Low",
      heightFeet: parseFloat(p.v).toFixed(2) + " ft",
    }));

    return {
      source: "NOAA Tides and Currents",
      station: station.stationName,
      stationId: station.stationId,
      location,
      days,
      tides,
    };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Open-Meteo Marine API (global fallback for tide/wave data)
// ─────────────────────────────────────────────────────────────────────────────

async function fetchOpenMeteoMarine(
  location: string,
  days: number,
): Promise<Record<string, unknown>> {
  const geo = await geocodePlace(location);
  if (!geo) {
    return {
      error: true,
      message: `Could not find location: "${location}". Try a more specific coastal place name.`,
    };
  }

  const { lat, lon, displayName } = geo;
  const forecastDays = Math.min(days, 7);

  const url =
    `https://marine-api.open-meteo.com/v1/marine` +
    `?latitude=${lat}&longitude=${lon}` +
    `&hourly=wave_height,wave_direction,wave_period,swell_wave_height` +
    `&daily=wave_height_max,wave_direction_dominant,wave_period_max` +
    `&forecast_days=${forecastDays}` +
    `&timezone=auto`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return {
        error: true,
        message: `Marine API returned HTTP ${res.status} for ${displayName}. This location may not be coastal.`,
      };
    }

    const data: any = await res.json();
    const daily = data.daily;

    if (!daily) {
      return {
        error: true,
        message: `No marine data available for ${displayName}. This location may not be near the ocean.`,
      };
    }

    const forecast = (daily.time as string[]).map(
      (date: string, i: number) => ({
        date,
        maxWaveHeight: `${daily.wave_height_max[i]} m`,
        dominantWaveDirection: degreesToCardinal(
          daily.wave_direction_dominant[i],
        ),
        maxWavePeriod: `${daily.wave_period_max[i]} s`,
      }),
    );

    return {
      source: "Open-Meteo Marine API",
      note: "NOAA station not found for this location. Showing wave/swell data instead of precise tide predictions. For US coastal locations, try a major city near a NOAA station.",
      location: displayName,
      coordinates: { lat, lon },
      days: forecastDays,
      marineConditions: forecast,
    };
  } catch (error: any) {
    return {
      error: true,
      message: `Failed to fetch marine data: ${error?.message}`,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility helpers
// ─────────────────────────────────────────────────────────────────────────────

/** WMO weather code → human-readable string (subset of official table) */
function wmoCodeToDescription(code: number): string {
  const codes: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Icy fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
  };
  return codes[code] ?? `Weather code ${code}`;
}

/** Wind degrees → cardinal direction */
function degreesToCardinal(degrees: number): string {
  const dirs = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  const idx = Math.round(degrees / 22.5) % 16;
  return dirs[idx] ?? "N";
}

/** Format Date as YYYYMMDD string (for NOAA API) */
function formatDateYYYYMMDD(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent Context type for the chatbot
// ─────────────────────────────────────────────────────────────────────────────

interface ChatbotContext extends AgentContext {
  userId: string;
  sessionStart: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// System Prompt
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `
You are a helpful AI assistant with access to real-time weather and tidal information.

You can answer general questions conversationally, and when users ask about weather
or tides, you use your tools to fetch live data and present it clearly.

## Capabilities

### Weather
- Current conditions (temperature, wind, humidity, conditions)
- Multi-day forecasts (up to 16 days)
- Sunrise/sunset times, UV index, precipitation probability

### Tides
- High and low tide times for US coastal stations (via NOAA — official, precise data)
- Wave height and swell data for international coastal locations

## Guidelines
- Always use tools to fetch real-time data — never make up weather or tide values
- Present data in a friendly, easy-to-read format
- If a location can't be found, ask the user to clarify or try a nearby major city
- For tides, mention whether data comes from NOAA (US stations, precise) or Open-Meteo Marine (global approximation)
- Round numbers sensibly and include units
- Offer useful context: "Great day for surfing!" or "Bring an umbrella"

## Conversational style
- Warm, concise, and helpful
- Ask clarifying questions if needed (e.g., "Which city in Texas?")
- Proactively offer related info the user might find useful
`.trim();

// ─────────────────────────────────────────────────────────────────────────────
// Chat Bot — CLI readline loop
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║         Weather & Tides Agent Chatbot            ║");
  console.log("║  Powered by Claude Haiku 4.5 + Bedrock           ║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log("║  Tools: get_current_weather, get_weather_forecast ║");
  console.log("║         get_tide_predictions                      ║");
  console.log("║  APIs:  Open-Meteo (weather), NOAA (US tides)    ║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log("║  Type your message and press Enter.               ║");
  console.log("║  Type 'exit' or press Ctrl+C to quit.            ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  const context: ChatbotContext = {
    userId: "cli-user",
    sessionStart: new Date().toISOString(),
  };

  const agent = new Agent<ChatbotContext>({
    systemPrompt: SYSTEM_PROMPT,
    modelId: MODEL_ID,
    tools: [
      getCurrentWeatherTool,
      getWeatherForecastTool,
      getTidePredictionsTool,
    ],
    context,
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  const prompt = () =>
    new Promise<string>((resolve) => {
      process.stdout.write("\nYou: ");
      rl.once("line", resolve);
    });

  const cleanup = () => {
    rl.close();
    console.log("\n\nGoodbye!");
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  // Check stdin is a TTY or pipe — if it's closed we exit
  rl.on("close", cleanup);

  while (true) {
    let userInput: string;

    try {
      userInput = await prompt();
    } catch {
      break;
    }

    userInput = userInput?.trim();

    if (!userInput) continue;

    if (
      userInput.toLowerCase() === "exit" ||
      userInput.toLowerCase() === "quit" ||
      userInput.toLowerCase() === "bye"
    ) {
      cleanup();
      break;
    }

    try {
      process.stdout.write("\nAssistant: ");
      const response = await agent.converse(userInput);
      console.log(response);
    } catch (error: any) {
      console.error(`\n[Error] ${error?.message ?? "Unknown error occurred"}`);
      if (error?.message?.includes("timed out")) {
        console.error(
          "The request timed out. Please try a simpler question or check your AWS credentials.",
        );
      } else if (
        error?.message?.includes("credentials") ||
        error?.message?.includes("AccessDenied")
      ) {
        console.error(
          "AWS credentials error. Ensure AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION are set.",
        );
      }
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
