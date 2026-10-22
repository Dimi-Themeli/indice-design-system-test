# Indice Tokens

Generated primitive tokens for the Indice Design System. From the workspace root, run `npm run build` to regenerate and package the library.

Import `TOKENS` and the `DesignToken` type from `indice-tokens`. Import `indice-tokens/tokens.css` in global styles for CSS custom properties.

The canonical source is `tokens/primitive.json`. See the workspace README for mapping rules and token updates. No UI components are included yet.

## CSS Example

```css
.example {
  color: var(--indice-colours-main-neutral-900);
  padding: var(--indice-space-8);
}
```
