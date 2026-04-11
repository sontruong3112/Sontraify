import bcrypt from "bcryptjs";
import { User } from "../models/User.js";

const normalizeEmail = (value = "") => String(value || "").trim().toLowerCase();

export const ensureBootstrapAdmin = async () => {
  const name = String(process.env.SEED_ADMIN_NAME || "Demo Admin").trim();
  const email = normalizeEmail(process.env.SEED_ADMIN_EMAIL);
  const password = String(process.env.SEED_ADMIN_PASSWORD || "");

  if (!email || !password) {
    console.log("Bootstrap admin skipped: missing SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await User.findOneAndUpdate(
    { email },
    {
      name,
      email,
      role: "admin",
      passwordHash,
      refreshTokenHash: null,
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  console.log(`Bootstrap admin ensured: ${email}`);
};
