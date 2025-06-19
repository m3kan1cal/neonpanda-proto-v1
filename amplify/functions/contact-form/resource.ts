import { defineFunction } from '@aws-amplify/backend';

export const contactForm = defineFunction({
  name: 'contact-form',
  entry: './handler.ts'
});