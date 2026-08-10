import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import type { Quote, Theme } from './quote';

@Injectable({ providedIn: 'root' })
export class QuoteService {
  private readonly http = inject(HttpClient);

  loadTheme(theme: Theme): Observable<Quote[]> {
    return this.http.get<Quote[]>(`content/quotes/${theme}.json`);
  }
}
