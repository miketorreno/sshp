import { Card } from "@/components/ui/card";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

const AuthLayout = async ({ children }: { children: React.ReactNode }) => {
  const session = await getSession();

  if (session) redirect("/");

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">{children}</Card>
    </div>
  );
};

export default AuthLayout;
