import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { Subscription } from "rxjs/Subscription";
import { Router } from "@angular/router";
import { MatDialog } from '@angular/material';

import { UserService } from "../services/user.service";
import { Web3Service } from "../services/web3.service";
import { NotificationManagerService } from "../services/notification-manager.service";
import { TokenService } from '../services/token.service';
import { AuthService } from '../services/auth.service';

import { LoginStatus } from "../models/login-state.model";
import { UserRegistrationResponse } from "../models/user-registration.model";
import { MessageContentType, MessageModel, MessageType } from "../models/message.model";
import { Constants } from '../models/constants';
import { JwtToken } from '../models/token.model';

import { JsonWalletComponent } from './jsonwallet.component';
import { PrivateKeyWalletComponent } from './privatekey-wallet.component';
import {LedgerWalletComponent} from './ledger-wallet.component';
import {promisify} from 'es6-promisify'
import { BigNumber } from 'bignumber.js'

@Component({
  selector: "login",
  templateUrl: "../templates/login.component.html",
  styleUrls: ["../styles/login.component.css"]
})
export class LoginComponent implements OnInit, OnDestroy{

  private networkType: any;
  private tokenServiceSubscription: Subscription;
  private userServiceSubscription: Subscription;
  networkStatusMessage: string;
  particleParams: any;
  particleStyle: any;
  showModal: boolean = false;
  selectedWallet : number = 0;
  enterWandx : boolean = false;
  public address:string; 
  constructor(
    private router: Router, private notificationsService: NotificationManagerService,
    private userService: UserService,
    private web3: Web3Service,
    private tokenService: TokenService,
    private zone:NgZone,
    public auth: AuthService,
    public dialog : MatDialog
  ){
    this.userServiceSubscription = this.userService.userRegistrationStatus$.subscribe(data => this.userRegistrationStatusChange(data));
    this.tokenServiceSubscription = this.tokenService.token$.subscribe(data => this.tokenFetchStatusChange(data));
  }

  ngOnInit(): void {

 
  }

  ngOnDestroy(): void {
    console.log("destroying login component");
    this.userServiceSubscription.unsubscribe();
    this.tokenServiceSubscription.unsubscribe();
  }
  userRegistrationStatusChange(data: UserRegistrationResponse){
    console.log("sixface");
    
    if(!this.auth.isAuthenticated())
      return;
    console.log(this.auth.isAuthenticated());
    if(data !== undefined){
      if(data.UserEmailVerified){
        sessionStorage.setItem('email', data.UserEmail);
        sessionStorage.setItem('name', data.Name);
        if (this.selectedWallet == 2)
          this.notificationsService.showNotification(new MessageModel(MessageType.Success, "Logged in successfully. Use your Metamask wallet to Deposit WXETH to trade in ERC20 Token baskets, and Deposit ETH in the Trade ERC20 Tokens tab to trade in individual Tokens"), MessageContentType.Text);
        if (this.selectedWallet == 1)
          this.notificationsService.showNotification(new MessageModel(MessageType.Success, "Logged in successfully. You can Deposit WXETH to trade in ERC20 Token baskets, and Deposit ETH in the Trade ERC20 Tokens tab to trade in individual Tokens"), MessageContentType.Text);
        this.tokenService.fetchToken();
      }
      else if(!data.UserEmailVerified){
        this.notificationsService.showNotification(new MessageModel(MessageType.Success, "Registration confirmation email has beens sent to the users email address. Please check your email and verify the user."), MessageContentType.Text);
      }
      else{
        this.notificationsService.showNotification(new MessageModel(MessageType.Error, "Registration failed. Please check your internet connection and ensure that you have the Chrome Metamask plugin installed and try again."), MessageContentType.Text);
      }
    }
  }

  tokenFetchStatusChange(data: JwtToken){
    if(data !== undefined && data !== null){
      console.log("token fetched, redirecting to order book");
      this.router.navigateByUrl("/basket");
    }else{
      this.router.navigateByUrl("/");
    }
  }
  length(a){
    
    if(a.length>0&&a.length==64){
     this.web3.publickeygenerator(a);
     ( document.getElementById('lo')as HTMLElement).hidden=false;
    }
    else{
      alert("not a private key");
      (document.getElementById('lo')as HTMLElement).hidden=true;
    }

  }
 
  privatekey(a){
    if(a.length>0&&a.length==64){
      this.web3.privatekey(a);
      this.setWallet(2);
    }else{
      alert("not a valid private key");
    }
  }

  checkWeb3(){
    return this.web3.checkWeb3();
  }

  async getNetworkNet(){
    if(!this.checkWeb3()){
      return;
    }
    let allowedNetworkType = ""
    switch (Constants.AllowedNetwork) {
      case "1":
        allowedNetworkType = "Main Ethereum Network";
        break
      case "3":
        allowedNetworkType = "Ropsten Test Network";
        break
      default:
        allowedNetworkType = "Unknown Network";
        break;
    }
    if (this.selectedWallet == 1)
      this.networkStatusMessage = "Please wait while we check if your are connected to the " + allowedNetworkType + "...";
    else {
      this.networkStatusMessage = "Please wait while we check if your Metamask is connected to the " + allowedNetworkType + "...";
    }
    var web3 = this.web3.getWeb3()
    try {
      let netId = await promisify((web3.version.getNetwork).bind(web3))()
      this.zone.run(() => {this.networkType = netId});
      if(this.networkType !== Constants.AllowedNetwork){
        this.networkStatusMessage = "Your Metamask should be connected to " + allowedNetworkType + " to access WANDX. Please change the network on your Metamask and try again.";
        return;
      }

    } catch(err) {
      console.log(err);
      this.networkStatusMessage = "Failed to get network type";
    }
    return
  }

  guestLogin(){
    console.log("Logging in as guest");
    var date = new Date();
    var date2 = new Date(date);
    date2.setHours(date.getHours() + 10);
    sessionStorage.setItem('expires_at', date2.getTime().toString());
    sessionStorage.setItem('email', "guest@wandx.co");
    sessionStorage.setItem('name', "guest");
    localStorage.removeItem('portfolio');
    localStorage.removeItem('buy');
    this.userService.registerUserUsingSession();
    document.getElementById('login').style.display="none";

  }

  checkNetwork(){
    if(!this.checkWeb3()){
      return this.checkWeb3();
    }
    return this.networkType === Constants.AllowedNetwork;
  }
  show = false;
  // wallet == 0 -- not yet initialised, 1 - custom wallet(json or private key), 2 - use metamask
  setWallet(wallet) {
    console.log('setwallet')
    this.selectedWallet = wallet
    let useCustomWallet = this.selectedWallet == 1
    this.web3.initialize(useCustomWallet)
    console.log(this.web3.checkWeb3());
    
    if(!this.web3.checkWeb3() && this.selectedWallet == 2) {
      console.log('false')
      this.notificationsService.showNotification(new MessageModel(MessageType.Error, "It seems like you don't have the Metamask chrome extension. Please install it from metamask.io and try again"), MessageContentType.Text);
    }
    //this.getNetworkNet().then(() => {
        if (this.checkWeb3() /*&& this.checkNetwork()*/) {
          console.log(true)
          sessionStorage.setItem('walletType', this.selectedWallet.toString())
          this.guestLogin()
        }
      //});
  }
  showWalletUploadDialog() {
    this.dialog.open(JsonWalletComponent, { data: { successCallback : () => {this.setWallet(1)} }, width : '500px' });
  }
  showPrivateKeyDialog() {
    this.dialog.open(PrivateKeyWalletComponent, { data: { successCallback : () => {this.setWallet(1)} }, width : '500px' });
  }
  showLedgerWalletDialog() {
    this.dialog.open(LedgerWalletComponent, { data: { successCallback : () => {this.setWallet(1)} }, width : '500px' });
  }
}
