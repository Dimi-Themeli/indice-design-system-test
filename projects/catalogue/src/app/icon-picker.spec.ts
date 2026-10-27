import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { IconPicker } from './icon-picker';
import { ButtonCatalogue } from './buttons';
import { FieldCatalogue } from './fields';
import { UseIt } from './use-it';

describe('Icon picker', () => {
  it('links each checkbox to its picker, keeps selections, and places checkboxes after icon choices', async () => {
    for (const component of [ButtonCatalogue, FieldCatalogue]) {
      const fixture = TestBed.createComponent<ButtonCatalogue | FieldCatalogue>(component);
      await fixture.whenStable();
      fixture.componentInstance.view.set('playground');
      await fixture.whenStable();
      const pickers = fixture.debugElement.queryAll(By.directive(IconPicker));
      for (const [index, picker] of pickers.entries()) {
        const instance = picker.componentInstance as IconPicker;
        await instance.choose(index === 0 ? 'heart' : 'star');
        await fixture.whenStable();
        const source = instance.value();
        const element = picker.nativeElement as HTMLElement;
        const checkbox = element.querySelector('input[type="checkbox"]') as HTMLInputElement;
        const choices = element.querySelector('.choices')!;
        expect(choices.compareDocumentPosition(checkbox) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        checkbox.click();
        await fixture.whenStable();
        expect(instance.enabled()).toBe(false);
        expect((element.querySelector('.picker-options') as HTMLFieldSetElement).disabled).toBe(true);
        expect(element.querySelector('button')?.matches(':disabled')).toBe(true);
        expect(checkbox.disabled).toBe(false);
        expect(instance.value()).toBe(source);
        expect(fixture.componentInstance.code()).not.toContain(source);
        checkbox.click();
        await fixture.whenStable();
        expect(instance.enabled()).toBe(true);
        expect(fixture.componentInstance.code()).toContain(source);
      }
      const element = fixture.nativeElement as HTMLElement;
      const lastPicker = element.querySelectorAll('app-icon-picker')[1];
      for (const checkbox of element.querySelectorAll('.toggle-controls input[type="checkbox"]')) {
        expect(lastPicker.compareDocumentPosition(checkbox) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      }
      fixture.destroy();
    }
  });

  it('searches and selects self-contained Lucide SVGs and restores the original', async () => {
    const fixture = TestBed.createComponent(IconPicker);
    fixture.componentRef.setInput('label', 'Left icon');
    await fixture.whenStable();
    fixture.componentInstance.query.set('heart');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('img').length).toBe(1);
    await fixture.componentInstance.choose('heart');
    expect(fixture.componentInstance.value()).toMatch(/^data:image\/svg\+xml,/);
    expect(decodeURIComponent(fixture.componentInstance.value())).toContain('<svg');
    fixture.componentInstance.selectDefault();
    expect(fixture.componentInstance.value()).toBe('');
  });

  it('loads Tabler and Bootstrap assets, reports errors, and clears on a library change', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    try {
      const fixture = TestBed.createComponent(IconPicker);
      fixture.componentRef.setInput('label', 'Field action icon');
      await fixture.whenStable();
      for (const library of ['tabler', 'bootstrap']) {
        fixture.componentRef.setInput('library', library);
        await fixture.whenStable();
        expect(fixture.componentInstance.value()).toBe('');
        fetch.mockResolvedValueOnce(new Response('<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>'));
        await fixture.componentInstance.choose('star');
        expect(fetch).toHaveBeenLastCalledWith(`icons/${library}/star.svg`);
        expect(fixture.componentInstance.value()).toContain('data:image/svg+xml,');
      }
      const previous = fixture.componentInstance.value();
      fetch.mockResolvedValueOnce(new Response('Missing', { status: 404 }));
      await fixture.componentInstance.choose('heart');
      expect(fixture.componentInstance.error()).toContain('404');
      expect(fixture.componentInstance.value()).toBe(previous);
      fetch.mockResolvedValueOnce(new Response('<html>Not an SVG</html>'));
      await fixture.componentInstance.choose('heart');
      expect(fixture.componentInstance.error()).toContain('valid SVG');
    } finally { fetch.mockRestore(); }
  });

  it('ignores a pending selection if the library changes', async () => {
    let resolve!: (response: Response) => void;
    const fetch = vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise<Response>(done => { resolve = done; }));
    try {
      const fixture = TestBed.createComponent(IconPicker);
      fixture.componentRef.setInput('label', 'Left icon');
      fixture.componentRef.setInput('library', 'tabler');
      await fixture.whenStable();
      const pending = fixture.componentInstance.choose('star');
      fixture.componentRef.setInput('library', 'bootstrap');
      await fixture.whenStable();
      resolve(new Response('<svg xmlns="http://www.w3.org/2000/svg"/>'));
      await pending;
      expect(fixture.componentInstance.value()).toBe('');
    } finally { fetch.mockRestore(); }
  });

  it('updates both button icons, copied usage settings and resets on project library changes', async () => {
    const fixture = TestBed.createComponent(ButtonCatalogue);
    await fixture.whenStable();
    fixture.componentInstance.view.set('playground');
    await fixture.whenStable();
    const pickers = fixture.debugElement.queryAll(By.directive(IconPicker));
    await (pickers[0].componentInstance as IconPicker).choose('heart');
    await (pickers[1].componentInstance as IconPicker).choose('star');
    await fixture.whenStable();
    expect(fixture.componentInstance.code()).toContain('leftIcon="data:');
    expect(fixture.componentInstance.code()).toContain('rightIcon="data:');
    expect(fixture.nativeElement.querySelector('.leading').style.maskImage).toContain('data:image/svg+xml');
    const usage = fixture.debugElement.query(By.directive(UseIt)).componentInstance as UseIt;
    expect(usage.selectedSettings()['leftIcon']).toBe(fixture.componentInstance.leftIconSource());
    fixture.componentRef.setInput('iconLibrary', 'tabler');
    await fixture.whenStable();
    expect(fixture.componentInstance.leftIconSource()).toBe('');
    expect(fixture.componentInstance.rightIconSource()).toBe('');
  });

  it('updates field action and information icons without breaking password visibility', async () => {
    const fixture = TestBed.createComponent(FieldCatalogue);
    await fixture.whenStable();
    fixture.componentInstance.view.set('playground');
    fixture.componentInstance.setType('password');
    await fixture.whenStable();
    const pickers = fixture.debugElement.queryAll(By.directive(IconPicker));
    await (pickers[0].componentInstance as IconPicker).choose('heart');
    await (pickers[1].componentInstance as IconPicker).choose('star');
    await fixture.whenStable();
    expect(fixture.componentInstance.code()).toContain('actionIcon="data:');
    expect(fixture.componentInstance.code()).toContain('infoIcon="data:');
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.live-preview .custom-icon').length).toBe(2);
    (element.querySelector('.live-preview .field-action') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect((element.querySelector('.live-preview input') as HTMLInputElement).type).toBe('text');
    fixture.componentInstance.setDisabled(true);
    await fixture.whenStable();
    expect((element.querySelector('.live-preview .field-action') as HTMLButtonElement).disabled).toBe(true);
    fixture.componentRef.setInput('iconLibrary', 'bootstrap');
    await fixture.whenStable();
    expect(fixture.componentInstance.actionIconSource()).toBe('');
    expect(fixture.componentInstance.infoIconSource()).toBe('');
  });
});
