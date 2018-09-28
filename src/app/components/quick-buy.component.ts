import { Component, OnInit, NgZone } from "@angular/core";

@Component({
    selector: 'quickbuy',
    templateUrl: '../templates/quick-buy.component.html',
    styleUrls: ['../styles/portfolio.component.css','../styles/quick-buy.component.css']
  })
  export class QuickBuyComponent{
      charttype: string
      chartoption: any
      chartdata: any;
      constructor() {
      	this.charttype = 'line';
				this.chartdata = {
					labels : ['', '', '', '', '', '', '', '','', ''],
					datasets : [{
						label : 'ETC',
						backgroundColor : "#4CAF50",
						data : [10,8,6,5,12,8,16,17,6,7,6,10]
					}]
				};

				this.chartoption = {
				  responsive: true,
				  scaleShowLabels: false,
				  scales: {
            yAxes: [{
                display : false,
                gridLines: {
							    display: false,
							  },
            }],
            xAxes: [{
                gridLines: {
							    display: false,
							  },
            }]
	        }
				};
      }

  }
