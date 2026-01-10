import {  } from '../client/prisma/client';
import { faker } from '@faker-js/faker';
import Decimal from 'decimal.js';



export function fakeUser() {
  return {
    name: undefined,
    email: undefined,
    emailVerified: undefined,
    image: undefined,
  };
}
export function fakeUserComplete() {
  return {
    id: faker.string.uuid(),
    name: undefined,
    email: undefined,
    emailVerified: undefined,
    image: undefined,
  };
}
export function fakeAccount() {
  return {
    type: faker.lorem.words(5),
    provider: faker.lorem.words(5),
    providerAccountId: faker.lorem.words(5),
    refresh_token: undefined,
    access_token: undefined,
    expires_at: undefined,
    token_type: undefined,
    scope: undefined,
    id_token: undefined,
    session_state: undefined,
  };
}
export function fakeAccountComplete() {
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    type: faker.lorem.words(5),
    provider: faker.lorem.words(5),
    providerAccountId: faker.lorem.words(5),
    refresh_token: undefined,
    access_token: undefined,
    expires_at: undefined,
    token_type: undefined,
    scope: undefined,
    id_token: undefined,
    session_state: undefined,
  };
}
export function fakeSession() {
  return {
    sessionToken: faker.lorem.words(5),
    expires: faker.date.anytime(),
  };
}
export function fakeSessionComplete() {
  return {
    id: faker.string.uuid(),
    sessionToken: faker.lorem.words(5),
    userId: faker.string.uuid(),
    expires: faker.date.anytime(),
  };
}
export function fakeAuthenticator() {
  return {
    credentialID: faker.lorem.words(5),
    providerAccountId: faker.lorem.words(5),
    credentialPublicKey: faker.lorem.words(5),
    counter: faker.number.int(),
    credentialDeviceType: faker.lorem.words(5),
    credentialBackedUp: faker.datatype.boolean(),
    transports: undefined,
  };
}
export function fakeAuthenticatorComplete() {
  return {
    userId: faker.string.uuid(),
    credentialID: faker.lorem.words(5),
    providerAccountId: faker.lorem.words(5),
    credentialPublicKey: faker.lorem.words(5),
    counter: faker.number.int(),
    credentialDeviceType: faker.lorem.words(5),
    credentialBackedUp: faker.datatype.boolean(),
    transports: undefined,
  };
}
