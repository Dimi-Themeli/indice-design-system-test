import { Component, computed, signal } from '@angular/core';
import { TOKENS, DesignToken } from 'indice-tokens';
import { Icon } from './icon';
import { ButtonCatalogue } from './buttons';
import { IconButtonCatalogue } from './icon-buttons';

@Component({
  imports: [Icon, ButtonCatalogue, IconButtonCatalogue],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
  host: { '(document:keydown.escape)': 'menuOpen.set(false)' },
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
  readonly menuOpen = signal(false);
  readonly notice = signal('');
  private noticeTimer?: ReturnType<typeof setTimeout>;
  readonly isComponent = computed(() => this.category() === 'buttons' || this.category() === 'icon-buttons');
  readonly title = computed(() => this.category() === 'buttons' ? 'Buttons' : this.category() === 'icon-buttons' ? 'Icon Buttons' : this.query().trim() ? 'Search results' : this.categories.find(item => item.id === this.category())!.title);
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
