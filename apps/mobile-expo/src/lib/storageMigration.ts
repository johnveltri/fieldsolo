export type KeyValueStorage = {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
  removeItem?: (key: string) => void | Promise<void>;
};

export type StorageKeyMigration = {
  oldKey: string;
  newKey: string;
};

export async function migrateStorageKey(
  storage: KeyValueStorage,
  { oldKey, newKey }: StorageKeyMigration,
): Promise<void> {
  const currentValue = await storage.getItem(newKey);
  if (currentValue != null) return;

  const legacyValue = await storage.getItem(oldKey);
  if (legacyValue == null) return;

  await storage.setItem(newKey, legacyValue);
}

export function createKeyMigratingStorage<TStorage extends KeyValueStorage>(
  storage: TStorage,
  migrations: StorageKeyMigration[],
): TStorage {
  const migrationByNewKey = new Map(
    migrations.map((migration) => [migration.newKey, migration]),
  );

  return {
    ...storage,
    async getItem(key: string) {
      const migration = migrationByNewKey.get(key);
      if (migration) {
        await migrateStorageKey(storage, migration);
      }
      return storage.getItem(key);
    },
  };
}
