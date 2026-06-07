from __future__ import annotations

import argparse
import hashlib
import json
import math
import numbers
import sqlite3
import statistics
import sys
import tempfile
import zipfile
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable


MVP_BBOX_3007 = (140000.0, 6390000.0, 150000.0, 6410000.0)
SOURCE_FOOTPRINT_CRS = "EPSG:3006"
METRIC_CRS = "EPSG:3007"
RUNTIME_GEOMETRY_CRS = "EPSG:4326"
SOURCE_DATASET = "goteborg-open-derived-shadow-casters-v1"
SOURCE_DESCRIPTION = (
    "Lantmateriet building footprints + Goteborg Baskarta XYZ inventory "
    "(current active building subset: byggnad_l) + Goteborg Hojdmodell 2022 DTM"
)
SOURCE_Z_SEMANTICS = (
    "Baskarta XYZ source Z values are RH2000 object elevations; height_m is derived as "
    "roof/facade/shelter source Z minus Goteborg Hojdmodell 2022 DTM ground_z_rh2000."
)
SOURCE_REFRESH_POLICY = "manual-reviewed-geodata-refresh"
BUILDING_LINE_TYPES = {"Takkonturer", "Fasad", "Skärmtak"}
MAJOR_TYPES = {"Bostad", "Verksamhet", "Samhällsfunktion", "Industri"}
CLUSTER_RADIUS_M = 650.0
CLUSTERS_WGS84 = {
    "inom-vallgraven": (11.9639, 57.7053),
    "nordstan": (11.9690, 57.7086),
    "lilla-bommen": (11.9669, 57.7115),
    "avenyn": (11.9746, 57.6996),
    "vasastan": (11.9672, 57.6976),
    "haga": (11.9573, 57.6983),
    "linne": (11.9517, 57.6933),
    "central-surroundings": (11.9840, 57.7040),
}
CLUSTER_NAMES = {
    "inom-vallgraven": "Inom Vallgraven",
    "nordstan": "Nordstan",
    "lilla-bommen": "Lilla Bommen",
    "avenyn": "Avenyn",
    "vasastan": "Vasastan",
    "haga": "Haga",
    "linne": "Linné",
    "central-surroundings": "Surrounding central areas",
}
REQUIRED_SPOT_CHECK_CLUSTER_IDS = tuple(CLUSTERS_WGS84.keys())
REQUIRED_SUN_CONDITION_BUCKETS = {
    "morning_low_angle",
    "midday_high_sun",
    "afternoon_evening_directional",
}
SUN_CONDITION_TIMES = {
    "morning_low_angle": "2026-06-21T09:00:00+02:00",
    "midday_high_sun": "2026-06-21T12:00:00+02:00",
    "afternoon_evening_directional": "2026-06-21T17:00:00+02:00",
}
POINT_TYPES = {"venue", "street_facing"}
SHADOW_RESULTS = {"shadowed", "sunny", ""}
AGREEMENT_RESULTS = {"pending", "agree", "disagree", "uncertain"}
UNCERTAINTY_CAUSES = {
    "tree",
    "awning",
    "umbrella",
    "bridge",
    "temporary_structure",
    "seasonal_furniture",
    "other",
}
MIN_SPOT_CHECKS_PER_CLUSTER = 10
MIN_CENTRAL_SPOT_CHECKS = 70
HIGH_CONFIDENCE_AGREEMENT_THRESHOLD = 0.85
MIN_BUILDING_AGREEMENT_DENOMINATOR = math.ceil(
    MIN_SPOT_CHECKS_PER_CLUSTER * HIGH_CONFIDENCE_AGREEMENT_THRESHOLD
)
SOURCE_PRIORITIES = {
    "manual_verified_override": 10,
    "paid_lod2_lod3_surveyed": 20,
    "paid_dsm_las": 30,
    "goteborg_open_derived": 40,
    "osm_or_heuristic_fallback": 90,
}
OPEN_DERIVED_SOURCE_PRIORITY = SOURCE_PRIORITIES["goteborg_open_derived"]
KOMPLEMENTBYGGNAD_SMALL_AREA_M2 = 20.0
KOMPLEMENTBYGGNAD_LOW_QUALITY_MAX = 0.65
DEFAULT_ROOT = Path("building_geodata/goteborg-open")
DEFAULT_GPKG = Path("building_geodata/byggnad_kn1480.gpkg")
DEFAULT_MATCH_BUFFER_M = 2.0
DEFAULT_DTM_TILE_IDS = ["639_14", "640_14"]
DEFAULT_RAW_SOURCE_FILES = {
    "footprints": DEFAULT_GPKG.as_posix(),
    "baskartaLayer": (DEFAULT_ROOT / "raw" / "baskarta" / "shp-extract" / "byggnad_l").as_posix(),
    "dtmZips": [
        (DEFAULT_ROOT / "raw" / "hojdmodell-2022" / "hojdmodell_2022_639_14.zip").as_posix(),
        (DEFAULT_ROOT / "raw" / "hojdmodell-2022" / "hojdmodell_2022_640_14.zip").as_posix(),
    ],
}
BASKARTA_EXPECTED_Z_LAYERS = {
    "byggnad_l",
    "markdetaljer",
    "kommunikation",
    "markanvandning_p",
    "anlaggningar_l",
    "anlaggningar_p",
}
BASKARTA_COMMON_TYPE_FIELDS = (
    "typ",
    "obkod",
    "objekttyp",
    "objektstyp",
    "detaljtyp",
    "klass",
    "subtyp",
)
BASKARTA_BUILDING_RUNTIME_TYPES = BUILDING_LINE_TYPES
BASKARTA_Z_SHAPE_TYPES = {11, 13, 15, 18, 31}
BASKARTA_SHAPE_TYPE_NAMES = {
    0: "NULL",
    1: "POINT",
    3: "POLYLINE",
    5: "POLYGON",
    8: "MULTIPOINT",
    11: "POINTZ",
    13: "POLYLINEZ",
    15: "POLYGONZ",
    18: "MULTIPOINTZ",
    21: "POINTM",
    23: "POLYLINEM",
    25: "POLYGONM",
    28: "MULTIPOINTM",
    31: "MULTIPATCH",
}


@dataclass
class Footprint:
    fid: int
    external_id: str | None
    object_type: str | None
    purpose: str | None
    geom_3007: Any
    geom_4326: Any | None = None
    area_m2: float = 0.0
    lines_by_type: dict[str, list[float]] = field(default_factory=lambda: defaultdict(list))
    source_lines_by_type: dict[str, list[Any]] = field(default_factory=lambda: defaultdict(list))
    matched_line_count: int = 0

    @property
    def all_z(self) -> list[float]:
        values: list[float] = []
        for zs in self.lines_by_type.values():
            values.extend(zs)
        return values


class DtmSampler:
    def __init__(self, zip_paths: list[Path]) -> None:
        import tifffile

        self._tifffile = tifffile
        self._zips = [zipfile.ZipFile(path) for path in zip_paths]
        self._members: dict[str, zipfile.ZipFile] = {}
        self._cache: dict[str, tuple[Any, tuple[float, float, float, float, float, float]]] = {}

        for archive in self._zips:
            for name in archive.namelist():
                normalized = name.replace("\\", "/")
                if normalized.lower().endswith((".tif", ".tfw")):
                    self._members[normalized] = archive

    def close(self) -> None:
        for archive in self._zips:
            archive.close()

    def sample(self, x: float, y: float) -> float | None:
        tile_y = int(math.floor(y / 1000.0))
        tile_x = int(math.floor(x / 1000.0))
        folder = f"{str(tile_y)[:3]}_{str(tile_x)[:2]}"
        stem = f"{tile_y}_{tile_x}"
        tif_name = f"{folder}/{stem}.tif"
        tfw_name = f"{folder}/{stem}.tfw"

        if tif_name not in self._members or tfw_name not in self._members:
            return None

        array, world = self._load_tile(tif_name, tfw_name)
        pixel_x, rot_y, rot_x, pixel_y, upper_left_x, upper_left_y = world
        if rot_x != 0.0 or rot_y != 0.0:
            return None

        col = pixel_index(x, upper_left_x, pixel_x)
        row = pixel_index(y, upper_left_y, pixel_y)

        if row < 0 or col < 0 or row >= array.shape[0] or col >= array.shape[1]:
            return None

        value = float(array[row, col])
        if not math.isfinite(value) or value < -1000:
            return None
        return value

    def _load_tile(
        self, tif_name: str, tfw_name: str
    ) -> tuple[Any, tuple[float, float, float, float, float, float]]:
        if tif_name in self._cache:
            return self._cache[tif_name]

        archive = self._members[tif_name]
        with archive.open(tif_name) as tif_file:
            array = self._tifffile.imread(tif_file)

        tfw_archive = self._members[tfw_name]
        with tfw_archive.open(tfw_name) as tfw_file:
            world = tuple(float(line.strip()) for line in tfw_file.read().decode("utf-8").splitlines())

        if len(world) != 6:
            raise ValueError(f"Unexpected world-file shape for {tfw_name}: {world}")

        self._cache[tif_name] = (array, world)
        return self._cache[tif_name]


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    with path.open(encoding="utf-8") as source:
        return [json.loads(line) for line in source if line.strip()]


def write_jsonl(path: Path, rows: Iterable[dict[str, Any]]) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with path.open("w", encoding="utf-8") as output:
        for row in rows:
            output.write(json.dumps(row, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n")
            count += 1
    return count


def pixel_index(coordinate: float, upper_left_coordinate: float, pixel_size: float) -> int:
    if pixel_size == 0.0:
        return -1
    raw = (coordinate - upper_left_coordinate) / pixel_size
    if not math.isfinite(raw):
        return -1
    return int(math.floor(raw + 0.5))


def stable_sort_key(feature_or_row: dict[str, Any]) -> tuple[str, str, str]:
    properties = feature_or_row.get("properties", feature_or_row)
    return (
        str(properties.get("source_footprint_fid") or properties.get("sourceFootprintFid") or ""),
        str(properties.get("source_external_id") or properties.get("externalId") or ""),
        json.dumps(feature_or_row.get("geometry", {}), sort_keys=True, ensure_ascii=False),
    )


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def source_file_checksums(gpkg_path: Path, baskarta_layer: Path, dtm_zips: list[Path]) -> dict[str, str]:
    checksums: dict[str, str] = {}
    if gpkg_path.exists():
        checksums["footprints"] = file_sha256(gpkg_path)

    for suffix in (".shp", ".shx", ".dbf", ".prj"):
        component = Path(f"{baskarta_layer}{suffix}")
        if component.exists():
            checksums[f"baskartaLayer{suffix}"] = file_sha256(component)

    for path in dtm_zips:
        if path.exists():
            checksums[f"dtmZip:{path.name}"] = file_sha256(path)
    return dict(sorted(checksums.items()))


def shape_type_name(shape_type: int) -> str:
    return BASKARTA_SHAPE_TYPE_NAMES.get(shape_type, f"UNKNOWN_{shape_type}")


def shape_z_values(shape: Any) -> tuple[list[float], int]:
    raw_z = getattr(shape, "z", None)
    if raw_z is None:
        return [], 0
    raw_values = (
        raw_z
        if hasattr(raw_z, "__iter__") and not isinstance(raw_z, (str, bytes))
        else [raw_z]
    )
    finite: list[float] = []
    non_finite = 0
    for value in raw_values:
        try:
            number = float(value)
        except (TypeError, ValueError):
            non_finite += 1
            continue
        if math.isfinite(number):
            finite.append(number)
        else:
            non_finite += 1
    return finite, non_finite


def safe_extract_zip(archive_path: Path, target: Path) -> None:
    target_resolved = target.resolve()
    with zipfile.ZipFile(archive_path) as archive:
        for member in archive.infolist():
            member_target = (target / member.filename).resolve()
            if target_resolved not in [member_target, *member_target.parents]:
                raise ValueError(f"Unsafe ZIP path outside target: {member.filename}")
            archive.extract(member, target)


def preflight_baskarta_layer(root: Path, layer_path: Path) -> dict[str, Any]:
    import shapefile

    reader = shapefile.Reader(str(layer_path))
    try:
        fields = [str(field[0]) for field in reader.fields[1:]]
        field_lookup = {field.lower(): field for field in fields}
        type_fields = [field_lookup[name] for name in BASKARTA_COMMON_TYPE_FIELDS if name in field_lookup]
        type_distributions: dict[str, Counter[str]] = {field: Counter() for field in type_fields}
        finite_z: list[float] = []
        missing_z_count = 0
        non_finite_z_count = 0
        empty_geometry_count = 0
        record_count = 0

        for shape_record in reader.iterShapeRecords():
            record_count += 1
            shp = shape_record.shape
            points = list(getattr(shp, "points", []) or [])
            if not points:
                empty_geometry_count += 1
            z_values, non_finite = shape_z_values(shp)
            non_finite_z_count += non_finite
            if points and (not z_values or len(z_values) < len(points)):
                missing_z_count += 1
            finite_z.extend(z_values)

            record = shape_record.record.as_dict()
            for field in type_fields:
                raw_value = record.get(field)
                value = "" if raw_value is None else str(raw_value).strip()
                type_distributions[field][value or "<blank>"] += 1

        shape_type = int(reader.shapeType)
    finally:
        reader.close()
    layer_name = layer_path.stem
    expected_layer_key = layer_name.casefold()
    is_expected = expected_layer_key in BASKARTA_EXPECTED_Z_LAYERS
    has_z_shape_type = shape_type in BASKARTA_Z_SHAPE_TYPES
    z_min = round(min(finite_z), 3) if finite_z else None
    z_max = round(max(finite_z), 3) if finite_z else None
    errors: list[str] = []
    warnings: list[str] = []

    if is_expected and not has_z_shape_type:
        errors.append(f"{layer_name}: expected Z-aware layer is flattened as {shape_type_name(shape_type)}")
    if is_expected and has_z_shape_type and not finite_z:
        errors.append(f"{layer_name}: expected Z-aware layer has no usable Z values")
    if is_expected and missing_z_count:
        errors.append(f"{layer_name}: expected Z-aware layer has {missing_z_count} records with missing Z values")
    if expected_layer_key == "byggnad_l":
        typ_distribution = type_distributions.get("typ")
        if typ_distribution is None:
            errors.append(f"{layer_name}: byggnad_l requires typ field for runtime line classification")
        else:
            runtime_types = sorted(BASKARTA_BUILDING_RUNTIME_TYPES & set(typ_distribution))
            if not runtime_types:
                errors.append(
                    f"{layer_name}: byggnad_l typ field has no recognized runtime values "
                    f"({', '.join(sorted(BASKARTA_BUILDING_RUNTIME_TYPES))})"
                )
    if finite_z and (z_min is not None and z_min < -100 or z_max is not None and z_max > 500):
        warnings.append(f"{layer_name}: anomalous Z range {z_min}..{z_max}")
    if record_count and not type_fields:
        warnings.append(f"{layer_name}: no common type field found; inspect availableFields")
    if empty_geometry_count:
        warnings.append(f"{layer_name}: {empty_geometry_count} empty geometries")
    if non_finite_z_count:
        warnings.append(f"{layer_name}: {non_finite_z_count} non-finite Z values")

    return {
        "availableFields": fields,
        "emptyGeometryCount": empty_geometry_count,
        "errors": errors,
        "geometryType": shape_type_name(shape_type),
        "hasZShapeType": has_z_shape_type,
        "expectedLayerKey": expected_layer_key if is_expected else None,
        "layerName": layer_name,
        "layerPath": layer_path.relative_to(root).as_posix(),
        "missingZCount": missing_z_count,
        "nonFiniteZCount": non_finite_z_count,
        "recordCount": record_count,
        "typeDistributions": {
            field: dict(sorted(counter.items()))
            for field, counter in sorted(type_distributions.items())
        },
        "warnings": warnings,
        "zStats": {
            "count": len(finite_z),
            "max": z_max,
            "min": z_min,
        },
    }


def unreadable_baskarta_layer(root: Path, layer_path: Path, exc: Exception) -> dict[str, Any]:
    layer_name = layer_path.stem
    expected_layer_key = layer_name.casefold()
    is_expected = expected_layer_key in BASKARTA_EXPECTED_Z_LAYERS
    return {
        "availableFields": [],
        "emptyGeometryCount": 0,
        "errors": [f"{layer_name}: cannot read SHP layer: {exc}"],
        "geometryType": "UNREADABLE",
        "hasZShapeType": False,
        "expectedLayerKey": expected_layer_key if is_expected else None,
        "layerName": layer_name,
        "layerPath": layer_path.relative_to(root).as_posix(),
        "missingZCount": 0,
        "nonFiniteZCount": 0,
        "recordCount": 0,
        "typeDistributions": {},
        "warnings": [],
        "zStats": {
            "count": 0,
            "max": None,
            "min": None,
        },
    }


def build_baskarta_preflight_report(input_path: Path, root: Path, input_kind: str) -> dict[str, Any]:
    shapefiles = sorted(
        (path for path in root.rglob("*") if path.suffix.casefold() == ".shp"),
        key=lambda path: path.relative_to(root).as_posix().lower(),
    )
    layers: list[dict[str, Any]] = []
    for path in shapefiles:
        try:
            layers.append(preflight_baskarta_layer(root, path))
        except Exception as exc:
            layers.append(unreadable_baskarta_layer(root, path, exc))
    present_expected = sorted(
        layer["expectedLayerKey"]
        for layer in layers
        if layer["expectedLayerKey"] in BASKARTA_EXPECTED_Z_LAYERS
    )
    errors = [
        error
        for layer in layers
        for error in layer["errors"]
    ]
    warnings = [
        warning
        for layer in layers
        for warning in layer["warnings"]
    ]
    missing_expected = sorted(BASKARTA_EXPECTED_Z_LAYERS - set(present_expected))
    if not layers:
        errors.append("No SHP layers found in Baskarta input")
    elif missing_expected:
        warnings.append(f"Expected Baskarta Z-aware layers not present in this input: {', '.join(missing_expected)}")

    return {
        "errors": sorted(errors),
        "expectedZLayers": {
            "known": sorted(BASKARTA_EXPECTED_Z_LAYERS),
            "missing": missing_expected,
            "present": present_expected,
        },
        "input": input_path.as_posix(),
        "inputKind": input_kind,
        "layers": layers,
        "status": "fail" if errors else "pass",
        "warnings": sorted(warnings),
    }


def write_baskarta_preflight_markdown(path: Path, report: dict[str, Any]) -> None:
    lines = [
        "# Baskarta XYZ Layer Preflight",
        "",
        f"- Input: `{report['input']}`",
        f"- Input kind: `{report['inputKind']}`",
        f"- Status: `{report['status']}`",
        "",
        "| Layer | Geometry | Records | Z range | Missing Z records | Issues |",
        "|---|---:|---:|---:|---:|---|",
    ]
    for layer in report["layers"]:
        z_min = layer["zStats"]["min"]
        z_max = layer["zStats"]["max"]
        z_range = "n/a" if z_min is None or z_max is None else f"{z_min}..{z_max}"
        issues = "; ".join(layer["errors"] + layer["warnings"]) or "-"
        lines.append(
            f"| {layer['layerName']} | {layer['geometryType']} | {layer['recordCount']} | "
            f"{z_range} | {layer['missingZCount']} | {issues} |"
        )
    if report["errors"]:
        lines.extend(["", "## Errors", ""])
        lines.extend(f"- {error}" for error in report["errors"])
    if report["warnings"]:
        lines.extend(["", "## Warnings", ""])
        lines.extend(f"- {warning}" for warning in report["warnings"])
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def command_preflight_baskarta(args: argparse.Namespace) -> int:
    input_path = Path(args.input)
    output_json = (
        Path(args.output_json)
        if args.output_json
        else DEFAULT_ROOT / "derived" / "baskarta_preflight.json"
    )
    output_md = (
        Path(args.output_md)
        if args.output_md
        else DEFAULT_ROOT / "derived" / "baskarta_preflight.md"
    )

    if input_path.is_file() and input_path.suffix.lower() == ".zip":
        with tempfile.TemporaryDirectory(prefix="sunnyseat-baskarta-preflight-") as tmp:
            root = Path(tmp)
            safe_extract_zip(input_path, root)
            report = build_baskarta_preflight_report(input_path, root, "zip")
    elif input_path.is_dir():
        report = build_baskarta_preflight_report(input_path, input_path, "directory")
    else:
        report = {
            "errors": [f"Baskarta input must be a ZIP file or extracted SHP directory: {input_path.as_posix()}"],
            "expectedZLayers": {
                "known": sorted(BASKARTA_EXPECTED_Z_LAYERS),
                "missing": sorted(BASKARTA_EXPECTED_Z_LAYERS),
                "present": [],
            },
            "input": input_path.as_posix(),
            "inputKind": "unknown",
            "layers": [],
            "status": "fail",
            "warnings": [],
        }

    write_json(output_json, report)
    write_baskarta_preflight_markdown(output_md, report)
    print(json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True))
    return 1 if report["errors"] else 0


def combined_hash(paths: Iterable[Path], extra: dict[str, Any] | None = None) -> str:
    digest = hashlib.sha256()
    for content_hash in sorted(file_sha256(path) for path in paths if path.exists()):
        digest.update(content_hash.encode("ascii"))
    if extra:
        digest.update(json.dumps(extra, sort_keys=True, ensure_ascii=False).encode("utf-8"))
    return digest.hexdigest()


def as_float(value: Any, default: float = 0.0) -> float:
    if value is None:
        return default
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    return number if math.isfinite(number) else default


def as_int(value: Any, default: int = 0) -> int:
    if value is None:
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def percentile(values: list[float], q: float) -> float | None:
    if not values:
        return None
    sorted_values = sorted(values)
    return sorted_values[int((len(sorted_values) - 1) * q)]


def stats(values: list[float]) -> dict[str, float | int | None]:
    if not values:
        return {"count": 0, "min": None, "p50": None, "p90": None, "max": None}
    return {
        "count": len(values),
        "min": round(min(values), 3),
        "p50": round(statistics.median(values), 3),
        "p90": round(percentile(values, 0.9) or 0, 3),
        "max": round(max(values), 3),
    }


def parse_gpkg_geometry(blob: bytes) -> Any:
    from shapely import wkb

    gpkg_envelope_bytes = {0: 0, 1: 32, 2: 48, 3: 48, 4: 64}
    if blob[:2] != b"GP":
        return wkb.loads(blob)

    flags = blob[3]
    envelope_code = (flags >> 1) & 0b111
    header_length = 8 + gpkg_envelope_bytes[envelope_code]
    return wkb.loads(blob[header_length:])


def transform_geometry(geom: Any, transformer: Any) -> Any:
    from shapely.ops import transform as shapely_transform

    return shapely_transform(transformer.transform, geom)


def largest_polygon(geom: Any) -> Any | None:
    if geom.geom_type == "Polygon":
        return geom
    if geom.geom_type == "MultiPolygon":
        polygons = list(geom.geoms)
        if not polygons:
            return None
        return max(polygons, key=lambda part: part.area)
    return None


def load_footprints(gpkg_path: Path, bbox_3007: tuple[float, float, float, float]) -> tuple[list[Footprint], dict[str, int]]:
    from pyproj import Transformer
    from shapely.geometry import box

    to_3007 = Transformer.from_crs(3006, 3007, always_xy=True)
    bbox_geom = box(*bbox_3007)
    footprints: list[Footprint] = []
    stats_counter: Counter[str] = Counter()

    with sqlite3.connect(gpkg_path) as con:
        rows = con.execute(
            """
            select fid, objektidentitet, objekttyp, andamal1, geometri
            from byggnad
            """
        )
        for fid, external_id, object_type, purpose, blob in rows:
            stats_counter["read"] += 1
            try:
                geom_3006 = parse_gpkg_geometry(blob)
                geom_3007 = transform_geometry(geom_3006, to_3007)
            except Exception:
                stats_counter["geometry_parse_failed"] += 1
                continue

            if geom_3007.is_empty or not geom_3007.is_valid:
                stats_counter["invalid_or_empty"] += 1
                continue
            if not geom_3007.intersects(bbox_geom):
                stats_counter["outside_bbox"] += 1
                continue

            footprints.append(
                Footprint(
                    fid=int(fid),
                    external_id=external_id,
                    object_type=object_type,
                    purpose=purpose,
                    geom_3007=geom_3007,
                    area_m2=float(geom_3007.area),
                )
            )
            stats_counter["kept"] += 1

    return footprints, dict(stats_counter)


def shape_part_lines(shape: Any) -> list[tuple[Any, Any | None, list[float]]]:
    from shapely.geometry import LineString

    parts = list(shape.parts) + [len(shape.points)]
    z_values = list(getattr(shape, "z", []) or [])
    lines: list[tuple[Any, Any | None, list[float]]] = []

    for start, end in zip(parts, parts[1:]):
        points = shape.points[start:end]
        if len(points) < 2:
            continue
        zs = z_values[start:end] if len(z_values) >= end else []
        line = LineString(points)
        if not line.is_empty and line.length > 0:
            line_z = None
            if len(zs) == len(points):
                try:
                    xyz = [
                        (float(point[0]), float(point[1]), float(z))
                        for point, z in zip(points, zs)
                    ]
                except (TypeError, ValueError):
                    xyz = []
                if (
                    len(xyz) == len(points)
                    and all(math.isfinite(x) and math.isfinite(y) and math.isfinite(z) for x, y, z in xyz)
                ):
                    line_z = LineString(xyz)
            lines.append((line, line_z, zs))

    return lines


def source_geometry_from_lines(lines: list[Any]) -> tuple[dict[str, Any] | None, str | None]:
    from shapely.geometry import MultiLineString, mapping

    if not lines:
        return None, None
    if len(lines) == 1:
        return mapping(lines[0]), "LineStringZ"
    return mapping(MultiLineString(lines)), "MultiLineStringZ"


def query_tree(tree: Any, geometries: list[Any], query_geom: Any) -> list[int]:
    result = tree.query(query_geom)
    if len(result) == 0:
        return []

    first = result[0]
    if isinstance(first, numbers.Integral):
        return [int(i) for i in result]

    id_to_index = {id(geom): index for index, geom in enumerate(geometries)}
    return [id_to_index[id(geom)] for geom in result]


def attach_baskarta_lines(
    footprints: list[Footprint],
    baskarta_building_layer: Path,
    bbox_3007: tuple[float, float, float, float],
    match_buffer_m: float,
) -> dict[str, Any]:
    import shapefile
    from shapely.geometry import box
    from shapely.strtree import STRtree

    bbox_geom = box(*bbox_3007)
    footprint_geoms = [fp.geom_3007 for fp in footprints]
    tree = STRtree(footprint_geoms)
    stats_counter: Counter[str] = Counter()
    type_counter: Counter[str] = Counter()

    reader = shapefile.Reader(str(baskarta_building_layer))
    for shape_record in reader.iterShapeRecords():
        record = shape_record.record.as_dict()
        line_type = record.get("typ")
        stats_counter["read"] += 1
        type_counter[line_type or ""] += 1

        if line_type not in BUILDING_LINE_TYPES:
            stats_counter["ignored_type"] += 1
            continue

        shp = shape_record.shape
        shape_bbox = box(*shp.bbox)
        if not shape_bbox.intersects(bbox_geom):
            stats_counter["outside_bbox"] += 1
            continue

        for line, line_z, zs in shape_part_lines(shp):
            if not zs:
                stats_counter["missing_z"] += 1
                continue
            if line_z is None:
                stats_counter["missing_z"] += 1
                continue
            if not line.intersects(bbox_geom):
                stats_counter["part_outside_bbox"] += 1
                continue

            query_geom = line.buffer(match_buffer_m)
            candidate_indices = query_tree(tree, footprint_geoms, query_geom)
            if not candidate_indices:
                stats_counter["no_candidate"] += 1
                continue

            matched = False
            for index in candidate_indices:
                footprint = footprints[index]
                if footprint.geom_3007.buffer(match_buffer_m).intersects(line):
                    clean_z = [float(z) for z in zs if math.isfinite(float(z)) and -100 < float(z) < 500]
                    if not clean_z:
                        stats_counter["implausible_z"] += 1
                        continue
                    if len(clean_z) != len(zs):
                        stats_counter["implausible_z"] += 1
                        continue
                    footprint.lines_by_type[line_type].extend(clean_z)
                    footprint.source_lines_by_type[line_type].append(line_z)
                    footprint.matched_line_count += 1
                    matched = True

            if matched:
                stats_counter["matched_part"] += 1
            else:
                stats_counter["candidate_not_intersecting"] += 1

    return {
        "stats": dict(sorted(stats_counter.items())),
        "source_type_counts_top": type_counter.most_common(20),
    }


def height_quality(height_m: float, matched_line_count: int, has_roof: bool, ground_z: float | None) -> float:
    quality = 0.45
    if has_roof:
        quality += 0.25
    if ground_z is not None:
        quality += 0.15
    if matched_line_count >= 3:
        quality += 0.10
    if 3 <= height_m <= 80:
        quality += 0.05
    return round(min(1.0, quality), 3)


def emit_candidate_outputs(
    footprints: list[Footprint],
    sampler: DtmSampler,
    output_path: Path,
    summary_path: Path,
    bbox_3007: tuple[float, float, float, float],
    inputs: dict[str, Any],
) -> dict[str, Any]:
    from pyproj import Transformer
    from shapely.geometry import mapping

    to_4326 = Transformer.from_crs(3007, 4326, always_xy=True)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    stats_counter: Counter[str] = Counter()
    heights: list[float] = []
    matched_counts: list[float] = []

    with output_path.open("w", encoding="utf-8") as output:
        for footprint in footprints:
            z_all = footprint.all_z
            if not z_all:
                stats_counter["no_matched_z"] += 1
                continue

            roof_z_values = footprint.lines_by_type.get("Takkonturer", [])
            source_z_values = roof_z_values or z_all
            roof_abs_z = max(source_z_values)
            representative = footprint.geom_3007.representative_point()
            ground_z = sampler.sample(representative.x, representative.y)

            if ground_z is None:
                stats_counter["missing_ground_z"] += 1
                continue

            height_m = roof_abs_z - ground_z
            if height_m < 2.0 or height_m > 120.0:
                stats_counter["implausible_height"] += 1
                continue

            engine_geom_3007 = largest_polygon(footprint.geom_3007)
            if engine_geom_3007 is None:
                stats_counter["not_polygonal"] += 1
                continue

            selected_source_types = ["Takkonturer"] if roof_z_values else sorted(footprint.source_lines_by_type)
            selected_source_lines = [
                line
                for line_type in selected_source_types
                for line in footprint.source_lines_by_type.get(line_type, [])
            ]
            source_geom_3007, source_geom_type = source_geometry_from_lines(selected_source_lines)

            try:
                geom_4326 = transform_geometry(engine_geom_3007, to_4326)
            except Exception:
                stats_counter["to_4326_failed"] += 1
                continue

            stats_counter["emitted"] += 1
            heights.append(height_m)
            matched_counts.append(float(footprint.matched_line_count))

            by_type_stats = {}
            for line_type, values in sorted(footprint.lines_by_type.items()):
                by_type_stats[line_type] = {
                    "count": len(values),
                    "minZ": round(min(values), 3),
                    "maxZ": round(max(values), 3),
                }

            feature = {
                "type": "Feature",
                "geometry": mapping(geom_4326),
                "properties": {
                    "source": SOURCE_DESCRIPTION,
                    "sourceDataset": SOURCE_DATASET,
                    "sourceFootprintFid": footprint.fid,
                    "externalId": footprint.external_id,
                    "objectType": footprint.object_type,
                    "purpose": footprint.purpose,
                    "areaM2": round(footprint.area_m2, 2),
                    "heightM": round(height_m, 3),
                    "heightSource": "Surveyed",
                    "qualityScore": height_quality(
                        height_m,
                        footprint.matched_line_count,
                        bool(roof_z_values),
                        ground_z,
                    ),
                    "groundZRh2000": round(ground_z, 3),
                    "roofZRh2000": round(roof_abs_z, 3),
                    "matchedLineCount": footprint.matched_line_count,
                    "heightCandidateMethod": "max roof/facade/shelter Z minus DTM at representative point",
                    "engineGeometryMethod": "largest polygon part from source footprint",
                    "sourceGeometryType": source_geom_type,
                    "sourceGeom3007": source_geom_3007,
                    "sourceLayer": "byggnad_l",
                    "sourceSubclass": ", ".join(selected_source_types),
                    "zSemantics": SOURCE_Z_SEMANTICS,
                    "sourceRefresh": SOURCE_REFRESH_POLICY,
                    "sourceFiles": inputs.get("sourceFiles", DEFAULT_RAW_SOURCE_FILES),
                    "sourceFileChecksums": inputs.get("sourceFileChecksums", {}),
                    "matchBufferM": inputs.get("matchBufferM", DEFAULT_MATCH_BUFFER_M),
                    "dtmTileIds": inputs.get("dtmTileIds", DEFAULT_DTM_TILE_IDS),
                    "baskartaZStats": by_type_stats,
                    "centroid3007": [
                        round(float(footprint.geom_3007.centroid.x), 3),
                        round(float(footprint.geom_3007.centroid.y), 3),
                    ],
                    "bbox3007": [round(float(v), 3) for v in footprint.geom_3007.bounds],
                    "crs": {
                        "sourceFootprint": SOURCE_FOOTPRINT_CRS,
                        "metric": METRIC_CRS,
                        "runtimeGeometry": RUNTIME_GEOMETRY_CRS,
                    },
                },
            }
            output.write(json.dumps(feature, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n")

    summary = {
        "bbox3007": list(bbox_3007),
        "crs": {
            "sourceFootprint": SOURCE_FOOTPRINT_CRS,
            "metric": METRIC_CRS,
            "runtimeGeometry": RUNTIME_GEOMETRY_CRS,
        },
        "heightM": stats(heights),
        "inputs": inputs,
        "matchedLineCount": stats(matched_counts),
        "outputs": {
            "geojsonl": str(output_path),
            "summary": str(summary_path),
        },
        "stats": dict(sorted(stats_counter.items())),
    }
    write_json(summary_path, summary)
    return summary


def z_spread(properties: dict[str, Any]) -> float:
    spreads: list[float] = []
    for zstats in properties.get("baskartaZStats", {}).values():
        min_z = zstats.get("minZ")
        max_z = zstats.get("maxZ")
        if min_z is not None and max_z is not None:
            spreads.append(float(max_z) - float(min_z))
    return max(spreads) if spreads else 0.0


def source_flags(properties: dict[str, Any]) -> list[str]:
    flags: list[str] = []
    height = as_float(properties.get("heightM"))
    area = as_float(properties.get("areaM2"))
    matched = as_int(properties.get("matchedLineCount"))
    object_type = properties.get("objectType")
    zstats = properties.get("baskartaZStats", {})
    spread = z_spread(properties)

    if object_type in MAJOR_TYPES and area >= 100 and height < 3:
        flags.append("major-building-low-height")
    if height > 60:
        flags.append("very-tall")
    if height > 20 and matched <= 1:
        flags.append("single-line-tall")
    if area < 25 and height > 15:
        flags.append("tiny-tall")
    if spread > 20:
        flags.append("large-z-spread")
    if "Takkonturer" not in zstats:
        flags.append("no-roof-contour")
    if (
        object_type == "Komplementbyggnad"
        and area < KOMPLEMENTBYGGNAD_SMALL_AREA_M2
        and as_float(properties.get("qualityScore")) <= KOMPLEMENTBYGGNAD_LOW_QUALITY_MAX
    ):
        flags.append("small-komplementbyggnad-low-quality")
    return sorted(flags)


def decide_filter(properties: dict[str, Any]) -> tuple[str, list[str]]:
    height = as_float(properties.get("heightM"))
    area = as_float(properties.get("areaM2"))
    spread = z_spread(properties)
    flags = set(source_flags(properties))
    reasons: list[str] = []

    if height < 3.0:
        reasons.append("below-engine-min-meaningful-height")
    if "tiny-tall" in flags:
        reasons.append("tiny-footprint-with-tall-height")
    if height > 80.0:
        reasons.append("extreme-height-requires-manual-review")
    if spread > 60.0:
        reasons.append("extreme-z-spread")
    if "small-komplementbyggnad-low-quality" in flags:
        reasons.append("small-komplementbyggnad-low-quality")

    if reasons:
        return "exclude", sorted(reasons)

    matched = as_int(properties.get("matchedLineCount"))
    if "very-tall" in flags:
        reasons.append("very-tall")
    if "single-line-tall" in flags:
        reasons.append("single-line-tall")
    if spread > 20.0:
        reasons.append("large-z-spread")
    if "no-roof-contour" in flags and height > 8.0:
        reasons.append("no-roof-contour-for-material-height")
    if matched <= 1 and height > 15.0:
        reasons.append("limited-line-support")
    if area <= 0:
        reasons.append("missing-or-invalid-area")

    if reasons:
        return "review", sorted(set(reasons))

    return "include", []


def runtime_quality(properties: dict[str, Any], decision: str) -> float:
    quality = as_float(properties.get("qualityScore"), 0.6)
    matched = as_int(properties.get("matchedLineCount"))
    spread = z_spread(properties)
    object_type = properties.get("objectType")
    area = as_float(properties.get("areaM2"))
    flags = source_flags(properties)

    if matched <= 1:
        quality -= 0.10
    if spread > 10:
        quality -= 0.10
    if "no-roof-contour" in flags:
        quality -= 0.15
    if object_type == "Komplementbyggnad" and area < KOMPLEMENTBYGGNAD_SMALL_AREA_M2:
        quality -= 0.10
    if decision == "review":
        quality -= 0.25
    if decision == "exclude":
        quality = min(quality, 0.2)

    return round(max(0.0, min(1.0, quality)), 3)


def tier(properties: dict[str, Any], quality: float) -> str:
    object_type = properties.get("objectType")
    area = as_float(properties.get("areaM2"))
    height = as_float(properties.get("heightM"))

    if quality >= 0.85 and object_type in MAJOR_TYPES and area >= 80 and height >= 6:
        return "primary"
    if quality >= 0.70 and height >= 3:
        return "secondary"
    return "uncertain"


def enriched_feature(feature: dict[str, Any], decision: str, reasons: list[str]) -> dict[str, Any]:
    properties = dict(feature["properties"])
    quality = runtime_quality(properties, decision)
    properties["shadowImportDecision"] = decision
    properties["shadowFilterReasons"] = reasons
    properties["shadowSourceFlags"] = source_flags(properties)
    properties["shadowRuntimeQualityScore"] = quality
    properties["shadowCasterTier"] = tier(properties, quality)
    properties["zSpreadM"] = round(z_spread(properties), 3)
    properties["shadowHeightM"] = properties.get("heightM")
    properties["shadowHeightMethod"] = "height candidate retained after conservative import filtering"
    return {
        "type": "Feature",
        "geometry": feature["geometry"],
        "properties": properties,
    }


def make_bbox_polygon_3007(bounds: list[float] | tuple[float, float, float, float]) -> dict[str, Any] | None:
    if len(bounds) != 4:
        return None
    min_x, min_y, max_x, max_y = [round(float(v), 3) for v in bounds]
    return {
        "type": "Polygon",
        "coordinates": [[
            [min_x, min_y],
            [max_x, min_y],
            [max_x, max_y],
            [min_x, max_y],
            [min_x, min_y],
        ]],
    }


def make_centroid_point_3007(values: list[float] | tuple[float, float]) -> dict[str, Any] | None:
    if len(values) != 2:
        return None
    return {"type": "Point", "coordinates": [round(float(values[0]), 3), round(float(values[1]), 3)]}


def map_feature_to_shadow_caster_row(
    feature: dict[str, Any],
    import_batch_id: str,
    *,
    include_diagnostics: bool = True,
) -> dict[str, Any] | None:
    properties = feature["properties"]
    decision = properties.get("shadowImportDecision")
    if decision is None:
        decision, reasons = decide_filter(properties)
        feature = enriched_feature(feature, decision, reasons)
        properties = feature["properties"]

    if decision == "exclude" and not include_diagnostics:
        return None

    height_m = round(as_float(properties.get("shadowHeightM", properties.get("heightM"))), 3)
    quality_score = round(as_float(properties.get("shadowRuntimeQualityScore", properties.get("qualityScore"))), 3)
    bbox_3007_values = properties.get("bbox3007") or []
    centroid_3007_values = properties.get("centroid3007") or []
    raw_source_files = properties.get("sourceFiles") or DEFAULT_RAW_SOURCE_FILES
    source_file_checksums_value = properties.get("sourceFileChecksums") or {}
    match_buffer_m = properties.get("matchBufferM", DEFAULT_MATCH_BUFFER_M)
    dtm_tile_ids = properties.get("dtmTileIds") or DEFAULT_DTM_TILE_IDS
    source_layer = properties.get("sourceLayer") or "byggnad_l"
    source_subclass = (
        properties.get("sourceSubclass")
        or properties.get("sourceGeometryType")
        or properties.get("objectType")
        or properties.get("purpose")
    )
    z_semantics = properties.get("zSemantics") or SOURCE_Z_SEMANTICS
    caster_class = properties.get("casterClass") or ("building" if source_layer == "byggnad_l" else "structure")
    active = decision == "include" and caster_class == "building" and source_layer == "byggnad_l"

    source_object_metadata = {
        "areaM2": properties.get("areaM2"),
        "baskartaZStats": properties.get("baskartaZStats", {}),
        "candidateSource": properties.get("source"),
        "dtmTileIds": dtm_tile_ids,
        "matchBufferM": match_buffer_m,
        "rawSourceFiles": raw_source_files,
        "sourceFileChecksums": source_file_checksums_value,
        "sourceDataset": properties.get("sourceDataset", SOURCE_DATASET),
    }
    source_object_metadata = {
        key: value for key, value in source_object_metadata.items() if value is not None
    }

    source_collection_metadata = {
        "dtmTileIds": dtm_tile_ids,
        "matchBufferM": match_buffer_m,
        "rawSourceFiles": raw_source_files,
        "sourceDataset": properties.get("sourceDataset", SOURCE_DATASET),
        "sourceDescription": SOURCE_DESCRIPTION,
        "sourceFileChecksums": source_file_checksums_value,
        "sourceLayer": source_layer,
    }
    source_collection_metadata = {
        key: value for key, value in source_collection_metadata.items() if value is not None
    }

    source_update_metadata = {
        "sourceModelDate": "2026-06-05",
        "sourceRefresh": properties.get("sourceRefresh") or SOURCE_REFRESH_POLICY,
        "sourceUpdateMode": "manual reviewed geodata refresh",
    }
    source_update_metadata = {
        key: value for key, value in source_update_metadata.items() if value is not None
    }

    provenance_metadata = {
        "bbox3007": list(MVP_BBOX_3007),
        "crs": {
            "sourceFootprint": SOURCE_FOOTPRINT_CRS,
            "metric": METRIC_CRS,
            "runtimeGeometry": RUNTIME_GEOMETRY_CRS,
        },
        "derivationMethod": properties.get("heightCandidateMethod"),
        "dtmTiles": dtm_tile_ids,
        "lineTypes": sorted(BUILDING_LINE_TYPES),
        "matchBufferM": match_buffer_m,
        "rawSourceFiles": raw_source_files,
        "sourceFileChecksums": source_file_checksums_value,
        "sourceDescription": SOURCE_DESCRIPTION,
        "sourcePriorityOrder": SOURCE_PRIORITIES,
        "timestampPolicy": "JSONL rows use null imported_at/updated_at; SQL handoff coalesces DB defaults at load time.",
    }

    return {
        "geometry": feature["geometry"],
        "height_m": height_m,
        "ground_z_rh2000": properties.get("groundZRh2000"),
        "roof_z_rh2000": properties.get("roofZRh2000"),
        "height_method": properties.get("shadowHeightMethod") or properties.get("heightCandidateMethod"),
        "height_source": properties.get("heightSource") or "Surveyed",
        "source_dataset": SOURCE_DATASET,
        "source_external_id": properties.get("externalId"),
        "source_footprint_fid": None
        if properties.get("sourceFootprintFid") is None
        else str(properties.get("sourceFootprintFid")),
        "source_object_type": properties.get("objectType"),
        "source_purpose": properties.get("purpose"),
        "source_geometry_type": properties.get("sourceGeometryType"),
        "source_geom_3007": properties.get("sourceGeom3007"),
        "source_layer": source_layer,
        "source_subclass": source_subclass,
        "z_semantics": z_semantics,
        "source_collection_metadata": source_collection_metadata,
        "source_update_metadata": source_update_metadata,
        "source_object_metadata": source_object_metadata,
        "engine_geometry_method": properties.get("engineGeometryMethod") or "largest polygon part from source footprint",
        "runtime_geometry_crs": RUNTIME_GEOMETRY_CRS,
        "metric_crs": METRIC_CRS,
        "provenance_metadata": provenance_metadata,
        "quality_score": quality_score,
        "shadow_caster_tier": properties.get("shadowCasterTier") or tier(properties, quality_score),
        "filter_decision": decision,
        "filter_reasons": properties.get("shadowFilterReasons", []),
        "source_flags": properties.get("shadowSourceFlags", []),
        "matched_line_count": properties.get("matchedLineCount"),
        "z_spread_m": properties.get("zSpreadM", round(z_spread(properties), 3)),
        "bbox_3007": make_bbox_polygon_3007(bbox_3007_values) if bbox_3007_values else None,
        "centroid_3007": make_centroid_point_3007(centroid_3007_values) if centroid_3007_values else None,
        "caster_class": caster_class,
        "source_priority": OPEN_DERIVED_SOURCE_PRIORITY,
        "active": active,
        "import_batch_id": import_batch_id,
        "imported_at": None,
        "updated_at": None,
    }


def cluster_centers_3007() -> dict[str, tuple[float, float]]:
    try:
        from pyproj import Transformer
    except ImportError as exc:
        raise RuntimeError("pyproj is required for cluster summaries") from exc

    to_3007 = Transformer.from_crs(4326, 3007, always_xy=True)
    return {
        name: to_3007.transform(lon, lat)
        for name, (lon, lat) in CLUSTERS_WGS84.items()
    }


def summarize_clusters(features: Iterable[dict[str, Any]], decision_field: str | None = None) -> dict[str, Any]:
    centers = cluster_centers_3007()
    cluster_data: dict[str, dict[str, Any]] = {
        name: {
            "center3007": [round(center[0], 3), round(center[1], 3)],
            "radiusM": CLUSTER_RADIUS_M,
            "features": 0,
            "heights": [],
            "decisions": Counter(),
            "tiers": Counter(),
            "types": Counter(),
        }
        for name, center in centers.items()
    }

    for feature in features:
        properties = feature["properties"]
        centroid = properties.get("centroid3007")
        if not centroid:
            continue
        height = as_float(properties.get("heightM"))
        object_type = properties.get("objectType") or "unknown"
        decision = properties.get(decision_field) if decision_field else None
        tier_name = properties.get("shadowCasterTier")
        for cluster_name, cluster_center in centers.items():
            if math.hypot(float(centroid[0]) - cluster_center[0], float(centroid[1]) - cluster_center[1]) <= CLUSTER_RADIUS_M:
                bucket = cluster_data[cluster_name]
                bucket["features"] += 1
                bucket["heights"].append(height)
                bucket["types"][object_type] += 1
                if decision:
                    bucket["decisions"][decision] += 1
                if tier_name:
                    bucket["tiers"][tier_name] += 1

    return {
        name: {
            "center3007": bucket["center3007"],
            "radiusM": bucket["radiusM"],
            "features": bucket["features"],
            "heightM": stats(bucket["heights"]),
            "decisions": dict(sorted(bucket["decisions"].items())),
            "tiers": bucket["tiers"].most_common(),
            "topObjectTypes": bucket["types"].most_common(5),
        }
        for name, bucket in sorted(cluster_data.items())
    }


def command_derive(args: argparse.Namespace) -> int:
    root = Path(args.root)
    bbox = tuple(float(value) for value in args.bbox)
    output_path = Path(args.output) if args.output else root / "derived" / "buildings_central_639_14_640_14_height_candidates.geojsonl"
    summary_path = Path(args.summary) if args.summary else root / "derived" / "buildings_central_639_14_640_14_height_candidates.summary.json"
    baskarta_layer = Path(args.baskarta_layer) if args.baskarta_layer else root / "raw" / "baskarta" / "shp-extract" / "byggnad_l"
    dtm_zips = [Path(path) for path in args.dtm_zip] if args.dtm_zip else [
        root / "raw" / "hojdmodell-2022" / "hojdmodell_2022_639_14.zip",
        root / "raw" / "hojdmodell-2022" / "hojdmodell_2022_640_14.zip",
    ]

    print("Loading building footprints...", flush=True)
    footprints, footprint_stats = load_footprints(Path(args.gpkg), bbox)
    print(f"Loaded {len(footprints)} central footprints from {footprint_stats.get('read', 0)} total.", flush=True)
    if not footprints:
        print("No footprints in bbox.", file=sys.stderr)
        return 1

    print("Attaching Baskarta XYZ building-line subset...", flush=True)
    line_summary = attach_baskarta_lines(footprints, baskarta_layer, bbox, args.match_buffer_m)
    raw_source_files = {
        "footprints": str(args.gpkg),
        "baskartaLayer": str(baskarta_layer),
        "dtmZips": [str(path) for path in dtm_zips],
    }

    print("Sampling DTM and writing candidates...", flush=True)
    sampler = DtmSampler(dtm_zips)
    try:
        summary = emit_candidate_outputs(
            footprints,
            sampler,
            output_path,
            summary_path,
            bbox,
            {
                "bbox3007": list(bbox),
                "baskartaLayer": str(baskarta_layer),
                "dtmTileIds": DEFAULT_DTM_TILE_IDS,
                "dtmZips": [str(path) for path in dtm_zips],
                "footprints": str(args.gpkg),
                "sourceFiles": raw_source_files,
                "sourceFileChecksums": source_file_checksums(Path(args.gpkg), baskarta_layer, dtm_zips),
                "matchBufferM": args.match_buffer_m,
            },
        )
    finally:
        sampler.close()

    summary["footprintLoadStats"] = footprint_stats
    summary["baskartaLineAttach"] = line_summary
    write_json(summary_path, summary)
    print(json.dumps(summary, ensure_ascii=False, indent=2, sort_keys=True), flush=True)
    return 0


def command_validate(args: argparse.Namespace) -> int:
    source = Path(args.source)
    output_json = Path(args.output_json) if args.output_json else source.with_suffix(".validation.json")
    output_md = Path(args.output_md) if args.output_md else source.with_suffix(".validation.md")
    features = sorted(load_jsonl(source), key=stable_sort_key)

    totals = Counter()
    types = Counter()
    purposes = Counter()
    height_values: list[float] = []
    quality_values: list[float] = []
    matched_counts: list[float] = []
    flag_counts = Counter()
    flagged_examples: dict[str, list[dict[str, Any]]] = defaultdict(list)
    type_heights: dict[str, list[float]] = defaultdict(list)

    for feature in features:
        properties = feature["properties"]
        totals["features"] += 1
        height = as_float(properties.get("heightM"))
        quality = as_float(properties.get("qualityScore"))
        matched = as_float(properties.get("matchedLineCount"))
        object_type = properties.get("objectType") or "unknown"
        purpose = properties.get("purpose") or "unknown"

        height_values.append(height)
        quality_values.append(quality)
        matched_counts.append(matched)
        types[object_type] += 1
        purposes[purpose] += 1
        type_heights[object_type].append(height)

        flags = source_flags(properties)
        for flag in flags:
            flag_counts[flag] += 1
            if len(flagged_examples[flag]) < 10:
                flagged_examples[flag].append(
                    {
                        "externalId": properties.get("externalId"),
                        "sourceFootprintFid": properties.get("sourceFootprintFid"),
                        "objectType": object_type,
                        "purpose": purpose,
                        "areaM2": properties.get("areaM2"),
                        "heightM": properties.get("heightM"),
                        "matchedLineCount": properties.get("matchedLineCount"),
                        "zSpreadM": round(z_spread(properties), 3),
                        "flags": flags,
                        "centroid3007": properties.get("centroid3007"),
                    }
                )

    summary = {
        "bbox3007": list(MVP_BBOX_3007),
        "clusters": summarize_clusters(features),
        "crs": {
            "sourceFootprint": SOURCE_FOOTPRINT_CRS,
            "metric": METRIC_CRS,
            "runtimeGeometry": RUNTIME_GEOMETRY_CRS,
        },
        "flagCounts": dict(sorted(flag_counts.items())),
        "flaggedExamples": dict(sorted(flagged_examples.items())),
        "heightByObjectType": {
            object_type: stats(values)
            for object_type, values in sorted(type_heights.items())
        },
        "heightM": stats(height_values),
        "interpretation": {
            "byggnad_kn1480_gpkg": "2D footprint and metadata source only; no Z geometry, building-height attribute, roof geometry, or DSM.",
            "derived_candidates": "Candidate shadow-caster data; filter and review before runtime import.",
        },
        "matchedLineCount": stats(matched_counts),
        "qualityScore": stats(quality_values),
        "source": str(source),
        "topObjectTypes": types.most_common(12),
        "topPurposes": purposes.most_common(12),
        "totals": dict(sorted(totals.items())),
    }
    write_json(output_json, summary)
    write_validation_md(output_md, source, summary)
    print(json.dumps(summary, ensure_ascii=False, indent=2, sort_keys=True))
    return 0


def write_validation_md(path: Path, source: Path, summary: dict[str, Any]) -> None:
    lines = [
        "# Height Candidate Validation",
        "",
        f"Source: `{source}`",
        "",
        "## Overall",
        "",
        f"- Features: {summary['totals'].get('features', 0)}",
        f"- Height p50/p90/max: {summary['heightM']['p50']} / {summary['heightM']['p90']} / {summary['heightM']['max']} m",
        f"- Quality p50/p90: {summary['qualityScore']['p50']} / {summary['qualityScore']['p90']}",
        f"- Matched line count p50/p90/max: {summary['matchedLineCount']['p50']} / {summary['matchedLineCount']['p90']} / {summary['matchedLineCount']['max']}",
        "",
        "## Flags",
        "",
    ]
    for flag, count in sorted(summary["flagCounts"].items()):
        lines.append(f"- {flag}: {count}")

    lines.extend(["", "## Venue-Area Clusters", ""])
    for name, cluster in summary["clusters"].items():
        lines.append(
            f"- {name}: features {cluster['features']}, "
            f"height p50/p90 {cluster['heightM']['p50']} / {cluster['heightM']['p90']} m"
        )

    lines.extend(
        [
            "",
            "## Initial Interpretation",
            "",
            "- `byggnad_kn1480.gpkg` contributes useful 2D footprints and building metadata only.",
            "- The derived Göteborg dataset is usable as a first candidate shadow-caster table after conservative filtering.",
            "- Flagged features should be down-ranked or spot-checked before production import.",
        ]
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def command_filter(args: argparse.Namespace) -> int:
    source = Path(args.source)
    out_dir = Path(args.out_dir)
    include_path = Path(args.include) if args.include else out_dir / "buildings_central_shadow_casters.filtered.geojsonl"
    review_path = Path(args.review) if args.review else out_dir / "buildings_central_shadow_casters.review.geojsonl"
    excluded_path = Path(args.excluded) if args.excluded else out_dir / "buildings_central_shadow_casters.excluded.geojsonl"
    summary_json = Path(args.summary_json) if args.summary_json else out_dir / "buildings_central_shadow_casters.filter_summary.json"
    summary_md = Path(args.summary_md) if args.summary_md else out_dir / "buildings_central_shadow_casters.filter_summary.md"

    features = sorted(load_jsonl(source), key=stable_sort_key)
    buckets: dict[str, list[dict[str, Any]]] = {"include": [], "review": [], "exclude": []}
    reasons = Counter()
    object_types: dict[str, Counter[str]] = defaultdict(Counter)
    tiers = Counter()
    heights_by_decision: dict[str, list[float]] = defaultdict(list)
    examples: dict[str, list[dict[str, Any]]] = defaultdict(list)

    for feature in features:
        properties = feature["properties"]
        decision, decision_reasons = decide_filter(properties)
        enriched = enriched_feature(feature, decision, decision_reasons)
        enriched_properties = enriched["properties"]
        buckets[decision].append(enriched)
        object_types[decision][properties.get("objectType") or "unknown"] += 1
        tiers[enriched_properties["shadowCasterTier"]] += 1
        heights_by_decision[decision].append(as_float(properties.get("heightM")))
        for reason in decision_reasons:
            reasons[reason] += 1
        if decision != "include" and len(examples[decision]) < 20:
            examples[decision].append(
                {
                    "externalId": properties.get("externalId"),
                    "sourceFootprintFid": properties.get("sourceFootprintFid"),
                    "objectType": properties.get("objectType"),
                    "purpose": properties.get("purpose"),
                    "areaM2": properties.get("areaM2"),
                    "heightM": properties.get("heightM"),
                    "matchedLineCount": properties.get("matchedLineCount"),
                    "zSpreadM": enriched_properties["zSpreadM"],
                    "reasons": decision_reasons,
                    "centroid3007": properties.get("centroid3007"),
                }
            )

    write_jsonl(include_path, buckets["include"])
    write_jsonl(review_path, buckets["review"])
    write_jsonl(excluded_path, buckets["exclude"])

    source_summary = read_optional_source_summary(source)
    summary = {
        "bbox3007": list(MVP_BBOX_3007),
        "clusters": summarize_clusters([feature for group in buckets.values() for feature in group], "shadowImportDecision"),
        "crs": {
            "sourceFootprint": SOURCE_FOOTPRINT_CRS,
            "metric": METRIC_CRS,
            "runtimeGeometry": RUNTIME_GEOMETRY_CRS,
        },
        "decisionCounts": {decision: len(buckets[decision]) for decision in ("include", "review", "exclude")},
        "endToEndCounts": end_to_end_counts(source_summary, len(features), buckets),
        "examples": dict(sorted(examples.items())),
        "heightByDecision": {
            decision: stats(values)
            for decision, values in sorted(heights_by_decision.items())
        },
        "objectTypesByDecision": {
            decision: counter.most_common()
            for decision, counter in sorted(object_types.items())
        },
        "outputs": {
            "include": str(include_path),
            "review": str(review_path),
            "excluded": str(excluded_path),
        },
        "reasonCounts": dict(sorted(reasons.items())),
        "rules": filtering_rules(),
        "source": str(source),
        "sourceCandidateSummary": source_summary,
        "tierCounts": dict(tiers.most_common()),
    }
    write_json(summary_json, summary)
    write_filter_md(summary_md, source, summary)
    print(json.dumps(summary, ensure_ascii=False, indent=2, sort_keys=True))
    return 0


def read_optional_source_summary(source: Path) -> dict[str, Any] | None:
    summary_path = source.with_suffix(".summary.json")
    if not summary_path.exists():
        return None
    return json.loads(summary_path.read_text(encoding="utf-8"))


def end_to_end_counts(
    source_summary: dict[str, Any] | None,
    candidate_rows: int,
    buckets: dict[str, list[dict[str, Any]]],
) -> dict[str, int | None]:
    footprint_stats = (source_summary or {}).get("footprintLoadStats", {})
    summary_stats = (source_summary or {}).get("stats", {})
    return {
        "footprintsRead": footprint_stats.get("read"),
        "footprintsInsideBbox": footprint_stats.get("kept"),
        "candidateRows": candidate_rows,
        "candidateRowsFromSummary": summary_stats.get("emitted"),
        "includeRows": len(buckets["include"]),
        "reviewRows": len(buckets["review"]),
        "excludedRows": len(buckets["exclude"]),
        "importReadyRowsDefault": len(buckets["include"]) + len(buckets["review"]),
    }


def filtering_rules() -> dict[str, Any]:
    return {
        "include": "plausible shadow caster with no conservative review or exclusion reason",
        "review": [
            "height > 60 m",
            "height > 20 m from one matched line",
            "Z spread > 20 m",
            "no roof contour and height > 8 m",
            "matchedLineCount <= 1 and height > 15 m",
        ],
        "exclude": [
            "height < 3 m",
            "area < 25 m2 and height > 15 m",
            "height > 80 m",
            "Z spread > 60 m",
            (
                f"objectType Komplementbyggnad with area < {KOMPLEMENTBYGGNAD_SMALL_AREA_M2:g} m2 "
                f"and qualityScore <= {KOMPLEMENTBYGGNAD_LOW_QUALITY_MAX:g}"
            ),
        ],
    }


def write_filter_md(path: Path, source: Path, summary: dict[str, Any]) -> None:
    lines = [
        "# Shadow Caster Filter Summary",
        "",
        f"Source: `{source}`",
        "",
        "## Decisions",
        "",
    ]
    for decision in ["include", "review", "exclude"]:
        decision_stats = summary["heightByDecision"].get(decision, {})
        lines.append(
            f"- {decision}: {summary['decisionCounts'].get(decision, 0)} features, "
            f"height p50/p90 {decision_stats.get('p50')} / {decision_stats.get('p90')} m"
        )

    lines.extend(["", "## Reasons", ""])
    for reason, count in summary["reasonCounts"].items():
        lines.append(f"- {reason}: {count}")

    lines.extend(["", "## Venue-Area Retained Coverage", ""])
    for cluster_name, cluster in summary["clusters"].items():
        lines.append(
            f"- {cluster_name}: include {cluster['decisions'].get('include', 0)}, "
            f"review {cluster['decisions'].get('review', 0)}, "
            f"exclude {cluster['decisions'].get('exclude', 0)}, "
            f"height p50/p90 {cluster['heightM']['p50']} / {cluster['heightM']['p90']} m"
        )

    lines.extend(
        [
            "",
            "## Use",
            "",
            "- Import `buildings_central_shadow_casters.filtered.geojsonl` first as active include records.",
            "- Keep `review.geojsonl` inactive until Story 3.0.4 spot checks approve records.",
            "- Keep `excluded.geojsonl` inactive diagnostics or omit from the DB import.",
        ]
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def command_emit_import(args: argparse.Namespace) -> int:
    out_dir = Path(args.out_dir)
    include_path = Path(args.include)
    review_path = Path(args.review)
    excluded_path = Path(args.excluded)
    import_path = Path(args.import_jsonl) if args.import_jsonl else out_dir / "shadow_casters.import.jsonl"
    diagnostics_path = Path(args.excluded_diagnostics_jsonl) if args.excluded_diagnostics_jsonl else out_dir / "shadow_casters.excluded_diagnostics.jsonl"
    manifest_path = Path(args.manifest) if args.manifest else out_dir / "shadow_casters.import_manifest.json"
    sql_path = Path(args.sql_handoff) if args.sql_handoff else out_dir / "shadow_casters.import_handoff.sql"

    checksum = combined_hash(
        [include_path, review_path, excluded_path],
        {
            "bbox3007": MVP_BBOX_3007,
            "sourceDataset": SOURCE_DATASET,
            "sourcePriority": OPEN_DERIVED_SOURCE_PRIORITY,
        },
    )
    import_batch_id = args.import_batch_id or f"open-goteborg-central-{checksum[:12]}"

    include_features = sorted(load_jsonl(include_path), key=stable_sort_key)
    review_features = sorted(load_jsonl(review_path), key=stable_sort_key)
    excluded_features = sorted(load_jsonl(excluded_path), key=stable_sort_key)

    import_rows = [
        row
        for feature in include_features + review_features
        if (row := map_feature_to_shadow_caster_row(feature, import_batch_id, include_diagnostics=True)) is not None
    ]
    diagnostic_rows = [
        row
        for feature in excluded_features
        if (row := map_feature_to_shadow_caster_row(feature, import_batch_id, include_diagnostics=True)) is not None
    ]

    write_jsonl(import_path, sorted(import_rows, key=stable_sort_key))
    write_jsonl(diagnostics_path, sorted(diagnostic_rows, key=stable_sort_key))

    manifest = build_import_manifest(
        import_batch_id,
        checksum,
        include_path,
        review_path,
        excluded_path,
        import_path,
        diagnostics_path,
        import_rows,
        diagnostic_rows,
    )
    write_json(manifest_path, manifest)
    write_sql_handoff(sql_path, import_path, diagnostics_path, manifest)
    print(json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True))
    return 0


def build_import_manifest(
    import_batch_id: str,
    checksum: str,
    include_path: Path,
    review_path: Path,
    excluded_path: Path,
    import_path: Path,
    diagnostics_path: Path,
    import_rows: list[dict[str, Any]],
    diagnostic_rows: list[dict[str, Any]],
) -> dict[str, Any]:
    import_counts = Counter(row["filter_decision"] for row in import_rows)
    diagnostic_counts = Counter(row["filter_decision"] for row in diagnostic_rows)
    input_paths = {
        "include": include_path,
        "review": review_path,
        "excluded": excluded_path,
    }
    return {
        "bbox3007": list(MVP_BBOX_3007),
        "crs": {
            "sourceFootprint": SOURCE_FOOTPRINT_CRS,
            "metric": METRIC_CRS,
            "runtimeGeometry": RUNTIME_GEOMETRY_CRS,
        },
        "importBatch": {
            "id": import_batch_id,
            "sourceDataset": SOURCE_DATASET,
            "sourceDescription": SOURCE_DESCRIPTION,
            "completionStatus": "review_artifacts_generated_no_db_write",
            "sourceMetadata": {
                "inputChecksums": {
                    role: file_sha256(path)
                    for role, path in sorted(input_paths.items())
                    if path.exists()
                },
                "combinedInputChecksum": checksum,
                "sourcePriority": OPEN_DERIVED_SOURCE_PRIORITY,
                "sourcePriorityMeaning": "lower numeric priority wins",
            },
        },
        "outputs": {
            "importJsonl": str(import_path),
            "excludedDiagnosticsJsonl": str(diagnostics_path),
        },
        "rowCounts": {
            "include": import_counts.get("include", 0),
            "review": import_counts.get("review", 0),
            "excludeDiagnostics": diagnostic_counts.get("exclude", 0),
            "importReadyRowsDefault": len(import_rows),
            "diagnosticRows": len(diagnostic_rows),
            "totalMappedRows": len(import_rows) + len(diagnostic_rows),
        },
        "sourcePriority": OPEN_DERIVED_SOURCE_PRIORITY,
        "sourcePriorityOrder": SOURCE_PRIORITIES,
        "timestampPolicy": "Rows contain imported_at=null and updated_at=null; use the SQL handoff to coalesce DB defaults at load time.",
    }


def sql_literal(value: Any) -> str:
    return "'" + str(value).replace("'", "''") + "'"


def psql_copy_path_literal(path: Path) -> str:
    return sql_literal(path.as_posix())


def write_sql_handoff(path: Path, import_jsonl: Path, diagnostics_jsonl: Path, manifest: dict[str, Any]) -> None:
    batch = manifest["importBatch"]
    batch_id = sql_literal(batch["id"])
    source_dataset = sql_literal(batch["sourceDataset"])
    source_description = sql_literal(batch["sourceDescription"])
    source_metadata = sql_literal(json.dumps(batch["sourceMetadata"], ensure_ascii=False, sort_keys=True))
    notes = sql_literal(
        "Generated by scripts/geodata/shadow_caster_pipeline.py emit-import; no automatic production import was executed."
    )
    import_path = psql_copy_path_literal(import_jsonl)
    diagnostics_path = psql_copy_path_literal(diagnostics_jsonl)
    text = f"""-- MANUAL-RUN ONLY: review before executing in Supabase.
-- Story 3.0.3 generated import handoff for the Story 3.0.2 shadow_casters contract.
-- Do not use PostgreSQL server-side COPY FROM '/local/path' with Supabase.
-- This file uses psql client-side \\copy so file access happens on the maintainer machine.

\\set ON_ERROR_STOP on

begin;

create temp table shadow_caster_import_stage (
  payload_text text not null
) on commit drop;

-- Update paths if running psql from a different working directory.
\\copy shadow_caster_import_stage(payload_text) from {import_path} with (format text);

insert into public.shadow_caster_import_batches (
  id,
  source_dataset,
  source_description,
  source_metadata,
  completed_at,
  notes
) values (
  {batch_id},
  {source_dataset},
  {source_description},
  {source_metadata}::jsonb,
  now(),
  {notes}
)
on conflict (id) do update set
  source_dataset = excluded.source_dataset,
  source_description = excluded.source_description,
  source_metadata = excluded.source_metadata,
  completed_at = excluded.completed_at,
  notes = excluded.notes;

-- Re-running this handoff replaces rows for this deterministic batch only.
delete from public.shadow_casters
where import_batch_id = {batch_id};

insert into public.shadow_casters (
  geometry,
  height_m,
  ground_z_rh2000,
  roof_z_rh2000,
  height_method,
  height_source,
  source_dataset,
  source_external_id,
  source_footprint_fid,
  source_object_type,
  source_purpose,
  source_geometry_type,
  source_geom_3007,
  source_layer,
  source_subclass,
  z_semantics,
  source_collection_metadata,
  source_update_metadata,
  source_object_metadata,
  engine_geometry_method,
  runtime_geometry_crs,
  metric_crs,
  provenance_metadata,
  quality_score,
  shadow_caster_tier,
  filter_decision,
  filter_reasons,
  source_flags,
  matched_line_count,
  z_spread_m,
  bbox_3007,
  centroid_3007,
  caster_class,
  source_priority,
  active,
  import_batch_id,
  imported_at,
  updated_at
)
select
  st_setsrid(st_geomfromgeojson(payload->>'geometry'), 4326)::geometry(Polygon, 4326),
  (payload->>'height_m')::double precision,
  nullif(payload->>'ground_z_rh2000', '')::double precision,
  nullif(payload->>'roof_z_rh2000', '')::double precision,
  payload->>'height_method',
  payload->>'height_source',
  payload->>'source_dataset',
  payload->>'source_external_id',
  payload->>'source_footprint_fid',
  payload->>'source_object_type',
  payload->>'source_purpose',
  payload->>'source_geometry_type',
  case
    when nullif(payload->>'source_geom_3007', '') is not null
      then st_setsrid(st_geomfromgeojson(payload->>'source_geom_3007'), 3007)::geometry(GeometryZ, 3007)
    else null
  end,
  payload->>'source_layer',
  payload->>'source_subclass',
  payload->>'z_semantics',
  payload->'source_collection_metadata',
  payload->'source_update_metadata',
  payload->'source_object_metadata',
  payload->>'engine_geometry_method',
  payload->>'runtime_geometry_crs',
  payload->>'metric_crs',
  payload->'provenance_metadata',
  nullif(payload->>'quality_score', '')::numeric,
  payload->>'shadow_caster_tier',
  payload->>'filter_decision',
  coalesce(array(select jsonb_array_elements_text(payload->'filter_reasons')), '{{}}'::text[]),
  coalesce(array(select jsonb_array_elements_text(payload->'source_flags')), '{{}}'::text[]),
  nullif(payload->>'matched_line_count', '')::integer,
  nullif(payload->>'z_spread_m', '')::double precision,
  st_setsrid(st_geomfromgeojson(payload->>'bbox_3007'), 3007)::geometry(Polygon, 3007),
  st_setsrid(st_geomfromgeojson(payload->>'centroid_3007'), 3007)::geometry(Point, 3007),
  payload->>'caster_class',
  (payload->>'source_priority')::integer,
  (payload->>'active')::boolean,
  payload->>'import_batch_id',
  coalesce(nullif(payload->>'imported_at', '')::timestamptz, now()),
  coalesce(nullif(payload->>'updated_at', '')::timestamptz, now())
from (
  select payload_text::jsonb as payload
  from shadow_caster_import_stage
) rows;

-- Optional diagnostics load. Review before enabling; excluded rows are inactive diagnostics.
-- truncate table shadow_caster_import_stage;
-- \\copy shadow_caster_import_stage(payload_text) from {diagnostics_path} with (format text);
-- Repeat the insert above for diagnostic rows only if you want excluded diagnostics in public.shadow_casters.

commit;

-- Post-import smoke checks for Rasmus.
select filter_decision, active, count(*) from public.shadow_casters group by filter_decision, active order by filter_decision, active;
select count(*) as active_below_3m from public.shadow_casters where active = true and height_m < 3;
select count(*) as active_review_or_exclude from public.shadow_casters where active = true and filter_decision <> 'include';
select count(*) as invalid_geometry from public.shadow_casters where geometry is null or st_isempty(geometry) or not st_isvalid(geometry);
select count(*) as missing_source_dataset from public.shadow_casters where nullif(btrim(source_dataset), '') is null;
select * from public.get_buildings_near_point(57.7089, 11.9746, 200) limit 5;
"""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


REQUIRED_ROW_FIELDS = {
    "geometry",
    "height_m",
    "height_source",
    "source_dataset",
    "source_footprint_fid",
    "source_geometry_type",
    "source_geom_3007",
    "source_layer",
    "source_subclass",
    "z_semantics",
    "source_collection_metadata",
    "source_update_metadata",
    "source_object_metadata",
    "runtime_geometry_crs",
    "metric_crs",
    "provenance_metadata",
    "quality_score",
    "shadow_caster_tier",
    "filter_decision",
    "filter_reasons",
    "source_flags",
    "bbox_3007",
    "centroid_3007",
    "caster_class",
    "source_priority",
    "active",
    "import_batch_id",
    "imported_at",
    "updated_at",
}


def validate_coordinate_pair(value: Any) -> bool:
    if not isinstance(value, list | tuple) or len(value) < 2:
        return False
    try:
        x = float(value[0])
        y = float(value[1])
    except (TypeError, ValueError):
        return False
    return math.isfinite(x) and math.isfinite(y)


def parse_local_datetime(value: Any) -> datetime | None:
    text = str(value or "").strip()
    if not text:
        return None
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.utcoffset() is None:
        return None
    return parsed


def spot_check_coordinate_errors(cluster_id: str, lon: float, lat: float, prefix: str) -> list[str]:
    try:
        from pyproj import Transformer
    except ImportError as exc:
        raise RuntimeError("pyproj is required for spot-check coordinate validation") from exc

    to_3007 = Transformer.from_crs(4326, 3007, always_xy=True)
    x, y = to_3007.transform(lon, lat)
    min_x, min_y, max_x, max_y = MVP_BBOX_3007
    errors: list[str] = []
    if not (min_x <= x <= max_x and min_y <= y <= max_y):
        errors.append(f"{prefix}: coordinate outside MVP bbox")
    center = cluster_centers_3007()[cluster_id]
    if distance_m((x, y), center) > CLUSTER_RADIUS_M:
        errors.append(f"{prefix}: coordinate outside declared cluster radius")
    return errors


def iter_geojson_positions(value: Any) -> Iterable[Any]:
    if isinstance(value, list | tuple):
        if value and all(isinstance(item, numbers.Real) for item in value[:2]):
            yield value
        else:
            for item in value:
                yield from iter_geojson_positions(item)


def validate_geojson_z_coordinates(value: Any, label: str) -> list[str]:
    positions = list(iter_geojson_positions(value))
    errors: list[str] = []
    if not positions:
        return [f"{label} geometry has no coordinate positions"]
    for position_index, position in enumerate(positions):
        if not isinstance(position, list | tuple) or len(position) < 3:
            errors.append(f"{label} position {position_index} is missing Z")
            continue
        try:
            z_value = float(position[2])
        except (TypeError, ValueError):
            errors.append(f"{label} position {position_index} has invalid Z")
            continue
        if not math.isfinite(z_value):
            errors.append(f"{label} position {position_index} has non-finite Z")
    return errors


def validate_geojson_xy_bounds(
    value: Any,
    label: str,
    bounds: tuple[float, float, float, float],
) -> list[str]:
    min_x, min_y, max_x, max_y = bounds
    errors: list[str] = []
    for position_index, position in enumerate(iter_geojson_positions(value)):
        if not validate_coordinate_pair(position):
            continue
        x = float(position[0])
        y = float(position[1])
        if not (min_x <= x <= max_x and min_y <= y <= max_y):
            errors.append(f"{label} position {position_index} is outside EPSG:3007 MVP bbox")
    return errors


def validate_geojson_geometry(
    value: Any,
    label: str,
    expected_type: str | None,
    *,
    require_z: bool = False,
) -> list[str]:
    errors: list[str] = []
    if not isinstance(value, dict):
        return [f"{label} geometry is required"]

    if expected_type is not None and value.get("type") != expected_type:
        errors.append(f"{label} geometry must be {expected_type}")
        return errors

    coordinates = value.get("coordinates")
    if expected_type == "Polygon":
        if not isinstance(coordinates, list) or not coordinates:
            errors.append(f"{label} polygon coordinates are required")
        else:
            for ring_index, ring in enumerate(coordinates):
                if not isinstance(ring, list) or len(ring) < 4:
                    errors.append(f"{label} polygon ring {ring_index} must have at least 4 positions")
                    continue
                if not all(validate_coordinate_pair(point) for point in ring):
                    errors.append(f"{label} polygon ring {ring_index} contains invalid coordinates")
                if ring[0] != ring[-1]:
                    errors.append(f"{label} polygon ring {ring_index} must be closed")
    elif expected_type == "Point":
        if not validate_coordinate_pair(coordinates):
            errors.append(f"{label} point coordinates are invalid")
    if require_z:
        if value.get("type") == "GeometryCollection":
            for geometry_index, geometry in enumerate(value.get("geometries") or []):
                errors.extend(validate_geojson_z_coordinates(geometry.get("coordinates"), f"{label} geometry {geometry_index}"))
        else:
            errors.extend(validate_geojson_z_coordinates(coordinates, label))

    try:
        from shapely.geometry import shape

        geometry = shape(value)
        if geometry.is_empty:
            errors.append(f"{label} geometry is empty")
        if expected_type is not None and geometry.geom_type != expected_type:
            errors.append(f"{label} geometry parsed as {geometry.geom_type}, expected {expected_type}")
        if not geometry.is_valid:
            errors.append(f"{label} geometry is invalid")
    except Exception as exc:
        errors.append(f"{label} geometry cannot be parsed: {exc}")
    return errors


def coordinate_wgs84_from_geometry(row: dict[str, Any]) -> dict[str, float] | None:
    geometry = row.get("geometry")
    if not isinstance(geometry, dict):
        return None
    try:
        from shapely.geometry import shape

        centroid = shape(geometry).centroid
        return {"lon": round(float(centroid.x), 6), "lat": round(float(centroid.y), 6)}
    except Exception:
        return None


def fallback_cluster_coordinate(cluster_id: str, index: int) -> dict[str, float]:
    lon, lat = CLUSTERS_WGS84[cluster_id]
    offset = (index - (MIN_SPOT_CHECKS_PER_CLUSTER / 2)) * 0.00008
    return {"lon": round(lon + offset, 6), "lat": round(lat - offset, 6)}


def row_centroid_3007(row: dict[str, Any]) -> tuple[float, float] | None:
    centroid = row.get("centroid_3007")
    if isinstance(centroid, dict) and centroid.get("type") == "Point":
        coordinates = centroid.get("coordinates")
        if validate_coordinate_pair(coordinates):
            return (float(coordinates[0]), float(coordinates[1]))
    raw = row.get("centroid3007")
    if validate_coordinate_pair(raw):
        return (float(raw[0]), float(raw[1]))
    return None


def distance_m(left: tuple[float, float], right: tuple[float, float]) -> float:
    return math.hypot(left[0] - right[0], left[1] - right[1])


def candidate_rows_by_cluster(rows: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    centers = cluster_centers_3007()
    by_cluster: dict[str, list[dict[str, Any]]] = {cluster_id: [] for cluster_id in REQUIRED_SPOT_CHECK_CLUSTER_IDS}
    for row in rows:
        if row.get("active") is False or row.get("filter_decision") == "exclude":
            continue
        centroid = row_centroid_3007(row)
        if centroid is None:
            continue
        for cluster_id, center in centers.items():
            if cluster_id in by_cluster and distance_m(centroid, center) <= CLUSTER_RADIUS_M:
                by_cluster[cluster_id].append(row)
                break
    for cluster_id in by_cluster:
        by_cluster[cluster_id] = sorted(by_cluster[cluster_id], key=stable_sort_key)
    return by_cluster


def make_spot_check_template_row(
    cluster_id: str,
    index: int,
    source_row: dict[str, Any] | None,
    source_artifact: str,
) -> dict[str, Any]:
    buckets = sorted(REQUIRED_SUN_CONDITION_BUCKETS)
    bucket = buckets[index % len(buckets)]
    source_id = (
        str((source_row or {}).get("source_footprint_fid") or (source_row or {}).get("sourceFootprintFid") or "")
        if source_row
        else ""
    )
    suffix = f"{index + 1:02d}"
    return {
        "agreement_result": "pending",
        "cluster_id": cluster_id,
        "cluster_name": CLUSTER_NAMES[cluster_id],
        "coordinate_wgs84": fallback_cluster_coordinate(cluster_id, index),
        "expected_building_shadow": "",
        "notes": "Replace with a real venue or street-facing observation point before marking completed.",
        "observed_manual_result": "",
        "point_type": "street_facing",
        "representative_local_datetime": SUN_CONDITION_TIMES[bucket],
        "reviewed_at": "",
        "reviewer": "",
        "source_artifact": f"{source_artifact}#{source_id}" if source_id else "generated-cluster-grid",
        "spot_check_id": f"{cluster_id}-{suffix}",
        "sun_condition_bucket": bucket,
        "uncertainty_causes": [],
        "venue_name": "",
        "venue_slug": "",
    }


def emit_spot_check_template_rows(
    source_rows: list[dict[str, Any]],
    per_cluster: int = MIN_SPOT_CHECKS_PER_CLUSTER,
    source_artifact: str = "",
) -> list[dict[str, Any]]:
    per_cluster = max(per_cluster, MIN_SPOT_CHECKS_PER_CLUSTER)
    by_cluster = candidate_rows_by_cluster(source_rows)
    output: list[dict[str, Any]] = []
    for cluster_id in REQUIRED_SPOT_CHECK_CLUSTER_IDS:
        candidates = by_cluster.get(cluster_id, [])
        for index in range(per_cluster):
            source_row = candidates[index] if index < len(candidates) else None
            output.append(make_spot_check_template_row(cluster_id, index, source_row, source_artifact))
    return sorted(output, key=lambda row: row["spot_check_id"])


def command_emit_spot_check_template(args: argparse.Namespace) -> int:
    source = Path(args.source)
    output = Path(args.output) if args.output else DEFAULT_ROOT / "derived" / "shadow_caster_spot_checks.template.jsonl"
    rows = load_jsonl(source)
    template = emit_spot_check_template_rows(
        rows,
        per_cluster=as_int(getattr(args, "per_cluster", MIN_SPOT_CHECKS_PER_CLUSTER), MIN_SPOT_CHECKS_PER_CLUSTER),
        source_artifact=source.as_posix(),
    )
    write_jsonl(output, template)
    print(json.dumps({
        "clusters": list(REQUIRED_SPOT_CHECK_CLUSTER_IDS),
        "output": str(output),
        "perCluster": max(as_int(getattr(args, "per_cluster", MIN_SPOT_CHECKS_PER_CLUSTER), MIN_SPOT_CHECKS_PER_CLUSTER), MIN_SPOT_CHECKS_PER_CLUSTER),
        "rows": len(template),
        "status": "pass",
    }, ensure_ascii=False, indent=2, sort_keys=True))
    return 0


def validate_spot_check_row(row: dict[str, Any], index: int) -> list[str]:
    prefix = f"row {index}"
    errors: list[str] = []
    if not isinstance(row, dict):
        return [f"{prefix}: spot-check row must be an object"]
    if not str(row.get("spot_check_id", "")).strip():
        errors.append(f"{prefix}: missing spot_check_id")
    if not str(row.get("source_artifact", "")).strip():
        errors.append(f"{prefix}: missing source_artifact")
    if parse_local_datetime(row.get("representative_local_datetime")) is None:
        errors.append(f"{prefix}: invalid representative local datetime")
    cluster_id = row.get("cluster_id")
    if cluster_id not in REQUIRED_SPOT_CHECK_CLUSTER_IDS:
        errors.append(f"{prefix}: missing or unknown cluster ID")
    if row.get("point_type") not in POINT_TYPES:
        errors.append(f"{prefix}: invalid point type")
    coordinate = row.get("coordinate_wgs84")
    lon = coordinate.get("lon") if isinstance(coordinate, dict) else None
    lat = coordinate.get("lat") if isinstance(coordinate, dict) else None
    coordinate_valid = (
        validate_coordinate_pair([lon, lat])
        and -180 <= float(lon) <= 180
        and -90 <= float(lat) <= 90
    )
    if not coordinate_valid:
        errors.append(f"{prefix}: invalid coordinate")
    elif cluster_id in REQUIRED_SPOT_CHECK_CLUSTER_IDS:
        errors.extend(spot_check_coordinate_errors(cluster_id, float(lon), float(lat), prefix))
    if row.get("sun_condition_bucket") not in REQUIRED_SUN_CONDITION_BUCKETS:
        errors.append(f"{prefix}: missing required sun-condition bucket")
    expected = row.get("expected_building_shadow")
    agreement = row.get("agreement_result")
    if agreement != "pending" and expected not in SHADOW_RESULTS - {""}:
        errors.append(f"{prefix}: invalid expected building-shadow result")
    observed = row.get("observed_manual_result", "")
    if agreement not in AGREEMENT_RESULTS:
        errors.append(f"{prefix}: invalid agreement result")
    if agreement != "pending" and observed not in SHADOW_RESULTS - {""}:
        errors.append(f"{prefix}: completed check needs observed/manual result")
    if agreement != "pending" and str(row.get("source_artifact", "")).strip() == "generated-cluster-grid":
        errors.append(f"{prefix}: completed check needs traceable source artifact")
    if agreement in {"agree", "disagree"} and observed in SHADOW_RESULTS - {""} and expected in SHADOW_RESULTS - {""}:
        observed_matches_expected = observed == expected
        if agreement == "agree" and not observed_matches_expected:
            errors.append(f"{prefix}: agreement result contradicts expected and observed results")
        if agreement == "disagree" and observed_matches_expected:
            errors.append(f"{prefix}: agreement result contradicts expected and observed results")
    causes = row.get("uncertainty_causes", [])
    if not isinstance(causes, list):
        errors.append(f"{prefix}: uncertainty causes must be a list")
        causes = []
    for cause in causes:
        if cause not in UNCERTAINTY_CAUSES:
            errors.append(f"{prefix}: unknown uncertainty cause {cause!r}")
    if causes and agreement != "uncertain":
        errors.append(f"{prefix}: uncertainty causes require uncertain agreement result")
    if agreement == "uncertain" and not causes:
        errors.append(f"{prefix}: uncertain check needs uncertainty cause")
    if "other" in causes and not str(row.get("notes", "")).strip():
        errors.append(f"{prefix}: other uncertainty requires notes")
    if agreement != "pending":
        if not str(row.get("reviewer", "")).strip():
            errors.append(f"{prefix}: completed check needs reviewer")
        if not str(row.get("reviewed_at", "")).strip():
            errors.append(f"{prefix}: completed check needs reviewed_at")
    return errors


def completed_spot_check(row: dict[str, Any]) -> bool:
    return row.get("agreement_result") in {"agree", "disagree", "uncertain"}


def evaluate_spot_check_rows(
    rows: list[dict[str, Any]],
    required_cluster_ids: Iterable[str] | None = None,
) -> tuple[dict[str, Any], list[str]]:
    required_ids = tuple(required_cluster_ids or REQUIRED_SPOT_CHECK_CLUSTER_IDS)
    errors: list[str] = []
    row_errors: list[str] = []
    for index, row in enumerate(rows, start=1):
        row_errors.extend(validate_spot_check_row(row, index))
    spot_check_ids = [
        str(row.get("spot_check_id", "")).strip()
        for row in rows
        if isinstance(row, dict) and str(row.get("spot_check_id", "")).strip()
    ]
    duplicate_ids = sorted(item for item, count in Counter(spot_check_ids).items() if count > 1)
    if duplicate_ids:
        row_errors.append(f"duplicate spot_check_id values {duplicate_ids}")
    errors.extend(row_errors)

    clusters: dict[str, Any] = {}
    completed_total = 0
    central_minimum_met = sum(
        1
        for row in rows
        if isinstance(row, dict)
        and row.get("cluster_id") in required_ids
        and completed_spot_check(row)
    ) >= MIN_CENTRAL_SPOT_CHECKS
    for cluster_id in required_ids:
        cluster_rows = [
            row
            for row in rows
            if isinstance(row, dict)
            and row.get("cluster_id") == cluster_id
            and completed_spot_check(row)
        ]
        completed_total += len(cluster_rows)
        buckets = sorted({row.get("sun_condition_bucket") for row in cluster_rows if row.get("sun_condition_bucket")})
        missing_buckets = sorted(REQUIRED_SUN_CONDITION_BUCKETS - set(buckets))
        uncertainty_counter: Counter[str] = Counter()
        agree_count = 0
        disagree_count = 0
        for row in cluster_rows:
            causes = row.get("uncertainty_causes") or []
            if causes or row.get("agreement_result") == "uncertain":
                uncertainty_counter.update(causes or ["other"])
                continue
            if row.get("agreement_result") == "agree":
                agree_count += 1
            elif row.get("agreement_result") == "disagree":
                disagree_count += 1
        denominator = agree_count + disagree_count
        agreement_rate = round(agree_count / denominator, 3) if denominator else None
        cluster_evidence_incomplete = (
            len(cluster_rows) < MIN_SPOT_CHECKS_PER_CLUSTER
            or denominator < MIN_BUILDING_AGREEMENT_DENOMINATOR
            or missing_buckets
        )
        if cluster_evidence_incomplete:
            status = "insufficient_evidence"
        elif agreement_rate is None or agreement_rate < HIGH_CONFIDENCE_AGREEMENT_THRESHOLD:
            status = "blocked"
        elif not central_minimum_met:
            status = "insufficient_evidence"
        else:
            status = "eligible"
        clusters[cluster_id] = {
            "agreementRate": agreement_rate,
            "buildingAgreementDenominator": denominator,
            "checkedCount": len(cluster_rows),
            "clusterName": CLUSTER_NAMES.get(cluster_id, cluster_id),
            "evidenceFiles": sorted({str(row.get("source_artifact", "")) for row in cluster_rows if row.get("source_artifact")}),
            "missingConditions": missing_buckets,
            "minimumAgreementDenominator": MIN_BUILDING_AGREEMENT_DENOMINATOR,
            "status": status,
            "threshold": HIGH_CONFIDENCE_AGREEMENT_THRESHOLD,
            "uncertaintyCounts": dict(sorted(uncertainty_counter.items())),
        }
        if len(cluster_rows) < MIN_SPOT_CHECKS_PER_CLUSTER:
            errors.append(f"{cluster_id}: fewer than {MIN_SPOT_CHECKS_PER_CLUSTER} completed checks")
        if missing_buckets:
            errors.append(f"{cluster_id}: missing sun-condition buckets {missing_buckets}")
        if denominator < MIN_BUILDING_AGREEMENT_DENOMINATOR:
            errors.append(
                f"{cluster_id}: fewer than {MIN_BUILDING_AGREEMENT_DENOMINATOR} clear building-agreement checks"
            )
    if completed_total < MIN_CENTRAL_SPOT_CHECKS:
        errors.append(f"central validation set has fewer than {MIN_CENTRAL_SPOT_CHECKS} completed checks")
    summary = {
        "agreementThreshold": HIGH_CONFIDENCE_AGREEMENT_THRESHOLD,
        "centralMinimumMet": central_minimum_met,
        "clusters": dict(sorted(clusters.items())),
        "errors": errors,
        "minimumAgreementDenominator": MIN_BUILDING_AGREEMENT_DENOMINATOR,
        "minimumCentralChecks": MIN_CENTRAL_SPOT_CHECKS,
        "minimumPerCluster": MIN_SPOT_CHECKS_PER_CLUSTER,
        "requiredSunConditionBuckets": sorted(REQUIRED_SUN_CONDITION_BUCKETS),
        "status": "fail" if errors else "pass",
        "totalCompletedChecks": completed_total,
    }
    return summary, errors


def write_spot_check_report_md(path: Path, source: Path, summary: dict[str, Any]) -> None:
    lines = [
        "# Shadow Caster Cluster Validation",
        "",
        f"- Source: `{source.as_posix()}`",
        f"- Status: `{summary['status']}`",
        f"- High-confidence agreement threshold: {int(HIGH_CONFIDENCE_AGREEMENT_THRESHOLD * 100)}%",
        f"- Minimum completed checks per cluster: {MIN_SPOT_CHECKS_PER_CLUSTER}",
        f"- Minimum central completed checks: {MIN_CENTRAL_SPOT_CHECKS}",
        "",
        "| Cluster | Status | Checks | Agreement | Missing conditions | Uncertainty |",
        "|---|---:|---:|---:|---|---|",
    ]
    for cluster_id, cluster in summary["clusters"].items():
        rate = cluster["agreementRate"]
        rate_text = "n/a" if rate is None else f"{rate:.0%}"
        missing = ", ".join(cluster["missingConditions"]) or "-"
        uncertainty = ", ".join(f"{key}: {value}" for key, value in cluster["uncertaintyCounts"].items()) or "-"
        lines.append(
            f"| {cluster['clusterName']} (`{cluster_id}`) | `{cluster['status']}` | "
            f"{cluster['checkedCount']} | {rate_text} | {missing} | {uncertainty} |"
        )
    if summary["errors"]:
        lines.extend(["", "## Gate Errors", ""])
        lines.extend(f"- {error}" for error in summary["errors"])
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def command_evaluate_spot_checks(args: argparse.Namespace) -> int:
    source = Path(args.source)
    output_json = (
        Path(args.output_json)
        if args.output_json
        else DEFAULT_ROOT / "derived" / "shadow_caster_cluster_validation.json"
    )
    output_md = (
        Path(args.output_md)
        if args.output_md
        else DEFAULT_ROOT / "derived" / "shadow_caster_cluster_validation.md"
    )
    rows = load_jsonl(source)
    require_all_clusters = getattr(args, "require_all_clusters", True)
    required_ids = (
        REQUIRED_SPOT_CHECK_CLUSTER_IDS
        if require_all_clusters
        else sorted({row.get("cluster_id") for row in rows if isinstance(row, dict) and row.get("cluster_id")})
    )
    summary, errors = evaluate_spot_check_rows(rows, required_cluster_ids=required_ids)
    summary["scope"] = "full_launch_clusters" if require_all_clusters else "partial_cluster_set"
    if not require_all_clusters:
        errors.append("partial cluster set is not a full launch-cluster gate")
        summary["errors"] = errors
        summary["status"] = "fail"
    write_json(output_json, summary)
    write_spot_check_report_md(output_md, source, summary)
    print(json.dumps(summary, ensure_ascii=False, indent=2, sort_keys=True))
    return 1 if errors else 0


def validate_rows(rows: list[dict[str, Any]], expected_batch_id: str) -> list[str]:
    errors: list[str] = []
    for index, row in enumerate(rows, start=1):
        missing = sorted(field for field in REQUIRED_ROW_FIELDS if field not in row)
        if missing:
            errors.append(f"row {index}: missing required fields {missing}")
        if row.get("import_batch_id") != expected_batch_id:
            errors.append(f"row {index}: import_batch_id mismatch")
        if row.get("runtime_geometry_crs") != RUNTIME_GEOMETRY_CRS or row.get("metric_crs") != METRIC_CRS:
            errors.append(f"row {index}: CRS metadata mismatch")
        if not row.get("source_dataset"):
            errors.append(f"row {index}: source_dataset is required")
        if not row.get("source_layer"):
            errors.append(f"row {index}: source_layer is required")
        if not row.get("source_subclass"):
            errors.append(f"row {index}: source_subclass is required")
        if not row.get("z_semantics"):
            errors.append(f"row {index}: z_semantics is required")
        errors.extend(f"row {index}: {error}" for error in validate_geojson_geometry(row.get("geometry"), "runtime", "Polygon"))
        source_geom_3007 = row.get("source_geom_3007")
        if source_geom_3007 is not None:
            errors.extend(
                f"row {index}: {error}"
                for error in validate_geojson_geometry(
                    source_geom_3007,
                    "source_geom_3007",
                    None,
                    require_z=True,
                )
            )
            errors.extend(
                f"row {index}: {error}"
                for error in validate_geojson_xy_bounds(
                    source_geom_3007.get("coordinates"),
                    "source_geom_3007",
                    MVP_BBOX_3007,
                )
            )
        errors.extend(
            f"row {index}: {error}"
            for error in validate_geojson_geometry(row.get("bbox_3007"), "bbox_3007 metric helper", "Polygon")
        )
        errors.extend(
            f"row {index}: {error}"
            for error in validate_geojson_geometry(row.get("centroid_3007"), "centroid_3007 metric helper", "Point")
        )
        if row.get("caster_class") not in {"building", "structure", "vegetation", "manual_override"}:
            errors.append(f"row {index}: invalid caster_class {row.get('caster_class')!r}")
        if row.get("active") is True and row.get("caster_class") != "building":
            errors.append(f"row {index}: non-building rows must remain inactive in this MVP open-data path")
        if row.get("active") is True and row.get("source_layer") != "byggnad_l":
            errors.append(f"row {index}: non-byggnad_l rows must remain inactive in this MVP open-data path")
        if row.get("active") is True and row.get("source_layer") == "byggnad_l" and source_geom_3007 is None:
            errors.append(f"row {index}: active byggnad_l row requires source_geom_3007")
        decision = row.get("filter_decision")
        if decision not in {"include", "review", "exclude"}:
            errors.append(f"row {index}: invalid filter_decision {decision!r}")
        if row.get("active") is True:
            if decision != "include":
                errors.append(f"row {index}: active row must be include")
            if as_float(row.get("height_m")) < 3:
                errors.append(f"row {index}: active row below 3 m")
        if decision in {"review", "exclude"} and row.get("active") is not False:
            errors.append(f"row {index}: review/exclude rows must be inactive")
        provenance = row.get("provenance_metadata") or {}
        if provenance.get("bbox3007") != list(MVP_BBOX_3007):
            errors.append(f"row {index}: provenance bbox mismatch")
        if not provenance.get("rawSourceFiles"):
            errors.append(f"row {index}: provenance rawSourceFiles are required")
        if provenance.get("matchBufferM") is None:
            errors.append(f"row {index}: provenance matchBufferM is required")
        collection_metadata = row.get("source_collection_metadata") or {}
        if not isinstance(collection_metadata, dict) or not collection_metadata.get("rawSourceFiles"):
            errors.append(f"row {index}: source_collection_metadata rawSourceFiles are required")
        update_metadata = row.get("source_update_metadata") or {}
        if not isinstance(update_metadata, dict) or not update_metadata.get("sourceRefresh"):
            errors.append(f"row {index}: source_update_metadata sourceRefresh is required")
    return errors


def command_validate_artifacts(args: argparse.Namespace) -> int:
    manifest_path = Path(args.manifest)
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    import_path = Path(args.import_jsonl) if args.import_jsonl else Path(manifest["outputs"]["importJsonl"])
    diagnostics_path = (
        Path(args.excluded_diagnostics_jsonl)
        if args.excluded_diagnostics_jsonl
        else Path(manifest["outputs"]["excludedDiagnosticsJsonl"])
    )
    output_json = Path(args.output_json) if args.output_json else import_path.with_suffix(".artifact_validation.json")

    import_rows = load_jsonl(import_path)
    diagnostic_rows = load_jsonl(diagnostics_path) if diagnostics_path.exists() else []
    expected_batch_id = manifest["importBatch"]["id"]
    errors = validate_rows(import_rows + diagnostic_rows, expected_batch_id)

    counts = Counter(row.get("filter_decision") for row in import_rows)
    diagnostic_counts = Counter(row.get("filter_decision") for row in diagnostic_rows)
    expected_counts = manifest["rowCounts"]
    if expected_counts.get("include") != counts.get("include", 0):
        errors.append("manifest include count does not match import JSONL")
    if expected_counts.get("review") != counts.get("review", 0):
        errors.append("manifest review count does not match import JSONL")
    if expected_counts.get("excludeDiagnostics") != diagnostic_counts.get("exclude", 0):
        errors.append("manifest excluded diagnostic count does not match diagnostics JSONL")
    if expected_counts.get("importReadyRowsDefault") != len(import_rows):
        errors.append("manifest importReadyRowsDefault count does not match import JSONL")

    report = {
        "errors": errors,
        "manifest": str(manifest_path),
        "outputs": {
            "importJsonl": str(import_path),
            "excludedDiagnosticsJsonl": str(diagnostics_path),
        },
        "rowCounts": {
            "importRows": len(import_rows),
            "diagnosticRows": len(diagnostic_rows),
            "byDecision": dict(sorted((counts + diagnostic_counts).items())),
        },
        "status": "fail" if errors else "pass",
    }
    write_json(output_json, report)
    print(json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True))
    return 1 if errors else 0


def command_run_all(args: argparse.Namespace) -> int:
    root = Path(args.root)
    derived = root / "derived"
    derive_args = argparse.Namespace(
        root=str(root),
        gpkg=args.gpkg,
        bbox=args.bbox,
        match_buffer_m=args.match_buffer_m,
        output=None,
        summary=None,
        baskarta_layer=None,
        dtm_zip=None,
    )
    if command_derive(derive_args) != 0:
        return 1
    candidates = derived / "buildings_central_639_14_640_14_height_candidates.geojsonl"
    if command_validate(argparse.Namespace(source=str(candidates), output_json=None, output_md=None)) != 0:
        return 1
    if command_filter(argparse.Namespace(
        source=str(candidates),
        out_dir=str(derived),
        include=None,
        review=None,
        excluded=None,
        summary_json=None,
        summary_md=None,
    )) != 0:
        return 1
    if command_emit_import(argparse.Namespace(
        out_dir=str(derived),
        include=str(derived / "buildings_central_shadow_casters.filtered.geojsonl"),
        review=str(derived / "buildings_central_shadow_casters.review.geojsonl"),
        excluded=str(derived / "buildings_central_shadow_casters.excluded.geojsonl"),
        import_jsonl=None,
        excluded_diagnostics_jsonl=None,
        manifest=None,
        sql_handoff=None,
        import_batch_id=None,
    )) != 0:
        return 1
    return command_validate_artifacts(argparse.Namespace(
        manifest=str(derived / "shadow_casters.import_manifest.json"),
        import_jsonl=None,
        excluded_diagnostics_jsonl=None,
        output_json=None,
    ))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="SunnySeat shadow-caster geodata import pipeline")
    subparsers = parser.add_subparsers(dest="command", required=True)

    preflight = subparsers.add_parser(
        "preflight-baskarta",
        help="inventory Baskarta ZIP or extracted SHP layers and validate Z-awareness without DB writes",
    )
    preflight.add_argument("--input", required=True)
    preflight.add_argument("--output-json", default=str(DEFAULT_ROOT / "derived" / "baskarta_preflight.json"))
    preflight.add_argument("--output-md", default=str(DEFAULT_ROOT / "derived" / "baskarta_preflight.md"))
    preflight.set_defaults(func=command_preflight_baskarta)

    derive = subparsers.add_parser("derive", help="derive height candidates from local raw geodata")
    derive.add_argument("--root", default=str(DEFAULT_ROOT))
    derive.add_argument("--gpkg", default=str(DEFAULT_GPKG))
    derive.add_argument("--bbox", nargs=4, type=float, default=MVP_BBOX_3007)
    derive.add_argument("--match-buffer-m", type=float, default=2.0)
    derive.add_argument("--output")
    derive.add_argument("--summary")
    derive.add_argument("--baskarta-layer")
    derive.add_argument("--dtm-zip", action="append")
    derive.set_defaults(func=command_derive)

    validate = subparsers.add_parser("validate", help="validate candidate GeoJSONL without touching the DB")
    validate.add_argument("--source", default=str(DEFAULT_ROOT / "derived" / "buildings_central_639_14_640_14_height_candidates.geojsonl"))
    validate.add_argument("--output-json")
    validate.add_argument("--output-md")
    validate.set_defaults(func=command_validate)

    filter_cmd = subparsers.add_parser("filter", help="split candidates into include/review/exclude")
    filter_cmd.add_argument("--source", default=str(DEFAULT_ROOT / "derived" / "buildings_central_639_14_640_14_height_candidates.geojsonl"))
    filter_cmd.add_argument("--out-dir", default=str(DEFAULT_ROOT / "derived"))
    filter_cmd.add_argument("--include")
    filter_cmd.add_argument("--review")
    filter_cmd.add_argument("--excluded")
    filter_cmd.add_argument("--summary-json")
    filter_cmd.add_argument("--summary-md")
    filter_cmd.set_defaults(func=command_filter)

    emit = subparsers.add_parser("emit-import", help="map filtered rows to the shadow_casters import contract")
    emit.add_argument("--out-dir", default=str(DEFAULT_ROOT / "derived"))
    emit.add_argument("--include", default=str(DEFAULT_ROOT / "derived" / "buildings_central_shadow_casters.filtered.geojsonl"))
    emit.add_argument("--review", default=str(DEFAULT_ROOT / "derived" / "buildings_central_shadow_casters.review.geojsonl"))
    emit.add_argument("--excluded", default=str(DEFAULT_ROOT / "derived" / "buildings_central_shadow_casters.excluded.geojsonl"))
    emit.add_argument("--import-jsonl")
    emit.add_argument("--excluded-diagnostics-jsonl")
    emit.add_argument("--manifest")
    emit.add_argument("--sql-handoff")
    emit.add_argument("--import-batch-id")
    emit.set_defaults(func=command_emit_import)

    validate_artifacts = subparsers.add_parser("validate-artifacts", help="validate generated import artifacts without DB writes")
    validate_artifacts.add_argument("--manifest", default=str(DEFAULT_ROOT / "derived" / "shadow_casters.import_manifest.json"))
    validate_artifacts.add_argument("--import-jsonl")
    validate_artifacts.add_argument("--excluded-diagnostics-jsonl")
    validate_artifacts.add_argument("--output-json")
    validate_artifacts.set_defaults(func=command_validate_artifacts)

    spot_template = subparsers.add_parser(
        "emit-spot-check-template",
        help="emit deterministic launch-cluster spot-check template rows without DB writes",
    )
    spot_template.add_argument("--source", default=str(DEFAULT_ROOT / "derived" / "shadow_casters.import.jsonl"))
    spot_template.add_argument("--output", default=str(DEFAULT_ROOT / "derived" / "shadow_caster_spot_checks.template.jsonl"))
    spot_template.add_argument("--per-cluster", type=int, default=MIN_SPOT_CHECKS_PER_CLUSTER)
    spot_template.set_defaults(func=command_emit_spot_check_template)

    evaluate_spot_checks = subparsers.add_parser(
        "evaluate-spot-checks",
        help="evaluate completed spot-check records into cluster validation gates without DB writes",
    )
    evaluate_spot_checks.add_argument("--source", default=str(DEFAULT_ROOT / "derived" / "shadow_caster_spot_checks.results.jsonl"))
    evaluate_spot_checks.add_argument("--output-json", default=str(DEFAULT_ROOT / "derived" / "shadow_caster_cluster_validation.json"))
    evaluate_spot_checks.add_argument("--output-md", default=str(DEFAULT_ROOT / "derived" / "shadow_caster_cluster_validation.md"))
    evaluate_spot_checks.add_argument("--require-all-clusters", action=argparse.BooleanOptionalAction, default=True)
    evaluate_spot_checks.set_defaults(func=command_evaluate_spot_checks)

    run_all = subparsers.add_parser("run-all", help="run derive, validate, filter, emit-import, and validate-artifacts")
    run_all.add_argument("--root", default=str(DEFAULT_ROOT))
    run_all.add_argument("--gpkg", default=str(DEFAULT_GPKG))
    run_all.add_argument("--bbox", nargs=4, type=float, default=MVP_BBOX_3007)
    run_all.add_argument("--match-buffer-m", type=float, default=2.0)
    run_all.set_defaults(func=command_run_all)
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
