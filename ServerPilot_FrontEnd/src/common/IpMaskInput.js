import React from 'react'
import MaskedInput from 'react-text-mask'
import { TextField } from '@mui/material'

// React Text Mask adapter compatible with MUI TextField's inputComponent API
const MaskAdapter = React.forwardRef(function MaskAdapter(props, ref) {
  const { onChange, ...other } = props
  return (
    <MaskedInput
      {...other}
      ref={(instance) => {
        const input = instance ? instance.inputElement : null
        if (typeof ref === 'function') ref(input)
        else if (ref) ref.current = input
      }}
      // Guides like 000.000.000.000; value can be fewer digits while typing
      mask={[ /\d/, /\d/, /\d/, '.', /\d/, /\d/, /\d/, '.', /\d/, /\d/, /\d/, '.', /\d/, /\d/, /\d/ ]}
      guide={false}
      placeholderChar={'\u2000'}
      // Ensure each octet is 0-255
      pipe={(value) => {
        const parts = value.split('.')
        if (parts.length > 4) return false
        for (const p of parts) {
          if (p === '') continue
          const n = Number(p)
          if (Number.isNaN(n) || n < 0 || n > 255) return false
        }
        return value
      }}
    />
  )
})

// Material UI-friendly IP mask input component
const IpMaskInput = React.forwardRef(function IpMaskInput(props, ref) {
  const { label = 'IP Address', placeholder = '___.___.___.___', sx, error, helperText, InputProps, ...textFieldProps } = props
  return (
    <TextField
      {...textFieldProps}
      inputRef={ref}
      label={label}
      placeholder={placeholder}
      fullWidth
      sx={sx}
      error={error}
      helperText={helperText}
      InputProps={{ ...(InputProps || {}), inputComponent: MaskAdapter }}
    />
  )
})

export default IpMaskInput