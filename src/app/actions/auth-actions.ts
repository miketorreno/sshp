"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const signUp = async (name: string, email: string, password: string) => {
  console.debug("signUp called with:", { name, email });
  const result = await auth.api.signUpEmail({
    body: {
      name,
      email,
      password,
      callbackURL: "/",
    },
  });
  console.debug("signUp result:", result);
  return result;
};

const signIn = async (email: string, password: string) => {
  console.debug("signIn called with:", { email });
  const result = await auth.api.signInEmail({
    body: { email, password, callbackURL: "/" },
  });
  console.debug("signIn result:", result);
  return result;
};

const signOut = async () => {
  console.debug("signOut called");
  const result = await auth.api.signOut({
    headers: await headers(),
  });
  console.debug("signOut result:", result);
  return result;
};

export { signUp, signIn, signOut };
