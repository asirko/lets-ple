import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { I18nService } from '@lets-ple/game-core';
import type {
  DictionaryManifest,
  DictionarySourceManifest,
} from '../../dictionary/serialized-dictionary';

export type DictionaryCreditsManifest = DictionaryManifest;

@Component({
  selector: 'lp-dictionary-credits',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <details class="dernier-mot-credits">
      <summary>{{ text('dernierMot.credits.summary') }}</summary>
      <div class="dernier-mot-credits-content">
        <p>{{ text('dernierMot.credits.introduction') }}</p>
        <ul class="dernier-mot-credit-sources">
          @for (source of manifest().sources; track source.name) {
            <li>
              <p>
                <a [href]="source.url">{{ source.name }}</a>
              </p>
              <p>
                {{ text('dernierMot.credits.creators', { names: source.creators.join(', ') }) }}
              </p>
              <p>
                <a [href]="source.licenseUrl">{{ readableLicense(source.license) }}</a>
                —
                {{
                  text('dernierMot.credits.retrievedAt', { date: formatDate(source.retrievedAt) })
                }}
              </p>
              @if (source.citation; as citation) {
                <p>
                  <a [href]="citation.url">{{ text('dernierMot.credits.citation') }}</a>
                  — {{ citation.text }}
                </p>
              }
              @if (source.attributionUrl; as attributionUrl) {
                <p>
                  <a [href]="attributionUrl">{{ text('dernierMot.credits.contributors') }}</a>
                  — {{ text('dernierMot.credits.historyTemplate') }}
                </p>
              }
              @if (source.name === 'Wiktionnaire') {
                @if (source.extractor; as extractor) {
                  <p>
                    {{ text('dernierMot.credits.wiktextract') }} :
                    <a [href]="extractor.url">{{ extractor.name }}</a>
                    {{ text('dernierMot.credits.by', { name: extractor.creator }) }},
                    <a [href]="extractor.licenseUrl">{{ extractor.license }}</a
                    >.
                  </p>
                }
              }
            </li>
          }
        </ul>
        <p class="dernier-mot-adaptation">
          <strong>{{ text('dernierMot.credits.adaptation') }}</strong>
          {{ manifest().adaptation.notice }}
          <a [href]="manifest().adaptation.licenseUrl">
            {{ readableLicense(manifest().adaptation.license) }}
          </a>
        </p>
      </div>
    </details>
  `,
})
export class LpDictionaryCredits {
  readonly manifest = input.required<DictionaryCreditsManifest>();
  private readonly i18n = inject(I18nService);

  protected text(key: string, params?: Record<string, string | number>): string {
    return this.i18n.t(key, params);
  }

  protected readableLicense(license: DictionarySourceManifest['license']): string {
    return license.replace('CC-BY-SA-', 'CC BY-SA ');
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(value));
  }
}
