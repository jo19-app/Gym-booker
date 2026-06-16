// Email notifications disabled
export async function sendEmail() {}
export function emailBooked() { return { subject: '', html: '' } }
export function emailFailed() { return { subject: '', html: '' } }