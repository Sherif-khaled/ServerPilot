# ConfirmDialog Component

A reusable confirmation dialog component with consistent glass-morphism styling that can be used throughout the project.

## Features

- **Consistent Styling**: Glass-morphism design with backdrop blur and transparency
- **Customizable**: Configurable title, message, button text, and severity
- **Severity Levels**: Different colors for info, warning, error, and success states
- **Responsive**: Automatically adjusts to content and screen size
- **Accessible**: Proper focus management and keyboard navigation

## Usage

### Basic Usage

```jsx
import { ConfirmDialog } from '../../../common';

const [confirmOpen, setConfirmOpen] = useState(false);

const handleConfirm = () => {
  // Your confirmation logic here
  setConfirmOpen(false);
};

<ConfirmDialog
  open={confirmOpen}
  onClose={() => setConfirmOpen(false)}
  onConfirm={handleConfirm}
  title="Confirm Action"
  message="Are you sure you want to proceed?"
  confirmText="Yes, Proceed"
  cancelText="Cancel"
/>
```

### With Different Severity Levels

```jsx
// Info (default) - Pink gradient
<ConfirmDialog
  open={confirmOpen}
  onClose={() => setConfirmOpen(false)}
  onConfirm={handleConfirm}
  title="Confirm Profile Update"
  message="Are you sure you want to save these changes?"
  severity="info"
/>

// Warning - Orange gradient
<ConfirmDialog
  open={confirmOpen}
  onClose={() => setConfirmOpen(false)}
  onConfirm={handleConfirm}
  title="Confirm Deletion"
  message="This action cannot be undone. Are you sure?"
  severity="warning"
/>

// Error - Red gradient
<ConfirmDialog
  open={confirmOpen}
  onClose={() => setConfirmOpen(false)}
  onConfirm={handleConfirm}
  title="Confirm Critical Action"
  message="This will permanently delete all data. Continue?"
  severity="error"
/>

// Success - Green gradient
<ConfirmDialog
  open={confirmOpen}
  onClose={() => setConfirmOpen(false)}
  onConfirm={handleConfirm}
  title="Confirm Operation"
  message="Ready to proceed with the operation?"
  severity="success"
/>
```

### Custom Button Properties

```jsx
<ConfirmDialog
  open={confirmOpen}
  onClose={() => setConfirmOpen(false)}
  onConfirm={handleConfirm}
  title="Custom Buttons"
  message="With custom button properties"
  confirmButtonProps={{
    disabled: loading,
    startIcon: <SaveIcon />,
  }}
  cancelButtonProps={{
    disabled: loading,
    startIcon: <CloseIcon />,
  }}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | - | Controls dialog visibility |
| `onClose` | `function` | - | Called when dialog should close |
| `onConfirm` | `function` | - | Called when confirm button is clicked |
| `title` | `string` | "Confirm Action" | Dialog title |
| `message` | `string` | "Are you sure you want to proceed?" | Dialog message |
| `confirmText` | `string` | "Confirm" | Confirm button text |
| `cancelText` | `string` | "Cancel" | Cancel button text |
| `confirmButtonProps` | `object` | `{}` | Props passed to confirm button |
| `cancelButtonProps` | `object` | `{}` | Props passed to cancel button |
| `severity` | `string` | "info" | Severity level: "info", "warning", "error", "success" |
| `...props` | - | - | Additional props passed to Dialog component |

## Styling

The component uses the project's glass-morphism theme with:
- Semi-transparent background with backdrop blur
- Rounded corners and subtle borders
- Consistent color scheme matching the app theme
- Hover effects and smooth transitions
- Responsive design for different screen sizes

## Examples in the Project

- **UserProfile.js**: Confirming profile updates
- **ServerList.js**: Confirming server deletions
- **ApplicationLogsDialog.js**: Confirming log operations
- **ApplicationMonitorDialog.js**: Confirming monitoring actions

## Migration from Custom Dialogs

Replace custom styled dialogs with this component:

```jsx
// Before: Custom styled dialog
const StyledDialog = styled(Dialog)({...});
<StyledDialog open={open} onClose={onClose}>
  <DialogTitle>Title</DialogTitle>
  <DialogContent>Content</DialogContent>
  <DialogActions>Actions</DialogActions>
</StyledDialog>

// After: Reusable ConfirmDialog
<ConfirmDialog
  open={open}
  onClose={onClose}
  onConfirm={handleConfirm}
  title="Title"
  message="Content"
/>
```

