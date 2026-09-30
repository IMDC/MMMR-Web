/**
 * Seed all study participants, demo, QA and dev accounts.
 * Also seeds the 6 default video sets for every user.
 *
 * Credentials are NOT in this file. They are read from a gitignored TSV
 * (username <tab> password, one per line, # for comments) so this script can
 * live in a public repo. See participants.example.tsv for the format.
 * Resolution order:
 *   1. --users <path>
 *   2. $SEED_USERS_FILE
 *   3. <server root>/participants.tsv
 *
 * Safe to re-run: upserts users (resets password + mustChangePassword to true),
 * skips video sets that already exist. Existing videos are never touched.
 *
 *   npx tsx src/scripts/seedUsers.ts             # upsert the accounts in the file
 *   npx tsx src/scripts/seedUsers.ts --prune     # ...and delete accounts NOT in the file
 *   npx tsx src/scripts/seedUsers.ts --fresh     # delete EVERY existing account first
 *
 * --prune and --fresh are destructive: they remove the accounts' videos, video
 * sets, contacts, shares and upload folders too. Both ask for confirmation
 * unless --yes is passed (needed when piping into a non-interactive shell).
 */
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../config/env';
import { User } from '../models/User';
import { VideoData } from '../models/VideoData';
import { VideoSet } from '../models/VideoSet';
import { Contact } from '../models/Contact';
import { SharedContent } from '../models/SharedContent';
import { userUploadDir } from '../utils/userPaths';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

const PRUNE = process.argv.includes('--prune');
const FRESH = process.argv.includes('--fresh');
const ASSUME_YES = process.argv.includes('--yes') || process.argv.includes('-y');

const SERVER_ROOT = path.resolve(__dirname, '../..');
const USERS_FILE = path.resolve(
  arg('users') || process.env.SEED_USERS_FILE || path.join(SERVER_ROOT, 'participants.tsv'),
);

interface SeedUser { username: string; password: string }

/**
 * Parse the credentials file. Fields are separated by any run of whitespace,
 * which is forgiving of hand-editing; a line with more than two fields is an
 * error rather than a silent mangle, since that usually means a password
 * contains a space.
 */
function loadUsers(): SeedUser[] {
  if (!fs.existsSync(USERS_FILE)) {
    console.error(
      `Credentials file not found:\n  ${USERS_FILE}\n\n` +
      'This file is gitignored and must be copied to the host separately.\n' +
      'Point at another path with --users <path> or $SEED_USERS_FILE.\n' +
      'See participants.example.tsv for the format.',
    );
    process.exit(1);
  }

  const users: SeedUser[] = [];
  const seen = new Set<string>();

  fs.readFileSync(USERS_FILE, 'utf8').split('\n').forEach((raw, i) => {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) return;

    const fields = line.split(/\s+/);
    if (fields.length !== 2) {
      console.error(
        `${USERS_FILE}:${i + 1}: expected "username<tab>password", got ${fields.length} field(s).\n` +
        '  (a password containing a space cannot be represented in this format)',
      );
      process.exit(1);
    }

    const [username, password] = fields;
    const key = username.toLowerCase();
    if (seen.has(key)) {
      console.error(`${USERS_FILE}:${i + 1}: duplicate username "${username}".`);
      process.exit(1);
    }
    seen.add(key);
    users.push({ username, password });
  });

  if (users.length === 0) {
    console.error(`${USERS_FILE} contains no accounts.`);
    process.exit(1);
  }
  return users;
}

const DEFAULT_SETS = [
  'Work',
  'Holiday',
  'Social',
  'Family & Friends',
  'Entertainment',
  'Errands & Household',
];

async function confirm(question: string): Promise<boolean> {
  if (ASSUME_YES) return true;
  if (!process.stdin.isTTY) {
    console.error('Refusing to run a destructive seed non-interactively without --yes.');
    return false;
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise<string>(resolve => rl.question(question, resolve));
  rl.close();
  return answer.trim().toLowerCase() === 'yes';
}

/** Delete these users and everything belonging to them, files included. */
async function deleteUsers(users: { _id: mongoose.Types.ObjectId; username: string }[]) {
  const ids = users.map(u => u._id);
  const [v, s, c, sh] = await Promise.all([
    VideoData.deleteMany({ userId: { $in: ids } }),
    VideoSet.deleteMany({ userId: { $in: ids } }),
    Contact.deleteMany({ userId: { $in: ids } }),
    SharedContent.deleteMany({ userId: { $in: ids } }),
  ]);
  for (const id of ids) {
    fs.rmSync(userUploadDir(String(id)), { recursive: true, force: true });
  }
  await User.deleteMany({ _id: { $in: ids } });
  console.log(
    `Deleted ${users.length} accounts and their data ` +
    `(${v.deletedCount} videos, ${s.deletedCount} sets, ${c.deletedCount} contacts, ${sh.deletedCount} shares).`,
  );
}

async function seedVideoSetsForUser(userId: mongoose.Types.ObjectId) {
  const existing = await VideoSet.find({ userId, name: { $in: DEFAULT_SETS } }).select('name');
  const existingNames = new Set(existing.map(s => s.name));
  const toCreate = DEFAULT_SETS.filter(name => !existingNames.has(name));

  if (toCreate.length === 0) {
    console.log('  Video sets: all already exist — skipping');
    return;
  }

  await VideoSet.insertMany(
    toCreate.map(name => ({ userId, name, datetime: new Date(), videoIDs: [] })),
  );
  console.log(`  Video sets created: ${toCreate.join(', ')}`);
}

async function run() {
  if (PRUNE && FRESH) {
    console.error('Pass either --prune or --fresh, not both.');
    process.exit(1);
  }

  const USERS = loadUsers();
  console.log(`Loaded ${USERS.length} accounts from ${USERS_FILE}`);

  await mongoose.connect(config.mongoUri);
  console.log('Connected to', config.mongoUri);

  if (FRESH || PRUNE) {
    const wanted = USERS.map(u => u.username.toLowerCase());
    const doomed = await User.find(
      FRESH ? {} : { username: { $nin: wanted } },
    ).select('username') as unknown as { _id: mongoose.Types.ObjectId; username: string }[];

    if (doomed.length === 0) {
      console.log(FRESH ? 'No existing accounts to delete.' : 'No stale accounts to prune.');
    } else {
      console.log(
        `\n${FRESH ? 'About to delete EVERY existing account' : 'These accounts are not in the seed file'} ` +
        `(${doomed.length}):\n  ${doomed.map(u => u.username).join(', ')}\n` +
        'Their videos, sets, contacts, shares and uploaded files will be deleted.\n',
      );
      if (!(await confirm('Type "yes" to continue: '))) {
        console.log('Aborted — nothing was deleted.');
        await mongoose.disconnect();
        process.exit(1);
      }
      await deleteUsers(doomed);
    }
  }

  console.log(`\nSeeding ${USERS.length} users...\n`);
  for (const u of USERS) {
    const username = u.username.toLowerCase();
    const passwordHash = await bcrypt.hash(u.password, 10);
    const doc = await User.findOneAndUpdate(
      { username },
      {
        $set: {
          username,
          passwordHash,
          displayName: u.username,
          mustChangePassword: true,
        },
        // Clear onboarding state so returning users are re-prompted for
        // consent/transcription exactly as they were on first seed.
        $unset: {
          aiConsent: '',
          autoTranscribe: '',
          summaryFormat: '',
          recordingInfoDismissed: '',
        },
      },
      { upsert: true, new: true },
    );
    console.log(`✓ ${doc.username} (${doc._id})`);
    await seedVideoSetsForUser(doc._id as mongoose.Types.ObjectId);
  }

  await mongoose.disconnect();
  console.log('\nDone. All users seeded with mustChangePassword: true and default video sets.');
}

run().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
