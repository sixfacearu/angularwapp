import { Component, ViewEncapsulation, Inject, NgZone } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef} from '@angular/material';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidatorFn } from '@angular/forms';
import { UploadEvent, UploadFile, FileSystemFileEntry } from 'ngx-file-drop';
import {CustomWalletService} from '../services/custom-wallet.service'
import {LedgerWallet} from '../helpers/ledgerwallet'
import {Buffer} from 'buffer'
import * as ethUtil from 'ethereumjs-util'
import * as HDKey from 'hdkey'
import * as ehdkey from 'ethereumjs-wallet-browser/hdkey'
import AppEth from '@ledgerhq/hw-app-eth/lib/Eth'
import TransportU2F from '@ledgerhq/hw-transport-u2f'
import { of as observableOf } from 'rxjs/observable/of'
import { map } from 'rxjs/operators'

const allowedHdPaths = ["m/44'/60'", "m/44'/61'"]
@Component({
    selector: 'app-ledger-wallet',
    styleUrls: ["../styles/ledger-wallet.component.css"],
    templateUrl: "../templates/ledger-wallet.component.html",
    encapsulation: ViewEncapsulation.None

})

export class LedgerWalletComponent {
  pathForm : FormGroup;
  addressesForm : FormGroup;
  showAddressForm : Boolean = false;
  increment : number = 5;
  defaultPath : string = "m/44'/60'/0'";
  addressMapping : Array<any> = [];
  accounts : any;
  constructor(private wallet : CustomWalletService, private zone : NgZone, private fb : FormBuilder, private matdialogRef: MatDialogRef<LedgerWalletComponent>,
              @Inject(MAT_DIALOG_DATA)
              public data:any) {
    this.createForm = this.createForm.bind(this)
    this.onSubmit = this.onSubmit.bind(this)
    this.onConnect = this.onConnect.bind(this)
    this.getLedgerAccount = this.getLedgerAccount.bind(this)
    this.getHWDAddresses = this.getHWDAddresses.bind(this)
  }
  ngOnInit() {
    this.createForm()
  }
  pathValidator(pathRe: RegExp): ValidatorFn {
    return (control: AbstractControl): {[key: string]: any} | null => {
      const validPath = allowedHdPaths.some(hdPref => control.value ? control.value.startsWith(hdPref) : false);
      return observableOf(validPath).pipe(map(validPath => !validPath ? {invalid : true} : null))
    };
  }
  async getLedgerAccount(subPath) {
    const transport = await TransportU2F.create()
    const eth = new AppEth(transport)
    const path = `${subPath}`
    // const addressPromise = Promise.resolve({
    //   publicKey : '03d8e37092235f1b64f302005d14253f44921115d5a972d304b42dbad5b056dc36',
    //   chainCode : '0x81b7E08F65Bdf5648606c89998A9CC8164397647'
    // })
    const addressPromise = eth.getAddress(path, false, true)

    addressPromise.then(() => transport.close())

    return addressPromise
  }
  getHWDAddresses(publicKey, chainCode, path, start) {
    if (!path)
      path = this.defaultPath
    const hdk = new HDKey()
    hdk.publicKey = new Buffer(publicKey, 'hex')
    hdk.chainCode = new Buffer(chainCode, 'hex')
    const accounts = []
    for (let i = start; i < start + this.increment; i++) {
      const derivedKey = hdk.derive(`m/${i}`)
      const address = ehdkey.fromExtendedKey(derivedKey.publicExtendedKey).getWallet().getAddress().toString('hex')
      const aPath = `${path}/${i}`
      const aAddress = `0x${address}`
      accounts.push({
        path : aPath,
        address : aAddress
      })
      this.addressMapping[aPath] = aAddress
    }
    return accounts
  }
  onConnect() {
    const formStatus = this.pathForm.status
    if (formStatus == 'INVALID') {
      this.pathForm.get('path').markAsDirty() 
      return
    }
    // this.form.setErrors({
    //   passwordInvalid : true
    // })
    const formModel = this.pathForm.value;

    // let ret = this.wallet.authAccountFromPrivateKey(formModel.privateKey)
    // do connect to ledger wallet and see if connection goes through or not
    // if success create a ledger wallet and send it across
    this.getLedgerAccount(formModel.path)
    .then((response) => {
      // show addresses
      let publicKey = response.publicKey
      let chainCode = response.chainCode
      this.accounts = this.getHWDAddresses(publicKey, chainCode, formModel.path, 0)
      this.showAddressForm = true
    })
    .catch((err) => {
      this.pathForm.markAsDirty()
      this.pathForm.setErrors({
        walletConnection : err
      })
    })
  }
  onSubmit() {
    const formStatus = this.addressesForm.status
    if (formStatus == 'INVALID') {
      // set the error
      return
    }
    const formModel = this.addressesForm.value;
    
    // get the selected account
    let ledgerWallet = new LedgerWallet({addressInfo : formModel.selectedAddress })
    this.wallet.setWallet(ledgerWallet)
    this.data.successCallback()
    this.matdialogRef.close();
  }

  // need to add custom validator
  createForm() {
    this.pathForm = this.fb.group({
      path: [this.defaultPath, Validators.required, this.pathValidator(/^m\/(44'\/6[0|1]'\/\d+'?\/\d+'?)(\/\d+)?$/)],
    });
    this.addressesForm = this.fb.group({
      selectedAddress: ['', Validators.required],
    });
  }
}