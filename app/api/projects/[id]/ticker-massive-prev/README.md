# Massive Previous Day Bar

`POST /api/projects/:id/ticker-massive-prev`

Fetches the previous day aggregate bar for a stock ticker and stores the raw payload on the project.

## Request

```json
{
  "symbol": "NVDA",
  "adjusted": true
}
```

## Response

```json
{
  "prevBarInfo": {
    "source": "massive",
    "symbol": "NVDA",
    "payload": {}
  },
  "fetchedAt": "2026-01-31T01:40:19.207Z"
}
```
