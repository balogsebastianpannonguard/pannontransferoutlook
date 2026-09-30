// Generates a new personal direct-login link for a staff user.
//
//   node --env-file=.env.local scripts/create-direct-link.mjs tripa.renata@pannonguard.hu https://naptar.example.hu
//   node --env-file=.env.local scripts/create-direct-link.mjs tripa.renata@pannonguard.hu https://naptar.example.hu --confirm
//
// Without --confirm this is a dry run and nothing is written. The staff_users collection is shared
// with the dispatcher app, so a new token replaces (and invalidates) the user's previous link.
import { createHash, randomBytes } from "node:crypto";
import { MongoClient } from "mongodb";

const [email, baseUrl, ...flags] = process.argv.slice(2);
const confirm = flags.includes("--confirm");

if (!email || !baseUrl) {
  console.error("Usage: create-direct-link.mjs <email> <base-url> [--confirm]");
  process.exit(1);
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;
if (!uri || !dbName) {
  console.error("MONGODB_URI and MONGODB_DB are required (run with --env-file=.env.local).");
  process.exit(1);
}

const client = new MongoClient(uri);
try {
  await client.connect();
  const col = client.db(dbName).collection("staff_users");
  const user = await col.findOne({ email: email.trim().toLowerCase() });
  if (!user) {
    console.error(`No staff user with email ${email}.`);
    process.exit(1);
  }
  if (user.role !== "admin" && user.role !== "dispatcher") {
    console.error(`${email} has role "${user.role}"; only admin and dispatcher accounts can use the calendar.`);
    process.exit(1);
  }

  const token = randomBytes(32).toString("hex");
  const link = `${baseUrl.replace(/\/+$/, "")}/login?token=${token}`;

  if (!confirm) {
    console.log(`Dry run: would replace the direct link of ${user.name ?? email} (${user.role}). Re-run with --confirm.`);
    process.exit(0);
  }

  await col.updateOne(
    { _id: user._id },
    {
      $set: {
        directLoginTokenHash: createHash("sha256").update(token).digest("hex"),
        directLoginCreatedAt: Date.now(),
        updatedAt: Date.now(),
      },
    }
  );
  console.log(`New direct link for ${user.name ?? email}:\n${link}`);
} finally {
  await client.close();
}
