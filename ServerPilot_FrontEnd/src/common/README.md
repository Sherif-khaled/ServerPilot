# Common Components

This directory contains reusable components and hooks that can be used throughout the application.

## Components

### CustomSnackbar

A reusable snackbar component with glassmorphic styling that matches the application's theme.

#### Usage

```jsx
import { CustomSnackbar, useSnackbar } from '../../../common';

function MyComponent() {
  const { snackbar, showSuccess, showError, showWarning, showInfo, hideSnackbar } = useSnackbar();

  const handleSuccess = () => {
    showSuccess('Operation completed successfully!');
  };

  const handleError = () => {
    showError('Something went wrong!');
  };

  return (
    <div>
      <button onClick={handleSuccess}>Show Success</button>
      <button onClick={handleError}>Show Error</button>
      
      <CustomSnackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={hideSnackbar}
      />
    </div>
  );
}
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | `false` | Whether the snackbar is open |
| `message` | `string` | `''` | The message to display |
| `severity` | `'success' \| 'error' \| 'warning' \| 'info'` | `'success'` | The severity level |
| `onClose` | `function` | - | Function to call when snackbar closes |
| `autoHideDuration` | `number` | `6000` | Duration in milliseconds before auto-hiding |
| `anchorOrigin` | `object` | `{ vertical: 'bottom', horizontal: 'center' }` | Position of the snackbar |
| `sx` | `object` | `{}` | Additional styles to apply |

## Hooks

### useSnackbar

A custom hook for managing snackbar state and providing easy-to-use functions for showing different types of messages.

#### Usage

```jsx
import { useSnackbar } from '../../../common';

function MyComponent() {
  const { 
    snackbar, 
    showSuccess, 
    showError, 
    showWarning, 
    showInfo, 
    hideSnackbar 
  } = useSnackbar();

  // Use the functions to show messages
  const handleSuccess = () => showSuccess('Success message!');
  const handleError = () => showError('Error message!');
  const handleWarning = () => showWarning('Warning message!');
  const handleInfo = () => showInfo('Info message!');

  return (
    <div>
      {/* Your component content */}
    </div>
  );
}
```

#### Returns

| Property | Type | Description |
|----------|------|-------------|
| `snackbar` | `object` | Snackbar state object `{ open, message, severity }` |
| `showSuccess` | `function` | Function to show success message |
| `showError` | `function` | Function to show error message |
| `showWarning` | `function` | Function to show warning message |
| `showInfo` | `function` | Function to show info message |
| `hideSnackbar` | `function` | Function to hide snackbar |

## Styling

The components use glassmorphic styling that matches the application's theme:

- **Success**: Green background (`rgba(76, 175, 80, 0.9)`)
- **Error**: Red background (`rgba(211, 47, 47, 0.9)`)
- **Warning**: Orange background (`rgba(255, 152, 0, 0.9)`)
- **Info**: Blue background (`rgba(33, 150, 243, 0.9)`)

All components include backdrop blur effects and semi-transparent backgrounds for a modern glassmorphic look.
