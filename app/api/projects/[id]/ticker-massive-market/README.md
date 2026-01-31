# Massive Market Snapshot

`POST /api/projects/:id/ticker-massive-market`

Fetches Massive market snapshot data for a ticker and stores the raw payload on the project.
Defaults to the `stocks` market unless `market: "crypto"` is provided.

## Request

```json
{
  "symbol": "NVDA",
  "market": "stocks"
}
```

## Response

```json
{
  "marketInfo": {
    "source": "massive",
    "symbol": "NVDA",
    "market": "stocks",
    "payload": {}
  },
  "fetchedAt": "2026-01-31T01:15:19.207Z"
}
```
