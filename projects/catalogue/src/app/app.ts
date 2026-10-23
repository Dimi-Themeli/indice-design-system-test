import { Component, computed, signal } from '@angular/core';
import { TOKENS, DesignToken } from 'indice-tokens';
import { Icon } from './icon';
import { ButtonCatalogue } from './buttons';
import { IconButtonCatalogue } from './icon-buttons';
import { SocialButtonCatalogue } from './social-buttons';
import { FieldCatalogue } from './fields';

@Component({
  imports: [Icon, ButtonCatalogue, IconButtonCatalogue, SocialButtonCatalogue, FieldCatalogue],
  selector: 'app-root',
  styleUrls: ['./app.css', './theme-chooser.css'],
  templateUrl: './app.html',
  host: { '(document:keydown.escape)': 'menuOpen.set(false)', '[attr.data-role]': 'role()' },
})
export class App {
  readonly categories = [
    { id: 'colours', title: 'Colours', number: '01' },
    { id: 'fonts', title: 'Typography', number: '02' },
    { id: 'space', title: 'Spacing', number: '03' },
    { id: 'border', title: 'Borders', number: '04' },
    { id: 'containers', title: 'Containers', number: '05' },
  ];
  readonly tokens = TOKENS;
  readonly category = signal('colours');
  readonly query = signal('');
  readonly copyMode = signal<'variable' | 'value'>('variable');
  readonly role = signal<'designer' | 'developer'>('developer');
  readonly themePreviews = [
    { id: 'company-a', name: 'Company A', modes: 'Light', platform: 'Desktop app', image: 'assets/theme-company-a.png', sample: false },
    { id: 'company-b', name: 'Company B / Workspace', modes: 'Light & dark', platform: 'Desktop app', image: 'assets/theme-company-b.png', sample: true },
    { id: 'company-c', name: 'Company C / Pocket', modes: 'Light', platform: 'Mobile app', image: 'assets/theme-company-c.png', sample: true },
    { id: 'company-d', name: 'Company D / Console', modes: 'Dark', platform: 'Desktop & mobile', image: 'assets/theme-company-d.png', sample: true },
  ] as const;
  readonly previewThemeId = signal('company-a');
  readonly selectedThemePreview = computed(() => this.themePreviews.find(theme => theme.id === this.previewThemeId())!);
  readonly menuOpen = signal(false);
  readonly notice = signal('');
  private noticeTimer?: ReturnType<typeof setTimeout>;
  readonly isComponent = computed(() => ['buttons', 'icon-buttons', 'social-buttons', 'fields'].includes(this.category()));
  readonly title = computed(() => this.category() === 'buttons' ? 'Buttons' : this.category() === 'icon-buttons' ? 'Icon Buttons' : this.category() === 'social-buttons' ? 'Social Media Buttons' : this.category() === 'fields' ? 'Input Field' : this.query().trim() ? 'Search results' : this.categories.find(item => item.id === this.category())!.title);
  readonly visible = computed(() => {
    const query = this.query().trim().toLowerCase();
    return TOKENS.filter(token => query
      ? `${token.name} ${token.variable} ${token.value} ${token.cssValue}`.toLowerCase().includes(query)
      : token.category === this.category());
  });
  readonly groups = computed(() => {
    const groups = new Map<string, DesignToken[]>();
    for (const token of this.visible()) {
      const group = groups.get(token.group) ?? [];
      group.push(token);
      groups.set(token.group, group);
    }
    return [...groups].map(([name, tokens]) => ({ name, title: name.split('.').slice(1).join(' / ') || name, tokens, category: tokens[0].category }));
  });

  count(category: string) { return TOKENS.filter(token => token.category === category).length; }

  setRole(role: 'designer' | 'developer') {
    this.role.set(role);
    this.menuOpen.set(false);
  }

  openThemeChooser(dialog: HTMLDialogElement) {
    this.menuOpen.set(false);
    this.previewThemeId.set('company-a');
    dialog.showModal();
  }

  selectThemePreview(id: string) {
    if (this.themePreviews.some(theme => theme.id === id)) this.previewThemeId.set(id);
  }

  onThemeBackdrop(event: MouseEvent) {
    const dialog = event.currentTarget as HTMLDialogElement;
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  }

  select(category: string) {
    this.category.set(category);
    this.query.set('');
    this.menuOpen.set(false);
    window.scrollTo({ top: 0 });
  }

  async copy(token: DesignToken) {
    const value = this.copyMode() === 'variable' ? `var(${token.variable})` : token.cssValue;
    try {
      await navigator.clipboard.writeText(value);
      this.showNotice(`Copied ${value}`);
    } catch {
      this.showNotice('Clipboard unavailable. Select and copy the token text.');
    }
  }

  private showNotice(message: string) {
    clearTimeout(this.noticeTimer);
    this.notice.set(message);
    this.noticeTimer = setTimeout(() => this.notice.set(''), 3500);
  }
}
