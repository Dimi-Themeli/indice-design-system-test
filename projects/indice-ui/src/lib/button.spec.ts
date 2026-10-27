import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BUTTON_VARIANTS, IndiceButton } from './button';
import { ICON_BUTTON_SIZES, ICON_BUTTON_VARIANTS, IconButtonSize, IndiceIconButton } from './icon-button';
import { IndiceSocialButton, SOCIAL_BUTTON_PROVIDERS, SocialButtonProvider } from './social-button';

@Component({ imports: [IndiceButton], template: '<button indiceButton [disabled]="disabled" [showLeftIcon]="left" [showRightIcon]="right" (click)="clicks = clicks + 1">Button</button>' })
class TestHost {
  disabled = false;
  left = true;
  right = true;
  clicks = 0;
}

@Component({ imports: [IndiceIconButton], template: '<button indiceIconButton label="Open administration" [size]="size" [disabled]="disabled" (click)="clicks = clicks + 1"></button>' })
class IconTestHost {
  size: IconButtonSize = 'small';
  disabled = false;
  clicks = 0;
}

@Component({ imports: [IndiceSocialButton], template: '<button indiceSocialButton [provider]="provider()" [disabled]="disabled()" (click)="clicks = clicks + 1"></button>' })
class SocialTestHost {
  provider = signal<SocialButtonProvider>('windows');
  disabled = signal(false);
  clicks = 0;
}

describe('IndiceSocialButton', () => {
  it('renders all four original provider labels with decorative logos', async () => {
    const fixture = TestBed.createComponent(SocialTestHost);
    for (const provider of SOCIAL_BUTTON_PROVIDERS) {
      fixture.componentInstance.provider.set(provider.id);
      await fixture.whenStable();
      const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
      expect(button.dataset['provider']).toBe(provider.id);
      expect(button.textContent).toBe(provider.label);
      expect(button.querySelector('.social-provider-logo')?.getAttribute('aria-hidden')).toBe('true');
      expect(button.type).toBe('button');
    }
  });

  it('uses native activation and blocks clicks when disabled', async () => {
    const fixture = TestBed.createComponent(SocialTestHost);
    await fixture.whenStable();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();
    expect(fixture.componentInstance.clicks).toBe(1);
    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();
    expect(button.disabled).toBe(true);
    button.click();
    expect(fixture.componentInstance.clicks).toBe(1);
  });
});

describe('IndiceIconButton', () => {
  it('requires an accessible label and provides a native tooltip and safe button type', async () => {
    const fixture = TestBed.createComponent(IconTestHost);
    await fixture.whenStable();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.type).toBe('button');
    expect(button.getAttribute('aria-label')).toBe('Open administration');
    expect(button.title).toBe('Open administration');
    expect(button.dataset['variant']).toBe('black-filled');
    expect(button.dataset['size']).toBe('small');
    expect(button.querySelector('.icon-button-caption')).toBeNull();
    button.click();
    expect(fixture.componentInstance.clicks).toBe(1);
  });

  it('shows a caption only for xx-large and blocks disabled activation', async () => {
    const fixture = TestBed.createComponent(IconTestHost);
    fixture.componentInstance.size = 'xx-large';
    fixture.componentInstance.disabled = true;
    await fixture.whenStable();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.querySelector('.icon-button-caption')?.textContent).toBe('Admin');
    button.click();
    expect(fixture.componentInstance.clicks).toBe(0);
  });

  it('exposes only the four variants and four sizes supplied by Figma', () => {
    expect(ICON_BUTTON_VARIANTS).toEqual(['black-filled', 'teal-filled', 'black-outline', 'grey-fill']);
    expect(ICON_BUTTON_SIZES).toEqual(['small', 'medium', 'large', 'xx-large']);
  });
});

describe('IndiceButton', () => {
  it('uses a native button with a safe default type and both icons', async () => {
    const fixture = TestBed.createComponent(TestHost);
    await fixture.whenStable();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.type).toBe('button');
    expect(button.dataset['variant']).toBe('primary-filled');
    expect(button.querySelectorAll('.button-icon').length).toBe(2);
    expect(button.textContent?.trim()).toBe('Button');
    button.click();
    expect(fixture.componentInstance.clicks).toBe(1);
  });

  it('prevents activation when disabled and supports optional icons', async () => {
    const fixture = TestBed.createComponent(TestHost);
    fixture.componentInstance.disabled = true;
    fixture.componentInstance.left = false;
    fixture.componentInstance.right = false;
    await fixture.whenStable();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    button.click();
    expect(fixture.componentInstance.clicks).toBe(0);
    expect(button.querySelectorAll('.button-icon').length).toBe(0);
  });

  it('exposes exactly the seven Figma combinations', () => {
    expect(BUTTON_VARIANTS.map(variant => variant.id)).toEqual(['primary-filled', 'secondary-outline', 'primary-clear', 'secondary-filled', 'secondary-clear', 'delete-clear', 'delete-outline']);
    expect(BUTTON_VARIANTS[1]).toEqual({ id: 'secondary-outline', kind: 'primary', appearance: 'outline' });
  });
});