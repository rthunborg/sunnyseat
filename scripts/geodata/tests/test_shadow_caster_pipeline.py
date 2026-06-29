from __future__ import annotations

import argparse
import json
import math
import shutil
import tempfile
import unittest
import zipfile
from pathlib import Path

from scripts.geodata import shadow_caster_pipeline as pipeline


ROOT = Path(__file__).resolve().parents[3]
FIXTURE = ROOT / "scripts" / "geodata" / "testdata" / "shadow_caster_candidates.fixture.geojsonl"
SPOT_CHECK_FIXTURE = ROOT / "scripts" / "geodata" / "testdata" / "spot_checks.fixture.jsonl"
BASKARTA_PREFLIGHT_FIXTURE = ROOT / "scripts" / "geodata" / "testdata" / "baskarta_preflight_layers.fixture.json"


class ShadowCasterPipelineTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmpdir = Path(tempfile.mkdtemp(prefix="sunnyseat-geodata-test-"))
        self.source = self.tmpdir / "candidates.geojsonl"
        shutil.copyfile(FIXTURE, self.source)

    def tearDown(self) -> None:
        shutil.rmtree(self.tmpdir)

    def make_spot_check_row(
        self,
        cluster_id: str,
        index: int,
        *,
        agreement_result: str = "agree",
        expected_building_shadow: str = "shadowed",
        observed_manual_result: str = "shadowed",
        uncertainty_causes: list[str] | None = None,
        notes: str = "Fixture observation",
    ) -> dict[str, object]:
        buckets = sorted(pipeline.REQUIRED_SUN_CONDITION_BUCKETS)
        lon, lat = pipeline.CLUSTERS_WGS84[cluster_id]
        return {
            "agreement_result": agreement_result,
            "cluster_id": cluster_id,
            "cluster_name": pipeline.CLUSTER_NAMES[cluster_id],
            "coordinate_wgs84": {"lat": lat + index * 0.00001, "lon": lon + index * 0.00001},
            "expected_building_shadow": expected_building_shadow,
            "notes": notes,
            "observed_manual_result": observed_manual_result,
            "point_type": "street_facing",
            "representative_local_datetime": "2026-06-21T09:00:00+02:00",
            "reviewed_at": f"2026-06-05T10:{index:02d}:00+02:00",
            "reviewer": "fixture",
            "source_artifact": "fixture",
            "spot_check_id": f"fixture-{cluster_id}-{index:02d}",
            "sun_condition_bucket": buckets[index % len(buckets)],
            "uncertainty_causes": uncertainty_causes or [],
        }

    def make_full_launch_rows(self, uncertain_per_cluster: int = 1) -> list[dict[str, object]]:
        rows: list[dict[str, object]] = []
        for cluster_id in pipeline.REQUIRED_SPOT_CHECK_CLUSTER_IDS:
            for index in range(10):
                if index >= 10 - uncertain_per_cluster:
                    rows.append(self.make_spot_check_row(
                        cluster_id,
                        index,
                        agreement_result="uncertain",
                        uncertainty_causes=["awning"],
                        notes="Awning obstruction",
                    ))
                else:
                    rows.append(self.make_spot_check_row(cluster_id, index))
        return rows

    def write_baskarta_fixture_layers(
        self,
        *layer_names: str,
        target: Path | None = None,
    ) -> Path:
        import shapefile

        fixture = json.loads(BASKARTA_PREFLIGHT_FIXTURE.read_text(encoding="utf-8"))
        target = target or (self.tmpdir / "baskarta")
        target.mkdir(parents=True, exist_ok=True)
        selected = set(layer_names)
        for layer in fixture:
            if selected and layer["name"] not in selected:
                continue
            shape_type = getattr(shapefile, layer["shapeType"])
            writer = shapefile.Writer(str(target / layer["name"]), shapeType=shape_type)
            for field in layer["fields"]:
                writer.field(*field)
            for record in layer["records"]:
                points = record["points"]
                if layer["shapeType"] == "POINTZ":
                    writer.pointz(*points[0])
                elif layer["shapeType"] == "POLYLINEZ":
                    writer.linez([points])
                elif layer["shapeType"] == "POLYGONZ":
                    writer.polyz([points])
                elif layer["shapeType"] == "POLYLINE":
                    writer.line([[point[:2] for point in points]])
                else:
                    raise AssertionError(f"Unhandled fixture shape type {layer['shapeType']}")
                writer.record(**record["values"])
            writer.close()
        return target

    def zip_baskarta_fixture(self, source: Path) -> Path:
        archive = self.tmpdir / "baskarta.zip"
        with zipfile.ZipFile(archive, "w") as zip_file:
            for path in sorted(source.iterdir()):
                zip_file.write(path, arcname=path.name)
        return archive

    def test_filter_decisions_include_review_and_low_quality_komplementbyggnad_exclude(self) -> None:
        features = pipeline.load_jsonl(self.source)
        decisions = []
        reasons_by_external_id = {}

        for feature in features:
            decision, reasons = pipeline.decide_filter(feature["properties"])
            decisions.append(decision)
            reasons_by_external_id[feature["properties"]["externalId"]] = reasons

        self.assertEqual(decisions, ["include", "review", "exclude"])
        self.assertIn("small-komplementbyggnad-low-quality", reasons_by_external_id["fixture-exclude"])
        self.assertIn("single-line-tall", reasons_by_external_id["fixture-review"])

    def make_filter_feature(self, **prop_overrides: object) -> dict[str, object]:
        # Build a candidate feature off the include fixture with property overrides,
        # for exercising decide_filter / enriched_feature branches (Story 8.1.1).
        base = pipeline.load_jsonl(self.source)[0]
        properties = dict(base["properties"])
        properties.update(prop_overrides)
        return {"type": "Feature", "geometry": base["geometry"], "properties": properties}

    def test_filter_activates_height_only_uncertain_review_building_as_include(self) -> None:
        # Footprint certain (roof contour present, 4 matched lines); height uncertain
        # only via a large z-spread -> activate as a conservative caster, not review.
        properties = self.make_filter_feature(
            heightM=40.0,
            matchedLineCount=4,
            baskartaZStats={"Takkonturer": {"count": 4, "minZ": 5.0, "maxZ": 30.0}},
        )["properties"]

        decision, reasons = pipeline.decide_filter(properties)

        self.assertEqual(decision, "include")
        self.assertEqual(reasons, ["large-z-spread"])

    def test_height_uncertain_activation_caps_height_lowers_quality_and_flags(self) -> None:
        feature = self.make_filter_feature(
            heightM=40.0,
            matchedLineCount=4,
            baskartaZStats={"Takkonturer": {"count": 4, "minZ": 5.0, "maxZ": 30.0}},
        )
        decision, reasons = pipeline.decide_filter(feature["properties"])
        row = pipeline.map_feature_to_shadow_caster_row(
            pipeline.enriched_feature(feature, decision, reasons), "fixture-batch"
        )

        self.assertEqual(row["filter_decision"], "include")
        self.assertIs(row["active"], True)
        # 40 m estimate is capped to the conservative height.
        self.assertEqual(row["height_m"], pipeline.HEIGHT_UNCERTAIN_CONSERVATIVE_CAP_M)
        self.assertIn(pipeline.HEIGHT_UNCERTAIN_ACTIVATED_FLAG, row["source_flags"])
        self.assertIn("large-z-spread", row["filter_reasons"])
        # Confidence-neutral: same quality_score it carried as a review row.
        self.assertAlmostEqual(
            row["quality_score"],
            pipeline.runtime_quality(feature["properties"], "review"),
            places=3,
        )
        self.assertLess(row["quality_score"], 0.7)
        # Active-row invariants still hold (active => include => >=3 m, validates clean).
        self.assertGreaterEqual(row["height_m"], 3)
        self.assertEqual(pipeline.validate_rows([row], "fixture-batch"), [])

    def test_height_uncertain_activation_keeps_short_building_height(self) -> None:
        # Below the cap the estimate is kept (the cap never inflates a height).
        feature = self.make_filter_feature(
            heightM=10.0,
            matchedLineCount=4,
            baskartaZStats={"Takkonturer": {"count": 4, "minZ": 5.0, "maxZ": 30.0}},
        )
        decision, reasons = pipeline.decide_filter(feature["properties"])
        row = pipeline.map_feature_to_shadow_caster_row(
            pipeline.enriched_feature(feature, decision, reasons), "fixture-batch"
        )

        self.assertEqual(decision, "include")
        self.assertEqual(row["height_m"], 10.0)
        self.assertIs(row["active"], True)

    def test_very_tall_building_is_activated_at_conservative_cap(self) -> None:
        feature = self.make_filter_feature(heightM=65.0, matchedLineCount=4)
        decision, reasons = pipeline.decide_filter(feature["properties"])
        row = pipeline.map_feature_to_shadow_caster_row(
            pipeline.enriched_feature(feature, decision, reasons), "fixture-batch"
        )

        self.assertEqual(decision, "include")
        self.assertEqual(reasons, ["very-tall"])
        self.assertEqual(row["height_m"], pipeline.HEIGHT_UNCERTAIN_CONSERVATIVE_CAP_M)
        self.assertIs(row["active"], True)

    def test_height_uncertain_with_no_roof_contour_stays_review(self) -> None:
        # Large z-spread but NO roof contour -> no-roof-contour-for-material-height is
        # outside the activation set, so the building stays review/inactive.
        feature = self.make_filter_feature(
            heightM=40.0,
            matchedLineCount=4,
            baskartaZStats={"Fasad": {"count": 4, "minZ": 5.0, "maxZ": 30.0}},
            sourceSubclass="Fasad",
        )
        decision, reasons = pipeline.decide_filter(feature["properties"])
        row = pipeline.map_feature_to_shadow_caster_row(
            pipeline.enriched_feature(feature, decision, reasons), "fixture-batch"
        )

        self.assertEqual(decision, "review")
        self.assertIn("no-roof-contour-for-material-height", reasons)
        self.assertIs(row["active"], False)
        self.assertNotIn(pipeline.HEIGHT_UNCERTAIN_ACTIVATED_FLAG, row["source_flags"])

    def test_missing_footprint_area_stays_review(self) -> None:
        # A missing/invalid footprint is a geometry problem, not height uncertainty.
        feature = self.make_filter_feature(areaM2=0.0, matchedLineCount=4)
        decision, reasons = pipeline.decide_filter(feature["properties"])

        self.assertEqual(decision, "review")
        self.assertIn("missing-or-invalid-area", reasons)

    def test_shadow_casters_contract_mapping_preserves_active_defaults_and_crs(self) -> None:
        import_batch_id = "fixture-batch"
        rows = []
        for feature in pipeline.load_jsonl(self.source):
            decision, reasons = pipeline.decide_filter(feature["properties"])
            enriched = pipeline.enriched_feature(feature, decision, reasons)
            rows.append(pipeline.map_feature_to_shadow_caster_row(enriched, import_batch_id))

        self.assertEqual([row["filter_decision"] for row in rows], ["include", "review", "exclude"])
        self.assertEqual([row["active"] for row in rows], [True, False, False])
        self.assertEqual(rows[0]["runtime_geometry_crs"], "EPSG:4326")
        self.assertEqual(rows[0]["metric_crs"], "EPSG:3007")
        self.assertEqual(rows[0]["source_priority"], pipeline.SOURCE_PRIORITIES["goteborg_open_derived"])
        self.assertNotIn("logicalObjectId", rows[0]["source_object_metadata"])
        self.assertEqual(rows[0]["bbox_3007"]["type"], "Polygon")
        self.assertEqual(rows[0]["centroid_3007"]["type"], "Point")

    def test_filter_summary_output_is_deterministic(self) -> None:
        args = argparse.Namespace(
            source=str(self.source),
            out_dir=str(self.tmpdir),
            include=None,
            review=None,
            excluded=None,
            summary_json=None,
            summary_md=None,
        )
        self.assertEqual(pipeline.command_filter(args), 0)
        first = (self.tmpdir / "buildings_central_shadow_casters.filter_summary.json").read_text(encoding="utf-8")
        self.assertEqual(pipeline.command_filter(args), 0)
        second = (self.tmpdir / "buildings_central_shadow_casters.filter_summary.json").read_text(encoding="utf-8")

        self.assertEqual(first, second)
        summary = json.loads(first)
        self.assertEqual(summary["decisionCounts"], {"exclude": 1, "include": 1, "review": 1})
        self.assertEqual(summary["endToEndCounts"]["candidateRows"], 3)

    def test_emit_import_and_validate_artifacts_without_database_access(self) -> None:
        self.assertEqual(pipeline.command_filter(argparse.Namespace(
            source=str(self.source),
            out_dir=str(self.tmpdir),
            include=None,
            review=None,
            excluded=None,
            summary_json=None,
            summary_md=None,
        )), 0)
        self.assertEqual(pipeline.command_emit_import(argparse.Namespace(
            out_dir=str(self.tmpdir),
            include=str(self.tmpdir / "buildings_central_shadow_casters.filtered.geojsonl"),
            review=str(self.tmpdir / "buildings_central_shadow_casters.review.geojsonl"),
            excluded=str(self.tmpdir / "buildings_central_shadow_casters.excluded.geojsonl"),
            import_jsonl=None,
            excluded_diagnostics_jsonl=None,
            manifest=None,
            sql_handoff=None,
            import_batch_id="fixture-batch",
        )), 0)

        manifest = json.loads((self.tmpdir / "shadow_casters.import_manifest.json").read_text(encoding="utf-8"))
        self.assertEqual(manifest["rowCounts"]["include"], 1)
        self.assertEqual(manifest["rowCounts"]["review"], 1)
        self.assertEqual(manifest["rowCounts"]["excludeDiagnostics"], 1)

        self.assertEqual(pipeline.command_validate_artifacts(argparse.Namespace(
            manifest=str(self.tmpdir / "shadow_casters.import_manifest.json"),
            import_jsonl=None,
            excluded_diagnostics_jsonl=None,
            output_json=None,
        )), 0)
        handoff = (self.tmpdir / "shadow_casters.import_handoff.sql").read_text(encoding="utf-8")
        self.assertIn("\\copy shadow_caster_import_stage", handoff)
        self.assertNotIn("COPY public.", handoff)

    def test_artifact_validation_fails_for_active_review_rows(self) -> None:
        row = pipeline.map_feature_to_shadow_caster_row(
            pipeline.enriched_feature(
                pipeline.load_jsonl(self.source)[1],
                "review",
                ["single-line-tall"],
            ),
            "fixture-batch",
        )
        row["active"] = True
        errors = pipeline.validate_rows([row], "fixture-batch")
        self.assertTrue(any("active row must be include" in error for error in errors))

    def test_artifact_validation_fails_when_metric_helpers_are_missing(self) -> None:
        row = pipeline.map_feature_to_shadow_caster_row(
            pipeline.enriched_feature(
                pipeline.load_jsonl(self.source)[0],
                "include",
                [],
            ),
            "fixture-batch",
        )
        row["bbox_3007"] = None
        row["centroid_3007"] = None

        errors = pipeline.validate_rows([row], "fixture-batch")

        self.assertTrue(any("bbox_3007 metric helper" in error for error in errors))
        self.assertTrue(any("centroid_3007 metric helper" in error for error in errors))

    def test_geodata_python_cache_files_remain_ignored(self) -> None:
        gitignore = (ROOT / ".gitignore").read_text(encoding="utf-8")

        self.assertIn("scripts/geodata/**/__pycache__/", gitignore)
        self.assertIn("scripts/geodata/**/*.py[cod]", gitignore)

    def test_combined_hash_ignores_local_path_strings(self) -> None:
        left = self.tmpdir / "left" / "include.geojsonl"
        right = self.tmpdir / "right" / "include.geojsonl"
        left.parent.mkdir()
        right.parent.mkdir()
        left.write_text("same-content\n", encoding="utf-8")
        right.write_text("same-content\n", encoding="utf-8")
        extra = {"sourceDataset": pipeline.SOURCE_DATASET}

        self.assertEqual(
            pipeline.combined_hash([left], extra),
            pipeline.combined_hash([right], extra),
        )

    def test_shadow_casters_contract_mapping_includes_raw_source_and_match_provenance(self) -> None:
        row = pipeline.map_feature_to_shadow_caster_row(
            pipeline.enriched_feature(
                pipeline.load_jsonl(self.source)[0],
                "include",
                [],
            ),
            "fixture-batch",
        )

        self.assertIn("rawSourceFiles", row["source_object_metadata"])
        self.assertIn("matchBufferM", row["source_object_metadata"])
        self.assertIn("dtmTileIds", row["source_object_metadata"])
        self.assertIn("rawSourceFiles", row["provenance_metadata"])
        self.assertIn("matchBufferM", row["provenance_metadata"])

    def test_shadow_casters_contract_mapping_preserves_source_3d_geometry_separately(self) -> None:
        feature = pipeline.enriched_feature(
            pipeline.load_jsonl(self.source)[0],
            "include",
            [],
        )
        feature["properties"]["sourceGeom3007"] = {
            "type": "LineString",
            "coordinates": [
                [140000.0, 6390000.0, 24.5],
                [140002.0, 6390002.0, 26.25],
            ],
        }
        feature["properties"]["sourceLayer"] = "byggnad_l"
        feature["properties"]["sourceSubclass"] = "Takkonturer"

        row = pipeline.map_feature_to_shadow_caster_row(feature, "fixture-batch")

        self.assertEqual(row["geometry"]["type"], "Polygon")
        self.assertEqual(row["source_geom_3007"]["type"], "LineString")
        self.assertEqual(row["source_geom_3007"]["coordinates"][0][2], 24.5)
        self.assertEqual(row["source_layer"], "byggnad_l")
        self.assertEqual(row["source_subclass"], "Takkonturer")
        self.assertIn("RH2000", row["z_semantics"])
        self.assertIn("rawSourceFiles", row["source_collection_metadata"])
        self.assertIn("sourceRefresh", row["source_update_metadata"])

    def test_candidate_output_emits_matched_baskarta_source_z_geometry(self) -> None:
        from shapely.geometry import LineString, Polygon

        class FakeSampler:
            def sample(self, _x: float, _y: float) -> float:
                return 10.0

        footprint = pipeline.Footprint(
            fid=42,
            external_id="derived-source-z",
            object_type="Bostad",
            purpose="Bostad",
            geom_3007=Polygon([
                (140000.0, 6390000.0),
                (140010.0, 6390000.0),
                (140010.0, 6390010.0),
                (140000.0, 6390010.0),
                (140000.0, 6390000.0),
            ]),
            area_m2=100.0,
        )
        footprint.lines_by_type["Takkonturer"].extend([24.5, 26.25])
        footprint.source_lines_by_type["Takkonturer"].append(LineString([
            (140000.0, 6390000.0, 24.5),
            (140010.0, 6390000.0, 26.25),
        ]))
        footprint.matched_line_count = 1
        output = self.tmpdir / "derived-candidates.geojsonl"
        summary = self.tmpdir / "derived-candidates.summary.json"

        result = pipeline.emit_candidate_outputs(
            [footprint],
            FakeSampler(),
            output,
            summary,
            pipeline.MVP_BBOX_3007,
            {"sourceFiles": pipeline.DEFAULT_RAW_SOURCE_FILES},
        )

        self.assertEqual(result["stats"]["emitted"], 1)
        feature = pipeline.load_jsonl(output)[0]
        self.assertEqual(feature["properties"]["sourceGeometryType"], "LineStringZ")
        self.assertEqual(feature["properties"]["sourceGeom3007"]["coordinates"][0][2], 24.5)

        row = pipeline.map_feature_to_shadow_caster_row(feature, "fixture-batch")
        self.assertIsNotNone(row)
        self.assertEqual(row["source_geom_3007"]["coordinates"][1][2], 26.25)
        self.assertFalse(any(
            "source_geom_3007" in error
            for error in pipeline.validate_rows([row], "fixture-batch")
        ))

    def test_artifact_validation_rejects_flattened_source_3d_geometry(self) -> None:
        feature = pipeline.enriched_feature(
            pipeline.load_jsonl(self.source)[0],
            "include",
            [],
        )
        feature["properties"]["sourceGeom3007"] = {
            "type": "LineString",
            "coordinates": [
                [140000.0, 6390000.0],
                [140002.0, 6390002.0],
            ],
        }
        feature["properties"]["sourceLayer"] = "byggnad_l"
        feature["properties"]["sourceSubclass"] = "Takkonturer"

        row = pipeline.map_feature_to_shadow_caster_row(feature, "fixture-batch")
        errors = pipeline.validate_rows([row], "fixture-batch")

        self.assertTrue(any("source_geom_3007 position 0 is missing Z" in error for error in errors))

    def test_artifact_validation_rejects_active_byggnad_l_without_source_geometry(self) -> None:
        feature = pipeline.enriched_feature(
            pipeline.load_jsonl(self.source)[0],
            "include",
            [],
        )
        feature["properties"].pop("sourceGeom3007", None)

        row = pipeline.map_feature_to_shadow_caster_row(feature, "fixture-batch")
        errors = pipeline.validate_rows([row], "fixture-batch")

        self.assertTrue(any("active byggnad_l row requires source_geom_3007" in error for error in errors))

    def test_artifact_validation_rejects_source_geometry_outside_epsg3007_bbox(self) -> None:
        feature = pipeline.enriched_feature(
            pipeline.load_jsonl(self.source)[0],
            "include",
            [],
        )
        feature["properties"]["sourceGeom3007"] = {
            "type": "LineString",
            "coordinates": [
                [11.96, 57.70, 24.5],
                [11.97, 57.71, 26.25],
            ],
        }

        row = pipeline.map_feature_to_shadow_caster_row(feature, "fixture-batch")
        errors = pipeline.validate_rows([row], "fixture-batch")

        self.assertTrue(any("outside EPSG:3007 MVP bbox" in error for error in errors))

    def test_artifact_validation_allows_source_geometry_within_bbox_tolerance(self) -> None:
        # Edge-of-bbox buildings are kept by centroid-in-bbox, so their source
        # geometry can spill a short distance past the MVP boundary. Within the
        # mis-projection tolerance these must NOT be rejected.
        feature = pipeline.enriched_feature(
            pipeline.load_jsonl(self.source)[0],
            "include",
            [],
        )
        over_x = pipeline.MVP_BBOX_3007[2] + pipeline.MVP_BBOX_3007_SOURCE_GEOM_TOLERANCE_M - 1.0
        feature["properties"]["sourceGeom3007"] = {
            "type": "LineString",
            "coordinates": [
                [149990.0, 6390010.0, 24.5],
                [over_x, 6390012.0, 26.25],
            ],
        }
        feature["properties"]["sourceLayer"] = "byggnad_l"
        feature["properties"]["sourceSubclass"] = "Takkonturer"

        row = pipeline.map_feature_to_shadow_caster_row(feature, "fixture-batch")
        errors = pipeline.validate_rows([row], "fixture-batch")

        self.assertFalse(any("outside EPSG:3007 MVP bbox" in error for error in errors))

    def test_artifact_validation_rejects_source_geometry_beyond_bbox_tolerance(self) -> None:
        # A vertex well past the tolerance (but still metre-scale, not a CRS error)
        # must still be rejected so the mis-projection guard keeps biting.
        feature = pipeline.enriched_feature(
            pipeline.load_jsonl(self.source)[0],
            "include",
            [],
        )
        over_x = pipeline.MVP_BBOX_3007[2] + pipeline.MVP_BBOX_3007_SOURCE_GEOM_TOLERANCE_M + 300.0
        feature["properties"]["sourceGeom3007"] = {
            "type": "LineString",
            "coordinates": [
                [149990.0, 6390010.0, 24.5],
                [over_x, 6390012.0, 26.25],
            ],
        }
        feature["properties"]["sourceLayer"] = "byggnad_l"
        feature["properties"]["sourceSubclass"] = "Takkonturer"

        row = pipeline.map_feature_to_shadow_caster_row(feature, "fixture-batch")
        errors = pipeline.validate_rows([row], "fixture-batch")

        self.assertTrue(any("outside EPSG:3007 MVP bbox" in error for error in errors))

    def test_artifact_validation_allows_source_geometry_within_tolerance_on_lower_and_upper_edges(self) -> None:
        # The tolerance expands all four edges symmetrically (min_x/min_y -= tol,
        # max_x/max_y += tol). The +x edge is covered above; assert the lower
        # (min_x, min_y) and upper-y (max_y) edges are expanded too, so a vertex
        # just past each of those boundaries within tolerance is NOT rejected.
        feature = pipeline.enriched_feature(
            pipeline.load_jsonl(self.source)[0],
            "include",
            [],
        )
        tolerance = pipeline.MVP_BBOX_3007_SOURCE_GEOM_TOLERANCE_M
        under_min_x = pipeline.MVP_BBOX_3007[0] - tolerance + 1.0
        under_min_y = pipeline.MVP_BBOX_3007[1] - tolerance + 1.0
        over_max_y = pipeline.MVP_BBOX_3007[3] + tolerance - 1.0
        feature["properties"]["sourceGeom3007"] = {
            "type": "LineString",
            "coordinates": [
                [under_min_x, 6395000.0, 24.5],
                [145000.0, under_min_y, 25.0],
                [145000.0, over_max_y, 26.25],
            ],
        }
        feature["properties"]["sourceLayer"] = "byggnad_l"
        feature["properties"]["sourceSubclass"] = "Takkonturer"

        row = pipeline.map_feature_to_shadow_caster_row(feature, "fixture-batch")
        errors = pipeline.validate_rows([row], "fixture-batch")

        self.assertFalse(any("outside EPSG:3007 MVP bbox" in error for error in errors))

    def test_artifact_validation_rejects_source_geometry_below_min_y_beyond_tolerance(self) -> None:
        # The existing reject test only proves the +x edge still bites. Confirm the
        # min-side guard bites too: a vertex well below min_y past the tolerance
        # (metre-scale, not a CRS error) must still be rejected.
        feature = pipeline.enriched_feature(
            pipeline.load_jsonl(self.source)[0],
            "include",
            [],
        )
        under_min_y = pipeline.MVP_BBOX_3007[1] - pipeline.MVP_BBOX_3007_SOURCE_GEOM_TOLERANCE_M - 300.0
        feature["properties"]["sourceGeom3007"] = {
            "type": "LineString",
            "coordinates": [
                [145000.0, 6395000.0, 24.5],
                [145000.0, under_min_y, 26.25],
            ],
        }
        feature["properties"]["sourceLayer"] = "byggnad_l"
        feature["properties"]["sourceSubclass"] = "Takkonturer"

        row = pipeline.map_feature_to_shadow_caster_row(feature, "fixture-batch")
        errors = pipeline.validate_rows([row], "fixture-batch")

        self.assertTrue(any("outside EPSG:3007 MVP bbox" in error for error in errors))

    def test_shadow_casters_contract_keeps_non_building_source_layers_inactive(self) -> None:
        feature = pipeline.enriched_feature(
            pipeline.load_jsonl(self.source)[0],
            "include",
            [],
        )
        feature["properties"]["sourceLayer"] = "markdetaljer"
        feature["properties"]["sourceSubclass"] = "Trad"
        feature["properties"]["casterClass"] = "vegetation"

        row = pipeline.map_feature_to_shadow_caster_row(feature, "fixture-batch")

        self.assertEqual(row["filter_decision"], "include")
        self.assertEqual(row["source_layer"], "markdetaljer")
        self.assertEqual(row["source_subclass"], "Trad")
        self.assertEqual(row["caster_class"], "vegetation")
        self.assertFalse(row["active"])

    def test_sql_handoff_escapes_literals_and_replaces_existing_batch_rows(self) -> None:
        sql_path = self.tmpdir / "handoff.sql"
        manifest = {
            "importBatch": {
                "id": "fixture-'batch",
                "sourceDataset": "dataset-'quoted",
                "sourceDescription": "source 'quoted'",
                "sourceMetadata": {"owner": "O'Hara"},
            },
        }

        pipeline.write_sql_handoff(
            sql_path,
            self.tmpdir / "import's.jsonl",
            self.tmpdir / "diagnostics's.jsonl",
            manifest,
        )

        handoff = sql_path.read_text(encoding="utf-8")
        self.assertIn("begin;", handoff)
        self.assertIn("'fixture-''batch'", handoff)
        self.assertIn("'dataset-''quoted'", handoff)
        self.assertIn("'source ''quoted'''", handoff)
        self.assertIn("\"owner\": \"O''Hara\"", handoff)
        self.assertIn("delete from public.shadow_casters", handoff)
        self.assertIn("where import_batch_id = 'fixture-''batch';", handoff)
        self.assertIn("\\copy shadow_caster_import_stage(payload_text) from '", handoff)
        self.assertIn("import''s.jsonl", handoff)

    def test_sql_handoff_copy_preserves_backslashes_with_csv_control_chars(self) -> None:
        # COPY TEXT escape-processes backslashes and would corrupt JSON payloads
        # containing Windows-style paths (e.g. "building_geodata\\goteborg-open"),
        # breaking the ::jsonb cast. The staging load must use CSV with control-char
        # quote/delimiter so each JSONL line is read verbatim.
        sql_path = self.tmpdir / "handoff.sql"
        manifest = {
            "importBatch": {
                "id": "fixture-batch",
                "sourceDataset": "dataset",
                "sourceDescription": "desc",
                "sourceMetadata": {"k": "v"},
            },
        }

        pipeline.write_sql_handoff(
            sql_path,
            self.tmpdir / "import.jsonl",
            self.tmpdir / "diagnostics.jsonl",
            manifest,
        )

        handoff = sql_path.read_text(encoding="utf-8")
        self.assertIn("with (format csv, quote E'\\x01', delimiter E'\\x02')", handoff)
        self.assertNotIn("with (format text)", handoff)
        # Bulk import must lift Supabase's default per-statement timeout for the load.
        self.assertIn("set local statement_timeout = 0;", handoff)

    def test_artifact_validation_fails_for_invalid_runtime_polygon(self) -> None:
        row = pipeline.map_feature_to_shadow_caster_row(
            pipeline.enriched_feature(
                pipeline.load_jsonl(self.source)[0],
                "include",
                [],
            ),
            "fixture-batch",
        )
        row["geometry"] = {
            "type": "Polygon",
            "coordinates": [[
                [0, 0],
                [1, 1],
                [1, 0],
                [0, 1],
                [0, 0],
            ]],
        }

        errors = pipeline.validate_rows([row], "fixture-batch")

        self.assertTrue(any("runtime geometry is invalid" in error for error in errors))

    def test_dtm_sampler_boundaries_use_explicit_tile_indexing(self) -> None:
        class FakeTile:
            shape = (2, 2)
            values = [[10.0, 20.0], [30.0, 40.0]]

            def __getitem__(self, index: tuple[int, int]) -> float:
                row, col = index
                return self.values[row][col]

        sampler = object.__new__(pipeline.DtmSampler)
        tif_name = "199_10/199_100.tif"
        tfw_name = "199_10/199_100.tfw"
        sampler._members = {tif_name: object(), tfw_name: object()}
        sampler._cache = {
            tif_name: (
                FakeTile(),
                (1.0, 0.0, 0.0, -1.0, 100000.0, 200000.0),
            )
        }
        sampler._zips = []
        sampler._tifffile = None

        self.assertEqual(sampler.sample(100001.0, 199999.0), 40.0)
        self.assertEqual(sampler.sample(100000.5, 199999.5), 40.0)
        self.assertIsNone(sampler.sample(100002.0, 199998.0))

    def test_emit_spot_check_template_is_deterministic_and_covers_required_clusters(self) -> None:
        source = self.tmpdir / "shadow_casters.import.jsonl"
        rows = []
        for feature in pipeline.load_jsonl(self.source):
            row = pipeline.map_feature_to_shadow_caster_row(
                pipeline.enriched_feature(feature, "include", []),
                "fixture-batch",
            )
            rows.append(row)
        pipeline.write_jsonl(source, rows)

        output = self.tmpdir / "spot_checks.template.jsonl"
        args = argparse.Namespace(source=str(source), output=str(output), per_cluster=10)

        self.assertEqual(pipeline.command_emit_spot_check_template(args), 0)
        first = output.read_text(encoding="utf-8")
        self.assertEqual(pipeline.command_emit_spot_check_template(args), 0)
        second = output.read_text(encoding="utf-8")

        self.assertEqual(first, second)
        template_rows = pipeline.load_jsonl(output)
        self.assertGreaterEqual(len(template_rows), 70)
        counts_by_cluster = {}
        buckets_by_cluster = {}
        for row in template_rows:
            counts_by_cluster[row["cluster_id"]] = counts_by_cluster.get(row["cluster_id"], 0) + 1
            buckets_by_cluster.setdefault(row["cluster_id"], set()).add(row["sun_condition_bucket"])

        self.assertEqual(set(counts_by_cluster), set(pipeline.REQUIRED_SPOT_CHECK_CLUSTER_IDS))
        self.assertTrue(all(count >= 10 for count in counts_by_cluster.values()))
        self.assertTrue(
            all(pipeline.REQUIRED_SUN_CONDITION_BUCKETS <= buckets for buckets in buckets_by_cluster.values())
        )
        self.assertEqual(template_rows, sorted(template_rows, key=lambda row: row["spot_check_id"]))
        self.assertTrue(all(row["agreement_result"] == "pending" for row in template_rows))
        self.assertTrue(all(row["expected_building_shadow"] == "" for row in template_rows))
        self.assertTrue(all("venue or street-facing" in row["notes"] for row in template_rows))

    def test_evaluate_spot_checks_separates_uncertainty_and_threshold_statuses(self) -> None:
        rows = pipeline.load_jsonl(SPOT_CHECK_FIXTURE)
        summary, errors = pipeline.evaluate_spot_check_rows(rows, required_cluster_ids=["inom-vallgraven", "nordstan", "haga"])

        self.assertTrue(errors)
        clusters = summary["clusters"]
        self.assertEqual(clusters["inom-vallgraven"]["status"], "insufficient_evidence")
        self.assertEqual(clusters["inom-vallgraven"]["agreementRate"], 1.0)
        self.assertEqual(clusters["inom-vallgraven"]["uncertaintyCounts"], {"awning": 1})
        self.assertEqual(clusters["inom-vallgraven"]["buildingAgreementDenominator"], 9)
        self.assertEqual(clusters["nordstan"]["status"], "insufficient_evidence")
        self.assertEqual(clusters["haga"]["status"], "blocked")
        self.assertIn("central validation set has fewer than 70 completed checks", errors)

    def test_full_launch_evidence_can_make_cluster_eligible(self) -> None:
        summary, errors = pipeline.evaluate_spot_check_rows(self.make_full_launch_rows())

        self.assertFalse(errors)
        self.assertEqual(summary["status"], "pass")
        self.assertEqual(summary["totalCompletedChecks"], 80)
        self.assertTrue(all(
            cluster["status"] == "eligible"
            for cluster in summary["clusters"].values()
        ))
        self.assertTrue(all(
            cluster["buildingAgreementDenominator"] == pipeline.MIN_BUILDING_AGREEMENT_DENOMINATOR
            for cluster in summary["clusters"].values()
        ))

    def test_uncertain_rows_cannot_satisfy_clear_agreement_minimum(self) -> None:
        summary, errors = pipeline.evaluate_spot_check_rows(self.make_full_launch_rows(uncertain_per_cluster=9))

        self.assertTrue(errors)
        self.assertEqual(summary["status"], "fail")
        self.assertTrue(all(
            cluster["status"] == "insufficient_evidence"
            for cluster in summary["clusters"].values()
        ))
        self.assertIn("inom-vallgraven: fewer than 9 clear building-agreement checks", errors)

    def test_evaluate_spot_checks_writes_json_and_markdown_reports(self) -> None:
        output_json = self.tmpdir / "cluster_validation.json"
        output_md = self.tmpdir / "cluster_validation.md"
        result = pipeline.command_evaluate_spot_checks(argparse.Namespace(
            source=str(SPOT_CHECK_FIXTURE),
            output_json=str(output_json),
            output_md=str(output_md),
            require_all_clusters=False,
        ))

        self.assertEqual(result, 1)
        first_json = output_json.read_text(encoding="utf-8")
        first_md = output_md.read_text(encoding="utf-8")
        pipeline.command_evaluate_spot_checks(argparse.Namespace(
            source=str(SPOT_CHECK_FIXTURE),
            output_json=str(output_json),
            output_md=str(output_md),
            require_all_clusters=False,
        ))
        self.assertEqual(output_json.read_text(encoding="utf-8"), first_json)
        self.assertEqual(output_md.read_text(encoding="utf-8"), first_md)
        self.assertIn("85%", first_md)
        self.assertIn("insufficient_evidence", first_md)
        parsed = json.loads(first_json)
        self.assertEqual(parsed["scope"], "partial_cluster_set")
        self.assertIn("partial cluster set is not a full launch-cluster gate", parsed["errors"])

    def test_spot_check_validation_rejects_malformed_rows(self) -> None:
        base = pipeline.load_jsonl(SPOT_CHECK_FIXTURE)[0]
        malformed_cases = [
            ("missing cluster ID", {"cluster_id": ""}),
            ("unknown uncertainty cause", {"uncertainty_causes": ["billboard"]}),
            ("other uncertainty requires notes", {"uncertainty_causes": ["other"], "notes": ""}),
            ("invalid point type", {"point_type": "patio"}),
            ("invalid agreement result", {"agreement_result": "maybe"}),
            ("invalid coordinate", {"coordinate_wgs84": {"lon": 200, "lat": 57.7}}),
            ("missing sun condition", {"sun_condition_bucket": ""}),
            ("missing spot check ID", {"spot_check_id": ""}),
            ("missing source artifact", {"source_artifact": ""}),
            ("invalid representative time", {"representative_local_datetime": ""}),
            ("agreement contradiction", {
                "agreement_result": "agree",
                "expected_building_shadow": "shadowed",
                "observed_manual_result": "sunny",
            }),
            ("duplicate cause on agree", {"agreement_result": "agree", "uncertainty_causes": ["awning"]}),
            ("uncertain without cause", {"agreement_result": "uncertain", "uncertainty_causes": []}),
            ("outside declared cluster", {"cluster_id": "haga", "coordinate_wgs84": {"lon": 11.9639, "lat": 57.7053}}),
        ]

        for label, updates in malformed_cases:
            row = dict(base)
            row.update(updates)
            errors = pipeline.validate_spot_check_row(row, 1)
            self.assertTrue(errors, label)

    def test_duplicate_spot_check_ids_fail_validation(self) -> None:
        rows = self.make_full_launch_rows()
        rows[1]["spot_check_id"] = rows[0]["spot_check_id"]

        summary, errors = pipeline.evaluate_spot_check_rows(rows)

        self.assertEqual(summary["status"], "fail")
        self.assertTrue(any("duplicate spot_check_id" in error for error in errors))

    def test_preflight_baskarta_reports_z_layers_type_distributions_and_markdown(self) -> None:
        source = self.write_baskarta_fixture_layers("byggnad_l", "markdetaljer", "anlaggningar_p")
        output_json = self.tmpdir / "preflight.json"
        output_md = self.tmpdir / "preflight.md"
        args = argparse.Namespace(input=str(source), output_json=str(output_json), output_md=str(output_md))

        self.assertEqual(pipeline.command_preflight_baskarta(args), 0)
        first_json = output_json.read_text(encoding="utf-8")
        self.assertEqual(pipeline.command_preflight_baskarta(args), 0)
        self.assertEqual(output_json.read_text(encoding="utf-8"), first_json)

        report = json.loads(first_json)
        self.assertEqual(report["status"], "pass")
        self.assertEqual([layer["layerName"] for layer in report["layers"]], ["anlaggningar_p", "byggnad_l", "markdetaljer"])
        byggnad = next(layer for layer in report["layers"] if layer["layerName"] == "byggnad_l")
        self.assertEqual(byggnad["geometryType"], "POLYLINEZ")
        self.assertEqual(byggnad["recordCount"], 2)
        self.assertEqual(byggnad["typeDistributions"]["typ"], {"Fasad": 1, "Takkonturer": 1})
        self.assertEqual(byggnad["zStats"]["min"], 12.0)
        self.assertEqual(byggnad["zStats"]["max"], 26.25)
        self.assertEqual(byggnad["missingZCount"], 0)
        self.assertIn("| byggnad_l | POLYLINEZ | 2 | 12.0..26.25 | 0 |", output_md.read_text(encoding="utf-8"))

    def test_preflight_baskarta_accepts_zip_input(self) -> None:
        source = self.write_baskarta_fixture_layers("byggnad_l", "markdetaljer", "anlaggningar_p")
        archive = self.zip_baskarta_fixture(source)
        output_json = self.tmpdir / "zip-preflight.json"
        output_md = self.tmpdir / "zip-preflight.md"

        self.assertEqual(pipeline.command_preflight_baskarta(argparse.Namespace(
            input=str(archive),
            output_json=str(output_json),
            output_md=str(output_md),
        )), 0)

        report = json.loads(output_json.read_text(encoding="utf-8"))
        self.assertEqual(report["status"], "pass")
        self.assertEqual(report["inputKind"], "zip")
        self.assertEqual(len(report["layers"]), 3)

    def test_preflight_baskarta_fails_flattened_expected_layer(self) -> None:
        source = self.write_baskarta_fixture_layers("kommunikation")
        output_json = self.tmpdir / "flattened-preflight.json"
        output_md = self.tmpdir / "flattened-preflight.md"

        self.assertEqual(pipeline.command_preflight_baskarta(argparse.Namespace(
            input=str(source),
            output_json=str(output_json),
            output_md=str(output_md),
        )), 1)

        report = json.loads(output_json.read_text(encoding="utf-8"))
        self.assertEqual(report["status"], "fail")
        self.assertTrue(any("kommunikation" in error and "flattened" in error for error in report["errors"]))
        self.assertIn("flattened", output_md.read_text(encoding="utf-8"))

    def test_preflight_baskarta_checks_expected_layers_case_insensitively(self) -> None:
        import shapefile

        source = self.tmpdir / "case-baskarta"
        source.mkdir()
        writer = shapefile.Writer(str(source / "Byggnad_L"), shapeType=shapefile.POLYLINE)
        writer.field("typ", "C", 40)
        writer.line([[[140000.0, 6390000.0], [140002.0, 6390002.0]]])
        writer.record(typ="Takkonturer")
        writer.close()
        output_json = self.tmpdir / "case-preflight.json"
        output_md = self.tmpdir / "case-preflight.md"

        self.assertEqual(pipeline.command_preflight_baskarta(argparse.Namespace(
            input=str(source),
            output_json=str(output_json),
            output_md=str(output_md),
        )), 1)

        report = json.loads(output_json.read_text(encoding="utf-8"))
        self.assertIn("byggnad_l", report["expectedZLayers"]["present"])
        self.assertTrue(any("Byggnad_L" in error and "flattened" in error for error in report["errors"]))

    def test_preflight_baskarta_fails_expected_layer_with_missing_z_values(self) -> None:
        import shapefile

        source = self.tmpdir / "missing-z-baskarta"
        source.mkdir()
        writer = shapefile.Writer(str(source / "byggnad_l"), shapeType=shapefile.POLYLINEZ)
        writer.field("typ", "C", 40)
        writer.linez([[
            [140000.0, 6390000.0, math.nan],
            [140002.0, 6390002.0, 26.25],
        ]])
        writer.record(typ="Takkonturer")
        writer.close()
        output_json = self.tmpdir / "missing-z-preflight.json"
        output_md = self.tmpdir / "missing-z-preflight.md"

        self.assertEqual(pipeline.command_preflight_baskarta(argparse.Namespace(
            input=str(source),
            output_json=str(output_json),
            output_md=str(output_md),
        )), 1)

        report = json.loads(output_json.read_text(encoding="utf-8"))
        byggnad = next(layer for layer in report["layers"] if layer["layerName"] == "byggnad_l")
        self.assertEqual(byggnad["missingZCount"], 1)
        self.assertEqual(byggnad["nonFiniteZCount"], 1)
        self.assertTrue(any("missing Z values" in error for error in report["errors"]))

    def test_preflight_baskarta_discovers_uppercase_shp_extensions(self) -> None:
        source = self.write_baskarta_fixture_layers("byggnad_l")
        for suffix in [".shp", ".shx", ".dbf"]:
            original = source / f"byggnad_l{suffix}"
            temporary = source / f"byggnad_l_temp{suffix}"
            upper = source / f"byggnad_l{suffix.upper()}"
            original.rename(temporary)
            temporary.rename(upper)
        output_json = self.tmpdir / "uppercase-preflight.json"
        output_md = self.tmpdir / "uppercase-preflight.md"

        self.assertEqual(pipeline.command_preflight_baskarta(argparse.Namespace(
            input=str(source),
            output_json=str(output_json),
            output_md=str(output_md),
        )), 0)

        report = json.loads(output_json.read_text(encoding="utf-8"))
        self.assertEqual([layer["layerName"] for layer in report["layers"]], ["byggnad_l"])

    def test_preflight_baskarta_reports_unreadable_layers_without_crashing(self) -> None:
        source = self.tmpdir / "broken-baskarta"
        source.mkdir()
        (source / "byggnad_l.shp").write_bytes(b"not a shapefile")
        output_json = self.tmpdir / "broken-preflight.json"
        output_md = self.tmpdir / "broken-preflight.md"

        self.assertEqual(pipeline.command_preflight_baskarta(argparse.Namespace(
            input=str(source),
            output_json=str(output_json),
            output_md=str(output_md),
        )), 1)

        report = json.loads(output_json.read_text(encoding="utf-8"))
        self.assertEqual(report["status"], "fail")
        self.assertEqual(report["layers"][0]["geometryType"], "UNREADABLE")
        self.assertTrue(any("cannot read SHP layer" in error for error in report["errors"]))
        self.assertIn("cannot read SHP layer", output_md.read_text(encoding="utf-8"))

    def test_preflight_baskarta_requires_typ_for_byggnad_runtime_classification(self) -> None:
        import shapefile

        source = self.tmpdir / "missing-typ-baskarta"
        source.mkdir()
        writer = shapefile.Writer(str(source / "byggnad_l"), shapeType=shapefile.POLYLINEZ)
        writer.field("klass", "C", 40)
        writer.linez([[
            [140000.0, 6390000.0, 24.5],
            [140002.0, 6390002.0, 26.25],
        ]])
        writer.record(klass="Takkonturer")
        writer.close()
        output_json = self.tmpdir / "missing-typ-preflight.json"
        output_md = self.tmpdir / "missing-typ-preflight.md"

        self.assertEqual(pipeline.command_preflight_baskarta(argparse.Namespace(
            input=str(source),
            output_json=str(output_json),
            output_md=str(output_md),
        )), 1)

        report = json.loads(output_json.read_text(encoding="utf-8"))
        self.assertTrue(any("requires typ field" in error for error in report["errors"]))


if __name__ == "__main__":
    unittest.main()
