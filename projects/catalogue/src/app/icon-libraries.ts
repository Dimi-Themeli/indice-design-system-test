import { Component, computed, input, output, signal } from '@angular/core';
import { Icon, ICON_NAMES } from './icon';
import { DEFAULT_ICON_LIBRARY, ICON_LIBRARIES, STARTER_ICON_NAMES } from './icon-library-data';
import type { Project } from './project-data';

@Component({
  selector: 'app-icon-libraries',
  imports: [Icon],
  template: `
    <button type="button" class="back-link" (click)="opened() ? opened.set(null) : back.emit(); query.set('')"><app-icon name="back" />{{ opened() ? 'Back to icon libraries' : 'Back to library' }}</button>
    <header class="projects-heading"><div><div class="projects-eyebrow">INDICE / ICONS</div><h1>{{ selectedLibrary()?.name ?? 'Icons libraries' }}</h1></div></header>
    @if (selectedLibrary(); as library) {
      <p>Starter collection bundled locally.</p>
      <p><a [href]="library.url" target="_blank" rel="noopener noreferrer">Browse the full {{ library.name }} catalogue</a> · {{ library.license }} license</p>
      <label class="project-search"><app-icon name="search" /><input type="search" aria-label="Search icons" placeholder="Search icons..." [value]="query()" (input)="query.set($any($event.target).value)" /></label>
      <div class="icon-gallery">
        @if (library.id === 'lucide') {
          @for (name of matchingIcons(); track name) { <div class="icon-tile"><app-icon [name]="name" /><span>{{ name }}</span></div> } @empty { <p role="status">No matching icons.</p> }
        } @else {
          @for (name of matchingAssetIcons(); track name) { <div class="icon-tile"><img [src]="'icons/' + library.id + '/' + name + '.svg'" width="24" height="24" alt="" /><span>{{ name }}</span></div> } @empty { <p role="status">No matching icons.</p> }
        }
      </div>
    } @else {
      <div class="project-list-toolbar"><label class="project-search"><app-icon name="search" /><input type="search" aria-label="Search icon libraries" placeholder="Search icon libraries..." [value]="query()" (input)="query.set($any($event.target).value)" /></label><span>{{ matches().length }} {{ matches().length === 1 ? 'library' : 'libraries' }}</span></div>
      <ul class="project-list">@for (library of matches(); track library.id) {
        <li class="project-row"><div class="project-thumbnail library-thumbnail"><app-icon name="icons" /></div><div class="project-info"><h2>{{ library.name }}</h2><p>{{ library.description }}</p><div class="project-meta"><span>Built in</span><span>{{ library.license }} license</span><span>Used in {{ usageCounts().get(library.id) ?? 0 }} projects</span></div></div><div class="project-row-actions"><button type="button" class="secondary-action" [attr.aria-label]="'Open ' + library.name" (click)="query.set(''); opened.set(library.id)">Open<app-icon name="chevron" /></button></div></li>
      } @empty { <li class="projects-empty">No matching icon libraries.</li> }</ul>
    }
  `,
  styleUrls: ['./projects.css', './icon-libraries.css'],
})
export class IconLibraries {
  readonly back = output<void>();
  readonly projects = input<Project[]>([]);
  readonly libraries = ICON_LIBRARIES;
  readonly query = signal('');
  readonly opened = signal<string | null>(null);
  readonly selectedLibrary = computed(() => this.libraries.find(library => library.id === this.opened()));
  readonly usageCounts = computed(() => {
    const counts = new Map<string, number>();
    for (const project of this.projects()) {
      const id = project.iconLibraryId ?? DEFAULT_ICON_LIBRARY;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  });
  readonly matches = computed(() => this.libraries.filter(library => `${library.name} ${library.description}`.toLowerCase().includes(this.query().trim().toLowerCase())));
  readonly matchingIcons = computed(() => ICON_NAMES.filter(name => name.includes(this.query().trim().toLowerCase())));
  readonly matchingAssetIcons = computed(() => STARTER_ICON_NAMES.filter(name => name.includes(this.query().trim().toLowerCase())));
}
