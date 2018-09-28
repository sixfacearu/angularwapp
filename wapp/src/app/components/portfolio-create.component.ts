import { Component, OnInit, OnDestroy} from '@angular/core';
import { Subscription } from "rxjs/Subscription"
import { Router } from "@angular/router";
import { Http, RequestOptions, Headers } from "@angular/http";

import { Constants } from "../models/constants";
import { AssetAnalysis } from "../models/asset.model";
import { Web3Service } from "../services/web3.service";
import { PortfolioService } from "../services/portfolio.service";
import { NotificationManagerService } from "../services/notification-manager.service";
import { TokenService } from '../services/token.service';
import { forEach } from '@angular/router/src/utils/collection';
import { MessageModel, MessageType, MessageContentType } from "../models/message.model";
import { WalletService } from '../services/wallet.service';
import { SellablePortfolio } from '../models/portfolio.model';
import { UserService } from '../services/user.service';
import { UserRegistrationResponse } from '../models/user-registration.model';
import {ChartService} from '../services/chart.service';
import { Subscribable } from 'rxjs/Observable';
import {AmChart, AmChartsService} from "@amcharts/amcharts3-angular";
import {SwitchThemeService} from '../services/switch-theme.service';


@Component({
  selector: 'create-portfolio',
  templateUrl: '../templates/portfolio-create.component.html',
  styleUrls: ['../styles/portfolio-create.component.css']
})
export class CreatePortfolioComponent implements OnInit, OnDestroy{

  private tokenSubscription: Subscription;
  private walletTokenSubscription: Subscription;
  private selectedTokens: Array<string> = new Array();
  private assetAnalysisDone: boolean = false;
  private askingPriceInWand: number;
  private creationPriceInWand: number;
  private currentSellablePortfolios: Array<SellablePortfolio> = new Array<SellablePortfolio>();
  private usedTokens = {};
  assetAnalysisResult: AssetAnalysis = new AssetAnalysis();
  portfolio: Array<any> = new Array();
  showAnalysisLoader: boolean = false;
  showDropdownLoader: boolean = false;
  portfolioName: string = "";
  amChartPieOptions : Object = {}
  itemList = [];
  selectedItems = [];
  settings = {};
  amChartPieData = [];
  amChartPie : AmChart;
  totalQuanity:number=0;
  totalETH:number=0;
  totalUSD:number=0;
  totalWAND:number=0;
  createPortfolioForm: boolean = false;
  usd:any;
  constructor(
    private http: Http,
    private web3: Web3Service,
    private chartService: ChartService,
    private portfolioService: PortfolioService,
    readonly switchThemeService:SwitchThemeService,
    private router: Router,
    private notificationsService: NotificationManagerService,
    private tokenService: TokenService,
    private walletService: WalletService,
    private userService:  UserService,
    private AmCharts: AmChartsService
  ){
    console.log("Portfolio create component");
    if(this.tokenService.getToken().Jwt == null || this.tokenService.getToken().Jwt.length === 0)
      this.tokenService.fetchToken();
    this.tokenSubscription = this.tokenService.token$.subscribe(data => this.tokenDataChange(data));
    this.walletTokenSubscription = this.walletService.tokenContractChange$.subscribe(data => this.tokenContractChange(data));
    this.amChartPieOptions = {
      "type": "pie",
      "theme": "light",
      "dataProvider": [],
      "titleField": "title",
      "valueField": "value",
      "labelRadius":0,
      "responsive":true,
      "balloon": {
        "fixedPosition": true
      },
      "innerRadius": "60%",
      autoMargins: false,
      marginTop: 0,
      marginBottom: 10,
      marginLeft: 0,
      marginRight: 0,
      pullOutRadius: 0,
    }
  }

  ngOnInit(): void {
    this.settings = {
      singleSelection: false,
      text:"Select Coins",
      enableSearchFilter: false,
      enableCheckAll: false
    };
  let __this=this;
    this.chartService.setUSD(function(err,result){
      if(!err){
        __this.usd= __this.chartService.getUSD();
      }
    });
  }

  ngOnDestroy(): void {
    this.tokenSubscription.unsubscribe();
    this.walletTokenSubscription.unsubscribe();
  }
  
  addOrRemoveCoin(symbol: string, coinName: string){
    var symbolIndex = this.selectedTokens.indexOf(symbol);
    if(symbolIndex === -1){
      this.selectedTokens.push(symbol);
      var userAccount = this.web3.getWeb3().eth.coinbase;
      let headers = new Headers({ "content-type": "application/json", "Ocp-Apim-Subscription-Key": Constants.ApiManagementSubscriptionKey, "Token": this.tokenService.getToken().Jwt });
      let requestOptions = new RequestOptions({headers: headers});
      let token = [symbol];
      this.http.post(Constants.ServiceURL + "manage/token/summary", token, requestOptions).subscribe(
        data => {
          this.showDropdownLoader = false;
          var available = 0;
          var balance = data.json().Balances[0].Balance;
          var allowance = data.json().Balances[0].Allowance.Allowance;
          var alreadyUsed = 0;
          if(allowance < balance){
            available = allowance;
          }
          else{
            available = balance;
          }
          if(this.usedTokens[symbol.toUpperCase()] !== undefined && this.usedTokens[symbol.toUpperCase()] > 0){
            alreadyUsed = this.usedTokens[symbol.toUpperCase()];
            available = available - alreadyUsed;
          }
          this.portfolio.push(
            {
              Symbol: symbol,
              CoinName: coinName,
              Available: available,
              Reqbalance: 0,
              tokenHave: allowance,
              Title: "Balance: " + balance + " " + symbol + ", Authorized : " + allowance + " " + symbol + ", Used in other portfolios : " + alreadyUsed + " " + symbol
            }
          );
        },
        err => {console.log(err);}
      );
    }
    else{
      this.selectedTokens.splice(symbolIndex, 1);
      var portfolioIndex = -1;
      for(let i: number = 0; i < this.portfolio.length; i++){
        if(this.portfolio[i].Symbol === symbol){
          portfolioIndex = i;
          break;
        }
      }
      if(portfolioIndex !== -1)
        this.portfolio.splice(portfolioIndex, 1);
    }
  }

  isPortfolioValid(): boolean{
    if(this.portfolioName === null || this.portfolioName === undefined || this.portfolioName.length === 0)
      return false;
    for(var i = 0; i < this.portfolio.length; i++){
      if(this.portfolio[i].Reqbalance <= 0)
        return false;
      if(this.portfolio[i].Available < this.portfolio[i].Reqbalance)
        return false;
    }
    return true;
  }

  enablePublish(): boolean{
    return this.isPortfolioValid() && this.askingPriceInWand > 0 && this.assetAnalysisDone;
  }

  getAvailableTokens(){
    var returnData = new Array<any>();
    var allAvailableContracts = this.walletService.getContracts();
    if(allAvailableContracts === undefined)
      return returnData;
    for(var i = 0; i < allAvailableContracts.length; i++){
      if(allAvailableContracts[i].isTokenContract && allAvailableContracts[i].symbol !== "WXETH"){
        returnData.push(allAvailableContracts[i]);
      }
    }
    return returnData;
  }

  analyzePortfolio(){
    if(!this.isPortfolioValid())
      return;
    
    console.log("USD",this.usd);
    this.assetAnalysisDone = false;
    this.showAnalysisLoader = true;
    this.totalETH=0;
    this.totalQuanity=0;
    this.totalUSD=0;
    this.totalWAND=0;
    let assetAnalysisInput = [];
    for(var i = 0; i < this.portfolio.length; i++){
      assetAnalysisInput.push({"Symbol":this.portfolio[i].Symbol, "Amount":this.portfolio[i].Reqbalance});
    }
    let headers = new Headers({ "content-type": "application/json", "Ocp-Apim-Subscription-Key": Constants.ApiManagementSubscriptionKey, "Token": this.tokenService.getToken().Jwt });
    let requestOptions = new RequestOptions({headers: headers});
    this.http.post(Constants.ServiceURL + "portfolio/analyze", assetAnalysisInput, requestOptions).subscribe(
      data => {
        this.assetAnalysisResult = data.json();
        console.log("data",this.assetAnalysisResult);
        this.amChartPieData = [];
        this.assetAnalysisResult.assets.map((key)=>{
          let temp={};
          this.totalQuanity =this.totalQuanity + key["reqbalance"];
          this.totalETH=this.totalETH + key["summary"].ETH;
          this.totalUSD=this.totalETH + key["summary"].USD;
          this.totalWAND=this.totalETH + key["summary"].WAND;
          console.log("total",this.totalQuanity, this.totalETH,this.totalUSD, this.totalWAND);
          temp['title']=key["coin"];
          temp['value']=key["reqbalance"];
          this.amChartPieData.push(temp);
          if(this.amChartPieData.length === this.assetAnalysisResult.assets.length){
            this.generatePieChart();
          }
        });
        this.showAnalysisLoader = false;
        this.assetAnalysisDone = true;
        this.askingPriceInWand = parseFloat(this.assetAnalysisResult.overall.ETH.toFixed(6));
        this.creationPriceInWand = parseFloat(this.assetAnalysisResult.overall.ETH.toFixed(6));
      },
      err => {console.log(err); this.showAnalysisLoader = false;}
    );
  }

  publishPortfolio(){
    this.portfolioService.publishPortfolio(this.portfolioName, this.askingPriceInWand, this.creationPriceInWand, this.portfolio);
    this.router.navigateByUrl("/portfolio/sell");
  }

  signAndPublishPortfolio(){
    this.portfolioService.signAndPublishPortfolio(this.portfolioName, this.askingPriceInWand, this.creationPriceInWand, this.portfolio, this.assetAnalysisResult);
    this.router.navigateByUrl("/portfolio/sell");
  }

  tokenContractChange(data: any){
    if(data === undefined)
      return;
    this.itemList.splice(0, this.itemList.length);
    for(var i = 0; i < data.length; i++){
      if(data[i].isTokenContract && data[i].symbol !== "WXETH"){
        this.itemList.push({"id":data[i].symbol, "itemName":data[i].name});
      }
    }
  }

  tokenDataChange(data: any){
    if(data !== undefined && data !== null){
      if(!data.Jwt || data.Jwt.length === 0){
        console.log("portfolio create component token error");
        this.router.navigateByUrl("/");
        return;
      }
      this.walletService.fetchContracts();
      this.currentSellablePortfolios = this.portfolioService.currentSellablePortfolios();
      for(var i = 0; i < this.currentSellablePortfolios.length; i++){
        for(var j = 0; j < this.currentSellablePortfolios[i].Assets.length; j++){
          if(this.usedTokens[this.currentSellablePortfolios[i].Assets[j].Symbol.toUpperCase()] !== undefined){
            this.usedTokens[this.currentSellablePortfolios[i].Assets[j].Symbol.toUpperCase()] = this.usedTokens[this.currentSellablePortfolios[i].Assets[j].Symbol.toUpperCase()] + this.currentSellablePortfolios[i].Assets[j].Reqbalance;
          }
          else{
            this.usedTokens[this.currentSellablePortfolios[i].Assets[j].Symbol.toUpperCase()] = this.currentSellablePortfolios[i].Assets[j].Reqbalance;
          }
        }
      }
    }
  }

  userRegistrationStatusChange(data: UserRegistrationResponse){
    if(data !== undefined && data !== null){
      if(!data.UserEmailVerified){
        console.log("portfolio create component token error");
        this.router.navigateByUrl("/");
        return;
      }
      this.walletService.fetchContracts();
      this.currentSellablePortfolios = this.portfolioService.currentSellablePortfolios();
      for(var i = 0; i < this.currentSellablePortfolios.length; i++){
        for(var j = 0; j < this.currentSellablePortfolios[i].Assets.length; j++){
          if(this.usedTokens[this.currentSellablePortfolios[i].Assets[j].Symbol.toUpperCase()] !== undefined){
            this.usedTokens[this.currentSellablePortfolios[i].Assets[j].Symbol.toUpperCase()] = this.usedTokens[this.currentSellablePortfolios[i].Assets[j].Symbol.toUpperCase()] + this.currentSellablePortfolios[i].Assets[j].Reqbalance;
          }
          else{
            this.usedTokens[this.currentSellablePortfolios[i].Assets[j].Symbol.toUpperCase()] = this.currentSellablePortfolios[i].Assets[j].Reqbalance;
          }
        }
      }
    }
  }

  OnItemSelect($event){
    this.showDropdownLoader=true;
    this.addOrRemoveCoin($event.id, $event.itemName);
  }
  OnItemDeSelect($event){
    // this.showDropdownLoader=true;
    this.addOrRemoveCoin($event.id, $event.itemName);
  }

  generatePieChart() {
    //alert("called");
    setTimeout(()=>{
      this.amChartPie = this.AmCharts.makeChart("piechartdiv", this.amChartPieOptions);
      console.log(this.amChartPie);
      this.AmCharts.updateChart(this.amChartPie, () => {
        // Change whatever properties you want
        this.amChartPie.dataProvider = this.amChartPieData;
        // get the colors for legend

      });
    }, 500);
  }
  showCreatePortfolioForm() {
    this.createPortfolioForm = true;
  }
  trackTokenvalue(data){
    if (data.Available > 0) {
      if(data.tokenHave === 0){
        console.log('have balance');
        this.notificationsService.showNotification(new MessageModel(MessageType.Error, 'Token has not been authorized. Please authorize the Token in the Wallet page'), MessageContentType.Text);
      }
    }else{
      console.log("don't have balance ");
    }
    console.log("data", data);

  }
}
