import { Component, DestroyRef, ElementRef, afterNextRender, inject, input, output, signal, viewChild } from '@angular/core';
import { Icon } from './icon';

@Component({
  selector: 'app-side-drawer',
  host: { '(window:beforeunload)': 'beforeUnload($event)' },
  imports: [Icon],
  template: `
    <dialog #dialog class="side-drawer" [attr.aria-label]="title()" (cancel)="$event.preventDefault(); requestClose()" (click)="onBackdrop($event)">
      <header class="drawer-header"><h2>{{ title() }}</h2><button type="button" class="drawer-close" aria-label="Close drawer" [disabled]="busy()" (click)="requestClose()"><app-icon name="close" /></button></header>
      @if (confirming()) {
        <section class="discard-confirmation" role="alert" aria-label="Unsaved changes">
          <h3>Discard unsaved changes?</h3><p>Your changes have not been saved.</p>
          <div><button type="button" (click)="keepEditing()">Keep editing</button><button type="button" (click)="closed.emit()">Discard changes</button></div>
        </section>
      }
      <div class="drawer-content" [inert]="confirming()"><ng-content /></div>
    </dialog>
  `,
  styleUrl: './side-drawer.css',
})
export class SideDrawer {
  readonly title = input.required<string>();
  readonly dirty = input(false);
  readonly busy = input(false);
  readonly closed = output<void>();
  readonly confirming = signal(false);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private focusTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    afterNextRender(() => {
      document.body.style.overflow = 'hidden';
      this.dialog().nativeElement.showModal();
    });
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.focusTimer);
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    });
  }

  requestClose() {
    if (this.busy()) return;
    if (this.dirty()) {
      this.confirming.set(true);
      this.focusTimer = setTimeout(() => this.dialog().nativeElement.querySelector<HTMLButtonElement>('.discard-confirmation button')?.focus());
    } else this.closed.emit();
  }

  keepEditing() {
    this.confirming.set(false);
    this.dialog().nativeElement.querySelector<HTMLButtonElement>('.drawer-close')?.focus();
  }

  beforeUnload(event: BeforeUnloadEvent) {
    if (this.dirty() || this.busy()) event.preventDefault();
  }

  onBackdrop(event: MouseEvent) {
    if (event.target !== this.dialog().nativeElement) return;
    const bounds = this.dialog().nativeElement.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) this.requestClose();
  }
}
