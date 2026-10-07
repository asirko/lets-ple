import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { score, rate, type StatsLabels, type WeekRow } from '../statistics-models';
@Component({
  selector: 'lp-weekly-trend',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <section class="quiz-stats-trend">
    <h2>{{ labels()['weeks'] }}</h2>
    <p>{{ labels()['zone'] }} : {{ timeZone() }}</p>
    <div class="quiz-stats-charts">
      @for (key of ['averageScore', 'successRate']; track key) {
        <figure>
          <figcaption>
            {{ key === 'averageScore' ? labels()['score'] : labels()['success'] }}
          </figcaption>
          <svg
            viewBox="0 0 320 120"
            role="img"
            [attr.aria-label]="key === 'averageScore' ? labels()['score'] : labels()['success']"
          >
            <line x1="20" y1="100" x2="300" y2="100" class="quiz-stats-axis" />
            <line x1="20" y1="10" x2="20" y2="100" class="quiz-stats-axis" />
            @for (points of segments(key); track $index) {
              <polyline [attr.points]="points" class="quiz-stats-line" />
            }
            @for (p of dots(key); track p.x) {
              <circle [attr.cx]="p.x" [attr.cy]="p.y" r="4" class="quiz-stats-dot" />
            }
            <text x="0" y="110">0</text>
            <text x="0" y="15">{{ key === 'averageScore' ? '5' : '100 %' }}</text>
          </svg>
        </figure>
      }
    </div>
    <div class="quiz-stats-table-wrap">
      <table>
        <caption>
          {{
            labels()['weeks']
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col">{{ labels()['week'] }}</th>
            <th scope="col">{{ labels()['answers'] }}</th>
            <th scope="col">{{ labels()['success'] }}</th>
            <th scope="col">{{ labels()['score'] }}</th>
          </tr>
        </thead>
        <tbody>
          @for (w of weeks(); track w.label) {
            <tr>
              <th scope="row">
                {{ w.label }}
                @if (w.current) {
                  <small>{{ labels()['current'] }}</small>
                }
              </th>
              <td>{{ w.metrics.count }}</td>
              <td>{{ rate(w.metrics.successRate, labels()['na']) }}</td>
              <td>{{ score(w.metrics.averageScore, labels()['na']) }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  </section>`,
})
export class LpWeeklyTrend {
  readonly labels = input.required<StatsLabels>();
  readonly weeks = input.required<readonly WeekRow[]>();
  readonly timeZone = input.required<string>();
  readonly score = score;
  readonly rate = rate;
  dots(key: string): { x: number; y: number }[] {
    return this.weeks().flatMap((w, i) => {
      const v = key === 'averageScore' ? w.metrics.averageScore : w.metrics.successRate;
      return v === null
        ? []
        : [{ x: 20 + i * 90, y: 100 - (v / (key === 'averageScore' ? 5 : 1)) * 85 }];
    });
  }
  segments(key: string): string[] {
    const lines: string[] = [];
    let current: string[] = [];
    for (const [i, w] of this.weeks().entries()) {
      const v = key === 'averageScore' ? w.metrics.averageScore : w.metrics.successRate;
      if (v === null) {
        if (current.length > 1) lines.push(current.join(' '));
        current = [];
      } else current.push(20 + i * 90 + ',' + (100 - (v / (key === 'averageScore' ? 5 : 1)) * 85));
    }
    if (current.length > 1) lines.push(current.join(' '));
    return lines;
  }
}
