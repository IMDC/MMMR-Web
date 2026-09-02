/**
 * Resets preferences for all 5 participants.
 * Only touches aiConsent, autoTranscribe, summaryFormat — videos and analysis are NOT affected.
 *
 * Run from the backend container terminal:
 *   npx tsx src/scripts/resetParticipants4and5.ts
 */
import mongoose from 'mongoose';
import { config } from '../config/env';
import { User } from '../models/User';

async function run() {
  await mongoose.connect(config.mongoUri);
  console.log('Connected to', config.mongoUri);

  const result = await User.updateMany(
    { username: { $in: ['participant1', 'participant2', 'participant3', 'participant4', 'participant5'] } },
    { $set: { aiConsent: null, autoTranscribe: null, summaryFormat: 'both' } },
  );

  console.log(`Reset preferences for ${result.modifiedCount} user(s).`);
  await mongoose.disconnect();
  console.log('Done.');
}

run().catch(err => {
  console.error('Reset failed:', err);
  process.exit(1);
});
