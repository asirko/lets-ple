import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GameCore } from './game-core';

describe('GameCore', () => {
  let component: GameCore;
  let fixture: ComponentFixture<GameCore>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GameCore],
    }).compileComponents();

    fixture = TestBed.createComponent(GameCore);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
