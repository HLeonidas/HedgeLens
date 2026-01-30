import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import {
  tablerBell,
  tablerBookmark,
  tablerChartDots,
  tablerLayoutDashboard,
  tablerLifebuoy,
  tablerScale,
  tablerSearch,
  tablerSettings,
  tablerTargetArrow,
  tablerUserCircle,
  tablerWaveSine,
} from '@ng-icons/tabler-icons';
import { provideEcharts } from 'ngx-echarts';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideEcharts(),
    provideIcons({
      tablerBell,
      tablerBookmark,
      tablerChartDots,
      tablerLayoutDashboard,
      tablerLifebuoy,
      tablerScale,
      tablerSearch,
      tablerSettings,
      tablerTargetArrow,
      tablerUserCircle,
      tablerWaveSine,
    }),
  ]
};
