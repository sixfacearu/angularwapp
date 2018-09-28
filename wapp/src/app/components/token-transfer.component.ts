import {Component, OnInit, OnDestroy, NgZone} from '@angular/core';
import {Subscription} from 'rxjs/Subscription';
import {Observable} from 'rxjs';
import {NavigationService} from '../services/nav.service';
import {MessageContentType, MessageModel, MessageType} from '../models/message.model';
import { NotificationManagerService } from "../services/notification-manager.service";
import {SwitchThemeService} from '../services/switch-theme.service';
import {NgForm, FormBuilder, FormGroup, FormControl, Validators} from '@angular/forms';
import {Constants} from '../models/constants';
import {TokenService} from '../services/token.service';
import {PlatformTokenService} from '../services/platform-token.service';
import {Headers, RequestOptions, Http} from '@angular/http';
import {Web3Service} from '../services/web3.service';
import * as abi from 'human-standard-token-abi';
import * as EthABI from 'ethereumjs-abi'
import {promisify} from 'es6-promisify'
import {BigNumber} from 'bignumber.js'
import {TransactionService} from '../services/transaction.service'

BigNumber.config({ ROUNDING_MODE: BigNumber.ROUND_HALF_DOWN })


@Component({
  selector: 'token-transfer',
  templateUrl: '../templates/token-transfer.component.html',
  styleUrls: ['../styles/token-transfer.component.css']
})
export class TokenTransferComponent implements OnInit, OnDestroy {

  subscription: Subscription;
  tokenTransferForm : FormGroup;
  sourceTokens: Array<any> = []
  tokenBalance : string = '0'
  tokenBalanceBN : BigNumber = new BigNumber('0');
  totalBN : BigNumber = new BigNumber('0');
  selectedToken : any;
  selectedTokenContract : any;
  web3 : any;
  txParams : any;

  // const
  constructor(private fb : FormBuilder,
              private http : Http,
              private zone: NgZone,
              private tokenService : TokenService,
              private platformTokenService : PlatformTokenService,
              private transactionService : TransactionService,
              private Web3Service: Web3Service,
              private navService: NavigationService,
              private notificationService: NotificationManagerService, 
              readonly switchThemeService: SwitchThemeService) {
    
    this.createForm = this.createForm.bind(this)
    this.getPlatformTokens = this.getPlatformTokens.bind(this)
    this.formChangeListeners = this.formChangeListeners.bind(this)
    this.updateFormTxParams = this.updateFormTxParams.bind(this)
    this.ethAddressValidator = this.ethAddressValidator.bind(this)
    this.positiveNumberValidator = this.positiveNumberValidator.bind(this)
    this.toAddressSameAsFromValidator = this.toAddressSameAsFromValidator.bind(this)

    this.web3 = this.Web3Service.getWeb3()
    this.navService.setCurrentActiveTab('tokentransfer');
    this.tokenService.fetchToken()
  }
  ngOnInit(): void {
    this.subscription = this.switchThemeService.getTheme().subscribe(message => {
      this.navService.setCurrentActiveTab('tokentransfer');
    })

    this.createForm()
    this.tokenService.token$.subscribe(() => {
      if (this.tokenService.getToken())
        this.getPlatformTokens()
    });
  }
  // validators
  ethAddressValidator(control : FormControl) {
    let address = control.value
    if (!address) {
      return null
    }
    else if (this.web3.isAddress(address))
      return null
    else {
      return {invalidAddress : true}
    }
  }
  positiveNumberValidator(control : FormControl) {
    if (!control.value)
      return null
    else {
      let n = new BigNumber(control.value)
      if (n.isPositive())
        return null
      else
        return {isPositive : false}
    }
  }
  toAddressSameAsFromValidator(control : FormControl) {
    let address = control.value
    let userAddress = this.web3.eth.coinbase
    if (!userAddress || !address)
      return null
    if (userAddress.toLowerCase() == address.toLowerCase())
      return {toSameAsFrom : true}
    return null
  }

  // gas helpers
  getGasParams(selectedAddress, symbol, data) {
    const estimatedGasParams = {
      from: selectedAddress,
      gas: '0x746a528800',
    }

    if (symbol) {
      Object.assign(estimatedGasParams, { value: '0x0' })
    }

    if (data) {
      Object.assign(estimatedGasParams, { data })
    }

    return estimatedGasParams
  }
  async getGasPrice() {
    let gasPrice = await promisify(this.web3.eth.getGasPrice.bind(this.web3.eth))()
    return gasPrice

  }
  async getGasEstimate() {
    let symbol = this.selectedToken.symbol == 'ETH' ? undefined : this.selectedToken.symbol
    let userAddress = this.web3.eth.coinbase
    // create data
    let data = Array.prototype.map.call(EthABI.rawEncode(['address', 'uint256'], [userAddress, '0x0']), function (x) {
      return ('00' + x.toString(16)).slice(-2);
    }).join('');


    let params = this.getGasParams(this.selectedToken.address, symbol, data)
    let gasEstimate = await promisify(this.web3.eth.estimateGas.bind(this.web3.eth))(params)
    return gasEstimate
  }
  createForm() {
    this.tokenTransferForm = this.fb.group({
      toAddress : ['', [Validators.required, this.ethAddressValidator, this.toAddressSameAsFromValidator]],
      selectedToken : [-1, Validators.required],
      amount : [{value : '', disabled : true}, [Validators.required, this.positiveNumberValidator]],
      gasAmount : ['', Validators.required],
      totalAmount : ['', Validators.required]
    })
    this.formChangeListeners()
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
        let sourceTokens = tokens.map((it, i) => {
          return {
            symbol : it.symbol,
            address : it.address,
            name : it.name,
            conversionRate : 1,
            decimals : it.decimals
          }
        });
        let userAddress = this.web3.eth.coinbase
        sourceTokens.unshift({
          symbol : 'ETH',
          address : undefined,
          name : 'Etherium',
          decimals : 6,
          conversionRate : 1
        })
        this.sourceTokens = sourceTokens
      },
      err => {
        // this.notificationService.showNotification(new MessageModel(MessageType.Error, 'Failed to get platform tokens, please refresh the page'), MessageContentType.Text);
      }
    );
  }
  
  fromWeiToDec(value : BigNumber, decimals : number) {
    let ether = this.web3.fromWei(value.toString())
    let etherBn = new BigNumber(ether)
    return etherBn.decimalPlaces(decimals).toString()
  }
  async updateFormTxParams(value) {
    let gasPrice = await this.getGasPrice()
    let gasEstimate = await this.getGasEstimate()

    value = this.web3.toWei(value, 'ether')
    let valueBN = new BigNumber(value)

    // totalgas in wei
    let totalGas = gasPrice.times(gasEstimate)
    // need to convert the values depending on symbol
    if (this.selectedToken.symbol == 'ETH') {
      
      // in wei
      this.totalBN = (new BigNumber(totalGas)).plus(valueBN)

      let gasAmountEther = this.fromWeiToDec(totalGas, 6) 
      let totalAmountEther = this.fromWeiToDec(this.totalBN, 6)
      this.tokenTransferForm.patchValue({
        gasAmount : gasAmountEther,
        totalAmount : totalAmountEther
      })
    } else {
      let totalGasConverted = totalGas.div(this.selectedToken.conversionRate)
      this.totalBN = (new BigNumber(totalGasConverted)).plus(valueBN)

      let gasAmountConverted = this.fromWeiToDec(totalGasConverted, this.selectedToken.decimals) 
      let totalAmountConverted = this.fromWeiToDec(this.totalBN, this.selectedToken.decimals)
      this.tokenTransferForm.patchValue({
        gasAmount : gasAmountConverted,
        totalAmount : totalAmountConverted
      })
    }
    if (!this.totalBN.isLessThan(this.tokenBalanceBN)) {
      this.tokenTransferForm.get('totalAmount').setErrors({
        lessThanBalance : true
      })
      this.tokenTransferForm.get('totalAmount').markAsTouched()
    }

    this.txParams = {
      gas : '0x' + gasEstimate.toString(16),
      gasPrice : '0x' + gasPrice.toString(16),
      value : '0x' + valueBN.toString(16),
      data : '',
      from : '',
      to : ''
    }
    
  }
  formChangeListeners() {
    // get balance and estimate gas
    this.tokenTransferForm.get('selectedToken').valueChanges.subscribe((val) => {
      if (val === undefined || !this.sourceTokens[val])
        return;
      this.selectedToken = this.sourceTokens[val]
      this.platformTokenService.getCurrentTokenPrice(this.selectedToken.symbol)
      .subscribe((price) => {
        this.selectedToken.conversionRate = price['ETH']
        this.tokenTransferForm.patchValue({
          amount : ''
        })
        this.tokenTransferForm.get('amount').enable()
        let userAddress = this.web3.eth.coinbase
        if (this.selectedToken && this.selectedToken.symbol == 'ETH') {
          this.web3.eth.getBalance(userAddress, (err, balance) => {
            this.zone.run(() => {
              this.tokenBalanceBN = balance
              this.tokenBalance = this.fromWeiToDec(balance, this.selectedToken.decimals)
            })
          })
        } else if (this.selectedToken && this.selectedToken.address) {
          this.selectedTokenContract = this.web3.eth.contract(abi).at(this.selectedToken.address)
          this.selectedTokenContract.balanceOf(userAddress, (err, balance) => {
            this.zone.run(() => {
              this.tokenBalanceBN = balance
              this.tokenBalance = this.fromWeiToDec(balance, this.selectedToken.decimals)
            })
          })
        }
      })
      })
      
    this.tokenTransferForm.get('amount').valueChanges.subscribe((val) => {
      if (val) {
        this.updateFormTxParams(val)
      } else {
        this.tokenTransferForm.patchValue({
          gasAmount : '',
          totalAmount : ''
        })
      }
    })
  }
  onSubmit() {
    if (!this.tokenTransferForm.invalid) {
      Object.keys(this.tokenTransferForm.controls).forEach((key, i) => {
        this.tokenTransferForm.get(key).markAsTouched()
      })
    }
    this.txParams['from'] = this.web3.eth.coinbase
    this.txParams['to'] = this.tokenTransferForm.get('toAddress').value

    // update values
    this.transactionService.setTxMeta({
      selectedToken : this.selectedToken,
      value : this.txParams.value
    })
    let publishPromise;
    if (this.selectedToken.symbol == 'ETH') {
      // need to validate data
      publishPromise = promisify(this.transactionService.processTransaction.bind(this.web3))(this.txParams) 
    } else if (this.selectedToken && this.selectedToken.address) {
      let token = this.web3.eth.contract(abi).at(this.selectedToken.address)
      let txData = {
        from : this.txParams.from,
        gas : this.txParams.gas,
        gasPrice : this.txParams.gasPrice,
        value : '0'

      }
      publishPromise = promisify(token.transfer.bind(this.web3))(this.txParams.to, this.txParams.value, txData)
      
    }
    publishPromise
    .then((txMeta) => {
      // this.txComponent.addTx(txParams)
      let hash = txMeta.txHash
      this.notificationService.showNotification(new MessageModel(MessageType.Success, 'Transaction completed. TxHash : ' + hash), MessageContentType.Text);
      console.log(txMeta)
      // clear form
      this.transactionService.setTxMeta(undefined)
      this.tokenTransferForm.reset()
    })
    .catch((err) => {
      this.notificationService.showNotification(new MessageModel(MessageType.Error, 'Transaction Failed.' + err), MessageContentType.Text);
    }) 
  }
  ngOnDestroy(): void {
  }
}
