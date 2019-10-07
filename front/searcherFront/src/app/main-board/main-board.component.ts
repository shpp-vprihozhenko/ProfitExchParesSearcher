import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

class Exch {
  name: string;
  checked: boolean;
}

@Component({
  selector: 'app-main-board',
  templateUrl: './main-board.component.html',
  styleUrls: ['./main-board.component.css']
})
export class MainBoardComponent implements OnInit {

  exchanges: Exch [];
  minProfitPercent = 1;
  exchBackEndPort = 6624;
  exchBackEndUrl = '';
  fShowResult = false;
  arProfitPares = [];

  constructor(private http: HttpClient) {
    const ar = window.location.href.split(':');
    this.exchBackEndUrl = ar[0] + ':' + ar[1] + ':' + this.exchBackEndPort + '/';
    this.http.get<string[]>(this.exchBackEndUrl + 'exchList').subscribe(arExchList => {
      console.log('got arExchList', arExchList);
      this.exchanges.length = 0;
      for (const exch of arExchList) {
        this.exchanges.push({name: exch, checked: false});
      }
    });
    this.exchanges = [];
    this.exchanges.push({name: 'poloniex', checked: false});
    this.exchanges.push({name: 'binance', checked: false});
    this.exchanges.push({name: 'hitbtc', checked: true});
    this.exchanges.push({name: 'tradeogre', checked: false});
  }

  ngOnInit() {
  }

  startWork() {
    let paramsStr = 'percent=' + this.minProfitPercent;
    this.exchanges.forEach(el => {
      if (el.checked) {
        paramsStr += '&' + el.name;
      }
    });
    this.http.get<any[]>(this.exchBackEndUrl + 'searchProfit' + '?' + paramsStr).subscribe(arProfitParesList => {
      console.log('got arProfitParesLis', arProfitParesList);
      this.arProfitPares = arProfitParesList;
      this.fShowResult = true;
    });
  }

  switch(exch) {
    exch.checked = !exch.checked;
  }

  selectAllExch() {
    this.exchanges.forEach(el => el.checked = true);
  }
}
