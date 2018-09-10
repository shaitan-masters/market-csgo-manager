# CS:GO-market Manager
High level wrapper for market.csgo.com (AKA tm.csgo.com)
> Only items bought supported currently and focuses on CS:GO

## Config

### Minimal

```json
{
    "market": {
        "apiKey": "xxx"
    }
}
```

### Default values

```json
{
    "manager": {
        "balanceValidationInterval": 1.5 * 60 * 1000,
        "avoidBadBots": true
    },
    "market": {
        "apiKey": "",
        "pingInterval": 3 * 60 * 1000 + 5 * 1000,
        "errorLogDir": "",
        "allowedPriceFluctuation": 0,
        "compromiseFactor": 0,
        "minCompromise": 0
    },
    "sockets": {
        "pingInterval": 20 * 1000
    },
    "knapsack": {
        "instantTake": true,
        "validationInterval": 60 * 1000, // if we have connection to ws
        "updateInterval": 20 * 1000 // using if don't have connection to ws
    }
}
```