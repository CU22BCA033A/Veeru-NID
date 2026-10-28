/**
 * Create (or update) the two accounts. (On Vercel you can use the /setup page instead.)
 *   npm run setup:users -- --student-username Veeru04 --student-password '…' --mentor-username GB-mentor --mentor-password '…'
 * Optional: --student-name Veeru --mentor-name GB
 */
import { ensureAccount } from "../lib/seed/base";
import { adminClient, arg } from "./_env";
import { loginToEmail } from "../lib/username";

async function main() {
  const se = arg("student-username"), sp = arg("student-password");
  const me = arg("mentor-username"), mp = arg("mentor-password");
  if (!se || !sp || !me || !mp) {
    console.error("Usage: npm run setup:users -- --student-username … --student-password … --mentor-username … --mentor-password …");
    process.exit(1);
  }
  if (sp.length < 8 || mp.length < 8) throw new Error("Passwords must be at least 8 characters");
  const db = adminClient();
  await ensureAccount(db, { email: loginToEmail(se), password: sp, role: "student", name: arg("student-name") ?? "Veeru" });
  console.log(`✓ student: ${se}`);
  await ensureAccount(db, { email: loginToEmail(me), password: mp, role: "mentor", name: arg("mentor-name") ?? "GB" });
  console.log(`✓ mentor: ${me}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
