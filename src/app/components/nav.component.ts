import { Component, OnInit } from '@angular/core';
import { Subscription } from "rxjs/Subscription"
import { Router } from "@angular/router";

import { NavigationService } from "../services/nav.service";
import { SwitchThemeService } from "../services/switch-theme.service";
import { Web3Service } from '../services/web3.service';
import { AuthService } from '../services/auth.service';
import { NotificationManagerService } from '../services/notification-manager.service';
import { MessageModel, MessageType, MessageContentType } from '../models/message.model';
import {CustomWalletService} from '../services/custom-wallet.service'
var Web3=require('web3');
@Component({
    host : {
      '(document:click)': 'hideUserPrefDropdown($event)',
    },
    selector: 'navigation',
    templateUrl: '../templates/nav.component.html',
    styleUrls: ['../styles/nav.component.css']
})
export class NavComponent implements OnInit{
    private navSubscription: Subscription;
    public web3:any;
    currentActiveTab = "portfolios";
    currentEtherBalance = 0.0;
    public isUserPrefDropdownVisible = false;
    public switchTheme;
    constructor(
        private navService: NavigationService,
        readonly switchThemeService: SwitchThemeService,
        private router: Router,
        private web3Service: Web3Service,
        private wallet : CustomWalletService,
        private auth: AuthService,
        private notificationService: NotificationManagerService
    ){
        this.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
        this.navSubscription = this.navService.active$.subscribe(data => {
            this.currentActiveTab = data;
        });
    }

    ngOnInit(): void {
        let web3 = this.web3Service.getWeb3();
        web3.eth.getBalance(web3.eth.coinbase, (err, data) => {
            this.currentEtherBalance = web3.fromWei(data).toFixed(4);
        });
    }

    onToggleChange(){
        this.switchThemeService.changeClass(this.switchTheme);
    }
    isTabActive(tabName: string){
        return this.currentActiveTab === tabName;
    }

    getLogoutText(){
        /*let loggedInUserEmail = sessionStorage.getItem("name");
        if(loggedInUserEmail.length > 2){
            return loggedInUserEmail;
        }

        return loggedInUserEmail.toLocaleUpperCase();
        */
       return this.web3Service.getWeb3().eth.coinbase;
    }

    logout(){
        console.log("logging out");
        this.auth.logout();
        this.notificationService.showNotification(new MessageModel(MessageType.Info, "Successfully logged out."), MessageContentType.Text)
        localStorage.removeItem('pendingPortfolio');
        localStorage.removeItem('CancelPortfolio');
        localStorage.removeItem('buy');
        this.router.navigateByUrl("/");
        if(this.switchTheme === undefined || this.switchTheme === false){
        }else{
        this.switchThemeService.changeClass(!this.switchTheme);
        }
    }

    showUserPrefDropdown(e) {
      e.stopPropagation()
      this.isUserPrefDropdownVisible = true;
    }
    hideUserPrefDropdown(e) {
      if (this.isUserPrefDropdownVisible)
        e.stopPropagation()
      this.isUserPrefDropdownVisible = false;
    }
}
