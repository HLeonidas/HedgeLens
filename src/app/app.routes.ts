import { Routes } from '@angular/router';

import { ComparisonPageComponent } from './pages/comparison-page/comparison-page.component';
import { CryptoPageComponent } from './pages/crypto-page/crypto-page.component';
import { DashboardPageComponent } from './pages/dashboard-page/dashboard-page.component';
import { InvestmentsPageComponent } from './pages/investments-page/investments-page.component';
import { PutCallPageComponent } from './pages/put-call-page/put-call-page.component';
import { ScenariosPageComponent } from './pages/scenarios-page/scenarios-page.component';
import { VolatilityPageComponent } from './pages/volatility-page/volatility-page.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    component: DashboardPageComponent,
    data: { title: 'Dashboard', subtitle: 'Portfolio overview' }
  },
  {
    path: 'comparison',
    component: ComparisonPageComponent,
    data: { title: 'Theta Decay Comparison', subtitle: 'Side-by-Side Analysis' }
  },
  {
    path: 'put-call',
    component: PutCallPageComponent,
    data: { title: 'Put-Call Ratio', subtitle: 'Market sentiment breakdown' }
  },
  {
    path: 'volatility',
    component: VolatilityPageComponent,
    data: { title: 'Volatility Surface', subtitle: 'Skew and term structure' }
  },
  {
    path: 'scenarios',
    component: ScenariosPageComponent,
    data: { title: 'Scenario Analysis', subtitle: 'Stress test outcomes' }
  },
  {
    path: 'investments',
    component: InvestmentsPageComponent,
    data: { title: 'Investments', subtitle: 'Positions and targets' }
  },
  {
    path: 'crypto',
    component: CryptoPageComponent,
    data: { title: 'Crypto Portfolio', subtitle: 'Digital asset tracking' }
  }
];
