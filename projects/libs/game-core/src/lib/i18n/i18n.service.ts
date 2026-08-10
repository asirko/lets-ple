import { inject, Injectable, InjectionToken } from '@angular/core';
import fr from './fr.json';

export const I18N_DICTIONARY = new InjectionToken<Record<string, string>>('I18N_DICTIONARY', {
  providedIn: 'root',
  factory: () => fr,
});

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly dictionary = inject(I18N_DICTIONARY);

  t(key: string, params?: Record<string, string | number>): string {
    const template = this.dictionary[key] ?? key;
    return template.replace(/\{(\w+)\}/g, (match, paramKey) =>
      params && paramKey in params ? String(params[paramKey]) : match,
    );
  }
}
