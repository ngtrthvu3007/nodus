import type { Metadata } from "next";
import { TokensView } from "@/features/tokens";

export const metadata: Metadata = { title: "Access tokens" };

const TokensPage = () => <TokensView />;

export default TokensPage;
