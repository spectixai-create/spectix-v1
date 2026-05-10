import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

describe('BUGFIX-INTAKE-UPLOAD-001', () => {
  it('does not render the pre-submit intake document picker', () => {
    const source = readFileSync('components/intake/intake-form.tsx', 'utf8');

    expect(source).not.toContain('SectionDocuments');
    expect(source).not.toContain('MockUploadedFile');
    expect(source).not.toContain('handleAddFiles');
    expect(source).not.toContain('handleRemoveFile');
  });

  it('keeps the post-submit supporting-documents uploader on the success panel', () => {
    const source = readFileSync(
      'components/intake/states/success-panel.tsx',
      'utf8',
    );

    expect(source).toContain('DocumentUploader');
    expect(source).toContain('uploadClaimId');
    expect(source).toContain('מסמכים תומכים');
  });

  it('keeps the real upload endpoint wired through DocumentUploader', () => {
    const source = readFileSync(
      'components/intake/document-uploader.tsx',
      'utf8',
    );

    expect(source).toContain('fetch(`/api/claims/${claimId}/documents`');
    expect(source).toContain('const formData = new FormData()');
  });
});
