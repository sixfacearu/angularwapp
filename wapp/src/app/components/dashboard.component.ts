import {Component, OnInit, NgZone} from '@angular/core';
import {NavigationService} from '../services/nav.service';
import {WalletComponent} from './wallet.component';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import {Headers, RequestOptions} from '@angular/http';
import {MessageContentType, MessageModel, MessageType} from '../models/message.model';
import {Constants} from '../models/constants';
import {PlatformToken} from '../models/platform-tokens';
import {TokenService} from '../services/token.service';
import {Http} from '@angular/http';
import {NotificationManagerService} from '../services/notification-manager.service';
import {SwitchThemeService} from '../services/switch-theme.service';
import { SwitchGraphService } from '../services/switch-graph.service';
import {Web3Service} from '../services/web3.service';
import {Router} from '@angular/router';
import {PlatformTokenService} from '../services/platform-token.service';
import {ChartService} from '../services/chart.service';
import {Subscription} from 'rxjs/Subscription';
import {BuyOrder, SellOrder, UserOrders} from '../models/order.model';
import {UserService} from '../services/user.service';

@Component({
  selector: 'dashboard',
  templateUrl: '../templates/dashboard.component.html',
  styleUrls: ['../styles/dashboard.component.css', '../styles/wallet.component.css']
})
export class DashboardComponent implements OnInit {
  public sourceTokens: Array<PlatformToken> = new Array<PlatformToken>();
  public selectedPlatformToken: PlatformToken = new PlatformToken();
  public selectedSourceTokenSymbol: string = '';
  subscription: Subscription;
  private tokenDetail: Subscription;
  public currentPrice: any;
  public lowPrice: any;
  public highPrice: any;
  public tokenSelected: string = 'WAND';
  public userOrders: UserOrders = new UserOrders();
  public tokenDetails = [];
  public activeBtn: string;
  public trackTokenZero: number = 0;
  public panelOpenState: boolean = false;
  public data: any;
  public tokenList = [];
  public tracKGraph: string = 'line';
  public switchTheme;
  public changeGraphData;
  usd:any;

  constructor(private navService: NavigationService, private web3Service: Web3Service, readonly switchThemeService:SwitchThemeService,
              private userService: UserService, private platformTokenService: PlatformTokenService,
              private chartService: ChartService, private notificationService: NotificationManagerService,
              private tokenService: TokenService, private http: Http, private web3: Web3Service, private router: Router, private _sanitizer: DomSanitizer,
            private switchGraph : SwitchGraphService) {
    if (!this.tokenService.getToken() || this.tokenService.getToken().Jwt === undefined || this.tokenService.getToken().Jwt === '') {
      this.tokenService.fetchToken();
      this.chartService.trackTokenName('WAND');
      this.chartService.trackGraph('line');
      console.log("dashboard component token error");
      this.router.navigateByUrl('/');
      return;
    }
    this.tokenList = [];
    this.navService.setCurrentActiveTab('dashboard');
    this.subscription = this.chartService.tokenTodayPrice$.subscribe(
      item => {
        this.currentPrice = item;
      });
    this.subscription = this.chartService.tokenLowAndHighPrice$.subscribe(
      item => {
        if (item) {
          this.lowPrice = (1 / item['LOWDAY']).toFixed(4);
          this.highPrice = (1 / item['HIGHDAY']).toFixed(4);
        }
        console.log('called high and low');
      });
  }

  ngOnInit(): void {
    this.sourceTokens = this.platformTokenService.GetAllPlatformTokens();
    this.getPlatformTokens();
    this.chartService.getTokenTodayPrice('WAND');
    this.chartService.getTokenLowAndHighPrice('WAND');
    //this.getChartData();
    this.getUserOrders();
    this.getMinData();
    let __this=this;
    this.chartService.setUSD(function(err,result){
      if(!err){
        __this.usd= __this.chartService.getUSD();
      }
    });
   
  }

  getPlatformTokens() {
    let headers = new Headers({
      'content-type': 'application/json',
      'Ocp-Apim-Subscription-Key': Constants.ApiManagementSubscriptionKey,
      'Token': this.tokenService.getToken().Jwt
    });
    let requestOptions = new RequestOptions({headers: headers});
    this.http.get(Constants.ServiceURL + 'PlatformToken', requestOptions).subscribe(
      data => {
        console.log('called', data);
        var tokens = data.json();
        this.sourceTokens = tokens;
        this.sourceTokens.map((key, value) => {
          this.getTokenDetail(key, value);
          this.getSelectedTokenEscrowValue(key);
          if (value === this.sourceTokens.length - 1) {
            setTimeout(() => {
              console.log('got array', this.chartService.getAllTokenDetail(), value, this.sourceTokens.length - 1);
              this.tokenList = this.chartService.getAllTokenDetail();
            }, 5000);
          }
        });
        if (this.sourceTokens.length > 0) {
          this.sourceTokens.map((key) => {
            if (key.symbol === 'WAND') {
              this.selectedPlatformToken = key;
              this.selectedSourceTokenSymbol = this.selectedPlatformToken.symbol;
              this.onSelect(this.selectedSourceTokenSymbol);
            }
          });
        }
      },
      err => {
        this.notificationService.showNotification(new MessageModel(MessageType.Error, 'Failed to get platform tokens, please refresh the page'), MessageContentType.Text);
      }
    );
  }

  onSelect(id) {
    console.log('SELECTED', id);
    this.tokenSelected = id;
    this.chartService.getMinData(id);
    this.chartService.getTokenTodayPrice(id);
    this.chartService.getTokenLowAndHighPrice(id);
  }

  getUserOrders() {
    if (this.selectedPlatformToken.symbol === undefined || this.selectedPlatformToken.symbol === '')
      return;
    let headers = new Headers({
      'content-type': 'application/json',
      'Ocp-Apim-Subscription-Key': Constants.ApiManagementSubscriptionKey,
      'Token': this.tokenService.getToken().Jwt
    });
    let requestOptions = new RequestOptions({headers: headers});
    this.http.get(Constants.ServiceURL + 'order/user/getall/' + this.selectedPlatformToken.id, requestOptions).subscribe(
      data => {
        this.userOrders = data.json();
      },
      err => {
        this.notificationService.showNotification(new MessageModel(MessageType.Error, err), MessageContentType.Text);
      }
    );
  }

  getMinData() {
    this.activeBtn = 'M';
    this.chartService.getMinData(this.tokenSelected);
    this.chartService.getTokenTodayPrice(this.tokenSelected);
    this.chartService.getTokenLowAndHighPrice(this.tokenSelected);
  }

  getHoursData() {
    this.activeBtn = 'D';
    this.chartService.getData(this.tokenSelected);
    this.chartService.getTokenTodayPrice(this.tokenSelected);
    this.chartService.getTokenLowAndHighPrice(this.tokenSelected);
  }

  getDayData() {
    this.activeBtn = 'H';
    this.chartService.getDayData(this.tokenSelected);
    this.chartService.getTokenTodayPrice(this.tokenSelected);
    this.chartService.getTokenLowAndHighPrice(this.tokenSelected);
  }

  public getSelectedTokenEscrowValue(selectedPlatformToken) {
    if (selectedPlatformToken === undefined || selectedPlatformToken === null || selectedPlatformToken.address === undefined || selectedPlatformToken.address === null || selectedPlatformToken.address === '')
      return;
    let userAccount = this.userService.getCurrentUser().UserAccount;
    let web3 = this.web3Service.getWeb3();
    var orderTraderContract = web3.eth.contract(Constants.OrderbookContractAbi);
    var instanceOrderTraderContract = orderTraderContract.at(Constants.OrderBookContractAddress);
    instanceOrderTraderContract.balanceOfToken(userAccount, selectedPlatformToken.address, (err, data) => {
      if (data) {
        let temp = {};
        temp['symbol'] = selectedPlatformToken.symbol;
        temp['value'] = web3.fromWei(data.toString());
        if (web3.fromWei(data.toString()) === '0') {
          this.trackTokenZero++;
        }
        this.tokenDetails.push(temp);
      }
    });
  }

  public getTokenDetail(selectedPlatformToken, value) {
    //console.log("tokens", selectedPlatformToken);
    this.chartService.getTokenData(selectedPlatformToken.cmSymbol, value);
  }

  autocompleListFormatter = (data: any) => {
    let html = `<span style='color:black'>${data.symbol}</span>`;
    return this._sanitizer.bypassSecurityTrustHtml(html);
  };
  changeChart(type) {
    this.tracKGraph = type;
    this.getMinData();
    this.chartService.trackGraph(type);
  }
  onToggleChange(){
    this.switchGraph.switchGraph(this.changeGraphData);
  }
}

