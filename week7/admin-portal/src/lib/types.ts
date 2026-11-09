export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
}

export type PublicUser = Pick<User, "id" | "name" | "email">;

export interface UserCreate {
  name: string;
  email: string;
  password: string;
}

export interface UserUpdate {
  name: string;
  email: string;
}
