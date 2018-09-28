
import * as Wallet from 'ethereumjs-wallet-browser'
import * as importers from 'ethereumjs-wallet-browser/thirdparty'
import * as Transaction from 'ethereumjs-tx'
import * as ethSigUtil from 'eth-sig-util'
import * as ethUtil from 'ethereumjs-util'
import {Buffer} from 'buffer'

export class JSONWallet {
	wallet : any
	constructor() {

	}
	getAccounts() {
    return new Promise((resolve, reject) => {
    	var address = this.getAddress()
    	return resolve([address])
    })
  }
	_formatAddress() {
    if (!this.wallet || !this.wallet.getAddress())
      return ''
 		const addressKeyBuffer = this.wallet.getAddress()
		return ethUtil.bufferToHex(addressKeyBuffer)
 	}
  getPrivateKeyHex() {
    let pk = this.wallet.getPrivateKey()
    return ethUtil.bufferToHex(pk)
  }
 	getPrivateKey() {
 		return this.wallet.getPrivateKey()
 	}
  authAccountFromJSON(input, password) {
  	let w
    try {
      w = importers.fromEtherWallet(input, password)
    } catch (e) {
      console.log('Attempt to import as EtherWallet format failed, trying V3...')
    }

    if (!w) {
      try {
        w = Wallet.fromV3(input, password, true)  
      } catch(e) {
        return {status : -1, error : e}
      }
      
    }
    this.wallet = w;

    return {status : 1}
    // this.nt.setWallet(wallet)
  }
  userAddress() {
    return this._formatAddress()
  }
  getAddress() {
    return this._formatAddress()
  }
  signEthTx(ethTx, fromAddress) {
    var _fromAddress = ethSigUtil.normalize(fromAddress)
    var privKey = this.wallet.getPrivateKey()
    ethTx.sign(privKey)
  }

  async signTransaction (txParams) {
    const fromAddress = txParams.from
    // add network/chain id
    const ethTx = new Transaction(txParams)
    this.signEthTx(ethTx, fromAddress)
    const rawTx = ethUtil.bufferToHex(ethTx.serialize())
    let t = ''
    return rawTx
  }
  async signMessage (msgData) {
    const message = ethUtil.stripHexPrefix(msgData.data)
    var privKey = this.wallet.getPrivateKey()
    var msgSig = ethUtil.ecsign(new Buffer(message, 'hex'), privKey)
    var rawMsgSig = ethUtil.bufferToHex(ethSigUtil.concatSig(msgSig.v, msgSig.r, msgSig.s))
    return rawMsgSig
  }
  getHashForMessage(hash) {
    return hash;
  }
}