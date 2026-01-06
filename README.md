# Untrackly

<div style="display: flex; gap: 10px; margin-bottom: 20px;">
  <img src="https://img.shields.io/github/stars/B-S-B-Rabbit/launchat?style=flat-square" alt="GitHub stars" />
  <img src="https://img.shields.io/github/forks/B-S-B-Rabbit/launchat?style=flat-square" alt="GitHub forks" />
  <img src="https://img.shields.io/github/issues/B-S-B-Rabbit/launchat?style=flat-square" alt="GitHub issues" />
  <img src="https://img.shields.io/github/last-commit/B-S-B-Rabbit/launchat?style=flat-square" alt="GitHub last commit" />
  <img src="https://img.shields.io/github/license/B-S-B-Rabbit/launchat?style=flat-square" alt="GitHub license" />
</div>

<div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 30px;">
  <img src="https://img.shields.io/badge/Nuxt_3-002E3B?style=flat-square&logo=nuxt.js&logoColor=white" alt="Nuxt 3" />
  <img src="https://img.shields.io/badge/Vue.js_3-35495E?style=flat-square&logo=vuedotjs&logoColor=4FC08D" alt="Vue.js" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Nitro-000000?style=flat-square&logo=nitro&logoColor=white" alt="Nitro" />
  <img src="https://img.shields.io/badge/SQLite-07405E?style=flat-square&logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/Drizzle_ORM-C5F74F?style=flat-square&logo=drizzle&logoColor=black" alt="Drizzle ORM" />
  <img src="https://img.shields.io/badge/Bcrypt-666666?style=flat-square" alt="Bcrypt" />
  <img src="https://img.shields.io/badge/Jose-JWT-orange?style=flat-square" alt="Jose" />
  <img src="https://img.shields.io/badge/PeerJS-000?style=flat-square&logo=peerjs&logoColor=white" alt="PeerJS" />
  <img src="https://img.shields.io/badge/WebRTC-333333?style=flat-square&logo=webrtc&logoColor=white" alt="WebRTC" />
  <img src="https://img.shields.io/badge/Sass-CC6699?style=flat-square&logo=sass&logoColor=white" alt="Sass" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/Nginx-009639?style=flat-square&logo=nginx&logoColor=white" alt="Nginx" />
</div>

Untrackly is a secure P2P messenger designed with a focus on maximum privacy and data protection. The application architecture ensures that messages are never stored on a server: all messages and files are transmitted directly between user devices using secure WebRTC connections.

## Key Features

- **Full End-to-End Encryption (E2EE)**: No one, including the server owner, can read your correspondence.
- **P2P File Transfer**: Securely transfer files of any size directly between devices.
- **Voice Messages**: Record and send secure voice messages.
- **Editing and Deleting**: Manage message history in real-time.

## Architecture and Security

Untrackly uses a hybrid cryptosystem to ensure data Confidentiality and Authenticity.

### Encryption Scheme
1. **Key Exchange**: Uses **ECDH** (Elliptic Curve Diffie-Hellman) on the **P-256** curve. A Shared Secret is generated during connection establishment.
2. **Key Derivation**: Session encryption keys are derived from the Shared Secret using **HKDF** (HMAC-based Key Derivation Function, RFC 5869).
3. **Message Encryption**: All text messages are encrypted using **AES-GCM** (256-bit), ensuring both privacy and integrity.

### Secure File Transfer
File transfer is implemented with a strong focus on security and performance:
- **Client-Side Encryption**: Each file is encrypted with a *unique one-time* AES-GCM-256 key before sending.
- **Key Transmission**: The file encryption key is sent to the recipient securely encrypted.
- **Chunking**: Encrypted files are split into chunks (64KB) and transmitted via WebRTC DataChannel. This allows sending large files without overloading RAM.

## Tech Stack

The application is built on a modern technology stack ensuring high performance and reliability.

### Frontend
- **[Nuxt 3](https://nuxt.com/)** (Vue 3 + TypeScript) — Provides reactivity and SSR/SSG.
- **State Management**: Reactivity API (Refs, Composables).
- **Styling**: SCSS / CSS Modules for modular and flexible styling.

### Backend & Database
- **Server**: [Nuxt Server Nitro](https://nitro.unjs.io/).
- **Database**: [SQLite](https://www.sqlite.org/) — Lightweight and reliable relational database.
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/) — For type-safe database queries.
- **Driver**: `better-sqlite3` for maximum performance.
- **Auth & Crypto**: `jose` for JWT handling and encryption; `bcrypt` for password hashing.

### Real-time & Network
- **[PeerJS](https://peerjs.com/)**: Abstraction over WebRTC to simplify Signaling and connection management.
- **Signaling**: Used for initial peer coordination (via PeerJS Server).
- **Custom TURN Server**: Self-hosted TURN server (Coturn) for NAT traversal and firewall bypassing.

## Deployment and Infrastructure

The project is fully containerized and ready for deployment.

- **URL**: [untrackly.ru](https://untrackly.ru)
- **Containerization**: Docker and Docker Compose for service orchestration.
- **Web Server**: Nginx as a Reverse Proxy, configured for SSL/TLS (Let's Encrypt).

## Contributing

The project is open for suggestions and improvements. If you have ideas for improving security, new features, or if you found a bug, please contact me:

👉 **[@ddanvers](https://t.me/ddanvers)**
