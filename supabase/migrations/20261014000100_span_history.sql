begin;

-- Extend immutable snapshots; existing rows, privileges and RLS remain in place.
alter table public.calculations drop constraint calculations_operation_check;
alter table public.calculations add constraint calculations_operation_check
  check (operation in ('span', 'vector', 'system', 'rref', 'inverse', 'determinant', 'add', 'subtract', 'scale', 'multiply', 'transpose'));
alter table public.calculations drop constraint calculations_method_version;
alter table public.calculations add constraint calculations_method_version check (
  (operation = 'span' and method = 'gauss' and algorithm_version = 'span-basis-1')
  or (operation = 'vector' and method = 'components' and algorithm_version = 'vector-arithmetic-1')
  or (operation = 'inverse' and method = 'adjugate' and algorithm_version = 'adjugate-inverse-1')
  or (operation = 'determinant' and method in ('formula', 'sarrus', 'laplace', 'triangular') and algorithm_version = 'determinant-1')
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
    and (operation in ('span', 'vector', 'determinant') or (operation = 'system' and method in ('cramer', 'inverse')) or jsonb_typeof(payload->'steps') = 'array')
    and (operation in ('span', 'vector') or (operation = 'inverse' and method = 'adjugate') or (operation = 'system' and method in ('cramer', 'inverse')) or operation in ('determinant', 'add', 'subtract', 'scale', 'multiply', 'transpose') or (jsonb_typeof(payload->'pivots') = 'array' and jsonb_typeof(payload->'rank') = 'number'))
    and case operation
      when 'span' then
        jsonb_typeof(payload->'vectors') = 'array'
        and jsonb_typeof(payload->'ambientDimension') = 'number'
        and payload->'system'->>'method' = 'gauss'
        and payload->'system'->>'algorithmVersion' = 'gauss-1'
        and payload->'system'->'schemaVersion' = '1'::jsonb
        and jsonb_typeof(payload->'system'->'input'->'coefficients') = 'array'
        and jsonb_typeof(payload->'system'->'input'->'constants') = 'array'
        and jsonb_typeof(payload->'system'->'steps') = 'array'
        and jsonb_typeof(payload->'system'->'pivots') = 'array'
        and jsonb_typeof(payload->'system'->'echelon') = 'array'
        and jsonb_typeof(payload->'system'->'rank') = 'number'
        and case payload->'system'->>'classification'
          when 'unique' then jsonb_typeof(payload->'system'->'solution') = 'array'
          when 'infinite' then jsonb_typeof(payload->'system'->'particular') = 'array' and jsonb_typeof(payload->'system'->'directions') = 'array' and jsonb_typeof(payload->'system'->'freeColumns') = 'array'
          when 'inconsistent' then jsonb_typeof(payload->'system'->'contradictionRow') = 'number'
          else false end
        and case payload->>'operation'
          when 'linear-combination' then jsonb_typeof(payload->'target') = 'array'
            and payload->'belongsToSpan' = to_jsonb(payload->'system'->>'classification' <> 'inconsistent')
          when 'span-basis' then jsonb_typeof(payload->'dimension') = 'number'
            and payload->'dimension' = payload->'system'->'rank'
            and jsonb_typeof(payload->'basis') = 'array'
            and jsonb_typeof(payload->'basisIndices') = 'array'
            and jsonb_typeof(payload->'spansAmbientSpace') = 'boolean'
            and jsonb_typeof(payload->'isBasisOfAmbientSpace') = 'boolean'
            and ((payload->'independent' = 'true'::jsonb and payload->'system'->>'classification' = 'unique' and not (payload ? 'dependenceRelation'))
              or (payload->'independent' = 'false'::jsonb and payload->'system'->>'classification' = 'infinite' and jsonb_typeof(payload->'dependenceRelation') = 'array'))
          else false end
      when 'vector' then
        jsonb_typeof(payload->'input') = 'object'
        and case when payload->'input'->>'operation' in ('norm', 'normalize', 'scale') then
          jsonb_typeof(payload->'input'->'vector') = 'array'
          else jsonb_typeof(payload->'input'->'left') = 'array' and jsonb_typeof(payload->'input'->'right') = 'array' end
        and case payload->'input'->>'operation'
          when 'add' then jsonb_typeof(payload->'result') = 'array' and jsonb_typeof(payload->'steps') = 'array'
          when 'subtract' then jsonb_typeof(payload->'result') = 'array' and jsonb_typeof(payload->'steps') = 'array'
          when 'between-points' then jsonb_typeof(payload->'result') = 'array' and jsonb_typeof(payload->'steps') = 'array'
          when 'scale' then jsonb_typeof(payload->'result') = 'array' and jsonb_typeof(payload->'steps') = 'array' and jsonb_typeof(payload->'input'->'scalar') = 'object'
          when 'dot' then jsonb_typeof(payload->'proof') = 'object' and jsonb_typeof(payload->'orthogonal') = 'boolean'
          when 'norm' then jsonb_typeof(payload->'squaredNorm') = 'object' and jsonb_typeof(payload->'result') = 'object'
          when 'normalize' then jsonb_typeof(payload->'squaredNorm') = 'object' and
            ((payload->>'status' = 'defined' and jsonb_typeof(payload->'result') = 'array') or (payload->>'status' = 'undefined' and payload->>'reason' = 'zero-vector' and not (payload ? 'result')))
          when 'angle' then jsonb_typeof(payload->'dot') = 'object' and jsonb_typeof(payload->'squaredNormLeft') = 'object' and jsonb_typeof(payload->'squaredNormRight') = 'object' and
            ((payload->>'status' = 'defined' and payload->'result'->>'kind' = 'arccos' and jsonb_typeof(payload->'result'->'argument') = 'object' and payload->'approximation'->>'unit' = 'degrees' and jsonb_typeof(payload->'approximation'->'value') = 'number') or (payload->>'status' = 'undefined' and payload->>'reason' = 'zero-vector' and not (payload ? 'result') and not (payload ? 'approximation')))
          when 'projection' then jsonb_typeof(payload->'dot') = 'object' and jsonb_typeof(payload->'squaredNormDirection') = 'object' and
            ((payload->>'status' = 'defined' and jsonb_typeof(payload->'projection') = 'array' and jsonb_typeof(payload->'residual') = 'array' and jsonb_typeof(payload->'factor') = 'object' and jsonb_typeof(payload->'steps') = 'array' and jsonb_typeof(payload->'orthogonality') = 'object' and jsonb_typeof(payload->'squaredDistance') = 'object' and jsonb_typeof(payload->'distance') = 'object') or (payload->>'status' = 'undefined' and payload->>'reason' = 'zero-direction' and not (payload ? 'projection') and not (payload ? 'residual')))
          else false end
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
        and case when method = 'adjugate' then
          jsonb_typeof(payload->'determinant') = 'object'
          and jsonb_typeof(payload->'cofactors') = 'array'
          and jsonb_typeof(payload->'adjugate') = 'array'
          and ((payload->>'classification' = 'singular' and not (payload ? 'inverse') and not (payload ? 'factor'))
            or (payload->>'classification' = 'invertible' and jsonb_typeof(payload->'factor') = 'object'))
          else jsonb_typeof(payload->'reduced') = 'array' end
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





