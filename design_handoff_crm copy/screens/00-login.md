# Screen — Login

**Source page**: `src/pages/Login.tsx`
**Prototype reference**: `ScreenLogin` in `prototype/screens-extra.jsx`

## Layout

- Centered vertically, max-w mobile width
- Top-right: language switcher chip (`EN · ՀԱՅ`) — keep your existing `<LanguageSwitcher />` but restyle
- Hero block: 64×64 terracotta icon square with restaurant emoji (or your logo), 22px gap, then "Welcome back" h1 + "Sign in to your restaurant" subtitle
- Form: two fields (Email, Password) stacked, primary submit
- Bottom: divider + "New restaurant?" link + neutral "Create an account" button

## Keep

- Your react-hook-form + zod validation as-is
- Your i18n keys: `auth.login.title`, `auth.login.subtitle`, `auth.register.email`, `auth.register.password`, `auth.login.submit`, `auth.login.noAccount`, `auth.login.createOne`
- `api.auth.login()` call + auth.set() + navigate

## Change

- Wrap inputs in new FieldLabel pattern (uppercase 11.5px label above each input). Drop the old `<Field>` if needed or update Field.tsx to match
- Replace SubmitButton with new `<PrimaryButton kind="primary">`
- Add the icon hero block + bottom CTA section
