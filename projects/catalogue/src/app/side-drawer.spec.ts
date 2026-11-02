import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SideDrawer } from './side-drawer';
import { Projects } from './projects';
import { BASE_PROJECTS } from './project-data';

describe('Form drawers', () => {
  beforeEach(() => {
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, writable: true, value: function (this: HTMLDialogElement) { this.setAttribute('open', ''); } });
  });

  it('confirms dirty closure, keeps editing, prevents closing while saving and restores body scrolling', async () => {
    const overflow = document.body.style.overflow;
    const fixture = TestBed.createComponent(SideDrawer);
    fixture.componentRef.setInput('title', 'Test drawer');
    fixture.componentRef.setInput('dirty', true);
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);
    await fixture.whenStable();
    expect(document.body.style.overflow).toBe('hidden');
    fixture.componentInstance.requestClose();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Discard unsaved changes?');
    expect(closed).not.toHaveBeenCalled();
    fixture.componentInstance.keepEditing();
    expect(fixture.componentInstance.confirming()).toBe(false);
    fixture.componentRef.setInput('busy', true);
    fixture.componentInstance.requestClose();
    expect(closed).not.toHaveBeenCalled();
    fixture.componentRef.setInput('busy', false);
    fixture.componentRef.setInput('dirty', false);
    fixture.componentInstance.requestClose();
    expect(closed).toHaveBeenCalledOnce();
    fixture.destroy();
    expect(document.body.style.overflow).toBe(overflow);
  });

  it('advances validated project steps without losing input and saves only from Review', async () => {
    const fixture = TestBed.createComponent(Projects);
    fixture.componentRef.setInput('page', 'create');
    await fixture.whenStable();
    const component = fixture.componentInstance;
    const created = vi.fn();
    component.create.subscribe(created);
    const submit = () => fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));
    submit();
    expect(component.step()).toBe(0);
    expect(component.formError()).toContain('project name');
    component.update('name', 'Stepper project');
    component.update('customer', 'Customer');
    submit();
    expect(component.step()).toBe(1);
    submit();
    expect(component.step()).toBe(2);
    submit();
    expect(component.step()).toBe(2);
    expect(component.formError()).toContain('token JSON');
    await component.selectTokenFile({ name: 'new.json', size: 20, text: async () => '{"brand":{"$value":"#123456"}}' } as File);
    submit();
    expect(component.step()).toBe(3);
    expect(created).not.toHaveBeenCalled();
    component.step.set(0);
    expect(component.draft().customer).toBe('Customer');
    expect(component.tokenFileName()).toBe('new.json');
    component.step.set(4);
    submit();
    expect(created).toHaveBeenCalledOnce();
  });

  it('starts editing on Details with saved assets and tokens and detects actual changes', async () => {
    const fixture = TestBed.createComponent(Projects);
    fixture.componentRef.setInput('page', 'edit');
    fixture.componentRef.setInput('editing', BASE_PROJECTS[0]);
    fixture.componentRef.setInput('canEdit', true);
    await fixture.whenStable();
    const component = fixture.componentInstance;
    expect(component.dirty()).toBe(false);
    expect(component.step()).toBe(0);
    expect(component.tokenFileName()).toBe(BASE_PROJECTS[0].tokenFileName);
    component.update('name', 'Changed');
    expect(component.dirty()).toBe(true);
    component.update('name', BASE_PROJECTS[0].name);
    expect(component.dirty()).toBe(false);
  });
});
