/**
 * Copy one account's videos into every other account.
 *
 * Used to give every study participant the same demo/tutorial recordings:
 * record them once (e.g. as `anay`), then fan them out. Each target gets its
 * OWN copy of the file and its own VideoData document, because
 * VideoData.filename is globally unique and deleteVideo removes the file from
 * the owner's folder — sharing one file would let one participant's delete
 * break everybody else's copy.
 *
 * Transcript, sentiment, analysis output, frequency data and annotations are
 * copied as-is, so the clones need no re-transcription and cost no API calls.
 * Set membership is mirrored by set NAME (the 6 default sets exist for every
 * seeded user), and a missing set is created.
 *
 *   npx tsx src/scripts/cloneVideos.ts --from anay --limit 2 --dry-run
 *   npx tsx src/scripts/cloneVideos.ts --from anay --limit 2
 *   npx tsx src/scripts/cloneVideos.ts --from anay --to 25-4,25-8
 *
 * Re-runnable: a target that already has a video with the same title and
 * recording timestamp is skipped, so an interrupted run can just be repeated.
 */
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env';
import { User } from '../models/User';
import { VideoData } from '../models/VideoData';
import { VideoSet } from '../models/VideoSet';
import { userUploadDir, ensureUserUploadDir } from '../utils/userPaths';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

const FROM = (arg('from') || 'anay').toLowerCase();
const LIMIT = arg('limit') ? parseInt(arg('limit')!, 10) : undefined;
const TO = arg('to');
const DRY_RUN = process.argv.includes('--dry-run');

// Content fields worth carrying over. Deliberately excludes _id, userId,
// filename and the timestamps, which are per-copy.
const COPY_FIELDS = [
  'title', 'datetimeRecorded', 'duration', 'textComments', 'locations',
  'emotionStickers', 'keywords', 'painKeyword', 'numericPainScale',
  'isTranscribed', 'transcript', 'sentiment', 'biasAdjustedSentiment',
  'tsOutputBullet', 'tsOutputSentence', 'bulletSentiments', 'flagged_for_harm',
  'frequencyData', 'bulletPointsLocked', 'videoSummary', 'videoTopics',
] as const;

async function run() {
  await mongoose.connect(config.mongoUri);
  console.log('Connected to', config.mongoUri);

  const source = await User.findOne({ username: FROM });
  if (!source) {
    console.error(`No such user: ${FROM}`);
    process.exit(1);
  }
  const sourceId = source._id as mongoose.Types.ObjectId;

  // Newest first, so --limit 2 means "the two most recent recordings".
  let q = VideoData.find({ userId: sourceId }).sort({ datetimeRecorded: -1 });
  if (LIMIT) q = q.limit(LIMIT);
  const sourceVideos = await q;

  if (sourceVideos.length === 0) {
    console.error(`${FROM} has no videos to copy.`);
    process.exit(1);
  }

  const targetQuery = TO
    ? { username: { $in: TO.split(',').map(s => s.trim().toLowerCase()) } }
    : { _id: { $ne: sourceId } };
  const targets = (await User.find(targetQuery).select('username').sort({ username: 1 }))
    .filter(u => String(u._id) !== String(sourceId));

  console.log(
    `\nSource: ${FROM} — ${sourceVideos.length} video(s):\n` +
    sourceVideos.map(v => `  • ${v.title} (${v.filename}, transcribed: ${v.isTranscribed})`).join('\n') +
    `\n\nTargets: ${targets.length} account(s)` +
    (TO ? `: ${targets.map(t => t.username).join(', ')}` : ' (every account except the source)') +
    `\nTotal copies: ${sourceVideos.length * targets.length}` +
    (DRY_RUN ? '\n\n--dry-run: nothing will be written.\n' : '\n'),
  );

  if (DRY_RUN) {
    await mongoose.disconnect();
    return;
  }

  // Which of the source's sets each video belongs to, resolved to set names.
  const sourceSets = await VideoSet.find({ userId: sourceId }).select('name videoIDs');
  const setNamesFor = (videoId: mongoose.Types.ObjectId) =>
    sourceSets.filter(s => s.videoIDs.some(id => String(id) === String(videoId))).map(s => s.name);

  let created = 0, skipped = 0, failed = 0;

  for (const target of targets) {
    const targetId = target._id as mongoose.Types.ObjectId;
    const targetDir = ensureUserUploadDir(String(targetId));
    const madeThisUser: string[] = [];

    for (const src of sourceVideos) {
      const already = await VideoData.findOne({
        userId: targetId,
        title: src.title,
        datetimeRecorded: src.datetimeRecorded,
      }).select('_id');
      if (already) {
        skipped++;
        continue;
      }

      const srcPath = path.join(userUploadDir(String(sourceId)), src.filename);
      if (!fs.existsSync(srcPath)) {
        console.error(`  ! missing source file, skipping: ${srcPath}`);
        failed++;
        continue;
      }

      const filename = `${uuidv4()}${path.extname(src.filename)}`;
      fs.copyFileSync(srcPath, path.join(targetDir, filename));

      const doc: Record<string, any> = { userId: targetId, filename };
      for (const f of COPY_FIELDS) doc[f] = (src as any)[f];

      let clone;
      try {
        clone = await VideoData.create(doc);
      } catch (err) {
        // Roll the file back so a failed insert doesn't leave an orphan.
        fs.rmSync(path.join(targetDir, filename), { force: true });
        throw err;
      }
      created++;
      madeThisUser.push(src.title);

      // Mirror set membership by name, creating the set if this user lacks it.
      for (const name of setNamesFor(src._id as mongoose.Types.ObjectId)) {
        await VideoSet.findOneAndUpdate(
          { userId: targetId, name },
          {
            $addToSet: { videoIDs: clone._id },
            $setOnInsert: { userId: targetId, name, datetime: new Date() },
          },
          { upsert: true },
        );
      }
    }

    console.log(
      madeThisUser.length > 0
        ? `✓ ${target.username}: copied ${madeThisUser.length} (${madeThisUser.join(', ')})`
        : `- ${target.username}: nothing to do (already had them)`,
    );
  }

  await mongoose.disconnect();
  console.log(`\nDone. Created ${created}, skipped ${skipped} already-present, ${failed} failed.`);
}

run().catch(err => {
  console.error('Clone failed:', err);
  process.exit(1);
});
