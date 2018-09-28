
import * as Transaction from 'ethereumjs-tx'
import * as ethSigUtil from 'eth-sig-util'
import TransportU2F from '@ledgerhq/hw-transport-u2f'
import AppEth from '@ledgerhq/hw-app-eth/lib/Eth'
import * as ethUtil from 'ethereumjs-util'
import {Buffer} from 'buffer'
import { Constants } from '../models/constants';


// TODO : Put the below data to common file
const MAINET_RPC_URL = 'https://mainnet.infura.io/metamask'
const ROPSTEN_RPC_URL = 'https://ropsten.infura.io/metamask'
const KOVAN_RPC_URL = 'https://kovan.infura.io/metamask'
const RINKEBY_RPC_URL = 'https://rinkeby.infura.io/metamask'
const LOCALHOST_RPC_URL = 'http://localhost:8545'

const MAINET_RPC_URL_BETA = 'https://mainnet.infura.io/metamask2'
const ROPSTEN_RPC_URL_BETA = 'https://ropsten.infura.io/metamask2'
const KOVAN_RPC_URL_BETA = 'https://kovan.infura.io/metamask2'
const RINKEBY_RPC_URL_BETA = 'https://rinkeby.infura.io/metamask2'

const DEFAULT_RPC = 'ropsten'
const OLD_UI_NETWORK_TYPE = 'network'
const BETA_UI_NETWORK_TYPE = 'networkBeta'
const INFURA_PROVIDER_TYPES = ['ropsten', 'rinkeby', 'kovan', 'mainnet']
var networkConfig = {
  network: {
    42: KOVAN_RPC_URL_BETA,
    1: MAINET_RPC_URL,
    3: ROPSTEN_RPC_URL,
  },
  // Used for beta UI
  networkBeta: {
    localhost: LOCALHOST_RPC_URL,
    mainnet: MAINET_RPC_URL_BETA,
    ropsten: ROPSTEN_RPC_URL_BETA,
    kovan: KOVAN_RPC_URL_BETA,
    rinkeby: RINKEBY_RPC_URL_BETA,
  },
  networkNames: {
    1 : 'mainnet',
    3: 'ropsten',
    4: 'rinkeby',
    42: 'kovan',
  },
  enums: {
    DEFAULT_RPC,
    OLD_UI_NETWORK_TYPE,
    BETA_UI_NETWORK_TYPE,
  },
}
function makeError(msg, id) {
  const err = new Error(msg)
  return err
}
export class LedgerWallet {
  wallet : any;
  addressToPathMap : any;
  defaultOptions : any;
  addressInfo : any;
  networkId : number;
  constructor(options) {
    this.setAddress = this.setAddress.bind(this)
    this._formatAddress = this._formatAddress.bind(this)
    this.userAddress = this.userAddress.bind(this)
    this.signTransaction = this.signTransaction.bind(this)
    this.signMessage = this.signMessage.bind(this)

    this.defaultOptions = {
      path: "44'/60'/0'/0", // ledger default derivation path
      askConfirm: false,
      accountsLength: 1,
      accountsOffset: 0
    }
    this.addressInfo = options.addressInfo || ''
    this.networkId = parseInt(Constants.AllowedNetwork)
  }
  getTransport = () => TransportU2F.create();
  getLedgerAccount = async (subPath) => {
    const transport = await TransportU2F.create()
    const eth = new AppEth(transport)
    const path = `${subPath}`
    // const addressPromise = Promise.resolve()
    const addressPromise = eth.getAddress(path, false, true)

    addressPromise.then(() => transport.close())

    return addressPromise
  }
  setAddress(addressInfo) {
    this.addressInfo = addressInfo
  }
  _formatAddress() {
    if (!this.addressInfo)
      return ''
    return ethUtil.addHexPrefix(this.addressInfo.address)
  }
  userAddress() {
    return this._formatAddress()
  }
  getAccounts() {
    return Promise.resolve([this.userAddress()])
  }
  async signTransaction (txParams) {
    let addressInfo = this.addressInfo;
    const path = addressInfo.path;
    const transport = await this.getTransport()
    if (addressInfo.address !== txParams.from || !path) {
      throw new Error(`address unknown '${txParams.from}'`);
    }
    try {
      const eth = new AppEth(transport)
      const tx = new Transaction(txParams)

      // Set the EIP155 bits
      tx.raw[6] = Buffer.from([this.networkId]) // v
      tx.raw[7] = Buffer.from([]) // r
      tx.raw[8] = Buffer.from([]) // s

      const result = await eth.signTransaction(
        path.substring(2),
        tx.serialize().toString('hex')
      )
      // Store signature in transaction
      tx.v = Buffer.from(result.v, 'hex')
      tx.r = Buffer.from(result.r, 'hex')
      tx.s = Buffer.from(result.s, 'hex')

      // EIP155: v should be chain_id * 2 + {35, 36}
      const signedChainId = Math.floor((tx.v[0] - 35) / 2)
      let validChainId = this.networkId & 0xff // FIXME this is to fixed a current workaround that app don't support > 0xff
      if (signedChainId !== validChainId) {
        throw makeError(
          `Invalid networkId signature returned. Expected: ${
            this.networkId
          }, Got: ${
            signedChainId}`,
          'InvalidNetworkId'
        )
      }

      return `0x${tx.serialize().toString('hex')}`
    } catch(err) {
      throw new Error(err.message)
    }
    finally {
      transport.close()
    }
  }
  async signMessage (msgData) {
    let addressInfo = this.addressInfo
    const path = addressInfo.path
    if (addressInfo.address !== msgData.from || !path)
      throw new Error(`address unknown '${msgData.from}'`)
    let data = ethUtil.stripHexPrefix(msgData.data)
    const transport = await this.getTransport()
    try {
      const eth = new AppEth(transport)
      const result = await eth.signPersonalMessage(
        path,
        data
      )
      const v = result.v.toString(16)
      return `0x${result.r}${result.s}${v}`
    } catch(err) {
      throw new Error(err)
    } finally {
      transport.close()
    }
  }
  getHashForMessage(hash) {
    let h = ethUtil.addHexPrefix(hash)
    let hashBuff = ethUtil.toBuffer(h)
    let personalMsgBuff =  ethUtil.hashPersonalMessage(hashBuff);
    return ethUtil.addHexPrefix(personalMsgBuff.toString('hex'))
  }
}