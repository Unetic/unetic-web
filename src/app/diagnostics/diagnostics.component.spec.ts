import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DiagnosticsComponent } from './diagnostics.component';
import { ToolsStore } from '../diagnostics/tools.store';

describe('DiagnosticsComponent', () => {
  let component: DiagnosticsComponent;
  let fixture: ComponentFixture<DiagnosticsComponent>;
  let mockToolsStore: {
    targetHost: ReturnType<typeof signal<string>>;
    pingOutput: ReturnType<typeof signal<string>>;
    pinging: ReturnType<typeof signal<boolean>>;
    error: ReturnType<typeof signal<string | null>>;
    canPing: () => boolean;
    ping: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockToolsStore = {
      targetHost: signal(''),
      pingOutput: signal(''),
      pinging: signal(false),
      error: signal<string | null>(null),
      canPing: () =>
        mockToolsStore.targetHost().trim().length > 0 &&
        !mockToolsStore.pinging(),
      ping: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [DiagnosticsComponent],
      providers: [{ provide: ToolsStore, useValue: mockToolsStore }],
    }).compileComponents();

    fixture = TestBed.createComponent(DiagnosticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('renders input for host and ping button', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector(
      'input[name="targetHost"]',
    );
    const button: HTMLButtonElement = fixture.nativeElement.querySelector(
      'button[type="submit"]',
    );

    expect(input).toBeTruthy();
    expect(button).toBeTruthy();
    expect(button.disabled).toBe(true);
  });

  it('enables ping button when targetHost is provided and triggers ping on submit', () => {
    mockToolsStore.targetHost.set('1.1.1.1');
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector(
      'button[type="submit"]',
    );
    expect(button.disabled).toBe(false);

    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit'));

    expect(mockToolsStore.ping).toHaveBeenCalled();
  });

  it('displays raw ping output when available', () => {
    mockToolsStore.pingOutput.set(
      'PING 1.1.1.1: 56 data bytes\n64 bytes from 1.1.1.1: time=12ms',
    );
    fixture.detectChanges();

    const pre: HTMLElement =
      fixture.nativeElement.querySelector('.diag-output');
    expect(pre).toBeTruthy();
    expect(pre.textContent).toContain('PING 1.1.1.1');
  });

  it('displays error when present', () => {
    mockToolsStore.error.set('Host unreachable');
    fixture.detectChanges();

    const errorEl: HTMLElement = fixture.nativeElement.querySelector('.error');
    expect(errorEl).toBeTruthy();
    expect(errorEl.textContent).toContain('Host unreachable');
  });
});
