import React from 'react';
import IconButton from '@mui/material/IconButton';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

/**
 * Props:
 * - visible: boolean (is password visible)
 * - onClick: function (toggle handler)
 * - ariaLabel: string (for accessibility)
 * - tabIndex: number (optional, default -1)
 * - edge: string (optional, e.g. "end")
 */
export default function ShowPasswordIconButton({
  visible,
  onClick,
  ariaLabel = 'toggle password visibility',
  tabIndex = -1,
  edge = 'end',
  ...props
}) {
  return (
    <IconButton
      aria-label={ariaLabel}
      onClick={onClick}
      edge={edge}
      tabIndex={tabIndex}
      {...props}
    >
      {visible ? <VisibilityOff /> : <Visibility />}
    </IconButton>
  );
}