# Component Migration Guide

## Migrating to New UI Components

### Button Component Migration

**Old Pattern:**
```typescript
<button
  onClick={handleClick}
  disabled={isLoading}
  className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded">
  Save
</button>
```

**New Pattern:**
```typescript
import { Button } from '@/components/ui';

<Button
  variant="primary"
  size="md"
  onClick={handleClick}
  disabled={isLoading}
>
  Save
</Button>
```

**Available Props:**
- `variant`: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
- `size`: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
- `loading`: boolean - shows spinner, disables button
- `fullWidth`: boolean - makes button 100% width
- `leftIcon`: React.ReactNode - icon before text
- `rightIcon`: React.ReactNode - icon after text

**Examples:**
```typescript
// Primary button
<Button variant="primary" onClick={save}>Save</Button>

// Success button with icon
<Button variant="success" rightIcon={<Check />}>Done</Button>

// Ghost button
<Button variant="ghost" onClick={cancel}>Cancel</Button>

// Loading button
<Button loading={isLoading}>Processing...</Button>

// Danger button
<Button variant="danger" onClick={delete}>Delete</Button>
```

---

### Input Component Migration

**Old Pattern:**
```typescript
<input
  type="text"
  value={name}
  onChange={(e) => setName(e.target.value)}
  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded"
/>
{hasError && <p className="text-red-500">{error}</p>}
```

**New Pattern:**
```typescript
import { Input } from '@/components/ui';

<Input
  variant="default"
  size="md"
  label="Name"
  value={name}
  onChange={(e) => setName(e.target.value)}
  error={hasError}
  helperText="Enter your name"
/>
```

**Available Props:**
- `variant`: 'default' | 'filled' | 'outlined'
- `size`: 'sm' | 'md' | 'lg'
- `label`: string - label above input
- `error`: boolean - shows error state
- `helperText`: string - text below input
- `leftIcon`: React.ReactNode - icon inside input
- `rightIcon`: React.ReactNode - icon inside input

**Examples:**
```typescript
// Basic input
<Input value={name} onChange={(e) => setName(e.target.value)} />

// With label and error
<Input
  label="Email"
  value={email}
  onChange={setEmail}
  error={!isValidEmail(email)}
  helperText="Enter your email address"
/>

// With icon
<Input
  label="Search"
  leftIcon={<Search />}
  value={search}
  onChange={setSearch}
/>
```

---

### Card Component Migration

**Old Pattern:**
```typescript
<div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
  <h3>Title</h3>
  <p>Content</p>
  <div className="flex justify-between mt-4">
    <Button>Cancel</Button>
    <Button>Save</Button>
  </div>
</div>
```

**New Pattern:**
```typescript
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui';

<Card variant="elevated" size="md">
  <CardHeader>Title</CardHeader>
  <CardBody>
    <p>Content</p>
  </CardBody>
  <CardFooter>
    <Button variant="ghost" onClick={cancel}>Cancel</Button>
    <Button variant="primary" onClick={save}>Save</Button>
  </CardFooter>
</Card>
```

**Available Props:**
- `variant`: 'default' | 'elevated' | 'outlined' | 'filled'
- `size`: 'sm' | 'md' | 'lg'
- `onClick`: () => void - makes card clickable

**Sub-components:**
- `Card` - Main container
- `CardHeader` - Top section with optional close button
- `CardBody` - Content area
- `CardFooter` - Action bar at bottom

---

### Dialog Component Migration

**Old Pattern:**
```typescript
{isOpen && (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
    <div className="bg-gray-900 border border-gray-700 rounded-lg">
      <h3>Title</h3>
      <p>Content</p>
      <button onClick={onClose}>Close</button>
    </div>
  </div>
)}
```

**New Pattern:**
```typescript
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui';

<Dialog
  isOpen={isOpen}
  onClose={onClose}
  title="Dialog Title"
  size="md"
>
  <DialogBody>
    <p>Content</p>
  </DialogBody>
  <DialogFooter>
    <Button variant="primary" onClick={onConfirm}>Confirm</Button>
    <Button variant="ghost" onClick={onClose}>Cancel</Button>
  </DialogFooter>
</Dialog>
```

**Available Props:**
- `isOpen`: boolean - controls visibility
- `onClose`: () => void - close handler
- `title`: string - dialog title
- `size`: 'sm' | 'md' | 'lg' | 'xl' | 'full'
- `showCloseButton`: boolean - show/hide close button

**Sub-components:**
- `Dialog` - Main dialog component
- `DialogHeader` - Title bar
- `DialogBody` - Content area
- `DialogFooter` - Action bar

---

## Utility Migration

### Clipboard Utilities

**Old Pattern:**
```typescript
const handleCopy = async () => {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied!');
  } catch (err) {
    console.error('Failed to copy:', err);
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
};
```

**New Pattern:**
```typescript
import { copyToClipboard } from '@/utils';

const handleCopy = async () => {
  const success = await copyToClipboard(text);
  if (success) {
    showToast('Copied to clipboard');
  } else {
    showToast('Failed to copy');
  }
};
```

### Debounce

**Old Pattern:**
```typescript
const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

const handleSearch = (value: string) => {
  clearTimeout(timeoutId);
  const newTimeout = setTimeout(() => {
    // Search logic
  }, 300);
  setTimeoutId(newTimeout);
};
```

**New Pattern:**
```typescript
import { debounce } from '@/utils';

const debouncedSearch = debounce((value: string) => {
  // Search logic
}, 300);

// Usage
<input onChange={(e) => debouncedSearch(e.target.value)} />
```

### Local Storage

**Old Pattern:**
```typescript
const getTheme = () => {
  try {
    return localStorage.getItem('theme') || 'dark';
  } catch (err) {
    return 'dark';
  }
};

const setTheme = (theme: string) => {
  try {
    localStorage.setItem('theme', theme);
  } catch (err) {
    console.error('Failed to save theme:', err);
  }
};
```

**New Pattern:**
```typescript
import { useLocalStorage } from '@/utils';

const [theme, setTheme] = useLocalStorage('theme', 'dark');

// Or direct functions
import { getLocalStorage, setLocalStorage } from '@/utils';

const currentTheme = getLocalStorage<string>('theme', 'dark');
setLocalStorage('theme', 'light');
```

---

## Theme System Usage

### Using Theme

```typescript
import { useTheme } from '@/context/ThemeContext';

const { theme, toggleTheme, config } = useTheme();

// Access theme values
const bgColor = config.bgPrimary;
const textColor = config.textPrimary;
const primaryColor = config.primary;

// Toggle theme
<button onClick={toggleTheme}>
  {theme === 'dark' ? '☀️' : '🌙'}
</button>

// Use CSS variables
<div style={{ backgroundColor: 'var(--color-bg-primary)' }}>
  <span style={{ color: 'var(--color-text-primary)' }}>
    Content
  </span>
</div>
```

### Theme Selector Component

```typescript
import { useTheme, Theme } from '@/context/ThemeContext';

const ThemeSelector: React.FC = () => {
  const { theme, setTheme } = useTheme();
  
  const themes: { name: Theme; icon: string }[] = [
    { name: 'light', icon: '☀️' },
    { name: 'dark', icon: '🌙' }
  ];
  
  return (
    <div>
      {themes.map((t) => (
        <button
          key={t.name}
          onClick={() => setTheme(t.name)}
          className={`p-2 ${theme === t.name ? 'ring-2' : ''}`}
        >
          {t.icon}
        </button>
      ))}
    </div>
  );
};
```

---

## Keyboard Shortcuts Usage

### Basic Setup

```typescript
import { useKeyboardShortcuts } from '@/utils';

const shortcuts = [
  {
    key: 's',
    ctrl: true,
    description: 'Save',
    handler: (e) => {
      console.log('Saving...');
    }
  },
  {
    key: 'z',
    ctrl: true,
    description: 'Undo',
    handler: (e) => {
      console.log('Undoing...');
    }
  }
];

const Component = () => {
  useKeyboardShortcuts(shortcuts);
  
  return <div>Content</div>;
};
```

### Advanced - Conditional Enabling

```typescript
const Component = () => {
  const [enabled, setEnabled] = useState(true);
  
  useKeyboardShortcuts(shortcuts, enabled);
  
  return (
    <div>
      <button onClick={() => setEnabled(!enabled)}>
        {enabled ? 'Disable shortcuts' : 'Enable shortcuts'}
      </button>
    </div>
  );
};
```

---

## Migration Checklist

### Phase 1: Button Migration
- [ ] Replace 5% of inline buttons
- [ ] Test replaced buttons
- [ ] Fix any issues
- [ ] Replace next 5%
- [ ] Repeat until 100%

### Phase 2: Input Migration
- [ ] Replace 5% of inline inputs
- [ ] Test replaced inputs
- [ ] Fix any issues
- [ ] Replace next 5%
- [ ] Repeat until 100%

### Phase 3: Modal Migration
- [ ] Replace 10% of inline modals
- [ ] Test replaced modals
- [ ] Fix any issues
- [ ] Replace next 10%
- [ ] Repeat until 100%

### Phase 4: Utility Migration
- [ ] Replace clipboard code
- [ ] Replace debounce code
- [ ] Replace localStorage code
- [ ] Test all changes

### Phase 5: Theme Integration
- [ ] Add theme-aware classes
- [ ] Use CSS variables instead of hardcoded colors
- [ ] Test light/dark mode
- [ ] Verify all components work in both themes

---

## Benefits Summary

1. **Consistency:** All components use same patterns
2. **Maintainability:** One source of truth for each component
3. **Type Safety:** Full TypeScript support
4. **Accessibility:** Built-in ARIA support
5. **Theme Support:** Works with light/dark mode automatically
6. **Code Reduction:** Less duplicate code
7. **Faster Development:** Reuse existing components

---

## Common Mistakes to Avoid

1. **Don't mix old and new patterns** - Migrate completely
2. **Don't skip testing** - Verify functionality after migration
3. **Don't ignore TypeScript errors** - Fix them before commit
4. **Don't forget accessibility** - New components handle this
5. **Don't hardcode colors** - Use CSS variables from theme
6. **Don't ignore loading states** - Use component's loading prop
7. **Don't ignore error states** - Use component's error prop
