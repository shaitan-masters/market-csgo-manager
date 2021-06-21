# CS:GO-market Manager
High level wrapper for market.csgo.com (AKA tm.csgo.com)
> Only items bought supported currently and focuses on CS:GO

## Config

### Minimal required

```json
{
    "market": {
        "apiKey": "xxx"
    }
}
```

### Default values

```json5
{
    "manager": {
        "balanceValidationInterval": 90000, // 1.5 * 60 * 1000 - Balance integrity check if we are connected to ws
        "avoidBadBots": true, // If we know that some offer is laggy we will firstly try to skip it
        "safeBuyRequests": true, // If market returns http error on by request we will check, did we really bought
        "dataDir": null, // Where system data should be stored, should be absolute path or nothing
        "logApiCalls": false // Should we log all api calls to market?(works only if data dir is set) . Or you can pass your own logger
    },
    "market": {
        "apiKey": "", // Required
        "pingInterval": 185000, // 3 * 60 * 1000 + 5 * 1000
        "handleTimezone": false,
        "allowedPriceFluctuation": 0,
        "compromiseFactor": 0,
        "minCompromise": 0
    },
    "sockets": {
        "pingInterval": 20000 // 20 * 1000
    },
    "knapsack": {
        "validationInterval": 60000, // 60 * 1000 - if we have connection to ws
        "updateInterval": 20000 // 20 * 1000 - using if don't have connection to ws
    }
}
```
