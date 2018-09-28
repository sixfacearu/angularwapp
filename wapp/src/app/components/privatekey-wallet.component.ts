import { Component, ViewEncapsulation, Inject, NgZone } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef} from '@angular/material';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {CustomWalletService} from '../services/custom-wallet.service'
import {PrivateKeyWallet} from '../helpers/privatewallet'

@Component({
    selector: 'app-privatekey-wallet',
    styleUrls: ["../styles/privatekey-wallet.component.css"],
    templateUrl: "../templates/privatekey-wallet.component.html",
    encapsulation: ViewEncapsulation.None

})

export class PrivateKeyWalletComponent{
  form : FormGroup;
  constructor(private wallet : CustomWalletService, private zone : NgZone, private fb : FormBuilder, private matdialogRef: MatDialogRef<PrivateKeyWalletComponent>,
              @Inject(MAT_DIALOG_DATA)
              public data:any) {
    this.createForm = this.createForm.bind(this)
    this.onSubmit = this.onSubmit.bind(this)
  }
  ngOnInit() {
    this.createForm()
  }
  onSubmit() {
    const formStatus = this.form.status
    if (formStatus == 'INVALID') {
      return
    }
    // this.form.setErrors({
    //   passwordInvalid : true
    // })
    const formModel = this.form.value;
    let wallet = new PrivateKeyWallet()
    let ret = wallet.authAccountFromPrivateKey(formModel.privateKey)
    if (ret.status == -1) {
      this.form.setErrors({
        privateKeyInvalid : true
      })
      return;
    }
    this.wallet.setWallet(wallet)
    this.data.successCallback()
    this.matdialogRef.close();
  }
  createForm() {
    this.form = this.fb.group({
      privateKey: ['', Validators.required],
    });
  }
}