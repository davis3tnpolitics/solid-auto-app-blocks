import {  } from '../client/prisma/client';
import { faker } from '@faker-js/faker';
import Decimal from 'decimal.js';



export function fakeUser() {
  return {
    name: faker.person.fullName(),
    email: faker.internet.email(),
    emailVerified: faker.date.past({ years: 2 }),
    image: faker.image.avatar(),
  };
}
export function fakeUserComplete() {
  return {
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    emailVerified: faker.date.past({ years: 2 }),
    image: faker.image.avatar(),
  };
}
export function fakeAccount() {
  return {
    type: faker.helpers.arrayElement(['oauth','oidc']),
    provider: faker.helpers.arrayElement(['google','github','azure-ad']),
    providerAccountId: faker.string.uuid(),
    refresh_token: faker.string.alphanumeric(64),
    access_token: faker.string.alphanumeric(64),
    expires_at: Math.floor(Date.now()/1000) + faker.number.int({ min: 3600, max: 86400 * 30 }),
    token_type: 'Bearer',
    scope: faker.helpers.arrayElement(['openid email profile','read:user user:email','']),
    id_token: faker.string.alphanumeric(256),
    session_state: faker.string.alphanumeric(16),
  };
}
export function fakeAccountComplete() {
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    type: faker.helpers.arrayElement(['oauth','oidc']),
    provider: faker.helpers.arrayElement(['google','github','azure-ad']),
    providerAccountId: faker.string.uuid(),
    refresh_token: faker.string.alphanumeric(64),
    access_token: faker.string.alphanumeric(64),
    expires_at: Math.floor(Date.now()/1000) + faker.number.int({ min: 3600, max: 86400 * 30 }),
    token_type: 'Bearer',
    scope: faker.helpers.arrayElement(['openid email profile','read:user user:email','']),
    id_token: faker.string.alphanumeric(256),
    session_state: faker.string.alphanumeric(16),
  };
}
export function fakeSession() {
  return {
    sessionToken: faker.string.uuid(),
    expires: faker.date.soon({ days: 30 }),
  };
}
export function fakeSessionComplete() {
  return {
    id: faker.string.uuid(),
    sessionToken: faker.string.uuid(),
    userId: faker.string.uuid(),
    expires: faker.date.soon({ days: 30 }),
  };
}
export function fakeAuthenticator() {
  return {
    credentialID: faker.string.alphanumeric(48),
    providerAccountId: faker.string.uuid(),
    credentialPublicKey: faker.string.alphanumeric(256),
    counter: faker.number.int({ min: 0, max: 1000 }),
    credentialDeviceType: faker.helpers.arrayElement(['platform','cross-platform']),
    credentialBackedUp: faker.datatype.boolean(),
    transports: faker.helpers.arrayElements(['usb','nfc','ble','internal']).join(','),
  };
}
export function fakeAuthenticatorComplete() {
  return {
    userId: faker.string.uuid(),
    credentialID: faker.string.alphanumeric(48),
    providerAccountId: faker.string.uuid(),
    credentialPublicKey: faker.string.alphanumeric(256),
    counter: faker.number.int({ min: 0, max: 1000 }),
    credentialDeviceType: faker.helpers.arrayElement(['platform','cross-platform']),
    credentialBackedUp: faker.datatype.boolean(),
    transports: faker.helpers.arrayElements(['usb','nfc','ble','internal']).join(','),
  };
}
