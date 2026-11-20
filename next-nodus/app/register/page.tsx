import type { Metadata } from "next";
import { AUTH_MODE, AuthView } from "@/features/auth";

export const metadata: Metadata = { title: "Create account" };

const RegisterPage = () => <AuthView mode={AUTH_MODE.register} />;

export default RegisterPage;
