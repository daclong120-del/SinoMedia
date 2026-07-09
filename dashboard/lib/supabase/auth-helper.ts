import { createClientServer } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
}

function isDevMockAllowed(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.ENABLE_MOCK_AUTH === "true";
}

/**
 * Gets the current user from the session, supporting both the mock session and the actual Supabase session.
 */
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const mockSession = cookieStore.get("sb-mock-session")?.value;

  if (mockSession === "true" && isDevMockAllowed()) {
    const mockUserEmail = cookieStore.get("sb-mock-user")?.value || "admin@sinomedia.vn";
    return {
      id: "mock-user-id-9999",
      email: mockUserEmail,
      user_metadata: {},
      app_metadata: {},
      aud: "authenticated",
      created_at: new Date().toISOString()
    } as import("@supabase/supabase-js").User;
  }

  const supabase = await createClientServer();
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch (err) {
    console.warn("auth-helper: getUser failed", err);
    return null;
  }
}

/**
 * Requires a user session. If not logged in, redirects to login.
 */
export async function requireUser(): Promise<UserProfile> {
  const user = await getCurrentUser();
  if (!user || !user.email) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const mockSession = cookieStore.get("sb-mock-session")?.value;

  if (mockSession === "true" && isDevMockAllowed()) {
    return {
      id: user.id,
      email: user.email,
      name: "Mock Admin",
      role: "admin"
    };
  }

  const supabase = await createClientServer();
  
  // Get member info
  const { data: member, error: memberError } = (await supabase
    .from("team_members")
    .select("role_id")
    .eq("user_id", user.id)
    .single()) as unknown as { data: { role_id: string | null } | null; error: Error | null };

  if (memberError || !member) {
    redirect("/login");
  }

  // Get profile info
  const { data: profile } = (await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single()) as unknown as { data: { name: string | null } | null };

  const profileName = profile?.name || user.email.split("@")[0];

  return {
    id: user.id,
    email: user.email,
    name: profileName,
    role: member.role_id || "user"
  };
}

/**
 * Requires the current user to be an admin.
 */
export async function requireAdmin(): Promise<UserProfile> {
  const userProfile = await requireUser();
  if (userProfile.role !== "admin") {
    redirect("/dash/home?error=unauthorized");
  }
  return userProfile;
}
