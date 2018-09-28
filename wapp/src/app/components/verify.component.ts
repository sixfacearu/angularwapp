import { Component, OnInit } from '@angular/core';
import { Subscription } from "rxjs/Subscription"
import { Router, ActivatedRoute } from "@angular/router";
import { Http, RequestOptions, Headers } from "@angular/http";
import { Web3Service } from '../services/web3.service';

import { Constants } from "../models/constants";

@Component({
    selector: 'portfolio',
    templateUrl: '../templates/verify.component.html',
    styleUrls: ['../styles/verify.component.css']
})
export class VerifyComponent implements OnInit{

    public userEmail: string;
    public userAccount: string;
    public userHash: string;
    public statusMessage: string = "Please wait, verifying...";

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private http: Http,
        private web3: Web3Service
    ){
        this.route.params.subscribe( params => {
            if(params['useremail']){
                this.userEmail = params['useremail'];
            }
            if(params['userhash']){
                this.userHash = params['userhash'];
            }
        });
    }

    ngOnInit(): void {
        if(!this.checkWeb3()){
            this.statusMessage = "Failed to get Metamask, please check your login and account";
            return;
        }
        this.userAccount = this.web3.getWeb3().eth.coinbase;
        this.statusMessage = "Please wait, verifying account " + this.userAccount + " against " + this.userHash;
        let headers = new Headers({ "content-type": "application/json", "Ocp-Apim-Subscription-Key": Constants.ApiManagementSubscriptionKey });
        let requestOptions = new RequestOptions({headers: headers});
        this.http.get(Constants.ServiceURL + "verify/" + this.userEmail + "/" + this.userAccount + "/" + this.userHash, requestOptions).subscribe(
            data => {
                if(data.json().UserEmailVerified){
                    this.statusMessage = "User account verified successfully";
                    this.router.navigateByUrl('/');
                }
                else{
                    this.statusMessage = "Failed to verify";
                }
            },
            err => {
                console.log(err);
                this.statusMessage = "Failed to verify";
            }
        );        
    }

    checkWeb3(){
        return this.web3.checkWeb3();
    }
}