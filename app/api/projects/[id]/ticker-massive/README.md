# Massive Integration

This endpoint fetches ticker overview data from Massive.

## Endpoint

`POST /api/projects/:id/ticker-massive`

### Request

```json
{ "symbol": "NASDAQ:COIN" }
```

If `symbol` is omitted, the project's `underlyingSymbol` is used.

### Storage

The full Massive response payload is stored on the project as:

```ts
{
  source: "massive";
  symbol: string;
  payload: Record<string, unknown>;
}
```

### Response

```json
{
  "tickerInfo": { "source": "massive", "symbol": "COIN", "payload": {} },
  "fetchedAt": "2026-01-31T01:23:00.000Z"
}
```
