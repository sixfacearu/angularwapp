import { Component, ViewEncapsulation, Inject, NgZone } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef} from '@angular/material';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UploadEvent, UploadFile, FileSystemFileEntry } from 'ngx-file-drop';
import {CustomWalletService} from '../services/custom-wallet.service'
import {JSONWallet} from '../helpers/jsonwallet'


@Component({
    selector: 'app-jsonwallet',
    styleUrls: ["../styles/jsonwallet.component.css"],
    templateUrl: "../templates/jsonwallet.component.html",
    encapsulation: ViewEncapsulation.None

})

export class JsonWalletComponent{
  form : FormGroup;
  filename : string = '';
  files : UploadFile[] = [];
  constructor(private wallet : CustomWalletService, private zone : NgZone, private fb : FormBuilder, private matdialogRef: MatDialogRef<JsonWalletComponent>,
              @Inject(MAT_DIALOG_DATA)
              public data:any) {
    this.createForm = this.createForm.bind(this)
    this.onSubmit = this.onSubmit.bind(this)
    this.onJSONFileChanged = this.onJSONFileChanged.bind(this)
    this.dropped = this.dropped.bind(this)
  }
  ngOnInit() {
    this.createForm()
  }
  dropped(event : UploadEvent) {
    this.files = event.files
    if (event.files && event.files.length > 1) {
      this.zone.run(() => {
        this.form.get('jsonfile').markAsDirty()
        this.form.get('jsonfile').setErrors({
          'directory' : true
        })
      })
      return;
    }
    let droppedFile = event.files[0]
    if (droppedFile.fileEntry.isFile) {
      const fileEntry = droppedFile.fileEntry as FileSystemFileEntry;
      fileEntry.file((file : File) => {
        let reader = new FileReader();
        reader.readAsText(file);
        reader.onload = () => {
          this.filename = file.name
          this.zone.run(() => {
            this.form.patchValue({
              jsonfile: reader.result
            })  
          })
          try {
            JSON.parse(reader.result)
          } catch(e) {
            this.zone.run(() => {
              this.form.get('jsonfile').markAsDirty()
              this.form.get('jsonfile').setErrors({
                'invalidJson' : true
              })
            })
            
          }
        };
      })
    } else {
      this.zone.run(() => {
        this.form.get('jsonfile').markAsDirty()
        this.form.get('jsonfile').setErrors({
          'directory' : true
        })
      })
    }
  }
  onSubmit() {
    const formStatus = this.form.status
    if (formStatus == 'INVALID') {
      this.form.get('jsonfile').markAsDirty()
      this.form.get('password').markAsDirty()
      return
    }
    // this.form.setErrors({
    //   passwordInvalid : true
    // })
    const formModel = this.form.value;
    let wallet = new JSONWallet()
    let ret = wallet.authAccountFromJSON(formModel.jsonfile, formModel.password)
    if (ret.status == -1) {
      this.form.setErrors({
        passwordInvalid : true
      })
      return;
    }
    this.wallet.setWallet(wallet)
    this.data.successCallback()
    this.matdialogRef.close();
  }
  onJSONFileChanged(event) {
    let reader = new FileReader();
    if(event.target.files && event.target.files.length > 0) {
      let file = event.target.files[0];
      reader.readAsText(file);
      reader.onload = () => {
        this.filename = file.name
        this.form.patchValue({
          jsonfile: reader.result
        })
        try {
          JSON.parse(reader.result)
        } catch(e) {
          this.form.get('jsonfile').markAsDirty()
          this.form.get('jsonfile').setErrors({
            'invalidJson' : true
          })
        }
      };
    }
  }
  createForm() {
    this.form = this.fb.group({
      password: ['', Validators.required],
      jsonfile: ['', Validators.required]
    });
  }
}