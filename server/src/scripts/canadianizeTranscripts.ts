/**
 * Rewrite stored US spellings as Canadian ones, across every text field that
 * holds transcribed or generated prose.
 *
 * Transcription now normalizes spelling as the transcript comes back from
 * Whisper, but that is forward-only: anything recorded before then still says
 * "behavior" and "center". Because word forms are deliberately never merged
 * ("ache" and "aching" stay separate entries), leaving the corpus mixed puts
 * `behavior` and `behaviour` in the word cloud as two unrelated entries for the
 * rest of the study. Hence this backfill.
 *
 *   npx tsx src/scripts/canadianizeTranscripts.ts --dry-run    # show what would change
 *   npx tsx src/scripts/canadianizeTranscripts.ts              # write
 *   npx tsx src/scripts/canadianizeTranscripts.ts --user anay  # one account only
 *
 * Fields touched, per video: transcript, tsOutputBullet, tsOutputSentence,
 * bulletSentiments, videoSummary, videoTopics — plus frequencyData, recomputed
 * from the rewritten transcript so the counts keep tracing back to it. Per
 * video set: summaryAnalysisBullet, summaryAnalysisSentence, bulletSentiments.
 *
 * No API calls and no cost — no Whisper, no OpenAI. Idempotent: a second run
 * finds nothing to change.
 *
 * Crisis detection is deliberately NOT re-run. No entry in
 * crisisService.HARMFUL_KEYWORDS has a US/Canadian spelling difference, so the
 * matches cannot move, and re-running it would risk re-flagging videos a
 * participant has already dismissed.
 */
import mongoose from 'mongoose';
import { config } from '../config/env';
import { User } from '../models/User';
import { VideoData } from '../models/VideoData';
import { VideoSet } from '../models/VideoSet';
import { canadianizeWithChanges, toCanadianEnglish } from '../services/canadianSpellingService';
import { processTranscriptToFrequency } from '../services/frequencyService';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}
const DRY_RUN = process.argv.includes('--dry-run');
const ONLY_USER = arg('user');

const VIDEO_TEXT_FIELDS = [
  'transcript',
  'tsOutputBullet',
  'tsOutputSentence',
  'bulletSentiments',
  'videoSummary',
] as const;

const SET_TEXT_FIELDS = ['summaryAnalysisBullet', 'summaryAnalysisSentence', 'bulletSentiments'] as const;

/** Every substitution made across the whole run, for the closing summary. */
const totals: Record<string, number> = {};

function record(changes: Record<string, number>) {
  for (const [k, n] of Object.entries(changes)) totals[k] = (totals[k] || 0) + n;
}

function describe(changes: Record<string, number>): string {
  return Object.entries(changes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([k, n]) => (n > 1 ? `${k} (${n})` : k))
    .join(', ');
}

async function run() {
  await mongoose.connect(config.mongoUri);
  console.log('Connected to', config.mongoUri);

  const videoQuery: Record<string, unknown> = {};
  const setQuery: Record<string, unknown> = {};
  if (ONLY_USER) {
    const u = await User.findOne({ username: ONLY_USER.toLowerCase() });
    if (!u) {
      console.error(`No such user: ${ONLY_USER}`);
      process.exit(1);
    }
    videoQuery.userId = u._id;
    setQuery.userId = u._id;
  }

  // ── Videos ────────────────────────────────────────────────────────────────
  const videos = await VideoData.find(videoQuery).select(
    'title transcript tsOutputBullet tsOutputSentence bulletSentiments videoSummary videoTopics frequencyData',
  );
  console.log(`${videos.length} video(s)${ONLY_USER ? ` for ${ONLY_USER}` : ''}\n`);

  let videosChanged = 0;

  for (const v of videos) {
    const update: Record<string, unknown> = {};
    const changes: Record<string, number> = {};

    for (const field of VIDEO_TEXT_FIELDS) {
      const current = (v as any)[field] as string | undefined;
      if (!current) continue;
      const { text, changes: fieldChanges } = canadianizeWithChanges(current);
      if (text !== current) {
        update[field] = text;
        record(fieldChanges);
        for (const [k, n] of Object.entries(fieldChanges)) changes[k] = (changes[k] || 0) + n;
      }
    }

    // Topics are short keyword strings, mapped word-for-word like the prose.
    if (v.videoTopics?.length) {
      const nextTopics = v.videoTopics.map(t => toCanadianEnglish(t));
      if (nextTopics.some((t, i) => t !== v.videoTopics[i])) update.videoTopics = nextTopics;
    }

    // Recount from the rewritten transcript, with the same minCount = 1 that
    // transcription writes, so the stored map stays comparable.
    if (update.transcript) {
      update.frequencyData = JSON.stringify(
        processTranscriptToFrequency(update.transcript as string, 1),
      );
    }

    if (Object.keys(update).length === 0) continue;

    videosChanged++;
    const fields = Object.keys(update).join(', ');
    const words = describe(changes);
    console.log(`${DRY_RUN ? '[dry-run] ' : ''}${v.title}: ${words || 'topics only'}  [${fields}]`);

    if (!DRY_RUN) await VideoData.findByIdAndUpdate(v._id, update);
  }

  // ── Video sets ────────────────────────────────────────────────────────────
  const sets = await VideoSet.find(setQuery).select('name summaryAnalysisBullet summaryAnalysisSentence bulletSentiments');
  let setsChanged = 0;

  for (const s of sets) {
    const update: Record<string, unknown> = {};
    const changes: Record<string, number> = {};

    for (const field of SET_TEXT_FIELDS) {
      const current = (s as any)[field] as string | undefined;
      if (!current) continue;
      const { text, changes: fieldChanges } = canadianizeWithChanges(current);
      if (text !== current) {
        update[field] = text;
        record(fieldChanges);
        for (const [k, n] of Object.entries(fieldChanges)) changes[k] = (changes[k] || 0) + n;
      }
    }

    if (Object.keys(update).length === 0) continue;

    setsChanged++;
    console.log(`${DRY_RUN ? '[dry-run] ' : ''}set "${(s as any).name}": ${describe(changes)}`);
    if (!DRY_RUN) await VideoSet.findByIdAndUpdate(s._id, update);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const substitutions = Object.values(totals).reduce((a, b) => a + b, 0);
  console.log(
    `\n${DRY_RUN ? 'Would update' : 'Updated'} ${videosChanged} video(s) and ${setsChanged} set(s), ` +
    `${substitutions} substitution(s).`,
  );
  if (substitutions > 0) console.log(`All: ${describe(totals)}${Object.keys(totals).length > 6 ? ', …' : ''}`);
  if (DRY_RUN) console.log('Nothing was written — re-run without --dry-run to apply.');

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Canadianize failed:', err);
  process.exit(1);
});
