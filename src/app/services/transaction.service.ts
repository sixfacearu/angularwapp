import { Injectable, NgZone } from '@angular/core';
import {promisify} from 'es6-promisify'

import * as EthQuery from 'eth-query'
import * as ethUtil from 'ethereumjs-util'

import {Buffer} from 'buffer'
import {CustomWalletService} from './custom-wallet.service'
import {InfuraNetworkService} from './infura-network.service'
import {GasUtils} from '../common/gasutils'
import {TransactionConfirmDialogComponent} from '../components/transaction-confirm-dialog.component'
import {SignatureConfirmDialogComponent} from '../components/signature-confirm-dialog.component'
import { MatDialog } from '@angular/material';
import { BehaviorSubject } from "rxjs/BehaviorSubject";

@Injectable()
export class TransactionService {

	query : EthQuery;
  gasUtils : GasUtils
  network : InfuraNetworkService
  selectedToken : any;
  currentTxMeta : any;
	constructor(private wallet : CustomWalletService,
              private zone : NgZone,
              private dialog : MatDialog) {
    this.initialize = this.initialize.bind(this)
    this._processTransaction = this._processTransaction.bind(this)
    this.processTransaction = this.processTransaction.bind(this)
    this.processMessage = this.processMessage.bind(this)
    this.getNetworkNounce = this.getNetworkNounce.bind(this)
    this.publishTransaction = this.publishTransaction.bind(this)
    this.approveAndPublish = this.approveAndPublish.bind(this)
    this.showPopupDialog = this.showPopupDialog.bind(this)
    this.setTxMeta = this.setTxMeta.bind(this)
    this._processTransaction$ = this._processTransaction$
  }
  // helper
  normalizeMsgData(data) {
    if (data.slice(0, 2) === '0x') {
      // data is already hex
      return data;
    } else {
      // data is unicode, convert to hex
      return ethUtil.bufferToHex(new Buffer(data, 'utf8'));
    }
  }
	initialize(network) {
		this.query = network.getEthQuery()
    this.network = network
    this.gasUtils = new GasUtils(this.query)

	}
  setTxMeta(txMeta) {
    this.currentTxMeta = txMeta;
  }
  _processTransaction$ (txParams) {
    var txMetaObservable = new BehaviorSubject<any>(undefined);
    setTimeout(async (txParams, txMetaObservable) => {
      var txParamsValidated = await this._processTransaction(txParams)
      this.zone.run(() => {
        let currentTxMeta = this.currentTxMeta
        if (!currentTxMeta) {
          currentTxMeta = {
            selectedToken : {},
            value : 0
          }
        }
        let txMeta = {
          symbol : currentTxMeta.selectedToken.symbol,
          decimals : currentTxMeta.selectedToken.decimals,
          conversionRate : currentTxMeta.selectedToken.conversionRate,
          value : currentTxMeta.value,
          txParams : txParamsValidated.txParams,
          txHash : '',
          gasPriceSpecified : txParamsValidated.gasPriceSpecified,
          nonceSpecified : txParamsValidated.nonceSpecified,
          gasLimitSpecified: txParamsValidated.gasLimitSpecified
        }
        txMetaObservable.next(txMeta)
      })
    }, 0, txParams, txMetaObservable)
    return txMetaObservable.asObservable()
  }
	async _processTransaction (txParams) {
    // validate
    this.gasUtils.validateTxParams(txParams)
    let txMeta = {
      txParams : txParams,
      gasPriceSpecified : false,
      nonceSpecified : false,
      gasLimitSpecified : false
    }
    try {
      await this.gasUtils.addTxDefaults(txMeta)
    } catch (error) {
      console.log(error)
      throw error
    }
    // save txMeta

    return txMeta
  }
  showPopupDialog(txMeta, type) {
    let model;
    if (type == 'transaction') {
      model = this.dialog.open(TransactionConfirmDialogComponent,
                { data:{ id: 'matdialog-transaction', txMeta : txMeta}, width : '600px' });

    } else {
      model = this.dialog.open(SignatureConfirmDialogComponent,
                { data:{ id: 'matdialog-signature',txMeta : txMeta}, width : '600px' });
    }
    return model;
  }
	processTransaction(txParams, cb) {
	  debugger;
    var time = new Date()
    var txMetaObservable = this._processTransaction$(txParams)
    var model = this.showPopupDialog(txMetaObservable, 'transaction')
    txMetaObservable.subscribe((txMeta) => {
      if (!txMeta)
        return
      model.afterClosed().subscribe(async (result) => {
        if (result == 'confirm') {
          let txHash;
          try {
            await this.approveAndPublish(txMeta)
            if (txMeta.txHash)
              cb(null, txMeta)
            else
              cb(new Error("Error submitting Tx. txHash is empty"))
          } catch(err) {
            // there maybe other errors
            console.log('Process Transaction')
            console.log(err)
            cb(err)
          }
        } else {
          cb(new Error('Cancelled by User'))
        }
      })
    })
  }
  processMessage(msgParams, cb) {
	  debugger;
    msgParams.data = this.normalizeMsgData(msgParams.data)
    var time = new Date()
    var msgData = {
      msgParams: msgParams,
      time: time,
      status: 'unapproved',
      type: 'eth_sign',
    }
    var self = this
    setTimeout(async () => {
      var model = this.showPopupDialog(msgData, 'signature')
      model.afterClosed().subscribe(async (result) => {
        if (result == 'confirm') {
          try {
            var rawSig = await self.wallet.signMessage({from : msgParams.from, data : msgParams.data})
          } catch(err) {
            console.log(err)
            return cb(new Error(err.message))
          }
          console.log(rawSig)
          cb(null, rawSig)
        } else {
          cb(new Error('Cancelled by User'))
        }
      })
    })
  }
  async getNetworkNounce(address) {
    return await promisify(this.query.getTransactionCount.bind(this.query))(address, 'latest')
  }

  async publishTransaction (rawTx) {
    return await promisify(this.query.sendRawTransaction.bind(this.query))(rawTx)
  }
  async approveAndPublish(txMeta) {
    var txParams = txMeta.txParams
    txParams.chainId = this.network.getChainId()
    let nonce = await this.getNetworkNounce(txParams.from)
    txParams.nonce = nonce
    let rawTx
    try {
      rawTx = await this.wallet.signTransaction(txParams)
    } catch(err) {
      throw new Error(err.message)
    }
    // return null
    try {
      let txHash = await this.publishTransaction(rawTx)
      txMeta.txHash = txHash
      return txMeta
    } catch(e) {
      throw new Error(e.message)
    }
  }
}
