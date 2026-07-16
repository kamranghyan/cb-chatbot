import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Link from 'next/link';

export default function NotFound() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', textAlign: 'center', p: 3 }}>
      <Box>
        <Typography variant="h1" fontWeight={800} sx={{ fontSize: 96 }}>404</Typography>
        <Typography variant="h6" sx={{ mb: 3 }}>This page could not be found.</Typography>
        <Button component={Link} href="/" variant="contained">Go home</Button>
      </Box>
    </Box>
  );
}
