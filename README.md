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
        "safeBuyRequests": true // If market returns http error on by request we will check, did we really bought
    },
    "market": {
        "apiKey": "",
        "pingInterval": 185000, // 3 * 60 * 1000 + 5 * 1000
        "errorLogDir": "",
        "handleTimezone": true,
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
