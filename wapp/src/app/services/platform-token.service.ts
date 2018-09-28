import { Injectable, Inject, OnInit } from "@angular/core";
import { BehaviorSubject } from "rxjs/BehaviorSubject";
import { Observable } from "rxjs/Observable";
import { Http, RequestOptions, Headers } from "@angular/http";
import { Subscription } from "rxjs";

import { Constants } from "../models/constants";
import { MessageModel, MessageType, MessageContentType } from "../models/message.model";
import { PlatformToken } from "../models/platform-tokens";

import { NotificationManagerService } from "../services/notification-manager.service";
import { TokenService } from "./token.service";
import { AuthService } from "./auth.service";

@Injectable()
export class PlatformTokenService{

    private platformTokens: Array<PlatformToken> = new Array<PlatformToken>();

    constructor(
        private notificationManagerService: NotificationManagerService,
        private http: Http,
        private tokenService: TokenService, private auth: AuthService
    ){
    }

    public GetAllPlatformTokens() : Array<PlatformToken>{
        return this.platformTokens;
    }

    public FindPlatformToken(id: number): PlatformToken{
        for(var i = 0; i < this.platformTokens.length; i++){
            if(this.platformTokens[i].id == id)
                return this.platformTokens[i];
        }
        return undefined;
    }

    public getCurrentTokenPrice(token: any) {
        let reqURL = `https://min-api.cryptocompare.com/data/price?fsym=${token}&tsyms=ETH`
        return this.http.get(reqURL)
            .map(res => res.json())
    }
}