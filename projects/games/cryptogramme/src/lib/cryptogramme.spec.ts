import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Cryptogramme } from './cryptogramme';

describe('Cryptogramme', () => {
  let component: Cryptogramme;
  let fixture: ComponentFixture<Cryptogramme>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Cryptogramme],
    }).compileComponents();

    fixture = TestBed.createComponent(Cryptogramme);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
