/**
 * Ask the server to notify the other person in a conversation (bell + email) about a message
 * this user just sent. Fire-and-forget: a failure here never blocks or un-sends the message.
 */
export function notifyNewMessage(messageId: string) {
  fetch('/api/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'message', messageId }),
  }).catch(() => {})
}
