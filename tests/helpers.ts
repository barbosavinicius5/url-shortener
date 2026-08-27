import { InMemoryUrlStore } from '../src/store/inMemoryUrlStore';

export function createFreshStore(): InMemoryUrlStore {
  return new InMemoryUrlStore();
}