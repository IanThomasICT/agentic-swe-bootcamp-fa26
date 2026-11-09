import type { JSX } from "solid-js";
import { BaseLayout, renderDocument } from "../components/BaseLayout";
import type { PublicUser } from "../lib/types";

interface LoginPageProps {
  error: string | null;
  nextUrl: string;
  tokenConfigured: boolean;
}

function LoginPage(props: LoginPageProps): JSX.Element {
  return (
    <BaseLayout heading="Admin sign in">
      <div class="card" style="max-width: 26rem;">
        {!props.tokenConfigured && (
          <p class="flash err">
            The admin portal is not configured. Set the <code>ADMIN_TOKEN</code>
            environment variable and restart the server.
          </p>
        )}
        {props.error && <p class="flash err">{props.error}</p>}

        <form method="post" action="/admin/login">
          <input type="hidden" name="next_url" value={props.nextUrl} />
          <label for="token">Admin token</label>
          <input
            id="token"
            name="token"
            type="password"
            autocomplete="current-password"
            autofocus
            required
          />
          <p><button class="primary" type="submit">Sign in</button></p>
        </form>

        <p class="muted">
          The token is the <code>ADMIN_TOKEN</code> environment variable. It is
          compared on the server and is never displayed again.
        </p>
      </div>
    </BaseLayout>
  );
}

interface UsersPageProps {
  users: PublicUser[];
  total: number;
  query: string;
  notice: string;
  error: string;
}

function UsersPage(props: UsersPageProps): JSX.Element {
  return (
    <BaseLayout
      heading="Users"
      headerActions={
        <div class="row">
          <a class="button" href="/admin/">Refresh</a>
          <form class="inline" method="post" action="/admin/logout">
            <button type="submit">Sign out</button>
          </form>
        </div>
      }
    >
      {props.notice && <p class="flash ok">{props.notice}</p>}
      {props.error && <p class="flash err">{props.error}</p>}

      <div class="card">
        <h2>Add user</h2>
        <form method="post" action="/admin/users">
          <label for="new-name">Name</label>
          <input id="new-name" name="name" type="text" maxlength="50" required />

          <label for="new-email">Email</label>
          <input id="new-email" name="email" type="email" maxlength="50" required />

          <label for="new-password">Password</label>
          <input id="new-password" name="password" type="password" autocomplete="new-password" required />

          <p><button class="primary" type="submit">Create user</button></p>
        </form>
        <p class="muted">Passwords are stored hashed. They are never shown again.</p>
      </div>

      <div class="card">
        <h2>All users <span class="muted">({props.total} total)</span></h2>

        <form class="row" method="get" action="/admin/">
          <input type="text" name="q" value={props.query} placeholder="Search name or email" />
          <button type="submit">Search</button>
          {props.query && <a href="/admin/">Clear</a>}
        </form>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {props.users.length > 0 ? (
              props.users.map((user) => (
                <tr>
                  <td>{user.id}</td>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <div class="row">
                      <a class="button" href={`/admin/users/${user.id}`}>Edit</a>
                      <form
                        class="inline"
                        method="post"
                        action={`/admin/users/${user.id}/delete`}
                        attr:onsubmit="return confirm('Delete this user?');"
                      >
                        <button class="danger" type="submit">Delete</button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colspan="4" class="muted">No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </BaseLayout>
  );
}

interface UserEditPageProps {
  user: PublicUser;
  notice: string;
  error: string;
}

function UserEditPage(props: UserEditPageProps): JSX.Element {
  return (
    <BaseLayout
      heading={`Edit user #${props.user.id}`}
      headerActions={
        <div class="row">
          <a class="button" href="/admin/">Back to users</a>
          <form class="inline" method="post" action="/admin/logout">
            <button type="submit">Sign out</button>
          </form>
        </div>
      }
    >
      {props.notice && <p class="flash ok">{props.notice}</p>}
      {props.error && <p class="flash err">{props.error}</p>}

      <div class="card">
        <h2>Details</h2>
        <form method="post" action={`/admin/users/${props.user.id}`}>
          <label for="name">Name</label>
          <input id="name" name="name" type="text" value={props.user.name} maxlength="50" required />

          <label for="email">Email</label>
          <input id="email" name="email" type="email" value={props.user.email} maxlength="50" required />

          <label for="password">New password</label>
          <input
            id="password"
            name="password"
            type="password"
            autocomplete="new-password"
            placeholder="Leave blank to keep the current password"
          />
          <p class="muted">
            The stored password is never displayed. Type a new one to reset it.
          </p>

          <p><button class="primary" type="submit">Save changes</button></p>
        </form>
      </div>

      <div class="card">
        <h2>Delete</h2>
        <p class="muted">Removes this user permanently.</p>
        <form
          method="post"
          action={`/admin/users/${props.user.id}/delete`}
          attr:onsubmit="return confirm('Delete this user?');"
        >
          <button class="danger" type="submit">Delete user</button>
        </form>
      </div>
    </BaseLayout>
  );
}

export function renderLoginPage(props: LoginPageProps): string {
  return renderDocument(<LoginPage {...props} />, "Sign in");
}

export function renderUsersPage(props: UsersPageProps): string {
  return renderDocument(<UsersPage {...props} />, "Users");
}

export function renderUserEditPage(props: UserEditPageProps): string {
  return renderDocument(<UserEditPage {...props} />, "Edit user");
}
