# Toast Notifications Plan

## Library: `sonner`
- Install: `npm install sonner` in `client/`
- 3.5KB, zero dependencies, React 18 native

## Setup
**`client/src/components/layout/Layout.tsx`**
- Import `{ Toaster }` from `sonner`
- Add `<Toaster position="bottom-right" richColors />` alongside existing global modals

## Actions That Get Toasts

### VideoCard (`client/src/components/video/VideoCard.tsx`)
- Delete video → `toast.success('Video deleted')`
- Rename title → `toast.success('Title updated')`
- Errors → `toast.error(...)`

### VideoSetsPage (`client/src/pages/VideoSetsPage.tsx`)
- Rename set → `toast.success('Set renamed')`
- Delete set → `toast.success('Set deleted')`
- Errors → `toast.error(...)`
- Note: Create set navigates to set detail — no toast needed

### VideoSetDetailPage (`client/src/pages/VideoSetDetailPage.tsx`)
- Remove video from set → `toast.success('"[title]" removed from set')`
- Error → `toast.error('Failed to remove video')`

### ManageVideosPage (`client/src/pages/ManageVideosPage.tsx`)
- Add selected to existing set → `toast.success('{N} video(s) added to "[set name]"')`
- Create new set + add → `toast.success('Set "[name]" created and {N} video(s) added')`
- Errors → `toast.error(...)`

### SharingPage (`client/src/pages/SharingPage.tsx`)
- Add contact → `toast.success('Contact added')`
- Delete contact → `toast.success('Contact deleted')`
- Deactivate share → `toast.success('Share deactivated')`
- Reactivate share → `toast.success('Share reactivated')`
- Delete share → `toast.success('Share removed')`
- Errors → `toast.error(...)`

### TextReportPage (`client/src/pages/TextReportPage.tsx`)
- Regenerate success → `toast.success('Report regenerated')`
- Regenerate error → `toast.error('Failed to regenerate report')`

### VideoDetailPage (`client/src/pages/VideoDetailPage.tsx`)
- Annotations auto-saved (debounced) → `toast.success('Annotations saved', { duration: 1500 })`
- Transcription error → `toast.error('Transcription failed')`

## Intentionally Skipped (already have sufficient feedback)
- Add to set (RecordPage + VideoCard) → redirects to set detail page
- RecordPage save video → post-save modal
- DataAnalysisPage generate → navigates to report
- VideoDetailPage transcribe → live ProgressBar
- RecordPage upload → ProgressBar with %
