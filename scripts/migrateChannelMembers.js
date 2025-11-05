import dotenv from 'dotenv';

import connectToDb from '../backend/db/config.js';
import Channel from '../backend/models/channelModel.js';

dotenv.config();

const run = async () => {
  try {
    // If connectToDb handles mongoose connect, call it; otherwise use mongoose.connect directly.
    await connectToDb(); // your existing DB bootstrap

    console.log("Connected to DB. Starting migration for Channel.members...");

    const all = await Channel.find({});
    console.log(`Found ${all.length} channels.`);

    let updated = 0;

    for (const ch of all) {
      const hasMembers = Array.isArray(ch.members) && ch.members.length > 0;
      if (!hasMembers) {
        // populate members with createdBy (if present)
        const creator = ch.createdBy ? ch.createdBy : null;
        if (creator) {
          ch.members = [creator];
          await ch.save();
          updated++;
          console.log(
            `Updated channel ${ch._id} - set members to [createdBy].`
          );
        } else {
          // no createdBy: skip or set empty array
          ch.members = [];
          await ch.save();
          console.log(
            `Updated channel ${ch._id} - createdBy missing, set empty members.`
          );
        }
      }
    }

    console.log(`Migration complete. Updated ${updated} channels.`);
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
};

run();
