# CS:GO-market Manager
High level wrapper for market.csgo.com (AKA tm.csgo.com)
> Only items bought supported currently and focuses on CS:GO

## Config example

```json
{
    "balanceValidationInterval": 0,
    "market": {
        "apiKey": "",
        "pingInterval": 0,
        "errorLogDir": "",
        "allowedPriceFluctuation": 0,
        "compromiseFactor": 0,
        "minCompromise": 0
    },
    "sockets": {
        "pingInterval": 0
    },
    "knapsack": {
        "instantTake": true,
        "validationInterval": 0,
        "updateInterval": 0
    }
}
```