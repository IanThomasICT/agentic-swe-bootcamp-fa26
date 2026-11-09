# Simple FastAPI Py

## My Awesome FastAPI Project

This is a simple REST API built with Python and FastAPI and SQLAlchemy for CRUD operations (Create, Read, Update, Delete) on users.
FastAPI is a powerful web framework for building APIs.

## Installation

Clone this repository to your local machine:
```bash
git clone https://github.com/BaseMax/SimpleFastPyAPI
```

Change into the project directory:

```bash
cd SimpleFastPyAPI
```

Build Docker:

```bash
docker build -t SimpleFastPyAPI .
```

Run the application:

```bash
docker run -p 8000:8000 -v $(pwd)/users.db:/app/users.db SimpleFastPyAPI
```

Install the project dependencies:

```bash
pip install -r requirements.txt
```

Run the application directly without Docker:

```bash
uvicorn main:app --reload
```

The application will start and be available at http://localhost:8000.

## API Endpoints

### Retrieve a list of users:

```http
GET /users
```

Returns a list of all users in the system:

```console
curl http://localhost:8000/users/ -H "Accept: application/json"
```
Response:

```json
[
    {
        "email": "alice@example.com",
        "id": 1,
        "name": "Alice"
    },
    {
        "email": "bob@example.com",
        "id": 2,
        "name": "Bob"
    },
    {
        "email": "charlie@example.com",
        "id": 3,
        "name": "Charlie"
    }
]
```

Passwords are never returned by the API - responses only carry `id`, `name`
and `email`.

### Retrieve details for a specific user:

```http
GET /users/{user_id}
```
Returns details for a specific user with the given user_id:

```console
curl http://localhost:8000/users/1 -H "Accept: application/json"
```
Response:
```json
{
    "email": "alice@example.com",
    "id": 1,
    "name": "Alice"
}
```

### Add a new user

```http
POST /users
```

Adds a new user to the system. The request body should include a JSON object with the following properties:

  - `name` (string, required): the name of the user
  - `email` (string, required): the email address of the user
  - `password` (string, required): the password for the user

```console
curl -X POST http://localhost:8000/users/
   -H 'Content-Type: application/json'
   -d '{"name":"Ali","password":"123456", "email": "AliAhmadi@gmail.com"}'
```
Response:

```json
{
    "email": "AliAhmadi@gmail.com",
    "id": 4, 
    "name": "Ali"
}
```


### Update an existing user
```http
PUT /users/{user_id}
```

Updates an existing user with the given user_id. The request body should include a JSON object with the following properties:

  -  `name` (string): the new name for the user
  -  `email` (string): the new email address for the user

```console
curl -X PUT http://localhost:8000/users/1
     -H "Accept: application/json"
     -d '{"name": "Reza", "email": "reza@yahoo.com"}'
```
Response:
```json
{"message": "User updated successfully"}
```

### Delete a user

```http
DELETE /users/{user_id}
```

Deletes the user with the given user_id:

```console
curl -X DELETE http://localhost:8000/users/2
```

Response:
```json
{"message": "User deleted successfully"}
```

## Admin portal

A small server-rendered portal for managing users lives under `/admin/`.
Every admin route is protected by a shared admin token taken from the
`ADMIN_TOKEN` environment variable. If that variable is not set the portal
is disabled and fails closed with HTTP 503.

Start the application with a token:

```bash
export ADMIN_TOKEN="a-long-random-string"
uvicorn main:app --reload
```

Then open http://localhost:8000/admin/ - you are sent to the sign-in page,
where you paste the token. A successful sign-in opens a session cookie.

### Admin endpoints

| Method | Path                          | What it does                                    |
| ------ | ----------------------------- | ----------------------------------------------- |
| GET    | `/admin/login`                | Sign-in form (the only public admin page)       |
| POST   | `/admin/login`                | Checks the token and opens a session            |
| POST   | `/admin/logout`               | Drops the session cookie                        |
| GET    | `/admin/`                     | User directory, searchable with `?q=`           |
| GET    | `/admin/users/new`            | Create-user form                                |
| POST   | `/admin/users/`               | Create a user                                   |
| GET    | `/admin/users/{user_id}`      | One user plus the edit form                     |
| POST   | `/admin/users/{user_id}`      | Update a user (blank password keeps the old one) |
| POST   | `/admin/users/{user_id}/delete` | Delete a user                                 |

The pages are Jinja2 templates in `app/templates/`, styled by
`app/static/admin.css`. There is no JavaScript - plain HTML forms.

### Using the token without a browser

The guard also accepts the token as a header, so scripts can reach the
admin pages directly:

```console
curl http://localhost:8000/admin/ -H "X-Admin-Token: $ADMIN_TOKEN"
```

`Authorization: Bearer <token>` and `?token=<token>` work too.

### Notes on the credentials

- Passwords are never rendered, returned or echoed back. The admin pages
  only ever see `id`, `name` and `email` - the password column is dropped
  before anything reaches a template.
- Passwords are stored as salted scrypt hashes (`app/security.py`).
- The browser only holds a SHA-256 hash of the admin token, in an
  `HttpOnly`, `SameSite=Strict` cookie scoped to `/admin`.
- Token comparisons are constant time (`hmac.compare_digest`).

## Tests

```bash
pip install "fastapi==0.109.1" "pydantic[email]<2" "sqlalchemy==1.4.47"
pip install -r requirements-dev.txt
pytest
```

`tests/test_pii_no_leak.py` is a red-phase suite: it documents how much
personally identifiable information the API exposes.
`tests/test_admin.py` covers every admin endpoint.

## License

This project is licensed under the GPL-3.0 License - see the LICENSE file for details.

Copyright 2023, Max Base
