##  Overview

This project is a **Node.js backend service** for a **cold pack vending machine system**.  
The backend handles device communication, business logic, and API endpoints used by mobile and web clients.

The service is designed to run in the cloud using **Heroku**, but it can also be started **locally for development and testing**.

---

## 🛠 Tech Stack

### Backend
- Node.js
- Express
- TypeScript / JavaScript
- REST API
- MQTT

### Database
- MongoDB or SQL-based database

### Embedded Devices
- ESP32 (Wi-Fi)
- Sensors and actuators (motors, LEDs, etc.)

---

## 📡 Device Communication

### ESP32 → Backend
- Device registration on startup
- Periodic status updates
- Telemetry data reporting

### Backend → ESP32
- Control commands (motors, LEDs, mechanisms)
- Configuration updates
- Future OTA firmware update support

### Communication Methods
Communication can be handled using:
- REST endpoints
- MQTT topics (recommended for real-time control

---

##  Installation

### Prerequisites
- Node.js (LTS recommended)
- npm or yarn
- Database instance (MongoDB / SQL)
- MQTT broker (optional but recommended)

---

### Install Dependencies
After cloning the repository, install the required dependencies for local run

```bash
1. npm i
2. npm run build
3. npm start