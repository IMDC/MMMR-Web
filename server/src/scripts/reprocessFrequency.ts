/**
 * Recompute frequencyData for every transcribed video.
 *
 * Stored counts are written once at transcription time, so a change to the
 * counting rules does not reach existing videos until they are reprocessed.
 * Run this after any edit to frequencyService.
 *
 *   npx tsx src/scripts/reprocessFrequency.ts --dry-run   # show what would change
 *   npx tsx src/scripts/reprocessFrequency.ts             # write
 *   npx tsx src/scripts/reprocessFrequency.ts --user anay # one account only
 *
 * Only frequencyData is touched — transcripts, sentiment and analysis output are
 * left alone, and the recomputation is pure (no API calls, no cost).
 */
import mongoose from 'mongoose';
import { config } from '../config/env';
import { User } from '../models/User';
import { VideoData } from '../models/VideoData';
import { processTranscriptToFrequency } from '../services/frequencyService';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}
const DRY_RUN = process.argv.includes('--dry-run');
const ONLY_USER = arg('user');

async function run() {
  await mongoose.connect(config.mongoUri);
  console.log('Connected to', config.mongoUri);

  const query: Record<string, unknown> = { isTranscribed: true };
  if (ONLY_USER) {
    const u = await User.findOne({ username: ONLY_USER.toLowerCase() });
    if (!u) {
      console.error(`No such user: ${ONLY_USER}`);
      process.exit(1);
    }
    query.userId = u._id;
  }

  const videos = await VideoData.find(query).select('title transcript frequencyData');
  console.log(`${videos.length} transcribed video(s)${ONLY_USER ? ` for ${ONLY_USER}` : ''}\n`);

  let changed = 0, same = 0, emptyTranscript = 0;

  for (const v of videos) {
    if (!v.transcript?.trim()) { emptyTranscript++; continue; }

    const next = processTranscriptToFrequency(v.transcript, 1);
    const nextJson = JSON.stringify(next);
    if (nextJson === v.frequencyData) { same++; continue; }

    changed++;
    // Report the words whose counts actually moved, so the effect is visible
    // rather than a bare "updated" line.
    let before: Record<string, number> = {};
    try { before = JSON.parse(v.frequencyData || '{}'); } catch { /* treat as empty */ }
    const deltas = [...new Set([...Object.keys(before), ...Object.keys(next)])]
      .map(w => ({ w, from: before[w] ?? 0, to: next[w] ?? 0 }))
      .filter(d => d.from !== d.to)
      .sort((a, b) => Math.abs(b.from - b.to) - Math.abs(a.from - a.to))
      .slice(0, 6)
      .map(d => `${d.w} ${d.from}->${d.to}`)
      .join(', ');

    console.log(`${DRY_RUN ? '[dry-run] ' : ''}${v.title}: ${deltas}`);
    if (!DRY_RUN) {
      await VideoData.findByIdAndUpdate(v._id, { frequencyData: nextJson });
    }
  }

  console.log(
    `\n${DRY_RUN ? 'Would update' : 'Updated'} ${changed}, unchanged ${same}` +
    (emptyTranscript ? `, skipped ${emptyTranscript} with no transcript` : '') + '.',
  );
  if (DRY_RUN) console.log('Nothing was written — re-run without --dry-run to apply.');

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Reprocess failed:', err);
  process.exit(1);
});
