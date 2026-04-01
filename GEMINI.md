# GEMINI.md

## Project Overview

This project, "The Broken Vault," is a deliberately insecure web application designed for educational purposes. Its primary goal is to demonstrate common web security vulnerabilities, as listed in the OWASP Top 10, in a controlled environment.

The application is a simple notes app built with:
-   **Backend:** Node.js with Express
-   **Database:** MySQL
-   **Frontend:** DaisyUI (via CDN)
-   **Containerization:** Docker

The project is designed to showcase the following vulnerabilities and their corresponding secure patches:
-   **A03 – Injection (SQLi):** Exploited via string-concatenated login and search queries. Patched using parameterized queries.
-   **A03 – Injection (XSS):** Exploited by rendering raw HTML content. Patched using `isomorphic-dompurify` on write and `textContent` on read.
-   **A07 – Identification Failures:** Exploited by storing passwords in plain text. Patched using `bcrypt` for hashing.

A key feature is a server-side "secure mode" toggle, allowing for a live demonstration of both the vulnerable and patched states of the application.

## Building and Running

The project is containerized using Docker and Docker Compose for easy setup and portability.

### Prerequisites

-   Docker
-   Docker Compose

### Quick Start

1.  **Clone the repository.**
2.  **Create `init.sql`:** Create a file named `init.sql` in the project root with the following content. This file defines the necessary database schema and seeds it with an initial user.

    ```sql
    CREATE DATABASE IF NOT EXISTS broken_vault;
    USE broken_vault;

    CREATE TABLE IF NOT EXISTS users (
      id       INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL,
      password VARCHAR(255) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
      id      INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT  NOT NULL,
      title   VARCHAR(200),
      content TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id      INT AUTO_INCREMENT PRIMARY KEY,
      event   VARCHAR(100),
      payload TEXT,
      mode    ENUM('vulnerable', 'secure'),
      ts      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Seed user (plain-text password for vulnerable mode)
    INSERT INTO users (username, password) VALUES ('admin', 'password123');
    ```

3.  **Create `docker-compose.yml`:** Create a file named `docker-compose.yml` in the project root with the following content.

    ```yaml
    services:
      db:
        image: mysql:8
        restart: always
        environment:
          MYSQL_ROOT_PASSWORD: root
          MYSQL_DATABASE: broken_vault
        volumes:
          - db_data:/var/lib/mysql
          - ./init.sql:/docker-entrypoint-initdb.d/init.sql
        healthcheck:
          test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
          interval: 5s
          retries: 10

      app:
        build: .
        ports:
          - "3000:3000"
        environment:
          DB_HOST: db
          DB_USER: root
          DB_PASSWORD: root
          DB_NAME: broken_vault
          SECURE_MODE: "false"
        depends_on:
          db:
            condition: service_healthy

    volumes:
      db_data:
    ```
4.  **Create `.env`:** Create a file named `.env` for local development outside of Docker.

    ```
    DB_HOST=localhost
    DB_USER=root
    DB_PASSWORD=root
    DB_NAME=broken_vault
    PORT=3000
    SECURE_MODE=false
    ```
5.  **Create `Dockerfile`:** Create a `Dockerfile` in the project root.

    ```dockerfile
    FROM node:20-alpine

    WORKDIR /app

    COPY package*.json ./
    RUN npm install --production

    COPY . .

    EXPOSE 3000

    CMD ["node", "server.js"]
    ```

6.  **Run the application:**

    ```bash
    docker compose up --build
    ```

7.  **Access the application:**
    Open your browser and navigate to `http://localhost:3000`.

8.  **Stopping the application:**
    Press `Ctrl+C` in the terminal where `docker compose` is running, then run:
    ```bash
    docker compose down
    ```
    To perform a full cleanup and remove the database volume, run `docker compose down -v`.


## Development Conventions

The development process is structured into phases, starting with a vulnerable application and progressively adding security patches.

-   **Vulnerable by Default:** The application starts in "Vulnerable Mode," where exploits for SQLi, XSS, and authentication bypass are demonstrable.
-   **Live Demonstration:** The UI includes an "Exploit Console" and a "Query Log" to make the attacks and their effects visible in real-time.
-   **Security Toggle:** A server-side toggle switches the application to "Secure Mode." In this mode, all vulnerabilities are patched using industry-standard techniques.
-   **Database:** All database interactions should be done via raw SQL queries to highlight the difference between insecure string concatenation and secure parameterized queries. ORMs are explicitly disallowed.
-   **Code Structure:** Vulnerable and secure code paths for each route should coexist in the same file, controlled by the `secureMode` flag. This clearly demonstrates the "before" and "after" for each patch.
