'use client';

/**
 * Exact match: api/v1/ingestion.py + api/v1/schemas/ingestion.py
 *   POST /ingestion/text -> IngestTextIn  { text, name?, security_level?, department_id? }
 *   POST /ingestion/file -> multipart: file, security_level? (Form), department_id? (Form)
 *                            NOTE: no `name` field here — backend uses file.filename.
 *   POST /ingestion/s3   -> IngestS3In    { s3_key, security_level?, department_id? }
 *                            NOTE: no `name` field here either.
 * SecurityLevel enum values are UPPERCASE (PUBLIC/PRIVATE/SECRET).
 *
 * CAG tab: separate backend, separate pipeline (S3 + Redis, no pgvector, no
 * security_level/department_id — CAG has no RBAC filtering, see
 * src/api/v1/cag_ingest.py). Requires brand_id since CAG data is tenant-
 * scoped by S3 key path (clients/{brand_id}/cag/...), not by the logged-in
 * admin's own tenant implicitly.
 */
import { useState, type FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useIngestText, useIngestFile, useIngestS3, useIngestCagFile, useIngestCagText } from '../hooks/useIngestion';
import type { SecurityLevel } from '@/core/api/types';

const SECURITY_LEVELS: SecurityLevel[] = ['PUBLIC', 'PRIVATE', 'SECRET'];

interface IngestionFormDialogProps {
  open: boolean;
  onClose: () => void;
}

export function IngestionFormDialog({ open, onClose }: IngestionFormDialogProps) {
  const ingestText = useIngestText();
  const ingestFile = useIngestFile();
  const ingestS3 = useIngestS3();
  const ingestCagFile = useIngestCagFile();
  const ingestCagText = useIngestCagText();
  const saving =
    ingestText.isPending || ingestFile.isPending || ingestS3.isPending ||
    ingestCagFile.isPending || ingestCagText.isPending;

  const [tab, setTab] = useState<'text' | 'file' | 's3' | 'cag'>('text');
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [s3Key, setS3Key] = useState('');
  const [securityLevel, setSecurityLevel] = useState<SecurityLevel>('PUBLIC');
  const [departmentId, setDepartmentId] = useState('');
  const [error, setError] = useState<string | null>(null);

  // CAG-specific fields — kept separate from the RAG fields above since
  // CAG has no security_level/department_id concept at all.
  const [cagBrandId, setCagBrandId] = useState('');
  const [cagMode, setCagMode] = useState<'file' | 'text'>('file');
  const [cagFile, setCagFile] = useState<File | null>(null);
  const [cagFilename, setCagFilename] = useState('');
  const [cagContent, setCagContent] = useState('');
  const [cagResult, setCagResult] = useState<string | null>(null);

  const reset = () => {
    setTab('text'); setName(''); setText(''); setFile(null); setS3Key('');
    setSecurityLevel('PUBLIC'); setDepartmentId(''); setError(null);
    setCagBrandId(''); setCagMode('file'); setCagFile(null);
    setCagFilename(''); setCagContent(''); setCagResult(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setCagResult(null);
    try {
      const department_id = departmentId || undefined;
      if (tab === 'text') {
        await ingestText.mutateAsync({ text, name: name || undefined, security_level: securityLevel, department_id });
      } else if (tab === 'file') {
        if (!file) return;
        await ingestFile.mutateAsync({ file, meta: { security_level: securityLevel, department_id } });
      } else if (tab === 's3') {
        await ingestS3.mutateAsync({ s3_key: s3Key, security_level: securityLevel, department_id });
      } else {
        // CAG — stays open after success (shows docs_in_cache) instead of
        // closing immediately, since that count is useful confirmation.
        if (!cagBrandId) return;
        if (cagMode === 'file') {
          if (!cagFile) return;
          const res = await ingestCagFile.mutateAsync({ brandId: cagBrandId, file: cagFile });
          setCagResult(`Uploaded to ${res.data.s3_key} — ${res.data.docs_in_cache} doc(s) now cached for tenant ${res.data.brand_id}.`);
        } else {
          if (!cagFilename || !cagContent) return;
          const res = await ingestCagText.mutateAsync({ brandId: cagBrandId, filename: cagFilename, content: cagContent });
          setCagResult(`Uploaded to ${res.data.s3_key} — ${res.data.docs_in_cache} doc(s) now cached for tenant ${res.data.brand_id}.`);
        }
        return; // don't reset()/close() — let the admin see the result, upload another, or close manually
      }
      reset();
      onClose();
    } catch {
      setError('Ingestion failed. Check the backend logs / Network tab for the exact error detail.');
    }
  };

  return (
    <Dialog open={open} onClose={() => { reset(); onClose(); }} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Ingest content</DialogTitle>
        <Tabs value={tab} onChange={(_, v) => { setTab(v); setError(null); setCagResult(null); }} sx={{ px: 3 }}>
          <Tab label="Text" value="text" />
          <Tab label="File" value="file" />
          <Tab label="S3" value="s3" />
          <Tab label="CAG" value="cag" />
        </Tabs>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '16px !important' }}>
          {error && <Alert severity="error">{error}</Alert>}
          {cagResult && <Alert severity="success">{cagResult}</Alert>}

          {tab === 'text' && (
            <TextField
              label="Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth
              placeholder="inline-text (default)"
            />
          )}

          {tab === 'text' && (
            <TextField label="Text" value={text} onChange={(e) => setText(e.target.value)} required multiline minRows={5} fullWidth />
          )}
          {tab === 'file' && (
            <Box>
              <Button component="label" variant="outlined">
                {file ? file.name : 'Choose file (txt / md / pdf)'}
                <input type="file" accept=".txt,.md,.pdf" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </Button>
            </Box>
          )}
          {tab === 's3' && (
            <TextField label="S3 key" value={s3Key} onChange={(e) => setS3Key(e.target.value)} required fullWidth placeholder="uploads/document.pdf" />
          )}

          {tab === 'cag' && (
            <>
              <Typography variant="body2" color="text.secondary">
                Uploads a .md file to S3 (clients/&#123;brand_id&#125;/cag/) and refreshes that
                tenant&apos;s Redis cache. Separate from RAG above — no chunking, no
                embeddings, no security level.
              </Typography>
              <TextField
                label="Brand / tenant ID" value={cagBrandId} onChange={(e) => setCagBrandId(e.target.value)}
                required fullWidth placeholder="1"
                helperText="Which tenant this CAG document belongs to."
              />
              <Tabs value={cagMode} onChange={(_, v) => setCagMode(v)} sx={{ minHeight: 36 }}>
                <Tab label="File" value="file" sx={{ minHeight: 36, py: 0.5 }} />
                <Tab label="Paste text" value="text" sx={{ minHeight: 36, py: 0.5 }} />
              </Tabs>
              {cagMode === 'file' ? (
                <Box>
                  <Button component="label" variant="outlined">
                    {cagFile ? cagFile.name : 'Choose .md file'}
                    <input type="file" accept=".md" hidden onChange={(e) => setCagFile(e.target.files?.[0] ?? null)} />
                  </Button>
                </Box>
              ) : (
                <>
                  <TextField
                    label="Filename" value={cagFilename} onChange={(e) => setCagFilename(e.target.value)}
                    required fullWidth placeholder="cb-faq (.md added automatically)"
                  />
                  <TextField
                    label="Content (Markdown)" value={cagContent} onChange={(e) => setCagContent(e.target.value)}
                    required multiline minRows={5} fullWidth
                  />
                </>
              )}
            </>
          )}

          {tab !== 'cag' && (
            <>
              <TextField select label="Security level" value={securityLevel} onChange={(e) => setSecurityLevel(e.target.value as SecurityLevel)} fullWidth>
                {SECURITY_LEVELS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
              <TextField
                label="Department ID (optional)" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} fullWidth
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { reset(); onClose(); }}>{cagResult ? 'Done' : 'Cancel'}</Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? 'Ingesting…' : 'Ingest'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}