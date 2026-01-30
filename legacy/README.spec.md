# HedgeLens

## Technische Spezifikation (v1/MVP)

### 1) Ziel & Scope
- Online‑Tool fuer Optionsscheine (Derivate)
- Nutzer koennen ISIN eingeben -> Produktdetails per API laden
- Put/Call Ratio erfassen und optimieren
- Prognosen via Szenario‑Simulation
- Zeitwert (ueber Laufzeit) als Diagramm
- Benutzeraccounts mit gespeicherten Projekten

---

### 2) Tech‑Stack
- Frontend: Angular 17+ + Tailwind CSS + Icon Pack (Tabler Icons)
- Charts: z. B. ngx‑echarts oder ng2‑charts
- Backend: Firebase
  - Auth (Email/Password + optional Google)
  - Firestore (Datenhaltung)
  - Cloud Functions (API‑Proxy, Simulation/Optimierung)

---

### 3) Architektur‑Ueberblick
- Angular <-> Firebase Auth (Login)
- Angular <-> Firestore (User, Projekte, Ergebnisse)
- Angular <-> Cloud Functions (ISIN‑Lookup, Simulation, Optimierung)

---

### 4) Datenmodell (Firestore Collections)

**/users/{uid}**
- email, createdAt, preferences
- riskProfile: conservative | balanced | aggressive

**/projects/{projectId}**
- ownerUid
- name
- createdAt, updatedAt
- baseCurrency
- ratios: putCount, callCount, ratio
- constraints: maxLoss, minReturn, maxVolatility, horizonDays

**/instruments/{isin}**
- isin
- name
- issuer
- type (put/call)
- underlying
- strike
- expiry
- currency
- price
- greeks? (delta, gamma, theta, vega) optional
- fetchedAt

**/positions/{positionId}**
- projectId
- isin
- side: put | call
- size
- entryPrice
- date

**/scenarios/{scenarioId}**
- projectId
- name (bear/base/bull/custom)
- volatility
- drift
- horizonDays
- steps

**/analytics/{analyticsId}**
- projectId
- expectedReturn
- variance
- var95
- bestRatioSet
- timeValueCurve (array)

---

### 5) API‑Contracts (Cloud Functions)

#### 5.1 ISIN Lookup
**POST** `/api/isin/lookup`
- Request:
```json
{ "isin": "DE000..." }
```
- Response:
```json
{
  "isin": "DE000...",
  "name": "Produktname",
  "issuer": "Emittent",
  "type": "call",
  "underlying": "DAX",
  "strike": 19000,
  "expiry": "2026-06-19",
  "currency": "EUR",
  "price": 2.34,
  "greeks": { "delta": 0.42, "theta": -0.03 }
}
```
- Notes: Cloud Function dient als Proxy fuer externen ISIN‑Provider (API Key versteckt).

---

#### 5.2 Szenario‑Simulation
**POST** `/api/simulate`
- Request:
```json
{
  "projectId": "...",
  "positions": [{ "isin": "...", "size": 10, "entryPrice": 2.10 }],
  "scenario": { "volatility": 0.25, "drift": 0.04, "horizonDays": 90, "steps": 90 }
}
```
- Response:
```json
{
  "expectedReturn": 0.12,
  "variance": 0.08,
  "var95": -0.15,
  "timeValueCurve": [ { "day": 0, "value": 2.34 }, "..." ],
  "outcomes": [ { "pnl": -120 }, { "pnl": 80 }, "..." ]
}
```

---

#### 5.3 Ratio‑Optimierung
**POST** `/api/optimize`
- Request:
```json
{
  "projectId": "...",
  "objective": "max_return | min_risk | best_ratio",
  "constraints": { "maxLoss": -500, "minReturn": 0.05 },
  "searchSpace": { "putMin": 0, "putMax": 10, "callMin": 0, "callMax": 10 }
}
```
- Response:
```json
{
  "bestRatio": { "putCount": 3, "callCount": 7, "ratio": 0.43 },
  "expectedReturn": 0.14,
  "variance": 0.06,
  "var95": -0.10
}
```

---

### 6) Berechnungslogik (MVP)
- Put/Call Ratio = putCount / callCount (callCount > 0)
- Szenario‑Simulation: vereinfachtes stochastisches Modell (GBM‑aehnlich)
- Zeitwert: linear/vereinfachte Modellierung mit Theta
- Optimierung: Grid‑Search ueber Ratio‑Kombinationen

---

### 7) Security
- Firestore Rules: nur Owner darf Projekte lesen/schreiben
- Cloud Functions: Auth‑Guard (uid required)
- ISIN‑Provider API Keys nur im Backend

---

### 8) MVP‑Limitierungen (bewusst)
- Vereinfachte Zeitwert‑Berechnung
- Kein echtes Order‑Routing
- Simulation nicht boersengenau, nur Szenarien

