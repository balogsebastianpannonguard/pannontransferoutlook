import { redirect } from "next/navigation";
import { getDispatcherProfile, requireAuthSession } from "@/lib/auth";
import CalendarApp from "./components/calendar/CalendarApp";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await requireAuthSession();
  if (!session) redirect("/login");

  const user = await getDispatcherProfile(session);
  return <CalendarApp user={{ name: user.name, email: user.email, role: user.role }} />;
}
