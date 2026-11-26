
# SCANTY MD BOT

A WhatsApp bot built with Node.js and Baileys, featuring QR-code authentication, phone-number pairing, MongoDB session persistence, and automated WhatsApp commands.

## Features

- WhatsApp QR-code authentication.
- Phone-number pairing code.
- Web-based connection dashboard.
- Automatic QR refresh and expiry display.
- MongoDB-backed authentication sessions.
- Automatic reconnection after unexpected disconnections.
- WhatsApp messaging and media support.
- Command-based bot functionality.

## Requirements

- Node.js 20.x
- MongoDB Atlas account
- GitHub account
- Render account
- WhatsApp account

## Installation

Clone the repository:

```bash
git clone https://github.com/g819480-ai/Mizuki.git
```

Enter the project directory:

```bash
cd Mizuki
```

Install dependencies:

```bash
npm install
```

## Environment Variables

Configure the following environment variable in Render:

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB connection URI |
| `PORT` | Port provided by Render |

Do not publish your MongoDB connection string or other private credentials.

## MongoDB Setup

1. Create a MongoDB Atlas cluster.
2. Create a database user.
3. Configure Network Access to allow your hosting service to connect.
4. Copy your MongoDB connection string.
5. Add it to Render as `MONGO_URI`.

The bot uses MongoDB to store WhatsApp authentication data.

## Running Locally

Start the bot:

```bash
npm start
```

The application starts the WhatsApp connection dashboard using the configured port.

## QR Code Authentication

1. Open your deployed dashboard URL.
2. Wait for the QR code to appear.
3. Open WhatsApp on your phone.
4. Go to **Linked Devices**.
5. Select **Link a Device**.
6. Scan the displayed QR code.

QR codes expire and must be refreshed when necessary.

## Pairing Code Authentication

1. Open the connection dashboard.
2. Enter your phone number with its country code.
3. Do not include the `+` sign.
4. Select **GET PAIRING CODE**.
5. Enter the generated code in WhatsApp under Linked Devices.

## Deployment on Render

1. Connect your GitHub repository to Render.
2. Create a Web Service.
3. Select the `master` branch.
4. Set the build command:

```bash
npm install
```

5. Set the start command:

```bash
npm start
```

6. Add your environment variables.
7. Deploy the service.

## Project Structure

```text
Mizuki/
├── bot.js
├── qr.js
├── package.json
├── package-lock.json
├── README.md
└── Mizuki/
    └── LegacyClient.js
```

Additional project files and folders may be present.

## Troubleshooting

### QR code is not appearing

- Check the Render deployment logs.
- Confirm the WhatsApp connection is initializing.
- Wait for a new QR code.

### Pairing code fails

- Check that the phone number includes the country code.
- Confirm the WhatsApp connection is ready.
- Check the Render logs for the exact error.

### MongoDB connection fails

- Verify `MONGO_URI`.
- Check MongoDB Atlas Network Access.
- Confirm the database user credentials.

### Dashboard is unavailable

- Check whether the Render service is running.
- Review the deployment logs.
- Confirm the application is listening on `process.env.PORT`.

## Security

- Never share your MongoDB URI.
- Never publish WhatsApp authentication credentials.
- Keep private environment variables inside Render.
- Do not expose stored session data publicly.

## Project

**SCANTY MD BOT**

Repository: https://github.com/g819480-ai/Mizuki

Built with Node.js, Baileys and MongoDB.
