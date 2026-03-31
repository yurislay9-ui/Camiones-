#!/bin/sh

# Start the notification worker in the background
node dist/notifications.js &

# Start the payment requester worker in the background
node dist/payment-requester.js &

# Start the main Telegram bot in the foreground
exec node dist/index.js
