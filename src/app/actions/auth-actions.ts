"use server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const signUp = async (name: string, email: string, password: string) => {
  const response = await auth.api.signUpEmail({
    body: {
      name,
      email,
      password,
      callbackURL: "/",
    },
  });

  return response;
};

const signIn = async (email: string, password: string) => {
  const response = await auth.api.signInEmail({
    body: {
      email,
      password,
      callbackURL: "/",
    },
  });

  return response;
};

const signOut = async () => {
  const response = await auth.api.signOut({
    headers: await headers(),
  });

  return response;
};

export { signUp, signIn, signOut };
