import { Component, ElementRef, effect, inject, input } from '@angular/core';
import { ArrowDownToLine, ArrowLeftRight, Check, ChevronRight, Code, Copy, Layers, Menu, Plus, RotateCcw, Search, X, createElement } from 'lucide';

const icons = { search: Search, copy: Copy, layers: Layers, menu: Menu, close: X, check: Check, chevron: ChevronRight, download: ArrowDownToLine, change: ArrowLeftRight, add: Plus, reset: RotateCcw, code: Code };

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