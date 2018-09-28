import { BrowserModule, Title }  from '@angular/platform-browser';
import { HttpModule } from '@angular/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule, MatIconModule, MatToolbarModule, MatInputModule, MatDialogModule } from '@angular/material';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { SimpleNotificationsModule } from "angular2-notifications";
import { CommonModule } from '@angular/common';
import { SocialLoginModule, AuthServiceConfig } from "angular4-social-login";
import { GoogleLoginProvider, FacebookLoginProvider } from "angular4-social-login";
import { ParticlesModule } from 'angular-particle';
import { UiSwitchModule } from 'ngx-toggle-switch/src';
import { AngularMultiSelectModule } from "angular2-multiselect-dropdown/angular2-multiselect-dropdown";
import { ChartModule } from 'angular2-chartjs';
import { NguiAutoCompleteModule } from '@ngui/auto-complete';
import { NgxChartsModule, AreaChartModule } from '@swimlane/ngx-charts';
import { ROUTES } from './app.routes';
import { AuthGuard } from "./common/auth-guard";
import { ScrollToModule } from 'ng2-scroll-to-el';
import { ClipboardModule } from 'ngx-clipboard';


import { AuthService } from "./services/auth.service";
import { Web3Service } from "./services/web3.service";
import { NavigationService } from "./services/nav.service";
import { PortfolioService } from "./services/portfolio.service";
import { UserService } from "./services/user.service";
import { WalletService } from "./services/wallet.service";
import { NotificationManagerService } from "./services/notification-manager.service";
import { OrdersService } from "./services/orders.service";
import { PlatformTokenService } from "./services/platform-token.service";
import { ChartService } from "./services/chart.service";
import { TokenHistoryService } from './services/token-history.service';
import { PortfolioAssetsService } from './services/portfolio-assets.service';
import { SwitchThemeService } from './services/switch-theme.service';
import { SwitchGraphService } from './services/switch-graph.service';

import { AppComponent } from './app.component';
import { CallbackComponent } from './components/callback.component';
import { LoginComponent } from './components/login.component';
import { PortfolioComponent } from './components/portfolio.component';
import { OrdersComponent } from './components/orders.component';
import { WalletComponent } from './components/wallet.component';
import { NavComponent } from "./components/nav.component";
import { CreatePortfolioComponent } from "./components/portfolio-create.component";
import { VerifyComponent } from "./components/verify.component";
import { OrderBookComponent } from "./components/order-book.component";
import { DashboardComponent } from "./components/dashboard.component";
import { FooterComponent } from "./components/footer.component";
import { QuickBuyComponent } from './components/quick-buy.component';
import { TokenService } from './services/token.service';
import { AmChartsModule } from "@amcharts/amcharts3-angular";
import { ChartComponent } from './components/chart.component';
import { AdvanceChartComponent } from './components/advancechart.component';
import {DetailComponent} from './components/detail.component';
import {NewporfolioCreateComponent} from './components/newporfolio-create.component';
import {AuthtokenComponent} from './components/authtoken.component';
import {OtcComponent} from './components/otc.component';
import { AuthConfig } from 'angular2-jwt';

import { ReactiveFormsModule } from '@angular/forms';
import { JsonWalletComponent } from './components/jsonwallet.component';
import { PrivateKeyWalletComponent } from './components/privatekey-wallet.component';
import { LedgerWalletComponent } from './components/ledger-wallet.component';
import {CustomWalletService} from './services/custom-wallet.service'
import {TransactionService} from './services/transaction.service'
import {InfuraNetworkService} from './services/infura-network.service'
import {TokenTransferComponent} from './components/token-transfer.component'
import {TransactionConfirmDialogComponent} from './components/transaction-confirm-dialog.component'
import {SignatureConfirmDialogComponent} from './components/signature-confirm-dialog.component'
import { FileDropModule } from 'ngx-file-drop';


@NgModule({
  declarations: [
    CallbackComponent,
    FooterComponent,
    AppComponent,
    NavComponent,
    PortfolioComponent,
    WalletComponent,
    OrdersComponent,
    LoginComponent,
    CreatePortfolioComponent,
    VerifyComponent,
    OrderBookComponent,
    QuickBuyComponent,
    DashboardComponent,
    ChartComponent,
    AdvanceChartComponent,
    JsonWalletComponent,
    PrivateKeyWalletComponent,
    LedgerWalletComponent,
    TransactionConfirmDialogComponent,
    SignatureConfirmDialogComponent,
    TokenTransferComponent,
    DetailComponent,
    NewporfolioCreateComponent,
    AuthtokenComponent,
    OtcComponent
  ],
  imports: [
    BrowserModule,
    HttpModule,
    FormsModule,
    CommonModule,
    BrowserAnimationsModule,
    RouterModule.forRoot(ROUTES),
    SimpleNotificationsModule.forRoot(),
    SocialLoginModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatInputModule,
    MatTooltipModule,
    ParticlesModule,
    UiSwitchModule,
    AngularMultiSelectModule,
    ChartModule,
    MatExpansionModule,
    AmChartsModule,
    NguiAutoCompleteModule,
    NgxChartsModule,
    AreaChartModule,
    MatDialogModule,
    ReactiveFormsModule,
    FileDropModule,
    ScrollToModule.forRoot(),
    ClipboardModule
  ],
  providers: [
    Web3Service,
    NotificationManagerService,
    NavigationService,
    PortfolioService,
    UserService,
    WalletService,
    OrdersService,
    TokenService,
    PlatformTokenService,
    Title,
    ChartService,
    TokenHistoryService,
    PortfolioAssetsService,
    AuthService,
    AuthGuard,
    SwitchThemeService,
    SwitchGraphService,
    CustomWalletService,
    TransactionService,
    InfuraNetworkService,
  ],
  entryComponents :[
    JsonWalletComponent,
    PrivateKeyWalletComponent,
    LedgerWalletComponent,
    TransactionConfirmDialogComponent,
    SignatureConfirmDialogComponent
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
