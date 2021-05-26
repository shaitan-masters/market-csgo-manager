#!!! 

#Not fully refactored - some parts will be developed or rewritten with the bots modules - according to their actual requirements


The main focus of this work is to structure emitters chain,
to dedicate the responsibility and to reduce coupling, codebase size, 
to make it able to be customized, to implement DRY etc

# CS:GO-market Manager
High level wrapper for market.csgo.com (AKA tm.csgo.com)
> Only items bought supported currently and focuses on CS:GO

##Import
``const MarketManager = require('market-csgo-manager')
``

##Usage
````javascript
const marketManager = new MarketManager({
    APIKey: 'xxxrrr44'
})
````
Then subscribe to events list (to be fullfilled)

````javascript
marketManager.on('start', () => {})
marketManager.on('itemBought', item => {})
marketManager.on('wsStuck', () => {})
marketManager.on('APITimeout', () => {})


````

##Structure
General class is dist/MarketManager

it takes API key as an argument
Then it inits APIProvider lib, starts reconnecting WS server and 
subscribes to WS events, also it inits cache manager etc and binds 
methods

class methods are in versions/v2

each method has a directory with index file and helpers

like versions/v2/buy
- index.js
- helpers
- - get_item_ids.js
    
libs keeping offers cache and balance data are in ./lib

WS stuff is in ./lib/ws

WebSocket manager is a class decorating WS client class,
it decides what to do if connection fails, triggers different callbacks
on messages after parse and type checking etc

All libs can trigger events on main class which causes either
some class methods calls or emitting events to which
user app is subscribed


# Build

`npm run build` compiles stuff from `src` dir to `dist`

# Tests

1) in `test/stuff` rename `.test_API_key` to `test_API_key`
2) add your key there
3) run `npm run test`. It compiles .ts to .js and tests js out

# N.B.:

As an Orthodox Russian redneck, I suffer from 'shaitan' naming >:-)

Hope this lib will work `Ad majore Dei gloriam`

