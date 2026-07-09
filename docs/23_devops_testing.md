# Chapter 23: DevOps and Testing Documentation

This document describes the compilation process, continuous integration, production deployment models, and the testing automation framework of DevTrack 2.0.

---

## 23.1 DevOps & Build Pipeline

### 1. Unified Compilation
To bundle the frontend application directly into the Spring Boot container, execute the following steps:
1. Compile the React assets for production:
   ```bash
   cd frontend
   npm run build
   ```
   This generates compiled files under the `frontend/dist/` directory.
2. Compile and package the Java backend:
   ```bash
   cd ../backend
   mvn clean package
   ```
   During the packaging step, Maven copies the React assets from `frontend/dist/` into `backend/target/classes/static/` before assembling the `.jar`.
3. The application is run as a single containerized unit:
   ```bash
   java -jar target/devtrack-backend-1.0.0.jar
   ```

### 2. Environment Configurations
The system reads configurations from `application.properties` or environment variables:
- `SPRING_DATASOURCE_URL`: JDBC connector string.
- `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD`: Database credentials.
- `JWT_SECRET`: 256-bit signature secret.
- `SPRING_MAIL_HOST` / `SPRING_MAIL_PORT`: SMTP Relay configurations.

---

## 23.2 Testing Framework

### 1. Backend Unit Testing
- Enforces Test-Driven Development (TDD) using JUnit 5, Mockito, and AssertJ.
- Service tests mock the Repository Layer to verify logic paths, status mapping, and authentication logic.

### 2. E2E UI Testing (Playwright)
- End-to-end user scenarios are automated using Playwright.
- Test files reside under `frontend/e2e/` (or configured directories).
- Selectors target unique, stable IDs on interactive elements (e.g. `data-testid`).
- **Example E2E Workflow Script**:
  ```typescript
  import { test, expect } from '@playwright/test';

  test('Tester can assign task atomically', async ({ page }) => {
    // 1. Login as Tester
    await page.goto('/login');
    await page.fill('#username', 'tester1');
    await page.fill('#password', 'password123');
    await page.click('#submit-btn');

    // 2. Access Testing Pool Tab
    await page.click('button:has-text("Testing Pool")');
    
    // 3. Assign Task
    const assignBtn = page.locator('[data-testid="assign-btn-DT-101"]');
    await expect(assignBtn).toBeVisible();
    await assignBtn.click();
    
    // 4. Verify Movement
    await expect(page.locator('text=TESTING_IN_PROGRESS')).toBeVisible();
  });
  ```
