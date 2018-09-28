import { Component } from '@angular/core';

import { UserService } from './services/user.service';
import { UserRegistrationResponse } from './models/user-registration.model';
import { OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { AuthService } from './services/auth.service';
import {SwitchThemeService} from './services/switch-theme.service';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit{
  title = 'app';
  static activeTab = "portfolio";
  options = {
    "timeOut":0,
    "pauseOnHover": false,
    "showProgressBar": false,
    "clickToClose": true,
    "maxStack": 4,
    "icons" : {
      alert : "<i class='fa fa-times'></i>",
      error : "<i class='fa fa-times'></i>",
      info : "<i class='fa fa-times'></i>",
      warn : "<i class='fa fa-times'></i>",
      success : "<i class='fa fa-times'></i>"
    }
  };

  public showModal: boolean = false;

  private userVerified: boolean = false;

  constructor(
    private userService: UserService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private titleService: Title,
    private auth: AuthService,
    readonly switchThemeService:SwitchThemeService
  ) 
  {
    auth.handleAuthentication();
    this.userService.userRegistrationStatus$.subscribe(data => this.userRegistrationStatusChange(data));
  }

  ngOnInit(): void {
    this.userService.registerUserUsingSession();
    this.titleService.setTitle('Wandx | Portfolio')
    this.router.events
      .filter((event) => event instanceof NavigationEnd)
      .map(() => this.activatedRoute)
      .map((route) => {
        while (route.firstChild) route = route.firstChild;
        return route;
      })
      .filter((route) => route.outlet === 'primary')
      // .mergeMap((route) => ({data : route.data, params : route.params.value}))
      .subscribe((event) => {
        let title = event.data['value'] ? event.data['value']['title'] : '';
        let params = event.params ? event.params['value'].tab : '';
        let finalTitle = title + (params ? ' | ' + params[0].toUpperCase() + params.substr(1) : '')
        this.titleService.setTitle(finalTitle)
      });
  }
  isUserAuthenticated(){
    return this.auth.isAuthenticated();
  }
  isUserVerified(){
    return this.userVerified;
  }
  userRegistrationStatusChange(data: UserRegistrationResponse){
    if(data !== undefined && data !== null){
      if(data.UserEmailVerified)
        this.userVerified = true;
    }
  }
  static setActiveTab(tabName: string){
    this.activeTab = tabName;
  }

  isTabActive(tabName: string){
    return AppComponent.activeTab === tabName;
  }
}
