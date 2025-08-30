import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  styled,
  Box
} from '@mui/material';
import { gradientButtonSx, CancelButton } from '../common';;

const StyledDialog = styled(Dialog)({
  '& .MuiDialog-paper': {
    background: 'linear-gradient(45deg, #0f2027, #203a43, #2c5364)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    color: '#fff',
    minWidth: '400px',
  },
  '& .MuiDialogTitle-root': {
    color: '#fff',
    fontSize: '1.25rem',
    fontWeight: 600,
    padding: '24px 24px 16px 24px',
  },
  '& .MuiDialogContent-root': {
    color: '#fff',
    padding: '0 24px 16px 24px',
  },
  '& .MuiDialogContentText-root': {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: '1rem',
    lineHeight: 1.5,
  },
  '& .MuiDialogActions-root': {
    padding: '16px 24px 24px 24px',
    gap: '12px',
  },
});

const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmButtonProps = {},
  cancelButtonProps = {},
  severity = "info", // "info", "warning", "error", "success"
  ...props
}) => {
  const getSeverityColor = () => {
    switch (severity) {
      case 'warning':
        return '#FF9800';
      case 'error':
        return '#F44336';
      case 'success':
        return '#4CAF50';
      default:
        return '#FE6B8B';
    }
  };

  const severityColor = getSeverityColor();

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      {...props}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Box>
          <CancelButton
            onClick={onClose}
            variant="outlined"
            color='error'
            
          >
            {cancelText}
          </CancelButton>
        </Box>
        <Box>
          <Button
            onClick={onConfirm}
            variant="contained"
            autoFocus
            sx={{
              ...gradientButtonSx,
              background: `linear-gradient(45deg, ${severityColor} 30%, ${severityColor}80 90%)`,
              '&:hover': {
                background: `linear-gradient(45deg, ${severityColor}80 30%, ${severityColor} 90%)`,
              },
            }}
            {...confirmButtonProps}
          >
            {confirmText}
          </Button>
        </Box>
      </DialogActions>
    </StyledDialog>
  );
};

export default ConfirmDialog;
