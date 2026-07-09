import { requireAdmin } from "@/lib/supabase/auth-helper";
import SettingsClient from "./settings-client";

export default async function SettingsPage() {
  await requireAdmin();
  return <SettingsClient />;
}
