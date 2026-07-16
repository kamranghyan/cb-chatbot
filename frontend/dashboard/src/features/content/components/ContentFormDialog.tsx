'use client';

/**
 * Add-content dialog covering all three source types (document / website / video).
 * Documents "upload" against the presigned URL the mock/real backend returns —
 * same code path either way, so this form needs zero changes when the real
 * backend arrives.
 */
import { useState, type FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { useAddContent, useValidateWebsite } from '../hooks/useContentMutations';
import type { ContentItem } from '@/core/api/types';

const SOURCE_TYPES: ContentItem['source_type'][] = ['document', 'website', 'video'];
const BRANDS = ['carolina', 'minute', 'mahatma'];

interface ContentFormDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ContentFormDialog({ open, onClose }: ContentFormDialogProps) {
  const addContent = useAddContent();
  const validateWebsite = useValidateWebsite();

  const [sourceType, setSourceType] = useState<ContentItem['source_type']>('document');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [brand, setBrand] = useState(BRANDS[0]);
  const [file, setFile] = useState<File | null>(null);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setSourceType('document'); setTitle(''); setUrl(''); setBrand(BRANDS[0]);
    setFile(null); setVerified(null); setError(null);
  };

  const handleVerify = async () => {
    if (!url) return;
    try {
      const result = (await validateWebsite.mutateAsync(url)) as { valid?: boolean };
      setVerified(Boolean(result?.valid));
    } catch {
      setVerified(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const created = await addContent.mutateAsync({
        title: sourceType === 'document' ? (file?.name ?? title) : title || url,
        source_type: sourceType,
        url: sourceType !== 'document' ? url : undefined,
        brand,
      });

      // Document flow: PUT the file straight to the presigned URL the backend
      // returned. In mock mode this hits a fake S3 URL and is skipped safely;
      // against the real backend this is the actual upload.
      const presignedUrl = (created.data as ContentItem & { presigned_url?: string })?.presigned_url;
      if (sourceType === 'document' && file && presignedUrl && !presignedUrl.includes('mock-s3')) {
        await fetch(presignedUrl, { method: 'PUT', body: file });
      }

      reset();
      onClose();
    } catch {
      setError('Could not add content. Please try again.');
    }
  };

  return (
    <Dialog open={open} onClose={() => { reset(); onClose(); }} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Add content</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField select label="Source type" value={sourceType} onChange={(e) => setSourceType(e.target.value as ContentItem['source_type'])} fullWidth>
            {SOURCE_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>

          <TextField select label="Brand" value={brand} onChange={(e) => setBrand(e.target.value)} fullWidth>
            {BRANDS.map((b) => <MenuItem key={b} value={b}>{b}</MenuItem>)}
          </TextField>

          {sourceType === 'document' ? (
            <Box>
              <Button component="label" variant="outlined">
                {file ? file.name : 'Choose file'}
                <input type="file" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gap: 1 }}>
              <TextField
                label={sourceType === 'website' ? 'Website URL' : 'Video URL'}
                value={url}
                onChange={(e) => { setUrl(e.target.value); setVerified(null); }}
                required
                fullWidth
              />
              {sourceType === 'website' && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Button size="small" onClick={handleVerify} disabled={!url || validateWebsite.isPending}>
                    {validateWebsite.isPending ? <CircularProgress size={16} /> : 'Verify website'}
                  </Button>
                  {verified === true && <Typography variant="caption" color="success.main">Reachable ✓</Typography>}
                  {verified === false && <Typography variant="caption" color="error.main">Could not verify</Typography>}
                </Box>
              )}
              <TextField label="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={addContent.isPending}>
            {addContent.isPending ? 'Adding…' : 'Add content'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
