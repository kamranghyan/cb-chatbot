'use client';

/**
 * Field names match src/services/analytics_service.py exactly:
 *   summary() -> { total_chats, total_conversations, avg_response_time (sec),
 *                  feedback: {likes, dislikes}, ingestions_by_status, cached }
 *   daily(days) -> [{ day, conversations, avg_response_time (sec) }]
 */
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useAnalyticsSummary, useAnalyticsDaily, useDailyRange } from '../hooks/useAnalytics';
import { StatCard } from './StatCard';

export function AnalyticsDashboard() {
  const { data: summary, isLoading: summaryLoading, error: summaryError, refetch: refetchSummary } = useAnalyticsSummary();
  const [days, setDays] = useDailyRange(14);
  const { data: daily, isLoading: dailyLoading } = useAnalyticsDaily(days);

  return (
    <>
      <PageHeader title="Analytics" subtitle="GET /analytics/summary (cached 60s) + /analytics/daily" />

      {summaryError ? (
        <ErrorState error={summaryError as Error} onRetry={() => refetchSummary()} />
      ) : (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard label="Total chats" value={summary ? summary.total_chats.toLocaleString() : ''} loading={summaryLoading} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard label="Total conversations" value={summary ? summary.total_conversations.toLocaleString() : ''} loading={summaryLoading} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                label="Feedback (👍/👎)"
                value={summary ? `${summary.feedback.likes} / ${summary.feedback.dislikes}` : ''}
                loading={summaryLoading}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                label="Avg. response time"
                value={summary?.avg_response_time != null ? `${summary.avg_response_time.toFixed(2)} s` : '—'}
                loading={summaryLoading}
              />
            </Grid>
          </Grid>

          {summary && Object.keys(summary.ingestions_by_status).length > 0 && (
            <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
              {Object.entries(summary.ingestions_by_status).map(([status, count]) => (
                <Chip key={status} label={`${status}: ${count}`} size="small" variant="outlined" />
              ))}
            </Stack>
          )}

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={700}>Conversations per day</Typography>
              <ToggleButtonGroup size="small" value={days} exclusive onChange={(_, v) => v && setDays(v)}>
                <ToggleButton value={7}>7d</ToggleButton>
                <ToggleButton value={14}>14d</ToggleButton>
                <ToggleButton value={30}>30d</ToggleButton>
                <ToggleButton value={90}>90d</ToggleButton>
              </ToggleButtonGroup>
            </Stack>
            {dailyLoading ? (
              <LoadingState />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={daily ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tickFormatter={(d) => String(d).slice(5)} />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="conversations" stroke="#1e4620" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </>
      )}
    </>
  );
}
