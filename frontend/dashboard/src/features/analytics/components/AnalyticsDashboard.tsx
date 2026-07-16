'use client';

import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useAnalyticsSummary } from '../hooks/useAnalytics';
import { StatCard } from './StatCard';

export function AnalyticsDashboard() {
  const { data, isLoading, error, refetch } = useAnalyticsSummary();

  return (
    <>
      <PageHeader title="Analytics" subtitle="Chatbot usage and accuracy at a glance" />

      {error ? (
        <ErrorState error={error as Error} onRetry={() => refetch()} />
      ) : (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard label="Total conversations" value={data ? data.total_conversations.toLocaleString() : ''} loading={isLoading} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard label="Active users" value={data ? data.total_users.toLocaleString() : ''} loading={isLoading} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard label="Avg. accuracy" value={data ? `${Math.round(data.avg_accuracy * 100)}%` : ''} loading={isLoading} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard label="Avg. response time" value={data ? `${data.avg_response_ms} ms` : ''} loading={isLoading} />
            </Grid>
          </Grid>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Conversations (last 7 days)</Typography>
            {isLoading ? (
              <LoadingState />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data?.conversations_by_day ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#1e4620" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </>
      )}
    </>
  );
}
