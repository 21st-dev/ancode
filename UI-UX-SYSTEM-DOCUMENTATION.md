# 📘 Sistema UI/UX - Documentação Completa para Replicação

> **Versão:** 0.0.22
> **Data:** Janeiro 2026
> **Projeto Base:** 1Code Desktop (Electron + React 19)

Esta documentação contém **TUDO** que você precisa para replicar o sistema UI/UX do 1Code em outro projeto.

---

## 📋 Índice

1. [Stack Tecnológico](#1-stack-tecnológico)
2. [Setup Inicial](#2-setup-inicial)
3. [Sistema de Cores e Temas](#3-sistema-de-cores-e-temas)
4. [Componentes UI](#4-componentes-ui)
5. [Padrões de Estilização](#5-padrões-de-estilização)
6. [Layouts e Responsividade](#6-layouts-e-responsividade)
7. [Animações](#7-animações)
8. [Gerenciamento de Estado](#8-gerenciamento-de-estado)
9. [Tipografia e Ícones](#9-tipografia-e-ícones)
10. [Checklist de Implementação](#10-checklist-de-implementação)

---

## 1. Stack Tecnológico

### 🎨 Framework e Ferramentas UI

```json
{
  "react": "19.2.1",
  "react-dom": "19.2.1",
  "typescript": "^5.4.5",
  "tailwindcss": "^3.4.17",
  "autoprefixer": "^10.4.20",
  "postcss": "^8.5.1"
}
```

### 🧩 Bibliotecas de Componentes

```json
{
  "@radix-ui/react-accordion": "^1.2.11",
  "@radix-ui/react-alert-dialog": "^1.1.1",
  "@radix-ui/react-checkbox": "^1.3.3",
  "@radix-ui/react-collapsible": "^1.1.12",
  "@radix-ui/react-context-menu": "^2.2.16",
  "@radix-ui/react-dialog": "^1.1.15",
  "@radix-ui/react-dropdown-menu": "^2.1.16",
  "@radix-ui/react-hover-card": "^1.1.14",
  "@radix-ui/react-icons": "^1.3.2",
  "@radix-ui/react-label": "^2.1.8",
  "@radix-ui/react-popover": "^1.1.15",
  "@radix-ui/react-progress": "^1.1.8",
  "@radix-ui/react-select": "^2.2.6",
  "@radix-ui/react-slot": "^1.2.4",
  "@radix-ui/react-switch": "^1.2.6",
  "@radix-ui/react-tabs": "^1.1.13",
  "@radix-ui/react-tooltip": "^1.2.8"
}
```

### 🎭 Styling e Variantes

```json
{
  "tailwindcss-animate": "^1.0.7",
  "@tailwindcss/typography": "^0.5.19",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.1.1",
  "tailwind-merge": "^2.6.0"
}
```

### ✨ Animações e Temas

```json
{
  "motion": "^11.15.0",
  "next-themes": "^0.4.4",
  "sonner": "^1.7.1"
}
```

### 🎯 Estado

```json
{
  "jotai": "^2.11.1",
  "zustand": "^5.0.3",
  "@tanstack/react-query": "^5.90.10"
}
```

### 🎨 Ícones

```json
{
  "lucide-react": "^0.468.0",
  "react-icons": "^5.5.0"
}
```

---

## 2. Setup Inicial

### Passo 1: Instalação de Dependências

```bash
# Core do projeto
npm install react@19.2.1 react-dom@19.2.1
npm install -D typescript@5.4.5

# Tailwind CSS
npm install -D tailwindcss@3.4.17 postcss autoprefixer
npm install tailwindcss-animate@1.0.7 @tailwindcss/typography@0.5.19
npm install tailwind-merge@2.6.0

# Radix UI (componentes completos)
npm install @radix-ui/react-accordion@^1.2.11
npm install @radix-ui/react-alert-dialog@^1.1.1
npm install @radix-ui/react-checkbox@^1.3.3
npm install @radix-ui/react-collapsible@^1.1.12
npm install @radix-ui/react-context-menu@^2.2.16
npm install @radix-ui/react-dialog@^1.1.15
npm install @radix-ui/react-dropdown-menu@^2.1.16
npm install @radix-ui/react-hover-card@^1.1.14
npm install @radix-ui/react-icons@^1.3.2
npm install @radix-ui/react-label@^2.1.8
npm install @radix-ui/react-popover@^1.1.15
npm install @radix-ui/react-progress@^1.1.8
npm install @radix-ui/react-select@^2.2.6
npm install @radix-ui/react-slot@^1.2.4
npm install @radix-ui/react-switch@^1.2.6
npm install @radix-ui/react-tabs@^1.1.13
npm install @radix-ui/react-tooltip@^1.2.8

# Utilities
npm install class-variance-authority@0.7.1 clsx@2.1.1

# Animações e Temas
npm install motion@11.15.0 next-themes@0.4.4 sonner@1.7.1

# Estado
npm install jotai@2.11.1 zustand@5.0.3
npm install @tanstack/react-query@5.90.10

# Ícones
npm install lucide-react@0.468.0 react-icons@5.5.0
```

### Passo 2: Configurar Tailwind

**`tailwind.config.js`**

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,html}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        // Customizadas (opcional - adapte ao seu projeto)
        "tl-background": "hsl(var(--tl-background))",
        "input-background": "hsl(var(--input-background))",
        "plan-mode": {
          DEFAULT: "hsl(var(--plan-mode))",
          foreground: "hsl(var(--plan-mode-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("tailwindcss-animate")
  ],
}
```

**`postcss.config.js`**

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### Passo 3: CSS Global

**`src/styles/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Layout Base */
    --background: 0 0% 100%;           /* Branco #FFFFFF */
    --foreground: 240 10% 3.9%;        /* Cinza escuro quase preto */

    /* Cards */
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;

    /* Popovers/Dropdowns */
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;

    /* Tema Brand - CUSTOMIZAR PARA SUA MARCA */
    --primary: 228 100% 50%;           /* Azul vibrante #0034FF */
    --primary-foreground: 0 0% 100%;   /* Branco sobre primary */

    /* Secundário */
    --secondary: 240 4.8% 95.9%;       /* Cinza claro */
    --secondary-foreground: 240 5.9% 10%;

    /* Muted (desabilitado, placeholder) */
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;

    /* Accent (hover states) */
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;

    /* Erro/Destruir */
    --destructive: 0 84.2% 60.2%;      /* Vermelho #F75050 */
    --destructive-foreground: 0 0% 98%;

    /* Bordas e Inputs */
    --border: 240 5.9% 90%;            /* Cinza muito claro */
    --input: 240 5.9% 90%;
    --input-background: 240 4.8% 95.9%;

    /* Focus ring */
    --ring: 228 100% 50%;              /* Azul primary */

    /* Seleção de texto */
    --selection: 228 100% 50% / 0.25;  /* Primary com 25% opacity */

    /* Border radius padrão */
    --radius: 0.5rem;                  /* 8px */

    /* Customizadas - ADAPTE AO SEU PROJETO */
    --plan-mode: 33 83% 67%;
    --plan-mode-foreground: 0 0% 8%;
    --tl-background: 0 0% 98%;
  }

  .dark {
    /* Layout Base */
    --background: 240 10% 3.9%;        /* Cinza muito escuro */
    --foreground: 240 4.8% 95.9%;      /* Quase branco */

    /* Cards */
    --card: 240 10% 3.9%;
    --card-foreground: 0 0% 98%;

    /* Popovers */
    --popover: 0 0% 9%;                /* #171717 */
    --popover-foreground: 0 0% 98%;

    /* Tema Brand - MESMA COR NO DARK */
    --primary: 228 100% 50%;           /* Azul #0034FF */
    --primary-foreground: 0 0% 100%;

    /* Secundário */
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;

    /* Muted */
    --muted: 240 5.9% 10%;
    --muted-foreground: 240 4.4% 58%;

    /* Accent */
    --accent: 240 5.9% 10%;
    --accent-foreground: 0 0% 98%;

    /* Erro */
    --destructive: 0 62.8% 30.6%;      /* Vermelho escuro */
    --destructive-foreground: 0 0% 98%;

    /* Bordas */
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --input-background: 60 2% 18%;

    /* Focus ring (mesmo) */
    --ring: 228 100% 50%;

    /* Seleção de texto */
    --selection: 228 100% 50% / 0.3;

    /* Border radius (mesmo) */
    --radius: 0.5rem;

    /* Customizadas */
    --plan-mode: 33 83% 67%;
    --plan-mode-foreground: 0 0% 8%;
    --tl-background: 60 2% 18%;
  }
}

@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}

/* ═══════════════════════════════════════════════════════ */
/* SCROLLBAR CUSTOMIZADO */
/* ═══════════════════════════════════════════════════════ */

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: hsl(var(--muted-foreground) / 0.3);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--muted-foreground) / 0.5);
}

/* ═══════════════════════════════════════════════════════ */
/* UTILITIES CUSTOMIZADAS */
/* ═══════════════════════════════════════════════════════ */

.no-select {
  user-select: none;
  -webkit-user-select: none;
}

.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

/* ═══════════════════════════════════════════════════════ */
/* SONNER TOAST STYLING (se usar Sonner) */
/* ═══════════════════════════════════════════════════════ */

[data-sonner-toaster] {
  --normal-bg: hsl(var(--popover));
  --normal-text: hsl(var(--popover-foreground));
  --normal-border: hsl(var(--border));
  --border-radius: var(--radius);
}

[data-sonner-toast][data-styled="true"] {
  padding: 12px 16px;
  padding-right: 32px;
  gap: 8px;
  align-items: flex-start;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

[data-sonner-toast] [data-title] {
  font-weight: 500;
  font-size: 14px;
  line-height: 1.4;
}

[data-sonner-toast] [data-description] {
  color: hsl(var(--muted-foreground));
  font-size: 13px;
  line-height: 1.4;
}
```

### Passo 4: Utility Function `cn()`

**`src/lib/utils.ts`**

```typescript
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

---

## 3. Sistema de Cores e Temas

### 🎨 Paleta de Cores Principal

#### Light Theme

| Token | HSL | Hex | Uso |
|-------|-----|-----|-----|
| `--background` | `0 0% 100%` | `#FFFFFF` | Fundo principal |
| `--foreground` | `240 10% 3.9%` | `#0A0E27` | Texto principal |
| `--primary` | `228 100% 50%` | `#0034FF` | **Cor da marca** (azul vibrante) |
| `--primary-foreground` | `0 0% 100%` | `#FFFFFF` | Texto em primary |
| `--secondary` | `240 4.8% 95.9%` | `#F3F4F6` | Backgrounds secundários |
| `--muted` | `240 4.8% 95.9%` | `#F3F4F6` | Elementos desabilitados |
| `--muted-foreground` | `240 3.8% 46.1%` | `#757575` | Texto secundário |
| `--accent` | `240 4.8% 95.9%` | `#F3F4F6` | Hover states |
| `--destructive` | `0 84.2% 60.2%` | `#F75050` | Erros e ações destrutivas |
| `--border` | `240 5.9% 90%` | `#E5E7EB` | Bordas |
| `--input` | `240 5.9% 90%` | `#E5E7EB` | Bordas de inputs |
| `--ring` | `228 100% 50%` | `#0034FF` | Focus ring |

#### Dark Theme

| Token | HSL | Hex | Uso |
|-------|-----|-----|-----|
| `--background` | `240 10% 3.9%` | `#0A0E27` | Fundo principal |
| `--foreground` | `240 4.8% 95.9%` | `#F3F4F6` | Texto principal |
| `--primary` | `228 100% 50%` | `#0034FF` | **Mesma cor** |
| `--popover` | `0 0% 9%` | `#171717` | Backgrounds de popovers |
| `--muted` | `240 5.9% 10%` | `#1F2937` | Elementos desabilitados |
| `--muted-foreground` | `240 4.4% 58%` | `#909090` | Texto secundário |
| `--destructive` | `0 62.8% 30.6%` | `#C02828` | Erros |
| `--border` | `240 3.7% 15.9%` | `#30302E` | Bordas |

### 🌓 Implementação de Tema

**`src/providers/theme-provider.tsx`**

```typescript
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}
```

**Hook de uso:**

```typescript
import { useTheme } from "next-themes"

function Component() {
  const { theme, setTheme } = useTheme()

  return (
    <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
      Toggle Theme
    </button>
  )
}
```

---

## 4. Componentes UI

### 🔘 Button

**`src/components/ui/button.tsx`**

```typescript
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"
import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/70 disabled:opacity-50 disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_0_0.5px_rgb(23,23,23),inset_0_0_0_1px_rgba(255,255,255,0.14)] dark:shadow-[0_0_0_0.5px_rgb(23,23,23),inset_0_0_0_1px_rgba(0,0,0,0.14)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm shadow-black/5 hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm shadow-black/5 hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground border border-input shadow-sm shadow-black/5 hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-7 rounded-md px-3",
        default: "h-7 rounded-md px-3",
        lg: "h-10 rounded-md px-8",
        icon: "h-7 w-7",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

**Uso:**

```tsx
import { Button } from "@/components/ui/button"

<Button variant="default">Salvar</Button>
<Button variant="destructive">Deletar</Button>
<Button variant="outline">Cancelar</Button>
<Button variant="ghost">Fechar</Button>
<Button size="icon"><IconTrash /></Button>
```

### 🔤 Input

**`src/components/ui/input.tsx`**

```typescript
import * as React from "react"
import { cn } from "../../lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground transition-shadow placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
```

**Uso:**

```tsx
import { Input } from "@/components/ui/input"

<Input type="text" placeholder="Digite seu nome" />
<Input type="email" placeholder="email@exemplo.com" />
```

### 🏷️ Label

**`src/components/ui/label.tsx`**

```typescript
import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const labelVariants = cva(
  "text-[12px] font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
)

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
```

### ☑️ Checkbox

**`src/components/ui/checkbox.tsx`**

```typescript
import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"
import { cn } from "../../lib/utils"

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer size-4 shrink-0 rounded border border-input shadow-sm shadow-black/5 outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/70 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("flex items-center justify-center text-current")}
    >
      <Check className="h-3.5 w-3.5" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
```

### 🎚️ Switch

**`src/components/ui/switch.tsx`**

```typescript
import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import { cn } from "../../lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-5 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/20",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-md ring-0 transition-all duration-200 data-[state=checked]:bg-white data-[state=checked]:translate-x-[24px] data-[state=unchecked]:translate-x-0"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
```

### 💬 Dialog

**`src/components/ui/dialog.tsx`**

```typescript
import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "../../lib/utils"

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
```

**Uso:**

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

<Dialog>
  <DialogTrigger asChild>
    <Button variant="outline">Abrir Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Título do Dialog</DialogTitle>
      <DialogDescription>
        Descrição ou conteúdo do dialog aqui.
      </DialogDescription>
    </DialogHeader>
  </DialogContent>
</Dialog>
```

### 📑 Tabs

**`src/components/ui/tabs.tsx`**

```typescript
import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cn } from "../../lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
```

### 🛟 Tooltip

**`src/components/ui/tooltip.tsx`**

```typescript
import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { cn } from "../../lib/utils"

const TooltipProvider = TooltipPrimitive.Provider
const Tooltip = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
```

**Uso:**

```tsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="ghost">Hover me</Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>Tooltip text aqui</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

### 🏷️ Badge

**`src/components/ui/badge.tsx`**

```typescript
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
```

---

## 5. Padrões de Estilização

### 🎨 Variantes com CVA (Class Variance Authority)

```typescript
import { cva } from "class-variance-authority"

const componentVariants = cva(
  // Base classes (sempre aplicadas)
  "inline-flex items-center",
  {
    variants: {
      variant: {
        default: "bg-primary text-white",
        secondary: "bg-secondary text-black",
        outline: "border border-input bg-transparent",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-lg",
      },
    },
    compoundVariants: [
      {
        variant: "outline",
        size: "sm",
        className: "border-2",  // Aplica apenas quando variant=outline E size=sm
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)
```

### 🔀 Classes Condicionais

```typescript
// Usando cn() com condições
className={cn(
  "base-classes",
  isActive && "active-state",
  isPending && "opacity-50",
  className  // Props override
)}

// Data attributes (preferível para states)
className="data-[state=open]:bg-accent data-[state=closed]:opacity-0"

// Tailwind arbitrary values
className="w-[calc(100%-2rem)] h-[42px]"
```

### 🎯 Focus States

```css
/* Input focus */
focus-visible:border-primary
focus-visible:outline-none
focus-visible:ring-[3px]
focus-visible:ring-primary/20

/* Button focus */
outline-offset-2
focus-visible:outline
focus-visible:outline-2
focus-visible:outline-primary/70
```

### 🖱️ Hover States

```css
/* Smooth transitions */
transition-colors
hover:bg-accent
hover:text-accent-foreground

/* Com duration */
transition-all duration-200
hover:opacity-90

/* Com transform */
transition-transform
hover:scale-105
active:scale-95
```

---

## 6. Layouts e Responsividade

### 📐 Breakpoints (Tailwind Default)

```
sm:  640px
md:  768px
lg:  1024px
xl:  1280px
2xl: 1536px
```

**Uso:**

```tsx
<div className="w-full md:w-1/2 lg:w-1/3">
  {/* Mobile: 100%, Tablet: 50%, Desktop: 33% */}
</div>
```

### 🧱 Grid Layouts

```tsx
{/* Grid responsivo */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <Card />
  <Card />
  <Card />
</div>

{/* Grid com auto-fit */}
<div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4">
  <Card />
</div>
```

### 📏 Flex Layouts

```tsx
{/* Flex com gap */}
<div className="flex items-center gap-2">
  <Icon />
  <span>Text</span>
</div>

{/* Flex column */}
<div className="flex flex-col space-y-4">
  <Item />
  <Item />
</div>

{/* Justify between */}
<div className="flex items-center justify-between">
  <Left />
  <Right />
</div>
```

### 📱 Container com Max Width

```tsx
<div className="container mx-auto px-4 max-w-7xl">
  {children}
</div>
```

---

## 7. Animações

### ✨ Motion (Framer Motion fork)

```tsx
import { motion, AnimatePresence } from "motion/react"

{/* Fade in */}
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.3 }}
>
  Content
</motion.div>

{/* Slide up */}
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.2, ease: "easeOut" }}
>
  Content
</motion.div>

{/* Exit animations */}
<AnimatePresence>
  {isVisible && (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      Content
    </motion.div>
  )}
</AnimatePresence>

{/* Layout animations */}
<motion.div layout>
  {/* Automaticamente anima mudanças de layout */}
</motion.div>
```

### 🎭 Tailwind Animations

```tsx
{/* Pulse (opacity loop) */}
<div className="animate-pulse" />

{/* Spin (rotação infinita) */}
<div className="animate-spin" />

{/* Ping (scale + opacity) */}
<div className="animate-ping" />

{/* Bounce */}
<div className="animate-bounce" />

{/* Custom (via tailwindcss-animate plugin) */}
<div className="animate-in fade-in-0 zoom-in-95" />
<div className="animate-out fade-out-0 slide-out-to-top-2" />
```

### ⏱️ Transitions

```css
/* Durations */
duration-75
duration-100
duration-150
duration-200  /* MAIS COMUM */
duration-300
duration-500

/* Ease functions */
ease-linear
ease-in
ease-out      /* PREFERIDO */
ease-in-out

/* Multiple properties */
transition-all
transition-colors
transition-opacity
transition-transform
```

---

## 8. Gerenciamento de Estado

### ⚛️ Jotai (Atomic State)

```typescript
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai"
import { atomWithStorage } from "jotai/utils"

// Atom simples
const countAtom = atom(0)

// Atom com localStorage persistence
const themeAtom = atomWithStorage<"light" | "dark">("theme", "light")

// Atom derivado (computed)
const doubleCountAtom = atom((get) => get(countAtom) * 2)

// Atom write-only
const incrementAtom = atom(
  null,  // No read
  (get, set) => set(countAtom, get(countAtom) + 1)
)

// Uso em componente
function Component() {
  const [count, setCount] = useAtom(countAtom)
  const double = useAtomValue(doubleCountAtom)
  const increment = useSetAtom(incrementAtom)

  return (
    <div>
      <p>Count: {count}</p>
      <p>Double: {double}</p>
      <button onClick={() => setCount(c => c + 1)}>+1</button>
      <button onClick={increment}>Increment</button>
    </div>
  )
}
```

### 🐻 Zustand (Store State)

```typescript
import { create } from "zustand"
import { persist } from "zustand/middleware"

interface Store {
  count: number
  increase: () => void
  reset: () => void
}

const useStore = create<Store>()(
  persist(
    (set) => ({
      count: 0,
      increase: () => set((state) => ({ count: state.count + 1 })),
      reset: () => set({ count: 0 }),
    }),
    {
      name: "counter-storage",  // LocalStorage key
    }
  )
)

// Uso
function Component() {
  const count = useStore((state) => state.count)
  const increase = useStore((state) => state.increase)

  return (
    <button onClick={increase}>
      Count: {count}
    </button>
  )
}
```

### 🔄 React Query (Server State)

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

// Query
function Component() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["todos"],
    queryFn: fetchTodos,
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return <TodoList todos={data} />
}

// Mutation
function CreateTodo() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: createTodo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] })
    },
  })

  return (
    <button onClick={() => mutation.mutate({ title: "New Todo" })}>
      {mutation.isPending ? "Creating..." : "Create"}
    </button>
  )
}
```

---

## 9. Tipografia e Ícones

### 🔤 Fontes

**Geist Sans & Geist Mono** (opcional - use suas fontes)

```css
:root {
  --font-geist-sans: 'Geist Sans', system-ui, -apple-system, sans-serif;
  --font-geist-mono: 'Geist Mono', ui-monospace, monospace;
}

body {
  font-family: var(--font-geist-sans);
}

code, pre {
  font-family: var(--font-geist-mono);
}
```

### 📐 Font Sizes (Tailwind)

```
text-xs    0.75rem (12px)
text-sm    0.875rem (14px)
text-base  1rem (16px)
text-lg    1.125rem (18px)
text-xl    1.25rem (20px)
text-2xl   1.5rem (24px)
text-3xl   1.875rem (30px)
```

### 🎨 Ícones

**Lucide React (preferencial):**

```tsx
import {
  Check,
  X,
  ChevronDown,
  Search,
  Menu,
  User,
  Settings
} from "lucide-react"

<Check className="h-4 w-4" />
<Search className="h-5 w-5 text-muted-foreground" />
```

**Radix Icons:**

```tsx
import { Cross2Icon, ChevronDownIcon } from "@radix-ui/react-icons"

<Cross2Icon />
```

**React Icons:**

```tsx
import { FiX, FiMenu } from "react-icons/fi"

<FiX size={16} />
```

---

## 10. Checklist de Implementação

### ✅ Setup Base

- [ ] Instalar dependências core (React, TypeScript, Tailwind)
- [ ] Configurar Tailwind + PostCSS
- [ ] Criar `globals.css` com CSS variables
- [ ] Implementar `cn()` utility function
- [ ] Instalar Radix UI primitives
- [ ] Configurar CVA para variantes

### ✅ Sistema de Cores

- [ ] Definir paleta de cores no `:root`
- [ ] Definir paleta dark mode no `.dark`
- [ ] **Customizar `--primary`** com cor da sua marca
- [ ] Testar contraste de cores (WCAG AA)
- [ ] Implementar ThemeProvider (next-themes)

### ✅ Componentes Essenciais

- [ ] Button (todas variantes)
- [ ] Input
- [ ] Label
- [ ] Checkbox
- [ ] Switch
- [ ] Dialog
- [ ] Tabs
- [ ] Tooltip
- [ ] Badge
- [ ] (Adicione conforme necessidade)

### ✅ Animações

- [ ] Instalar Motion library
- [ ] Configurar AnimatePresence
- [ ] Adicionar transitions em interações

### ✅ Estado

- [ ] Configurar Jotai para UI state
- [ ] Configurar Zustand para stores
- [ ] Configurar React Query para server state

### ✅ Ícones e Tipografia

- [ ] Instalar Lucide React
- [ ] Configurar fontes customizadas (opcional)
- [ ] Definir tamanhos padrão de ícones

### ✅ Polimento

- [ ] Customizar scrollbar
- [ ] Implementar Toast notifications (Sonner)
- [ ] Adicionar loading states
- [ ] Testar responsividade
- [ ] Testar acessibilidade (foco, ARIA)

---

## 🎉 Conclusão

Você agora tem **TUDO** para replicar o sistema UI/UX do 1Code:

1. **Stack completo** com versões exatas
2. **Configuração** de Tailwind e PostCSS
3. **Sistema de cores** completo (light + dark)
4. **Componentes** prontos para copiar
5. **Padrões** de estilização e animação
6. **Estado** com Jotai, Zustand e React Query
7. **Checklist** para implementação

### 🔗 Recursos Adicionais

- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Radix UI Docs](https://www.radix-ui.com/primitives)
- [Motion Docs](https://motion.dev)
- [Jotai Docs](https://jotai.org)
- [shadcn/ui](https://ui.shadcn.com) - Inspiração para componentes

---

**Última atualização:** Janeiro 2026
**Versão do projeto:** 0.0.22
