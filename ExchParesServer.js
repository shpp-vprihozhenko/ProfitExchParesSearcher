"use strict";
const cExchDataUpdtPeriod = 1000*60*5; // min

const express = require('express');
const ccxt      = require ('./node_modules/ccxt/ccxt.js')
    , asTable   = require ('as-table')
    , log       = require ('ololog').configure ({ locate: false })
    , fs        = require ('fs')
    , {}        = require ('ansicolor').nice
    , verbose   = process.argv.includes ('--verbose')
    , keysGlobal = 'keys.json'
    , keysLocal = 'keys.local.json'
    , keysFile = fs.existsSync (keysLocal) ? keysLocal : (fs.existsSync (keysGlobal) ? keysGlobal : false)
    , config = keysFile ? require ('../../' + keysFile) : {}
;
const TradeOgre = require('tradeogre-api'); 
let tradeOgre = new TradeOgre(); 

let exchData = {};
try {
	exchData = JSON.parse(fs.readFileSync('exchData.json'));
} catch(e) {}

/*
console.log('getExchList',getExchList())
let objSelectedExch = {tradeOgre: 1, poloniex: 1, binance: 1, crex24: 1, hitbtc: 1 }
console.table(searchProfit(objSelectedExch, 1));
return
*/

setInterval(updtExchData, cExchDataUpdtPeriod)

startServerBlock();

return

// *************************************************************************************
function startServerBlock() {
	const appStat = express()
	appStat.use(express.static('public'))
	appStat.listen(6625)
	console.log('static server for ExchProfitSearcher started at port 6625')

	const app = express()

	app.use(express.urlencoded())
	app.use(express.json())
	app.use((req,res,next)=>{
		console.log('req', req.url, req.method);
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
		res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
		res.setHeader('Access-Control-Allow-Credentials', true);
		next();
	});
	app.listen(6624)
	console.log('backend for ExchProfitSearcher started at port 6624')
 
	app.get('/exchList', function (req, res) {
		console.log('inc get req exchList with', req.query)
		res.send(JSON.stringify(getExchList()));
	})

	app.get('/searchProfit', function (req, res) {
		console.log('inc get req searchProfit with', req.query)
		//{ percent: '1.5', binance: '1', poloniex: '1' }
		if (!req.query.percent) {
			res.send('Error. Wrong parameters');
		} else {
			let objSelectedExch = {};
			for (let param in req.query) {
				if (param == 'percent') {
					continue;
				}
				objSelectedExch[param] = 1;
			}
			console.table(objSelectedExch);
			let arRes = searchProfit(objSelectedExch, (+req.query.percent));
			console.table(arRes);
			res.send(JSON.stringify(arRes));
		}
	})
	
}

function getExchList() {
	let arRes = [];
	for (let exch in exchData) {
		//console.log('exch1',exch);
		if (exchData[exch].length == 0) {
			//console.log('skip',exch,'becouse no elems');
			continue
		}
		if (!exchData[exch][0]['ask']) {
			//console.log('skip',exch,'becouse no ask rate');
			continue
		}
		arRes.push(exch);
	}
	return arRes.sort();
}

function searchProfit(objSelectedExch, minNac) {
	console.log('searchProfit');
	
	let objProcessedExch = {}, arProfitPares = [];
	for (let exch in exchData) {
		//console.log('exch1',exch);
		if (exchData[exch].length == 0) {
			console.log('skip',exch,'becouse no elems');
			continue
		}
		//console.log('0',exchData[exch][0]);
		if (!exchData[exch][0]['ask']) {
			console.log('skip',exch,'becouse no ask rate');
			continue
		}
		objProcessedExch[exch] = 1;
		//console.table(exchData[exch])
		for (let exch2 in exchData) {
			if (objProcessedExch[exch2]) {
				continue
			}
			if (exchData[exch2].length == 0) {
				continue
			}
			if (!exchData[exch2][0].ask) {
				continue
			}
			//console.log('...exch2', exch2);
			searchProfitPares(exch, exch2, minNac, arProfitPares);
		}
	}

	let arFiltered = arProfitPares.filter( el=>{
		return (objSelectedExch[el.exch1]==1 && objSelectedExch[el.exch2]==1);
	});

	return arFiltered;
}

function searchProfitPares(exch, exch2, minNac, arProfitPares) {
	exchData[exch].forEach(el=>{
		exchData[exch2].forEach(el2=>{
			if (el.vp == el2.vp) {
				if (el.ask == 0 || el2.ask == 0) {
					return;
				}
				if (el.ask < el2.bid) {
					let procNac = (el2.bid - el.ask) / el2.bid * 100;
					if (procNac > minNac) {						
						arProfitPares.push({exch1: exch, exch2: exch2, vp: el.vp, ask: el.ask, bid: el2.bid, prof: procNac.toFixed(1)});
					}
				} else if (el2.ask < el.bid) {
					let procNac = (el.bid - el2.ask) / el.bid * 100;
					if (procNac > minNac) {						
						arProfitPares.push({exch1: exch2, exch2: exch, vp: el.vp, ask: el2.ask, bid: el.bid, prof: procNac.toFixed(1)});
					}
				}
			}
		});
	});
}

function updtExchData() {
	console.log('updtExchData');
	updtExchDataAsync().then(console.log);
}

async function updtExchDataAsync () {	
	let exchData = {};
	
	exchData['tradeOgre'] = await fetchTrOgTickers();
	
	for (let exch of ccxt.exchanges) {
		console.log(exch);
		if (exch == 'theocean') {
			continue;
		}
		let settings = config[exch] || {};
		
		let exchange = new ccxt[exch] (ccxt.extend ({
			// verbose,
			// 'proxy': 'https://cors-anywhere.herokuapp.com/',
		}, settings));
		
		let tickers;
		try {
			tickers = await exchange.fetchTickers();			
		} catch (e) { 
			console.log('skip',exch,'becouse no fetchTickers');
			continue;
		}
		//console.log(ticker);
		exchData[exch] = []
		for (let vp in tickers) {
			let ticker = tickers[vp];
			if (!ticker.baseVolume) {
				continue
			}
			//console.log(ticker.symbol, ticker.bid, ticker.ask, ticker.baseVolume);
			exchData[exch].push({vp: ticker.symbol, bid: ticker.bid, ask: ticker.ask, vol: ticker.baseVolume});
		};
		if (exchData[exch].length == 0) {
			exchData[exch] = undefined
		}
	}
	fs.writeFileSync('exchData.json', JSON.stringify(exchData));
	console.log('exchData.json updated and saved')
}

// ------------------------------------------------

function fetchTrOgTickers() {
	return new Promise((resolve, reject) => {
		console.log('fetchTrOgTickers')
		tradeOgre.getMarkets((err,res)=>{
			if (err) {
				console.log('err on fetchTrOgTickers',err)
				reject(err)
			} else {
				let arMarketTicker = JSON.parse(res.body)
				let arTickers = [];
				for (let ticker of arMarketTicker) {
					for (let vp in ticker) {
						let el = ticker[vp]
						let obj = {}
						let arVP = vp.split('-');
						obj.vp = arVP[1]+'/'+arVP[0];
						obj.bid = +el.bid
						obj.ask = +el.ask
						obj.vol = +el.volume;
						if (obj.vol == 0) {
							//console.log('skip',vp,'on tradeogre becouse dayVol = 0')
							continue;
						}
						arTickers.push(obj);
					}
				}
				//console.log('fetchTrOgTickers res', arTickers);
				resolve(arTickers)
			}
		})
	})
}

//---------------------------

let printSupportedExchanges = function () {
    log ('Supported exchanges:', ccxt.exchanges.join (', ').green)
}

let printUsage = function () {
    log ('Usage: node', process.argv[1], 'id1'.green, 'id2'.yellow, 'id3'.blue, '...')
    printSupportedExchanges ()
}

let printExchangeSymbolsAndMarkets = function (exchange) {
    log (getExchangeSymbols (exchange))
    log (getExchangeMarketsTable (exchange))
}

let getExchangeMarketsTable = (exchange) => {
    return asTable.configure ({ delimiter: ' | ' }) (Object.values (markets))
}

let sleep = (ms) => new Promise (resolve => setTimeout (resolve, ms));

let proxies = [
    '', // no proxy by default
    'https://crossorigin.me/',
    'https://cors-anywhere.herokuapp.com/',
];

(async function main () {

    if (process.argv.length > 3) {

        let ids = process.argv.slice (2)
        let exchanges = {}

        log (ids.join (', ').yellow)

        // load all markets from all exchanges
        for (let id of ids) {

            let settings = config[id] || {}

			console.log('settings',settings,'for',id)
			
            // instantiate the exchange by id
            let exchange = new ccxt[id] (ccxt.extend ({
                // verbose,
                // 'proxy': 'https://cors-anywhere.herokuapp.com/',
            }, settings))

            // save it in a dictionary under its id for future use
            exchanges[id] = exchange

            // load all markets from the exchange
            let markets = await exchange.loadMarkets ()
			
			//console.log(markets)
			for (let vp in markets) { 
				console.log(vp, markets[vp].info) 
			}
			
            // basic round-robin proxy scheduler
            let currentProxy = 0
            let maxRetries   = proxies.length

			console.log('proxies',proxies)
			
            for (let numRetries = 0; numRetries < maxRetries; numRetries++) {

                try { // try to load exchange markets using current proxy

                    exchange.proxy = proxies[currentProxy]
                    await exchange.loadMarkets ()

                } catch (e) { // rotate proxies in case of connectivity errors, catch all other exceptions

                    // swallow connectivity exceptions only
                    if (e instanceof ccxt.DDoSProtection || e.message.includes ('ECONNRESET')) {
                        log.bright.yellow ('[DDoS Protection Error] ' + e.message)
                    } else if (e instanceof ccxt.RequestTimeout) {
                        log.bright.yellow ('[Timeout Error] ' + e.message)
                    } else if (e instanceof ccxt.AuthenticationError) {
                        log.bright.yellow ('[Authentication Error] ' + e.message)
                    } else if (e instanceof ccxt.ExchangeNotAvailable) {
                        log.bright.yellow ('[Exchange Not Available Error] ' + e.message)
                    } else if (e instanceof ccxt.ExchangeError) {
                        log.bright.yellow ('[Exchange Error] ' + e.message)
                    } else {
                        throw e; // rethrow all other exceptions
                    }

                    // retry next proxy in round-robin fashion in case of error
                    currentProxy = ++currentProxy % proxies.length
                }
            }

            log (id.green, 'loaded', exchange.symbols.length.toString ().green, 'markets')
        }

        log ('Loaded all markets'.green)
		//console.table(exchange.symbols)

        // get all unique symbols
        let uniqueSymbols = ccxt.unique (ccxt.flatten (ids.map (id => exchanges[id].symbols)))

        // filter out symbols that are not present on at least two exchanges
        let arbitrableSymbols = uniqueSymbols
            .filter (symbol =>
                ids.filter (id =>
                    (exchanges[id].symbols.indexOf (symbol) >= 0)).length > 1)
            .sort ((id1, id2) => (id1 > id2) ? 1 : ((id2 > id1) ? -1 : 0))

        // print a table of arbitrable symbols
        let table = arbitrableSymbols.map (symbol => {
            let row = { symbol }
            for (let id of ids)
                if (exchanges[id].symbols.indexOf (symbol) >= 0)
                    row[id] = id
            return row
        })

        log (asTable.configure ({ delimiter: ' | ' }) (table))

    } else {

        printUsage ()

    }

    process.exit ()

}) ()

// ------------------

