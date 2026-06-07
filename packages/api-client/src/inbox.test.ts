import { describe, expect, it } from 'vitest';

import { countInboxItems, listInboxMaterials, listInboxNotes } from './inbox';
import { makeBuilder, makeClient } from './testUtils';

describe('inbox api client', () => {
  it('listInboxNotes filters by null job/session/deleted and maps rows', async () => {
    const notesBuilder = makeBuilder({
      awaitResult: {
        data: [
          {
            id: 'note-1',
            body: 'Replaced the kitchen faucet cartridge and tested for leaks.',
            created_at: '2026-06-07T12:00:00.000Z',
          },
        ],
        error: null,
      },
    });
    const client = makeClient({
      authUserId: 'user-1',
      buildersByTable: { notes: [notesBuilder] },
    });

    const items = await listInboxNotes(client as never);

    expect(notesBuilder.select).toHaveBeenCalledWith('id, body, created_at');
    expect((notesBuilder.is as { mock: { calls: unknown[][] } }).mock.calls).toEqual([
      ['job_id', null],
      ['session_id', null],
      ['deleted_at', null],
    ]);
    expect(notesBuilder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(items).toEqual([
      {
        id: 'note-1',
        body: 'Replaced the kitchen faucet cartridge and tested for leaks.',
        sessionId: null,
        excerpt: 'Replaced the kitchen faucet cartridge and tested for leaks.',
        dateLabel: expect.any(String),
        createdAt: '2026-06-07T12:00:00.000Z',
      },
    ]);
  });

  it('listInboxMaterials maps quantity/price labels', async () => {
    const matBuilder = makeBuilder({
      awaitResult: {
        data: [
          {
            id: 'mat-1',
            description: 'Copper Pipe',
            quantity: '3',
            unit: 'ft',
            unit_cost_cents: 250,
            total_cost_cents: 750,
            created_at: '2026-06-06T09:00:00.000Z',
          },
        ],
        error: null,
      },
    });
    const client = makeClient({
      authUserId: 'user-1',
      buildersByTable: { materials: [matBuilder] },
    });

    const items = await listInboxMaterials(client as never);

    expect(items).toEqual([
      {
        id: 'mat-1',
        sessionId: null,
        name: 'Copper Pipe',
        quantity: 3,
        unit: 'ft',
        unitCostCents: 250,
        quantityLabel: '3 ft @ $2.50',
        priceLabel: '$7.50',
        createdAt: '2026-06-06T09:00:00.000Z',
      },
    ]);
  });

  it('countInboxItems sums notes + materials head counts', async () => {
    const client = makeClient({
      authUserId: 'user-1',
      buildersByTable: {
        notes: [
          makeBuilder({
            awaitResult: { data: null, error: null, count: 2 } as never,
          }),
        ],
        materials: [
          makeBuilder({
            awaitResult: { data: null, error: null, count: 5 } as never,
          }),
        ],
      },
    });

    const counts = await countInboxItems(client as never);

    expect(counts).toEqual({ notes: 2, materials: 5, total: 7 });
  });
});
