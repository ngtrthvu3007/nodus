export interface User {
  id: string;
  email: string;
}

// Register and login take the same body.
export interface CredentialsRequest {
  email: string;
  password: string;
}
