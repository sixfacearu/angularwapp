import {Component, NgZone, OnDestroy, OnInit} from '@angular/core';
import {Subscription} from 'rxjs/Subscription';
import {Router, ActivatedRoute} from '@angular/router';
import {Http, RequestOptions, Headers} from '@angular/http';
import {Web3Service} from '../services/web3.service';
import * as _ from 'underscore';
import {Constants} from '../models/constants';
import {NavigationService} from '../services/nav.service';
import {WalletService} from '../services/wallet.service';
import {TokenService} from '../services/token.service';
import {PortfolioService} from '../services/portfolio.service';
import {JwtToken} from '../models/token.model';
import {SwitchThemeService} from '../services/switch-theme.service';

@Component({
  selector: 'otc',
  templateUrl: '../templates/otc.component.html',
  styleUrls: ['../styles/otc.component.css']
})
export class OtcComponent implements OnInit, OnDestroy {

  private platformTokenChanges: Subscription;
  private tokenChangeSubscription: Subscription;
  public allAvailableContracts: any;
  public allAvailableContract: any;
  public buyOrder = false;
  public selectedToken = {};
  private portfolioData: Subscription;
  private listOfPorfolio: any;
  public askingPrice: any;
  public filteredSeller = [];
  public listFilter = false;
  public askingPriceform = true;
  public buy = false;
  public bestPrice: any;
  public showLoader = true;
  public buyAblePortfolio: any;

  constructor(private zone: NgZone,  readonly switchThemeService: SwitchThemeService, private web3: Web3Service, private navService: NavigationService, private walletService: WalletService, private tokenService: TokenService, private portfolioService: PortfolioService,) {
    this.portfolioData = this.portfolioService.portfolioData$.subscribe(data => this.portfoliolistchange(data));
    this.navService.setCurrentActiveTab('OTC');
    this.platformTokenChanges = this.walletService.platformTokenChanges$.subscribe(data => this.platformTokenChange(data));
    this.tokenChangeSubscription = this.tokenService.token$.subscribe(data => this.handleTokenChange(data));
  }

  ngOnInit(): void {
    if (this.tokenService.getToken() === undefined) {
      this.tokenService.fetchToken();
    } else {
      this.loadToken();
      this.portfolioService.getList();
    }
  }

  ngOnDestroy(): void {
    this.platformTokenChanges.unsubscribe();
    this.tokenChangeSubscription.unsubscribe();
  }
  handleTokenChange(data: JwtToken) {
    if (data === undefined) return;
    this.loadToken();
    this.portfolioService.getList();
  }
  platformTokenChange(data) {
    if (data) {
      this.showLoader = false;
      console.log('got token', data);
      this.allAvailableContracts = data;
      this.allAvailableContract = data;
    }
  }

  loadToken() {
    this.walletService.getPlatformTokens();
  }

  closeBuyorderModal() {
    this.buyOrder = false;
    this.buy = false;
    this.listFilter = false;
    this.askingPriceform = true;
    this.filteredSeller=[];
  }

  openBuyorderModal(token) {
    this.selectedToken = {
      tokenName: token.name,
      tokenSymbol: token.symbol,
    };
    console.log('filtered', this.selectedToken);
    this.buyOrder = true;
    this.findSeller();
  }

  findSeller() {
    this.askingPriceform = false;
    if (!this.listOfPorfolio) {
      this.portfolioService.getBasketList();
    } else {
      this.listOfPorfolio.map((key, value) => {
        key.tokens.map((key2, value2) => {
          this.zone.run(() => {
            if (key2['symbol'] === this.selectedToken['tokenSymbol']) {
              this.buy = true;
              this.filteredSeller.push(key);
              this.filteredSeller = _.sortBy(this.filteredSeller, 'valueInEther');
              this.bestPrice = this.filteredSeller[0].valueInEther;
              this.buyAblePortfolio = this.filteredSeller[0];
            }
          });
        });
      });
    }
  }

  portfoliolistchange(data) {
    if (data)
      if (data.length > 0) {
        this.zone.run(() => {
          this.showLoader = false;
          let filtered = _.filter(data, function (item) {
            return item['tokens'].length === 1;
          });
          this.listOfPorfolio = filtered;
          this.findSeller();
        });
      }
  }

  selectSeller(seller) {
    this.buyAblePortfolio = seller;
    this.buy = true;
    this.listFilter = false;
    this.bestPrice = seller.valueInEther;
    this.portfolioService.buyPortfolio(this.buyAblePortfolio);
    this.closeBuyorderModal();
  }

  getvalue(value, ask) {
    return ((parseFloat(ask) / parseFloat(value)));
  }

  buyBasket() {
    this.closeBuyorderModal();
  }

  filter(txt) {
    console.log('txt', txt);
    if (txt) {
      const tempContract = this.allAvailableContracts;
      this.allAvailableContract = tempContract.filter((key) => key.name.toUpperCase().indexOf(txt.toUpperCase()) >= 0 || key.symbol.toUpperCase().indexOf(txt.toUpperCase()) >= 0);
    } else {
      this.allAvailableContract = this.allAvailableContracts;
    }
  }

  getAllContract() {
    return this.allAvailableContracts;
  }
}
