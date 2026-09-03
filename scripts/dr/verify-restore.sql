-- SunnySeat isolated-restore verifier.
--
-- Run this unchanged against both the source and an isolated provider clone.
-- The one-shot Supabase CLI connection uses an explicit read-only transaction.
-- The report SELECT is deliberately final so the CLI returns it; connection
-- close then rolls the read-only transaction back.
-- Supply one fixed UTC anchor at runtime and reuse it unchanged for source and
-- target verifier runs so midnight or long restore duration cannot change
-- expected cohorts. The runbook sets it through PGOPTIONS immediately before
-- each db query; missing or malformed values fail closed.
begin transaction read only;
set local statement_timeout = '120s';
set local lock_timeout = '5s';

with recursive
verifier_parameters as (
  select
    current_setting('sunnyseat.dr_as_of_utc')::timestamptz as as_of_utc,
    timezone(
      'Europe/Stockholm',
      current_setting('sunnyseat.dr_as_of_utc')::timestamptz
    )::date as as_of_stockholm_date
),
expected_installed_extensions(extension_name) as (
  values
    ('pg_stat_statements'::text),
    ('pgcrypto'),
    ('plpgsql'),
    ('postgis'),
    ('supabase_vault'),
    ('uuid-ossp')
),
expected_relation_contract(
  relation,
  expected_owner,
  expected_rls,
  expected_force_rls,
  expected_column_signature,
  expected_constraint_signature,
  expected_index_signature,
  expected_acl_signature,
  expected_column_acl_signature,
  expected_policy_signature,
  snapshot_class
) as (
  values
    (
      'app_feedback', 'postgres', true, false,
      '238ee6557a455281015d5e7c765e670c',
      'e09b00f248f815cd01a78728ae2de88b',
      'e53ccba8cd7b98153f784be4bf81b54e',
      '72b2c5ef4774376e5929c34d956eb686',
      'd41d8cd98f00b204e9800998ecf8427e',
      'eb17915dabd57537e6286197dd7d60e2',
      'user_mutable'
    ),
    (
      'feedback', 'postgres', true, false,
      '60e55ecf74c035a37ba5b570f3246710',
      '5098a0b420c91b9d39c469bda0bfd9a6',
      '3657b5ea84c8273f9bdfaa0138799294',
      '72b2c5ef4774376e5929c34d956eb686',
      'd41d8cd98f00b204e9800998ecf8427e',
      '2124026618034e73448d693a8ad9fcf3',
      'user_mutable'
    ),
    (
      'geometry_precompute_runs', 'postgres', true, true,
      '9d48b7e32ac48ed6c8528ff22ae78f61',
      '220d2c89a5b9535476cf5dd9ad52223b',
      'fc7f0f5db73f2222e625738dbe00eb5e',
      '562783a2ea498c4c2a1d46c54a46d216',
      'd41d8cd98f00b204e9800998ecf8427e',
      'd41d8cd98f00b204e9800998ecf8427e',
      'operational_mutable'
    ),
    (
      'hours_review_outcomes', 'postgres', true, true,
      'f360bd7844acab7b071423d8d4c1d771',
      '67bf313cdcdca13ec87adaa37466a736',
      'bbb5530cf00dd5d954b9e041088594b1',
      'efa95716bba7a71d5fea669b3c1c3e44',
      'd41d8cd98f00b204e9800998ecf8427e',
      'd41d8cd98f00b204e9800998ecf8427e',
      'operational_mutable'
    ),
    (
      'hours_review_runs', 'postgres', true, true,
      '1bdaf15380c18f8df85369fecdcc4a7a',
      '4137148a163101435c4f6a4517c010d9',
      'ef177ecf8bda58fc13b5f2324f9e683c',
      'efa95716bba7a71d5fea669b3c1c3e44',
      'd41d8cd98f00b204e9800998ecf8427e',
      'd41d8cd98f00b204e9800998ecf8427e',
      'operational_mutable'
    ),
    (
      'reviews', 'postgres', true, false,
      'dc1a3ed4c798cd7d9b118dd2bed0b046',
      'a75bd67dc2c92c265fa9f4c29cb23a17',
      '20f0573acc9a7bf047032ecb5df7f1b2',
      'e6c688edbf9d880d3f5abf843e9b75d5',
      'd41d8cd98f00b204e9800998ecf8427e',
      '4137c8c3e970295617922f7a79072d4f',
      'user_mutable'
    ),
    (
      'shadow_caster_import_batches', 'postgres', true, false,
      '488f5607295c8da3eebfc6abe61687b3',
      '2f6a899f05f2e38893b2325368b033e6',
      '82aa473d5c563b07895d46ffa1f136fb',
      '72b2c5ef4774376e5929c34d956eb686',
      'd41d8cd98f00b204e9800998ecf8427e',
      '9d977c642f3907a888e54baf5436d26c',
      'reference_import'
    ),
    (
      'shadow_casters', 'postgres', true, false,
      'b0336f5247d118c8f18eda6e965c0c83',
      'a95501b56b68f7933d02cbf6fe7310cb',
      '1944fdd163c194f8010587b95f625a82',
      '72b2c5ef4774376e5929c34d956eb686',
      'd41d8cd98f00b204e9800998ecf8427e',
      '3e5f43802aa9cc1fecb1adf8042ea39d',
      'reference_import'
    ),
    (
      'venue_geometry_inputs', 'postgres', true, true,
      'e6ba4898cd1e347970260a41f1a89546',
      '9a2e3fd8a64357cf11494217639d4640',
      '1408f4fb74633b821d241f5fd409be9c',
      '562783a2ea498c4c2a1d46c54a46d216',
      'd41d8cd98f00b204e9800998ecf8427e',
      'd41d8cd98f00b204e9800998ecf8427e',
      'scheduled_snapshot'
    ),
    (
      'venue_sun_geometry_series', 'postgres', true, true,
      'dac17d676f4818ad7545eeb51b774ef4',
      '24eca571323e1efdb6224f0452848d93',
      'a0da6cd00fa18d283c0d6803352dfe30',
      '562783a2ea498c4c2a1d46c54a46d216',
      'd41d8cd98f00b204e9800998ecf8427e',
      'd41d8cd98f00b204e9800998ecf8427e',
      'scheduled_snapshot'
    ),
    (
      'venues', 'postgres', true, false,
      'c181e3159948c36c4d5836078cca7d09',
      '3666bcf822e589b43120ab16d2b0e0ac',
      'c27b9c6c716bf5e6e2d06f3e1d79f345',
      '72b2c5ef4774376e5929c34d956eb686',
      '26f509933803c4ca1afe109a2436e861',
      '3e6ab2d170dd282996981e200402d4ec',
      'curated_reference'
    ),
    (
      'weather_bucket_snapshots', 'postgres', true, true,
      '6bb985e5715e385aad0f1608b78ec83f',
      'c5b2aacddbae39a32cd3e1d1f3d4cb93',
      '53b299a6bfe9e253ecf926d1e2c8d159',
      '562783a2ea498c4c2a1d46c54a46d216',
      'd41d8cd98f00b204e9800998ecf8427e',
      'd41d8cd98f00b204e9800998ecf8427e',
      'scheduled_snapshot'
    )
),
expected_service_rpcs(
  signature,
  expected_volatility,
  pure_helper_definition_hash
) as (
  values
    (
      'public.is_valid_geometry_input_hash(text)',
      'immutable',
      '397388a7439a0726ccee3787435db330'
    ),
    (
      'public.is_valid_sun_geometry_series(jsonb)',
      'immutable',
      '04cb45847b1668fd9f230d4b057bb8ad'
    ),
    (
      'public.get_shadow_caster_hash_records(double precision,double precision,double precision)',
      'stable',
      null
    ),
    (
      'public.claim_geometry_precompute_run(text,text,date,date,text,integer,integer)',
      'volatile',
      null
    ),
    (
      'public.heartbeat_geometry_precompute_run(text,integer)',
      'volatile',
      null
    ),
    (
      'public.mark_venue_geometry_dirty(text,text)',
      'volatile',
      null
    ),
    (
      'public.publish_venue_geometry_generation(text,text,text,jsonb,jsonb)',
      'volatile',
      null
    ),
    (
      'public.finish_geometry_precompute_run(text,integer,integer,integer,integer,integer,jsonb)',
      'volatile',
      null
    ),
    (
      'public.fail_geometry_precompute_run(text,jsonb)',
      'volatile',
      null
    ),
    (
      'public.read_current_venue_sun_geometry_batch(text[],date)',
      'stable',
      null
    )
),
expected_service_role_membership_edges(
  granted_role,
  member_role,
  grantor_role,
  admin_option
) as (
  values
    ('authenticator', 'postgres', 'supabase_admin', true),
    (
      'authenticator',
      'supabase_storage_admin',
      'supabase_admin',
      true
    ),
    (
      'postgres',
      'cli_login_postgres',
      'supabase_admin',
      true
    ),
    (
      'service_role',
      'authenticator',
      'supabase_admin',
      true
    ),
    ('service_role', 'postgres', 'supabase_admin', true)
),
service_role_reachable(role_oid, path) as (
  select role_row.oid, array[role_row.oid]
  from pg_roles role_row
  where role_row.rolname = 'service_role'
  union all
  select membership.member, reachable.path || membership.member
  from service_role_reachable reachable
  join pg_auth_members membership
    on membership.roleid = reachable.role_oid
  where not membership.member = any(reachable.path)
),
service_role_membership_edges as (
  select
    granted_role.rolname as granted_role,
    member_role.rolname as member_role,
    grantor_role.rolname as grantor_role,
    membership.admin_option
  from pg_auth_members membership
  join pg_roles granted_role on granted_role.oid = membership.roleid
  join pg_roles member_role on member_role.oid = membership.member
  join pg_roles grantor_role on grantor_role.oid = membership.grantor
  where membership.roleid in (
    select distinct reachable.role_oid
    from service_role_reachable reachable
  )
),
service_role_membership_contract as (
  select
    (select count(*) from service_role_membership_edges)::bigint
      as actual_edge_count,
    (select count(*) from expected_service_role_membership_edges)::bigint
      as expected_edge_count,
    not exists (
      (select * from service_role_membership_edges)
      except
      (select * from expected_service_role_membership_edges)
    ) and not exists (
      (select * from expected_service_role_membership_edges)
      except
      (select * from service_role_membership_edges)
    ) as security_ok
),
migration_history as (
  select
    count(*)::bigint as row_count,
    count(*) filter (
      where statements is not null and cardinality(statements) > 0
    )::bigint as rows_with_statement_bodies,
    md5(
      coalesce(
        string_agg(
          concat_ws(E'\x1f', version::text, coalesce(name, '')),
          E'\n--migration--\n' order by version::text
        ),
        ''
      )
    ) as metadata_checksum,
    md5(
      coalesce(
        string_agg(
          concat_ws(
            E'\x1f',
            version::text,
            coalesce(name, ''),
            coalesce(array_to_string(statements, E'\n'), ''),
            coalesce(created_by, ''),
            coalesce(idempotency_key, ''),
            coalesce(array_to_string(rollback, E'\n'), '')
          ),
          E'\n--migration--\n' order by version::text
        ),
        ''
      )
    ) as statement_checksum,
    min(version::text) as earliest_version,
    max(version::text) as latest_version,
    count(*) = 24
      and count(*) filter (
        where statements is not null and cardinality(statements) > 0
      ) = 24
      and md5(
        coalesce(
          string_agg(
            concat_ws(E'\x1f', version::text, coalesce(name, '')),
            E'\n--migration--\n' order by version::text
          ),
          ''
        )
      ) = 'dc92dd6ac392da787c4acad2f343e207'
      and md5(
        coalesce(
          string_agg(
            concat_ws(
              E'\x1f',
              version::text,
              coalesce(name, ''),
              coalesce(array_to_string(statements, E'\n'), ''),
              coalesce(created_by, ''),
              coalesce(idempotency_key, ''),
              coalesce(array_to_string(rollback, E'\n'), '')
            ),
            E'\n--migration--\n' order by version::text
          ),
          ''
        )
      ) = 'd5d34a18e55cee01fd559b68595c46c3'
      as contract_ok
  from supabase_migrations.schema_migrations
),
schema_objects as (
  select
    n.nspname as schema_name,
    c.relkind,
    count(*)::bigint as object_count
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'auth', 'storage')
    and c.relkind in ('r', 'p', 'v', 'm', 'S')
  group by n.nspname, c.relkind
),
application_functions as (
  select
    procedure_row.oid::regprocedure::text as signature,
    pg_get_userbyid(procedure_row.proowner) as owner,
    procedure_row.prokind,
    procedure_row.prosecdef,
    procedure_row.proleakproof,
    procedure_row.provolatile,
    procedure_row.proparallel,
    coalesce(array_to_string(procedure_row.proconfig, E'\x1f'), '')
      as runtime_config,
    pg_get_functiondef(procedure_row.oid) as definition
  from pg_proc procedure_row
  join pg_namespace namespace_row
    on namespace_row.oid = procedure_row.pronamespace
  where namespace_row.nspname = 'public'
    and not exists (
      select 1
      from pg_depend dependency
      where dependency.classid = 'pg_proc'::regclass
        and dependency.objid = procedure_row.oid
        and dependency.deptype = 'e'
    )
),
application_views as (
  select
    class_row.oid::regclass::text as signature,
    pg_get_userbyid(class_row.relowner) as owner,
    class_row.relkind,
    pg_get_viewdef(class_row.oid, true) as definition
  from pg_class class_row
  join pg_namespace namespace_row on namespace_row.oid = class_row.relnamespace
  where namespace_row.nspname = 'public'
    and class_row.relkind in ('v', 'm')
    and not exists (
      select 1
      from pg_depend dependency
      where dependency.classid = 'pg_class'::regclass
        and dependency.objid = class_row.oid
        and dependency.deptype = 'e'
    )
),
application_sequences as (
  select
    class_row.oid::regclass::text as signature,
    pg_get_userbyid(class_row.relowner) as owner,
    format(
      '%s:%s:%s:%s:%s:%s:%s',
      sequence_row.seqstart,
      sequence_row.seqincrement,
      sequence_row.seqmax,
      sequence_row.seqmin,
      sequence_row.seqcache,
      sequence_row.seqcycle,
      type_row.typname
    ) as definition
  from pg_class class_row
  join pg_namespace namespace_row on namespace_row.oid = class_row.relnamespace
  join pg_sequence sequence_row on sequence_row.seqrelid = class_row.oid
  join pg_type type_row on type_row.oid = sequence_row.seqtypid
  where namespace_row.nspname = 'public'
    and not exists (
      select 1
      from pg_depend dependency
      where dependency.classid = 'pg_class'::regclass
        and dependency.objid = class_row.oid
        and dependency.deptype = 'e'
    )
),
application_triggers as (
  select
    format(
      '%I.%I:%I',
      namespace_row.nspname,
      class_row.relname,
      trigger_row.tgname
    ) as signature,
    trigger_row.tgenabled,
    pg_get_triggerdef(trigger_row.oid, true) as definition
  from pg_trigger trigger_row
  join pg_class class_row on class_row.oid = trigger_row.tgrelid
  join pg_namespace namespace_row on namespace_row.oid = class_row.relnamespace
  where namespace_row.nspname = 'public'
    and not trigger_row.tgisinternal
),
application_schema_contract as (
  select
    'functions'::text as object_kind,
    count(*)::bigint as object_count,
    md5(
      coalesce(
        string_agg(
          concat_ws(
            E'\x1f',
            signature,
            owner,
            prokind,
            prosecdef,
            proleakproof,
            provolatile,
            proparallel,
            runtime_config,
            definition
          ),
          E'\n--object--\n' order by signature
        ),
        ''
      )
    ) as signature,
    37::bigint as expected_object_count,
    '2dab891733a775c524ecafa430c8bbd0'::text
      as expected_signature
  from application_functions
  union all
  select
    'views',
    count(*)::bigint,
    md5(
      coalesce(
        string_agg(
          concat_ws(E'\x1f', signature, owner, relkind, definition),
          E'\n--object--\n' order by signature
        ),
        ''
      )
    ),
    0::bigint,
    'd41d8cd98f00b204e9800998ecf8427e'
  from application_views
  union all
  select
    'sequences',
    count(*)::bigint,
    md5(
      coalesce(
        string_agg(
          concat_ws(E'\x1f', signature, owner, definition),
          E'\n--object--\n' order by signature
        ),
        ''
      )
    ),
    3::bigint,
    '5fd3388f550f03ea19ee2b6cecb34dde'
  from application_sequences
  union all
  select
    'triggers',
    count(*)::bigint,
    md5(
      coalesce(
        string_agg(
          concat_ws(E'\x1f', signature, tgenabled, definition),
          E'\n--object--\n' order by signature
        ),
        ''
      )
    ),
    3::bigint,
    '945c527cd30e6996d9347bb0cd096d1e'
  from application_triggers
),
relation_base as (
  select
    expected.*,
    class_row.oid as relation_oid,
    class_row.oid is not null as object_exists,
    pg_get_userbyid(class_row.relowner) as owner,
    class_row.relrowsecurity as rls_enabled,
    class_row.relforcerowsecurity as force_rls
  from expected_relation_contract expected
  left join pg_class class_row
    on class_row.oid = to_regclass(format('public.%I', expected.relation))
),
relation_acl_entries as (
  select
    base.relation,
    case
      when acl_entry.grantee = 0 then 'PUBLIC'
      else pg_get_userbyid(acl_entry.grantee)
    end as grantee,
    case
      when acl_entry.grantor = 0 then 'PUBLIC'
      else pg_get_userbyid(acl_entry.grantor)
    end as grantor,
    acl_entry.privilege_type,
    acl_entry.is_grantable
  from relation_base base
  join pg_class class_row on class_row.oid = base.relation_oid
  cross join lateral aclexplode(
    coalesce(class_row.relacl, acldefault('r', class_row.relowner))
  ) acl_entry
),
relation_acl_signatures as (
  select
    relation,
    md5(
      string_agg(
        concat_ws(
          ':',
          grantee,
          grantor,
          privilege_type,
          is_grantable
        ),
        E'\n' order by
          grantee,
          grantor,
          privilege_type,
          is_grantable
      )
    ) as acl_signature
  from relation_acl_entries
  group by relation
),
relation_column_acl_entries as (
  select
    base.relation,
    attribute_row.attname as column_name,
    case
      when acl_entry.grantee = 0 then 'PUBLIC'
      else pg_get_userbyid(acl_entry.grantee)
    end as grantee,
    case
      when acl_entry.grantor = 0 then 'PUBLIC'
      else pg_get_userbyid(acl_entry.grantor)
    end as grantor,
    acl_entry.privilege_type,
    acl_entry.is_grantable
  from relation_base base
  join pg_attribute attribute_row
    on attribute_row.attrelid = base.relation_oid
   and attribute_row.attnum > 0
   and not attribute_row.attisdropped
  cross join lateral aclexplode(attribute_row.attacl) acl_entry
  where attribute_row.attacl is not null
),
relation_column_acl_signatures as (
  select
    relation,
    md5(
      string_agg(
        concat_ws(
          ':',
          column_name,
          grantee,
          grantor,
          privilege_type,
          is_grantable
        ),
        E'\n' order by
          column_name,
          grantee,
          grantor,
          privilege_type,
          is_grantable
      )
    ) as column_acl_signature
  from relation_column_acl_entries
  group by relation
),
relation_policy_entries as (
  select
    base.relation,
    policy_row.polname as policy_name,
    policy_row.polpermissive as permissive,
    policy_row.polcmd as command,
    coalesce(
      (
        select string_agg(
          coalesce(role_row.rolname, 'PUBLIC'),
          ',' order by coalesce(role_row.rolname, 'PUBLIC')
        )
        from unnest(policy_row.polroles) policy_role(oid)
        left join pg_roles role_row on role_row.oid = policy_role.oid
      ),
      ''
    ) as roles,
    coalesce(
      pg_get_expr(policy_row.polqual, policy_row.polrelid, true),
      ''
    ) as using_expression,
    coalesce(
      pg_get_expr(policy_row.polwithcheck, policy_row.polrelid, true),
      ''
    ) as check_expression
  from relation_base base
  join pg_policy policy_row on policy_row.polrelid = base.relation_oid
),
relation_policy_signatures as (
  select
    relation,
    md5(
      string_agg(
        concat_ws(
          ':',
          policy_name,
          permissive,
          command,
          roles,
          using_expression,
          check_expression
        ),
        E'\n' order by policy_name
      )
    ) as policy_signature
  from relation_policy_entries
  group by relation
),
application_relation_contract as (
  select
    base.relation,
    base.snapshot_class,
    base.object_exists,
    base.owner,
    base.expected_owner,
    base.rls_enabled,
    base.expected_rls,
    base.force_rls,
    base.expected_force_rls,
    (
      select md5(
        coalesce(
          string_agg(
            concat_ws(
              ':',
              columns.ordinal_position,
              columns.column_name,
              columns.data_type,
              columns.udt_schema,
              columns.udt_name,
              columns.is_nullable,
              coalesce(columns.column_default, ''),
              columns.is_identity,
              columns.is_generated
            ),
            E'\n' order by columns.ordinal_position
          ),
          ''
        )
      )
      from information_schema.columns
      where columns.table_schema = 'public'
        and columns.table_name = base.relation
    ) as column_signature,
    base.expected_column_signature,
    (
      select md5(
        coalesce(
          string_agg(
            constraint_row.conname || ':' ||
              pg_get_constraintdef(constraint_row.oid, true),
            E'\n' order by constraint_row.conname
          ),
          ''
        )
      )
      from pg_constraint constraint_row
      where constraint_row.conrelid = base.relation_oid
    ) as constraint_signature,
    base.expected_constraint_signature,
    (
      select md5(
        coalesce(
          string_agg(
            indexes.indexname || ':' || indexes.indexdef,
            E'\n' order by indexes.indexname
          ),
          ''
        )
      )
      from pg_indexes indexes
      where indexes.schemaname = 'public'
        and indexes.tablename = base.relation
    ) as index_signature,
    base.expected_index_signature,
    coalesce(
      acl_signatures.acl_signature,
      md5('')
    ) as acl_signature,
    base.expected_acl_signature,
    coalesce(
      column_acl_signatures.column_acl_signature,
      md5('')
    ) as column_acl_signature,
    base.expected_column_acl_signature,
    coalesce(
      policy_signatures.policy_signature,
      md5('')
    ) as policy_signature,
    base.expected_policy_signature
  from relation_base base
  left join relation_acl_signatures acl_signatures using (relation)
  left join relation_column_acl_signatures column_acl_signatures
    using (relation)
  left join relation_policy_signatures policy_signatures using (relation)
),
application_relation_results as (
  select
    contract.*,
    object_exists
      and owner = expected_owner
      and rls_enabled = expected_rls
      and force_rls = expected_force_rls
      and column_signature = expected_column_signature
      and constraint_signature = expected_constraint_signature
      and index_signature = expected_index_signature
      and acl_signature = expected_acl_signature
      and column_acl_signature = expected_column_acl_signature
      and policy_signature = expected_policy_signature
      as contract_ok
  from application_relation_contract contract
),
shadow_caster_samples as (
  select sample.id, sample.row_hash
  from (
    select row_data.id, md5(to_jsonb(row_data)::text) as row_hash
    from public.shadow_casters row_data
    order by row_data.id
    limit 128
  ) sample
  union
  select sample.id, sample.row_hash
  from (
    select row_data.id, md5(to_jsonb(row_data)::text) as row_hash
    from public.shadow_casters row_data
    order by row_data.id desc
    limit 128
  ) sample
),
representative_rows as (
  select
    'app_feedback'::text as relation,
    'user_mutable'::text as snapshot_class,
    'all-rows-by-id'::text as checksum_scope,
    count(*)::bigint as row_count,
    count(*)::bigint as sampled_rows,
    md5(
      coalesce(
        string_agg(md5(to_jsonb(row_data)::text), '' order by row_data.id),
        ''
      )
    ) as checksum,
    max(row_data.created_at) as latest_change
  from public.app_feedback row_data
  union all
  select
    'feedback',
    'user_mutable',
    'all-rows-by-id',
    count(*)::bigint,
    count(*)::bigint,
    md5(
      coalesce(
        string_agg(md5(to_jsonb(row_data)::text), '' order by row_data.id),
        ''
      )
    ),
    max(row_data.created_at)
  from public.feedback row_data
  union all
  select
    'geometry_precompute_runs',
    'operational_mutable',
    'all-rows-by-id',
    count(*)::bigint,
    count(*)::bigint,
    md5(
      coalesce(
        string_agg(md5(to_jsonb(row_data)::text), '' order by row_data.id),
        ''
      )
    ),
    max(greatest(row_data.started_at, row_data.heartbeat_at, row_data.finished_at))
  from public.geometry_precompute_runs row_data
  union all
  select
    'hours_review_outcomes',
    'operational_mutable',
    'all-rows-by-id',
    count(*)::bigint,
    count(*)::bigint,
    md5(
      coalesce(
        string_agg(md5(to_jsonb(row_data)::text), '' order by row_data.id),
        ''
      )
    ),
    max(row_data.created_at)
  from public.hours_review_outcomes row_data
  union all
  select
    'hours_review_runs',
    'operational_mutable',
    'all-rows-by-id',
    count(*)::bigint,
    count(*)::bigint,
    md5(
      coalesce(
        string_agg(md5(to_jsonb(row_data)::text), '' order by row_data.id),
        ''
      )
    ),
    max(greatest(row_data.started_at, row_data.finished_at))
  from public.hours_review_runs row_data
  union all
  select
    'reviews',
    'user_mutable',
    'all-rows-by-id',
    count(*)::bigint,
    count(*)::bigint,
    md5(
      coalesce(
        string_agg(md5(to_jsonb(row_data)::text), '' order by row_data.id),
        ''
      )
    ),
    max(row_data.created_at)
  from public.reviews row_data
  union all
  select
    'shadow_caster_import_batches',
    'reference_import',
    'all-rows-by-id',
    count(*)::bigint,
    count(*)::bigint,
    md5(
      coalesce(
        string_agg(md5(to_jsonb(row_data)::text), '' order by row_data.id),
        ''
      )
    ),
    max(greatest(row_data.created_at, row_data.completed_at))
  from public.shadow_caster_import_batches row_data
  union all
  select
    'shadow_casters',
    'reference_import',
    'first-and-last-128-by-id',
    (select count(*)::bigint from public.shadow_casters),
    (select count(*)::bigint from shadow_caster_samples),
    (
      select md5(
        coalesce(
          string_agg(sample.row_hash, '' order by sample.id),
          ''
        )
      )
      from shadow_caster_samples sample
    ),
    (
      select max(greatest(row_data.updated_at, row_data.imported_at))
      from public.shadow_casters row_data
    )
  union all
  select
    'venue_geometry_inputs',
    'scheduled_snapshot',
    'all-rows-by-venue-id',
    count(*)::bigint,
    count(*)::bigint,
    md5(
      coalesce(
        string_agg(
          md5(to_jsonb(row_data)::text),
          '' order by row_data.venue_id
        ),
        ''
      )
    ),
    max(row_data.updated_at)
  from public.venue_geometry_inputs row_data
  union all
  select
    'venue_sun_geometry_series',
    'scheduled_snapshot',
    'all-rows-by-primary-key',
    count(*)::bigint,
    count(*)::bigint,
    md5(
      coalesce(
        string_agg(
          md5(to_jsonb(row_data)::text),
          '' order by
            row_data.venue_id,
            row_data.stockholm_date,
            row_data.geometry_input_hash
        ),
        ''
      )
    ),
    max(row_data.updated_at)
  from public.venue_sun_geometry_series row_data
  union all
  select
    'venues',
    'curated_reference',
    'all-rows-by-id',
    count(*)::bigint,
    count(*)::bigint,
    md5(
      coalesce(
        string_agg(md5(to_jsonb(row_data)::text), '' order by row_data.id),
        ''
      )
    ),
    max(row_data.updated_at)
  from public.venues row_data
  union all
  select
    'weather_bucket_snapshots',
    'scheduled_snapshot',
    'all-rows-by-primary-key',
    count(*)::bigint,
    count(*)::bigint,
    md5(
      coalesce(
        string_agg(
          md5(to_jsonb(row_data)::text),
          '' order by
            row_data.coordinate_bucket,
            row_data.stockholm_date,
            row_data.bucket_key
        ),
        ''
      )
    ),
    max(row_data.refreshed_at)
  from public.weather_bucket_snapshots row_data
),
venue_geometry_validation as (
  select
    count(*) filter (where seating_area is not null)::bigint
      as geometry_venues,
    count(*) filter (
      where seating_area is not null
        and case
          when jsonb_typeof(seating_area) <> 'object' then false
          when seating_area ->> 'type' <> 'Polygon' then false
          when jsonb_typeof(seating_area -> 'coordinates') <> 'array' then false
          when jsonb_array_length(seating_area -> 'coordinates') < 1 then false
          when jsonb_typeof((seating_area -> 'coordinates') -> 0) <> 'array'
            then false
          when jsonb_array_length((seating_area -> 'coordinates') -> 0) < 4
            then false
          else
            ((seating_area -> 'coordinates') -> 0 -> 0) =
              ((seating_area -> 'coordinates') -> 0 ->
                (jsonb_array_length((seating_area -> 'coordinates') -> 0) - 1))
            and not exists (
              select 1
              from jsonb_array_elements(
                (seating_area -> 'coordinates') -> 0
              ) as coordinate(value)
              where case
                when jsonb_typeof(coordinate.value) <> 'array' then true
                when jsonb_array_length(coordinate.value) < 2 then true
                else
                  jsonb_typeof(coordinate.value -> 0) <> 'number'
                  or jsonb_typeof(coordinate.value -> 1) <> 'number'
              end
            )
        end
    )::bigint as valid_polygon_geometries
  from public.venues
),
venue_visibility as (
  select
    count(*)::bigint as total,
    count(*) filter (where hidden)::bigint as hidden,
    count(*) filter (where deleted_at is not null)::bigint as soft_deleted,
    count(*) filter (
      where not hidden and deleted_at is null
    )::bigint as publicly_eligible,
    geometry.geometry_venues,
    geometry.valid_polygon_geometries,
    count(*) = 42
      and count(*) filter (where hidden) = 0
      and count(*) filter (where deleted_at is not null) = 0
      and count(*) filter (where not hidden and deleted_at is null) = 42
      and geometry.geometry_venues = 42
      and geometry.valid_polygon_geometries = 42
      as contract_ok
  from public.venues
  cross join venue_geometry_validation geometry
  group by geometry.geometry_venues, geometry.valid_polygon_geometries
),
required_geometry_dates as (
  select
    (
      (select as_of_stockholm_date from verifier_parameters)
      + day_offset::integer
    )::date as stockholm_date
  from generate_series(0, 4) required(day_offset)
),
current_geometry_series as (
  select series_row.*
  from public.venue_sun_geometry_series series_row
  join public.venue_geometry_inputs input_row
    on input_row.venue_id = series_row.venue_id
   and input_row.current_geometry_input_hash =
     series_row.geometry_input_hash
),
current_geometry_date_sets as (
  select
    input_row.venue_id,
    count(series_row.stockholm_date)::bigint as current_date_count,
    md5(
      coalesce(
        string_agg(
          series_row.stockholm_date::text,
          ',' order by series_row.stockholm_date
        ),
        ''
      )
    ) as date_set_signature
  from public.venue_geometry_inputs input_row
  left join current_geometry_series series_row
    on series_row.venue_id = input_row.venue_id
  group by input_row.venue_id
),
geometry_date_cohorts as (
  select
    stockholm_date,
    count(*)::bigint as series_rows,
    count(distinct venue_id)::bigint as distinct_venues
  from current_geometry_series
  group by stockholm_date
),
geometry_series_quality as (
  select
    count(*)::bigint as series_rows,
    count(*) filter (
      where public.is_valid_sun_geometry_series(series_row.series)
    )::bigint as validator_valid_series_rows,
    count(*) filter (
      where public.is_valid_sun_geometry_series(series_row.series)
        and jsonb_array_length(series_row.series) = 61
        and not exists (
          select 1
          from jsonb_array_elements(series_row.series)
            with ordinality as step(value, position)
          where (step.value ->> 'minutes')::integer <>
            (345 + step.position::integer * 15)
        )
    )::bigint as exact_ordered_61_step_rows,
    (
      count(*) - count(distinct (venue_id, stockholm_date))
    )::bigint as duplicate_venue_date_rows,
    min(stockholm_date) as earliest_date,
    max(stockholm_date) as latest_date
  from public.venue_sun_geometry_series series_row
),
geometry_contract as (
  select
    (select count(*) from public.venue_geometry_inputs)::bigint as inputs,
    (
      select count(*)
      from public.venue_geometry_inputs
      where status = 'ready'
        and current_geometry_input_hash is not null
    )::bigint as ready_inputs,
    (
      select count(*)
      from public.venue_geometry_inputs
      where current_geometry_input_hash is not null
        and public.is_valid_geometry_input_hash(current_geometry_input_hash)
    )::bigint as nonnull_valid_current_hash_inputs,
    quality.series_rows,
    quality.validator_valid_series_rows,
    quality.exact_ordered_61_step_rows,
    (select count(*) from current_geometry_series)::bigint
      as current_hash_series_rows,
    (
      select count(*)
      from current_geometry_date_sets
      where current_date_count = (select count(*) from geometry_date_cohorts)
    )::bigint as inputs_with_complete_retained_dates,
    (
      select count(distinct date_set_signature)
      from current_geometry_date_sets
    )::bigint as distinct_current_date_sets,
    (select count(*) from geometry_date_cohorts)::bigint
      as retained_date_cohorts,
    (
      select count(*)
      from geometry_date_cohorts cohort
      where cohort.series_rows = 42 and cohort.distinct_venues = 42
    )::bigint as complete_retained_date_cohorts,
    (select count(*) from required_geometry_dates)::bigint
      as required_current_dates,
    (
      select count(*)
      from required_geometry_dates required
      join geometry_date_cohorts cohort using (stockholm_date)
      where cohort.series_rows = 42 and cohort.distinct_venues = 42
    )::bigint as complete_required_current_dates,
    quality.duplicate_venue_date_rows,
    quality.earliest_date,
    quality.latest_date,
    (select count(*) from public.venue_geometry_inputs) = 42
      and (
        select count(*)
        from public.venue_geometry_inputs
        where status = 'ready'
          and current_geometry_input_hash is not null
      ) = 42
      and (
        select count(*)
        from public.venue_geometry_inputs
        where current_geometry_input_hash is not null
          and public.is_valid_geometry_input_hash(current_geometry_input_hash)
      ) = 42
      and quality.series_rows > 0
      and quality.validator_valid_series_rows = quality.series_rows
      and quality.exact_ordered_61_step_rows = quality.series_rows
      and (select count(*) from current_geometry_series) = quality.series_rows
      and quality.duplicate_venue_date_rows = 0
      and (select count(*) from geometry_date_cohorts) >= 5
      and not exists (
        select 1
        from geometry_date_cohorts cohort
        where cohort.series_rows <> 42 or cohort.distinct_venues <> 42
      )
      and (
        select count(*)
        from current_geometry_date_sets
        where current_date_count = (select count(*) from geometry_date_cohorts)
      ) = 42
      and (
        select count(distinct date_set_signature)
        from current_geometry_date_sets
      ) = 1
      and (
        select count(*)
        from required_geometry_dates required
        join geometry_date_cohorts cohort using (stockholm_date)
        where cohort.series_rows = 42 and cohort.distinct_venues = 42
      ) = (select count(*) from required_geometry_dates)
      as contract_ok
  from geometry_series_quality quality
),
weather_row_validation as (
  select
    snapshot.coordinate_bucket,
    snapshot.stockholm_date,
    snapshot.bucket_key,
    case
      when jsonb_typeof(snapshot.slices) = 'array'
        then jsonb_array_length(snapshot.slices)
      else 0
    end as slice_count,
    snapshot.expires_at > snapshot.refreshed_at as expiry_valid,
    case
      when jsonb_typeof(snapshot.slices) <> 'array' then false
      when jsonb_array_length(snapshot.slices) = 0 then false
      else not exists (
        select 1
        from jsonb_array_elements(snapshot.slices) as slice(value)
        where not case
          when jsonb_typeof(slice.value) <> 'object' then false
          else
            slice.value ? 'minutes'
            and case
              when jsonb_typeof(slice.value -> 'minutes') = 'number' then
                (slice.value ->> 'minutes')::numeric =
                  trunc((slice.value ->> 'minutes')::numeric)
                and (slice.value ->> 'minutes')::numeric between 0 and 1439
              else false
            end
            and slice.value ? 'validAt'
            and case
              when jsonb_typeof(slice.value -> 'validAt') = 'string' then
                (slice.value ->> 'validAt') ~
                  '^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.[0-9]{1,6})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$'
                and pg_input_is_valid(
                  slice.value ->> 'validAt',
                  'timestamp with time zone'
                )
              else false
            end
            and (
              not (slice.value ? 'cloudCover')
              or case
                when jsonb_typeof(slice.value -> 'cloudCover') = 'number' then
                  (slice.value ->> 'cloudCover')::numeric between 0 and 100
                else false
              end
            )
            and (
              not (slice.value ? 'cloudCoverLow')
              or case
                when jsonb_typeof(slice.value -> 'cloudCoverLow') = 'number'
                  then
                  (slice.value ->> 'cloudCoverLow')::numeric between 0 and 100
                else false
              end
            )
            and (
              not (slice.value ? 'cloudCoverMedium')
              or case
                when jsonb_typeof(slice.value -> 'cloudCoverMedium') = 'number'
                  then
                  (slice.value ->> 'cloudCoverMedium')::numeric between 0 and 100
                else false
              end
            )
            and (
              not (slice.value ? 'cloudCoverHigh')
              or case
                when jsonb_typeof(slice.value -> 'cloudCoverHigh') = 'number'
                  then
                  (slice.value ->> 'cloudCoverHigh')::numeric between 0 and 100
                else false
              end
            )
            and (
              not (slice.value ? 'isRaining')
              or jsonb_typeof(slice.value -> 'isRaining') = 'boolean'
            )
            and (
              not (slice.value ? 'weatherUnknown')
              or jsonb_typeof(slice.value -> 'weatherUnknown') = 'boolean'
            )
        end
      )
    end as slices_valid
  from public.weather_bucket_snapshots snapshot
),
weather_bucket_groups as (
  select
    coordinate_bucket,
    count(*)::bigint as snapshot_rows,
    count(distinct stockholm_date)::bigint as distinct_dates,
    count(*) filter (
      where expires_at > (select as_of_utc from verifier_parameters)
    )::bigint
      as currently_unexpired_rows
  from public.weather_bucket_snapshots
  group by coordinate_bucket
),
required_weather_dates as (
  select
    (
      (select as_of_stockholm_date from verifier_parameters)
      + day_offset::integer
    )::date as stockholm_date
  from generate_series(0, 3) required(day_offset)
),
weather_date_cohorts as (
  select
    stockholm_date,
    count(*)::bigint as snapshot_rows,
    count(distinct coordinate_bucket)::bigint as distinct_buckets
  from public.weather_bucket_snapshots
  group by stockholm_date
),
weather_contract as (
  select
    count(*)::bigint as snapshot_rows,
    count(distinct source.coordinate_bucket)::bigint
      as coordinate_bucket_count,
    count(*) filter (where slice_count > 0)::bigint as nonempty_slice_rows,
    coalesce(sum(slice_count), 0)::bigint as total_slices,
    count(*) filter (where slices_valid)::bigint as valid_slice_rows,
    count(*) filter (where expiry_valid)::bigint as valid_expiry_rows,
    count(*) filter (
      where source.expires_at > (select as_of_utc from verifier_parameters)
    )::bigint
      as currently_unexpired_rows,
    count(*) filter (where source.bucket_key = 'current')::bigint
      as current_bucket_key_rows,
    (
      count(*) - count(
        distinct (source.coordinate_bucket, source.stockholm_date)
      )
    )::bigint as duplicate_bucket_date_rows,
    (select count(*) from weather_date_cohorts)::bigint
      as retained_date_cohorts,
    (
      select count(*)
      from weather_date_cohorts cohort
      where cohort.snapshot_rows = 42 and cohort.distinct_buckets = 42
    )::bigint as complete_retained_date_cohorts,
    (select count(*) from required_weather_dates)::bigint
      as required_current_dates,
    (
      select count(*)
      from required_weather_dates required
      join weather_date_cohorts cohort using (stockholm_date)
      where cohort.snapshot_rows = 42 and cohort.distinct_buckets = 42
    )::bigint as complete_required_current_dates,
    min(source.stockholm_date) as earliest_date,
    max(source.stockholm_date) as latest_date,
    max(source.weather_updated_at) as latest_weather_update,
    max(source.refreshed_at) as latest_refresh,
    count(*) > 0
      and count(distinct source.coordinate_bucket) = 42
      and (select count(*) from weather_bucket_groups) = 42
      and not exists (
        select 1
        from weather_date_cohorts cohort
        where cohort.snapshot_rows <> 42 or cohort.distinct_buckets <> 42
      )
      and count(*) = count(
        distinct (source.coordinate_bucket, source.stockholm_date)
      )
      and count(*) filter (where source.bucket_key = 'current') = count(*)
      and count(*) filter (where slice_count > 0) = count(*)
      and count(*) filter (where slices_valid) = count(*)
      and count(*) filter (where expiry_valid) = count(*)
      and coalesce(sum(slice_count), 0) >= count(*)
      and (
        select count(*)
        from required_weather_dates required
        join weather_date_cohorts cohort using (stockholm_date)
        where cohort.snapshot_rows = 42 and cohort.distinct_buckets = 42
      ) = (select count(*) from required_weather_dates)
      as contract_ok
  from weather_row_validation validation
  join public.weather_bucket_snapshots source
    using (coordinate_bucket, stockholm_date, bucket_key)
),
public_schema_security as (
  select
    has_schema_privilege('anon', 'public', 'CREATE')
      as anon_can_create,
    has_schema_privilege('authenticated', 'public', 'CREATE')
      as authenticated_can_create,
    has_schema_privilege('service_role', 'public', 'CREATE')
      as service_role_can_create,
    (
      select count(*)
      from pg_roles role_row
      where role_row.rolcanlogin
        and role_row.rolname not in ('postgres', 'supabase_admin')
        and has_schema_privilege(role_row.rolname, 'public', 'CREATE')
    )::bigint as unexpected_login_creators,
    not has_schema_privilege('anon', 'public', 'CREATE')
      and not has_schema_privilege('authenticated', 'public', 'CREATE')
      and not has_schema_privilege('service_role', 'public', 'CREATE')
      and (
        select count(*)
        from pg_roles role_row
        where role_row.rolcanlogin
          and role_row.rolname not in ('postgres', 'supabase_admin')
          and has_schema_privilege(role_row.rolname, 'public', 'CREATE')
      ) = 0 as security_ok
),
installed_extension_contract as (
  select
    (select count(*) from pg_extension)::bigint
      as installed_extension_count,
    (select count(*) from expected_installed_extensions)::bigint
      as expected_extension_count,
    coalesce(
      (
        select jsonb_agg(extension_row.extname order by extension_row.extname)
        from pg_extension extension_row
      ),
      '[]'::jsonb
    ) as installed_extensions,
    coalesce(
      (
        select jsonb_agg(expected.extension_name order by expected.extension_name)
        from expected_installed_extensions expected
      ),
      '[]'::jsonb
    ) as expected_extensions,
    not exists (
      select extension_row.extname
      from pg_extension extension_row
      except
      select expected.extension_name
      from expected_installed_extensions expected
    )
      and not exists (
        select expected.extension_name
        from expected_installed_extensions expected
        except
        select extension_row.extname
        from pg_extension extension_row
      ) as security_ok
),
external_job_counts as (
  select
    case
      when to_regclass('cron.job') is null then 0::bigint
      else coalesce(
        (
          (
            xpath(
              '//cron_job_count/text()',
              query_to_xml(
                'select count(*)::bigint as cron_job_count from cron.job',
                false,
                true,
                ''
              )
            )
          )[1]::text
        )::bigint,
        -1::bigint
      )
    end as cron_job_count,
    case
      when to_regclass('net.http_request_queue') is null then 0::bigint
      else coalesce(
        (
          (
            xpath(
              '//queued_http_request_count/text()',
              query_to_xml(
                'select count(*)::bigint as queued_http_request_count from net.http_request_queue',
                false,
                true,
                ''
              )
            )
          )[1]::text
        )::bigint,
        -1::bigint
      )
    end as queued_http_request_count,
    case
      when to_regclass('supabase_functions.hooks') is null then 0::bigint
      else coalesce(
        (
          (
            xpath(
              '//database_webhook_count/text()',
              query_to_xml(
                'select count(*)::bigint as database_webhook_count from supabase_functions.hooks',
                false,
                true,
                ''
              )
            )
          )[1]::text
        )::bigint,
        -1::bigint
      )
    end as database_webhook_count
),
outbound_effect_contract as (
  select
    (
      select count(*)
      from pg_extension extension_row
      where extension_row.extname in (
        'pg_net',
        'pg_cron',
        'http',
        'wrappers',
        'postgres_fdw',
        'mysql_fdw',
        'tds_fdw',
        'multicorn',
        'dblink'
      )
    )::bigint as outbound_extension_count,
    (
      select count(*)
      from pg_extension extension_row
      where extension_row.extname = 'dblink'
    )::bigint as dblink_extension_count,
    (
      select count(*)
      from pg_proc procedure_row
      where procedure_row.proname like 'dblink%'
    )::bigint as dblink_function_count,
    (
      select count(*)
      from pg_proc procedure_row
      where procedure_row.proname in ('dblink_connect', 'dblink_connect_u')
    )::bigint as direct_connection_function_count,
    (
      select count(*)
      from pg_extension extension_row
      where extension_row.extname in (
        'wrappers',
        'postgres_fdw',
        'mysql_fdw',
        'tds_fdw',
        'multicorn'
      )
    )::bigint as fdw_extension_count,
    (select count(*) from pg_foreign_data_wrapper)::bigint
      as foreign_data_wrapper_count,
    (select count(*) from pg_foreign_server)::bigint
      as foreign_server_count,
    (select count(*) from pg_user_mapping)::bigint
      as foreign_user_mapping_count,
    (select count(*) from pg_subscription)::bigint
      as subscription_count,
    job_counts.cron_job_count,
    job_counts.queued_http_request_count,
    job_counts.database_webhook_count,
    coalesce(
      (
        select jsonb_agg(extension_row.extname order by extension_row.extname)
        from pg_extension extension_row
        where extension_row.extname in (
          'pg_net',
          'pg_cron',
          'http',
          'wrappers',
          'postgres_fdw',
          'mysql_fdw',
          'tds_fdw',
          'multicorn',
          'dblink'
        )
      ),
      '[]'::jsonb
    ) as outbound_extensions,
    not exists (
      select 1
      from pg_extension extension_row
      where extension_row.extname in (
        'pg_net',
        'pg_cron',
        'http',
        'wrappers',
        'postgres_fdw',
        'mysql_fdw',
        'tds_fdw',
        'multicorn',
        'dblink'
      )
    )
      and not exists (
        select 1
        from pg_proc procedure_row
        where procedure_row.proname like 'dblink%'
      )
      and not exists (select 1 from pg_foreign_data_wrapper)
      and not exists (select 1 from pg_foreign_server)
      and not exists (select 1 from pg_user_mapping)
      and not exists (select 1 from pg_subscription)
      and job_counts.cron_job_count = 0
      and job_counts.queued_http_request_count = 0
      and job_counts.database_webhook_count = 0
      as security_ok
  from external_job_counts job_counts
),
expected_service_rpc_oids as (
  select
    expected.signature,
    expected.expected_volatility,
    expected.pure_helper_definition_hash,
    to_regprocedure(expected.signature)::oid as procedure_oid
  from expected_service_rpcs expected
),
service_rpc_acl_entries as (
  select
    expected.signature,
    case
      when acl_entry.grantee = 0 then 'PUBLIC'
      else pg_get_userbyid(acl_entry.grantee)
    end as grantee,
    case
      when acl_entry.grantor = 0 then 'PUBLIC'
      else pg_get_userbyid(acl_entry.grantor)
    end as grantor,
    acl_entry.privilege_type,
    acl_entry.is_grantable
  from expected_service_rpc_oids expected
  join pg_proc procedure_row on procedure_row.oid = expected.procedure_oid
  cross join lateral aclexplode(procedure_row.proacl) acl_entry
),
service_rpc_contract as (
  select
    expected.signature,
    expected.procedure_oid is not null as object_exists,
    pg_get_userbyid(procedure_row.proowner) as owner,
    procedure_row.prosecdef as security_definer,
    case procedure_row.provolatile
      when 'i' then 'immutable'
      when 's' then 'stable'
      when 'v' then 'volatile'
    end as volatility,
    expected.expected_volatility,
    to_jsonb(procedure_row.proconfig) as runtime_config,
    md5(pg_get_functiondef(procedure_row.oid)) as definition_hash,
    md5(coalesce(array_to_string(procedure_row.proacl, E'\n'), ''))
      as raw_acl_hash,
    (
      select count(*)
      from service_rpc_acl_entries acl_entry
      where acl_entry.signature = expected.signature
    )::bigint as direct_acl_entry_count,
    expected.pure_helper_definition_hash,
    (
      select count(*)
      from unnest(
        coalesce(procedure_row.proconfig, array[]::text[])
      ) configured(setting)
      where configured.setting like 'search_path=%'
    )::bigint as search_path_setting_count,
    case
      when (
        select count(*)
        from unnest(
          coalesce(procedure_row.proconfig, array[]::text[])
        ) configured(setting)
        where configured.setting like 'search_path=%'
      ) = 1
      and exists (
        select 1
        from unnest(procedure_row.proconfig) configured(setting)
        where configured.setting in (
          'search_path=public',
          'search_path=pg_catalog, public'
        )
      ) then 'fixed-reviewed-path'
      when expected.pure_helper_definition_hash is not null
        and procedure_row.proconfig is null
        and md5(pg_get_functiondef(procedure_row.oid)) =
          expected.pure_helper_definition_hash
        then 'exact-body-pure-helper-exception'
      else 'unsafe-or-unreviewed'
    end as search_path_posture,
    case when procedure_row.oid is null then null else
      has_function_privilege('anon', procedure_row.oid, 'EXECUTE')
    end as anon_execute,
    case when procedure_row.oid is null then null else
      has_function_privilege(
        'authenticated',
        procedure_row.oid,
        'EXECUTE'
      )
    end as authenticated_execute,
    case when procedure_row.oid is null then null else
      has_function_privilege('service_role', procedure_row.oid, 'EXECUTE')
    end as service_role_execute,
    expected.procedure_oid is not null
      and procedure_row.prosecdef
      and pg_get_userbyid(procedure_row.proowner) = 'postgres'
      and case procedure_row.provolatile
        when 'i' then 'immutable'
        when 's' then 'stable'
        when 'v' then 'volatile'
      end = expected.expected_volatility
      and not has_function_privilege('anon', procedure_row.oid, 'EXECUTE')
      and not has_function_privilege(
        'authenticated',
        procedure_row.oid,
        'EXECUTE'
      )
      and has_function_privilege(
        'service_role',
        procedure_row.oid,
        'EXECUTE'
      )
      and md5(
        coalesce(array_to_string(procedure_row.proacl, E'\n'), '')
      ) = 'ca36e0a47b1b66d702bf41231d2c020f'
      and (
        select count(*)
        from service_rpc_acl_entries acl_entry
        where acl_entry.signature = expected.signature
      ) = 2
      and not exists (
        select 1
        from service_rpc_acl_entries acl_entry
        where acl_entry.signature = expected.signature
          and not (
            acl_entry.grantor = 'postgres'
            and acl_entry.privilege_type = 'EXECUTE'
            and not acl_entry.is_grantable
            and acl_entry.grantee in ('postgres', 'service_role')
          )
      )
      and (select security_ok from service_role_membership_contract)
      and (select security_ok from public_schema_security)
      and (
        (
          select count(*)
          from unnest(
            coalesce(procedure_row.proconfig, array[]::text[])
          ) configured(setting)
          where configured.setting like 'search_path=%'
        ) = 1
        and exists (
          select 1
          from unnest(procedure_row.proconfig) configured(setting)
          where configured.setting in (
            'search_path=public',
            'search_path=pg_catalog, public'
          )
        )
        or (
          expected.pure_helper_definition_hash is not null
          and procedure_row.proconfig is null
          and md5(pg_get_functiondef(procedure_row.oid)) =
            expected.pure_helper_definition_hash
        )
      ) as security_ok
  from expected_service_rpc_oids expected
  left join pg_proc procedure_row
    on procedure_row.oid = expected.procedure_oid
),
storage_bucket as (
  select
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
  from storage.buckets
  where id = 'venue-media'
),
storage_policy_entries as (
  select
    policy_row.polname as policy_name,
    policy_row.polpermissive as permissive,
    policy_row.polcmd as command,
    coalesce(
      (
        select string_agg(
          coalesce(role_row.rolname, 'PUBLIC'),
          ',' order by coalesce(role_row.rolname, 'PUBLIC')
        )
        from unnest(policy_row.polroles) policy_role(oid)
        left join pg_roles role_row on role_row.oid = policy_role.oid
      ),
      ''
    ) as roles,
    coalesce(
      pg_get_expr(policy_row.polqual, policy_row.polrelid, true),
      ''
    ) as using_expression,
    coalesce(
      pg_get_expr(policy_row.polwithcheck, policy_row.polrelid, true),
      ''
    ) as check_expression,
    exists (
      select 1
      from unnest(policy_row.polroles) policy_role(oid)
      left join pg_roles role_row on role_row.oid = policy_role.oid
      where coalesce(role_row.rolname, 'PUBLIC') in (
        'PUBLIC',
        'anon',
        'authenticated'
      )
    ) as includes_browser_role
  from pg_policy policy_row
  where policy_row.polrelid = 'storage.objects'::regclass
),
storage_objects_class as (
  select
    class_row.relrowsecurity as rls_enabled,
    class_row.relforcerowsecurity as force_rls,
    pg_get_userbyid(class_row.relowner) as owner
  from pg_class class_row
  join pg_namespace namespace_row
    on namespace_row.oid = class_row.relnamespace
  where namespace_row.nspname = 'storage'
    and class_row.relname = 'objects'
),
storage_contract as (
  select
    (select count(*) from storage.buckets)::bigint
      as total_storage_bucket_rows,
    (select count(*) from storage_bucket)::bigint
      as venue_media_bucket_rows,
    (
      select count(*)
      from storage_bucket bucket
      where bucket.name = 'venue-media'
        and bucket.public
        and bucket.file_size_limit = 358400
        and bucket.allowed_mime_types = array['image/webp']::text[]
    )::bigint as exact_bucket_contract_rows,
    (
      select count(*)
      from storage.objects object_row
      where object_row.bucket_id = 'venue-media'
    )::bigint as venue_media_objects,
    (select count(*) from storage.objects)::bigint as total_storage_objects,
    object_class.rls_enabled as objects_rls_enabled,
    object_class.force_rls as objects_force_rls,
    object_class.owner as objects_owner,
    (select count(*) from storage_policy_entries)::bigint
      as total_objects_policies,
    (
      select count(*)
      from storage_policy_entries policy
      where policy.policy_name = 'venue media public read'
        and policy.permissive
        and policy.command = 'r'
        and policy.roles = 'anon,authenticated'
        and policy.using_expression = 'bucket_id = ''venue-media''::text'
        and policy.check_expression = ''
    )::bigint as exact_closed_read_policies,
    (
      select count(*)
      from storage_policy_entries policy
      where policy.includes_browser_role
        and policy.command in ('*', 'r')
    )::bigint as browser_read_policies,
    (
      select count(*)
      from storage_policy_entries policy
      where policy.includes_browser_role
        and policy.command in ('*', 'a', 'w', 'd')
    )::bigint as browser_write_policies,
    (select count(*) from storage.buckets) = 1
      and (
        select count(*)
        from storage_bucket bucket
        where bucket.name = 'venue-media'
          and bucket.public
          and bucket.file_size_limit = 358400
          and bucket.allowed_mime_types = array['image/webp']::text[]
      ) = 1
      and object_class.rls_enabled
      and not object_class.force_rls
      and object_class.owner = 'supabase_storage_admin'
      and (select count(*) from storage_policy_entries) = 1
      and (
        select count(*)
        from storage_policy_entries policy
        where policy.policy_name = 'venue media public read'
          and policy.permissive
          and policy.command = 'r'
          and policy.roles = 'anon,authenticated'
          and policy.using_expression = 'bucket_id = ''venue-media''::text'
          and policy.check_expression = ''
      ) = 1
      and (
        select count(*)
        from storage_policy_entries policy
        where policy.includes_browser_role
          and policy.command in ('*', 'r')
      ) = 1
      and (
        select count(*)
        from storage_policy_entries policy
        where policy.includes_browser_role
          and policy.command in ('*', 'a', 'w', 'd')
      ) = 0
      as security_ok
  from (values (true)) seed(value)
  left join storage_objects_class object_class on true
),
storage_auth_counts as (
  select
    (
      select count(*)
      from storage.objects
      where bucket_id = 'venue-media'
    )::bigint as venue_media_objects,
    (select count(*) from storage.objects)::bigint as total_storage_objects,
    (select count(*) from auth.users)::bigint as auth_users,
    (select count(*) from auth.identities)::bigint as auth_identities,
    (select count(*) from auth.sessions)::bigint as auth_sessions
),
verification_failures(category, failures) as (
  select
    'migration_history',
    case when contract_ok then 0 else 1 end
  from migration_history
  union all
  select
    'application_schema_signatures',
    count(*)::bigint
  from application_schema_contract
  where object_count <> expected_object_count
     or signature <> expected_signature
  union all
  select
    'application_relation_contracts',
    count(*)::bigint
  from application_relation_results
  where not coalesce(contract_ok, false)
  union all
  select
    'missing_postgis',
    case when exists (
      select 1 from pg_extension where extname = 'postgis'
    ) then 0 else 1 end
  union all
  select
    'installed_extension_allowlist',
    case when security_ok then 0 else 1 end
  from installed_extension_contract
  union all
  select
    'public_schema_security',
    case when security_ok then 0 else 1 end
  from public_schema_security
  union all
  select
    'outbound_effects',
    case when security_ok then 0 else 1 end
  from outbound_effect_contract
  union all
  select
    'service_role_membership',
    case when security_ok then 0 else 1 end
  from service_role_membership_contract
  union all
  select
    'service_rpc_security',
    count(*)::bigint
  from service_rpc_contract
  where not coalesce(security_ok, false)
  union all
  select
    'venue_visibility_and_seating',
    case when contract_ok then 0 else 1 end
  from venue_visibility
  union all
  select
    'geometry_contract',
    case when contract_ok then 0 else 1 end
  from geometry_contract
  union all
  select
    'weather_contract',
    case when contract_ok then 0 else 1 end
  from weather_contract
  union all
  select
    'storage_contract',
    case when coalesce(security_ok, false) then 0 else 1 end
  from storage_contract
),
verification_summary as (
  select
    coalesce(sum(failures), 0)::bigint as hard_failure_count,
    jsonb_object_agg(category, failures order by category) as failures
  from verification_failures
)
select
  'database_identity' as section,
  jsonb_build_object(
    'database_identity_sha256',
    encode(
      extensions.digest(
        convert_to(
          concat_ws(
            E'\x1f',
            current_database(),
            coalesce(inet_server_addr()::text, ''),
            current_setting('server_version_num')
          ),
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    ),
    'postgres_version', current_setting('server_version'),
    'timezone', current_setting('TimeZone'),
    'transaction_read_only', current_setting('transaction_read_only')
  ) as details
union all
select
  'verifier_parameters',
  jsonb_build_object(
    'as_of_utc', as_of_utc,
    'as_of_stockholm_date', as_of_stockholm_date
  )
from verifier_parameters
union all
select 'migration_history', to_jsonb(migration)
from migration_history migration
union all
select
  'extensions',
  jsonb_build_object('name', extname, 'version', extversion)
from pg_extension
union all
select 'installed_extension_contract', to_jsonb(contract)
from installed_extension_contract contract
union all
select 'schema_objects', to_jsonb(objects)
from schema_objects objects
union all
select
  'application_schema_contract',
  to_jsonb(contract) || jsonb_build_object(
    'contract_ok',
    contract.object_count = contract.expected_object_count
      and contract.signature = contract.expected_signature
  )
from application_schema_contract contract
union all
select 'application_relation_contract', to_jsonb(contract)
from application_relation_results contract
union all
select 'relation_acl_matrix', to_jsonb(acl_row)
from relation_acl_entries acl_row
union all
select 'relation_column_acl_matrix', to_jsonb(acl_row)
from relation_column_acl_entries acl_row
union all
select 'relation_policy_matrix', to_jsonb(policy_row)
from relation_policy_entries policy_row
union all
select 'representative_rows', to_jsonb(rows)
from representative_rows rows
union all
select 'venue_visibility', to_jsonb(visibility)
from venue_visibility visibility
union all
select 'geometry_contract', to_jsonb(geometry)
from geometry_contract geometry
union all
select 'weather_contract', to_jsonb(weather)
from weather_contract weather
union all
select 'weather_bucket_contract', to_jsonb(bucket)
from weather_bucket_groups bucket
union all
select 'public_schema_security', to_jsonb(security)
from public_schema_security security
union all
select 'outbound_effect_contract', to_jsonb(contract)
from outbound_effect_contract contract
union all
select 'service_role_membership_contract', to_jsonb(contract)
from service_role_membership_contract contract
union all
select 'service_role_membership_edge', to_jsonb(edge)
from service_role_membership_edges edge
union all
select 'service_rpc_contract', to_jsonb(contract)
from service_rpc_contract contract
union all
select 'service_rpc_acl_entry', to_jsonb(entry)
from service_rpc_acl_entries entry
union all
select 'storage_bucket', to_jsonb(bucket)
from storage_bucket bucket
union all
select 'storage_policy_matrix', to_jsonb(policy)
from storage_policy_entries policy
union all
select 'storage_contract', to_jsonb(contract)
from storage_contract contract
union all
select 'storage_auth_counts', to_jsonb(counts)
from storage_auth_counts counts
union all
select 'verification_summary', to_jsonb(summary)
from verification_summary summary
order by section, details;
