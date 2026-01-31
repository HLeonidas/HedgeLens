# Alpha Vantage Integration

This endpoint uses Alpha Vantage `OVERVIEW` and `GLOBAL_QUOTE` to enrich project tickers.

## Source Responses

### GLOBAL_QUOTE (example)

```json
{
  "Global Quote": {
    "01. symbol": "IBM",
    "02. open": "307.4500",
    "03. high": "307.7830",
    "04. low": "299.7300",
    "05. price": "306.7900",
    "06. volume": "5939218",
    "07. latest trading day": "2026-01-30",
    "08. previous close": "309.2400",
    "09. change": "-2.4500",
    "10. change percent": "-0.7923%"
  }
}
```

### OVERVIEW (example)

```json
{
  "Symbol": "IBM",
  "AssetType": "Common Stock",
  "Name": "International Business Machines",
  "Description": "International Business Machines Corporation (IBM) ...",
  "CIK": "51143",
  "Exchange": "NYSE",
  "Currency": "USD",
  "Country": "USA",
  "Sector": "TECHNOLOGY",
  "Industry": "INFORMATION TECHNOLOGY SERVICES",
  "Address": "ONE NEW ORCHARD ROAD, ARMONK, NY, UNITED STATES, 10504",
  "OfficialSite": "https://www.ibm.com",
  "FiscalYearEnd": "December",
  "LatestQuarter": "2025-09-30",
  "MarketCapitalization": "283865055000",
  "EBITDA": "16778000000",
  "PERatio": "27.29",
  "PEGRatio": "2.127",
  "BookValue": "34.86",
  "DividendPerShare": "6.71",
  "DividendYield": "0.0217",
  "EPS": "11.13",
  "RevenuePerShareTTM": "72.44",
  "ProfitMargin": "0.157",
  "OperatingMarginTTM": "0.206",
  "ReturnOnAssetsTTM": "0.0508",
  "ReturnOnEquityTTM": "0.352",
  "RevenueTTM": "67535000000",
  "GrossProfitTTM": "39296999000",
  "DilutedEPSTTM": "11.13",
  "QuarterlyEarningsGrowthYOY": "0.898",
  "QuarterlyRevenueGrowthYOY": "0.122",
  "AnalystTargetPrice": "320.16",
  "AnalystRatingStrongBuy": "1",
  "AnalystRatingBuy": "8",
  "AnalystRatingHold": "8",
  "AnalystRatingSell": "2",
  "AnalystRatingStrongSell": "2",
  "TrailingPE": "27.29",
  "ForwardPE": "25.32",
  "PriceToSalesRatioTTM": "4.203",
  "PriceToBookRatio": "8.85",
  "EVToRevenue": "5.02",
  "EVToEBITDA": "19.63",
  "Beta": "0.698",
  "52WeekHigh": "324.9",
  "52WeekLow": "210.49",
  "50DayMovingAverage": "301.78",
  "200DayMovingAverage": "277.32",
  "SharesOutstanding": "934735000",
  "SharesFloat": "934365000",
  "PercentInsiders": "0.120",
  "PercentInstitutions": "64.268",
  "DividendDate": "2026-03-10",
  "ExDividendDate": "2026-02-10"
}
```

## Stored/Returned Fields

The project ticker cache stores the following fields (all optional except `source` + `symbol`):

```ts
{
  source: "alpha_vantage";
  symbol: string;
  overview: Record<string, string>;
  quote: Record<string, string>;
}
```

### Mapping

All keys from `OVERVIEW` are stored under `overview`, and all keys from `GLOBAL_QUOTE` are stored under `quote` (preserving Alpha Vantage's key names).

## API Input

Send a JSON body with the `type` you want to fetch:

```json
{ "type": "overview" }
```

or

```json
{ "type": "quote" }
```

The endpoint stores the selected payload and preserves the previous one (overview or quote) if already stored.

## API Output

`POST /api/projects/:id/ticker` returns:

```json
{
  "tickerInfo": { /* cached fields above */ },
  "fetchedAt": "2026-01-30T22:11:00.000Z"
}
```
