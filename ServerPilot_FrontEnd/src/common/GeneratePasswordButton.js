import React from 'react';
import { Button } from '@mui/material';
import { useTranslation } from 'react-i18next';


// Helper function to generate a strong password
function generateStrongPassword(length = 14) {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const all = upper + lower + numbers + symbols;
  let password = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ];
  for (let i = password.length; i < length; i++) {
    password.push(all[Math.floor(Math.random() * all.length)]);
  }
  // Shuffle password
  return password.sort(() => Math.random() - 0.5).join('');
}

/**
 * Props:
 * - onGenerate: function (receives generated password)
 * - disabled: boolean
 * - sx: style overrides
 */
export default function GeneratePasswordButton({ onGenerate, disabled, sx }) {
  const { t, i18n } = useTranslation();
  return (
    <Button
      onClick={() => onGenerate(generateStrongPassword())}
      size="small"
      sx={{
        ml: 1,
        minWidth: 0,
        p: '2px 8px',
        borderRadius: 2,
        fontSize: '0.75rem',
        background: 'linear-gradient(45deg,#FE6B8B 30%,#FF8E53 90%)',
        color: '#fff',
        boxShadow: '0 1px 2px 1px rgba(255,105,135,.2)',
        textTransform: 'none',
        ...sx,
      }}
      disabled={disabled}
      tabIndex={-1}
    >
      {t('common.generate')}
    </Button>
  );
}