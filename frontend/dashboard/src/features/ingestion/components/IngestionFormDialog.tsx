'use client';

/**
 * Exact match: api/v1/ingestion.py + api/v1/schemas/ingestion.py
 *   POST /ingestion/text -> IngestTextIn  { text, name?, security_level?, department_id? }
 *   POST /ingestion/file -> multipart: file, security_level? (Form), department_id? (Form)
 *                            NOTE: no `name` field here — backend uses file.filename.
 *   POST /ingestion/s3   -> IngestS3In    { s3_key, security_level?, department_id? }
 *                            NOTE: no `name` field here either.
 * SecurityLevel enum values are UPPERCASE (PUBLIC/PRIVATE/SECRET).
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
import { useIngestText, useIngestFile, useIngestS3 } from '../hooks/useIngestion';
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
  const saving = ingestText.isPending || ingestFile.isPending || ingestS3.isPending;

  const [tab, setTab] = useState<'text' | 'file' | 's3'>('text');
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [s3Key, setS3Key] = useState('');
  const [securityLevel, setSecurityLevel] = useState<SecurityLevel>('PUBLIC');
  const [departmentId, setDepartmentId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setTab('text'); setName(''); setText(''); setFile(null); setS3Key('');
    setSecurityLevel('PUBLIC'); setDepartmentId(''); setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const department_id = departmentId || undefined;
      if (tab === 'text') {
        await ingestText.mutateAsync({ text, name: name || undefined, security_level: securityLevel, department_id });
      } else if (tab === 'file') {
        if (!file) return;
        await ingestFile.mutateAsync({ file, meta: { security_level: securityLevel, department_id } });
      } else {
        await ingestS3.mutateAsync({ s3_key: s3Key, security_level: securityLevel, department_id });
      }
      reset();
      onClose();
    } catch {
      setError('Ingestion failed. Check the backend logs / Network tab for the exact 422 detail.');
    }
  };

  return (
    <Dialog open={open} onClose={() => { reset(); onClose(); }} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Ingest content</DialogTitle>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 3 }}>
          <Tab label="Text" value="text" />
          <Tab label="File" value="file" />
          <Tab label="S3" value="s3" />
        </Tabs>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '16px !important' }}>
          {error && <Alert severity="error">{error}</Alert>}

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

          <TextField select label="Security level" value={securityLevel} onChange={(e) => setSecurityLevel(e.target.value as SecurityLevel)} fullWidth>
            {SECURITY_LEVELS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </TextField>
          <TextField
            label="Department ID (optional)" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? 'Ingesting…' : 'Ingest'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
