import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { IndiceField } from './field';

@Component({ imports: [IndiceField, ReactiveFormsModule], template: '<indice-field label="Email" [formControl]="control" [required]="true" info="Contact email" [invalid]="invalid()" [error]="error()" />' })
class FormHost {
  control = new FormControl('initial@example.com', { nonNullable: true, validators: [Validators.required] });
  invalid = signal(false);
  error = signal('');
}

@Component({ imports: [IndiceField], template: '<indice-field label="Password" type="password" [(value)]="value" [readOnly]="readOnly()" [showLabel]="showLabel()" />' })
class ModelHost {
  value = signal('secret');
  readOnly = signal(false);
  showLabel = signal(true);
}

describe('IndiceField', () => {
  it('associates its label and optional information with the native input', async () => {
    const fixture = TestBed.createComponent(FormHost);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const input = element.querySelector('input')!;
    expect(input.value).toBe('initial@example.com');
    expect(element.querySelector('label')?.htmlFor).toBe(input.id);
    expect(input.required).toBe(true);
    expect(input.getAttribute('aria-describedby')).toBe(`${input.id}-info`);
  });

  it('integrates form writes, user input, touched state and resets', async () => {
    const fixture = TestBed.createComponent(FormHost);
    await fixture.whenStable();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    fixture.componentInstance.control.setValue('updated@example.com');
    await fixture.whenStable();
    expect(input.value).toBe('updated@example.com');
    input.value = 'typed@example.com';
    input.dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.control.value).toBe('typed@example.com');
    input.dispatchEvent(new Event('blur'));
    expect(fixture.componentInstance.control.touched).toBe(true);
    fixture.componentInstance.control.reset();
    await fixture.whenStable();
    expect(input.value).toBe('initial@example.com');
  });

  it('honours form disable and enable, including the action button', async () => {
    const fixture = TestBed.createComponent(FormHost);
    await fixture.whenStable();
    fixture.componentInstance.control.disable();
    await fixture.whenStable();
    expect((fixture.nativeElement.querySelector('input') as HTMLInputElement).disabled).toBe(true);
    expect((fixture.nativeElement.querySelector('.field-action') as HTMLButtonElement).disabled).toBe(true);
    fixture.componentInstance.control.enable();
    await fixture.whenStable();
    expect((fixture.nativeElement.querySelector('input') as HTMLInputElement).disabled).toBe(false);
  });

  it('connects error feedback and invalid semantics to the control', async () => {
    const fixture = TestBed.createComponent(FormHost);
    fixture.componentInstance.error.set('Email is required');
    await fixture.whenStable();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toContain(`${input.id}-error`);
    expect(fixture.nativeElement.querySelector('.field-error').textContent).toBe('Email is required');
  });

  it('supports two-way values, password visibility and hidden-label accessibility', async () => {
    const fixture = TestBed.createComponent(ModelHost);
    fixture.componentInstance.showLabel.set(false);
    await fixture.whenStable();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.type).toBe('password');
    expect(input.getAttribute('aria-label')).toBe('Password');
    const action = fixture.nativeElement.querySelector('.field-action') as HTMLButtonElement;
    action.click();
    await fixture.whenStable();
    expect(input.type).toBe('text');
    expect(action.getAttribute('aria-pressed')).toBe('true');
    input.value = 'new secret';
    input.dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.value()).toBe('new secret');
  });

  it('keeps read-only content focusable and suppresses required validation', async () => {
    const fixture = TestBed.createComponent(ModelHost);
    fixture.componentInstance.readOnly.set(true);
    await fixture.whenStable();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.readOnly).toBe(true);
    expect(input.disabled).toBe(false);
    expect(input.required).toBe(false);
  });
});