/**
 * Seed the 3 study participants.
 *
 * EDIT the passwords below before running, then:
 *   npx tsx server/src/scripts/seedUsers.ts
 *
 * Re-running is safe: existing users (matched by username) are updated in place.
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../config/env';
import { User } from '../models/User';

// ⬇️  CHANGE THESE PASSWORDS  ⬇️
const USERS = [
  { username: 'participant1', password: 'pass1', displayName: 'Participant 1' },
  { username: 'participant2', password: 'pass2', displayName: 'Participant 2' },
  { username: 'participant3', password: 'pass3', displayName: 'Participant 3' },
];

async function run() {
  await mongoose.connect(config.mongoUri);
  console.log('Connected to', config.mongoUri);

  for (const u of USERS) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    const doc = await User.findOneAndUpdate(
      { username: u.username.toLowerCase() },
      { username: u.username.toLowerCase(), passwordHash, displayName: u.displayName },
      { upsert: true, new: true },
    );
    console.log(`Seeded user: ${doc.username} (id ${doc._id})`);
  }

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
