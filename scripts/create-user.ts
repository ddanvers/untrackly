import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { users } from "../server/database/schema";
import { db } from "../server/utils/db";

// Usage: npx tsx scripts/create-user.ts <username> <password> <displayName>

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.error(
      "Usage: npx tsx scripts/create-user.ts <username> <password> <displayName>",
    );
    process.exit(1);
  }

  const [username, password, displayName] = args;

  console.log(`Creating user: ${username}`);

  // Check if user exists
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  if (existing) {
    console.error("User already exists!");
    process.exit(1);
  }

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  await db.insert(users).values({
    username,
    passwordHash,
    displayName,
  });

  console.log("User created successfully!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
