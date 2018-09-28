import {Routes} from '@angular/router';

import {AuthGuard} from './common/auth-guard';
import {LoginComponent} from './components/login.component';
import {PortfolioComponent} from './components/portfolio.component';
import {OrdersComponent} from './components/orders.component';
import {WalletComponent} from './components/wallet.component';
import {CreatePortfolioComponent} from './components/portfolio-create.component';
import {NewporfolioCreateComponent} from './components/newporfolio-create.component';
import {VerifyComponent} from './components/verify.component';
import {OrderBookComponent} from './components/order-book.component';
import {DashboardComponent} from './components/dashboard.component';
import {CallbackComponent} from './components/callback.component';
import {TokenTransferComponent} from './components/token-transfer.component';
import {OtcComponent} from './components/otc.component';
export const ROUTES: Routes = [
    {
        path: '',
        component: LoginComponent,
        data : {title : 'Exchange : WandX'}
    },
    {
        path: 'basket',
        component: PortfolioComponent,
        data : {title : 'WandX : Token Basket'},
        canActivate: [AuthGuard]
    },
    {
        path: 'tokentransfer',
        component: TokenTransferComponent,
        data : {title : 'WandX : Token Transfer'},
        canActivate: [AuthGuard]
    },
    {
        path: 'basket/:tab',
        component: PortfolioComponent,
        data : {title : 'WandX : Token Basket'},
        canActivate: [AuthGuard]
    },
    {
        path: 'verify/:useremail/:userhash',
        component: VerifyComponent,
    },
    {
        path: 'orders',
        component: OrdersComponent,
        data : {title : 'WandX : Orders'},
        canActivate: [AuthGuard]
    },
    {
        path: 'orders/:tab',
        component: OrdersComponent,
        data : {title : 'WandX : Orders'},
        canActivate: [AuthGuard]
    },
    {
        path: 'basket/wallet',
        component: WalletComponent,
        data : {title : 'WandX : Token Basket Wallet'},
        canActivate: [AuthGuard]
    },
    {
        path: 'create-portfolio',
        component: CreatePortfolioComponent,
        data : {title : 'WandX : Create Token Basket'},
        canActivate: [AuthGuard]
    },{
        path: 'newcreate-portfolio',
        component: NewporfolioCreateComponent ,
        data : {title : 'WandX : Create Token Basket'},
        canActivate: [AuthGuard]
    },
    {
        path: 'order-book',
        component: OrderBookComponent,
        data : {title : 'WandX : Order Book'},
        canActivate: [AuthGuard]
    },
  {
    path: 'OTC',
    component: OtcComponent,
    data : {title : 'WandX : OTC'},
    canActivate: [AuthGuard]
  },
    {
        path: 'order-book/:token',
        component: OrderBookComponent,
        data : {title : 'WandX : Order Book'},
        canActivate: [AuthGuard]
    },
    {
        path: 'dashboard',
        component: DashboardComponent,
        data : {title : 'WandX : Overview'},
        canActivate: [AuthGuard]
    },
    {
        path: 'callback',
        component: CallbackComponent,
        data : {title : 'WandX : callback'}
    },
    {
        path: '**',
        component: LoginComponent,
        data: {title: 'Exchange : WandX'}
    }
];
