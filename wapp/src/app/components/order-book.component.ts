import {Component, OnInit, OnDestroy, NgZone} from '@angular/core';
import {UUID} from 'angular2-uuid';
import {PlatformToken} from '../models/platform-tokens';
import {Constants} from '../models/constants';
import {NavigationService} from '../services/nav.service';
import {PlatformTokenService} from '../services/platform-token.service';
import {Web3Service} from '../services/web3.service';
import {UserService} from '../services/user.service';
import {RequestOptions, Headers} from '@angular/http';
import {Http} from '@angular/http';
import {BuyOrder, SellOrder, UserOrders} from '../models/order.model';
import {TokenService} from '../services/token.service';
import {SwitchThemeService} from '../services/switch-theme.service';
import {SwitchGraphService} from '../services/switch-graph.service';
import {OrderTransaction} from '../models/order-transaction.model';
import {NotificationManagerService} from '../services/notification-manager.service';
import {MessageModel, MessageType, MessageContentType} from '../models/message.model';
import {Router, ActivatedRoute} from '@angular/router';
import {ChartService} from '../services/chart.service';
import {APP_INITIALIZER} from '@angular/core/src/application_init';
import {Location} from '@angular/common';
import {NgForm} from '@angular/forms';
import {Subscription} from 'rxjs/Subscription';
import {DomSanitizer} from '@angular/platform-browser';
import {TokenHistoryService} from '../services/token-history.service';
import {BigNumber} from 'bignumber.js';

declare namespace web3Functions {
  export function generateSalt();

  export function prepareCallPayload(data: any);

  export function toBaseUnitAmount(amount: any, decimals: any);

  export function extractECSignature(sign: any, orderHash: any, signer: any);

  export function clientVerifySign(ecSignature: any, orderHash: any, signer: any);

  export function convertToBigNumber(amount: any);
}

declare namespace tradingViewFunctions {
  export function initialize(data: string);

  export function changeSymbol(data: string);
}

@Component({
  selector: 'order-book',
  templateUrl: '../templates/order-book.component.html',
  styleUrls: ['../styles/order-book.component.css']
})
export class OrderBookComponent implements OnInit, OnDestroy {

  public destinationTokens: Array<PlatformToken> = new Array<PlatformToken>();
  public sourceTokens: Array<PlatformToken> = new Array<PlatformToken>();
  public selectedSourceTokenSymbol: string = '';
  public selectedPlatformToken: PlatformToken = new PlatformToken();
  public selectedTokenEscrowValue: number = 0.0;
  public selectedTab: string = 'buy';
  public amountToDepositOrWithdraw = 0.0;
  public selectedFund: string = 'ETH';
  public authorize: boolean = false;
  public authorizeWand: boolean = false;
  public authorizedAmount: number = 0.0;
  public amountToBuy: number = 0.0;
  public priceToBuy: number = 0.0;
  public amountToSell: number = 0.0;
  public priceToSell: number = 0.0;
  public useWandxForFee: boolean = false;
  public buyOrders: Array<BuyOrder> = new Array<BuyOrder>();
  public sellOrders: Array<SellOrder> = new Array<SellOrder>();
  public orderTransactions: Array<OrderTransaction> = new Array<OrderTransaction>();
  public selectedBuyOrder: BuyOrder = new BuyOrder();
  public selectedSellOrder: SellOrder = new SellOrder();
  public isBuyModalVisible: boolean = false;
  public isSellModalVisible: boolean = false;
  public isBuySummaryModalVisible: boolean = false;
  public isSellSummaryModalVisible: boolean = false;
  public useWandxForBuyFee: boolean = false;
  public useWandxForSellFee: boolean = false;
  public twentyFourHrHigh: number = 0.0;
  public twentyFourHrLow: number = 0.0;
  public lastTradedPrice: number = 0.0;
  public tradingVolume: number = 0.0;
  public buyErrorMessage: string = '';
  public sellErrorMessage: string = '';
  public userOrders: UserOrders = new UserOrders();
  public escrowEtherValue = 0.0;
  public wandEscrowValue = 0.0;
  public subscription: Subscription;
  public currentPrice: any;
  public lowPrice: any;
  public highPrice: any;
  public tokenSelected: string = 'GNT';
  private selectedTradingViewSymbol = '';
  public activeBtn: string;
  public panelOpenState = false;
  usd: number = 0.0;
  USDValue: any;
  showAnalysisLoader: boolean = false;
  private tokenRenewalSubscription: Subscription;
  private currentBlockNumber = 0;
  public tracKGraph: string = 'line';
  public switchTheme;
  public changeGraphData = false;
  public changeGraph;
  private orderBookRefreshTimer: any;
  private paramToken: string = 'WAND';
  public graphType = 'CryptoCompare';

  constructor(private navService: NavigationService,
              readonly switchThemeService: SwitchThemeService,
              private switchGraph: SwitchGraphService,
              private platformTokenService: PlatformTokenService,
              private web3Service: Web3Service,
              private userService: UserService,
              private zone: NgZone,
              private http: Http,
              private tokenService: TokenService,
              private notificationService: NotificationManagerService,
              private web3: Web3Service,
              private router: Router,
              private chartService: ChartService, private _sanitizer: DomSanitizer,
              private tokenHistoryService: TokenHistoryService,
              private route: ActivatedRoute,
              private location: Location) {
    this.route.params.subscribe(params => {
      if (params['token']) {
        this.paramToken = params['token'];
      }
    });
    this.subscription = this.switchThemeService.getTheme().subscribe(message => {
      this.changeGraph = message;
    });
    this.updateCurrentEthBlockNumber();
    this.tokenRenewalSubscription = this.tokenService.token$.subscribe(data => this.initializeOrderBook(data));
    this.chartService.trackTokenName(this.paramToken);
    this.chartService.trackGraph('line');
    this.navService.setCurrentActiveTab('order-book');
  }

  ngOnInit(): void {
    this.tokenHistoryService.loadTokenHistoryData();
    if (this.tokenService.getToken() === undefined) {
      this.tokenService.fetchToken();
    }
    else {
      this.initializeOrderBook({'local': 'data'});
    }
  }

  ngOnDestroy(): void {
    console.log('destroying order book');
    if (this.orderBookRefreshTimer) {
      clearTimeout(this.orderBookRefreshTimer);
    }
    this.tokenRenewalSubscription.unsubscribe();
  }

  initializeOrderBook(data: any) {
    if (data === undefined)
      return;
    console.log(this.paramToken);
    let __this = this;
    this.chartService.setUSD(function (err, result) {
      if (!err) {
        __this.usd = __this.chartService.getUSD();
      }
    });
    this.sourceTokens = this.platformTokenService.GetAllPlatformTokens();
    this.getPlatformTokens();
    this.getEtherEscrowValue();
    this.refresh();
    this.initiateAutoRefresh();
    this.chartService.getTokenTodayPrice(this.paramToken);
    this.chartService.getTokenLowAndHighPrice(this.paramToken);
    this.getMinData();
  }

  getDataFromCrypto() {
    this.sourceTokens.map((key) => {
      if (key.symbol !== 'WXETH') {
        this.chartService.getTokenTodayPriceOrderBook(key.symbol).then((res) => {
          console.log('getDataFromCrypto', res);
          this.chartService.getTokenLowAndHighPriceOrderbook(key.symbol).then((res1) => {
            console.log('getDataFromCrypto dsds', res1);
            debugger;
            key['currentPrice'] = res;
            key['lowPrice'] = (1 / res1['LOW24HOUR']).toFixed(4);
            key['highPrice'] = (1 / res1['HIGH24HOUR']).toFixed(4);
            console.log('dada', this.sourceTokens);
          });
        });
      }
    });
  }

  onSelect(id) {
    console.log('id', id);
    this.selectedSourceTokenSymbol = id
    this.selectedPlatformToken = undefined;
    this.authorize = false;
    for (var i = 0; i < this.sourceTokens.length; i++) {
      if (this.sourceTokens[i].symbol === id) {
        this.selectedPlatformToken = this.sourceTokens[i];
        console.log('symbol', this.selectedPlatformToken);
        break;
      }
    }

    if (this.selectedPlatformToken === undefined || this.selectedPlatformToken === null)
      return;

    this.location.go('/order-book/' + this.selectedPlatformToken.symbol);

    this.getBuyOrders();
    this.getSellOrders();
    this.getOrderTransactions();
    this.getCoinStats();
    this.getEtherEscrowValue();
    this.getUserOrders();
    this.getWandEscrowValue();
    this.getSelectedTokenEscrowValue();
    if (this.selectedPlatformToken.tradingViewSymbol !== undefined && this.selectedPlatformToken.tradingViewSymbol !== '') {
      tradingViewFunctions.changeSymbol(this.selectedPlatformToken.tradingViewSymbol);
    }
    else {
      tradingViewFunctions.changeSymbol('BITFINEX:ETHUSD');
    }

    this.tokenSelected = id;
    this.chartService.getMinData(id);
    //this.chartService.getAdvanceData(id);
    this.chartService.getTokenTodayPrice(id);
    this.chartService.getTokenLowAndHighPrice(id);
  }

  private getEtherEscrowValue() {
    let userAccount = this.userService.getCurrentUser().UserAccount;
    let web3 = this.web3Service.getWeb3();
    var orderTraderContract = web3.eth.contract(Constants.OrderbookContractAbi);
    var instanceOrderTraderContract = orderTraderContract.at(Constants.OrderBookContractAddress);
    instanceOrderTraderContract.balanceOf(userAccount, (err, data) => {
      console.log('data', data);
      if (data)
        this.escrowEtherValue = web3.fromWei(data);
      else
        this.escrowEtherValue = 0.0;
    });
  }

  private getWandEscrowValue() {
    let userAccount = this.userService.getCurrentUser().UserAccount;
    let web3 = this.web3Service.getWeb3();
    var orderTraderContract = web3.eth.contract(Constants.TokenAbi);
    var instanceOrderTraderContract = orderTraderContract.at(Constants.WandxTokenAddress);
    instanceOrderTraderContract.allowance(userAccount, Constants.OrderBookContractAddress, (err, data) => {
      if (data)
        this.wandEscrowValue = data;
      else
        this.wandEscrowValue = 0.0;
    });
  }

  private getSelectedTokenEscrowValue() {
    if (
      this.selectedPlatformToken === undefined || this.selectedPlatformToken === null ||
      this.selectedPlatformToken.address === undefined || this.selectedPlatformToken.address === null ||
      this.selectedPlatformToken.address === ''
    )
      return;

    let userAccount = this.userService.getCurrentUser().UserAccount;
    let web3 = this.web3Service.getWeb3();
    var orderTraderContract = web3.eth.contract(Constants.OrderbookContractAbi);
    var instanceOrderTraderContract = orderTraderContract.at(Constants.OrderBookContractAddress);
    console.log('current address', this.selectedPlatformToken.address);
    instanceOrderTraderContract.balanceOfToken(userAccount, this.selectedPlatformToken.address, (err, data) => {
      if (data) {
        console.log('web 3', web3.fromWei(data.toString()));
        let conversion = +web3.fromWei(data.toString());
        conversion = conversion * (10 ** (18 - this.selectedPlatformToken.decimals));
        this.selectedTokenEscrowValue = conversion;
        this.checkAllowance();
      }
    });
  }

  private initiateAutoRefresh() {
    if (this.orderBookRefreshTimer)
      clearTimeout(this.orderBookRefreshTimer);

    this.orderBookRefreshTimer = setTimeout(() => {
      this.refresh();
      this.initiateAutoRefresh();
    }, 30000);
  }

  private refresh() {
    this.getBuyOrders();
    this.getSellOrders();
    this.getOrderTransactions();
    this.getCoinStats();
    this.getEtherEscrowValue();
    this.getUserOrders();
    this.getSelectedTokenEscrowValue();
    this.getWandEscrowValue();
    this.checkAllowance();
    this.checkWandAllowance();
    this.updateCurrentEthBlockNumber();
  }

  setTab(data) {
    if (data != this.selectedTab) {
      //reset data
      this.useWandxForFee = false;
    }
    this.selectedTab = data;
  }

  getCoinStats() {
    if (this.selectedPlatformToken === undefined || this.selectedPlatformToken === null)
      return;
    this.http.get(Constants.CryptoCompareUrl + '?fsym=' + this.selectedPlatformToken.symbol + '&tsym=ETH&limit=60&aggregate=3&e=CCCAGG').subscribe(
      data => {
        var jsonData = data.json();
        if (jsonData.Response === 'Success') {
          var dataLength = jsonData.Data.length;
          var tokenData = jsonData.Data[dataLength - 1];
          this.twentyFourHrHigh = tokenData.high;
          this.twentyFourHrLow = tokenData.low;
          this.lastTradedPrice = tokenData.close;
          this.tradingVolume = tokenData.volumeto;
          this.priceToBuy = this.lastTradedPrice;
          this.priceToSell = this.lastTradedPrice;
        }
        else {
          this.twentyFourHrHigh = 0.0;
          this.twentyFourHrLow = 0.0;
          this.lastTradedPrice = 0.0;
          this.tradingVolume = 0.0;
          this.priceToBuy = 0.0;
          this.priceToSell = 0.0;
        }
      },
      err => {
        console.log(err);
        this.twentyFourHrHigh = 0.0;
        this.twentyFourHrLow = 0.0;
        this.lastTradedPrice = 0.0;
        this.tradingVolume = 0.0;
      }
    );
  }

  deposit() {
    if (this.amountToDepositOrWithdraw <= 0)
      return;
    let userAccount = this.userService.getCurrentUser().UserAccount;
    let web3 = this.web3Service.getWeb3();
    var orderTraderContract = web3.eth.contract(Constants.OrderbookContractAbi);
    var instanceOrderTraderContract = orderTraderContract.at(Constants.OrderBookContractAddress);
    if (this.selectedFund === 'ETH') {
      instanceOrderTraderContract.deposit(userAccount, {
        'from': userAccount,
        'value': web3Functions.toBaseUnitAmount(this.amountToDepositOrWithdraw, 18)
      }, (err, data) => {
        if (data) {
          this.notificationService.showNotification(new MessageModel(MessageType.Success, 'Deposit has been submitted to the blockchain. Please wait for confirmation.'), MessageContentType.Text);
        }
        else {
          this.notificationService.showNotification(new MessageModel(MessageType.Error, 'Deposit failed'), MessageContentType.Text);
        }
        this.getEtherEscrowValue();
      });
    }
    else if (this.selectedFund === 'WAND') {
      instanceOrderTraderContract.depositTokens(userAccount, Constants.WandxTokenAddress, web3Functions.toBaseUnitAmount(this.amountToDepositOrWithdraw, 18), {'from': userAccount}, (err, data) => {
        if (data) {
          this.notificationService.showNotification(new MessageModel(MessageType.Success, 'Deposit has been submitted to the blockchain. Please wait for confirmation.'), MessageContentType.Text);
        }
        else {
          this.notificationService.showNotification(new MessageModel(MessageType.Error, 'Deposit failed'), MessageContentType.Text);
        }
      });
    }
    else {
      if (this.selectedPlatformToken.symbol !== '' && this.selectedPlatformToken.address !== '') {
        if (this.authorizedAmount < this.amountToDepositOrWithdraw || !this.authorize) {
          this.notificationService.showNotification(new MessageModel(MessageType.Error, 'Please authorize the Token by turning it on for trading'), MessageContentType.Text);
          return;
        }
        instanceOrderTraderContract.depositTokens(userAccount, this.selectedPlatformToken.address, web3Functions.toBaseUnitAmount(this.amountToDepositOrWithdraw, this.selectedPlatformToken.decimals), {'from': userAccount}, (err, data) => {
          if (data) {
            this.notificationService.showNotification(new MessageModel(MessageType.Success, 'Deposit has been submitted to the blockchain. Please wait for confirmation.'), MessageContentType.Text);
          }
          else {
            this.notificationService.showNotification(new MessageModel(MessageType.Error, 'Deposit failed'), MessageContentType.Text);
          }
        });
      }
    }
  }

  withdraw() {
    if (this.amountToDepositOrWithdraw <= 0)
      return;
    this.web3Service.getWeb3().eth.getBalance(this.userService.getCurrentUser().UserAccount, (err, result) => {
      console.log('balance', new BigNumber(result.toString()).dividedBy(new BigNumber(10).pow(18)).toJSON());
      const balance = new BigNumber(result.toString()).dividedBy(new BigNumber(10).pow(18)).toJSON();
      if (this.amountToDepositOrWithdraw > parseFloat(balance)) {
        this.zone.run(() => {
          this.notificationService.showNotification(new MessageModel(MessageType.Error, 'You do not have sufficient balance to withdraw.'), MessageContentType.Text);
          return;
        });
      } else {
        let userAccount = this.userService.getCurrentUser().UserAccount;
        let web3 = this.web3Service.getWeb3();
        var orderTraderContract = web3.eth.contract(Constants.OrderbookContractAbi);
        var instanceOrderTraderContract = orderTraderContract.at(Constants.OrderBookContractAddress);
        if (this.selectedFund === 'ETH') {
          instanceOrderTraderContract.withdrawTo(userAccount, web3Functions.toBaseUnitAmount(this.amountToDepositOrWithdraw, 18), {'from': userAccount}, (err, data) => {
            if (data) {
              this.notificationService.showNotification(new MessageModel(MessageType.Success, 'Withdraw successful, please wait for transaction to complete'), MessageContentType.Text);
            }
            else {
              this.notificationService.showNotification(new MessageModel(MessageType.Error, 'Withdraw failed'), MessageContentType.Text);
            }
            this.getEtherEscrowValue();
          });
        }
        else if (this.selectedFund === 'WAND') {
          instanceOrderTraderContract.withdrawTokenTo(userAccount, Constants.WandxTokenAddress, web3Functions.toBaseUnitAmount(this.amountToDepositOrWithdraw, 18), {'from': userAccount}, (err, data) => {
            if (data) {
              this.notificationService.showNotification(new MessageModel(MessageType.Success, 'Withdraw successful, please wait for transaction to complete'), MessageContentType.Text);
            }
            else {
              this.notificationService.showNotification(new MessageModel(MessageType.Error, 'Withdraw failed'), MessageContentType.Text);
            }
          });
        }
        else {
          if (this.selectedPlatformToken.symbol !== '' && this.selectedPlatformToken.address !== '') {
            if (this.selectedTokenEscrowValue < this.amountToDepositOrWithdraw || !this.authorize) {
              this.notificationService.showNotification(new MessageModel(MessageType.Error, 'Insufficient amount in escrow'), MessageContentType.Text);
              return;
            }
            instanceOrderTraderContract.withdrawTokenTo(userAccount, this.selectedPlatformToken.address, web3Functions.toBaseUnitAmount(this.amountToDepositOrWithdraw, this.selectedPlatformToken.decimals), {'from': userAccount}, (err, data) => {
              if (data) {
                this.notificationService.showNotification(new MessageModel(MessageType.Success, 'Withdraw successful, please wait for transaction to complete'), MessageContentType.Text);
              }
              else {
                this.notificationService.showNotification(new MessageModel(MessageType.Error, 'Withdraw failed'), MessageContentType.Text);
              }
            });
          }
        }
      }
    });
  }

  createBuyOrder() {
    if (this.selectedPlatformToken.address === '') {
      console.log('Invalid token address');
      return;
    }
    var exchangeFee = this.getBuyExchangeFee();
    if (this.useWandxForFee && this.wandEscrowValue < exchangeFee) {
      this.notificationService.showNotification(new MessageModel(MessageType.Error, 'Insufficient WAND balance to pay for exchange fee'), MessageContentType.Text);
      return;
    }
    else if (!this.useWandxForFee && this.escrowEtherValue < (exchangeFee + (this.amountToBuy * this.priceToBuy))) {
      this.notificationService.showNotification(new MessageModel(MessageType.Error, 'Insufficient ETH balance to pay for the transaction'), MessageContentType.Text);
      return;
    }
    let web3 = this.web3Service.getWeb3();
    var orderTraderContract = web3.eth.contract(Constants.OrderbookContractAbi);
    var instanceOrderTraderContract = orderTraderContract.at(Constants.OrderBookContractAddress);
    var orderID = UUID.UUID().toString();
    var find = '-';
    var re = new RegExp(find, 'g');
    var sanitizedOrderId = orderID.replace(re, '');
    sanitizedOrderId = '0x' + sanitizedOrderId;
    var price = this.priceToBuy;
    this.notificationService.showNotification(new MessageModel(MessageType.Info, 'Creating the order, please click on The Sign button on the Metamask window'), MessageContentType.Text);
    web3.eth.getBlockNumber((err, data) => {
      if (data) {
        let creationBlock = data;
        let buyVolume = web3Functions.toBaseUnitAmount(this.amountToBuy, this.selectedPlatformToken.decimals);
        let buyPrice = web3Functions.toBaseUnitAmount(price, 18);
        let userAccount = this.userService.getCurrentUser().UserAccount;
        let sellTokenAddress = this.selectedPlatformToken.address;
        let buyTokenAddress = Constants.EtherTokenAddress;
        let buyerFeeTokenAddress = Constants.EtherTokenAddress;
        if (this.useWandxForFee) {
          buyerFeeTokenAddress = Constants.WandxTokenAddress;
        }
        instanceOrderTraderContract.orderHash(
          sellTokenAddress, buyTokenAddress, buyVolume, buyPrice,
          creationBlock + Constants.BlockExpirationWindow, userAccount, 0, sanitizedOrderId,
          buyerFeeTokenAddress,
          (err, result) => {
            if (result) {
              let orderHash = result;
              var payload = {
                jsonrpc: '2.0',
                method: 'eth_sign',
                params: [userAccount, orderHash]
              };
              web3.currentProvider.sendAsync(
                payload,
                (err, result) => {
                  if (result) {
                    let signature = result.result;
                    let ecSignature = web3Functions.extractECSignature(signature, orderHash, userAccount);
                    if (web3Functions.clientVerifySign(ecSignature, orderHash, userAccount)) {
                      instanceOrderTraderContract.verifySignature(userAccount, orderHash, ecSignature.v, ecSignature.r, ecSignature.s, (err, result) => {
                        if (result) {
                          let headers = new Headers({
                            'content-type': 'application/json',
                            'Ocp-Apim-Subscription-Key': Constants.ApiManagementSubscriptionKey,
                            'Token': this.tokenService.getToken().Jwt
                          });
                          let requestOptions = new RequestOptions({headers: headers});
                          let buyOrder = new BuyOrder();

                          buyOrder.Id = orderID;
                          buyOrder.BuyingTokenId = this.selectedPlatformToken.id;
                          buyOrder.BuyingVolume = this.amountToBuy;
                          buyOrder.CreationBlock = creationBlock;
                          buyOrder.CreationVolume = this.amountToBuy;
                          buyOrder.ExpiringBlock = creationBlock + Constants.BlockExpirationWindow;
                          buyOrder.BuyerHash = orderHash;
                          buyOrder.BuyerSign = signature;
                          buyOrder.BuyerAccountId = userAccount;
                          buyOrder.Status = 'CREATED';
                          buyOrder.TargetTokenId = Constants.EtherTokenId;

                          if (this.useWandxForFee) {
                            buyOrder.FeeTokenId = Constants.WandxTokenId;
                          }
                          else {
                            buyOrder.FeeTokenId = Constants.EtherTokenId;
                          }

                          buyOrder.TargetVolume = price;

                          this.http.post(Constants.ServiceURL + 'Order/buy/create', buyOrder, requestOptions).subscribe(
                            data => {
                              this.notificationService.showNotification(new MessageModel(MessageType.Success, 'Order has been created. It can be viewed in My Orders tab after confirmation on the blockchain. This may take a while.'), MessageContentType.Text);
                            },
                            err => {
                              this.notificationService.showNotification(new MessageModel(MessageType.Error, err), MessageContentType.Text);
                            }
                          );
                        }
                      });
                    }
                  }
                  else {
                    this.notificationService.showNotification(new MessageModel(MessageType.Error, err), MessageContentType.Text);
                  }
                }
              );
            }
            else {
              this.notificationService.showNotification(new MessageModel(MessageType.Error, err), MessageContentType.Text);
            }
          }
        );
      }
      else {
        this.notificationService.showNotification(new MessageModel(MessageType.Error, 'Failed to get current block number'), MessageContentType.Text);
      }
    });
  }

  createSellOrder() {
    if (this.selectedPlatformToken.address === '') {
      console.log('Invalid token address');
      return;
    }
    if (this.selectedTokenEscrowValue < this.amountToSell) {
      this.notificationService.showNotification(new MessageModel(MessageType.Error, 'Insufficient balance in  escrow to create a buy order for ' + this.selectedPlatformToken.symbol), MessageContentType.Text);
      return;
    }
    var exchangeFee = this.getSellExchangeFee();
    if (this.useWandxForFee) {
      if (this.wandEscrowValue < exchangeFee) {
        this.notificationService.showNotification(new MessageModel(MessageType.Error, 'Insufficient wand balance to pay exchange fee.'), MessageContentType.Text);
        return;
      }
    }
    else {
      if (this.escrowEtherValue < exchangeFee) {
        this.notificationService.showNotification(new MessageModel(MessageType.Error, 'Insufficient ether balance to pay exchange fee.'), MessageContentType.Text);
        return;
      }
    }
    let web3 = this.web3Service.getWeb3();
    var orderTraderContract = web3.eth.contract(Constants.OrderbookContractAbi);
    var instanceOrderTraderContract = orderTraderContract.at(Constants.OrderBookContractAddress);
    var orderID = UUID.UUID().toString();
    var find = '-';
    var re = new RegExp(find, 'g');
    var sanitizedOrderId = orderID.replace(re, '');
    sanitizedOrderId = '0x' + sanitizedOrderId;
    var price = this.priceToSell;
    this.notificationService.showNotification(new MessageModel(MessageType.Info, 'Creating order, please sign using metamask'), MessageContentType.Text);
    web3.eth.getBlockNumber((err, data) => {
      if (data) {
        let creationBlock = data;
        let sellVolume = web3Functions.toBaseUnitAmount(this.amountToSell, this.selectedPlatformToken.decimals);
        let sellPrice = web3Functions.toBaseUnitAmount(price, 18);
        let userAccount = this.userService.getCurrentUser().UserAccount;
        let buyTokenAddress = this.selectedPlatformToken.address;
        let sellTokenAddress = Constants.EtherTokenAddress;
        let sellerFeeTokenAddress = Constants.EtherTokenAddress;
        if (this.useWandxForFee) {
          sellerFeeTokenAddress = Constants.WandxTokenAddress;
        }
        instanceOrderTraderContract.orderHash(
          buyTokenAddress, sellTokenAddress, sellVolume, sellPrice,
          creationBlock + Constants.BlockExpirationWindow, userAccount, 1, sanitizedOrderId,
          sellerFeeTokenAddress,
          (err, result) => {
            if (result) {
              let orderHash = result;
              var payload = {
                jsonrpc: '2.0',
                method: 'eth_sign',
                params: [userAccount, orderHash]
              };
              web3.currentProvider.sendAsync(
                payload,
                (err, result) => {
                  if (result) {
                    let signature = result.result;
                    let ecSignature = web3Functions.extractECSignature(signature, orderHash, userAccount);
                    if (web3Functions.clientVerifySign(ecSignature, orderHash, userAccount)) {
                      instanceOrderTraderContract.verifySignature(userAccount, orderHash, ecSignature.v, ecSignature.r, ecSignature.s, (err, result) => {
                        if (result) {
                          let headers = new Headers({
                            'content-type': 'application/json',
                            'Ocp-Apim-Subscription-Key': Constants.ApiManagementSubscriptionKey,
                            'Token': this.tokenService.getToken().Jwt
                          });
                          let requestOptions = new RequestOptions({headers: headers});
                          let sellOrder = new SellOrder();

                          sellOrder.Id = orderID;
                          sellOrder.SellingTokenId = this.selectedPlatformToken.id;
                          sellOrder.SellingVolume = this.amountToSell;
                          sellOrder.CreationBlock = creationBlock;
                          sellOrder.CreationVolume = this.amountToSell;
                          sellOrder.ExpiringBlock = creationBlock + Constants.BlockExpirationWindow;
                          sellOrder.SellerHash = orderHash;
                          sellOrder.SellerSign = signature;
                          sellOrder.SellerAccountId = userAccount;
                          sellOrder.Status = 'CREATED';
                          sellOrder.TargetTokenId = Constants.EtherTokenId;

                          if (this.useWandxForFee) {
                            sellOrder.FeeTokenId = Constants.WandxTokenId;
                          }
                          else {
                            sellOrder.FeeTokenId = Constants.EtherTokenId;
                          }

                          sellOrder.TargetVolume = price;

                          this.http.post(Constants.ServiceURL + 'Order/sell/create', sellOrder, requestOptions).subscribe(
                            data => {
                              this.notificationService.showNotification(new MessageModel(MessageType.Success, 'Order created successfully'), MessageContentType.Text);
                            },
                            err => {
                              this.notificationService.showNotification(new MessageModel(MessageType.Error, 'Transaction has not been processed'), MessageContentType.Text);
                            }
                          );
                        }
                        else {
                          this.notificationService.showNotification(new MessageModel(MessageType.Error, 'Failed to verify signature'), MessageContentType.Text);
                        }
                      });
                    }
                  }
                  else {
                    this.notificationService.showNotification(new MessageModel(MessageType.Error, 'Transaction has not been processed'), MessageContentType.Text);
                  }
                }
              );
            }
            else {
              this.notificationService.showNotification(new MessageModel(MessageType.Error, 'Transaction has not been processed'), MessageContentType.Text);
            }
          }
        );
      }
      else {
        this.notificationService.showNotification(new MessageModel(MessageType.Error, 'Failed to get block number'), MessageContentType.Text);
      }
    });
  }

  cancelBuyOrder(order: BuyOrder) {
    let orderValue = order.BuyingVolume * order.TargetVolume;
    if (order.FeeTokenId === Constants.WandxTokenId) {
      orderValue = order.BuyingVolume * order.TargetVolume * 3792;
    }
    orderValue = web3Functions.toBaseUnitAmount(orderValue, 18);
    this.cancelOrder(order.Id, order.BuyerHash, order.BuyerAccountId, web3Functions.toBaseUnitAmount(order.BuyingVolume, 18), order.FeeToken.address, orderValue, 1);
  }

  cancelSellOrder(order: SellOrder) {
    let orderValue = order.SellingVolume * order.TargetVolume;
    if (order.FeeTokenId === Constants.WandxTokenId) {
      orderValue = order.SellingVolume * order.TargetVolume * 3792;
    }
    orderValue = web3Functions.toBaseUnitAmount(orderValue, 18);
    this.cancelOrder(order.Id, order.SellerHash, order.SellerAccountId, web3Functions.toBaseUnitAmount(order.SellingVolume, 18), order.FeeToken.address, orderValue, 2);
  }

  cancelOrder(orderId: string, orderHash: string, orderCreator: string, orderVolume: number, feeTokenAddress: string, orderValue: number, orderType: number) {
    let web3 = this.web3Service.getWeb3();
    var orderTraderContract = web3.eth.contract(Constants.OrderbookContractAbi);
    var instanceOrderTraderContract = orderTraderContract.at(Constants.OrderBookContractAddress);
    instanceOrderTraderContract.cancelOrder(
      orderHash, orderCreator, orderVolume, feeTokenAddress, orderValue,
      (err, data) => {
        if (data) {
          this.notificationService.showNotification(new MessageModel(MessageType.Success, 'Transaction successful, please wait for transaction to complete'), MessageContentType.Text);
          let headers = new Headers({
            'content-type': 'application/json',
            'Ocp-Apim-Subscription-Key': Constants.ApiManagementSubscriptionKey,
            'Token': this.tokenService.getToken().Jwt
          });
          let requestOptions = new RequestOptions({headers: headers});
          if (orderType === 1) {
            this.http.delete(Constants.ServiceURL + 'order/buy/cancel/' + orderId, requestOptions).subscribe(
              data => {
                this.zone.run(() => this.refresh());
                this.notificationService.showNotification(new MessageModel(MessageType.Info, 'Order cancellation recorded'), MessageContentType.Text);
              },
              err => {
                console.log(err);
                this.zone.run(() => this.refresh());
                this.notificationService.showNotification(new MessageModel(MessageType.Error, 'Falied to record order cancellation'), MessageContentType.Text);
              }
            );
          }
          if (orderType === 2) {
            this.http.delete(Constants.ServiceURL + 'order/sell/cancel/' + orderId, requestOptions).subscribe(
              data => {
                this.zone.run(() => this.refresh());
                this.notificationService.showNotification(new MessageModel(MessageType.Info, 'Order cancellation recorded'), MessageContentType.Text);
              },
              err => {
                console.log(err);
                this.zone.run(() => this.refresh());
                this.notificationService.showNotification(new MessageModel(MessageType.Error, 'Falied to record order cancellation'), MessageContentType.Text);
              }
            );
          }
        }
        else {
          this.zone.run(() => this.refresh());
          console.log(err);
          this.notificationService.showNotification(new MessageModel(MessageType.Error, 'Failed to cancel order'), MessageContentType.Text);
        }
      }
    );
  }

  getBuyExchangeFee(): number {
    if (this.amountToBuy === 0 || this.priceToBuy === 0)
      return 0;
    if (this.useWandxForFee) {
      return this.amountToBuy * this.priceToBuy * Constants.WandxExchangeFeeRate;
    }
    return this.amountToBuy * this.priceToBuy * Constants.EthExchangeFeeRate;
  }

  getSellExchangeFee(): number {
    if (this.amountToSell === 0 || this.priceToSell === 0)
      return 0;
    if (this.useWandxForFee) {
      return this.amountToSell * this.priceToSell * Constants.WandxExchangeFeeRate;
    }
    return this.amountToSell * this.priceToSell * Constants.EthExchangeFeeRate;
  }

  getBuyTotalValue(): number {
    if (this.amountToBuy === 0 || this.priceToBuy === 0)
      return 0;
    this.USDValue = ((this.amountToBuy * this.priceToBuy) * this.usd).toFixed(4) + ' USD';

    return this.amountToBuy * this.priceToBuy;
  }

  getSellTotalValue(): number {
    if (this.amountToSell === 0 || this.priceToSell === 0)
      return 0;
    this.USDValue = ((this.amountToSell * this.priceToSell) * this.usd).toFixed(4) + ' USD';
    return this.amountToSell * this.priceToSell;
  }

  onAuthorizeChange(data) {
    if (this.selectedPlatformToken.address === '') {
      return;
    }
    let userAccount = this.userService.getCurrentUser().UserAccount;
    let web3 = this.web3Service.getWeb3();
    var orderTraderContract = web3.eth.contract(Constants.TokenAbi);
    var instanceOrderTraderContract = orderTraderContract.at(this.selectedPlatformToken.address);

    if (data) {
      instanceOrderTraderContract.approve(Constants.OrderBookContractAddress, web3Functions.toBaseUnitAmount(100000000, this.selectedPlatformToken.decimals), {'from': userAccount}, (err, data) => {
        if (data) {
          this.zone.run(() => {
            this.authorize = true;
          });
          this.notificationService.showNotification(new MessageModel(MessageType.Info, 'Transaction has been submitted, might take a while, please wait.'), MessageContentType.Text);
        }
        else {
          this.notificationService.showNotification(new MessageModel(MessageType.Info, 'Not enabled'), MessageContentType.Text);
        }
      });
    }
    else {
      instanceOrderTraderContract.approve(Constants.OrderBookContractAddress, 0, {'from': userAccount}, (err, data) => {
        if (data) {
          this.zone.run(() => {
            this.authorize = false;
          });
          this.notificationService.showNotification(new MessageModel(MessageType.Info, 'Transaction has been submitted, might take a while, please wait.'), MessageContentType.Text);
        }
        else {
          this.notificationService.showNotification(new MessageModel(MessageType.Info, 'Not disabled'), MessageContentType.Text);
        }
      });
    }
  }

  onAuthorizeWandChange(data) {
    let userAccount = this.userService.getCurrentUser().UserAccount;
    let web3 = this.web3Service.getWeb3();
    var orderTraderContract = web3.eth.contract(Constants.TokenAbi);
    var instanceOrderTraderContract = orderTraderContract.at(Constants.WandxTokenAddress);

    if (data) {
      instanceOrderTraderContract.approve(Constants.OrderBookContractAddress, web3Functions.toBaseUnitAmount(100000000, 18), {'from': userAccount}, (err, data) => {
        if (data) {
          this.zone.run(() => {
            this.authorizeWand = true;
          });
          this.notificationService.showNotification(new MessageModel(MessageType.Info, 'Transaction has been submitted, might take a while, please wait.'), MessageContentType.Text);
        }
        else {
          this.notificationService.showNotification(new MessageModel(MessageType.Info, 'Not enabled'), MessageContentType.Text);
        }
      });
    }
    else {
      instanceOrderTraderContract.approve(Constants.OrderBookContractAddress, 0, {'from': userAccount}, (err, data) => {
        if (data) {
          this.zone.run(() => {
            this.authorizeWand = false;
          });
          this.notificationService.showNotification(new MessageModel(MessageType.Info, 'Transaction has been submitted, might take a while, please wait.'), MessageContentType.Text);
        }
        else {
          this.notificationService.showNotification(new MessageModel(MessageType.Info, 'Not disabled'), MessageContentType.Text);
        }
      });
    }
  }

  checkAllowance() {
    let userAccount = this.userService.getCurrentUser().UserAccount;
    let web3 = this.web3Service.getWeb3();
    var orderTraderContract = web3.eth.contract(Constants.TokenAbi);
    var instanceOrderTraderContract = orderTraderContract.at(this.selectedPlatformToken.address);
    instanceOrderTraderContract.allowance(userAccount, Constants.OrderBookContractAddress, (err, data) => {
      this.authorizedAmount = data;
      if (data >= 25000000) {
        this.authorize = true;
      }
      else {
        this.authorize = false;
      }
    });
  }

  checkWandAllowance() {
    let userAccount = this.userService.getCurrentUser().UserAccount;
    let web3 = this.web3Service.getWeb3();
    var orderTraderContract = web3.eth.contract(Constants.TokenAbi);
    var instanceOrderTraderContract = orderTraderContract.at(Constants.WandxTokenAddress);
    instanceOrderTraderContract.allowance(userAccount, Constants.OrderBookContractAddress, (err, data) => {
      this.authorizedAmount = data;
      if (data >= 25000000) {
        this.authorizeWand = true;
      }
      else {
        this.authorizeWand = false;
      }
    });
  }

  getBuyOrders() {
    if (this.selectedPlatformToken.symbol === undefined || this.selectedPlatformToken.symbol === '')
      return;
    let headers = new Headers({
      'content-type': 'application/json',
      'Ocp-Apim-Subscription-Key': Constants.ApiManagementSubscriptionKey,
      'Token': this.tokenService.getToken().Jwt
    });
    let requestOptions = new RequestOptions({headers: headers});
    this.http.get(Constants.ServiceURL + 'order/buy/getall/' + this.selectedPlatformToken.id, requestOptions).subscribe(
      data => {
        this.buyOrders = data.json();
        this.buyOrders = this.buyOrders.filter((buyOrder) => {
          return buyOrder.ExpiringBlock > this.currentBlockNumber;
        });
      },
      err => {
        this.notificationService.showNotification(new MessageModel(MessageType.Error, err), MessageContentType.Text);
      }
    );
  }

  getSellOrders() {
    if (this.selectedPlatformToken.symbol === undefined || this.selectedPlatformToken.symbol === '')
      return;
    let headers = new Headers({
      'content-type': 'application/json',
      'Ocp-Apim-Subscription-Key': Constants.ApiManagementSubscriptionKey,
      'Token': this.tokenService.getToken().Jwt
    });
    let requestOptions = new RequestOptions({headers: headers});
    this.http.get(Constants.ServiceURL + 'order/sell/getall/' + this.selectedPlatformToken.id, requestOptions).subscribe(
      data => {
        this.sellOrders = data.json();
        this.sellOrders = this.sellOrders.filter((sellOrder) => {
          return sellOrder.ExpiringBlock > this.currentBlockNumber;
        });
      },
      err => {
        this.notificationService.showNotification(new MessageModel(MessageType.Error, err), MessageContentType.Text);
      }
    );
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

  getOrderTransactions() {
    if (this.selectedPlatformToken.symbol === undefined || this.selectedPlatformToken.symbol === '')
      return;
    let headers = new Headers({
      'content-type': 'application/json',
      'Ocp-Apim-Subscription-Key': Constants.ApiManagementSubscriptionKey,
      'Token': this.tokenService.getToken().Jwt
    });
    let requestOptions = new RequestOptions({headers: headers});
    this.http.get(Constants.ServiceURL + 'ordertransaction/all/' + this.selectedPlatformToken.id, requestOptions).subscribe(
      data => {
        this.orderTransactions = data.json();
      },
      err => {
        this.notificationService.showNotification(new MessageModel(MessageType.Error, err), MessageContentType.Text);
      }
    );
  }

  showBuyModal(order: SellOrder) {
    if (this.escrowEtherValue < order.SellingVolume * order.TargetVolume) {
      this.buyErrorMessage = 'Insufficient funds in escrow, please deposit ETH';
    }
    this.selectedSellOrder = order;
    this.isBuyModalVisible = true;
  }

  showSellModal(order: BuyOrder) {
    if (this.selectedTokenEscrowValue < order.BuyingVolume) {
      this.sellErrorMessage = 'Insufficient funds in escrow, please deposit ' + order.BuyingToken.symbol;
    }
    this.selectedBuyOrder = order;
    this.isSellModalVisible = true;
  }

  showBuySummaryModal() {
    this.isBuySummaryModalVisible = true;
  }

  showSellSummaryModal() {
    this.isSellSummaryModalVisible = true;
  }

  hideBuySummaryModal() {
    this.isBuySummaryModalVisible = false;
    this.createBuyOrder();
  }

  hideSellSummaryModal() {
    this.isSellSummaryModalVisible = false;
    this.createSellOrder();
  }

  onSubmitBuy(form: NgForm) {
    if (form.controls.buyamount.value < 0.00000001) {
      form.controls.buyamount.setErrors({min: true});
      form.controls.buyamount.markAsTouched();
    }
    if (form.controls.buyprice.value < 0.00000001) {
      form.controls.buyprice.setErrors({min: true});
      form.controls.buyprice.markAsTouched();
    }

    if (!form.touched || !form.valid) {
      this.notificationService.showNotification(new MessageModel(MessageType.Error, 'Please fix the errors in order form'), MessageContentType.Text);
      return;
    }
    if (this.selectedPlatformToken.address === '') {
      console.log('Invalid token address');
      return;
    }
    var exchangeFee = this.getBuyExchangeFee();

    if (this.useWandxForFee && this.wandEscrowValue < exchangeFee) {
      this.notificationService.showNotification(new MessageModel(MessageType.Error, 'Insufficient WAND balance to pay for exchange fee'), MessageContentType.Text);
      return;
    }

    if (this.useWandxForFee && this.escrowEtherValue < (this.amountToBuy * this.priceToBuy)) {
      this.notificationService.showNotification(new MessageModel(MessageType.Error, 'Please add ETH on Funds tab to enable the transaction'), MessageContentType.Text);
      return;
    }

    if (!this.useWandxForFee && this.escrowEtherValue < exchangeFee) {
      this.notificationService.showNotification(new MessageModel(MessageType.Error, 'Insufficient ETH balance to pay for exchange fee'), MessageContentType.Text);
      return;
    }

    if (!this.useWandxForFee && this.escrowEtherValue < (exchangeFee + (this.amountToBuy * this.priceToBuy))) {
      this.notificationService.showNotification(new MessageModel(MessageType.Error, 'Please add ETH on Funds tab to enable the transaction'), MessageContentType.Text);
      return;
    }
    this.showBuySummaryModal();
  }

  onSubmitSell(form: NgForm) {
    if (form.controls.sellamount.value < 0.00000001) {
      form.controls.sellamount.setErrors({min: true});
      form.controls.sellamount.markAsTouched();
    }
    if (form.controls.sellprice.value < 0.00000001) {
      form.controls.sellprice.setErrors({min: true});
      form.controls.sellprice.markAsTouched();
    }

    if (!form.touched || !form.valid) {
      this.notificationService.showNotification(new MessageModel(MessageType.Error, 'Please fix the errors in order form'), MessageContentType.Text);
      return;
    }
    if (this.selectedPlatformToken.address === '') {
      console.log('Invalid token address');
      return;
    }
    if (this.selectedTokenEscrowValue < this.amountToSell) {
      this.notificationService.showNotification(new MessageModel(MessageType.Error, 'Insufficient balance in Funds tab to create a sell order for ' + this.selectedPlatformToken.symbol), MessageContentType.Text);
      return;
    }
    var exchangeFee = this.getSellExchangeFee();
    if (this.useWandxForFee) {
      if (this.wandEscrowValue < exchangeFee) {
        this.notificationService.showNotification(new MessageModel(MessageType.Error, 'Insufficient wand balance to pay exchange fee.'), MessageContentType.Text);
        return;
      }
    }
    else {
      if (this.escrowEtherValue < exchangeFee) {
        this.notificationService.showNotification(new MessageModel(MessageType.Error, 'Insufficient ether balance to pay exchange fee.'), MessageContentType.Text);
        return;
      }
    }
    this.showSellSummaryModal();
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
        this.showAnalysisLoader = true;
        var tokens = data.json();
        console.log('tokes', data.json());
        this.sourceTokens = tokens;
        this.getDataFromCrypto();
        if (this.sourceTokens.length > 0) {
          this.usd = this.chartService.getUSD();
          this.sourceTokens.map((key) => {
            if (key.symbol === this.paramToken) {
              this.selectedPlatformToken = key;
              this.selectedSourceTokenSymbol = this.selectedPlatformToken.symbol;
              this.refresh();
              this.onSelect(this.selectedSourceTokenSymbol);
            }
          });
        }
      },
      err => {
        this.refresh();
        this.notificationService.showNotification(new MessageModel(MessageType.Error, 'Failed to get platform tokens, please refresh the page'), MessageContentType.Text);
      }
    );
  }

  buyOrder() {
    if (this.selectedSellOrder.Id === '')
      return;

    if (this.selectedSellOrder.ExpiringBlock < this.currentBlockNumber + 4) {
      this.notificationService.showNotification(new MessageModel(MessageType.Error, 'This order is about to expire. Sorry for the inconvenience'), MessageContentType.Text);
      return;
    }
    this.isBuySummaryModalVisible = false;
    let web3 = this.web3Service.getWeb3();
    var orderTraderContract = web3.eth.contract(Constants.OrderbookContractAbi);
    var instanceOrderTraderContract = orderTraderContract.at(Constants.OrderBookContractAddress);
    var orderID = this.selectedSellOrder.Id;
    let userAccount = this.userService.getCurrentUser().UserAccount;
    var find = '-';
    var re = new RegExp(find, 'g');
    var sanitizedOrderId = orderID.replace(re, '');
    sanitizedOrderId = '0x' + sanitizedOrderId;
    var buyFeeToken = Constants.EtherTokenAddress;
    if (this.useWandxForBuyFee)
      buyFeeToken = Constants.WandxTokenAddress;
    var tokensAndAddresses = [
      this.selectedSellOrder.SellingToken.address,
      this.selectedSellOrder.TargetToken.address,
      this.selectedSellOrder.FeeToken.address,
      buyFeeToken,
      this.selectedSellOrder.SellerAccountId,
      userAccount
    ];
    var volumes = [
      web3Functions.toBaseUnitAmount(this.selectedSellOrder.SellingVolume, this.selectedPlatformToken.decimals),
      web3Functions.toBaseUnitAmount(this.selectedSellOrder.TargetVolume * this.selectedSellOrder.SellingVolume, 18),
      web3Functions.toBaseUnitAmount(this.getSellerFeeValueForBuy(), 18),
      web3Functions.toBaseUnitAmount(this.getBuyerFeeValueForBuy(), 18),
      web3Functions.toBaseUnitAmount(this.selectedSellOrder.SellingVolume, this.selectedPlatformToken.decimals),
      web3Functions.toBaseUnitAmount(this.selectedSellOrder.TargetVolume, 18)
    ];

    this.notificationService.showNotification(new MessageModel(MessageType.Info, 'Initiating transaction, please use metamask to authorize'), MessageContentType.Text);
    var ecSignature = web3Functions.extractECSignature(this.selectedSellOrder.SellerSign, this.selectedSellOrder.SellerHash, this.selectedSellOrder.SellerAccountId);
    instanceOrderTraderContract.fillOrder(
      tokensAndAddresses, volumes, this.selectedSellOrder.ExpiringBlock,
      1, ecSignature.v, ecSignature.r, ecSignature.s, sanitizedOrderId,
      {'from': userAccount},
      (err, data) => {
        if (data) {
          this.notificationService.showNotification(new MessageModel(MessageType.Success, 'Transaction has been submitted to the blockchain. Please wait for confirmation on the Ethereum blockchain'), MessageContentType.Text);
          let headers = new Headers({
            'content-type': 'application/json',
            'Ocp-Apim-Subscription-Key': Constants.ApiManagementSubscriptionKey,
            'Token': this.tokenService.getToken().Jwt
          });
          let requestOptions = new RequestOptions({headers: headers});

          let orderTransaction = new OrderTransaction();
          orderTransaction.TransactionId = data;
          orderTransaction.SellOrderId = this.selectedSellOrder.Id;
          orderTransaction.SellerAccountId = this.selectedSellOrder.SellerAccountId;
          orderTransaction.BuyerAccountId = userAccount;
          orderTransaction.Status = 'COMPLETED';
          orderTransaction.TransactionValue = this.selectedSellOrder.SellingVolume * this.selectedSellOrder.TargetVolume;
          this.selectedSellOrder = undefined;
          this.isBuyModalVisible = false;
          this.http.post(Constants.ServiceURL + 'ordertransaction/create', orderTransaction, requestOptions).subscribe(
            data => {
              this.getBuyOrders();
              this.getSellOrders();
              this.getOrderTransactions();
              this.isBuyModalVisible = false;
              this.notificationService.showNotification(new MessageModel(MessageType.Success, 'Transaction recorded successfully'), MessageContentType.Text);
              this.getEtherEscrowValue();
            },
            err => {
              this.getBuyOrders();
              this.getSellOrders();
              this.getOrderTransactions();
              this.isBuyModalVisible = false;
              this.notificationService.showNotification(new MessageModel(MessageType.Error, 'Transaction has not been processed'), MessageContentType.Text);
              this.getEtherEscrowValue();
            }
          );
        }
        else {
          this.isBuyModalVisible = false;
          this.notificationService.showNotification(new MessageModel(MessageType.Error, 'Transaction has not been processed'), MessageContentType.Text);
        }
      }
    );
  }

  sellOrder() {
    if (this.selectedBuyOrder.Id === '')
      return;
    if (this.selectedBuyOrder.ExpiringBlock < this.currentBlockNumber + 4) {
      this.notificationService.showNotification(new MessageModel(MessageType.Error, 'This order is about to expire. Sorry for the inconvenience'), MessageContentType.Text);
      return;
    }

    this.isSellSummaryModalVisible = false;
    let web3 = this.web3Service.getWeb3();
    var orderTraderContract = web3.eth.contract(Constants.OrderbookContractAbi);
    var instanceOrderTraderContract = orderTraderContract.at(Constants.OrderBookContractAddress);
    var orderID = this.selectedBuyOrder.Id;
    let userAccount = this.userService.getCurrentUser().UserAccount;
    var find = '-';
    var re = new RegExp(find, 'g');
    var sanitizedOrderId = orderID.replace(re, '');
    sanitizedOrderId = '0x' + sanitizedOrderId;
    var sellFeeToken = Constants.EtherTokenAddress;
    if (this.useWandxForSellFee)
      sellFeeToken = Constants.WandxTokenAddress;
    var tokensAndAddresses = [
      this.selectedBuyOrder.BuyingToken.address,
      this.selectedBuyOrder.TargetToken.address,
      sellFeeToken,
      this.selectedBuyOrder.FeeToken.address,
      userAccount,
      this.selectedBuyOrder.BuyerAccountId
    ];
    var volumes = [
      web3Functions.toBaseUnitAmount(this.selectedBuyOrder.BuyingVolume, this.selectedPlatformToken.decimals),
      web3Functions.toBaseUnitAmount(this.selectedBuyOrder.TargetVolume * this.selectedBuyOrder.BuyingVolume, 18),
      web3Functions.toBaseUnitAmount(this.getSellerFeeValueForSell(), 18),
      web3Functions.toBaseUnitAmount(this.getBuyerFeeValueForSell(), 18),
      web3Functions.toBaseUnitAmount(this.selectedBuyOrder.BuyingVolume, this.selectedPlatformToken.decimals),
      web3Functions.toBaseUnitAmount(this.selectedBuyOrder.TargetVolume, 18)
    ];
    var ecSignature = web3Functions.extractECSignature(this.selectedBuyOrder.BuyerSign, this.selectedBuyOrder.BuyerHash, this.selectedBuyOrder.BuyerAccountId);
    this.notificationService.showNotification(new MessageModel(MessageType.Info, 'Initiating transaction, please use metamask to authorize'), MessageContentType.Text);
    instanceOrderTraderContract.fillOrder(
      tokensAndAddresses, volumes, this.selectedBuyOrder.ExpiringBlock,
      0, ecSignature.v, ecSignature.r, ecSignature.s, sanitizedOrderId,
      {'from': userAccount},
      (err, data) => {
        if (data) {
          this.notificationService.showNotification(new MessageModel(MessageType.Success, 'Transaction has been submitted to the blockchain. Please wait for confirmation on the Ethereum blockchain'), MessageContentType.Text);
          let headers = new Headers({
            'content-type': 'application/json',
            'Ocp-Apim-Subscription-Key': Constants.ApiManagementSubscriptionKey,
            'Token': this.tokenService.getToken().Jwt
          });
          let requestOptions = new RequestOptions({headers: headers});

          let orderTransaction = new OrderTransaction();
          orderTransaction.TransactionId = data;
          orderTransaction.BuyOrderId = this.selectedBuyOrder.Id;
          orderTransaction.BuyerAccountId = this.selectedBuyOrder.BuyerAccountId;
          orderTransaction.SellerAccountId = userAccount;
          orderTransaction.Status = 'COMPLETED';
          orderTransaction.TransactionValue = this.selectedBuyOrder.BuyingVolume * this.selectedBuyOrder.TargetVolume;
          this.selectedBuyOrder = undefined;
          this.isSellModalVisible = false;
          this.http.post(Constants.ServiceURL + 'ordertransaction/create', orderTransaction, requestOptions).subscribe(
            data => {
              this.getBuyOrders();
              this.getSellOrders();
              this.getOrderTransactions();
              this.getEtherEscrowValue();
              this.isSellModalVisible = false;
              this.notificationService.showNotification(new MessageModel(MessageType.Success, 'Transaction has been submitted, once confirmed it will display on the My Orders tab'), MessageContentType.Text);
            },
            err => {
              this.getBuyOrders();
              this.getSellOrders();
              this.getOrderTransactions();
              this.getEtherEscrowValue();
              this.isSellModalVisible = false;
              this.notificationService.showNotification(new MessageModel(MessageType.Error, 'Transaction has not been processed'), MessageContentType.Text);
            }
          );
        }
        else {
          this.isSellModalVisible = false;
          this.notificationService.showNotification(new MessageModel(MessageType.Error, 'Transaction has not been processed'), MessageContentType.Text);
        }
      }
    );
  }

  getSellerFeeValueForBuy() {
    if (this.selectedSellOrder.FeeToken.address === Constants.WandxTokenAddress) {
      return this.selectedSellOrder.TargetVolume * this.selectedSellOrder.SellingVolume * 3792;
    }
    else {
      return this.selectedSellOrder.TargetVolume * this.selectedSellOrder.SellingVolume;
    }
  }

  getBuyerFeeValueForBuy() {
    if (this.useWandxForBuyFee) {
      return this.selectedSellOrder.TargetVolume * this.selectedSellOrder.SellingVolume * 3792;
    }
    else {
      return this.selectedSellOrder.TargetVolume * this.selectedSellOrder.SellingVolume;
    }
  }

  getSellerFeeValueForSell() {
    if (this.selectedBuyOrder.FeeToken.address === Constants.WandxTokenAddress) {
      return this.selectedBuyOrder.TargetVolume * this.selectedBuyOrder.BuyingVolume * 3792;
    }
    else {
      return this.selectedBuyOrder.TargetVolume * this.selectedBuyOrder.BuyingVolume;
    }
  }

  getBuyerFeeValueForSell() {
    if (this.useWandxForSellFee) {
      return this.selectedBuyOrder.TargetVolume * this.selectedBuyOrder.BuyingVolume * 3792;
    }
    else {
      return this.selectedBuyOrder.TargetVolume * this.selectedBuyOrder.BuyingVolume;
    }
  }

  openTransaction(transactionId) {
    window.open(Constants.TxAppnetURL + transactionId, '_blank');
  }

  hideBuyModal() {
    this.isBuyModalVisible = false;
  }

  hideSellModal() {
    this.isSellModalVisible = false;
  }

  ///chart
  /* getChartData() {
     this.subscription = this.chartService.tokenTodayPrice$.subscribe(
       item => {
         this.currentPrice = item;
       });
     this.subscription = this.chartService.tokenLowAndHighPrice$.subscribe(
       item => {
         if (item) {
           this.lowPrice = (1 / item['LOW24HOUR']).toFixed(4);
           this.highPrice = (1 / item['HIGH24HOUR']).toFixed(4);
         }
         console.log('called high and low');
       });
   }*/

  getMinData() {
    this.subscription = this.chartService.tokenTodayPrice$.subscribe(
      item => {
        this.currentPrice = item;
      });
    this.subscription = this.chartService.tokenLowAndHighPrice$.subscribe(
      item => {
        console.log(item);
        if (item) {
          if (item['LOW24HOUR'] !== 0) {
            this.lowPrice = (1 / item['LOW24HOUR']).toFixed(4);
          }
          else {
            this.lowPrice = 0.0;
          }
          if (item['HIGH24HOUR'] !== 0) {
            this.highPrice = (1 / item['HIGH24HOUR']).toFixed(4);
          }
          else {
            this.highPrice = 0.0;
          }
        }
        else {
          this.lowPrice = 0.0;
          this.highPrice = 0.0;
        }
      });
    this.activeBtn = 'M';
    this.chartService.getMinData(this.tokenSelected);
    this.chartService.getTokenTodayPrice(this.tokenSelected);
    this.chartService.getTokenLowAndHighPrice(this.tokenSelected);
  }

  getHoursData() {
    this.activeBtn = 'D';
    this.chartService.getData(this.tokenSelected);
    this.chartService.getAdvanceData(this.tokenSelected);
    this.chartService.getTokenTodayPrice(this.tokenSelected);
    this.chartService.getTokenLowAndHighPrice(this.tokenSelected);
  }

  getDayData() {
    this.activeBtn = 'H';
    this.chartService.getDayData(this.tokenSelected);
    this.chartService.getTokenTodayPrice(this.tokenSelected);
    this.chartService.getTokenLowAndHighPrice(this.tokenSelected);
  }

  autocompleListFormatter = (data: any) => {
    let html = `<span style='color:black'>${data.symbol}</span>`;
    return this._sanitizer.bypassSecurityTrustHtml(html);
  };

  updateCurrentEthBlockNumber() {
    let web3 = this.web3Service.getWeb3();
    web3.eth.getBlockNumber((err, data) => {
      if (data) {
        this.currentBlockNumber = data;
      }
    });
  }

  changeChart(type) {
    this.tracKGraph = type;
    this.getMinData();
    this.chartService.trackGraph(type);

  }

  onToggleChange() {
    this.switchGraph.getGraph().subscribe(msg => {
      if (msg.graph === true) {
        this.graphType = 'CryptoCompare';
      } else {
        this.graphType = 'WandX';
      }
    });
    this.switchGraph.switchGraph(this.changeGraphData);
  }
}
