#!/usr/bin/env node

import { createHmac } from "node:crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const API_BASE = "https://api.lnmarkets.com/v3";

interface Credentials {
  apiKey: string;
  apiSecret: string;
  passphrase: string;
}

function getCredentials(): Credentials {
  const apiKey = process.env.LNM_API_KEY;
  const apiSecret = process.env.LNM_API_SECRET;
  const passphrase = process.env.LNM_API_PASSPHRASE;

  if (!apiKey || !apiSecret || !passphrase) {
    throw new Error(
      "Missing credentials. Set LNM_API_KEY, LNM_API_SECRET, LNM_API_PASSPHRASE"
    );
  }

  return { apiKey, apiSecret, passphrase };
}

function generateSignature(
  secret: string,
  timestamp: number,
  method: string,
  path: string,
  data: string
): string {
  const payload = `${timestamp}${method.toLowerCase()}${path}${data}`;
  return createHmac("sha256", secret).update(payload).digest("base64");
}

async function request<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const creds = getCredentials();
  const timestamp = Date.now();

  const [pathOnly, queryString] = path.includes("?")
    ? path.split("?")
    : [path, null];

  const fullPath = `/v3${pathOnly.startsWith("/") ? "" : "/"}${pathOnly}`;
  const url = queryString
    ? `${API_BASE}${pathOnly}?${queryString}`
    : `${API_BASE}${pathOnly}`;

  const bodyStr = body ? JSON.stringify(body) : "";
  const dataForSig = bodyStr || (queryString ? `?${queryString}` : "");

  const signature = generateSignature(
    creds.apiSecret,
    timestamp,
    method,
    fullPath,
    dataForSig
  );

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "LNM-ACCESS-KEY": creds.apiKey,
    "LNM-ACCESS-SIGNATURE": signature,
    "LNM-ACCESS-PASSPHRASE": creds.passphrase,
    "LNM-ACCESS-TIMESTAMP": timestamp.toString(),
  };

  const response = await fetch(url, {
    method,
    headers,
    body: bodyStr || undefined,
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`API error (${response.status}): ${text}`);
  }

  return JSON.parse(text) as T;
}

async function publicRequest<T>(path: string): Promise<T> {
  const url = `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
  const response = await fetch(url);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`API error (${response.status}): ${text}`);
  }

  return JSON.parse(text) as T;
}

// Tool definitions
const tools = [
  {
    name: "get_ticker",
    description: "Get current BTC ticker with bid, ask, index price and funding rate",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "get_account",
    description: "Get account info including balance",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "list_trades",
    description: "List futures trades by status",
    inputSchema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          enum: ["open", "running", "closed", "canceled"],
          description: "Trade status filter",
          default: "running",
        },
        limit: {
          type: "number",
          description: "Max number of trades",
          default: 50,
        },
      },
    },
  },
  {
    name: "open_trade",
    description: "Open a new futures position",
    inputSchema: {
      type: "object" as const,
      properties: {
        side: {
          type: "string",
          enum: ["buy", "sell"],
          description: "Position side",
        },
        quantity: {
          type: "number",
          description: "Position size in satoshis",
        },
        leverage: {
          type: "number",
          description: "Leverage (1-100)",
        },
        type: {
          type: "string",
          enum: ["market", "limit"],
          description: "Order type",
          default: "market",
        },
        price: {
          type: "number",
          description: "Limit price (required for limit orders)",
        },
        stoploss: {
          type: "number",
          description: "Stop loss price",
        },
        takeprofit: {
          type: "number",
          description: "Take profit price",
        },
      },
      required: ["side", "quantity", "leverage"],
    },
  },
  {
    name: "close_trade",
    description: "Close a running trade",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "Trade ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "update_stoploss",
    description: "Update stop loss for a trade",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "Trade ID" },
        stoploss: { type: "number", description: "New stop loss price" },
      },
      required: ["id", "stoploss"],
    },
  },
  {
    name: "update_takeprofit",
    description: "Update take profit for a trade",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "Trade ID" },
        takeprofit: { type: "number", description: "New take profit price" },
      },
      required: ["id", "takeprofit"],
    },
  },
  {
    name: "add_margin",
    description: "Add margin to a running position",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "Trade ID" },
        amount: { type: "number", description: "Amount in satoshis to add" },
      },
      required: ["id", "amount"],
    },
  },
  {
    name: "cancel_trade",
    description: "Cancel a pending order",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "Trade ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "deposit_lightning",
    description: "Create a Lightning invoice to deposit funds",
    inputSchema: {
      type: "object" as const,
      properties: {
        amount: { type: "number", description: "Amount in satoshis" },
      },
      required: ["amount"],
    },
  },
  {
    name: "withdraw_lightning",
    description: "Withdraw via Lightning by paying an invoice",
    inputSchema: {
      type: "object" as const,
      properties: {
        invoice: { type: "string", description: "Lightning invoice (BOLT11)" },
      },
      required: ["invoice"],
    },
  },
];

// Tool handlers
async function handleTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case "get_ticker":
      return publicRequest("/futures/ticker");

    case "get_account":
      return request("GET", "/account");

    case "list_trades": {
      const status = (args.status as string) || "running";
      const limit = (args.limit as number) || 50;
      return request("GET", `/futures/isolated/trades/${status}?limit=${limit}`);
    }

    case "open_trade": {
      const body: Record<string, unknown> = {
        side: args.side,
        quantity: args.quantity,
        leverage: args.leverage,
        type: args.type || "market",
      };
      if (args.price) body.price = args.price;
      if (args.stoploss) body.stoploss = args.stoploss;
      if (args.takeprofit) body.takeprofit = args.takeprofit;
      return request("POST", "/futures/isolated/trade", body);
    }

    case "close_trade":
      return request("POST", "/futures/isolated/trade/close", { id: args.id });

    case "update_stoploss":
      return request("PUT", "/futures/isolated/trade/stoploss", {
        id: args.id,
        stoploss: args.stoploss,
      });

    case "update_takeprofit":
      return request("PUT", "/futures/isolated/trade/takeprofit", {
        id: args.id,
        takeprofit: args.takeprofit,
      });

    case "add_margin":
      return request("POST", "/futures/isolated/trade/add-margin", {
        id: args.id,
        amount: args.amount,
      });

    case "cancel_trade":
      return request("POST", "/futures/isolated/trade/cancel", { id: args.id });

    case "deposit_lightning":
      return request("POST", "/account/deposit/lightning", {
        amount: args.amount,
      });

    case "withdraw_lightning":
      return request("POST", "/account/withdraw/lightning", {
        invoice: args.invoice,
      });

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// MCP Server
const server = new Server(
  { name: "lnmarkets-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const result = await handleTool(name, (args as Record<string, unknown>) || {});
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("LN Markets MCP server running");
}

main().catch(console.error);
