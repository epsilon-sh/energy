export function resolve(specifier, context, nextResolve) {
  if (specifier === 'emailjs') {
    return {
      url: 'node:mock-emailjs',
      shortCircuit: true,
    };
  }
  return nextResolve(specifier, context);
}

export function load(url, context, nextLoad) {
  if (url === 'node:mock-emailjs') {
    return {
      format: 'module',
      shortCircuit: true,
      source: `
        export class SMTPClient {
          constructor(config) {}
          send(email, callback) {
            globalThis.sentEmails.push(email);
            if (callback) {
              callback(null, { header: { 'message-id': '<mock-id>' } });
            }
          }
        }
      `,
    };
  }
  return nextLoad(url, context);
}
