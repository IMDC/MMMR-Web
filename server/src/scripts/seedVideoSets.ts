/**
 * Seed default video sets for all users.
 *
 * Safe to re-run: skips any set whose name already exists for that user.
 * Users can rename sets after seeding — this script only checks the original names.
 *
 * Run from the project root:
 *   npx tsx server/src/scripts/seedVideoSets.ts
 */
import mongoose from 'mongoose';
import { config } from '../config/env';
import { User } from '../models/User';
import { VideoSet } from '../models/VideoSet';

const DEFAULT_SETS = [
  'Work',
  'Holiday',
  'Social',
  'Family & Friends',
  'Entertainment',
  'Errands & Household',
];

async function run() {
  await mongoose.connect(config.mongoUri);
  console.log('Connected to', config.mongoUri);

  const users = await User.find({});
  console.log(`Found ${users.length} user(s)\n`);

  for (const user of users) {
    console.log(`→ ${user.username} (${user._id})`);

    // Find which default set names this user already has
    const existing = await VideoSet.find({
      userId: user._id,
      name: { $in: DEFAULT_SETS },
    }).select('name');
    const existingNames = new Set(existing.map(s => s.name));

    const toCreate = DEFAULT_SETS.filter(name => !existingNames.has(name));

    if (toCreate.length === 0) {
      console.log('  All default sets already exist — skipping');
      continue;
    }

    const docs = toCreate.map(name => ({
      userId: user._id,
      name,
      datetime: new Date(),
      videoIDs: [],
    }));

    await VideoSet.insertMany(docs);
    console.log(`  Created: ${toCreate.join(', ')}`);
    if (existingNames.size > 0) {
      console.log(`  Already existed: ${[...existingNames].join(', ')}`);
    }
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

run().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
