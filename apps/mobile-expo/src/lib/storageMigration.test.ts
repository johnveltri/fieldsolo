import { describe, expect, it } from '@jest/globals';

import { createKeyMigratingStorage, migrateStorageKey } from './storageMigration';
import {
  FIELD_SOLO_ANALYTICS_ANONYMOUS_ID_KEY,
  FIELD_SOLO_AUTH_STORAGE_KEY,
  LEGACY_FIELD_BOOK_ANALYTICS_ANONYMOUS_ID_KEY,
  LEGACY_FIELD_BOOK_AUTH_STORAGE_KEY,
} from './storageKeys';

function createMemoryStorage(initialValues: Record<string, string> = {}) {
  const values = new Map(Object.entries(initialValues));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
    values,
  };
}

describe('storage key migration', () => {
  it('migrates an existing Fieldbook auth token to the FieldSolo auth key', async () => {
    const storage = createMemoryStorage({
      [LEGACY_FIELD_BOOK_AUTH_STORAGE_KEY]: 'legacy-session',
    });
    const migratingStorage = createKeyMigratingStorage(storage, [
      {
        oldKey: LEGACY_FIELD_BOOK_AUTH_STORAGE_KEY,
        newKey: FIELD_SOLO_AUTH_STORAGE_KEY,
      },
    ]);

    await expect(migratingStorage.getItem(FIELD_SOLO_AUTH_STORAGE_KEY)).resolves.toBe(
      'legacy-session',
    );
    expect(storage.values.get(FIELD_SOLO_AUTH_STORAGE_KEY)).toBe('legacy-session');
  });

  it('does not overwrite an existing FieldSolo auth token', async () => {
    const storage = createMemoryStorage({
      [LEGACY_FIELD_BOOK_AUTH_STORAGE_KEY]: 'legacy-session',
      [FIELD_SOLO_AUTH_STORAGE_KEY]: 'current-session',
    });

    await migrateStorageKey(storage, {
      oldKey: LEGACY_FIELD_BOOK_AUTH_STORAGE_KEY,
      newKey: FIELD_SOLO_AUTH_STORAGE_KEY,
    });

    expect(storage.values.get(FIELD_SOLO_AUTH_STORAGE_KEY)).toBe('current-session');
  });

  it('migrates an existing Fieldbook analytics anonymous id to the FieldSolo key', async () => {
    const storage = createMemoryStorage({
      [LEGACY_FIELD_BOOK_ANALYTICS_ANONYMOUS_ID_KEY]: 'anon-legacy',
    });

    await migrateStorageKey(storage, {
      oldKey: LEGACY_FIELD_BOOK_ANALYTICS_ANONYMOUS_ID_KEY,
      newKey: FIELD_SOLO_ANALYTICS_ANONYMOUS_ID_KEY,
    });

    expect(storage.values.get(FIELD_SOLO_ANALYTICS_ANONYMOUS_ID_KEY)).toBe('anon-legacy');
  });
});
