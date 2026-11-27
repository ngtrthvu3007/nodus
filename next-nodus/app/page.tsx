import { WorkspaceRedirectView } from "@/features/workspace";

// "/" has no content of its own: it opens the user's last workspace, or the first one.
const Home = () => <WorkspaceRedirectView />;

export default Home;
