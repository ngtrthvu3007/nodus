import type { Metadata } from "next";
import { AUTH_MODE, AuthView } from "@/features/auth";

export const metadata: Metadata = { title: "Sign in" };

const LoginPage = () => <AuthView mode={AUTH_MODE.login} />;

export default LoginPage;
