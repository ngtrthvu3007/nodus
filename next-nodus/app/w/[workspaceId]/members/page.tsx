import type { Metadata } from "next";
import { MembersView } from "@/features/workspace";

export const metadata: Metadata = { title: "Members" };

const MembersPage = () => <MembersView />;

export default MembersPage;
