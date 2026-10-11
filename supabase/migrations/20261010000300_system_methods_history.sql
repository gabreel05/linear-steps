begin;

-- Extend immutable snapshots; existing rows, privileges and RLS remain in place.
alter table public.calculations drop constraint calculations_operation_check;
alter table public.calculations add constraint calculations_operation_check
  check (operation in ('system', 'rref', 'inverse', 'determinant', 'add', 'subtract', 'scale', 'multiply', 'transpose'));
alter table public.calculations drop constraint calculations_method_version;
alter table public.calculations add constraint calculations_method_version check (
  (operation = 'determinant' and method in ('formula', 'sarrus', 'laplace', 'triangular') and algorithm_version = 'determinant-1')
  or (operation = 'system' and method = 'cramer' and algorithm_version = 'cramer-1')
  or (operation = 'system' and method = 'inverse' and algorithm_version = 'inverse-system-1')
  or (operation = 'system' and method = 'gauss' and algorithm_version = 'gauss-1')
  or (operation in ('rref', 'inverse') and method = 'gauss-jordan' and algorithm_version = 'gauss-jordan-1')
  or (operation in ('add', 'subtract', 'scale', 'multiply', 'transpose') and method = 'entrywise' and algorithm_version = 'matrix-operations-1')
);
alter table public.calculations drop constraint calculations_payload_envelope;
alter table public.calculations add
  constraint calculations_payload_envelope check (coalesce(
    jsonb_typeof(payload) = 'object'
    and payload->'schemaVersion' = to_jsonb(schema_version)
    and payload->>'algorithmVersion' = algorithm_version
    and payload->>'method' = method
    and (operation = 'determinant' or (operation = 'system' and method in ('cramer', 'inverse')) or jsonb_typeof(payload->'steps') = 'array')
    and ((operation = 'system' and method in ('cramer', 'inverse')) or operation in ('determinant', 'add', 'subtract', 'scale', 'multiply', 'transpose') or (jsonb_typeof(payload->'pivots') = 'array' and jsonb_typeof(payload->'rank') = 'number'))
    and case operation
      when 'determinant' then
        jsonb_typeof(payload->'input') = 'array'
        and jsonb_typeof(payload->'value') = 'object'
        and jsonb_typeof(payload->'value'->'numerator') = 'string'
        and jsonb_typeof(payload->'value'->'denominator') = 'string'
        and jsonb_typeof(payload->'options') = 'object'
        and payload->'options'->>'method' = method
        and jsonb_typeof(payload->'proof') = 'object'
        and case when method = 'laplace' then
          payload->'options'->>'axis' in ('row', 'column')
          and jsonb_typeof(payload->'options'->'index') = 'number'
          else true end
        and case when method = 'triangular' then
          payload->'proof'->>'kind' = 'triangular'
          and jsonb_typeof(payload->'proof'->'steps') = 'array'
          and jsonb_typeof(payload->'proof'->'triangular') = 'array'
          and payload->'proof'->>'correction' in ('1', '-1')
          else payload->'proof'->>'kind' in ('formula', 'sarrus', 'laplace')
          and jsonb_typeof(payload->'proof'->'terms') = 'array' end
      when 'system' then
        jsonb_typeof(payload->'input') = 'object'
        and jsonb_typeof(payload->'input'->'coefficients') = 'array'
        and jsonb_typeof(payload->'input'->'constants') = 'array'
        and case when method = 'gauss' then
          jsonb_typeof(payload->'echelon') = 'array'
        and payload->>'classification' in ('unique', 'infinite', 'inconsistent')
        else
          ((payload->>'status' = 'unique' and jsonb_typeof(payload->'solution') = 'array' and jsonb_typeof(payload->'steps') = 'array')
           or (payload->>'status' = 'not-applicable' and payload->>'reason' = 'singular' and not (payload ? 'solution')))
          and case when method = 'cramer' then jsonb_typeof(payload->'determinant') = 'object'
            else jsonb_typeof(payload->'inverse') = 'object' end
        end
      when 'rref' then
        jsonb_typeof(payload->'input') = 'array'
        and jsonb_typeof(payload->'reduced') = 'array'
        and not (payload ? 'classification')
      when 'inverse' then
        jsonb_typeof(payload->'input') = 'array'
        and jsonb_typeof(payload->'reduced') = 'array'
        and (payload->>'classification' = 'singular'
          or (payload->>'classification' = 'invertible'
              and jsonb_typeof(payload->'inverse') = 'array'))
      else operation in ('add', 'subtract', 'scale', 'multiply', 'transpose')
        and jsonb_typeof(payload->'input') = 'object'
        and payload->'input'->>'operation' = operation
        and jsonb_typeof(payload->'result') = 'array'
        and case
          when operation in ('add', 'subtract', 'multiply') then
            jsonb_typeof(payload->'input'->'left') = 'array'
            and jsonb_typeof(payload->'input'->'right') = 'array'
          when operation = 'scale' then
            jsonb_typeof(payload->'input'->'matrix') = 'array'
            and jsonb_typeof(payload->'input'->'scalar') = 'object'
          else jsonb_typeof(payload->'input'->'matrix') = 'array'
        end
    end,
    false
  ));

commit;


