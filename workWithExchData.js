const cMinNac = 0.25;
const fs = require('fs');

let exchData = JSON.parse(fs.readFileSync('exchData.json'));

total = 0;
objProcessedExch = {}, arProfitPares = [];

for (let exch in exchData) {
	console.log('exch1',exch);
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
	total++;
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
		searchProfitPares(exch, exch2);
	}
}

let objCheckedExch = {
	tradeOgre: 1,
	poloniex: 1,
	binance: 1,
	crex24: 1,
	southexchange: 1,
	kukoin: 1,
	exmo: 1,
	hitbtc: 1,
}
arFiltered = arProfitPares.filter( el=>{
	return (objCheckedExch[el.exch1]==1 && objCheckedExch[el.exch2]==1);
});

console.table(arFiltered);
console.log('total exch', total);
// ------------------------------------------------

function searchProfitPares(exch, exch2) {
	exchData[exch].forEach(el=>{
		exchData[exch2].forEach(el2=>{
			if (el.vp == el2.vp) {
				if (el.ask < el2.bid) {
					let procNac = (el2.bid - el.ask) / el2.bid * 100;
					if (procNac > cMinNac) {						
						arProfitPares.push({exch1: exch, exch2: exch2, vp: el.vp, ask: el.ask, bid: el2.bid, prof: procNac.toFixed(1)});
					}
				} else if (el2.ask < el.bid) {
					let procNac = (el.bid - el2.ask) / el.bid * 100;
					if (procNac > cMinNac) {						
						arProfitPares.push({exch1: exch2, exch2: exch, vp: el.vp, ask: el2.ask, bid: el.bid, prof: procNac.toFixed(1)});
					}
				}
			}
		});
	});
}
