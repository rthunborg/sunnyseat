export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      app_feedback: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          locale: string | null
          rating: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          locale?: string | null
          rating: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          locale?: string | null
          rating?: number
        }
        Relationships: []
      }
      feedback: {
        Row: {
          confidence_at_prediction: number | null
          created_at: string
          geometry_input_hash: string | null
          id: string
          note: string | null
          outdoor_seating_confirmed: boolean | null
          predicted_state: string
          public_sun_verdict: 'amber' | 'grey' | null
          sun_accuracy: string | null
          sun_exposure_percent: number | null
          user_timestamp: string
          venue_id: string
          venue_slug: string
          was_sunny: boolean | null
          weather_gated: boolean | null
          weather_unknown: boolean | null
        }
        Insert: {
          confidence_at_prediction?: number | null
          created_at?: string
          geometry_input_hash?: string | null
          id?: string
          note?: string | null
          outdoor_seating_confirmed?: boolean | null
          predicted_state: string
          public_sun_verdict?: 'amber' | 'grey' | null
          sun_accuracy?: string | null
          sun_exposure_percent?: number | null
          user_timestamp: string
          venue_id: string
          venue_slug: string
          was_sunny?: boolean | null
          weather_gated?: boolean | null
          weather_unknown?: boolean | null
        }
        Update: {
          confidence_at_prediction?: number | null
          created_at?: string
          geometry_input_hash?: string | null
          id?: string
          note?: string | null
          outdoor_seating_confirmed?: boolean | null
          predicted_state?: string
          public_sun_verdict?: 'amber' | 'grey' | null
          sun_accuracy?: string | null
          sun_exposure_percent?: number | null
          user_timestamp?: string
          venue_id?: string
          venue_slug?: string
          was_sunny?: boolean | null
          weather_gated?: boolean | null
          weather_unknown?: boolean | null
        }
        Relationships: []
      }
      hours_review_outcomes: {
        Row: {
          created_at: string
          error_class: string | null
          id: number
          outcome: string
          prior_review_status: string | null
          prior_venue_updated_at: string | null
          remediation_input_fingerprint: string | null
          reason: string
          remediation_request_fingerprint: string | null
          resulting_review_status: string | null
          resulting_venue_updated_at: string | null
          run_id: string
          venue_id: string
          venue_slug: string
        }
        Insert: {
          created_at?: string
          error_class?: string | null
          id?: number
          outcome: string
          prior_review_status?: string | null
          prior_venue_updated_at?: string | null
          remediation_input_fingerprint?: string | null
          reason: string
          remediation_request_fingerprint?: string | null
          resulting_review_status?: string | null
          resulting_venue_updated_at?: string | null
          run_id: string
          venue_id: string
          venue_slug: string
        }
        Update: {
          created_at?: string
          error_class?: string | null
          id?: number
          outcome?: string
          prior_review_status?: string | null
          prior_venue_updated_at?: string | null
          remediation_input_fingerprint?: string | null
          reason?: string
          remediation_request_fingerprint?: string | null
          resulting_review_status?: string | null
          resulting_venue_updated_at?: string | null
          run_id?: string
          venue_id?: string
          venue_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "hours_review_outcomes_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "hours_review_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hours_review_outcomes_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      hours_review_runs: {
        Row: {
          conflicting_count: number
          current_count: number
          due_count: number
          failed_count: number
          finished_at: string | null
          id: string
          lease_expires_at: string
          missing_provenance_count: number
          outcome_persistence_failure_count: number
          outcome_persistence_failures: Json
          remediation_claim_identity: string | null
          remediation_input_fingerprint: string | null
          split_count: number
          stale_count: number
          started_at: string
          status: string
          total_count: number
          trigger_type: string
          unknown_count: number
          venue_population_count: number | null
          venue_population_identity_fingerprint: string | null
          venue_population_state_fingerprint: string | null
        }
        Insert: {
          conflicting_count?: number
          current_count?: number
          due_count?: number
          failed_count?: number
          finished_at?: string | null
          id: string
          lease_expires_at: string
          missing_provenance_count?: number
          outcome_persistence_failure_count?: number
          outcome_persistence_failures?: Json
          remediation_claim_identity?: string | null
          remediation_input_fingerprint?: string | null
          split_count?: number
          stale_count?: number
          started_at?: string
          status?: string
          total_count?: number
          trigger_type: string
          unknown_count?: number
          venue_population_count?: number | null
          venue_population_identity_fingerprint?: string | null
          venue_population_state_fingerprint?: string | null
        }
        Update: {
          conflicting_count?: number
          current_count?: number
          due_count?: number
          failed_count?: number
          finished_at?: string | null
          id?: string
          lease_expires_at?: string
          missing_provenance_count?: number
          outcome_persistence_failure_count?: number
          outcome_persistence_failures?: Json
          remediation_claim_identity?: string | null
          remediation_input_fingerprint?: string | null
          split_count?: number
          stale_count?: number
          started_at?: string
          status?: string
          total_count?: number
          trigger_type?: string
          unknown_count?: number
          venue_population_count?: number | null
          venue_population_identity_fingerprint?: string | null
          venue_population_state_fingerprint?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          created_at: string
          id: string
          photo_last_modified: number | null
          photo_name: string | null
          photo_size: number | null
          photo_type: string | null
          rating: number | null
          text: string
          venue_id: string
          venue_slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          photo_last_modified?: number | null
          photo_name?: string | null
          photo_size?: number | null
          photo_type?: string | null
          rating?: number | null
          text: string
          venue_id: string
          venue_slug: string
        }
        Update: {
          created_at?: string
          id?: string
          photo_last_modified?: number | null
          photo_name?: string | null
          photo_size?: number | null
          photo_type?: string | null
          rating?: number | null
          text?: string
          venue_id?: string
          venue_slug?: string
        }
        Relationships: []
      }
      shadow_caster_import_batches: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          source_dataset: string
          source_description: string | null
          source_metadata: Json
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id: string
          notes?: string | null
          source_dataset: string
          source_description?: string | null
          source_metadata?: Json
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          source_dataset?: string
          source_description?: string | null
          source_metadata?: Json
        }
        Relationships: []
      }
      shadow_casters: {
        Row: {
          active: boolean
          bbox_3007: unknown
          caster_class: string
          centroid_3007: unknown
          engine_geometry_method: string
          filter_decision: string
          filter_reasons: string[]
          geometry: unknown
          ground_z_rh2000: number | null
          height_m: number
          height_method: string | null
          height_source: string
          id: number
          import_batch_id: string | null
          imported_at: string
          matched_line_count: number | null
          metric_crs: string
          provenance_metadata: Json
          quality_score: number | null
          roof_z_rh2000: number | null
          runtime_geometry_crs: string
          shadow_caster_tier: string | null
          source_collection_metadata: Json
          source_dataset: string
          source_external_id: string | null
          source_flags: string[]
          source_footprint_fid: string | null
          source_geom_3007: unknown
          source_geometry_type: string | null
          source_layer: string | null
          source_object_metadata: Json
          source_object_type: string | null
          source_priority: number
          source_purpose: string | null
          source_subclass: string | null
          source_update_metadata: Json
          updated_at: string
          z_semantics: string | null
          z_spread_m: number | null
        }
        Insert: {
          active?: boolean
          bbox_3007?: unknown
          caster_class?: string
          centroid_3007?: unknown
          engine_geometry_method?: string
          filter_decision?: string
          filter_reasons?: string[]
          geometry: unknown
          ground_z_rh2000?: number | null
          height_m: number
          height_method?: string | null
          height_source?: string
          id?: number
          import_batch_id?: string | null
          imported_at?: string
          matched_line_count?: number | null
          metric_crs?: string
          provenance_metadata?: Json
          quality_score?: number | null
          roof_z_rh2000?: number | null
          runtime_geometry_crs?: string
          shadow_caster_tier?: string | null
          source_collection_metadata?: Json
          source_dataset: string
          source_external_id?: string | null
          source_flags?: string[]
          source_footprint_fid?: string | null
          source_geom_3007?: unknown
          source_geometry_type?: string | null
          source_layer?: string | null
          source_object_metadata?: Json
          source_object_type?: string | null
          source_priority?: number
          source_purpose?: string | null
          source_subclass?: string | null
          source_update_metadata?: Json
          updated_at?: string
          z_semantics?: string | null
          z_spread_m?: number | null
        }
        Update: {
          active?: boolean
          bbox_3007?: unknown
          caster_class?: string
          centroid_3007?: unknown
          engine_geometry_method?: string
          filter_decision?: string
          filter_reasons?: string[]
          geometry?: unknown
          ground_z_rh2000?: number | null
          height_m?: number
          height_method?: string | null
          height_source?: string
          id?: number
          import_batch_id?: string | null
          imported_at?: string
          matched_line_count?: number | null
          metric_crs?: string
          provenance_metadata?: Json
          quality_score?: number | null
          roof_z_rh2000?: number | null
          runtime_geometry_crs?: string
          shadow_caster_tier?: string | null
          source_collection_metadata?: Json
          source_dataset?: string
          source_external_id?: string | null
          source_flags?: string[]
          source_footprint_fid?: string | null
          source_geom_3007?: unknown
          source_geometry_type?: string | null
          source_layer?: string | null
          source_object_metadata?: Json
          source_object_type?: string | null
          source_priority?: number
          source_purpose?: string | null
          source_subclass?: string | null
          source_update_metadata?: Json
          updated_at?: string
          z_semantics?: string | null
          z_spread_m?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shadow_casters_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "shadow_caster_import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      geometry_precompute_runs: {
        Row: {
          duration_ms: number | null
          expected_venue_days: number
          failed_venue_days: number
          failure_details: Json
          finished_at: string | null
          geometry_input_hash: string | null
          heartbeat_at: string
          id: string
          lease_expires_at: string
          missing_venue_days: number
          reused_venue_days: number
          stale_hash_venue_days: number
          started_at: string
          status: string
          trigger_type: string
          window_end: string
          window_start: string
          written_venue_days: number
        }
        Insert: {
          duration_ms?: number | null
          expected_venue_days?: number
          failed_venue_days?: number
          failure_details?: Json
          finished_at?: string | null
          geometry_input_hash?: string | null
          heartbeat_at?: string
          id: string
          lease_expires_at?: string
          missing_venue_days?: number
          reused_venue_days?: number
          stale_hash_venue_days?: number
          started_at?: string
          status?: string
          trigger_type: string
          window_end: string
          window_start: string
          written_venue_days?: number
        }
        Update: {
          duration_ms?: number | null
          expected_venue_days?: number
          failed_venue_days?: number
          failure_details?: Json
          finished_at?: string | null
          geometry_input_hash?: string | null
          heartbeat_at?: string
          id?: string
          lease_expires_at?: string
          missing_venue_days?: number
          reused_venue_days?: number
          stale_hash_venue_days?: number
          started_at?: string
          status?: string
          trigger_type?: string
          window_end?: string
          window_start?: string
          written_venue_days?: number
        }
        Relationships: []
      }
      venue_geometry_inputs: {
        Row: {
          building_run_id: string | null
          current_geometry_input_hash: string | null
          current_input: Json | null
          dirty_reason: string | null
          pending_geometry_input_hash: string | null
          pending_input: Json | null
          ready_at: string | null
          status: string
          updated_at: string
          venue_id: string
        }
        Insert: {
          building_run_id?: string | null
          current_geometry_input_hash?: string | null
          current_input?: Json | null
          dirty_reason?: string | null
          pending_geometry_input_hash?: string | null
          pending_input?: Json | null
          ready_at?: string | null
          status?: string
          updated_at?: string
          venue_id: string
        }
        Update: {
          building_run_id?: string | null
          current_geometry_input_hash?: string | null
          current_input?: Json | null
          dirty_reason?: string | null
          pending_geometry_input_hash?: string | null
          pending_input?: Json | null
          ready_at?: string | null
          status?: string
          updated_at?: string
          venue_id?: string
        }
        Relationships: []
      }
      venue_sun_geometry_series: {
        Row: {
          created_at: string
          geometry_input_hash: string
          input_payload: Json | null
          run_id: string | null
          series: Json
          stockholm_date: string
          updated_at: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          geometry_input_hash: string
          input_payload?: Json | null
          run_id?: string | null
          series: Json
          stockholm_date: string
          updated_at?: string
          venue_id: string
        }
        Update: {
          created_at?: string
          geometry_input_hash?: string
          input_payload?: Json | null
          run_id?: string | null
          series?: Json
          stockholm_date?: string
          updated_at?: string
          venue_id?: string
        }
        Relationships: []
      }
      weather_bucket_snapshots: {
        Row: {
          bucket_key: string
          coordinate_bucket: string
          expires_at: string
          refreshed_at: string
          run_id: string | null
          slices: Json
          stockholm_date: string
          weather_updated_at: string | null
        }
        Insert: {
          bucket_key: string
          coordinate_bucket: string
          expires_at: string
          refreshed_at?: string
          run_id?: string | null
          slices: Json
          stockholm_date: string
          weather_updated_at?: string | null
        }
        Update: {
          bucket_key?: string
          coordinate_bucket?: string
          expires_at?: string
          refreshed_at?: string
          run_id?: string | null
          slices?: Json
          stockholm_date?: string
          weather_updated_at?: string | null
        }
        Relationships: []
      }
      venues: {
        Row: {
          address: string | null
          confidence: number
          created_at: string
          current_sun_status: string
          deleted_at: string | null
          description: string | null
          display_lat: number | null
          display_lng: number | null
          ground_elevation_m: number | null
          hidden: boolean
          hours_last_error_class: string | null
          hours_next_review_at: string | null
          hours_notes: string | null
          hours_review_reason: string | null
          hours_review_status: string | null
          hours_reviewed_at: string | null
          hours_source_reference: string | null
          hours_source_type: string | null
          id: string
          is_partner: boolean
          lat: number
          lng: number
          neighborhood: string
          opening_hours: Json | null
          place_id: string | null
          prediction_uncertainty: Json | null
          seating_area: Json | null
          seating_elevation_m: number | null
          sky_condition: string | null
          slug: string
          sun_exposure_percent: number
          sun_window: Json | null
          tags: string[]
          thumbnail: Json | null
          updated_at: string
          venue_name: string
        }
        Insert: {
          address?: string | null
          confidence: number
          created_at?: string
          current_sun_status: string
          deleted_at?: string | null
          description?: string | null
          display_lat?: number | null
          display_lng?: number | null
          ground_elevation_m?: number | null
          hidden?: boolean
          hours_last_error_class?: string | null
          hours_next_review_at?: string | null
          hours_notes?: string | null
          hours_review_reason?: string | null
          hours_review_status?: string | null
          hours_reviewed_at?: string | null
          hours_source_reference?: string | null
          hours_source_type?: string | null
          id?: string
          is_partner?: boolean
          lat: number
          lng: number
          neighborhood: string
          opening_hours?: Json | null
          place_id?: string | null
          prediction_uncertainty?: Json | null
          seating_area?: Json | null
          seating_elevation_m?: number | null
          sky_condition?: string | null
          slug: string
          sun_exposure_percent: number
          sun_window?: Json | null
          tags?: string[]
          thumbnail?: Json | null
          updated_at?: string
          venue_name: string
        }
        Update: {
          address?: string | null
          confidence?: number
          created_at?: string
          current_sun_status?: string
          deleted_at?: string | null
          description?: string | null
          display_lat?: number | null
          display_lng?: number | null
          ground_elevation_m?: number | null
          hidden?: boolean
          hours_last_error_class?: string | null
          hours_next_review_at?: string | null
          hours_notes?: string | null
          hours_review_reason?: string | null
          hours_review_status?: string | null
          hours_reviewed_at?: string | null
          hours_source_reference?: string | null
          hours_source_type?: string | null
          id?: string
          is_partner?: boolean
          lat?: number
          lng?: number
          neighborhood?: string
          opening_hours?: Json | null
          place_id?: string | null
          prediction_uncertainty?: Json | null
          seating_area?: Json | null
          seating_elevation_m?: number | null
          sky_condition?: string | null
          slug?: string
          sun_exposure_percent?: number
          sun_window?: Json | null
          tags?: string[]
          thumbnail?: Json | null
          updated_at?: string
          venue_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      claim_geometry_precompute_run: {
        Args: {
          p_expected_venue_days: number
          p_geometry_input_hash: string | null
          p_lease_seconds?: number
          p_run_id: string
          p_trigger_type: string
          p_window_end: string
          p_window_start: string
        }
        Returns: boolean
      }
      fail_geometry_precompute_run: {
        Args: {
          p_failure_details?: Json
          p_run_id: string
        }
        Returns: boolean
      }
      finish_geometry_precompute_run: {
        Args: {
          p_failed_venue_days: number
          p_failure_details?: Json
          p_missing_venue_days: number
          p_reused_venue_days: number
          p_run_id: string
          p_stale_hash_venue_days: number
          p_written_venue_days: number
        }
        Returns: boolean
      }
      heartbeat_geometry_precompute_run: {
        Args: {
          p_lease_seconds?: number
          p_run_id: string
        }
        Returns: boolean
      }
      is_valid_geometry_input_hash: { Args: { value: string }; Returns: boolean }
      is_valid_sun_geometry_series: { Args: { value: Json }; Returns: boolean }
      mark_venue_geometry_dirty: {
        Args: {
          p_reason?: string
          p_venue_id: string
        }
        Returns: boolean
      }
      apply_dev_venue_editor_patch: {
        Args: {
          p_dirty_reason?: string
          p_display_lat?: number | null
          p_display_lng?: number | null
          p_hidden?: boolean | null
          p_seating_area?: Json | null
          p_tags?: string[] | null
          p_description?: string | null
          p_thumbnail?: Json | null
          p_update_description?: boolean
          p_update_display_coordinates?: boolean
          p_update_hidden?: boolean
          p_update_seating_area?: boolean
          p_update_tags?: boolean
          p_update_thumbnail?: boolean
          p_venue_id: string
        }
        Returns: boolean
      }
      publish_venue_geometry_generation: {
        Args: {
          p_geometry_input_hash: string
          p_input_payload: Json
          p_run_id: string
          p_series_by_date: Json
          p_venue_id: string
        }
        Returns: boolean
      }
      apply_hours_remediation_batch: {
        Args:
          | { p_requests: Json; p_run_id: string }
          | {
              p_remediation_claim_identity: string
              p_remediation_input_fingerprint: string
              p_requests: Json
              p_run_id: string
            }
        Returns: boolean
      }
      apply_hours_remediation_outcome: {
        Args:
          | {
              p_error_class: string
              p_expected_updated_at: string
              p_last_error_class: string
              p_next_review_at: string
              p_notes: string
              p_opening_hours: Json
              p_outcome: string
              p_reason: string
              p_review_reason: string
              p_review_status: string
              p_reviewed_at: string
              p_run_id: string
              p_source_reference: string
              p_source_type: string
              p_venue_id: string
              p_venue_slug: string
            }
          | {
              p_error_class: string
              p_expected_updated_at: string
              p_last_error_class: string
              p_next_review_at: string
              p_notes: string
              p_opening_hours: Json
              p_outcome: string
              p_reason: string
              p_remediation_claim_identity: string
              p_remediation_input_fingerprint: string
              p_request_fingerprint: string
              p_review_reason: string
              p_review_status: string
              p_reviewed_at: string
              p_run_id: string
              p_source_reference: string
              p_source_type: string
              p_venue_id: string
              p_venue_slug: string
            }
        Returns: boolean
      }
      apply_hours_remediation_request: {
        Args: {
          p_remediation_claim_identity: string
          p_remediation_input_fingerprint: string
          p_request: Json
          p_run_id: string
        }
        Returns: boolean
      }
      claim_hours_review_run: {
        Args:
          | {
              p_run_id: string
              p_started_at?: string
              p_trigger_type: string
            }
          | {
              p_remediation_claim_identity: string
              p_remediation_input_fingerprint: string
              p_run_id: string
              p_started_at: string
              p_trigger_type: string
            }
        Returns: boolean
      }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      fail_hours_review_run: {
        Args: { p_finished_at: string; p_run_id: string }
        Returns: boolean
      }
      finish_hours_review_run: {
        Args: {
          p_conflicting_count: number
          p_current_count: number
          p_due_count: number
          p_failed_count: number
          p_finished_at: string
          p_missing_provenance_count: number
          p_run_id: string
          p_split_count: number
          p_stale_count: number
          p_status: string
          p_total_count: number
          p_unknown_count: number
        }
        Returns: boolean
      }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_buildings_near_point: {
        Args: {
          p_latitude: number
          p_longitude: number
          p_radius_meters?: number
        }
        Returns: {
          BuildingType: string
          CasterClass: string
          ExternalId: string
          FilterDecision: string
          Geometry: string
          GroundZRh2000: number
          Height: number
          HeightSource: string
          Id: number
          ProvenanceMetadata: Json
          QualityScore: number
          RoofZRh2000: number
          ShadowCasterTier: string
          Source: string
          SourceFlags: string[]
          SourceObjectMetadata: Json
          SourcePriority: number
        }[]
      }
      get_shadow_caster_hash_records: {
        Args: {
          p_latitude: number
          p_longitude: number
          p_radius_meters?: number
        }
        Returns: {
          caster_class: string | null
          filter_decision: string | null
          footprint_ewkb_hex: string
          ground_z_rh2000: number | null
          height_m: number
          id: number
          import_generation: string | null
          provenance_metadata: Json | null
          roof_z_rh2000: number | null
          shadow_caster_tier: string | null
          source_flags: string[]
          source_object_metadata: Json | null
          source_priority: number | null
        }[]
      }
      read_current_venue_sun_geometry_batch: {
        Args: {
          p_stockholm_date: string
          p_venue_ids: string[]
        }
        Returns: {
          coverage_geometry_input_hash: string | null
          coverage_stockholm_date: string | null
          current_geometry_input_hash: string | null
          input_status: string | null
          series: Json | null
          venue_id: string
        }[]
      }
      gettransactionid: { Args: never; Returns: unknown }
      is_canonical_weekly_opening_hours: {
        Args: { p_hours: Json }
        Returns: boolean
      }
      hours_venue_population_snapshot: {
        Args: never
        Returns: {
          identity_fingerprint: string
          state_fingerprint: string
          venue_count: number
        }[]
      }
      hours_remediation_fingerprint_part: {
        Args: { p_value: string }
        Returns: string
      }
      hours_remediation_request_fingerprint: {
        Args: { p_request: Json }
        Returns: string
      }
      is_safe_hours_note: { Args: { p_note: string }; Returns: boolean }
      is_hours_review_run_active: {
        Args: {
          p_expected_trigger_type: string
          p_remediation_claim_identity: string
          p_remediation_input_fingerprint: string
          p_run_id: string
        }
        Returns: boolean
      }
      is_valid_hours_review_persistence_failures: {
        Args: { p_failures: Json }
        Returns: boolean
      }
      is_safe_hours_source_reference: {
        Args: { p_reference: string }
        Returns: boolean
      }
      longtransactionsenabled: { Args: never; Returns: boolean }
      persist_hours_review_outcome: {
        Args: {
          p_error_class?: string
          p_outcome: string
          p_prior_review_status?: string
          p_reason: string
          p_resulting_review_status?: string
          p_run_id: string
          p_venue_id: string
          p_venue_slug: string
        }
        Returns: boolean
      }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      prune_hours_review_history: {
        Args: { p_cutoff?: string }
        Returns: number
      }
      record_hours_review_persistence_failure: {
        Args: {
          p_run_id: string
          p_venue_id: string
          p_venue_slug: string
        }
        Returns: boolean
      }
      renew_hours_review_run_lease: {
        Args:
          | { p_run_id: string }
          | {
              p_remediation_claim_identity: string
              p_remediation_input_fingerprint: string
              p_run_id: string
            }
        Returns: boolean
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
