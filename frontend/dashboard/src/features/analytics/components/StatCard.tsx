'use client';

import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';

export function StatCard({ label, value, loading }: { label: string; value: string; loading?: boolean }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      {loading ? <Skeleton width={80} height={40} /> : <Typography variant="h4" fontWeight={700}>{value}</Typography>}
    </Paper>
  );
}
