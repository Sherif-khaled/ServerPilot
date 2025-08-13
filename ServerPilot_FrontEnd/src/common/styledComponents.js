import { styled, Paper } from '@mui/material';

// Common styled components and styling constants
export const textFieldSx = {
  '& .MuiOutlinedInput-root': {
    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.6)' },
    '&.Mui-focused fieldset': { borderColor: '#FE6B8B' },
    color: 'white',
    borderRadius: '12px',
  },
  '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#FE6B8B' },
  '& .MuiFormHelperText-root': { color: 'rgba(255, 255, 255, 0.7)' }
};

export const switchSx = {
  '& .MuiSwitch-switchBase.Mui-checked': {
    color: '#FE6B8B',
  },
  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
    backgroundColor: '#FE6B8B',
  },
};

export const checkBoxSx = {
  color: 'rgba(255, 255, 255, 0.7)',
  '&.Mui-checked': {
    color: '#FE6B8B',
    '& .MuiSvgIcon-root': {
      border: '2px solid #FE6B8B',
      borderRadius: '3px',
    }
  },
  '&.Mui-checked:hover': {
    backgroundColor: 'rgba(254, 107, 139, 0.1)',
  },
  '& .MuiSvgIcon-root': {
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '3px',
  }
}
export const SelectSx = {

  background: 'rgba(255, 255, 255, 0.05)',
  backdropFilter: 'blur(12px) saturate(180%)',
  WebkitBackdropFilter: 'blur(12px)', 
  border: '1px solid rgba(255,255,255,0.125)',
  borderRadius: 2,
  color: '#fff',
  boxShadow: '0 8px 32px rgba(0,0,0,.37)',
}
export const formControlSx = {
  '& .MuiOutlinedInput-root': {
    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.6)' },
    '&.Mui-focused fieldset': { borderColor: '#FE6B8B' },
    color: 'white',
    borderRadius: '12px',
  },
  '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#FE6B8B' },
  '& .MuiFormHelperText-root': { color: 'rgba(255, 255, 255, 0.7)' }
};

export const glassCardSx = {
  background: 'rgba(38, 50, 56, 0.6)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  borderRadius: '12px',
  border: '1px solid rgba(255, 255, 255, 0.125)',
  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
  color: '#fff',
  width: '100%',
  p: 3,
  mb: 3,
};

export const glassPaperSx = {
  background: 'rgba(255, 255, 255, 0.08)',
  backdropFilter: 'blur(12px) saturate(180%)',
  WebkitBackdropFilter: 'blur(12px) saturate(180%)',
  borderRadius: '12px',
  border: '1px solid rgba(255, 255, 255, 0.125)',
  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
  color: '#fff',
  width: '100%',
  p: 3,
  mb: 3,
};

export const glassDialogSx = styled(Paper)(({ theme }) => ({
  background: 'linear-gradient(45deg, #0f2027, #203a43, #2c5364)',
  backdropFilter: 'blur(8px) saturate(160%)',
  WebkitBackdropFilter: 'blur(8px) saturate(160%)',
  borderRadius: '12px',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  boxShadow: '0 2px 12px rgba(0, 0, 0, 0.2)',
  padding: theme.spacing(3),
  color: '#fff',
}));

export const gradientButtonSx = {
  background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
  boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
  color: 'white',
  borderRadius: '25px',
  padding: '10px 25px',
  '&:disabled': {
    background: 'rgba(255, 255, 255, 0.3)',
  },
};

export const blueGradientButtonSx = {
  background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
  color: '#fff',
};

export const CircularProgressSx = {
  color: '#FE6B8B',
  size: 18,
};

export const MenuActionsSx = {

  background: 'rgba(40, 50, 70, 0.95)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '8px',
  color: '#fff',
  minWidth: '180px',
  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
  marginTop: '4px',
  '& .MuiMenuItem-root': {
    padding: '12px 16px',
    fontSize: '0.875rem',
    '&:hover': {
      background: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '4px',
      margin: '2px 8px',
      width: 'calc(100% - 16px)',
    }
  },
  '& .MuiListItemIcon-root': {
    minWidth: '36px',
  }
};