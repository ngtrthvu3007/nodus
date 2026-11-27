import type { WorkspaceSummary } from "./workspace";

// GET /me: the user and the workspaces they belong to. Register and login answer only id and email.
export interface User {
  id: string;
  email: string;
  workspaces?: WorkspaceSummary[];
}

// Register and login take the same body.
export interface CredentialsRequest {
  email: string;
  password: string;
}
