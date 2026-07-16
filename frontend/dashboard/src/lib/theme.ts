'use client';

import { createTheme } from '@mui/material/styles';

/** Central MUI theme — brand changes happen here only. */
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1e4620' },
    secondary: { main: '#8b5cf6' },
    background: { default: '#f4f5f7' },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
  },
});
