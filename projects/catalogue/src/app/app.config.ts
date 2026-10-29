import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { HashLocationStrategy, LocationStrategy } from '@angular/common';

export const appConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners(), { provide: LocationStrategy, useClass: HashLocationStrategy }],
};
