# lnmarkets-mcp

> [!WARNING]
> **This repository is deprecated.** The MCP server is now built into [lnmarkets-cli](https://github.com/romainlnm/lnmarkets-cli).
>
> ```bash
> # Install the new CLI with built-in MCP server
> git clone https://github.com/romainlnm/lnmarkets-cli.git
> cd lnmarkets-cli
> cargo install --path .
> ```
>
> Update your Claude Desktop config:
> ```json
> {
>   "mcpServers": {
>     "lnmarkets": {
>       "command": "lnmarkets",
>       "args": ["mcp", "-s", "all"]
>     }
>   }
> }
> ```

---

*The content below is kept for historical reference only.*

---

MCP server for [LN Markets](https://lnmarkets.com) API v3.

## Setup

```bash
pnpm install
pnpm build
```

## Configuration

Set environment variables:

```bash
export LNM_API_KEY="your-api-key"
export LNM_API_SECRET="your-api-secret"
export LNM_API_PASSPHRASE="your-passphrase"
```

## Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "lnmarkets": {
      "command": "node",
      "args": ["/Users/romain/Documents/lnmarkets-mcp/dist/index.js"],
      "env": {
        "LNM_API_KEY": "your-api-key",
        "LNM_API_SECRET": "your-api-secret",
        "LNM_API_PASSPHRASE": "your-passphrase"
      }
    }
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `get_ticker` | BTC price, bid/ask, funding rate |
| `get_account` | Account info and balance |
| `list_trades` | List trades by status |
| `open_trade` | Open futures position |
| `close_trade` | Close running trade |
| `update_stoploss` | Update stop loss |
| `update_takeprofit` | Update take profit |
| `add_margin` | Add margin to position |
| `cancel_trade` | Cancel pending order |
| `deposit_lightning` | Create deposit invoice |
| `withdraw_lightning` | Withdraw via Lightning |

## Examples

```
"Check my LN Markets balance"
"Open a 10x long position with 1000 sats"
"Show my running trades"
"Close trade abc123"
"Create a deposit invoice for 50000 sats"
```
