import type { SupabaseClient } from '@supabase/supabase-js';
import { reopen, summary, type Operation, type RecordInsert } from './records';

export const PAGE_SIZE = 10;
const fields = 'id,title,operation,created_at';
export function historyRepository(client: () => Promise<SupabaseClient>) {
  return {
    async list(operation: Operation | '', page: number) {
      const db = await client();
      let query = db
        .from('calculations')
        .select(fields)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false });
      if (operation) query = query.eq('operation', operation);
      const { data, error } = await query.range(
        page * PAGE_SIZE,
        (page + 1) * PAGE_SIZE,
      );
      if (error || !data) throw new Error('List failed');
      return {
        rows: data.slice(0, PAGE_SIZE).map(summary),
        more: data.length > PAGE_SIZE,
      };
    },
    async open(id: string) {
      const db = await client();
      const { data, error } = await db
        .from('calculations')
        .select('*')
        .eq('id', id)
        .single();
      if (error)
        throw new Error(
          'Não foi possível abrir o registro. Atualize o histórico e tente novamente.',
        );
      return reopen(data);
    },
    async save(row: RecordInsert) {
      const db = await client();
      const { error } = await db.from('calculations').upsert(row, {
        onConflict: 'user_id,id',
        ignoreDuplicates: true,
        defaultToNull: false,
      });
      if (error) throw new Error('Save failed');
      const { data, error: readError } = await db
        .from('calculations')
        .select('*')
        .eq('id', row.id)
        .single();
      if (readError || !data) throw new Error('Unconfirmed save');
      // A repeated id must refer to precisely the originally submitted resolution.
      const restored = reopen(data);
      if (
        JSON.stringify(restored.result) !== JSON.stringify(row.payload) ||
        data.title !== row.title ||
        data.operation !== row.operation
      )
        throw new Error('Snapshot mismatch');
    },
    async remove(id: string) {
      const db = await client();
      const { error } = await db.from('calculations').delete().eq('id', id);
      if (error) throw new Error('Delete failed');
    },
  };
}
export type HistoryRepository = ReturnType<typeof historyRepository>;
