import { Component, ElementRef, computed, effect, inject, input, output, signal } from '@angular/core';
import { ArrowLeft, ArrowRight, ArrowUpRight, Bell, Check, ChevronLeft, ChevronRight, CircleHelp, Clock3, Eye, EyeOff, LayoutDashboard, Monitor, Search, ShieldCheck, Smartphone, Tablet, Users, X, createElement } from 'lucide';

const previewIcons = {
  back: ArrowLeft,
  previous: ChevronLeft,
  next: ChevronRight,
  close: X,
  desktop: Monitor,
  tablet: Tablet,
  mobile: Smartphone,
  check: Check,
  security: ShieldCheck,
  'arrow-right': ArrowRight,
  'arrow-up-right': ArrowUpRight,
  eye: Eye,
  'eye-off': EyeOff,
  dashboard: LayoutDashboard,
  users: Users,
  clock: Clock3,
  bell: Bell,
  help: CircleHelp,
  search: Search,
  chevron: ChevronRight,
};

@Component({ selector: 'app-template-icon', template: '', host: { 'aria-hidden': 'true' } })
class TemplatePreviewIcon {
  readonly name = input<keyof typeof previewIcons>('check');
  private readonly element = inject(ElementRef<HTMLElement>);

  constructor() {
    effect(() => this.element.nativeElement.replaceChildren(createElement(previewIcons[this.name()], { width: 18, height: 18, 'stroke-width': 1.7 })));
  }
}

export type IamTemplateId = 'iam-login' | 'iam-dashboard';

interface ActivityItem {
  identity: string;
  detail: string;
  time: string;
  result: 'Allowed' | 'Reviewed' | 'Blocked';
}

@Component({
  selector: 'app-template-preview',
  imports: [TemplatePreviewIcon],
  templateUrl: './template-preview.html',
  styleUrls: ['./template-preview-base.css', './template-login.css', './template-dashboard.css', './template-dashboard-responsive.css'],
})
export class TemplatePreview {
  readonly templateId = input<IamTemplateId>('iam-login');
  readonly projectName = input('IAM');
  readonly back = output<void>();
  readonly previous = output<void>();
  readonly next = output<void>();
  readonly device = signal<'desktop' | 'tablet' | 'mobile'>('desktop');
  readonly devices = [
    { id: 'desktop', label: 'Desktop' },
    { id: 'tablet', label: 'Tablet' },
    { id: 'mobile', label: 'Mobile' },
  ] as const;
  readonly email = signal('');
  readonly password = signal('');
  readonly showPassword = signal(false);
  readonly keepSignedIn = signal(true);
  readonly loginMessage = signal('');
  readonly loginSucceeded = signal(false);
  readonly range = signal<'7D' | '30D' | '90D'>('30D');
  readonly activityQuery = signal('');
  readonly dashboardMessage = signal('');
  readonly periods = ['7D', '30D', '90D'] as const;
  readonly metrics = computed(() => {
    const values = this.range() === '7D'
      ? [['Active identities', '2,463', '+2.8%'], ['Successful sign-ins', '18.2k', '+4.1%'], ['Access reviews', '12', '4 due soon'], ['Risk events', '03', '-18.4%']]
      : this.range() === '90D'
        ? [['Active identities', '2,518', '+8.6%'], ['Successful sign-ins', '74.9k', '+11.2%'], ['Access reviews', '38', '9 due soon'], ['Risk events', '11', '-9.2%']]
        : [['Active identities', '2,480', '+5.2%'], ['Successful sign-ins', '52.8k', '+7.4%'], ['Access reviews', '24', '6 due soon'], ['Risk events', '07', '-12.8%']];
    return values.map(([label, value, change], index) => ({ label, value, change, tone: index === 3 ? 'positive' : index === 2 ? 'neutral' : 'up' }));
  });
  readonly chartBars = computed(() => {
    const values = this.range() === '7D'
      ? [46, 61, 55, 74, 67, 82, 71]
      : this.range() === '90D'
        ? [35, 44, 41, 58, 52, 68, 61, 77, 69, 84, 76, 92]
        : [42, 55, 48, 69, 60, 75, 67, 84, 73, 91, 80, 95];
    return values.map((value, index) => ({ value, label: this.range() === '7D' ? ['M', 'T', 'W', 'T', 'F', 'S', 'S'][index] : `${index + 1}` }));
  });
  readonly activity = [
    { identity: 'alex.morgan@indice.io', detail: 'Password + authenticator', time: '10:42:18', result: 'Allowed' },
    { identity: 'jules.park@indice.io', detail: 'Access review completed', time: '10:38:04', result: 'Reviewed' },
    { identity: 'sam.taylor@indice.io', detail: 'Unfamiliar device challenge', time: '10:31:52', result: 'Blocked' },
    { identity: 'morgan.lee@indice.io', detail: 'Password + passkey', time: '10:24:11', result: 'Allowed' },
  ] satisfies ActivityItem[];
  readonly filteredActivity = computed(() => {
    const query = this.activityQuery().trim().toLowerCase();
    return query ? this.activity.filter(item => `${item.identity} ${item.detail} ${item.result}`.toLowerCase().includes(query)) : this.activity;
  });

  submitLogin(event: SubmitEvent) {
    event.preventDefault();
    if (!this.email().trim() || !this.password()) {
      this.loginSucceeded.set(false);
      this.loginMessage.set('Enter your email and password to continue.');
      return;
    }
    this.loginSucceeded.set(true);
    this.loginMessage.set(`Demo sign-in complete for ${this.email().trim()}. No account was contacted.`);
  }

  requestPasswordReset() {
    this.loginSucceeded.set(false);
    this.loginMessage.set('Password recovery is a visual demo action.');
  }

  showDashboardSection(section: string) {
    this.dashboardMessage.set(`${section} is represented by demo navigation only.`);
  }
}