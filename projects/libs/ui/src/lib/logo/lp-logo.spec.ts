import { TestBed } from '@angular/core/testing';
import { LpLogo } from './lp-logo';

describe('LpLogo', () => {
  it('variant mark : une image accessible nommée Let’s Plé', () => {
    const f = TestBed.createComponent(LpLogo);
    f.componentRef.setInput('variant', 'mark');
    f.detectChanges();
    const svg = f.nativeElement.querySelector('svg.logo-mark');
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('Let’s Plé');
    expect(f.nativeElement.querySelector('.logo-wordmark')).toBeNull();
  });

  it('variant full : pastille décorative + texte lisible', () => {
    const f = TestBed.createComponent(LpLogo);
    f.detectChanges();
    expect(f.nativeElement.querySelector('svg.logo-mark').getAttribute('aria-hidden')).toBe('true');
    expect(f.nativeElement.querySelector('.logo-wordmark').textContent.trim()).toBe('let’s plé.');
  });
});
