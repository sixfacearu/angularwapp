import {Component, OnInit, OnDestroy, AfterViewInit} from '@angular/core';
import {NavigationService} from '../services/nav.service';
import { SwitchThemeService } from '../services/switch-theme.service';
import {AmChartsService, AmChart} from '@amcharts/amcharts3-angular';
import {ChartService} from '../services/chart.service';
import {Subscription} from 'rxjs/Subscription';
import {textDef} from '@angular/core/src/view';
import { SwitchGraphService } from '../services/switch-graph.service';

@Component({
  selector: 'charts',
  templateUrl: '../templates/chart.component.html',
  styleUrls: ['../styles/chart.component.css']
})
export class ChartComponent implements OnInit, OnDestroy, AfterViewInit {
  public chart: AmChart;
  chartData1 = [];
  subscription: Subscription;
  public tokenName: any;
  theme : any;
  data: any;
  changeGraph:any;
  chartSubscription:Subscription;
  graphSubscription:Subscription;
  dataAvailable: boolean = false;

  constructor(private AmCharts: AmChartsService, private chartservice: ChartService,
  readonly switchThemeService:SwitchThemeService, readonly switchGraph:SwitchGraphService) {
    this.graphSubscription = this.switchGraph.getGraph().subscribe(message=>{
      this.changeGraph = message.graph;
      if(this.changeGraph === true){
        this.ngAfterViewInit();
      }else{
        this.ngAfterViewInit();
      }
    })
  }

  ngOnInit() {
    console.log("Chart component initialized");
  }

  ngAfterViewInit(){
    console.log("Chart component view initialized");
    this.chartSubscription = this.switchThemeService.getTheme().subscribe(message => { this.theme = message;
      if(this.theme.theme === true){
        this.generateDarkChart();
      }else{
        this.generateChart();
      }
    });
    this.getChartData();
    this.chartservice.getMinData(this.tokenName);
  }

  getChartData() {
    this.subscription = this.chartservice.chartData$.subscribe(
      item => {
        this.data = item;
        this.generateChartData();
      });
    this.subscription = this.chartservice.tokenName$.subscribe(
      item => {
        this.tokenName = item;
      }
    );
  }

  generateDarkChart() {
    if(!this.dataAvailable)
      return;
    this.chart = this.AmCharts.makeChart('chartdiv', {
      'type': 'stock',
      "theme": "dark",
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
          'fillAlphas': 0.4,
          'lineColor': '#ffedc6',
          'fillColorsField': '#ffedc6',
          'useDataSetColors': false,
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
          'showBalloon': true,
          'fillAlphas': 1,
          'color' : '#fff',
          'lineColor': '#ffedc6',
          'fillColors': '#ffedc6',
          'negativeLineColor': '#ffedc6',
          'negativeFillColors': '#ffedc6',
          'useDataSetColors': false,
          'compareGraphBalloonText': '[[title]]:<b>[[volume]]</b>'
        }],
        'stockLegend': {
          'periodValueTextRegular': '[[value.close]]'
        },
        "valueAxes": [ {
          "usePrefixes": true
        } ]
      }],
      'chartScrollbarSettings': {
        'enabled': false,
        'graph': 'g1'
      },

      'chartCursorSettings': {
        'valueBalloonsEnabled': true,
      },
      'valueAxesSettings':{
        "inside":false,
      },
    "panelsSettings": {
    "marginLeft":60,
    "marginTop": 5,
    "marginBottom": 5
      },
    });
  }
  generateChart() {
    if(!this.dataAvailable)
      return;
    this.chart = this.AmCharts.makeChart('chartdiv', {
      'type': 'stock',
      "theme": "light",
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
          'fillAlphas': 0.4,
          'lineColor': '#682382',
          'fillColorsField':'#682382',
          'useDataSetColors': false,
          'comparable': true,
          'compareField': 'value',
          'balloonText': '[[title]]:<b>[[value]]</b>',
          'compareGraphBalloonText': '[[title]]:<b>[[value]]</b>'
        }],
        'stockLegend': {
          'periodValueTextComparing': '[[percents.value.close]]%',
          'periodValueTextRegular': '[[value.close]]',
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
          'showBalloon': true,
          'fillAlphas': 1,
          'lineColor': '#682382',
          'fillColors': '#682382',
          'negativeLineColor': '#682382',
          'negativeFillColors': '#682382',
          'useDataSetColors': false,
          'compareGraphBalloonText': '[[title]]:<b>[[volume]]</b>'
        }],
        'stockLegend': {        
        }
      }],

      'chartScrollbarSettings': {
        'enabled': false,
        'graph': 'g1'
      },

      'chartCursorSettings': {
        'valueBalloonsEnabled': true,
      },
      'valueAxesSettings':{
        "inside":false,
      },
    "panelsSettings": {
    "marginLeft":60,
    "marginTop": 5,
    "marginBottom": 5
      },
    });
  }


  generateChartData() {
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
        this.dataAvailable = false;
      }
  }
  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.chartSubscription.unsubscribe();
    this.graphSubscription.unsubscribe();
  }
}
