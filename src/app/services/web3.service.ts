import { Injectable, Inject, OnInit } from "@angular/core";
import  EthQuery from 'eth-query'
var  web3local = require('web3')
//import Web3 from 'web3';
var Web3 = require('web3')
import {CustomWalletService} from './custom-wallet.service'
import {InfuraNetworkService} from './infura-network.service'

declare global {
  interface Window { web3: any; }
}
window.web3 = window.web3 || undefined;

declare namespace web3Functions{
  export function initializeWeb3(useJsonWallet : boolean, data : any);
}

@Injectable()
export class Web3Service {
  web3: any;
  public priv:any;
  public add:any
  public add1:any;
  public amt:any;
  public amt1:any;
   query : EthQuery
constructor(private wallet : CustomWalletService/*, private network : InfuraNetworkService*/) {
  this.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
    console.log(this.web3.version)
    console.log(this.web3.eth.accounts._provider);
    // this.web3.eth.getAccounts((err,res)=>{console.log(res[0]);
    //   this.web3.eth.getBalance(res[0],(err,res)=>{console.log((res/1000000000000000000).toFixed(4));
    //   })
    // })
    
    console.log(this.web3)
    // this.sendAsync = this.sendAsync.bind(this)
    // this.send = this.send.bind(this)
    //  this.initialize = this.initialize.bind(this)

    // by default we load metamask web3
    this.initialize()
    
  }
  initialize(useJsonWallet = false) {
    // we need to manually initialize web3 after the wallet is chosen
    console.log('hello')
    //this.web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:8545/"));
    
    // web3Functions.initializeWeb3(useJsonWallet, {web3 : web3local, provider : this});

    // this.web3 = window.web3;
    // this.network.initialize()
    // this.query = this.network.getEthQuery()
    // if (this.wallet.isWalletInitialized())
    //   this.web3.eth.defaultAccount = this.wallet.userAddress()
      
  }
  sendAsync(payload, callback) {
    // if (!this.query)
    //   return callback(new Error('Not connected to rpc network'))
    // this.query.sendAsync(payload, (err, result) => {
    //   var data = null;
    //   if (!err) {
    //     data =  {
    //       id: payload.id,
    //       jsonrpc: payload.jsonrpc,
    //       result: result,
    //     }
    //   }
    //   callback(err, data)
    // })
  }
  send(payload) {
    // const self = this

    // let selectedAddress
    // let result = null
    // switch (payload.method) {

    //   case 'eth_accounts':
    //     // read from localStorage
    //     selectedAddress = this.wallet.userAddress()
    //     result = selectedAddress ? [selectedAddress] : []
    //     break

    //   case 'eth_coinbase':
    //     // read from localStorage
    //     selectedAddress = this.wallet.userAddress()
    //     result = selectedAddress || null
    //     break

    //   case 'eth_uninstallFilter':
    //     self.sendAsync(payload, function(){})
    //     result = true
    //     break

    //   case 'net_version':
    //     const networkVersion = this.network.networkState
    //     result = networkVersion || null
    //     break

    //   // throw not-supported Error
    //   default:
    //     var link = 'https://github.com/MetaMask/faq/blob/master/DEVELOPERS.md#dizzy-all-async---think-of-metamask-as-a-light-client'
    //     var message = `The Web3 object does not support synchronous methods like ${payload.method} without a callback parameter. See ${link} for details.`
    //     throw new Error(message)
    // }

    // // return the result
    // return {
    //   id: payload.id,
    //   jsonrpc: payload.jsonrpc,
    //   result: result,
    // }
  }
  getWeb3() {
    return this.web3;
  }
  checkWeb3(): boolean{
    if(this.getWeb3() === null || this.getWeb3() === undefined)
      return false;
    var userAccount = this.add;
    if(userAccount === null || userAccount === undefined || userAccount.length === 0)
      return false;
    return true;
  }



  public async publickeygenerator(pkey):Promise<string>{
    return new Promise((resolve,reject)=>{
       var add1=this.web3.eth.accounts.privateKeyToAccount('0x'+pkey);
       this.add=add1['address'];
       sessionStorage.setItem('address',this.add.toLowerCase());
       resolve(this.add)
    })as Promise<string>
  }

  public async privatekey(pkey){
    var s=await this.publickeygenerator(pkey);
   return new Promise((resolve,reject)=>{
       this.web3.eth.getBalance(s,(err,result)=>{
         if(err!=null){
           console.log(err);
         }else{
          this.amt=result;
          this.amt1=(this.amt/1000000000000000000).toFixed(4)
          console.log(this.amt1)
          sessionStorage.setItem('balance',this.amt1);
         }
       })
   })
  }
}
