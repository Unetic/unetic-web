import { TestBed } from '@angular/core/testing';

import { App } from './app';
import { UneticStore } from './core/unetic-store.service';

describe('App', () => {
  it('creates the shell', async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        {
          provide: UneticStore,
          useValue: {
            start: () => Promise.resolve(),
            connected: () => false,
            loginRequired: () => false,
            state: () => null,
            error: () => null,
            saving: () => false,
            canSave: () => false,
            draftSsid: { set: () => undefined },
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
