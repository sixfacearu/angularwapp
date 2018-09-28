import {Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import {NavigationService} from '../services/nav.service';
import { SwitchThemeService } from '../services/switch-theme.service';
import {AmChartsService, AmChart} from '@amcharts/amcharts3-angular';
import {ChartService} from '../services/chart.service';
import {Subscription} from 'rxjs/Subscription';
import {textDef} from '@angular/core/src/view';
import { SwitchGraphService } from '../services/switch-graph.service';

@Component({
  selector: 'advchart',
  templateUrl: '../templates/advancechart.component.html',
  styleUrls: ['../styles/chart.component.css']
})
export class AdvanceChartComponent implements OnInit, OnDestroy, AfterViewInit {
  public chart: AmChart;
  chartData1 = [];
  subscription: Subscription;
  chartSubscription:Subscription;
  graphSubscription:Subscription;
  public tokenName: any;
  changeGraph:any;
  theme:any;
  data: any;
  lineColor1='#682382';
  fillColorField1='#682382';
  fillColors1='#682382';
  negativeLineColor1='#682382';
  negativeFillolors='#682382';
  dataAvailable: boolean = false;


  constructor(private AmCharts: AmChartsService, private chartservice: ChartService, 
    readonly switchThemeService:SwitchThemeService, readonly switchGraph:SwitchGraphService) {
    this.graphSubscription = this.switchGraph.getGraph().subscribe(message=>{
      this.changeGraph = message.graph;
      if(this.changeGraph === false){
        this.ngAfterViewInit();
      }else{
        this.ngAfterViewInit();
      }
    })
  }

  ngOnInit() {
    console.log("Initialized advanced chart component");
  }

  ngAfterViewInit(){
    console.log("Advanced chart component view initialized");
    this.chartSubscription = this.switchThemeService.getTheme().subscribe(message => {
      this.theme = message;
      if(this.theme.theme === true){
        this.generateDarkChart();
      }else{
        this.generateChart();
      }
    });
    this.getAdvanceChartData();
    this.chartservice.getMinData( this.tokenName);
  }

  getAdvanceChartData() {
    this.subscription = this.chartservice.advchartData$.subscribe(
      item => {
        this.data = item;
        this.generateAdvanceChartData();
      });
    this.subscription = this.chartservice.tokenName$.subscribe(
      item => {
        this.tokenName = item;
      }
    );
  }

  generateChart() {
    if(!this.dataAvailable)
      return;
    this.chart = this.AmCharts.makeChart('advchart', {
      'type': 'stock',
      'theme': 'light',
      'categoryAxesSettings': {
        'minPeriod': 'mm'
      },
      'dataSets': [{
        'title': this.tokenName,
        'fieldMappings': [{
          'fromField': 'value',
          'toField': 'value'
        }, {
          'fromField': 'volume',
          'toField': 'volume'
        }],
        'dataProvider': this.chartData1,
        'categoryField': 'date'
      }
      ],

      'panels': [{
        'showCategoryAxis': false,
        'title': 'Value',
        'percentHeight': 70,
        'categoryAxis': {
          'gridThickness': 0
        },
        'stockGraphs': [{
          'id': 'g1',
          'valueField': 'value',
          'lineColor': '#682382',
          'fillColorsField': '#682382',
          'useDataSetColors': false,
          'fillAlphas': 0.4,
          'comparable': true,
          'compareField': 'value',
          'balloonText': '[[title]]:<b>[[value]]</b>',
          'compareGraphBalloonText': '[[title]]:<b>[[value]]</b>'
        }],
        'stockLegend': {
          'periodValueTextComparing': '[[percents.value.close]]%',
          'periodValueTextRegular': '[[value.close]]'
        }
      }, {
        'title': 'Volume',
        'percentHeight': 45,
        'marginLeft': 10,
        'columnWidth': 0.4,
        'categoryAxis': {
          'gridThickness': 0
        },
        'stockGraphs': [{
          'valueField': 'volume',
          'type': 'column',
          'showBalloon': false,
          'fillAlphas': 1,
          'lineColor': '#682382',
          'fillColors': '#682382',
          'negativeLineColor':'#682382',
          'negativeFillColors':'#682382',
          'useDataSetColors': false,
          'compareGraphBalloonText': '[[title]]:<b>[[volume]]</b>'
        }],
        'stockLegend': {
          'periodValueTextRegular': '[[value.close]]'
        }
      }],

      'chartScrollbarSettings': {
        'enabled': false,
        'graph': 'g1'
      },

      'chartCursorSettings': {
        'valueBalloonsEnabled': true,
      }, 'valueAxesSettings':{
        "inside":false,
      },
    "panelsSettings": {
    "marginLeft":60,
    "marginTop": 5,
    "marginBottom": 5
      },
    });
  }


  generateDarkChart() {
    if(!this.dataAvailable)
      return;
    this.chart = this.AmCharts.makeChart('advchart', {
      'type': 'stock',
      'theme': 'dark',
      'categoryAxesSettings': {
        'minPeriod': 'mm'
      },
      'dataSets': [{
        'title': this.tokenName,
        'fieldMappings': [{
          'fromField': 'value',
          'toField': 'value'
        }, {
          'fromField': 'volume',
          'toField': 'volume'
        }],
        'dataProvider': this.chartData1,
        'categoryField': 'date'
      }
      ],

      'panels': [{
        'showCategoryAxis': false,
        'title': 'Value',
        'percentHeight': 70,
        'categoryAxis': {
          'gridThickness': 0
        },
        'stockGraphs': [{
          'id': 'g1',
          'valueField': 'value',
          'lineColor': '#ffedc6',
          'fillColorsField': '#ffedc6',
          'useDataSetColors': false,
          'fillAlphas': 0.4,
          'comparable': true,
          'compareField': 'value',
          'balloonText': '[[title]]:<b>[[value]]</b>',
          'compareGraphBalloonText': '[[title]]:<b>[[value]]</b>'
        }],
        'stockLegend': {
          'periodValueTextComparing': '[[percents.value.close]]%',
          'periodValueTextRegular': '[[value.close]]'
        }
      }, {
        'title': 'Volume',
        'percentHeight': 45,
        'marginLeft': 10,
        'columnWidth': 0.4,
        'categoryAxis': {
          'gridThickness': 0
        },
        'stockGraphs': [{
          'valueField': 'volume',
          'type': 'column',
          'showBalloon': false,
          'fillAlphas': 1,
          'lineColor': '#ffedc6',
          'fillColors': '#ffedc6',
          'negativeLineColor': '#ffedc6',
          'negativeFillColors': '#ffedc6',
          'useDataSetColors': false,
          'compareGraphBalloonText': '[[title]]:<b>[[volume]]</b>'
        }],
        'stockLegend': {
          'periodValueTextRegular': '[[value.close]]'
        }
      }],

      'chartScrollbarSettings': {
        'enabled': false,
        'graph': 'g1'
      },

      'chartCursorSettings': {
        'valueBalloonsEnabled': true,
      }, 'valueAxesSettings':{
        "inside":false,
      },
    "panelsSettings": {
    "marginLeft":60,
    "marginTop": 5,
    "marginBottom": 5
      },
    });
  }

  generateAdvanceChartData() {
    if (this.data && this.data.length > 0) {
      this.dataAvailable = true;
      this.chartData1 = [];
      let temp = this.data;
      let finalLength = this.data.length;
      for (let i = 0; i < temp.length; i++) {
        if(temp[i].hasOwnProperty("volumefrom")){
          this.chartData1.push({
            'date': new Date(temp[i].time * 1000),
            'value': temp[i].close,
            'volume': temp[i].volumefrom
          });
        }else{
          this.chartData1.push({
            'date': new Date(temp[i].time * 1000),
            'value': temp[i].close,
            'volume': temp[i].open
          });
        }
        if (finalLength === this.chartData1.length) {
            if(this.switchThemeService.getCuurentTheme() === true){
              this.generateDarkChart();
            }else{
              this.generateChart();
            }
          }
      }
    }
    else{
      console.log("No chart data available");
      this.dataAvailable = false;
    }

  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.chartSubscription.unsubscribe();
    this.graphSubscription.unsubscribe();
  }
}
