import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SystemComponent } from './system.component';
import { UneticStore } from '../core/unetic-store.service';
import { SystemInfo } from '../core/models';

function createMockSystemInfo(): SystemInfo {
  return {
    hostname: 'unetic-router',
    model: 'GL.iNet GL-MT3000',
    board_name: 'glinet,gl-mt3000',
    firmware_version: 'SNAPSHOT',
    firmware_revision: 'r23456',
    target: 'mediatek/filogic',
    arch: 'aarch64_cortex-a53',
    kernel_version: '6.6.32',
    uptime_secs: 90061,
    load_average: [0.12, 0.08, 0.02],
    memory_total_kb: 524288,
    memory_available_kb: 262144,
  };
}

describe('SystemComponent', () => {
  let component: SystemComponent;
  let fixture: ComponentFixture<SystemComponent>;
  let mockUneticStore: {
    systemInfo: ReturnType<typeof signal<SystemInfo | null>>;
  };

  beforeEach(async () => {
    mockUneticStore = {
      systemInfo: signal<SystemInfo | null>(null),
    };

    await TestBed.configureTestingModule({
      imports: [SystemComponent],
      providers: [{ provide: UneticStore, useValue: mockUneticStore }],
    }).compileComponents();

    fixture = TestBed.createComponent(SystemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('displays loading state when systemInfo is null', () => {
    const status = fixture.nativeElement.querySelector('.status');
    expect(status).toBeTruthy();
    expect(status.textContent).toContain('Loading system information…');
  });

  it('renders system info rows when systemInfo is available', () => {
    mockUneticStore.systemInfo.set(createMockSystemInfo());
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('unetic-router');
    expect(root.textContent).toContain('GL.iNet GL-MT3000');
    expect(root.textContent).toContain('6.6.32');
    expect(root.textContent).toContain('1d 1h 1m');
  });

  it('correctly formats uptime in days, hours, and minutes', () => {
    expect(component.formatUptime(45)).toBe('0m');
    expect(component.formatUptime(125)).toBe('2m');
    expect(component.formatUptime(3665)).toBe('1h 1m');
    expect(component.formatUptime(90065)).toBe('1d 1h 1m');
  });

  it('correctly formats memory values in MB and GB', () => {
    expect(component.formatMemory(512000)).toBe('500 MB');
    expect(component.formatMemory(2097152)).toBe('2.0 GB');
  });
});
