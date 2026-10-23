import { Component, ElementRef, effect, inject, input } from '@angular/core';
import { ArrowDownToLine, ArrowLeft, ArrowLeftRight, Check, ChevronRight, Code, Copy, FolderCog, Layers, ListCollapse, Menu, Plus, RotateCcw, Search, Trash2, X, createElement } from 'lucide';

const icons = { search: Search, copy: Copy, layers: Layers, menu: Menu, close: X, check: Check, chevron: ChevronRight, download: ArrowDownToLine, change: ArrowLeftRight, add: Plus, manage: FolderCog, trash: Trash2, back: ArrowLeft, collapse: ListCollapse, reset: RotateCcw, code: Code };

@Component({ selector: 'app-icon', template: '', host: { 'aria-hidden': 'true' } })
export class Icon {
  readonly name = input<keyof typeof icons>('layers');
  private readonly element = inject(ElementRef<HTMLElement>);

  constructor() {
    effect(() => {
      this.element.nativeElement.replaceChildren(createElement(icons[this.name()], { width: 18, height: 18, 'stroke-width': 1.7 }));
    });
  }
}